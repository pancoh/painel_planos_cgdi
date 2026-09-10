# Guia de manutenção do Painel de Planos de Mobilidade Urbana

Este documento descreve, de ponta a ponta, como o painel funciona: quais arquivos
entram, quais colunas são lidas, quais cálculos são feitos, quais arquivos saem e
o que cada página mostra. O objetivo é permitir que uma pessoa sem contato
anterior com o projeto consiga atualizar os dados, corrigir problemas e evoluir o
sistema com segurança.

Referência dos números citados: levantamento de 03 de setembro de 2026
(21 snapshots processados). Os valores mudam a cada atualização, mas a estrutura
descrita aqui não.

Documentos complementares:

| Documento | Conteúdo |
|---|---|
| `README.md` | Instalação, comandos e visão resumida |
| `regras-de-status.md` | Discussão detalhada das regras de classificação e pontos para revisão |
| `estrutura-painel-planos-cgdi.md` | Avaliação da arquitetura e estado de manutenção |
| `src/metodologia.md` | Página pública de metodologia (atenção: ver seção 12.4) |

---

## 1. Visão geral

O painel é um site estático, gerado com Observable Framework, que mostra a
situação dos Planos de Mobilidade Urbana nos municípios brasileiros. Ele
substitui um painel antigo em Power BI e é mantido pela Secretaria Nacional de
Mobilidade Urbana do Ministério das Cidades.

O sistema tem três camadas:

```text
[1] Entrada                     [2] Pipeline (Node.js)              [3] Site estático (Observable)
Arquivos_Levantamento_.../      scripts/process-historical-data.mjs  src/*.md + src/components/*.js
  Levantamento_*.xlsx    ---->  scripts/generate-state-pages.mjs --> src/data/processed/*.json|csv
  Arquivo_obrigatoriedade/      scripts/check-data.mjs               src/estado/*.md
    Obrigados_*.xlsx                                                       |
                                                                           v
                                                                     observable build --> dist/
```

Nada é calculado em tempo real no navegador a partir do Excel. Todo cálculo
acontece no pipeline, em tempo de build. O navegador só lê os JSON e CSV prontos
e monta a interface.

### 1.1 Ciclo de vida de uma atualização

1. A equipe recebe um novo arquivo `Levantamento_PlanosdeMobilidadeUrbana_<data>.xlsx`.
2. O arquivo é copiado para `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/`.
3. `npm run data` reprocessa todos os arquivos e regenera `src/data/processed/`.
4. `npm run build` gera `dist/`.
5. O commit na branch `main` dispara o GitHub Actions, que faz lint, testes,
   build e publica em GitHub Pages.

O procedimento completo, com as verificações necessárias, está na seção 10.1.

### 1.2 Fluxo completo, da planilha ao site publicado

```text
                         ENTRADA (versionada no git)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Arquivos_Levantamento_PlanosdeMobilidadeUrbana/                          │
 │   Levantamento_PlanosdeMobilidadeUrbana_<data>.xlsx  (um por levantamento)│
 │   Arquivo_obrigatoriedade/Obrigados_PlanosdeMobilidadeUrbana.xlsx        │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                │  npm run data  (também disparado por predev/prebuild)
                                v
 ┌─ 1. download-geo.mjs ────────────────────────────────────────────────────┐
 │  IBGE (API de malhas) ──> src/geo/estados.json, src/geo/municipios-<cod>.json │
 │  (pula o que já existe; hoje tudo está versionado)                        │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                v
 ┌─ 2. process-historical-data.mjs ─────────────────────────────────────────┐
 │  a) apaga artefatos antigos em src/data/processed/                        │
 │  b) lista os XLSX, extrai a data do nome, ordena                          │
 │  c) para cada XLSX: aba "Levantamento" ──> normalizeRow                   │
 │        cabeçalho ──COLUMN_ALIASES──> campo interno                         │
 │        valores  ──classify*/toNumber/normalizeDate──> valores padronizados │
 │        derivados: obrigado, porte_populacional, status_painel, cobertura  │
 │  d) snapshot vigente = maior data                                         │
 │  e) summarize() por Brasil, região e UF                                   │
 │  f) approvalByPopulation() e buildCumulativeApprovalSeries()              │
 │  g) grava:  metadata.json  snapshots.json  latest-regioes.json            │
 │             latest-ufs.json  latest-municipios.csv  municipios-uf-*.json  │
 │             evolucao-aprovados.json  historico-municipios.json            │
 │  h) processObrigados(): planilha de obrigatoriedade ──> obrigados.json    │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                v
 ┌─ 3. generate-state-pages.mjs ────────────────────────────────────────────┐
 │  UF_CODES ──> src/estado/<uf>.md  (27 páginas a partir de um template)    │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                v
 ┌─ 4. check-data.mjs ──────────────────────────────────────────────────────┐
 │  valida contagens, categorias, UFs, soma dos agregados; exit 1 em erro    │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                │  observable build   (npm run build)
                                v
 ┌─ Observable Framework ───────────────────────────────────────────────────┐
 │  src/*.md + src/estado/*.md ──> HTML                                      │
 │  src/components/*.js, src/lib/*.js ──> JS empacotado                      │
 │  arquivos citados em FileAttachment() ──> copiados para dist/_file/       │
 │  theme.css, logos, bandeiras ──> copiados                                 │
 └──────────────────────────────┬───────────────────────────────────────────┘
                                v
                             dist/  ──(GitHub Actions, push em main)──>  GitHub Pages
```

### 1.3 Quem consome cada artefato

```text
metadata.json ─────────────┬──> Home (cartões, barra por porte, data de atualização)
                           └──> Metodologia
latest-regioes.json ───────┬──> Home (ranking regional)
                           └──> Regiões
latest-ufs.json ───────────┬──> Home (mapa de UFs)
                           ├──> Regiões (tabela de estados)
                           ├──> Estados (ranking, cartões)
                           └──> Estado/<uf> (cartões)
evolucao-aprovados.json ──────> Home (gráfico de evolução)
municipios-uf-<uf>.json ───┬──> Home (mapa municipal, carregado ao clicar na UF)
                           └──> Estado/<uf> (tabela municipal)
latest-municipios.csv ─────┬──> Municípios (tabela completa)
                           └──> Estados (tabela da UF selecionada, filtrada no navegador)
obrigados.json ───────────────> Obrigados
snapshots.json ───────────────> Metodologia
geo/estados.json ─────────────> Home (contorno das UFs)
geo/municipios-<cod>.json ────> Home (contorno dos municípios, ao clicar na UF)
historico-municipios.json ────> nenhuma página
```

### 1.4 Fluxo em tempo de execução (no navegador)

O site é estático. Ao abrir uma página, o navegador baixa os arquivos listados
em `FileAttachment()` daquela página e os componentes montam a interface. Não há
servidor de aplicação nem banco de dados.

```text
Home
  abrir página ──> baixa metadata, latest-regioes, latest-ufs, evolucao, geo/estados
               ──> createHomeDashboard() monta cartões, barra, ranking, mapa, gráfico
  clicar em UF ──> fetchMunicipiosByUf(uf) baixa municipios-uf-<uf>.json
               ──> fetchGeoByState(cod) baixa geo/municipios-<cod>.json
               ──> renderMunicipioLayer() cruza os dois por codigo_ibge e pinta
  "Voltar ao Brasil" ──> limpa a camada municipal e restaura o zoom

Estados
  abrir página ──> baixa latest-ufs + bandeiras
  trocar UF    ──> baixa latest-municipios.csv (uma vez), filtra por UF no navegador
               ──> createMunicipioExplorer() monta a tabela

Municípios / Estado/<uf>
  abrir página ──> baixa o CSV completo (Municípios) ou o JSON da UF (Estado/<uf>)
  filtros/busca ──> tudo em memória, sem nova requisição
  Exportar CSV ──> gera o arquivo no navegador a partir das linhas filtradas
```

---

## 2. Mapa do repositório

### 2.1 Pastas

