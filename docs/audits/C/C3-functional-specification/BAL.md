# BAL — contagem, revisão e reconto autoral

AS_IS: /balancos para regime/atribuição, /fichas/bal para contagem e
/fichas/:id para revisão. Contratos em src/lib/validation/balances.ts e
documents.ts; bal_obligations/cycles/assignments e bal_approvals preservam
versões. Regime agendado protege contador distinto; B3-006 demonstra desvio no
legado. TO_BE aplica DEC-009/010/012/013/029, mantendo obrigações/atrasos
reais.

## Telas e campos

<!-- c-table:start -->

- **Tela:** BAL-01

  **Rota e situação:** /balancos, atual a alterar

  **Objetivo e ações:** Ver obrigação, prazo original/efetivo e responsável;
  configurar, adiar ou designar.

- **Tela:** BAL-02

  **Rota e situação:** /fichas/bal etapa 1, atual a alterar

  **Objetivo e ações:** Contar fisicamente equipe sem revelar referência antes
  da observação.

- **Tela:** BAL-03

  **Rota e situação:** Revisão etapa 2 e detalhe, atual a alterar

  **Objetivo e ações:** Comparar contagem/referência, aprovar versão ou
  solicitar novo reconto.

- **Tela:** BAL-04

  **Rota e situação:** Designação de reconto, atual a ampliar

  **Objetivo e ações:** Escolher substituta e janela autorizadas com autoria
  preservada.

- **Tela:** BAL-05

  **Rota e situação:** Adiamento e decisão, atual a alterar

  **Objetivo e ações:** Mostrar alvo e efeito; recusar/encerrar pedido
  obsoleto de modo terminal.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Habilitar regime

  **Tipo/origem por tela e estado:** BAL-01 Habilitar regime: EDITABLE_SUBFORM
  (SWITCH_WITH_LABEL); Configuração familiar autorizada; designado consulta
  valor em leitura

  **Obrigatoriedade/default na preparação:** BAL-01 Habilitar regime: Sim na
  configuração, preserva atual

  **Validação/unidade:** BAL-01 Habilitar regime: Não habilitar por migration;
  Configuração familiar autorizada; designado consulta valor em leitura

  **Ajuda/exemplo:** BAL-01 Habilitar regime: “Processar BAL por plantão neste
  paciente.”

- **Campo:** Fuso/dia/tipo de plantão

  **Tipo/origem por tela e estado:** BAL-01 Fuso: EDITABLE_SUBFORM
  (SEARCHABLE_TIMEZONE); Configuração de novo regime; consulta da obrigação
  não edita fuso; BAL-01 Dia da semana: EDITABLE_SUBFORM (WEEKDAY_SELECT);
  Configuração do regime; BAL-01 Tipo de plantão: EDITABLE_SUBFORM
  (SHIFT_TYPE_SELECT); Configuração do regime

  **Obrigatoriedade/default na preparação:** BAL-01 Fuso: Sim, sem inferência
  pelo navegador; BAL-01 Dia da semana: Sim, sem inferência pelo navegador;
  BAL-01 Tipo de plantão: Sim, sem inferência pelo navegador

  **Validação/unidade:** BAL-01 Fuso: Fuso válido, weekday 0–6, tipo ativo,
  versão; Configuração de novo regime; consulta da obrigação não edita fuso;
  BAL-01 Dia da semana: Fuso válido, weekday 0–6, tipo ativo, versão;
  Configuração do regime; BAL-01 Tipo de plantão: Fuso válido, weekday 0–6,
  tipo ativo, versão; Configuração do regime

  **Ajuda/exemplo:** BAL-01 Fuso: Mostrar prazo local e intervalo com data de
  fim.; BAL-01 Dia da semana: Mostrar prazo local e intervalo com data de
  fim.; BAL-01 Tipo de plantão: Mostrar prazo local e intervalo com data de
  fim.

- **Campo:** Início do regime

  **Tipo/origem por tela e estado:** BAL-01 Início do regime: EDITABLE_SUBFORM
  (DATE_INPUT); Configuração do regime

  **Obrigatoriedade/default na preparação:** BAL-01 Início do regime: Sim,
  escolha explícita

  **Validação/unidade:** BAL-01 Início do regime: Sem gerar contagem física
  retroativa; Configuração do regime

  **Ajuda/exemplo:** BAL-01 Início do regime: “A partir de 05/11/2026.”

