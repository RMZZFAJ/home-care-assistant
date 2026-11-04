# Identidade, convites, vínculo e revogação

AS_IS: /login, /recuperar-senha, /perfil, /convites/aceitar, /admin e seleção
de contexto no shell. Auth oficial controla credenciais; profiles, memberships
e authority_sessions controlam papel/capacidade. B3-021 separa API negada de
escrita direta de perfil/avatar ainda possível com JWT de sessão encerrada.
TO_BE DEC-001/006/021/022/028, P01/P11/P15 e contratos atuais preservados.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ID-01

  **Rota e situação:** /login e /recuperar-senha, atuais

  **Objetivo e ações:** Login, recuperação, confirmação e retorno seguro; não
  vazar existência de conta.

- **Tela:** ID-02

  **Rota e situação:** /perfil, atual a alterar

  **Objetivo e ações:** Dados próprios, contatos, senha, MFA, sessões e
  preferências; estado por operação.

- **Tela:** ID-03

  **Rota e situação:** /convites/aceitar, atual a alterar

  **Objetivo e ações:** Prévia mínima segura e aceite pela conta correta;
  cadastro pessoal e confirmação.

- **Tela:** ID-04

  **Rota e situação:** /admin vínculo/convite, atual a alterar

  **Objetivo e ações:** Convidar, editar vínculo da pessoa, revogar e
  inventariar tarefas.

- **Tela:** ID-05

  **Rota e situação:** Troca de contexto, atual a preservar

  **Objetivo e ações:** Escolher paciente ou modo global explicitamente e
  revalidar capacidades.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** E-mail de acesso

  **Tipo/origem:** Texto do titular

  **Obrigatório e default:** Sim no login/convite

  **Validação/unidade:** Formato, até 254; confirmação pelo Auth para aceite

  **Ajuda e exemplo:** “<pessoa.exemplo@dominio.test>”, fictício.

- **Campo:** Senha atual

  **Tipo/origem:** Segredo do titular

  **Obrigatório e default:** Só reautenticação aplicável

  **Validação/unidade:** Nunca logar/exportar; password manager permitido

  **Ajuda e exemplo:** Não preencher por administrador.

- **Campo:** Nova senha

  **Tipo/origem:** Segredo do titular

  **Obrigatório e default:** Só cadastro/troca

  **Validação/unidade:** Contrato atual: mínimo 12 caracteres e máximo 72 bytes
  UTF-8; ajuda consistente

  **Ajuda e exemplo:** Erro explica limite sem repetir valor.

- **Campo:** Nome pessoal

  **Tipo/origem:** Texto do titular

  **Obrigatório e default:** Sim

  **Validação/unidade:** 2–160 caracteres

  **Ajuda e exemplo:** Pessoa identificável; nome não concede capacidade.

- **Campo:** Registro/função profissional

  **Tipo/origem:** Texto do titular

  **Obrigatório e default:** P01 define obrigatoriedade/verificação

  **Validação/unidade:** Registro até 30 e categoria até 80 atuais; rótulo
  informado/validado

  **Ajuda e exemplo:** Não anunciar credencial verificada só porque
  preenchida.

- **Campo:** Foto/avatar

  **Tipo/origem:** Arquivo próprio

  **Obrigatório e default:** Não

  **Validação/unidade:** Transporte/sanitização e tentativa recuperável

  **Ajuda e exemplo:** Avatar não é prova de identidade legal.

- **Campo:** Telefone e código

  **Tipo/origem:** E.164 + OTP Auth

  **Obrigatório e default:** Só se vincular canal

  **Validação/unidade:** Telefone + e 7–15 dígitos; código de 6–8 dígitos conforme
  atual; não usar metadata

  **Ajuda e exemplo:** A confirmação de telefone não é homologação SMS do
  sistema.

- **Campo:** E-mail/telefone novo

  **Tipo/origem:** Informação do titular

  **Obrigatório e default:** Só alteração voluntária

  **Validação/unidade:** Reautenticação recente, verificação oficial e retorno
  por etapa

  **Ajuda e exemplo:** “Contato confirmado; vínculo interno ainda pendente” se
  falhar segunda etapa.

- **Campo:** Papel/vínculo

  **Tipo/origem:** Seleção administrativa do paciente

  **Obrigatório e default:** Sim ao convidar/editar

  **Validação/unidade:** Pessoa-alvo fixa em edição; trocar pessoa é outra
  ação explícita

  **Ajuda e exemplo:** “Editar o vínculo de Ana”, sem substituir Bruno
  silenciosamente.

