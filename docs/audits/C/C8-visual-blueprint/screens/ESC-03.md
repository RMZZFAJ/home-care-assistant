# ESC-03 — Decidir alteração de plantão

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Proposta existente em revisão; aprovação aplica exatamente o conteúdo
apresentado ou retorna conflito.

Finalidade: Decidir alteração de plantão.

Aprovador competente diferente quando a governança exigir. Contexto e payload
propostos vêm do servidor.

AS_IS/rota: Proposta e decisão, atual a corrigir.

## 4–14. Campos, modos de interação e validação

Fuso, notas da proposta, profissional, horários e antes/depois. Somente motivo
da decisão, quando exigido, é editável; corrigir proposta exige outro fluxo.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-060-01 — Fuso

**Modo/componente:** READ_ONLY / TIMEZONE_DESCRIPTION.

**Quando/ator:** Fuso da proposta congelada; correção exige proposta própria.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome da zona IANA e horário/offset da proposta ou
período selecionado. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Fuso da proposta
congelada; correção exige proposta própria.

**Ajuda/exemplo:** Fuso de referência dos horários exibidos; não muda porque
seu aparelho usa outro fuso.

**Mensagem e condição:** “Não foi possível carregar a informação “Fuso”.
Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-068-01 — Motivo do comando atual

**Modo/componente:** EDITABLE_SUBFORM / TEXTAREA.

**Quando/ator:** Motivo PRÓPRIO da decisão; obrigatório na rejeição conforme
comando, nunca substitui motivo do proponente.

**Obrigatoriedade/inicial:** Motivo próprio de proposta/corte/decisão conforme
estado; obrigatório em rejeição e mudanças que exigem motivo.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000 caracteres quando exigido; nunca reescreve o motivo do
proponente; Motivo PRÓPRIO da decisão; obrigatório na rejeição conforme
comando, nunca substitui motivo do proponente.

**Ajuda/exemplo:** “Substituição combinada antes do turno.”

**Mensagem e condição:** “Confira motivo do comando atual e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-068-02 — Notas da programação

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Notas da proposta apresentada; aprovador não as reescreve.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Texto histórico completo ou comparação rotulada, com
quebras de linha. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Notas da proposta
apresentada; aprovador não as reescreve.

**Ajuda/exemplo:** Informação registrada no ato de origem. Não pode ser
reescrita nesta consulta ou decisão.

**Mensagem e condição:** “Não foi possível carregar a informação “Notas da
programação”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-069-01 — Antes/depois e efeito BAL

**Modo/componente:** READ_ONLY / TEXT_VALUE.

**Quando/ator:** Consulta do valor de origem; mudanças só no processo
legitimamente responsável.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Comparação Atual/Proposto por pessoa, datas,
horários, fuso e efeito BAL. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Consulta do valor de
origem; mudanças só no processo legitimamente responsável.

**Ajuda/exemplo:** Atual: Juliana, 19h de 06/11 a 7h de 07/11. Proposto:
Sheila, mesmo intervalo. O prazo BAL permanece; se a janela mudar, mostre a
decisão necessária.

**Mensagem e condição:** “Não foi possível carregar a informação “Antes/depois
e efeito BAL”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Proponente/motivo → pessoa e plantão atuais/propostos → fuso/datas/offset →
alcance e efeito BAL → aprovar ou rejeitar.

Comparação Atual/Proposto lado a lado com mesmas linhas, autor/motivo/alcance
acima e consequências antes das ações.

Primária: **Aprovar proposta exibida**. Secundárias: Rejeitar; Voltar.

Efeito: Aplica exatamente versão apresentada ou conflita.

Sucesso/resultado: “Decisão registrada sobre a proposta exibida. Confira quais
plantões foram efetivamente alterados.”

Vazio/inelegível: “Esta proposta já foi decidida ou não está mais disponível
para aprovação. Consulte o resultado atual.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem comparação completa e efeito BAL compreensível, não aprovar.
Versão/corte/kind desconhecido bloqueia aplicação; encaminhar ou encerrar
proposta obsoleta conforme comando autorizado.

Série encerrada ou versão alterada impede republicar. Manter comparação,
informar conflito e permitir encerrar/rejeitar proposta obsoleta
legitimamente.

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

Referência do protótipo: schedule/shift. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR presenter decisório: fuso/notas não são parâmetros editáveis ao
aprovar; JSON não é resumo humano.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-009;C-AC-013;C-AC-039;C-AC-051;C-AC-057;C-AC-086;C-NEW-AC-011;C-NEW-AC-015;C-NEW-AC-021;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-013.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
