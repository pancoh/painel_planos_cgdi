import * as Plot from "@observablehq/plot";
import { html } from "htl";
import { formatNumber } from "../lib/formatters.js";
import { PALETTE } from "../lib/theme.js";
import { createTooltip, positionTooltip } from "./brazil-map-ui.js";

const GROUP_ABOVE = "Acima de 250 mil hab.";
const GROUP_BELOW = "Até 250 mil hab.";

function buildPlot(rows, topSeries, belowSeries, width) {
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
      ticks: rows.length > 20
        ? topSeries.filter((_, i) => i % 2 === 0).map((r) => r.ano)
        : topSeries.map((r) => r.ano),
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
      Plot.text(topSeries, {
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
      Plot.dot(topSeries, {
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
  plotTarget.append(tooltip.element);

  let currentPlot = null;

  function attachTooltipEvents() {
    const svg = plotTarget.querySelector("svg");
    if (!svg) return;

    svg.addEventListener("mousemove", (event) => {
      const bounds = plotTarget.getBoundingClientRect();
      const svgRect = svg.getBoundingClientRect();
      const marginLeft = 50;
      const marginRight = 0;
      const innerWidth = svgRect.width - marginLeft - marginRight;
      if (innerWidth <= 0) return;

      const ratio = (event.clientX - svgRect.left - marginLeft) / innerWidth;
      const clamped = Math.max(0, Math.min(1, ratio));
      const [minYear, maxYear] = [years[0], years[years.length - 1]];
      const yearEstimate = minYear + clamped * (maxYear - minYear);
      const year = years.reduce((best, c) =>
        Math.abs(c - yearEstimate) < Math.abs(best - yearEstimate) ? c : best,
      );

      const yearRows = rowsByYear.get(year);
      if (!yearRows) { tooltip.hide(); return; }

      const below = yearRows.find((r) => r.grupo === GROUP_BELOW);
      const above = yearRows.find((r) => r.grupo === GROUP_ABOVE);
      const total = above?.y2 ?? below?.y2 ?? 0;

      tooltip.show(String(year), [
        `${GROUP_BELOW}: ${formatNumber(below?.y2 ?? 0)}`,
        `${GROUP_ABOVE}: ${formatNumber((above?.y2 ?? 0) - (above?.y1 ?? 0))}`,
        `Total acumulado: ${formatNumber(total)}`,
      ]);
      positionTooltip(tooltip.element, plotTarget, event, 90);
    });

    svg.addEventListener("mouseleave", tooltip.hide);
  }

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
