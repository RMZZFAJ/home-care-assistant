# REQ-03 — Consultar requisição

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Leitores autorizados e família elegível. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /historico/:id, atual a alterar. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Ver linhas, atendimento,
ciência, acesso, anexos e versões; declarar necessidade remanescente.

## Composição e sequência

Identidade/estado; itens e atendimento por linha; ciência separada; cronologia
e anexos em seções expansíveis.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não somar ciência ao atendimento; acesso efetivo tem registro próprio
planejado.

## Ações e efeito

Primária: **Ver próxima ação autorizada**. Secundárias: Nova necessidade
remanescente; Histórico de emissões.

Consequência: Nova necessidade conserva vínculo e motivo; consulta não recebe
material. Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão
material. Retorno/Voltar preserva edição e contexto; próximo destino é
resultado do ato ou tarefa pertinente, nunca novo envio automático. Em
resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-001-01 — Paciente**. READ_ONLY_DESCRIPTION. Ordem 1.1; Sim, contexto
  selecionado. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Revalidar vínculo na emissão. Ajuda/exemplo: “Você
  está solicitando para Residência Exemplo.”. Erro: Revise paciente: Revalidar
  vínculo na emissão..

- **CTRL-011-01 — Motivo de necessidade remanescente**. TEXT_INPUT. Ordem
  11.1; Sim ao abrir nova necessidade vinculada. Máscara/autocomplete: Sem
  máscara artificial; preservar texto e limite do contrato; off.
  Dependência/validação: 3–1000; sem quantidade solicitada. Ajuda/exemplo: “O
  material entregue não encerrou a necessidade.”. Erro: Revise motivo de
  necessidade remanescente: 3–1000; sem quantidade solicitada..

- **CTRL-013-01 — Versão e intenção**. READ_ONLY_DESCRIPTION. Ordem 13.1; Sim
  na ação. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Conflito se conteúdo diverge ou versão muda.
  Ajuda/exemplo: Não pedir UUID ao usuário.. Erro: Revise versão e intenção:
  Conflito se conteúdo diverge ou versão muda..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-REQ-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `docs`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-039, SC-040, OVL-019, OVL-032.

Critérios C9 relacionados: C-AC-025, C-AC-026, C-AC-036, C-AC-041, C-AC-049,
C-AC-073, C-AC-089, C-AC-105, C-NEW-AC-003, C-NEW-AC-004, C-NEW-AC-024,
C-NEW-AC-028, C7-AC-012. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[REQ](../../C3-functional-specification/REQ.md).
