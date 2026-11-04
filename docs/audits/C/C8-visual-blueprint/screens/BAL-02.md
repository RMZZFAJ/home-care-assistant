# BAL-02 — Contar materiais

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Contador designado/legítimo. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /fichas/bal etapa 1, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Contar fisicamente
equipe sem revelar referência antes da observação.

## Composição e sequência

Etapa de observação sem saldo de referência; itens/unidade e campos vazios;
resumo antes do ato.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Não preencher referência como contagem, nem transformar diferença em consumo.

## Ações e efeito

Primária: **Revisar minha contagem**. Secundárias: Salvar rascunho; Voltar.

Consequência: Autosave sem efeito; confirmação oficial explicita eventual
ajuste BAL. Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão
material. Retorno/Voltar preserva edição e contexto; próximo destino é
resultado do ato ou tarefa pertinente, nunca novo envio automático. Em
resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-047-01 — Material e unidade**. READ_ONLY_DESCRIPTION. Ordem 47.1;
  Todos os exigidos, somente leitura. Máscara/autocomplete: SEM_MASCARA;valor
  do servidor; off. Dependência/validação: Equipe, sem saldo familiar geral.
  Ajuda/exemplo: Item que mudou desde rascunho exige revisão.. Erro: Revise
  material e unidade: Equipe, sem saldo familiar geral..

- **CTRL-048-01 — Quantidade contada**. DECIMAL_TEXT_INPUT. Ordem 48.1; Sim
  por item, vazio. Máscara/autocomplete: Vírgula/ponto; inputmode decimal;
  precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Zero digitado válido; precisão da unidade e até seis
  casas. Ajuda/exemplo: “Conte agora: 0 ou 3 unidades.”. Erro: Revise
  quantidade contada: Zero digitado válido; precisão da unidade e até seis
  casas..

- **CTRL-050-01 — Atribuição**. READ_ONLY_DESCRIPTION. Ordem 50.1; Sim quando
  regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise atribuição:
  Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-02 — Início da janela**. READ_ONLY_DESCRIPTION. Ordem 50.2; Sim
  quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise início da
  janela: Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-03 — Fim da janela**. READ_ONLY_DESCRIPTION. Ordem 50.3; Sim
  quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: Pessoa, início/fim, assignment e ledger atuais.
  Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise fim da janela:
  Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-050-04 — Versão da atribuição**. READ_ONLY_DESCRIPTION. Ordem 50.4;
  Sim quando regime ativo. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Pessoa, início/fim, assignment e
  ledger atuais. Ajuda/exemplo: Sem expor UUID como instrução.. Erro: Revise
  versão da atribuição: Pessoa, início/fim, assignment e ledger atuais..

- **CTRL-051-01 — Observações**. TEXTAREA. Ordem 51.1; Não, vazio.
  Máscara/autocomplete: Sem máscara; contador e limite do contrato visíveis;
  quebra de linha/reflow; off. Dependência/validação: Até 2000 na ficha.
  Ajuda/exemplo: Não inventar consumo para explicar divergência.. Erro: Revise
  observações: Até 2000 na ficha..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-BAL-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `bal/balCount`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-012, SC-050, OVL-019.

Critérios C9 relacionados: C-AC-001, C-AC-008, C-AC-009, C-AC-010, C-AC-015,
C-AC-051, C-AC-054, C-AC-056, C-AC-057, C-AC-074, C-AC-077, C-AC-086,
C-AC-089, C-AC-104, C-NEW-AC-007, C-NEW-AC-011, C-NEW-AC-012, C-NEW-AC-015,
C7-AC-003. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional: [BAL](../../C3-functional-specification/BAL.md).