| Caminho | Conteúdo | Versionado no git |
|---|---|---|
| `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/` | Planilhas de levantamento (uma por data) | Sim |
| `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/Arquivo_obrigatoriedade/` | Planilha oficial de municípios obrigados | Sim |
| `scripts/` | Pipeline de dados (Node.js) | Sim |
| `src/` | Fonte do site (Markdown, JS, CSS) | Sim |
| `src/components/` | Componentes visuais (mapa, tabelas, cartões, gráfico) | Sim |
| `src/lib/` | Utilitários compartilhados (formatação, constantes, parsers) | Sim |
| `src/data/processed/` | Artefatos gerados pelo pipeline | Parcial (ver 2.2) |
| `src/estado/` | Páginas por UF, geradas por script | Não (apenas `.gitkeep`) |
| `src/geo/` | GeoJSON de estados e municípios (IBGE) | Sim |
| `src/assets/flags/` | Bandeiras das UFs (PNG) | Sim |
| `src/logos/` | Logo do Ministério das Cidades | Sim |
| `test/` | Testes automatizados (`node --test`) | Sim |
| `dist/` | Site gerado | Não |
| `.github/workflows/deploy.yml` | Deploy para GitHub Pages | Sim |

Todas as planilhas estão no git. É por isso que o build no GitHub Actions
consegue regenerar os dados sem depender de nenhum arquivo externo.

### 2.2 Arquivos gerados em `src/data/processed/`

O pipeline apaga e recria estes arquivos a cada execução. Só dois deles ficam no
git (`evolucao-aprovados.json` e `obrigados.json`); os demais estão no
`.gitignore`.

| Arquivo | Tamanho aprox. | Descrição | Consumido por |
|---|---|---|---|
| `metadata.json` | 5 KB | Resumo nacional, resumo anterior, deltas, prazos legais, barra por porte | Home, Metodologia |
| `snapshots.json` | 4 KB | Lista dos arquivos processados, com data e contagem | Metodologia |
| `latest-regioes.json` | 3 KB | Agregado por região do snapshot mais recente | Home, Regiões |
| `latest-ufs.json` | 15 KB | Agregado por UF do snapshot mais recente | Home, Regiões, Estados, Estado/UF |
| `latest-municipios.csv` | 2,2 MB | Todos os municípios do snapshot mais recente (41 colunas) | Municípios, Estados |
| `municipios-uf-<uf>.json` (27 arquivos) | 20 KB a 1,2 MB | Mesmos registros, particionados por UF | Home (mapa), Estado/UF |
| `evolucao-aprovados.json` | 6 KB | Série acumulada de aprovados por ano e porte | Home (gráfico) |
| `obrigados.json` | 250 KB | Relação oficial de obrigados com critério legal | Página Obrigados |
| `historico-municipios.json` | 164 MB | Todas as linhas de todos os snapshots | Nenhuma página (uso interno) |

O Observable Framework só copia para `dist/` os arquivos referenciados por
`FileAttachment(...)` em alguma página. Por isso `historico-municipios.json` não
vai para produção, apesar do tamanho.

### 2.3 Arquivos de configuração

| Arquivo | Função |
|---|---|
| `package.json` | Scripts npm e dependências. `predev` e `prebuild` executam `npm run data` automaticamente |
| `observablehq.config.js` | Título, páginas do menu, cabeçalho, rodapé e `<head>` do site |
| `eslint.config.js` | Regras de lint para `scripts/`, `src/components/` e `src/lib/` |
| `src/theme.css` | Todo o CSS do painel (tokens em `:root`, componentes, responsividade) |
| `.gitignore` | Exclui `dist/`, cache do Observable e artefatos gerados |

---

## 3. Dados de entrada

### 3.1 Planilha de levantamento

**Local:** `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/`

**Padrão de nome:** `Levantamento_PlanosdeMobilidadeUrbana_<dia><mês><ano>.xlsx`,
por exemplo `Levantamento_PlanosdeMobilidadeUrbana_03set2026.xlsx`.

Regras de leitura:

- A data de referência vem **do nome do arquivo**, nunca do conteúdo. O dia pode
  ter um ou dois dígitos; o mês é a abreviação em português com três letras
  (`jan`, `fev`, `mar`, `abr`, `mai`, `jun`, `jul`, `ago`, `set`, `out`, `nov`,
  `dez`); o ano tem quatro dígitos.
- Arquivos que não seguem o padrão são ignorados, com aviso no console.
- Apenas a aba chamada **`Levantamento`** é lida. As abas `RMs` e `Resumo` são
  ignoradas. Se a aba não existir, o arquivo inteiro é ignorado sem aviso.
- A primeira linha da aba deve conter os cabeçalhos.
- O arquivo com a maior data de referência é o **snapshot vigente**. Todos os
  outros só servem para o histórico e para o cálculo do "mês anterior".

#### 3.1.1 Colunas da planilha (arquivo de 03/set/2026)

A tabela abaixo lista as 35 colunas do arquivo mais recente, se são lidas pelo
pipeline e para qual campo interno vão. Colunas marcadas como "ignorada" não têm
entrada em `COLUMN_ALIASES` e são descartadas em silêncio.

| # | Cabeçalho na planilha | Lida | Campo interno | Uso |
|---|---|---|---|---|
| 1 | Código IBGE | Sim | `codigo_ibge` | Chave do município; cruzamento com GeoJSON |
| 2 | Região | Sim | `regiao` | Sigla (N, NE, CO, SE, S) convertida para nome |
| 3 | UF | Sim | `uf` | Agregação e particionamento |
| 4 | Município | Sim | `municipio` | Exibição e busca |
| 5 | RIDE RM AU - IBGE 2024 | Sim | `recorte_metropolitano` | Exportado no CSV, não exibido |
| 6 | RMs ENMU | Sim | `enmu_rm` | Exportado no CSV, não exibido |
| 7 | Área de Estudo ENMU | Sim | `enmu_area_estudo` | Exportado no CSV, não exibido |
| 8 | Mapa do Turismo Brasileiro 2022 | Sim | `mapa_turismo_2022` | Exportado no CSV, não exibido |
| 9 | Mapa do Turismo Brasileiro 2024 | Sim | `mapa_turismo_2024` | Exportado no CSV, não exibido |
| 10 | Tipologia PNDU | Sim | `tipologia_pndu` | Exportado no CSV, não exibido |
| 11 | População - Censo 2010 | Sim | `populacao_censo_2010` | Reserva para porte populacional |
| 12 | Faixa Populacional - Censo 2010 | Sim | `faixa_populacional_2010` | Reserva para porte populacional |
| 13 | População - Censo 2022 | Sim | `populacao_censo_2022` | Coluna "Pop. 2022" nas tabelas; limiar de 250 mil |
| 14 | Faixa Populacional - Censo 2022 | Sim | `faixa_populacional_2022` | Fonte principal do porte populacional |
| 15 | Estimativa populacional 2026 | Sim | `estimativa_populacional` | Reserva de população quando Censo 2022 falta |
| 16 | Faixa populacional - 2026 | Sim | `faixa_populacional_estimativa` | Reserva para porte populacional |
| 17 | Ofício | Sim | `oficio` | Exportado no CSV, não usado em cálculo |
| 18 | Respondeu ao levantamento | Sim | `respondeu_ao_levantamento` | **Regra de status** e percentual de resposta |
| 19 | Possui Plano de Mobilidade Urbana | Sim | `possui_plano_mobilidade` | **Regra de status**; coluna "Plano" nas tabelas |
| 20 | Ano de elaboração | Sim | `ano_elaboracao` | **Gráfico de evolução acumulada** |
| 21 | Aprovado em lei ou ato normativo | Sim | `aprovado_lei` | **Regra de status**; barra por porte; gráfico; coluna "Aprovado" |
| 22 | Instrumento Legal | Sim | `instrumento_legal` | Coluna nas tabelas |
| 23 | Nº da Lei | Sim | `numero_da_lei` | Coluna nas tabelas |
| 24 | Data da Lei | Sim | `data_da_lei` | Coluna nas tabelas |
| 25 | Link | Não | (ignorada) | |
| 26 | Arquivo | Não | (ignorada) | |
| 27 | Sistemas de Informação | Não | (ignorada) | |
| 28 | Elaborando plano | Sim | `elaborando_plano` | **Regra de status** |
| 29 | Previsão de conclusão | Não | (ignorada) | |
| 30 | Repondido por qual instrumento | Sim | `instrumento_resposta` | Exportado no CSV, não exibido |
| 31 | Data da resposta | Sim | `data_resposta` | Exportado no CSV, não exibido |
| 32 | Fonte da Resposta | Sim | `fonte_resposta` | Exportado no CSV, não exibido |
| 33 | Obrigados Estimativa 2026 | Sim | `obrigados_estimativa` | Exportado no CSV, não usado em cálculo |
| 34 | Obrigados Censo 2022 - antigo | Sim | `obrigados_censo_2022_antigo` | Exportado no CSV, não usado em cálculo |
| 35 | Obrigados Censo 2022 | Sim | `obrigados_censo_2022_atual` | **Define `obrigado`** (ver 5.5) |

