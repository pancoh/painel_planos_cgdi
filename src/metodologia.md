---
title: Metodologia
toc: false
---

```js
import {formatDate, formatNumber} from "./lib/formatters.js";
const metadata = await FileAttachment("data/processed/metadata.json").json();
const snapshots = await FileAttachment("data/processed/snapshots.json").json();
```

# Metodologia

<div class="card">
  <div class="section-heading">
    <div>
      <h2>Fonte e atualização</h2>
      <p>O painel é gerado a partir da pasta histórica oficial de arquivos Excel do levantamento sobre Planos de Mobilidade Urbana.</p>
    </div>
  </div>
  <table class="data-table">
    <tbody>
      <tr><th>Diretório de origem</th><td>${metadata.source_directory}</td></tr>
      <tr><th>Última referência processada</th><td>${formatDate(metadata.last_reference_date)}</td></tr>
      <tr><th>Total de snapshots</th><td>${formatNumber(metadata.total_snapshots)}</td></tr>
      <tr><th>Total de linhas históricas tratadas</th><td>${formatNumber(metadata.total_historical_rows)}</td></tr>
    </tbody>
  </table>
</div>

## Regras do pipeline

1. Leitura automática de todos os arquivos `.xlsx` da pasta histórica.
2. Ordenação por data de referência extraída do nome do arquivo.
3. Extração da aba principal `Levantamento`.
4. Padronização de nomes de colunas com tolerância a pequenas mudanças entre versões.
5. Padronização textual de valores como `Sim`, `Nao`, `SIM`, `Nao respondeu` e `Nao foi enviado oficio`.
6. Consolidação de uma base histórica única de escala municipal.
7. Geração de agregações por Brasil, região e UF.
8. Exportação de arquivos derivados em JSON e CSV para consumo no build do site.

## Base legal da obrigatoriedade

O painel adota como referência a [Lei nº 12.587, de 3 de janeiro de 2012](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm), com redação dada pela Lei nº 14.000, de 2020. Conforme o art. 24, § 1º, ficam obrigados a elaborar e a aprovar Plano de Mobilidade Urbana os municípios:

1. com mais de 20 mil habitantes;
2. integrantes de regiões metropolitanas, RIDE e aglomerações urbanas com população total superior a 1 milhão de habitantes;
3. integrantes de áreas de interesse turístico.

Para a leitura principal do painel, a obrigatoriedade é baseada no campo oficial `Obrigados Censo 2022 - atualizado`, correspondente à relação publicada para fins de acompanhamento federal.

## Prazos legais

1. `12 de abril de 2024`: municípios com mais de 250 mil habitantes.
2. `12 de abril de 2025`: municípios com até 250 mil habitantes.

Encerrados esses prazos, os municípios sem plano aprovado ficam sujeitos à restrição prevista no art. 24, § 8º, quanto ao acesso a recursos federais destinados à mobilidade urbana, exceto para a elaboração do próprio plano.

## Classificação `status_painel`

1. `Sem ofício`: quando `Respondeu ao levantamento` indica que não houve envio de ofício.
2. `Sem resposta`: quando não há resposta válida ao levantamento.
3. `Plano aprovado`: quando `Aprovado em lei ou ato normativo = Sim`.
4. `Possui plano`: quando há plano, mas sem aprovação legal identificada.
5. `Em elaboração`: quando `Elaborando plano = Sim` ou `Em revisão`.
6. `Sem plano`: demais situações respondidas sem plano identificado.

## Arquivos derivados

<div class="card">
  <table class="data-table">
    <thead>
      <tr><th>Arquivo</th><th>Descrição</th></tr>
    </thead>
    <tbody>
      <tr><td>`metadata.json`</td><td>Metadados do processamento e resumo mais recente.</td></tr>
      <tr><td>`brasil-series.json`</td><td>Série histórica agregada do Brasil.</td></tr>
      <tr><td>`regioes-series.json`</td><td>Série histórica por região.</td></tr>
      <tr><td>`ufs-series.json`</td><td>Série histórica por UF.</td></tr>
      <tr><td>`latest-ufs.json`</td><td>Resumo estadual da última referência.</td></tr>
      <tr><td>`latest-municipios.csv`</td><td>Base municipal mais recente para consulta e download.</td></tr>
    </tbody>
  </table>
</div>

## Histórico disponível

<div class="card">
  <table class="data-table">
    <thead>
      <tr><th>Arquivo</th><th>Referência</th><th>Municípios</th></tr>
    </thead>
    <tbody>
      ${snapshots.map((row) => `<tr><td>${row.file_name}</td><td>${row.reference_label}</td><td>${formatNumber(row.municipality_count)}</td></tr>`).join("")}
    </tbody>
  </table>
</div>
