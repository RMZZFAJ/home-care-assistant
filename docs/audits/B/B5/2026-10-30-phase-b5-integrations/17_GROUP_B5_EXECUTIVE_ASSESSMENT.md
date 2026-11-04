# Parecer executivo B5

## Conclusão para quem administra a residência

**O NO-GO anterior permanece. A B5 terminou o diagnóstico, sem corrigir ou
habilitar o produto.** Há mecanismos importantes de proteção, mas automações
e comunicação ainda não oferecem todas as garantias necessárias para depender
delas na operação. Nenhum teste local certifica uma mensagem real da Meta.

Foram inventariados 32 mecanismos e 25 eventos WhatsApp com 34 variantes de
template. O [registro mestre](14_FINDINGS_MASTER.md) tem 14 registros: 12 P2 e
2 P3, sem novo P0/P1. Oito tratam causas novas de defeito delimitadas por prova
local/controlada, dois são riscos, um é questão de governança, um é lacuna de
operação e dois ampliam problemas anteriores. Não são 14 incidentes reais nem
14 invasões. Os P1 de progresso automático e decisão informada de escala das
fases anteriores seguem abertos.

Há 44 pontos dirigidos: 22 testes de adaptadores com dependências controladas,
20 checkpoints SQL com rollback e 2 cenários de navegador, um deles refutando
uma hipótese. Não são 44 fluxos completos externos. O código continua idêntico
à base funcional; build, suítes completas e migrations não foram repetidos.

## O que já funciona e precisa ser preservado

O sistema separa guardar um documento de enviar um aviso. A falta de WhatsApp
não apaga a ficha. Há fila persistente, limites de tentativa, reserva por worker
e tratamento de resultado incerto. As provas anteriores, com contratos iguais,
mostram proteção contra dupla operação de estoque e contra sobrescrever uma
leitura confirmada por um retorno atrasado da mesma tentativa.

Mensagem aceita pelo provedor, entregue, lida, vista no aplicativo, ciência e
recebimento de materiais são fatos diferentes. Uma entrega não é aceita por
silêncio. Relato de falta/consumo e sugestão Flow não debitam estoque sozinhos.
Telefone, vínculo, capacidade, destinatário e propósito são verificados nos
contratos pertinentes. Prazo/revogação e repetição de relatos funcionaram nos
casos dirigidos. O BAL por plantão tem rotação que alcança pacientes sucessivos;
isso é diferente do problema de seleção dos lembretes legados.

## Quais tarefas e mensagens ainda podem falhar

**Uma tarefa pode nunca avançar.** Requisições canceladas antigas já podem
bloquear o lote automático, conforme o P1 anterior. O legado também pode deixar
de criar o aviso de um dia perdido durante interrupção. Um envio pausado por
template ausente pode ficar sem retomada pela API, mesmo após regularização.
O teste desse hold montou um estado de falha sintético; não removeu templates
normais nem demonstrou uma fila real hoje afetada.

**A mensagem pode explicar o fato errado.** A data da ciência pode aparecer
como última confirmação de atendimento; recebimento parcial já validado pode
pedir nova validação; cancelamento concluído pode parecer pedido de
manifestação.
Isso amplia BE-002. A correção futura precisa testar o significado de cada
campo, preservando o que já está correto e os documentos anteriores.

**Uma comunicação pode não virar pendência.** Texto de pessoa ligada a dois
pacientes é recusado para evitar atribuição errada, mas não recebe continuação
recuperável. A rota pode responder “processado” sem criar relato. O problema
anterior de lote também foi aprofundado: um item incompatível pode suprimir
texto válido ao lado. Não se deve aceitar comando desconhecido para contornar.

**Uma pendência pode existir e não aparecer.** A nova sugestão Flow foi salva,
o sinal de atualização chegou e o sino consultou novamente, mas a lista aberta
de Flow só mostrou o registro após reload. É ampliação da B4-012. A hipótese
de manter revisão de outro paciente após a troca foi refutada; a seleção foi
limpa e o registro original continuou pendente.

## Quando pode haver duplicação ou resultado incerto

Se a mensagem for aceita e a resposta se perder, não é seguro reenviar só porque
o app não confirmou. O sistema conserva uncertain, o que deve ser preservado.
Porém timeout no upload do PDF recebe esse mesmo estado mesmo antes de iniciar
a mensagem, criando conciliação desnecessária.

Uma nova falha de correlação foi demonstrada em SQL: o retry conserva a
referência anterior, e um callback antigo pode encerrar a tentativa nova e
impedir que seu resultado seja correlacionado. Não houve mensagem real ou
duplo movimento físico. Esse caso precisa de correção antes de depender do
retry externo. A tela administrativa já exige conciliação, mas não fornece
referência/tentativa suficientes para o responsável identificar facilmente a
mensagem no provedor.

Revogar alguém ou cancelar um aviso enquanto o PDF está em preparo pode ocorrer
antes de uma chamada posterior de envio. A B4 demonstrou a janela com transporte
falso; B5 delimitou seus controles. Isso não prova mensagem real indevida e não
permite prometer recolher algo já aceito pelo provedor. É necessário definir o
ponto de corte e o procedimento para resultados em andamento.

## Quais integrações estão prontas ou dependem de terceiros

WhatsApp tem adaptador, templates locais, callbacks, desafios e contratos de
Flow implementados. Isso não prova aprovação Meta, publicação de Flow, entrega
real, leitura ou prazo de chegada. SMS, SMTP e Google dependem de configuração
e homologação próprias. Cadastro administrativo de telefone fictício não é SMS.

E-mail operacional aparece nas preferências, mas não tem transporte no worker.
Áudio não tem transcritor contratado nem processamento na rota. Não há Flow
REQ dedicado ou lançador de Flow no aplicativo. Convite de paciente é link
compartilhado manualmente. Não apresentar essas opções como serviços ativos.

Nos Flows locais, cifragem e recusa de assinatura inválida funcionaram. Ainda
há falhas de recuperação de “sem ocorrências”, tratamento de erro e validação
de propósito. Na confirmação de telefone há risco de o Auth concluir e o
registro interno falhar sem retomada adequada; foi simulado, sem OTP real.

## Condições para uma operação sem WhatsApp

O aplicativo tem os caminhos essenciais, mas não há aprovação de piloto nesta
auditoria. Corrigir/validar os processos e bloqueadores aplicáveis, garantir
pendências alcançáveis, ciência/recebimento distintos, responsável que consulte
o app, prazo de reação e contingência familiar/equipe. Validar isso com pessoas
e aparelhos reais. Recursos externos podem permanecer desligados se não forem
prometidos e a alternativa aprovada atender à residência.

Antes de ligar mensagens, decidir dados mínimos e retenção. Hoje o contrato
pode incluir nome do paciente, produto/saldo e PDF; a documentação que anuncia
omissão desses dados não é uma garantia técnica. Não houve vazamento observado
nem parecer jurídico, mas a decisão precisa ser explícita.

O [handoff](18_PHASE_C_DECISION_HANDOFF.md) organiza correções, decisões de
produto/operação e homologações sem iniciá-las. Não reescrever histórico,
relaxar autorização, mover saldo sem fato físico ou criar outro motor de filas
como atalho. B6, C e D permanecem fora desta execução.
