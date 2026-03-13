/**
 * Baixa os arquivos TopoJSON do IBGE, converte para GeoJSON
 * e salva em src/geo/ para uso local (sem chamadas à API em tempo real).
 *
 * Execute manualmente: node scripts/download-geo.mjs
 * Ou via: npm run data
 */

import {mkdir, writeFile, access} from "node:fs/promises";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";
import * as topojson from "topojson-client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = join(__dirname, "../src/geo");
const IBGE_API = "https://servicodados.ibge.gov.br/api/v3/malhas";

const STATE_CODES = [11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 31, 32, 33, 35, 41, 42, 43, 50, 51, 52, 53];

async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchTopoAndSaveGeo(url, filePath, label, retries = 2) {
  if (await fileExists(filePath)) {
    console.log(`  ✓ já existe: ${label}`);
    return;
  }
  process.stdout.write(`  ↓ baixando: ${label}...`);
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} ao buscar ${url}`);
      const topo = await res.json();
      // Convert first TopoJSON object to GeoJSON FeatureCollection
      const key = Object.keys(topo.objects)[0];
      const geo = topojson.feature(topo, topo.objects[key]);
      const json = JSON.stringify(geo);
      await writeFile(filePath, json, "utf-8");
      console.log(` salvo (${(json.length / 1024).toFixed(0)} KB)`);
      return;
    } catch (err) {
      if (attempt < retries) {
        console.log(` erro (tentativa ${attempt}/${retries}), tentando novamente...`);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  await mkdir(GEO_DIR, {recursive: true});

  console.log("\n🗺  Baixando GeoJSON — estados do Brasil");
  await fetchTopoAndSaveGeo(
    `${IBGE_API}/paises/BR?formato=application/json&qualidade=minima&intrarregiao=UF`,
    join(GEO_DIR, "estados.json"),
    "estados.json"
  );

  console.log("\n🏘  Baixando GeoJSON — municípios por estado");
  const BATCH_SIZE = 5;
  for (let i = 0; i < STATE_CODES.length; i += BATCH_SIZE) {
    await Promise.all(STATE_CODES.slice(i, i + BATCH_SIZE).map((code) =>
      fetchTopoAndSaveGeo(
        `${IBGE_API}/estados/${code}?formato=application/json&qualidade=minima&intrarregiao=municipio`,
        join(GEO_DIR, `municipios-${code}.json`),
        `municipios-${code}.json`
      )
    ));
  }

  console.log("\n✅  Arquivos GeoJSON prontos em src/geo/\n");
}

main().catch((err) => {
  console.error("Erro ao baixar arquivos geo:", err);
  process.exit(1);
});
