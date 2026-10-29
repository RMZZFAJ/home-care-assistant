# SC-002 — Acesso

Rota: `/login`. Situação: ACTIVE.
Fonte principal: [src/components/auth/login-form.tsx](../../../../src/components/auth/login-form.tsx).

## Intenção e contexto

Entrar, recuperar acesso ou iniciar OAuth.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 142 | Input | <Input id="login-email" name="email" required disabled={!ready \|\| loading} type="email" autoComplete="email" value={email} onChange={(_, data) => setEmail(data.value)} size="large" /> | {!ready \|\| loading} |
| 143 | Input | <Input id="login-password" name="password" required disabled={!ready \|\| loading} type="password" autoComplete="current-password" value={password} onChange={(_, data) => setPassword(data.value)} size="large" /> | {!ready \|\| loading} |
| 146 | Button | {loading ? "Entrando..." : "Entrar"} | {loading \|\| !ready} |
| 147 | Button | Esqueci minha senha | {loading \|\| !ready} |
| 149 | Button | Continuar com Google | {loading \|\| !ready} |

Fontes de interface relacionadas: `src/components/auth/login-form.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Labels associados, autocomplete, guarda de hidratação, erros humanos de credencial e limite.

## Atritos e contraditório

Google aparece mesmo sem provedor; recuperação exige e-mail mas botão não demonstra validação de formato; detalhe Supabase chega ao usuário em configuração ausente.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Explicar indisponibilidade do canal e oferecer caminho de entrada funcional; manter privacidade da confirmação de recuperação.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, login](../evidence/b11-public-login-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

OAuth e entrega SMTP reais não executados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
