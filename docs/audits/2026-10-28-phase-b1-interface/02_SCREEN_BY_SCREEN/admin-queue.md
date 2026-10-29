# SC-027 — Fila de notificações

Rota: `/admin?section=notifications` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/notification-settings.tsx](../../../../src/components/admin/notification-settings.tsx)
.

## Intenção e contexto

Acompanhar falha/pendência e decidir reprocessamento.

Perfis/capacidades: access.manage; processamento global se permitido. O menu não
concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 11; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione&lt;/option&gt; {members.filter((member) => member.status
=== "active").map((member) => &lt;option key={String(member.user_id)}
value={String(member.user_id)}&gt;{String(member.full_name)}&lt;/option&gt;)};
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 11; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="supervision"&gt;Supervisão&lt;/option&gt; &lt;option
value="care_team"&gt;Equipe de cuidado&lt;/option&gt; &lt;option
value="family"&gt;Família&lt;/option&gt; &lt;option
value="other"&gt;Outro&lt;/option&gt;; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 11; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="internal"&gt;Interno&lt;/option&gt; &lt;option
value="whatsapp"&gt;WhatsApp&lt;/option&gt; &lt;option
value="email"&gt;E-mail&lt;/option&gt;; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 11; **Controle:** input; **Texto/nome ou expressão:** Destino
externo (vazio para interno) &lt;input name="destination"
className={inputClass} /&gt;; **Pré-condição e efeito verificável:** Consultar
ramo condicional na fonte.
- **Linha:** 11; **Controle:** input; **Texto/nome ou expressão:** &lt;input
className="h-5 w-5" type="checkbox" name="isEnabled" defaultChecked /&gt;
Destinatário habilitado; **Pré-condição e efeito verificável:** "checkbox".
- **Linha:** 11; **Controle:** input; **Texto/nome ou expressão:** &lt;input
className="h-5 w-5" type="checkbox" name="includeTeamAlerts" /&gt; Família:
receber também alertas da equipe; **Pré-condição e efeito verificável:**
"checkbox".
- **Linha:** 11; **Controle:** button; **Texto/nome ou expressão:** Salvar
destinatário; **Pré-condição e efeito verificável:** "submit".
- **Linha:** 15; **Controle:** button; **Texto/nome ou expressão:** Processar
tarefas pendentes; **Pré-condição e efeito verificável:** {() => void
execute({action:"process",limit:25},"Lote processado. Os estados abaixo
refletem os resultados registrados.")}.
- **Linha:** 15; **Controle:** button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {() => void
execute({action:"retry",notificationId:row.id},"Notificação recolocada na
fila.")}.
- **Linha:** 15; **Controle:** button; **Texto/nome ou expressão:** Confirmar
conciliação e tentar novamente; **Pré-condição e efeito verificável:** {() =>
{ if (window.confirm("Confirme: consultei o provedor, a mensagem não foi
aceita e autorizo outra tentativa.")) void
execute({action:"retry",notificationId:row.id,confirmUncertain:true},"Nova te.

Fontes de interface relacionadas:
`src/components/admin/notification-settings.tsx` ,
`src/components/workspace.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Resultado incerto exige consulta do provedor e confirmação específica antes do
retry.

## Atritos e contraditório

Estado/last_error brutos e sem rótulo do documento; confirmação nativa difere de
Fluent; regra do último resultado não tem reconsulta externa própria na tela.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Tabela com documento/canal/destinatário/resultado seguro e CTA por estado;
manter barreira contra reenvio incerto.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-queue](../evidence/b11-supplement-adminA-admin-queue.png)
: top 1030/2649 source pixels; navegação e leitura, comandos não confirmados.

Não clicar processamento/retry de fila existente: pode alterar dados sintéticos
de outras provas.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-027.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-queue](../evidence/b11-supplement-adminA-admin-queue.png): adminA;
390; READY. top 1030/2649 source pixels.

Campos deste consumidor: FLD-0041; FLD-0042; FLD-0043; FLD-0044; FLD-0045;
FLD-0046. Controles de ação relacionados: 5 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
