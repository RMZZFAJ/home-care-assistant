# ADM-05 — Auditar e encaminhar incidente

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Admin competente ou suporte pelo tipo. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Auditoria e conciliação técnica, atuais a ampliar. Gatilho:
navegar pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Consultar
registro antigo/tentativa/referência; escalonar a quem pode resolver.

## Composição e sequência

Filtros por recurso/data/ator; histórico completo e detalhe técnico restrito;
referência copiável segura.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Eventos 101/201 e propostas51 alcançáveis; detalhe técnico não chega à equipe.

## Ações e efeito

Primária: **Abrir evento ou tentativa**. Secundárias: Carregar anteriores;
Buscar ajuda; Conciliar autorizado.

Consequência: Leitura de evento não reexecuta operação. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-157-01 — Estado**. RADIO_OR_SELECT. Ordem 157.1; Defaults declarados.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Início/fim válidos; paginação estável
  por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”. Erro:
  Revise estado: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-02 — Tipo**. RADIO_OR_SELECT. Ordem 157.2; Defaults declarados.
  Máscara/autocomplete: Opções finitas com rótulo humano; sem opção material
  preaceita; off. Dependência/validação: Início/fim válidos; paginação estável
  por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”. Erro:
  Revise tipo: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-03 — Data inicial**. DATE_INPUT. Ordem 157.3; Defaults
  declarados. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Início/fim
  válidos; paginação estável por data+ID. Ajuda/exemplo: “Pendentes sob minha
  responsabilidade.”. Erro: Revise data inicial: Início/fim válidos; paginação
  estável por data+ID..

- **CTRL-157-04 — Data final**. DATE_INPUT. Ordem 157.4; Defaults declarados.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Início/fim válidos; paginação
  estável por data+ID. Ajuda/exemplo: “Pendentes sob minha responsabilidade.”.
  Erro: Revise data final: Início/fim válidos; paginação estável por data+ID..

- **CTRL-157-05 — Responsável**. SEARCHABLE_COMBOBOX. Ordem 157.5; Defaults
  declarados. Máscara/autocomplete: Busca por nome/alias autorizado; seleção
  por ID; nenhum ID digitado como autorização; off. Dependência/validação:
  Início/fim válidos; paginação estável por data+ID. Ajuda/exemplo: “Pendentes
  sob minha responsabilidade.”. Erro: Revise responsável: Início/fim válidos;
  paginação estável por data+ID..

- **CTRL-158-01 — Referência direta**. READ_ONLY_DESCRIPTION. Ordem 158.1; Se
  abrir link de tarefa. Máscara/autocomplete: SEM_MASCARA;valor do servidor;
  off. Dependência/validação: GET por ID independente da janela recente.
  Ajuda/exemplo: Acesso negado não enumera outro paciente.. Erro: Revise
  referência direta: GET por ID independente da janela recente..

- **CTRL-159-01 — Página**. READ_ONLY_DESCRIPTION. Ordem 159.1; Somente
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  página: Indicar total conhecido ou existência de próxima página..

- **CTRL-159-02 — Cursor**. READ_ONLY_DESCRIPTION. Ordem 159.2; Somente
  leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  cursor: Indicar total conhecido ou existência de próxima página..

- **CTRL-159-03 — Total consultado**. READ_ONLY_DESCRIPTION. Ordem 159.3;
  Somente leitura. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Indicar total conhecido ou existência de próxima
  página. Ajuda/exemplo: Não rotular 100 recentes como todos.. Erro: Revise
  total consultado: Indicar total conhecido ou existência de próxima página..

- **CTRL-164-01 — Correlação de erro**. READ_ONLY_DESCRIPTION. Ordem 164.1; Em
  falha técnica. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Sem SQL, segredo ou payload privado. Ajuda/exemplo:
  “Informe esta referência ao suporte.”. Erro: Revise correlação de erro: Sem
  SQL, segredo ou payload privado..

- **CTRL-165-01 — Job**. READ_ONLY_DESCRIPTION. Ordem 165.1; Ao conciliar
  envio incerto. Máscara/autocomplete: SEM_MASCARA;valor do servidor; off.
  Dependência/validação: Escopo, origem, timestamps e tentativa exata.
  Ajuda/exemplo: Referência vazia significa desconhecida, não “não enviado”..
  Erro: Revise job: Escopo, origem, timestamps e tentativa exata..

- **CTRL-165-02 — Tentativa**. READ_ONLY_DESCRIPTION. Ordem 165.2; Ao
  conciliar envio incerto. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Escopo, origem, timestamps e tentativa
  exata. Ajuda/exemplo: Referência vazia significa desconhecida, não “não
  enviado”.. Erro: Revise tentativa: Escopo, origem, timestamps e tentativa
  exata..

- **CTRL-165-03 — Referência externa**. READ_ONLY_DESCRIPTION. Ordem 165.3; Ao
  conciliar envio incerto. Máscara/autocomplete: SEM_MASCARA;valor do
  servidor; off. Dependência/validação: Escopo, origem, timestamps e tentativa
  exata. Ajuda/exemplo: Referência vazia significa desconhecida, não “não
  enviado”.. Erro: Revise referência externa: Escopo, origem, timestamps e
  tentativa exata..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ADM-05` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `SEM_EQUIVALENTE_NO_HTML`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-028.

Critérios C9 relacionados: C-AC-005, C-AC-011, C-AC-013, C-AC-014, C-AC-016,
C-AC-018, C-AC-019, C-AC-020, C-AC-024, C-AC-026, C-AC-033, C-AC-037,
C-AC-038, C-AC-059, C-AC-060, C-AC-061, C-AC-071, C-AC-075, C-AC-078,
C-AC-079, C-AC-085, C-AC-095, C-AC-099, C-AC-121, C-NEW-AC-015, C-NEW-AC-016,
C7-AC-005, C7-AC-006. A associação é por domínio; cada caso preserva seu
discriminante específico e não significa que todos os critérios foram
executados nesta tela. Fonte funcional:
[ADMINISTRATIVE_OPERATIONS](../../C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