- **Campo:** Profissional preferido

  **Tipo/origem por tela e estado:** BAL-01 Profissional preferido:
  EDITABLE_SUBFORM (PERSON_COMBOBOX); Preferência de atribuição; nunca
  comprovação de presença

  **Obrigatoriedade/default na preparação:** BAL-01 Profissional preferido:
  Não, política atual

  **Validação/unidade:** BAL-01 Profissional preferido: Vínculo elegível; não
  garante presença; Preferência de atribuição; nunca comprovação de presença

  **Ajuda/exemplo:** BAL-01 Profissional preferido: Ambiguidade pede
  designação, não escolha arbitrária.

- **Campo:** Material e unidade

  **Tipo/origem por tela e estado:** BAL-02 Material e unidade: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-03 Material e unidade: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** BAL-02 Material e unidade: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; BAL-03 Material e unidade:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** BAL-02 Material e unidade: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-03 Material e unidade: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** BAL-02 Material e unidade: Identificação do item
  registrado. A consulta não substitui o material ou reinterpreta sua
  unidade.; BAL-03 Material e unidade: Identificação do item registrado. A
  consulta não substitui o material ou reinterpreta sua unidade.

- **Campo:** Quantidade contada

  **Tipo/origem por tela e estado:** BAL-02 Quantidade contada: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** BAL-02 Quantidade contada: Sim
  por item, vazio

  **Validação/unidade:** BAL-02 Quantidade contada: Zero digitado válido;
  precisão da unidade e até seis casas; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** BAL-02 Quantidade contada: “Conte agora: 0 ou 3
  unidades.”

- **Campo:** Referência de estoque

  **Tipo/origem por tela e estado:** BAL-03 Referência de estoque: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** BAL-03 Referência de estoque:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** BAL-03 Referência de estoque: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** BAL-03 Referência de estoque: Quantidade registrada para
  a etapa indicada. Não é uma nova declaração de quantidade e não movimenta
  material ao ser consultada.

- **Campo:** Atribuição/janela/versão

  **Tipo/origem por tela e estado:** BAL-01 Atribuição: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-02 Atribuição: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-03 Atribuição: READ_ONLY (TEXT_VALUE); Consulta do valor de
  origem; mudanças só no processo legitimamente responsável; BAL-01 Início da
  janela: READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no
  processo legitimamente responsável; BAL-02 Início da janela: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-03 Início da janela: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-01 Fim da janela: READ_ONLY (TEXT_VALUE); Consulta do valor
  de origem; mudanças só no processo legitimamente responsável; BAL-02 Fim da
  janela: READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no
  processo legitimamente responsável; BAL-03 Fim da janela: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-01 Versão da atribuição: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-02 Versão da atribuição: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; BAL-03 Versão da atribuição: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** BAL-01 Atribuição: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; BAL-02 Atribuição: Valor emitido, proposto
  ou calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; BAL-03 Atribuição: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado;
  BAL-01 Início da janela: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado; BAL-02
  Início da janela: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado; BAL-03
  Início da janela: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado; BAL-01
  Fim da janela: Valor emitido, proposto ou calculado da fonte identificada;
  ausência explicitamente informada, sem valor inventado; BAL-02 Fim da
  janela: Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; BAL-03 Fim da janela: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; BAL-01 Versão da atribuição:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; BAL-02 Versão da atribuição:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; BAL-03 Versão da atribuição:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** BAL-01 Atribuição: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-02 Atribuição: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-03 Atribuição: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-01 Início da janela: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-02 Início da janela: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-03 Início da janela: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-01 Fim da janela: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-02 Fim da janela: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-03 Fim da janela: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-01 Versão da atribuição: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-02 Versão da atribuição: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; BAL-03 Versão da atribuição: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** BAL-01 Atribuição: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; BAL-02 Atribuição: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; BAL-03 Atribuição: Informação do
  registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.; BAL-01 Início da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-02 Início da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-03 Início da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-01 Fim da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-02 Fim da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-03 Fim da janela: A
  data pertence ao fato identificado. Data de registro e de emissão são
  mostradas separadamente quando forem diferentes.; BAL-01 Versão da
  atribuição: Informação do registro indicado, somente para consulta nesta
  etapa. Ausência de dado histórico permanece explicitamente identificada.;
  BAL-02 Versão da atribuição: Informação do registro indicado, somente para
  consulta nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.; BAL-03 Versão da atribuição: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

