import {formatDelta} from "../lib/formatters.js";

function createNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function metricGrid(metrics) {
  const grid = createNode("div", "metrics-grid");
  for (const metric of metrics) grid.append(metricCard(metric));
  return grid;
}

export function metricCard({label, value, detail, delta, deltaText, tone = "default"}) {
  const card = createNode("article", `metric-card tone-${tone}`);
  const labelNode = createNode("p", "metric-label", label);
  const valueRow = createNode("div", "metric-value-row");
  const valueNode = createNode("strong", "metric-value", value);
  valueRow.append(valueNode);
  if (delta != null) {
    const deltaNode = createNode("span", `metric-delta ${delta > 0 ? "up" : delta < 0 ? "down" : "flat"}`);
    deltaNode.textContent = deltaText ?? formatDelta(delta);
    deltaNode.dataset.tooltip = "Variação em relação ao mês anterior";
    deltaNode.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = deltaNode.classList.toggle("tooltip-open");
      if (isOpen) {
        document.addEventListener("click", () => deltaNode.classList.remove("tooltip-open"), { once: true });
      }
    });
    valueRow.append(deltaNode);
  }
  card.append(labelNode, valueRow);
  if (detail) card.append(createNode("p", "metric-detail", detail));
  return card;
}
