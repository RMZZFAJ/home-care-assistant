# SC-004 — Aceite de convite

Rota: `/convites/aceitar` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/accept-invitation.tsx](../../../../src/components/admin/accept-invitation.tsx)
.

## Intenção e contexto

Criar conta pessoal e decidir vínculo local.

Perfis/capacidades: destinatário do convite. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 102; **Controle:** Link; **Texto/nome ou expressão:** Abrir Home
Care Assistant; **Pré-condição e efeito verificável:** "/".
- **Linha:** 114; **Controle:** Link; **Texto/nome ou expressão:** Entrar com
minha conta; **Pré-condição e efeito verificável:**
"/login?next=%2Fconvites%2Faceitar".
- **Linha:** 120; **Controle:** button; **Texto/nome ou expressão:** {busy ?
"Confirmando…" : "Aceitar convite com minha conta"}; **Pré-condição e efeito
verificável:** {busy}.
- **Linha:** 127; **Controle:** button; **Texto/nome ou expressão:** Recusar
convite; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 143; **Controle:** input; **Texto/nome ou expressão:** Nome
&lt;input className={inputClass} name="fullName" autoComplete="name"
minLength={2} maxLength={160} required /&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 154; **Controle:** input; **Texto/nome ou expressão:** E-mail do
convite &lt;input className={inputClass} name="email" type="email"
autoComplete="email" required /&gt;; **Pré-condição e efeito verificável:**
"email".
- **Linha:** 164; **Controle:** input; **Texto/nome ou expressão:** Senha
pessoal &lt;input className={inputClass} name="password" type="password"
autoComplete="new-password" minLength={12} maxLength={72} required /&gt;;
**Pré-condição e efeito verificável:** "password".
- **Linha:** 174; **Controle:** button; **Texto/nome ou expressão:** {busy ?
"Registrando…" : "Criar minha conta"}; **Pré-condição e efeito verificável:**
{busy}.

Fontes de interface relacionadas: `src/components/admin/accept-invitation.tsx` ,
`src/components/workspace.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Token removido da URL; aceite/recusa explícitos; vínculo depende de validação do
servidor.

## Atritos e contraditório

Tela de aceite não informa paciente, função, emissor ou validade antes da
decisão; texto se concentra em como o servidor valida.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Prévia autorizada com paciente, função e prazo; mostrar conta atual; orientação
para trocar conta sem perder convite.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, invite-missing](../evidence/b11-public-invite-missing-390.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, invite-token-present](../evidence/b11-followup-public-invite-token-present.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Convite válido será exercitado sem confirmar vínculo real; não registrar tokens
em capturas.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-004.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [invite-missing](../evidence/b11-public-invite-missing-390.png): public; 390;
READY_VIEW_STATE. top 844/844 source pixels.

[invite-token-present](../evidence/b11-followup-public-invite-token-present.png)
: public; 390; READY. top 844/844 source pixels.

Campos deste consumidor: FLD-0001; FLD-0002; FLD-0003. Controles de ação
relacionados: 6 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-UX-004](../12_FINDINGS_MASTER.md#b1-ux-004) —
Aceite de convite carece de prévia do vínculo;
[B1-FORM-003](../12_FINDINGS_MASTER.md#b1-form-003) — Ajuda e teto de senha nova
variam entre cadastro e perfil.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
