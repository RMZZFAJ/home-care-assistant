# Escalas, vários dias, recorrências e substituição

AS_IS: /escalas e ScheduleConsole, src/lib/validation/schedules.ts. Há tipos,
séries once/weekly/cycle, publicação/proposta, exceções e corte. Consulta
aceita até 42 dias e série materializada até 366 dias; isso não impede UI
oferecer intervalo maior mediante páginas. P1 C-CAUSE-009 omite resumo
decisório; C-CAUSE-051 pode republicar depois do corte. TO_BE aplica
DEC-001/009/013 e O06.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ESC-01

  **Rota e situação:** /escalas calendário/lista, atual a alterar

  **Objetivo e ações:** Dia/semana/mês com intervalo coerente; selecionar
  múltiplos dias além de 30 dias.

- **Tela:** ESC-02

  **Rota e situação:** Tipo e série, atuais a ampliar

  **Objetivo e ações:** Definir horário padrão, pessoa, período, recorrência e
  exceções; prévia antes de publicar.

- **Tela:** ESC-03

  **Rota e situação:** Proposta e decisão, atual a corrigir

  **Objetivo e ações:** Comparar atual/proposto, pessoa, fuso e efeito BAL;
  aprovar ou recusar.

- **Tela:** ESC-04

  **Rota e situação:** Substituição/exceção/corte, atual a alterar

  **Objetivo e ações:** Alterar um plantão, parte ou série com escopo
  explícito e histórico.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Nome do tipo

  **Tipo/origem por tela e estado:** ESC-02 Nome do tipo: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Nome do tipo: Só no
  subformulário Cadastrar/editar tipo; não confundir com criar série

  **Validação/unidade:** ESC-02 Nome do tipo: 2–100 caracteres; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ESC-02 Nome do tipo: “Plantão noturno.”

