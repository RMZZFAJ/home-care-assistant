# Critérios futuros de aceitação e regressão

Propostas para fase de implementação autorizada. Não foram adicionados testes
funcionais permanentes nem correções. Cada linha abaixo é um conjunto de
critérios, não um teste aprovado.

Para todos os casos: ambiente isolado/guard validado, dados sintéticos novos,
identidade Auth real e paciente explícito; comparar resposta, estado, ledger,
evento/hash e ausência de efeitos externos. Falha precisa de código
seguro/correlação; repetir intenção não pode duplicar efeito. Capturar
antes/depois e provar preservação de história. Não usar reset na base
operacional.

## B3-001 — Jobs/lifecycle

**Achado:** Candidatos terminais podem impedir indefinidamente o progresso de
REQ

**Pré-condição e operação:** Ciência/lembrete/arquivamento multipaciente.
Reproduzir o estado e cenário B39-01; B39-02.

**Identidade/autorização:** Não demonstrou acesso indevido; seleção interna
prejudica pacientes autorizados.

**Aceitação e persistência:** Com 25/100 bloqueadores e vários alvos, execuções
limitadas alcançam todos; cada lembrete elegível aparece uma vez; falha não
perde posição.

**Repetição, concorrência, falha e recuperação:** Ciência
dispensada/obrigatória; arquivo manual/automático; BAL cursor; repetição e
rollback pós-lote.. Repetir após resposta perdida, concorrer decisões
incompatíveis e verificar rollback ou resultado recuperável conforme contrato.
Nos riscos de medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Pular trabalho pendente, alterar justiça da fila ou gerar
lembrete/arquivo duplicado. REQs canceladas com next_reminder_at vencido e
backlog legítimo posterior; não apagar história.

**Decisão prévia:** Definir prazo máximo de progresso e tratamento auditável de
trabalho terminal.

## B3-002 — Documentos/estoque

**Achado:** Cancelamento ENT com consumo real confirmado falha no SQL de
reconciliação

**Pré-condição e operação:** Conciliar devolução e consumo anterior de entrega
aceita. Reproduzir o estado e cenário B36-05.

**Identidade/autorização:** Ator correto é exigido; não houve consentimento por
terceiro.

**Aceitação e persistência:** Entrega aceita com parte consumida permite
consentimento coerente; retorno físico apenas uma vez; consumo anterior
permanece único.

**Repetição, concorrência, falha e recuperação:** Sem consumo, parcial, total,
duplicação, versão antiga, estoque alterado e REQ arquivada/reaberta.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Somar consumo errado, estornar quantidade consumida ou
repetir movimento de devolução. ENTs cancellation_pending com aceite e consumo
anterior confirmado; preservar suas versões.

**Decisão prévia:** Ratificar o significado da reconciliação, sem substituir
consumo real por declaração inventada.

## B3-003 — Escalas/BAL

**Achado:** Aprovação posterior pode republicar plantões além do encerramento da
série

**Pré-condição e operação:** Encerrar recorrência com proposta pendente.
Reproduzir o estado e cenário B37-03; B37-11.

**Identidade/autorização:** Revisor autorizado; falta consistência do estado,
não permissão global indevida.

**Aceitação e persistência:** Encerrar após proposta e depois aprovar não
publica ocorrência fora do corte nem cria BAL derivado dela.

**Repetição, concorrência, falha e recuperação:** Proposta recusada, parcial,
recorrência normal, limite de fuso, conflito global e contagem passada.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Apagar plantões passados, presença ou atribuições já
contadas; perder proposta original. Séries encerradas com proposta
pendente/aprovada; reconciliar ocorrências por decisão, sem exclusão cega.

**Decisão prévia:** Decidir se proposta vencida é recusada ou reapresentada com
comparação clara.

## B3-004 — Storage/anexos

**Achado:** Reservas abandonadas ocupam permanentemente a capacidade de anexos

**Pré-condição e operação:** Enviar evidências e recuperar upload interrompido.
Reproduzir o estado e cenário B310-05.

**Identidade/autorização:** Revalidação de membro bloqueou upload/finalização
após revogação.

**Aceitação e persistência:** Após abandono comprovado, nova intenção obtém vaga
sem tocar ready; retry válido recupera mesmo arquivo/hash/versão.

