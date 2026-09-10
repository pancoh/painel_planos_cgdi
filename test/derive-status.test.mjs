import test from "node:test";
import assert from "node:assert/strict";
import {deriveStatus} from "../scripts/process-data-utils.mjs";

const base = {
  respondeu_ao_levantamento: "Respondeu",
  possui_plano_mobilidade: "Não",
  aprovado_lei: "Não possui plano",
  elaborando_plano: "Não",
};

test("Plano aprovado quando aprovado_lei = Sim", () => {
  assert.equal(deriveStatus({...base, possui_plano_mobilidade: "Sim", aprovado_lei: "Sim"}), "Plano aprovado");
});

test("conteúdo da resposta tem precedência sobre o canal (caso Pauini/Tabatinga)", () => {
  assert.equal(
    deriveStatus({
      respondeu_ao_levantamento: "Não foi enviado ofício",
      possui_plano_mobilidade: "Sim",
      aprovado_lei: "Sim",
      elaborando_plano: "Não",
    }),
    "Plano aprovado",
  );
  assert.equal(
    deriveStatus({
      respondeu_ao_levantamento: "Não respondeu",
      possui_plano_mobilidade: "Sim",
      aprovado_lei: "Não",
      elaborando_plano: "Não",
    }),
    "Possui plano",
  );
});

test("Possui plano quando há plano sem aprovação legal", () => {
  assert.equal(deriveStatus({...base, possui_plano_mobilidade: "Sim", aprovado_lei: "Não"}), "Possui plano");
});

test("Em elaboração para Sim e Em revisão", () => {
  assert.equal(deriveStatus({...base, elaborando_plano: "Sim"}), "Em elaboração");
  assert.equal(deriveStatus({...base, elaborando_plano: "Em revisão"}), "Em elaboração");
});

test("Sem ofício quando o canal não foi acionado e não há plano", () => {
  assert.equal(
    deriveStatus({
      respondeu_ao_levantamento: "Não foi enviado ofício",
      possui_plano_mobilidade: "Não foi enviado ofício",
      aprovado_lei: "Não foi enviado ofício",
      elaborando_plano: "Não foi enviado ofício",
    }),
    "Sem ofício",
  );
});

test("Sem resposta para Não respondeu e para valor ausente", () => {
  assert.equal(deriveStatus({...base, respondeu_ao_levantamento: "Não respondeu"}), "Sem resposta");
  assert.equal(deriveStatus({...base, respondeu_ao_levantamento: null}), "Sem resposta");
});

test("Sem plano quando respondeu e não tem plano", () => {
  assert.equal(deriveStatus(base), "Sem plano");
});
