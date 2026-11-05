# COM — aquisição, chegada, validação e encerramento inferior

AS_IS: /fichas/com e detalhe /fichas/:id; supplyPayload/supplyCommandSchema em
src/lib/validation/documents.ts, purchase_receipts e comandos transacionais.
Compra e doação existem; só chegada validada credita FAMILY. B2-001/B3-010
demonstram COM de 10 unidades com 2 recebidos sem desistência dos 8 restantes.
B6-010 separa integridade física preservada de representação insuficiente das
parcelas. TO_BE: DEC-004/012/013/015/016 e O02/O08, com fechamento P14
aprovado.

## Telas e campos

<!-- c-table:start -->

- **Tela:** COM-01

  **Rota e situação:** /fichas/com, atual a alterar

  **Objetivo e ações:** Solicitar compra/doação; selecionar materiais e
  quantidades previstas; salvar/emitir.

- **Tela:** COM-02

  **Rota e situação:** /fichas/:id, atual a alterar

  **Objetivo e ações:** Aprovar quantidades, registrar aquisição, consultar
  previstas/adquiridas.

- **Tela:** COM-03

  **Rota e situação:** Parcelas no detalhe, atual a alterar

  **Objetivo e ações:** Informar chegada; validar ou rejeitar parcela
  identificável, com motivo.

- **Tela:** COM-04

  **Rota e situação:** Diálogo de encerramento inferior, novo

  **Objetivo e ações:** Comparar por linha e dispensar expectativa
  remanescente explicitamente.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Origem

  **Tipo/origem por tela e estado:** COM-01 Origem: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; COM-02 Origem: READ_ONLY
  (TEXT_VALUE); Origem já emitida

  **Obrigatoriedade/default na preparação:** COM-01 Origem: Sim, escolha
  explícita; COM-02 Origem: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-01 Origem: `purchase`/`donation`; título
  correspondente; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; COM-02 Origem: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Origem já emitida

  **Ajuda/exemplo:** COM-01 Origem: “Compra ou doação?”, sem chamar toda COM
  de compra.; COM-02 Origem: Informação do registro indicado, somente para
  consulta nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.

- **Campo:** Material

  **Tipo/origem por tela e estado:** COM-01 Material: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; COM-02 Material:
  READ_ONLY (TEXT_VALUE); Material da linha emitida

  **Obrigatoriedade/default na preparação:** COM-01 Material: Ao menos um,
  vazio; COM-02 Material: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-01 Material: Único por linha, até 1000; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; COM-02 Material: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Material da linha emitida

  **Ajuda/exemplo:** COM-01 Material: Seleção manual e alias; sem produto
  implícito pelo scan.; COM-02 Material: Identificação do item registrado. A
  consulta não substitui o material ou reinterpreta sua unidade.

- **Campo:** Previsto

  **Tipo/origem por tela e estado:** COM-01 Previsto: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; COM-02 Previsto: READ_ONLY
  (QUANTITY_WITH_UNIT); Quantidade prevista original

  **Obrigatoriedade/default na preparação:** COM-01 Previsto: Sim por linha,
  vazio; COM-02 Previsto: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-01 Previsto: Positivo, até 1 bilhão, até seis
  casas e precisão da unidade; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; COM-02 Previsto:
  Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao
  usuário correção deste valor nesta tela. Quantidade prevista original

  **Ajuda/exemplo:** COM-01 Previsto: “Quantidade que pretende adquirir: 10
  unidades.”; COM-02 Previsto: Quantidade registrada para a etapa indicada.
  Não é uma nova declaração de quantidade e não movimenta material ao ser
  consultada.

- **Campo:** Apresentação

  **Tipo/origem por tela e estado:** COM-01 Apresentação: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; COM-02 Apresentação:
  READ_ONLY (EQUIVALENCE_DESCRIPTION); Apresentação/fator da emissão

  **Obrigatoriedade/default na preparação:** COM-01 Apresentação: Não, unidade
  base; COM-02 Apresentação: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-01 Apresentação: Conversão finita/exata, snapshot
  do fator/código; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; COM-02 Apresentação: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Apresentação/fator da emissão

  **Ajuda/exemplo:** COM-01 Apresentação: “2 pacotes de 10 = 20 unidades.”;
  COM-02 Apresentação: Informação do registro indicado, somente para consulta
  nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.

- **Campo:** Aprovado

  **Tipo/origem por tela e estado:** COM-02 Aprovado: EDITABLE_SUBFORM
  (DECIMAL_TEXT_INPUT); Somente ao preparar aprovação autorizada; depois em
  leitura

  **Obrigatoriedade/default na preparação:** COM-02 Aprovado: Sim ao aprovar,
  proposta exibida

  **Validação/unidade:** COM-02 Aprovado: Não confundir com
  adquirido/validado; mudança explícita; Somente ao preparar aprovação
  autorizada; depois em leitura

  **Ajuda/exemplo:** COM-02 Aprovado: “Autorizar 8 unidades.”

