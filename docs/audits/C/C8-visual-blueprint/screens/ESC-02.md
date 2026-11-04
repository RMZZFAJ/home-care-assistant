# ESC-02 — Preparar série de plantões

Estado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.

Perfil e permissão: Gestor/proponente competente. Banco/API revalidam
capacidade, alvo e versão; menu/ID/escala não concedem autorização.

Rota/superfície: Tipo e série, atuais a ampliar. Gatilho: navegar pela tarefa
ou abrir o alvo contextual autorizado. Objetivo: Definir horário padrão,
pessoa, período, recorrência e exceções; prévia antes de publicar.

## Composição e sequência

Drawer largo ou página em móvel; pessoa/tipo, período e recorrência; prévia de
datas e conflitos antes de publicar.

Desktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e ajuda
lateral quando útil. Tablet: preservar ordem de foco e duas colunas só se
rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo longo ocupa
largura disponível e rola internamente, footer não cobre campo/teclado;
resumo/ações continuam alcançáveis.

Selecionar45 dias/meses sem redigitar19–07; fim do noturno mostra +1dia e
fuso.

## Ações e efeito

Primária: **Ver prévia da série**. Secundárias: Salvar padrão; Voltar;
Publicar após revisão.

Consequência: Prévia zero efeito, publicação só com autoridade e datas
corretas. Mostrar objeto/quantidade/pessoa/versão antes de qualquer decisão
material. Retorno/Voltar preserva edição e contexto; próximo destino é
resultado do ato ou tarefa pertinente, nunca novo envio automático. Em
resposta incerta consultar intenção antes de prosseguir.

## Controles em ordem de tarefa

Os IDs abaixo são canônicos no catálogo de controles. Campos compostos C3
foram desdobrados; na revisão/detalhe aparecem em leitura, não novamente
editáveis. Servidor é a origem de identidade/versões/estados.

- **CTRL-056-01 — Nome do tipo**. TEXT_INPUT. Ordem 56.1; Sim ao cadastrar.
  Máscara/autocomplete: Sem máscara artificial; preservar texto e limite do
  contrato; off. Dependência/validação: 2–100 caracteres. Ajuda/exemplo:
  “Plantão noturno.”. Erro: Revise nome do tipo: 2–100 caracteres..

- **CTRL-057-01 — Início padrão**. TIME_INPUT. Ordem 57.1; Sim no tipo, vazio.
  Máscara/autocomplete: HH:mm com data de fim/+1dia quando aplicável; off.
  Dependência/validação: HH:mm real válido, não só regex. Ajuda/exemplo:
  “19:00 no fuso da residência.”. Erro: Revise início padrão: HH:mm real
  válido, não só regex..

- **CTRL-058-01 — Duração em minutos**. DECIMAL_TEXT_INPUT. Ordem 58.1; Sim,
  15–1440 min herdados. Máscara/autocomplete: Vírgula/ponto; inputmode
  decimal; precisão antes da coerção; zero só onde permitido; off.
  Dependência/validação: Fim depois do início; indicar dia seguinte.
  Ajuda/exemplo: “19:00 → 07:00 do dia seguinte.”. Erro: Revise duração em
  minutos: Fim depois do início; indicar dia seguinte..

- **CTRL-058-02 — Fim padrão**. TIME_INPUT. Ordem 58.2; Sim, 15–1440 min
  herdados. Máscara/autocomplete: HH:mm com data de fim/+1dia quando
  aplicável; off. Dependência/validação: Fim depois do início; indicar dia
  seguinte. Ajuda/exemplo: “19:00 → 07:00 do dia seguinte.”. Erro: Revise fim
  padrão: Fim depois do início; indicar dia seguinte..

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

- **CTRL-061-01 — Data inicial**. DATE_INPUT. Ordem 61.1; Sim.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Prévia da série até limite
  vigente; >30 dias permitido. Ajuda/exemplo: “01/11 a 15/12.”. Erro: Revise
  data inicial: Prévia da série até limite vigente; >30 dias permitido..

- **CTRL-061-02 — Data final**. DATE_INPUT. Ordem 61.2; Sim.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Prévia da série até limite
  vigente; >30 dias permitido. Ajuda/exemplo: “01/11 a 15/12.”. Erro: Revise
  data final: Prévia da série até limite vigente; >30 dias permitido..

- **CTRL-062-01 — Dias selecionados**. TEXT_INPUT. Ordem 62.1; Se avulsa
  múltipla. Máscara/autocomplete: Sem máscara artificial; preservar texto e
  limite do contrato; off. Dependência/validação: Datas únicas; navegação
  entre meses preserva seleção. Ajuda/exemplo: Mostrar “12 dias selecionados
  em dois meses”.. Erro: Revise dias selecionados: Datas únicas; navegação
  entre meses preserva seleção..

- **CTRL-063-01 — Recorrência**. RADIO_OR_SELECT. Ordem 63.1; Sim, escolha
  explícita. Máscara/autocomplete: Opções finitas com rótulo humano; sem opção
  material preaceita; off. Dependência/validação: Weekly usa dias da semana;
  ciclo usa âncora/trabalho/descanso. Ajuda/exemplo: 12×36, 24×48, 24×24
  conforme contrato atual.. Erro: Revise recorrência: Weekly usa dias da
  semana; ciclo usa âncora/trabalho/descanso..

- **CTRL-064-01 — Dias da semana**. RADIO_OR_SELECT. Ordem 64.1; Na
  recorrência semanal. Máscara/autocomplete: Opções finitas com rótulo humano;
  sem opção material preaceita; off. Dependência/validação: 0–6 únicos, pelo
  menos um. Ajuda/exemplo: “Segunda e quinta.”. Erro: Revise dias da semana:
  0–6 únicos, pelo menos um..

- **CTRL-065-01 — Data âncora**. DATE_INPUT. Ordem 65.1; No ciclo.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Consistência com janela, limite de
  366 dias preservado. Ajuda/exemplo: Não recalcular ocorrências passadas por
  mudança posterior.. Erro: Revise data âncora: Consistência com janela,
  limite de 366 dias preservado..

- **CTRL-065-02 — Válido até**. DATE_INPUT. Ordem 65.2; No ciclo.
  Máscara/autocomplete: DD/MM/AAAA na apresentação; ISO no transporte; não
  inferir fuso; off. Dependência/validação: Consistência com janela, limite de
  366 dias preservado. Ajuda/exemplo: Não recalcular ocorrências passadas por
  mudança posterior.. Erro: Revise válido até: Consistência com janela, limite
  de 366 dias preservado..

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
futura: `SHOT-ESC-02` no mesmo SHA de D, sem dados pessoais/segredos.
Protótipo: `schedule/newSchedule`; ausência de exemplo no HTML é declarada,
sem novo mockup equivalente. B1: SC-014, OVL-033.

Critérios C9 relacionados: C-AC-001, C-AC-009, C-AC-013, C-AC-039, C-AC-051,
C-AC-057, C-AC-086, C-NEW-AC-011, C-NEW-AC-015, C-NEW-AC-021. A associação é
por domínio; cada caso preserva seu discriminante específico e não significa
que todos os critérios foram executados nesta tela. Fonte funcional:
[SCHEDULES_AND_STAFFING](../../C3-functional-specification/SCHEDULES_AND_STAFFING.md).
