# SC-003 — Nova senha

Rota: `/recuperar-senha`. Situação: ACTIVE.
Fonte principal: [src/components/auth/password-recovery-form.tsx](../../../../src/components/auth/password-recovery-form.tsx).

## Intenção e contexto

Definir senha pelo link de recuperação ou ativação.

Perfis/capacidades: público com sessão de recuperação. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 67 | Link | Acessar o sistema  | "/" |
| 78 | input | Nova senha <input className="mt-1 w-full rounded border p-3" type="password" disabled={!ready \|\| busy} autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPasswor | {!ready \|\| busy} |
| 92 | input | Confirmar nova senha <input className="mt-1 w-full rounded border p-3" type="password" disabled={!ready \|\| busy} autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.targ | {!ready \|\| busy} |
| 107 | button |  {busy ? "Atualizando..." : "Salvar nova senha"}  | {busy \|\| !ready} |
| 115 | Link | Voltar ao login  | "/login" |

Fontes de interface relacionadas: `src/components/auth/password-recovery-form.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Confirmação de senha e sessão no Auth; não grava sem usuário.

## Atritos e contraditório

Requisitos aparecem após erro, aparência difere do login e não informa antes o teto em bytes para acentos.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Ajuda prévia curta de 12 caracteres e limite; validação associada a cada campo; preservar senha durante erro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, recovery](../evidence/b11-public-recovery-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não alterar senha das fixtures nesta etapa de inventário.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
