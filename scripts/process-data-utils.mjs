export const MONTHS = {
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

export const REGION_ORDER = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
export const REGION_LABELS = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

export const STATE_NAMES = {
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

export const COLUMN_ALIASES = new Map(
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

export function normalizeHeader(header) {
  return slugify(String(header ?? ""));
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function cleanText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

export function toNumber(value) {
  if (value == null || value === "") return null;
  const text = String(value).trim();
  let normalizedText = text;

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

export function padIbge(value) {
  if (value == null || value === "") return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.padStart(7, "0");
}

export function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, firstRaw, secondRaw, yearRaw] = slashMatch;
    const first = Number(firstRaw);
    const second = Number(secondRaw);
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    const brazilian = makeIsoDate(year, second, first);
    const us = makeIsoDate(year, first, second);

    if (yearRaw.length === 2) return us;
    if (first > 12) return brazilian;
    if (second > 12) return us;

    const reference = new Date();
    const brazilianDate = new Date(`${brazilian}T12:00:00Z`);
    const usDate = new Date(`${us}T12:00:00Z`);
    const brazilianIsFuture = brazilianDate > reference;
    const usIsFuture = usDate > reference;

    if (brazilianIsFuture && !usIsFuture) return us;
    if (usIsFuture && !brazilianIsFuture) return brazilian;
    return brazilian;
  }
  return text;
}

function makeIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function classifyYesNoField(value) {
  const key = slugify(value);
  if (!key) return null;
  if (["sim", "s"].includes(key)) return "Sim";
  if (["nao", "nao_possui_plano", "nao_respondeu", "nao_foi_enviado_oficio"].includes(key)) {
    if (key === "nao_respondeu") return "Não respondeu";
    if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
    if (key === "nao_possui_plano") return "Não possui plano";
    return "Não";
  }
  if (key === "em_revisao") return "Em revisão";
  return cleanText(value);
}

export function classifyResponseField(value) {
  const key = slugify(value);
  if (key === "sim") return "Respondeu";
  if (key === "nao") return "Não respondeu";
  if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
  return null;
}

export function classifyElaborationField(value) {
  const key = slugify(value);
  if (key === "sim") return "Sim";
  if (key === "em_revisao") return "Em revisão";
  if (key === "nao") return "Não";
  if (key === "nao_respondeu") return "Não respondeu";
  if (key === "nao_foi_enviado_oficio") return "Não foi enviado ofício";
  return cleanText(value);
}

export function classifyObligation(canonical) {
  return classifyYesNoField(canonical.obrigados_censo_2022_atualizado) === "Sim";
}

export function inferEstimateYear(rawRow) {
  const headers = Object.keys(rawRow).map(normalizeHeader);
  if (headers.includes("estimativa_populacional_2025")) return 2025;
  if (headers.includes("estimativa_populacional_2024")) return 2024;
  return null;
}

export function classifyPopulationBand(value) {
  if (!Number.isFinite(value)) return null;
  if (value >= 1_000_000) return "Mais de 1 milhão";
  if (value >= 500_000) return "De 500 mil a 1 milhão";
  if (value >= 250_000) return "De 250 mil a 500 mil";
  if (value >= 100_000) return "De 100 a 250 mil";
  if (value >= 60_000) return "De 60 a 100 mil";
  if (value >= 20_000) return "De 20 a 60 mil";
  return "Até 20 mil";
}
