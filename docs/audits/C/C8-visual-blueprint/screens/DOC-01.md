# DOC-01 — Localizar documento e versão

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Leitor autorizado. Banco/API revalidam capacidade, alvo e
versão; menu/ID/escala não concedem autorização.

Rota/superfície: /historico, atual a alterar. Gatilho: navegar pela tarefa ou
abrir o alvo contextual autorizado. Objetivo: Buscar
tipo/estado/data/protocolo e acessar qualquer versão autorizada.

## Composição e sequência

Busca tipo/protocolo/estado/período; lista/card com versão e próxima ação;
paginação estável.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Evento antigo abre versão exata; unknown não é pendência universal.

## Ações e efeito

Primária: **Abrir documento**. Secundárias: Ver versões; Filtrar; Carregar
anteriores.

Consequência: Consulta não emite PDF novo. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-143-01 — Documento**. READ_ONLY_DESCRIPTION. Ordem 143.1; Sim,
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  documento: Série por paciente/tipo, UUID e versão..

- **CTRL-143-02 — Tipo**. READ_ONLY_DESCRIPTION. Ordem 143.2; Sim, leitura.
  Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  tipo: Série por paciente/tipo, UUID e versão..

- **CTRL-143-03 — Protocolo**. READ_ONLY_DESCRIPTION. Ordem 143.3; Sim,
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Série por paciente/tipo, UUID e versão.
  Ajuda/exemplo: Protocolo físico importado tem origem própria.. Erro: Revise
  protocolo: Série por paciente/tipo, UUID e versão..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-DOC-01` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `docs`; ausência de exemplo no HTML é declarada, sem novo mockup
equivalente. B1: SC-007, SC-042, SC-049, SC-050.

Critérios C9 relacionados: C-AC-013, C-AC-015, C-AC-023, C-AC-034, C-AC-036,
C-AC-046, C-AC-063, C-AC-071, C-AC-100, C-AC-101, C-AC-102, C-AC-103,
C-AC-104, C-AC-105, C-AC-106, C-AC-107, C-AC-108, C-AC-109, C-AC-110,
C-AC-111, C-AC-119, C-NEW-AC-017, C-NEW-AC-018, C-NEW-AC-019, C-NEW-AC-020,
C-NEW-AC-023, C7-AC-002, C7-AC-011. A associação é por domínio; cada caso
preserva seu discriminante específico e não significa que todos os critérios
foram executados nesta tela. Fonte funcional:
[DOCUMENTS_PDFS_AND_INTEGRITY](../../C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).
