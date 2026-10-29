# SC-026 — Destinatários

Rota: `/admin?section=notificationRecipients`. Situação: ACTIVE.
Fonte principal: [src/components/admin/notification-settings.tsx](../../../../src/components/admin/notification-settings.tsx).

## Intenção e contexto

Associar conta, grupo, canal e destino habilitado.

Perfis/capacidades: access.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 11 | select | <option value="">Selecione</option> {members.filter((member) => member.status === "active").map((member) => <option key={String(member.user_id)} value={String(member.user_id)}>{String(member.full_name)}</option>)} | Consultar ramo condicional na fonte |
| 11 | select | <option value="supervision">Supervisão</option> <option value="care_team">Equipe de cuidado</option> <option value="family">Família</option> <option value="other">Outro</option> | Consultar ramo condicional na fonte |
| 11 | select | <option value="internal">Interno</option> <option value="whatsapp">WhatsApp</option> <option value="email">E-mail</option> | Consultar ramo condicional na fonte |
| 11 | input | Destino externo (vazio para interno) <input name="destination" className={inputClass} /> | Consultar ramo condicional na fonte |
| 11 | input | <input className="h-5 w-5" type="checkbox" name="isEnabled" defaultChecked /> Destinatário habilitado | "checkbox" |
| 11 | input | <input className="h-5 w-5" type="checkbox" name="includeTeamAlerts" /> Família: receber também alertas da equipe | "checkbox" |
| 11 | button | Salvar destinatário | "submit" |
| 15 | button | Processar tarefas pendentes | {() => void execute({action:"process",limit:25},"Lote processado. Os estados abaixo refletem os resultados registrados.")} |
| 15 | button | Tentar novamente | {() => void execute({action:"retry",notificationId:row.id},"Notificação recolocada na fila.")} |
| 15 | button | Confirmar conciliação e tentar novamente | {() => { if (window.confirm("Confirme: consultei o provedor, a mensagem não foi aceita e autorizo outra tentativa.")) void execute({action:"retry",notificationId:row.id,confirmUncertain:true},"Nova te |

Fontes de interface relacionadas: `src/components/admin/notification-settings.tsx`, `src/components/workspace.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Conta exige vínculo ativo; provedores dependem configuração.

## Atritos e contraditório

Destino externo é texto mesmo para canal interno; rótulos de grupo/canal raw na lista; estado vazio antes do load.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Campo condicional por canal e formato; labels humanos e distinção de contato verificado; manter autorização no servidor.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-recipients](../evidence/b11-supplement-adminA-admin-recipients.png): top 965/965 source pixels; navegação e leitura, comandos não confirmados.

Não enviar mensagens nem presumir destino digitado como identidade verificada.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
