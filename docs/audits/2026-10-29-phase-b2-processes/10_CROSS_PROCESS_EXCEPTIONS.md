# Exceções, falhas e consistência entre processos

O [catálogo transversal](10_EXCEPTION_SCENARIOS.csv) reúne 21 situações:
seis novas execuções B29-01–06, doze sequências comprovadas nos subgrupos
anteriores e três fronteiras expressamente não executadas. Referenciar uma
prova anterior não aumenta a contagem de testes. Resultados novos em
[b29-results](evidence/b29-results.json); erros de preparação do auditor estão
separados em [ATTEMPTS](evidence/ATTEMPTS.md).

## Encerrar não congela os fatos posteriores

A mesma REQ que a B2.8 havia concluído e arquivado foi usada em B29-01.
Administrador solicitou cancelamento da ENT aceita. A necessidade reabriu,
limpando a indicação de conclusão/arquivo corrente, mas conservando data e
motivo anteriores no evento de reabertura. O recebedor original devolveu a
unidade ainda não consumida desse cenário. Estoques FAMILY4→5/TEAM4→3;
trânsito preexistente de outra ENT não foi removido. A necessidade voltou a zero
linhas atendidas. O PDFv5 permaneceu idêntico, embora já estivesse superado.

Esse comportamento é correto e precisa ser comunicado. Arquivo não garante que
o material continuará disponível; documento histórico não autoriza executar de
novo a mesma entrega. A alternativa de impedir toda reabertura foi descartada:
ela esconderia correções posteriores. Próxima ação deve estar no documento
atual, e a família deve decidir entre nova entrega real ou cancelamento da
necessidade já sem bloqueio documental. Não se inventou consumo para fechar.

## Duas pessoas, telas antigas e resultado desconhecido

B29-02 criou COM por familiar e fez dois administradores locais aprovarem a
mesma versão com requisições HTTP independentes e simultâneas. Um recebeu200;
o outro409 com conflito de versão. Persistiram uma nova versão e uma aprovação,
sem estoque. A preparação inicial equivocada do auditor tentou aprovar COM que
já nascera aprovada por administrador; esse400 e o403 familiar foram controles
corretos, não defeitos. Os dois ensaios estão preservados.

B29-03 ignorou deliberadamente a resposta de um aceite bem sucedido e repetiu
a mesma intenção duas vezes por HTTP. Ambos recuperaram o mesmo fato: sem novos
eventos ou crédito. Nova chave com versão antiga recebeu409. Isso exercita a
fronteira API/ledger; não é injeção de perda física de rede nem garantia de
operação offline. As provas B1 de resposta perdida em navegador continuam
referências para a recuperação humana e o caso incompleto de anexos.

Em contraste, B29-05 fez outro administrador rejeitar consumo já confirmado.
Recebeu200/data: null; a confirmação original permaneceu e não houve estorno.
**B2-011** é uma inconsistência da resposta sobre a segunda intenção. Conservar
o primeiro fato é correto; apresentar a decisão oposta como concluída é que
precisa de correção. Não se recomenda permitir alternar confirmed/rejected
retroativamente ou transformar repetição em nova saída de estoque.

## Fila visível e história recuperável

B29-06 criou uma falta pendente e cem relatos posteriores, todos novos,
autenticados e fictícios. Consulta retornou cem registros sem o alvo, inclusive
com ref fornecido. Painel informou102pendências; o banco preservou o alvo
reported. **B2-017 revalida A BE-001 e amplia B1-UX-007 com execução local de
volume nesta B2.** O problema é alcançar a tarefa, não perda de registro.

O limite de leitura protege o custo, mas precisa de continuação e consulta do
registro autorizado. Aumentar cem para mil só adia a falha. Importa conseguir
reencontrar pendência antiga antes de agir, inclusive depois de clicar em aviso
ou trocar paciente. Não foi necessário renderizar cem linhas para demonstrar
a omissão da API; o consumidor e o ref ignorado foram examinados em fonte.

B29-04 confirmou por HTTP que a correção familiar sem referência, antes
reproduzida na RPC, persiste no ledger. O read-back inicial errou o nome de uma
coluna; a retomada apenas localizou o movimento já criado, sem repetir a
correção. O snapshot anterior daquela tentativa não foi preservado e não é
apresentado como medição. A evidência suficiente é201 seguido do movimento com
quantidade0.001 e referenceIdnull. Essa manifestação amplia B2-005.

## Dependências que mudam a pessoa seguinte

As sequências X07–X18 demonstram por que testar páginas isoladas seria
insuficiente: comprar parcialmente deixa previsão; aceite parcial atende linha
mas divergência bloqueia conclusão; consumo confirmado impede conciliação pelo
defeito conhecido; mudar o plantão destino deixa adiamento inválido na fila;
trocar pessoa durante reconto invalida atribuição sem sucessor; revogar acesso
retira autoridade corretamente, mas ENT parcial continua sem sucessão formal.

A recuperação deve identificar qual fato é físico e qual decisão falta. Uma
reatribuição pode resolver ENT ainda sem aceite; não autoriza assinar aceites
anteriores. Revisor pode designar novo reconto; gestor da agenda não ganha
poder para adiar prazo familiar. Reativar temporariamente usuário desligado ou
zerar estoque inativo não é uma simplificação aceitável desses processos.

## Segunda passada e fronteiras

A segunda passada confrontou arquivo com reabertura, sucesso com decisão
aplicada, idempotência com nova intenção, contador com fila alcançável, mudança
de pessoa com atesto e saldo agregado com origem física. Foram abandonadas
generalizações de corrupção de saldo, desaparecimento de documentos e ausência
de qualquer mecanismo de recuperação. Defeitos permanecem delimitados aos
estados, contratos e atores efetivamente observados.

X19 registra o risco de progresso do lifecycle e lembretes entre pacientes
A DB-002/DB-006; não houve nova reprodução em lote nesta B2. A versão funcional
continua a mesma e o NO-GO A não foi revogado. X20 delimita provedores externos,
WhatsApp e resultado incerto; X21 delimita restauração integral, operação humana
e contingência física. Nenhuma destas lacunas foi convertida em teste aprovado.
O catálogo contém recuperação e aceites futuros para cada uma, sem executar
Fase C, implementar correções ou contornar bloqueios com movimentações
fictícias.
