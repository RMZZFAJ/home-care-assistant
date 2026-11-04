# RAS-02 — Comparar edições concorrentes

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Titular em dois aparelhos. Banco/API revalidam capacidade,
alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Conflito entre aparelhos, novo diálogo. Gatilho: navegar pela
tarefa ou abrir o alvo contextual autorizado. Objetivo: Comparar versões e
escolher edição com autoria; não sobrescrever silenciosamente.

## Composição e sequência

Diálogo versões lado a lado desktop/empilhadas móvel; campos alterados,
instantes e copiar manualmente.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Quantidades/pessoas/decisões não se fundem automaticamente.

## Ações e efeito

Primária: **Salvar edição revisada**. Secundárias: Manter versão do servidor;
Copiar meus campos; Voltar.

Consequência: Novo CAS explícito; não última escrita vence. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-130-01 — Escolha de conflito**. RADIO_OR_SELECT. Ordem 130.1; Se
  edição concorrente. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: Novo
  compare-and-swap; nenhuma fusão automática de decisão. Ajuda/exemplo:
  Comparar campos, autor e instantes.. Erro: Revise escolha de conflito: Novo
  compare-and-swap; nenhuma fusão automática de decisão..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-RAS-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: Nova superfície C3, sem equivalente B1.

Critérios C9 relacionados: C-AC-017, C-AC-032, C-AC-052, C-AC-070, C-AC-080,
C-AC-107, C-AC-110, C-AC-116, C-NEW-AC-013, C-NEW-AC-014, C-NEW-AC-019,
C7-AC-004. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[ATTACHMENTS_AND_DRAFTS](../../C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).
