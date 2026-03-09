---
title: Visão Brasil
toc: false
---

```js
import {html} from "htl";
import {metricGrid} from "./components/cards.js";
import {brazilCoverageMap} from "./components/brazil-map.js";
import {formatDate, formatNumber, formatPercent} from "./lib/formatters.js";

const metadata = await FileAttachment("data/processed/metadata.json").json();
const latestRegions = await FileAttachment("data/processed/latest-regioes.json").json();
const latestStates = await FileAttachment("data/processed/latest-ufs.json").json();
const summary = metadata.latest_summary;
const previousSummary = metadata.previous_summary;
const obrigadosSemPlanoAprovado = summary.total_obrigados - summary.municipios_com_plano_aprovado;
const percentualAprovadoDelta = previousSummary
  ? (summary.percentual_aprovado - previousSummary.percentual_aprovado) * 100
  : null;
const percentualAprovadoDeltaText = percentualAprovadoDelta == null || Math.abs(percentualAprovadoDelta) < 0.05
  ? "Estável"
  : `${percentualAprovadoDelta > 0 ? "+" : ""}${percentualAprovadoDelta.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    })} p.p.`;
const regionOrder = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const summaryCards = metricGrid([
  {label: "Municípios", value: formatNumber(summary.total_municipios)},
  {label: "Obrigados (Censo 2022)", value: formatNumber(summary.total_obrigados)},
  {
    label: "Plano aprovado",
    value: formatNumber(summary.municipios_com_plano_aprovado),
    delta: metadata.monthly_delta?.municipios_com_plano_aprovado
  },
  {
    label: "Percentual aprovado",
    value: formatPercent(summary.percentual_aprovado),
    delta: percentualAprovadoDelta,
    deltaText: percentualAprovadoDeltaText
  }
]);
const approvedBar = html`<div class="approval-bar">
  <div class="approval-bar__legend">
    <span><i class="swatch swatch-approved"></i>Com plano aprovado</span>
    <span><i class="swatch swatch-pending"></i>Sem plano aprovado</span>
  </div>
  <div class="approval-bar__track" aria-label="Municípios obrigados com e sem plano aprovado">
    <div
      class="approval-bar__segment approval-bar__segment--approved"
      style=${`width:${(summary.municipios_com_plano_aprovado / summary.total_obrigados) * 100}%`}
    >
      <strong>${formatNumber(summary.municipios_com_plano_aprovado)}</strong>
    </div>
    <div
      class="approval-bar__segment approval-bar__segment--pending"
      style=${`width:${(obrigadosSemPlanoAprovado / summary.total_obrigados) * 100}%`}
    >
      <strong>${formatNumber(obrigadosSemPlanoAprovado)}</strong>
    </div>
  </div>
  <div class="approval-bar__meta">
    <span>Total de obrigados: ${formatNumber(summary.total_obrigados)}</span>
    <span>Percentual com plano aprovado: ${formatPercent(summary.percentual_aprovado)}</span>
  </div>
</div>`;
const regionRows = [...latestRegions].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);
const maxRegionCoverage = Math.max(...regionRows.map((row) => row.percentual_aprovado), 0.01);
const regionCard = html`<div class="region-ranking">
  ${regionRows.map((row, index) => html`<div class="region-ranking__row">
    <div class="region-ranking__header">
      <div class="region-ranking__label">
        <span class="region-ranking__position">${index + 1}</span>
        <strong>${row.regiao}</strong>
      </div>
      <span class="region-ranking__value">${formatPercent(row.percentual_aprovado)}</span>
    </div>
    <div class="region-ranking__track" aria-hidden="true">
      <span class="region-ranking__fill" style=${`width:${Math.max(10, (row.percentual_aprovado / maxRegionCoverage) * 100)}%`}></span>
    </div>
    <div class="region-ranking__meta">
      <span>${formatNumber(row.municipios_com_plano_aprovado)} aprovados</span>
      <span>${formatNumber(row.total_obrigados)} obrigados</span>
    </div>
  </div>`)}
</div>`;
const dashboardLayout = html`<section class="dashboard-hero">
  <div class="dashboard-toolbar">
    <div class="dashboard-toolbar__title">
      <h1>Situação dos planos de mobilidade urbana</h1>
      <p>Painel público para acompanhamento.</p>
    </div>
    <div class="dashboard-toolbar__side">
      <div class="dashboard-toolbar__meta">
        <span><strong>Atualização:</strong> ${formatDate(metadata.last_reference_date)}</span>
      </div>
    </div>
  </div>
  <div class="card panel-card panel-card--summary-strip">
    <div class="section-heading">
      <div>
        <h2>Resumo nacional</h2>
        <p>Municípios obrigados a elaborar e aprovar plano, conforme a Lei nº 12.587/2012.</p>
      </div>
    </div>
    <div class="summary-strip__grid">
      ${summaryCards}
    </div>
  </div>
  <div class="dashboard-stage">
    <aside class="dashboard-sidebar">
      <div class="card panel-card panel-card--compact">
        <div class="section-heading">
          <div>
            <h2>Obrigados e planos aprovados</h2>
            <p>Entre os municípios obrigados, quantos já possuem plano aprovado.</p>
          </div>
        </div>
        ${approvedBar}
      </div>
      <div class="card panel-card panel-card--compact">
        <div class="section-heading">
          <div>
            <h2>Cobertura por região</h2>
            <p>Ranking do percentual de municípios obrigados com plano aprovado.</p>
          </div>
        </div>
        ${regionCard}
      </div>
    </aside>
    <div class="dashboard-main">
      <div class="card panel-card panel-card--map">
        <div class="section-heading">
          <div>
            <h2>Mapa por unidade da federação</h2>
            <p>O mapa destaca, por UF, quantos municípios obrigados pela Lei nº 12.587/2012 já possuem plano aprovado.</p>
          </div>
        </div>
        ${brazilCoverageMap(latestStates)}
      </div>
    </div>
  </div>
</section>`;
```
${dashboardLayout}
