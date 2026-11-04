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

  **Tipo/origem:** Boolean, família/admin local

  **Obrigatório e default:** Sim na configuração, preserva atual

  **Validação/unidade:** Não habilitar por migration

  **Ajuda e exemplo:** “Processar BAL por plantão neste paciente.”

- **Campo:** Fuso/dia/tipo de plantão

  **Tipo/origem:** Seleções configuradas

  **Obrigatório e default:** Sim, sem inferência pelo navegador

  **Validação/unidade:** Fuso válido, weekday 0–6, tipo ativo, versão

  **Ajuda e exemplo:** Mostrar prazo local e intervalo com data de fim.

- **Campo:** Início do regime

  **Tipo/origem:** Data local

  **Obrigatório e default:** Sim, escolha explícita

  **Validação/unidade:** Sem gerar contagem física retroativa

  **Ajuda e exemplo:** “A partir de 05/11/2026.”

- **Campo:** Profissional preferido

  **Tipo/origem:** Seleção opcional

  **Obrigatório e default:** Não, política atual

  **Validação/unidade:** Vínculo elegível; não garante presença

  **Ajuda e exemplo:** Ambiguidade pede designação, não escolha arbitrária.

- **Campo:** Material e unidade

  **Tipo/origem:** Catálogo ativo, servidor

  **Obrigatório e default:** Todos os exigidos, somente leitura

  **Validação/unidade:** Equipe, sem saldo familiar geral

  **Ajuda e exemplo:** Item que mudou desde rascunho exige revisão.

- **Campo:** Quantidade contada

  **Tipo/origem:** Decimal do contador

  **Obrigatório e default:** Sim por item, vazio

  **Validação/unidade:** Zero digitado válido; precisão da unidade e até seis
  casas

  **Ajuda e exemplo:** “Conte agora: 0 ou 3 unidades.”

- **Campo:** Referência de estoque

  **Tipo/origem:** Revisão de ledger do servidor

  **Obrigatório e default:** Sim, oculta na primeira etapa

  **Validação/unidade:** Snapshot imutável para comparar

  **Ajuda e exemplo:** Na revisão: contado 3 / referência 5 / diferença −2.

- **Campo:** Atribuição/janela/versão

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim quando regime ativo

  **Validação/unidade:** Pessoa, início/fim, assignment e ledger atuais

  **Ajuda e exemplo:** Sem expor UUID como instrução.

- **Campo:** Observações

  **Tipo/origem:** Texto do contador

  **Obrigatório e default:** Não, vazio

  **Validação/unidade:** Até 2000 na ficha

  **Ajuda e exemplo:** Não inventar consumo para explicar divergência.

- **Campo:** Grupo e revisão

  **Tipo/origem:** Política vigente + decisão

  **Obrigatório e default:** Sim se revisão obrigatória

  **Validação/unidade:** Ator distinto do contador da versão, grupo elegível

  **Ajuda e exemplo:** “Aprovar esta contagem da versão 3.”

- **Campo:** Destino do adiamento

  **Tipo/origem:** Plantão elegível, seleção

  **Obrigatório e default:** Sim ao solicitar

  **Validação/unidade:** Versão de alvo e prazo exibidos

  **Ajuda e exemplo:** Proposta pendente não altera obrigação.

- **Campo:** Substituta do reconto

  **Tipo/origem:** Seleção por designação formal

  **Obrigatório e default:** Sim ao redesignar

  **Validação/unidade:** Vínculo/capacidade/janela; registro do designador

  **Ajuda e exemplo:** “Sheila fará novo reconto; Juliana permanece autora da
  contagem anterior.”

- **Campo:** Motivo da decisão

  **Tipo/origem:** Texto do responsável

  **Obrigatório e default:** Sim em adiamento/reconto/configuração

  **Validação/unidade:** 3–1000 caracteres

  **Ajuda e exemplo:** Explicar efeito e próxima pessoa.

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