- **Campo:** Observações

  **Tipo/origem por tela e estado:** BAL-02 Observações: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; BAL-03 Observações: READ_ONLY
  (TEXT_VALUE); Observações originais do contador; parecer do revisor tem
  CTRL-C8-002 próprio

  **Obrigatoriedade/default na preparação:** BAL-02 Observações: Não, vazio;
  BAL-03 Observações: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** BAL-02 Observações: Até 2000 na ficha; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; BAL-03 Observações: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Observações originais do contador; parecer do revisor tem CTRL-C8-002
  próprio

  **Ajuda/exemplo:** BAL-02 Observações: Não inventar consumo para explicar
  divergência.; BAL-03 Observações: Observação da pessoa que contou. O parecer
  de revisão tem campo e autoria separados.

- **Campo:** Grupo e revisão

  **Tipo/origem por tela e estado:** BAL-03 Grupo e revisão: READ_ONLY
  (REVIEW_STATUS_DESCRIPTION); Grupo/elegibilidade/autor da revisão resolvidos
  pelo servidor; não digitados

  **Obrigatoriedade/default na preparação:** BAL-03 Grupo e revisão: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** BAL-03 Grupo e revisão: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Grupo/elegibilidade/autor da revisão resolvidos pelo servidor;
  não digitados

  **Ajuda/exemplo:** BAL-03 Grupo e revisão: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

- **Campo:** Destino do adiamento

  **Tipo/origem por tela e estado:** BAL-05 Destino do adiamento:
  EDITABLE_SUBFORM (TARGET_SELECTOR_OR_READ_ONLY_COMPARISON); Só SOLICITAR; ao
  APROVAR/RECUSAR/ENCERRAR, destino da proposta é READ_ONLY

  **Obrigatoriedade/default na preparação:** BAL-05 Destino do adiamento: Sim
  ao solicitar

  **Validação/unidade:** BAL-05 Destino do adiamento: Versão de alvo e prazo
  exibidos; Só SOLICITAR; ao APROVAR/RECUSAR/ENCERRAR, destino da proposta é
  READ_ONLY

  **Ajuda/exemplo:** BAL-05 Destino do adiamento: Proposta pendente não altera
  obrigação.

- **Campo:** Substituta do reconto

  **Tipo/origem por tela e estado:** BAL-04 Substituta do reconto: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** BAL-04 Substituta do reconto: Sim
  ao redesignar

  **Validação/unidade:** BAL-04 Substituta do reconto:
  Vínculo/capacidade/janela; registro do designador; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** BAL-04 Substituta do reconto: “Sheila fará novo reconto;
  Juliana permanece autora da contagem anterior.”

- **Campo:** Motivo da decisão

  **Tipo/origem por tela e estado:** BAL-01 Motivo da decisão:
  EDITABLE_SUBFORM (TEXTAREA); Somente comando autorizado de
  configuração/adiamento; não aparece como nota na consulta; BAL-04 Motivo da
  decisão: EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; BAL-05 Motivo da
  decisão: EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** BAL-01 Motivo da decisão: Sim em
  adiamento/reconto/configuração; BAL-04 Motivo da decisão: Sim em
  adiamento/reconto/configuração; BAL-05 Motivo da decisão: Sim em
  adiamento/reconto/configuração

  **Validação/unidade:** BAL-01 Motivo da decisão: 3–1000 caracteres; Somente
  comando autorizado de configuração/adiamento; não aparece como nota na
  consulta; BAL-04 Motivo da decisão: 3–1000 caracteres; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura; BAL-05 Motivo da decisão: 3–1000 caracteres; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura

  **Ajuda/exemplo:** BAL-01 Motivo da decisão: Explicar efeito e próxima
  pessoa.; BAL-04 Motivo da decisão: Explicar efeito e próxima pessoa.; BAL-05
  Motivo da decisão: Explicar efeito e próxima pessoa.

