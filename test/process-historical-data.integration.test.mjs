import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import {existsSync} from "node:fs";
import {spawn} from "node:child_process";
import * as nodeFs from "node:fs";
import xlsx from "xlsx";

xlsx.set_fs(nodeFs);

const SCRIPT_PATH = path.resolve("scripts/process-historical-data.mjs");

test("pipeline ignora XLSX fora do padrao e processa os validos", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgdi-pipeline-"));
  await prepareInputDir(tempRoot);

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01jan2026.xlsx",
    ),
    [
      {
        "Código IBGE": "3550308",
        "Região": "SE",
        "UF": "SP",
        "Município": "São Paulo",
        "População Censo 2022": "11451245",
        "Respondeu ao levantamento": "Sim",
        "Possui plano de mobilidade urbana": "Sim",
        "Aprovado em lei ou ato normativo": "Sim",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
    ],
  );

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "backup_levantamento.xlsx",
    ),
    [],
  );

  const result = await runScript(tempRoot);

  assert.equal(result.code, 0);
  assert.match(result.stdout + result.stderr, /ignora|ignorando/i);

  const metadata = JSON.parse(
    await fs.readFile(
      path.join(tempRoot, "src", "data", "processed", "metadata.json"),
      "utf8",
    ),
  );
  assert.equal(metadata.total_snapshots, 1);
  assert.equal(metadata.last_reference_date, "2026-01-01");
});

test("agregado por UF bate com total de obrigados", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgdi-pipeline-"));
  await prepareInputDir(tempRoot);

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01fev2026.xlsx",
    ),
    [
      {
        "Código IBGE": "3550308",
        "Região": "SE",
        "UF": "SP",
        "Município": "São Paulo",
        "Respondeu ao levantamento": "Sim",
        "Possui plano de mobilidade urbana": "Sim",
        "Aprovado em lei ou ato normativo": "Sim",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
      {
        "Código IBGE": "3509502",
        "Região": "SE",
        "UF": "SP",
        "Município": "Campinas",
        "Respondeu ao levantamento": "Sim",
        "Possui plano de mobilidade urbana": "Não",
        "Aprovado em lei ou ato normativo": "Não",
        "Elaborando plano": "Sim",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
      {
        "Código IBGE": "3543402",
        "Região": "SE",
        "UF": "SP",
        "Município": "Ribeirão Preto",
        "Respondeu ao levantamento": "Não",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
    ],
  );

  const result = await runScript(tempRoot);
  assert.equal(result.code, 0);

  const ufs = JSON.parse(
    await fs.readFile(
      path.join(tempRoot, "src", "data", "processed", "latest-ufs.json"),
      "utf8",
    ),
  );
  assert.equal(ufs.length, 1);
  const sp = ufs[0];
  const sum =
    sp.municipios_com_plano +
    sp.municipios_em_elaboracao +
    sp.municipios_sem_plano +
    sp.municipios_sem_resposta +
    sp.municipios_sem_oficio;
  assert.equal(sum, sp.total_obrigados);
});

test("gera particionamento por UF e CSV mais recente", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgdi-pipeline-"));
  await prepareInputDir(tempRoot);

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01jan2026.xlsx",
    ),
    [
      {
        "Código IBGE": "1200401",
        "Região": "N",
        "UF": "AC",
        "Município": "Rio Branco",
        "Respondeu ao levantamento": "Sim",
        "Aprovado em lei ou ato normativo": "Sim",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
    ],
  );

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01mar2026.xlsx",
    ),
    [
      {
        "Código IBGE": "3550308",
        "Região": "SE",
        "UF": "SP",
        "Município": "São Paulo",
        "Respondeu ao levantamento": "Sim",
        "Aprovado em lei ou ato normativo": "Sim",
        "Obrigados Censo 2022 - atualizado": "Sim",
      },
    ],
  );

  const result = await runScript(tempRoot);
  assert.equal(result.code, 0);

  const csvPath = path.join(
    tempRoot,
    "src",
    "data",
    "processed",
    "latest-municipios.csv",
  );
  const partitionPath = path.join(
    tempRoot,
    "src",
    "data",
    "processed",
    "municipios-uf-sp.json",
  );

  assert.equal(existsSync(csvPath), true);
  assert.equal(existsSync(partitionPath), true);

  const csv = await fs.readFile(csvPath, "utf8");
  assert.match(csv, /S[ãa]o Paulo/);
});

