# CAT-02 — Consultar unidades e precisão

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Leitor/gestor competente. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /unidades, atual a preservar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Consultar unidades e precisão;
proibir reinterpretar unidade já usada.

## Composição e sequência

Lista de unidade, símbolo, casas e uso histórico; drawer para novo cadastro
quando autorizado.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Precisão0–6 e nome acessível; unidade técnica não vira catálogo de materiais.

## Ações e efeito

Primária: **Salvar unidade permitida**. Secundárias: Consultar uso; Voltar.

Consequência: Não reinterpretar unidade usada. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-083-01 — Unidade base**. SEARCHABLE_COMBOBOX. Ordem 83.1; Sim antes
  de movimentar. Máscara/autocomplete: Busca por nome/alias autorizado;
  seleção por ID; nenhum ID digitado como autorização; off.
  Dependência/validação: Não reinterpretar produto com história.
  Ajuda/exemplo: “unidade”, com casas 0 ou precisão permitida.. Erro: Revise
  unidade base: Não reinterpretar produto com história..

- **CTRL-084-01 — Precisão**. DECIMAL_TEXT_INPUT. Ordem 84.1; Sim.
  Máscara/autocomplete: Vírgula/ponto; inputmode decimal; precisão antes da
  coerção; zero só onde permitido; off. Dependência/validação: 0–6; proteger
  história. Ajuda/exemplo: Quantidade inválida é recusada, não arredondada..
  Erro: Revise precisão: 0–6; proteger história..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CAT-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-035, OVL-015.

Critérios C9 relacionados: C-AC-026, C-AC-028, C-AC-029, C-AC-044, C-AC-045,
C-AC-067, C-AC-081, C-NEW-AC-008, C-NEW-AC-022, C-NEW-AC-024, C-NEW-AC-025. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[CATALOGUE_AND_PRESENTATIONS](../../C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).