**Repetição, concorrência, falha e recuperação:** Duas reservas finais
concorrentes, mesma chave/outro conteúdo, revogação, bytes existentes e ready..
Repetir após resposta perdida, concorrer decisões incompatíveis e verificar
rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Excluir upload em andamento, arquivo ready ou PDF
histórico; colisão de retry com limpeza. Reservas quarantine antigas; distinguir
ativas de abandonadas antes de qualquer manutenção.

**Decisão prévia:** Prazo de retomada e quem pode abandonar/recuperar
capacidade.

## B3-005 — Ledger/rastreabilidade

**Achado:** Correção compensatória aceita movimento sem referência ao fato
corrigido

**Pré-condição e operação:** Corrigir entrada ou saída familiar. Reproduzir o
estado e cenário B35-11.

**Identidade/autorização:** Sem escalada de papel; defeito é de
contrato/rastreio.

**Aceitação e persistência:** Correção sem origem é recusada sem efeito; com
origem compatível cria compensação imutável e repetível.

**Repetição, concorrência, falha e recuperação:** Outro
paciente/produto/custódia, mesma chave, teto, precisão, overdraw e histórico
original.. Repetir após resposta perdida, concorrer decisões incompatíveis e
verificar rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Inventar referência para legado ou impedir ajuste
legítimo cuja origem é desconhecida. Movimentos correction sem referência;
manter registro e classificar sem reescrever.

**Decisão prévia:** Como registrar ajustes legítimos sem origem e quem os
autoriza.

## B3-006 — BAL/revisão

**Achado:** BAL legado permite ao supervisor revisar a própria contagem

**Pré-condição e operação:** Revisão independente de contagem. Reproduzir o
estado e cenário B37-01; B37-07; B37-09.

**Identidade/autorização:** Capacidade existe, mas separação de
responsabilidades é incompleta.

**Aceitação e persistência:** Contador efetivo não revisa própria versão;
revisor autorizado distinto funciona; reconto zera elegibilidade de aprovações
anteriores.

**Repetição, concorrência, falha e recuperação:** Criador diferente do contador,
duas aprovações, any/all, reconto e ledger revision.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Bloquear revisor legítimo por confundir created_by com
counted_by; invalidar contagem antiga sem processo. BALs legados com
autorrevisão; avaliar sem apagar aprovações históricas.

**Decisão prévia:** Independência obrigatória para legado e tratamento das
contagens já aprovadas.

## B3-007 — Consumo/retorno transacional

**Achado:** Decisão oposta de consumo retorna sucesso sem ter sido aplicada

**Pré-condição e operação:** Confirmar ou rejeitar relato. Reproduzir o estado e
cenário B34-04; B38-08.

**Identidade/autorização:** Não houve capacidade indevida; atores autorizados
discordaram.

**Aceitação e persistência:** Mesma decisão recupera estado; decisão oposta
recebe conflito/resultado inequívoco; no máximo um débito sob concorrência.

**Repetição, concorrência, falha e recuperação:** Confirmar duas vezes, rejeitar
duas vezes, opostas simultâneas, consumo/falta e resposta ignorada.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Transformar retry legítimo em duplicação ou permitir
reversão silenciosa de consumo confirmado. Relatos terminais já
confirmados/rejeitados; não alterar sua decisão por retry.

**Decisão prévia:** Como apresentar e eventualmente contestar decisão terminal
sem reescrever fato.

## B3-008 — BAL/adiamento

**Achado:** Adiamento BAL com alvo alterado permanece pendente e nem rejeição
conclui

**Pré-condição e operação:** Decidir pedido de adiamento. Reproduzir o estado e
cenário B37-05.

**Identidade/autorização:** Família autorizada também não consegue rejeitar.

**Aceitação e persistência:** Alvo alterado não aprova silenciosamente;
recusa/invalidação conclui uma vez e mantém prazo original.

**Repetição, concorrência, falha e recuperação:** Alvo válido, conflito
simultâneo, fuso, alteração de contador e repetição da decisão.. Repetir após
resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Aprovar alvo diferente do apresentado ou apagar
prazo/motivo original. Pedidos pending cujo target version mudou; preservar
origem e decisões.

**Decisão prévia:** Estado obsoleto versus recusa familiar e quem pode
reapresentar pedido.

## B3-009 — BAL/escala

