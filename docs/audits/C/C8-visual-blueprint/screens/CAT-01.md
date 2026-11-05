# CAT-01 — Gerir catálogo local

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta/cadastro/edição local e inativação; versão e uso histórico delimitam
edição.

Finalidade: Gerir catálogo local.

Gestor catalog.manage do paciente; não editar catálogo de outra residência ou
identidade global sem capacidade.

AS_IS/rota: /admin seção catálogo, atual a alterar.

## 4–14. Campos, modos de interação e validação

Identidade e unidade já usada, quando imutável. Saldo ao inativar é
informação; transferir exige abrir intenção EST-04 separada.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-081-01 — Nome

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim, vazio.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** 2–160 caracteres, texto longo deve caber em tela/PDF; Somente
no subestado de preparação autorizado indicado na ficha; resumo/decisão
posterior é leitura.

**Ajuda/exemplo:** “Compressa Exemplo.”

**Mensagem e condição:** “Confira nome e o limite indicado. Corrija somente
esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-082-01 — Categoria

**Modo/componente:** EDITABLE / SEARCHABLE_COMBOBOX.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Busca por nome/alias e seleção de resultado
autorizado; nenhum identificador técnico digitado. Autocomplete: off.

**Validação:** Medicamentos/higiene/dieta atuais; sem categoria inferida pelo
nome; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Seleção pronta com rótulo humano.

**Mensagem e condição:** “Escolha uma opção válida para categoria no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-083-01 — Unidade base

**Modo/componente:** EDITABLE_SUBFORM / UNIT_SELECTOR_OR_READ_ONLY_UNIT.

**Quando/ator:** Cadastro sem uso; quando houver uso histórico é READ_ONLY e a
alteração incompatível é recusada.

**Obrigatoriedade/inicial:** Sim antes de movimentar.

**Máscara/apresentação:** Nome, código textual e precisão da unidade
permitida; unidade histórica em leitura quando já usada. Autocomplete: off.

**Validação:** Não reinterpretar produto com história; Cadastro sem uso;
quando houver uso histórico é READ_ONLY e a alteração incompatível é recusada.

**Ajuda/exemplo:** “unidade”, com casas 0 ou precisão permitida.

**Mensagem e condição:** “Escolha uma opção válida para unidade base no escopo
desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-085-01 — Aliases

**Modo/componente:** EDITABLE / ALIAS_TOKEN_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não, vazia.

**Máscara/apresentação:** Um alias textual por item, com adicionar/remover;
preservar texto e não confundir alias com código de barras. Autocomplete: off.

**Validação:** Até 30 nomes, 1–160 caracteres, sem duplicata vazia; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Adicione cada nome alternativo como item separado, por
exemplo Fralda G; remover um alias é escolha explícita.

**Mensagem e condição:** “Confira aliases e o limite indicado. Corrija somente
esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-086-01 — Descrição

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Descrição opcional até 2000 caracteres; não herda a regra
numérica da ordem; Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não muda unidade/custódia.

**Mensagem e condição:** “Confira descrição e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-086-02 — Ordem

**Modo/componente:** EDITABLE / INTEGER_NUMBER_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Não.

**Máscara/apresentação:** Inteiro sem frações; inputmode numeric e
unidade/intervalo específicos junto ao campo. Autocomplete: off.

**Validação:** Ordem inteira de 0 a 1000000 segundo contrato herdado; não usar
textarea; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não muda unidade/custódia.

**Mensagem e condição:** “Informe um número inteiro permitido para ordem;
confira o intervalo indicado junto ao campo.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-087-01 — Ativo

**Modo/componente:** EDITABLE / CHECKBOX_OR_SWITCH.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Escolha explícita.

**Máscara/apresentação:** Escolha booleana com rótulo de efeito; vazio não
equivale a concordância. Autocomplete: off.

**Validação:** Saldo positivo permitido sob inativação; Somente no subestado
de preparação autorizado indicado na ficha; resumo/decisão posterior é
leitura.

**Ajuda/exemplo:** “Inativo: saldo e histórico serão mantidos.”

**Mensagem e condição:** “Escolha uma opção válida para ativo no escopo desta
tarefa. Se a opção necessária não estiver disponível, volte ou procure a
administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-088-01 — Destino do saldo da equipe

**Modo/componente:** READ_ONLY_WITH_LINK / CUSTODY_NOTICE_AND_LINK.

**Quando/ator:** Inativar conserva saldo; iniciar transferência abre EST-04
com intenção separada.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Descrição rotulada do registro específico, sem
input, identificador de transporte ou valor inventado. Autocomplete: NÃO
APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Inativar conserva saldo;
iniciar transferência abre EST-04 com intenção separada.

**Ajuda/exemplo:** Informação do registro indicado, somente para consulta
nesta etapa. Ausência de dado histórico permanece explicitamente identificada.

**Mensagem e condição:** “Não foi possível carregar a informação “Destino do
saldo da equipe”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-094-01 — Justificativa de alias/inativação

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Ao resolver duplicata/alteração relevante.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Proposta 3–1000 com evento e autoria; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não somar saldos silenciosamente.

**Mensagem e condição:** “Confira justificativa de alias/inativação e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-006 — Buscar no conjunto autorizado

**Modo/componente:** FILTER / SEARCH_INPUT.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Termo textual de busca no conjunto autorizado;
Limpar remove o filtro, sem alterar registros. Autocomplete: off.

**Validação:** Busca por material/alias no catálogo local; ativo/inativo
permanece estado do cadastro, sem movimento; datas em DD/MM/AAAA na
apresentação e limites de consulta validados; manter filtros ao voltar.

**Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
Limpe a busca para voltar ao conjunto autorizado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Busca/lista → material fixo em edição → nome/categoria/aliases → unidade
quando permitida → estado → resumo e salvar.

Busca/lista com identidade selecionada e editor em drawer; cabeçalho do editor
fixa alvo e escopo antes dos campos.

Primária: **Salvar material**. Secundárias: Inativar; Reativar; Adotar modelo;
Ver apresentações.

Efeito: Identidade histórica preservada; flag não move saldo.

Sucesso/resultado: “Material salvo no catálogo deste paciente. Inativação não
movimenta nem apaga saldos ou histórico.”

Vazio/inelegível: “O catálogo deste paciente está vazio. Cadastre material ou
adote explicitamente um modelo permitido.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Colisão/confusão de identidade mantém edição e abre comparação; não fundir
saldos. Resposta perdida consulta a mesma alteração.

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

Referência do protótipo: stock. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR lista/drawer; retirar transferência automática ou obrigatória do
formulário de inativação.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-026;C-AC-028;C-AC-029;C-AC-044;C-AC-045;C-AC-067;C-AC-081;C-NEW-AC-008;C-NEW-AC-022;C-NEW-AC-024;C-NEW-AC-025;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