O cabeçalho "Repondido por qual instrumento" tem erro de digitação na planilha
original. O alias reproduz o erro de propósito; corrigir o alias sem corrigir a
planilha quebraria a leitura.

#### 3.1.2 Colunas que mudam de nome entre arquivos

Os cabeçalhos abaixo mudaram de nome ao longo do tempo. O pipeline resolve isso
com a tabela `COLUMN_ALIASES` em `scripts/process-data-utils.mjs`, que aponta
vários cabeçalhos para o mesmo campo interno.

| Campo interno | Cabeçalhos aceitos (após normalização) |
|---|---|
| `estimativa_populacional` | `estimativa_populacional_2024`, `_2025`, `_2026` |
| `faixa_populacional_estimativa` | `faixa_populacional_2024`, `_2025`, `_2026` |
| `faixa_populacional_2010` | `faixa_populacional_censo`, `faixa_populacional_censo_2010` |
| `obrigados_estimativa` | `obrigados_estimativa_2024`, `_2025`, `_2026` |
| `obrigados_censo_2022_atualizado` | `obrigados_censo_2022_atualizado` (arquivos até 18/ago/2026) |
| `obrigados_censo_2022_atual` | `obrigados_censo_2022` (arquivos a partir de 03/set/2026) |
| `recorte_metropolitano` | `ride_rm_au_ibge_2021`, `ride_rm_au_ibge_2024` |
| `recorte_metropolitano_secundario` | `ride_rm_au_ibge_2023` (mapeado, mas não emitido na saída) |
| `enmu` | `enmu` (coluna única, existiu de out/2025 a fev/2026) |
| `enmu_rm`, `enmu_area_estudo` | `rms_enmu`, `area_de_estudo_enmu` (a partir de mar/2026) |

A normalização de cabeçalho (`normalizeHeader`) remove acentos, converte para
minúsculas e troca qualquer sequência de caracteres não alfanuméricos por `_`.
Exemplo: `Obrigados Censo 2022 - atualizado` vira `obrigados_censo_2022_atualizado`.

**Regra prática:** quando um levantamento novo chegar com o ano trocado em algum
cabeçalho (por exemplo `Estimativa populacional 2027`), é necessário adicionar o
novo alias. Sem isso, o campo fica vazio e os indicadores podem zerar. O
procedimento está na seção 10.2.

#### 3.1.3 Valores observados nas colunas de decisão

Valores encontrados no arquivo de 03/set/2026. Servem para entender o que o
pipeline precisa reconhecer.

| Coluna | Valores distintos (contagem) |
|---|---|
| Respondeu ao levantamento | `Sim` (2.341), `Não foi enviado ofício` (2.093), `Não` (1.137) |
| Possui Plano de Mobilidade Urbana | `Não foi enviado ofício` (2.091), `Não` (1.850), `Não respondeu` (1.136), `Sim` (493), `SIM` (1) |
| Aprovado em lei ou ato normativo | `Não foi enviado ofício` (2.091), `Não possui plano` (1.850), `Não respondeu` (1.136), `Sim` (416), `Não` (78) |
| Elaborando plano | `Não foi enviado ofício` (2.091), `Não` (1.903), `Não respondeu` (1.138), `Sim` (433), `Em revisão` (6) |
| Obrigados Censo 2022 | `Não` (3.661), `Sim` (1.910) |
| Ofício | `Sim` (3.473), `Não` (2.094), `sim` (4) |
| Instrumento Legal | 15 valores; os relevantes são `Lei Municipal`, `Lei Complementar`, `Decreto Municipal`, `Lei Distrital`, `Lei Ordinária` e variações |

A comparação de valores ignora acentos e maiúsculas, então `SIM`, `Sim` e `sim`
são equivalentes. Valores fora do esperado passam sem alerta (ver 12.6).

### 3.2 Planilha de obrigatoriedade

**Local:** `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/Arquivo_obrigatoriedade/Obrigados_PlanosdeMobilidadeUrbana.xlsx`

É a relação oficial de municípios obrigados a elaborar o plano, nos termos da
Lei nº 12.587/2012 (art. 24, § 1º), com redação da Lei nº 14.000/2020. Alimenta
apenas a página "Municípios obrigados" (`/obrigados`). **Não participa do cálculo
de `obrigado` nas demais páginas**, que vem da coluna 35 da planilha de
levantamento.

Regras de leitura (função `processObrigados` em `process-historical-data.mjs`):

- Lê o primeiro arquivo `.xlsx` da pasta, primeira aba.
- Procura, nas dez primeiras linhas, a linha de cabeçalho que contenha o texto
  "Código do Município". A linha 1 é um título e é pulada.
- Lê as colunas **por posição**, não por nome: A = código IBGE, B = região
  (sigla), C = UF, D = município, E = RM/RIDE/AU, F = população Censo 2022,
  G = critério de obrigatoriedade.
- Ignora linhas cujo código IBGE não seja numérico.

Se as colunas dessa planilha mudarem de ordem, a página de obrigados exibirá
dados trocados sem erro. Confira a ordem ao substituir o arquivo.

Se o arquivo não existir, o pipeline apenas avisa e mantém o `obrigados.json`
anterior (por isso ele está versionado).

### 3.3 Fontes externas baixadas uma vez

| Recurso | Script | Destino | Observação |
|---|---|---|---|
| Malhas do IBGE (estados e municípios, TopoJSON convertido em GeoJSON) | `scripts/download-geo.mjs` | `src/geo/estados.json`, `src/geo/municipios-<código UF>.json` | Faz parte de `npm run data`; pula arquivos já existentes |
| Bandeiras das UFs (Atlas Escolar IBGE) | `scripts/download-flags.mjs` | `src/assets/flags/<uf>.png` | Execução manual: `node scripts/download-flags.mjs` |
| Fontes IBM Plex (Google Fonts) | `scripts/build-fonts.mjs` | `src/fonts.css` (base64) | Execução manual, só ao mudar família ou pesos |

Os dois conjuntos estão versionados. O download só é necessário se algum arquivo
for apagado.

---

## 4. Ordem de execução do pipeline

`npm run data` executa, em sequência:

```text
1. node scripts/download-geo.mjs              (garante src/geo/)
2. node scripts/process-historical-data.mjs   (lê XLSX, gera src/data/processed/)
3. node scripts/generate-state-pages.mjs      (gera src/estado/<uf>.md)
4. node scripts/check-data.mjs                (valida; exit 1 em erro)
```

`npm run dev` e `npm run build` executam `npm run data` antes, por meio dos
ganchos `predev` e `prebuild`.

---

## 5. Processamento do levantamento, passo a passo

Arquivo: `scripts/process-historical-data.mjs`, com funções auxiliares em
`scripts/process-data-utils.mjs`.

### 5.1 Limpeza

`cleanupProcessedArtifacts` apaga os artefatos gerados da execução anterior
(inclusive os 27 arquivos por UF). Preserva `.gitkeep`, `evolucao-aprovados.json`
e `obrigados.json` (estes dois são sobrescritos em seguida, não apagados).

### 5.2 Coleta dos arquivos

`collectInputFiles` lista os `.xlsx` da pasta de entrada, extrai a data de cada
um pelo nome e ordena por data crescente. O último da lista é o snapshot vigente.

### 5.3 Leitura de cada arquivo

Para cada arquivo: abre com `xlsx.readFile` (opção `cellDates: true`), pega a aba
`Levantamento`, converte em objetos (`sheet_to_json` com `raw: false`, ou seja,
tudo vem como texto formatado), valida os cabeçalhos e passa cada linha por
`normalizeRow`.

A validação (`validateHeaders`) imprime um aviso com as colunas sem alias e
**interrompe o pipeline com erro** se faltar algum campo essencial: código IBGE,
UF, município, `Aprovado em lei` ou a coluna de obrigatoriedade
(`REQUIRED_CANONICAL_FIELDS` e `OBLIGATION_FIELDS` em `process-data-utils.mjs`).
A mensagem de erro aponta para a seção 10.2 deste documento.

### 5.4 Normalização de uma linha (`normalizeRow`)

1. **Cabeçalhos:** cada chave da linha passa por `normalizeHeader` e é procurada
   em `COLUMN_ALIASES`. Sem alias, a coluna é descartada.
2. **Textos:** `cleanText` faz trim e converte vazio em `null`.
3. **Números:** `toNumber` aceita `11.451.999`, `11,451,999`, `11451999` e
   formas com decimais. Retorna `null` se não conseguir converter.
