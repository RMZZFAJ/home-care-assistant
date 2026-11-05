# GUI-02 — Preparar nova residência

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Preparação de residência em sete etapas, com tarefas delegadas apenas no
escopo local legítimo.

Finalidade: Preparar nova residência.

Somente administrador global cria/prepara nova residência; familiar pode
executar tarefa local convidada, nunca criar residência global.

AS_IS/rota: Roteiro da primeira residência, novo processo.

## 4–14. Campos, modos de interação e validação

Identidades já criadas, estado de cada tarefa e SCI-005 invariável. Sem
fixtures reais ou certificado/contrato fictício.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-174-01 — Titular

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** P05/P13, sem default fictício.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Deve existir antes do uso real; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não “monitorar depois” sem responsável.

**Mensagem e condição:** “Escolha uma opção válida para titular no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-174-02 — Substituto

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** P05/P13, sem default fictício.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Deve existir antes do uso real; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não “monitorar depois” sem responsável.

**Mensagem e condição:** “Escolha uma opção válida para substituto no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-174-03 — Prazo de resposta

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** P05/P13, sem default fictício.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** Deve existir antes do uso real; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não “monitorar depois” sem responsável.

**Mensagem e condição:** “Confira prazo de resposta e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-004 — Mostrar guia no primeiro acesso

**Modo/componente:** EDITABLE / CHECKBOX_OR_SWITCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Escolha administrativa explícita sobre mostrar
guia; usuário pode pular/reabrir no perfil.

**Máscara/apresentação:** Escolha booleana com rótulo de efeito; vazio não
equivale a concordância. Autocomplete: off.

**Validação:** Configuração por administração autorizada; usuário pode reabrir
no perfil; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Escolha explícita no cadastro/vínculo; sem mudar permissões

**Mensagem e condição:** “Escolha uma opção válida para mostrar guia no
primeiro acesso no escopo desta tarefa. Se a opção necessária não estiver
disponível, volte ou procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-009 — Paciente e residência

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Cadastro global: nome 2–160 e estado explícito;
edição existente traz valores atuais sem fixtures.

**Máscara/apresentação:** Nome da residência/paciente com 2–160 caracteres;
estado de cadastro em escolha própria no passo. Autocomplete: off.

**Validação:** Nome2–160 e estado escolhido respeitado; sem fixtures em
operação; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Nova residência somente pelo global

**Mensagem e condição:** “Confira paciente e residência e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-010 — Fuso da residência

**Modo/componente:** EDITABLE / SEARCHABLE_TIMEZONE.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Zona IANA explicitamente escolhida para a
residência; sem herança silenciosa do aparelho.

**Máscara/apresentação:** Nome da zona IANA, por exemplo America/Sao_Paulo;
offset do período quando relevante. Autocomplete: off.

**Validação:** Zona IANA escolhida; não herdar do aparelho; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** America/Sao_Paulo

**Mensagem e condição:** “Escolha o fuso de referência da tarefa. O fuso do
aparelho não será adotado silenciosamente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-011 — Administrador familiar inicial

**Modo/componente:** EDITABLE / EMAIL_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** E-mail de titular do primeiro vínculo;
confirmação/aceite pessoal pelo Auth; global não marca confirmado pelo
titular.

**Máscara/apresentação:** Endereço de e-mail completo, sem autocapitalização
ou autocorreção; confirmação de titularidade separada. Autocomplete: email.

**Validação:** E-mail confirmado explicitamente e vínculo inicial autorizado;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Global não recebe capacidade operacional por criar

**Mensagem e condição:** “Confira o endereço de e-mail completo. A confirmação
da conta é uma etapa separada.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-012 — Equipe a vincular

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Pessoas explicitamente selecionadas/convites
emitidos; nenhum vínculo aceito em nome do convidado.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Pessoas/credenciais individuais e convites com aceite pessoal;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Sem contas compartilhadas

**Mensagem e condição:** “Escolha uma opção válida para equipe a vincular no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-013 — Materiais e apresentações

**Modo/componente:** EDITABLE / MULTISELECT_SEARCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Catálogo inicialmente vazio; adoção de modelo por
seleção explícita, sem copiar saldos.