**Achado:** Substituição em reconto invalida atribuição sem criar sucessor
automaticamente

**Pré-condição e operação:** Recontar ciclo counted após substituir
profissional. Reproduzir o estado e cenário B37-08; B37-09.

**Identidade/autorização:** Não liberar qualquer pessoa como contador para
resolver bloqueio.

**Aceitação e persistência:** Após substituição, há um único caminho elegível
para reconto; preservam-se autor, contador, prazos, atraso e revisão de versão.

**Repetição, concorrência, falha e recuperação:** Ciclo aberto/contado,
assign_recount, janela encerrada, dupla atribuição e ledger alterado.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Duas atribuições ativas, perda de prazo original ou
herança de aprovação de outro contador. Ciclos counted em reconto com atribuição
invalidada/substituição.

**Decisão prévia:** Automatizar sucessor ou exigir decisão humana informada.

## B3-010 — Compras/fechamento

**Achado:** COM parcialmente realizada não permite desistir apenas do
remanescente

**Pré-condição e operação:** Encerrar compra aprovada quando apenas parte será
realizada. Reproduzir o estado e cenário B36-07.

**Identidade/autorização:** Ator autorizado não tem comando apropriado; não
ampliar permissão de apagar fatos.

**Aceitação e persistência:** Recebidos2 permanecem; 8 podem receber
encerramento explícito sem novo movimento; previsão pendente zera apenas parte
desistida.

**Repetição, concorrência, falha e recuperação:** Compra/recebimento pendente,
recusa de recibo, duas decisões e cancelamento sem fatos físicos.. Repetir após
resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Cancelar recebimento real, liberar crédito duplo ou
esconder remanescente sem evento. COMs parciais antigas com previsão pendente.

**Decisão prévia:** Quem desiste, qual motivo e se precisa nova aprovação.

## B3-011 — Read models/consumo

**Achado:** Relatos antigos não são alcançáveis pela rota normal após 100
registros recentes

**Pré-condição e operação:** Conferir pendência antiga a partir de
painel/notificação. Reproduzir o estado e cenário B311-01.

**Identidade/autorização:** Leitura direta autorizada funciona; não é falha de
RLS.

**Aceitação e persistência:** Comcentenas de relatos, referência antiga abre e
todas páginas são alcançáveis; contador explica conjunto completo.

**Repetição, concorrência, falha e recuperação:** Mesmo timestamp, novos
inserts, revogação, outro paciente, sem resultado e erro de banco.. Repetir após
resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Perder filtro por paciente/dono, duplicar página com
inserts ou devolver lista vazia para erro. Todos relatos fora da janela100;
preservar e tornar acessíveis.

**Decisão prévia:** Filtros prioritários e comportamento ao seguir referência
antiga.

## B3-012 — Auditoria/read models

**Achado:** Auditoria administrativa trunca eventos antigos sem percurso de
consulta

**Pré-condição e operação:** Investigar ação administrativa antiga. Reproduzir o
estado e cenário B311-02; QP-04.

**Identidade/autorização:** A solução precisa manter audit.read e paciente
correto.

**Aceitação e persistência:** Evento antigo alcançável por referência/página;
ordem determinística e escopo idêntico sob limites.

**Repetição, concorrência, falha e recuperação:** Vários pacientes, mesmo
timestamp, ato global sem paciente, revogação e volume.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Expor metadados de outro paciente ou criar índice oneroso
sem seletividade. Eventos mais antigos que janela100; nenhum expurgo autorizado.

**Decisão prévia:** Horizonte de consulta/retencão e responsáveis pelo acesso
auditável.

## B3-013 — Contexto/frescor

**Achado:** Edição de perfil não avisa consumidores pela revisão de workspace

**Pré-condição e operação:** Atualizar nome/perfil refletido no contexto.
Reproduzir o estado e cenário B311-03.

**Identidade/autorização:** Não demonstrou bypass por cache; preservar revogação
em tempo de comando.

**Aceitação e persistência:** Editar perfil próprio incrementa revisão e
atualiza consumidor; outro usuário sem relação não recebe dados.

**Repetição, concorrência, falha e recuperação:** Membership revogado, proposta
global, último admin, alteração de catálogo e nomes em PDF histórico.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Fan-out excessivo, canal de outro usuário, payload
privado ou loop de invalidação. Clientes abertos e revisões correntes; não
reescrever snapshots de nomes históricos.

