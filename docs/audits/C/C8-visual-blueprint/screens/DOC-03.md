# DOC-03 — Baixar ou emitir exemplar

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Solicitante autorizado. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: PDF privado, atual a corrigir. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Gerar/recuperar bytes
corretos, imprimir/compartilhar conforme acesso.

## Composição e sequência

Seletor de emissão existente e ação separada de emitir novo;
versão/solicitante/instante/assinante sistema visíveis.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Compor/QR antes de assinar; hash final no registro externo; não IP/GPS no PDF.

## Ações e efeito

Primária: **Baixar este exemplar**. Secundárias: Emitir novo exemplar;
Verificar arquivo; Imprimir.

Consequência: Novo pedido emite ID/assinatura; download mantém bytes. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
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

- **CTRL-145-01 — Data do fato**. READ_ONLY_DESCRIPTION. Ordem 145.1;
  Conhecidos; desconhecido explícito. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Fuso/offset e rótulos próprios.
  Ajuda/exemplo: Criação de draft em D1 não é emissão em D2.. Erro: Revise
  data do fato: Fuso/offset e rótulos próprios..

- **CTRL-145-02 — Data do registro**. READ_ONLY_DESCRIPTION. Ordem 145.2;
  Conhecidos; desconhecido explícito. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Fuso/offset e rótulos próprios.
  Ajuda/exemplo: Criação de draft em D1 não é emissão em D2.. Erro: Revise
  data do registro: Fuso/offset e rótulos próprios..

- **CTRL-145-03 — Data da emissão**. READ_ONLY_DESCRIPTION. Ordem 145.3;
  Conhecidos; desconhecido explícito. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Fuso/offset e rótulos próprios.
  Ajuda/exemplo: Criação de draft em D1 não é emissão em D2.. Erro: Revise
  data da emissão: Fuso/offset e rótulos próprios..

- **CTRL-146-01 — Autor do fato**. READ_ONLY_DESCRIPTION. Ordem 146.1;
  Conforme fato, leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Nome histórico e identidade; atual rotulado
  separadamente. Ajuda/exemplo: Revogação/rename não muda autoria antiga..
  Erro: Revise autor do fato: Nome histórico e identidade; atual rotulado
  separadamente..

- **CTRL-146-02 — Revisor**. READ_ONLY_DESCRIPTION. Ordem 146.2; Conforme
  fato, leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Nome histórico e identidade; atual rotulado
  separadamente. Ajuda/exemplo: Revogação/rename não muda autoria antiga..
  Erro: Revise revisor: Nome histórico e identidade; atual rotulado
  separadamente..

- **CTRL-146-03 — Recebedor**. READ_ONLY_DESCRIPTION. Ordem 146.3; Conforme
  fato, leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Nome histórico e identidade; atual rotulado
  separadamente. Ajuda/exemplo: Revogação/rename não muda autoria antiga..
  Erro: Revise recebedor: Nome histórico e identidade; atual rotulado
  separadamente..

- **CTRL-147-01 — Estado da linha**. READ_ONLY_DESCRIPTION. Ordem 147.1; Sim
  quando aplicável. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Terminal não cai em “pendente” por fallback.
  Ajuda/exemplo: Cancelada não orienta receber.. Erro: Revise estado da linha:
  Terminal não cai em “pendente” por fallback..

- **CTRL-147-02 — Estado do documento**. READ_ONLY_DESCRIPTION. Ordem 147.2;
  Sim quando aplicável. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Terminal não cai em “pendente” por fallback.
  Ajuda/exemplo: Cancelada não orienta receber.. Erro: Revise estado do
  documento: Terminal não cai em “pendente” por fallback..

- **CTRL-148-01 — Motivo**. TEXTAREA. Ordem 148.1; Quando conhecido.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Não reconstruir por
  cadastro atual. Ajuda/exemplo: Desconhecido não é preenchido com texto
  inventado.. Erro: Revise motivo: Não reconstruir por cadastro atual..

- **CTRL-148-02 — Ressalva**. TEXTAREA. Ordem 148.2; Quando conhecido.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Não reconstruir por
  cadastro atual. Ajuda/exemplo: Desconhecido não é preenchido com texto
  inventado.. Erro: Revise ressalva: Não reconstruir por cadastro atual..

- **CTRL-148-03 — Antes e depois**. TEXTAREA. Ordem 148.3; Quando conhecido.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Não reconstruir por
  cadastro atual. Ajuda/exemplo: Desconhecido não é preenchido com texto
  inventado.. Erro: Revise antes e depois: Não reconstruir por cadastro
  atual..

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

- **CTRL-C7-006 — Exemplar a baixar**. RADIO_OR_SELECT. Ordem C7.6; Conforme
  etapa; leitura de servidor ou escolha explícita; sem confirmação material
  por default. Máscara/autocomplete: Conforme tipo; string decimal exata/data
  local com fuso; identificador opaco só leitura; off. Dependência/validação:
  Selecionar emissão existente; bytes idênticos no novo download.
  Ajuda/exemplo: Não selecionar nova emissão silenciosamente. Erro: Revise
  exemplar a baixar. Selecionar emissão existente; bytes idênticos no novo
  download.

- **CTRL-C7-007 — Solicitante e instante da emissão**. READ_ONLY_DESCRIPTION.
  Ordem C7.7; Conforme etapa; leitura de servidor ou escolha explícita; sem
  confirmação material por default. Máscara/autocomplete: Conforme tipo;
  string decimal exata/data local com fuso; identificador opaco só leitura;
  off. Dependência/validação: Pessoa autorizada solicitante e timestamp/fuso
  persistidos. Ajuda/exemplo: Sistema é signatário técnico, não a pessoa
  solicitante. Erro: Revise solicitante e instante da emissão. Pessoa
  autorizada solicitante e timestamp/fuso persistidos.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-DOC-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `docs/pdfInfo`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-045, SC-046, SC-047, SC-048, SC-051, DEMO-1,
DEMO-2, DEMO-3, DEMO-4, DEMO-5, DEMO-6.

Critérios C9 relacionados: C-AC-013, C-AC-015, C-AC-023, C-AC-034, C-AC-036,
C-AC-046, C-AC-063, C-AC-071, C-AC-100, C-AC-101, C-AC-102, C-AC-103,
C-AC-104, C-AC-105, C-AC-106, C-AC-107, C-AC-108, C-AC-109, C-AC-110,
C-AC-111, C-AC-119, C-NEW-AC-017, C-NEW-AC-018, C-NEW-AC-019, C-NEW-AC-020,
C-NEW-AC-023, C7-AC-002, C7-AC-011. A associação é por domínio; cada caso
preserva seu discriminante específico e não significa que todos os critérios
foram executados nesta tela. Fonte funcional:
[DOCUMENTS_PDFS_AND_INTEGRITY](../../C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).
