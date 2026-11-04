# ENT-02 — Minhas tarefas de entrega

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Recebedor/responsável competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /entregas, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Ver todas as tarefas
executáveis, inclusive consentimento de cancelamento; filtros e referência
antiga.

## Composição e sequência

Filtros por tarefa/estado; lista com protocolo, pessoa, prazo e próxima ação;
contador do conjunto consultado.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Incluir consentimento de cancelamento e divergência, além de pending_receipt.

## Ações e efeito

Primária: **Abrir tarefa**. Secundárias: Filtrar; Atualizar; Carregar
anteriores.

Consequência: Abertura leva ao alvo exato; não confirma. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

Tela de orientação/consulta sem novo campo de dado. Links/botões têm nome,
alvo e estado próprios; não adicionar formulário sem necessidade.

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ENT-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `ent`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-013.

Critérios C9 relacionados: C-AC-010, C-AC-021, C-AC-028, C-AC-042, C-AC-043,
C-AC-044, C-AC-048, C-AC-050, C-AC-074, C-AC-077, C-AC-079, C-AC-089,
C-AC-096, C-AC-101, C-AC-103, C-AC-105, C-NEW-AC-006, C-NEW-AC-007,
C-NEW-AC-009, C-NEW-AC-015, C-NEW-AC-016, C-NEW-AC-022, C-NEW-AC-028,
C7-AC-002, C7-AC-010. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ENT](../../C3-functional-specification/ENT.md).
