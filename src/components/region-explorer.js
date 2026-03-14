import {metricGrid} from "./cards.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";

export function createRegionExplorer(regions, series, states) {
  const root = document.createElement("section");
  root.className = "region-explorer";
  let current = regions[0]?.regiao;

  const heading = document.createElement("div");
  heading.className = "section-heading";
  const headingInner = document.createElement("div");
  const headingH2 = document.createElement("h2");
  headingH2.textContent = "Leitura regional";
  const headingP = document.createElement("p");
  headingP.textContent = "Comparação territorial e evolução histórica das grandes regiões.";
  headingInner.append(headingH2, headingP);
  heading.append(headingInner);

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
        {label: "Possui plano", value: formatNumber(region.municipios_com_plano)},
        {label: "Planos aprovados", value: formatNumber(region.municipios_com_plano_aprovado)},
        {label: "% aprovado", value: formatPercent(region.percentual_aprovado), tone: "accent"}
      ])
    );
    tableHost.replaceChildren(renderStateTable(regionStates));
  }
}

function renderStateTable(rows) {
  const items = [...rows].sort((a, b) => b.percentual_aprovado - a.percentual_aprovado);

  const table = document.createElement("table");
  table.className = "data-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["Estado", "UF", "Obrigados", "Planos aprovados", "% aprovado"]) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.append(th);
  }
  thead.append(headerRow);

  const tbody = document.createElement("tbody");
  for (const row of items) {
    const tr = document.createElement("tr");

    const tdEstado = document.createElement("td");
    const link = document.createElement("a");
    link.href = `estado/${row.uf.toLowerCase()}`;
    link.textContent = row.estado_nome;
    tdEstado.append(link);

    const tdUf = document.createElement("td");
    tdUf.textContent = row.uf;

    const tdObrigados = document.createElement("td");
    tdObrigados.textContent = formatNumber(row.total_obrigados);

    const tdAprovados = document.createElement("td");
    tdAprovados.textContent = formatNumber(row.municipios_com_plano_aprovado);

    const tdCobertura = document.createElement("td");
    tdCobertura.textContent = formatPercent(row.percentual_aprovado);

    tr.append(tdEstado, tdUf, tdObrigados, tdAprovados, tdCobertura);
    tbody.append(tr);
  }

  table.append(thead, tbody);
  return table;
}

function labelWrap(label, input) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text, input);
  return wrap;
}
