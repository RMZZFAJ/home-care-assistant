# SC-007 — Histórico de fichas

Rota: `/historico`. Situação: ACTIVE.
Fonte principal: [src/components/documents/document-history.tsx](../../../../src/components/documents/document-history.tsx).

## Intenção e contexto

Encontrar documentos por tipo, situação, código, período e página.

Perfis/capacidades: req/com/ent/bal.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 41 | Link |  <span className="document-type">{row.type}</span> <span className="min-w-0"> <strong>{row.code ?? "Rascunho"}</strong> <span className="block text-xs text-(--muted)"> {documentLabels[row.type]} · {formatBrazilDate(row.c | {"/documentos/" + row.id} |
| 181 | button |  <Icon name="search" /> Pesquisar e filtrar {active.length ? ( <span className="ui-badge ui-badge-pending">{active.length}</span> ) : null}  | {() => setShowFilters((current) => !current)} |
| 203 | input | Código ou protocolo <input className={inputClass} value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value }) } placeholder="REQ-0001" />  | Consultar ramo condicional na fonte |
| 214 | select | "Ficha" | Consultar ramo condicional na fonte |
| 239 | select | "Situação" | Consultar ramo condicional na fonte |
| 257 | input | De <input className={inputClass} type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value }) } />  | "date" |
| 268 | input | Até <input className={inputClass} type="date" value={draft.to} min={draft.from} onChange={(event) => setDraft({ ...draft, to: event.target.value }) } />  | "date" |
| 279 | button | Aplicar filtros  | "submit" |
| 282 | button | Limpar  | {() => {                   setFilters(empty);                   setDraft(empty);                   setLoading(true);                 }} |
| 302 | button | {"Remover filtro " + key} | {() => {                   setFilters({ ...filters, [key]: "" });                   setDraft({ ...draft, [key]: "" });                   setLoading(true);                 }} |
| 330 | button | Tentar novamente  | {() => {               setAttempt((value) => value + 1);               setLoading(true);             }} |
| 359 | button | Anterior  | {page <= 1 \|\| loading} |
| 372 | button | Próxima  | {page * 20 >= total \|\| loading} |

Fontes de interface relacionadas: `src/components/documents/document-history.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Filtros persistem na URL; página de 20; filtros removíveis e vazio confirmado.

## Atritos e contraditório

Chips especiais exibem science_required/archive_pending; nomes acessíveis usam chaves search/from/to; total inicial zero antes da resposta.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Labels humanos completos, total somente confirmado, retorno ao filtro e página após abrir documento.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, history](../evidence/b11-adminA-history-390.png): top 1030/1077 source pixels; navegação e leitura, comandos não confirmados.

Volumes extremos e retorno de navegador sob atualização concorrente pendentes.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
