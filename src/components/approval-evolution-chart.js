import * as d3 from "d3";
import { html } from "htl";
import { formatNumber } from "../lib/formatters.js";
import { PALETTE } from "../lib/theme.js";

const ns = "http://www.w3.org/2000/svg";
const CHART_WIDTH = 860;
const CHART_HEIGHT = 320;
const MARGIN = { top: 30, right: 18, bottom: 52, left: 62 };
const GROUP_ABOVE = "Acima de 250 mil hab.";
const GROUP_BELOW = "Até 250 mil hab.";

function svgEl(tag, attrs = {}, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attrs)) {
    node.setAttribute(key, String(value));
  }
  if (text != null) node.textContent = text;
  return node;
}

export function createApprovalEvolutionChart(series) {
  const rows = [...series].sort((a, b) => a.ano - b.ano);
  const years = [...new Set(rows.map((row) => row.ano))];
  const belowSeries = rows.filter((row) => row.grupo === GROUP_BELOW);
  const topSeries = rows.filter((row) => row.grupo === GROUP_ABOVE);
  const yMax = d3.max(rows, (row) => row.y2) ?? 0;
  const x = d3
    .scaleLinear()
    .domain(d3.extent(years))
    .range([MARGIN.left, CHART_WIDTH - MARGIN.right]);
  const y = d3
    .scaleLinear()
    .domain([0, yMax])
    .nice(5)
    .range([CHART_HEIGHT - MARGIN.bottom, MARGIN.top]);

  const area = d3
    .area()
    .x((row) => x(row.ano))
    .y0((row) => y(row.y1))
    .y1((row) => y(row.y2))
    .curve(d3.curveMonotoneX);

  const line = d3
    .line()
    .x((row) => x(row.ano))
    .y((row) => y(row.y2))
    .curve(d3.curveMonotoneX);

  const tooltip = document.createElement("div");
  tooltip.className = "map-tooltip";
  tooltip.hidden = true;
  const tooltipHeader = document.createElement("strong");
  const tooltipLines = Array.from({ length: 3 }, () => document.createElement("span"));
  tooltip.append(tooltipHeader, ...tooltipLines);

  const rowsByYear = new Map(
    years.map((year) => [year, rows.filter((row) => row.ano === year)]),
  );

  const chart = html`<div class="approval-evolution-chart">
    <div class="approval-evolution-chart__legend" aria-hidden="true">
      <span><i style=${`background:${PALETTE.blue}`}></i>${GROUP_ABOVE}</span>
      <span><i style=${`background:${PALETTE.green}`}></i>${GROUP_BELOW}</span>
    </div>
    <div class="approval-evolution-chart__canvas"></div>
  </div>`;

  const canvas = chart.querySelector(".approval-evolution-chart__canvas");
  const svg = svgEl("svg", {
    viewBox: `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`,
    class: "approval-evolution-chart__svg",
    role: "img",
    "aria-label": "Evolução acumulada dos planos aprovados por porte populacional",
    preserveAspectRatio: "xMidYMid meet",
  });

  svg.append(
    svgEl(
      "text",
      {
        x: 16,
        y: CHART_HEIGHT / 2,
        fill: PALETTE.muted,
        "font-size": 11,
        "text-anchor": "middle",
        transform: `rotate(-90 16 ${CHART_HEIGHT / 2})`,
      },
      "Planos aprovados",
    ),
  );

  for (const tick of y.ticks(5)) {
    svg.append(
      svgEl("line", {
        x1: MARGIN.left,
        x2: CHART_WIDTH - MARGIN.right,
        y1: y(tick),
        y2: y(tick),
        stroke: "rgba(91, 100, 112, 0.16)",
        "stroke-dasharray": "3 5",
      }),
      svgEl("line", {
        x1: MARGIN.left - 5,
        x2: MARGIN.left,
        y1: y(tick),
        y2: y(tick),
        stroke: "rgba(31, 41, 55, 0.35)",
      }),
      svgEl(
        "text",
        {
          x: MARGIN.left - 10,
          y: y(tick),
          fill: PALETTE.muted,
          "font-size": 11,
          "text-anchor": "end",
          "dominant-baseline": "middle",
        },
        formatNumber(tick),
      ),
    );
  }

  svg.append(
    svgEl("path", {
      d: area(belowSeries),
      fill: PALETTE.green,
      "fill-opacity": 0.85,
    }),
    svgEl("path", {
      d: area(topSeries),
      fill: PALETTE.blue,
      "fill-opacity": 0.85,
    }),
    svgEl("path", {
      d: line(belowSeries),
      fill: "none",
      stroke: PALETTE.greenDeep,
      "stroke-width": 1.5,
    }),
    svgEl("path", {
      d: line(topSeries),
      fill: "none",
      stroke: PALETTE.blue,
      "stroke-width": 1.5,
    }),
    svgEl("line", {
      x1: MARGIN.left,
      x2: MARGIN.left,
      y1: MARGIN.top,
      y2: CHART_HEIGHT - MARGIN.bottom,
      stroke: "rgba(31, 41, 55, 0.35)",
    }),
    svgEl("line", {
      x1: MARGIN.left,
      x2: CHART_WIDTH - MARGIN.right,
      y1: y(0),
      y2: y(0),
      stroke: "rgba(31, 41, 55, 0.35)",
    }),
  );

  for (const year of years) {
    svg.append(
      svgEl("line", {
        x1: x(year),
        x2: x(year),
        y1: y(0),
        y2: y(0) + 5,
        stroke: "rgba(31, 41, 55, 0.35)",
      }),
      svgEl(
        "text",
        {
          x: x(year),
          y: CHART_HEIGHT - MARGIN.bottom + 20,
          fill: PALETTE.muted,
          "font-size": 11,
          "text-anchor": "middle",
        },
        year,
      ),
    );
  }

  for (const row of topSeries) {
    const textY = Math.max(MARGIN.top - 4, y(row.y2) - 14);
    svg.append(
      svgEl("circle", {
        cx: x(row.ano),
        cy: y(row.y2),
        r: 2.5,
        fill: PALETTE.ink,
      }),
      svgEl(
        "text",
        {
          x: x(row.ano),
          y: textY,
          fill: PALETTE.ink,
          "font-size": 11,
          "font-weight": 600,
          "text-anchor": "middle",
          stroke: "rgba(255,255,255,0.88)",
          "stroke-width": 3,
          "paint-order": "stroke fill",
        },
        formatNumber(row.y2),
      ),
    );
  }

  const overlay = svgEl("rect", {
    x: MARGIN.left,
    y: MARGIN.top,
    width: CHART_WIDTH - MARGIN.left - MARGIN.right,
    height: CHART_HEIGHT - MARGIN.top - MARGIN.bottom,
    fill: "transparent",
  });

  overlay.addEventListener("mousemove", (event) => {
    const bounds = canvas.getBoundingClientRect();
    const innerWidth = bounds.width - MARGIN.left - MARGIN.right;
    const ratio =
      innerWidth > 0 ? (event.clientX - bounds.left - MARGIN.left) / innerWidth : 0;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const yearEstimate = x.invert(
      MARGIN.left + clampedRatio * (CHART_WIDTH - MARGIN.left - MARGIN.right),
    );
    const year = years.reduce((best, candidate) =>
      Math.abs(candidate - yearEstimate) < Math.abs(best - yearEstimate) ? candidate : best,
    );
    const yearRows = rowsByYear.get(year);
    if (!yearRows) {
      tooltip.hidden = true;
      return;
    }
    const below = yearRows.find((row) => row.grupo === GROUP_BELOW)?.y2 ?? 0;
    const aboveRow = yearRows.find((row) => row.grupo === GROUP_ABOVE);
    const total = aboveRow?.y2 ?? below;
    const above = aboveRow ? aboveRow.y2 - aboveRow.y1 : 0;
    tooltipHeader.textContent = String(year);
    tooltipLines[0].textContent = `${GROUP_BELOW}: ${formatNumber(below)}`;
    tooltipLines[1].textContent = `${GROUP_ABOVE}: ${formatNumber(above)}`;
    tooltipLines[2].textContent = `Total acumulado: ${formatNumber(total)}`;
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(Math.max(12, event.clientX - bounds.left + 14), bounds.width - 225)}px`;
    tooltip.style.top = `${Math.max(8, event.clientY - bounds.top - 108)}px`;
  });

  overlay.addEventListener("mouseleave", () => {
    tooltip.hidden = true;
  });

  svg.append(overlay);
  canvas.append(svg, tooltip);
  return chart;
}
