# COM-04 — Encerrar expectativa remanescente

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Encerramento da expectativa restante; pode haver parcelas físicas ainda
aguardando conferência.

Finalidade: Encerrar expectativa remanescente.

Responsável familiar autorizado; quantidade dispensável calculada pelo
servidor na versão revista.

AS_IS/rota: Diálogo de encerramento inferior, novo.

## 4–14. Campos, modos de interação e validação

Restante a dispensar e parcelas pendentes. Não aceitar digitar uma baixa de
material fictício para fechar a conta.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-025-01 — Não será adquirido

**Modo/componente:** CALCULATED / QUANTITY_WITH_UNIT.

**Quando/ator:** Restante dispensável calculado na versão exibida; não é input
de baixa.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Quantidade decimal exata com unidade e precisão da
origem, sem input. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Restante dispensável
calculado na versão exibida; não é input de baixa.

**Ajuda/exemplo:** Resultado calculado a partir dos fatos desta tarefa,
apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.

**Mensagem e condição:** “Não foi possível carregar a informação “Não será
adquirido”. Atualize esta seção. O dado registrado não pode ser alterado
aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-026-01 — Motivo de encerramento

**Modo/componente:** EDITABLE / TEXTAREA.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Sim no fechamento.

**Máscara/apresentação:** Texto com quebras de linha; limite e contador do
campo visíveis, sem máscara de seleção. Autocomplete: off.

**Validação:** 3–1000, proposta técnica de limite herdado; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** “Decidimos encerrar com as 2 unidades já validadas.”

**Mensagem e condição:** “Confira motivo de encerramento e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-027-01 — Concordância com resumo

**Modo/componente:** EDITABLE / EXPLICIT_UNCHECKED_CONFIRMATION.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Se confirmação de resumo adotada: desmarcada e
escolha pessoal explícita; botão explica o efeito.

**Máscara/apresentação:** Caixa inicialmente desmarcada com declaração e
resumo dos efeitos; sem aceite pelo simples avanço. Autocomplete: off.

**Validação:** Versão do resumo deve ser a aplicada; Somente no subestado de
preparação autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** “Concluir com quantidade menor.”

**Mensagem e condição:** “Escolha uma opção válida para concordância com
resumo no escopo desta tarefa. Se a opção necessária não estiver disponível,
volte ou procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Previsto/validado/pendente físico → expectativa dispensável calculada → motivo
→ concordância explícita com o resumo → encerrar expectativa.

Diálogo rotulado curto com identidade-alvo, efeito e ações específicas; não
reaproveitar formulário de criação.

Primária: **Confirmar encerramento da expectativa**. Secundárias: Manter
restante; Voltar.

Efeito: Dispensa previsão; não recebe8 inexistentes.

Sucesso/resultado: “Expectativa restante encerrada, sem entrada ou baixa de
material. Parcelas que ainda aguardam conferência continuam pendentes.”

Vazio/inelegível: “Não existe expectativa restante elegível para encerrar
nesta versão.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Sem cálculo confiável de expectativa e parcelas, não dispensar restante.
Atualizar o resumo; não aceitar uma quantidade digitada para substituir
cálculo indisponível.

Nova parcela ou mudança de versão invalida a revisão; mostrar novo cálculo e
pedir decisão nova. Nunca marcar conclusão física enquanto houver parcela
pendente.

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

Referência do protótipo: com/comPartial. Sem captura real ou aceite humano de
interface futura nesta C.

RECONSTRUIR confirmação por linha e dimensão física; P14 não é atalho de
crédito.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-015;C-AC-028;C-AC-035;C-AC-044;C-AC-058;C-AC-074;C-AC-077;C-AC-089;C-AC-109;C-NEW-AC-005;C-NEW-AC-022;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
