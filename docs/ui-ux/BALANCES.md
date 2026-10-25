# BAL por plantão

## Ativação e autoridade

O regime novo é opt-in por paciente. Nenhuma migration ativa pacientes ou cria
plantões. Família/administração local configura dia, tipo, fuso, início e,
opcionalmente, profissional designado. Administração global não assume esse
vínculo. A configuração não cria obrigações anteriores à primeira ativação.

Administrar escalas, contar estoque e aprovar adiamentos são competências
distintas. Contagem exige profissional/supervisor ativo, capacidade efetiva e
atribuição vigente dentro da janela de um plantão real. Aprovação familiar não
pode ser delegada à supervisão por uma exceção da matriz. A própria pessoa que
contou não pode revisar sua contagem. Esses limites são aplicados no banco,
projetados no contexto e explicitados nas células restritas da matriz.

## Obrigações e histórico

Cada semana tem uma obrigação com prazo original preservado. Um ciclo aberto
acumula obrigações ainda não contadas; perder um prazo preserva a atribuição e o
atraso e transfere a responsabilidade para um próximo plantão elegível.
Ausência de cobertura ou cobertura ambígua exige resolução explícita. O sistema
não escolhe uma pessoa arbitrariamente nem trata programação como presença.

Solicitar adiamento não altera prazo nem responsabilidade. A decisão familiar
revalida versões da atribuição e do plantão de destino. Aprovação conserva o
prazo original e registra o prazo efetivo; o prazo aprovado não é apresentado
como atraso. Troca de horário ou cancelamento de plantão com BAL vigente exige
a decisão familiar antes da alteração. Uma substituição no mesmo período pode
transferir a atribuição sem deslocar a janela. Versões antigas ficam auditáveis.

Uma contagem física atual pode regularizar semanas anteriores. Elas registram
o documento e a data real de regularização, sem receber uma contagem retroativa
fictícia. Atrasos anteriores não são apagados. Um reconto é uma atribuição formal
do mesmo documento, com nova versão e histórico das contagens anteriores.

## Experiência de contagem

`/balancos` acompanha regime, atribuição, obrigações, solicitações, revisões e
histórico. `/fichas/bal` abre a contagem em duas etapas quando elegível:
Contagem e Revisão. Antes do plantão, oferece consulta. O modo anterior continua
disponível nos pacientes que ainda não ativaram o novo regime.

O profissional registra quantidades físicas de todos os produtos, inclusive
zero. A primeira etapa não mostra os saldos esperados. Revisão compara contagem
e referência capturada. Alteração do ledger invalida essa referência e exige
nova conferência explícita. Perda de elegibilidade preserva os valores locais,
mas impede envio. Rascunho incompleto é local; rascunho completo usa o documento
do servidor. Recuperação após resposta perdida reutiliza as mesmas chaves.

O banco produz o contexto documental: ciclo, semanas, janela, responsável real
e data da contagem. Autor original do rascunho é preservado em substituições.
PDF e visualizador exibem esse contexto. Política de revisão continua distinta
do registro da contagem e da efetivação dos ajustes no ledger.

## Processamento e validação

O worker operacional existente processa somente os regimes habilitados, com
limites por execução, bloqueio transacional e eventos deduplicados. Não há um
segundo agendador. Avisos de atribuição, disponibilidade, atraso, transferência
e decisão usam a outbox e a central do aplicativo. Canais externos dependem do
contrato de eventos e da liberação real do provedor.

Integrações com Auth real cobrem concorrência, idempotência, isolamento,
referência desatualizada, contexto forjado, substituição, decisão familiar,
regularização e conservação de atrasos. E2E cobre configuração, duas etapas,
resposta perdida, PDF, solicitação/decisão e acessibilidade em três projetos.
O checkpoint de execução registra as rodadas efetivamente concluídas.
