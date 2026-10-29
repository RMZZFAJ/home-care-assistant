# Entregas, recebimentos e vínculos documentais

P-ENT-01–06; T032–044. [Onze provas locais](evidence/b23-results.json) percorrem
as custódias e confrontam linhas, eventos, REQs e ledger. RPCs autenticadas com
identidades fictícias; componentes/API examinados estaticamente. Nenhum envio
externo, correção funcional ou movimentação de contorno.

## Responsabilidades e ciclo completo

A ENT transfere materiais entre família e equipe. O expedidor precisa de
ent.create, origem/destino distintos, saldo e destinatário elegível diferente do
criador. O destinatário deve ter vínculo ativo, capacidade de receber e função
compatível com o destino. Draft não expede. Emissão retira da origem e credita
TRANSIT na mesma transação; o destinatário recebe uma responsabilidade, sem
aceite presumido. A origem pode ser estoque familiar abastecido por COM ou
entrada avulsa legítima. Devolução equipe→família também é ENT autorizada.

- **Estado/etapa:** draft; **Quem age e condição:** Criador autorizado revisa
  catálogo/quantidades/pessoa; **Consequência:** Sem movimento; número não
  emitido; **Saída/recuperação:** Editar, emitir, cancelar

- **Estado/etapa:** pending_receipt; **Quem age e condição:** Expedidor já
  emitiu; destinatário confere; **Consequência:** Origem→trânsito;
  **Saída/recuperação:** Aceite, reassign antes do primeiro aceite, cancelar

- **Estado/etapa:** receive integral; **Quem age e condição:** Somente
  destinatário; versão vigente; **Consequência:** Trânsito→destino em todas
  linhas; **Saída/recuperação:** confirmed; vínculos REQ recebem aceite positivo

- **Estado/etapa:** receive com divergência; **Quem age e condição:**
  Destinatário informa exceções e quantidade aceita; **Consequência:** Crédito
  imediato só do aceito; **Saída/recuperação:** disputed; restante continua
  trânsito

- **Estado/etapa:** resolve received; **Quem age e condição:** Destinatário
  confirma chegada posterior; **Consequência:** Trânsito→destino; aceito cresce;
  **Saída/recuperação:** disputed ou confirmed

- **Estado/etapa:** resolve returned; **Quem age e condição:** Destinatário ou
  admin concilia retorno real; **Consequência:** Trânsito→origem; conciliado
  cresce; **Saída/recuperação:** Diferença encerrada sem fingir aceite

- **Estado/etapa:** resolve missing; **Quem age e condição:** Destinatário ou
  admin declara perda real com motivo; **Consequência:** Trânsito→saída; sem
  crédito de destino; **Saída/recuperação:** Diferença encerrada com perda
  registrada

- **Estado/etapa:** cancel sem aceite; **Quem age e condição:** Criador ou
  admin; motivo; **Consequência:** Trânsito restante retorna à origem;
  **Saída/recuperação:** cancelled; eventos continuam

- **Estado/etapa:** cancel após aceite; **Quem age e condição:** ent.cancel;
  motivo; **Consequência:** Pedido, sem reversão imediata;
  **Saída/recuperação:** cancellation_pending

- **Estado/etapa:** consent_cancel; **Quem age e condição:** Destinatário
  original; devolvido+consumido=aceito; **Consequência:** Devolução real e
  trânsito conciliado; **Saída/recuperação:** cancelled ou recusa atômica

Na conferência, linhas não marcadas como divergentes são aceitas integralmente.
Isso reduz preenchimento, mas exige decisão compreendida. Linha parcialmente
aceita não é integralmente conferida. Depois de uma perda ou devolução do
restante, a ENT pode ficar confirmed com fullyChecked=false: o processo foi
conciliado, sem alegar que todo material foi recebido. O indicador da REQ mede
outra coisa: aceite positivo na linha explicitamente vinculada.

Vínculo pode abranger várias REQs da mesma necessidade, com justificativa. Não
se multiplica a quantidade física. Requisição cancelada, produto de outro
paciente ou vínculo de material diferente não são relações legítimas. Emissão
não vincula por semelhança de nome nem compra anterior.

## Efeitos comprovados em uma sequência inteira

B23-01–05: a família tinha10; expediu4 para duas REQs explicitamente
justificadas
como mesma necessidade. Família6, trânsito4, equipe0. Pessoa diferente foi
recusada em ent.receive. Destinatário aceitou2: família6, trânsito2, equipe2.
Retry com a mesma chave/versão não criou outro crédito ou evento.

As linhas REQ passaram a atendidas, mas conclusão operacional permaneceu
bloqueada pela divergência. Cancelar a REQ nesse estado foi recusado. Uma
unidade retornou à família e uma foi conciliada como extraviada: família7,
trânsito0, equipe2. A ENT ficou confirmed, com aceito2, conciliado2 e linha não
integralmente conferida. As duas REQs puderam concluir sem crédito duplicado.
Isso confirma o mérito da distinção entre aceite, conferência e encerramento.

