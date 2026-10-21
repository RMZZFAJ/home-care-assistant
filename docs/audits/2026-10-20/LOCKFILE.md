# Lockfile multiplataforma

## Problema reproduzido

A instalação Linux com `npm ci` recusou o lock anterior por ausência de
dependências transitivas WASM de `@img/sharp-wasm32` e
`@tailwindcss/oxide-wasm32-wasi`, incluindo `@emnapi/runtime` e `@emnapi/core`.
O arquivo também conservava a árvore de `jsdom` após sua remoção do manifesto.

## Correção

O lock foi resolvido do zero, sem `node_modules`, em diretório externo ao
repositório, com a imagem oficial `node:24.22.0-bookworm` e npm `11.21.1`.
Foram usados o `package.json` e o `.npmrc` do projeto, com
`npm install --package-lock-only --include=optional --no-audit --no-fund`.

Nenhuma versão já resolvida de dependência mudou e o manifesto não foi alterado.
A resolução acrescentou os registros transitivos ausentes, removeu a árvore
obsoleta de `jsdom` e consolidou a localização de `ansi-regex`.
Não houve uso de `--force`, `--legacy-peer-deps` ou edição manual de integridades.

## Evidências

- Node: `24.22.0`; npm: `11.21.1`.
- Windows: instalação em diretório novo e externo, sem `node_modules` prévio;
  `npm ci --include=optional --no-audit --no-fund`, saída zero,
  320 pacotes instalados em dois minutos.
- Linux: instalação em diretório vazio dentro de `/tmp` de contêiner descartável;
  mesmo comando, saída zero, 321 pacotes instalados em um minuto.
  A diferença é a seleção normal de binários opcionais de cada plataforma.
- SHA256 do lock testado:
  `4e94f91701ee86ada928d2f54799c50092c948c930a620316c772b4e5499c8de`.

Os testes de instalação usam somente o registro público de dependências.
Nenhum ambiente de banco ou infraestrutura da aplicação é alterado.
