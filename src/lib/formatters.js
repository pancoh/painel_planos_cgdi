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

export function slug(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function csvBlob(rows) {
  if (!rows.length) {
    return new Blob(["\ufeff"], {type: "text/csv;charset=utf-8"});
  }
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(";"),
    ...rows.map((row) => headers.map((header) => {
      const normalized = String(row[header] ?? "").replaceAll('"', '""');
      return /[;"\n]/.test(normalized) ? `"${normalized}"` : normalized;
    }).join(";"))
  ];
  return new Blob([`\ufeff${lines.join("\n")}`], {type: "text/csv;charset=utf-8"});
}
