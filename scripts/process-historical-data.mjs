import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";
import { csvEscape } from "../src/lib/formatters.js";
import { STATUS_CATEGORIES, LEGAL_DEADLINES, POP_THRESHOLD } from "../src/lib/constants.js";
import {
  MONTHS,
  REGION_ORDER,
  REGION_LABELS,
  STATE_NAMES,
  COLUMN_ALIASES,
  normalizeHeader,
  slugify,
  cleanText,
  toNumber,
  padIbge,
  normalizeDate,
  classifyYesNoField,
  classifyResponseField,
  classifyElaborationField,
  classifyObligation,
  inferEstimateYear,
  classifyPopulationBand,
} from "./process-data-utils.mjs";

const ROOT = process.cwd();
const INPUT_DIR = path.join(
  ROOT,
  "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
);
const OUTPUT_DIR = path.join(ROOT, "src", "data", "processed");

const CSV_PT_BR_NUMBER_COLUMNS = new Set([
  "populacao_censo_2010",
  "populacao_censo_2022",
  "estimativa_populacional",
]);
const CSV_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");
const GENERATED_STATIC_FILES = new Set([
  "metadata.json",
  "snapshots.json",
  "historico-municipios.json",
  "latest-regioes.json",
  "latest-ufs.json",
  "latest-municipios.csv",
  "evolucao-aprovados.json",
  "obrigados.json",
]);

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await cleanupProcessedArtifacts();
  const files = await collectInputFiles();

  const historyRows = [];
  const snapshots = [];

  for (const fileInfo of files) {
    let workbook;
    try {
      workbook = xlsx.readFile(path.join(INPUT_DIR, fileInfo.file), {
        cellDates: true,
      });
    } catch (err) {
      console.warn(`Aviso: não foi possível ler ${fileInfo.file}: ${err.message}`);
      continue;
    }
    const sheet = workbook.Sheets["Levantamento"];
    if (!sheet) continue;

    const rawRows = xlsx.utils.sheet_to_json(sheet, {
      defval: null,
      raw: false,
    });
    const rows = rawRows.map((row) => normalizeRow(row, fileInfo));
    historyRows.push(...rows);
    snapshots.push({
      file_name: fileInfo.file,
      reference_date: fileInfo.reference_date,
      reference_label: fileInfo.reference_label,
      municipality_count: rows.length,
    });
  }

  if (snapshots.length === 0) {
    console.warn("Aviso: nenhum arquivo XLSX válido encontrado em", INPUT_DIR);
  }

  const latestDate = snapshots.at(-1)?.reference_date;
  const latestRows = historyRows.filter(
    (row) => row.reference_date === latestDate,
  );

  const latestRegions = summarizeGroups(latestRows, "regiao");
  const latestStates = summarizeGroups(latestRows, "uf");
  const latestMunicipios = latestRows.map((row) => ({
    ...row,
    obrigatoriedade_label: row.obrigado ? "Obrigatório" : "Não obrigatório",
  }));
  const metadata = buildMetadata({
    snapshots,
    latestRows,
    historyRows,
    latestRegions,
    latestStates,
  });

  await writeJson("metadata.json", metadata);
  await writeJson("snapshots.json", snapshots);
  await writeJson("historico-municipios.json", historyRows);
  await writeJson("latest-regioes.json", latestRegions);
  await writeJson("latest-ufs.json", latestStates);
  await writeCsv("latest-municipios.csv", latestMunicipios);

  // Pre-computed cumulative approval series by population band (for home chart)
  await writeJson("evolucao-aprovados.json", buildCumulativeApprovalSeries(latestMunicipios));

  // Partition by UF for lazy loading on the Brazil map
  const byUf = new Map();
  for (const row of latestMunicipios) {
    if (!byUf.has(row.uf)) byUf.set(row.uf, []);
    byUf.get(row.uf).push(row);
  }
  for (const [uf, ufRows] of byUf) {
    await writeJson(`municipios-uf-${uf.toLowerCase()}.json`, ufRows);
  }
}

async function collectInputFiles() {
  const entries = await fs.readdir(INPUT_DIR);
  const files = [];
  for (const file of entries.filter((entry) => entry.endsWith(".xlsx"))) {
    const reference = parseReferenceDate(file);
    if (!reference) {
      console.warn(
        `Aviso: ignorando arquivo fora do padrao esperado: ${file}`,
      );
      continue;
    }
    files.push({ file, ...reference });
  }
  files.sort((a, b) => a.reference_date.localeCompare(b.reference_date));
  return files;
}

function parseReferenceDate(fileName) {
  const match = fileName.match(/_(\d{1,2})([a-z]{3})(\d{4})\.xlsx$/i);
  if (!match) return null;
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = MONTHS[monthRaw.toLowerCase()];
  const year = Number(yearRaw);
  if (!month || day < 1 || day > 31) return null;
  const reference_date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const reference_label = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(`${reference_date}T12:00:00Z`))
    .replace(".", "");
  return { reference_date, reference_label };
}

