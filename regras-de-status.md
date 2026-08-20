# Regras de status derivadas no código

Este documento reúne as regras que definem o status de cada município e que **não
estão explícitas na planilha de levantamento**. São decisões tomadas pelo pipeline
de processamento (`scripts/`) e pelo front-end (`src/`).

Todos os números citados referem-se ao levantamento de 18 de agosto de 2026
(5.571 municípios), após a correção de precedência aplicada em `deriveStatus`.

Este arquivo é material de revisão. Cada regra abaixo é uma escolha de projeto que
pode ser confirmada ou alterada.

---

## 1. Regra principal: `status_painel`

A planilha não possui coluna de status. O campo `status_painel` é calculado em
`scripts/process-historical-data.mjs:249` a partir de quatro colunas de origem.

Ordem de avaliação (a primeira condição verdadeira decide):

| Ordem | Condição | Status atribuído |
|---|---|---|
| 1 | `Aprovado em lei ou ato normativo = Sim` | `Plano aprovado` |
| 2 | `Possui plano de mobilidade urbana = Sim` | `Possui plano` |
| 3 | `Elaborando plano = Sim` ou `Em revisão` | `Em elaboração` |
| 4 | `Respondeu ao levantamento = Não foi enviado ofício` | `Sem ofício` |
| 5 | `Respondeu ao levantamento` diferente de `Sim` | `Sem resposta` |
| 6 | Demais casos | `Sem plano` |

**Decisão embutida:** o conteúdo da resposta tem precedência sobre o canal de coleta.
Um município que informou plano aprovado por e-mail, sem ofício enviado, é
classificado como `Plano aprovado` e não como `Sem ofício`.

Até 20 de agosto de 2026 a ordem era inversa (o canal decidia primeiro). Isso
excluía Pauini/AM e Tabatinga/SP da contagem de planos aprovados, embora ambos
tenham decreto municipal registrado na planilha.

**Ponto para revisão:** `Sem ofício` e `Sem resposta` medem cobertura do
levantamento, não situação do plano. As outras quatro categorias medem situação do
plano. São dois eixos diferentes convivendo em um único campo.

Distribuição atual:

| Status | Municípios |
|---|---|
| Sem ofício | 2.091 |
| Sem plano | 1.422 |
| Sem resposta | 1.137 |
| Em elaboração | 428 |
| Plano aprovado | 415 |
| Possui plano | 78 |

---

## 2. Normalização dos campos de origem

Antes de aplicar a regra de status, os valores textuais da planilha são
padronizados. As funções estão em `scripts/process-data-utils.mjs`.

### 2.1. `classifyYesNoField` (linha 180)

Usada em `possui_plano_mobilidade`, `aprovado_lei` e nos campos de obrigatoriedade.
A comparação ignora acentos, maiúsculas e pontuação.

| Valor na planilha | Valor normalizado |
|---|---|
| `Sim`, `S` | `Sim` |
| `Não` | `Não` |
| `Não possui plano` | `Não possui plano` |
| `Não respondeu` | `Não respondeu` |
| `Não foi enviado ofício` | `Não foi enviado ofício` |
| `Em revisão` | `Em revisão` |
| qualquer outro texto | mantido como está |

**Ponto para revisão:** `Não`, `Não possui plano`, `Não respondeu` e
`Não foi enviado ofício` são preservados como valores distintos, mas a regra de
status trata os quatro como "não é Sim". A distinção existe no dado e não é usada.

**Ponto para revisão:** valores não previstos passam adiante sem alerta. Um erro de
digitação na planilha (por exemplo `Ssim`) não gera aviso e o município cai
silenciosamente em `Sem plano`. Hoje não há nenhum caso assim.

### 2.2. `classifyResponseField` (linha 194)

Usada apenas em `respondeu_ao_levantamento`.

| Valor na planilha | Valor normalizado |
|---|---|
| `Sim` | `Respondeu` |
| `Não` | `Não respondeu` |
| `Não foi enviado ofício` | `Não foi enviado ofício` |
| qualquer outro texto | `null` |

**Ponto para revisão:** ao contrário de `classifyYesNoField`, aqui o valor
desconhecido vira `null`, e `null` cai em `Sem resposta` pela regra 5. Um valor
inesperado é lido como ausência de resposta. Hoje não há nenhum caso assim.

### 2.3. `classifyElaborationField` (linha 202)

Usada em `elaborando_plano`. Aceita `Sim`, `Em revisão`, `Não`, `Não respondeu` e
`Não foi enviado ofício`. Valores fora dessa lista são mantidos como estão.

**Decisão embutida:** `Em revisão` conta como `Em elaboração`. Um plano em revisão
é tratado como plano ainda não concluído, mesmo que já exista versão vigente. São
6 municípios nessa situação.

---

## 3. Obrigatoriedade (`obrigado`)

Definida em `classifyObligation` (`process-data-utils.mjs:212`):

```
obrigado = (Obrigados Censo 2022 - atualizado == "Sim")
```

