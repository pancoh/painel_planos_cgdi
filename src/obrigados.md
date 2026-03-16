---
title: Municípios obrigados
toc: false
---

```js
import {html} from "npm:htl";
import {csvBlob, formatNumber, slug} from "./lib/formatters.js";

const obrigados = await FileAttachment("./data/processed/obrigados.json").json();
const sorted = [...obrigados].sort((a, b) => a.municipio.localeCompare(b.municipio, "pt-BR") || a.uf.localeCompare(b.uf));
const rows = sorted;

const exportButton = html`<button class="button button-primary">Exportar base completa</button>`;
exportButton.onclick = () => {
  const url = URL.createObjectURL(csvBlob(sorted));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `municipios-${slug("obrigados-pnmu")}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
};
```

<div class="card" style="padding:1.4rem;margin-bottom:1rem">
  <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap">
    <div>
      <h1 style="margin:0;font-size:2.3rem;color:var(--theme-foreground-focus)">Municípios obrigados</h1>
      <p style="margin:0.4rem 0 0;color:var(--theme-foreground-muted);font-size:1.08rem;max-width:62rem">Relação de municípios obrigados à elaboração do Plano de Mobilidade Urbana, nos termos da Lei nº 12.587/2012 e da Lei nº 14.000/2020.</p>
    </div>
    <a class="button button-secondary" href="./">← Voltar ao painel</a>
  </div>
</div>

<div class="table-shell">
  <div class="table-meta" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem">
    <span>${formatNumber(sorted.length)} municípios obrigados</span>
    ${exportButton}
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr style="text-align:center">
          <th>Município</th>
          <th>UF</th>
          <th>Região</th>
          <th>População (Censo 2022)</th>
          <th>RM / RIDE / AU</th>
          <th>Critério</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((item) => html`<tr><td>${item.municipio}</td><td>${item.uf}</td><td>${item.regiao}</td><td>${formatNumber(item.populacao_censo_2022)}</td><td>${item.rm_ride_au || "—"}</td><td>${item.criterio_obrigatoriedade}</td></tr>`)}
      </tbody>
    </table>
  </div>
</div>
