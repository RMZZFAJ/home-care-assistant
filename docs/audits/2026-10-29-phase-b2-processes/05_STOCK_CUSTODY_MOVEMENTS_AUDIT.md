# Estoques, custódias, movimentos e conversões

P-STK-01–07 e dependências P-CAT-02/03; T045–049. Nove cenários em
[B2.4](evidence/b24-results.json), com persistência independente. A fonte
inclui stock-console/stock-overview, APIs de estoque/apresentações, ledger,
family_stock_movement, stock_history/overview/transit/consumption_metrics e
guard_catalogue_unit. Câmera e preenchimento visual não foram exercitados aqui.

## O que pertence a cada custódia

FAMILY é material confirmado sob responsabilidade familiar. CARE_TEAM é material
aceito pela equipe. TRANSIT é material expedido cuja destinação ainda não foi
integralmente confirmada ou conciliada. Essas custódias não representam três
campos editáveis: são somas do ledger. Material fornecido diretamente pelo plano
fora da responsabilidade familiar não deve ser incorporado por conveniência.

- **Movimento/fato:** Estoque físico inicial; **Origem → destino:** Exterior →
  FAMILY; **Responsável e justificante:** Admin; motivo e entrada avulsa;
  **Correção/controle:** Novo movimento, sem COM artificial

- **Movimento/fato:** COM validada; **Origem → destino:** Exterior → FAMILY;
  **Responsável e justificante:** Receipt validado; validador;
  **Correção/controle:** Receipt rejeitado não credita; correção posterior exige
  fato próprio

- **Movimento/fato:** Retirada familiar; **Origem → destino:** FAMILY →
  exterior; **Responsável e justificante:** stock.family.manage; motivo;
  **Correção/controle:** Não é consumo confirmado por definição

- **Movimento/fato:** Correção familiar; **Origem → destino:** Exterior ↔
  FAMILY; **Responsável e justificante:** Admin; movimento manual original;
  **Correção/controle:** Compensação conserva original

- **Movimento/fato:** ENT expedida; **Origem → destino:** Custódia de origem →
  TRANSIT; **Responsável e justificante:** Documento; expedidor;
  **Correção/controle:** Saldo suficiente; mesma transação

- **Movimento/fato:** ENT aceita; **Origem → destino:** TRANSIT → destino;
  **Responsável e justificante:** Destinatário autenticado;
  **Correção/controle:** Somente quantidade aceita

- **Movimento/fato:** Diferença recebida; **Origem → destino:** TRANSIT →
  destino; **Responsável e justificante:** Destinatário e motivo;
  **Correção/controle:** Incremento até pendência restante

- **Movimento/fato:** Diferença devolvida; **Origem → destino:** TRANSIT →
  origem; **Responsável e justificante:** Destinatário/admin; motivo;
  **Correção/controle:** Não inventar chegada ao destino

- **Movimento/fato:** Diferença faltante; **Origem → destino:** TRANSIT →
  exterior; **Responsável e justificante:** Conciliação de perda real;
  **Correção/controle:** Não classificar perda como consumo

- **Movimento/fato:** Cancelamento sem aceite; **Origem → destino:** TRANSIT →
  origem; **Responsável e justificante:** Criador/admin; motivo;
  **Correção/controle:** Só parte ainda em trânsito

- **Movimento/fato:** Cancelamento consentido; **Origem → destino:** Destino →
  origem e trânsito → origem; **Responsável e justificante:** Recebedor
  original; devolução real; **Correção/controle:** Consumo confirmado é alocado,
  sem novo débito

- **Movimento/fato:** BAL aprovado; **Origem → destino:** Exterior ↔ CARE_TEAM
  pela diferença física; **Responsável e justificante:** Contagem/revisão;
  documento BAL; **Correção/controle:** Ajuste não é consumo efetivo

- **Movimento/fato:** Consumo confirmado; **Origem → destino:** Custódia
  declarada → exterior; **Responsável e justificante:** Relato estruturado e
  confirmador; **Correção/controle:** Relato sozinho não debita

