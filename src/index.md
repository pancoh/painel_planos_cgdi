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

// Dados municipais por UF — carregados sob demanda ao clicar no mapa
const _ufFiles = {
  AC: FileAttachment("data/processed/municipios-uf-ac.json"),
  AL: FileAttachment("data/processed/municipios-uf-al.json"),
  AM: FileAttachment("data/processed/municipios-uf-am.json"),
  AP: FileAttachment("data/processed/municipios-uf-ap.json"),
  BA: FileAttachment("data/processed/municipios-uf-ba.json"),
  CE: FileAttachment("data/processed/municipios-uf-ce.json"),
  DF: FileAttachment("data/processed/municipios-uf-df.json"),
  ES: FileAttachment("data/processed/municipios-uf-es.json"),
  GO: FileAttachment("data/processed/municipios-uf-go.json"),
  MA: FileAttachment("data/processed/municipios-uf-ma.json"),
  MG: FileAttachment("data/processed/municipios-uf-mg.json"),
  MS: FileAttachment("data/processed/municipios-uf-ms.json"),
  MT: FileAttachment("data/processed/municipios-uf-mt.json"),
  PA: FileAttachment("data/processed/municipios-uf-pa.json"),
  PB: FileAttachment("data/processed/municipios-uf-pb.json"),
  PE: FileAttachment("data/processed/municipios-uf-pe.json"),
  PI: FileAttachment("data/processed/municipios-uf-pi.json"),
  PR: FileAttachment("data/processed/municipios-uf-pr.json"),
  RJ: FileAttachment("data/processed/municipios-uf-rj.json"),
  RN: FileAttachment("data/processed/municipios-uf-rn.json"),
  RO: FileAttachment("data/processed/municipios-uf-ro.json"),
  RR: FileAttachment("data/processed/municipios-uf-rr.json"),
  RS: FileAttachment("data/processed/municipios-uf-rs.json"),
  SC: FileAttachment("data/processed/municipios-uf-sc.json"),
  SE: FileAttachment("data/processed/municipios-uf-se.json"),
  SP: FileAttachment("data/processed/municipios-uf-sp.json"),
  TO: FileAttachment("data/processed/municipios-uf-to.json"),
};
const fetchMunicipiosByUf = (uf) => _ufFiles[uf]?.json() ?? Promise.resolve([]);

// Geometria municipal por código IBGE do estado — carregada sob demanda ao clicar no mapa
const _geoFiles = {
  "11": FileAttachment("geo/municipios-11.json"),
  "12": FileAttachment("geo/municipios-12.json"),
  "13": FileAttachment("geo/municipios-13.json"),
  "14": FileAttachment("geo/municipios-14.json"),
  "15": FileAttachment("geo/municipios-15.json"),
  "16": FileAttachment("geo/municipios-16.json"),
  "17": FileAttachment("geo/municipios-17.json"),
  "21": FileAttachment("geo/municipios-21.json"),
  "22": FileAttachment("geo/municipios-22.json"),
  "23": FileAttachment("geo/municipios-23.json"),
  "24": FileAttachment("geo/municipios-24.json"),
  "25": FileAttachment("geo/municipios-25.json"),
  "26": FileAttachment("geo/municipios-26.json"),
  "27": FileAttachment("geo/municipios-27.json"),
  "28": FileAttachment("geo/municipios-28.json"),
  "29": FileAttachment("geo/municipios-29.json"),
  "31": FileAttachment("geo/municipios-31.json"),
  "32": FileAttachment("geo/municipios-32.json"),
  "33": FileAttachment("geo/municipios-33.json"),
  "35": FileAttachment("geo/municipios-35.json"),
  "41": FileAttachment("geo/municipios-41.json"),
  "42": FileAttachment("geo/municipios-42.json"),
  "43": FileAttachment("geo/municipios-43.json"),
  "50": FileAttachment("geo/municipios-50.json"),
  "51": FileAttachment("geo/municipios-51.json"),
  "52": FileAttachment("geo/municipios-52.json"),
  "53": FileAttachment("geo/municipios-53.json"),
};
const fetchGeoByState = (codarea) => _geoFiles[String(codarea)]?.json() ?? Promise.resolve({features: []});
const summary = metadata.latest_summary;
const previousSummary = metadata.previous_summary;
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
const statsAcima  = metadata.approval_by_population.acima_250k;
const statsAbaixo = metadata.approval_by_population.abaixo_250k;
const statsTotal  = metadata.approval_by_population.total;
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
           style=${`width:${(stats.sem_plano / stats.total) * 100}%`}>
        <strong>${formatNumber(stats.sem_plano)}</strong>
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
  ${approvalGroup("Acima de 250 mil habitantes", statsAcima)}
  ${approvalGroup("Até 250 mil habitantes", statsAbaixo)}
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
        ${brazilCoverageMap(latestStates, estadosGeo, fetchMunicipiosByUf, fetchGeoByState)}
      </div>
    </div>
  </div>
</section>`;

```

```js
display(dashboardLayout)
```

<p class="page-note">No painel acima, é possível visualizar a situação de elaboração e aprovação dos Planos de Mobilidade Urbana nos municípios brasileiros, bem como o recorte populacional dos municípios com mais de 250 mil habitantes e daqueles com até 250 mil habitantes, considerando a obrigatoriedade de elaboração e aprovação do plano, nos termos do § 1º do art. 24 da Política Nacional de Mobilidade Urbana (PNMU) e com base nos dados publicados pelo Instituto Brasileiro de Geografia e Estatística (IBGE).</p>

<p class="page-note">Os dados utilizados neste painel estão disponíveis para download na aba <a href="/municipios">Municípios</a>, onde pode ser exportada a relação completa dos municípios com a situação de elaboração dos Planos de Mobilidade Urbana, assim como a lista dos municípios obrigados, nos termos da Lei Federal nº 12.587/2012.</p>

<p class="page-note">Ressalta-se que as informações apresentadas são de responsabilidade das prefeituras. O Ministério das Cidades (MCID) não realiza avaliação do conteúdo dos Planos de Mobilidade Urbana informados.</p>
