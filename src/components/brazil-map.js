import brazil from "@svg-maps/brazil";
import * as d3 from "d3";
import {PALETTE} from "../lib/theme.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";

const ns = "http://www.w3.org/2000/svg";

export function brazilCoverageMap(rows) {
  const values = new Map(rows.map((row) => [row.uf.toLowerCase(), row]));
  const maxApproved = d3.max(rows, (d) => d.municipios_com_plano_aprovado) || 1;
  const color = d3
    .scaleLinear()
    .domain([0, maxApproved])
    .range(["#eef3ec", PALETTE.greenDeep]);

  const wrapper = document.createElement("div");
  wrapper.className = "brazil-map";

  const canvas = document.createElement("div");
  canvas.className = "map-canvas";

  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  tooltip.hidden = true;

  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", brazil.viewBox);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Mapa do Brasil por unidade da federação");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.style.overflow = "hidden";

  for (const location of brazil.locations) {
    const data = values.get(location.id);
    const link = document.createElementNS(ns, "a");
    link.setAttribute("href", `estado/${location.id}`);

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", location.path);
    path.setAttribute("class", "state-shape");
    path.setAttribute("fill", data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft);
    path.setAttribute("stroke", "#fbfaf6");
    path.setAttribute("stroke-width", "1.6");

    path.addEventListener("mousemove", (event) => {
      tooltip.hidden = false;
      tooltip.innerHTML = data
        ? `
          <strong>${data.estado_nome} (${data.uf})</strong>
          <span>Obrigados: ${formatNumber(data.total_obrigados)}</span>
          <span>Plano aprovado: ${formatNumber(data.municipios_com_plano_aprovado)}</span>
          <span>Sem plano aprovado: ${formatNumber(data.total_obrigados - data.municipios_com_plano_aprovado)}</span>
          <span>Percentual aprovado: ${formatPercent(data.percentual_aprovado)}</span>
        `
        : `<strong>${location.name}</strong>`;
      const bounds = wrapper.getBoundingClientRect();
      const tooltipWidth = 205;
      const tooltipHeight = 122;
      const offset = 18;
      const left = Math.min(
        Math.max(12, event.clientX - bounds.left + offset),
        bounds.width - tooltipWidth - 12
      );
      const top = Math.min(
        Math.max(12, event.clientY - bounds.top + offset),
        bounds.height - tooltipHeight - 12
      );
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });

    path.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });

    link.append(path);
    svg.append(link);
  }

  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = `
    <div class="map-legend__header">
      <span class="map-legend__label">Leitura principal</span>
      <div class="map-legend__swatches">
        <span><i class="swatch swatch-approved"></i>Mais planos aprovados</span>
        <span><i class="swatch swatch-neutral"></i>Menos planos aprovados</span>
      </div>
    </div>
    <p class="map-note">Passe o cursor sobre a UF para ver obrigados, aprovados e percentual aprovado.</p>
  `;

  canvas.append(svg);
  wrapper.append(legend, canvas, tooltip);
  return wrapper;
}
