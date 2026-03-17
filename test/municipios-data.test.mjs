import test from "node:test";
import assert from "node:assert/strict";
import {parseMunicipiosCsv} from "../src/lib/municipios-data.js";

test("parseMunicipiosCsv normaliza booleanos e codigo_ibge", () => {
  const rows = parseMunicipiosCsv([
    "codigo_ibge,uf,municipio,regiao,obrigado,cobertura_municipio,status_painel,porte_populacional",
    "12345,SP,Sao Paulo,Sudeste,true,false,Plano aprovado,Mais de 1 milhão",
  ].join("\n"));

  assert.equal(rows.length, 1);
  assert.equal(rows[0].codigo_ibge, "0012345");
  assert.equal(rows[0].obrigado, true);
  assert.equal(rows[0].cobertura_municipio, false);
  assert.equal(rows[0].uf, "SP");
});

test("parseMunicipiosCsv preserva nulls textuais vazios como null", () => {
  const rows = parseMunicipiosCsv([
    "codigo_ibge,uf,municipio,regiao,obrigado,cobertura_municipio,status_painel,porte_populacional",
    ",,, ,false,false,,",
  ].join("\n"));

  assert.equal(rows[0].codigo_ibge, null);
  assert.equal(rows[0].uf, null);
  assert.equal(rows[0].municipio, null);
  assert.equal(rows[0].status_painel, null);
  assert.equal(rows[0].porte_populacional, null);
});
