# Critérios futuros de aceitação e regressão

Estes são oráculos para implementação futura autorizada. Os probes atuais
observam defeitos; suas expectativas diagnósticas não devem virar testes que
declaram o defeito desejável. Não se alterou a suíte oficial.

Para toda escrita: Auth real, origem/paciente/capacidade verificados, novos
dados
fictícios, antes/depois por ID, evento/versão/ledger/hash quando pertinente.
Conferir o corpo HTTP, a persistência e a recuperação; status sozinho não basta.
Não usar reset, provedor real ou ambiente remoto sem autorização própria.

## AC-B4-001 — Preservar valor original

Enviar number/string equivalentes com sete casas, seis casas válidas, zero,
NULL, NaN/Infinity textual, vírgula e teto. Inválido não cria movimento nem
evento; válido respeita precisão da unidade e persiste exatamente. Mesmo corpo
e chave recuperam; corpo diferente conflita. Incluir RPC direta B3-018/019.

## AC-B4-002 — Recuperar proposta

Perder resposta antes/depois do commit em PolicyConsole e admin antigo.
Retry conserva a mesma chave/conteúdo/versão e retorna mesmo requestId.
Nova intenção deve ser explícita; não rebasa proposta antiga silenciosamente.
Proponente não aprova sua própria proposta em outro modo/aba.

## AC-B4-003 — Recuperar ingresso aprovado

Aprovar pessoa sem vínculo, interromper resposta e retomar. Resultado informa
convite único e próximo passo acionável ou reemissão guiada. Token em hash,
prazo, revogação, emissor e e-mail confirmado continuam verificados no aceite.
Reemissão invalida o token anterior; conta errada nunca aceita.

## AC-B4-004 — Representar etapas parciais

Revisar draft e falhar submissão por saldo, versão ou transporte. Resposta
indica revisão confirmada/versão e submissão recusada ou incerta, com chaves
conservadas. Read-back e retry não duplicam evento ou estoque. Repetir para
COM/ENT e BAL pertinente, sem eliminar o draft salvo como compensação fictícia.

## AC-B4-005 — Atingir toda pendência

Com51+mudanças e antiga pending, localizar por navegação e referência nos modos
local/global. Inserções concorrentes e empate de data não omitem/duplicam
decisão; filtro sem resultado difere de erro. Continuação não revela outro
paciente. Regressões consumo/auditoria B3-011/012 permanecem separadas.

## AC-B4-006 — Classificar falha corretamente

42702 não retorna conflito de produto; alias de catálogo legítimo permanece
409. Exercitar SQLSTATE42501,23505,40001,PT409,P0001,erro desconhecido e falha
externa com sentinela privada. Código público/correlação são corretos e logs
não revelam SQL, sessão ou conteúdo assistencial. UI não sugere operação errada.

## AC-B4-007 — Retomar avatar

Induzir upload confirmado e associação recusada/resposta perdida. Mesma intenção
é recuperável ou objeto fica reconciliável conforme retenção definida; não
acumular cópias indefinidamente sem política. Duas abas e troca legítima não
apagam arquivo atual nem dão acesso a terceiro. Validar com Storage real local
se a oportunidade for priorizada; mock atual não fecha esse aceite.

## AC-B4-008 — Capacidade coerente

Delegar só catalog.manage e comparar endpoints equivalentes; ambos obedecem
capacidade ou contrato de aposentadoria explícito. Negar sem capacidade,
paciente errado/inativo e global sem vínculo operacional. Consumidor atual
continua funcional e não precisa receber access.manage como contorno.

## AC-B4-009 — Entrada inválida não vira indisponibilidade

UUID malformado global/local recebe4xx seguro e não retryable. UUID válido
inexistente/oculto conserva semântica não enumerável; sessão ausente continua
401. Nenhuma exceção Zod é devolvida crua ao navegador.

## AC-B4-010 — Definir fronteira de cancelamento externo

Revogar antes de validar, durante preparo, durante mídia e após accepted.
Respeitar a garantia documentada de in-flight e conciliar callback/complete
tardios; não reenviar uncertain. Resumo distingue ignorado antes do envio de
transporte já iniciado. Primeiro ensaio local controlado, depois provedor
autorizado com destinatário fictício e métricas de deadline/lease.

## AC-B4-011 — Não perder item válido por vizinho incompatível

Lote misto texto/button_reply/list_reply/nfm_reply/áudio/malformado processa
texto válido uma vez ou informa rejeição recuperável explícita. Item não
suportado não executa ação. Testar HMAC/ativo inválidos, replay e erro depois
de primeiro commit. Homologar contrato de reentrega sem mensagem real nesta B4.

## AC-B4-012 — Consumidor responde à invalidação

Duas sessões autorizadas: nova falta/decisão faz revisão avançar; sinal recebido
gera consulta/DOM atualizados no prazo definido, mesmo com paciente idêntico.
Testar reconexão/polling, resposta invertida, troca de paciente, erro e edição
de draft. FlowReviews e demais consumidores precisam de caso próprio;
sucesso de ConsumptionConsole não certifica todos.

## AC-B4-013 — Respeitar ativação solicitada

Criar com ativo=true/false: persistir exatamente ou rejeitar false antes de
qualquer criação se produto decidir não suportá-lo. Conta inicial confirmada,
vínculo explícito e histórico preservados. Paciente inativo impede novas
operações; histórico continua autorizado. Incluir resposta perdida/retry de
criação, sem aceitar novo paciente duplicado como recuperação da intenção.

## Portões herdados

Aceites B3 e B2 continuam necessários: progresso do lifecycle P1, corte de
série/BAL, revisão independente, cancelamento com consumo, correção
referenciada,
decisão contraditória, consulta antiga, reservas, revogação e restore.
UX-001/B1-UX-001 continua P1 de decisão informada. Não substituir esses
oráculos por testes de mapper, inventário, lint ou relatório extenso.
