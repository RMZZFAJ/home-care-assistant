# SC-003 — Nova senha

Rota: `/recuperar-senha` . Situação: ACTIVE.
Fonte principal:
[src/components/auth/password-recovery-form.tsx](../../../../src/components/auth/password-recovery-form.tsx)
.

## Intenção e contexto

Definir senha pelo link de recuperação ou ativação.

Perfis/capacidades: público com sessão de recuperação. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 67; **Controle:** Link; **Texto/nome ou expressão:** Acessar o
sistema; **Pré-condição e efeito verificável:** "/".
- **Linha:** 78; **Controle:** input; **Texto/nome ou expressão:** Nova senha
&lt;input className="mt-1 w-full rounded border p-3" type="password"
disabled={!ready || busy} autoComplete="new-password" minLength={12}
maxLength={72} required value={password} onChange={(event) =&gt; setPasswor;
**Pré-condição e efeito verificável:** {!ready || busy}.
- **Linha:** 92; **Controle:** input; **Texto/nome ou expressão:** Confirmar
nova senha &lt;input className="mt-1 w-full rounded border p-3"
type="password" disabled={!ready || busy} autoComplete="new-password" required
value={confirmation} onChange={(event) =&gt; setConfirmation(event.targ;
**Pré-condição e efeito verificável:** {!ready || busy}.
- **Linha:** 107; **Controle:** button; **Texto/nome ou expressão:** {busy ?
"Atualizando..." : "Salvar nova senha"}; **Pré-condição e efeito
verificável:** {busy || !ready}.
- **Linha:** 115; **Controle:** Link; **Texto/nome ou expressão:** Voltar ao
login; **Pré-condição e efeito verificável:** "/login".

Fontes de interface relacionadas:
`src/components/auth/password-recovery-form.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Confirmação de senha e sessão no Auth; não grava sem usuário.

## Atritos e contraditório

Requisitos aparecem após erro, aparência difere do login e não informa antes o
teto em bytes para acentos.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Ajuda prévia curta de 12 caracteres e limite; validação associada a cada campo;
preservar senha durante erro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, recovery](../evidence/b11-public-recovery-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.

Não alterar senha das fixtures nesta etapa de inventário.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-003.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [recovery](../evidence/b11-public-recovery-390.png): public; 390;
READY_VIEW_STATE. top 844/844 source pixels.

Campos deste consumidor: FLD-0079; FLD-0080. Controles de ação relacionados: 6
callsites; inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos
executados.

Diagnósticos associados: [B1-FORM-003](../12_FINDINGS_MASTER.md#b1-form-003) —
Ajuda e teto de senha nova variam entre cadastro e perfil.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
