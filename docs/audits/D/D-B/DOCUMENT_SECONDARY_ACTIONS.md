# Ações principais e opções adicionais das fichas

Incremento D3.32, base9bf18cf. Continua a composição do Modelo Integral, sem
declarar paridade integral ou conclusão da D-B.
[Fontes, resultados e contraprovas](DOCUMENT_SECONDARY_ACTIONS_VALIDATION.json).

## Implementação

REQ mantém expedição vinculada e ciência na barra principal. Mais reúne COM
vinculada, arquivamento justificado, cancelamento e necessidade remanescente.
COM/ENT/BAL mantêm os atos operacionais na barra; cancelamento inicial,
encerramento de expectativa, troca de destinatário e acompanhamento BAL ficam
em Mais. Consentir, recusar e retirar pedido de cancelamento bilateral continuam
como decisões principais. Protocolo, identificação e cópia permanecem disponíveis.

Os controles existentes foram reposicionados com as mesmas condições,
permissões e handlers. Mais fecha ao escolher uma ação e deixa o foco seguir
para o formulário ou diálogo aberto. Escape devolve foco ao acionador. Fechar
o formulário devolve foco à ação original ou a Mais, quando ela saiu do DOM.
Nenhuma ação documental é enviada apenas ao abrir ou fechar essas superfícies.

## Validação e limites

Quatorze cenários distintos Chromium/WebKit aprovados: abas das quatro fichas,
teclado e dimensões existentes; cancelamento REQ, fechamento sem efeito,
retorno de foco e revogação real com403; cancelamento bilateral ENT com consumo
e recuperação; necessidade remanescente com origem obsoleta; encerramento de
expectativa COM, conferência e PDFs distintos; doação sem crédito de estoque;
leitura histórica sem inventar solicitante ou data, com materiais/comunicações
nas abas reais. Lint dirigido e build/tipos do runner oficial aprovados.

Contraprovas preservadas: dois testes COM ainda buscavam a antiga classe do
tipo documental; foram adaptados ao conteúdo atual, mantendo o texto esperado.
A importação histórica completa falhou nos dois navegadores antes da leitura
da ficha: os onze protocolos físicos permitidos já estão ocupados na stack
local retida. Sem exclusão, reset ou ampliação do contrato. Seus seletores foram
atualizados, mas o caso completo depende da CI com banco limpo. Um caso adicional
reutiliza somente a origem fictícia reconhecida pelo helper existente, verifica
os dados desconhecidos e a navegação atual e comprova ausência de alterações
nos fatos, itens, estoque e emissões. Ele não substitui a prova de importação.

As rodadas e falhas não são somadas como aprovações. Oito casos iniciais
inalterados foram reaproveitados; quatro casos de COM e dois de leitura
histórica receberam execução própria. Formatação incidental foi retirada dos
dois consumidores antigos com equivalência sintática verificada, sem repetir
os navegadores por alteração apenas de apresentação do fonte.

Sem SQL, API, RPC, assinatura, worker, cache ou transporte externo novo.
Local165/remoto165, última20261109091550 e digest ordenado iguais, zero
pendências. Reconciliação somente de leitura; sem backup redundante.
CI9bf18cf aprovou Windows/Ubuntu/banco; browsers ainda em andamento na consulta.
O SHA publicado deste incremento exige CI própria.

Paridade das demais seções e telas, listas/cartões,66 composições/171 relações,
rascunhos contextuais restantes e gates humanos/assistivos/físicos/externos
continuam pendentes. Sonar adiado, PR7 Draft, produção NO-GO. Este lote não
acrescenta aprovação a assinatura, backup, recuperação ou monitoramento.
