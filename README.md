# Painel de Planos de Mobilidade Urbana

Painel web institucional construído com Observable Framework para substituir um painel antigo em Power BI sobre a situação dos Planos de Mobilidade Urbana no Brasil.

## Requisitos

- Node.js 18+
- npm 9+

## Como executar

```bash
npm install
npm run dev
```

O comando `npm run dev` reprocessa automaticamente os arquivos históricos antes de abrir o preview local do Observable Framework.

## Build de produção

```bash
npm run build
```

Os arquivos estáticos serão gerados em `dist/`.

## Pipeline de dados

O processamento histórico está em [`scripts/process-historical-data.mjs`](/Users/ramson/Desktop/painel_planos_cgdi/scripts/process-historical-data.mjs). Ele:

- lê todos os arquivos Excel da pasta histórica;
- ordena os snapshots por data;
- extrai a aba `Levantamento`;
- padroniza colunas e valores textuais;
- cria a classificação `status_painel`;
- consolida a série histórica;
- gera JSON e CSV em [`src/data/processed`](/Users/ramson/Desktop/painel_planos_cgdi/src/data/processed).

## Publicação

O site gerado em `dist/` pode ser publicado em qualquer hospedagem estática. Para uso no portal gov.br, a opção mais simples é publicar o build estático em um subdomínio institucional ou CDN e embutir o painel via `iframe` responsivo no portal.
# painel_planos_cgdi
