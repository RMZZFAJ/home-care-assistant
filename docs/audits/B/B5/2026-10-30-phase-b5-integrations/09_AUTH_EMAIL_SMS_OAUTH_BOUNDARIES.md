# E-mail, SMS, OAuth e identidade externa

## Disponibilidade real e configuração

- **cadastro/confirmação/reset e-mail** — Implementação: Supabase Auth SDK e
  callback PKCE; Configuração local verificada: E-mail ativo, autoconfirm
  false, Mailpit54324; confirmação e troca dupla no TOML;
  Homologação/contingência: SMTP real, expiração e chegada externa pendentes;
  jornadas Mailpit anteriores são locais.

- **alteração e-mail** — Implementação: sessão recente; updateUser e redirect
  ao perfil; Configuração local verificada: Auth controla links e identidade;
  Homologação/contingência: Conferir dois endereços, resposta perdida e conta
  sem e-mail em ensaio autorizado.

- **telefone/SMS** — Implementação: updateUser; verifyOtp phone_change;
  register_verified_phone; Configuração local verificada: external phone
  false; SMS autoconfirm true; Twilio false no TOML; Homologação/contingência:
  Não comprova SMS; cadastro administrativo de telefone fictício nos probes
  não é OTP real.

- **Google login/vínculo** — Implementação: signInWithOAuth/linkIdentity;
  preparo exige sessão recente; Configuração local verificada: Google não
  declarado no container; manual linking false; Homologação/contingência:
  Configurar e homologar separado; senha/e-mail seguem alternativa conforme
  conta.

- **convite de paciente** — Implementação: hash/prazo/emissor/aceite da conta
  confirmada; Configuração local verificada: Compartilhamento manual;
  Homologação/contingência: Não há envio automático de convite por
  e-mail/WhatsApp; B4-003 limita recuperação do link.

- **e-mail operacional** — Implementação: preferência, regra e outbox;
  Configuração local verificada: Claim vigente só internal/whatsapp; worker
  não tem SMTP; Homologação/contingência: Configurável sem transporte; manter
  fora da promessa de avisos.

- **SMS operacional** — Implementação: nenhum worker encontrado; Configuração
  local verificada: Só fronteira Auth; Homologação/contingência: Não
  implementado como canal de domínio.

[Flags do container](evidence/b59-auth-config.json) foram lidas por whitelist
booleana, sem credenciais. TOML representa intenção local; o container é a prova
de configuração em execução observada. Não inferir estado remoto ou de OAuth
somente do arquivo. Não se alterou nenhum provedor.

## Sessão, retorno e falhas

Callback troca code por sessão, usa safeReturnPath e appOrigin aprovados, omite
code/token dos logs, responde no-store e encaminha falha ao login com
correlação.
Código PKCE ausente/expirado, verificador ausente e retorno externo não ganham
autorização. Origem encaminhada arbitrária não estabelece confiança. Provas
B4 de origem/callback e testes Auth idênticos são reutilizados, sem novo OAuth.

SDK/Auth determina prazo e uso do código, e o app conserva papel por paciente
separado da identidade externa. Convite não concede acesso antes do aceite.
Revogar um vínculo não encerra os demais. B3-021 continua limite específico de
JWT encerrado em certas escritas pessoais diretas, sem repetir a exploração.

## B5-012: duas etapas na confirmação de telefone

`verifyPhone` confirma OTP no Auth e depois chama register_verified_phone.
Falha na segunda etapa não desfaz a confirmação Auth. O HTTP não comunica
resultado parcial nem oferece ação própria para apenas sincronizar o vínculo.
GET perfil mostra verified_phones, sem reconciliar automaticamente com Auth.

[B59-C01/02](evidence/b59-phone-cases.json) executam handler real e clientes
controlados: primeiro Auth simulado confirma, registro SQL falha →503; retry
com OTP simulado já consumido →400, sem nova tentativa de sincronização.
Caminho integral bem-sucedido →200. Isso sustenta risco de recuperação entre
serviços, não um incidente OTP real nem mudança Auth persistida neste teste.

Contraprova de segurança: validação do envio compara verified_phones ao phone
atual confirmado do Auth; desacordo cancela o envio antigo. O problema é retomar
com segurança e mostrar o estado verdadeiro, não continuar enviando ao número
antigo. RPC register_verified_phone existe e exige sessão recente, portanto
aproveitar esse mecanismo é alternativa menor que refazer a verificação inteira.
Validar futuro caso real local/isolado de falha entre as etapas antes de fechar.

## Homologação necessária

Separar Auth SMTP/SMS/OAuth de avisos operacionais. Definir retorno aprovado por
ambiente, expiração, rate limit, retomada com sessão recente e canal de suporte.
Changelog [Supabase](https://supabase.com/changelog) foi consultado: retirada
anunciada de cifras TLS hospedadas não muda os ensaios HTTP locais; deve ser
considerada na futura homologação de dispositivos antigos, sem reconfiguração
preventiva nesta auditoria.

Não foi enviado e-mail/SMS, nem iniciado login Google. Os dois novos testes
controlados respondem à hipótese de resultado parcial; repetir toda a suíte
Auth ou gerar mensagens Mailpit não resolveria a homologação externa ausente.
