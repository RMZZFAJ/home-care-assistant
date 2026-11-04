# ENT-04 — Informar divergência

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Recebedor designado. Banco/API revalidam capacidade, alvo
e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Diálogo de divergência, atual a alterar. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Quantidade
efetivamente recebida e ressalvas por linha; resumo antes da confirmação.

## Composição e sequência

Diálogo por item com expedido somente leitura, aceito vazio e motivo/ressalva;
resumo de todas as linhas.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Zero aceita nada; não apresentar divergência como consumo; foco no primeiro
campo inválido.

## Ações e efeito

Primária: **Registrar meu recebimento com ressalva**. Secundárias: Voltar e
conferir.

Consequência: Aceito positivo credita, restante continua em
trânsito/divergência. Mostrar objeto/quantidade/pessoa/versão antes de
qualquer decisão material. Retorno/Voltar preserva edição e contexto; próximo
destino é resultado do ato ou tarefa pertinente, nunca novo envio automático.
Em resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-035-01 — Linhas com divergência**. SEARCHABLE_COMBOBOX. Ordem 35.1;
  Não, lista vazia significa aceite integral após confirmação.
  Máscara/autocomplete: Busca por nome/alias autorizado; seleção por ID;
  nenhum ID digitado como autorização; off. Dependência/validação: Revisão
  mostra também linhas não selecionadas. Ajuda/exemplo: Não ocultar que as
  demais serão aceitas.. Erro: Revise linhas com divergência: Revisão mostra
  também linhas não selecionadas..

- **CTRL-036-01 — Quantidade aceita**. DECIMAL_TEXT_INPUT. Ordem 36.1; Sim
  nessas linhas, sem aceite implícito. Máscara/autocomplete: Vírgula/ponto;
  inputmode decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: De 0 ao ainda expedido/pendente; precisão da unidade.
  Ajuda/exemplo: “Recebi 2 de 3 unidades.”. Erro: Revise quantidade aceita: De
  0 ao ainda expedido/pendente; precisão da unidade..

- **CTRL-037-01 — Problema**. TEXTAREA. Ordem 37.1; Motivo ao divergir; vazio
  inicialmente. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  Problema até 500, nota até 1000. Ajuda/exemplo: “Uma unidade não chegou”;
  não inferir consumo.. Erro: Revise problema: Problema até 500, nota até
  1000..

- **CTRL-037-02 — Ressalva**. TEXTAREA. Ordem 37.2; Motivo ao divergir; vazio
  inicialmente. Máscara/autocomplete: Sem máscara; contador e limite do
  contrato visíveis; quebra de linha/reflow; off. Dependência/validação:
  Problema até 500, nota até 1000. Ajuda/exemplo: “Uma unidade não chegou”;
  não inferir consumo.. Erro: Revise ressalva: Problema até 500, nota até
  1000..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ENT-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `ent/entDivergence`; ausência de exemplo no HTML é declarada, sem
novo mockup equivalente. B1: OVL-021.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-028, C-AC-042, C-AC-043,
C-AC-044, C-AC-048, C-AC-050, C-AC-074, C-AC-077, C-AC-079, C-AC-089,
C-AC-096, C-AC-101, C-AC-103, C-AC-105, C-NEW-AC-006, C-NEW-AC-007,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-016, C-NEW-AC-022, C-NEW-AC-028,
C7-AC-002, C7-AC-010. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ENT](../../C3-functional-specification/ENT.md).
