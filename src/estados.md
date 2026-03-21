---
title: Estados
toc: false
---

```js
import {html} from "htl";
import {metricGrid} from "./components/cards.js";
import {createStateExplorer} from "./components/state-explorer.js";
import {formatNumber, formatPercent} from "./lib/formatters.js";
import {createMunicipiosByUfCsvLoader} from "./lib/data-loaders.js";

const latestStates = await FileAttachment("data/processed/latest-ufs.json").json();
const fetchMunicipiosByUf = createMunicipiosByUfCsvLoader(
  FileAttachment("data/processed/latest-municipios.csv"),
);
const stateRows = [...latestStates].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);
const maxStateCoverage = Math.max(0.01, ...stateRows.map((row) => row.percentual_aprovado));
const rankingCard = (() => {
  const container = html`<div class="state-ranking">
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
        <span class="state-ranking__fill" data-width=${`${row.percentual_aprovado > 0 ? Math.max(4, (row.percentual_aprovado / maxStateCoverage) * 100) : 0}%`} style="width:0%"></span>
      </div>
      <div class="state-ranking__meta">
        <span>${formatNumber(row.municipios_com_plano_aprovado)} aprovados</span>
        <span>${formatNumber(row.total_obrigados)} obrigados</span>
      </div>
    </div>`)}
  </div>`;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        container.querySelectorAll(".state-ranking__fill").forEach((bar, i) => {
          bar.style.transition = `width 1.2s ease-in-out ${i * 150}ms`;
          bar.style.width = bar.dataset.width;
        });
        observer.disconnect();
      }
    },
    { threshold: window.innerWidth < 720 ? 0.2 : 0.5 },
  );
  observer.observe(container);

  return container;
})();
```

<style>
.metrics-grid--regioes { grid-template-columns: repeat(5, minmax(0, 1fr)); }
@media (max-width: 1100px) { .metrics-grid--regioes { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 720px)  { .metrics-grid--regioes { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>

# Estados

<p style="color: var(--theme-foreground-muted); margin: 0.25rem 0 0.5rem;">Estado com maior percentual de planos aprovados por região.</p>

${(() => {
  const regioes = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
  const cards = regioes.map(regiao => {
    const best = latestStates
      .filter(d => d.regiao === regiao)
      .sort((a, b) => b.percentual_aprovado - a.percentual_aprovado)[0];
    return {
      label: regiao,
      value: best.uf,
      detail: `${best.estado_nome} — ${formatPercent(best.percentual_aprovado)}`
    };
  });
  const grid = metricGrid(cards);
  grid.classList.add("metrics-grid--regioes");
  return grid;
})()}

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
