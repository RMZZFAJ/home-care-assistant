# ENT-06 — Encaminhar exceção e sucessão

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Admin local/família competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Sucessão/exceção administrativa, novo painel. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo:
Redesignar tarefa futura ou encerrar exceção sem simular aceite físico.

## Composição e sequência

Painel de fatos conhecidos/desconhecidos; pessoa revogada e tarefas futuras;
motivo/prova e segunda conferência pertinente.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Histórico de Juliana permanece; Sheila não assina recebimento passado de
Juliana.

## Ações e efeito

Primária: **Registrar encaminhamento**. Secundárias: Revogar agora; Designar
tarefa futura; Ver origem.

Consequência: Encerramento administrativo não afirma aceite pessoal. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-032-01 — Justificativa de troca**. TEXTAREA. Ordem 32.1; Se mudar
  destinatário fora da sugestão ou depois da preparação. Máscara/autocomplete:
  Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: 3–1000; versão/instante preservados.
  Ajuda/exemplo: “Outro profissional receberá os materiais.”. Erro: Revise
  justificativa de troca: 3–1000; versão/instante preservados..

- **CTRL-042-01 — Motivo de exceção**. TEXTAREA. Ordem 42.1; Sim ao encerrar
  administrativamente. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação: Não
  admite caixa “recebi por outra pessoa”. Ajuda/exemplo: “Não foi possível
  obter a declaração pessoal.”. Erro: Revise motivo de exceção: Não admite
  caixa “recebi por outra pessoa”..

- **CTRL-C7-017 — Motivo e base da regularização**. TEXTAREA. Ordem C7.17;
  Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação
  material por default. Máscara/autocomplete: Conforme tipo; string decimal
  exata/data local com fuso; identificador opaco só leitura; off.
  Dependência/validação: Fato, motivo excepcional, autoridade, medidas,
  ressalvas e evidências. Ajuda/exemplo: Sem inventar declaração pessoal.
  Erro: Revise motivo e base da regularização. Fato, motivo excepcional,
  autoridade, medidas, ressalvas e evidências.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ENT-06` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `staff/staffDetails`; ausência de exemplo no HTML é declarada, sem
novo mockup equivalente. B1: Nova superfície C3, sem equivalente B1.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-028, C-AC-042, C-AC-043,
C-AC-044, C-AC-048, C-AC-050, C-AC-074, C-AC-077, C-AC-079, C-AC-089,
C-AC-096, C-AC-101, C-AC-103, C-AC-105, C-NEW-AC-006, C-NEW-AC-007,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-016, C-NEW-AC-022, C-NEW-AC-028,
C7-AC-002, C7-AC-010. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ENT](../../C3-functional-specification/ENT.md).
