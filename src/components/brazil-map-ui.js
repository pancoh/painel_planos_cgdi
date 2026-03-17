import {PALETTE} from "../lib/theme.js";

export const ns = "http://www.w3.org/2000/svg";
export const W = 700;
export const H = 580;
export const TOOLTIP_HEIGHT_STATE = 122;
export const TOOLTIP_HEIGHT_MUNI = 80;

const TOOLTIP_WIDTH = 205;
const TOOLTIP_OFFSET = 18;
const TOOLTIP_MARGIN = 12;

export const IBGE_TO_UF = {
  12: "AC", 27: "AL", 13: "AM", 16: "AP", 29: "BA", 23: "CE", 53: "DF",
  32: "ES", 52: "GO", 21: "MA", 31: "MG", 50: "MS", 51: "MT", 15: "PA",
  25: "PB", 26: "PE", 22: "PI", 41: "PR", 33: "RJ", 24: "RN", 11: "RO",
  14: "RR", 43: "RS", 42: "SC", 28: "SE", 35: "SP", 17: "TO",
};

export function municipioColor(row) {
  if (!row) return PALETTE.border;
  if (row.status_painel === "Plano aprovado") return PALETTE.green;
  if (row.obrigado) return PALETTE.red;
  return PALETTE.border;
}

export function createTooltip() {
  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  tooltip.hidden = true;

  const header = document.createElement("strong");
  const lines = Array.from({length: 4}, () => {
    const line = document.createElement("span");
    line.hidden = true;
    return line;
  });

  tooltip.append(header, ...lines);

  return {
    element: tooltip,
    hide() {
      tooltip.hidden = true;
    },
    show(headerText, lineTexts) {
      header.textContent = headerText;
      lines.forEach((line, index) => {
        if (index < lineTexts.length) {
          line.textContent = lineTexts[index];
          line.hidden = false;
        } else {
          line.hidden = true;
        }
      });
      tooltip.hidden = false;
    },
  };
}

export function positionTooltip(tooltip, wrapper, event, height) {
  const bounds = wrapper.getBoundingClientRect();
  tooltip.style.left = `${Math.min(Math.max(TOOLTIP_MARGIN, event.clientX - bounds.left + TOOLTIP_OFFSET), bounds.width - TOOLTIP_WIDTH - TOOLTIP_MARGIN)}px`;
  tooltip.style.top = `${Math.min(Math.max(TOOLTIP_MARGIN, event.clientY - bounds.top + TOOLTIP_OFFSET), bounds.height - height - TOOLTIP_MARGIN)}px`;
}

export function createLegend({label, items, note}) {
  const legend = document.createElement("div");
  legend.className = "map-legend";
  const header = document.createElement("div");
  header.className = "map-legend__header";
  const title = document.createElement("span");
  title.className = "map-legend__label";
  title.textContent = label;
  const swatches = document.createElement("div");
  swatches.className = "map-legend__swatches";

  for (const item of items) {
    const span = document.createElement("span");
    const swatch = document.createElement("i");
    swatch.className = item.className ?? "swatch";
    if (item.color) swatch.style.background = item.color;
    span.append(swatch, item.text);
    swatches.append(span);
  }

  header.append(title, swatches);
  legend.append(header);

  if (note) {
    const paragraph = document.createElement("p");
    paragraph.className = "map-note";
    paragraph.textContent = note;
    legend.append(paragraph);
  }

  return legend;
}

export function applyStateSelection(statesLayer, values, selectedUf, color) {
  for (const path of statesLayer.querySelectorAll("path")) {
    const uf = IBGE_TO_UF[Number(path.dataset.codarea)];
    const isSelected = uf === selectedUf;
    const data = values.get(uf);
    path.setAttribute(
      "fill",
      isSelected
        ? (data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft)
        : PALETTE.border,
    );
    path.setAttribute("pointer-events", "none");
    path.style.cursor = "default";
  }
}

export function resetStateSelection(statesLayer, values, color) {
  for (const path of statesLayer.querySelectorAll("path")) {
    const uf = IBGE_TO_UF[Number(path.dataset.codarea)];
    const data = values.get(uf);
    path.setAttribute(
      "fill",
      data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft,
    );
    path.setAttribute("pointer-events", "auto");
    path.style.cursor = "pointer";
  }
}

export function renderMunicipioLayer({
  geoData,
  munIndex,
  munisLayer,
  pathGen,
  tooltip,
  wrapper,
}) {
  munisLayer.innerHTML = "";
  for (const feature of geoData.features ?? []) {
    const munCode = feature.properties?.codarea;
    const munData = munIndex.get(munCode);
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathGen(feature) ?? "");
    path.setAttribute("fill", municipioColor(munData));
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", "0.5");

    path.addEventListener("mousemove", (event) => {
      if (munData) {
        tooltip.show(munData.municipio, [
          munData.obrigado ? "Obrigatório" : "Não obrigatório",
          munData.status_painel,
        ]);
      } else {
        tooltip.show(munCode ?? "—", []);
      }
      positionTooltip(tooltip.element, wrapper, event, TOOLTIP_HEIGHT_MUNI);
    });

    path.addEventListener("mouseleave", tooltip.hide);
    munisLayer.append(path);
  }
}
