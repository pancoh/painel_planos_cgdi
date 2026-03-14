# Painel de Planos de Mobilidade Urbana

Painel web institucional construído com [Observable Framework](https://observablehq.com/framework/) para monitorar a situação dos Planos de Mobilidade Urbana no Brasil, em substituição a um painel antigo em Power BI. Vinculado ao Ministério das Cidades (MCID) / Secretaria Nacional de Mobilidade Urbana.

## Requisitos

- Node.js 18+
- npm 9+
- Arquivos de levantamento Excel em `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/` (ver seção [Dados de entrada](#dados-de-entrada))

## Início rápido

```bash
npm install
npm run dev
```

`npm run dev` executa automaticamente o pipeline de dados (`npm run data`) antes de abrir o preview local. A primeira execução pode levar alguns minutos dependendo da quantidade de arquivos Excel.

## Build de produção

```bash
npm run build
```

Os arquivos estáticos serão gerados em `dist/`. O diretório pode ser publicado em qualquer servidor estático (GitHub Pages, Netlify, S3 + CloudFront, portal gov.br via iframe, etc.).

---

## Dados de entrada

Os levantamentos são arquivos Excel com o padrão de nome:

```
Arquivos_Levantamento_PlanosdeMobilidadeUrbana/
  Levantamento_PlanosdeMobilidadeUrbana_01jan2025.xlsx
  Levantamento_PlanosdeMobilidadeUrbana_01fev2025.xlsx
  ...
```

**Esses arquivos não são versionados no repositório** (dados institucionais controlados pelo MCID). Para executar o projeto localmente, copie os arquivos para a pasta acima antes de rodar `npm run dev` ou `npm run build`.

---

## Pipeline de dados

O comando `npm run data` executa três scripts em sequência:

| Script | O que faz |
|--------|-----------|
| `scripts/download-geo.mjs` | Baixa 27 arquivos GeoJSON de municípios da API do IBGE para `src/geo/` (pula arquivos já existentes) |
| `scripts/process-historical-data.mjs` | Lê todos os XLSXs, normaliza colunas, classifica status e porte, gera agregados históricos em `src/data/processed/` |
| `scripts/generate-state-pages.mjs` | Gera os 27 arquivos `src/estado/{uf}.md` a partir de um template |
| `scripts/check-data.mjs` | Valida integridade dos artefatos gerados (exit 1 se houver erros) |

### Artefatos gerados

Todos os arquivos abaixo são **reconstruídos por `npm run data`** e não são versionados no git:

| Arquivo | Tamanho aprox. | Descrição |
|---------|---------------|-----------|
| `src/data/processed/metadata.json` | ~5 KB | Resumo nacional, deltas mensais, deadlines legais, barra de aprovação por população |
| `src/data/processed/snapshots.json` | ~3 KB | Lista de snapshots com datas e contagens |
| `src/data/processed/latest-municipios.json` | ~8,5 MB | Todos os 5.571 municípios no snapshot mais recente |
| `src/data/processed/municipios-uf-{uf}.json` | ~22–963 KB | Mesmo dado partido por UF (27 arquivos) — usado no mapa e nas páginas estaduais |
| `src/data/processed/latest-regioes.json` | ~3 KB | Agregados por região (snapshot atual) |
| `src/data/processed/latest-ufs.json` | ~15 KB | Agregados por UF (snapshot atual) |
| `src/data/processed/brasil-series.json` | ~7 KB | Série histórica nacional |
| `src/data/processed/regioes-series.json` | ~37 KB | Série histórica por região |
| `src/data/processed/ufs-series.json` | ~190 KB | Série histórica por UF |
| `src/data/processed/latest-municipios.csv` | ~2,3 MB | Export CSV do snapshot atual |
| `src/data/processed/historico-municipios.json` | ~107 MB | Todos os registros históricos (13 snapshots × 5.571 municípios) |
| `src/estado/{uf}.md` | ~1 KB × 27 | Páginas de detalhe por estado |

> **Nota:** `historico-municipios.json` (~107 MB) não é referenciado por nenhuma página pública — existe para análises internas. Não é incluído no build de produção.

### Clone limpo

Após `git clone`, o repositório **não contém os artefatos gerados**. Execute:

```bash
npm install
npm run data   # gera src/data/processed/ e src/estado/
npm run dev    # ou npm run build
```

---

## Definição das métricas

O painel usa dois indicadores de progresso distintos:

| Métrica | Campo | Definição |
|---------|-------|-----------|
| **% aprovado** | `percentual_aprovado` | Municípios obrigados com **plano aprovado em lei** ÷ total de obrigados. Métrica principal do painel. |
| **Cobertura** | `percentual_cobertura` | Municípios obrigados com **qualquer plano** (aprovado + "possui plano") ÷ total de obrigados. Métrica secundária, usada nos gráficos de evolução histórica. |

**Obrigatoriedade** é determinada pelo campo oficial `Obrigados Censo 2022 - atualizado`, conforme relação publicada para fins de acompanhamento federal (Lei nº 12.587/2012, §1º do art. 24, com redação dada pela Lei nº 14.000/2020). Os critérios legais incluem municípios com mais de 20 mil habitantes, integrantes de regiões metropolitanas/RIDEs com população total superior a 1 milhão de habitantes, e integrantes de áreas de interesse turístico. O pipeline não re-implementa esses critérios — lê o campo diretamente da planilha de levantamento.

---

## Páginas estaduais

As 27 páginas de detalhe por estado (`/estado/ac`, `/estado/sp`, etc.) são geradas por `scripts/generate-state-pages.mjs`. O Observable Framework 1.x não suporta rotas dinâmicas com parâmetros de path, portanto a abordagem adotada é manter o gerador. Cada página gerada carrega apenas o arquivo particionado do seu estado (`municipios-uf-{uf}.json`), evitando baixar o dataset completo.

---

## Fluxo CI/CD

```
git clone
└── npm install
└── [copiar XLSXs para Arquivos_Levantamento_.../]
└── npm run build
    ├── npm run data
    │   ├── download-geo.mjs   (pula se geo já existe)
    │   ├── process-historical-data.mjs
    │   ├── generate-state-pages.mjs
    │   └── check-data.mjs     (falha o build se dados inválidos)
    └── observable build → dist/
└── deploy dist/ → servidor estático
```

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Preview local com hot reload (roda data antes) |
| `npm run build` | Build de produção em `dist/` (roda data antes) |
| `npm run data` | Executa o pipeline de dados completo + validação |
| `npm run check-data` | Apenas valida os artefatos gerados |
| `npm run lint` | ESLint nos componentes JS e scripts |
| `npm run clean` | Remove `dist/` e cache do Observable |
