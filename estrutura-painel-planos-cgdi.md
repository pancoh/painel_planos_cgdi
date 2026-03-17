# Estrutura do projeto `painel_planos_cgdi`

## Resumo executivo

O projeto está em um estado **bom de manutenção** e **sem gambiarra evidente**.

Os pontos mais sólidos hoje são:

- pipeline de dados separado do frontend;
- artefatos públicos claros para consumo do site;
- componentes e utilitários extraídos em módulos reutilizáveis;
- testes mínimos automatizados para parsing, datas e navegação;
- limpeza automática de artefatos gerados antigos em `src/data/processed/`;
- `lint`, `test` e `build` funcionando.

Os limites que ainda restam:

- a home ainda precisa declarar `FileAttachment(...)` de forma literal no `.md`, por limitação do Observable Framework;
- o mapa continua sendo o componente mais complexo do frontend;
- a cobertura de testes ainda é pequena;
- `src/data/processed/` continua sendo uma pasta sensível, porque mistura artefatos públicos e artefatos de apoio.

---

## Arquitetura

O projeto tem 3 camadas:

1. **Entrada institucional**
   Planilhas Excel em `Arquivos_Levantamento_PlanosdeMobilidadeUrbana/`.

2. **Pipeline Node.js**
   Scripts em `scripts/` processam os XLSX, geram JSON/CSV e criam páginas estáticas por UF.

3. **Site estático**
   Páginas e componentes em `src/` consomem os artefatos processados e o Observable Framework publica o resultado em `dist/`.

Fluxo:

```text
XLSX históricos
  -> scripts/process-historical-data.mjs
  -> src/data/processed/*
  -> src/*.md e src/estado/*.md
  -> observable build
  -> dist/
```

---

## Pastas e arquivos principais

### Pipeline

- [scripts/process-historical-data.mjs](/Users/ramson/projetos-dev/painel_planos_cgdi/scripts/process-historical-data.mjs)
  Núcleo do pipeline. Normaliza planilhas, agrega dados, limpa artefatos antigos e grava saídas processadas.

- [scripts/process-data-utils.mjs](/Users/ramson/projetos-dev/painel_planos_cgdi/scripts/process-data-utils.mjs)
  Funções puras de apoio ao pipeline.

- [scripts/check-data.mjs](/Users/ramson/projetos-dev/painel_planos_cgdi/scripts/check-data.mjs)
  Validação estrutural dos artefatos gerados.

- [scripts/generate-state-pages.mjs](/Users/ramson/projetos-dev/painel_planos_cgdi/scripts/generate-state-pages.mjs)
  Gera as páginas estáticas por estado.

### Frontend

- [src/index.md](/Users/ramson/projetos-dev/painel_planos_cgdi/src/index.md)
  Home do painel. Ainda concentra os `FileAttachment(...)` obrigatórios.

- [src/components/home-dashboard.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/home-dashboard.js)
  Composição principal da home.

- [src/components/brazil-map.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/brazil-map.js)
  Orquestração do mapa.

- [src/components/brazil-map-ui.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/brazil-map-ui.js)
  Helpers visuais e de interação do mapa.

- [src/components/municipio-explorer.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/municipio-explorer.js)
  Tabela municipal com filtros, busca, paginação e exportação.

- [src/components/state-explorer.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/state-explorer.js)
  Explorer estadual.

- [src/components/region-explorer.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/components/region-explorer.js)
  Explorer regional.

### Utilitários compartilhados

- [src/lib/constants.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/constants.js)
- [src/lib/data-loaders.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/data-loaders.js)
- [src/lib/formatters.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/formatters.js)
- [src/lib/municipios-data.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/municipios-data.js)
- [src/lib/navigation.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/navigation.js)
- [src/lib/theme.js](/Users/ramson/projetos-dev/painel_planos_cgdi/src/lib/theme.js)

### Testes

Diretório: [test](/Users/ramson/projetos-dev/painel_planos_cgdi/test)

Cobertura atual:

- parsing do CSV municipal;
- normalização de datas;
- resolução da navegação principal.

---

## Contrato de dados

Artefatos públicos principais em `src/data/processed/`:

- `metadata.json`
- `snapshots.json`
- `latest-regioes.json`
- `latest-ufs.json`
- `latest-municipios.csv`
- `municipios-uf-*.json`
- `obrigados.json`

Artefato pesado de apoio:

- `historico-municipios.json`

Observação:

o pipeline já remove sobras antigas antes de regenerar essa pasta, o que reduz lixo operacional e divergência entre código e dados.

---

## Avaliação de manutenção

### O que está bom

- responsabilidades razoavelmente bem separadas;
- código compartilhado extraído para módulos pequenos;
- parser e navegação já testáveis;
- build previsível;
- validação de dados no pipeline;
- menos risco de artefato órfão em `src/data/processed/`.

### O que ainda exige atenção

- a home ainda não pode ser totalmente abstraída por causa do `FileAttachment`;
- o mapa segue sendo o trecho mais caro para entender e alterar com segurança;
- os testes ainda não cobrem regressões visuais nem fluxo completo de build;
- a pasta de dados processados ainda merece cuidado por ser parte central do contrato do sistema.

---

## Conclusão

O projeto já está em um ponto **confortável para evoluir** e **longe de um estado improvisado**.

Ele ainda não está no limite máximo de simplicidade, mas os principais riscos agora são de **complexidade residual** e **cobertura de testes**, não de arquitetura quebrada.