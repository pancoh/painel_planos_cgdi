import * as d3 from "d3";
import { PALETTE } from "../lib/theme.js";
import { formatNumber, formatPercent } from "../lib/formatters.js";
import {
  ns,
  W,
  H,
  TOOLTIP_HEIGHT_STATE,
  IBGE_TO_UF,
  createTooltip,
  positionTooltip,
  createLegend,
  applyStateSelection,
  resetStateSelection,
  renderMunicipioLayer,
} from "./brazil-map-ui.js";

// statesGeo: GeoJSON FeatureCollection with all 27 states (passed from index.md)
// fetchMunicipiosByUf: async (uf: string) => municipality rows[] — called on state click
// fetchGeoByState: async (codarea: string) => GeoJSON FeatureCollection — called on state click
export function brazilCoverageMap(
  rows,
  statesGeo,
  fetchMunicipiosByUf,
  fetchGeoByState,
) {
  const values = new Map(rows.map((row) => [row.uf, row]));
  const maxApproved = d3.max(rows, (d) => d.municipios_com_plano_aprovado) || 1;
  const color = d3
    .scaleLinear()
    .domain([0, maxApproved])
    .range(["#c8dfc6", PALETTE.greenDeep]);

  // Build projection from actual data bounds
  const projection = d3.geoMercator().fitExtent(
    [
      [10, 10],
      [W - 10, H - 10],
    ],
    statesGeo,
  );
  const pathGen = d3.geoPath(projection);

  // ── DOM structure ─────────────────────────────────────────────────────────
  const wrapper = document.createElement("div");
  wrapper.className = "brazil-map";

  const backBtn = document.createElement("button");
  backBtn.className = "map-back-btn button button-secondary";
  backBtn.textContent = "← Voltar ao Brasil";
  backBtn.style.display = "none";

  const stateBadge = document.createElement("div");
  stateBadge.className = "map-state-badge";
  stateBadge.hidden = true;

  const statusNotice = document.createElement("p");
  statusNotice.className = "map-loading";
  statusNotice.style.display = "none";

  const canvas = document.createElement("div");
  canvas.className = "map-canvas";

  const tooltip = createTooltip();

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
  const zoom = d3
    .zoom()
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
  let requestCounter = 0;

  function showStatus(message, tone = "loading") {
    statusNotice.textContent = message;
    statusNotice.dataset.tone = tone;
    statusNotice.style.display = "inline-block";
  }

  function hideStatus() {
    statusNotice.style.display = "none";
    delete statusNotice.dataset.tone;
    statusNotice.textContent = "";
  }

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
        d3.zoomIdentity
          .translate(W / 2, H / 2)
          .scale(scale)
          .translate(-cx, -cy),
      );
  }

  function resetZoom() {
    d3Svg
      .transition()
      .duration(600)
      .ease(d3.easeCubicInOut)
      .call(zoom.transform, d3.zoomIdentity);
  }

  async function handleStateClick(feature) {
    const codarea = feature.properties?.codarea;
    const uf = IBGE_TO_UF[Number(codarea)];
    const data = values.get(uf);
    const stateName = data?.estado_nome ?? feature.properties?.nome ?? uf;
    const requestId = ++requestCounter;
    selectedState = { codarea, uf, requestId };
    munisLayer.innerHTML = "";
    applyStateSelection(statesLayer, values, uf, color);
    tooltip.hide();
    backBtn.style.display = "";
    stateBadge.textContent = stateName;
    stateBadge.hidden = false;
    showStatus("Carregando municípios…");
    legend.style.display = "none";
    legendMunis.style.display = "";
    zoomToFeature(feature);

    try {
      const [munData, geoData] = await Promise.all([
        fetchMunicipiosByUf(uf),
        fetchGeoByState(codarea),
      ]);
      // Guard: ignore if user navigated to another state while loading
      if (selectedState?.requestId !== requestId) return;
      const munIndex = new Map(munData.map((m) => [m.codigo_ibge, m]));
      renderMunicipioLayer({
        geoData,
        munIndex,
        munisLayer,
        pathGen,
        tooltip,
        wrapper,
      });
      hideStatus();
    } catch (error) {
      if (selectedState?.requestId !== requestId) return;
      munisLayer.innerHTML = "";
      showStatus("Não foi possível carregar os municípios.", "error");
      console.error("Erro ao carregar mapa municipal:", error);
    }
  }

  function handleBack() {
    selectedState = null;
    munisLayer.innerHTML = "";
    backBtn.style.display = "none";
    stateBadge.hidden = true;
    hideStatus();
    legend.style.display = "";
    legendMunis.style.display = "none";
    resetZoom();
    resetStateSelection(statesLayer, values, color);
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
    path.setAttribute(
      "fill",
      data ? color(data.municipios_com_plano_aprovado) : PALETTE.blueSoft,
    );
    path.setAttribute("stroke", PALETTE.sand);
    path.setAttribute("stroke-width", "1.5");
    path.style.cursor = "pointer";
    path.dataset.codarea = codarea;

    path.addEventListener("mousemove", (event) => {
      if (selectedState) return;
      if (data) {
        tooltip.show(`${data.estado_nome} (${data.uf})`, [
          `Obrigados: ${formatNumber(data.total_obrigados)}`,
          `Plano aprovado: ${formatNumber(data.municipios_com_plano_aprovado)}`,
          `Sem plano aprovado: ${formatNumber(data.total_obrigados - data.municipios_com_plano_aprovado)}`,
          `Percentual aprovado: ${formatPercent(data.percentual_aprovado)}`,
        ]);
      } else {
        tooltip.show(uf ?? codarea, []);
      }
      positionTooltip(tooltip.element, wrapper, event, TOOLTIP_HEIGHT_STATE);
    });

    path.addEventListener("mouseleave", tooltip.hide);

    path.addEventListener("click", () => {
      handleStateClick(feature);
    });

    statesLayer.append(path);
  }

  // ── Legends ────────────────────────────────────────────────────────────────
  const legend = createLegend({
    label: "Leitura principal",
    items: [
      { className: "swatch swatch-approved", text: "Mais planos aprovados" },
      { className: "swatch swatch-neutral", text: "Menos planos aprovados" },
    ],
    note: "Passe o cursor sobre a UF para ver detalhes. Clique para ampliar e ver os municípios.",
  });
  const legendMunis = createLegend({
    label: "Situação dos municípios",
    items: [
      { color: PALETTE.green, text: "Plano aprovado" },
      { color: PALETTE.red, text: "Obrigado sem plano" },
      { color: PALETTE.border, text: "Demais" },
    ],
  });
  legendMunis.style.display = "none";

  wrapper.append(
    backBtn,
    stateBadge,
    statusNotice,
    legend,
    legendMunis,
    canvas,
    tooltip.element,
  );
  return wrapper;
}
