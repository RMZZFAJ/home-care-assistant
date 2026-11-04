# ESC-01 — Consultar escala

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Profissional próprio ou gestor de equipe. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /escalas calendário/lista, atual a alterar. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Dia/semana/mês
com intervalo coerente; selecionar múltiplos dias além de 30 dias.

## Composição e sequência

Mês/semana/dia com intervalo real e lista acessível; dia selecionado abre
detalhes; tablet conserva ambos quando cabe.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Mês móvel mostra mês ou seletor muda explicitamente; sem reduzir
silenciosamente a dia.

## Ações e efeito

Primária: **Programar plantões**. Secundárias: Hoje; Período anterior/próximo;
Alternar lista.

Consequência: Consulta não comprova presença. Mostrar
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

- **CTRL-062-01 — Dias selecionados**. TEXT_INPUT. Ordem 62.1; Se avulsa
  múltipla. Máscara/autocomplete: Sem máscara artificial; preservar texto e
  limite do contrato; off. Dependência/validação: Datas únicas; navegação
  entre meses preserva seleção. Ajuda/exemplo: Mostrar “12 dias selecionados
  em dois meses”.. Erro: Revise dias selecionados: Datas únicas; navegação
  entre meses preserva seleção..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ESC-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `schedule`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-014.

Critérios C9 relacionados: C-AC-001, C-AC-009, C-AC-013, C-AC-039, C-AC-051,
C-AC-057, C-AC-086, C-NEW-AC-011, C-NEW-AC-015, C-NEW-AC-021. A associação é
por domínio; cada caso preserva seu discriminante específico e não significa
que todos os critérios foram executados nesta tela. Fonte funcional:
[SCHEDULES_AND_STAFFING](../../C3-functional-specification/SCHEDULES_AND_STAFFING.md).
