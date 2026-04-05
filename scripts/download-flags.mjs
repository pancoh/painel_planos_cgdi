#!/usr/bin/env node
/**
 * Baixa as bandeiras dos 26 estados + DF do IBGE Atlas Escolar
 * para src/assets/flags/{uf}.png
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "src", "assets", "flags");

const UFS = [
  "ac","al","ap","am","ba","ce","df","es","go","ma","mt","ms","mg",
  "pa","pb","pr","pe","pi","rn","rs","rj","ro","rr","sc","se","sp","to"
];

const BASE_URL = "https://atlasescolar.ibge.gov.br/images/bandeiras/ufs";

await mkdir(OUT_DIR, { recursive: true });

let ok = 0;
let fail = 0;

for (const uf of UFS) {
  const url = `${BASE_URL}/${uf}.png`;
  const dest = join(OUT_DIR, `${uf}.png`);

  if (existsSync(dest)) {
    console.log(`✓ ${uf}.png (já existe)`);
    ok++;
    continue;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`✓ ${uf}.png (${(buf.length / 1024).toFixed(1)} KB)`);
    ok++;
  } catch (err) {
    console.error(`✗ ${uf}.png — ${err.message}`);
    fail++;
  }
}

console.log(`\nConcluído: ${ok} OK, ${fail} falhas`);
