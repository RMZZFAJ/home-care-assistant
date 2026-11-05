# ESC-02 — Preparar série de plantões

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Configuração de tipo e preparação de série são subformulários distintos;
prévia não publica.

Finalidade: Preparar série de plantões.

Gestor publica ou profissional propõe apenas conforme capacidade; tipo ativo e
pessoa elegível no paciente.

AS_IS/rota: Tipo e série, atuais a ampliar.

## 4–14. Campos, modos de interação e validação

Fim calculado a partir de início+duração, com +1 dia; escolher uma base de
edição e não permitir duração/fim contraditórios.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-056-01 — Nome do tipo

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Só no subformulário Cadastrar/editar tipo; não
confundir com criar série.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** 2–100 caracteres; Somente no subestado de preparação autorizado
indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Plantão noturno.”

**Mensagem e condição:** “Confira nome do tipo e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-057-01 — Início padrão

**Modo/componente:** EDITABLE / TIME_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim no tipo, vazio.

**Máscara/apresentação:** Horário inicial HH:mm no fuso do tipo de plantão;
duração determina término com data explícita. Autocomplete: off.

**Validação:** HH:mm real válido, não só regex; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “19:00 no fuso da residência.”

**Mensagem e condição:** “Informe um horário válido e confira a data de
término, inclusive quando houver virada de dia.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-058-01 — Duração em minutos

**Modo/componente:** EDITABLE_SUBFORM / INTEGER_NUMBER_INPUT.

**Quando/ator:** Cadastro de tipo: duração inteira é base única da edição; fim
calculado.

**Obrigatoriedade/inicial:** Sim, 15–1440 min herdados.

**Máscara/apresentação:** Inteiro de minutos, com término resultante exibido;
nunca entrada de horário HH:mm. Autocomplete: off.

**Validação:** Inteiro de 15 a 1440 minutos segundo contrato atual; fim
calculado a partir do início e fuso; Cadastro de tipo: duração inteira é base
única da edição; fim calculado.

**Ajuda/exemplo:** “19:00 → 07:00 do dia seguinte.”

**Mensagem e condição:** “Informe um número inteiro permitido para duração em
minutos; confira o intervalo indicado junto ao campo.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-058-02 — Fim padrão

**Modo/componente:** CALCULATED / LOCAL_END_WITH_DAY_OFFSET.

**Quando/ator:** Início padrão + duração; mostrar data final/+1 dia, não
segundo input contraditório.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Início padrão + duração;
mostrar data final/+1 dia, não segundo input contraditório.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Fim padrão”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-059-01 — Profissional

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim na série.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Sem impor presença; recusa conflito entre pacientes sem revelar
outro; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Ana Exemplo.”

**Mensagem e condição:** “Escolha uma opção válida para profissional no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-060-01 — Fuso

**Modo/componente:** EDITABLE / SEARCHABLE_TIMEZONE.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, escolha configurada.

**Máscara/apresentação:** Nome da zona IANA, por exemplo America/Sao_Paulo;
offset do período quando relevante. Autocomplete: off.

**Validação:** Não herdar silenciosamente fuso do aparelho; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Ex.: America/Sao_Paulo.

**Mensagem e condição:** “Escolha o fuso de referência da tarefa. O fuso do
aparelho não será adotado silenciosamente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-061-01 — Data inicial

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Prévia da série até limite vigente; >30 dias permitido; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** “01/11 a 15/12.”

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-061-02 — Data final

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Prévia da série até limite vigente; >30 dias permitido; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** “01/11 a 15/12.”

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-062-01 — Dias selecionados

**Modo/componente:** EDITABLE / MULTI_DATE_CALENDAR_WITH_LIST.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Se avulsa múltipla.

**Máscara/apresentação:** Calendário de seleção múltipla e alternativa por
lista DD/MM/AAAA; seleções de vários meses preservadas. Autocomplete: off.

