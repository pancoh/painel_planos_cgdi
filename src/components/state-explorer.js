import {metricGrid} from "./cards.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";
import {createMunicipioExplorer} from "./municipio-explorer.js";

export function createStateExplorer(states, fetchMunicipiosByUf) {
  const root = document.createElement("section");
  root.className = "state-explorer";
  let currentUf = states[0]?.uf;

  const heading = document.createElement("div");
  heading.className = "section-heading";
  const headingInner = document.createElement("div");
  const headingH2 = document.createElement("h2");
  headingH2.textContent = "Leitura por estado";
  const headingP = document.createElement("p");
  headingP.textContent = "Resumo estadual, distribuição por status e consulta municipal.";
  headingInner.append(headingH2, headingP);
  heading.append(headingInner);

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

  async function update() {
    const uf = currentUf;
    const state = states.find((row) => row.uf === uf);
    metricsHost.replaceChildren(
      metricGrid([
        {label: "Municípios", value: formatNumber(state.total_municipios)},
        {label: "Obrigados", value: formatNumber(state.total_obrigados)},
        {label: "Possui plano", value: formatNumber(state.municipios_com_plano)},
        {label: "Planos aprovados", value: formatNumber(state.municipios_com_plano_aprovado)},
        {label: "% aprovado", value: formatPercent(state.percentual_aprovado), tone: "accent"}
      ])
    );
    const loading = document.createElement("p");
    loading.className = "table-meta";
    loading.textContent = "Carregando municípios…";
    explorerHost.replaceChildren(loading);
    const rows = await fetchMunicipiosByUf(uf);
    if (currentUf !== uf) return;
    explorerHost.replaceChildren(
      createMunicipioExplorer(rows, {
        title: `Municípios de ${state.estado_nome}`,
        defaultUf: uf,
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