**Decisão prévia:** Quais mudanças exigem atualização imediata e para quem.

## B3-014 — Recuperação/continuidade

**Achado:** Restauração operacional conjunta ainda não foi comprovada

**Pré-condição e operação:** Recuperar operação após perda de ambiente.
Reproduzir o estado e cenário Inventário somente leitura; B310-09 delimita
metadado sem bytes.

**Identidade/autorização:** Chaves, sessões e grants precisam ser
recuperados/rotacionados sem restaurar autoridade indevida.

**Aceitação e persistência:** Restore isolado recupera login, permissões,
hashes, ledger, bytes e filas conciliadas; responsável mede RPO/RTO e documenta
recuperação.

**Repetição, concorrência, falha e recuperação:** Versão antiga/PDF, usuário
revogado, lease incerto, metadado sem objeto e referência externa já enviada..
Repetir após resposta perdida, concorrer decisões incompatíveis e verificar
rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Restaurar sobre ambiente errado, repetir mensagens
externas, invalidar login ou perder evidência histórica. Toda base histórica,
objetos Storage e integrações; nenhuma cópia pública de dump.

**Decisão prévia:** Dono, RPO, RTO, retenção e autorização do destino de ensaio.

## B3-015 — História/capacidade

**Achado:** Snapshots acumulam quadraticamente resumos do histórico

**Pré-condição e operação:** Manter e consultar documento de longa duração.
Reproduzir o estado e cenário B312-06; B312-09.

**Identidade/autorização:** Nenhuma exposição demonstrada; otimização não pode
retirar filtro de acesso.

**Aceitação e persistência:** Publicar orçamento em volume representativo e
manter hash/PDF de versões antigas após eventual evolução.

**Repetição, concorrência, falha e recuperação:** Mil eventos, digests,
previousHash, PDF histórico, restore e ciência desconhecida legada.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Mudar canonicalização, quebrar PDFs/hash antigos ou
apagar lembretes necessários. Documentos com muitas versões/lembretes e seus
PDFs.

**Decisão prévia:** SLO, retenção e se lembrete gera versão documental
semântica.

## B3-016 — Workers/integrações

**Achado:** Orçamento máximo do worker externo permanece sem validação
operacional

**Pré-condição e operação:** Processar lote de notificações externas com atraso
do provedor. Reproduzir o estado e cenário Inspeção vigente; B39-05 leases;
simulação anterior A não recontada como teste B3.

**Identidade/autorização:** Destinatário/contato revalidados, sem bypass
demonstrado.

**Aceitação e persistência:** Lote sob atrasos/falhas termina dentro do
orçamento ou reprograma estado inequívoco; no máximo envio conciliado por
intenção.

**Repetição, concorrência, falha e recuperação:** Uploadlento, sendlento,
callbackantescomplete, workererrado, recipientrevoked e uncertainretry.. Repetir
após resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Aumentar concorrência sem capacidade, duplicar envio ou
mascarar timeout com aceitação fictícia. Jobs uncertain/processing e referências
externas que podem já ter sido entregues.

**Decisão prévia:** SLA de notificação e procedimento para confirmar reenvio
incerto.

## B3-017 — RPC/validação

**Achado:** Valor nulo na decisão de consumo é persistido como rejeição

**Pré-condição e operação:** Decidir relato por RPC autorizada. Reproduzir o
estado e cenário B34-05.

**Identidade/autorização:** Não ultrapassa papel/paciente; validação incompleta
no banco exposto.

**Aceitação e persistência:** Reported+null falha sem mudar
status/ledger/eventos; true/false explícitos funcionam com mesma capacidade.

**Repetição, concorrência, falha e recuperação:** Nulo, omitido, false, true,
terminaloposto, concorrência e ator sem capacidade.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Trocar semântica de false ou impedir retry da mesma
decisão. Não é possível inferir quais rejected antigos vieram de NULL; sem
atribuição retroativa inventada.

**Decisão prévia:** Nenhuma semântica de negócio exige NULL; definir erro
público consistente.

## B3-018 — Ledger/quantidades

**Achado:** RPC familiar arredonda excesso de casas antes de validar precisão do
produto

**Pré-condição e operação:** Registrar quantidade base exata de material.
Reproduzir o estado e cenário B35-09.

