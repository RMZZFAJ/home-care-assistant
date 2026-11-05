# Revisão de dependências

Revisão de 21/10/2026. O diagnóstico diferencia o grafo de desenvolvimento
do grafo de produção e conserva os avisos sem correção publicada.

## Diagnóstico inicial

O relatório anterior registrou 11 pacotes afetados: 7 de severidade alta,
1 moderada e 3 baixas. Muitos registros eram efeitos transitivos da mesma
falha, e não vulnerabilidades independentes. O audit de produção não
registrou vulnerabilidades. Isso descreve a base de advisories consultada;
não constitui prova de ausência de outras falhas.

Os pacotes afetados pertencem a ferramentas de desenvolvimento. A busca
em `src`, `scripts` e `tests` não encontrou imports desses parsers nem dos
expansores de glob no código da aplicação. O lint Markdown recebe padrões
fixos de `package.json`; o plugin Next recebe a configuração ESLint do
repositório. Conteúdo de requisições HTTP não chega a esses pontos.

## Alterações aplicadas

O registro npm e a release oficial confirmaram `markdownlint-cli2@0.24.0`,
com Node >=22, compatível com Node 24.22.0. Essa versão atualiza
`markdown-it` para 15.0.3 e `smol-toml` para 1.9.1. Os advisories indicam
patches a partir de 15.0.3 e 1.9.0, respectivamente.

`micromark-extension-math@3.1.0` ainda solicita KaTeX `^0.16.0`, sem
correção nessa faixa. Foi aplicado um override limitado a esse consumidor
para `katex@0.19.0`. O renderizador opcional da extensão usa somente
`renderToString`. A compatibilidade dessa API foi testada diretamente e
pela extensão `mathHtml`. O override ultrapassa a faixa declarada pelo
consumidor; ele é uma decisão explícita, validada nos caminhos utilizados,
e deve ser retirado quando o consumidor adotar uma versão corrigida.

Nenhuma regra de lint foi desativada. As versões publicadas, os requisitos
de Node e a árvore de peers foram conferidos. Foram preservadas as 93
entradas opcionais do lock, incluindo binários Windows e Linux.

Não foi adotada a sugestão automática de recuar o plugin Next para
14.2.35 ou o linter Markdown para 0.23.2. Essas sugestões não demonstram
compatibilidade com o conjunto atual nem corrigem a origem sem patch.

## Evidência de segurança e risco residual

No KaTeX 0.16.47 instalado, um processo Node dedicado definiu
`Object.prototype.trust = true` e renderizou uma expressão `\href` com
esquema JavaScript. A saída continha o atributo inseguro. A propriedade
foi removida em `finally`; a prova não alterou o navegador nem o servidor.
A falha exige poluição de protótipo prévia, conforme o advisory.

`braces@3.0.3` permanece a versão mais recente no registro e o advisory
declara que não existe versão corrigida. A expansão de um padrão com
4.500 pares aninhados, abaixo do limite de 10.000 caracteres, reproduziu
`RangeError: Maximum call stack size exceeded`. O controle comum
`docs/{A,B}.md` foi expandido corretamente.

Esse risco pode interromper um processo de ferramentas que receba padrões
maliciosos. Os padrões usados por este projeto são definidos nos scripts
e na configuração revisada; não vêm dos usuários da aplicação. Deve-se
reavaliar a cadeia quando houver patch upstream, sem esconder os avisos
nem declarar o pacote corrigido.

## Validação

O manifest e o lock foram atualizados após estas verificações em cópias
de instalação, sem substituir `node_modules` do servidor em execução:

- Windows: Node 24.22.0, npm 11.21.1; `npm ci --no-audit --no-fund`
  passou, com 322 pacotes instalados em diretório inicialmente vazio.
- Linux: imagem `node:24.22.0-bookworm`, npm 11.21.1;
  o mesmo `npm ci` passou, com 323 pacotes. Essa diferença decorre
  dos pacotes opcionais específicos de cada plataforma.
- `npm ls --all --omit=optional` passou nas duas instalações, sem peers
  inválidos. O manifest corresponde ao lock para dependências e engines.
- `npm run lint` passou na cópia Linux.
- O novo CLI analisou este relatório, com zero erros. A primeira execução
  completa apontou 13 violações MD013 em `CHECKPOINT.md` e `EXECUTION.md`.
  Após a revisão desses arquivos, o agente documental repetiu o comando
  sobre a árvore real: 27 arquivos, zero problemas.
- A reprodução original de KaTeX passou a bloquear o link JavaScript.
  Também foram bloqueados imagem remota e classe HTML quando `trust`
  vinha de `Object.prototype`.
- Quatro expressões usuais passaram pelo conjunto real
  `micromark` + `math` + `mathHtml`: fração, raiz, soma e alinhamento.
  Sintaxe inválida manteve o tratamento de erro; um link HTTPS com
  `trust: true` explícito continuou funcionando.
- O novo `npm audit --json` registrou 6 avisos altos, todos decorrentes
  de `braces`: `braces`, `micromatch`, `fast-glob`, `globby`,
  `markdownlint-cli2` e `@next/eslint-plugin-next`.
- `npm audit --omit=dev --json` registrou zero vulnerabilidades.

SHA256 do lock validado nas duas plataformas:

```text
9FFB5164CAE57C06F72FFCCCC9C45F663217CCA0FA59EBDDDE0782AFAD991C41
```

O npm normalizou posteriormente os finais de linha de CRLF para LF na
instalação do repositório. O JSON completo foi comparado e permanece
idêntico, sem alterações no grafo. O SHA256 com finais de linha LF é:

```text
F682289FDC9D8443BF405A3B6493C9AD95457FE0FFE0021CD20A13014088FD84
```

Os avisos de `markdown-it`, `smol-toml` e KaTeX não reapareceram no audit
do lock atualizado. O pacote `braces` e seus efeitos continuam abertos,
com a exposição descrita acima. A validação final da aplicação, após
atualizar sua instalação real, está registrada no relatório de execução.
Não se declara o conjunto inteiro livre de vulnerabilidades.

## Fontes primárias

- [Release do markdownlint-cli2 0.24.0][cli-release].
- [Advisory do markdown-it][markdown-advisory].
- [Advisory do smol-toml][toml-advisory].
- [Advisory do KaTeX][katex-advisory].
- [Release do KaTeX 0.19.0][katex-release].
- [Advisory do braces, sem versão corrigida][braces-advisory].

[cli-release]: https://github.com/DavidAnson/markdownlint-cli2/releases/tag/v0.24.0
[markdown-advisory]: https://github.com/advisories/GHSA-vfgh-jcmw-g37q
[toml-advisory]: https://github.com/advisories/GHSA-r4xh-jqrq-34v2
[katex-advisory]: https://github.com/advisories/GHSA-238p-pmpm-9mq7
[katex-release]: https://github.com/KaTeX/KaTeX/releases/tag/v0.19.0
[braces-advisory]: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
