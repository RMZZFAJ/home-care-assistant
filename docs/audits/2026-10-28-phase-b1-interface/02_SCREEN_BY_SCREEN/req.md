# SC-009 — Emitir REQ

Rota: `/fichas/req` . Situação: ACTIVE.
Fonte principal:
[src/components/requisitions/requisition-wizard.tsx](../../../../src/components/requisitions/requisition-wizard.tsx)
.

## Intenção e contexto

Registrar necessidade de material com estoque observado e urgência.

Perfis/capacidades: req.create. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 345; **Controle:** button; **Texto/nome ou expressão:** Recarregar
catálogo; **Pré-condição e efeito verificável:** {() => {
setLoadingCatalog(true); setCatalogAttempt((value) => value + 1); }}.

Fontes de interface relacionadas:
`src/components/requisitions/requisition-wizard.tsx` ,
`src/components/workspace.tsx` , `src/components/forms/wizard-actions.tsx` ,
`src/components/ui/primitives.tsx` ,
`src/components/requisitions/requisition-steps.tsx` ,
`src/components/documents/related-document.tsx` ,
`src/components/requisitions/requisition-receipt.tsx` ,
`src/components/notifications/document-delivery-status.tsx` ,
`src/components/documents/document-actions.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Catálogo por categoria, busca por aliases, tratamento de repetição, revisão e
tentativa idempotente congelada.

## Atritos e contraditório

Sete etapas; estoque observado inicia zero sem contagem explícita;
extras/observações têm falhas sem salto de etapa; promessa dispositivo excede
sessionStorage.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Rótulo rascunho desta aba com hora; distinguir não observado de zero se contrato
permitir; foco e navegação ao erro; preservar REQ sem quantidade solicitada.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, req](../evidence/b11-adminA-req-390.png): top 844/844 source
pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, req](../evidence/b11-professional-req-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-1](../evidence/b11-supplement-adminA-req-step-1.png)
: top 1030/1525 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-2](../evidence/b11-supplement-adminA-req-step-2.png)
: top 1030/2089 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-3](../evidence/b11-supplement-adminA-req-step-3.png)
: top 961/961 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-4](../evidence/b11-supplement-adminA-req-step-4.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-5](../evidence/b11-supplement-adminA-req-step-5.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-6](../evidence/b11-supplement-adminA-req-step-6.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Catálogos1/5/20/100 e retomada entre abas foram explorados em B1.7; entre
dispositivos continua NOT_VERIFIED.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-009.

31 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [req](../evidence/b11-adminA-req-390.png): adminA; 390; READY_VIEW_STATE. top
844/844 source pixels.
- [req](../evidence/b11-professional-req-390.png): professional; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [req-denied](../evidence/b11-reader-req-denied-390.png): reader; 390;
NO_PERMISSION. top 844/844 source pixels.
- [req-step-1](../evidence/b11-supplement-adminA-req-step-1.png): adminA; 390;
READY. top 1030/1525 source pixels.
- [req-step-2](../evidence/b11-supplement-adminA-req-step-2.png): adminA; 390;
READY. top 1030/2089 source pixels.
- [req-step-3](../evidence/b11-supplement-adminA-req-step-3.png): adminA; 390;
READY. top 961/961 source pixels.
- [req-step-4](../evidence/b11-supplement-adminA-req-step-4.png): adminA; 390;
READY. top 844/844 source pixels.
- [req-step-5](../evidence/b11-supplement-adminA-req-step-5.png): adminA; 390;
READY. top 844/844 source pixels.
- [req-step-6](../evidence/b11-supplement-adminA-req-step-6.png): adminA; 390;
READY. top 844/844 source pixels.
- [req-320](../evidence/b12-visual-adminA-req-320.png): adminA; 320; READY. top
844 of 844px; scaled to 360x650.
- [req-390](../evidence/b12-visual-adminA-req-390.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [req-768](../evidence/b12-visual-adminA-req-768.png): adminA; 768; READY. top
950 of 1000px; scaled to 360x650.
- [req-1440](../evidence/b12-visual-adminA-req-1440.png): adminA; 1440; READY.
Original image opened; full viewport/image as displayed.
- [req-1920](../evidence/b12-visual-adminA-req-1920.png): adminA; 1920; READY.
top 950 of 1000px; scaled to 360x650.
- [extras-invalid](../evidence/b17-forms-professional-extras-invalid.png):
professional; 390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.

[same-tab-recovered](../evidence/b17-forms-professional-same-tab-recovered.png)
: professional; 390; READY. top 844 of 844px; scaled to 360x650.

- [new-tab-no-draft](../evidence/b17-forms-professional-new-tab-no-draft.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.
- [req-density-1](../evidence/b17-forms-professional-req-density-1.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.
- [req-density-5](../evidence/b17-forms-professional-req-density-5.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.
- [req-density-20](../evidence/b17-forms-professional-req-density-20.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.
- [req-density-100](../evidence/b17-forms-professional-req-density-100.png):
professional; 390; READY. top 844 of 844px; scaled to 360x650.

[observation-1001-error](../evidence/b17-followup-adminA-observation-1001-error.png)
: adminA; 390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.

- [req-1](../evidence/b17-followup-adminA-req-1.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [req-5](../evidence/b17-followup-adminA-req-5.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [req-20](../evidence/b17-followup-adminA-req-20.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [req-100](../evidence/b17-followup-adminA-req-100.png): adminA; 390; READY.
top 844 of 844px; scaled to 360x650.
- [req-issued](../evidence/b18-journeys-professional-req-issued.png):
professional; 390; PERSISTED. top 950 of 1352px; scaled to 360x650.

[long-text-reflow320](../evidence/b18-accessibility-adminA-long-text-reflow320.png)
: adminA; 320; READY. Original image opened; full viewport/image as displayed.

- [review-bottom320](../evidence/b18-accessibility-adminA-review-bottom320.png)
: adminA; 320; READY. top 844 of 844px; scaled to 360x650.
- [footer-bottom390](../evidence/b18-followup-professional-footer-bottom390.png)
: professional; 390; READY. top 844 of 844px; scaled to 360x650.

[duplicate-review](../evidence/b18-overlay-followup-adminA-duplicate-review.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0149; FLD-0150; FLD-0151; FLD-0152; FLD-0153;
FLD-0154; FLD-0155; FLD-0156; FLD-0157; FLD-0158. Controles de ação
relacionados: 1 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-STATE-004](../12_FINDINGS_MASTER.md#b1-state-004) —
Prazo fixo de acompanhamento regride resultado concluído e mistura preparo de
PDF; [B1-FORM-001](../12_FINDINGS_MASTER.md#b1-form-001) — Estoque não observado
e zero convergem silenciosamente na REQ;
[B1-FORM-002](../12_FINDINGS_MASTER.md#b1-form-002) — Validações não acompanham
limites e foco dos campos em todos os caminhos;
[B1-UX-005](../12_FINDINGS_MASTER.md#b1-ux-005) — Promessa de rascunho no
dispositivo excede persistência da aba;
[B1-VIS-001](../12_FINDINGS_MASTER.md#b1-vis-001) — Fundação visual precisa de
consolidação orientada pelo resultado, com exceções explícitas;
[B1-A11Y-003](../12_FINDINGS_MASTER.md#b1-a11y-003) — Observação válida contínua
rompe reflow da revisão em320px.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