**Identidade/autorização:** Sem escopo/papel indevido; risco está no valor do
comando.

**Aceitação e persistência:** 1.0000004 em produto inteiro é recusado sem
movimento; quantidade permitida persiste exatamente e retry mantém ID.

**Repetição, concorrência, falha e recuperação:** Valores perto da fronteira0/1,
NaN/Infinity, teto, decimais0..6, JSONstring e número.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Mudar rounding de legado, aceitar notação inesperada ou
quebrar unidades fracionárias válidas. Não reconstruir casas originais perdidas;
movimentos existentes permanecem imutáveis.

**Decisão prévia:** Reafirmar política de rejeitar precisão inválida; qualquer
arredondamento deve ser explícito e auditável.

## B3-019 — Catálogo/conversão

**Achado:** Fator NaN de apresentação é aceito no catálogo por RPC direta

**Pré-condição e operação:** Definir conversão de apresentação para quantidade
base. Reproduzir o estado e cenário B35-10.

**Identidade/autorização:** Não há autorização indevida; regra de domínio
ausente na camada final.

**Aceitação e persistência:** NaN/Infinity/zero/negativo recusados sem alteração
de catálogo; fatores fracionários válidos preservados.

**Repetição, concorrência, falha e recuperação:** Conversão exata, unidade com
histórico, apresentação inativa e autorização local.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Substituir fator inválido por número inventado ou alterar
unidade com história. Apresentações com valores especiais precisam de
diagnóstico autorizado; não inferir produção afetada.

**Decisão prévia:** Política para desabilitar apresentação inválida sem
reinterpretar documentos antigos.

## B3-020 — Autorização/concorrência

**Achado:** Movimento já em espera pode concluir depois da revogação ou troca de
contexto

**Pré-condição e operação:** Revogar autoridade enquanto comando aguarda
transação. Reproduzir o estado e cenário B38-06; B312-02.

**Identidade/autorização:** Janela demonstrada de comando pré-iniciado; sem
escalada universal de revogado.

**Aceitação e persistência:** Política escolhida é demonstrada com barreira; se
exigir autoridade no commit, revogação impede novo movimento após espera sem
parcial.

**Repetição, concorrência, falha e recuperação:** Revogação simultânea,
contextoA/B, mesma chave, overdraw, último admin e BALrecuperação.. Repetir após
resposta perdida, concorrer decisões incompatíveis e verificar rollback ou
resultado recuperável conforme contrato. Nos riscos de medição/restore, não
substituir ensaio real por mock.

**Proibido destruir:** Deadlock por nova ordem de locks, recusar retry já
aplicado ou aumentar contenção de sessão. História permanece atribuída ao autor;
nenhum movimento retroativo deve ser apagado.

**Decisão prévia:** Revogação cancela intenções em curso ou só impede novas?
Documentar garantia concreta.

## B3-021 — Sessões/identidade/Storage

**Achado:** JWT de sessão encerrada ainda escreve identidade e avatar próprios

**Pré-condição e operação:** Encerrar sessão e impedir seu uso posterior no
produto. Reproduzir o estado e cenário B310-10; B312-01.

**Identidade/autorização:** Desalinhamento de revogação entre camadas; nenhum
acesso cruzado demonstrado.

**Aceitação e persistência:** JWT de sessão encerrada não escreve perfil/avatar
nem ponteiro; login novo legítimo funciona; negado não muda registro/bytes.

**Repetição, concorrência, falha e recuperação:** Uma versus todas sessões,
refresh, perfil revogado, ownprefix/crossprefix, patient-evidence e
URLjáemitida.. Repetir após resposta perdida, concorrer decisões incompatíveis e
verificar rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Bloquear upload/login legítimo, inviabilizar
OAuth/refresh ou confundir logout de uma sessão com todas. Tokens ainda não
expirados de sessões encerradas; objetos próprios existentes não devem ser
apagados.

**Decisão prévia:** Abrangência exata de logout/revogação por sessão e
comunicação ao usuário.

## B3-022 — Storage/governança

**Achado:** URL de arquivo já emitida continua válida durante TTL após revogar
vínculo

**Pré-condição e operação:** Revogar acesso a arquivo privado. Reproduzir o
estado e cenário B310-06.

