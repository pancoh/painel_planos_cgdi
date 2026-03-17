import test from "node:test";
import assert from "node:assert/strict";
import {normalizeDate} from "../scripts/process-data-utils.mjs";

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
