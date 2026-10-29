# SC-049 — Histórico REQ aposentado

Rota: `sem rota consumidora`. Situação: UNCONSUMED.
Fonte principal: [src/components/requisitions/requisition-history.tsx](../../../../src/components/requisitions/requisition-history.tsx).

## Intenção e contexto

Registro de compatibilidade da implementação anterior.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 33 | input | Protocolo <input value={draft.protocol} onChange={(event) => setDraft({...draft,protocol:event.target.value})} placeholder="HC-000012" className={inputClass} /> | Consultar ramo condicional na fonte |
| 34 | select | <option value="">Todos</option> {Object.entries(statusLabels).map(([key,label]) => <option key={key} value={key}>{label}</option>)} | Consultar ramo condicional na fonte |
| 35 | input | De <input type="date" value={draft.from} onChange={(event) => setDraft({...draft,from:event.target.value})} className={inputClass} /> | "date" |
| 36 | input | Até <input type="date" value={draft.to} onChange={(event) => setDraft({...draft,to:event.target.value})} className={inputClass} /> | "date" |
| 37 | button | Buscar | "submit" |
| 40 | button | Tentar novamente | {() => { setLoading(true); setAttempt((value) => value + 1); }} |
| 42 | Link | <div><p className="font-bold text-(--brand)">{row.protocol}</p><p className="mt-1 text-sm">{row.recipient_name_snapshot ?? row.receipt_snapshot?.recipientName ?? displayName(row.care_recipients)} · {row.requester_name_sn | {`/historico/${row.id}?careRecipientId=${context.patient!.id}`} |
| 43 | button | Anterior | {page <= 1 \|\| loading} |
| 43 | button | Próxima | {page * rows.pageSize >= rows.total \|\| loading} |

Fontes de interface relacionadas: `src/components/requisitions/requisition-history.tsx`, `src/components/workspace.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Código preserva conceitos de protocolo, filtro e autorização sem executar nova rota.

## Atritos e contraditório

Sem importador ativo encontrado; manter duas implementações pode confundir manutenção e auditoria.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Catalogar como aposentado; eventual remoção é decisão técnica futura com pesquisa de consumidores externos.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

Não renderizado porque não há consumidor demonstrado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
