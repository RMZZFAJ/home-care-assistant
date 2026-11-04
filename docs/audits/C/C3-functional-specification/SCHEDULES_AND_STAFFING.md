# Escalas, vários dias, recorrências e substituição

AS_IS: /escalas e ScheduleConsole, src/lib/validation/schedules.ts. Há tipos,
séries once/weekly/cycle, publicação/proposta, exceções e corte. Consulta
aceita
até 42 dias e série materializada até 366 dias; isso não impede UI oferecer
intervalo maior mediante páginas. P1 C-CAUSE-009 omite resumo decisório;
C-CAUSE-051 pode republicar depois do corte. TO_BE aplica DEC-001/009/013 e
O06.

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

  **Tipo/origem:** Texto, gestor

  **Obrigatório e default:** Sim ao cadastrar

  **Validação/unidade:** 2–100 caracteres

  **Ajuda e exemplo:** “Plantão noturno.”

- **Campo:** Início padrão

  **Tipo/origem:** Hora local, gestor

  **Obrigatório e default:** Sim no tipo, vazio

  **Validação/unidade:** HH:mm real válido, não só regex

  **Ajuda e exemplo:** “19:00 no fuso da residência.”

- **Campo:** Duração/fim padrão

  **Tipo/origem:** Minutos + fim calculado

  **Obrigatório e default:** Sim, 15–1440 min herdados

  **Validação/unidade:** Fim depois do início; indicar dia seguinte

  **Ajuda e exemplo:** “19:00 → 07:00 do dia seguinte.”

- **Campo:** Profissional

  **Tipo/origem:** Pessoa vinculada elegível

  **Obrigatório e default:** Sim na série

  **Validação/unidade:** Sem impor presença; recusa conflito entre pacientes
  sem revelar outro

  **Ajuda e exemplo:** “Ana Exemplo.”

- **Campo:** Fuso

  **Tipo/origem:** Zona IANA do paciente

  **Obrigatório e default:** Sim, escolha configurada

  **Validação/unidade:** Não herdar silenciosamente fuso do aparelho

  **Ajuda e exemplo:** Ex.: America/Sao_Paulo.

- **Campo:** Período

  **Tipo/origem:** Datas início/fim inclusivas

  **Obrigatório e default:** Sim

  **Validação/unidade:** Prévia da série até limite vigente; >30 dias
  permitido

  **Ajuda e exemplo:** “01/11 a 15/12.”

- **Campo:** Dias selecionados

  **Tipo/origem:** Multi-seleção por calendário/lista

  **Obrigatório e default:** Se avulsa múltipla

  **Validação/unidade:** Datas únicas; navegação entre meses preserva seleção

  **Ajuda e exemplo:** Mostrar “12 dias selecionados em dois meses”.

- **Campo:** Recorrência

  **Tipo/origem:** Avulsa/semanal/ciclo

  **Obrigatório e default:** Sim, escolha explícita

  **Validação/unidade:** Weekly usa dias da semana; ciclo usa
  âncora/trabalho/descanso

  **Ajuda e exemplo:** 12×36, 24×48, 24×24 conforme contrato atual.

- **Campo:** Dias da semana

  **Tipo/origem:** Checkboxes

  **Obrigatório e default:** Na recorrência semanal

  **Validação/unidade:** 0–6 únicos, pelo menos um

  **Ajuda e exemplo:** “Segunda e quinta.”

- **Campo:** Âncora e até

  **Tipo/origem:** Datas locais

  **Obrigatório e default:** No ciclo

  **Validação/unidade:** Consistência com janela, limite de 366 dias preservado

  **Ajuda e exemplo:** Não recalcular ocorrências passadas por mudança
  posterior.

- **Campo:** Exceções/feriados

  **Tipo/origem:** Datas e ação explícita

  **Obrigatório e default:** Opcional, nenhuma

  **Validação/unidade:** Feriado não cancela sozinho;
  manter/substituir/cancelar escolhido

  **Ajuda e exemplo:** Não inferir calendário externo sem configuração.

- **Campo:** Escopo de alteração

  **Tipo/origem:** Este plantão/futuros/série

  **Obrigatório e default:** Sim ao alterar

  **Validação/unidade:** Não afetar fatos passados; corte mostrado

  **Ajuda e exemplo:** “Somente o plantão de 06/11.”

- **Campo:** Motivo/notas

  **Tipo/origem:** Texto do ator

  **Obrigatório e default:** Motivo em decisão/troca/corte; notas opcionais

  **Validação/unidade:** Motivo 3–1000, notas até 2000

  **Ajuda e exemplo:** “Substituição combinada antes do turno.”

- **Campo:** Antes/depois e efeito BAL

  **Tipo/origem:** Projeção autorizada do servidor

  **Obrigatório e default:** Sim antes da decisão

  **Validação/unidade:** Pessoa, datas, offset, versão, atribuição
  atual/proposta

  **Ajuda e exemplo:** “BAL continuará com Ana” ou “exige decisão familiar”.

<!-- c-table:end -->

## Jornada e regras temporais

Configurar tipo → selecionar pessoa e datas → montar prévia completa →
resolver
conflitos → propor/publicar conforme capacidade. Prévia inclui cada
ocorrência,
intervalo local com offset e UTC técnico, exclusões e quantidade de plantões.
Ler períodos longos por páginas determinísticas sem truncar silenciosamente
aos
42 dias do endpoint. Usuário não precisa repetir o mesmo horário em cada dia.

Horário atravessando meia-noite conserva data de início e de fim. Horas locais
inexistentes/ambíguas por mudança de fuso exigem escolha/recusa explícita e
offset na prévia; não somar 24h UTC supondo todo dia local igual. Alteração de
fuso/configuração é prospectiva e não modifica instantes já publicados.
Feriado só altera escala se houver exceção deliberada. Não há check-in ou
prova
de presença. Recebedor sugerido para ENT é editável conforme DEC-028.

Proposta pendente não muda agenda. Decisão exige versão e validade atual de
série/ocorrência; encerrar série torna incompatível aprovar linhas após corte.
Pode exigir nova proposta para parte anterior ainda válida, sem republicação
silenciosa. Substituição no mesmo horário conserva janela BAL; deslocar janela
com BAL exige decisão familiar própria. Mostrar essas consequências antes do
P1-confirmador e garantir que o payload aplicado é a versão vista.

## Estados, recuperação e aceite

Carregar mês não mostra lista vazia enquanto consulta; Mês no celular mostra
intervalo de mês ou muda o seletor explicitamente para a vista possível.
Escolhas em outro mês permanecem visíveis no resumo. Conflito mantém seleção
e antes/depois, sem aprovar versão nova automaticamente. Resposta perdida
recupera a mesma proposta/série por intenção; não duplica ocorrências. Sessão
revogada ou pessoa inativa é recusada no servidor após espera relevante.

Eventos registram proponente, aprovador, versão anterior, exceções e
instantes;
avisos internos apontam novo responsável sem afirmar comparecimento. Histórico
mostra diferença humana, não JSON. Provas D: escolher 12 dias em 45 dias sem
redigitar horários; publicar noturno 19–07; tratar conflito multipaciente sem
vazar nome; aprovar proposta encerrada não republica; troca mostra efeito BAL;
duas sessões decidem uma versão uma única vez. Pessoas validam resumo em
celular, teclado e AT; não há aceite físico já realizado nesta C.
