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

  **Tipo/origem por tela e estado:** ID-01 E-mail de acesso: EDITABLE
  (EMAIL_INPUT); Login/solicitar recuperação; confirmar e-mail oficial
  pertence ao Auth; ID-03 E-mail de acesso: READ_ONLY_WITH_ACCOUNT_SWITCH
  (ACCOUNT_IDENTITY_DESCRIPTION); Na prévia/aceite é e-mail destinatário fixo;
  login/cadastro ocorre em estado separado; ID-04 E-mail de acesso: EDITABLE
  (EMAIL_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-01 E-mail de acesso: Sim no
  login/convite; ID-03 E-mail de acesso: Valor emitido, proposto ou calculado
  da fonte identificada; ausência explicitamente informada, sem valor
  inventado; ID-04 E-mail de acesso: Sim no login/convite

  **Validação/unidade:** ID-01 E-mail de acesso: Formato, até 254; confirmação
  pelo Auth para aceite; Login/solicitar recuperação; confirmar e-mail oficial
  pertence ao Auth; ID-03 E-mail de acesso: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Na prévia/aceite é e-mail destinatário fixo; login/cadastro ocorre em
  estado separado; ID-04 E-mail de acesso: Formato, até 254; confirmação pelo
  Auth para aceite; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-01 E-mail de acesso: “<pessoa.exemplo@dominio.test>”,
  fictício.; ID-03 E-mail de acesso: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ID-04 E-mail de acesso:
  “<pessoa.exemplo@dominio.test>”, fictício.

- **Campo:** Senha atual

  **Tipo/origem por tela e estado:** ID-02 Senha atual: EDITABLE
  (PASSWORD_WITH_REVEAL); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Senha atual: Só
  reautenticação da operação protegida; vazio; nunca em rascunho geral

  **Validação/unidade:** ID-02 Senha atual: Nunca logar/exportar; password
  manager permitido; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-02 Senha atual: Não preencher por administrador.

- **Campo:** Nova senha

  **Tipo/origem por tela e estado:** ID-01 Nova senha: EDITABLE_SUBFORM
  (PASSWORD_NEW_WITH_REVEAL); Só DEFINIR_NOVA_SENHA por contexto Auth válido;
  não aparece no login comum; ID-02 Nova senha: EDITABLE
  (PASSWORD_WITH_REVEAL); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ID-03 Nova senha:
  EDITABLE (PASSWORD_WITH_REVEAL); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-01 Nova senha: Só
  cadastro/recuperação/troca; vazio; não usado como senha do login; ID-02 Nova
  senha: Só cadastro/recuperação/troca; vazio; não usado como senha do login;
  ID-03 Nova senha: Só cadastro/recuperação/troca; vazio; não usado como senha
  do login

  **Validação/unidade:** ID-01 Nova senha: Nova senha: mínimo 12 caracteres e
  máximo 72 bytes UTF-8 conforme contrato atual; gerenciador/colar permitidos;
  Só DEFINIR_NOVA_SENHA por contexto Auth válido; não aparece no login comum;
  ID-02 Nova senha: Nova senha: mínimo 12 caracteres e máximo 72 bytes UTF-8
  conforme contrato atual; gerenciador/colar permitidos; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura; ID-03 Nova senha: Nova senha: mínimo 12 caracteres e máximo 72
  bytes UTF-8 conforme contrato atual; gerenciador/colar permitidos; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ID-01 Nova senha: Erro explica limite sem repetir valor.;
  ID-02 Nova senha: Erro explica limite sem repetir valor.; ID-03 Nova senha:
  Erro explica limite sem repetir valor.

- **Campo:** Nome pessoal

  **Tipo/origem por tela e estado:** ID-02 Nome pessoal: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Nome pessoal: Sim

  **Validação/unidade:** ID-02 Nome pessoal: 2–160 caracteres; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ID-02 Nome pessoal: Pessoa identificável; nome não
  concede capacidade.

- **Campo:** Registro/função profissional

  **Tipo/origem por tela e estado:** ID-02 Função profissional: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ID-02 Registro profissional:
  EDITABLE (TEXT_INPUT); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Função profissional: Função
  individual; registro só quando aplicável à profissão P01; ID-02 Registro
  profissional: Função individual; registro só quando aplicável à profissão
  P01

  **Validação/unidade:** ID-02 Função profissional: Função/categoria
  profissional até 80 caracteres segundo contrato; registro só quando
  aplicável; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ID-02 Registro profissional: Registro
  profissional até 30 caracteres quando aplicável; cuidadora sem registro não
  informa COREN fictício; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-02 Função profissional: Informado, conferido pela
  família e validado externamente são estados distintos; cuidadora sem
  registro aplicável não fornece COREN fictício.; ID-02 Registro profissional:
  Informado, conferido pela família e validado externamente são estados
  distintos; cuidadora sem registro aplicável não fornece COREN fictício.

- **Campo:** Foto/avatar

  **Tipo/origem por tela e estado:** ID-02 Foto/avatar: EDITABLE
  (AVATAR_FILE_PICKER); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Foto/avatar: Não

  **Validação/unidade:** ID-02 Foto/avatar: Transporte/sanitização e tentativa
  recuperável; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-02 Foto/avatar: Escolha uma imagem para o seu perfil.
  Envio e atualização do perfil têm resultados próprios; não digite caminho ou
  URL como prova de upload.

- **Campo:** Telefone e código

  **Tipo/origem por tela e estado:** ID-02 Telefone: EDITABLE (TEL_INPUT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ID-02 Código de confirmação: EDITABLE
  (OTP_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Telefone: Só se vincular
  canal; ID-02 Código de confirmação: Só se vincular canal

  **Validação/unidade:** ID-02 Telefone: Telefone no formato E.164, com
  prefixo internacional e 7–15 dígitos; confirmação oficial separada; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; ID-02 Código de confirmação: Código no formato exigido
  pela operação Auth corrente; mostrar prazo/erro do desafio sem registrar ou
  exportar o código; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-02 Telefone: A confirmação de telefone não é
  homologação SMS do sistema.; ID-02 Código de confirmação: A confirmação de
  telefone não é homologação SMS do sistema.

- **Campo:** E-mail/telefone novo

  **Tipo/origem por tela e estado:** ID-02 Novo e-mail: EDITABLE
  (EMAIL_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ID-02 Novo telefone: EDITABLE
  (TEL_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-02 Novo e-mail: Só alteração
  voluntária; ID-02 Novo telefone: Só alteração voluntária

  **Validação/unidade:** ID-02 Novo e-mail: Reautenticação recente,
  verificação oficial e retorno por etapa; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; ID-02 Novo
  telefone: Reautenticação recente, verificação oficial e retorno por etapa;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-02 Novo e-mail: “Contato confirmado; vínculo interno
  ainda pendente” se falhar segunda etapa.; ID-02 Novo telefone: “Contato
  confirmado; vínculo interno ainda pendente” se falhar segunda etapa.

- **Campo:** Papel/vínculo

  **Tipo/origem por tela e estado:** ID-04 Papel: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ID-04 Estado do
  vínculo: EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-04 Papel: Sim ao
  convidar/editar; ID-04 Estado do vínculo: Sim ao convidar/editar

  **Validação/unidade:** ID-04 Papel: Pessoa-alvo fixa em edição; trocar
  pessoa é outra ação explícita; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ID-04 Estado do
  vínculo: Pessoa-alvo fixa em edição; trocar pessoa é outra ação explícita;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-04 Papel: “Editar o vínculo de Ana”, sem substituir
  Bruno silenciosamente.; ID-04 Estado do vínculo: “Editar o vínculo de Ana”,
  sem substituir Bruno silenciosamente.

- **Campo:** Capacidades/overrides

  **Tipo/origem por tela e estado:** ID-04 Capacidade: EDITABLE
  (CAPABILITY_CHECKLIST); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ID-04 Override:
  EDITABLE (CAPABILITY_OVERRIDE_GROUP); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-04 Capacidade: Conforme ação;
  ID-04 Override: Conforme ação

  **Validação/unidade:** ID-04 Capacidade: Não retirar proteção de último
  admin ou identidade do recebedor; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; ID-04
  Override: Não retirar proteção de último admin ou identidade do recebedor;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-04 Capacidade: A administração familiar escolhe quem
  pode declarar ciência pela família. Uma ciência válida satisfaz a obrigação;
  não é preciso habilitar ou cobrar todos.; ID-04 Override: Exceção de
  capacidade só no paciente e alvo autorizados; não permite desativar SCI-005
  ou confirmar recebimento por outra pessoa.

- **Campo:** Validade e emissor do convite

  **Tipo/origem por tela e estado:** ID-03 Validade do convite: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ID-03 Emissor do convite: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Obrigatoriedade/default na preparação:** ID-03 Validade do convite: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ID-03 Emissor do convite:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ID-03 Validade do convite: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ID-03 Emissor do convite: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** ID-03 Validade do convite: A data pertence ao fato
  identificado. Data de registro e de emissão são mostradas separadamente
  quando forem diferentes.; ID-03 Emissor do convite: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Nome curto

  **Tipo/origem por tela e estado:** ID-04 Nome curto: EDITABLE (TEXT_INPUT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-04 Nome curto: Não

  **Validação/unidade:** ID-04 Nome curto: Omitir=manter; remover=ação
  explícita, não omissão de vazio; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-04 Nome curto: Confirmar resultado na reconsulta.

- **Campo:** Preferências

  **Tipo/origem por tela e estado:** ID-02 Preferências: EDITABLE_SUBFORM
  (SCOPED_PREFERENCE_GROUP); Preferências pessoais por obrigação elegível;
  SCI-005 é invariável

  **Obrigatoriedade/default na preparação:** ID-02 Preferências: Próprio
  usuário, defaults sem opt-in implícito

  **Validação/unidade:** ID-02 Preferências: Ciência P02; push por
  dispositivo; canal inexistente não prometido; Preferências pessoais por
  obrigação elegível; SCI-005 é invariável

  **Ajuda/exemplo:** ID-02 Preferências: Internas permanecem fonte de estado.

- **Campo:** Motivo de revogação

  **Tipo/origem por tela e estado:** ID-04 Motivo de revogação: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ID-04 Motivo de revogação: Ao
  revogar

  **Validação/unidade:** ID-04 Motivo de revogação: Proposta 3–1000, histórico
  preservado; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ID-04 Motivo de revogação: Revogar agora mesmo com
  pendências.

- **Campo:** Sessão/dispositivo

  **Tipo/origem por tela e estado:** ID-02 Sessão: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ID-02 Descrição do aparelho: READ_ONLY (TEXT_VALUE); Consulta
  do valor de origem; mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ID-02 Sessão: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ID-02 Descrição do aparelho: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado

  **Validação/unidade:** ID-02 Sessão: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ID-02 Descrição do aparelho: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** ID-02 Sessão: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ID-02 Descrição do aparelho: Informação do
  registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Senha de acesso

  **Tipo/origem por tela e estado:** PASSWORD_CURRENT_WITH_REVEAL;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Login, vazia;
  autocomplete=current-password; não persistir em rascunho

  **Validação/unidade:** Credencial entregue ao Auth oficial; mostrar/ocultar
  por botão acessível; permitir colar/gerenciador

  **Ajuda/exemplo:** Digite sua senha de acesso. Se não lembrar, use Recuperar
  acesso.

- **Campo:** Código do autenticador

  **Tipo/origem por tela e estado:** AUTHENTICATOR_CODE_INPUT;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Só matrícula/desafio MFA do
  titular; vazio; autocomplete=one-time-code

  **Validação/unidade:** Seis dígitos conforme componente Auth atual;
  inputmode=numeric, zeros preservados; Auth oficial decide desafio/prazo

  **Ajuda/exemplo:** Digite o código atual do seu autenticador. Não é o código
  de confirmação do telefone; nunca compartilhe o código com suporte.

- **Campo:** Cadastro privado do autenticador

  **Tipo/origem por tela e estado:** SENSITIVE_READ_ONLY;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Somente matrícula MFA do titular
  e enquanto o desafio correspondente estiver ativo

  **Validação/unidade:** QR/segredo de matrícula são privados; não persistir
  em rascunho, histórico geral, logs, capturas ou artefatos; cancelar
  matrícula não remove outro fator

  **Ajuda/exemplo:** Cadastre este QR no seu autenticador em ambiente privado.
  Ele permite configurar o fator da sua conta; não o compartilhe.

<!-- c-table:end -->

## Jornadas e fronteiras

Convite válido apresenta paciente/papel/emissor/validade mínima antes do
aceite; token removido da URL e não enviado a analytics. Conta diferente
orienta trocar conta; expirado/revogado já não aceita; já aceito oferece abrir
contexto sem novo vínculo. Cadastro inicial de residência exige administrador
de e-mail confirmado, sem promoção derivada de metadata. Inativo escolhido na
criação deve permanecer inativo ou ser recusado antes de persistir, nunca
ignorado.

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
segredo TOTP/QR de cadastro é privado, nunca artefato de teste versionado.
OAuth/SMTP/SMS reais seguem homologação do canal selecionado, não condição de
teste simulado.

## Erros, recuperação e aceitação

Cada operação do perfil tem estado próprio, sem spinner infinito após 500.
Conflito de permissão conserva diálogo, intenção e foco. JWT revogado não
atualiza perfil/avatar/ponteiro; nova sessão legítima funciona. Falha entre
Auth e registro interno de telefone retoma etapa concluída sem exigir OTP
usado; número não confirmado nunca entra em verified_phones. Avatar salvo sem
ponteiro tem tentativa recuperável ou reconciliação, sem apagar objetos por
varredura.

Aceites: convite válido/expirado/revogado/conta errada/já aceito; revogação
com ENT parcial e BAL futuro sem bloqueio; último administrador protegido sob
concorrência; global sem membership não opera estoque; sessão encerrada negada
diretamente; campo nome curto manter/remover coerentes; retorno seguro em
login. P01 e garantia do comando P15 já foram aprovados; o transporte/TTL de
arquivo e eventual validação externa têm gates próprios. Guias usam dados
fictícios e validação real em dispositivo; não exportar senha/OTP/cookie em
screenshots ou traces.

## Atualização vinculante C7–C10

P01 aprova nome/função individual, registro quando aplicável e conferência
familiar com autor/data/resultado; informado/conferido/validado externo são
distintos. P15 aprova revalidação de comando e barreira persistente; arquivo
já entregue tem limite próprio. O01 aprova tour opcional/reabertura pelo
titular.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

Titular informa credencial; conferência familiar tem autor/instante
automáticos e resultado próprio. Validado externamente exige fonte comprovada,
nunca selo autoselecionado. Administração familiar concede capacidade de
ciência no paciente; ANY não exige todos.

Senha de login, nova senha, código de contato e TOTP são estados/controles
distintos. Login usa current-password; criar/trocar usa new-password. TOTP
atual tem seis dígitos e Auth oficial; QR de matrícula é privado, nunca
rascunho/log/screenshot. Destinatário/papel do convite são leitura no aceite.
