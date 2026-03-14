import fs from "node:fs/promises";
import path from "node:path";
import xlsx from "xlsx";
import { csvEscape } from "../src/lib/formatters.js";

const ROOT = process.cwd();
const INPUT_DIR = path.join(
  ROOT,
  "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
);
const OUTPUT_DIR = path.join(ROOT, "src", "data", "processed");

const MONTHS = {
  jan: 1,
  fev: 2,
  mar: 3,
  abr: 4,
  mai: 5,
  jun: 6,
  jul: 7,
  ago: 8,
  set: 9,
  out: 10,
  nov: 11,
  dez: 12,
};

const REGION_ORDER = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const CSV_PT_BR_NUMBER_COLUMNS = new Set([
  "populacao_censo_2010",
  "populacao_censo_2022",
  "estimativa_populacional",
]);
const CSV_NUMBER_FORMATTER = new Intl.NumberFormat("pt-BR");
const REGION_LABELS = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

const STATE_NAMES = {
  AC: "Acre",
  AL: "Alagoas",
  AM: "Amazonas",
  AP: "Amapá",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MG: "Minas Gerais",
  MS: "Mato Grosso do Sul",
  MT: "Mato Grosso",
  PA: "Pará",
  PB: "Paraíba",
  PE: "Pernambuco",
  PI: "Piauí",
  PR: "Paraná",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RO: "Rondônia",
  RR: "Roraima",
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  SE: "Sergipe",
  SP: "São Paulo",
  TO: "Tocantins",
};

const COLUMN_ALIASES = new Map(
  Object.entries({
    codigo_ibge: "codigo_ibge",
    regiao: "regiao",
    uf: "uf",
    municipio: "municipio",
    populacao_censo_2010: "populacao_censo_2010",
    populacao_censo_2022: "populacao_censo_2022",
    estimativa_populacional_2024: "estimativa_populacional",
    estimativa_populacional_2025: "estimativa_populacional",
    faixa_populacional_censo: "faixa_populacional_2010",
    faixa_populacional_censo_2010: "faixa_populacional_2010",
    faixa_populacional_censo_2022: "faixa_populacional_2022",
    faixa_populacional_2024: "faixa_populacional_estimativa",
    faixa_populacional_2025: "faixa_populacional_estimativa",
    respondeu_ao_levantamento: "respondeu_ao_levantamento",
    possui_plano_de_mobilidade_urbana: "possui_plano_mobilidade",
    aprovado_em_lei_ou_ato_normativo: "aprovado_lei",
    elaborando_plano: "elaborando_plano",
    instrumento_legal: "instrumento_legal",
    n_da_lei: "numero_da_lei",
    data_da_lei: "data_da_lei",
    ano_de_elaboracao: "ano_elaboracao",
    oficio: "oficio",
    data_da_resposta: "data_resposta",
    fonte_da_resposta: "fonte_resposta",
    repondido_por_qual_instrumento: "instrumento_resposta",
    obrigados_estimativa_2024: "obrigados_estimativa",
    obrigados_estimativa_2025: "obrigados_estimativa",
    obrigados_censo_2022_antigo: "obrigados_censo_2022_antigo",
    obrigados_censo_2022_atualizado: "obrigados_censo_2022_atualizado",
    ride_rm_au_ibge_2021: "recorte_metropolitano",
    ride_rm_au_ibge_2023: "recorte_metropolitano_secundario",
    ride_rm_au_ibge_2024: "recorte_metropolitano",
    enmu: "enmu",
    mapa_do_turismo_brasileiro_2022: "mapa_turismo_2022",
    mapa_do_turismo_brasileiro_2024: "mapa_turismo_2024",
    tipologia_pndu: "tipologia_pndu",
  }),
);

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const files = (await fs.readdir(INPUT_DIR))
    .filter((file) => file.endsWith(".xlsx"))
    .map((file) => ({
      file,
      ...parseReferenceDate(file),
    }))
    .sort((a, b) => a.reference_date.localeCompare(b.reference_date));

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

  const brazilSeries = buildTimeSeries(historyRows, ["reference_date"]);
  const regionSeries = buildTimeSeries(historyRows, [
    "reference_date",
    "regiao",
  ]);
  const ufSeries = buildTimeSeries(historyRows, ["reference_date", "uf"]);
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
  await writeJson("brasil-series.json", brazilSeries);
  await writeJson("regioes-series.json", regionSeries);
  await writeJson("ufs-series.json", ufSeries);
  await writeJson("latest-regioes.json", latestRegions);
  await writeJson("latest-ufs.json", latestStates);
  await writeJson("latest-municipios.json", latestMunicipios);
  await writeCsv("latest-municipios.csv", latestMunicipios);
}

