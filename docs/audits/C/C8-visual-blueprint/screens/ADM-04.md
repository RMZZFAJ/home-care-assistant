# ADM-04 — Decidir proposta administrativa

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Decisão de proposta congelada com tipo reconhecido; proponente e aprovador são
identidades distintas quando exigido.

Finalidade: Decidir proposta administrativa.

Aprovador local competente; trocar perfil na mesma conta não cria segunda
identidade.

AS_IS/rota: Diálogo de proposta/override, atual a alterar.

## 4–14. Campos, modos de interação e validação

Capacidade e política propostas são comparação tipada em leitura; não são
comboboxes editáveis na aprovação.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-160-01 — Proposta

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

**Mensagem e condição:** “Não foi possível carregar a informação “Proposta”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-160-02 — Versão da proposta

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

**Mensagem e condição:** “Não foi possível carregar a informação “Versão da
proposta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-161-01 — Motivo da alteração/decisão

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Motivo da decisão é próprio; motivo e conteúdo originais
permanecem em leitura.

**Obrigatoriedade/inicial:** Quando ação crítica.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 onde contrato herdado; Motivo da decisão é próprio;
motivo e conteúdo originais permanecem em leitura.

**Ajuda/exemplo:** “Por que esta permissão precisa mudar?”

**Mensagem e condição:** “Confira motivo da alteração/decisão e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-162-01 — Capacidade proposta

**Modo/componente:** READ_ONLY / CAPABILITY_COMPARISON.

**Quando/ator:** Capacidade proposta congelada e antes/depois por
pessoa/alcance.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Capacidade proposta
congelada e antes/depois por pessoa/alcance.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Capacidade
proposta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-162-02 — Política proposta

**Modo/componente:** READ_ONLY / POLICY_COMPARISON.

**Quando/ator:** Política proposta tipada; nenhum JSON ou seletor para editar
na aprovação.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Política proposta
tipada; nenhum JSON ou seletor para editar na aprovação.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Política
proposta”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Proponente/alvo → atual/proposto/alcance → consequências e dependências →
motivo da decisão → aprovar ou rejeitar.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Aprovar proposta exibida**. Secundárias: Rejeitar com motivo;
Voltar.

Efeito: Mesmo ID/versão exibidos, sem autoaprovação por troca de perfil.

Sucesso/resultado: “Decisão registrada sobre os valores exibidos. Consulte o
estado vigente após a decisão.”

Vazio/inelegível: “Não há proposta pendente elegível para esta decisão.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem presenter conhecido, alvo/versão e valores atuais/propostos confiáveis,
não aprovar. Mostrar indisponibilidade e encaminhamento seguro, sem JSON como
substituto da decisão.

409 conserva diálogo/intenção e mostra diferença; tipo desconhecido oferece
encaminhamento, nunca botão de aprovação de JSON bruto.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Empilhar Atual e Proposto por atributo, preservando rótulos; motivo da decisão
abaixo da comparação, ações sem sobreposição.

Cabeçalhos e diferenças em texto; não depender de cor; proposta em leitura não
recebe validação de input; confirmação mantém a versão revista.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

RECONSTRUIR presenters para todos os tipos permitidos; impedir edição da
proposta pelo aprovador.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-005;C-AC-011;C-AC-013;C-AC-014;C-AC-016;C-AC-018;C-AC-019;C-AC-020;C-AC-024;C-AC-026;C-AC-033;C-AC-037;C-AC-038;C-AC-059;C-AC-060;C-AC-061;C-AC-071;C-AC-075;C-AC-078;C-AC-079;C-AC-085;C-AC-095;C-AC-099;C-AC-121;C-NEW-AC-015;C-NEW-AC-016;C7-AC-005;C7-AC-006;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-021;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
