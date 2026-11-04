# NOT-03 — Definir regras de avisos

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Admin competente por paciente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /configuracoes regras, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Política por tipo,
categoria e destinatário; resumo de consequência.

## Composição e sequência

Matriz por evento/categoria/destinatário; drawer com efeito e resumo antes de
salvar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Falhas técnicas só global/suporte; equipe recebe impacto/próxima ação.

## Ações e efeito

Primária: **Salvar regra exibida**. Secundárias: Comparar proposta; Voltar.

Consequência: Regra não atribui ato físico nem autoridade de outro papel.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-131-01 — Categoria**. RADIO_OR_SELECT. Ordem 131.1; Sim por evento.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Não elevar todo evento a essencial.
  Ajuda/exemplo: “Apoio: há uma conferência pendente.”. Erro: Revise
  categoria: Não elevar todo evento a essencial..

- **CTRL-132-01 — Tipo de obrigação**. SEARCHABLE_COMBOBOX. Ordem 132.1; Sim
  na regra. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação: Matriz
  de eventos e ações autorizadas. Ajuda/exemplo: Recebimento, decisão, prazo e
  informação têm consequências diferentes.. Erro: Revise tipo de obrigação:
  Matriz de eventos e ações autorizadas..

- **CTRL-133-01 — Destinatários**. SEARCHABLE_COMBOBOX. Ordem 133.1; Sim
  quando regra habilitada. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Revalidar vínculo/capacidade; sem autoridade por
  telefone/escala isolados. Ajuda/exemplo: “Pessoa que deve conferir esta
  entrega.”. Erro: Revise destinatários: Revalidar vínculo/capacidade; sem
  autoridade por telefone/escala isolados..

- **CTRL-134-01 — Canal interno**. RADIO_OR_SELECT. Ordem 134.1; Mantido para
  estado operacional. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Desligar push não
  elimina pendência interna. Ajuda/exemplo: “Consulte suas pendências no
  aplicativo.”. Erro: Revise canal interno: Desligar push não elimina
  pendência interna..

- **CTRL-139-01 — Prazo/escalonamento**. TEXT_INPUT. Ordem 139.1; P13 define
  limites/donos. Máscara/autocomplete: Sem máscara artificial; preservar texto
  e limite do contrato; off. Dependência/validação: Sem SLO inventado;
  considerar fuso e responsabilidade. Ajuda/exemplo: Aviso essencial não
  garante chegada no prazo.. Erro: Revise prazo/escalonamento: Sem SLO
  inventado; considerar fuso e responsabilidade..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-NOT-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `notify`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-025, SC-026, SC-033, OVL-007.

Critérios C9 relacionados: C-AC-001, C-AC-003, C-AC-014, C-AC-020, C-AC-023,
C-AC-049, C-AC-064, C-AC-073, C-AC-083, C-AC-084, C-AC-086, C-AC-087,
C-AC-088, C-AC-089, C-AC-090, C-AC-091, C-AC-092, C-AC-093, C-AC-094,
C-AC-095, C-AC-096, C-AC-097, C-AC-098, C-AC-099, C-AC-113, C-AC-115,
C-NEW-AC-001, C-NEW-AC-002, C-NEW-AC-003, C-NEW-AC-026, C7-AC-008, C7-AC-012.
A associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[PWA_PUSH_AND_NOTIFICATIONS](../../C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).