- **Campo:** Parecer da revisão

  **Tipo/origem por tela e estado:** TEXTAREA;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Somente em revisão legitimamente
  iniciada; opcional e vazio; separado das notas do contador

  **Validação/unidade:** Limite TO_BE de 2.000 caracteres, com contador; impor
  o mesmo limite na UI/API/banco da revisão na D; nunca sobrescrever contagem
  ou notas originais

  **Ajuda/exemplo:** Registre sua informação de revisão em até 2.000
  caracteres. As observações da contadora permanecem preservadas.

<!-- c-table:end -->

## Transições e efeito no estoque

Obrigação aberta → atribuição válida → contagem registrada → revisão pendente
ou aplicação conforme política → aprovada/aplicada. Reconto cria nova versão
com novo autor e nova referência. Aprovações antigas permanecem, inelegíveis
para a nova versão. Ciência ou presença prevista não satisfaz obrigação
física.

Quando revisão é exigida, confirmar grupos conforme política e contador real
distinto em todos os caminhos, inclusive legado. Se o ledger mudou desde a
contagem, impedir aplicação antiga, explicar mudança e pedir reconto. Ajuste
de BAL é diferença de inventário, não consumo relatado; ledger conserva
origem. Contagem atual regulariza obrigações anteriores por vínculo explícito,
sem fingir que foi realizada nos dias passados ou apagar atraso original.

Pedido de adiamento conserva prazo atual até decisão familiar legítima. Se
plantão, pessoa ou versão mudou, não aprovar o alvo antigo. Rejeitar/inativar
como obsoleto deve poder concluir o pedido, registrando motivo; não ficar
preso na mesma checagem que proíbe aprovação. Nova proposta é outro fato
ligado.

Troca na agenda mostra efeito BAL antes de confirmar. Se o contador anterior
está indisponível em reconto, designador cria nova atribuição para Sheila,
conservando a contagem de Juliana. No intervalo sem elegível, exibir pendência
com próximo responsável pela designação. Nunca modificar o autor anterior.

## Falhas, identidade e documento

Criar/revisar/submeter adquire lock antes de recuperar idempotência e antes de
testar elegibilidade de nova contagem; revalida autoridade após espera, como o
contrato correto atual agendado. Retry de ato confirmado recupera mesmo BAL
mesmo se janela avançou; não permite iniciar ato novo fora da janela. Duas
revisões concorrentes aplicam no máximo uma versão e um ajuste.

Na UI, conflito conserva contagem e diferença para revisar; offline permite
ver snapshot marcado desatualizado, sem aplicar. Rascunho retomado revalida
itens, referência, assignment e pessoa. Revogado perde nova ação; nova
designação não equivale a delegado assinar. P11 define grupos efetivamente
disponíveis.

PDF inclui contado/referência/diferença, autor de cada contagem,
revisor/grupo, versão revisada, regime, janela e regularização de obrigações.
Não imprime aprovação velha como vigente nem título “semanal” para todo BAL.
Alertas internos apontam próxima pessoa, sem transformar atraso em contagem
automática.

Aceites: contador não revisa própria versão legado/agendado; reconto por
Sheila é novo ato; ledger alterado impede aprovação antiga; pedido obsoleto
termina sem alterar prazo original; duas submissões com mesma chave preservam
um ajuste; UI móvel mostra comparação completa e devolve foco ao contador.
Operadores devem explicar por que contagem física e revisão são etapas
distintas.

## Atualização vinculante C7–C10

P11 foi aprovado: revisão facultativa no primeiro uso, sem fila universal.
Contagem confirmada explicita efeito; autosave não aplica inventário e
diferença não vira consumo inferido. Revisão iniciada tem autor/versão
próprios e revisor distinto do contador efetivo. Reconto por substituta
preserva original.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

BAL-03 conserva valores/notas da contadora em leitura. Grupo, elegibilidade e
ator vêm da autoridade; parecer próprio do revisor não sobrescreve notas.
Revisão facultativa no primeiro uso. BAL-05 decide alvo/prazo congelados;
mudar destino exige preparar outro pedido, sem aprovar versão diferente.
