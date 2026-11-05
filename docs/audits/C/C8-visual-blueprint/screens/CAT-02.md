# CAT-02 — Consultar unidades e precisão

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Consulta de unidades/precisão; novo cadastro ou edição somente quando o uso
histórico permitir.

Finalidade: Consultar unidades e precisão.

Leitor consulta; gestor cadastra unidade. Unidade usada não é reinterpretada
para mudar documentos ou saldos.

AS_IS/rota: /unidades, atual a preservar.

## 4–14. Campos, modos de interação e validação

Unidade e precisão em uso; valor numérico de precisão é inteiro de 0 a 6, não
texto decimal livre.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-083-01 — Unidade base

**Modo/componente:** READ_ONLY / UNIT_DESCRIPTION.

**Quando/ator:** Identidade da unidade selecionada; nome/código/dimensão de
novo cadastro têm campos próprios; unidade usada não é reinterpretada.

**Obrigatoriedade/inicial:** Valor emitido, proposto ou calculado da fonte
identificada; ausência explicitamente informada, sem valor inventado.

**Máscara/apresentação:** Nome completo e unidade da origem, com quebra de
linha sem corte. Autocomplete: NÃO APLICÁVEL.

**Validação:** Revalidar acesso, referência e estado na leitura/ação. Não
solicitar ao usuário correção deste valor nesta tela. Identidade da unidade
selecionada; nome/código/dimensão de novo cadastro têm campos próprios;
unidade usada não é reinterpretada.

**Ajuda/exemplo:** Identificação do item registrado. A consulta não substitui
o material ou reinterpreta sua unidade.

**Mensagem e condição:** “Não foi possível carregar a informação “Unidade
base”. Atualize esta seção. O dado registrado não pode ser alterado aqui.” —
SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

### CTRL-084-01 — Precisão

**Modo/componente:** EDITABLE_SUBFORM / INTEGER_SELECT_0_6.

**Quando/ator:** Precisão inteira 0–6 apenas quando cadastro/uso permitir;
depois READ_ONLY.

**Obrigatoriedade/inicial:** Sim.

**Máscara/apresentação:** Inteiro entre 0 e 6; explicar quantas casas decimais
a unidade admite. Autocomplete: off.

**Validação:** 0–6; proteger história; Precisão inteira 0–6 apenas quando
cadastro/uso permitir; depois READ_ONLY.

**Ajuda/exemplo:** Quantidade inválida é recusada, não arredondada.

**Mensagem e condição:** “Informe um número inteiro permitido para precisão;
confira o intervalo indicado junto ao campo.” —
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

**Validação:** Busca por nome/código de unidade no âmbito autorizado; datas em
DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao
voltar.

**Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
Limpe a busca para voltar ao conjunto autorizado.

**Mensagem e condição:** “Confira o filtro e o período indicados. A consulta
pode ser atualizada sem alterar nenhum registro.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-007 — Nome da unidade

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Somente novo cadastro autorizado; obrigatório e
vazio.

**Máscara/apresentação:** Nome textual da unidade, 2–80 caracteres, sem
máscara artificial. Autocomplete: off.

**Validação:** 2–80 caracteres conforme /api/units; unidade usada não é
renomeada para reinterpretar fatos; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Use um nome compreensível, por exemplo Unidade. Confira se
a unidade já existe antes de cadastrar.

**Mensagem e condição:** “Confira nome da unidade e o limite indicado. Corrija
somente esta informação; os demais valores preenchidos foram preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-008 — Código da unidade

**Modo/componente:** EDITABLE / TEXT_INPUT.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Somente novo cadastro autorizado; obrigatório e
vazio.

**Máscara/apresentação:** Código textual de 1–30 caracteres, por exemplo un;
preservar texto e zeros, sem máscara numérica. Autocomplete: off.

**Validação:** 1–30 caracteres conforme /api/units; código textual preservado
e unicidade pelo contrato; não é código de barras do material; Somente no
subestado de preparação autorizado indicado na ficha; resumo/decisão posterior
é leitura.

**Ajuda/exemplo:** Código curto da unidade, por exemplo un. Não use um código
de embalagem como unidade base.

**Mensagem e condição:** “Confira código da unidade e o limite indicado.
Corrija somente esta informação; os demais valores preenchidos foram
preservados.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-009 — Dimensão da unidade

**Modo/componente:** EDITABLE / RADIO_GROUP.

**Quando/ator:** Somente no subestado de preparação autorizado indicado na
ficha; resumo/decisão posterior é leitura.

**Obrigatoriedade/inicial:** Novo cadastro; escolha explícita sem conversão de
unidade histórica.

**Máscara/apresentação:** Quatro escolhas nomeadas: Contagem, Volume, Massa,
Embalagem; sem dimensão preaceita. Autocomplete: off.

**Validação:** Contagem, volume, massa ou embalagem conforme enum atual; não
converter dimensões incompatíveis; Somente no subestado de preparação
autorizado indicado na ficha; resumo/decisão posterior é leitura.

**Ajuda/exemplo:** Escolha a natureza da unidade. Um fator de embalagem não
autoriza converter massa em volume.

**Mensagem e condição:** “Escolha uma opção válida para dimensão da unidade no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

### CTRL-C8-010 — Âmbito da unidade

**Modo/componente:** EDITABLE_SUBFORM / AUTHORIZED_SCOPE_SELECT.

**Quando/ator:** Somente criação de unidade: global apenas por autoridade
global; gestor local só no paciente autorizado.

**Obrigatoriedade/inicial:** Só criação: opções retornadas pela autoridade
global/local; não editar depois pelo valor do browser.

**Máscara/apresentação:** Âmbitos Global/Paciente nomeados, somente quando a
autoridade do servidor permitir; sem edição posterior pelo browser.
Autocomplete: off.

**Validação:** Global somente por autoridade global; paciente somente no
contexto autorizado; não derive permissão do ID; Somente criação de unidade:
global apenas por autoridade global; gestor local só no paciente autorizado.

**Ajuda/exemplo:** Confira se a unidade será do paciente ou global. Só
aparecem os âmbitos que você pode administrar.

**Mensagem e condição:** “Escolha uma opção válida para âmbito da unidade no
escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou
procure a administração responsável.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Label visível, ajuda/erro associados, required antes do
envio, aria-invalid só quando inválido; resumo leva ao input editável correto.

## 15–18. Hierarquia, ações, consequências e mensagens

Unidades/símbolos/precisão → consultar uso → novo cadastro permitido →
nome/símbolo/precisão → salvar.

Busca/lista com identidade selecionada e editor em drawer; cabeçalho do editor
fixa alvo e escopo antes dos campos.

Primária: **Salvar unidade permitida**. Secundárias: Consultar uso; Voltar.

Efeito: Não reinterpretar unidade usada.

Sucesso/resultado: “Unidade permitida salva. Registros históricos continuam
com suas unidades e precisões originais.”

Vazio/inelegível: “Nenhuma unidade corresponde à busca. Consulte as existentes
antes de cadastrar outra.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Uso concorrente impede alteração incompatível e conserva formulário; oferecer
nova unidade identificada, sem converter histórico.

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

EVOLUIR cadastro e consulta de uso; corrigir unidade/precisão que apareciam
como edição irrestrita.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-026;C-AC-028;C-AC-029;C-AC-044;C-AC-045;C-AC-067;C-AC-081;C-NEW-AC-008;C-NEW-AC-022;C-NEW-AC-024;C-NEW-AC-025;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-019.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
