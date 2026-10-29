# SC-036 — Perfil e segurança

Rota: `/perfil`. Situação: ACTIVE.
Fonte principal: [src/components/profile-console.tsx](../../../../src/components/profile-console.tsx).

## Intenção e contexto

Editar identidade, contatos, senha, preferências e sessões.

Perfis/capacidades: identidade autenticada. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 161 | input | Nome <input className={inputClass} name="name" defaultValue={profile.full_name} minLength={2} maxLength={160} required autoComplete="name" />  | Consultar ramo condicional na fonte |
| 173 | input | Categoria profissional <input className={inputClass} name="category" defaultValue={profile.professional_category ?? ""} maxLength={80} />  | Consultar ramo condicional na fonte |
| 182 | input | Registro profissional <input className={inputClass} name="registration" defaultValue={profile.professional_registration ?? ""} maxLength={30} />  | Consultar ramo condicional na fonte |
| 191 | select |  <option value="">Não informado</option> {"AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO" .split(" ") .map((state) => ( <option key={state}>{state}</option> ))}  | Consultar ramo condicional na fonte |
| 217 | input |  <input type="checkbox" name={key} defaultChecked={ profile.notification_preferences[key] ?? true } /> {label}  | "checkbox" |
| 257 | input |  <input name={key} type="checkbox" defaultChecked={ profile.notification_preferences[key] ?? key === "scienceExpress" } /> {label}  | "checkbox" |
| 281 | button | Salvar perfil  | {busy} |
| 304 | input | Nova foto <input className={inputClass} type="file" name="file" accept="image/jpeg,image/png,image/webp" required />  | "file" |
| 312 | button | Salvar foto  | {busy} |
| 326 | input | Senha atual <input className={inputClass} name="currentPassword" type="password" required autoComplete="current-password" />  | "password" |
| 336 | input | Nova senha <input className={inputClass} name="password" type="password" minLength={12} maxLength={256} required autoComplete="new-password" /> <span className="text-xs text-(--muted)"> Use pelo menos 12 caracteres. </sp | "password" |
| 349 | button | Alterar senha  | {busy} |
| 424 | button | Encerrar outras sessões  | {busy} |

Fontes de interface relacionadas: `src/components/profile-console.tsx`, `src/components/forms/settings-section.tsx`, `src/components/ui/primitives.tsx`, `src/components/workspace.tsx`, `src/components/auth/contact-settings.tsx`, `src/components/auth/mfa-settings.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.

## Atritos e contraditório

Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Entrada direta em preferências, ajuda de senha compatível e recuperação de consulta sem loading permanente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, profile](../evidence/b11-adminA-profile-390.png): top 1030/1055 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-0](../evidence/b11-supplement-adminA-profile-0.png): top 1030/2109 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-1](../evidence/b11-supplement-adminA-profile-1.png): top 1030/1201 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-2](../evidence/b11-supplement-adminA-profile-2.png): top 1030/1323 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-3](../evidence/b11-supplement-adminA-profile-3.png): top 1030/1199 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-4](../evidence/b11-supplement-adminA-profile-4.png): top 1030/1659 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-5](../evidence/b11-supplement-adminA-profile-5.png): top 1030/12581 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, profile-6](../evidence/b11-supplement-adminA-profile-6.png): top 1030/2405 source pixels; navegação e leitura, comandos não confirmados.

SMS/Google e alteração de senha não executados; não capturar QR TOTP privado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-024 — "Identidade pessoal"

Componente SettingsSection, origem `src/components/profile-console.tsx:147`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-025 — "Foto de perfil"

Componente SettingsSection, origem `src/components/profile-console.tsx:286`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-026 — "Alterar senha"

Componente SettingsSection, origem `src/components/profile-console.tsx:318`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-027 — "Seus vínculos com pacientes"

Componente SettingsSection, origem `src/components/profile-console.tsx:366`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-028 — "Sessões autenticadas"

Componente SettingsSection, origem `src/components/profile-console.tsx:404`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Preferências ficam dentro de Identidade pessoal; senha permite 256 caracteres mas Auth aceita 72 bytes; erro inicial deixa Carregando perfil junto do erro.
Preservar: Seções montadas preservam edição local; distingue preferências de permissão; sessões próprias listadas.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
