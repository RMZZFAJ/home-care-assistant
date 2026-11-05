# ADM-06 — Mais ações e retorno seguro

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Navegação Mais ou recuperação de URL inexistente; destino depende da sessão e
do acesso atual.

Finalidade: Mais ações e retorno seguro.

Autenticado vê destinos permitidos; visitante recebe entrada/ajuda públicas
sem enumerar contexto privado.

AS_IS/rota: /mais e fallback 404, atual e novo tratamento.

## 4–14. Campos, modos de interação e validação

Nenhum campo material. Lista de destinos não é menu de autorização e não
altera paciente por parâmetro inseguro.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

Não há campo de negócio digitável nesta tarefa; navegação/instrução seguem as
ações abaixo.

## 15–18. Hierarquia, ações, consequências e mensagens

Título e contexto → destinos por tarefa → Voltar ao início permitido ou Entrar
→ retorno seguro.

Destinos agrupados por tarefa e escopo; página não encontrada tem main, título
e rota de retorno permitida.

Primária: **Voltar ao início permitido**. Secundárias: Entrar; Buscar ajuda.

Efeito: Navegação mantém contexto autorizado.

Sucesso/resultado: “Destino autorizado aberto. Continue pela tarefa
escolhida.”

Vazio/inelegível: “Página não encontrada. Confira o endereço ou volte ao
início permitido.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Depois de revogação, não redirecionar em loop à página protegida. Retornar à
seleção/entrada legítima com foco no título.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Lista/grade touch de nomes completos; Mais alcança todos os destinos
permitidos fora da barra inferior.

Links com nomes distintos, foco visível e retorno seguro; identidade/paciente
do cabeçalho não desaparecem em navegação móvel.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

EVOLUIR navegação completa móvel e 404 em português, mantendo main/título e
retorno seguro.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-005;C-AC-011;C-AC-013;C-AC-014;C-AC-016;C-AC-018;C-AC-019;C-AC-020;C-AC-024;C-AC-026;C-AC-033;C-AC-037;C-AC-038;C-AC-059;C-AC-060;C-AC-061;C-AC-071;C-AC-075;C-AC-078;C-AC-079;C-AC-085;C-AC-095;C-AC-099;C-AC-121;C-NEW-AC-015;C-NEW-AC-016;C7-AC-005;C7-AC-006;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