function normalizeRow(rawRow, fileInfo) {
  const canonical = {};

  for (const [header, value] of Object.entries(rawRow)) {
    const key = normalizeHeader(header);
    const alias = COLUMN_ALIASES.get(key);
    if (!alias) continue;
    canonical[alias] = value;
  }

  const possuiPlano = classifyYesNoField(canonical.possui_plano_mobilidade);
  const aprovado = classifyYesNoField(canonical.aprovado_lei);
  const elaborando = classifyElaborationField(canonical.elaborando_plano);
  const resposta = classifyResponseField(canonical.respondeu_ao_levantamento);
  const obrigado = classifyObligation(canonical);
  const regiao =
    REGION_LABELS[String(canonical.regiao || "").toUpperCase()] ??
    canonical.regiao ??
    null;
  const uf = String(canonical.uf || "").toUpperCase() || null;
  const codigo = padIbge(canonical.codigo_ibge);

  const row = {
    file_name: fileInfo.file,
    reference_date: fileInfo.reference_date,
    reference_label: fileInfo.reference_label,
    codigo_ibge: codigo,
    municipio_id:
      codigo ?? `${uf}-${slugify(canonical.municipio ?? "sem-codigo")}`,
    regiao,
    uf,
    estado_nome: STATE_NAMES[uf] ?? null,
    municipio: cleanText(canonical.municipio),
    populacao_censo_2010: toNumber(canonical.populacao_censo_2010),
    populacao_censo_2022: toNumber(canonical.populacao_censo_2022),
    estimativa_populacional: toNumber(canonical.estimativa_populacional),
    estimativa_ano: inferEstimateYear(rawRow),
    faixa_populacional_2010: cleanText(canonical.faixa_populacional_2010),
    faixa_populacional_2022: cleanText(canonical.faixa_populacional_2022),
    faixa_populacional_estimativa: cleanText(
      canonical.faixa_populacional_estimativa,
    ),
    respondeu_ao_levantamento: resposta,
    possui_plano_mobilidade: possuiPlano,
    aprovado_lei: aprovado,
    elaborando_plano: elaborando,
    instrumento_legal: cleanText(canonical.instrumento_legal),
    numero_da_lei: cleanText(canonical.numero_da_lei),
    data_da_lei: normalizeDate(canonical.data_da_lei),
    ano_elaboracao: toNumber(canonical.ano_elaboracao),
    oficio: cleanText(canonical.oficio),
    data_resposta: normalizeDate(canonical.data_resposta),
    fonte_resposta: cleanText(canonical.fonte_resposta),
    instrumento_resposta: cleanText(canonical.instrumento_resposta),
    obrigados_estimativa: classifyYesNoField(canonical.obrigados_estimativa),
    obrigados_censo_2022_antigo: classifyYesNoField(
      canonical.obrigados_censo_2022_antigo,
    ),
    obrigados_censo_2022_atualizado: classifyYesNoField(
      canonical.obrigados_censo_2022_atualizado,
    ),
    recorte_metropolitano: cleanText(canonical.recorte_metropolitano),
    enmu: classifyYesNoField(canonical.enmu),
    mapa_turismo_2022: cleanText(canonical.mapa_turismo_2022),
    mapa_turismo_2024: cleanText(canonical.mapa_turismo_2024),
    tipologia_pndu: cleanText(canonical.tipologia_pndu),
  };

  row.obrigado = obrigado;
  row.porte_populacional =
    row.faixa_populacional_2022 ||
    row.faixa_populacional_estimativa ||
    row.faixa_populacional_2010 ||
    classifyPopulationBand(
      row.populacao_censo_2022 ??
        row.populacao_censo_2010,
    );
  row.status_painel = deriveStatus(row);
  row.cobertura_municipio = ["Plano aprovado", "Possui plano"].includes(
    row.status_painel,
  );
  return row;
}

function deriveStatus(row) {
  if (row.respondeu_ao_levantamento === "Não foi enviado ofício")
    return "Sem ofício";
  if (row.respondeu_ao_levantamento !== "Respondeu") return "Sem resposta";
  if (row.aprovado_lei === "Sim") return "Plano aprovado";
  if (row.possui_plano_mobilidade === "Sim") return "Possui plano";
  if (row.elaborando_plano === "Sim" || row.elaborando_plano === "Em revisão")
    return "Em elaboração";
  return "Sem plano";
}

