import { formatNumber, csvEscape } from "../lib/formatters.js";

export function createMunicipioExplorer(rows, options = {}) {
  const {
    title = "Consulta municipal",
    defaultUf = "Todos",
    defaultRegion = "Todas",
    defaultStatus = "Todos",
    defaultObrigatoriedade = "Todos",
    showUfFilter = true,
    showRegionFilter = true,
    allowSearch = true,
  } = options;

  const state = {
    search: "",
    uf: defaultUf,
    regiao: defaultRegion,
    status: defaultStatus,
    obrigatoriedade: defaultObrigatoriedade,
    porte: "Todos",
  };

  const root = document.createElement("section");
  root.className = "table-shell";

  const heading = document.createElement("div");
  heading.className = "section-heading";
  heading.innerHTML = `<div><h2>${title}</h2><p>Busca, filtros e exportação da visão selecionada.</p></div>`;

  const controls = document.createElement("div");
  controls.className = "table-controls";

  const stats = document.createElement("div");
  stats.className = "table-meta";

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const download = document.createElement("a");
  download.className = "button button-secondary";
  download.textContent = "Exportar CSV";
  download.download = "municipios-filtrados.csv";

  if (allowSearch)
    controls.append(
      control(
        "Buscar município",
        textInput(state, "search", update, "Digite o nome ou código IBGE"),
      ),
    );
  if (showRegionFilter)
    controls.append(
      control(
        "Região",
        selectInput(unique(rows, "regiao", "Todas"), state, "regiao", update),
      ),
    );
  if (showUfFilter)
    controls.append(
      control(
        "UF",
        selectInput(unique(rows, "uf", "Todos"), state, "uf", update),
      ),
    );
  controls.append(
    control(
      "Obrigatoriedade",
      selectInput(
        ["Todos", "Obrigatório", "Não obrigatório"],
        state,
        "obrigatoriedade",
        update,
      ),
    ),
  );
  controls.append(
    control(
      "Status",
      selectInput(
        ["Todos", ...unique(rows, "status_painel")],
        state,
        "status",
        update,
      ),
    ),
  );
  controls.append(
    control(
      "Porte populacional",
      selectInput(
        ["Todos", ...unique(rows, "porte_populacional")],
        state,
        "porte",
        update,
      ),
    ),
  );
  controls.append(download);

  root.append(heading, controls, stats, tableWrap);
  update();
  return root;

  function update() {
    const filtered = rows.filter((row) => {
      const search = state.search.trim().toLowerCase();
      if (
        search &&
        !`${row.municipio} ${row.codigo_ibge} ${row.uf}`
          .toLowerCase()
          .includes(search)
      ) {
        return false;
      }
      if (state.regiao !== "Todas" && row.regiao !== state.regiao) return false;
      if (state.uf !== "Todos" && row.uf !== state.uf) return false;
      if (state.status !== "Todos" && row.status_painel !== state.status)
        return false;
      if (state.porte !== "Todos" && row.porte_populacional !== state.porte)
        return false;
      if (state.obrigatoriedade !== "Todos") {
        const label = row.obrigado ? "Obrigatório" : "Não obrigatório";
        if (label !== state.obrigatoriedade) return false;
      }
      return true;
    });

    filtered.sort((a, b) => a.municipio.localeCompare(b.municipio, "pt-BR"));
    stats.innerHTML = `<strong>${formatNumber(filtered.length)}</strong> municípios encontrados. Exibindo até 200 linhas na tabela.`;
    renderTable(tableWrap, filtered.slice(0, 200));
    updateDownload(download, filtered);
  }
}

function updateDownload(anchor, rows) {
  const columns = [
    "municipio",
    "uf",
    "regiao",
    "codigo_ibge",
    "porte_populacional",
    "obrigado",
    "status_painel",
    "possui_plano_mobilidade",
    "aprovado_lei",
    "elaborando_plano",
    "reference_date",
  ];
  const header = columns.join(",");
  const body = rows
    .map((row) => columns.map((column) => csvEscape(row[column])).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${header}\n${body}\n`], {
    type: "text/csv;charset=utf-8",
  });
  anchor.href = URL.createObjectURL(blob);
}

function renderTable(container, rows) {
  container.innerHTML = "";
  const table = document.createElement("table");
  table.className = "data-table";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Município</th>
        <th>UF</th>
        <th>Região</th>
        <th>Status</th>
        <th>Obrigatoriedade</th>
        <th>Pop. 2022</th>
        <th>Plano</th>
        <th>Aprovado</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");
  for (const row of rows) {
    const tr = document.createElement("tr");
    const statusLabel = row.status_painel ?? "Sem informação";
    const planoLabel = normalizeBooleanLabel(row.possui_plano_mobilidade);
    const aprovadoLabel = normalizeBooleanLabel(row.aprovado_lei);
    tr.innerHTML = `
      <td><strong>${row.municipio}</strong><span class="cell-sub">${row.codigo_ibge ?? "Sem código"}</span></td>
      <td>${row.uf}</td>
      <td>${row.regiao}</td>
      <td><span class="status-pill" data-status="${statusLabel}">${statusLabel}</span></td>
      <td>${row.obrigado ? "Obrigatório" : "Não obrigatório"}</td>
      <td>${formatNumber(row.populacao_censo_2022 ?? row.estimativa_populacional ?? 0)}</td>
      <td><span class="table-badge" data-tone="${badgeTone(planoLabel)}">${planoLabel}</span></td>
      <td><span class="table-badge" data-tone="${badgeTone(aprovadoLabel)}">${aprovadoLabel}</span></td>
    `;
    tbody.append(tr);
  }
  table.append(tbody);
  container.append(table);
}

function control(label, input) {
  const wrap = document.createElement("label");
  wrap.className = "control";
  const text = document.createElement("span");
  text.textContent = label;
  wrap.append(text, input);
  return wrap;
}

function selectInput(options, state, key, onChange) {
  const select = document.createElement("select");
  for (const option of options) {
    const element = document.createElement("option");
    element.value = option;
    element.textContent = option;
    if (option === state[key]) element.selected = true;
    select.append(element);
  }
  select.addEventListener("change", () => {
    state[key] = select.value;
    onChange();
  });
  return select;
}

function textInput(state, key, onChange, placeholder) {
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = placeholder;
  input.value = state[key];
  input.addEventListener("input", () => {
    state[key] = input.value;
    onChange();
  });
  return input;
}

function unique(rows, key, fallback) {
  const values = [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "pt-BR"),
  );
  return fallback ? [fallback, ...values] : values;
}

function normalizeBooleanLabel(value) {
  if (value == null || value === "") return "—";
  const text = String(value).trim().toLowerCase();
  if (text === "sim") return "Sim";
  if (text === "não" || text === "nao") return "Não";
  return String(value);
}

function badgeTone(value) {
  if (value === "Sim") return "positive";
  if (value === "Não") return "negative";
  return "neutral";
}
