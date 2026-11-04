# REQ-05 — Usar lista frequente

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Equipe/família autorizada. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Lista recorrente, novo painel do wizard. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Salvar/usar
seleção de materiais do paciente, sem copiar contagem antiga.

## Composição e sequência

Drawer com busca de listas; prévia de materiais e seleção marcada só por
escolha; salvar nome ao final.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Duplicata de item informa já selecionado; contagem segue vazia.

## Ações e efeito

Primária: **Adicionar materiais selecionados**. Secundárias: Voltar; Salvar
seleção como lista.

Consequência: Copia seleção, jamais contagem antiga. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-010-01 — Nome da seleção recorrente**. TEXT_INPUT. Ordem 10.1; Se
  salvar seleção; vazio. Máscara/autocomplete: Sem máscara artificial;
  preservar texto e limite do contrato; off. Dependência/validação: Proposta:
  2–80 caracteres; escopo paciente/usuário. Ajuda/exemplo: “Materiais
  habituais do turno.”. Erro: Revise nome da seleção recorrente: Proposta:
  2–80 caracteres; escopo paciente/usuário..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-REQ-05` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `req/recurring`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-009.

Critérios C9 relacionados: C-AC-025, C-AC-026, C-AC-036, C-AC-041, C-AC-049,
C-AC-073, C-AC-089, C-AC-105, C-NEW-AC-003, C-NEW-AC-004, C-NEW-AC-024,
C-NEW-AC-028, C7-AC-012. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[REQ](../../C3-functional-specification/REQ.md).
