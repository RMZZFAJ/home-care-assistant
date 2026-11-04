# ADM-03 — Comparar configuração atual e proposta

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Admin competente. Banco/API revalidam capacidade, alvo e
versão; menu/ID/escala não concedem autorização.

Rota/superfície: /configuracoes, atual a alterar. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Regras de acesso, ciência/BAL
e notificações; comparar proposta com política vigente.

## Composição e sequência

Regras agrupadas por finalidade; valores atuais legíveis e proposta em
revisão; help contextual.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

P02 não decidido não ganha default tácito; P11 opcional é direção do primeiro
uso.

## Ações e efeito

Primária: **Revisar alteração de regra**. Secundárias: Voltar; Ver política
vigente.

Consequência: Proposta pendente não muda regra atual. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-153-01 — Paciente**. READ_ONLY_DESCRIPTION. Ordem 153.1; Sim.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Global e local explícitos. Ajuda/exemplo: Nenhuma
  seleção no browser concede acesso.. Erro: Revise paciente: Global e local
  explícitos..

- **CTRL-153-02 — Modo de atuação**. READ_ONLY_DESCRIPTION. Ordem 153.2; Sim.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Global e local explícitos. Ajuda/exemplo: Nenhuma
  seleção no browser concede acesso.. Erro: Revise modo de atuação: Global e
  local explícitos..

- **CTRL-156-01 — Seção**. RADIO_OR_SELECT. Ordem 156.1; Não, estado de
  consulta explícito. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Termo/cursor por
  paciente e seção. Ajuda/exemplo: Rótulo “Catálogo do paciente” difere de
  “Unidades”.. Erro: Revise seção: Termo/cursor por paciente e seção..

- **CTRL-156-02 — Buscar**. RADIO_OR_SELECT. Ordem 156.2; Não, estado de
  consulta explícito. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Termo/cursor por
  paciente e seção. Ajuda/exemplo: Rótulo “Catálogo do paciente” difere de
  “Unidades”.. Erro: Revise buscar: Termo/cursor por paciente e seção..

- **CTRL-161-01 — Motivo da alteração/decisão**. TEXTAREA. Ordem 161.1; Quando
  ação crítica. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  3–1000 onde contrato herdado. Ajuda/exemplo: “Por que esta permissão precisa
  mudar?”. Erro: Revise motivo da alteração/decisão: 3–1000 onde contrato
  herdado..

- **CTRL-163-01 — Prazo de acompanhamento**. TEXT_INPUT. Ordem 163.1; Conforme
  configuração. Máscara/autocomplete: Sem máscara artificial; preservar texto
  e limite do contrato; off. Dependência/validação: Valor configurado governa
  só acompanhamento, não desfaz persistência. Ajuda/exemplo: PDF lento não
  cancela consulta de avisos.. Erro: Revise prazo de acompanhamento: Valor
  configurado governa só acompanhamento, não desfaz persistência..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ADM-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `notify`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-031, SC-032, SC-034, OVL-008, OVL-010.

Critérios C9 relacionados: C-AC-005, C-AC-011, C-AC-013, C-AC-014, C-AC-016,
C-AC-018, C-AC-019, C-AC-020, C-AC-024, C-AC-026, C-AC-033, C-AC-037,
C-AC-038, C-AC-059, C-AC-060, C-AC-061, C-AC-071, C-AC-075, C-AC-078,
C-AC-079, C-AC-085, C-AC-095, C-AC-099, C-AC-121, C-NEW-AC-015, C-NEW-AC-016,
C7-AC-005, C7-AC-006. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ADMINISTRATIVE_OPERATIONS](../../C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
