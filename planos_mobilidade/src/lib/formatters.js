const numberFormatter = new Intl.NumberFormat("pt-BR");
const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});
const compactFormatter = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1
});

export function formatNumber(value) {
  return numberFormatter.format(value ?? 0);
}

export function formatCompact(value) {
  return compactFormatter.format(value ?? 0);
}

export function formatPercent(value) {
  return percentFormatter.format(value ?? 0);
}

export function formatDate(value) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00Z`));
}

export function formatDelta(value) {
  if (!Number.isFinite(value) || value === 0) return "Estável";
  return `${value > 0 ? "+" : ""}${formatNumber(value)}`;
}

export function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
