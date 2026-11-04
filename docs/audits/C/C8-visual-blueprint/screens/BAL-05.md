# BAL-05 — Decidir adiamento

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Família/admin competente. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Adiamento e decisão, atual a alterar. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Mostrar alvo e efeito;
recusar/encerrar pedido obsoleto de modo terminal.

## Composição e sequência

Diálogo origem/alvo, data local/fuso e prazo antes/depois; obsolescência
explícita.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Recusa/obsolescência continua possível quando alvo antigo mudou.

## Ações e efeito

Primária: **Aprovar adiamento exibido**. Secundárias: Recusar; Encerrar pedido
obsoleto; Voltar.

Consequência: Prazo só muda na decisão válida. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-053-01 — Destino do adiamento**. SEARCHABLE_COMBOBOX. Ordem 53.1; Sim
  ao solicitar. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Versão de alvo e prazo exibidos. Ajuda/exemplo: Proposta pendente não altera
  obrigação.. Erro: Revise destino do adiamento: Versão de alvo e prazo
  exibidos..

- **CTRL-055-01 — Motivo da decisão**. TEXTAREA. Ordem 55.1; Sim em
  adiamento/reconto/configuração. Máscara/autocomplete: Sem máscara; contador
  e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: 3–1000 caracteres. Ajuda/exemplo: Explicar efeito e
  próxima pessoa.. Erro: Revise motivo da decisão: 3–1000 caracteres..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-BAL-05` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `bal`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-015, OVL-014.

Critérios C9 relacionados: C-AC-001, C-AC-008, C-AC-009, C-AC-010, C-AC-015,
C-AC-051, C-AC-054, C-AC-056, C-AC-057, C-AC-074, C-AC-077, C-AC-086,
C-AC-089, C-AC-104, C-NEW-AC-007, C-NEW-AC-011, C-NEW-AC-012, C-NEW-AC-015,
C7-AC-003. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional: [BAL](../../C3-functional-specification/BAL.md).
