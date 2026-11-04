# CON-03 — Complementar relato

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Autor ou outro autorizado com autoria própria. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Complementar relato, novo painel. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Associar
produto/quantidade ao original sem apagar texto/autoria.

## Composição e sequência

Texto original somente leitura; linhas novas produto/q/unidade e
esclarecimento; resumo antes de salvar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Outro autor não substitui texto; falta sem linhas não vira consumo.

## Ações e efeito

Primária: **Salvar meu complemento**. Secundárias: Voltar; Ver original.

Consequência: Conserva relator e instante original. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-098-01 — Material**. SEARCHABLE_COMBOBOX. Ordem 98.1; Obrigatório
  para confirmar consumo. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Mesmo paciente, elegibilidade e unidade.
  Ajuda/exemplo: Não interpretar nome livre como correspondência certa.. Erro:
  Revise material: Mesmo paciente, elegibilidade e unidade..

- **CTRL-099-01 — Quantidade**. DECIMAL_TEXT_INPUT. Ordem 99.1; Obrigatória em
  linha estruturada de consumo. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Positiva/exata, precisão vigente antes de coerção.
  Ajuda/exemplo: “1 unidade.”. Erro: Revise quantidade: Positiva/exata,
  precisão vigente antes de coerção..

- **CTRL-100-01 — Complemento**. TEXTAREA. Ordem 100.1; Sim quando
  esclarecimento necessário. Máscara/autocomplete: Sem máscara; contador e
  limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Não altera original; autor/instante próprios.
  Ajuda/exemplo: “Esclarecimento: material X, 1 unidade na equipe.”. Erro:
  Revise complemento: Não altera original; autor/instante próprios..

- **CTRL-101-01 — Referência do relato**. READ_ONLY_DESCRIPTION. Ordem 101.1;
  Sim ao complementar/decidir. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Versão atual, paciente/custódia
  originais. Ajuda/exemplo: ID nunca concede permissão.. Erro: Revise
  referência do relato: Versão atual, paciente/custódia originais..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CON-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-019.

Critérios C9 relacionados: C-AC-020, C-AC-035, C-AC-047, C-AC-050, C-AC-055,
C-AC-059, C-AC-065, C-AC-089, C-AC-091, C-AC-095, C-AC-096, C-NEW-AC-010,
C-NEW-AC-016. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[CONSUMPTION_AND_OCCURRENCES](../../C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).