O trigger registra saldos antes/depois e revisão monotônica sob lock de estoque.
API/RPC impõem quantidade positiva, teto e precisão. Nenhum caso auditado usou
exceção pública de saldo negativo. Estoque não se corrige editando balanço atual
ou apagando movimento. B24-01 abriu volume fictício de 10,125 mL e compensou
0,125 com referência: saldo 10, dois movimentos preservados.

## Quantidade exata, unidade e embalagem

Decimal.js e strings decimais evitam cálculos binários comuns no cliente.
No banco, numeric e precisão por produto revalidam os valores. B24-02 recusou
0,0001 num produto com três casas e retirada 11 de saldo 10, sem movimento novo.
Não houve arredondamento silencioso. Unidade base e precisão com história são
imutáveis, inclusive com linha de draft e sem movimento ainda: B24-04 comprovou
o trigger que complementa a verificação mais estreita de
configure_catalogue_unit.
A hipótese de reinterpretar unidade por esse endpoint foi abandonada.

Apresentação associa código, nome e quantidade na unidade base. O scanner
consulta equivalência cadastrada e soma base_quantity; código desconhecido
conduz a associação administrativa ou seleção manual. A entrada manual de
quantidade não tem modo explícito de informar “duas embalagens de dez”; a pessoa
faz o cálculo ou usa leituras repetidas. Não existe conversão presumida entre
produto, caixa, grama e mililitro.

**B2-006:** a equivalência é usada para preencher quantidade base, mas a linha
emitida não conserva código, apresentação, quantidade de embalagens ou fator
utilizado. B24-05 leu pacote de dez, emitiu COM de 20 unidades e reconfigurou a
apresentação para doze. A COM conservou 20 unidades e metadata vazia: correto
para a base, insuficiente para provar a embalagem/fator usados na entrada.
Esse teste de payload não foi um scan de câmera; a ligação com scanner vem da
leitura de scan() e da montagem do payload. É oportunidade de proveniência P3,
que
amplia B1-FORM-005 sem afirmar alteração retroativa do saldo.

Alternativa mínima: seleção opcional de apresentação na tarefa existente, com
equivalência visível e snapshot do fator; conservar entrada direta em unidade
base. Uma tela nova ou biblioteca de conversão não é requisito automático.
Aceite futuro: duas embalagens de dez mostram 20 unidades e preservam esse
fator após mudança cadastral; não arredondar nem recalcular documento antigo.

## Correção sem original e ciclo de inativação

**B2-005:** o seletor visual exige movimento original para correction_in/out,
mas o schema API torna referenceId opcional e a RPC só valida referência se
ela vier preenchida. B24-03 enviou correction_in sem referência; saldo 10→11,
movimento family_manual com reference_id=null. O ator tinha autorização; não
há aumento de poder ou violação de isolamento demonstrada. Falha é permitir
declarar compensação sem ligar ao fato corrigido, contrariando a regra
operacional.
Uma entrada avulsa legítima já possui ação própria e pode continuar sem
original.

AC-B2-005 deve exigir original compatível nas duas camadas, conservar
autorização,
produto, paciente, motivo, ledger e retry. Não inferir uma referência histórica
para
movimentos antigos cuja proveniência é desconhecida. Correção referenciada de
movimento manual funciona; não generalizar o defeito a toda compensação.

**B2-007:** inativar produto com saldo permite conservar material físico sem
participação nos novos registros normais. B24-06 abriu oito unidades, transferiu
quatro à equipe e inativou. A consulta manteve família quatro/equipe quatro e
active=false; o visualizador possui rótulo Inativo. Porém consumo estruturado
foi recusado e incluir o produto na nova contagem BAL foi recusado. O catálogo
ativo naturalmente o exclui. Reativar recuperou o percurso sem mudar saldos.