**Validação:** Datas únicas; navegação entre meses preserva seleção; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** Escolha dias em vários meses. A lista de datas selecionadas
permanece visível e permite remover um dia por vez.

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-063-01 — Recorrência

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, escolha explícita.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Weekly usa dias da semana; ciclo usa âncora/trabalho/descanso;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** 12×36, 24×48, 24×24 conforme contrato atual.

**Mensagem e condição:** “Escolha uma opção válida para recorrência no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-064-01 — Dias da semana

**Modo/componente:** EDITABLE / WEEKDAY_CHECKBOX_GROUP.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Na recorrência semanal: ao menos um dia
explicitamente selecionado.

**Máscara/apresentação:** Sete dias da semana nomeados em grupo; seleção por
teclado, sem abreviação ambígua. Autocomplete: off.

**Validação:** 0–6 únicos, pelo menos um; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Segunda e quinta.”

**Mensagem e condição:** “Escolha uma opção válida para dias da semana no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-065-01 — Data âncora

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** No ciclo.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Consistência com janela, limite de 366 dias preservado; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** Não recalcular ocorrências passadas por mudança posterior.

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-065-02 — Válido até

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** No ciclo.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Consistência com janela, limite de 366 dias preservado; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** Não recalcular ocorrências passadas por mudança posterior.

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-066-01 — Data da exceção

**Modo/componente:** EDITABLE / DATE_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcional, nenhuma.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Feriado não cancela sozinho; manter/substituir/cancelar
escolhido; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não inferir calendário externo sem configuração.

**Mensagem e condição:** “Confira a data e o período desta tarefa. A data
final deve respeitar o início e o alcance apresentados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-066-02 — Ação da exceção

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcional, nenhuma.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Feriado não cancela sozinho; manter/substituir/cancelar
escolhido; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não inferir calendário externo sem configuração.

**Mensagem e condição:** “Escolha uma opção válida para ação da exceção no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-068-01 — Motivo do comando atual

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Motivo próprio de proposta/corte/decisão conforme
estado; obrigatório em rejeição e mudanças que exigem motivo.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres quando exigido; nunca reescreve o motivo do
proponente; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Substituição combinada antes do turno.”

**Mensagem e condição:** “Confira motivo do comando atual e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-068-02 — Notas da programação

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcionais até 2000 na preparação; somente leitura
ao decidir a proposta.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Notas não são motivo de rejeição e não são editadas pelo
aprovador; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Substituição combinada antes do turno.”

**Mensagem e condição:** “Confira notas da programação e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Tipo/padrão de horário → pessoa/fuso → período e recorrência → exceções →
prévia de TODAS as ocorrências → propor/publicar.

Formulário agrupado em pessoa/tipo, período/recorrência, exceções e prévia;
antes/depois e impacto BAL ficam perto da confirmação.

Primária: **Ver prévia da série**. Secundárias: Salvar padrão; Voltar;
Publicar após revisão.

Efeito: Prévia zero efeito, publicação só com autoridade e datas corretas.

Sucesso/resultado: “Prévia preparada. Confira pessoas, datas, exceções e
conflitos antes de propor ou publicar a série.”

Vazio/inelegível: “Nenhuma ocorrência resulta das escolhas. Revise período,
dias da semana ou ciclo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Conflito conserva escolhas de vários meses; erro do tipo não publica série
parcial. Horário local ambíguo/inexistente pede resolução explícita.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna e prévia em lista de ocorrências; início/fim com datas/+1 dia e
fuso; resumo de datas de vários meses sempre reconsultável.

Calendário tem alternativa textual; horários ambíguos pedem escolha explícita;
conflitos são descritos sem expor outro paciente.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: schedule/newSchedule. Sem captura real ou aceite
humano de interface futura nesta C.

RECONSTRUIR formulário e prévia quando exigir repetir 19–07 em cada dia ou
aceitar horas só por regex.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-009;C-AC-013;C-AC-039;C-AC-051;C-AC-057;C-AC-086;C-NEW-AC-011;C-NEW-AC-015;C-NEW-AC-021;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