4. **Datas:** `normalizeDate` converte para `AAAA-MM-DD`. Aceita `Date`, ISO,
   `dd/mm/aaaa`, `mm/dd/aaaa` e mês abreviado em inglês ou português
   (`18-May-23`, `5/ago/2021`). Quando dia e mês são ambos até 12, o desempate
   usa a **data de referência do arquivo** (a leitura que cairia depois do
   levantamento perde), para que o reprocessamento seja sempre igual. Quando dia e mês são ambos até 12, a regra é:
   ano com dois dígitos assume formato americano; se uma leitura cair no futuro
   e a outra não, vence a que não é futura; no empate, vence a brasileira.
5. **Sim/Não:** `classifyYesNoField` padroniza para `Sim`, `Não`,
   `Não possui plano`, `Não respondeu`, `Não foi enviado ofício` ou `Em revisão`.
   Outros textos passam como estão.
6. **Resposta:** `classifyResponseField` converte `Sim` em `Respondeu`, `Não` em
   `Não respondeu`, `Não foi enviado ofício` mantém. Qualquer outro valor vira
   `null`.
7. **Elaboração:** `classifyElaborationField` aceita `Sim`, `Em revisão`, `Não`,
   `Não respondeu`, `Não foi enviado ofício`.
8. **Textos de preenchimento:** `cleanPlaceholder` anula, em Instrumento Legal,
   Nº da Lei e Data da Lei, os textos que a planilha usa no lugar de vazio
   (`Não possui plano`, `Não respondeu`, `Não foi enviado ofício`,
   `Não aprovado em lei`, `Não`). Sem isso esses textos apareciam nas tabelas.
9. **Código IBGE:** `padIbge` remove não dígitos e completa com zeros à esquerda
   até 7 caracteres.
10. **Região:** sigla convertida pelo dicionário `REGION_LABELS` (N = Norte, NE =
   Nordeste, CO = Centro-Oeste, SE = Sudeste, S = Sul).
11. **Estado:** nome obtido de `STATE_NAMES` a partir da UF.
12. **Ano da estimativa:** `inferEstimateYear` olha os cabeçalhos da linha e
    registra 2026, 2025 ou 2024 conforme a coluna `Estimativa populacional <ano>`
    presente.
13. **Valores inesperados:** `collectUnexpectedValues` compara os campos de
    decisão (respondeu, possui plano, aprovado, elaborando, obrigatoriedade)
    com a lista `EXPECTED_RAW_VALUES`. Ao fim de cada arquivo o pipeline
    imprime um aviso com os valores fora da lista e suas contagens. O
    `check-data.mjs` transforma isso em erro se chegar ao snapshot vigente.

### 5.5 Campos derivados

Calculados por linha, nesta ordem:

**`obrigado`** (booleano)

```text
obrigado = (Obrigados Censo 2022 - atualizado == "Sim")  OU  (Obrigados Censo 2022 == "Sim")
```

Apenas uma das duas colunas existe em cada arquivo. As colunas "Obrigados
Estimativa" e "Obrigados Censo 2022 - antigo" não entram no cálculo.

**`porte_populacional`** (texto)

Usa a primeira fonte disponível, nesta ordem:

1. `Faixa Populacional - Censo 2022`
2. `Faixa populacional - <ano da estimativa>`
3. `Faixa Populacional - Censo 2010`
4. Cálculo a partir de `População - Censo 2022` (ou Censo 2010 se faltar), pelas
   faixas de `classifyPopulationBand`

Faixas válidas: `Até 20 mil`, `De 20 a 60 mil`, `De 60 a 100 mil`,
`De 100 a 250 mil`, `De 250 mil a 500 mil`, `De 500 mil a 1 milhão`,
`Mais de 1 milhão`.

**`status_painel`** (texto, seis categorias)

Função `deriveStatus`, em `scripts/process-data-utils.mjs` (testada em
`test/derive-status.test.mjs`). A primeira condição verdadeira decide:

| Ordem | Condição | Status |
|---|---|---|
| 1 | `aprovado_lei == "Sim"` | `Plano aprovado` |
| 2 | `possui_plano_mobilidade == "Sim"` | `Possui plano` |
| 3 | `elaborando_plano` é `Sim` ou `Em revisão` | `Em elaboração` |
| 4 | `respondeu_ao_levantamento == "Não foi enviado ofício"` | `Sem ofício` |
| 5 | `respondeu_ao_levantamento != "Respondeu"` (inclui `null`) | `Sem resposta` |
| 6 | Nenhuma das anteriores | `Sem plano` |

O conteúdo da resposta tem precedência sobre o canal de coleta: um município que
informou plano aprovado por e-mail, sem ofício, conta como `Plano aprovado`.
Essa ordem vigora desde o commit `fbb78bd` (agosto de 2026). Antes, o canal
decidia primeiro.

**`cobertura_municipio`** (booleano)

```text
cobertura_municipio = status_painel in ("Plano aprovado", "Possui plano")
```

**`obrigatoriedade_label`** (texto): `Obrigatório` ou `Não obrigatório`, a
partir de `obrigado`. Adicionado só nos registros do snapshot vigente.

### 5.6 Agregação (`summarize`)

Aplicada ao Brasil inteiro, a cada região e a cada UF, sempre sobre o snapshot
vigente. Todos os indicadores de status consideram **apenas municípios
obrigados**. Municípios não obrigados só entram em `total_municipios` e em
`municipios_que_responderam`.

| Campo | Cálculo |
|---|---|
| `total_municipios` | Quantidade de linhas do grupo |
| `total_obrigados` | Linhas com `obrigado == true` |
| `municipios_com_plano` | Obrigados com status `Plano aprovado` ou `Possui plano` |
| `municipios_com_plano_aprovado` | Obrigados com status `Plano aprovado` |
| `municipios_em_elaboracao` | Obrigados com status `Em elaboração` |
| `municipios_sem_plano` | Obrigados com status `Sem plano` |
| `municipios_sem_resposta` | Obrigados com status `Sem resposta` |
| `municipios_sem_oficio` | Obrigados com status `Sem ofício` |
| `municipios_que_responderam` | Todas as linhas com `respondeu_ao_levantamento == "Respondeu"` |
| `municipios_obrigados_que_responderam` | Obrigados com `respondeu_ao_levantamento == "Respondeu"` |
| `percentual_cobertura` | `municipios_com_plano / total_obrigados` |
| `percentual_aprovado` | `municipios_com_plano_aprovado / total_obrigados` |
| `percentual_resposta` | `municipios_obrigados_que_responderam / total_obrigados` |

Invariante verificada por `check-data.mjs`: a soma de `municipios_com_plano`,
`municipios_em_elaboracao`, `municipios_sem_plano`, `municipios_sem_resposta` e
`municipios_sem_oficio` é igual a `total_obrigados`.

O denominador dos percentuais é sempre `total_obrigados`. Nunca é o total de
municípios nem o total de respondentes.

### 5.7 Cálculos específicos da home

**Barra "Obrigados e planos aprovados"** (`approvalByPopulation`)

Divide os obrigados em dois grupos pelo limiar `POP_THRESHOLD` (250.000
habitantes, em `src/lib/constants.js`). A população usada é
`populacao_censo_2022`; se faltar, `estimativa_populacional`; se as duas
faltarem, zero (o município cai no grupo "até 250 mil"). Em cada grupo conta
`aprovado_lei == "Sim"` (não usa `status_painel`, mas o resultado é o mesmo
porque a regra 1 de status é exatamente essa condição).

Saída em `metadata.approval_by_population`:

```json
{
  "acima_250k": {"total": 116, "aprovados": 92, "sem_plano": 24, "pct": 0.793},
  "abaixo_250k": {"total": 1794, "aprovados": 310, "sem_plano": 1484, "pct": 0.173},
  "total": {"total": 1910, "aprovados": 402, "sem_plano": 1508, "pct": 0.210}
}
```

**Gráfico "Evolução acumulada dos planos aprovados"** (`buildCumulativeApprovalSeries`)

Considera apenas registros do snapshot vigente que tenham, ao mesmo tempo,
`ano_elaboracao` preenchido, `aprovado_lei == "Sim"` e `obrigado == true`.
Agrupa por `ano_elaboracao` e pelo mesmo limiar de 250 mil, acumula ano a ano e
grava em `evolucao-aprovados.json` no formato empilhado que o gráfico consome:

```json
{"ano": 2015, "grupo": "Até 250 mil hab.", "y1": 0, "y2": 120, "total": 180},
{"ano": 2015, "grupo": "Acima de 250 mil hab.", "y1": 120, "y2": 180, "total": 180}
```

