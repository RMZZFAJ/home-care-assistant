# NOT-05 — Conciliar falha técnica

Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada
nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.

## 1–3. Finalidade, autorização e estado

Conciliação técnica restrita por evento/job/tentativa; resultado externo pode
ser desconhecido.

Finalidade: Conciliar falha técnica.

Global/suporte explicitamente habilitado ao tipo de incidente; não assume
poderes familiares ou aceite material.

AS_IS/rota: Conciliação técnica, /admin atual a ampliar.

## 4–14. Campos, modos de interação e validação

Referências/timestamps/resultados; payload privado e segredos não aparecem.
Referência nula não prova ausência de envio.

Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY é
texto/comparação, não um input disabled. Subformulário só aparece quando sua
condição/autoridade é satisfeita; consultar não abre edição automaticamente.

### CTRL-141-01 — Referência/tentativa

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

**Mensagem e condição:** “Não foi possível carregar a informação
“Referência/tentativa”. Atualize esta seção. O dado registrado não pode ser
alterado aqui.” — SECTION_READ_FAILED.

**Acessibilidade:** Texto/lista/comparação sem aria-invalid de formulário;
erro pertence à seção com ação Atualizar e foco preservado.

## 15–18. Hierarquia, ações, consequências e mensagens

Impacto → evento e tentativa exatos → evidência de
aceite/recusa/indeterminação → conciliar → autorizar nova tentativa somente
com base pertinente.

Impacto e decisão em primeiro plano; detalhes técnicos seguros em seção
restrita por tentativa, sem payload bruto.

Primária: **Consultar resultado da tentativa**. Secundárias: Escalonar;
Reprocessar só após conciliação aprovada.

Efeito: Referência nula não prova ausência de envio.

Sucesso/resultado: “Resultado da tentativa registrado. Nova tentativa só
ocorre se houver autorização e conciliação compatíveis.”

Vazio/inelegível: “Nenhuma tentativa corresponde aos filtros autorizados.
Verifique o evento e o período.”

Alertas de consulta/validação permanecem inline na seção. Diálogo somente para
decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.

## 19–20. Falhas, recuperação e continuidade

Informação indisponível não recebe valor inventado; bloquear somente ação que
depende dela, preservando consultas e encaminhamentos autorizados.

Canal postergado não é ativado ao reprocessar. Incerteza sem evidência
continua incerta e encaminhada ao responsável, sem repetição cega.

Leitura falha repete consulta da seção. Escrita incerta consulta a mesma
intenção antes de novo comando. Recusa comprovada, confirmado, conflito e
incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.

Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois
de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.

## 21–24. Móvel, acessibilidade, referência e negócio

Cards de evento/tentativa com rótulos; copiar apenas referência segura;
consequência antes de qualquer reprocessamento.

Estado incerto explícito; avisos técnicos não entram no fluxo da profissional;
diálogo só ao autorizar ação potencialmente duplicadora.

Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,
cards e barra de contexto. Prioridade da tarefa e regras de autorização
governam o layout; exemplos do protótipo não são controles obrigatórios.

Referência do protótipo: SEM_EQUIVALENTE_NO_HTML. Sem captura real ou aceite
humano de interface futura nesta C.

EVOLUIR painel técnico; reconstruir resultado e autorização de reenvio para
não duplicar mensagem aceita.

## Contratos e aceites relacionados

[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),
[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e
[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).

Aceites relacionados:
C-AC-001;C-AC-003;C-AC-014;C-AC-020;C-AC-023;C-AC-049;C-AC-064;C-AC-073;C-AC-083;C-AC-084;C-AC-086;C-AC-087;C-AC-088;C-AC-089;C-AC-090;C-AC-091;C-AC-092;C-AC-093;C-AC-094;C-AC-095;C-AC-096;C-AC-097;C-AC-098;C-AC-099;C-AC-113;C-AC-115;C-NEW-AC-001;C-NEW-AC-002;C-NEW-AC-003;C-NEW-AC-026;C7-AC-008;C7-AC-012;C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025;C-FINAL-AC-026.
Associação de domínio não significa execução em cada tela; a D seleciona
cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.
