# CON-04 — Decidir consumo

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Confirmador por custódia. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Revisão e decisão, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Confirmar ou rejeitar
versão exata; explicar efeito sobre estoque.

## Composição e sequência

Diálogo relato/complemento, quantidade/custódia, efeito de saldo e versão;
decisão expressa.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

NULL/oposto recusados; mesma decisão recupera resultado tipado.

## Ações e efeito

Primária: **Confirmar consumo e descontar**. Secundárias: Rejeitar com motivo;
Pedir complemento; Voltar.

Consequência: Débito único só de consumo estruturado confirmado. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-101-01 — Referência do relato**. READ_ONLY_DESCRIPTION. Ordem 101.1;
  Sim ao complementar/decidir. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Versão atual, paciente/custódia
  originais. Ajuda/exemplo: ID nunca concede permissão.. Erro: Revise
  referência do relato: Versão atual, paciente/custódia originais..

- **CTRL-102-01 — Decisão**. RADIO_OR_SELECT. Ordem 102.1; Sim, sem
  NULL/default tácito. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Mesmo resultado
  recupera; oposto conflita. Ajuda/exemplo: “Confirmar consumo e descontar 1
  unidade.”. Erro: Revise decisão: Mesmo resultado recupera; oposto conflita..

- **CTRL-103-01 — Motivo de rejeição/correção**. TEXTAREA. Ordem 103.1;
  Condicional à rejeição/correção. Máscara/autocomplete: Sem máscara; contador
  e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Proposta 3–1000, histórico imutável. Ajuda/exemplo:
  Não chamar rejeição de confirmação sem efeito.. Erro: Revise motivo de
  rejeição/correção: Proposta 3–1000, histórico imutável..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CON-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-019, OVL-036, OVL-037.

Critérios C9 relacionados: C-AC-020, C-AC-035, C-AC-047, C-AC-050, C-AC-055,
C-AC-059, C-AC-065, C-AC-089, C-AC-091, C-AC-095, C-AC-096, C-NEW-AC-010,
C-NEW-AC-016. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[CONSUMPTION_AND_OCCURRENCES](../../C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).
