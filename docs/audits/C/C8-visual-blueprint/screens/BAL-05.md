# BAL-05 — Decidir adiamento

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Solicitação de adiamento ou decisão familiar sobre proposta congelada;
aprovação/recusa/obsolescência distintas.

Finalidade: Decidir adiamento.

Solicitante prepara alvo permitido; aprovador familiar decide proposta
existente sem editar destino, prazo ou versão durante a aprovação.

AS_IS/rota: Adiamento e decisão, atual a alterar.

## 4–14. Campos, modos de interação e validação

Na decisão, alvo original/proposto e datas; motivo original também em leitura.
Motivo da decisão é informação própria.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-053-01 — Destino do adiamento

**Modo/componente:** EDITABLE_SUBFORM /
TARGET_SELECTOR_OR_READ_ONLY_COMPARISON.

**Quando/ator:** Só SOLICITAR; ao APROVAR/RECUSAR/ENCERRAR, destino da
proposta é READ_ONLY.

**Obrigatoriedade/inicial:** Sim ao solicitar.

**Máscara/apresentação:** Plantão de destino com pessoa, datas, horários e
fuso; na aprovação, comparação congelada. Autocomplete: off.

**Validação:** Versão de alvo e prazo exibidos; Só SOLICITAR; ao
APROVAR/RECUSAR/ENCERRAR, destino da proposta é READ_ONLY.

**Ajuda/exemplo:** Proposta pendente não altera obrigação.

**Mensagem e condição:** “Escolha uma opção válida para destino do adiamento
no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-055-01 — Motivo da decisão

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim em adiamento/reconto/configuração.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Explicar efeito e próxima pessoa.

**Mensagem e condição:** “Confira motivo da decisão e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Prazo atual/autor/motivo → destino e prazo propostos → impacto no BAL →
aprovar, recusar ou encerrar obsoleta.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Aprovar adiamento exibido**. Secundárias: Recusar; Encerrar pedido
obsoleto; Voltar.

Efeito: Prazo só muda na decisão válida.

Sucesso/resultado: “Decisão de adiamento registrada. O prazo só mudou se a
aprovação do alvo ainda válido foi confirmada.”

Vazio/inelegível: “Não há pedido de adiamento vigente neste alvo.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Alvo mudado bloqueia aprovação antiga, mas permite recusa/encerramento
obsoleto motivado. Não abandonar pedido em pendência impossível.

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

Referência do protótipo: bal. Sem captura real ou aceite humano de interface
futura nesta C.

RECONSTRUIR decisão por estado para impedir edição da proposta ao aprová-la.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-008;C-AC-009;C-AC-010;C-AC-015;C-AC-051;C-AC-054;C-AC-056;C-AC-057;C-AC-074;C-AC-077;C-AC-086;C-AC-089;C-AC-104;C-NEW-AC-007;C-NEW-AC-011;C-NEW-AC-012;C-NEW-AC-015;C7-AC-003;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-024.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
