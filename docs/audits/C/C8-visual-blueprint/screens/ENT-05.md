# ENT-05 — Resolver pedido de cancelamento

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Solicitante ou recebedor conforme ação. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Cancelamento/retirada/recusa, atual e novas ações. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Registrar
intenção e resolver desacordo com retorno de estado correto.

## Composição e sequência

Pedido com motivo/autor/estado anterior; devolvido e consumo já confirmado com
referências; comparação final.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não reutilizar consumo anterior como novo débito; comandos opostos conflitam.

## Ações e efeito

Primária: **Consentir com conciliação**. Secundárias: Recusar pedido; Retirar
meu pedido; Voltar.

Consequência: Só fato conciliado altera saldo; pedido/recusa/retirada não
estornam. Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão
material. Retorno/Voltar preserva edição e contexto; próximo destino é
resultado do ato ou tarefa pertinente, nunca novo envio automático. Em
resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-039-01 — Motivo do cancelamento**. TEXTAREA. Ordem 39.1; Sim, vazio.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: 3–1000 e versão atual.
  Ajuda/exemplo: “Solicitar cancelamento”, não “Cancelar tudo” após aceite..
  Erro: Revise motivo do cancelamento: 3–1000 e versão atual..

- **CTRL-040-01 — Devolvido**. DECIMAL_TEXT_INPUT. Ordem 40.1; Sim no
  consentimento aplicável. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Compatíveis com aceites e consumo já confirmado.
  Ajuda/exemplo: Consumido antes não é debitado outra vez.. Erro: Revise
  devolvido: Compatíveis com aceites e consumo já confirmado..

- **CTRL-040-02 — Consumo já confirmado**. DECIMAL_TEXT_INPUT. Ordem 40.2; Sim
  no consentimento aplicável. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Compatíveis com aceites e consumo já confirmado.
  Ajuda/exemplo: Consumido antes não é debitado outra vez.. Erro: Revise
  consumo já confirmado: Compatíveis com aceites e consumo já confirmado..

- **CTRL-041-01 — Motivo de retirada/recusa**. TEXTAREA. Ordem 41.1; Sim na
  nova ação. Máscara/autocomplete: Sem máscara; contador e limite do contrato
  visíveis; quebra de linha/reflow; off. Dependência/validação: 3–1000;
  vínculo à solicitação vigente. Ajuda/exemplo: “Discordo: estes materiais
  permanecem recebidos.”. Erro: Revise motivo de retirada/recusa: 3–1000;
  vínculo à solicitação vigente..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ENT-05` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `ent`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-039, OVL-021.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-028, C-AC-042, C-AC-043,
C-AC-044, C-AC-048, C-AC-050, C-AC-074, C-AC-077, C-AC-079, C-AC-089,
C-AC-096, C-AC-101, C-AC-103, C-AC-105, C-NEW-AC-006, C-NEW-AC-007,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-016, C-NEW-AC-022, C-NEW-AC-028,
C7-AC-002, C7-AC-010. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ENT](../../C3-functional-specification/ENT.md).
