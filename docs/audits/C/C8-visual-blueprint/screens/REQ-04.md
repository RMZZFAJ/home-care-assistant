# REQ-04 — Declarar ciência

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Pessoa elegível na policy. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Diálogo de ciência, novo contrato. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Modalidade
manual/condicionada; continuar/cancelar com consequência explícita.

## Composição e sequência

Diálogo com tipo/versão e consequência; conteúdo acessível após escolha quando
modalidade assim aprovada.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

P02 bloqueia política nova; não dizer Li integralmente nem marcar
automaticamente checkbox.

## Ações e efeito

Primária: **Confirmar ciência**. Secundárias: Cancelar; Abrir política de
ciência.

Consequência: Registrar só modalidade/tipo aprovados; cancelar zero efeito.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-012-01 — Modalidade de ciência**. RADIO_OR_SELECT. Ordem 12.1;
  Conforme P02, sem opt-in tácito implícito. Máscara/autocomplete: Opções
  finitas com rótulo humano; sem opção material preaceita; off.
  Dependência/validação: Snapshot da regra vigente na emissão. Ajuda/exemplo:
  “Manual”, “Ao continuar antes de abrir”, “Presumida na emissão”.. Erro:
  Revise modalidade de ciência: Snapshot da regra vigente na emissão..

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
futura: `SHOT-REQ-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `notify/science`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-039, OVL-029.

Critérios C9 relacionados: C-AC-025, C-AC-026, C-AC-036, C-AC-041, C-AC-049,
C-AC-073, C-AC-089, C-AC-105, C-NEW-AC-003, C-NEW-AC-004, C-NEW-AC-024,
C-NEW-AC-028, C7-AC-012. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[REQ](../../C3-functional-specification/REQ.md).
