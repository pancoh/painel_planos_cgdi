# Painel de Planos de Mobilidade Urbana

Painel web institucional construído com [Observable Framework](https://observablehq.com/framework/) para monitorar a situação dos Planos de Mobilidade Urbana no Brasil, em substituição a um painel antigo em Power BI. Vinculado ao Ministério das Cidades (MCID) / Secretaria Nacional de Mobilidade Urbana.

Para manutenção detalhada (colunas lidas, cálculos, artefatos, páginas e procedimentos), consulte [MANUTENCAO.md](MANUTENCAO.md).

## Requisitos

- Node.js 18+
- npm 9+
- Arquivos de levantamento Excel em `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/` (já incluídos no repositório; ver seção [Dados de entrada](#dados-de-entrada))

## Início rápido

```bash
npm install
npm run dev
```

A dependência `xlsx` é instalada a partir do tarball oficial do SheetJS (`cdn.sheetjs.com`), pois a versão do registro npm está desatualizada e vulnerável. `npm install` precisa de acesso a esse domínio.

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

**Esses arquivos estão versionados no repositório.** Um clone limpo já contém todos os levantamentos e o build no CI os utiliza diretamente. Para adicionar um novo levantamento, copie o arquivo para a pasta acima seguindo o padrão de nome e faça commit (procedimento detalhado em [MANUTENCAO.md](MANUTENCAO.md), seção 10.1).

A pasta `Arquivo_obrigatoriedade/` contém a planilha oficial de municípios obrigados (`Obrigados_PlanosdeMobilidadeUrbana.xlsx`), usada apenas pela página `/obrigados`.

---

## Pipeline de dados

O comando `npm run data` executa quatro scripts em sequência:

| Script | O que faz |
|--------|-----------|
| `scripts/download-geo.mjs` | Baixa da API do IBGE o GeoJSON de estados e os 27 GeoJSON de municípios para `src/geo/` (pula arquivos já existentes; os arquivos estão versionados, então normalmente não baixa nada) |
| `scripts/process-historical-data.mjs` | Lê todos os XLSXs, normaliza colunas, classifica status e porte, gera agregados em `src/data/processed/` e processa a planilha de obrigados |
| `scripts/generate-state-pages.mjs` | Gera os 27 arquivos `src/estado/{uf}.md` a partir de um template |
| `scripts/check-data.mjs` | Valida integridade dos artefatos gerados, incluindo pisos absolutos e comparação com o snapshot anterior (exit 1 se houver erros) |

### Artefatos gerados

Todos os arquivos abaixo são **reconstruídos por `npm run data`**. Apenas `evolucao-aprovados.json` e `obrigados.json` são versionados no git; os demais estão no `.gitignore`.

| Arquivo | Tamanho aprox. | Descrição |
|---------|---------------|-----------|
| `src/data/processed/metadata.json` | ~5 KB | Resumo nacional, resumo anterior, deltas, prazos legais, barra de aprovação por porte |
| `src/data/processed/snapshots.json` | ~4 KB | Lista de snapshots com datas e contagens |
| `src/data/processed/latest-regioes.json` | ~3 KB | Agregados por região (snapshot atual) |
| `src/data/processed/latest-ufs.json` | ~15 KB | Agregados por UF (snapshot atual) |
| `src/data/processed/latest-municipios.csv` | ~2,2 MB | Base municipal completa do snapshot atual (41 colunas) |
| `src/data/processed/municipios-uf-{uf}.json` | ~20 KB a 1,2 MB | Mesmo dado partido por UF (27 arquivos), usado no mapa e nas páginas estaduais |
| `src/data/processed/evolucao-aprovados.json` | ~6 KB | Série acumulada de aprovados por ano e porte (gráfico da home). Versionado |
| `src/data/processed/obrigados.json` | ~250 KB | Relação oficial de municípios obrigados (página `/obrigados`). Versionado |
| `src/data/processed/historico-municipios.json` | ~160 MB | Todos os registros de todos os snapshots (21 snapshots, cerca de 117 mil linhas) |
| `src/estado/{uf}.md` | ~1 KB × 27 | Páginas de detalhe por estado |

> **Nota:** `historico-municipios.json` não é referenciado por nenhuma página pública; existe para análises internas. O Observable Framework só copia para `dist/` os arquivos citados em `FileAttachment()`, então ele não entra no build de produção.

### Clone limpo

Após `git clone`, o repositório contém as planilhas, os GeoJSON e as bandeiras, mas **não contém a maior parte dos artefatos gerados**. Execute:

```bash
npm install
npm run dev    # ou npm run build (ambos executam npm run data antes)
```

---

## Definição das métricas

O painel usa dois indicadores de progresso distintos:

| Métrica | Campo | Definição |
|---------|-------|-----------|
| **% aprovado** | `percentual_aprovado` | Municípios obrigados com **plano aprovado em lei** ÷ total de obrigados. Métrica principal do painel. |
| **Cobertura** | `percentual_cobertura` | Municípios obrigados com **qualquer plano** (aprovado + "possui plano") ÷ total de obrigados. Métrica derivada mantida nos agregados para leitura complementar. |

**Obrigatoriedade** é determinada pela coluna oficial da planilha de levantamento (`Obrigados Censo 2022 - atualizado` nos arquivos até agosto de 2026; `Obrigados Censo 2022` a partir de setembro de 2026), conforme relação publicada para fins de acompanhamento federal (Lei nº 12.587/2012, §1º do art. 24, com redação dada pela Lei nº 14.000/2020). Os critérios legais incluem municípios com mais de 20 mil habitantes, integrantes de regiões metropolitanas/RIDEs com população total superior a 1 milhão de habitantes, e integrantes de áreas de interesse turístico. O pipeline não reimplementa esses critérios: lê o campo diretamente da planilha de levantamento.

---

## Páginas estaduais

As 27 páginas de detalhe por estado (`/estado/ac`, `/estado/sp`, etc.) são geradas por `scripts/generate-state-pages.mjs`. O Observable Framework 1.x não suporta rotas dinâmicas com parâmetros de path, portanto a abordagem adotada é manter o gerador. Cada página gerada carrega apenas o arquivo particionado do seu estado (`municipios-uf-{uf}.json`), evitando baixar o dataset completo.

---

## Fluxo CI/CD

O workflow `.github/workflows/deploy.yml` roda a cada push em `main`:

```
git push (main)
└── npm ci
└── npm run lint
└── npm test
└── npm run build
    ├── npm run data
    │   ├── download-geo.mjs   (pula, geo já versionado)
    │   ├── process-historical-data.mjs
    │   ├── generate-state-pages.mjs
    │   └── check-data.mjs     (falha o build se dados inválidos)
    └── observable build → dist/
└── deploy dist/ → GitHub Pages
```

Como planilhas, GeoJSON e bandeiras estão no git, o build no CI não depende de nenhum arquivo externo.

---

## Scripts disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Preview local com hot reload (roda data antes) |
| `npm run build` | Build de produção em `dist/` (roda data antes) |
| `npm run data` | Executa o pipeline de dados completo + validação |
| `npm run check-data` | Apenas valida os artefatos gerados |
| `npm test` | Testes automatizados (`node --test`) |
| `npm run lint` | ESLint nos componentes JS e scripts |
| `npm run clean` | Remove `dist/` e cache do Observable |
| `node scripts/download-flags.mjs` | Baixa as bandeiras das UFs para `src/assets/flags/` (manual; já versionadas) |
