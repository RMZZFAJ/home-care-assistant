# DOC-05 — Comparar exemplar e assinatura

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Escolha de PDF e verificação de exemplar; digest, assinatura e confiança têm
resultados distintos.

Finalidade: Comparar exemplar e assinatura.

Pessoa com arquivo/referência; processamento não conserva conteúdo por padrão
nem concede acesso ao documento privado.

AS_IS/rota: Comparar arquivo, novo controle do verificador.

## 4–14. Campos, modos de interação e validação

Resultados são calculados/verificados; não são inputs para o usuário escolher
Coincide ou Confiável.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-149-01 — Arquivo a verificar

**Modo/componente:** EDITABLE / FILE_PICKER.

**Quando/ator:** Escolha de novo exemplar reinicia resultados; arquivo não é
executado nem retido por padrão.

**Obrigatoriedade/inicial:** Para comparar exemplar.

**Máscara/apresentação:** Seletor de arquivo com MIME/tamanho permitido antes
do envio; nome legível, progresso e recuperação por tentativa. Autocomplete:
off.

**Validação:** Limite explícito; hash sem executar conteúdo; não conservar
upload por padrão; Escolha de novo exemplar reinicia resultados; arquivo não é
executado nem retido por padrão.

**Ajuda/exemplo:** “Selecione o arquivo que deseja comparar.”

**Mensagem e condição:** “Confira o formato e o limite de arquivo indicados.
Se já iniciou um envio sem resultado, consulte aquela tentativa antes de
escolher outro arquivo.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-152-01 — Resultado da comparação

**Modo/componente:** CALCULATED / CALCULATED_DESCRIPTION.

**Quando/ator:** Resultado derivado dos fatos/valores apresentados; sem edição
manual.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Resultados separados de bytes, assinatura e
confiança, sem input. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Resultado derivado dos
fatos/valores apresentados; sem edição manual.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Resultado da
comparação”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-C7-008 — Assinatura e cadeia de confiança

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

**Ajuda/exemplo:** Não equivaler a assinatura pessoal ou fato físico

**Mensagem e condição:** “Não foi possível carregar a informação “Assinatura e
cadeia de confiança”. Atualize esta seção. O dado registrado não pode ser
alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Escolher arquivo permitido → progresso → bytes coincidem/divergem → assinatura
íntegra/alterada → cadeia conhecida/desconhecida → orientação.

Referência mínima, escolha de exemplar e resultados separados de
bytes/assinatura/confiança; limites em texto junto ao resultado.

Primária: **Verificar este exemplar**. Secundárias: Escolher outro arquivo;
Voltar.

Efeito: Comparação não conserva conteúdo por padrão nem assina de novo.

Sucesso/resultado: “Verificação concluída. Consulte separadamente a comparação
de bytes, a assinatura e a confiança da cadeia.”

Vazio/inelegível: “Selecione o exemplar PDF que deseja comparar. Consultar o
QR sozinho não compara o arquivo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem referência confiável, informar sem referência; sem serviço, indisponível.
Nenhum deles permite afirmar arquivo falso, bytes coincidentes ou cadeia
confiável.

Sem referência ou serviço indisponível não vira falso. Resultado anterior
identificado não é atribuído a novo arquivo; seleção nova reinicia a
verificação.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna; nomes de arquivo quebram linha; instruções e resultados não
dependem de QR/cor/hover.

Resultado calculado anunciado como status e headings; sem input de confiança,
execução do PDF ou detalhes privados no nome acessível.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: docs/verifyPdf. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR painel de resultados; digest coincidente não atesta presença
física, autoria pessoal ou conclusão jurídica.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-013;C-AC-015;C-AC-023;C-AC-034;C-AC-036;C-AC-046;C-AC-063;C-AC-071;C-AC-100;C-AC-101;C-AC-102;C-AC-103;C-AC-104;C-AC-105;C-AC-106;C-AC-107;C-AC-108;C-AC-109;C-AC-110;C-AC-111;C-AC-119;C-NEW-AC-017;C-NEW-AC-018;C-NEW-AC-019;C-NEW-AC-020;C-NEW-AC-023;C7-AC-002;C7-AC-011;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-018.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
