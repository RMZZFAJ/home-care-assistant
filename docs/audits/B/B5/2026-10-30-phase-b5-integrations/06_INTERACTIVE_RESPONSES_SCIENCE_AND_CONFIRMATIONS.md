# Interações, ciência e confirmações

## Matriz de propósito e autoridade

- **HCA_ACCEPT** — Identidade/contexto: phone Auth confirmado, destinatário
  ENT, token hash, versão, política, capacidade; Efeito permitido: Aceite de
  tudo via comando ENT; ledger e securityLevel reais; Repetição/recuperação:
  10 min; provider ID/lock; token único; divergência/cancelamento no app.

- **HCA_SCIENCE** — Identidade/contexto: destinatário elegível REQ, phone
  atual, versão, preferências e hash; Efeito permitido: Ciência
  whatsapp_confirm, sem receber materiais; Repetição/recuperação: 10 min; dedup
  inbound; rejeita prazo/versão inválidos.

- **callback read REQ** — Identidade/contexto: template de ciência conhecido,
  referência correlacionada, phone atual, política+preferência automática,
  membership; Efeito permitido: Ciência whatsapp_read com origem e referência;
  Repetição/recuperação: Inserção por REQ/pessoa impede duplicação; não é
  ciência expressa.

- **HCA_NO_ISSUES** — Identidade/contexto: lembrete shift da pessoa, phone
  confirmado, hash, capacidade atual; Efeito permitido: Acknowledged + audit,
  nenhum débito; Repetição/recuperação: 20 min; token/provider ID únicos; não
  equivale a contagem física.

- **ciência app** — Identidade/contexto: sessão/contexto/capacidade/versão;
  Efeito permitido: Modalidade express/app_visible conforme política;
  Repetição/recuperação: API e RPC revalidam; exposição do cabeçalho
  UX-002/B1-UX-008 permanece.

- **consumo/falta por texto/Flow** — Identidade/contexto: contexto e revisão
  autorizados; Efeito permitido: Relato pendente; Repetição/recuperação:
  Confirmação distinta é necessária para débito.

Prefixos selecionam RPCs distintas; um hash de lembrete não é desafio de ciência
nem de recebimento. Compartilhar mensagem não muda vínculo ou propósito. Não
foi homologado encaminhamento real no WhatsApp; posse de telefone confirmado
é evidência limitada, não identidade biométrica nem entendimento do conteúdo.

## Prova dirigida e contraprovas

[B56-S01–04](evidence/b56-interaction-results.json), funções vigentes e fixtures
novas em rollback: telefone errado, propósito errado, desafio expirado e vínculo
revogado foram recusados. Um “sem ocorrências” válido criou um único audit e
nenhum movimento; replay não criou outro. Auth confirmou telefone fictício por
API administrativa local; não houve SMS, Meta ou pessoa confirmando presença.

Aceite ENT e ciência com versão/membership/telefone já foram exercitados em
B3 e nas integrações V4; código idêntico, sem replay integral. Os novos testes
não substituem a suíte Auth/RLS nem provam o transporte externo.

## B5-007: resolução externa apresentada como vista no aplicativo

`acknowledge_no_issues` marca seen_at de todas as notificações do lembrete após
a resposta WhatsApp. B56-S02 gravou esse campo em linha externa, sem abrir o
app. Central usa o mesmo campo para o rótulo “Vista no aplicativo”. A resolução
do lembrete é legítima e útil; sua origem é que fica representada de modo
impreciso na apresentação. É inconsistência P3, não prova de recebimento físico
ou autorização indevida. Audit `shift.no_issues` preserva a origem
compensatória.
Uma correção futura deve distinguir motivo de resolução/visualização sem
reativar pendência já respondida.

## Ambiguidades e limites ainda relevantes

Ciência automática de read não exige que a pessoa abra cada página/material.
Guarda template e referência do evento original; `record_science` atribui a
evidência à REQ e usuário, não demonstra compreensão da versão atual. Não foi
promovida a defeito novo uma leitura tardia só porque a versão documental
mudou por lembrete/ciência: versões também avançam sem mudar materiais. Uma
mudança real de conteúdo exigirá critério de revalidação de ciência específico,
sem apagar evidência anterior ou prometer leitura integral.

Comando falso/expirado pode retornar false/accepted=false e a rota ainda contar
processed1; B5-006 descreve a falha de encaminhamento. ENT registra rejeição em
inbound_messages em parte desses ramos; ciência e no_issues geralmente retornam
false sem registro. Não generalizar “nenhuma recusa registrada” para todos.

Troca de telefone, destinatário ou revogação impede nova confirmação quando
revalidada, mas não desfaz mensagem já entregue. Desafios curtos podem vencer
enquanto a pessoa confere o PDF; alternativa é o aplicativo autenticado.
Regra de envio, opt-in e regra de execução são fronteiras distintas. Nenhuma
confirmação de provedor substitui conferência física ou autorização de consumo.
