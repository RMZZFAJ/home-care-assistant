# SC-036 — Perfil e segurança

Rota: `/perfil` . Situação: ACTIVE.
Fonte principal:
[src/components/profile-console.tsx](../../../../src/components/profile-console.tsx)
.

## Intenção e contexto

Editar identidade, contatos, senha, preferências e sessões.

Perfis/capacidades: identidade autenticada. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 161; **Controle:** input; **Texto/nome ou expressão:** Nome
&lt;input className={inputClass} name="name" defaultValue={profile.full_name}
minLength={2} maxLength={160} required autoComplete="name" /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 173; **Controle:** input; **Texto/nome ou expressão:** Categoria
profissional &lt;input className={inputClass} name="category"
defaultValue={profile.professional_category ?? ""} maxLength={80} /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 182; **Controle:** input; **Texto/nome ou expressão:** Registro
profissional &lt;input className={inputClass} name="registration"
defaultValue={profile.professional_registration ?? ""} maxLength={30} /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 191; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Não informado&lt;/option&gt; {"AC AL AP AM BA CE DF ES GO MA MT MS
MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO" .split(" ") .map((state) => (
&lt;option key={state}&gt;{state}&lt;/option&gt; ))}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 217; **Controle:** input; **Texto/nome ou expressão:** &lt;input
type="checkbox" name={key} defaultChecked={
profile.notification_preferences[key] ?? true } /&gt; {label}; **Pré-condição
e efeito verificável:** "checkbox".
- **Linha:** 257; **Controle:** input; **Texto/nome ou expressão:** &lt;input
name={key} type="checkbox" defaultChecked={
profile.notification_preferences[key] ?? key === "scienceExpress" } /&gt;
{label}; **Pré-condição e efeito verificável:** "checkbox".
- **Linha:** 281; **Controle:** button; **Texto/nome ou expressão:** Salvar
perfil; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 304; **Controle:** input; **Texto/nome ou expressão:** Nova foto
&lt;input className={inputClass} type="file" name="file"
accept="image/jpeg,image/png,image/webp" required /&gt;; **Pré-condição e
efeito verificável:** "file".
- **Linha:** 312; **Controle:** button; **Texto/nome ou expressão:** Salvar
foto; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 326; **Controle:** input; **Texto/nome ou expressão:** Senha atual
&lt;input className={inputClass} name="currentPassword" type="password"
required autoComplete="current-password" /&gt;; **Pré-condição e efeito
verificável:** "password".
- **Linha:** 336; **Controle:** input; **Texto/nome ou expressão:** Nova senha
&lt;input className={inputClass} name="password" type="password"
minLength={12} maxLength={256} required autoComplete="new-password" /&gt;
&lt;span className="text-xs text-(--muted)"&gt; Use pelo menos 12 caracteres.
</sp; **Pré-condição e efeito verificável:** "password".
- **Linha:** 349; **Controle:** button; **Texto/nome ou expressão:** Alterar
senha; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 424; **Controle:** button; **Texto/nome ou expressão:** Encerrar
outras sessões; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/profile-console.tsx` ,
`src/components/forms/settings-section.tsx` , `src/components/ui/primitives.tsx`
, `src/components/workspace.tsx` , `src/components/auth/contact-settings.tsx` ,
`src/components/auth/mfa-settings.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Seções montadas preservam edição local; distingue preferências de permissão;
sessões próprias listadas.

## Atritos e contraditório

Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Entrada direta em preferências, ajuda de senha compatível e recuperação de
consulta sem loading permanente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, profile](../evidence/b11-adminA-profile-390.png): top
1030/1055 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-0](../evidence/b11-supplement-adminA-profile-0.png):
top 1030/2109 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-1](../evidence/b11-supplement-adminA-profile-1.png):
top 1030/1201 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-2](../evidence/b11-supplement-adminA-profile-2.png):
top 1030/1323 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-3](../evidence/b11-supplement-adminA-profile-3.png):
top 1030/1199 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-4](../evidence/b11-supplement-adminA-profile-4.png):
top 1030/1659 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-5](../evidence/b11-supplement-adminA-profile-5.png):
top 1030/12581 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-6](../evidence/b11-supplement-adminA-profile-6.png):
top 1030/2405 source pixels; navegação e leitura, comandos não confirmados.

SMS/Google e alteração de senha não executados; não capturar QR TOTP privado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-024 — "Identidade pessoal"

Componente SettingsSection, origem `src/components/profile-console.tsx:147` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de
permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-025 — "Foto de perfil"

Componente SettingsSection, origem `src/components/profile-console.tsx:286` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de
permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-026 — "Alterar senha"

Componente SettingsSection, origem `src/components/profile-console.tsx:318` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de
permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-027 — "Seus vínculos com pacientes"

Componente SettingsSection, origem `src/components/profile-console.tsx:366` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de
permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-028 — "Sessões autenticadas"

Componente SettingsSection, origem `src/components/profile-console.tsx:404` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres
mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de
permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-036.

11 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [profile](../evidence/b11-adminA-profile-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1055 source pixels.
- [profile-0](../evidence/b11-supplement-adminA-profile-0.png): adminA; 390;
READY. top 1030/2109 source pixels.
- [profile-1](../evidence/b11-supplement-adminA-profile-1.png): adminA; 390;
READY. top 1030/1201 source pixels.
- [profile-2](../evidence/b11-supplement-adminA-profile-2.png): adminA; 390;
READY. top 1030/1323 source pixels.
- [profile-3](../evidence/b11-supplement-adminA-profile-3.png): adminA; 390;
READY. top 1030/1199 source pixels.
- [profile-4](../evidence/b11-supplement-adminA-profile-4.png): adminA; 390;
READY. top 1030/1659 source pixels.
- [profile-5](../evidence/b11-supplement-adminA-profile-5.png): adminA; 390;
READY. top 1030/12581 source pixels.
- [profile-6](../evidence/b11-supplement-adminA-profile-6.png): adminA; 390;
READY. top 1030/2405 source pixels.
- [profile-390](../evidence/b12-visual-adminA-profile-390.png): adminA; 390;
READY. top 844 of 844px; scaled to 360x650.
- [profile-1440](../evidence/b12-visual-adminA-profile-1440.png): adminA; 1440;
READY. top 950 of 1000px; scaled to 360x650.
- [profile-error](../evidence/b14-recovery-adminA-profile-error.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0073; FLD-0074; FLD-0075; FLD-0078; FLD-0135;
FLD-0136; FLD-0137; FLD-0138; FLD-0139; FLD-0140; FLD-0141; FLD-0142; FLD-0143.
Controles de ação relacionados: 7 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-NAV-001](../12_FINDINGS_MASTER.md#b1-nav-001) —
Alguns nomes de destino não correspondem à tarefa aberta;
[B1-STATE-001](../12_FINDINGS_MASTER.md#b1-state-001) — Consultas sem estado
próprio afirmam vazio/configuração ausente antes do resultado;
[B1-FORM-003](../12_FINDINGS_MASTER.md#b1-form-003) — Ajuda e teto de senha nova
variam entre cadastro e perfil.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
