# CON-01 — Consultar relatos e pendências

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Relator/leitor/confirmador conforme capacidade. Banco/API
revalidam capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: /consumo lista, atual a alterar. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Buscar pendente/antigo por
referência e páginas, mostrar próxima pessoa.

## Composição e sequência

Filtros de tipo/estado/período, cards com autor e próxima ação; alvo antigo
por ref fora da página recente.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

101º antigo alcançável e contador coerente; erro não vira nenhum relato.

## Ações e efeito

Primária: **Abrir relato**. Secundárias: Novo relato; Atualizar; Carregar
anteriores.

Consequência: Consulta não debita. Mostrar objeto/quantidade/pessoa/versão
antes de qualquer decisão material. Retorno/Voltar preserva edição e contexto;
próximo destino é resultado do ato ou tarefa pertinente, nunca novo envio
automático. Em resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-104-01 — Filtros/referência**. TEXT_INPUT. Ordem 104.1; Não.
  Máscara/autocomplete: Sem máscara artificial; preservar texto e limite do
  contrato; off. Dependência/validação: Ordenação estável, referência antiga
  fora de 100 acessível. Ajuda/exemplo: Contagem e lista usam mesmo conjunto
  autorizado.. Erro: Revise filtros/referência: Ordenação estável, referência
  antiga fora de 100 acessível..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-CON-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-019.

Critérios C9 relacionados: C-AC-020, C-AC-035, C-AC-047, C-AC-050, C-AC-055,
C-AC-059, C-AC-065, C-AC-089, C-AC-091, C-AC-095, C-AC-096, C-NEW-AC-010,
C-NEW-AC-016. A associação é por domínio; cada caso preserva seu discriminante
específico e não significa que todos os critérios foram executados nesta tela.
Fonte funcional:
[CONSUMPTION_AND_OCCURRENCES](../../C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).
