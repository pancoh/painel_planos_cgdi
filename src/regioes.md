---
title: Regiões
toc: false
---

<style>.site-nav a[href="./regioes"] { background: var(--theme-foreground-focus); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(15,118,110,0.28); }</style>

```js
import {metricGrid} from "./components/cards.js";
import {createRegionExplorer} from "./components/region-explorer.js";
import {formatNumber, formatPercent} from "./lib/formatters.js";

const latestRegions = await FileAttachment("data/processed/latest-regioes.json").json();
const latestStates = await FileAttachment("data/processed/latest-ufs.json").json();
const regionSeries = await FileAttachment("data/processed/regioes-series.json").json();
```

# Regiões

${metricGrid(
  latestRegions.map((row) => ({
    label: row.regiao,
    value: formatPercent(row.percentual_aprovado),
    detail: `${formatNumber(row.municipios_com_plano_aprovado)} planos aprovados`,
    tone: "accent"
  }))
)}

${createRegionExplorer(latestRegions, regionSeries, latestStates)}
