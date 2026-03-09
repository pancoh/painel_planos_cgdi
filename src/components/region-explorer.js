import {metricGrid} from "./cards.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";

export function createRegionExplorer(regions, series, states) {
  const root = document.createElement("section");
  root.className = "region-explorer";
  let current = regions[0]?.regiao;

  const heading = document.createElement("div");
  heading.className = "section-heading";
  heading.innerHTML = `<div><h2>Leitura regional</h2><p>Comparação territorial e evolução histórica das grandes regiões.</p></div>`;

  const controls = document.createElement("div");
  controls.className = "table-controls";
  const select = document.createElement("select");
  for (const region of regions) {
    const option = document.createElement("option");
    option.value = region.regiao;
    option.textContent = region.regiao;
    select.append(option);
  }
  controls.append(labelWrap("Região", select));

  const metricsHost = document.createElement("div");
  const tableHost = document.createElement("div");
  tableHost.className = "table-wrap";

  root.append(heading, controls, metricsHost, tableHost);
  select.addEventListener("change", () => {
    current = select.value;
    update();
  });
  update();
  return root;

  function update() {
    const region = regions.find((row) => row.regiao === current);
    const regionStates = states.filter((row) => row.regiao === current);
    metricsHost.replaceChildren(
      metricGrid([
        {label: "Municípios obrigados", value: formatNumber(region.total_obrigados)},
        {label: "Municípios com plano", value: formatNumber(region.municipios_com_plano)},
        {label: "Planos aprovados", value: formatNumber(region.municipios_com_plano_aprovado)},
        {label: "Cobertura regional", value: formatPercent(region.percentual_cobertura), tone: "accent"}
      ])
    );
    tableHost.innerHTML = renderStateTable(regionStates);
  }
}

function renderStateTable(rows) {
  const items = [...rows].sort((a, b) => b.percentual_cobertura - a.percentual_cobertura);
  const body = items
    .map(
      (row) => `
        <tr>
          <td><a href="/estado/${row.uf.toLowerCase()}">${row.estado_nome}</a></td>
          <td>${row.uf}</td>
          <td>${formatNumber(row.total_obrigados)}</td>
          <td>${formatNumber(row.municipios_com_plano_aprovado)}</td>
          <td>${formatPercent(row.percentual_cobertura)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Estado</th>
          <th>UF</th>
          <th>Obrigados</th>
          <th>Planos aprovados</th>
          <th>Cobertura</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
}

function labelWrap(label, input) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text, input);
  return wrap;
}
