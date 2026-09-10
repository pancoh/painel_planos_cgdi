import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeDate,
  cleanPlaceholder,
  mapHeaders,
  findMissingRequiredFields,
} from "../scripts/process-data-utils.mjs";

test("normalizeDate mantém ISO", () => {
  assert.equal(normalizeDate("2026-03-11"), "2026-03-11");
});

test("normalizeDate interpreta formato brasileiro quando dia > 12", () => {
  assert.equal(normalizeDate("13/3/2026"), "2026-03-13");
});

test("normalizeDate interpreta formato americano quando mês > 12 no segundo campo", () => {
  assert.equal(normalizeDate("3/13/2026"), "2026-03-13");
});

test("normalizeDate usa leitura americana para ano com dois dígitos", () => {
  assert.equal(normalizeDate("3/11/26"), "2026-03-11");
});

test("normalizeDate converte mês abreviado em inglês e português", () => {
  assert.equal(normalizeDate("18-May-23"), "2023-05-18");
  assert.equal(normalizeDate("1-Aug-21"), "2021-08-01");
  assert.equal(normalizeDate("12-Jun-24"), "2024-06-12");
  assert.equal(normalizeDate("5/ago/2021"), "2021-08-05");
});

test("normalizeDate devolve null para null", () => {
  assert.equal(normalizeDate(null), null);
});

test("cleanPlaceholder anula textos de preenchimento e preserva dados", () => {
  assert.equal(cleanPlaceholder("Nao possui plano"), null);
  assert.equal(cleanPlaceholder("Não respondeu"), null);
  assert.equal(cleanPlaceholder("Nao foi enviado oficio"), null);
  assert.equal(cleanPlaceholder("Nao aprovado em lei"), null);
  assert.equal(cleanPlaceholder("Não"), null);
  assert.equal(cleanPlaceholder(""), null);
  assert.equal(cleanPlaceholder("Lei Municipal"), "Lei Municipal");
  assert.equal(cleanPlaceholder("56.834/2016"), "56.834/2016");
  assert.equal(cleanPlaceholder("2016-02-24"), "2016-02-24");
});

test("mapHeaders separa cabeçalhos com e sem alias", () => {
  const {mapped, unmapped} = mapHeaders([
    "Código IBGE",
    "Obrigados Censo 2022",
    "Link",
  ]);
  assert.ok(mapped.has("codigo_ibge"));
  assert.ok(mapped.has("obrigados_censo_2022_atual"));
  assert.deepEqual(unmapped, ["Link"]);
});

test("findMissingRequiredFields aponta campos essenciais ausentes", () => {
  assert.deepEqual(
    findMissingRequiredFields(new Set(["codigo_ibge", "uf", "municipio", "aprovado_lei", "obrigados_censo_2022_atual"])),
    [],
  );
  const missing = findMissingRequiredFields(new Set(["codigo_ibge", "uf", "municipio"]));
  assert.ok(missing.includes("aprovado_lei"));
  assert.ok(missing.some((m) => m.includes("obrigados_censo_2022")));
});
