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

```js
import * as Plot from "npm:@observablehq/plot";
import {PALETTE} from "./lib/theme.js";

const latestMunicipios = await FileAttachment("data/processed/latest-municipios.csv").csv({typed: true});

const ACIMA_250K = new Set(["De 250 mil a 500 mil", "De 500 mil a 1 milhão", "Mais de 1 milhão"]);

// Área acumulada empilhada com y1/y2
const cumulativeStacked = (() => {
  const grupos = ["Até 250 mil hab.", "Acima de 250 mil hab."];
  const aprovados = latestMunicipios.filter(d => d.ano_elaboracao && d.aprovado_lei === "Sim" && d.obrigado);

  // Contagem anual por grupo
  const annualByGrupo = new Map(grupos.map(grupo => [
    grupo,
    Array.from(
      d3.rollup(
        aprovados.filter(d => grupo === "Acima de 250 mil hab."
          ? ACIMA_250K.has(d.faixa_populacional_2022)
          : !ACIMA_250K.has(d.faixa_populacional_2022)),
        v => v.length,
        d => +d.ano_elaboracao,
      ),
      ([ano, count]) => ({ano, count})
    ).sort((a, b) => a.ano - b.ano)
  ]));

  // Todos os anos presentes
  const anos = [...new Set(aprovados.map(d => +d.ano_elaboracao))].sort((a, b) => a - b);

  // Cumulativo por grupo
  const cumMap = new Map(grupos.map(grupo => {
    let acc = 0;
    const rows = annualByGrupo.get(grupo);
    return [grupo, new Map(anos.map(ano => {
      const found = rows.find(r => r.ano === ano);
      acc += found ? found.count : 0;
      return [ano, acc];
    }))];
  }));

  // y1/y2 empilhado
  return anos.flatMap(ano => {
    const ute   = cumMap.get("Até 250 mil hab.").get(ano);
    const acima = cumMap.get("Acima de 250 mil hab.").get(ano);
    const total = ute + acima;
    return [
      {ano, grupo: "Até 250 mil hab.",     y1: 0,   y2: ute,   ymid: ute / 2,        label: String(total), total},
      {ano, grupo: "Acima de 250 mil hab.", y1: ute, y2: total, ymid: ute + acima / 2, label: String(total), total},
    ];
  });
})();

```


<div id="chart-evolucao" class="card" style="margin-top:1.5rem">
  <div class="section-heading">
    <div>
      <h2>Evolução acumulada dos planos aprovados</h2>
      <p>Total acumulado de municípios obrigados com plano aprovado, por ano e porte populacional.</p>
    </div>
  </div>

```js
const plot = Plot.plot({
  width,
  x: {label: null, tickFormat: d => String(d)},
  y: {label: "Planos aprovados", grid: true},
  color: {
    domain: ["Acima de 250 mil hab.", "Até 250 mil hab."],
    range: [PALETTE.blue, PALETTE.green],
    legend: true,
  },
  marks: [
    Plot.areaY(cumulativeStacked, {
      x: "ano", y1: "y1", y2: "y2",
      fill: "grupo", fillOpacity: 0.85, curve: "monotone-x",
    }),
    Plot.lineY(cumulativeStacked, {
      x: "ano", y: "y2",
      stroke: "grupo", strokeWidth: 1.5, curve: "monotone-x",
    }),
    Plot.text(cumulativeStacked.filter(d => d.grupo === "Acima de 250 mil hab."), {
      x: "ano", y: "y2",
      text: d => String(d.y2), dy: -13,
      fill: PALETTE.ink, fontSize: 11, fontWeight: "600",
    }),
    Plot.ruleY([0]),
  ],
  style: {fontFamily: "\"IBM Plex Sans\", \"Aptos\", \"Segoe UI\", \"Noto Sans\", \"Helvetica Neue\", sans-serif"},
  marginBottom: 20,
});

// Tooltip HTML — mesmo estilo do mapa
const tooltip = document.createElement("div");
tooltip.className = "map-tooltip";
tooltip.hidden = true;
const ttHeader = document.createElement("strong");
const ttLines = Array.from({length: 3}, () => document.createElement("span"));
tooltip.append(ttHeader, ...ttLines);

const xScale = plot.scale("x");
const anosUniq = [...new Set(cumulativeStacked.map(d => d.ano))].sort((a, b) => a - b);
const byAno = new Map(anosUniq.map(ano => [ano, cumulativeStacked.filter(d => d.ano === ano)]));

plot.addEventListener("mousemove", (event) => {
  const rect = plot.getBoundingClientRect();
  const xVal = xScale.invert(event.clientX - rect.left);
  const ano = anosUniq.reduce((best, a) => Math.abs(a - xVal) < Math.abs(best - xVal) ? a : best);
  const rows = byAno.get(ano);
  if (!rows) { tooltip.hidden = true; return; }
  const ute   = rows.find(d => d.grupo === "Até 250 mil hab.")?.y2 ?? 0;
  const acima = rows.find(d => d.grupo === "Acima de 250 mil hab.");
  const acimaVal = acima ? acima.y2 - ute : 0;
  const total = acima?.y2 ?? ute;
  ttHeader.textContent = String(ano);
  ttLines[0].textContent = `Até 250 mil hab.: ${ute.toLocaleString("pt-BR")}`;
  ttLines[1].textContent = `Acima de 250 mil hab.: ${acimaVal.toLocaleString("pt-BR")}`;
  ttLines[2].textContent = `Total acumulado: ${total.toLocaleString("pt-BR")}`;
  tooltip.hidden = false;
  tooltip.style.left = `${Math.min(event.clientX - rect.left + 14, rect.width - 225)}px`;
  tooltip.style.top  = `${Math.max(4, event.clientY - rect.top - 110)}px`;
});
plot.addEventListener("mouseleave", () => { tooltip.hidden = true; });

const wrapper = document.createElement("div");
wrapper.style.position = "relative";
wrapper.append(plot, tooltip);
display(wrapper);
```

</div>

<p class="page-note">No painel acima, é possível visualizar a situação de elaboração e aprovação dos Planos de Mobilidade Urbana nos municípios brasileiros, bem como o recorte populacional dos municípios com mais de 250 mil habitantes e daqueles com até 250 mil habitantes, considerando a obrigatoriedade de elaboração e aprovação do plano, nos termos do § 1º do art. 24 da Política Nacional de Mobilidade Urbana (PNMU) e com base nos dados publicados pelo Instituto Brasileiro de Geografia e Estatística (IBGE).</p>

<p class="page-note">Os dados utilizados neste painel estão disponíveis para download na aba <a href="/municipios">Municípios</a>, onde pode ser exportada a relação completa dos municípios com a situação de elaboração dos Planos de Mobilidade Urbana. A relação dos <a href="./obrigados">Municípios obrigados</a> a elaborar Plano de Mobilidade, nos termos da <a href="https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2012/lei/l12587.htm" target="_blank" rel="noopener">Lei Federal nº 12.587/2012</a>, também pode ser consultada e exportada por meio dos links indicados ao longo desta página.</p>

<p class="page-note" style="font-style:italic;opacity:0.85"><strong>Nota:</strong> As informações apresentadas são de responsabilidade das prefeituras. O Ministério das Cidades (MCID) não realiza avaliação do conteúdo dos Planos de Mobilidade Urbana informados.</p>
