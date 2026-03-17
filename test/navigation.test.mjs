import test from "node:test";
import assert from "node:assert/strict";
import {resolveCurrentNavPath} from "../src/lib/navigation.js";

test("resolveCurrentNavPath normaliza home", () => {
  assert.equal(resolveCurrentNavPath("/"), "/");
  assert.equal(resolveCurrentNavPath("/index.html"), "/");
});

test("resolveCurrentNavPath mapeia rotas estaduais detalhadas para /estados", () => {
  assert.equal(resolveCurrentNavPath("/estado/ac"), "/estados");
  assert.equal(resolveCurrentNavPath("/estado/sp/"), "/estados");
});

test("resolveCurrentNavPath preserva rotas principais", () => {
  assert.equal(resolveCurrentNavPath("/regioes"), "/regioes");
  assert.equal(resolveCurrentNavPath("/municipios/"), "/municipios");
});
