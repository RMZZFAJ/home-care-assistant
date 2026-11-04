# DOC-04 — Consultar referência mínima

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Público com identificador opaco. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /verificar/:id, atual a ampliar. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Consultar registro mínimo e
comparar exemplar selecionado com bytes finais.

## Composição e sequência

Página só referência/integridade e limites; escolha de exemplar leva à
comparação; detalhe privado requer login.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não publicar nome/paciente/produto/IP nem enumerar por protocolo.

## Ações e efeito

Primária: **Comparar meu arquivo**. Secundárias: Entender resultado; Entrar
para detalhe autorizado.

Consequência: QR localiza registro, não prova bytes do arquivo apresentado.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-143-01 — Documento**. READ_ONLY_DESCRIPTION. Ordem 143.1; Sim,
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  documento: Série por paciente/tipo, UUID e versão..

- **CTRL-143-02 — Tipo**. READ_ONLY_DESCRIPTION. Ordem 143.2; Sim, leitura.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  tipo: Série por paciente/tipo, UUID e versão..

- **CTRL-143-03 — Protocolo**. READ_ONLY_DESCRIPTION. Ordem 143.3; Sim,
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  protocolo: Série por paciente/tipo, UUID e versão..

- **CTRL-144-01 — Versão da ficha**. READ_ONLY_DESCRIPTION. Ordem 144.1; Sim
  em cada download. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Não substituir versão ausente pela atual.
  Ajuda/exemplo: “Versão 3, representação PDF rX.”. Erro: Revise versão da
  ficha: Não substituir versão ausente pela atual..

- **CTRL-144-02 — Revisão do renderizador**. READ_ONLY_DESCRIPTION. Ordem
  144.2; Sim em cada download. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Não substituir versão ausente pela
  atual. Ajuda/exemplo: “Versão 3, representação PDF rX.”. Erro: Revise
  revisão do renderizador: Não substituir versão ausente pela atual..

- **CTRL-150-01 — Hash canônico**. READ_ONLY_DESCRIPTION. Ordem 150.1;
  Leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Identifica conteúdo lógico, não bytes PDF.
  Ajuda/exemplo: Não usar esse hash como digest do arquivo.. Erro: Revise hash
  canônico: Identifica conteúdo lógico, não bytes PDF..

- **CTRL-151-01 — Hash dos bytes finais**. READ_ONLY_DESCRIPTION. Ordem 151.1;
  Sim para PDF emitido. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: SHA-256 após todos os bytes finais; comparar no
  cache/download. Ajuda/exemplo: QR sozinho não verifica o exemplar.. Erro:
  Revise hash dos bytes finais: SHA-256 após todos os bytes finais; comparar
  no cache/download..

- **CTRL-C7-005 — Identificador da emissão**. READ_ONLY_DESCRIPTION. Ordem
  C7.5; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: ID opaco do exemplar emitido; distinto da versão
  da ficha. Ajuda/exemplo: Emissão nº2 da versão3. Erro: Revise identificador
  da emissão. ID opaco do exemplar emitido; distinto da versão da ficha.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-DOC-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `docs/verifyPdf`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-005.

Critérios C9 relacionados: C-AC-013, C-AC-015, C-AC-023, C-AC-034, C-AC-036,
C-AC-046, C-AC-063, C-AC-071, C-AC-100, C-AC-101, C-AC-102, C-AC-103,
C-AC-104, C-AC-105, C-AC-106, C-AC-107, C-AC-108, C-AC-109, C-AC-110,
C-AC-111, C-AC-119, C-NEW-AC-017, C-NEW-AC-018, C-NEW-AC-019, C-NEW-AC-020,
C-NEW-AC-023, C7-AC-002, C7-AC-011. A associação é por domínio; cada caso
preserva seu discriminante específico e não significa que todos os critérios
foram executados nesta tela. Fonte funcional:
[DOCUMENTS_PDFS_AND_INTEGRITY](../../C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).
