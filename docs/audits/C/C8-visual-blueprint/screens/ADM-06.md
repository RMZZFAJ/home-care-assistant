# ADM-06 — Mais ações e retorno seguro

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Perfil autenticado ou visitante no 404. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /mais e fallback 404, atual e novo tratamento. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Nomes de
destinos fiéis e retorno seguro em português.

## Composição e sequência

Grade/lista de destinos por intenção; 404 em português com main/título e CTA
seguro.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Preferências e central têm nomes próprios; não redirecionar em loop após
revogação.

## Ações e efeito

Primária: **Voltar ao início permitido**. Secundárias: Entrar; Buscar ajuda.

Consequência: Navegação mantém contexto autorizado. Mostrar
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
futura: `SHOT-ADM-06` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-006, SC-038, OVL-022, OVL-023.

Critérios C9 relacionados: C-AC-005, C-AC-011, C-AC-013, C-AC-014, C-AC-016,
C-AC-018, C-AC-019, C-AC-020, C-AC-024, C-AC-026, C-AC-033, C-AC-037,
C-AC-038, C-AC-059, C-AC-060, C-AC-061, C-AC-071, C-AC-075, C-AC-078,
C-AC-079, C-AC-085, C-AC-095, C-AC-099, C-AC-121, C-NEW-AC-015, C-NEW-AC-016,
C7-AC-005, C7-AC-006. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ADMINISTRATIVE_OPERATIONS](../../C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