function summarize(rows) {
  const totalMunicipios = rows.length;
  const obligatedRows = rows.filter((row) => row.obrigado);
  const obrigados = obligatedRows.length;
  const comPlano = obligatedRows.filter((row) =>
    ["Plano aprovado", "Possui plano"].includes(row.status_painel),
  ).length;
  const planoAprovado = obligatedRows.filter(
    (row) => row.status_painel === "Plano aprovado",
  ).length;
  const emElaboracao = obligatedRows.filter(
    (row) => row.status_painel === "Em elaboração",
  ).length;
  const semResposta = obligatedRows.filter(
    (row) => row.status_painel === "Sem resposta",
  ).length;
  const semOficio = obligatedRows.filter(
    (row) => row.status_painel === "Sem ofício",
  ).length;
  const semPlano = obligatedRows.filter(
    (row) => row.status_painel === "Sem plano",
  ).length;
  const responderam = rows.filter(
    (row) => row.respondeu_ao_levantamento === "Respondeu",
  ).length;
  const responderamObrigados = obligatedRows.filter(
    (row) => row.respondeu_ao_levantamento === "Respondeu",
  ).length;
  return {
    total_municipios: totalMunicipios,
    total_obrigados: obrigados,
    municipios_com_plano: comPlano,
    municipios_com_plano_aprovado: planoAprovado,
    municipios_em_elaboracao: emElaboracao,
    municipios_sem_plano: semPlano,
    municipios_sem_resposta: semResposta,
    municipios_sem_oficio: semOficio,
    municipios_que_responderam: responderam,
    municipios_obrigados_que_responderam: responderamObrigados,
    percentual_cobertura: obrigados ? comPlano / obrigados : 0,
    percentual_aprovado: obrigados ? planoAprovado / obrigados : 0,
    percentual_resposta: obrigados ? responderamObrigados / obrigados : 0,
  };
}

function summarizeGroups(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = row[key];
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row);
  }
  const summary = Array.from(groups, ([value, groupRows]) => ({
    [key]: value,
    ...(key === "uf" ? { regiao: groupRows[0].regiao } : {}),
    ...summarize(groupRows),
  }));
  if (key === "regiao") {
    summary.sort(
      (a, b) => REGION_ORDER.indexOf(a.regiao) - REGION_ORDER.indexOf(b.regiao),
    );
  } else {
    summary.sort((a, b) => a.uf.localeCompare(b.uf));
    for (const row of summary) row.estado_nome = STATE_NAMES[row.uf] ?? row.uf;
  }
  return summary;
}

function approvalByPopulation(rows) {
  const getPopulation = (row) => row.populacao_censo_2022 ?? row.estimativa_populacional ?? 0;
  const obrigados = rows.filter((row) => row.obrigado);
  const acima = obrigados.filter((row) => getPopulation(row) >= POP_THRESHOLD);
  const abaixo = obrigados.filter((row) => getPopulation(row) < POP_THRESHOLD);
  const popStats = (group) => {
    const total = group.length;
    const aprovados = group.filter((row) => row.aprovado_lei === "Sim").length;
    return { total, aprovados, sem_plano: total - aprovados, pct: total > 0 ? aprovados / total : 0 };
  };
  return {
    acima_250k: popStats(acima),
    abaixo_250k: popStats(abaixo),
    total: popStats(obrigados),
  };
}

function buildCumulativeApprovalSeries(rows) {
  const aprovados = rows.filter(
    (d) => d.ano_elaboracao && d.aprovado_lei === "Sim" && d.obrigado,
  );
  const isAcima = (d) => {
    const pop = d.populacao_censo_2022 ?? d.estimativa_populacional ?? 0;
    return pop >= POP_THRESHOLD;
  };
  const anos = [...new Set(aprovados.map((d) => Number(d.ano_elaboracao)))].sort(
    (a, b) => a - b,
  );
  // Count per year per group
  const countByYear = (filter) => {
    const map = new Map();
    for (const d of aprovados.filter(filter)) {
      const ano = Number(d.ano_elaboracao);
      map.set(ano, (map.get(ano) ?? 0) + 1);
    }
    return map;
  };
  const acimaByYear = countByYear(isAcima);
  const abaixoByYear = countByYear((d) => !isAcima(d));
  // Build cumulative stacked data
  let cumAbaixo = 0;
  let cumAcima = 0;
  return anos.flatMap((ano) => {
    cumAbaixo += abaixoByYear.get(ano) ?? 0;
    cumAcima += acimaByYear.get(ano) ?? 0;
    const total = cumAbaixo + cumAcima;
    return [
      { ano, grupo: "Até 250 mil hab.", y1: 0, y2: cumAbaixo, total },
      { ano, grupo: "Acima de 250 mil hab.", y1: cumAbaixo, y2: total, total },
    ];
  });
}

