# SC-016 — Estoque familiar

Rota: `/estoque?custody=FAMILY` . Situação: ACTIVE.
Fonte principal:
[src/components/stock/stock-console.tsx](../../../../src/components/stock/stock-console.tsx)
.

## Intenção e contexto

Consultar confirmado, projeção, mínimos e movimentos familiares.

Perfis/capacidades: stock.family.read/manage. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 212; **Controle:** button; **Texto/nome ou expressão:** Atualizar;
**Pré-condição e efeito verificável:** {loading}.
- **Linha:** 226; **Controle:** input; **Texto/nome ou expressão:** Buscar
produto &lt;input className={inputClass} value={search} onChange={(event)
=&gt; setSearch(event.target.value)} />; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 234; **Controle:** select; **Texto/nome ou expressão:** "Custódia";
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 264; **Controle:** Button; **Texto/nome ou expressão:** Movimentar
estoque familiar; **Pré-condição e efeito verificável:** {(event) => {
setOperation("inbound"); setMovementProductId(""); setReferenceId("");
setMovementEditor(event.currentTarget); }}.
- **Linha:** 275; **Controle:** select; **Texto/nome ou expressão:** "Operação";
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 293; **Controle:** select; **Texto/nome ou expressão:** "Produto";
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 313; **Controle:** input; **Texto/nome ou expressão:** Quantidade
&lt;input className={inputClass} name="quantity" type="number"
inputMode="decimal" min="0.000001" step="any" max="1000000000" required /&gt;;
**Pré-condição e efeito verificável:** "number".
- **Linha:** 327; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione uma movimentação do histórico&lt;/option&gt;
{movements.filter((row) => row.reference_type === "family_manual" &&
(!movementProductId || row.product_id === movementProductId) &&
(row.source_locatio; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 338; **Controle:** textarea; **Texto/nome ou expressão:** Motivo
&lt;textarea className={inputClass} name="reason" minLength={3}
maxLength={1000} rows={3} required /&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 348; **Controle:** button; **Texto/nome ou expressão:** Revisar
movimentação; **Pré-condição e efeito verificável:** {busy || uncertain}.
- **Linha:** 369; **Controle:** button; **Texto/nome ou expressão:** &lt;Icon
name="search" /&gt; Filtrar; **Pré-condição e efeito verificável:** {() =>
setShowFilters((value) => !value)}.
- **Linha:** 395; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Todos&lt;/option&gt; {products.map((product) => ( &lt;option
key={product.productId} value={product.productId}&gt; {product.name}
&lt;/option&gt; ))}; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 410; **Controle:** input; **Texto/nome ou expressão:** De &lt;input
className={inputClass} type="date" name="from" defaultValue={filters.from}
/&gt;; **Pré-condição e efeito verificável:** "date".
- **Linha:** 419; **Controle:** input; **Texto/nome ou expressão:** Até
&lt;input className={inputClass} type="date" name="to"
defaultValue={filters.to} /&gt;; **Pré-condição e efeito verificável:**
"date".
- **Linha:** 426; **Controle:** button; **Texto/nome ou expressão:** Aplicar
filtros; **Pré-condição e efeito verificável:** Consultar ramo condicional na
fonte.
- **Linha:** 454; **Controle:** Link; **Texto/nome ou expressão:** Abrir ficha;
**Pré-condição e efeito verificável:** {"/fichas/" + movement.reference_id}.
- **Linha:** 467; **Controle:** Button; **Texto/nome ou expressão:** Corrigir
este movimento; **Pré-condição e efeito verificável:** {(event) => {
setOperation(movement.source_location === "FAMILY" ? "correction_in" :
"correction_out"); setMovementProductId(movement.product_id);
setReferenceId(movement.id); setMovementEditor(event..
- **Linha:** 479; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page === 1 || loading}.
- **Linha:** 489; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * 20 >= total || loading}.
- **Linha:** 517; **Controle:** button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy || uncertain}.
- **Linha:** 524; **Controle:** button; **Texto/nome ou expressão:** {busy ?
"Confirmando…" : uncertain ? "Recuperar tentativa" : "Confirmar"};
**Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/stock/stock-console.tsx` ,
`src/components/workspace.tsx` , `src/components/documents/attachments.tsx` ,
`src/components/forms/settings-section.tsx` , `src/components/ui/primitives.tsx`
, `src/components/stock/transit-stock.tsx` ,
`src/components/stock/stock-overview.tsx` ,
`src/components/forms/record-drawer.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Ledger, histórico paginado e correção compensatória; estoque oficial não
editável diretamente.

## Atritos e contraditório

Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista;
troca de custódia conserva página antiga.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo assinado por operação+unidade+referência; presets de motivo com exceção;
reset de página ao mudar escopo.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, stock-family](../evidence/b11-adminA-stock-family-390.png):
top 1030/4801 source pixels; navegação e leitura, comandos não confirmados.

Contagens de erro de estoque são efeitos de fixture local, não produção.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-038 — "Movimentar estoque familiar"

Componente RecordDrawer, origem `src/components/stock/stock-console.tsx:266` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista;
troca de custódia conserva página antiga.
Preservar: Ledger, histórico paginado e correção compensatória; estoque oficial
não editável diretamente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-039 — "Confirmar movimentação familiar"

Componente Dialog, origem `src/components/stock/stock-console.tsx:499` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista;
troca de custódia conserva página antiga.
Preservar: Ledger, histórico paginado e correção compensatória; estoque oficial
não editável diretamente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-016.

7 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [stock-family](../evidence/b11-adminA-stock-family-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/4801 source pixels.
- [stock-movement](../evidence/b11-supplement-adminA-stock-movement.png):
adminA; 390; READY. top 844/844 source pixels.
- [movement-review](../evidence/b11-followup-adminA-movement-review.png):
adminA; 390; READY. top 844/844 source pixels.
- [stock-390](../evidence/b12-visual-adminA-stock-390.png): adminA; 390; READY.
top 844 of 844px; scaled to 360x650.
- [stock-1440](../evidence/b12-visual-adminA-stock-1440.png): adminA; 1440;
READY. top 950 of 1000px; scaled to 360x650.
- [stock-history-failed](../evidence/b15-states-adminA-stock-history-failed.png)
: adminA; 390; PARTIAL. top 844 of 844px; scaled to 360x650.
- [partial-stock](../evidence/b15-followup-adminA-partial-stock.png): adminA;
390; PARTIAL. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0105; FLD-0204; FLD-0205; FLD-0206; FLD-0207;
FLD-0208; FLD-0209; FLD-0210; FLD-0211; FLD-0212; FLD-0213. Controles de ação
relacionados: 14 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-UX-002](../12_FINDINGS_MASTER.md#b1-ux-002) —
Confirmações de estoque, ENT e configuração BAL omitem consequências por
domínio; [B1-STATE-002](../12_FINDINGS_MASTER.md#b1-state-002) — Filtro novo
pode coexistir com linhas antigas sem indicação de atualização;
[B1-STATE-003](../12_FINDINGS_MASTER.md#b1-state-003) — Falha secundária no
estoque descarta saldo válido e apresenta ausência.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