O eixo do tempo é o **ano de elaboração**, não a data da lei nem a data do
levantamento. Um município aprovado sem `ano_elaboracao` some do gráfico sem
aviso.

**Delta mensal** (`monthly_delta` em `metadata.json`)

Diferença entre o resumo do snapshot vigente e o do anterior para quatro
indicadores. É calculado e gravado, mas a exibição nos cartões da home está
**desativada** (código comentado em `home-dashboard.js`).

### 5.8 Escrita

Ordem de gravação em `src/data/processed/`: `metadata.json`, `snapshots.json`,
`historico-municipios.json`, `latest-regioes.json`, `latest-ufs.json`,
`latest-municipios.csv`, `evolucao-aprovados.json`, os 27 `municipios-uf-*.json`
e por fim `obrigados.json`.

No CSV, as colunas `populacao_censo_2010`, `populacao_censo_2022` e
`estimativa_populacional` são gravadas no formato pt-BR (`11.451.999`). O parser
do site (`parseMunicipiosCsv`) desfaz isso ao ler. Se você adicionar outra
coluna numérica ao CSV, precisa incluir nos dois lados (`CSV_PT_BR_NUMBER_COLUMNS`
no script e `parseBRNumber` no parser).

---

## 6. Dicionário de dados dos artefatos

### 6.1 Registro municipal

Estrutura de cada linha em `latest-municipios.csv`, `municipios-uf-*.json` e
`historico-municipios.json` (41 campos, nesta ordem).

| Campo | Tipo | Origem | Onde é usado no site |
|---|---|---|---|
| `file_name` | texto | nome do arquivo XLSX | não usado |
| `reference_date` | `AAAA-MM-DD` | nome do arquivo | não usado |
| `reference_label` | texto | nome do arquivo | não usado |
| `codigo_ibge` | texto, 7 dígitos | Código IBGE | mapa (cruzamento com GeoJSON), tabelas, busca |
| `municipio_id` | texto | `codigo_ibge`, ou `UF-slug` se faltar | não usado |
| `regiao` | texto | Região (sigla convertida) | filtros, tabelas |
| `uf` | texto | UF | filtros, tabelas, particionamento |
| `estado_nome` | texto | derivado de `uf` | não usado (o site usa o de `latest-ufs.json`) |
| `municipio` | texto | Município | tabelas, busca, tooltip do mapa |
| `populacao_censo_2010` | número | População - Censo 2010 | não usado |
| `populacao_censo_2022` | número | População - Censo 2022 | coluna "Pop. 2022" |
| `estimativa_populacional` | número | Estimativa populacional <ano> | reserva da coluna "Pop. 2022" |
| `estimativa_ano` | número | inferido do cabeçalho | não usado |
| `faixa_populacional_2010` | texto | Faixa Populacional - Censo 2010 | não usado |
| `faixa_populacional_2022` | texto | Faixa Populacional - Censo 2022 | não usado (já consolidado em `porte_populacional`) |
| `faixa_populacional_estimativa` | texto | Faixa populacional - <ano> | não usado |
| `respondeu_ao_levantamento` | `Respondeu` / `Não respondeu` / `Não foi enviado ofício` / null | Respondeu ao levantamento | não usado (já consolidado em status) |
| `possui_plano_mobilidade` | texto padronizado | Possui Plano de Mobilidade Urbana | coluna "Plano" |
| `aprovado_lei` | texto padronizado | Aprovado em lei ou ato normativo | coluna "Aprovado" |
| `elaborando_plano` | texto padronizado | Elaborando plano | não usado |
| `instrumento_legal` | texto | Instrumento Legal | coluna "Instrumento Legal" |
| `numero_da_lei` | texto | Nº da Lei | coluna "Nº da Lei" |
| `data_da_lei` | `AAAA-MM-DD` | Data da Lei | coluna "Data da Lei" (exibida como dd/mm/aaaa) |
| `ano_elaboracao` | número | Ano de elaboração | só no pipeline (gráfico) |
| `oficio` | texto padronizado | Ofício | não usado |
| `data_resposta` | `AAAA-MM-DD` | Data da resposta | não usado |
| `fonte_resposta` | texto | Fonte da Resposta | não usado |
| `instrumento_resposta` | texto | Repondido por qual instrumento | não usado |
| `obrigados_estimativa` | texto padronizado | Obrigados Estimativa <ano> | não usado |
| `obrigados_censo_2022_antigo` | texto padronizado | Obrigados Censo 2022 - antigo | não usado |
| `obrigados_censo_2022_atualizado` | texto padronizado | Obrigados Censo 2022 - atualizado, ou Obrigados Censo 2022 (consolidado) | não usado |
| `recorte_metropolitano` | texto | RIDE RM AU - IBGE 2024 (ou 2021) | não usado |
| `enmu` | texto | ENMU (coluna única, out/2025 a fev/2026) | não usado |
| `enmu_rm` | texto padronizado | RMs ENMU (a partir de mar/2026) | não usado |
| `enmu_area_estudo` | texto | Área de Estudo ENMU (a partir de mar/2026) | não usado |
| `mapa_turismo_2022` | texto | Mapa do Turismo Brasileiro 2022 | não usado |
| `mapa_turismo_2024` | texto | Mapa do Turismo Brasileiro 2024 | não usado |
| `tipologia_pndu` | texto | Tipologia PNDU | não usado |
| `obrigado` | booleano | derivado (5.5) | filtro "Obrigatoriedade", cor do mapa, coluna |
| `porte_populacional` | texto | derivado (5.5) | filtro "Porte populacional" |
| `status_painel` | texto | derivado (5.5) | filtro "Status", coluna, cor do mapa, tooltip |
| `cobertura_municipio` | booleano | derivado (5.5) | não usado |
| `obrigatoriedade_label` | texto | derivado | não usado (o explorador recalcula a partir de `obrigado`) |

Os campos marcados como "não usado" continuam disponíveis no CSV público
(`latest-municipios.csv`) para quem baixar a base completa. O botão "Exportar
CSV" das tabelas, porém, gera um arquivo reduzido de 12 colunas (ver 8.4).

### 6.2 Agregados (`latest-ufs.json`, `latest-regioes.json`, `metadata.latest_summary`)

Os campos são os listados na seção 5.6. `latest-ufs.json` acrescenta `uf`,
`regiao` e `estado_nome`; `latest-regioes.json` acrescenta `regiao`. As UFs
vêm em ordem alfabética de sigla; as regiões, na ordem Norte, Nordeste,
Centro-Oeste, Sudeste, Sul.

### 6.3 `metadata.json`

| Campo | Conteúdo |
|---|---|
| `title` | Título fixo |
| `source_directory` | Pasta de entrada (exibido na Metodologia) |
| `last_reference_date`, `last_reference_label` | Data do snapshot vigente (exibida na home como "Atualização") |
| `total_snapshots` | Quantidade de arquivos processados |
| `total_historical_rows` | Soma das linhas de todos os arquivos |
| `latest_summary` | Agregado Brasil do snapshot vigente |
| `previous_summary` | Agregado Brasil do snapshot anterior (ou null) |
| `monthly_delta` | Diferenças entre os dois (não exibido) |
| `available_regions`, `available_ufs` | Listas auxiliares |
| `status_categories` | As seis categorias válidas (usado por `check-data.mjs`) |
| `legal_deadlines` | Prazos legais fixos de `constants.js` (não exibidos hoje) |
| `approval_by_population` | Barra por porte (5.7) |

### 6.4 `snapshots.json`

Lista com `file_name`, `reference_date`, `reference_label` e
`municipality_count` por arquivo, em ordem cronológica. Exibida na página de
Metodologia.

### 6.5 `obrigados.json`

Um objeto por município obrigado: `codigo_ibge`, `regiao`, `uf`, `municipio`,
`rm_ride_au`, `populacao_censo_2022`, `criterio_obrigatoriedade`. Gravado sem
indentação (arquivo compacto).

---

## 7. Constantes que afetam os cálculos

Arquivo `src/lib/constants.js`. Compartilhado entre pipeline e site.

