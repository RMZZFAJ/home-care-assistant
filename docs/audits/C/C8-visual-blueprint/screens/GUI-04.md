# GUI-04 — Recuperar serviço com segurança

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Titular/substituto e operador autorizado. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Incidente/continuidade, runbook planejado. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Identificar
responsável, preservar referência e recuperar no ambiente autorizado.

## Composição e sequência

Runbook simples: impacto, última cópia válida, conjuntos, quarentena e
checkpoints de retomada.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

RPO1h/RTO4h não garantidos; jobs externos permanecem em quarentena até
conciliação.

## Ações e efeito

Primária: **Abrir procedimento autorizado**. Secundárias: Acionar substituto;
Usar contingência; Preservar evidência.

Consequência: Nenhum restore/envio automático por botão genérico. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-173-01 — Incidente/correlação**. TEXT_INPUT. Ordem 173.1; Em falha
  técnica. Máscara/autocomplete: Sem máscara artificial; preservar texto e
  limite do contrato; off. Dependência/validação: Sem senha, OTP, token ou
  payload de paciente no chamado. Ajuda/exemplo: Suporte acessa só dados
  necessários.. Erro: Revise incidente/correlação: Sem senha, OTP, token ou
  payload de paciente no chamado..

- **CTRL-174-01 — Titular**. SEARCHABLE_COMBOBOX. Ordem 174.1; P05/P13, sem
  default fictício. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Deve existir antes do uso real. Ajuda/exemplo: Não
  “monitorar depois” sem responsável.. Erro: Revise titular: Deve existir
  antes do uso real..

- **CTRL-174-02 — Substituto**. SEARCHABLE_COMBOBOX. Ordem 174.2; P05/P13, sem
  default fictício. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Deve existir antes do uso real. Ajuda/exemplo: Não
  “monitorar depois” sem responsável.. Erro: Revise substituto: Deve existir
  antes do uso real..

- **CTRL-174-03 — Prazo de resposta**. TEXT_INPUT. Ordem 174.3; P05/P13, sem
  default fictício. Máscara/autocomplete: Sem máscara artificial; preservar
  texto e limite do contrato; off. Dependência/validação: Deve existir antes
  do uso real. Ajuda/exemplo: Não “monitorar depois” sem responsável.. Erro:
  Revise prazo de resposta: Deve existir antes do uso real..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-GUI-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: Nova superfície C3, sem equivalente B1.

Critérios C9 relacionados: C-AC-002, C-AC-003, C-AC-004, C-AC-006, C-AC-007,
C-AC-008, C-AC-040, C-AC-062, C-AC-063, C-AC-112, C-AC-114, C-AC-115,
C-AC-117, C-AC-118, C-AC-119, C-AC-120, C-AC-121, C-NEW-AC-026, C-NEW-AC-027,
C7-AC-002, C7-AC-006, C7-AC-007, C7-AC-008, C7-AC-009. A associação é por
domínio; cada caso preserva seu discriminante específico e não significa que
todos os critérios foram executados nesta tela. Fonte funcional:
[USER_GUIDES_AND_CONTINUITY](../../C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).
