# REQ, compras, doações e abastecimento

Escopo: P-REQ-01–06/P-COM-01–05; transições T014–031. Produto37cb7f85.
[B2.2](evidence/b22-results.json) registra dez cenários com RPC autenticada e
consulta independente do banco. Componentes e API foram examinados
estaticamente. Não houve navegador ou participante nesta etapa; essa prova
não homologa toda a jornada visual.

## Necessidade, atores e sequência real

A equipe informa material, estoque observado e urgência; texto atende às
exceções. Observação física não é pedido quantitativo nem saldo oficial.
A família pode comprar, receber doação ou usar material disponível. REQ não
obriga COM; COM também pode existir sem REQ. Ciência cabe aos familiares
elegíveis; aquisição e expedição às capacidades próprias; aceite ao destinatário
da ENT. Leitura segue a capacidade do tipo; COM fica no âmbito familiar.

Emissão exige req.create, vínculo, contexto e paciente ativo. O wizard oferece
rascunho/revisão; API remove rótulos do cliente; banco resolve catálogo e
snapshots, calcula intenção canônica e emite protocolo. Retry com mesma chave
e intenção recupera o registro; intenção diferente conflita.

- **Etapa:** Selecionar REQ; **Entrada e decisão:** Catálogo ativo; observação;
  urgência; **Fato/efeito:** Edição local sem ledger; **Exceção e recuperação:**
  Reconsultar catálogo, sem produto presumido

- **Etapa:** Repetir necessidade; **Entrada e decisão:** Pendência anterior;
  motivo; **Fato/efeito:** Justificativa na intenção; **Exceção e recuperação:**
  Sem motivo, emissão recusada; anterior preservada

- **Etapa:** Item extra; **Entrada e decisão:** Texto; observação; urgência;
  **Fato/efeito:** Extra original conservado; **Exceção e recuperação:** Alias
  conhecido é recusado como extra

- **Etapa:** Emitir; **Entrada e decisão:** Payload/chave congelados;
  **Fato/efeito:** REQ; linhas; evento; número; protocolo; **Exceção e
  recuperação:** Perder comprovante não desfaz gravação

- **Etapa:** Ciência; **Entrada e decisão:** Elegíveis; modalidade; política;
  versão; **Fato/efeito:** Conhecimento separado; **Exceção e recuperação:** Não
  compra, não recebe e não movimenta

- **Etapa:** Preparar COM; **Entrada e decisão:** purchase/donation; quantidades
  base; vínculos opcionais; **Fato/efeito:** Draft ou emissão; **Exceção e
  recuperação:** Draft não consome número

- **Etapa:** Aprovar; **Entrada e decisão:** Todas linhas; quantidade até
  proposta; **Fato/efeito:** Aprovada/parcial/rejeitada; **Exceção e
  recuperação:** Redução exige motivo; zero em todas rejeita

- **Etapa:** Adquirir; **Entrada e decisão:** Incremento até aprovado;
  **Fato/efeito:** purchased_quantity acumulada; **Exceção e recuperação:** Sem
  crédito de estoque; excesso recusado

- **Etapa:** Informar chegada; **Entrada e decisão:** Adquirido menos aceito e
  receipts pendentes; **Fato/efeito:** Receipt pending; **Exceção e
  recuperação:** Pendentes reservam o limite quantitativo

- **Etapa:** Validar/rejeitar; **Entrada e decisão:** Receipt pendente;
  com.validate; **Fato/efeito:** Crédito FAMILY ou rejeição sem crédito;
  **Exceção e recuperação:** Original rejeitado permanece; novo correto pode ser
  informado

- **Etapa:** Disponibilizar à equipe; **Entrada e decisão:** ENT distinta quando
  necessária; **Fato/efeito:** Expedição/aceite nas custódias; **Exceção e
  recuperação:** COM nunca atende REQ por si só

Administrador local que cria COM já aprova linhas; seu recebimento é validado
na mesma transação. Outros caminhos conservam receipt pendente. Isso é a regra
atual, sem revisão universal por duas pessoas. Tornar dupla conferência
obrigatória exige decisão de produto, não conclusão automática do auditor.

## Estados, encerramento e vínculos

COM draft → approved para administrador ou pending_approval para os demais.
Aprovação resulta approved/partially_approved/rejected; aquisição parcial mantém
purchasing e total chega a purchased. Recebimentos validados abaixo do aprovado
resultam partially_received; só o aprovado inteiro leva a received. Receipts
têm estados pending/approved/rejected próprios. Quantidades e eventos anteriores
não são apagados. Cancelamento é permitido antes de adquirido/aceito; depois
exige conciliação que não possui um encerramento geral de remanescente.