- **Campo:** Adquirido

  **Tipo/origem por tela e estado:** COM-02 Adquirido: EDITABLE_SUBFORM
  (DECIMAL_TEXT_INPUT); Somente Registrar aquisição; não é declaração de
  chegada

  **Obrigatoriedade/default na preparação:** COM-02 Adquirido: Sim nessa
  etapa, vazio

  **Validação/unidade:** COM-02 Adquirido: Positivo, versão e limites por
  linha; Somente Registrar aquisição; não é declaração de chegada

  **Ajuda/exemplo:** COM-02 Adquirido: “Foram adquiridas 2 unidades.”

- **Campo:** Recebido nesta parcela

  **Tipo/origem por tela e estado:** COM-03 Recebido nesta parcela:
  EDITABLE_SUBFORM (DECIMAL_TEXT_INPUT_OR_READ_ONLY_QUANTITY); Só
  NOVA_CHEGADA; na decisão VALIDAR/REJEITAR é READ_ONLY, sem correção da
  declaração

  **Obrigatoriedade/default na preparação:** COM-03 Recebido nesta parcela:
  Sim ao informar chegada, vazio

  **Validação/unidade:** COM-03 Recebido nesta parcela: Quantidade física
  desta parcela, sem preencher o restante automaticamente; Só NOVA_CHEGADA; na
  decisão VALIDAR/REJEITAR é READ_ONLY, sem correção da declaração

  **Ajuda/exemplo:** COM-03 Recebido nesta parcela: “Chegaram 2 unidades
  agora.”

- **Campo:** Parcela e autor

  **Tipo/origem por tela e estado:** COM-03 Parcela e autor: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** COM-03 Parcela e autor: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-03 Parcela e autor: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** COM-03 Parcela e autor: Identifica a pessoa relacionada a
  este ato; não permite transferir sua autoria para quem consulta.

- **Campo:** Validado/rejeitado

  **Tipo/origem por tela e estado:** COM-03 Validado/rejeitado:
  EXPLICIT_ACTION (DECISION_BUTTONS); Parcela pendente/versão atual; dois
  botões com consequência própria

  **Obrigatoriedade/default na preparação:** COM-03 Validado/rejeitado: Sem
  concordância material inicial ou clique automático

  **Validação/unidade:** COM-03 Validado/rejeitado: Boolean não nulo;
  capability/política aplicáveis; Parcela pendente/versão atual; dois botões
  com consequência própria

  **Ajuda/exemplo:** COM-03 Validado/rejeitado: Validar gera crédito; rejeitar
  não apaga a declaração.

- **Campo:** Motivo de rejeição

  **Tipo/origem por tela e estado:** COM-03 Motivo de rejeição: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** COM-03 Motivo de rejeição: Sim na
  rejeição

  **Validação/unidade:** COM-03 Motivo de rejeição: 3–1000 caracteres; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** COM-03 Motivo de rejeição: “Quantidade declarada ainda
  não conferida.”

- **Campo:** Observações

  **Tipo/origem por tela e estado:** COM-01 Observações: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; COM-02 Observações: READ_ONLY
  (TEXT_VALUE); Observação da emissão; etapa nova tem nota própria
  identificada

  **Obrigatoriedade/default na preparação:** COM-01 Observações: Não, vazio;
  COM-02 Observações: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-01 Observações: Até 2000 na ficha; até 1000 na
  aquisição; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; COM-02 Observações: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Observação da emissão; etapa nova tem nota própria
  identificada

  **Ajuda/exemplo:** COM-01 Observações: Comprovante financeiro não é
  obrigatório.; COM-02 Observações: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

- **Campo:** Não será adquirido

  **Tipo/origem por tela e estado:** COM-04 Não será adquirido: CALCULATED
  (QUANTITY_WITH_UNIT); Restante dispensável calculado na versão exibida; não
  é input de baixa

  **Obrigatoriedade/default na preparação:** COM-04 Não será adquirido: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** COM-04 Não será adquirido: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Restante dispensável calculado na versão exibida; não é
  input de baixa

  **Ajuda/exemplo:** COM-04 Não será adquirido: Resultado calculado a partir
  dos fatos desta tarefa, apresentado para conferência. Ele não pode ser
  digitado ou corrigido aqui.

- **Campo:** Motivo de encerramento

  **Tipo/origem por tela e estado:** COM-04 Motivo de encerramento: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** COM-04 Motivo de encerramento:
  Sim no fechamento

  **Validação/unidade:** COM-04 Motivo de encerramento: 3–1000, proposta
  técnica de limite herdado; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** COM-04 Motivo de encerramento: “Decidimos encerrar com as
  2 unidades já validadas.”

