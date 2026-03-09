---
title: Municípios
toc: false
---

```js
import {createMunicipioExplorer} from "./components/municipio-explorer.js";
const latestMunicipios = await FileAttachment("data/processed/latest-municipios.json").json();
```

# Municípios

${createMunicipioExplorer(latestMunicipios, {title: "Consulta detalhada de municípios"})}
