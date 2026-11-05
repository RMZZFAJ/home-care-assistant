# ARQ-02 — Recuperar ou abandonar envio

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Tentativa existente incerta/incompleta; pronto, rejeitado, abandonado e
expirado são resultados terminais distintos.

Finalidade: Recuperar ou abandonar envio.

Titular/ator competente da reserva no alvo autorizado; abandono não concede
exclusão de arquivo pronto.

AS_IS/rota: Recuperar/abandonar, novo contrato.

## 4–14. Campos, modos de interação e validação

Arquivo e fingerprint, resultado, bytes já prontos e histórico. Esta tela não
é novo file picker.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-122-01 — Tentativa

**Modo/componente:** INTERNAL / NO_USER_CONTROL.

**Quando/ator:** Dado de comando/transporte; nunca input ou identificador
técnico exigido ao usuário.

**Obrigatoriedade/inicial:** Não renderizar controle.

**Máscara/apresentação:** NÃO APLICÁVEL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Somente contrato interno, com validação no servidor; não expor
segredo/UUID como decisão do usuário.

**Ajuda/exemplo:** Campo de arquivo bloqueado enquanto resultado for incerto.

**Acessibilidade:** Não inserir campo escondido na ordem de foco, texto
acessível ou mensagem para o usuário comum.

### CTRL-123-01 — Estado da reserva

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

**Mensagem e condição:** “Não foi possível carregar a informação “Estado da
reserva”. Atualize esta seção. O dado registrado não pode ser alterado aqui.”
— SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Arquivo/tentativa em leitura → última etapa conhecida → consultar resultado →
retomar ou abandonar somente quando elegível.

Diálogo rotulado curto com identidade-alvo, efeito e ações específicas; não
reaproveitar formulário de criação.

Primária: **Consultar esta tentativa**. Secundárias: Retomar; Abandonar
reserva elegível; Voltar.

Efeito: Abandono não apaga ready nem documento emitido.

Sucesso/resultado: “Resultado da tentativa consultado. Se o arquivo já está
pronto, use o registro existente.”

Vazio/inelegível: “Não foi encontrada uma tentativa acessível nesta
referência. Volte aos anexos do documento.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Finalize concorrente prevalece como pronto e impede abandono destrutivo.
Incerto exige consulta; não afirmar arquivo perdido ou criar upload duplicado.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Largura disponível; conteúdo longo vira página/painel rolável com título e
ações alcançáveis; nenhuma confirmação fora da tela.

Foco inicial no título/resumo seguro; trap no diálogo; Escape/Voltar não
decide e devolve foco ao acionador.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

NOVO RECUPERADOR: distinguir consulta, retomada e abandono sem recriar
identidade da tentativa.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-017;C-AC-032;C-AC-052;C-AC-070;C-AC-080;C-AC-107;C-AC-110;C-AC-116;C-NEW-AC-013;C-NEW-AC-014;C-NEW-AC-019;C7-AC-004;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