function buildMetadata({
  snapshots,
  latestRows,
  historyRows,
  latestRegions,
  latestStates,
}) {
  const latestSummary = summarize(latestRows);
  const previousDate = snapshots.at(-2)?.reference_date;
  const previousSummary = previousDate
    ? summarize(
        historyRows.filter((row) => row.reference_date === previousDate),
      )
    : null;

  return {
    title: "Painel de Planos de Mobilidade Urbana",
    source_directory: path.relative(ROOT, INPUT_DIR),
    last_reference_date: snapshots.at(-1)?.reference_date ?? null,
    last_reference_label: snapshots.at(-1)?.reference_label ?? null,
    total_snapshots: snapshots.length,
    total_historical_rows: historyRows.length,
    latest_summary: latestSummary,
    previous_summary: previousSummary,
    monthly_delta: previousSummary
      ? {
          municipios_com_plano:
            latestSummary.municipios_com_plano -
            previousSummary.municipios_com_plano,
          municipios_com_plano_aprovado:
            latestSummary.municipios_com_plano_aprovado -
            previousSummary.municipios_com_plano_aprovado,
          municipios_em_elaboracao:
            latestSummary.municipios_em_elaboracao -
            previousSummary.municipios_em_elaboracao,
          municipios_sem_resposta:
            latestSummary.municipios_sem_resposta -
            previousSummary.municipios_sem_resposta,
        }
      : null,
    available_regions: latestRegions.map((row) => row.regiao),
    available_ufs: latestStates.map((row) => ({
      uf: row.uf,
      estado_nome: row.estado_nome,
    })),
    status_categories: STATUS_CATEGORIES,
    legal_deadlines: LEGAL_DEADLINES,
    approval_by_population: approvalByPopulation(latestRows),
  };
}

async function writeJson(fileName, data) {
  await fs.writeFile(
    path.join(OUTPUT_DIR, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

async function cleanupProcessedArtifacts() {
  const files = await fs.readdir(OUTPUT_DIR, {withFileTypes: true});
  const removableGeneratedPattern = /^(brasil-series|regioes-series|ufs-series|latest-municipios|metadata|snapshots|historico-municipios|latest-regioes|latest-ufs|evolucao-aprovados|obrigados)\.(json|csv)$/;
  const removablePartitionPattern = /^municipios-uf-[a-z]{2}\.json$/;

  await Promise.all(
    files
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name !== ".gitkeep")
      .filter((name) =>
        removablePartitionPattern.test(name) ||
        (removableGeneratedPattern.test(name) && !GENERATED_STATIC_FILES.has(name)),
      )
      .map((name) => fs.unlink(path.join(OUTPUT_DIR, name))),
  );
}

async function writeCsv(fileName, rows) {
  const columns = Object.keys(rows[0] ?? {});
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((column) => csvEscape(formatCsvValue(column, row[column])))
        .join(","),
    )
    .join("\n");
  await fs.writeFile(
    path.join(OUTPUT_DIR, fileName),
    `\uFEFF${header}\n${body}\n`,
    "utf8",
  );
}

function formatCsvValue(column, value) {
  if (value == null || value === "") return "";
  if (CSV_PT_BR_NUMBER_COLUMNS.has(column) && Number.isFinite(Number(value))) {
    return CSV_NUMBER_FORMATTER.format(Number(value));
  }
  return String(value);
}

async function processObrigados() {
  const obrigadosDir = path.join(INPUT_DIR, "Arquivo_obrigatoriedade");
  const files = await fs.readdir(obrigadosDir).catch(() => []);
  const xlsxFile = files.find((f) => f.endsWith(".xlsx"));
  if (!xlsxFile) {
    console.warn("⚠  Arquivo de obrigatoriedade não encontrado — pulando.");
    return;
  }
  const wb = xlsx.readFile(path.join(obrigadosDir, xlsxFile));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = xlsx.utils.sheet_to_json(ws, { header: 1 });

  let headerIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    if ((raw[i] || []).some((c) => String(c).includes("Código do Município"))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    console.warn("⚠  Header do arquivo de obrigatoriedade não encontrado — pulando.");
    return;
  }

  const rows = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || !r[0]) continue;
    const codigo = String(r[0]).trim();
    if (!/^\d+$/.test(codigo)) continue;
    const regiaoSigla = String(r[1] || "").trim();
    rows.push({
      codigo_ibge: codigo,
      regiao: REGION_LABELS[regiaoSigla] || regiaoSigla,
      uf: String(r[2] || "").trim(),
      municipio: String(r[3] || "").trim(),
      rm_ride_au: String(r[4] || "").trim(),
      populacao_censo_2022: Number(r[5]) || 0,
      criterio_obrigatoriedade: String(r[6] || "").trim(),
    });
  }
  await fs.writeFile(
    path.join(OUTPUT_DIR, "obrigados.json"),
    JSON.stringify(rows),
    "utf8",
  );
  console.log(`✓ obrigados.json — ${rows.length} municípios obrigados`);
}

async function run() {
  await main();
  await processObrigados();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