B23-06: reassign antes do aceite retirou autoridade do destinatário anterior.
Cancelar devolveu o trânsito e preservou os eventos. B23-07: após aceite
integral, o pedido aguardou consentimento; terceiro foi recusado; destinatário
devolveu fisicamente tudo e o cancelamento conservou a quantidade aceita
histórica, sem editar a conferência original. B23-10 confirmou retorno inverso
por nova ENT e aceite familiar. B23-11 recebeu complemento posterior e recusou
uma tela com versão antiga, sem duplicar material.

## Cancelamento, discordância e bloqueios novos

**B2-002:** não existe comando de recusar o pedido de cancelamento ou de
retirá-lo com motivo. Schema, editor e RPC oferecem solicitar/consentir, sem a
transição inversa. B23-08 tentou recusa como destinatário e recebeu operação
inválida; estado permaneceu cancellation_pending. Uma discordância legítima não
possui desfecho formal. Pedir cancelamento novamente apenas substitui o pedido,
não representa acordo ou retirada. Isso merece decisão sobre quem pode recusar,
desistir ou escalar um impasse, sem dispensar consentimento para devolução.

**B2-003:** a fila padrão e os cartões de conferência selecionam
pending_receipt.
O filtro de entregas não oferece cancellation_pending e a API não aceita esse
valor como filtro específico. B23-08 comprovou que o documento deixou a consulta
padrão, mas permaneceu legível em consulta autorizada pelo ID. O operador pode
reencontrá-lo em Todas, Histórico ou aviso que exista; portanto não se afirma
inacessibilidade absoluta. Falta tratar consentimento como tarefa própria da
pessoa responsável. Essa é uma causa de continuidade, distinta da ausência de
recusa/retirada. Renderização dirigida será conciliada no fechamento.

## DB-001: consequência operacional e alternativas seguras

**B2-004 amplia A-DB-001**, sem contá-lo como descoberta inédita. B23-09 criou
consumo real dentro do cenário sintético: duas unidades haviam sido aceitas;
uma foi relatada e confirmada como consumo. Tentativa de consentir com uma
devolvida e uma consumida chegou ao ramo e falhou42702, por referência ambígua
a e.body. Documento manteve versão3, cancellation_pending, três eventos;
família3,
equipe1, trânsito0 e quatro movimentos antes/depois. Não houve corrupção.

A consequência é impossibilidade de concluir a conciliação válida quando o
material já teve uso. REQs vinculadas também podem permanecer impedidas de
encerrar/arquivar pela pendência. O destinatário continua responsável por uma
ação que a aplicação recusa internamente. Se ele for desligado, a restrição de
identidade original acrescenta outro impedimento, investigado no grupo de
pessoas.

Não se deve registrar consumo extra, devolução fictícia, novo abastecimento para
forçar saldo ou alterar histórico. Enquanto não houver correção autorizada,
preservar ENT e consumo válidos e documentar o impedimento fora da mutação.
Uma futura correção precisa demonstrar o ramo de consumo e o recorte temporal
dos consumos já alocados a cancelamentos anteriores. A B2 não removeu o erro
para alcançar essa sub-hipótese; continua não verificada.

Alternativas de produto para correção posterior: compensação adicional que
preserve a ENT original quando já houve consumo; cancelamento consentido apenas
da parte reversível; ou fechamento da contestação conservando os fatos físicos.
Todas exigem definição de significado, responsáveis e efeitos na REQ. A opção
de devolver tudo é válida somente quando tudo realmente pode ser devolvido;
B23-07 não é contorno aplicável a material consumido.

## Segunda passada, critérios e limites

A segunda passada separou confirmed de conferência integral e atendimento de
conclusão. A hipótese de crédito duplicado por atender várias REQs foi refutada.
Uma nova ENT de devolução existe, portanto não se recomenda edição direta de
saldo ou novo módulo de transferência. Sua existência não desfaz um pedido de
cancelamento nem substitui consentimento histórico.

AC-B2-002 deve permitir recusa/retirada versionada com motivo, conservando
aceites
e ledger; não autorizar terceiro a consentir. AC-B2-003 deve trazer o pedido à
pessoa capaz de decidir e permitir localizar pendência antiga, sem afirmar
entrega
de aviso externo. AC-B2-004 deve concluir o caso uma devolvida/uma consumida sem
novo débito de consumo, sem apagar eventos e sem reutilizar consumo já alocado.
Corrida, repetição e revogação precisam de regressão de banco/API própria.

Anexos são complementos privados, não confirmação física automática. Sua cadeia
é aprofundada em B2.8. Não verificados aqui: corrida real de dois destinatários,
contestação formal após recebimento correto, mudança de destinatário depois de
aceite parcial, hardware, entrega externa ou compreensão humana. Reassign após
aceite é proibido pelo contrato, não defeito por si só; sucessão de
responsabilidade
é uma necessidade diferente. Nenhuma correção foi implementada.
