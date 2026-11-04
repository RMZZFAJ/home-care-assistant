# CAT-01 — Gerir catálogo local

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Gestor catalog.manage do paciente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /admin seção catálogo, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Buscar, cadastrar,
editar, inativar/reativar, adotar modelo explicitamente.

## Composição e sequência

Busca/lista à esquerda; drawer de material com unidade/aliases/estado; saldo
preservado explicado ao inativar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não juntar saldos de duplicata nem exigir zerar antes de inativar.

## Ações e efeito

Primária: **Salvar material**. Secundárias: Inativar; Reativar; Adotar modelo;
Ver apresentações.

Consequência: Identidade histórica preservada; flag não move saldo. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-081-01 — Nome**. TEXT_INPUT. Ordem 81.1; Sim, vazio.
  Máscara/autocomplete: Sem máscara artificial; preservar texto e limite do
  contrato; off. Dependência/validação: 2–160 caracteres, texto longo deve
  caber em tela/PDF. Ajuda/exemplo: “Compressa Exemplo.”. Erro: Revise nome:
  2–160 caracteres, texto longo deve caber em tela/PDF..

- **CTRL-082-01 — Categoria**. SEARCHABLE_COMBOBOX. Ordem 82.1; Sim.
  Máscara/autocomplete: Busca por nome/alias autorizado; seleção por ID;
  nenhum ID digitado como autorização; off. Dependência/validação:
  Medicamentos/higiene/dieta atuais; sem categoria inferida pelo nome.
  Ajuda/exemplo: Seleção pronta com rótulo humano.. Erro: Revise categoria:
  Medicamentos/higiene/dieta atuais; sem categoria inferida pelo nome..

- **CTRL-083-01 — Unidade base**. SEARCHABLE_COMBOBOX. Ordem 83.1; Sim antes
  de movimentar. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Não reinterpretar produto com história.
  Ajuda/exemplo: “unidade”, com casas 0 ou precisão permitida.. Erro: Revise
  unidade base: Não reinterpretar produto com história..

- **CTRL-085-01 — Aliases**. TEXTAREA. Ordem 85.1; Não, vazia.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Até 30 nomes, 1–160
  caracteres, sem duplicata vazia. Ajuda/exemplo: “Nome usado na residência.”.
  Erro: Revise aliases: Até 30 nomes, 1–160 caracteres, sem duplicata vazia..

- **CTRL-086-01 — Descrição**. TEXTAREA. Ordem 86.1; Não.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Até 2000; ordem
  0–1000000 herdada. Ajuda/exemplo: Não muda unidade/custódia.. Erro: Revise
  descrição: Até 2000; ordem 0–1000000 herdada..

- **CTRL-086-02 — Ordem**. TEXTAREA. Ordem 86.2; Não. Máscara/autocomplete:
  Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: Até 2000; ordem 0–1000000 herdada.
  Ajuda/exemplo: Não muda unidade/custódia.. Erro: Revise ordem: Até 2000;
  ordem 0–1000000 herdada..

- **CTRL-087-01 — Ativo**. CHECKBOX_OR_SWITCH. Ordem 87.1; Escolha explícita.
  Máscara/autocomplete: Sem máscara; rótulo descreve efeito; vazio não
  equivale a concordância; off. Dependência/validação: Saldo positivo
  permitido sob inativação. Ajuda/exemplo: “Inativo: saldo e histórico serão
  mantidos.”. Erro: Revise ativo: Saldo positivo permitido sob inativação..

- **CTRL-088-01 — Destino do saldo da equipe**. SEARCHABLE_COMBOBOX. Ordem
  88.1; Ao inativar com saldo. Máscara/autocomplete: Busca por nome/alias
  autorizado; seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Não executar transferência sem contraparte/aceite.
  Ajuda/exemplo: “Manter 4 unidades inativas na equipe.”. Erro: Revise destino
  do saldo da equipe: Não executar transferência sem contraparte/aceite..

- **CTRL-094-01 — Justificativa de alias/inativação**. TEXTAREA. Ordem 94.1;
  Ao resolver duplicata/alteração relevante. Máscara/autocomplete: Sem
  máscara; contador e limite do contrato visíveis; quebra de linha/reflow;
  off. Dependência/validação: Proposta 3–1000 com evento e autoria.
  Ajuda/exemplo: Não somar saldos silenciosamente.. Erro: Revise justificativa
  de alias/inativação: Proposta 3–1000 com evento e autoria..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CAT-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `stock`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-024, OVL-002, OVL-032.

Critérios C9 relacionados: C-AC-026, C-AC-028, C-AC-029, C-AC-044, C-AC-045,
C-AC-067, C-AC-081, C-NEW-AC-008, C-NEW-AC-022, C-NEW-AC-024, C-NEW-AC-025. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[CATALOGUE_AND_PRESENTATIONS](../../C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).
