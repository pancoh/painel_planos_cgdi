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
    page: 1,
  };
  const pageSize = 200;

  const root = document.createElement("section");
  root.className = "table-shell";

  const heading = document.createElement("div");
  heading.className = "section-heading";
  const headingInner = document.createElement("div");
  const headingH2 = document.createElement("h2");
  headingH2.textContent = title;
  const headingP = document.createElement("p");
  headingP.textContent = "Busca, filtros e exportação da visão selecionada.";
  headingInner.append(headingH2, headingP);
  heading.append(headingInner);

  const controls = document.createElement("div");
  controls.className = "table-controls";

  const stats = document.createElement("div");
  stats.className = "table-meta";

  const pagination = document.createElement("div");
  pagination.className = "table-pagination";

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
  const porteOrder = [
    "Até 20 mil",
    "De 20 a 60 mil",
    "De 60 a 100 mil",
    "De 100 a 250 mil",
    "De 250 mil a 500 mil",
    "De 500 mil a 1 milhão",
    "Mais de 1 milhão",
  ];
  const porteValues = unique(rows, "porte_populacional");
  controls.append(
    control(
      "Porte populacional",
      selectInput(
        ["Todos", ...porteOrder.filter(v => porteValues.includes(v))],
        state,
        "porte",
        update,
      ),
    ),
  );
  controls.append(download);

  root.append(heading, controls, stats, pagination, tableWrap);
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
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (state.page > totalPages) state.page = totalPages;
    const startIndex = filtered.length === 0 ? 0 : (state.page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filtered.length);
    const startLabel = filtered.length === 0 ? 0 : startIndex + 1;
    const totalEl = document.createElement("strong");
    totalEl.textContent = formatNumber(filtered.length);
    const startEl = document.createElement("strong");
    startEl.textContent = formatNumber(startLabel);
    const endEl = document.createElement("strong");
    endEl.textContent = formatNumber(endIndex);
    stats.replaceChildren(totalEl, " municípios encontrados. Exibindo ", startEl, " a ", endEl, " de ", totalEl.cloneNode(true), ".");
    renderPagination(pagination, {
      totalItems: filtered.length,
      totalPages,
      currentPage: state.page,
      onPageChange: (page) => {
        state.page = page;
        update();
      },
    });
    renderTable(tableWrap, filtered.slice(startIndex, endIndex));
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
    "instrumento_legal",
    "numero_da_lei",
    "data_da_lei",
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

function formatDateBR(value) {
  if (!value) return "—";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
}

function cell(content) {
  const td = document.createElement("td");
  if (typeof content === "string") td.textContent = content;
  else if (Array.isArray(content)) td.append(...content);
  else td.append(content);
  return td;
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
        <th>Instrumento Legal</th>
        <th>Nº da Lei</th>
        <th>Data da Lei</th>
      </tr>
    </thead>
  `;
  const tbody = document.createElement("tbody");
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const statusLabel = row.status_painel ?? "Sem informação";
    const planoLabel = normalizeBooleanLabel(row.possui_plano_mobilidade);
    const aprovadoLabel = normalizeBooleanLabel(row.aprovado_lei);

    const munName = document.createElement("strong");
    munName.textContent = row.municipio;
    const munCode = document.createElement("span");
    munCode.className = "cell-sub";
    munCode.textContent = row.codigo_ibge ?? "Sem código";

    const statusPill = document.createElement("span");
    statusPill.className = "status-pill";
    statusPill.dataset.status = statusLabel;
    statusPill.textContent = statusLabel;

    const planoBadge = document.createElement("span");
    planoBadge.className = "table-badge";
    planoBadge.dataset.tone = badgeTone(planoLabel);
    planoBadge.textContent = planoLabel;

    const aprovadoBadge = document.createElement("span");
    aprovadoBadge.className = "table-badge";
    aprovadoBadge.dataset.tone = badgeTone(aprovadoLabel);
    aprovadoBadge.textContent = aprovadoLabel;

    const tr = document.createElement("tr");
    tr.append(
      cell([munName, munCode]),
      cell(row.uf),
      cell(row.regiao),
      cell(statusPill),
      cell(row.obrigado ? "Obrigatório" : "Não obrigatório"),
      cell(formatNumber(row.populacao_censo_2022 ?? row.estimativa_populacional ?? 0)),
      cell(planoBadge),
      cell(aprovadoBadge),
      cell(row.instrumento_legal ?? "—"),
      cell(row.numero_da_lei ?? "—"),
      cell(formatDateBR(row.data_da_lei)),
    );
    fragment.append(tr);
  }
  tbody.append(fragment);
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
    state.page = 1;
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
    state.page = 1;
    onChange();
  });
  return input;
}

function renderPagination(
  container,
  { totalItems, totalPages, currentPage, onPageChange },
) {
  container.innerHTML = "";
  if (totalItems <= 200) return;

  const summary = document.createElement("div");
  summary.className = "table-pagination__summary";
  summary.textContent = `Página ${formatNumber(currentPage)} de ${formatNumber(totalPages)}`;

  const actions = document.createElement("div");
  actions.className = "table-pagination__actions";
  actions.append(
    pageButton("Anterior", currentPage === 1, () =>
      onPageChange(currentPage - 1),
    ),
  );

  for (const page of getVisiblePages(currentPage, totalPages)) {
    if (page === "...") {
      const ellipsis = document.createElement("span");
      ellipsis.className = "table-pagination__ellipsis";
      ellipsis.textContent = "...";
      actions.append(ellipsis);
      continue;
    }
    const button = pageButton(String(page), false, () => onPageChange(page));
    if (page === currentPage) button.dataset.active = "true";
    actions.append(button);
  }

  actions.append(
    pageButton("Próxima", currentPage === totalPages, () =>
      onPageChange(currentPage + 1),
    ),
  );

  container.append(summary, actions);
}

function pageButton(label, disabled, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "table-pagination__button";
  button.textContent = label;
  button.disabled = disabled;
  button.addEventListener("click", onClick);
  return button;
}

function getVisiblePages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page += 1) pages.push(page);
  if (end < totalPages - 1) pages.push("...");
  pages.push(totalPages);

  return pages;
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
