# BAL por plantão

Guia da base funcional auditada e de seus contratos requeridos. Os desvios
A/B e as mudanças futuras C não foram corrigidos por este documento.
Estado: [PROJECT_STATUS](../current/PROJECT_STATUS.md); futuro:
[projeto C3](../audits/C/C3-functional-specification/README.md).

O incremento D2 de revisão já implementa autoria efetiva no legado e no
regime por plantão, parecer próprio separado das notas, comparação de referência
e recuperação do ato confirmado. As evidências e os limites vigentes estão no
[checkpoint D-A](../audits/D/D-A/CHECKPOINT.md); sucessão/reconto facultativo
e demais critérios ainda dependem dos respectivos incrementos.

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

Na decisão de um adiamento, destino, prazo e versão propostos permanecem em
leitura nas duas etapas. Situação atual do plantão é uma comparação separada;
um alvo obsoleto não pode ser aprovado, mas a recusa do pedido pendente permanece
disponível com justificativa própria. A recusa não muda prazo, atribuição ou
estoque. Conflito preserva a justificativa, e nova consulta não troca o destino.
Resultado incerto mantém corpo/chave congelados. Após confirmação ou fechamento,
o foco retorna a um controle válido ou ao título estável quando o acionador
desapareceu/perdeu elegibilidade. A consulta conserva nome e motivo do decisor.

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

Na ficha, a revisão facultativa continua disponível a outra pessoa elegível
após a conciliação. O formulário abre com parecer vazio e notas originais em
leitura. Consultar referência atual preserva o texto; adotar é uma ação separada
e não envia a revisão. Referência pendente obsoleta exige reconto autorizado.
Perda de resposta mantém conteúdo/chave congelados até recuperar o próprio ato.
Pareceres anteriores identificam autor, grupo, contagem e versão revisada;
consulta histórica não reaplica estoque. O PDF conserva essas distinções.

No BAL agendado ainda em revisão, família ou supervisão habilitada abre
Designar reconto pelo detalhe ou pelo acompanhamento. Contador efetivo e
observações anteriores ficam em leitura. A pessoa escolhe explicitamente um
plantão real pela busca e registra justificativa própria. A conferência mostra
pessoa, período e motivo antes da confirmação; a designação não conta material.
Resposta incerta congela a intenção e permite recuperar o mesmo ato.
Conflito conserva motivo e escolha. A consulta compara a contagem e o mesmo
plantão antes/depois, e a adoção explícita exige nova conferência antes de enviar.
O comprovante conserva quem designou e a responsabilidade naquele ato;
Consultar acompanhamento atual distingue eventuais mudanças posteriores.

Substituição no mesmo intervalo conserva uma única atribuição executável de
reconto. A nova profissional começa com quantidades e observações vazias e
registra sua própria contagem. Sem profissional elegível, o acompanhamento
mostra a pendência de designação, em vez de um vazio falso. A lista informa
total e recorte das 100 mais antigas; outros BAL continuam acessíveis pelo
histórico paginado e pelo detalhe. Reconto não altera o cumprimento ou o atraso
original das semanas, nem torna parecer antigo uma revisão da contagem nova.

## Processamento e validação

O worker operacional existente processa somente os regimes habilitados, com
limites por execução, bloqueio transacional e eventos deduplicados. Não há um
segundo agendador. Avisos de atribuição, disponibilidade, atraso, transferência
e decisão usam a outbox e a central do aplicativo. Canais externos dependem do
contrato de eventos e da liberação real do provedor.

Cada execução atende até 100 pacientes habilitados e retoma o próximo lote
por um cursor privado persistente. A rotação inclui pacientes habilitados
depois e preserva a versão da configuração familiar. Chamadas simultâneas com
a mesma chave de criação, revisão ou envio recuperam o resultado confirmado
antes de reavaliar uma nova contagem, mesmo que a primeira tenha fechado a janela.

Integrações com Auth real cobrem concorrência, idempotência, isolamento,
referência desatualizada, contexto forjado, substituição, decisão familiar,
regularização e conservação de atrasos. E2E cobre configuração, duas etapas,
resposta perdida, PDF, solicitação/decisão e acessibilidade em três projetos.
O checkpoint de execução registra as rodadas efetivamente concluídas.
