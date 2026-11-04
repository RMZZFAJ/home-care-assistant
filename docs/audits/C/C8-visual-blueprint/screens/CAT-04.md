# CAT-04 — Tratar possível duplicata

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Gestor local competente. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Duplicatas, novo diálogo contextual. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Comparar identidades,
escolher nome/alias e encaminhar inativação sem fundir ledger.

## Composição e sequência

Diálogo com duas identidades, unidades/saldos/história; proposta
alias/sucessor sem fusão.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Unidades incompatíveis impedem equivalência por palpite.

## Ações e efeito

Primária: **Confirmar orientação de seleção**. Secundárias: Voltar; Consultar
identidades.

Consequência: Nenhum ledger/ID/PDF é fundido. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-093-01 — Comparação de duplicatas**. READ_ONLY_DESCRIPTION. Ordem
  93.1; Sim para decisão O20. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Saldos, unidade, movimentos e vínculos
  separados. Ajuda/exemplo: “Manter ID A para novas seleções; ID B conserva
  história.”. Erro: Revise comparação de duplicatas: Saldos, unidade,
  movimentos e vínculos separados..

- **CTRL-094-01 — Justificativa de alias/inativação**. TEXTAREA. Ordem 94.1;
  Ao resolver duplicata/alteração relevante. Máscara/autocomplete: Sem
  máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: Proposta 3–1000 com evento e autoria.
  Ajuda/exemplo: Não somar saldos silenciosamente.. Erro: Revise justificativa
  de alias/inativação: Proposta 3–1000 com evento e autoria..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CAT-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-024, OVL-002.

Critérios C9 relacionados: C-AC-026, C-AC-028, C-AC-029, C-AC-044, C-AC-045,
C-AC-067, C-AC-081, C-NEW-AC-008, C-NEW-AC-022, C-NEW-AC-024, C-NEW-AC-025. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[CATALOGUE_AND_PRESENTATIONS](../../C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).