- **Campo:** Capacidades/overrides

  **Tipo/origem:** Matriz autorizada local

  **Obrigatório e default:** Conforme ação

  **Validação/unidade:** Não retirar proteção de último admin ou identidade do
  recebedor

  **Ajuda e exemplo:** Resumo antes/depois e próxima autoridade.

- **Campo:** Validade e emissor do convite

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim na prévia válida

  **Validação/unidade:** Token hash, e-mail correto, revogação e prazo no
  aceite

  **Ajuda e exemplo:** Token inválido não revela nome do paciente.

- **Campo:** Nome curto

  **Tipo/origem:** Campo opcional do paciente, onde existente

  **Obrigatório e default:** Não

  **Validação/unidade:** Omitir=manter; remover=ação explícita, não omissão de
  vazio

  **Ajuda e exemplo:** Confirmar resultado na reconsulta.

- **Campo:** Preferências

  **Tipo/origem:** Opções por tipo/canal

  **Obrigatório e default:** Próprio usuário, defaults sem opt-in implícito

  **Validação/unidade:** Ciência P02; push por dispositivo; canal inexistente
  não prometido

  **Ajuda e exemplo:** Internas permanecem fonte de estado.

- **Campo:** Motivo de revogação

  **Tipo/origem:** Texto admin autorizado

  **Obrigatório e default:** Ao revogar

  **Validação/unidade:** Proposta 3–1000, histórico preservado

  **Ajuda e exemplo:** Revogar agora mesmo com pendências.

- **Campo:** Sessão/dispositivo

  **Tipo/origem:** Lista segura de servidor

  **Obrigatório e default:** Identificação de sessão, sem token exposto

  **Validação/unidade:** Encerrar outras sessões exige reautenticação; não
  encerra indevidamente a atual

  **Ajuda e exemplo:** Mostrar data e descrição aproximada, sem afirmar
  identidade física do aparelho.

<!-- c-table:end -->

## Jornadas e fronteiras

Convite válido apresenta paciente/papel/emissor/validade mínima antes do
aceite;
token removido da URL e não enviado a analytics. Conta diferente orienta
trocar
conta; expirado/revogado já não aceita; já aceito oferece abrir contexto sem
novo vínculo. Cadastro inicial de residência exige administrador de e-mail
confirmado, sem promoção derivada de metadata. Inativo escolhido na criação
deve permanecer inativo ou ser recusado antes de persistir, nunca ignorado.

Retry de aprovação de ingresso com link perdido informa o estado confirmado.
Proposta técnica: oferecer reemissão explícita com rotação, invalidando link
anterior, em vez de tentar reconstruir segredo por hash. Candidato D valida
unicidade e explica limite; não retorna URL inválida como sucesso acionável.

Editar vínculo não altera identidade pessoal da conta. Revogação prévia mostra
pendências e opção de pedir regularização, mas botão Revogar agora permanece
disponível. Depois, negar novas ações, retirar subscription/avisos futuros do
escopo e oferecer redesignação de tarefas futuras. Autoria, aceite físico e
assinatura histórica não transferem. Outro paciente legítimo permanece
acessível.

Sessão encerrada deve ser recusada também nos contratos diretos de perfil e
Storage pertinentes, além do Route Handler. Atualizar claims não substitui
consulta de sessão/autoridade necessária. MFA e AAL2 usam Auth oficial;
segredo
TOTP/QR de cadastro é privado, nunca artefato de teste versionado.
OAuth/SMTP/SMS
reais seguem homologação do canal selecionado, não condição de teste simulado.

## Erros, recuperação e aceitação

Cada operação do perfil tem estado próprio, sem spinner infinito após 500.
Conflito de permissão conserva diálogo, intenção e foco. JWT revogado não
atualiza perfil/avatar/ponteiro; nova sessão legítima funciona. Falha entre
Auth e registro interno de telefone retoma etapa concluída sem exigir OTP
usado;
número não confirmado nunca entra em verified_phones. Avatar salvo sem
ponteiro
tem tentativa recuperável ou reconciliação, sem apagar objetos por varredura.

Aceites: convite válido/expirado/revogado/conta errada/já aceito; revogação
com
ENT parcial e BAL futuro sem bloqueio; último administrador protegido sob
concorrência; global sem membership não opera estoque; sessão encerrada negada
diretamente; campo nome curto manter/remover coerentes; retorno seguro em
login.
P01/P15 permanecem condições humanas. Guias usam dados fictícios e validação
real em dispositivo; não exportar senha/OTP/cookie em screenshots ou traces.
