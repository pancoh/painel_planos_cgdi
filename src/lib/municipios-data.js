import {csvParse} from "d3-dsv";

function parseBRNumber(value) {
  if (value == null || value === "") return null;
  const cleaned = String(value).replace(/\./g, "").replace(",", ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseDateField(value) {
  if (value == null || value === "") return null;
  const str = String(value instanceof Date ? value.toISOString().slice(0, 10) : value);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return str;
}

export function parseMunicipiosCsv(text) {
  return csvParse(text).map((row) => ({
    ...row,
    obrigado: toBoolean(row.obrigado),
    cobertura_municipio: toBoolean(row.cobertura_municipio),
    codigo_ibge: row.codigo_ibge ? String(row.codigo_ibge).padStart(7, "0") : null,
    uf: row.uf ?? null,
    regiao: row.regiao ?? null,
    municipio: row.municipio ?? null,
    status_painel: row.status_painel ?? null,
    porte_populacional: row.porte_populacional ?? null,
    populacao_censo_2010: parseBRNumber(row.populacao_censo_2010),
    populacao_censo_2022: parseBRNumber(row.populacao_censo_2022),
    estimativa_populacional: parseBRNumber(row.estimativa_populacional),
    data_da_lei: parseDateField(row.data_da_lei),
  }));
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}
