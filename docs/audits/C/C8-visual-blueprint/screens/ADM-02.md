# ADM-02 — Administrar recursos autorizados

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Hub de administração local ou global explicitamente identificado; editor
depende da seção e do alvo.

Finalidade: Administrar recursos autorizados.

Admin local só seu paciente; conta global gere recursos globais autorizados.
Identidade de terceiros é uma ação global, nunca Meu perfil.

AS_IS/rota: /admin seções atuais.

## 4–14. Campos, modos de interação e validação

Escopo e identidade-alvo; campos de criação global ficam ocultos à família.
Nome do paciente é texto, não seleção arbitrária de ID.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-153-01 — Paciente

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da residência/paciente do contexto autorizado,
sem UUID digitável. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Confira a residência desta tarefa. Trocar contexto é uma
ação separada e exige acesso autorizado.

**Mensagem e condição:** “Não foi possível carregar a informação “Paciente”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-153-02 — Modo de atuação

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Modo de
atuação”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-154-01 — Nome do paciente

**Modo/componente:** EDITABLE_SUBFORM / TEXT_INPUT.

**Quando/ator:** Cadastro/edição de nome apenas no escopo administrativo
competente.

**Obrigatoriedade/inicial:** Sim ao cadastrar.

**Máscara/apresentação:** Nome da residência/paciente, 2–160 caracteres; texto
sem seleção de opções predefinidas. Autocomplete: off.

**Validação:** Nome de paciente com 2–160 caracteres; escopo/autoridade
conferidos no comando; Cadastro/edição de nome apenas no escopo administrativo
competente.

**Ajuda/exemplo:** Ambiente fictício não vira operação por renomear paciente.

**Mensagem e condição:** “Confira nome do paciente e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-154-02 — Estado ativo

**Modo/componente:** EDITABLE / CHECKBOX_OR_SWITCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao cadastrar.

**Máscara/apresentação:** Escolha booleana com rótulo de efeito; vazio não
equivale a concordância. Autocomplete: off.

**Validação:** Estado ativo booleano explícito respeitado; false não pode ser
ignorado. isDevelopment não é permissão; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Ambiente fictício não vira operação por renomear paciente.

**Mensagem e condição:** “Escolha uma opção válida para estado ativo no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-155-01 — Administrador inicial

**Modo/componente:** EDITABLE_SUBFORM / EMAIL_INPUT.

**Quando/ator:** Só criação GLOBAL da residência; titular confirma o
convite/conta pelo Auth.

**Obrigatoriedade/inicial:** Sim na criação com primeiro vínculo.

**Máscara/apresentação:** Endereço de e-mail completo, sem autocapitalização
ou autocorreção; confirmação de titularidade separada. Autocomplete: email.

**Validação:** Autoridade de criação global não substitui vínculo operacional;
Só criação GLOBAL da residência; titular confirma o convite/conta pelo Auth.

**Ajuda/exemplo:** “Quem administrará esta residência?”

**Mensagem e condição:** “Confira o endereço de e-mail completo. A confirmação
da conta é uma etapa separada.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-156-01 — Seção

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** Rótulo “Catálogo do paciente” difere de “Unidades”.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-156-02 — Buscar

**Modo/componente:** FILTER / SEARCH_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Termo textual de busca no conjunto autorizado;
Limpar remove o filtro, sem alterar registros. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** Digite um termo de busca na seção atual. Buscar não altera
recursos nem troca paciente.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-01 — Estado

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-02 — Tipo

**Modo/componente:** FILTER / RADIO_OR_SELECT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Opções do domínio rotuladas; escolha material
explícita, sem concordância presumida. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-03 — Data inicial

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-04 — Data final

**Modo/componente:** FILTER / DATE_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Data DD/MM/AAAA na apresentação, sem conversão
silenciosa de fuso; limites do período visíveis. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-157-05 — Responsável

**Modo/componente:** FILTER / SEARCHABLE_COMBOBOX.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Pendentes sob minha responsabilidade.”

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-158-01 — Referência direta

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Referência
direta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-159-01 — Página

**Modo/componente:** CALCULATED / CALCULATED_DESCRIPTION.

**Quando/ator:** Resultado derivado dos fatos/valores apresentados; sem edição
manual.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Resultado derivado dos
fatos/valores apresentados; sem edição manual.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Página”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-159-02 — Cursor

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Não rotular 100 recentes como todos.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-159-03 — Total consultado

**Modo/componente:** CALCULATED / CALCULATED_DESCRIPTION.

**Quando/ator:** Resultado derivado dos fatos/valores apresentados; sem edição
manual.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Resultado derivado dos
fatos/valores apresentados; sem edição manual.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Total
consultado”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Escopo/seção → busca/lista → alvo fixo → campos tipados e permissões → revisão
de impacto → salvar/propor conforme governança.

Busca/lista com identidade selecionada e editor em drawer; cabeçalho do editor
fixa alvo e escopo antes dos campos.

Primária: **Abrir seção autorizada**. Secundárias: Buscar; Convidar; Abrir
preparação se global.

Efeito: Cada ação respeita escopo real; isActive=false não é ignorado.

Sucesso/resultado: “Operação administrativa registrada no escopo apresentado.
Consulte se há aprovação de outra identidade pendente.”

Vazio/inelegível: “Nenhum recurso corresponde à seção e busca atuais. Use
somente as ações de cadastro autorizadas neste escopo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Conflito mantém alvo e proposta; conta global não é editada pelo fluxo de
vínculo local. Criar inativo respeita false ou recusa antes do commit.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Lista → editor em página/painel; voltar preserva busca e seleção; formulário
de uma coluna com labels completos.

Editar e criar têm nomes próprios; foco retorna ao item salvo; conflito
preserva editor e identidade-alvo sem seleção silenciosa de outra pessoa.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: staff/setup. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR escopos/presenters se o hub tratar toda edição como permissão
global ou cadastro de paciente pela família.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-005;C-AC-011;C-AC-013;C-AC-014;C-AC-016;C-AC-018;C-AC-019;C-AC-020;C-AC-024;C-AC-026;C-AC-033;C-AC-037;C-AC-038;C-AC-059;C-AC-060;C-AC-061;C-AC-071;C-AC-075;C-AC-078;C-AC-079;C-AC-085;C-AC-095;C-AC-099;C-AC-121;C-NEW-AC-015;C-NEW-AC-016;C7-AC-005;C7-AC-006;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019;C-FINAL-AC-021;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
