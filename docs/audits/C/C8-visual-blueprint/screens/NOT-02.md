# NOT-02 — Preferências e aparelhos

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Titular. Banco/API revalidam capacidade, alvo e versão;
menu/ID/escala não concedem autorização.

Rota/superfície: /perfil seção notificações, nova extensão. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Instalar,
ativar/desativar push neste aparelho, listar inscrições próprias e testar sob
autorização futura.

## Composição e sequência

Aparelhos próprios, permissão atual e opt-in; seção separada da política de
ciência.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Tipos P02 ainda não aprovados ficam informativos/indisponíveis com explicação.

## Ações e efeito

Primária: **Ativar avisos neste aparelho**. Secundárias: Desativar neste
aparelho; Abrir preferências de ciência.

Consequência: Permissão do navegador é transporte, não ato material. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-135-01 — Ativar push neste aparelho**. CHECKBOX_OR_SWITCH. Ordem
  135.1; Não, sem permissão presumida. Máscara/autocomplete: Sem máscara;
  rótulo descreve efeito; vazio não equivale a concordância; off.
  Dependência/validação: Após gesto do usuário, HTTPS e capacidade detectada.
  Ajuda/exemplo: “Avisos podem aparecer na tela bloqueada.”. Erro: Revise
  ativar push neste aparelho: Após gesto do usuário, HTTPS e capacidade
  detectada..

- **CTRL-136-01 — Nome do aparelho**. TEXT_INPUT. Ordem 136.1; Não, descrição
  segura. Máscara/autocomplete: Sem máscara artificial; preservar texto e
  limite do contrato; off. Dependência/validação: Proposta 1–80; não provar
  identidade pelo user-agent. Ajuda/exemplo: “Meu celular de trabalho.”. Erro:
  Revise nome do aparelho: Proposta 1–80; não provar identidade pelo
  user-agent..

- **CTRL-137-01 — Inscrição e permissão**. READ_ONLY_DESCRIPTION. Ordem 137.1;
  Somente técnico; privado. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Escopo usuário/dispositivo; validar
  origem e destino; sem log de endpoint. Ajuda/exemplo:
  Permitida/negada/indisponível/expirada são estados diferentes.. Erro: Revise
  inscrição e permissão: Escopo usuário/dispositivo; validar origem e destino;
  sem log de endpoint..

- **CTRL-138-01 — Conteúdo na tela bloqueada**. RADIO_OR_SELECT. Ordem 138.1;
  Default proposto genérico. Máscara/autocomplete: Opções finitas com rótulo
  humano; sem opção material preaceita; off. Dependência/validação: Sem nome
  do paciente/material/quantidade no push inicial. Ajuda/exemplo: “Há uma
  atualização no Home Care Assistant.”. Erro: Revise conteúdo na tela
  bloqueada: Sem nome do paciente/material/quantidade no push inicial..

- **CTRL-140-01 — Modalidade de ciência**. RADIO_OR_SELECT. Ordem 140.1;
  Conforme P02. Máscara/autocomplete: Opções finitas com rótulo humano; sem
  opção material preaceita; off. Dependência/validação: Snapshot da escolha na
  emissão; nunca derivar de push. Ajuda/exemplo: Tocar aviso só abre destino
  autenticado.. Erro: Revise modalidade de ciência: Snapshot da escolha na
  emissão; nunca derivar de push..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-NOT-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `notify/science`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-036, OVL-026.

Critérios C9 relacionados: C-AC-001, C-AC-003, C-AC-014, C-AC-020, C-AC-023,
C-AC-049, C-AC-064, C-AC-073, C-AC-083, C-AC-084, C-AC-086, C-AC-087,
C-AC-088, C-AC-089, C-AC-090, C-AC-091, C-AC-092, C-AC-093, C-AC-094,
C-AC-095, C-AC-096, C-AC-097, C-AC-098, C-AC-099, C-AC-113, C-AC-115,
C-NEW-AC-001, C-NEW-AC-002, C-NEW-AC-003, C-NEW-AC-026, C7-AC-008, C7-AC-012.
A associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[PWA_PUSH_AND_NOTIFICATIONS](../../C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).
