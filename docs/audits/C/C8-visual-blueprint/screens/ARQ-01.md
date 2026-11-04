# ARQ-01 — Anexar prova autorizada

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Autor/leitor com acesso ao alvo. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Painel de anexos em documento/movimento, atual a alterar.
Gatilho: navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo:
Selecionar, conferir, enviar e consultar tentativa/arquivo.

## Composição e sequência

Seção expansível com lista de anexos e estados; preview passivo seguro; upload
com finalidade e limite real.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Arquivo bloqueado em uncertain; teto do transporte coerente e ressalva
preservada.

## Ações e efeito

Primária: **Enviar arquivo**. Secundárias: Escolher arquivo; Consultar
tentativa; Voltar.

Consequência: Ready significa bytes aceitos, não prova humana do fato. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-120-01 — Arquivo**. FILE_PICKER. Ordem 120.1; Ao anexar, vazio.
  Máscara/autocomplete: MIME/bytes/limite do transporte; não extensão apenas;
  off. Dependência/validação: Bytes/MIME/signature/limite de transporte
  coerentes; não só extensão. Ajuda/exemplo: “Foto ou PDF do registro, sem
  senha.”. Erro: Revise arquivo: Bytes/MIME/signature/limite de transporte
  coerentes; não só extensão..

- **CTRL-121-01 — Descrição**. TEXTAREA. Ordem 121.1; Opcional, vazio.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Limite explícito de
  contrato em D; não incluir dado privado desnecessário. Ajuda/exemplo:
  “Conferência da parcela de 2 unidades.”. Erro: Revise descrição: Limite
  explícito de contrato em D; não incluir dado privado desnecessário..

- **CTRL-122-01 — Tentativa**. READ_ONLY_DESCRIPTION. Ordem 122.1; Sim no
  upload, ocultos. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Mesmo arquivo/conteúdo na mesma intenção.
  Ajuda/exemplo: Campo de arquivo bloqueado enquanto resultado for incerto..
  Erro: Revise tentativa: Mesmo arquivo/conteúdo na mesma intenção..

- **CTRL-123-01 — Estado da reserva**. READ_ONLY_DESCRIPTION. Ordem 123.1;
  Somente leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação:
  Reservado/enviando/processando/ready/rejeitado/abandonado/expirado.
  Ajuda/exemplo: Ready não equivale a validação humana da informação.. Erro:
  Revise estado da reserva:
  Reservado/enviando/processando/ready/rejeitado/abandonado/expirado..

- **CTRL-124-01 — Original**. READ_ONLY_DESCRIPTION. Ordem 124.1; Sim quando
  transformado. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Cadeia identifica perda/recusa e original restrito
  conforme classe. Ajuda/exemplo: “Derivado seguro; a ressalva foi preservada”
  só após comprovação.. Erro: Revise original: Cadeia identifica perda/recusa
  e original restrito conforme classe..

- **CTRL-124-02 — Derivado**. READ_ONLY_DESCRIPTION. Ordem 124.2; Sim quando
  transformado. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Cadeia identifica perda/recusa e original restrito
  conforme classe. Ajuda/exemplo: “Derivado seguro; a ressalva foi preservada”
  só após comprovação.. Erro: Revise derivado: Cadeia identifica perda/recusa
  e original restrito conforme classe..

- **CTRL-124-03 — Transformação aplicada**. READ_ONLY_DESCRIPTION. Ordem
  124.3; Sim quando transformado. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Cadeia identifica perda/recusa e
  original restrito conforme classe. Ajuda/exemplo: “Derivado seguro; a
  ressalva foi preservada” só após comprovação.. Erro: Revise transformação
  aplicada: Cadeia identifica perda/recusa e original restrito conforme
  classe..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ARQ-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: OVL-017.

Critérios C9 relacionados: C-AC-017, C-AC-032, C-AC-052, C-AC-070, C-AC-080,
C-AC-107, C-AC-110, C-AC-116, C-NEW-AC-013, C-NEW-AC-014, C-NEW-AC-019,
C7-AC-004. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[ATTACHMENTS_AND_DRAFTS](../../C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).
