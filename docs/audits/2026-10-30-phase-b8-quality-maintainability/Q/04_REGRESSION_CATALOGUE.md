# Q5 — Catálogo de regressões A–B7

A [matriz](../REGRESSION_COVERAGE_MATRIX.csv) representa os 156 IDs dos oito
registros A e B1–B7, em 119 famílias de verificação. São37 relações de
revalidação/manifestação agrupadas, com zero ID ausente. A
[reconciliação](../evidence/regression-reconciliation.json) fixa contagens e
hashes das fontes originais, sem copiar seus resultados integralmente.

## Como ler

Cada linha identifica IDs originais, causa, checks existentes e sua limitação,
resultado conhecido, reprodução diagnóstica, comportamento correto futuro,
oráculo positivo/negativo, camadas e necessidade humana/física/remota/decisória.
As referências source_file#ID conduzem ao registro original e suas provas. As
linhas de código têm [âncoras verificáveis](../evidence/SOURCE_ANCHORS.csv).

Uma família pode exigir vários estados e consumidores. Agrupar DB-001, B2-004 e
B3-002 evita três casos idênticos do mesmo cancelamento com consumo. Manter
emissão de invalidação B3-013 separada do consumidor B5-010 evita consertar
apenas metade do percurso. Consumo e auditoria truncados usam rotas distintas e
conservam famílias próprias, ainda que uma paginação futura possa compartilhar
componentes.

B1-UX-007 e UX-006 são observações amplas: suas partes de auditoria/navigation
também aparecem nas famílias específicas. Essa ligação não converte a B8 na
consolidação de prioridades/soluções da Fase C. A matriz não define um número
final de correções independentes nem impõe um plano de implementação.

## Resultado atual versus aceitação futura

Um check vizinho verde não afirma que o cenário defeituoso foi exercitado. O
campo current_test_result declara quando a prova é histórica, parcial ou quando
houve execução dirigida B8. Nenhuma execução integral foi inventada. Oráculos
PDF sobreviventes são identificados; QA-001 permanece falha conhecida.

Reprodutores A–B7 verificam observação, inclusive a existência do defeito. Não
devem ser colocados na CI como aceitação do resultado errado. Após a decisão C e
correção D, a expectativa precisa exigir o comportamento correto. Do mesmo modo,
headings que hoje fixam texto inadequado devem seguir o texto aprovado, sem
enfraquecer as demais verificações para manter o teste verde.

## Ordem de exigência para D, sujeita à decisão responsável

Priorizar contratos que protegem as duas causas P1 já existentes: decisão
informada de escala e progresso do lifecycle REQ. Antes de alterar cada causa,
selecionar reprodução mínima e oráculo que discrimine a correção; adicionar
negativos de versão/papel/paciente/erro parcial conforme seu efeito.

Preservar Auth real, concorrência independente e história com FK. Para bug de
renderer não é obrigatório reexecutar RLS completo se os contratos de acesso não
mudaram; para autorização não basta um componente mockado. Escalar checks pela
alteração efetiva e por dependências, sem repetir toda prova por hábito.

As três lacunas novas de qualidade B8 têm critérios próprios em
[aceitação](../ACCEPTANCE_AND_REGRESSION_CRITERIA.md). Os seis registros
revalidados remetem às famílias originais. Nenhuma dessas correções começou.