REQ tem estado administrativo, ciência, atendimento por linha, conclusão e
arquivo independentes. Uma linha é atendida por aceite positivo de ENT
explicitamente vinculada. Conclusão também exige inexistência de divergência ou
cancelamento pendente relacionado. Ciência pendente na conclusão pode deixar
exceção para arquivo manual mesmo após ciência tardia. Cancelar com ENT ativa
é recusado; concluída exige compensações. Não existe quantidade solicitada nem
ação legítima de marcar entrega manualmente para contornar os vínculos.

Em B22-09, aprovar10, adquirir2 e receber2 deixou8 aprovados não adquiridos.
Cancelar com motivo de desistência foi recusado por haver aquisição/recebimento.
Não há comando para dispensar apenas o restante. O saldo físico permanece
correto, mas a intenção digital não pode terminar conforme a realidade.
**B2-001 é lacuna operacional P2**, sem corrupção demonstrada. A decisão deve
separar não adquirido, adquirido ainda não recebido e recebido a devolver.
Um cancelamento total não representa essas três situações.

## Testes, efeitos e retomada comprovados

- B22-01: REQ e retry retornaram mesmo ID, um evento e estoque inalterado.
  Prova persistência; não simula pacote HTTP perdido nem encerramento da aba.
- B22-02/03: repetição sem motivo e extra igual a alias recusados; repetição
  justificada e extra desconhecido conservaram o sentido operacional.
- B22-04: leitor recusado em com.read antes de aprovar. Não afirmar teste
  isolado de com.approve para uma identidade que consegue ler COM.
- B22-05: receipt pendente sem crédito; segundo recebimento acima do limite,
  considerando pendentes, recusado. Suspeita de dupla reserva sem controle
  refutada.
- B22-06: aprovar10/adquirir3/validar3 manteve partially_received; adquirir e
  receber7 concluiu received. Crédito3+7; retry da mesma validação não duplicou
  movimento. REQ continuou0/1 atendida. Profissional recusado em com.read, antes
  do ramo de validação.
- B22-07: doação não exigiu preço, pagamento ou fornecedor; os mesmos marcos
  levaram a FAMILY5 e received.
- B22-08: rejeitar receipt conservou original e saldo0; novo correto creditou4.
- B22-09: remanescente abandonado ficou aberto, com recusa de cancelamento.
- B22-10: draft sem número cancelado antes de aquisição; compra posterior
  recusada por documento terminal.

## Perspectiva humana e segunda passada

Seleções fixas e categorias reduzem digitação. Reaproveitamento de REQ já existe
por requisitionId e vínculos por produto. Quantidade COM continua sendo decisão
própria da aquisição; não há valor pedido para copiá-la automaticamente.
Pode-se reaproveitar itens, urgência e contexto com confirmação, sem emitir
compra por automatismo. O operador precisa distinguir aprovado, adquirido,
recebido informado e disponível validado para saber quem age em seguida.

A segunda passada seguiu valores acumulados em vez do nome do status.
Receber a primeira compra parcial **não encerra cedo**: hipótese abandonada
por B22-06 e credit_purchase_receipt, que compara aceito com aprovado.
Receipts pendentes também são considerados: segunda suspeita descartada.
Nova COM é alternativa válida para aquisição, mas não encerra a anterior;
movimento familiar não declara desistência de fornecedor e não deve ser
usado como contorno. Não se recomenda preço obrigatório, fusão COM/ENT,
vínculo por semelhança ou pedido quantitativo REQ.

Mensagens genéricas, busca de catálogo e rascunho pertencem à B1. B2 acrescenta
a impossibilidade de encerrar saldo restante e seu efeito sobre filas e
previsões. Lista reutilizável de necessidade, linguagem própria de doação e
resumo aprovado/adquirido/recebido são alternativas incrementais, sem módulo
novo
presumido. A família pode resolver materialmente a falta e ainda conservar uma
pendência digital sem declaração formal adequada.

## Aceites, dependências e limites

AC-B2-001: encerrar8 não adquiridos após2 recebidos deve preservar receipts,
eventos, estoque2 e autoria; não criar compra/entrada/devolução fictícia nem
atender REQ. Exigir motivo, versão e proteção contra encerramento concorrente.
Alternativa mínima: dispensa justificada do remanescente dentro da COM, com
quantidades separadas. Sem decisão C não há novo requisito aprovado.

Não exercitados nesta etapa: corrida de emissão entre pessoas, revogação
durante COM, correção de produto após receipt aprovado, associação equivocada
de extra já resolvido e perda HTTP após commit. Cenários transversais
pertinentes
seguem B2.9. Banco/backend devem aprofundar compensações e concorrência; B1
conserva apresentação, foco e busca. Provedores, comprovantes físicos e
compreensão humana permanecem não verificados. Nenhuma correção foi executada.
