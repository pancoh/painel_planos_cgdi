import test from "node:test";
import assert from "node:assert/strict";
import {municipioRowsToCsv} from "../src/components/municipio-explorer.js";

test("CSV municipal exporta as mesmas colunas e valores exibidos na tabela", () => {
  const csv = municipioRowsToCsv([{
    municipio: "São Paulo",
    codigo_ibge: "3550308",
    uf: "SP",
    regiao: "Sudeste",
    status_painel: "Plano aprovado",
    obrigado: true,
    populacao_censo_2022: 11451999,
    possui_plano_mobilidade: "sim",
    aprovado_lei: "não",
    instrumento_legal: null,
    numero_da_lei: "56.834/2016",
    data_da_lei: "2016-02-24",
  }]);

  const [header, row] = csv.slice(1).trimEnd().split("\n");
  assert.equal(
    header,
    "Município,Código IBGE,UF,Região,Status,Obrigatoriedade,Pop. 2022,Plano,Aprovado,Instrumento Legal,Nº da Lei,Data da Lei",
  );
  assert.equal(
    row,
    "São Paulo,3550308,SP,Sudeste,Plano aprovado,Obrigatório,11.451.999,Sim,Não,—,56.834/2016,24/02/2016",
  );
});
