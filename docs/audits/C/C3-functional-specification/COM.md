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

  **Tipo/origem:** Seleção compra/doação

  **Obrigatório e default:** Sim, escolha explícita

  **Validação/unidade:** `purchase`/`donation`; título correspondente

  **Ajuda e exemplo:** “Compra ou doação?”, sem chamar toda COM de compra.

- **Campo:** Material

  **Tipo/origem:** Busca no catálogo do paciente

  **Obrigatório e default:** Ao menos um, vazio

  **Validação/unidade:** Único por linha, até 1000

  **Ajuda e exemplo:** Seleção manual e alias; sem produto implícito pelo
  scan.

- **Campo:** Previsto

  **Tipo/origem:** Decimal informado

  **Obrigatório e default:** Sim por linha, vazio

  **Validação/unidade:** Positivo, até 1 bilhão, até seis casas e precisão da
  unidade

  **Ajuda e exemplo:** “Quantidade que pretende adquirir: 10 unidades.”

- **Campo:** Apresentação

  **Tipo/origem:** Seleção/código, opcional

  **Obrigatório e default:** Não, unidade base

  **Validação/unidade:** Conversão finita/exata, snapshot do fator/código

  **Ajuda e exemplo:** “2 pacotes de 10 = 20 unidades.”

- **Campo:** Aprovado

  **Tipo/origem:** Decimal pelo aprovador

  **Obrigatório e default:** Sim ao aprovar, proposta exibida

  **Validação/unidade:** Não confundir com adquirido/validado; mudança
  explícita

  **Ajuda e exemplo:** “Autorizar 8 unidades.”

- **Campo:** Adquirido

  **Tipo/origem:** Decimal do fato de aquisição

  **Obrigatório e default:** Sim nessa etapa, vazio

  **Validação/unidade:** Positivo, versão e limites por linha

  **Ajuda e exemplo:** “Foram adquiridas 2 unidades.”

- **Campo:** Recebido nesta parcela

  **Tipo/origem:** Decimal declarado

  **Obrigatório e default:** Sim ao informar chegada, vazio

  **Validação/unidade:** Quantidade física desta parcela, sem preencher o
  restante automaticamente

  **Ajuda e exemplo:** “Chegaram 2 unidades agora.”

- **Campo:** Parcela e autor

  **Tipo/origem:** Identidade de servidor

  **Obrigatório e default:** Sim, somente leitura

  **Validação/unidade:** ID correlacionado ao evento, não escolhido pelo
  browser

  **Ajuda e exemplo:** “Chegada informada por Maria às…”

- **Campo:** Validado/rejeitado

  **Tipo/origem:** Decisão explícita da parcela

  **Obrigatório e default:** Sim ao decidir

  **Validação/unidade:** Boolean não nulo; capability/política aplicáveis

  **Ajuda e exemplo:** Validar gera crédito; rejeitar não apaga a declaração.

- **Campo:** Motivo de rejeição

  **Tipo/origem:** Texto do decisor

  **Obrigatório e default:** Sim na rejeição

  **Validação/unidade:** 3–1000 caracteres

  **Ajuda e exemplo:** “Quantidade declarada ainda não conferida.”

- **Campo:** Observações

  **Tipo/origem:** Texto, autor

  **Obrigatório e default:** Não, vazio

  **Validação/unidade:** Até 2000 na ficha; até 1000 na aquisição

  **Ajuda e exemplo:** Comprovante financeiro não é obrigatório.

- **Campo:** Não será adquirido

  **Tipo/origem:** Quantidade remanescente calculada e selecionada

  **Obrigatório e default:** Sim ao fechar inferior

  **Validação/unidade:** Nunca inclui material adquirido/recebido como baixa
  fictícia

  **Ajuda e exemplo:** “Dispensar previsão de 8 unidades.”

- **Campo:** Motivo de encerramento

  **Tipo/origem:** Texto, responsável autorizado

  **Obrigatório e default:** Sim no fechamento

  **Validação/unidade:** 3–1000, proposta técnica de limite herdado

  **Ajuda e exemplo:** “Decidimos encerrar com as 2 unidades já validadas.”

- **Campo:** Concordância com resumo

  **Tipo/origem:** Ação pessoal do responsável

  **Obrigatório e default:** Sim ao confirmar, desmarcada

  **Validação/unidade:** Versão do resumo deve ser a aplicada

  **Ajuda e exemplo:** “Concluir com quantidade menor.”

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
