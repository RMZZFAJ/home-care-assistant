# EST-01 — Consultar estoques

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Capacidade por custódia. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /estoque, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Saldos confirmados por custódia,
trânsito e previsão separados; atualizar sem apagar painel válido.

## Composição e sequência

Cards Família/Equipe/Trânsito com previsão separada; busca e lista; erro de
movimentos não apaga saldo válido.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Equipe não vê saldo familiar geral; item inativo com saldo permanece listado.

## Ações e efeito

Primária: **Abrir material**. Secundárias: Atualizar; Filtrar custódia; Ver
trânsito.

Consequência: Consulta não movimenta. Mostrar objeto/quantidade/pessoa/versão
antes de qualquer decisão material. Retorno/Voltar preserva edição e contexto;
próximo destino é resultado do ato ou tarefa pertinente, nunca novo envio
automático. Em resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-070-01 — Custódia consultada**. SEARCHABLE_COMBOBOX. Ordem 70.1; Sim,
  contexto permitido. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Equipe não vê saldo geral familiar. Ajuda/exemplo:
  “Disponível na equipe”, não “Estoque total” indiscriminado.. Erro: Revise
  custódia consultada: Equipe não vê saldo geral familiar..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-EST-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `stock`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-016, SC-017, SC-018.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-022, C-AC-045, C-AC-046,
C-AC-053, C-AC-066, C-AC-068, C-AC-072, C-AC-074, C-AC-120, C-NEW-AC-008,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-023, C-NEW-AC-025, C7-AC-010. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[STOCK_AND_CUSTODY](../../C3-functional-specification/STOCK_AND_CUSTODY.md).
