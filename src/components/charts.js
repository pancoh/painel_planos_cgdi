import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import {PALETTE} from "../lib/theme.js";

const monthYearFormatter = new Intl.DateTimeFormat("pt-BR", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC"
});
const shortDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC"
});
const integerFormatter = new Intl.NumberFormat("pt-BR");

const LEGAL_DEADLINES = [
  {
    reference_date: "2024-04-12",
    label: "+ 250 mil habitantes"
  },
  {
    reference_date: "2025-04-12",
    label: "Até 250 mil habitantes"
  }
];

const plotDefaults = {
  style: {
    background: "transparent",
    color: PALETTE.ink,
    fontFamily: "var(--font-sans)"
  }
};

export function nationalTimeline(series, {width}) {
  const parsedSeries = series.map((row) => ({
    ...row,
    reference_date: new Date(`${row.reference_date}T12:00:00Z`)
  }));
  const maxApproved = d3.max(parsedSeries, (d) => d.municipios_com_plano_aprovado) || 0;
  const annotationRows = LEGAL_DEADLINES.map((deadline, index) => ({
    ...deadline,
    reference_date: new Date(`${deadline.reference_date}T12:00:00Z`),
    y: maxApproved - (index === 0 ? 8 : 24)
  }));

  return Plot.plot({
    ...plotDefaults,
    width,
    height: 360,
    marginTop: 64,
    marginBottom: 52,
    x: {type: "utc", label: null, tickFormat: (d) => formatMonthYear(d)},
    y: {grid: true, label: "Municípios"},
    marks: [
      Plot.ruleX(annotationRows, {
        x: "reference_date",
        stroke: PALETTE.gold,
        strokeWidth: 1.5,
        strokeDasharray: "5,4"
      }),
      Plot.lineY(parsedSeries, {
        x: "reference_date",
        y: "municipios_com_plano_aprovado",
        stroke: PALETTE.green,
        strokeWidth: 3,
        curve: "monotone-x",
        tip: true,
        title: tooltipTitle
      }),
      Plot.dot(parsedSeries, {
        x: "reference_date",
        y: "municipios_com_plano_aprovado",
        fill: PALETTE.green,
        r: 4,
        tip: true,
        title: tooltipTitle
      }),
      Plot.text(annotationRows, {
        x: "reference_date",
        y: "y",
        text: "label",
        dx: -6,
        fill: PALETTE.gold,
        fontSize: 11,
        fontWeight: 700,
        rotate: -90,
        textAnchor: "end"
      })
    ]
  });
}