**Máscara/apresentação:** Busca e lista de escolhas explícitas; cada
selecionado tem nome, unidade e ação Remover. Autocomplete: off.

**Validação:** Adotar modelo explicitamente; unidades/fatores preservados;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Catálogo começa sem dados de outro paciente

**Mensagem e condição:** “Escolha uma opção válida para materiais e
apresentações no escopo desta tarefa. Se a opção necessária não estiver
disponível, volte ou procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-014 — Saldo físico inicial por custódia

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Quantidade física declarada quando abertura de
estoque for registrada; vazio nunca vira saldo fictício.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Origem/motivo/quantidade reais; movimento próprio de abertura;
Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não criar contagens passadas fictícias

**Mensagem e condição:** “Informe saldo físico inicial por custódia na unidade
indicada e com a precisão permitida. O campo precisa de correção antes de
confirmar.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-015 — Escalas e regime BAL

**Modo/componente:** READ_ONLY_WITH_LINK / CONFIGURATION_SUMMARY.

**Quando/ator:** Resumo das escalas/BAL já configurados; Preparar abre o
subfluxo autorizado, nunca um editor de texto deste resumo.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Resumo rotulado de plantões, fuso e regime BAL;
links para os subfluxos autorizados. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Resumo das escalas/BAL
já configurados; Preparar abre o subfluxo autorizado, nunca um editor de texto
deste resumo.

**Ajuda/exemplo:** Preparar escalas ou BAL abre o formulário próprio. Este
resumo não recebe texto para modificar a configuração.

**Mensagem e condição:** “Não foi possível carregar a informação “Escalas e
regime BAL”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-C7-016 — Comunicação e contingência

**Modo/componente:** READ_ONLY_WITH_LINK / CONFIGURATION_SUMMARY.

**Quando/ator:** Resumo das regras e pendências; Configurar abre seção própria
e não permite desligar SCI-005.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Resumo de ciência, avisos e contingência com
pendências identificadas; links por capacidade. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Resumo das regras e
pendências; Configurar abre seção própria e não permite desligar SCI-005.

**Ajuda/exemplo:** Abra a seção correspondente para configurar o que for
elegível. SCI-005 permanece obrigatória e pendências externas não equivalem a
homologação.

**Mensagem e condição:** “Não foi possível carregar a informação “Comunicação
e contingência”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Paciente/fuso → admin inicial → equipe → catálogo → saldos reais por custódia
→ escalas/BAL → ciência/comunicação/contingência → checklist final.

Navegação de sete etapas com checklist do que foi realmente registrado; resumo
de tarefas locais delegadas e pendências externas separado.

Primária: **Continuar preparação**. Secundárias: Salvar e retomar; Revisar
etapa; Abrir tarefa local autorizada.

Efeito: Setup não é homologação ou autorização de produção.

Sucesso/resultado: “Etapa de preparação salva. O checklist não libera produção
nem substitui os gates de homologação.”

Vazio/inelegível: “Nenhuma preparação disponível neste escopo. Só a
administração global inicia uma residência.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Etapa confirmada não é repetida quando etapa seguinte falha; apresentar
resultado individual e retomar a mesma preparação. Não criar duas residências
por resposta perdida.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna por etapa, Voltar/Salvar e retomar/Continuar com contexto;
checklist final não é modal extenso incompreensível.

Passo atual e estados de tarefa anunciados; erro retorna ao campo editável
correto; criação global não é exposta à família por atalho visual.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: setup. Sem captura real ou aceite humano de interface
futura nesta C.

NOVO WIZARD APROVADO: sete etapas com fronteira global/local e retomada por
tarefa.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-002;C-AC-003;C-AC-004;C-AC-006;C-AC-007;C-AC-008;C-AC-040;C-AC-062;C-AC-063;C-AC-112;C-AC-114;C-AC-115;C-AC-117;C-AC-118;C-AC-119;C-AC-120;C-AC-121;C-NEW-AC-026;C-NEW-AC-027;C7-AC-002;C7-AC-006;C7-AC-007;C7-AC-008;C7-AC-009;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-021;C-FINAL-AC-026.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
