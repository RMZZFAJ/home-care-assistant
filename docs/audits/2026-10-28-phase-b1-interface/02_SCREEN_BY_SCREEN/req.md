# SC-009 — Emitir REQ

Rota: `/fichas/req`. Situação: ACTIVE.
Fonte principal: [src/components/requisitions/requisition-wizard.tsx](../../../../src/components/requisitions/requisition-wizard.tsx).

## Intenção e contexto

Registrar necessidade de material com estoque observado e urgência.

Perfis/capacidades: req.create. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 345 | button | Recarregar catálogo  | {() => {               setLoadingCatalog(true);               setCatalogAttempt((value) => value + 1);             }} |

Fontes de interface relacionadas: `src/components/requisitions/requisition-wizard.tsx`, `src/components/workspace.tsx`, `src/components/forms/wizard-actions.tsx`, `src/components/ui/primitives.tsx`, `src/components/requisitions/requisition-steps.tsx`, `src/components/documents/related-document.tsx`, `src/components/requisitions/requisition-receipt.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/documents/document-actions.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Catálogo por categoria, busca por aliases, tratamento de repetição, revisão e tentativa idempotente congelada.

## Atritos e contraditório

Sete etapas; estoque observado inicia zero sem contagem explícita; extras/observações têm falhas sem salto de etapa; promessa dispositivo excede sessionStorage.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Rótulo rascunho desta aba com hora; distinguir não observado de zero se contrato permitir; foco e navegação ao erro; preservar REQ sem quantidade solicitada.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, req](../evidence/b11-adminA-req-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, req](../evidence/b11-professional-req-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-1](../evidence/b11-supplement-adminA-req-step-1.png): top 1030/1525 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-2](../evidence/b11-supplement-adminA-req-step-2.png): top 1030/2089 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-3](../evidence/b11-supplement-adminA-req-step-3.png): top 961/961 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-4](../evidence/b11-supplement-adminA-req-step-4.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-5](../evidence/b11-supplement-adminA-req-step-5.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, req-step-6](../evidence/b11-supplement-adminA-req-step-6.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Categorias 1/5/20/100 e retomada entre dispositivos exigem medidas próprias.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
