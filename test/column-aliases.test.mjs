import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import xlsx from "xlsx";

xlsx.set_fs(fs);
import {
  mapHeaders,
  findMissingRequiredFields,
} from "../scripts/process-data-utils.mjs";

// Lê os cabeçalhos reais de todos os XLSX do repositório e confirma que os
// campos essenciais têm alias. Falha aqui significa que um novo levantamento
// renomeou uma coluna e o pipeline publicaria indicadores zerados.
const INPUT_DIR = path.resolve("Arquivos_Levantamento_PlanosdeMobilidadeUrbana");
const files = fs.existsSync(INPUT_DIR)
  ? fs.readdirSync(INPUT_DIR).filter((f) => /^Levantamento_.*\.xlsx$/.test(f)).sort()
  : [];

test("todos os XLSX de levantamento têm os cabeçalhos essenciais mapeados", {skip: files.length === 0 && "sem XLSX no repositório"}, () => {
  for (const file of files) {
    const wb = xlsx.readFile(path.join(INPUT_DIR, file), {sheetRows: 1});
    const sheet = wb.Sheets["Levantamento"];
    assert.ok(sheet, `${file}: aba "Levantamento" ausente`);
    const [headers] = xlsx.utils.sheet_to_json(sheet, {header: 1});
    const {mapped} = mapHeaders(headers);
    const missing = findMissingRequiredFields(mapped);
    assert.deepEqual(missing, [], `${file}: campos sem alias: ${missing.join(", ")}`);
  }
});
