import {metricGrid} from "./cards.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";
import {createMunicipioExplorer} from "./municipio-explorer.js";

export function createStateExplorer(states, stateSeries, municipalRows) {
  const root = document.createElement("section");
  root.className = "state-explorer";
  let currentUf = states[0]?.uf;

  const heading = document.createElement("div");
  heading.className = "section-heading";
  heading.innerHTML = `<div><h2>Leitura por estado</h2><p>Resumo estadual, distribuição por status e consulta municipal.</p></div>`;

  const controls = document.createElement("div");
  controls.className = "table-controls";
  const select = document.createElement("select");
  for (const state of states) {
    const option = document.createElement("option");
    option.value = state.uf;
    option.textContent = `${state.estado_nome} (${state.uf})`;
    select.append(option);
  }
  controls.append(labelWrap("UF", select));

  const metricsHost = document.createElement("div");
  const explorerHost = document.createElement("div");

  root.append(heading, controls, metricsHost, explorerHost);
  select.addEventListener("change", () => {
    currentUf = select.value;
    update();
  });
  update();
  return root;

  function update() {
    const state = states.find((row) => row.uf === currentUf);
    const rows = municipalRows.filter((row) => row.uf === currentUf);
    metricsHost.replaceChildren(
      metricGrid([
        {label: "Municípios", value: formatNumber(state.total_municipios)},
        {label: "Obrigados", value: formatNumber(state.total_obrigados)},
        {label: "Com plano", value: formatNumber(state.municipios_com_plano)},
        {label: "Planos aprovados", value: formatNumber(state.municipios_com_plano_aprovado)},
        {label: "Cobertura", value: formatPercent(state.percentual_cobertura), tone: "accent"}
      ])
    );
    explorerHost.replaceChildren(
      createMunicipioExplorer(rows, {
        title: `Municípios de ${state.estado_nome}`,
        defaultUf: currentUf,
        showUfFilter: false,
        showRegionFilter: false
      })
    );
  }
}

function labelWrap(label, input) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text, input);
  return wrap;
}
