# SC-034 — Pessoas e propostas

Rota: `/configuracoes?area=people`. Situação: ACTIVE.
Fonte principal: [src/components/admin/policy-console.tsx](../../../../src/components/admin/policy-console.tsx).

## Intenção e contexto

Alterar função e decidir propostas de configuração.

Perfis/capacidades: admin local distinto decide proposta global. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 235 | input | "Convite aprovado" | Consultar ramo condicional na fonte |
| 244 | Button | {label} | {(event) => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && event.button === 0) { event.preventDefault(); setTab(area); } }} |
| 283 | select |  {data.directory.map((person) => ( <option key={person.id} value={person.id}> {person.name} </option> ))}  | Consultar ramo condicional na fonte |
| 293 | select |  {Object.entries(roles).map(([key, label]) => ( <option key={key} value={key}> {label} </option> ))}  | Consultar ramo condicional na fonte |
| 301 | button | Registrar alteração  | {busy} |
| 332 | button | Aprovar proposta  | {busy} |
| 346 | button | Rejeitar  | {busy} |

Fontes de interface relacionadas: `src/components/admin/policy-console.tsx`, `src/components/workspace.tsx`, `src/components/admin/permission-matrix.tsx`, `src/components/ui/primitives.tsx`, `src/components/admin/admin-fields.tsx`, `src/components/admin/notification-matrix.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/admin/policy-rules.tsx`, `src/components/admin/reminder-settings.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Servidor exige contexto, versão e pessoa distinta; aceite futuro não concede vínculo antecipadamente.

## Atritos e contraditório

JSON e kind expostos; ação Aprovar não tem resumo humano; mensagem nenhuma proposta pendente pode coexistir com awaiting_acceptance.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Diff de negócio com nomes autorizados, antes/depois e estado Aguardando aceite; contador por responsabilidade.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-people](../evidence/b11-supplement-adminA-policy-people.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não aprovar proposta existente apenas para produzir captura.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
