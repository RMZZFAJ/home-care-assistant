# Privacidade, observabilidade e capacidade operacional

## Dados e governança: B5-005

Mensagens usam nome do destinatário, nome/identificador do paciente, atores,
código/estado documental, datas e contadores. Alertas usam produto, local,
saldo e limiar. PDF pode conter conteúdo operacional assistencial completo.
O nome curto é configurável, mas seu fallback é o nome do paciente; não existe
regra que garanta ausência de nome/medicamentos como afirma WHATSAPP_AI.
Fonte e B54-C05 demonstram o contrato, sem envio ou dados privados reais.

É questão de minimização/governança sustentada, sem parecer jurídico ou prova
de vazamento. Opt-in e telefone confirmado são controles de autorização úteis;
não decidem sozinhos quais campos são necessários, quem pode ver notificações
na tela bloqueada ou o que ficará copiado no provedor. Definir conteúdo mínimo,
destino, base de tratamento, operadores e retenção antes de habilitar.

Tokens de propósito específico e Flow ficam como hash no banco. Inbound guarda
hash do telefone/provider ID/resultado, sem copiar todo envelope bruto; relatos
e flow_submissions guardam texto operacional para revisão. Template snapshot
é definição, não prova imutável do texto final realmente entregue. Outbox guarda
destino/label/erro/última referência. Logs API/callback omitem payload e
segredos;
os probes usaram dados fictícios, chaves efêmeras e credenciais fora do Git.

Retenção/purga coordenada de outbox, desafios, submissões, mídia externa e
evidências não tem política operacional comprovada. Não criar uma tarefa de
apagar história como atalho. Após envio, revogar acesso no app não recolhe PDF
ou mensagem já copiados externamente. B4-010 e a janela de URL B3-022 são
fronteiras distintas; nenhum link assinado ativo foi registrado neste pacote.

## Saúde e capacidade de acompanhamento

- **Cron executou?** — O que existe: cron.job/run details e scheduler_health
  SQL; O que falta provar/definir: Último sucesso por domínio/paciente; health
  não é progresso útil.

- **Qual fila ficou atrasada?** — O que existe: outbox com
  created_at/next_attempt_at/attempts; O que falta provar/definir: SLO, idade
  máxima e alerta acionável por paciente/canal.

- **Houve envio/entrega/leitura?** — O que existe: state/ref/timestamps no
  banco e tracking; O que falta provar/definir: Callback homologado;
  timestamps do provedor não retidos.

- **Posso reenviar?** — O que existe: retry failed; uncertain exige
  confirmação; audit do retry; O que falta provar/definir: Conciliação guiada
  e identidade por tentativa; B5-002/013.

- **Serviço está sem configuração?** — O que existe: erro seguro/hold
  infinity; flags e aprovação; O que falta provar/definir: Alerta e retomada
  para cada hold; não tratar pending como SLA normal.

- **Há falha de entrada?** — O que existe: HTTP erro e dedup para comandos
  aceitos/algumas recusas; O que falta provar/definir: Diagnóstico
  mínimo/handoff B5-006; sem armazenar payload excessivo.

- **Quem precisa agir?** — O que existe: papéis, destinatário, tasks e
  documentos; O que falta provar/definir: Responsável de
  incidente/escalonamento ainda precisa decisão humana.

Não foi encontrado consumidor de scheduler_health no aplicativo. Há uma fila
administrativa paginada e ações de retry/conciliação; não é ausência total de
operação. Admin-console, porém, não usa live revision para essa lista: é outro
consumidor do padrão B5-010, sustentado estaticamente, sem novo navegador.

## B5-014: informação insuficiente para a conciliação prescrita

`/api/admin/notifications` omite provider_reference, event_key, document_id,
lease e next_attempt_at. A UI exibe pessoa/canal/estado/tentativas/último erro e
hora, mas não a referência externa nem identidade da tentativa. Ao mesmo tempo,
pede confirmar que a mensagem não foi aceita no provedor antes do retry.

É lacuna funcional confirmada por projeção/consumidor, com impacto condicionado
ao uso externo. Um operador técnico pode buscar no banco/log autorizado ou usar
contato e horário como pistas; não se afirma conciliação impossível. Falta um
percurso suficiente para o responsável não técnico distinguir mensagens e
tentativas, especialmente após B5-013. Não resolver expondo telefone completo,
tokens ou conteúdo assistencial a quem só lê notificações. Usar identificação
mínima, escopo do paciente, registro da decisão e histórico necessário.

## Orçamento de capacidade, sem inventar métricas

- Claim TS: default25/teto50; dez jobs por onda; lease120s e maxDuration120s.
  Upload e messages têm15s cada, fora custo SQL/PDF. Cinco ondas de caminhos
  próximos de30s excedem120s; A já mediu140s virtuais com duas chamadas de14s.
  Não repetir carga nem chamar isso de latência de produção. Default25 reduz
  exposição, sem provar folga para render/DB/locks.
- Não há heartbeat ou renovação de lease no worker. Lease conta desde claim
  do lote, incluindo espera pelas ondas seguintes. Deadline de HTTP não é um
  cancelamento transacional do efeito externo. Crash deve conservar uncertain.
- Backoff começa em60s após a primeira tentativa; segue120/240/480, com limite
  de cinco e teto configurado3600s. Holds especiais ficam em infinity. Não há
  prova de throughput/SLO com volume real ou de justiça sob influxo contínuo de
  alertas críticos; finite backlog e prioridade não garantem prazo universal.
- Lotes SQL: lifecycle25/100/50, legado100 sem cursor, BAL100 com rotação,
  entrega interna100. Compartilhamento entre pacientes deve ser medido por
  idade/progresso, não por cron continuar verde.
- PDF grande/media, quantidade de linhas, latência Meta e limites da conta
  precisam de amostras progressivas na homologação autorizada. Não foi feito
  teste de carga, benchmark remoto, medição de custo ou compra de serviço.

## Preparação operacional mínima

Definir prazos, responsável, escalonamento, consulta do resultado incerto,
reabertura segura de hold, contingência interna e critério de suspender o canal.
Flag global e regras por paciente já permitem restringir envios; não recomendar
novo motor de filas. Monitorar fila/idade/último progresso e entradas recusadas
com códigos e IDs mínimos. Habilitação e retorno após incidente precisam de
ensaio de recuperação e autoridade clara, sem reenviar toda a fila antiga.