- **Campo:** Início padrão

  **Tipo/origem por tela e estado:** ESC-02 Início padrão: EDITABLE
  (TIME_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Início padrão: Sim no
  tipo, vazio

  **Validação/unidade:** ESC-02 Início padrão: HH:mm real válido, não só
  regex; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-02 Início padrão: “19:00 no fuso da residência.”

- **Campo:** Duração/fim padrão

  **Tipo/origem por tela e estado:** ESC-02 Duração em minutos:
  EDITABLE_SUBFORM (INTEGER_NUMBER_INPUT); Cadastro de tipo: duração inteira é
  base única da edição; fim calculado; ESC-02 Fim padrão: CALCULATED
  (LOCAL_END_WITH_DAY_OFFSET); Início padrão + duração; mostrar data final/+1
  dia, não segundo input contraditório

  **Obrigatoriedade/default na preparação:** ESC-02 Duração em minutos: Sim,
  15–1440 min herdados; ESC-02 Fim padrão: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado

  **Validação/unidade:** ESC-02 Duração em minutos: Inteiro de 15 a 1440
  minutos segundo contrato atual; fim calculado a partir do início e fuso;
  Cadastro de tipo: duração inteira é base única da edição; fim calculado;
  ESC-02 Fim padrão: Revalidar acesso, referência e estado na leitura/ação.
  Não solicitar ao usuário correção deste valor nesta tela. Início padrão +
  duração; mostrar data final/+1 dia, não segundo input contraditório

  **Ajuda/exemplo:** ESC-02 Duração em minutos: “19:00 → 07:00 do dia
  seguinte.”; ESC-02 Fim padrão: Resultado calculado a partir dos fatos desta
  tarefa, apresentado para conferência. Ele não pode ser digitado ou corrigido
  aqui.

- **Campo:** Profissional

  **Tipo/origem por tela e estado:** ESC-02 Profissional: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ESC-04 Profissional:
  EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Profissional: Sim na
  série; ESC-04 Profissional: Sim na série

  **Validação/unidade:** ESC-02 Profissional: Sem impor presença; recusa
  conflito entre pacientes sem revelar outro; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ESC-04 Profissional: Sem impor presença; recusa conflito entre pacientes sem
  revelar outro; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-02 Profissional: “Ana Exemplo.”; ESC-04 Profissional:
  “Ana Exemplo.”

- **Campo:** Fuso

  **Tipo/origem por tela e estado:** ESC-01 Fuso: READ_ONLY
  (TIMEZONE_DESCRIPTION); Fuso de referência configurado, não altera
  publicação ao navegar; ESC-02 Fuso: EDITABLE (SEARCHABLE_TIMEZONE); Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; ESC-03 Fuso: READ_ONLY (TIMEZONE_DESCRIPTION); Fuso da
  proposta congelada; correção exige proposta própria; ESC-04 Fuso:
  EDITABLE_SUBFORM (SEARCHABLE_TIMEZONE); Somente alteração futura
  explicitamente autorizada, com prévia; instantes publicados não são
  reinterpretados

  **Obrigatoriedade/default na preparação:** ESC-01 Fuso: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ESC-02 Fuso: Sim, escolha configurada;
  ESC-03 Fuso: Valor emitido, proposto ou calculado da fonte identificada;
  ausência explicitamente informada, sem valor inventado; ESC-04 Fuso: Sim,
  escolha configurada

  **Validação/unidade:** ESC-01 Fuso: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela. Fuso
  de referência configurado, não altera publicação ao navegar; ESC-02 Fuso:
  Não herdar silenciosamente fuso do aparelho; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ESC-03 Fuso: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Fuso da proposta
  congelada; correção exige proposta própria; ESC-04 Fuso: Não herdar
  silenciosamente fuso do aparelho; Somente alteração futura explicitamente
  autorizada, com prévia; instantes publicados não são reinterpretados

  **Ajuda/exemplo:** ESC-01 Fuso: Fuso de referência dos horários exibidos;
  não muda porque seu aparelho usa outro fuso.; ESC-02 Fuso: Ex.:
  America/Sao_Paulo.; ESC-03 Fuso: Fuso de referência dos horários exibidos;
  não muda porque seu aparelho usa outro fuso.; ESC-04 Fuso: Ex.:
  America/Sao_Paulo.

- **Campo:** Período

  **Tipo/origem por tela e estado:** ESC-02 Data inicial: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ESC-02 Data final: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Data inicial: Sim; ESC-02
  Data final: Sim

  **Validação/unidade:** ESC-02 Data inicial: Prévia da série até limite
  vigente; >30 dias permitido; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ESC-02 Data final:
  Prévia da série até limite vigente; >30 dias permitido; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura

  **Ajuda/exemplo:** ESC-02 Data inicial: “01/11 a 15/12.”; ESC-02 Data final:
  “01/11 a 15/12.”

- **Campo:** Dias selecionados

  **Tipo/origem por tela e estado:** ESC-01 Dias selecionados: FILTER
  (MULTI_DATE_CALENDAR_WITH_LIST); Seleção local de dia/período; não publica
  nem altera série; ESC-02 Dias selecionados: EDITABLE
  (MULTI_DATE_CALENDAR_WITH_LIST); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-01 Dias selecionados: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ESC-02 Dias selecionados: Se avulsa múltipla

  **Validação/unidade:** ESC-01 Dias selecionados: Filtro tipado da
  seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar; ESC-02 Dias
  selecionados: Datas únicas; navegação entre meses preserva seleção; Somente
  no subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ESC-01 Dias selecionados: Escolha dias em vários meses. A
  lista de datas selecionadas permanece visível e permite remover um dia por
  vez.; ESC-02 Dias selecionados: Escolha dias em vários meses. A lista de
  datas selecionadas permanece visível e permite remover um dia por vez.

- **Campo:** Recorrência

  **Tipo/origem por tela e estado:** ESC-02 Recorrência: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Recorrência: Sim, escolha
  explícita

  **Validação/unidade:** ESC-02 Recorrência: Weekly usa dias da semana; ciclo
  usa âncora/trabalho/descanso; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-02 Recorrência: 12×36, 24×48, 24×24 conforme contrato
  atual.

- **Campo:** Dias da semana

  **Tipo/origem por tela e estado:** ESC-02 Dias da semana: EDITABLE
  (WEEKDAY_CHECKBOX_GROUP); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Dias da semana: Na
  recorrência semanal: ao menos um dia explicitamente selecionado

  **Validação/unidade:** ESC-02 Dias da semana: 0–6 únicos, pelo menos um;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-02 Dias da semana: “Segunda e quinta.”

- **Campo:** Âncora e até

  **Tipo/origem por tela e estado:** ESC-02 Data âncora: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ESC-02 Válido até: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Data âncora: No ciclo;
  ESC-02 Válido até: No ciclo

  **Validação/unidade:** ESC-02 Data âncora: Consistência com janela, limite
  de 366 dias preservado; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ESC-02 Válido até:
  Consistência com janela, limite de 366 dias preservado; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura

  **Ajuda/exemplo:** ESC-02 Data âncora: Não recalcular ocorrências passadas
  por mudança posterior.; ESC-02 Válido até: Não recalcular ocorrências
  passadas por mudança posterior.

- **Campo:** Exceções/feriados

  **Tipo/origem por tela e estado:** ESC-02 Data da exceção: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ESC-04 Data da exceção: EDITABLE
  (DATE_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ESC-02 Ação da exceção: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ESC-04 Ação da exceção: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Data da exceção: Opcional,
  nenhuma; ESC-04 Data da exceção: Opcional, nenhuma; ESC-02 Ação da exceção:
  Opcional, nenhuma; ESC-04 Ação da exceção: Opcional, nenhuma

  **Validação/unidade:** ESC-02 Data da exceção: Feriado não cancela sozinho;
  manter/substituir/cancelar escolhido; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; ESC-04
  Data da exceção: Feriado não cancela sozinho; manter/substituir/cancelar
  escolhido; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ESC-02 Ação da exceção: Feriado não
  cancela sozinho; manter/substituir/cancelar escolhido; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura; ESC-04 Ação da exceção: Feriado não cancela sozinho;
  manter/substituir/cancelar escolhido; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-02 Data da exceção: Não inferir calendário externo
  sem configuração.; ESC-04 Data da exceção: Não inferir calendário externo
  sem configuração.; ESC-02 Ação da exceção: Não inferir calendário externo
  sem configuração.; ESC-04 Ação da exceção: Não inferir calendário externo
  sem configuração.

- **Campo:** Escopo de alteração

  **Tipo/origem por tela e estado:** ESC-04 Escopo de alteração: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-04 Escopo de alteração: Sim
  ao alterar

  **Validação/unidade:** ESC-04 Escopo de alteração: Não afetar fatos
  passados; corte mostrado; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ESC-04 Escopo de alteração: “Somente o plantão de 06/11.”

- **Campo:** Motivo/notas

  **Tipo/origem por tela e estado:** ESC-02 Motivo do comando atual: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ESC-03 Motivo do comando atual:
  EDITABLE_SUBFORM (TEXTAREA); Motivo PRÓPRIO da decisão; obrigatório na
  rejeição conforme comando, nunca substitui motivo do proponente; ESC-04
  Motivo do comando atual: EDITABLE (TEXTAREA); Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ESC-02 Notas da programação: EDITABLE (TEXTAREA); Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ESC-03 Notas da programação: READ_ONLY (TEXT_VALUE); Notas da proposta
  apresentada; aprovador não as reescreve; ESC-04 Notas da programação:
  EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ESC-02 Motivo do comando atual:
  Motivo próprio de proposta/corte/decisão conforme estado; obrigatório em
  rejeição e mudanças que exigem motivo; ESC-03 Motivo do comando atual:
  Motivo próprio de proposta/corte/decisão conforme estado; obrigatório em
  rejeição e mudanças que exigem motivo; ESC-04 Motivo do comando atual:
  Motivo próprio de proposta/corte/decisão conforme estado; obrigatório em
  rejeição e mudanças que exigem motivo; ESC-02 Notas da programação:
  Opcionais até 2000 na preparação; somente leitura ao decidir a proposta;
  ESC-03 Notas da programação: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado; ESC-04
  Notas da programação: Opcionais até 2000 na preparação; somente leitura ao
  decidir a proposta

  **Validação/unidade:** ESC-02 Motivo do comando atual: 3–1000 caracteres
  quando exigido; nunca reescreve o motivo do proponente; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura; ESC-03 Motivo do comando atual: 3–1000 caracteres quando exigido;
  nunca reescreve o motivo do proponente; Motivo PRÓPRIO da decisão;
  obrigatório na rejeição conforme comando, nunca substitui motivo do
  proponente; ESC-04 Motivo do comando atual: 3–1000 caracteres quando
  exigido; nunca reescreve o motivo do proponente; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ESC-02 Notas da programação: Notas não são motivo de rejeição e não são
  editadas pelo aprovador; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ESC-03 Notas da
  programação: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Notas da proposta
  apresentada; aprovador não as reescreve; ESC-04 Notas da programação: Notas
  não são motivo de rejeição e não são editadas pelo aprovador; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ESC-02 Motivo do comando atual: “Substituição combinada
  antes do turno.”; ESC-03 Motivo do comando atual: “Substituição combinada
  antes do turno.”; ESC-04 Motivo do comando atual: “Substituição combinada
  antes do turno.”; ESC-02 Notas da programação: “Substituição combinada antes
  do turno.”; ESC-03 Notas da programação: Informação registrada no ato de
  origem. Não pode ser reescrita nesta consulta ou decisão.; ESC-04 Notas da
  programação: “Substituição combinada antes do turno.”

- **Campo:** Antes/depois e efeito BAL

  **Tipo/origem por tela e estado:** ESC-03 Antes/depois e efeito BAL:
  READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** ESC-03 Antes/depois e efeito BAL:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ESC-03 Antes/depois e efeito BAL: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** ESC-03 Antes/depois e efeito BAL: Atual: Juliana, 19h de
  06/11 a 7h de 07/11. Proposto: Sheila, mesmo intervalo. O prazo BAL
  permanece; se a janela mudar, mostre a decisão necessária.

<!-- c-table:end -->

## Jornada e regras temporais

Configurar tipo → selecionar pessoa e datas → montar prévia completa →
resolver conflitos → propor/publicar conforme capacidade. Prévia inclui cada
ocorrência, intervalo local com offset e UTC técnico, exclusões e quantidade
de plantões. Ler períodos longos por páginas determinísticas sem truncar
silenciosamente aos 42 dias do endpoint. Usuário não precisa repetir o mesmo
horário em cada dia.

Horário atravessando meia-noite conserva data de início e de fim. Horas locais
inexistentes/ambíguas por mudança de fuso exigem escolha/recusa explícita e
offset na prévia; não somar 24h UTC supondo todo dia local igual. Alteração de
fuso/configuração é prospectiva e não modifica instantes já publicados.
Feriado só altera escala se houver exceção deliberada. Não há check-in ou
prova de presença. Recebedor sugerido para ENT é editável conforme DEC-028.

Proposta pendente não muda agenda. Decisão exige versão e validade atual de
série/ocorrência; encerrar série torna incompatível aprovar linhas após corte.
Pode exigir nova proposta para parte anterior ainda válida, sem republicação
silenciosa. Substituição no mesmo horário conserva janela BAL; deslocar janela
com BAL exige decisão familiar própria. Mostrar essas consequências antes do
P1-confirmador e garantir que o payload aplicado é a versão vista.

## Estados, recuperação e aceite

Carregar mês não mostra lista vazia enquanto consulta; Mês no celular mostra
intervalo de mês ou muda o seletor explicitamente para a vista possível.
Escolhas em outro mês permanecem visíveis no resumo. Conflito mantém seleção e
antes/depois, sem aprovar versão nova automaticamente. Resposta perdida
recupera a mesma proposta/série por intenção; não duplica ocorrências. Sessão
revogada ou pessoa inativa é recusada no servidor após espera relevante.

Eventos registram proponente, aprovador, versão anterior, exceções e
instantes; avisos internos apontam novo responsável sem afirmar
comparecimento. Histórico mostra diferença humana, não JSON. Provas D:
escolher 12 dias em 45 dias sem redigitar horários; publicar noturno 19–07;
tratar conflito multipaciente sem vazar nome; aprovar proposta encerrada não
republica; troca mostra efeito BAL; duas sessões decidem uma versão uma única
vez. Pessoas validam resumo em celular, teclado e AT; não há aceite físico já
realizado nesta C.

## Fechamento definitivo — tarefa, estado e política

ESC-02 usa início+duração como base única de edição e mostra fim calculado com
data/+1 dia. Não manter duração/fim como inputs contraditórios. ESC-03
apresenta fuso/pessoa/horários/motivo/notas do proponente e efeito BAL em
leitura. Só motivo próprio da decisão, quando exigido, é editável. Corrigir
proposta exige outro fluxo; aprovar aplica versão vista ou conflita. ESC-01
consulta fuso configurado; selecionar datas não altera publicação.
