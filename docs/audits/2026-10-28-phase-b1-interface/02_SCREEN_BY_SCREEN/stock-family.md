# SC-016 — Estoque familiar

Rota: `/estoque?custody=FAMILY`. Situação: ACTIVE.
Fonte principal: [src/components/stock/stock-console.tsx](../../../../src/components/stock/stock-console.tsx).

## Intenção e contexto

Consultar confirmado, projeção, mínimos e movimentos familiares.

Perfis/capacidades: stock.family.read/manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 212 | button | Atualizar  | {loading} |
| 226 | input | Buscar produto <input className={inputClass} value={search} onChange={(event) => setSearch(event.target.value)} />  | Consultar ramo condicional na fonte |
| 234 | select | "Custódia" | Consultar ramo condicional na fonte |
| 264 | Button | Movimentar estoque familiar | {(event) => { setOperation("inbound"); setMovementProductId(""); setReferenceId(""); setMovementEditor(event.currentTarget); }} |
| 275 | select | "Operação" | Consultar ramo condicional na fonte |
| 293 | select | "Produto" | Consultar ramo condicional na fonte |
| 313 | input | Quantidade <input className={inputClass} name="quantity" type="number" inputMode="decimal" min="0.000001" step="any" max="1000000000" required />  | "number" |
| 327 | select | <option value="">Selecione uma movimentação do histórico</option> {movements.filter((row) => row.reference_type === "family_manual" && (!movementProductId \|\| row.product_id === movementProductId) && (row.source_locatio | Consultar ramo condicional na fonte |
| 338 | textarea | Motivo <textarea className={inputClass} name="reason" minLength={3} maxLength={1000} rows={3} required />  | Consultar ramo condicional na fonte |
| 348 | button | Revisar movimentação  | {busy \|\| uncertain} |
| 369 | button |  <Icon name="search" /> Filtrar  | {() => setShowFilters((value) => !value)} |
| 395 | select |  <option value="">Todos</option> {products.map((product) => ( <option key={product.productId} value={product.productId}> {product.name} </option> ))}  | Consultar ramo condicional na fonte |
| 410 | input | De <input className={inputClass} type="date" name="from" defaultValue={filters.from} />  | "date" |
| 419 | input | Até <input className={inputClass} type="date" name="to" defaultValue={filters.to} />  | "date" |
| 426 | button | Aplicar filtros | Consultar ramo condicional na fonte |
| 454 | Link | Abrir ficha  | {"/fichas/" + movement.reference_id} |
| 467 | Button | Corrigir este movimento | {(event) => { setOperation(movement.source_location === "FAMILY" ? "correction_in" : "correction_out"); setMovementProductId(movement.product_id); setReferenceId(movement.id); setMovementEditor(event. |
| 479 | button | Anterior  | {page === 1 \|\| loading} |
| 489 | button | Próxima  | {page * 20 >= total \|\| loading} |
| 517 | button | Voltar  | {busy \|\| uncertain} |
| 524 | button |  {busy ? "Confirmando…" : uncertain ? "Recuperar tentativa" : "Confirmar"}  | {busy} |

Fontes de interface relacionadas: `src/components/stock/stock-console.tsx`, `src/components/workspace.tsx`, `src/components/documents/attachments.tsx`, `src/components/forms/settings-section.tsx`, `src/components/ui/primitives.tsx`, `src/components/stock/transit-stock.tsx`, `src/components/stock/stock-overview.tsx`, `src/components/forms/record-drawer.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Ledger, histórico paginado e correção compensatória; estoque oficial não editável diretamente.

## Atritos e contraditório

Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista; troca de custódia conserva página antiga.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo assinado por operação+unidade+referência; presets de motivo com exceção; reset de página ao mudar escopo.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, stock-family](../evidence/b11-adminA-stock-family-390.png): top 1030/4801 source pixels; navegação e leitura, comandos não confirmados.

Contagens de erro de estoque são efeitos de fixture local, não produção.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-038 — "Movimentar estoque familiar"

Componente RecordDrawer, origem `src/components/stock/stock-console.tsx:266`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista; troca de custódia conserva página antiga.
Preservar: Ledger, histórico paginado e correção compensatória; estoque oficial não editável diretamente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-039 — "Confirmar movimentação familiar"

Componente Dialog, origem `src/components/stock/stock-console.tsx:499`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação manual omite entrada/retirada e unidade; volume móvel alonga lista; troca de custódia conserva página antiga.
Preservar: Ledger, histórico paginado e correção compensatória; estoque oficial não editável diretamente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
