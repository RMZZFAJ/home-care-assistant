# CAT-03 — Gerir apresentações

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Cadastro/edição de apresentação por material; fator novo vale para novas
escolhas.

Finalidade: Gerir apresentações.

Gestor de catálogo no paciente; material/unidade base autorizados.

AS_IS/rota: Apresentações no material, novo percurso de consulta.

## 4–14. Campos, modos de interação e validação

Histórico de equivalências já usado. Código de barras é texto com zeros, não
um material selecionado em combobox.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-089-01 — Nome da apresentação

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao cadastrar, vazio.

**Máscara/apresentação:** Texto legível sem máscara artificial;
contador/limite específico junto ao campo. Autocomplete: off.

**Validação:** 2–160 quando usado; referência à base; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Pacote com 10 unidades.”

**Mensagem e condição:** “Confira nome da apresentação e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-090-01 — Código de barras

**Modo/componente:** EDITABLE / BARCODE_TEXT_WITH_SCAN.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Opcional se seleção manual; obrigatório ao
associar scan.

**Máscara/apresentação:** Código textual com zeros iniciais preservados;
câmera opcional e alternativa manual; nunca converter para número.
Autocomplete: off.

**Validação:** Preservar zeros; formato/check digit aplicável; unicidade
conforme catálogo; Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Não tratar código desconhecido como produto autorizado.

**Mensagem e condição:** “Confira o código completo, incluindo os zeros
iniciais, ou selecione o material manualmente.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-091-01 — Fator base

**Modo/componente:** EDITABLE / DECIMAL_TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Quantidade textual exata com unidade; vírgula/ponto,
inputmode decimal e precisão explícita antes da coerção. Autocomplete: off.

**Validação:** Finito, positivo, até 6 casas e equivalência válida;
NaN/Infinity recusados também RPC; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “1 pacote = 10 unidades.”

**Mensagem e condição:** “Informe fator base na unidade indicada e com a
precisão permitida. O campo precisa de correção antes de confirmar.” —
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

**Validação:** Busca de apresentação do material autorizado por nome/código
textual; datas em DD/MM/AAAA na apresentação e limites de consulta validados;
manter filtros ao voltar.

**Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
Limpe a busca para voltar ao conjunto autorizado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Material/base em leitura → nome da apresentação → código textual → fator →
equivalência humana → salvar.

Busca/lista com identidade selecionada e editor em drawer; cabeçalho do editor
fixa alvo e escopo antes dos campos.

Primária: **Salvar apresentação**. Secundárias: Nova apresentação; Voltar; Ver
uso.

Efeito: Fator novo não muda snapshot passado.

Sucesso/resultado: “Apresentação salva. Documentos anteriores mantêm o fator e
a equivalência registrados na emissão.”

Vazio/inelegível: “Este material ainda não tem apresentações. Cadastre uma ou
use sua unidade base.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Código já associado mostra referência autorizada; fator inválido é recusado
sem arredondar. Não converter valores de documentos passados.

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

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

EVOLUIR consulta/edição; corrigir tipo do código e validar fator original
também no contrato RPC planejado.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-026;C-AC-028;C-AC-029;C-AC-044;C-AC-045;C-AC-067;C-AC-081;C-NEW-AC-008;C-NEW-AC-022;C-NEW-AC-024;C-NEW-AC-025;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
