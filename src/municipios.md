---
title: Municípios
toc: false
---

```js
import {createMunicipioExplorer} from "./components/municipio-explorer.js";
import {parseMunicipiosCsv} from "./lib/municipios-data.js";

const latestMunicipios = parseMunicipiosCsv(
  await FileAttachment("data/processed/latest-municipios.csv").text()
);
```

# Municípios

${createMunicipioExplorer(latestMunicipios, {title: "Consulta detalhada de municípios"})}
