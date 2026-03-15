---
title: Estados
toc: false
---

```js
document.querySelector('.site-nav a[href="/estados"]')?.setAttribute('aria-current', 'page');
```

```js
import {html} from "htl";
import {metricGrid} from "./components/cards.js";
import {createStateExplorer} from "./components/state-explorer.js";
import {formatNumber, formatPercent} from "./lib/formatters.js";

const latestStates = await FileAttachment("data/processed/latest-ufs.json").json();
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
const stateRows = [...latestStates].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);
const maxStateCoverage = Math.max(0.01, ...stateRows.map((row) => row.percentual_aprovado));
const rankingCard = html`<div class="state-ranking">
  ${stateRows.map((row, index) => html`<div class="state-ranking__row">
    <div class="state-ranking__header">
      <div class="state-ranking__label">
        <span class="state-ranking__position">${index + 1}</span>
        <strong>${row.uf}</strong>
        <span class="state-ranking__name">${row.estado_nome}</span>
      </div>
      <span class="state-ranking__value">${formatPercent(row.percentual_aprovado)}</span>
    </div>
    <div class="state-ranking__track" aria-hidden="true">
      <span class="state-ranking__fill" style=${`width:${Math.max(4, (row.percentual_aprovado / maxStateCoverage) * 100)}%`}></span>
    </div>
    <div class="state-ranking__meta">
      <span>${formatNumber(row.municipios_com_plano_aprovado)} aprovados</span>
      <span>${formatNumber(row.total_obrigados)} obrigados</span>
    </div>
  </div>`)}
</div>`;
```

# Estados

${metricGrid([
  {label: "Unidades da federação", value: formatNumber(latestStates.length)},
  {
    label: "Maior % aprovado",
    value: [...latestStates].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado)[0].uf
  },
  {
    label: "Mais planos aprovados",
    value: [...latestStates].sort((a, b) => b.municipios_com_plano_aprovado - a.municipios_com_plano_aprovado)[0].uf
  }
])}

<div class="card">
  <div class="section-heading">
    <div>
      <h2>Ranking por cobertura</h2>
      <p>Estados com maior percentual de municípios obrigados com plano aprovado.</p>
    </div>
  </div>
  ${rankingCard}
</div>

${createStateExplorer(latestStates, fetchMunicipiosByUf)}
