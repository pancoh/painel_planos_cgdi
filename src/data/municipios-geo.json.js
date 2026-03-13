/**
 * Data loader: combines all 27 state municipality GeoJSON files into a single
 * object keyed by state IBGE code (string). Run by Observable Framework at
 * build/dev time; result served at /data/municipios-geo.json.
 */

import {readFileSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = join(__dirname, "../geo");

const STATE_CODES = [
  11, 12, 13, 14, 15, 16, 17, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 31, 32, 33, 35, 41, 42, 43, 50, 51, 52, 53,
];

const result = {};
for (const code of STATE_CODES) {
  const filePath = join(GEO_DIR, `municipios-${code}.json`);
  try {
    result[String(code)] = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    result[String(code)] = {type: "FeatureCollection", features: []};
  }
}

process.stdout.write(JSON.stringify(result));
