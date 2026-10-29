# SC-039 — Documento unificado

Rota: `/documentos/[id]`. Situação: ACTIVE.
Fonte principal: [src/components/documents/document-viewer.tsx](../../../../src/components/documents/document-viewer.tsx).

## Intenção e contexto

Consultar estado, quantidades, próxima ação, anexos, PDF e história.

Perfis/capacidades: leitura por tipo e paciente. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |


Fontes de interface relacionadas: `src/components/documents/document-viewer.tsx`, `src/components/workspace.tsx`, `src/components/layout/workspace-context.tsx`, `src/components/layout/workspace-shell.tsx`, `src/components/ui/primitives.tsx`, `src/components/notifications/notification-bell.tsx`, `src/components/auth/logout-button.tsx`, `src/components/navigation/workspace-navigation.tsx`, `src/components/requisitions/requisition-detail.tsx`, `src/components/forms/settings-section.tsx`, `src/components/documents/attachments.tsx`, `src/components/documents/document-header.tsx`, `src/components/documents/document-actions.tsx`, `src/components/documents/document-timeline.tsx`, `src/components/documents/related-document.tsx`, `src/components/requisitions/resolve-extra-item.tsx`, `src/components/documents/supply-detail.tsx`, `src/components/documents/supply-line-summary.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/documents/supply-command-editor.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.

## Atritos e contraditório

REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo operacional, revisão concreta por comando, prova de estado do PDF e comparação humana de versões.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, document-ENT](../evidence/b11-adminA-document-ENT-390.png): top 1030/2398 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-REQ](../evidence/b11-adminA-document-REQ-390.png): top 1030/1954 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-req-isolated](../evidence/b11-supplement-adminA-document-req-isolated.png): top 1030/2203 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-com](../evidence/b11-supplement-adminA-document-com.png): top 1030/1910 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, document-ent-pending](../evidence/b11-supplement-adminA-document-ent-pending.png): top 1030/2270 source pixels; navegação e leitura, comandos não confirmados.

Cada tipo/estado precisa evidência própria; não inferir por abrir uma ENT.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-017 — "Anexos e ficha física"

Componente SettingsSection, origem `src/components/documents/attachments.tsx:118`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-018 — "Linha do tempo"

Componente SettingsSection, origem `src/components/documents/document-timeline.tsx:17`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-019 — {label}

Componente Dialog, origem `src/components/documents/related-document.tsx:26`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {open}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-020 — "Versões e integridade"

Componente SettingsSection, origem `src/components/documents/supply-detail.tsx:396`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-021 — "Revisar operação definitiva"

Componente Dialog, origem `src/components/documents/supply-detail.tsx:427`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-029 — {           review === "cancel"             ? "Revisar cancelamento da REQ"             : "Revisar arquivamento manual"         }

Componente Dialog, origem `src/components/requisitions/requisition-detail.tsx:430`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {review !== null}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-030 — "Avisos e acompanhamento"

Componente SettingsSection, origem `src/components/requisitions/requisition-detail.tsx:476`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-032 — "Confirmar identificação do item"

Componente Dialog, origem `src/components/requisitions/resolve-extra-item.tsx:173`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
REQ cabeçalho longo e ciência por exposição de cabeçalho; COM/ENT/BAL têm confirmações genéricas em alguns comandos; versões sem diff de negócio.
Preservar: Header e ações centralizados, snapshots de paciente, versões e estados independentes; origem decide adaptador.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
