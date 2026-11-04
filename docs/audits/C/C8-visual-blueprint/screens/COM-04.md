# COM-04 — Encerrar expectativa remanescente

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Responsável familiar autorizado. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Diálogo de encerramento inferior, novo. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Comparar por linha e
dispensar expectativa remanescente explicitamente.

## Composição e sequência

Diálogo por linha: previsto10/validado2/dispensar8; pendências físicas em
bloco separado.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Se houver parcela pending, mostrar conferência pendente sem rotular ficha
concluída fisicamente.

## Ações e efeito

Primária: **Confirmar encerramento da expectativa**. Secundárias: Manter
restante; Voltar.

Consequência: Dispensa previsão; não recebe8 inexistentes. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-025-01 — Não será adquirido**. DECIMAL_TEXT_INPUT. Ordem 25.1; Sim ao
  fechar inferior. Máscara/autocomplete: Vírgula/ponto; inputmode decimal;
  precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Nunca inclui material adquirido/recebido como baixa
  fictícia. Ajuda/exemplo: “Dispensar previsão de 8 unidades.”. Erro: Revise
  não será adquirido: Nunca inclui material adquirido/recebido como baixa
  fictícia..

- **CTRL-026-01 — Motivo de encerramento**. TEXTAREA. Ordem 26.1; Sim no
  fechamento. Máscara/autocomplete: Sem máscara; contador e limite do contrato
  visíveis; quebra de linha/reflow; off. Dependência/validação: 3–1000,
  proposta técnica de limite herdado. Ajuda/exemplo: “Decidimos encerrar com
  as 2 unidades já validadas.”. Erro: Revise motivo de encerramento: 3–1000,
  proposta técnica de limite herdado..

- **CTRL-027-01 — Concordância com resumo**. CHECKBOX_OR_SWITCH. Ordem 27.1;
  Sim ao confirmar, desmarcada. Máscara/autocomplete: Sem máscara; rótulo
  descreve efeito; vazio não equivale a concordância; off.
  Dependência/validação: Versão do resumo deve ser a aplicada. Ajuda/exemplo:
  “Concluir com quantidade menor.”. Erro: Revise concordância com resumo:
  Versão do resumo deve ser a aplicada..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-COM-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `com/comPartial`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-039.

Critérios C9 relacionados: C-AC-015, C-AC-028, C-AC-035, C-AC-044, C-AC-058,
C-AC-074, C-AC-077, C-AC-089, C-AC-109, C-NEW-AC-005, C-NEW-AC-022. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional: [COM](../../C3-functional-specification/COM.md).
