/**
 * Valida a integridade dos artefatos gerados pelo pipeline.
 * Executar após process-historical-data.mjs via `npm run data`.
 * Exit code 1 em caso de falha.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const OUTPUT_DIR = join(process.cwd(), "src", "data", "processed");

// Thresholds configuráveis — ajustar se a base de municípios mudar significativamente
const THRESHOLDS = {
  minMunicipios: 5400,       // mínimo esperado de linhas em latest-municipios.json
  maxMunicipios: 5700,       // máximo esperado
  minSnapshotRows: 5000,     // mínimo de municipality_count por snapshot
  maxNullPopulation: 50,     // acima disso vira erro (não apenas aviso)
};

const EXPECTED_COLUMNS = [
  "codigo_ibge",
  "uf",
  "municipio",
  "regiao",
  "obrigado",
  "status_painel",
  "porte_populacional",
];

const PORTE_ORDER = [
  "Até 20 mil",
  "De 20 a 60 mil",
  "De 60 a 100 mil",
  "De 100 a 250 mil",
  "De 250 mil a 500 mil",
  "De 500 mil a 1 milhão",
  "Mais de 1 milhão",
];

const EXPECTED_UFS = new Set([
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
]);

let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`  ✗ ${msg}`);
  errors++;
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function load(fileName) {
  const filePath = join(OUTPUT_DIR, fileName);
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (e) {
    err(`Não foi possível ler ${fileName}: ${e.message}`);
    return null;
  }
}

// ── 1. Carregar artefatos ──────────────────────────────────────────────────
console.log("\n[1] Carregando artefatos...");
const metadata  = load("metadata.json");
const snapshots = load("snapshots.json");
const municipios = load("latest-municipios.json");
const ufs        = load("latest-ufs.json");

if (!metadata || !snapshots || !municipios || !ufs) {
  console.error("\nFalha crítica: artefatos principais ausentes. Abortando.");
  process.exitCode = 1;
  process.exit();
}
ok(`metadata.json, snapshots.json, latest-municipios.json, latest-ufs.json carregados`);

// ── 2. Contagem de snapshots ───────────────────────────────────────────────
console.log("\n[2] Verificando snapshots...");
if (snapshots.length === 0) {
  err("Nenhum snapshot encontrado");
} else {
  if (snapshots.length === metadata.total_snapshots) {
    ok(`${snapshots.length} snapshots (bate com metadata.total_snapshots)`);
  } else {
    err(`snapshots.json tem ${snapshots.length} entradas, mas metadata.total_snapshots = ${metadata.total_snapshots}`);
  }
  ok(`Último snapshot: ${snapshots.at(-1).reference_date}`);

  // Validar municipality_count por snapshot
  let snapshotRowErrors = 0;
  for (const snap of snapshots) {
    if (snap.municipality_count < THRESHOLDS.minSnapshotRows) {
      err(`Snapshot ${snap.reference_date}: municipality_count=${snap.municipality_count} abaixo do mínimo (${THRESHOLDS.minSnapshotRows})`);
      snapshotRowErrors++;
    }
  }
  if (snapshotRowErrors === 0) {
    ok(`Todos os ${snapshots.length} snapshots têm municipality_count ≥ ${THRESHOLDS.minSnapshotRows}`);
  }
}

// ── 3. Colunas obrigatórias e contagem em latest-municipios.json ──────────
console.log("\n[3] Verificando colunas obrigatórias e contagem...");
if (municipios.length === 0) {
  err("latest-municipios.json está vazio");
} else {
  const sample = municipios[0];
  const missing = EXPECTED_COLUMNS.filter((col) => !(col in sample));
  if (missing.length === 0) {
    ok(`Todas as ${EXPECTED_COLUMNS.length} colunas obrigatórias presentes`);
  } else {
    err(`Colunas ausentes: ${missing.join(", ")}`);
  }
  if (municipios.length < THRESHOLDS.minMunicipios || municipios.length > THRESHOLDS.maxMunicipios) {
    err(`Contagem de municípios fora do esperado: ${municipios.length} (esperado: ${THRESHOLDS.minMunicipios}–${THRESHOLDS.maxMunicipios})`);
  } else {
    ok(`${municipios.length} municípios (dentro do intervalo esperado)`);
  }
}

// ── 4. Valores de status_painel ────────────────────────────────────────────
console.log("\n[4] Verificando status_painel...");
const validStatuses = new Set(metadata.status_categories ?? []);
const invalidStatuses = new Set();
for (const row of municipios) {
  if (row.status_painel && !validStatuses.has(row.status_painel)) {
    invalidStatuses.add(row.status_painel);
  }
}
if (invalidStatuses.size === 0) {
  ok(`Todos os valores de status_painel são válidos (${validStatuses.size} categorias)`);
} else {
  err(`Valores inválidos em status_painel: ${[...invalidStatuses].join(", ")}`);
}

// ── 5. Faixas populacionais ────────────────────────────────────────────────
console.log("\n[5] Verificando porte_populacional...");
const validPortes = new Set(PORTE_ORDER);
const invalidPortes = new Set();
for (const row of municipios) {
  if (row.porte_populacional && !validPortes.has(row.porte_populacional)) {
    invalidPortes.add(row.porte_populacional);
  }
}
const nullPorteCount = municipios.filter((r) => r.porte_populacional == null).length;
if (invalidPortes.size === 0) {
  ok(`Todos os valores de porte_populacional são válidos`);
} else {
  err(`Valores inválidos em porte_populacional: ${[...invalidPortes].join(", ")}`);
}
if (nullPorteCount === 0) {
  ok(`Todos os municípios têm porte_populacional preenchido`);
} else if (nullPorteCount <= THRESHOLDS.maxNullPopulation) {
  warn(`${nullPorteCount} município(s) sem porte_populacional (abaixo do limite de ${THRESHOLDS.maxNullPopulation})`);
} else {
  err(`${nullPorteCount} município(s) sem porte_populacional — excede o limite de ${THRESHOLDS.maxNullPopulation}`);
}

// ── 6. Cobertura de UFs ────────────────────────────────────────────────────
console.log("\n[6] Verificando cobertura de UFs...");
const foundUfs = new Set(municipios.map((r) => r.uf).filter(Boolean));
if (foundUfs.size === 27 && [...EXPECTED_UFS].every((uf) => foundUfs.has(uf))) {
  ok(`Exatamente 27 UFs presentes`);
} else {
  const missing = [...EXPECTED_UFS].filter((uf) => !foundUfs.has(uf));
  const extra   = [...foundUfs].filter((uf) => !EXPECTED_UFS.has(uf));
  if (missing.length) err(`UFs ausentes: ${missing.join(", ")}`);
  if (extra.length)   err(`UFs inesperadas: ${extra.join(", ")}`);
}

// ── 7. Integridade dos agregados por UF ───────────────────────────────────
console.log("\n[7] Verificando integridade dos agregados por UF...");
let aggregateErrors = 0;
for (const uf of ufs) {
  const {
    uf: ufCode,
    total_municipios,
    total_obrigados,
    municipios_com_plano_aprovado,
    municipios_com_plano,
    municipios_em_elaboracao,
    municipios_sem_plano,
    municipios_sem_resposta,
    municipios_sem_oficio,
  } = uf;

  if (total_obrigados > total_municipios) {
    err(`${ufCode}: total_obrigados (${total_obrigados}) > total_municipios (${total_municipios})`);
    aggregateErrors++;
  }
  if (municipios_com_plano_aprovado > total_obrigados) {
    err(`${ufCode}: municipios_com_plano_aprovado (${municipios_com_plano_aprovado}) > total_obrigados (${total_obrigados})`);
    aggregateErrors++;
  }

  // Soma das categorias deve bater com total_obrigados
  const soma = (municipios_com_plano ?? 0)
    + (municipios_em_elaboracao ?? 0)
    + (municipios_sem_plano ?? 0)
    + (municipios_sem_resposta ?? 0)
    + (municipios_sem_oficio ?? 0);
  if (soma !== total_obrigados) {
    err(`${ufCode}: soma das categorias (${soma}) ≠ total_obrigados (${total_obrigados})`);
    aggregateErrors++;
  }
}
if (aggregateErrors === 0) {
  ok(`Agregados por UF íntegros (${ufs.length} UFs verificadas)`);
}

// ── 8. Arquivos particionados por UF ──────────────────────────────────────
console.log("\n[8] Verificando arquivos por UF...");
import { existsSync } from "node:fs";
let missingUfFiles = 0;
for (const uf of EXPECTED_UFS) {
  const filePath = join(OUTPUT_DIR, `municipios-uf-${uf.toLowerCase()}.json`);
  if (!existsSync(filePath)) {
    err(`Arquivo ausente: municipios-uf-${uf.toLowerCase()}.json`);
    missingUfFiles++;
  }
}
if (missingUfFiles === 0) {
  ok(`27 arquivos municipios-uf-*.json presentes`);
}

// ── Resultado ──────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
if (errors === 0 && warnings === 0) {
  console.log(`✅  Pipeline válido — nenhum problema encontrado.\n`);
} else if (errors === 0) {
  console.log(`✅  Pipeline válido — ${warnings} aviso(s).\n`);
} else {
  console.error(`❌  ${errors} erro(s) encontrado(s)${warnings ? `, ${warnings} aviso(s)` : ""}.\n`);
  process.exitCode = 1;
}
