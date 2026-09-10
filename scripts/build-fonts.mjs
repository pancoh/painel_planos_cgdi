/**
 * Gera src/fonts.css com as fontes IBM Plex Sans e IBM Plex Serif embutidas
 * em base64, para o site não depender do Google Fonts em tempo de execução.
 *
 * O Observable Framework não copia arquivos referenciados por url() em CSS,
 * por isso as fontes vão embutidas no próprio CSS. Só o subconjunto "latin"
 * é incluído: ele cobre todos os caracteres do português.
 *
 * Execução manual (só quando mudar família ou pesos):
 *   node scripts/build-fonts.mjs
 */

import { writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, "..", "src", "fonts.css");

const FAMILIES = "family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Serif:wght@500;600;700";
const CSS_URL = `https://fonts.googleapis.com/css2?${FAMILIES}&display=swap`;
const SUBSETS = new Set(["latin"]);
// User agent moderno para o Google devolver woff2 com unicode-range por subconjunto
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const css = await (await fetch(CSS_URL, { headers: { "User-Agent": UA } })).text();
const blockPattern = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]+)\}/g;
const faces = [];
let totalBytes = 0;

for (const [, subset, body] of css.matchAll(blockPattern)) {
  if (!SUBSETS.has(subset)) continue;
  const family = body.match(/font-family:\s*'([^']+)'/)[1];
  const weight = body.match(/font-weight:\s*(\d+)/)[1];
  const style = body.match(/font-style:\s*(\w+)/)[1];
  const src = body.match(/url\(([^)]+)\)/)[1];
  const range = body.match(/unicode-range:\s*([^;]+)/)[1].trim();
  const bytes = Buffer.from(await (await fetch(src)).arrayBuffer());
  totalBytes += bytes.length;
  faces.push(`@font-face {
  font-family: "${family}";
  font-style: ${style};
  font-weight: ${weight};
  font-display: swap;
  src: url("data:font/woff2;base64,${bytes.toString("base64")}") format("woff2");
  unicode-range: ${range};
}`);
  console.log(`  ✓ ${family} ${weight} ${subset} (${(bytes.length / 1024).toFixed(0)} KB)`);
}

const header = `/* Gerado por scripts/build-fonts.mjs. Não editar à mão.
   IBM Plex Sans e IBM Plex Serif, licença SIL Open Font License 1.1.
   Fontes embutidas em base64 (subconjunto latin) para o site não depender
   do Google Fonts. Ver MANUTENCAO.md, seção 9.4. */
`;
await writeFile(OUT_FILE, `${header}\n${faces.join("\n\n")}\n`, "utf8");
console.log(`\nfonts.css gerado: ${faces.length} faces, ${(totalBytes / 1024).toFixed(0)} KB de fontes`);
