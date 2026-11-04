# EST-03 — Consultar origem de movimento

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Leitor autorizado à custódia. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Histórico de movimentos, atual a alterar. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Filtros, origem
autorizada, autor e antes/depois; recuperar item antigo.

## Composição e sequência

Tabela/lista por data, autor, tipo, quantidade e referência; detalhe abre
origem tipada com retorno ao filtro.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

purchase_receipt não é documentId; restrição de origem é compreensível.

## Ações e efeito

Primária: **Abrir origem autorizada**. Secundárias: Anterior/próxima página;
Limpar filtro.

Consequência: Link não concede acesso novo. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-080-01 — Estado do movimento**. RADIO_OR_SELECT. Ordem 80.1; Não,
  defaults explícitos. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Cursor estável, ID
  antigo alcançável. Ajuda/exemplo: “Movimentos de novembro; há páginas
  anteriores.”. Erro: Revise estado do movimento: Cursor estável, ID antigo
  alcançável..

- **CTRL-080-02 — Data inicial**. DATE_INPUT. Ordem 80.2; Não, defaults
  explícitos. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Cursor estável, ID
  antigo alcançável. Ajuda/exemplo: “Movimentos de novembro; há páginas
  anteriores.”. Erro: Revise data inicial: Cursor estável, ID antigo
  alcançável..

- **CTRL-080-03 — Data final**. DATE_INPUT. Ordem 80.3; Não, defaults
  explícitos. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Cursor estável, ID
  antigo alcançável. Ajuda/exemplo: “Movimentos de novembro; há páginas
  anteriores.”. Erro: Revise data final: Cursor estável, ID antigo
  alcançável..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-EST-03` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `stock/docs`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-016, OVL-040.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-022, C-AC-045, C-AC-046,
C-AC-053, C-AC-066, C-AC-068, C-AC-072, C-AC-074, C-AC-120, C-NEW-AC-008,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-023, C-NEW-AC-025, C7-AC-010. A
associação é por domínio; cada caso preserva seu discriminante específico e
não significa que todos os critérios foram executados nesta tela. Fonte
funcional:
[STOCK_AND_CUSTODY](../../C3-functional-specification/STOCK_AND_CUSTODY.md).
