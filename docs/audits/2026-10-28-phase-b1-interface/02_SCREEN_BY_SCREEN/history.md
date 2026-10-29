# SC-007 — Histórico de fichas

Rota: `/historico` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/document-history.tsx](../../../../src/components/documents/document-history.tsx)
.

## Intenção e contexto

Encontrar documentos por tipo, situação, código, período e página.

Perfis/capacidades: req/com/ent/bal.read. O menu não concede autoridade; sessão,
API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 41; **Controle:** Link; **Texto/nome ou expressão:** &lt;span
className="document-type"&gt;{row.type}&lt;/span&gt; &lt;span
className="min-w-0"&gt; &lt;strong&gt;{row.code ?? "Rascunho"}&lt;/strong&gt;
&lt;span className="block text-xs text-(--muted)"&gt;
{documentLabels[row.type]} · {formatBrazilDate(row.c; **Pré-condição e efeito
verificável:** {"/documentos/" + row.id}.
- **Linha:** 181; **Controle:** button; **Texto/nome ou expressão:** &lt;Icon
name="search" /&gt; Pesquisar e filtrar {active.length ? ( &lt;span
className="ui-badge ui-badge-pending"&gt;{active.length}&lt;/span&gt; ) :
null}; **Pré-condição e efeito verificável:** {() => setShowFilters((current)
=> !current)}.
- **Linha:** 203; **Controle:** input; **Texto/nome ou expressão:** Código ou
protocolo &lt;input className={inputClass} value={draft.search}
onChange={(event) =&gt; setDraft({ ...draft, search: event.target.value }) }
placeholder="REQ-0001" />; **Pré-condição e efeito verificável:** Consultar
ramo condicional na fonte.
- **Linha:** 214; **Controle:** select; **Texto/nome ou expressão:** "Ficha";
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 239; **Controle:** select; **Texto/nome ou expressão:** "Situação";
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 257; **Controle:** input; **Texto/nome ou expressão:** De &lt;input
className={inputClass} type="date" value={draft.from} onChange={(event) =&gt;
setDraft({ ...draft, from: event.target.value }) } />; **Pré-condição e efeito
verificável:** "date".
- **Linha:** 268; **Controle:** input; **Texto/nome ou expressão:** Até
&lt;input className={inputClass} type="date" value={draft.to} min={draft.from}
onChange={(event) =&gt; setDraft({ ...draft, to: event.target.value }) } />;
**Pré-condição e efeito verificável:** "date".
- **Linha:** 279; **Controle:** button; **Texto/nome ou expressão:** Aplicar
filtros; **Pré-condição e efeito verificável:** "submit".
- **Linha:** 282; **Controle:** button; **Texto/nome ou expressão:** Limpar;
**Pré-condição e efeito verificável:** {() => { setFilters(empty);
setDraft(empty); setLoading(true); }}.
- **Linha:** 302; **Controle:** button; **Texto/nome ou expressão:** {"Remover
filtro " + key}; **Pré-condição e efeito verificável:** {() => { setFilters({
...filters, [key]: "" }); setDraft({ ...draft, [key]: "" }); setLoading(true);
}}.
- **Linha:** 330; **Controle:** button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {() => { setAttempt((value)
=> value + 1); setLoading(true); }}.
- **Linha:** 359; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page <= 1 || loading}.
- **Linha:** 372; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * 20 >= total || loading}.

Fontes de interface relacionadas:
`src/components/documents/document-history.tsx` , `src/components/workspace.tsx`
, `src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Filtros persistem na URL; página de 20; filtros removíveis e vazio confirmado.

## Atritos e contraditório

Chips especiais exibem science_required/archive_pending; nomes acessíveis usam
chaves search/from/to; total inicial zero antes da resposta.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Labels humanos completos, total somente confirmado, retorno ao filtro e página
após abrir documento.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, history](../evidence/b11-adminA-history-390.png): top
1030/1077 source pixels; navegação e leitura, comandos não confirmados.

Volumes extremos e retorno de navegador sob atualização concorrente pendentes.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-007.

6 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [history](../evidence/b11-adminA-history-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1077 source pixels.
- [legacy-inventory](../evidence/b11-adminA-legacy-inventory-390.png): adminA;
390; READY_VIEW_STATE. top 1030/1156 source pixels.
- [history-390](../evidence/b12-visual-adminA-history-390.png): adminA; 390;
READY. top 844 of 844px; scaled to 360x650.
- [history-1440](../evidence/b12-visual-adminA-history-1440.png): adminA; 1440;
READY. top 950 of 1000px; scaled to 360x650.

[filter-science_required](../evidence/b13-text-adminA-filter-science_required.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650

[filter-archive_pending](../evidence/b13-text-adminA-filter-archive_pending.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0108; FLD-0109; FLD-0110; FLD-0111; FLD-0112.
Controles de ação relacionados: 12 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-TEXT-001](../12_FINDINGS_MASTER.md#b1-text-001) —
Códigos de filtros, ações e papéis escapam à linguagem humana;
[B1-ERR-002](../12_FINDINGS_MASTER.md#b1-err-002) — Adaptador de erro mistura
recuperação de leitura com resultado incerto de escrita.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
