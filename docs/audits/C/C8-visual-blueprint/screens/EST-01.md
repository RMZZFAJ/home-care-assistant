# EST-01 — Consultar estoques

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta por custódia autorizada; confirmado, trânsito e previsão são
grandezas distintas.

Finalidade: Consultar estoques.

Capacidade de leitura da custódia; equipe não vê saldo familiar geral por
seleção de filtro.

AS_IS/rota: /estoque, atual a alterar.

## 4–14. Campos, modos de interação e validação

Todos os saldos e totais; nenhum saldo é input editável. Inativo com saldo
permanece na custódia verdadeira.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-070-01 — Custódia consultada

**Modo/componente:** FILTER / AUTHORIZED_CUSTODY_FILTER.

**Quando/ator:** Apenas consulta no escopo permitido; não altera documento,
movimento ou autoridade.

**Obrigatoriedade/inicial:** Sem restrição adicional inicialmente, salvo
filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria
zero ou estado material.

**Máscara/apresentação:** Somente custódias consultáveis com nome humano;
limpar filtro conserva o escopo autorizado. Autocomplete: off.

**Validação:** Filtro tipado da seção/tarefa, com valores permitidos e escopo
autorizados; não aceitar um enum universal para processos distintos; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** “Disponível na equipe”, não “Estoque total” indiscriminado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Custódia permitida → busca/filtros → saldo com unidade/frescor →
trânsito/previsão separados → origem ou movimento autorizado.

Cards de custódia, previsão separada, filtros e lista detalhada; movimentos em
painel independente do saldo.

Primária: **Abrir material**. Secundárias: Atualizar; Filtrar custódia; Ver
trânsito.

Efeito: Consulta não movimenta.

Sucesso/resultado: “Estoque consultado. Previsões e materiais em trânsito não
foram somados ao disponível.”

Vazio/inelegível: “Nenhum material corresponde aos filtros. Isso não altera o
estoque; limpe a busca para consultar o conjunto permitido.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Falha no histórico não apaga saldo válido; marcar última atualização e isolar
a falha. Resposta de outro paciente é descartada.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cartões de material com cada custódia rotulada; nunca deixar ação/quantidade
fora da tela por largura mínima de tabela.

Saldo com unidade e data de consulta; cores de inativo/trânsito têm texto;
filtro limita somente custódias autorizadas.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: stock. Sem captura real ou aceite humano de interface
futura nesta C.

EVOLUIR cards aprovados e separar dados/restrições por custódia; lista móvel
não exige rolagem global.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-010;C-AC-021;C-AC-022;C-AC-045;C-AC-046;C-AC-053;C-AC-066;C-AC-068;C-AC-072;C-AC-074;C-AC-120;C-NEW-AC-008;C-NEW-AC-009;C-NEW-AC-015;C-NEW-AC-023;C-NEW-AC-025;C7-AC-010;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
