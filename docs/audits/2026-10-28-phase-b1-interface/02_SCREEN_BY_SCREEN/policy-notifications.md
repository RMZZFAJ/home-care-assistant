# SC-033 — Matriz de notificações

Rota: `/configuracoes?area=notifications` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/notification-matrix.tsx](../../../../src/components/admin/notification-matrix.tsx)
.

## Intenção e contexto

Configurar eventos/funções/canais e opções de comunicação.

Perfis/capacidades: access.manage ou proposta global. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 149; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
eventos de notificação"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 149; **Controle:** Select; **Texto/nome ou expressão:** "Função nas
notificações"; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 152; **Controle:** Checkbox; **Texto/nome ou expressão:**
{documentEventLabel(event) + " · " + label + " · " + channel.label};
**Pré-condição e efeito verificável:** {busy || pending}.
- **Linha:** 152; **Controle:** Button; **Texto/nome ou expressão:** {"Opções de
" + documentEventLabel(event) + " · " + label}; **Pré-condição e efeito
verificável:** {busy || pending}.
- **Linha:** 156; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="optional"&gt; Conforme preferências pessoais &lt;/option&gt; &lt;option
value="required"&gt; Obrigatório no aplicativo &lt;/option&gt; &lt;option
value="silent"&gt; Silencioso no aplicativo &lt;/option&gt;; **Pré-condição e
efeito verificável:** {busy || pending}.
- **Linha:** 176; **Controle:** input; **Texto/nome ou expressão:** &lt;input
type="checkbox" disabled={ busy || pending || event ===
"req.registered_author" } checked={ event !== "req.registered_author" &&
(rule?.include_pdf ?? true) } onChange={(change) =&gt; update(event, role, {
inclu; **Pré-condição e efeito verificável:** { busy || pending || event ===
"req.registered_author" }.
- **Linha:** 195; **Controle:** input; **Texto/nome ou expressão:** Intervalo
mínimo (min) &lt;input type="number" className={inputClass} min={0}
max={10080} disabled={busy || pending} key={rule?.cooldown_minutes ?? 0}
defaultValue={rule?.cooldown_minutes ?? 0} onBlur={(change) =&gt; { if (;
**Pré-condição e efeito verificável:** {busy || pending}.
- **Linha:** 222; **Controle:** select; **Texto/nome ou expressão:** {index ?
"Fim" : "Início"}; **Pré-condição e efeito verificável:** {busy || pending}.

Fontes de interface relacionadas: `src/components/admin/notification-matrix.tsx`
, `src/components/workspace.tsx` , `src/components/admin/admin-fields.tsx` ,
`src/components/ui/primitives.tsx` , `src/components/forms/record-drawer.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Diz salvamento imediato, reconsulta servidor e respeita provedor/consentimento.

## Atritos e contraditório

Ícones representam canais sem legenda persistente no toque; edição otimista com
falha de reconsulta pode conservar aparência não confirmada; blur salva número.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Legenda e estado salvando/confirmado/não confirmado por célula; foco por função;
não converter checkbox em switch mecanicamente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-notifications](../evidence/b11-supplement-adminA-policy-notifications.png)
: top 1030/1187 source pixels; navegação e leitura, comandos não confirmados.

Entrega real e aceitação Meta não inferidas da matriz.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-007 — {documentEventLabel(event) + " · " + label}

Componente RecordDrawer, origem
`src/components/admin/notification-matrix.tsx:153` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Ícones representam canais sem legenda persistente no toque; edição otimista com
falha de reconsulta pode conservar aparência não confirmada; blur salva número.
Preservar: Diz salvamento imediato, reconsulta servidor e respeita
provedor/consentimento.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-033.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

[policy-notifications](../evidence/b11-supplement-adminA-policy-notifications.png)
: adminA; 390; READY. top 1030/1187 source pixels

[notification-rule-editor](../evidence/b18-overlays-adminA-notification-rule-editor.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0034; FLD-0035;
FLD-0036; FLD-0037; FLD-0038; FLD-0039; FLD-0040. Controles de ação
relacionados: 1 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-STATE-001](../12_FINDINGS_MASTER.md#b1-state-001) —
Consultas sem estado próprio afirmam vazio/configuração ausente antes do
resultado.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