| Constante | Valor | Onde impacta |
|---|---|---|
| `STATUS_CATEGORIES` | As seis categorias de status | Validação em `check-data.mjs`; ordem nos filtros |
| `STATUS_COLORS` | Cor por categoria | Selos de status nas tabelas (via `theme.js`) |
| `POP_THRESHOLD` | 250.000 | Barra por porte e gráfico de evolução |
| `LEGAL_DEADLINES` | 12/04/2024 (mais de 250 mil) e 12/04/2025 (até 250 mil) | Gravado em `metadata.json`; texto da Metodologia é fixo e separado |
| `UF_CODES` | 27 siglas | Geração das páginas por estado |
| `GEO_STATE_CODES` | 27 códigos IBGE de UF | Carregamento de GeoJSON |

Em `scripts/process-data-utils.mjs`: `MONTHS` (abreviações do nome do arquivo),
`REGION_ORDER`, `REGION_LABELS`, `STATE_NAMES`, `COLUMN_ALIASES`.

Em `src/components/brazil-map-ui.js`: `IBGE_TO_UF` (código IBGE de dois dígitos
para sigla).

---

## 8. O que cada página mostra

### 8.1 Home (`/`, arquivo `src/index.md` + `src/components/home-dashboard.js`)

Carrega `metadata.json`, `latest-regioes.json`, `latest-ufs.json`,
`evolucao-aprovados.json`, `geo/estados.json` e, sob demanda, os 27
`municipios-uf-*.json` e os 27 `geo/municipios-*.json`.

| Elemento | Dado | Campo ou cálculo |
|---|---|---|
| "Atualização: <data>" | `metadata` | `last_reference_date` formatada |
| Cartão "Municípios" | `latest_summary` | `total_municipios` |
| Cartão "Obrigados (Censo 2022)" | `latest_summary` | `total_obrigados` |
| Cartão "Plano aprovado" | `latest_summary` | `municipios_com_plano_aprovado` |
| Cartão "Percentual aprovado" | `latest_summary` | `percentual_aprovado` |
| Barra "Obrigados e planos aprovados" | `approval_by_population` | Duas barras (acima e até 250 mil) com `aprovados` e `sem_plano`; rodapé com `total` e `pct` |
| "Cobertura por região" | `latest-regioes.json` | Ordena por `percentual_aprovado` decrescente; barra proporcional ao maior valor; mostra `municipios_com_plano_aprovado` e `total_obrigados` |
| Mapa por UF | `latest-ufs.json` + `geo/estados.json` | Cor da UF em escala linear de `municipios_com_plano_aprovado` (0 até o máximo entre as UFs). Tooltip: obrigados, aprovados, sem plano aprovado (`total_obrigados - municipios_com_plano_aprovado`), percentual. Cada UF é focável por teclado (Tab), tem nome acessível com o resumo e abre com Enter ou Espaço |
| Mapa municipal (ao clicar em uma UF) | `municipios-uf-<uf>.json` + `geo/municipios-<código>.json` | Cruzamento por `codigo_ibge`. Verde = `status_painel == "Plano aprovado"`; vermelho = `obrigado` com outro status; cinza = não obrigado ou sem dado. Tooltip: nome, obrigatoriedade, status |
| Gráfico "Evolução acumulada" | `evolucao-aprovados.json` | Áreas empilhadas por ano; azul = acima de 250 mil, verde = até 250 mil. Tooltip mostra os dois grupos e o total acumulado |
| Notas de rodapé | fixas no `.md` | Texto institucional |

Atenção: a escala de cor do mapa de UFs usa o **número absoluto** de aprovados,
não o percentual. São Paulo e Minas Gerais ficam mais escuros por terem mais
municípios, independentemente da taxa.

Atenção: o mapa municipal pinta `Possui plano` de vermelho (o critério é só
`Plano aprovado`), enquanto os cartões de "Possui plano" nas outras páginas
incluem esses municípios como cobertos. É uma decisão de projeto documentada em
`regras-de-status.md`.

### 8.2 Regiões (`/regioes`)

Carrega `latest-regioes.json` e `latest-ufs.json`.

| Elemento | Campo |
|---|---|
| Cinco cartões (um por região) | `percentual_aprovado` e `municipios_com_plano_aprovado` |
| Seletor de região + quatro cartões | `total_obrigados`, `municipios_com_plano`, `municipios_com_plano_aprovado`, `percentual_aprovado` da região |
| Tabela de estados da região | `estado_nome` (link para `/estado/<uf>`), `uf`, `total_obrigados`, `municipios_com_plano_aprovado`, `percentual_aprovado`; ordenada por percentual decrescente |

### 8.3 Estados (`/estados`)

Carrega `latest-ufs.json`, `latest-municipios.csv` (sob demanda, filtrado por UF
no navegador) e as bandeiras.

| Elemento | Campo |
|---|---|
| Cinco cartões "melhor estado por região" | UF com maior `percentual_aprovado` em cada região |
| Ranking das 27 UFs | `percentual_aprovado` decrescente; barra proporcional ao maior valor; `municipios_com_plano_aprovado` e `total_obrigados` |
| Seletor de UF + cinco cartões | `total_municipios`, `total_obrigados`, `municipios_com_plano`, `municipios_com_plano_aprovado`, `percentual_aprovado` |
| Tabela municipal da UF | Explorador municipal (8.4) |

### 8.4 Municípios (`/municipios`) e explorador municipal

Carrega `latest-municipios.csv` completo. O componente
`createMunicipioExplorer` (em `src/components/municipio-explorer.js`) é o mesmo
usado em Estados e nas páginas por UF.

Filtros e o campo que cada um lê:

| Filtro | Campo | Observação |
|---|---|---|
| Buscar município | `municipio`, `codigo_ibge`, `uf` | Busca por substring, sem acentos tratados |
| Região | `regiao` | Oculto nas páginas de estado |
| UF | `uf` | Oculto nas páginas de estado |
| Obrigatoriedade | `obrigado` | `Obrigatório` / `Não obrigatório` |
| Status | `status_painel` | Opções vêm dos valores presentes nos dados |
| Porte populacional | `porte_populacional` | Múltipla escolha; só mostra faixas presentes |

Colunas da tabela e do botão "Exportar CSV" (mesmas 12 colunas):

Município, Código IBGE, UF, Região, Status, Obrigatoriedade, Pop. 2022, Plano,
Aprovado, Instrumento Legal, Nº da Lei, Data da Lei.

"Pop. 2022" usa `populacao_censo_2022` e cai para `estimativa_populacional` se
faltar. "Plano" e "Aprovado" mostram `possui_plano_mobilidade` e `aprovado_lei`
com selo verde para `Sim`, vermelho para `Não`, neutro para os demais.

Paginação de 200 linhas. Ordenação alfabética por nome do município. O CSV
exportado respeita os filtros aplicados e é separado por vírgula com BOM UTF-8.

### 8.5 Página por estado (`/estado/<uf>`)

Gerada por `scripts/generate-state-pages.mjs` a partir de um template embutido
no próprio script. Carrega `latest-ufs.json` e `municipios-uf-<uf>.json`.
Mostra seis cartões (`total_municipios`, `total_obrigados`,
`municipios_com_plano`, `municipios_com_plano_aprovado`,
`municipios_sem_resposta`, `percentual_aprovado`) e o explorador municipal.

Para alterar o conteúdo dessas páginas, edite o template no script e rode
`npm run data` (ou só `node scripts/generate-state-pages.mjs`).

### 8.6 Municípios obrigados (`/obrigados`)

Carrega `obrigados.json`. Tabela com todas as colunas do arquivo, ordenada por
nome. Botão "Exportar base completa" gera CSV separado por ponto e vírgula com
todos os campos.

### 8.7 Metodologia (`/metodologia`)

Carrega `metadata.json` e `snapshots.json`. Mostra pasta de origem, data da
última referência, total de snapshots, total de linhas históricas, o texto fixo
das regras e a tabela de arquivos processados. Não está no menu principal; é
acessível pela URL direta.

---

## 9. Frontend

### 9.1 Como o Observable Framework funciona neste projeto

