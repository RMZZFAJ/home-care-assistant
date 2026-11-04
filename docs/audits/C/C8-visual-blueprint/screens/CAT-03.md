# CAT-03 — Gerir apresentações

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Gestor de catálogo. Banco/API revalidam capacidade, alvo e
versão; menu/ID/escala não concedem autorização.

Rota/superfície: Apresentações no material, novo percurso de consulta.
Gatilho: navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo:
Listar/criar/editar equivalências e códigos, com histórico de fator usado.

## Composição e sequência

Lista por material de código/nome/fator/estado; drawer de edição e
equivalência em linguagem humana.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Código é texto com zeros; NaN/Infinity recusados também na RPC.

## Ações e efeito

Primária: **Salvar apresentação**. Secundárias: Nova apresentação; Voltar; Ver
uso.

Consequência: Fator novo não muda snapshot passado. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-089-01 — Nome da apresentação**. TEXT_INPUT. Ordem 89.1; Sim ao
  cadastrar, vazio. Máscara/autocomplete: Sem máscara artificial; preservar
  texto e limite do contrato; off. Dependência/validação: 2–160 quando usado;
  referência à base. Ajuda/exemplo: “Pacote com 10 unidades.”. Erro: Revise
  nome da apresentação: 2–160 quando usado; referência à base..

- **CTRL-090-01 — Código de barras**. SEARCHABLE_COMBOBOX. Ordem 90.1;
  Opcional se seleção manual; obrigatório ao associar scan.
  Máscara/autocomplete: Busca por nome/alias autorizado; seleção por ID;
  nenhum ID digitado como autorização; off. Dependência/validação: Preservar
  zeros; formato/check digit aplicável; unicidade conforme catálogo.
  Ajuda/exemplo: Não tratar código desconhecido como produto autorizado..
  Erro: Revise código de barras: Preservar zeros; formato/check digit
  aplicável; unicidade conforme catálogo..

- **CTRL-091-01 — Fator base**. DECIMAL_TEXT_INPUT. Ordem 91.1; Sim.
  Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão antes da
  coerção; zero só onde permitido; off. Dependência/validação: Finito,
  positivo, até 6 casas e equivalência válida; NaN/Infinity recusados também
  RPC. Ajuda/exemplo: “1 pacote = 10 unidades.”. Erro: Revise fator base:
  Finito, positivo, até 6 casas e equivalência válida; NaN/Infinity recusados
  também RPC..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CAT-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-024, SC-035, OVL-002, OVL-016.

Critérios C9 relacionados: C-AC-026, C-AC-028, C-AC-029, C-AC-044, C-AC-045,
C-AC-067, C-AC-081, C-NEW-AC-008, C-NEW-AC-022, C-NEW-AC-024, C-NEW-AC-025. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[CATALOGUE_AND_PRESENTATIONS](../../C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).