**Decisão embutida:** a planilha traz três colunas de obrigatoriedade
(`Obrigados estimativa`, `Obrigados Censo 2022 - antigo`,
`Obrigados Censo 2022 - atualizado`). O painel usa apenas a terceira. As outras duas
são exportadas mas nunca entram em cálculo.

Total atual: 1.910 municípios obrigados.

O rótulo `obrigatoriedade_label`, usado no filtro da tabela municipal, é derivado
direto disso: `Obrigatório` quando `obrigado` é verdadeiro, `Não obrigatório` caso
contrário (`process-historical-data.mjs:98`).

**Ponto para revisão:** o critério legal do art. 24, § 1º da Lei 12.587/2012
(população, recorte metropolitano, interesse turístico) não é recalculado pelo
painel. O painel confia integralmente na coluna da planilha.

---

## 4. Campos derivados do status

### 4.1. `cobertura_municipio`

Definido em `process-historical-data.mjs:243`:

```
cobertura_municipio = status_painel in ("Plano aprovado", "Possui plano")
```

**Decisão embutida:** "ter cobertura" inclui plano sem aprovação legal. Um município
com plano elaborado mas não aprovado em lei conta como coberto.

### 4.2. Cor no mapa do Brasil

Definida em `src/components/brazil-map-ui.js:45`:

| Situação | Cor |
|---|---|
| `status_painel = Plano aprovado` | verde |
| `obrigado = true` (qualquer outro status) | vermelho |
| demais | cinza de borda |

**Ponto para revisão:** o mapa usa um critério mais estrito que
`cobertura_municipio`. `Possui plano` aparece em vermelho no mapa, mas conta como
coberto nos cartões de métrica. Os 78 municípios com `Possui plano` são lidos de
forma diferente conforme a visualização.

---

## 5. Agregados

Calculados em `summarize` (`process-historical-data.mjs:263`).

**Decisão embutida:** todos os indicadores de status são calculados **apenas sobre
municípios obrigados**. Municípios não obrigados entram somente em
`total_municipios` e em `municipios_que_responderam`.

| Indicador | Base de cálculo |
|---|---|
| `municipios_com_plano` | obrigados com status `Plano aprovado` ou `Possui plano` |
| `municipios_com_plano_aprovado` | obrigados com status `Plano aprovado` |
| `municipios_em_elaboracao` | obrigados com status `Em elaboração` |
| `municipios_sem_plano` | obrigados com status `Sem plano` |
| `municipios_sem_resposta` | obrigados com status `Sem resposta` |
| `municipios_sem_oficio` | obrigados com status `Sem ofício` |
| `municipios_que_responderam` | todos os municípios com `Respondeu` |
| `percentual_cobertura` | `municipios_com_plano / total_obrigados` |
| `percentual_aprovado` | `municipios_com_plano_aprovado / total_obrigados` |
| `percentual_resposta` | obrigados que responderam `/ total_obrigados` |

**Ponto para revisão:** o denominador de todos os percentuais é o total de
obrigados, nunca o total de municípios nem o total de respondentes.
`percentual_aprovado` não é a taxa de aprovação entre quem respondeu: municípios
sem ofício entram no denominador como se fossem casos de não aprovação.

Hoje 21 municípios obrigados têm status `Sem ofício` e pesam no denominador.

---

## 6. Regras que não usam `status_painel`

Dois cálculos ignoram o campo de status e leem `aprovado_lei` diretamente.

### 6.1. `approvalByPopulation` (linha 331)

Divide os obrigados em dois grupos pelo limiar de 250 mil habitantes e conta
`aprovado_lei = "Sim"`.

**Decisão embutida:** a população usada é `populacao_censo_2022`, com queda para
`estimativa_populacional` quando ausente, e `0` quando as duas faltam. Um município
sem dado populacional cai no grupo "abaixo de 250 mil".

**Decisão embutida:** o limiar de 250 mil vem de `POP_THRESHOLD` em
`src/lib/constants.js:24`, alinhado aos prazos legais de 12/04/2024 e 12/04/2025
(`LEGAL_DEADLINES`, linha 19). Essas datas estão fixas em código.

### 6.2. `buildCumulativeApprovalSeries` (linha 348)

Alimenta o gráfico de evolução da página inicial. Exige três condições simultâneas:
`ano_elaboracao` preenchido, `aprovado_lei = "Sim"` e `obrigado = true`.

**Decisão embutida:** a série é acumulada por `ano_elaboracao`, não pela data da
lei nem pela data do levantamento. Um plano aprovado em 2025 mas elaborado em 2019
aparece na curva em 2019.

**Ponto para revisão:** municípios aprovados sem `ano_elaboracao` desapareceriam da
curva sem qualquer aviso. Hoje não há nenhum caso, mas a regra é silenciosa.

**Ponto para revisão:** usar `aprovado_lei` em vez de `status_painel` cria dois
caminhos paralelos para o mesmo conceito. Após a correção de precedência os dois
coincidem, porque nenhum registro com `aprovado_lei = "Sim"` recebe status
diferente de `Plano aprovado`. Antes da correção, divergiam.

