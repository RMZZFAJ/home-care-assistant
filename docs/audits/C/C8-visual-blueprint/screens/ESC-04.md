# ESC-04 — Alterar ocorrência ou série

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Preparação de alteração de ocorrência, futuras ou série; decisão posterior
separada quando exigida.

Finalidade: Alterar ocorrência ou série.

Gestor/proponente no alcance autorizado; escolha explícita de escopo e motivo
para mudanças críticas.

AS_IS/rota: Substituição/exceção/corte, atual a alterar.

## 4–14. Campos, modos de interação e validação

Fatos passados e intervalos já ocorridos. Fuso publicado não é reinterpretação
retroativa; mudança futura tem prévia própria.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

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

**Modo/componente:** EDITABLE_SUBFORM / SEARCHABLE_TIMEZONE.

**Quando/ator:** Somente alteração futura explicitamente autorizada, com
prévia; instantes publicados não são reinterpretados.

**Obrigatoriedade/inicial:** Sim, escolha configurada.

**Máscara/apresentação:** Nome da zona IANA, por exemplo America/Sao_Paulo;
offset do período quando relevante. Autocomplete: off.

**Validação:** Não herdar silenciosamente fuso do aparelho; Somente alteração
futura explicitamente autorizada, com prévia; instantes publicados não são
reinterpretados.

**Ajuda/exemplo:** Ex.: America/Sao_Paulo.

**Mensagem e condição:** “Escolha o fuso de referência da tarefa. O fuso do
aparelho não será adotado silenciosamente.” —
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

### CTRL-067-01 — Escopo de alteração

**Modo/componente:** EDITABLE / RADIO_OR_SELECT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao alterar.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Não afetar fatos passados; corte mostrado; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** “Somente o plantão de 06/11.”

**Mensagem e condição:** “Escolha uma opção válida para escopo de alteração no
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

Plantão/série original → escopo → alteração de pessoa/horário ou exceção →
corte e efeito BAL → revisar proposta.

Formulário agrupado em pessoa/tipo, período/recorrência, exceções e prévia;
antes/depois e impacto BAL ficam perto da confirmação.

Primária: **Revisar alteração**. Secundárias: Cancelar ocorrência; Encerrar
série; Voltar.

Efeito: Altera só escopo escolhido e conserva passados.

Sucesso/resultado: “Alteração preparada para revisão. Plantões passados e
exceções fora do alcance escolhido foram preservados.”

Vazio/inelegível: “Nenhum plantão elegível no alcance escolhido. Revise o
corte ou consulte a série original.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Troca sem mudança de horário conserva janela BAL; mudança de janela exige
decisão pertinente. Incerto consulta mesma intenção antes de alterar escopo.

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

Referência do protótipo: schedule. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR alcance/corte se botões genéricos puderem alterar toda a série sem
prévia.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-009;C-AC-013;C-AC-039;C-AC-051;C-AC-057;C-AC-086;C-NEW-AC-011;C-NEW-AC-015;C-NEW-AC-021;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
