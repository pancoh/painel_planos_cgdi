---
title: Visão Brasil
toc: false
---

```js
import {createHomeDashboard} from "./components/home-dashboard.js";
import {createGeoByStateLoader, createMunicipiosByUfJsonLoader} from "./lib/data-loaders.js";

const metadata = await FileAttachment("data/processed/metadata.json").json();
const latestRegions = await FileAttachment("data/processed/latest-regioes.json").json();
const latestStates = await FileAttachment("data/processed/latest-ufs.json").json();
const estadosGeo = await FileAttachment("geo/estados.json").json();
const ufAttachments = {
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
const geoAttachments = {
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
const fetchMunicipiosByUf = createMunicipiosByUfJsonLoader(ufAttachments);
const fetchGeoByState = createGeoByStateLoader(geoAttachments);
const dashboardLayout = createHomeDashboard({
  metadata,
  latestRegions,
  latestStates,
  estadosGeo,
  fetchMunicipiosByUf,
  fetchGeoByState,
});
```

```js
display(dashboardLayout)
```

<p class="page-note">No painel acima, é possível visualizar a situação de elaboração e aprovação dos Planos de Mobilidade Urbana nos municípios brasileiros, bem como o recorte populacional dos municípios com mais de 250 mil habitantes e daqueles com até 250 mil habitantes, considerando a obrigatoriedade de elaboração e aprovação do plano, nos termos do § 1º do art. 24 da Política Nacional de Mobilidade Urbana (PNMU) e com base nos dados publicados pelo Instituto Brasileiro de Geografia e Estatística (IBGE).</p>

<p class="page-note">Os dados utilizados neste painel estão disponíveis para download na aba <a href="/municipios">Municípios</a>, onde pode ser exportada a relação completa dos municípios com a situação de elaboração dos Planos de Mobilidade Urbana. A relação dos <a href="./obrigados">municípios obrigados</a> a elaborar Plano de Mobilidade, nos termos da <a href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm" target="_blank" rel="noopener">Lei Federal nº 12.587/2012</a>, também pode ser consultada e exportada por meio dos links indicados ao longo desta página.</p>

<p class="page-note" style="font-style:italic;opacity:0.85"><strong>Nota:</strong> As informações apresentadas são de responsabilidade das prefeituras. O Ministério das Cidades (MCID) não realiza avaliação do conteúdo dos Planos de Mobilidade Urbana informados.</p>