**Identidade/autorização:** Janela limitada de credencial previamente legítima,
distinta de falha de RLS.

**Aceitação e persistência:** Decisão publicada; seTTLaceito, linkexpira no
prazo e novaAPInega; seproxy, revogação revalidada por download.

**Repetição, concorrência, falha e recuperação:** Download autorizado, revogado,
TTLexpirado, PDFhistórico, cache e linkjárecebido.. Repetir após resposta
perdida, concorrer decisões incompatíveis e verificar rollback ou resultado
recuperável conforme contrato. Nos riscos de medição/restore, não substituir
ensaio real por mock.

**Proibido destruir:** Downloads interrompidos, custo/latência de proxy e falsa
promessa de revogar cópias já baixadas. Links emitidos ainda dentro do TTL;
bytes históricos devem permanecer.

**Decisão prévia:** Qual janela residual é aceitável para arquivos privados?

## B3-023 — Read models/contrato

**Achado:** NULL explícito remove o limite de página da RPC documental

**Pré-condição e operação:** Listar documentos por cliente autorizado.
Reproduzir o estado e cenário B312-05.

**Identidade/autorização:** Filtros de capacidade/paciente continuam; sem
exfiltração cruzada.

**Aceitação e persistência:** NULL explícito tem comportamento definido; nenhuma
chamada autorizada passa do limite máximo; omissão mantém default normal.

**Repetição, concorrência, falha e recuperação:** Nulo/omitido/0/negativo/teto,
filtros, contagem, total e paciente sem vínculo.. Repetir após resposta perdida,
concorrer decisões incompatíveis e verificar rollback ou resultado recuperável
conforme contrato. Nos riscos de medição/restore, não substituir ensaio real por
mock.

**Proibido destruir:** Mudar tratamento de parâmetros omitidos ou quebrar
consumidor que usa NULL como default. Não há estado persistido a migrar; mapear
clientes RPC existentes.

**Decisão prévia:** Rejeitar nulo ou convertê-lo ao default, sem permitir
leitura ilimitada involuntária.

## B3-024 — Desempenho/SQL

**Achado:** Custo de autorização e alerta por movimento exige orçamento medido

**Pré-condição e operação:** Crescer ledger sem prolongar operações e locks
excessivamente. Reproduzir o estado e cenário QP-01..QP-07; QP-07-ATTEMPT-1.

**Identidade/autorização:** Nunca trocar custo de policy por acesso irrestrito
ou cache sem escopo.

**Aceitação e persistência:** Medir distribuição de latências/locks e custo por
volume; desenho escolhido conserva RLS, ledger exato e rollback.

**Repetição, concorrência, falha e recuperação:** Leitor/equipe/família,
overdrawconcorrente, quantidadesdecimais, alertasdeduplicados e crescimento..
Repetir após resposta perdida, concorrer decisões incompatíveis e verificar
rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Saldo obsoleto, precisão perdida, vazamento por cache e
índice/fan-out mais caro na escrita. Ledger grande e pacientes com muitos
membros; história não pode ser expurgada por conveniência.

**Decisão prévia:** Orçamento de latência e volume inicial antes de escolher
otimização.

## B3-025 — Jobs/recuperação de legado

**Achado:** Um registro legado malformado pode abortar repetidamente o lote
operacional

**Pré-condição e operação:** Processar backlog após evolução/restauração de
dados. Reproduzir o estado e cenário B39-07.

**Identidade/autorização:** Não é exploração pública de serviço; depende de dado
privilegiado/legado inválido.

**Aceitação e persistência:** Dado inválido provoca alerta identificável;
recuperação autorizada preserva origem e retoma alvos válidos sem duplicar
efeitos.

**Repetição, concorrência, falha e recuperação:** Poisonrow, rollback,
totalhealth, 25/100starvation e configuração normal recusando malformado..
Repetir após resposta perdida, concorrer decisões incompatíveis e verificar
rollback ou resultado recuperável conforme contrato. Nos riscos de
medição/restore, não substituir ensaio real por mock.

**Proibido destruir:** Engolir erro e reportar sucesso, pular trabalho essencial
ou fabricar configuração retroativa. Registros de política fora do contrato após
operação privilegiada/evolução; produção não inspecionada.

**Decisão prévia:** Dono da triagem e critério para isolar candidato sem
esconder falha.