test("pipeline falha quando um XLSX nao tem coluna essencial", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgdi-pipeline-"));
  await prepareInputDir(tempRoot);

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01jan2026.xlsx",
    ),
    [
      {
        "Código IBGE": "3550308",
        "Região": "SE",
        "UF": "SP",
        "Município": "São Paulo",
        "Aprovado em lei ou ato normativo": "Sim",
        "Obrigados Censo 2022 - renomeado": "Sim",
      },
    ],
  );

  const result = await runScript(tempRoot);
  assert.notEqual(result.code, 0);
  assert.match(result.stderr, /obrigados_censo_2022/);
});

test("pipeline anula textos de preenchimento nas colunas de lei", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "cgdi-pipeline-"));
  await prepareInputDir(tempRoot);

  await writeWorkbook(
    path.join(
      tempRoot,
      "Arquivos_Levantamento_PlanosdeMobilidadeUrbana",
      "Levantamento_PlanosdeMobilidadeUrbana_01jan2026.xlsx",
    ),
    [
      {
        "Código IBGE": "3550308",
        "Região": "SE",
        "UF": "SP",
        "Município": "São Paulo",
        "Respondeu ao levantamento": "Sim",
        "Possui Plano de Mobilidade Urbana": "Sim",
        "Aprovado em lei ou ato normativo": "Sim",
        "Instrumento Legal": "Decreto Municipal",
        "Nº da Lei": "56.834/2016",
        "Data da Lei": "18-May-23",
        "Obrigados Censo 2022": "Sim",
      },
      {
        "Código IBGE": "3509502",
        "Região": "SE",
        "UF": "SP",
        "Município": "Campinas",
        "Respondeu ao levantamento": "Sim",
        "Possui Plano de Mobilidade Urbana": "Nao",
        "Aprovado em lei ou ato normativo": "Nao possui plano",
        "Instrumento Legal": "Nao possui plano",
        "Nº da Lei": "Nao possui plano",
        "Data da Lei": "Nao possui plano",
        "Obrigados Censo 2022": "Sim",
      },
    ],
  );

  const result = await runScript(tempRoot);
  assert.equal(result.code, 0, result.stderr);

  const rows = JSON.parse(
    await fs.readFile(
      path.join(tempRoot, "src", "data", "processed", "municipios-uf-sp.json"),
      "utf8",
    ),
  );
  const sp = rows.find((r) => r.codigo_ibge === "3550308");
  const campinas = rows.find((r) => r.codigo_ibge === "3509502");
  assert.equal(sp.data_da_lei, "2023-05-18");
  assert.equal(sp.instrumento_legal, "Decreto Municipal");
  assert.equal(campinas.instrumento_legal, null);
  assert.equal(campinas.numero_da_lei, null);
  assert.equal(campinas.data_da_lei, null);
  assert.equal(campinas.status_painel, "Sem plano");
});

async function prepareInputDir(root) {
  await fs.mkdir(path.join(root, "Arquivos_Levantamento_PlanosdeMobilidadeUrbana"), {
    recursive: true,
  });
  await fs.mkdir(path.join(root, "src", "data", "processed"), {recursive: true});
}

async function writeWorkbook(filePath, rows) {
  const ws = xlsx.utils.json_to_sheet(rows);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Levantamento");
  xlsx.writeFile(wb, filePath);
}

function runScript(cwd) {
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, [SCRIPT_PATH], {cwd});
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    proc.on("close", (code) => resolve({code, stdout, stderr}));
  });
}
