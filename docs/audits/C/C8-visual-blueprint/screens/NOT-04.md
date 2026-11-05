# NOT-04 — Instalar e atualizar aplicativo

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Orientação de instalação/atualização segundo capacidade real do aparelho;
nenhuma instalação é presumida.

Finalidade: Instalar e atualizar aplicativo.

Titular no aparelho; permissões só por gesto e sem alterar capacidade
operacional.

AS_IS/rota: Orientação de instalação/atualização, nova.

## 4–14. Campos, modos de interação e validação

Estado de suporte/instalação e instruções. Não mostrar botão que promete push
em ambiente sem suporte comprovado.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

Não há campo de negócio digitável nesta tarefa; navegação/instrução seguem as
ações abaixo.

## 15–18. Hierarquia, ações, consequências e mensagens

Capacidade detectada → instrução aplicável → instalar ou continuar web →
atualização somente após salvar edição e escolher recarregar.

Passos curtos com propósito, texto equivalente à imagem e navegação de
progresso; ajuda reabrível.

Primária: **Ver como instalar**. Secundárias: Agora não; Atualizar após
salvar; Abrir web.

Efeito: Sem suporte mantém app web completo.

Sucesso/resultado: “Orientação apresentada. Confirme no aparelho o resultado
da instalação ou continue pelo aplicativo web.”

Vazio/inelegível: “Instalação não disponível neste navegador. Continue usando
o aplicativo web.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Atualização não recarrega durante confirmação/rascunho não salvo; instrução de
salvar/adiar mantém a tarefa acessível.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Uma coluna, imagem contida com legenda e texto; Próximo/Voltar/Pular sem
cobrir conteúdo.

Headings e lista de passos sem leitura forçada; imagens têm descrição útil;
pular não registra concordância material.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

NOVO GUIA CONTEXTUAL: validar instruções nos aparelhos P10 em D6; a
especificação não é prova física.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-003;C-AC-014;C-AC-020;C-AC-023;C-AC-049;C-AC-064;C-AC-073;C-AC-083;C-AC-084;C-AC-086;C-AC-087;C-AC-088;C-AC-089;C-AC-090;C-AC-091;C-AC-092;C-AC-093;C-AC-094;C-AC-095;C-AC-096;C-AC-097;C-AC-098;C-AC-099;C-AC-113;C-AC-115;C-NEW-AC-001;C-NEW-AC-002;C-NEW-AC-003;C-NEW-AC-026;C7-AC-008;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
