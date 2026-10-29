# SC-015 — Acompanhamento BAL

Rota: `/balancos`. Situação: ACTIVE.
Fonte principal: [src/components/balances/balance-console.tsx](../../../../src/components/balances/balance-console.tsx).

## Intenção e contexto

Reconhecer obrigação, responsável, janela, atraso, revisão e próxima ação.

Perfis/capacidades: bal.read; família decide adiamento. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 40 | Button | Recuperar a mesma tentativa | {busy} |
| 41 | Button | Tentar novamente | {reload} |
| 48 | Button | Configurar dia e plantão | {!data.types.some(t => t.is_active)} |
| 48 | Link | Nova contagem | "/fichas/bal" |
| 48 | Link | Consultar escala | "/escalas" |
| 48 | Link | Histórico de fichas BAL | "/historico?type=BAL" |
| 52 | Link | Fazer balanço | {"/fichas/bal" + (data.eligibility.documentId ? "?documentId=" + data.eligibility.documentId + (a.kind === "recount" ? "&recount=true" : "") : "")} |
| 52 | Button | {approve ? "Adiar com decisão familiar" : "Solicitar adiamento"} | {e => open({ kind: "defer", family: approve }, e.currentTarget)} |
| 52 | Button | Resolver atribuição | {e => open({ kind: "assign", cycleId: cycle,allowDeferral:approve }, e.currentTarget)} |
| 53 | Button | Aprovar adiamento | {e => open({ kind: "decide", deferral: d, approve: true }, e.currentTarget)} |
| 53 | Button | Rejeitar adiamento | {e => open({ kind: "decide", deferral: d, approve: false }, e.currentTarget)} |
| 54 | Link | Abrir BAL | {"/documentos/" + (o.count_document_id ?? o.regularized_by)} |
| 55 | Link | {d.code} · consultar revisão | {"/documentos/" + d.id} |
| 55 | Button | Designar reconto | {e => open({ kind: "recount", documentId: d.id, version: d.version, code: d.code ?? "BAL" }, e.currentTarget)} |
| 59 | Button | Voltar | {busy \|\| uncertain} |
| 59 | Button | {uncertain ? "Recuperar confirmação" : "Confirmar decisão"} | {busy} |

Fontes de interface relacionadas: `src/components/balances/balance-console.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/balances/balance-forms.tsx`, `src/components/balances/use-balance-workspace.ts`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Prazos originais preservados; pedido não suspende prazo; links de ficha e escala; nenhum responsável inferido em ambiguidade.

## Atritos e contraditório

Confirmações de destino/adiamento repetem motivo mas não plantão selecionado; dado now capturado na montagem pode afetar frase temporal.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Mostrar responsável e janela anterior/nova em cada decisão; diferenciar consulta atualizando de tempo da última leitura.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, balances](../evidence/b11-adminA-balances-390.png): top 909/909 source pixels; navegação e leitura, comandos não confirmados.

A regra de prazo permanece no banco; UI temporal não concede elegibilidade.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-013 — {editor.kind === "configure" ? "Programação do BAL" : editor.kind === "decide" ? "Decisão familiar" : editor.kind === "recount" ? "Designar reconto" : editor.kind === "assign" ? "Resolver atribuição" : "Adiamento do BAL"}

Componente RecordDrawer, origem `src/components/balances/balance-console.tsx:58`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmações de destino/adiamento repetem motivo mas não plantão selecionado; dado now capturado na montagem pode afetar frase temporal.
Preservar: Prazos originais preservados; pedido não suspende prazo; links de ficha e escala; nenhum responsável inferido em ambiguidade.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-014 — "Revisar decisão do balanço"

Componente Dialog, origem `src/components/balances/balance-console.tsx:59`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo true.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmações de destino/adiamento repetem motivo mas não plantão selecionado; dado now capturado na montagem pode afetar frase temporal.
Preservar: Prazos originais preservados; pedido não suspende prazo; links de ficha e escala; nenhum responsável inferido em ambiguidade.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