---

## 7. Regras de leitura da planilha

Regras que afetam quais dados chegam ao cálculo de status.

### 7.1. Aba obrigatória

Apenas a aba chamada `Levantamento` é lida (`process-historical-data.mjs:68`).
Arquivos sem essa aba são ignorados em silêncio.

### 7.2. Data de referência pelo nome do arquivo

A data do levantamento vem do nome do arquivo, não do conteúdo
(`parseReferenceDate`, linha 146). O padrão esperado é
`_<dia><mês em 3 letras><ano>.xlsx`, por exemplo `_18ago2026.xlsx`. Arquivos fora
do padrão são descartados com aviso no console.

### 7.3. Snapshot vigente

O painel exibe o arquivo com a maior data de referência (linha 89). Não há checagem
de que ele seja o mais completo ou o mais recente por conteúdo.

### 7.4. Colunas reconhecidas

Só as colunas listadas em `COLUMN_ALIASES` (`process-data-utils.mjs:55`) são
importadas. Cabeçalhos novos ou renomeados são descartados em silêncio. O
casamento ignora acentos, maiúsculas e pontuação.

Aliases que mudam de ano para ano e apontam para o mesmo campo interno:

- `Estimativa populacional 2024` e `2025` viram `estimativa_populacional`
- `Faixa populacional 2024` e `2025` viram `faixa_populacional_estimativa`
- `Obrigados estimativa 2024` e `2025` viram `obrigados_estimativa`
- `RIDE/RM/AU IBGE 2021` e `2024` viram `recorte_metropolitano`

**Ponto para revisão:** `RIDE/RM/AU IBGE 2023` é mapeado para um campo separado
(`recorte_metropolitano_secundario`) que não é exportado nem usado.

### 7.5. Datas ambíguas

`normalizeDate` (`process-data-utils.mjs:142`) precisa decidir entre leitura
brasileira e americana quando dia e mês são ambos menores ou iguais a 12. A ordem
de decisão é: ano com dois dígitos assume formato americano; dia maior que 12
assume brasileiro; se uma das leituras cair no futuro e a outra não, vence a que
não é futura; no empate, vence a brasileira.

**Ponto para revisão:** a regra do "futuro" compara com a data de execução do
processamento. O mesmo arquivo pode gerar datas diferentes se reprocessado em
momentos distintos.

---

## 8. Porte populacional

`porte_populacional` (`process-historical-data.mjs:234`) tenta as faixas já prontas
da planilha nesta ordem, e só calcula quando todas faltam:

1. `faixa_populacional_2022`
2. `faixa_populacional_estimativa`
3. `faixa_populacional_2010`
4. cálculo por `classifyPopulationBand` sobre a população do Censo 2022, com queda
   para o Censo 2010

**Ponto para revisão:** a fonte do porte varia por município conforme o
preenchimento da planilha. Dois municípios podem ter o porte medido em anos
diferentes. O painel não registra qual fonte foi usada em cada linha.

Faixas usadas no cálculo (`classifyPopulationBand`, linha 223): até 20 mil, de 20 a
60 mil, de 60 a 100 mil, de 100 a 250 mil, de 250 mil a 500 mil, de 500 mil a
1 milhão, mais de 1 milhão.

---

## 9. Divergências identificadas

### 9.1. `src/metodologia.md` está desatualizado

A seção "Classificação `status_painel`" da página de metodologia descreve a ordem
antiga, com `Sem ofício` em primeiro lugar. Precisa ser corrigida para refletir a
regra atual.

### 9.2. Contradição no dado de origem

Nove municípios têm status `Sem ofício` mas trazem número de ofício preenchido em
`Respondido por qual instrumento`:

| Município | UF | Obrigado | Instrumento registrado |
|---|---|---|---|
| Junqueirópolis | SP | Sim | Ofício nº 13/2019 |
| Nazário | GO | Não | Ofício nº 10/2016 |
| Cachoeira Dourada | GO | Não | Ofício nº 10/2016 |
| São Luiz do Norte | GO | Não | Ofício nº 10/2016 |
| São Miguel do Passa Quatro | GO | Não | Ofício nº 10/2016 |
| Amaralina | GO | Não | Ofício nº 10/2016 |
| Santa Rosa de Goiás | GO | Não | Ofício nº 10/2016 |
| Santana do Seridó | RN | Não | Ofício nº 210/2015 |
| Estrela do Norte | SP | Não | Ofício nº 10/2016 |

Nos nove casos, as colunas de plano dizem `Não foi enviado ofício`. É inconsistência
na planilha, não no código. Vale confirmar qual informação está correta.

### 9.3. Ausência de teste

Não há teste automatizado cobrindo `deriveStatus`, apesar de ser a regra central do
painel. A suíte atual (`test/`) cobre parsing de datas, agregação por UF e o
pipeline de arquivos, mas não a classificação de status.
