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
const estadosGeo = await FileAttachment("geo/estados.json").json();
const latestMunicipios = await FileAttachment("data/processed/latest-municipios.json").json();
const municipiosGeo = await FileAttachment("data/municipios-geo.json").json();
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
const POP_THRESHOLD = 250_000;
const getPopulation = (row) => row.populacao_censo_2022 ?? row.estimativa_populacional ?? 0;
const obrigados = latestMunicipios.filter((r) => r.obrigado === true);
const grupoAbaixo = obrigados.filter((r) => getPopulation(r) < POP_THRESHOLD);
const grupoAcima  = obrigados.filter((r) => getPopulation(r) >= POP_THRESHOLD);
function groupStats(rows) {
  const total     = rows.length;
  const aprovados = rows.filter((r) => r.aprovado_lei === "Sim").length;
  return { total, aprovados, semPlano: total - aprovados, pct: total > 0 ? aprovados / total : 0 };
}
const statsAbaixo = groupStats(grupoAbaixo);
const statsAcima  = groupStats(grupoAcima);
const statsTotal  = groupStats(obrigados);
function approvalGroup(label, stats) {
  return html`<div class="approval-group">
    <div class="approval-group__header">
      ${label}
    </div>
    <div class="approval-bar__track" aria-label=${label}>
      <div class="approval-bar__segment approval-bar__segment--approved"
           style=${`width:${(stats.aprovados / stats.total) * 100}%`}>
        <strong>${formatNumber(stats.aprovados)}</strong>
      </div>
      <div class="approval-bar__segment approval-bar__segment--pending"
           style=${`width:${(stats.semPlano / stats.total) * 100}%`}>
        <strong>${formatNumber(stats.semPlano)}</strong>
      </div>
    </div>
    <div class="approval-bar__meta">
      <span>Total de obrigados: ${formatNumber(stats.total)}</span>
      <span>Percentual com plano aprovado: <strong>${formatPercent(stats.pct)}</strong></span>
    </div>
  </div>`;
}
const approvedBar = html`<div class="approval-bar">
  <div class="approval-bar__legend">
    <span><i class="swatch swatch-approved"></i>Com plano aprovado</span>
    <span><i class="swatch swatch-pending"></i>Sem plano aprovado</span>
  </div>
  ${approvalGroup("Até 250 mil habitantes", statsAbaixo)}
  ${approvalGroup("Acima de 250 mil habitantes", statsAcima)}
  <div class="approval-bar__meta">
    <span>Total de obrigados: ${formatNumber(statsTotal.total)}</span>
    <span>Percentual com plano aprovado: <strong>${formatPercent(statsTotal.pct)}</strong></span>
  </div>
</div>`;
const regionRows = [...latestRegions].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);
const maxRegionCoverage = Math.max(0.01, ...regionRows.map((row) => row.percentual_aprovado));
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
        <h2>Resumo Nacional</h2>
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
        ${brazilCoverageMap(latestStates, estadosGeo, latestMunicipios, municipiosGeo)}
      </div>
    </div>
  </div>
</section>`;

```

```js
display(dashboardLayout)
```

<p class="page-note">No painel acima, está disponível a visualização da situação de elaboração e aprovação dos planos de mobilidade urbana de cada um dos municípios do país e ainda a visualização pelo recorte populacional, acima e abaixo de 250 mil habitantes, dos municípios obrigados a elaborar e a aprovar o Plano de Mobilidade Urbana, segundo critérios elencados pelo § 1º do art. 24 da PNMU e conforme dados publicados pelo Instituto Brasileiro de Geografia e Estatística (IBGE).</p>

<p class="page-note">Os dados utilizados neste painel estão disponíveis para download na aba <a href="/municipios">Municípios</a>, onde é possível exportar a relação completa dos municípios com a situação de elaboração dos planos de mobilidade urbana e a relação dos municípios obrigados, segundo a Lei Federal nº 12.587/2012. Cabe ressaltar que as informações prestadas são de responsabilidade das prefeituras. Destacamos ainda que em nenhum momento houve qualquer avaliação do conteúdo dos Planos de Mobilidade Urbana por parte do Ministério das Cidades (MCID).</p>
