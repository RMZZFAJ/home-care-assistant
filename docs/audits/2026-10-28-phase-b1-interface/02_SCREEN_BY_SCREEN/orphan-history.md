# SC-049 — Histórico REQ aposentado

Rota: `sem rota consumidora` . Situação: UNCONSUMED.
Fonte principal:
[src/components/requisitions/requisition-history.tsx](../../../../src/components/requisitions/requisition-history.tsx)
.

## Intenção e contexto

Registro de compatibilidade da implementação anterior.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 33; **Controle:** input; **Texto/nome ou expressão:** Protocolo
&lt;input value={draft.protocol} onChange={(event) =&gt;
setDraft({...draft,protocol:event.target.value})} placeholder="HC-000012"
className={inputClass} />; **Pré-condição e efeito verificável:** Consultar
ramo condicional na fonte.
- **Linha:** 34; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Todos&lt;/option&gt;
{Object.entries(statusLabels).map((\[key,label\]) => &lt;option key={key}
value={key}&gt;{label}&lt;/option&gt;)}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 35; **Controle:** input; **Texto/nome ou expressão:** De &lt;input
type="date" value={draft.from} onChange={(event) =&gt;
setDraft({...draft,from:event.target.value})} className={inputClass} />;
**Pré-condição e efeito verificável:** "date".
- **Linha:** 36; **Controle:** input; **Texto/nome ou expressão:** Até &lt;input
type="date" value={draft.to} onChange={(event) =&gt;
setDraft({...draft,to:event.target.value})} className={inputClass} />;
**Pré-condição e efeito verificável:** "date".
- **Linha:** 37; **Controle:** button; **Texto/nome ou expressão:** Buscar;
**Pré-condição e efeito verificável:** "submit".
- **Linha:** 40; **Controle:** button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {() => { setLoading(true);
setAttempt((value) => value + 1); }}.
- **Linha:** 42; **Controle:** Link; **Texto/nome ou expressão:**
&lt;div&gt;&lt;p className="font-bold
text-(--brand)"&gt;{row.protocol}&lt;/p&gt;&lt;p className="mt-1
text-sm"&gt;{row.recipient_name_snapshot ??
row.receipt_snapshot?.recipientName ?? displayName(row.care_recipients)} ·
{row.requester_name_sn; **Pré-condição e efeito verificável:**
{`/historico/${row.id}?careRecipientId=${context.patient!.id}`}.
- **Linha:** 43; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page <= 1 || loading}.
- **Linha:** 43; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * rows.pageSize >= rows.total ||
loading}.

Fontes de interface relacionadas:
`src/components/requisitions/requisition-history.tsx` ,
`src/components/workspace.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Código preserva conceitos de protocolo, filtro e autorização sem executar nova
rota.

## Atritos e contraditório

Sem importador ativo encontrado; manter duas implementações pode confundir
manutenção e auditoria.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Catalogar como aposentado; eventual remoção é decisão técnica futura com
pesquisa de consumidores externos.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

A primeira passada não tinha renderização desta variante; o estado final e as
lacunas estão abaixo.

Não renderizado porque não há consumidor demonstrado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-049.

Sem captura correspondente ao objeto/overlay exato; leitura estática não é
aprovação visual.

Campos deste consumidor: FLD-0145; FLD-0146; FLD-0147; FLD-0148. Controles de
ação relacionados: 9 callsites; inventário canônico em ACTION_CONTROLS.csv. Não
são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
