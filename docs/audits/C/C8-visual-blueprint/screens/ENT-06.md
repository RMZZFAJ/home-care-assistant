# ENT-06 — Encaminhar exceção e sucessão

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Exceção documentada ou tarefa futura sem pessoa apta; não há confirmação
pessoal por substituição.

Finalidade: Encaminhar exceção e sucessão.

Família/admin local com capacidade de regularizar ou redesignar; suporte
apenas trata sua fronteira técnica.

AS_IS/rota: Sucessão/exceção administrativa, novo painel.

## 4–14. Campos, modos de interação e validação

Nome/autoria da pessoa original, aceites e fatos passados. Troca futura não
altera quem recebeu no passado.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-032-01 — Justificativa de troca

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Se mudar destinatário fora da sugestão ou depois
da preparação.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000; versão/instante preservados; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Outro profissional receberá os materiais.”

**Mensagem e condição:** “Confira justificativa de troca e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-042-01 — Motivo de exceção

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim ao encerrar administrativamente.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Não admite caixa “recebi por outra pessoa”; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Não foi possível obter a declaração pessoal.”

**Mensagem e condição:** “Confira motivo de exceção e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C7-017 — Motivo e base da regularização

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Motivo/base da regularização obrigatórios; pessoa
e fato conhecidos ou desconhecidos explicitamente separados.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** Fato, motivo excepcional, autoridade, medidas, ressalvas e
evidências; Somente no subestado de preparação autorizado indicado na ficha;
resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Sem inventar declaração pessoal

**Mensagem e condição:** “Confira motivo e base da regularização e o limite
indicado. Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Fatos conhecidos/desconhecidos → atos anteriores em leitura → tarefa
futura/autoridade → motivo/prova → encaminhamento e conferência proporcional.

Seções de fato, pessoas, prova e conciliação com referências históricas ao
lado; desconhecidos visíveis antes de concluir.

Primária: **Registrar encaminhamento**. Secundárias: Revogar agora; Designar
tarefa futura; Ver origem.

Efeito: Encerramento administrativo não afirma aceite pessoal.

Sucesso/resultado: “Encaminhamento registrado com sua autoria. Isso não
declara recebimento em nome de outra pessoa.”

Vazio/inelegível: “Nenhuma exceção foi selecionada. Abra a entrega ou tarefa
que precisa de regularização.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Ausência de prova permanece desconhecida; manter pendência com próximo
responsável. Revogação urgente não fica bloqueada pela regularização.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna por ordem cronológica; datas/fuso próximos; prova com descrição e
alternativa textual; resumo antes da decisão.

Agrupar fatos conhecidos/desconhecidos; anexos têm estado próprio; revisão
proporcional não solicita assinatura em nome de pessoa ausente.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: staff/staffDetails. Sem captura real ou aceite humano
de interface futura nesta C.

NOVO PAINEL: distinguir encerramento administrativo de recebimento pessoal e
preservar a história.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-028;C-AC-042;C-AC-043;C-AC-044;C-AC-048;C-AC-050;C-AC-074;C-AC-077;C-AC-079;C-AC-089;C-AC-096;C-AC-101;C-AC-103;C-AC-105;C-NEW-AC-006;C-NEW-AC-007;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-016;C-NEW-AC-022;C-NEW-AC-028;C7-AC-002;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
