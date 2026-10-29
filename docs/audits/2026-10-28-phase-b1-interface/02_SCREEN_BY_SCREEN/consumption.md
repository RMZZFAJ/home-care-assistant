# SC-019 — Ocorrências

Rota: `/consumo` . Situação: ACTIVE.
Fonte principal:
[src/components/stock/consumption-console.tsx](../../../../src/components/stock/consumption-console.tsx)
.

## Intenção e contexto

Relatar falta/consumo e submeter a confirmação autorizada.

Perfis/capacidades: consumption.report/confirm e custódia. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 113; **Controle:** Button; **Texto/nome ou expressão:** Registrar
ocorrência; **Pré-condição e efeito verificável:** {(event) =>
setEditor(event.currentTarget)}.
- **Linha:** 147; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="consumption"&gt;Consumo extraordinário&lt;/option&gt; &lt;option
value="shortage"&gt;Falta de material&lt;/option&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 154; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="CARE_TEAM"&gt;Equipe&lt;/option&gt; {can(context, "stock.family.read")
? ( &lt;option value="FAMILY"&gt;Família&lt;/option&gt; ) : null};
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 163; **Controle:** textarea; **Texto/nome ou expressão:** O que
aconteceu? &lt;textarea name="text" className={inputClass} minLength={3}
maxLength={2000} rows={3} required /&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 183; **Controle:** input; **Texto/nome ou expressão:** &lt;input
type="checkbox" checked={Object.hasOwn(lines, product.id)} onChange={(event)
=&gt; setLines((current) => { const next = { ...current }; if
(event.target.checked) next\[product.id\] = ""; else delete next\[product.id\];;
**Pré-condição e efeito verificável:** "checkbox".
- **Linha:** 200; **Controle:** input; **Texto/nome ou expressão:** Quantidade ·
{product.unit} &lt;input className={inputClass} type="number"
inputMode="decimal" min="0.000001" step="any" value={lines\[product.id\]}
onChange={(event) =&gt; setLines({ ...lines, \[product.id\]:
event.target.value,; **Pré-condição e efeito verificável:** "number".
- **Linha:** 222; **Controle:** button; **Texto/nome ou expressão:** {uncertain
? "Recuperar relato" : "Registrar para conferência"}; **Pré-condição e efeito
verificável:** {busy}.
- **Linha:** 270; **Controle:** button; **Texto/nome ou expressão:** Confirmar
relato e movimento; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 277; **Controle:** button; **Texto/nome ou expressão:** Rejeitar
relato; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 295; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy || uncertain}.
- **Linha:** 295; **Controle:** Button; **Texto/nome ou expressão:** {uncertain
? "Recuperar confirmação" : review.accept ? "Confirmar consumo" : "Confirmar
rejeição"}; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/stock/consumption-console.tsx`
, `src/components/workspace.tsx` , `src/components/stock/flow-reviews.tsx` ,
`src/components/ui/primitives.tsx` , `src/components/forms/record-drawer.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Relato e débito são separados; seleção de linhas e confirmação de efeito;
preserva tentativa incerta em memória.

## Atritos e contraditório

Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra
mensagem genérica mesmo depois de débito; catálogo/relatos dependem de
Promise.all.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Fila recuperável com alvo exato, estados explícitos e feedback específico para
relatado/confirmado/rejeitado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, consumption](../evidence/b11-adminA-consumption-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.

Volume 101 e Flow externo são contratos distintos; não chamar canal real.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-035 — "Registrar relato"

Componente RecordDrawer, origem
`src/components/stock/consumption-console.tsx:115` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra
mensagem genérica mesmo depois de débito; catálogo/relatos dependem de
Promise.all.
Preservar: Relato e débito são separados; seleção de linhas e confirmação de
efeito; preserva tentativa incerta em memória.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-036 — "Revisar confirmação do relato"

Componente Dialog, origem `src/components/stock/consumption-console.tsx:295` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra
mensagem genérica mesmo depois de débito; catálogo/relatos dependem de
Promise.all.
Preservar: Relato e débito são separados; seleção de linhas e confirmação de
efeito; preserva tentativa incerta em memória.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-019.

16 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [consumption](../evidence/b11-adminA-consumption-390.png): adminA; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [occurrence-new](../evidence/b11-supplement-adminA-occurrence-new.png):
adminA; 390; READY. top 844/844 source pixels.
- [consumption-401](../evidence/b14-errors-adminA-consumption-401.png): adminA;
390; ERROR_BLOCKED. top 844 of 844px; scaled to 360x650.
- [consumption-403](../evidence/b14-errors-adminA-consumption-403.png): adminA;
390; ERROR_BLOCKED. top 844 of 844px; scaled to 360x650.
- [consumption-404](../evidence/b14-errors-adminA-consumption-404.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [consumption-409](../evidence/b14-errors-adminA-consumption-409.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [consumption-422](../evidence/b14-errors-adminA-consumption-422.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [consumption-429](../evidence/b14-errors-adminA-consumption-429.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [consumption-500](../evidence/b14-errors-adminA-consumption-500.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [invalid-json](../evidence/b14-recovery-adminA-invalid-json.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [network-abort](../evidence/b14-recovery-adminA-network-abort.png): adminA;
390; OFFLINE. top 844 of 844px; scaled to 360x650.
- [consumption-pending](../evidence/b15-states-adminA-consumption-pending.png):
adminA; 390; LOADING. top 844 of 844px; scaled to 360x650.

[consumption-empty-confirmed](../evidence/b15-states-adminA-consumption-empty-confirmed.png)
: adminA; 390; EMPTY_CONFIRMED. top 844 of 844px; scaled to 360x650.

- [report-registered](../evidence/b16-consumption-adminA-report-registered.png)
: adminA; 390; PERSISTED. top 844 of 844px; scaled to 360x650.
- [report-review](../evidence/b16-consumption-adminA-report-review.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.

[consumption-confirmed](../evidence/b16-consumption-adminA-consumption-confirmed.png)
: adminA; 390; PERSISTED. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0189; FLD-0190; FLD-0191; FLD-0192; FLD-0193;
FLD-0194; FLD-0195; FLD-0196; FLD-0197. Controles de ação relacionados: 9
callsites; inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos
executados.

Diagnósticos associados: [B1-STATE-001](../12_FINDINGS_MASTER.md#b1-state-001) —
Consultas sem estado próprio afirmam vazio/configuração ausente antes do
resultado; [B1-UX-007](../12_FINDINGS_MASTER.md#b1-ux-007) — Pendências antigas
de consumo e eventos administrativos têm alcance de consulta limitado;
[B1-FEED-001](../12_FINDINGS_MASTER.md#b1-feed-001) — Feedback genérico não
distingue relato de consumo,confirmação e aquisição.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