function formatMonthYear(value) {
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00Z`);
  const text = monthYearFormatter.format(date);
  return text.replace(".", "");
}

function tooltipTitle(row) {
  const date = row.reference_date instanceof Date ? row.reference_date : new Date(`${row.reference_date}T12:00:00Z`);
  return `Referência: ${shortDateFormatter.format(date)}\nMunicípios com plano aprovado: ${integerFormatter.format(row.municipios_com_plano_aprovado)}`;
}

export function regionComparison(rows, {width}) {
  const sorted = [...rows].sort((a, b) => b.percentual_cobertura - a.percentual_cobertura);
  const maxCoverage = d3.max(sorted, (d) => d.percentual_cobertura) || 0;
  return Plot.plot({
    ...plotDefaults,
    width,
    height: 260,
    marginLeft: 120,
    marginRight: 56,
    x: {
      label: "Cobertura entre municípios obrigados",
      percent: true,
      grid: true,
      domain: [0, Math.max(0.4, maxCoverage * 1.15)]
    },
    y: {label: null},
    marks: [
      Plot.ruleX([0]),
      Plot.barX(sorted, {
        x: "percentual_cobertura",
        y: "regiao",
        fill: PALETTE.green,
        rx: 8,
        inset: 0.25,
        tip: true
      }),
      Plot.dot(sorted, {
        x: "percentual_aprovado",
        y: "regiao",
        fill: PALETTE.gold,
        r: 6,
        tip: true
      }),
      Plot.text(sorted, {
        x: "percentual_cobertura",
        y: "regiao",
        text: (d) => d3.format(".1%")(d.percentual_cobertura),
        dx: 8,
        fill: PALETTE.ink,
        textAnchor: "start"
      })
    ]
  });
}

export function stateRanking(rows, {width, metric = "percentual_cobertura", limit = 12}) {
  const labels = {
    percentual_cobertura: "Cobertura",
    municipios_com_plano_aprovado: "Planos aprovados",
    total_obrigados: "Municípios obrigados"
  };
  const sorted = [...rows]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit);
  const percent = metric === "percentual_cobertura";

  return Plot.plot({
    ...plotDefaults,
    width,
    height: 30 * sorted.length + 50,
    marginLeft: 50,
    marginRight: 56,
    x: {
      label: labels[metric],
      grid: true,
      percent,
      domain: percent ? [0, 1] : undefined
    },
    y: {label: null},
    marks: [
      Plot.ruleX([0]),
      Plot.barX(sorted, {
        x: metric,
        y: "uf",
        fill: PALETTE.blue,
        rx: 7,
        tip: true
      }),
      Plot.text(sorted, {
        x: metric,
        y: "uf",
        dx: 8,
        text: (d) => (percent ? d3.format(".1%")(d[metric]) : integerFormatter.format(d[metric])),
        textAnchor: "start",
        fill: PALETTE.ink
      })
    ]
  });
}

export function statusDistribution(rows, {width, title}) {
  const counts = d3.rollups(
    rows,
    (values) => values.length,
    (d) => d.status_painel
  ).map(([status_painel, total]) => ({status_painel, total}));

  return Plot.plot({
    ...plotDefaults,
    width,
    height: 280,
    marginLeft: 116,
    x: {grid: true, label: title ?? "Municípios"},
    y: {label: null},
    color: {domain: Object.keys(PALETTE.statuses), range: Object.values(PALETTE.statuses)},
    marks: [
      Plot.barX(counts, {
        x: "total",
        y: "status_painel",
        fill: "status_painel",
        rx: 8,
        tip: true
      }),
      Plot.text(counts, {
        x: "total",
        y: "status_painel",
        text: "total",
        dx: 20,
        textAnchor: "end"
      })
    ]
  });
}

export function regionTimeline(series, region, {width}) {
  return coverageTimeline(series.filter((row) => row.regiao === region), `Evolução em ${region}`, {width});
}

export function stateTimeline(series, uf, {width}) {
  return coverageTimeline(series.filter((row) => row.uf === uf), `Evolução em ${uf}`, {width});
}

function coverageTimeline(series, title, {width}) {
  const parsedSeries = series.map((row) => ({
    ...row,
    reference_date: new Date(`${row.reference_date}T12:00:00Z`)
  }));
  const values = parsedSeries.flatMap((row) => [
    {reference_date: row.reference_date, serie: "Cobertura", valor: row.percentual_cobertura},
    {reference_date: row.reference_date, serie: "Aprovado", valor: row.percentual_aprovado}
  ]);

  return Plot.plot({
    ...plotDefaults,
    width,
    height: 300,
    marginTop: 42,
    title,
    x: {type: "utc", label: null, tickFormat: (d) => formatMonthYear(d)},
    y: {label: "Percentual", percent: true, grid: true},
    color: {
      domain: ["Cobertura", "Aprovado"],
      range: [PALETTE.green, PALETTE.gold]
    },
    marks: [
      Plot.lineY(values, {x: "reference_date", y: "valor", stroke: "serie", strokeWidth: 3, curve: "monotone-x", tip: true}),
      Plot.dot(values, {x: "reference_date", y: "valor", fill: "serie", r: 4, tip: true})
    ]
  });
}
