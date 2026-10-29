# SC-004 — Aceite de convite

Rota: `/convites/aceitar`. Situação: ACTIVE.
Fonte principal: [src/components/admin/accept-invitation.tsx](../../../../src/components/admin/accept-invitation.tsx).

## Intenção e contexto

Criar conta pessoal e decidir vínculo local.

Perfis/capacidades: destinatário do convite. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 102 | Link | Abrir Home Care Assistant  | "/" |
| 114 | Link | Entrar com minha conta  | "/login?next=%2Fconvites%2Faceitar" |
| 120 | button |  {busy ? "Confirmando…" : "Aceitar convite com minha conta"}  | {busy} |
| 127 | button | Recusar convite  | {busy} |
| 143 | input | Nome <input className={inputClass} name="fullName" autoComplete="name" minLength={2} maxLength={160} required />  | Consultar ramo condicional na fonte |
| 154 | input | E-mail do convite <input className={inputClass} name="email" type="email" autoComplete="email" required />  | "email" |
| 164 | input | Senha pessoal <input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required />  | "password" |
| 174 | button |  {busy ? "Registrando…" : "Criar minha conta"}  | {busy} |

Fontes de interface relacionadas: `src/components/admin/accept-invitation.tsx`, `src/components/workspace.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Token removido da URL; aceite/recusa explícitos; vínculo depende de validação do servidor.

## Atritos e contraditório

Tela de aceite não informa paciente, função, emissor ou validade antes da decisão; texto se concentra em como o servidor valida.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Prévia autorizada com paciente, função e prazo; mostrar conta atual; orientação para trocar conta sem perder convite.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, invite-missing](../evidence/b11-public-invite-missing-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, invite-token-present](../evidence/b11-followup-public-invite-token-present.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Convite válido será exercitado sem confirmar vínculo real; não registrar tokens em capturas.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
