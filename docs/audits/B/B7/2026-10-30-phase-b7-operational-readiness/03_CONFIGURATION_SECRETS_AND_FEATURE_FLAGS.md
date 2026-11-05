# B7.3 — Configuração, segredos e ativação

## Matriz de configuração efetivamente consumida

- **NEXT_PUBLIC_SUPABASE_URL**. **Uso e validação atual:** Browser, SSR, Proxy,
  serviço; presença. **Ausência/erro:** Clientes retornam null ou 503; não há
  atestado de projeto/schema. **Aceitação futura:** URL e identidade do projeto
  por ambiente.
- **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY / ANON_KEY**. **Uso e validação
  atual:** Chave pública; preferência publishable. **Ausência/erro:** Cliente
  não criado sem chave. **Aceitação futura:** Chave compatível, nunca chave de
  serviço pública.
- **NEXT_PUBLIC_APP_URL**. **Uso e validação atual:** Origem de mutações,
  callbacks e links. **Ausência/erro:** Fallback request.url; formato inválido
  lança erro. **Aceitação futura:** HTTPS e domínio autorizado, conferir build e
  runtime.
- **SUPABASE_SERVICE_ROLE_KEY**. **Uso e validação atual:** Serviço privado,
  finalize_attachment, documentPdf, worker/webhook. **Ausência/erro:**
  WORKER_NOT_CONFIGURED 503. **Aceitação futura:** Obrigatória para
  evidências/PDF mesmo com Meta desligada.
- **NOTIFICATIONS_WORKER_SECRET**. **Uso e validação atual:** Bearer de entrada
  do worker. **Ausência/erro:** Sem segredo não autentica chamada. **Aceitação
  futura:** Par correspondente ao Vault; rotação controlada.
- **NOTIFICATIONS_EXTERNAL_ENABLED**. **Uso e validação atual:** Só string true
  ativa adaptador Meta. **Ausência/erro:** false/ausente desliga. **Aceitação
  futura:** Preferência e configuração separadas da homologação.
- **META_WHATSAPP_ACCESS_TOKEN / PHONE_NUMBER_ID**. **Uso e validação atual:**
  Token não vazio e ID numérico no provider. **Ausência/erro:** Configuração
  retorna null. **Aceitação futura:** Conta/ativo corretos, escopo e validade
  homologados.
- **META_GRAPH_API_VERSION**. **Uso e validação atual:** Regex vN.N no provider.
  **Ausência/erro:** Ausente/inválida retorna null. **Aceitação futura:** Versão
  suportada pela Meta e contrato testado.
- **META_WHATSAPP_TEMPLATE / LANGUAGE**. **Uso e validação atual:** Nome
  opcional válido; idioma default pt_BR. **Ausência/erro:** Nome/idioma inválido
  desliga config. **Aceitação futura:** Template aprovado por evento/idioma.
- **DOCUMENT_TEMPLATE / ACCEPTANCE_TEMPLATE / URL_BUTTON_INDEX**. **Uso e
  validação atual:** Uso adicional do provider; índice de um dígito.
  **Ausência/erro:** Valor incompatível não prova transporte. **Aceitação
  futura:** Componentes e botões compatíveis com template aprovado.
- **META_WHATSAPP_BUSINESS_ACCOUNT_ID**. **Uso e validação atual:**
  Identificação de callback. **Ausência/erro:** Ativo incorreto recusado no
  contrato. **Aceitação futura:** Assinatura, inscrição e ativo de produção
  homologados.
- **META_APP_SECRET / WEBHOOK_VERIFY_TOKEN**. **Uso e validação atual:** HMAC e
  verificação do canal. **Ausência/erro:** Falha segura; sem processamento
  autorizado. **Aceitação futura:** Armazenar privado e ensaiar rotação.
- **META_FLOWS_ENABLED / PRIVATE_KEY / PASSPHRASE**. **Uso e validação atual:**
  Flag e envelope cifrado. **Ausência/erro:** Desabilitado/sem chave não abre o
  fluxo. **Aceitação futura:** Chave/publicação/endpoint e revisão por autor.
- **Vault hca_worker_url / hca_worker_bearer**. **Uso e validação atual:**
  pg_net chama endpoint fora do DB. **Ausência/erro:** Local: ambos ausentes;
  job pode terminar sem HTTP. **Aceitação futura:** Destino e versão
  correspondentes; não expor valor.