- **Campo:** Concordância com resumo

  **Tipo/origem por tela e estado:** COM-04 Concordância com resumo: EDITABLE
  (EXPLICIT_UNCHECKED_CONFIRMATION); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** COM-04 Concordância com resumo:
  Se confirmação de resumo adotada: desmarcada e escolha pessoal explícita;
  botão explica o efeito

  **Validação/unidade:** COM-04 Concordância com resumo: Versão do resumo deve
  ser a aplicada; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** COM-04 Concordância com resumo: “Concluir com quantidade
  menor.”

<!-- c-table:end -->

## Transições e fatos

Rascunho → solicitado → aprovado → aquisição parcial/total → chegada declarada
por parcela → validação/rejeição. O estado agregado deriva desses fatos; uma
linha pode ter parcela validada e outra pendente. Exibir colunas distintas,
sem sobrescrever quantidade prevista para fazer a conta parecer completa.

<!-- c-table:start -->

- **Ação:** Aprovar

  **Ator e pré-condição:** Familiar/admin com capacidade, versão atual

  **Persistência, saldo e próximo responsável:** Evento/aprovação; não credita
  saldo. Próximo: aquisição.

- **Ação:** Registrar aquisição

  **Ator e pré-condição:** Ator autorizado, linha aprovada

  **Persistência, saldo e próximo responsável:** Quantidade adquirida e
  identidade do ato; não prova chegada.

- **Ação:** Informar chegada

  **Ator e pré-condição:** Familiar autorizado

  **Persistência, saldo e próximo responsável:** Nova purchase_receipt, linhas
  e evento com receiptId; aguarda validação.

- **Ação:** Validar parcela

  **Ator e pré-condição:** Capacidade/política vigente

  **Persistência, saldo e próximo responsável:** Uma validação, crédito FAMILY
  exato e snapshot da parcela; retry recupera.

- **Ação:** Rejeitar parcela

  **Ator e pré-condição:** Ator autorizado, motivo

  **Persistência, saldo e próximo responsável:** Mantém original e evento de
  rejeição; não cria crédito ou elimina relato.

- **Ação:** Encerrar inferior

  **Ator e pré-condição:** Responsável, resumo atual e regra P14 aprovada

  **Persistência, saldo e próximo responsável:** Dispensa expectativa não
  física por linha; material já validado permanece.

- **Ação:** Cancelar sem fato físico

  **Ator e pré-condição:** Capacidade e estado permitem

  **Persistência, saldo e próximo responsável:** Terminal motivado; não usa
  esse comando para apagar parcela recebida.

<!-- c-table:end -->

Para 10 previstos, 2 adquiridos/recebidos/validados e 8 dispensados: saldo
continua 2, previsão restante vira 0 e histórico mostra 10→2+8 dispensados. Se
parte ainda é esperada, permanece parcial. P14-A conclui só após validar
parcelas; P14-B encerra expectativa e mantém validação pendente visível, sem
usar “Concluída” para obrigação ainda aberta. P14 aprovou esses dois percursos
conforme existência de parcela pendente.

## Recuperação e documento

Registrar chegada, validar e encerrar têm chaves diferentes por intenção e
mesma chave no retry. Duas validações concorrentes geram um crédito. Perda da
resposta recupera parcela/evento por chave; não cria outra chegada. Conflito
de versão preserva valores e abre comparação. Se revisão foi salva e emissão
recusada, informar as duas etapas, sem apagar draft ou anunciar expedição.

PDF/histórico mostram compra ou doação, previsto/aprovado/adquirido, parcelas
informadas/rejeitadas/validadas, autores, instantes e dispensa. Quantidades
financeiras e fornecedor permanecem opcionais e não viram domínio novo.
Notificação de parcela já validada não pede nova validação. COM não atende
REQ; vínculo reaproveita seleção sem duplicar fato físico.

Aceites: 10→2 e dispensa 8 sem movimento extra; parcela pendente/rejeitada não
credita; duas sessões com decisões opostas recebem resultado inequívoco;
replay de validação conserva ID/ledger; PDF explica cada parcela e
desconhecidos. Pessoa familiar entende “esperado” versus “disponível” em tela
móvel e impressão. P14 já foi aprovado; D2 implementará e demonstrará ambos os
percursos legítimos.

## Atualização vinculante C7–C10

P14 foi aprovado: validar parcelas pertinentes e dispensar expectativa
restante; com recebimento pendente, encerrar só expectativa e preservar status
honesto. Não há opção de creditar quantidade inexistente. COM-03/04 e
C7-AC-002 detalham parcelas e regularização.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

COM-02 lê origem, materiais, previsto e observações emitidos; aprovação e
aquisição abrem subformulários próprios. COM-03 distingue NOVA_CHEGADA
(quantidade inicialmente vazia/editável) de DECIDIR_PARCELA (quantidade, autor
e instante originais em leitura). Decidir não corrige a prova. COM-04 calcula
o dispensável na versão revista; não pede baixa fictícia nem altera o previsto
para fazer a conta fechar.
