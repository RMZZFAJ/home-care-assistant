# Arquitetura de PWA e entrega Web Push

Reusar evento/outbox persistente e autoridade do banco. Novo transporte Web
Push não cria segundo motor de obrigação nem um backend paralelo. Os nomes
abaixo são propostas técnicas condicionadas a P10/P13 e review do catálogo D.

## Cliente, inscrição e dados

Manifesto versionado descreve nome/ícones/start_url/scope/display em mesma
origem. Worker tem escopo mínimo apropriado, atualização controlada e cache
somente de assets públicos versionados/offline shell. Excluir APIs privadas,
HTML autenticado, PDFs e respostas com dados de paciente; logout não depende
de conseguir apagar uma cópia já baixada. Testar upgrade de worker com aba em
edição e schema/API compatíveis antes de ativar versão nova.

<!-- c-table:start -->

- **Estrutura/contrato proposto:** Subscription própria

  **Dados:** id, user_id, device_id, endpoint cifrado/restrito, p256dh/auth,
  public_key_version, created_at, last_confirmed_at, status, revoked_at

  **Autorização e unicidade:** Endpoint é segredo de capacidade; titular vê só
  descrição/estado; vínculo/sessão no subscribe; dedup pelo endpoint hash e
  titular.

- **Estrutura/contrato proposto:** Preferência

  **Dados:** user, tipo/categoria/canal, versão, instante e origem do opt-in

  **Autorização e unicidade:** Própria; política mínima P02/P13 não é
  modificada por endpoint; opt-in não concede papel.

- **Estrutura/contrato proposto:** Tarefa de entrega

  **Dados:** internal_event_id, recipient_id, subscription_id, generation,
  deadline, state, lease, attempts

  **Autorização e unicidade:** Unique
  evento/destinatário/subscription/intenção; conteúdo mínimo; só serviço
  restrito reserva.

- **Estrutura/contrato proposto:** Tentativa

  **Dados:** job_id, generation, attempt_id, stage, started_at, result,
  safe_provider_code

  **Autorização e unicidade:** Resultado de tentativa antiga não encerra
  lease/generation atual; preserve histórico mínimo de conciliação.

- **Estrutura/contrato proposto:** POST/DELETE subscription

  **Dados:** Sessão, origem/CSRF, endpoint/chaves e intenção; resposta segura

  **Autorização e unicidade:** Titular não inscreve outro usuário; endpoint
  HTTP/privado/interno é recusado.

<!-- c-table:end -->

Chaves VAPID de aplicação ficam no servidor, versionadas e separadas por
ambiente.
Public key vai ao cliente; private key e auth da subscription não vão a logs.
Escolher biblioteca de protocolo após avaliar suporte e dependências no lote
D5;
não implementar criptografia própria ou instalar pacote nesta C.

## Entrega e falhas

Fato operacional confirmado gera evento interno e tarefa elegível. Worker
reserva por lease, confere feature gate, vínculo/capacidade do destinatário,
subscription e preferência vigentes, prepara mensagem mínima e envia com
budget.
Payload proposto: identificador opaco de notificação, texto genérico, tag de
dedup e caminho relativo seguro; sem paciente, material, quantidade ou token.
O click autentica, resolve notificação e revalida o contexto no servidor.

Validar endpoint HTTPS e hosts de serviços push efetivamente suportados e
aprovados; resolver destino com proteção contra IP/rede privada, redirects e
DNS rebinding onde aplicável ao cliente HTTP escolhido. Não aceitar URL livre
do usuário como proxy de rede. Limitar tamanho/chaves/quantidade por titular.
Endpoint gerado no browser continua entrada não confiável ao servidor.

Accepted do serviço não demonstra exibição/leitura. 404/410 desativam
inscrição
com estado e orientação; 429/5xx seguem backoff limitado/deadline; credencial
inválida é falha de configuração para suporte, sem retry infinito. Timeout no
ponto de envio registra uncertain por tentativa; não apagar evento interno nem
reemitir operação. Retry seguro/dedup do aviso não é garantia universal de
exactly-once externa. Tag/collapse pode reduzir avisos sem perder tarefas
internas, que permanecem individualmente consultáveis.

Revogação antes do dispatch impede nova tentativa autorizada; durante chamada
externa há janela física que exige garantia P15 e conteúdo mínimo. Mensagem
já aceita não é recuperável por promessa de cancelamento. No dispositivo
compartilhado, logout desassocia inscrição/conta e worker mostra apenas aviso
genérico; login seguinte não ganha acesso ao payload anterior. Configuração de
silêncio/Focus/bateria e rede pode atrasar ou suprimir exibição.

## Operação e custo

Métricas: eventos internos pendentes/idade, elegíveis por canal, lease
expirada,
tentativa por etapa, erro permanente, invalid subscriptions e última consulta
do responsável. Não medir saúde só pelo 200 ou count de mensagens aceitas.
Lote/deadline/concurrency devem caber no runtime real medido, com margem,
checkpoint e interrupção segura; P13 define metas/donos/custo, sem valores
fictícios.
Restore mantém dispatch em quarentena até conciliar pós-corte e
ambiente/chaves.

Gate D5: transporte controlado e rede imprevista bloqueada nos testes; D6:
aparelhos/serviços reais autorizados, foreground/background/fechado, opt-in,
negação, revoke, expiração, clique sem sessão, acessibilidade e offline.
Meta/e-mail operacional não se habilitam por consequência de adicionar push.
Auth e-mail de confirmação/recuperação é homologação própria do núcleo.
