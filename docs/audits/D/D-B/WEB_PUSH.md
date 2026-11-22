# D5.2 — Web Push e consentimento por aparelho

## Teste pessoal e confirmação visível — acréscimo de 12/11/2026

O cartão informa explicitamente quando a inscrição da conta e sessão foi
confirmada neste aparelho, distinguindo pausa e permissão do navegador.
Enviar aviso de teste neste aparelho exige inscrição atual, worker pronto,
permissão concedida e envio habilitado no ambiente. Não ativa um canal desligado.

`POST /api/push/test` recebe deviceId, idempotencyKey e contextReference.
Autenticação e referência atual são verificadas antes da reserva por RPC.
O banco confere proprietário e sessão reais, limita a um novo teste por minuto
por aparelho e devolve somente recibo seguro. Apenas o servidor obtém a inscrição
privada, com nova conferência de conta ativa, sessão, pausa, revogação e chave.
Uma reserva só pode iniciar transporte uma vez, mesmo com concorrência.

As tentativas ficam separadas dos avisos operacionais em private.web_push_tests,
com RLS e sem grants diretos. O conteúdo é genérico, criptografado pelo transporte
existente, com marcador de teste; tocar abre o perfil autorizado, sem criar
ciência, recebimento ou evento em uma ficha. Falha de rede ou confirmação incerta
não causa reenvio automático. Consultar a mesma tentativa reaproveita sua chave.
Aceite pelo provedor é informado como aceite, sem alegar que o sistema do celular
exibiu o aviso. A exibição real permanece prova do aparelho/fornecedor.

O acréscimo foi qualificado localmente com Auth real, transporte controlado,
criptografia real e navegador nos dois motores, sem envio externo. Workers
anteriores continuam nos fluxos existentes, mas não habilitam o teste novo até
confirmar sua capacidade. Local e remoto estão reconciliados em242; a CI do SHA
publicado e o teste físico do usuário continuam próprios. Os resultados
anteriores abaixo são históricos compatíveis, sem aprovação automática externa.

Após a publicação de7e27795, o responsável confirmou o recebimento do teste no
S24 Ultra, junto com a atualização concluída da PWA. O recebimento relatado é
distinto do simples aceite do provedor. Não comprova todos os canais,
destinatários, permissões do sistema ou situações de execução em background.

## Ícone da notificação no Android — correção local

