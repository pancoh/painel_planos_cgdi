import {autoType, csvParse} from "d3-dsv";

export function parseMunicipiosCsv(text) {
  return csvParse(text, autoType).map((row) => ({
    ...row,
    obrigado: toBoolean(row.obrigado),
    cobertura_municipio: toBoolean(row.cobertura_municipio),
    codigo_ibge: row.codigo_ibge ? String(row.codigo_ibge).padStart(7, "0") : null,
    uf: row.uf ?? null,
    regiao: row.regiao ?? null,
    municipio: row.municipio ?? null,
    status_painel: row.status_painel ?? null,
    porte_populacional: row.porte_populacional ?? null,
  }));
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return Boolean(value);
}
