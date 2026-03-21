import * as Plot from "@observablehq/plot";
import { html } from "htl";
import { formatNumber } from "../lib/formatters.js";
import { PALETTE } from "../lib/theme.js";
import { createTooltip, positionTooltip } from "./brazil-map-ui.js";

const GROUP_ABOVE = "Acima de 250 mil hab.";
const GROUP_BELOW = "Até 250 mil hab.";

function buildPlot(rows, topSeries, belowSeries, width) {
  const chartWidth = width - 50;
  const pxPerYear = chartWidth / topSeries.length;
  const step = pxPerYear >= 42 ? 1 : pxPerYear >= 22 ? 2 : 4;
  const visibleYears = new Set(
    topSeries.filter((_, i) => i % step === 0).map((r) => r.ano),
  );
  const labelSeries = topSeries.filter((r) => visibleYears.has(r.ano));

  return Plot.plot({
    width,
    height: 340,
    marginLeft: 50,
    marginBottom: 40,
    marginTop: 30,
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 11,
      color: PALETTE.muted,
    },
    x: {
      label: null,
      tickFormat: "d",
      ticks: [...visibleYears],
    },
    y: {
      label: "↑ Planos aprovados",
      tickFormat: (d) => formatNumber(d),
      grid: true,
    },
    marks: [
      Plot.areaY(topSeries, {
        x: "ano",
        y1: "y1",
        y2: "y2",
        fill: PALETTE.blue,
        fillOpacity: 0.85,
        curve: "monotone-x",
      }),
      Plot.areaY(belowSeries, {
        x: "ano",
        y1: "y1",
        y2: "y2",
        fill: PALETTE.green,
        fillOpacity: 0.85,
        curve: "monotone-x",
      }),
      Plot.lineY(topSeries, {
        x: "ano",
        y: "y2",
        stroke: PALETTE.blue,
        strokeWidth: 1.5,
        curve: "monotone-x",
      }),
      Plot.lineY(belowSeries, {
        x: "ano",
        y: "y2",
        stroke: PALETTE.greenDeep,
        strokeWidth: 1.5,
        curve: "monotone-x",
      }),
      Plot.text(labelSeries, {
        x: "ano",
        y: "y2",
        text: (d) => formatNumber(d.y2),
        dy: -14,
        fill: PALETTE.ink,
        fontWeight: 600,
        fontSize: 11,
        stroke: "rgba(255,255,255,0.88)",
        strokeWidth: 3,
        paintOrder: "stroke fill",
      }),
      Plot.dot(labelSeries, {
        x: "ano",
        y: "y2",
        r: 2.5,
        fill: PALETTE.ink,
      }),
    ],
  });
}

