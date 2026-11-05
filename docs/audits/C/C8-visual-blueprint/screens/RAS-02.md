# RAS-02 — Comparar edições concorrentes

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Save concorrente obsoleto entre duas edições privadas; nenhuma decisão
material se funde automaticamente.

Finalidade: Comparar edições concorrentes.

Mesmo titular no mesmo escopo; acesso e versões-base revalidados antes de
salvar revisão.

AS_IS/rota: Conflito entre aparelhos, novo diálogo.

## 4–14. Campos, modos de interação e validação

Versões, autores de sessão e instantes; nunca selecionar um lado como
autorização para confirmar ato operacional.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-130-01 — Escolha de conflito

**Modo/componente:** EXPLICIT_ACTION / COMPARISON_ACTIONS.

**Quando/ator:** Escolher abrir versão do servidor ou revisar meus campos;
novo save CAS ocorre no formulário.

**Obrigatoriedade/inicial:** Sem concordância material inicial ou clique
automático.

**Máscara/apresentação:** Botão/ação com nome de consequência; sem campo
textual de aceite. Autocomplete: NÃO APLICÁVEL.

**Validação:** Novo compare-and-swap; nenhuma fusão automática de decisão;
Escolher abrir versão do servidor ou revisar meus campos; novo save CAS ocorre
no formulário.

**Ajuda/exemplo:** Comparar campos, autor e instantes.

**Mensagem e condição:** “Esta ação não está disponível no estado atual.
Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida.” —
LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT.

**Acessibilidade:** Botão com verbo/alvo/efeito; confirmação por
teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura.

## 15–18. Hierarquia, ações, consequências e mensagens

Versão do servidor e minha edição lado a lado → diferenças por campo → copiar
manualmente no formulário → nova revisão → save com CAS atual.

Resumo ou comparação de versões com tipo/paciente/intenção e instantes; ações
não destrutivas antes do descarte.

Primária: **Salvar edição revisada**. Secundárias: Manter versão do servidor;
Copiar meus campos; Voltar.

Efeito: Novo CAS explícito; não última escrita vence.

Sucesso/resultado: “Edição revisada salva como rascunho. Nenhuma emissão,
aprovação ou confirmação foi executada.”

Vazio/inelegível: “Não há conflito de edição ativo. Retorne ao formulário
correspondente.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Conservar cópia da edição não salva até escolha; quantidade/pessoa/decisão
nunca se mesclam por última escrita vence.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Versões empilhadas por campo; cópia manual mantém valor legível; descarte não
é ação primária preselecionada.

Diferenças em texto, escolha por teclado e foco de retorno ao formulário; não
expor JSON serializado como campo de edição.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

NOVO COMPARADOR: resolução manual por campo e nova revisão, sem merge de atos
materiais.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-017;C-AC-032;C-AC-052;C-AC-070;C-AC-080;C-AC-107;C-AC-110;C-AC-116;C-NEW-AC-013;C-NEW-AC-014;C-NEW-AC-019;C7-AC-004;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-017.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