- Cada `.md` em `src/` vira uma página HTML.
- Blocos ```js são executados no navegador. `FileAttachment("caminho")` carrega
  um arquivo estático; o caminho **precisa ser literal** (o framework faz
  análise estática para saber o que copiar para `dist/`). Por isso a home lista
  os 54 anexos um a um.
- `display(...)` insere um elemento DOM na página. `${...}` dentro do Markdown
  interpola valores.
- `observablehq.config.js` define menu, cabeçalho, rodapé e a inclusão de
  `theme.css` e `fonts.css`.
- Não há rotas dinâmicas. Cada página por estado é um arquivo separado.

### 9.2 Componentes (`src/components/`)

| Arquivo | Responsabilidade |
|---|---|
| `home-dashboard.js` | Monta a home: cartões, barra por porte, ranking regional, mapa, gráfico. Contém as animações de entrada (IntersectionObserver) |
| `brazil-map.js` | Mapa SVG com D3: projeção, zoom programático, clique na UF, carregamento dos municípios |
| `brazil-map-ui.js` | Apoio ao mapa: tooltip, legenda, cor do município, tabela IBGE para UF, camada municipal |
| `approval-evolution-chart.js` | Gráfico de áreas empilhadas com Observable Plot, tooltip por ano, redesenho por largura |
| `municipio-explorer.js` | Tabela municipal com filtros, busca, paginação e exportação |
| `state-explorer.js` | Seletor de UF com cartões, bandeira e explorador municipal |
| `region-explorer.js` | Seletor de região com cartões e tabela de estados |
| `cards.js` | `metricGrid` e `metricCard` (cartões de métrica, com suporte a delta e ícone) |
| `dom-utils.js` | Helpers de DOM (`labelWrap`, `sectionHeading`) |

### 9.3 Bibliotecas internas (`src/lib/`)

| Arquivo | Conteúdo |
|---|---|
| `constants.js` | Categorias, cores, limiar populacional, prazos, listas de UF |
| `formatters.js` | `formatNumber`, `formatPercent` (uma casa decimal), `formatDate`, `formatDelta`, `csvEscape`, `csvBlob`, `slug`. Importado também pelo pipeline |
| `municipios-data.js` | `parseMunicipiosCsv`: converte o CSV público em objetos com tipos corretos |
| `data-loaders.js` | Fábricas de carregadores com cache (JSON por UF, GeoJSON por UF, CSV filtrado por UF) |
| `navigation.js` | Marca o item ativo do menu; páginas `/estado/*` acendem "Estados" |
| `theme.js` | Paleta de cores (`PALETTE`) usada por mapa e gráfico |

### 9.4 CSS

Todo o estilo está em `src/theme.css` (cerca de 2.100 linhas). Tokens em
`:root` (cores, fontes, espaçamentos). Breakpoints em 1100px e 720px. O bloco
`#observablehq-header` sobrescreve o cabeçalho padrão do framework com
`!important`; ao atualizar a versão do Observable Framework, confira esse trecho.

**Fontes.** IBM Plex Sans e IBM Plex Serif ficam em `src/fonts.css`, embutidas
em base64 (subconjunto latin, 276 KB), sem chamada ao Google Fonts. O arquivo é
gerado por `node scripts/build-fonts.mjs` e não deve ser editado à mão. O
framework não copia arquivos citados em `url()` de CSS, por isso as fontes vão
embutidas em vez de arquivos `.woff2` separados. Para trocar família ou pesos,
edite `FAMILIES` no script e rode-o de novo.

---

## 10. Procedimentos de manutenção

### 10.1 Adicionar um novo levantamento

1. Renomeie o arquivo recebido para o padrão
   `Levantamento_PlanosdeMobilidadeUrbana_<dia><mês><ano>.xlsx` e confirme que a
   aba se chama `Levantamento`.
2. Copie para `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/`.
3. **Compare os cabeçalhos com o arquivo anterior.** Um script simples está em
   `compare_columns.mjs` na raiz (edite os dois nomes de arquivo no início dele e
   rode `node compare_columns.mjs`). Qualquer cabeçalho novo ou renomeado precisa
   de tratamento antes de seguir (seção 10.2).
4. Rode `npm run data`. Leia a saída de `check-data.mjs`.
5. Abra `src/data/processed/metadata.json` e confira `latest_summary`:
   `total_obrigados` deve ficar próximo de 1.910 e
   `municipios_com_plano_aprovado` próximo do valor anterior. **Um zero ou uma
   queda brusca indica coluna não mapeada**, mesmo que `check-data` tenha
   passado (ver 12.1).
6. Rode `npm run dev` e confira a home, uma página de estado e a tabela de
   municípios.
7. Faça commit do XLSX novo e dos dois artefatos versionados
   (`evolucao-aprovados.json` e, se mudou, `obrigados.json`). Os commits
   anteriores seguem o padrão "Atualiza dados de aprovados e adiciona
   levantamento de <data>".
8. Push para `main`. Acompanhe o workflow em GitHub Actions.

### 10.2 Quando uma coluna muda de nome

Sintoma típico: `npm run data` falha com "campos obrigatórios sem coluna
correspondente" (colunas essenciais), ou coluna vazia no CSV após um novo
levantamento (colunas secundárias, que só geram aviso).

1. Descubra o novo cabeçalho (passo 3 de 10.1) e calcule sua forma normalizada:
   minúsculas, sem acentos, não alfanuméricos viram `_`. Exemplo:
   `Estimativa populacional 2027` vira `estimativa_populacional_2027`.
2. Adicione a entrada em `COLUMN_ALIASES` (`scripts/process-data-utils.mjs`)
   apontando para o campo interno já existente:
   ```js
   estimativa_populacional_2027: "estimativa_populacional",
   ```
3. Se o campo for de ano de estimativa, atualize também `inferEstimateYear`.
4. Se for um campo **novo** (sem campo interno correspondente), o alias não
   basta: inclua o campo no objeto `row` em `normalizeRow`
   (`process-historical-data.mjs`), senão ele não sai no CSV nem no JSON.
5. Se o campo participar de alguma regra (obrigatoriedade, status), ajuste a
   função correspondente (`classifyObligation`, `deriveStatus`).
6. Rode `npm test` e `npm run data`. Confira `metadata.json`.

Caso real: em 03/set/2026 a coluna `Obrigados Censo 2022 - atualizado` virou
`Obrigados Censo 2022`. O campo `obrigado` ficou falso para todos os municípios
e o painel foi publicado zerado. A correção foi o commit `3d0f003`.

### 10.3 Atualizar a relação de municípios obrigados

1. Substitua o arquivo em `Arquivo_obrigatoriedade/` (mantenha um único `.xlsx`
   na pasta).
2. Confirme que a linha de cabeçalho contém "Código do Município" e que a ordem
   das sete colunas é a descrita em 3.2.
3. Rode `npm run data` e confira a contagem impressa no console (linha
   que começa com "obrigados.json" seguida do número de municípios).
4. Faça commit de `obrigados.json`.

Lembre que essa planilha alimenta só a página `/obrigados`. A obrigatoriedade
usada nos indicadores vem da planilha de levantamento.

### 10.4 Alterar uma regra de negócio

| Mudança | Onde | Depois |
|---|---|---|
| Ordem ou critério do `status_painel` | `deriveStatus` em `process-historical-data.mjs` | Atualizar `regras-de-status.md` e `src/metodologia.md` |
| Nova categoria de status | `STATUS_CATEGORIES` e `STATUS_COLORS` em `constants.js`; `deriveStatus`; CSS dos selos em `theme.css` (`.status-pill[data-status=...]`) | `check-data` rejeita categorias fora da lista |
| Critério de obrigatoriedade | `classifyObligation` em `process-data-utils.mjs` | Revisar texto da Metodologia |
| Limiar populacional | `POP_THRESHOLD` em `constants.js` | Os rótulos "250 mil" estão escritos por extenso em `home-dashboard.js`, `approval-evolution-chart.js`, `buildCumulativeApprovalSeries` e `index.md`; procurar por "250" |
| Prazos legais | `LEGAL_DEADLINES` em `constants.js` e texto fixo em `metodologia.md` | Hoje nenhuma visualização usa a constante |
| Faixas de porte | `classifyPopulationBand` (utils), `PORTE_ORDER` em `check-data.mjs` e `porteOrder` em `municipio-explorer.js` | Três listas que precisam ficar iguais |
| Colunas da tabela e do CSV exportado | `CSV_COLUMNS` e `renderTable` em `municipio-explorer.js` | Teste em `test/municipio-explorer.test.mjs` fixa o cabeçalho esperado |

### 10.5 Adicionar um indicador novo no painel

1. Calcule no pipeline (`summarize`, `buildMetadata` ou função nova) e grave em
   um artefato existente ou novo.
2. Se criar um artefato novo, inclua o nome em `GENERATED_STATIC_FILES` ou no
   padrão de limpeza de `cleanupProcessedArtifacts`, e no `.gitignore` se não
   for versionado.
3. Na página, carregue com `FileAttachment("data/processed/<arquivo>")` (caminho
   literal) e passe ao componente.
4. Se fizer sentido, acrescente uma checagem em `check-data.mjs`.

### 10.6 Adicionar uma página

1. Crie `src/<nome>.md` com front matter `title` e `toc: false`.
2. Para aparecer no menu, adicione em `pages` no `observablehq.config.js` **e**
   no bloco `<nav class="site-nav">` do `header` no mesmo arquivo (o menu é HTML
   fixo, não gerado da lista `pages`).
3. Se a rota tiver subpáginas, ajuste `resolveCurrentNavPath` em
   `src/lib/navigation.js` para o item do menu ficar ativo.

### 10.7 Deploy

O workflow `.github/workflows/deploy.yml` roda a cada push em `main` (ou
manualmente): `npm ci`, `npm run lint`, `npm test`, `npm run build` (que inclui
`npm run data`), e publica `dist/` em GitHub Pages. Como XLSX, GeoJSON e
bandeiras estão no git, o build no CI é autossuficiente.

Para publicar em outro servidor estático, basta copiar `dist/`.

---

## 11. Testes e validação

### 11.1 `npm test`

Trinta e um testes com o runner nativo do Node (`node --test test/*.test.mjs`):

| Arquivo | Cobre |
|---|---|
| `process-data-utils.test.mjs` | `normalizeDate` (ISO, brasileiro, americano, ano curto, mês abreviado, desempate pela data de referência), `cleanPlaceholder`, `mapHeaders`, `findMissingRequiredFields`, `collectUnexpectedValues` |
| `derive-status.test.mjs` | As seis categorias de `deriveStatus` e a precedência do conteúdo sobre o canal |
| `column-aliases.test.mjs` | Lê o cabeçalho de **todos os XLSX do repositório** e confirma que os campos essenciais têm alias. É a defesa contra coluna renomeada; roda no CI |
| `process-historical-data.integration.test.mjs` | Roda o pipeline inteiro em pasta temporária: ignora arquivo fora do padrão, soma das categorias bate com obrigados, gera CSV e partição por UF, falha sem coluna essencial, anula textos de preenchimento, avisa valores inesperados e consolida a coluna de obrigatoriedade |
| `municipios-data.test.mjs` | `parseMunicipiosCsv` (booleanos, código IBGE com zeros, nulos) |
| `municipio-explorer.test.mjs` | Cabeçalho e formato do CSV exportado |
| `navigation.test.mjs` | Item ativo do menu |

Ao mexer na regra de status, atualize `derive-status.test.mjs` junto.

### 11.2 `npm run check-data`

Verifica: presença dos artefatos, contagem de snapshots, colunas obrigatórias,
número de municípios entre 5.400 e 5.700, categorias de status válidas, faixas
de porte válidas, valores dos quatro campos de decisão dentro do previsto, 27
UFs presentes, soma das categorias igual a `total_obrigados` por UF, pisos absolutos do resumo nacional (mínimo de 1.500
obrigados e 200 aprovados), queda máxima em relação ao snapshot anterior (5%
em obrigados, 10% em aprovados) e 27 arquivos por UF. Retorna código 1 em erro,
o que interrompe `npm run build`. Os limites estão em `THRESHOLDS` no início do
script.

### 11.3 `npm run lint`

ESLint sobre `scripts/`, `src/components/` e `src/lib/`. Executado no CI.

---

## 12. Problemas conhecidos e armadilhas

### 12.1 Coluna não mapeada (defesas em três camadas)

Qualquer cabeçalho sem alias é descartado. Desde setembro de 2026 existem três
defesas: o pipeline falha se faltar campo essencial (5.3), `check-data.mjs`
falha se os totais ficarem abaixo do piso ou caírem além do tolerado (11.2) e o
teste `column-aliases.test.mjs` confere os cabeçalhos de todos os XLSX no CI.
Colunas secundárias (por exemplo `ENMU`) continuam gerando apenas aviso no
console; siga o passo 5 de 10.1 para essas.

### 12.2 Campos de ENMU mudaram de forma ao longo do histórico

`enmu` só existe nos snapshots de out/2025 a fev/2026 (coluna única). A partir
de mar/2026 a informação vem em `enmu_rm` e `enmu_area_estudo`. Quem usar o
histórico precisa tratar os dois formatos.

### 12.3 Coluna de obrigatoriedade consolidada

A partir de 03/set/2026 a planilha chama a coluna de `Obrigados Censo 2022`
(antes `Obrigados Censo 2022 - atualizado`). O campo exportado
`obrigados_censo_2022_atualizado` recebe o valor de qualquer uma das duas, então
o CSV público mantém o mesmo nome de coluna em todo o histórico.

### 12.4 Metodologia pública precisa acompanhar `deriveStatus`

A seção "Classificação `status_painel`" de `src/metodologia.md` foi alinhada à
ordem atual em set/2026. Toda mudança em `deriveStatus` exige atualizar essa
página, `regras-de-status.md` e `derive-status.test.mjs`.

### 12.5 As planilhas fazem parte do repositório

Se a política institucional exigir removê-las do git, o workflow de deploy
deixa de funcionar sem outra fonte para os arquivos (por exemplo, um bucket
privado baixado no início do build).

### 12.6 Valores fora do esperado geram aviso, não correção

Um erro de digitação como `Ssim` em "Aprovado em lei" aparece no console do
pipeline (aviso por arquivo) e derruba o `check-data` se estiver no snapshot
vigente. A correção é sempre na planilha, nunca no código: o município continua
classificado pela regra normal até o dado ser corrigido.

### 12.7 Datas ambíguas usam a data de referência do arquivo

O desempate entre dd/mm e mm/dd compara com a data do levantamento (nome do
arquivo), não com a data de execução. O reprocessamento é determinístico.

### 12.8 Listas duplicadas que precisam ficar sincronizadas

- Faixas de porte: `classifyPopulationBand`, `PORTE_ORDER` (check-data) e
  `porteOrder` (explorador).
- Rótulo "250 mil": constante `POP_THRESHOLD` e textos fixos em quatro arquivos.
- Menu: `pages` e `header` no `observablehq.config.js`.
- Lista de UFs: `UF_CODES`, `EXPECTED_UFS` (check-data), `IBGE_TO_UF`,
  `STATE_NAMES`, além dos anexos literais em `index.md` e `estados.md`.

### 12.9 `historico-municipios.json` tem 164 MB

É regenerado a cada `npm run data` e não vai para produção. Não faz parte de
nenhuma página. Pode ser usado para análises históricas por município (o site
não oferece essa visão hoje; os agregados históricos por região e UF foram
retirados em versões anteriores, e os nomes `brasil-series`, `regioes-series` e
`ufs-series` ainda aparecem no `.gitignore` e no padrão de limpeza por
compatibilidade).

### 12.10 Delta mensal calculado mas oculto

`monthly_delta` e `previous_summary` existem em `metadata.json`. Os cartões da
home têm o código de exibição comentado. Para reativar, descomente as linhas em
`createSummaryCards` e `createHomeDashboard` em `home-dashboard.js`; o componente
`metricCard` já suporta `delta` e `deltaText`.

### 12.11 `compare_columns.mjs` não está no git

O script de comparação de cabeçalhos usado no incidente de setembro de 2026
está na raiz, não versionado, com caminho absoluto fixo e nomes de arquivo
escritos no código. Vale versionar e parametrizar antes de depender dele.

### 12.12 Dependência `xlsx` vem do CDN do SheetJS, não do npm

O pacote `xlsx` do registro npm parou na versão 0.18.5 e tem vulnerabilidades
sem correção. O `package.json` aponta para o tarball oficial
(`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`). Para atualizar, troque
a versão na URL e rode `npm install`. A distribuição em módulo ES não carrega o
`fs` sozinha: todo arquivo que usa `xlsx.readFile` ou `xlsx.writeFile` precisa
chamar `xlsx.set_fs(fs)` antes (já feito no pipeline e nos testes).

### 12.13 Bandeiras não fazem parte de `npm run data`

`download-flags.mjs` é manual. Se um PNG for apagado, a página Estados mostra
imagem quebrada até rodar `node scripts/download-flags.mjs`.

---

## 13. Referência rápida de comandos

```bash
npm install                 # dependências
npm run data                # pipeline completo + validação
npm run check-data          # só validação
npm run dev                 # preview local (roda data antes)
npm run build               # gera dist/ (roda data antes)
npm test                    # testes
npm run lint                # ESLint
npm run clean               # remove dist/ e cache do Observable
node scripts/download-flags.mjs   # bandeiras (manual)
node scripts/build-fonts.mjs      # regenera src/fonts.css (manual)
node compare_columns.mjs          # comparar cabeçalhos de dois XLSX (editar nomes no script)
```