function parseReferenceDate(fileName) {
  const match = fileName.match(/_(\d{1,2})([a-z]{3})(\d{4})\.xlsx$/i);
  if (!match) {
    throw new Error(
      `Nao foi possivel extrair a data de referencia de ${fileName}`,
    );
  }
  const [, dayRaw, monthRaw, yearRaw] = match;
  const day = Number(dayRaw);
  const month = MONTHS[monthRaw.toLowerCase()];
  const year = Number(yearRaw);
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

function normalizeHeader(header) {
  return slugify(String(header ?? ""));
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  let normalizedText = text;

  // Values like 932,748 in source spreadsheets represent thousands, not decimals.
  if (/^\d{1,3}(,\d{3})+$/.test(text)) {
    normalizedText = text.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
    normalizedText = text.replace(/\./g, "").replace(",", ".");
  } else if (/^\d+,\d+$/.test(text)) {
    const [, fraction = ""] = text.split(",");
    normalizedText =
      fraction.length === 3 ? text.replace(/,/g, "") : text.replace(",", ".");
  } else {
    normalizedText = text.replace(/\./g, "").replace(",", ".");
  }

  const normalized = Number(normalizedText);
  return Number.isFinite(normalized) ? normalized : null;
}

function padIbge(value) {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.padStart(7, "0");
}

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  // DD/MM/YYYY (formato brasileiro)
  const matchBR = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBR) {
    const [, day, month, year] = matchBR;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  // M/D/YY ou M/D/YYYY (formato exportado pelo Excel como texto)
  const matchUS = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (matchUS) {
    const [, month, day, yr] = matchUS;
    const year = yr.length === 2 ? `20${yr}` : yr;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return text;
}

function classifyYesNoField(value) {
  const key = slugify(value);
  if (!key) return null;
  if (["sim", "s"].includes(key)) return "Sim";
  if (
    [
      "nao",
      "nao_possui_plano",
      "nao_respondeu",
      "nao_foi_enviado_oficio",
    ].includes(key)
  ) {
    if (key === "nao_respondeu") return "Não respondeu";
    if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
    if (key === "nao_possui_plano") return "Não possui plano";
    return "Não";
  }
  if (key === "em_revisao") return "Em revisão";
  return cleanText(value);
}

function classifyResponseField(value) {
  const key = slugify(value);
  if (key === "sim") return "Respondeu";
  if (key === "nao") return "Não respondeu";
  if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
  return null;
}

function classifyElaborationField(value) {
  const key = slugify(value);
  if (key === "sim") return "Sim";
  if (key === "em_revisao") return "Em revisão";
  if (key === "nao") return "Não";
  if (key === "nao_respondeu") return "Não respondeu";
  if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
  return cleanText(value);
}

function classifyObligation(canonical) {
  return (
    classifyYesNoField(canonical.obrigados_censo_2022_atualizado) === "Sim"
  );
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

function inferEstimateYear(rawRow) {
  const headers = Object.keys(rawRow).map(normalizeHeader);
  if (headers.includes("estimativa_populacional_2025")) return 2025;
  if (headers.includes("estimativa_populacional_2024")) return 2024;
  return null;
}

function classifyPopulationBand(value) {
  if (!Number.isFinite(value)) return null;
  if (value >= 1000000) return "Mais de 1 milhão";
  if (value >= 500000) return "500 mil a 1 milhão";
  if (value >= 250000) return "250 mil a 500 mil";
  if (value >= 100000) return "100 mil a 250 mil";
  if (value >= 50000) return "50 mil a 100 mil";
  if (value >= 20000) return "20 mil a 50 mil";
  return "Até 20 mil";
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

function buildTimeSeries(rows, keys) {
  const groups = new Map();
  for (const row of rows) {
    const key = keys.map((name) => row[name] ?? "").join("|");
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const series = [];
  for (const groupRows of groups.values()) {
    const base = Object.fromEntries(
      keys.map((name) => [name, groupRows[0][name]]),
    );
    series.push({
      ...base,
      ...summarize(groupRows),
    });
  }
  return series.sort((a, b) => {
    const left = `${a.reference_date}|${a.regiao ?? ""}|${a.uf ?? ""}`;
    const right = `${b.reference_date}|${b.regiao ?? ""}|${b.uf ?? ""}`;
    return left.localeCompare(right);
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
    status_categories: [
      "Plano aprovado",
      "Possui plano",
      "Em elaboração",
      "Sem plano",
      "Sem resposta",
      "Sem ofício",
    ],
  };
}

async function writeJson(fileName, data) {
  await fs.writeFile(
    path.join(OUTPUT_DIR, fileName),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