- **Auth Site URL, redirects, SMTP, OAuth, SMS**. **Uso e validação atual:**
  Configuração do serviço Auth. **Ausência/erro:** Migrations não transportam
  configuração. **Aceitação futura:** Homologação própria; Mailpit só comprova
  local.
- **Node/npm/CLI**. **Uso e validação atual:** 24.22.0 / 11.21.1 / 2.121.0 na
  prova local. **Ausência/erro:** Global Node divergia; runtime selecionado por
  processo. **Aceitação futura:** Registrar patch real da plataforma e
  ferramentas.
- **HCA_E2E e VERCEL_***. **Uso e validação atual:** Test harness e identidade
  da plataforma. **Ausência/erro:** Não constituem autorização de negócio.
  **Aceitação futura:** Usar metadado da plataforma, não headers arbitrários.
- **CARE_RECIPIENT_ID**. **Uso e validação atual:** Legado ainda aparece em env
  remoto/local. **Ausência/erro:** Não define paciente no contrato atual.
  **Aceitação futura:** Não usá-lo como autoridade; REPO-001 cobre drift.

Chaves privadas não têm prefixo público nos consumidores examinados. A chave de
serviço está em módulo de servidor; B4 já verificou assets locais sem sua
presença. Não foi gerado novo bundle nem atestada ausência universal de segredo
em todos os artefatos remotos. `.env.example` não contém credenciais;
`.gitignore`/`.vercelignore` e controle de artefatos são examinados em B7.9.

## Prova dirigida: canal anunciado com configuração recusada

Hipótese nova: a API de regras anuncia WhatsApp usando um predicado menor que o
usado pelo adaptador que realmente envia. Foram executados sete casos isolados,
com handler/provider reais, adapter de autorização/dados controlado e transporte
proibido. Zero chamadas de rede, Auth ou banco.

`src/app/api/notification-rules/route.ts:44` exige flag, token e phone ID
truthy. `src/lib/notifications/provider.ts:46` também valida versão Graph,
formato do ID, idioma e nome de template. Nos casos CFG-04–07, a API respondeu
200 e anunciou o canal enquanto `metaConfiguration` retornou null. Configuração
completa concordou; flag desligada e token ausente também concordaram. É B7-002,
defeito confirmado do contrato de ativação, condicionado a configuração
incompleta. Não se afirma ocorrência remota nem envio indevido.

As provas estão em `evidence/configuration-results.json` e o reprodutor
`configuration.test.ts`. Aceitação: um único resultado de readiness por canal,
com causa segura, deve orientar UI e worker; configuração inválida não pode
oferecer transporte. Aprovação Meta continua separada mesmo após readiness.

## Configuração presente, serviço ativo e serviço homologado

A listagem remota contém 16 entradas nome/tipo/ambiente, sem valores: oito
classes em Production e Preview. Service key e worker secret são Secret; flags e
URLs são Config. Valores, escopos de chaves, expiração, igualdade entre projetos
e estado booleano remoto não foram extraídos. Não executar `env pull` nem `env
ls --json`, que pode devolver valores legíveis.

Não há token/asset Meta listado nessa consulta; isso sustenta ausência de
configuração suficiente nessa lista, não inspeção de todas as fontes possíveis
de segredo. Flags antigas documentadas como false são evidência histórica.
OAuth, SMTP, SMS, Flow publicado e canal Meta continuam pendentes de
homologação. Preferência e-mail operacional não implementa transporte; áudio não
possui transcritor contratado, conforme B5. Não criar novos achados por esses
casos.

## Gestão de segredo e preflight

Há validação tardia por consumidor, sem manifesto versionado que confronte
schema, capacidades, serviços e configurações antes do release. Código novo pode
compilar sem uma credencial necessária a anexos/PDF. Não repetimos build para
provar uma ausência explícita de preflight. B7-003 delimita a ligação
schema/configuração/release; não classifica cada env ausente como defeito.

Proposta: inventário de responsáveis, finalidade, ambientes, local de guarda,
expiração e dependentes, sem valores. Na futura rotação: preparar versão
compatível, impedir disparos durante incoerência de pares, validar recebimento
autorizado, monitorar pendências, só então retirar credencial anterior. Meta
exige conferir callbacks em voo; Auth/JWT e links temporários têm janelas que
uma rotação não elimina retroativamente. Nenhum segredo foi rotacionado.
