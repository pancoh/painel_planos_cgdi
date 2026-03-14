import * as d3 from "d3";
import {PALETTE} from "../lib/theme.js";
import {formatNumber, formatPercent} from "../lib/formatters.js";

const ns = "http://www.w3.org/2000/svg";
const W = 700;
const H = 580;

const IBGE_TO_UF = {
  12: "AC", 27: "AL", 13: "AM", 16: "AP", 29: "BA", 23: "CE", 53: "DF",
  32: "ES", 52: "GO", 21: "MA", 31: "MG", 50: "MS", 51: "MT", 15: "PA",
  25: "PB", 26: "PE", 22: "PI", 41: "PR", 33: "RJ", 24: "RN", 11: "RO",
  14: "RR", 43: "RS", 42: "SC", 28: "SE", 35: "SP", 17: "TO",
};

function municipioColor(d) {
  if (!d) return "#d1d5db";
  if (d.status_painel === "Plano aprovado") return "#0f766e";
  if (d.obrigado) return "#b42318";
  return "#d1d5db";
}

// statesGeo: GeoJSON FeatureCollection with all 27 states (passed from index.md)
// fetchMunicipiosByUf: async (uf: string) => municipality rows[] — called on state click
// fetchGeoByState: async (codarea: string) => GeoJSON FeatureCollection — called on state click
export function brazilCoverageMap(rows, statesGeo, fetchMunicipiosByUf, fetchGeoByState) {
  const values = new Map(rows.map((row) => [row.uf, row]));
  const maxApproved = d3.max(rows, (d) => d.municipios_com_plano_aprovado) || 1;
  const color = d3
    .scaleLinear()
    .domain([0, maxApproved])
    .range(["#c8dfc6", PALETTE.greenDeep]);

  // Build projection from actual data bounds
  const projection = d3.geoMercator()
    .fitExtent([[10, 10], [W - 10, H - 10]], statesGeo);
  const pathGen = d3.geoPath(projection);

  // ── DOM structure ─────────────────────────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.className = "brazil-map";

  const backBtn = document.createElement("button");
  backBtn.className = "map-back-btn button button-secondary";
  backBtn.textContent = "← Voltar ao Brasil";
  backBtn.style.display = "none";

  const canvas = document.createElement("div");
  canvas.className = "map-canvas";

  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  tooltip.hidden = true;

  // ── Tooltip DOM (pre-created; only textContent updated in hot path) ────────
  const ttHeader = document.createElement("strong");
  const ttLines = Array.from({length: 4}, () => {
    const s = document.createElement("span");
    s.hidden = true;
    return s;
  });
  tooltip.append(ttHeader, ...ttLines);

  function setTooltip(header, lines) {
    ttHeader.textContent = header;
    ttLines.forEach((s, i) => {
      if (i < lines.length) { s.textContent = lines[i]; s.hidden = false; }
      else { s.hidden = true; }
    });
  }

  // ── SVG ────────────────────────────────────────────────────────────────────
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "Mapa do Brasil por unidade da federação");
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const g = document.createElementNS(ns, "g");
  const statesLayer = document.createElementNS(ns, "g");
  const munisLayer = document.createElementNS(ns, "g");
  g.append(statesLayer, munisLayer);
  svg.append(g);
  canvas.append(svg);

  // ── D3 zoom (programmatic only) ────────────────────────────────────────────
  const zoom = d3.zoom()
    .scaleExtent([1, 9])
    .filter(() => false)
    .on("zoom", (event) => {
      const k = event.transform.k;
      g.setAttribute("transform", event.transform.toString());
      for (const p of statesLayer.querySelectorAll("path")) {
        p.setAttribute("stroke-width", String(1.5 / k));
      }
      for (const p of munisLayer.querySelectorAll("path")) {
        p.setAttribute("stroke-width", String(0.5 / k));
      }
    });

  const d3Svg = d3.select(svg);
  d3Svg.call(zoom);

  // ── State ──────────────────────────────────────────────────────────────────
  let selectedState = null;

  function zoomToFeature(feature) {
    const [[x0, y0], [x1, y1]] = pathGen.bounds(feature);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const scale = Math.min(8, 0.85 / Math.max(dx / W, dy / H));
    d3Svg
      .transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(W / 2, H / 2).scale(scale).translate(-cx, -cy)
      );
  }

  function resetZoom() {
    d3Svg
      .transition()
      .duration(600)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity);
  }

  function loadMunicipios(geoData, munIndex) {
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
        tooltip.hidden = false;
        if (munData) {
          setTooltip(munData.municipio, [
            munData.obrigado ? "Obrigatório" : "Não obrigatório",
            munData.status_painel,
          ]);
        } else {
          setTooltip(munCode ?? "—", []);
        }
        const bounds = wrapper.getBoundingClientRect();
        const tw = 205, th = 80, offset = 18;
        tooltip.style.left = `${Math.min(Math.max(12, event.clientX - bounds.left + offset), bounds.width - tw - 12)}px`;
        tooltip.style.top = `${Math.min(Math.max(12, event.clientY - bounds.top + offset), bounds.height - th - 12)}px`;
      });

      path.addEventListener("mouseleave", () => {
        tooltip.hidden = true;
      });

      munisLayer.append(path);
    }
  }

  async function handleStateClick(feature) {
    const codarea = feature.properties?.codarea;
    const uf = IBGE_TO_UF[Number(codarea)];
    selectedState = {codarea, uf};

    for (const p of statesLayer.querySelectorAll("path")) {
      const pUf = IBGE_TO_UF[Number(p.dataset.codarea)];
      const isSelected = pUf === uf;
      const data = values.get(pUf);
      p.setAttribute(
        "fill",
        isSelected
          ? (data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft)
          : "#d1d5db"
      );
      p.setAttribute("pointer-events", "none");
      p.style.cursor = "default";
    }

    tooltip.hidden = true;
    backBtn.style.display = "";
    legend.style.display = "none";
    legendMunis.style.display = "";
    zoomToFeature(feature);

    const [munData, geoData] = await Promise.all([
      fetchMunicipiosByUf(uf),
      fetchGeoByState(codarea),
    ]);
    // Guard: ignore if user navigated to another state while loading
    if (selectedState?.uf !== uf) return;
    const munIndex = new Map(munData.map((m) => [m.codigo_ibge, m]));
    loadMunicipios(geoData, munIndex);
  }

  function handleBack() {
    selectedState = null;
    munisLayer.innerHTML = "";
    backBtn.style.display = "none";
    legend.style.display = "";
    legendMunis.style.display = "none";
    resetZoom();
    for (const p of statesLayer.querySelectorAll("path")) {
      const uf = IBGE_TO_UF[Number(p.dataset.codarea)];
      const data = values.get(uf);
      p.setAttribute("fill", data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft);
      p.setAttribute("pointer-events", "auto");
      p.style.cursor = "pointer";
    }
  }

  backBtn.addEventListener("click", handleBack);

  // ── Render states (data already provided — no fetch needed) ───────────────
  for (const feature of statesGeo.features ?? []) {
    const codarea = feature.properties?.codarea;
    const uf = IBGE_TO_UF[Number(codarea)];
    const data = values.get(uf);

    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathGen(feature) ?? "");
    path.setAttribute("class", "state-shape");
    path.setAttribute("fill", data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft);
    path.setAttribute("stroke", "#fbfaf6");
    path.setAttribute("stroke-width", "1.5");
    path.style.cursor = "pointer";
    path.dataset.codarea = codarea;

    path.addEventListener("mousemove", (event) => {
      if (selectedState) return;
      tooltip.hidden = false;
      if (data) {
        setTooltip(`${data.estado_nome} (${data.uf})`, [
          `Obrigados: ${formatNumber(data.total_obrigados)}`,
          `Plano aprovado: ${formatNumber(data.municipios_com_plano_aprovado)}`,
          `Sem plano aprovado: ${formatNumber(data.total_obrigados - data.municipios_com_plano_aprovado)}`,
          `Percentual aprovado: ${formatPercent(data.percentual_aprovado)}`,
        ]);
      } else {
        setTooltip(uf ?? codarea, []);
      }
      const bounds = wrapper.getBoundingClientRect();
      const tw = 205, th = 122, offset = 18;
      tooltip.style.left = `${Math.min(Math.max(12, event.clientX - bounds.left + offset), bounds.width - tw - 12)}px`;
      tooltip.style.top = `${Math.min(Math.max(12, event.clientY - bounds.top + offset), bounds.height - th - 12)}px`;
    });

    path.addEventListener("mouseleave", () => {
      tooltip.hidden = true;
    });

    path.addEventListener("click", () => {
      if (!selectedState) handleStateClick(feature);
    });

    statesLayer.append(path);
  }

  // ── Legends ────────────────────────────────────────────────────────────────
  const legend = document.createElement("div");
  legend.className = "map-legend";
  const legendHeader = document.createElement("div");
  legendHeader.className = "map-legend__header";
  const legendLabel = document.createElement("span");
  legendLabel.className = "map-legend__label";
  legendLabel.textContent = "Leitura principal";
  const legendSwatches = document.createElement("div");
  legendSwatches.className = "map-legend__swatches";
  const swatchApproved = document.createElement("span");
  const iApproved = document.createElement("i");
  iApproved.className = "swatch swatch-approved";
  swatchApproved.append(iApproved, "Mais planos aprovados");
  const swatchNeutral = document.createElement("span");
  const iNeutral = document.createElement("i");
  iNeutral.className = "swatch swatch-neutral";
  swatchNeutral.append(iNeutral, "Menos planos aprovados");
  legendSwatches.append(swatchApproved, swatchNeutral);
  legendHeader.append(legendLabel, legendSwatches);
  const legendNote = document.createElement("p");
  legendNote.className = "map-note";
  legendNote.textContent = "Passe o cursor sobre a UF para ver detalhes. Clique para ampliar e ver os municípios.";
  legend.append(legendHeader, legendNote);

  const legendMunis = document.createElement("div");
  legendMunis.className = "map-legend";
  legendMunis.style.display = "none";
  const legendMunisHeader = document.createElement("div");
  legendMunisHeader.className = "map-legend__header";
  const legendMunisLabel = document.createElement("span");
  legendMunisLabel.className = "map-legend__label";
  legendMunisLabel.textContent = "Situação dos municípios";
  const legendMunisSwatches = document.createElement("div");
  legendMunisSwatches.className = "map-legend__swatches";
  for (const [color, text] of [["#0f766e", "Plano aprovado"], ["#b42318", "Obrigado sem plano"], ["#d1d5db", "Demais"]]) {
    const span = document.createElement("span");
    const i = document.createElement("i");
    i.className = "swatch";
    i.style.background = color;
    span.append(i, text);
    legendMunisSwatches.append(span);
  }
  legendMunisHeader.append(legendMunisLabel, legendMunisSwatches);
  legendMunis.append(legendMunisHeader);

  wrapper.append(backBtn, legend, legendMunis, canvas, tooltip);
  return wrapper;
}
