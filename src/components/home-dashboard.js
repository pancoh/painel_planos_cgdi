import {html} from "htl";
import {metricGrid} from "./cards.js";
import {brazilCoverageMap} from "./brazil-map.js";
import {formatDate, formatNumber, formatPercent} from "../lib/formatters.js";

export function createHomeDashboard({
  metadata,
  latestRegions,
  latestStates,
  estadosGeo,
  fetchMunicipiosByUf,
  fetchGeoByState,
}) {
  const summary = metadata.latest_summary;
  // Cálculos de variação mês anterior — desabilitados
  // const previousSummary = metadata.previous_summary;
  // const percentualAprovadoDelta = previousSummary
  //   ? (summary.percentual_aprovado - previousSummary.percentual_aprovado) * 100
  //   : null;
  // const percentualAprovadoDeltaText = percentualAprovadoDelta == null || Math.abs(percentualAprovadoDelta) < 0.05
  //   ? "Estável"
  //   : `${percentualAprovadoDelta > 0 ? "+" : ""}${percentualAprovadoDelta.toLocaleString("pt-BR", {
  //       minimumFractionDigits: 1,
  //       maximumFractionDigits: 1,
  //     })} p.p.`;

  return html`<section class="dashboard-hero">
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
          <p>Municípios <a href="./obrigados">obrigados</a> a elaborar e aprovar plano, conforme a <a href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm" target="_blank" rel="noopener">Lei nº 12.587/2012</a>.</p>
        </div>
      </div>
      <div class="summary-strip__grid">
        ${createSummaryCards(summary)}
      </div>
    </div>
    <div class="dashboard-stage">
      <aside class="dashboard-sidebar">
        <div class="card panel-card panel-card--compact">
          <div class="section-heading">
            <div>
              <h2>Obrigados e planos aprovados</h2>
              <p>Entre os <a href="./obrigados">municípios obrigados</a>, quantos já possuem plano aprovado.</p>
            </div>
          </div>
          ${createApprovalBar(metadata.approval_by_population)}
        </div>
        <div class="card panel-card panel-card--compact">
          <div class="section-heading">
            <div>
              <h2>Cobertura por região</h2>
              <p>Ranking do percentual de <a href="./obrigados">municípios obrigados</a> com plano aprovado.</p>
            </div>
          </div>
          ${createRegionRankingCard(latestRegions)}
        </div>
      </aside>
      <div class="dashboard-main">
        <div class="card panel-card panel-card--map">
          <div class="section-heading">
            <div>
              <h2>Mapa por unidade da federação</h2>
              <p>O mapa destaca, por UF, quantos <a href="./obrigados">municípios obrigados</a> pela <a href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm" target="_blank" rel="noopener">Lei nº 12.587/2012</a> já possuem plano aprovado.</p>
            </div>
          </div>
          ${brazilCoverageMap(latestStates, estadosGeo, fetchMunicipiosByUf, fetchGeoByState)}
        </div>
      </div>
    </div>
  </section>`;
}

function createSummaryCards(summary /*, metadata, percentualAprovadoDelta, percentualAprovadoDeltaText */) {
  return metricGrid([
    {label: "Municípios", value: formatNumber(summary.total_municipios)},
    {label: "Obrigados (Censo 2022)", value: formatNumber(summary.total_obrigados)},
    {
      label: "Plano aprovado",
      value: formatNumber(summary.municipios_com_plano_aprovado),
      // delta: metadata.monthly_delta?.municipios_com_plano_aprovado,  // variação mês anterior — desabilitado
    },
    {
      label: "Percentual aprovado",
      value: formatPercent(summary.percentual_aprovado),
      // delta: percentualAprovadoDelta,        // variação mês anterior — desabilitado
      // deltaText: percentualAprovadoDeltaText, // variação mês anterior — desabilitado
    },
  ]);
}

function createApprovalBar(approvalByPopulation) {
  const statsAcima = approvalByPopulation.acima_250k;
  const statsAbaixo = approvalByPopulation.abaixo_250k;
  const statsTotal = approvalByPopulation.total;

  return html`<div class="approval-bar">
    <div class="approval-bar__legend">
      <span><i class="swatch swatch-approved"></i>Com plano aprovado</span>
      <span><i class="swatch swatch-pending"></i>Sem plano aprovado</span>
    </div>
    ${approvalGroup("Acima de 250 mil habitantes", statsAcima)}
    ${approvalGroup("Até 250 mil habitantes", statsAbaixo)}
    <div class="approval-bar__meta">
      <span>Total de obrigados: ${formatNumber(statsTotal.total)}</span>
      <span>Percentual com plano aprovado: <strong>${formatPercent(statsTotal.pct)}</strong></span>
    </div>
  </div>`;
}

function approvalGroup(label, stats) {
  const approvedWidth = stats.total > 0 ? (stats.aprovados / stats.total) * 100 : 0;
  const pendingWidth = stats.total > 0 ? (stats.sem_plano / stats.total) * 100 : 0;
  return html`<div class="approval-group">
    <div class="approval-group__header">${label}</div>
    <div class="approval-bar__track" aria-label=${label}>
      <div class="approval-bar__segment approval-bar__segment--approved" style=${`width:${approvedWidth}%`}>
        <strong>${formatNumber(stats.aprovados)}</strong>
      </div>
      <div class="approval-bar__segment approval-bar__segment--pending" style=${`width:${pendingWidth}%`}>
        <strong>${formatNumber(stats.sem_plano)}</strong>
      </div>
    </div>
    <div class="approval-bar__meta">
      <span>Total de obrigados: ${formatNumber(stats.total)}</span>
      <span>Percentual com plano aprovado: <strong>${formatPercent(stats.pct)}</strong></span>
    </div>
  </div>`;
}

function createRegionRankingCard(latestRegions) {
  const regionRows = [...latestRegions].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);
  const maxRegionCoverage = Math.max(0.01, ...regionRows.map((row) => row.percentual_aprovado));

  return html`<div class="region-ranking">
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
}
