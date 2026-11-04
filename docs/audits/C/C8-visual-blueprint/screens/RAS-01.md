# RAS-01 — Continuar edição privada

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Titular no paciente/tipo/intenção. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Retomada em cada formulário, novo contrato durável. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Continuar
ou descartar somente rascunho; comparar estado atual.

## Composição e sequência

Diálogo resumo tipo/paciente/itens e salvo no servidor; duas escolhas claras,
sem destrutiva default.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Um por criação/tipo; contextuais por alvo; REQ não aparece ao iniciar BAL.

## Ações e efeito

Primária: **Continuar rascunho**. Secundárias: Descartar e começar nova;
Voltar.

Consequência: Descarta só edição elegível; nenhuma emissão oficial por save.
Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-125-01 — Tipo do rascunho**. READ_ONLY_DESCRIPTION. Ordem 125.1; Sim,
  origem implícita visível em resumo. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Usuário/paciente/tipo/target; não
  mistura REQ e aprovação. Ajuda/exemplo: “Rascunho de nova ENT para
  Residência Exemplo.”. Erro: Revise tipo do rascunho:
  Usuário/paciente/tipo/target; não mistura REQ e aprovação..

- **CTRL-125-02 — Alvo e intenção**. READ_ONLY_DESCRIPTION. Ordem 125.2; Sim,
  origem implícita visível em resumo. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Usuário/paciente/tipo/target; não
  mistura REQ e aprovação. Ajuda/exemplo: “Rascunho de nova ENT para
  Residência Exemplo.”. Erro: Revise alvo e intenção:
  Usuário/paciente/tipo/target; não mistura REQ e aprovação..

- **CTRL-126-01 — Conteúdo da edição**. TEXTAREA. Ordem 126.1; Automático após
  confirmação de save. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  Validação parcial não emite fato; esquema versionado. Ajuda/exemplo: Campos
  vazios ficam vazios.. Erro: Revise conteúdo da edição: Validação parcial não
  emite fato; esquema versionado..

- **CTRL-126-02 — Etapa atual**. TEXTAREA. Ordem 126.2; Automático após
  confirmação de save. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  Validação parcial não emite fato; esquema versionado. Ajuda/exemplo: Campos
  vazios ficam vazios.. Erro: Revise etapa atual: Validação parcial não emite
  fato; esquema versionado..

- **CTRL-127-01 — Versão documental base**. READ_ONLY_DESCRIPTION. Ordem
  127.1; Sim quando ação depende de fato. Máscara/autocomplete:
  SEM_MASCARA;valor do servidor; off. Dependência/validação:
  Versões/assignment/contexto na retomada. Ajuda/exemplo: “A entrega mudou
  desde ontem. Revise antes de continuar.”. Erro: Revise versão documental
  base: Versões/assignment/contexto na retomada..

- **CTRL-127-02 — Revisão do ledger base**. READ_ONLY_DESCRIPTION. Ordem
  127.2; Sim quando ação depende de fato. Máscara/autocomplete:
  SEM_MASCARA;valor do servidor; off. Dependência/validação:
  Versões/assignment/contexto na retomada. Ajuda/exemplo: “A entrega mudou
  desde ontem. Revise antes de continuar.”. Erro: Revise revisão do ledger
  base: Versões/assignment/contexto na retomada..

- **CTRL-127-03 — Versão da política base**. READ_ONLY_DESCRIPTION. Ordem
  127.3; Sim quando ação depende de fato. Máscara/autocomplete:
  SEM_MASCARA;valor do servidor; off. Dependência/validação:
  Versões/assignment/contexto na retomada. Ajuda/exemplo: “A entrega mudou
  desde ontem. Revise antes de continuar.”. Erro: Revise versão da política
  base: Versões/assignment/contexto na retomada..

- **CTRL-128-01 — Salvo em**. READ_ONLY_DESCRIPTION. Ordem 128.1; Somente
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Não mostrar salvo se request falhou. Ajuda/exemplo:
  “Salvo no servidor às 09:10; disponível em outro aparelho.”. Erro: Revise
  salvo em: Não mostrar salvo se request falhou..

- **CTRL-128-02 — Revisão do rascunho**. READ_ONLY_DESCRIPTION. Ordem 128.2;
  Somente leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Não mostrar salvo se request falhou. Ajuda/exemplo:
  “Salvo no servidor às 09:10; disponível em outro aparelho.”. Erro: Revise
  revisão do rascunho: Não mostrar salvo se request falhou..

- **CTRL-129-01 — Escolha na retomada**. RADIO_OR_SELECT. Ordem 129.1; Sim,
  sem descarte preselecionado. Máscara/autocomplete: Opções finitas com rótulo
  humano; sem opção material preaceita; off. Dependência/validação: Descartar
  não elimina documento emitido ou ato confirmado. Ajuda/exemplo: Continuar
  rascunho ou Descartar e começar nova; um por usuário/paciente/tipo de
  criação e por alvo contextual P12.. Erro: Revise escolha na retomada:
  Descartar não elimina documento emitido ou ato confirmado..

- **CTRL-C7-020 — Confirmar descarte somente do rascunho**.
  EXPLICIT_DESTRUCTIVE_CONFIRMATION. Ordem C7.20; Conforme etapa; leitura de
  servidor ou escolha explícita; sem confirmação material por default.
  Máscara/autocomplete: Conforme tipo; string decimal exata/data local com
  fuso; identificador opaco só leitura; off. Dependência/validação: Escopo
  privado/tipo/alvo e versão; sem apagar documentos, ready ou preservação
  obrigatória. Ajuda/exemplo: Sem opção destrutiva default. Erro: Revise
  confirmar descarte somente do rascunho. Escopo privado/tipo/alvo e versão;
  sem apagar documentos, ready ou preservação obrigatória.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-RAS-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `req/draft`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-009, SC-010, SC-011, SC-012.

Critérios C9 relacionados: C-AC-017, C-AC-032, C-AC-052, C-AC-070, C-AC-080,
C-AC-107, C-AC-110, C-AC-116, C-NEW-AC-013, C-NEW-AC-014, C-NEW-AC-019,
C7-AC-004. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[ATTACHMENTS_AND_DRAFTS](../../C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).
