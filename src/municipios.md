---
title: Municípios
toc: false
---

<style>.site-nav a[href="./municipios"] { background: var(--theme-foreground-focus); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(15,118,110,0.28); }</style>

```js
import {createMunicipioExplorer} from "./components/municipio-explorer.js";

// Carrega os 27 arquivos por UF em paralelo — mesmos bytes, mas aproveitando
// requests simultâneos em vez de um único arquivo serial de 8,5 MB
const latestMunicipios = (await Promise.all([
  FileAttachment("data/processed/municipios-uf-ac.json").json(),
  FileAttachment("data/processed/municipios-uf-al.json").json(),
  FileAttachment("data/processed/municipios-uf-am.json").json(),
  FileAttachment("data/processed/municipios-uf-ap.json").json(),
  FileAttachment("data/processed/municipios-uf-ba.json").json(),
  FileAttachment("data/processed/municipios-uf-ce.json").json(),
  FileAttachment("data/processed/municipios-uf-df.json").json(),
  FileAttachment("data/processed/municipios-uf-es.json").json(),
  FileAttachment("data/processed/municipios-uf-go.json").json(),
  FileAttachment("data/processed/municipios-uf-ma.json").json(),
  FileAttachment("data/processed/municipios-uf-mg.json").json(),
  FileAttachment("data/processed/municipios-uf-ms.json").json(),
  FileAttachment("data/processed/municipios-uf-mt.json").json(),
  FileAttachment("data/processed/municipios-uf-pa.json").json(),
  FileAttachment("data/processed/municipios-uf-pb.json").json(),
  FileAttachment("data/processed/municipios-uf-pe.json").json(),
  FileAttachment("data/processed/municipios-uf-pi.json").json(),
  FileAttachment("data/processed/municipios-uf-pr.json").json(),
  FileAttachment("data/processed/municipios-uf-rj.json").json(),
  FileAttachment("data/processed/municipios-uf-rn.json").json(),
  FileAttachment("data/processed/municipios-uf-ro.json").json(),
  FileAttachment("data/processed/municipios-uf-rr.json").json(),
  FileAttachment("data/processed/municipios-uf-rs.json").json(),
  FileAttachment("data/processed/municipios-uf-sc.json").json(),
  FileAttachment("data/processed/municipios-uf-se.json").json(),
  FileAttachment("data/processed/municipios-uf-sp.json").json(),
  FileAttachment("data/processed/municipios-uf-to.json").json(),
])).flat();
```

# Municípios

${createMunicipioExplorer(latestMunicipios, {title: "Consulta detalhada de municípios"})}