export function createApprovalEvolutionChart(series) {
  const rows = [...series].sort((a, b) => a.ano - b.ano);
  const topSeries = rows.filter((r) => r.grupo === GROUP_ABOVE);
  const belowSeries = rows.filter((r) => r.grupo === GROUP_BELOW);
  const years = [...new Set(rows.map((r) => r.ano))];
  const rowsByYear = new Map(
    years.map((yr) => [yr, rows.filter((r) => r.ano === yr)]),
  );

  const tooltip = createTooltip();

  const container = html`<div class="approval-evolution-chart">
    <div class="approval-evolution-chart__legend" aria-hidden="true">
      <span><i style=${`background:${PALETTE.blue}`}></i>${GROUP_ABOVE}</span>
      <span><i style=${`background:${PALETTE.green}`}></i>${GROUP_BELOW}</span>
    </div>
    <div class="approval-evolution-chart__plot"></div>
  </div>`;

  const plotTarget = container.querySelector(".approval-evolution-chart__plot");
  plotTarget.style.position = "relative";
  plotTarget.style.visibility = "hidden";
  plotTarget.append(tooltip.element);

  let currentPlot = null;

  const TOOLTIP_HEIGHT = 90;
  const TOOLTIP_OFFSET = 18;
  const TOOLTIP_MARGIN = 12;
  const TOOLTIP_WIDTH = 205;

  function positionTooltipAbove(el, wrapper, clientX, clientY) {
    const bounds = wrapper.getBoundingClientRect();
    const left = Math.min(
      Math.max(TOOLTIP_MARGIN, clientX - bounds.left - TOOLTIP_WIDTH / 2),
      bounds.width - TOOLTIP_WIDTH - TOOLTIP_MARGIN,
    );
    const top = Math.max(
      TOOLTIP_MARGIN,
      clientY - bounds.top - TOOLTIP_HEIGHT - TOOLTIP_OFFSET,
    );
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
  }

  function showTooltipAt(clientX, clientY, svg, above = false) {
    const svgRect = svg.getBoundingClientRect();
    const innerWidth = svgRect.width - 50;
    if (innerWidth <= 0) return;

    const ratio = (clientX - svgRect.left - 50) / innerWidth;
    const clamped = Math.max(0, Math.min(1, ratio));
    const [minYear, maxYear] = [years[0], years[years.length - 1]];
    const yearEstimate = minYear + clamped * (maxYear - minYear);
    const year = years.reduce((best, c) =>
      Math.abs(c - yearEstimate) < Math.abs(best - yearEstimate) ? c : best,
    );

    const yearRows = rowsByYear.get(year);
    if (!yearRows) { tooltip.hide(); return; }

    const belowRow = yearRows.find((r) => r.grupo === GROUP_BELOW);
    const aboveRow = yearRows.find((r) => r.grupo === GROUP_ABOVE);
    const total = aboveRow?.y2 ?? belowRow?.y2 ?? 0;

    tooltip.show(String(year), [
      `${GROUP_BELOW}: ${formatNumber(belowRow?.y2 ?? 0)}`,
      `${GROUP_ABOVE}: ${formatNumber((aboveRow?.y2 ?? 0) - (aboveRow?.y1 ?? 0))}`,
      `Total acumulado: ${formatNumber(total)}`,
    ]);
    if (above) {
      positionTooltipAbove(tooltip.element, plotTarget, clientX, clientY);
    } else {
      positionTooltip(tooltip.element, plotTarget, { clientX, clientY }, TOOLTIP_HEIGHT);
    }
  }

  function attachTooltipEvents() {
    const svg = plotTarget.querySelector("svg");
    if (!svg) return;

    let touchActive = false;

    svg.addEventListener("mousemove", (e) => {
      if (touchActive) return;
      showTooltipAt(e.clientX, e.clientY, svg);
    });
    svg.addEventListener("mouseleave", tooltip.hide);

    svg.addEventListener("touchstart", () => { touchActive = true; }, { passive: true });

    svg.addEventListener("touchmove", (e) => {
      e.preventDefault();
      const t = e.touches[0];
      showTooltipAt(t.clientX, t.clientY, svg, true);
    }, { passive: false });

    svg.addEventListener("touchend", (e) => {
      const t = e.changedTouches[0];
      showTooltipAt(t.clientX, t.clientY, svg, true);
      setTimeout(() => { touchActive = false; }, 300);
    });
  }

  let animated = false;

  function animateChart() {
    if (animated) return;
    animated = true;

    plotTarget.style.visibility = "visible";
    plotTarget.style.clipPath = "inset(0 100% 0 0)";
    requestAnimationFrame(() => {
      plotTarget.getBoundingClientRect(); // força reflow para Android
      requestAnimationFrame(() => {
        plotTarget.style.transition = "clip-path 3s ease-in-out";
        plotTarget.style.clipPath = "inset(0 0% 0 0)";
      });
    });
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        animateChart();
        observer.disconnect();
      }
    },
    { threshold: window.innerWidth < 720 ? 0.1 : 0.5 },
  );
  observer.observe(container);

  function onDocumentClick(e) {
    if (!container.contains(e.target)) {
      tooltip.hide();
    }
  }
  document.addEventListener("pointerdown", onDocumentClick);

  const ro = new ResizeObserver(([entry]) => {
    const w = Math.floor(entry.contentRect.width);
    if (w > 0) {
      currentPlot = buildPlot(rows, topSeries, belowSeries, w);
      plotTarget.querySelectorAll("svg, figure").forEach((el) => el.remove());
      plotTarget.prepend(currentPlot);
      attachTooltipEvents();
    }
  });
  ro.observe(plotTarget);

  return container;
}
