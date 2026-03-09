---
title: Estado
toc: false
---

```js
import {metricGrid} from "../components/cards.js";
import {createMunicipioExplorer} from "../components/municipio-explorer.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";

const uf = "CE";
const latestStates = await FileAttachment("../data/processed/latest-ufs.json").json();
const latestMunicipios = await FileAttachment("../data/processed/latest-municipios.json").json();
const state = latestStates.find((row) => row.uf === uf);
const stateRows = latestMunicipios.filter((row) => row.uf === uf);
```

# ${state.estado_nome}

${metricGrid([
  {label: "Municípios", value: formatNumber(state.total_municipios)},
  {label: "Obrigados", value: formatNumber(state.total_obrigados)},
  {label: "Com plano", value: formatNumber(state.municipios_com_plano)},
  {label: "Planos aprovados", value: formatNumber(state.municipios_com_plano_aprovado)},
  {label: "Sem resposta", value: formatNumber(state.municipios_sem_resposta)},
  {label: "Cobertura estadual", value: formatPercent(state.percentual_cobertura), tone: "accent"}
])}

${createMunicipioExplorer(stateRows, {
  title: `Tabela municipal de ${state.estado_nome}`,
  defaultUf: uf,
  showUfFilter: false,
  showRegionFilter: false
})}
