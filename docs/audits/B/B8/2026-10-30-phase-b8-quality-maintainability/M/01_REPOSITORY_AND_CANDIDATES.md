# M1/M2 — Repositório, consumidores e candidatos

## Organização efetiva

No baseline, src contém202 arquivos; scripts22; tests57, contando SQL e helpers;
supabase87, incluindo84 migrations. Public tem oito arquivos. Há 1803 arquivos
de auditoria, cerca de 60,3 MB, além dos demais documentos. Volume de evidência
não é motivo para apagá-la ou declarar acoplamento do runtime. Contagens brutas
e maiores módulos estão no [inventário](../evidence/inventory.json).

App Router fornece entrypoints de página/handler/layout. Componentes por domínio
consomem bibliotecas de cliente/servidor; Auth e banco mantêm
autoridade/transações. Scripts são ferramentas de desenvolvimento/operação, sem
equivalência automática a código carregado no navegador. Arquivos sob auditoria
e references são fontes históricas/instrumentos, não funcionalidades.

Ambientes ignorados node_modules, .venv, .private, outputs e caches não fazem
parte do código versionado. Backups e credenciais não foram inventariados por
conteúdo nesta B8. A separação Git não dispensa revisar ferramentas que copiam
arquivos por tar ou usam um ignore de upload próprio.

## Método e contraprova

O grafo final contém1043 referências estáticas, reexportações e imports
dinâmicos em 263 módulos de código/testes/configuração fora das auditorias.
Busca lexical complementar incluiu nomes exportados, caminhos e assets.
Resultados não demonstram ausência de consumidor externo ou bookmark.

AppWorkspace apareceu inicialmente sem import direto. Leitura independente
encontrou `workspace.tsx:30`, que o reexporta como Workspace. O coletor passou a
incluir reexports; esse candidato foi refutado. PatientContext ativo vem de
types/workspace: nome igual em outro arquivo também não é prova de consumo.

## Classificação individual, sem remoção

- **RequisitionHistory — DELETE_CANDIDATE.**
  `src/components/requisitions/requisition-history.tsx`: zero consumidor interno
  demonstrado pelo grafo completo e busca complementar. Histórico ativo usa
  outro percurso. Confirmar novamente no diff futuro de remoção.
- **InventoryConsole — DELETE_CANDIDATE.**
  `src/components/stock/inventory-console.tsx`: zero consumidor demonstrado. Não
  confundir esse componente com as rotas e console de estoque ativos.
- **PrintButton — DELETE_CANDIDATE.**
  `src/components/requisitions/print-button.tsx`: zero consumidor demonstrado;
  os comandos ativos de PDF/share têm implementação própria.
- **types/operations — DELETE_CANDIDATE.** `src/types/operations.ts`: tipos
  antigos sem import/reexport do módulo. Ocorrências de PatientContext vêm de
  types/workspace. Não apagar o tipo ativo, seus reexports ou os imports reais
  por coincidência de nomes.
- **file.svg — DEPRECATE_CANDIDATE.** Sem referência ativa lexical encontrada;
  endereço público pode ter consumidor externo não observado.
- **globe.svg — DEPRECATE_CANDIDATE.** Mesmo limite de URL pública.
- **next.svg — DEPRECATE_CANDIDATE.** Asset inicial, sem consumo interno;
  confirmar necessidade de compatibilidade antes de remover.
- **vercel.svg — DEPRECATE_CANDIDATE.** Mesmo critério, sem alegar que uma busca
  no menu tenha provado inutilidade.
- **window.svg — DEPRECATE_CANDIDATE.** Mesmo critério de consumidor externo.
- **AppWorkspace — KEEP.** Componente estrutural ativo por reexportação em
  workspace.tsx, usado pelos módulos operacionais. Contraprova preservada.
- **/inventarios — KEEP.** Redireciona a `/historico?type=BAL`, tem referência
  em safe-return-path e teste de retorno autorizado; bookmarks são plausíveis.
  Não concluir que o redirect é órfão por faltar no menu.
- **Fontes Noto/licença — KEEP.** RendererPDF lê os arquivos explicitamente; não
  são resíduos do template Next. Preservar licença e suporte de glifos.
- **Estilos globals/design-system/theme — REFACTOR_CANDIDATE.** São ativos e têm
  consumidores. UX-008/B1-VIS-001 pede consolidação visual localizada, com
  evidência de equivalência e exceções, sem troca geral de fundação.
- **Rotas HTTP antigas/equivalentes — INSUFFICIENT_EVIDENCE para remoção.** Não
  há censo de clientes externos. B4-008 requer compatibilidade de autorização; a
  ausência de link no aplicativo não revoga o contrato.

[Busca complementar](../evidence/consumer-review.json) mantém positivos e
negativos. Nove candidatos a limpeza/depreciação não são nove defeitos novos: o
registro B8-M005 aprofunda UX-010. Nenhum arquivo foi removido ou movido.

## Preservar estrutura e histórico

Não há evidência que justifique mover App Router, criar monorepo, mudar
framework, eliminar relatórios ou reescrever migrations. Uma remoção futura deve
ter consumidor/URL/compatibilidade explicitamente verificados e executar somente
os checks afetados. O histórico A–B8 permanece acessível pelo índice phase-b;
arquivos antigos continuam identificados pela data e SHA de origem.
