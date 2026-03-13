import brazil from "@svg-maps/brazil";
import * as d3 from "d3";
import {formatNumber, formatPercent} from "../lib/formatters.js";

const ns = "http://www.w3.org/2000/svg";

const REGION_POSITIONS = {
  Norte: {x: 305, y: 175, r: 44},
  Nordeste: {x: 476, y: 242, r: 48},
  "Centro-Oeste": {x: 320, y: 350, r: 42},
  Sudeste: {x: 420, y: 418, r: 48},
  Sul: {x: 366, y: 534, r: 42},
  Brasil: {x: 122, y: 450, r: 72}
};

export function regionalDonutMap(states, regions, summary) {
  const wrapper = document.createElement("div");
  wrapper.className = "brazil-map brazil-map--regional";

  const header = document.createElement("div");
  header.className = "map-legend";
  header.innerHTML = `
    <div class="map-legend__header">
      <span class="map-legend__label">Leitura principal</span>
      <div class="map-legend__swatches">
        <span><i class="swatch swatch-approved"></i>Plano aprovado</span>
        <span><i class="swatch swatch-pending"></i>Sem plano aprovado</span>
      </div>
    </div>
  `;

  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  tooltip.hidden = true;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", brazil.viewBox);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Mapa do Brasil com comparação de planos aprovados");

  const statePathMap = new Map();
  for (const location of brazil.locations) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", location.path);
    path.setAttribute("class", "state-shape state-shape--muted");
    path.setAttribute("fill", "#b8c5bd");
    path.setAttribute("stroke", "#f7f8f6");
    path.setAttribute("stroke-width", "1.4");
    path.dataset.uf = location.id.toUpperCase();
    svg.append(path);
    statePathMap.set(location.id.toUpperCase(), path);
  }

  const overlay = document.createElementNS(ns, "g");
  overlay.setAttribute("class", "map-overlay");
  svg.append(overlay);

  wrapper.append(header, svg, tooltip);
  render();

  return wrapper;

  function render() {
    overlay.replaceChildren();
    const regionLayers = [
      ...regions.map((region) => ({
        label: region.regiao,
        approved: region.municipios_com_plano_aprovado,
        total: region.total_obrigados,
        percent: region.percentual_aprovado,
        position: REGION_POSITIONS[region.regiao],
        size: "region"
      })),
      {
        label: "Brasil",
        approved: summary.municipios_com_plano_aprovado,
        total: summary.total_obrigados,
        percent: summary.percentual_aprovado,
        position: REGION_POSITIONS.Brasil,
        size: "national"
      }
    ];
    for (const layer of regionLayers) overlay.append(drawDonut(layer, tooltip, wrapper));
  }
}

function drawDonut(layer, tooltip, wrapper) {
  const {label, approved, total, percent, position, size} = layer;
  const pending = Math.max(0, total - approved);
  const g = document.createElementNS(ns, "g");
  g.setAttribute("class", `donut-group donut-group--${size}`);

  const pie = d3.pie().sort(null)([
    {key: "approved", value: approved, fill: "#79c67b"},
    {key: "pending", value: pending, fill: "#d96b72"}
  ]);
  const arc = d3.arc().innerRadius(position.r * 0.42).outerRadius(position.r);

  const shadow = document.createElementNS(ns, "circle");
  shadow.setAttribute("cx", String(position.x));
  shadow.setAttribute("cy", String(position.y));
  shadow.setAttribute("r", String(position.r + 2));
  shadow.setAttribute("fill", "rgba(255,255,255,0.88)");
  shadow.setAttribute("class", "donut-shadow");
  g.append(shadow);

  for (const slice of pie) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", arc(slice));
    path.setAttribute("transform", `translate(${position.x},${position.y})`);
    path.setAttribute("fill", slice.data.fill);
    path.setAttribute("stroke", "rgba(255,255,255,0.78)");
    path.setAttribute("stroke-width", "1");
    g.append(path);
  }

  g.append(
    statTag({
      x: position.x - position.r * 0.4,
      y: position.y - position.r * 0.12,
      text: formatNumber(approved),
      fill: "#568a5a"
    })
  );
  g.append(
    statTag({
      x: position.x + position.r * 0.08,
      y: position.y + position.r * 0.24,
      text: formatNumber(pending),
      fill: "#9c4c52"
    })
  );
  const caption = document.createElementNS(ns, "text");
  caption.setAttribute("x", String(position.x));
  caption.setAttribute("y", String(position.y + position.r + 18));
  caption.setAttribute("text-anchor", "middle");
  caption.setAttribute("class", "donut-caption");
  caption.textContent = label;
  g.append(caption);

  // Pre-create tooltip nodes once per donut — only swap DOM when donut changes
  const ttStrong = document.createElement("strong");
  ttStrong.textContent = label;
  const ttNodes = [ttStrong, ...[
    `Obrigados: ${formatNumber(total)}`,
    `Plano aprovado: ${formatNumber(approved)}`,
    `Sem plano aprovado: ${formatNumber(pending)}`,
    `Percentual aprovado: ${formatPercent(percent)}`,
  ].map(text => { const s = document.createElement("span"); s.textContent = text; return s; })];

  g.addEventListener("mousemove", (event) => {
    tooltip.hidden = false;
    if (tooltip.firstChild !== ttStrong) tooltip.replaceChildren(...ttNodes);
    const bounds = wrapper.getBoundingClientRect();
    tooltip.style.left = `${event.clientX - bounds.left + 18}px`;
    tooltip.style.top = `${event.clientY - bounds.top + 18}px`;
  });

  g.addEventListener("mouseleave", () => {
    tooltip.hidden = true;
  });

  return g;
}

function statTag({x, y, text, fill}) {
  const group = document.createElementNS(ns, "g");
  const width = Math.max(28, text.length * 9 + 12);
  const rect = document.createElementNS(ns, "rect");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("rx", "6");
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", "22");
  rect.setAttribute("fill", fill);
  rect.setAttribute("opacity", "0.95");

  const label = document.createElementNS(ns, "text");
  label.setAttribute("x", String(x + width / 2));
  label.setAttribute("y", String(y + 15));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("class", "donut-stat");
  label.textContent = text;

  group.append(rect, label);
  return group;
}