O reteste físico também identificou um quadrado branco na barra do S24.
O badge usava o mesmo PNG opaco do ícone colorido. O Android transforma o
[badge em silhueta monocromática](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification#badge),
incluindo todo fundo opaco. notification-badge.svg/png conserva as letras HC
do logo, com fundo transparente e96×96px; o ícone completo permanece colorido.
A cor e a disposição finais continuam sob controle do sistema do aparelho.

O gerador incorpora somente essas duas imagens públicas fixas ao worker.
Assim, sua apresentação não depende de outra busca autenticada nem da validade
do cookie de proteção do Preview. Não recebe imagens do payload e não amplia
os quatro arquivos do CacheStorage. Conteúdo privado e replay continuam vedados.

23 testes de worker/ciclo de vida, tipos e lint passaram. O caso dirigido no
Chrome móvel emulado decodificou as duas imagens do worker realmente gerado
depois de expirar o acesso, sem novas requisições HTTP. Rodou pelo runner local
verificado em modo diagnóstico, sem substituir o build de produção da CI ou
a inspeção física do novo ícone. A publicação ocorreu em f2491be depois do
término da CI7e27795. No Preview estável desse SHA, o responsável atualizou a
PWA e confirmou no S24: Agora aparece o símbolo HC. Esse relato físico encerra
o defeito do quadrado branco nesse aparelho; não aprova outros aparelhos,
cenários de background ou a homologação operacional completa. A CI de f2491be
terminou com falha na conferência da lista em Mobile-1; seu resultado e as
correções dirigidas estão no acompanhamento principal. O reteste físico do
ícone não substitui a CI do próximo SHA.

## Contrato vigente de conta e sessão — 12/11/2026

A confirmação de avisos conserva a conta, a sessão verificada e o par VAPID da
consulta que precedeu o gesto. GET /api/push/devices?context=consent acrescenta
userId e contextReference à consulta pessoal; o GET anterior conserva o corpo
compatível. POST e PATCH exigem a referência atual. Ausência ou divergência é
recusada com VERSION_CONFLICT, antes da RPC de alteração, orientando atualizar
a página e confirmar novamente. Uma referência não autoriza nem identifica
um bearer: Auth, perfil ativo, sessão nativa e propriedade continuam
revalidados pelos caminhos existentes.

O servidor obtém sub/session_id de getClaims com validação de assinatura e
compara o titular ao authenticate já verificado. O SHA-256 inclui domínio,
conta, sessão e versão/chave pública VAPID. Não usa metadata editável, papel,
flags ou identidade escolhida pelo navegador como autorização. Renovar o JWT
na mesma sessão conserva a referência; outra sessão, conta ou chave exige
nova consulta. Sem VAPID configurado, consulta e revogação pessoais ainda
funcionam. A referência é transitória; não é novo rascunho ou registro oficial.

O componente encerra suas continuações após desmontagem. A recusa por perda
de Auth ou uma resposta de outra conta retira os metadados anteriores. Limpeza nativa
confere o fingerprint do endpoint atual antes de remover a inscrição.
Trocar de paciente não troca o consentimento pessoal; trocar a conta não pode
herdar a escolha anterior. Fonte primária do método:
[getClaims](https://supabase.com/docs/reference/javascript/auth-getclaims).

A reprodução local anterior à correção obteve HTTP 200 e vínculo na segunda
conta ao resolver a permissão iniciada na primeira. A regressão usa Auth/API
reais, duas abas e capacidade nativa controlada. Os dois percursos de sessão
passaram em Chromium, Android emulado e WebKit/iOS. Uma troca de conta pode
desmontar o componente antes do envio; quando o pedido chega, deve ser recusado.
O teste também exige diretamente HTTP 409 e ausência de vínculo, depois
comprova nova escolha válida e recusa de comando antigo sobre o aparelho.
Não há aceite de entrega externa ou aparelho físico.

No conjunto, passaram 18 percursos distintos de navegador em coortes
compatíveis: nove controles existentes, seis de sessão e três de sessão
revogada/offline. As falhas do novo teste foram de observação do painel
recolhido e ficam separadas da reprodução material HTTP 200 anterior à
correção. Quinze unitários de contexto/criptografia, tipos e lint passaram.
Os contratos de cache privado e ausência de replay foram preservados.

## Estado observado do Preview

Em 12/11/2026, o inventário Vercel confirmou identidade VAPID sensível própria
para Preview. A leitura exclusiva da configuração não secreta
WEB_PUSH_EXTERNAL_ENABLED retornou true, com criação/atualização em
07/11/2026 às 22:18 UTC. Esse estado preexistente não foi alterado neste lote.
Os testes usam a stack local com envio externo desligado e transporte
controlado. A configuração não comprova despacho, aceite do provedor ou
recebimento físico. A homologação e a governança operacionais continuam nos
gates externos; produção não foi alterada.

## Histórico da implantação D5.2

Base4bf8247. A migration20261107195440 passou por preflight revertido e
test:db:prepare sem reset. O [recibo remoto](D5_2_REMOTE_MIGRATIONS.json)
registra a reconciliação desse incremento. Naquele estado inicial não havia
envio externo ativo.
Provas locais não significam instalação física ou recebimento em aparelho fechado.

## Inscrição e privacidade

Meu perfil oferece consentimento por aparelho, nome opcional, pausa de oito
horas, consulta e revogação. Permissão do navegador não é consentimento de outra
conta. O pedido ocorre por gesto; recusa não gera novos pedidos automáticos.
Sem capacidade/configuração, a central interna continua disponível. Configuração
presente com entrega desabilitada é informada explicitamente.

Endpoints e chaves de inscrição ficam em tabelas privadas com RLS e sem grants
diretos para anon, authenticated ou service_role. RPCs pessoais exigem sessão
Auth atual e perfil ativo, sem contexto de paciente obrigatório. Leituras mostram
metadados próprios, sem endpoint/auth. Até20 aparelhos ativos e40 registros
recentes são exibidos, priorizando ativos; histórico técnico é preservado.
Repetir inscrição idêntica na mesma sessão conserva recibo, consentimento e fila.
Reatribuição explícita de um endpoint a outra conta preserva trilha e cancela
tentativas antigas. O novo titular não recebe acesso à referência do anterior.

O payload criptografado contém somente versão e referência opaca de entrega.
Worker ignora texto, título e URL externos; a tela bloqueada sempre usa mensagem
genérica local. Clique abre outra janela na mesma origem, conservando abas com
edição. O destino exige Auth, revalida conta/vínculo/referência e permite seleção
explícita de contexto. Consulta/clique não marca visto, ciência ou recebimento.

## Fila e autoridade

O produtor é o registro interno existente de requisition_notifications. Não se
cria obrigação paralela nem se faz backfill de avisos anteriores ao consentimento.
Avisos silenciosos não fazem fanout; desligar Push preserva o registro interno.
As regras existentes fornecem horário silencioso e destinatário. A fila por
aparelho deduplica aviso/dispositivo; só despacha após entrega do canal interno.

Três RPCs exclusivas de serviço fazem claim, preparação e conclusão. Preparação
revalida destinatário, recurso, sessão do aparelho, consentimento, versão VAPID,
pausa e expiração. Apenas uma preparação retorna credenciais por lease. Expiração
antes da preparação é recuperável; após preparação permanece uncertain, sem
reenvio automático. Tentativas são preservadas, com backoff limitado a cinco.
404/410 retiram a inscrição; rejeições transitórias têm backoff; perda de rede
fica incerta. Accepted significa aceite HTTP do serviço, sem afirmar entrega.

Revogação entre preparação e HTTP pode competir com um envio já iniciado. O
conteúdo permanece genérico e o destino é reautorizado; mensagens aceitas pelo
serviço não podem ser recolhidas garantidamente. Logout tenta desassociar o
Push da sessão e remover a inscrição nativa antes do signOut existente. Falha
nessa limpeza não impede revogar Auth; novos envios exigem sessão ainda válida.

## Custódia e transporte

HCA_WEB_PUSH_SECRET contém environment, keyVersion, subject, publicKey e
privateKey VAPID. O adaptador_FILE aceita somente arquivo local absoluto fora do
workspace, sem symlink. Preview/production exigem valor protegido e ambiente
correspondente. PublicKey pode ir ao navegador; privateKey não integra resposta,
log, Git, URL ou payload. create-local-push-custody.mjs criou identidade persistente
local fora do Git, com ACL do operador e sem sobrescrever identidade anterior.
O backup cifrado separado foi autenticado e recuperado; derivação ECDH independente
conferiu o fingerprint público. Isso não comprova HSM, recuperação em outro
computador ou rotina externa operacional. Preview/production exigem identidades
próprias; nenhuma chave local foi enviada ao provedor.

WEB_PUSH_EXTERNAL_ENABLED tem default desligado e é independente de Meta.
O runner força desligado e provisiona chave efêmera em diretório protegido,
descartado ao fim. Transporte controlado só é injetado pelo código de testes;
não há parâmetro HTTP para ativá-lo. Nenhuma integração real é anunciada como
homologada. O worker operacional existente chama o consumidor Push depois do
processamento interno, sem alterar os crons atuais.

web-push4.0.0 fornece AES128GCM/VAPID. O adaptador aplica deadline absoluto10s,
TTL300s, urgência normal, descarta corpo da resposta e não segue redirects.
Origins HTTPS de FCM, Mozilla, Apple e WNS são permitidas; hosts privados,
userinfo e portas alternativas são recusados também pelo banco. Ampliação de
provedores exige evolução explícita desse contrato.

Referências primárias: [biblioteca](https://github.com/web-push-libs/web-push),
[cifragem RFC8291](https://www.rfc-editor.org/rfc/rfc8291.html) e
[inscrição do navegador](https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription).

## Provas e limites atuais

Sete casos Auth distintos passaram entre duas coortes: isolamento, negativos de
grants, produtor REQ nativo, dedup, leases, revogação após claim, duas contas,
expiração, backoff, concorrência e prazo Auth. A primeira coorte teve6 passes e
uma falha na fixture, que usava status de vínculo inexistente; o caso corrigido
passou com revoked. Não houve alteração da migration aplicada.

22 testes unitários passaram na coorte de crypto/worker/compatibilidade. Decriptação
RFC8291 e verificação VAPID independentes usam Node crypto. A primeira coorte
teve uma falha no inventário antigo de listeners; a nova lista explícita e os
três casos de Push conservam os controles de cache/ativação existentes.

Produção local comprovou18 casos distintos nos três projetos entre duas coortes:
12 casos inalterados da primeira e6/6 casos corrigidos da final. A primeira teve
14 passes/4 falhas: recuperação manual da fixture de histórico competia com
Realtime, e nome fixo de aparelho colidia com histórico preservado. O transporte
controlado agora só recupera na tentativa manual efetiva; ambos os nomes são
únicos. As asserções foram mantidas. Fontes de aplicação permaneceram idênticas.

O teste novo usa worker, Auth, API, banco e consumidor reais, com adaptadores
explícitos de capacidade nativa e transporte. Não pede permissão ao sistema nem
envia ao provedor. Comprova gesto/recusa, duas inscrições, isolamento, evento
REQ nativo, fanout, lease, destino autorizado, ausência de ciência e revogação
de um aparelho. Axe e geometria em1440/768/390/320 passaram; capturas dos controles
foram inspecionadas. Captura de página inteira conserva a posição do header fixo;
não substitui leitura humana/AT ou avaliação física.

Tipos/lint afetados, SQL dirigido de serviço e guard das84 migrations passaram.
CI4bf8247 terminou FAILURE; o seletor público foi limitado ao status do conteúdo,
conservando o status global PWA. A coleta iOS atual tem184=94+90 casos, união
exata e interseção zero. Coleta não significa execução. CI do próximo SHA,
configuração VAPID de preview e aparelhos/provedores reais continuam gates
separados. A matriz permanece parcial e D-B continua ativa.
[Fontes, contraprovas e limites](D5_2_EVIDENCE.json).
