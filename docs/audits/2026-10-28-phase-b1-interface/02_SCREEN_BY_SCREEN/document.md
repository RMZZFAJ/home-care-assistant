# SC-039 — Documento unificado

Rota: `/documentos/[id]` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/document-viewer.tsx](../../../../src/components/documents/document-viewer.tsx)
.

## Intenção e contexto

Consultar estado, quantidades, próxima ação, anexos, PDF e história.

Perfis/capacidades: leitura por tipo e paciente. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

Fontes de interface relacionadas: `src/components/documents/document-viewer.tsx`
, `src/components/workspace.tsx` , `src/components/layout/workspace-context.tsx`
, `src/components/layout/workspace-shell.tsx` ,
`src/components/ui/primitives.tsx` ,
`src/components/notifications/notification-bell.tsx` ,
`src/components/auth/logout-button.tsx` ,
`src/components/navigation/workspace-navigation.tsx` ,
`src/components/requisitions/requisition-detail.tsx` ,
`src/components/forms/settings-section.tsx` ,
`src/components/documents/attachments.tsx` ,
`src/components/documents/document-header.tsx` ,
`src/components/documents/document-actions.tsx` ,
`src/components/documents/document-timeline.tsx` ,
`src/components/documents/related-document.tsx` ,
`src/components/requisitions/resolve-extra-item.tsx` ,
`src/components/documents/supply-detail.tsx` ,
`src/components/documents/supply-line-summary.tsx` ,
`src/components/notifications/document-delivery-status.tsx` ,
`src/components/documents/supply-command-editor.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Header e ações centralizados, snapshots de paciente, versões e estados
independentes; origem decide adaptador.

## Atritos e contraditório

REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo operacional, revisão concreta por comando, prova de estado do PDF e
comparação humana de versões.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, document-ENT](../evidence/b11-adminA-document-ENT-390.png):
top 1030/2398 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-REQ](../evidence/b11-adminA-document-REQ-390.png):
top 1030/1954 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-req-isolated](../evidence/b11-supplement-adminA-document-req-isolated.png)
: top 1030/2203 source pixels; navegação e leitura, comandos não confirmados
- [adminA, 390px, document-com](../evidence/b11-supplement-adminA-document-com.png)
: top 1030/1910 source pixels; navegação e leitura, comandos não confirmados
- [adminA, 390px, document-ent-pending](../evidence/b11-supplement-adminA-document-ent-pending.png)
: top 1030/2270 source pixels; navegação e leitura, comandos não confirmados.

Cada tipo/estado precisa evidência própria; não inferir por abrir uma ENT.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-017 — "Anexos e ficha física"

Componente SettingsSection, origem
`src/components/documents/attachments.tsx:118` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-018 — "Linha do tempo"

Componente SettingsSection, origem
`src/components/documents/document-timeline.tsx:17` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-019 — {label}

Componente Dialog, origem `src/components/documents/related-document.tsx:26` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {open}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-020 — "Versões e integridade"

Componente SettingsSection, origem
`src/components/documents/supply-detail.tsx:396` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-021 — "Revisar operação definitiva"

Componente Dialog, origem `src/components/documents/supply-detail.tsx:427` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-029 — {           review === "cancel"             ? "Revisar

cancelamento da REQ" : "Revisar arquivamento manual" }

Componente Dialog, origem
`src/components/requisitions/requisition-detail.tsx:430` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {review !== null}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-030 — "Avisos e acompanhamento"

Componente SettingsSection, origem
`src/components/requisitions/requisition-detail.tsx:476` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-032 — "Confirmar identificação do item"

Componente Dialog, origem
`src/components/requisitions/resolve-extra-item.tsx:173` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm
confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e
estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-039.

19 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [document-ENT](../evidence/b11-adminA-document-ENT-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/2398 source pixels.
- [document-REQ](../evidence/b11-adminA-document-REQ-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1954 source pixels.

[document-req-isolated](../evidence/b11-supplement-adminA-document-req-isolated.png)
: adminA; 390; READY. top 1030/2203 source pixels.

- [document-com](../evidence/b11-supplement-adminA-document-com.png): adminA;
390; READY. top 1030/1910 source pixels.

[document-ent-pending](../evidence/b11-supplement-adminA-document-ent-pending.png)
: adminA; 390; READY. top 1030/2270 source pixels.

- [com-purchase-editor](../evidence/b11-followup-adminA-com-purchase-editor.png)
: adminA; 390; READY. top 1030/2207 source pixels.
- [com-purchase-review](../evidence/b11-followup-adminA-com-purchase-review.png)
: adminA; 390; READY. top 844/844 source pixels.

[ent-divergence-editor](../evidence/b11-followup-professional-ent-divergence-editor.png)
: professional; 390; READY. top 1030/2909 source pixels

[ent-divergence-review](../evidence/b11-followup-professional-ent-divergence-review.png)
: professional; 390; READY. top 844/844 source pixels

[attachment-lost-response](../evidence/b14-errors-adminA-attachment-lost-response.png)
: adminA; 390; UNKNOWN_RESULT. top 950 of 2614px; scaled to 360x650.

- [attachment-lost](../evidence/b14-recovery-adminA-attachment-lost.png):
adminA; 390; UNKNOWN_RESULT. top 950 of 2681px; scaled to 360x650.

[deadline-after-completed](../evidence/b15-states-adminA-deadline-after-completed.png)
: adminA; 390; DELIVERY_PENDING. top 844 of 844px; scaled to 360x650.

- [com-unknown](../evidence/b16-feedback-adminA-com-unknown.png): adminA; 390;
UNKNOWN_RESULT. top 844 of 844px; scaled to 360x650.
- [com-persisted](../evidence/b16-feedback-adminA-com-persisted.png): adminA;
390; PERSISTED. top 950 of 2315px; scaled to 360x650.

[ent-confirm-review](../evidence/b16-feedback-professional-ent-confirm-review.png)
: professional; 390; READY. top 844 of 844px; scaled to 360x650.

- [ent-received](../evidence/b16-feedback-professional-ent-received.png):
professional; 390; PERSISTED. top 950 of 2739px; scaled to 360x650.
- [req-after-ent](../evidence/b16-feedback-adminA-req-after-ent.png): adminA;
390; PERSISTED. top 950 of 2247px; scaled to 360x650.
- [bal-final](../evidence/b16-feedback-family-bal-final.png): family; 390;
PERSISTED. top 950 of 2146px; scaled to 360x650.
- [authorized-read](../evidence/b18-journeys-reader-authorized-read.png):
reader; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0105; FLD-0113; FLD-0114; FLD-0115; FLD-0116;
FLD-0117; FLD-0118; FLD-0119; FLD-0120; FLD-0121; FLD-0122; FLD-0123; FLD-0124;
FLD-0133; FLD-0144; FLD-0159; FLD-0160; FLD-0161. Controles de ação
relacionados: 0 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-TEXT-001](../12_FINDINGS_MASTER.md#b1-text-001) —
Códigos de filtros, ações e papéis escapam à linguagem humana;
[B1-ERR-001](../12_FINDINGS_MASTER.md#b1-err-001) — Anexo com resposta perdida
deixa arquivo editável apesar de persistência confirmada;
[B1-ERR-002](../12_FINDINGS_MASTER.md#b1-err-002) — Adaptador de erro mistura
recuperação de leitura com resultado incerto de escrita;
[B1-STATE-004](../12_FINDINGS_MASTER.md#b1-state-004) — Prazo fixo de
acompanhamento regride resultado concluído e mistura preparo de PDF;
[B1-UX-006](../12_FINDINGS_MASTER.md#b1-ux-006) — Histórico tem versões e
integridade, mas exige tradução manual de mudanças de negócio;
[B1-FEED-001](../12_FINDINGS_MASTER.md#b1-feed-001) — Feedback genérico não
distingue relato de consumo,confirmação e aquisição;
[B1-UX-008](../12_FINDINGS_MASTER.md#b1-ux-008) — Ciência automática continua
ligada à exposição do cabeçalho.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