Não há desaparecimento nem exclusão de estoque. A lacuna P2 é não oferecer uma
transição de esgotamento/destinação para esse saldo antes de interromper o uso.
Decisão C: impedir inativação com saldo/trânsito/documentos abertos até
resolver;
ou impedir novas aquisições e permitir consumir/contar o remanescente com estado
próprio; ou manter reativação como procedimento explícito com aviso. Nunca zerar
saldo automaticamente. Produtos duplicados também precisam de desativação e
destinação, sem fundir identidades/snapshots por nome semelhante.

## Consulta, previsão, trânsito e reconciliação

B24-07 confirmou família mascarada para profissional e saldos familiares
antes/depois ocultos no histórico de transferência. Duas páginas estáveis
foram disjuntas; isso não prova paginação sob inserção concorrente. História
de estoque possui filtros e paginação; não repete a limitação dos cem relatos
de consumo. B24-08 confirmou que retirada manual não entrou na métrica de
consumo, que usa apenas débitos com reference_type=consumption. BAL também não
deve ser chamado de consumo.

B24-09 encontrou ENT em cancellation_pending com quantidade física pendente
zero. Ela aparece na consulta de trânsito pelo estado documental. É necessário
entender “documento em conciliação” separadamente de “material ainda no
caminho”.
Não se comprovou soma física indevida. Na COM abandonada, B2-001 produz saldo
disponível dois e purchasePending oito; a previsão continua aberta até decisão
que o processo atualmente não consegue representar.

**B2-008:** a consulta conserva referências de COM, BAL e consumo, mas o
componente
oferece Abrir ficha apenas para reference_type=document. Créditos COM apontam a
purchase_receipt, ajustes a bal e débitos a consumption; esses não têm a mesma
navegação de origem. O detalhe mostra o ID do movimento, sem resolver a
referência
de negócio. É oportunidade P3 de rastreabilidade navegável, com fonte estática e
dados reais de prova; não ausência de história. Usar links para documentos e
relatos existentes, com autorização revalidada, antes de cogitar outra central.

Lote, validade e quarentena física por embalagem não constam no contrato atual.
Essa ausência é candidata de produto, se a família realmente controla materiais
que exigem rastreio por lote. Anexo e anotação podem ser alternativa inicial;
não são saldo por lote nem garantem retirada pelo vencimento. A necessidade e
o esforço adicional devem ser validados antes de criar módulo.

## Segunda passada e limites

Mínimos são locais por produto/custódia; ausência de mínimo não é zero de
reposição. O dashboard seleciona produtos ativos cujo confirmado está abaixo
do mínimo configurado, sem emitir REQ ou comprar automaticamente. A família
precisa decidir se a falta exige reposição, verificar trânsito/previsão e
escolher
ação própria. Fonte foi rastreada, mas não houve novo ensaio específico de
edição/alerta por mínimo nesta B2. Não se infere necessidade clínica do limiar.

Inventários legados permanecem consultáveis com paginação e referência ao último
aprovado em /api/stock/inventory. O POST antigo retorna410 e orienta usar BAL da
equipe ou movimento familiar para ajuste administrativo. É retirada deliberada
de entrada substituída, não ausência geral de processo de contagem. Preservar
leitura histórica e não criar inventário paralelo pelo endpoint aposentado.

Foram refutados bypass de unidade histórica, ocultação geral do inativo e
equivalência automática entre ajuste/retirada e consumo. O estoque familiar
avulso já resolve abertura e compensação manual; preservar isso. O pedido de
referência no browser não protege RPC/API, mas uma correção aceita sem
referência
também não prova fraude por pessoa sem capacidade.

Faltam prova de hardware, entendimento de embalagem por pessoa real, grande
volume
de movimentos, trânsito envelhecido por dias e todas as disputas simultâneas.
Alertas mínimos foram localizados e rastreados, sem prometer reposição
automática
ou previsão de necessidade clínica. Interações com contagem/política seguem
B2.5; eventos e navegação documental seguem B2.8. Aceites associados devem
preservar custódias, unidades, precisão, referências antigas e proibir ajustes
artificiais usados apenas para limpar uma pendência.
