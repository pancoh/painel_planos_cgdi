import {parseMunicipiosCsv} from "./municipios-data.js";
export {UF_CODES, GEO_STATE_CODES} from "./constants.js";

export function createMunicipiosByUfJsonLoader(attachments) {
  return (uf) => attachments[uf]?.json() ?? Promise.resolve([]);
}

export function createGeoByStateLoader(attachments) {
  return (code) => attachments[String(code)]?.json() ?? Promise.resolve({features: []});
}

export function createMunicipiosByUfCsvLoader(csvAttachment) {
  const rowsByUf = new Map();
  let latestMunicipiosPromise;

  return async (uf) => {
    if (rowsByUf.has(uf)) return rowsByUf.get(uf);
    latestMunicipiosPromise ??= csvAttachment.text().then(parseMunicipiosCsv);
    const allRows = await latestMunicipiosPromise;
    const rows = allRows.filter((row) => row.uf === uf);
    rowsByUf.set(uf, rows);
    return rows;
  };
}

