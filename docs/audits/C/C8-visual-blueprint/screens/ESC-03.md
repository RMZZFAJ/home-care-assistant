# ESC-03 — Decidir alteração de plantão

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Aprovador competente. Banco/API revalidam capacidade, alvo
e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Proposta e decisão, atual a corrigir. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Comparar
atual/proposto, pessoa, fuso e efeito BAL; aprovar ou recusar.

## Composição e sequência

Diálogo antes/depois lado a lado desktop, empilhado móvel; pessoa, datas, fuso
e efeito BAL em texto.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

P1: nunca aprovar só pelo motivo; série encerrada não republica após corte.

## Ações e efeito

Primária: **Aprovar proposta exibida**. Secundárias: Rejeitar; Voltar.

Consequência: Aplica exatamente versão apresentada ou conflita. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-060-01 — Fuso**. SEARCHABLE_TIMEZONE. Ordem 60.1; Sim, escolha
  configurada. Máscara/autocomplete: Zona IANA configurada, exemplo
  America/Sao_Paulo; off. Dependência/validação: Não herdar silenciosamente
  fuso do aparelho. Ajuda/exemplo: Ex.: America/Sao_Paulo.. Erro: Revise fuso:
  Não herdar silenciosamente fuso do aparelho..

- **CTRL-068-01 — Motivo**. TEXTAREA. Ordem 68.1; Motivo em
  decisão/troca/corte; notas opcionais. Máscara/autocomplete: Sem máscara;
  contador e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Motivo 3–1000, notas até 2000. Ajuda/exemplo:
  “Substituição combinada antes do turno.”. Erro: Revise motivo: Motivo
  3–1000, notas até 2000..

- **CTRL-068-02 — Notas**. TEXTAREA. Ordem 68.2; Motivo em
  decisão/troca/corte; notas opcionais. Máscara/autocomplete: Sem máscara;
  contador e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Motivo 3–1000, notas até 2000. Ajuda/exemplo:
  “Substituição combinada antes do turno.”. Erro: Revise notas: Motivo 3–1000,
  notas até 2000..

- **CTRL-069-01 — Antes/depois e efeito BAL**. READ_ONLY_DESCRIPTION. Ordem
  69.1; Sim antes da decisão. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Pessoa, datas, offset, versão,
  atribuição atual/proposta. Ajuda/exemplo: “BAL continuará com Ana” ou “exige
  decisão familiar”.. Erro: Revise antes/depois e efeito bal: Pessoa, datas,
  offset, versão, atribuição atual/proposta..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ESC-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `schedule/shift`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-014, OVL-034.

Critérios C9 relacionados: C-AC-001, C-AC-009, C-AC-013, C-AC-039, C-AC-051,
C-AC-057, C-AC-086, C-NEW-AC-011, C-NEW-AC-015, C-NEW-AC-021. A associação é
por domínio; cada caso preserva seu discriminante específico e não significa
que todos os critérios foram executados nesta tela. Fonte funcional:
[SCHEDULES_AND_STAFFING](../../C3-functional-specification/SCHEDULES_AND_STAFFING.md).
