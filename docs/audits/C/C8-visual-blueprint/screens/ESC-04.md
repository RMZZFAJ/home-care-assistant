# ESC-04 — Alterar ocorrência ou série

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Gestor/proponente competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Substituição/exceção/corte, atual a alterar. Gatilho: navegar
pela tarefa ou abrir o alvo contextual autorizado. Objetivo: Alterar um
plantão, parte ou série com escopo explícito e histórico.

## Composição e sequência

Escolha explícita Este plantão/Futuros/Série; lista do alcance, exceções e
motivo; prévia do corte.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Substituição sem mudar horário não desloca prazo BAL; efeito excepcional exige
decisão própria.

## Ações e efeito

Primária: **Revisar alteração**. Secundárias: Cancelar ocorrência; Encerrar
série; Voltar.

Consequência: Altera só escopo escolhido e conserva passados. Mostrar
objeto/quantidade/pessoa/versão antes de qualquer decisão material.
Retorno/Voltar preserva edição e contexto; próximo destino é resultado do ato
ou tarefa pertinente, nunca novo envio automático. Em resposta incerta
consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-059-01 — Profissional**. SEARCHABLE_COMBOBOX. Ordem 59.1; Sim na
  série. Máscara/autocomplete: Busca por nome/alias autorizado; seleção por
  ID; nenhum ID digitado como autorização; off. Dependência/validação: Sem
  impor presença; recusa conflito entre pacientes sem revelar outro.
  Ajuda/exemplo: “Ana Exemplo.”. Erro: Revise profissional: Sem impor
  presença; recusa conflito entre pacientes sem revelar outro..

- **CTRL-060-01 — Fuso**. SEARCHABLE_TIMEZONE. Ordem 60.1; Sim, escolha
  configurada. Máscara/autocomplete: Zona IANA configurada, exemplo
  America/Sao_Paulo; off. Dependência/validação: Não herdar silenciosamente
  fuso do aparelho. Ajuda/exemplo: Ex.: America/Sao_Paulo.. Erro: Revise fuso:
  Não herdar silenciosamente fuso do aparelho..

- **CTRL-066-01 — Data da exceção**. DATE_INPUT. Ordem 66.1; Opcional,
  nenhuma. Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no
  transporte; não inferir fuso; off. Dependência/validação: Feriado não
  cancela sozinho; manter/substituir/cancelar escolhido. Ajuda/exemplo: Não
  inferir calendário externo sem configuração.. Erro: Revise data da exceção:
  Feriado não cancela sozinho; manter/substituir/cancelar escolhido..

- **CTRL-066-02 — Ação da exceção**. RADIO_OR_SELECT. Ordem 66.2; Opcional,
  nenhuma. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: Feriado não cancela sozinho;
  manter/substituir/cancelar escolhido. Ajuda/exemplo: Não inferir calendário
  externo sem configuração.. Erro: Revise ação da exceção: Feriado não cancela
  sozinho; manter/substituir/cancelar escolhido..

- **CTRL-067-01 — Escopo de alteração**. RADIO_OR_SELECT. Ordem 67.1; Sim ao
  alterar. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: Não afetar fatos passados;
  corte mostrado. Ajuda/exemplo: “Somente o plantão de 06/11.”. Erro: Revise
  escopo de alteração: Não afetar fatos passados; corte mostrado..

- **CTRL-068-01 — Motivo**. TEXTAREA. Ordem 68.1; Motivo em
  decisão/troca/corte; notas opcionais. Máscara/autocomplete: Sem máscara;
  contador e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Motivo 3–1000, notas até 2000. Ajuda/exemplo:
  “Substituição combinada antes do turno.”. Erro: Revise motivo: Motivo
  3–1000, notas até 2000..

- **CTRL-068-02 — Notas**. TEXTAREA. Ordem 68.2; Motivo em
  decisão/troca/corte; notas opcionais. Máscara/autocomplete: Sem máscara;
  contador e limite do contrato visíveis; quebra de linha/reflow; off.
  Dependência/validação: Motivo 3–1000, notas até 2000. Ajuda/exemplo:
  “Substituição combinada antes do turno.”. Erro: Revise notas: Motivo 3–1000,
  notas até 2000..

## Estado, teclado e ajuda

Herda os estados descritos no blueprint; em cada painel a falha é isolada.
Skeleton não cria ausência; erro não elimina dado válido de outra seção. Foco
vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar restauram
acionador. Combobox usa setas/Enter/Escape e label associado. Tooltip em botão
Ajuda sobre [campo] é acessível por foco; regra necessária permanece inline.
Sem informação só por cor, hover, gesto ou QR.

Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura real
futura: `SHOT-ESC-04` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `schedule`; ausência de exemplo no HTML é declarada, sem novo
mockup equivalente. B1: SC-014, OVL-033.

Critérios C9 relacionados: C-AC-001, C-AC-009, C-AC-013, C-AC-039, C-AC-051,
C-AC-057, C-AC-086, C-NEW-AC-011, C-NEW-AC-015, C-NEW-AC-021. A associação é
por domínio; cada caso preserva seu discriminante específico e não significa
que todos os critérios foram executados nesta tela. Fonte funcional:
[SCHEDULES_AND_STAFFING](../../C3-functional-specification/SCHEDULES_AND_STAFFING.md).
