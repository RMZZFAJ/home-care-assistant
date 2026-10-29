# SC-002 — Acesso

Rota: `/login` . Situação: ACTIVE.
Fonte principal:
[src/components/auth/login-form.tsx](../../../../src/components/auth/login-form.tsx)
.

## Intenção e contexto

Entrar, recuperar acesso ou iniciar OAuth.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 142; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
id="login-email" name="email" required disabled={!ready || loading}
type="email" autoComplete="email" value={email} onChange={(_, data) =&gt;
setEmail(data.value)} size="large" />; **Pré-condição e efeito verificável:**
{!ready || loading}.
- **Linha:** 143; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
id="login-password" name="password" required disabled={!ready || loading}
type="password" autoComplete="current-password" value={password} onChange={(_,
data) =&gt; setPassword(data.value)} size="large" />; **Pré-condição e efeito
verificável:** {!ready || loading}.
- **Linha:** 146; **Controle:** Button; **Texto/nome ou expressão:** {loading ?
"Entrando..." : "Entrar"}; **Pré-condição e efeito verificável:** {loading ||
!ready}.
- **Linha:** 147; **Controle:** Button; **Texto/nome ou expressão:** Esqueci
minha senha; **Pré-condição e efeito verificável:** {loading || !ready}.
- **Linha:** 149; **Controle:** Button; **Texto/nome ou expressão:** Continuar
com Google; **Pré-condição e efeito verificável:** {loading || !ready}.

Fontes de interface relacionadas: `src/components/auth/login-form.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Labels associados, autocomplete, guarda de hidratação, erros humanos de
credencial e limite.

## Atritos e contraditório

Google aparece mesmo sem provedor; recuperação exige e-mail mas botão não
demonstra validação de formato; detalhe Supabase chega ao usuário em
configuração ausente.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Explicar indisponibilidade do canal e oferecer caminho de entrada funcional;
manter privacidade da confirmação de recuperação.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, login](../evidence/b11-public-login-390.png): top 844/844
source pixels; navegação e leitura, comandos não confirmados.

OAuth e entrega SMTP reais não executados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-002.

3 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [login](../evidence/b11-public-login-390.png): public; 390; READY_VIEW_STATE.
top 844/844 source pixels.
- [callback-invalid](../evidence/b11-followup-public-callback-invalid.png):
public; 390; ERROR_BLOCKED. top 844/844 source pixels.
- [login-keyboard](../evidence/b18-followup-public-login-keyboard.png): public;
390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0076; FLD-0077. Controles de ação relacionados: 4
callsites; inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos
executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
