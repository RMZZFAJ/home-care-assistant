# SC-040 — URL anterior REQ

Rota: `/historico/[id]`. Situação: COMPATIBILITY.
Fonte principal: [src/app/historico/[id]/page.tsx](../../../../src/app/historico/[id]/page.tsx).

## Intenção e contexto

Preservar links antigos e acesso ao visualizador comum.

Perfis/capacidades: leitura por tipo/paciente. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A página compõe componentes especializados. A árvore abaixo localiza os
consumidores; os controles são detalhados nas matrizes de campos e ações.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |


Fontes de interface relacionadas: `src/app/historico/[id]/page.tsx`, `src/components/authenticated-page.tsx`, `src/components/documents/document-viewer.tsx`, `src/components/workspace.tsx`, `src/components/layout/workspace-context.tsx`, `src/components/layout/workspace-shell.tsx`, `src/components/ui/primitives.tsx`, `src/components/notifications/notification-bell.tsx`, `src/components/auth/logout-button.tsx`, `src/components/navigation/workspace-navigation.tsx`, `src/components/requisitions/requisition-detail.tsx`, `src/components/forms/settings-section.tsx`, `src/components/documents/attachments.tsx`, `src/components/documents/document-header.tsx`, `src/components/documents/document-actions.tsx`, `src/components/documents/document-timeline.tsx`, `src/components/documents/related-document.tsx`, `src/components/requisitions/resolve-extra-item.tsx`, `src/components/documents/supply-detail.tsx`, `src/components/documents/supply-line-summary.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/documents/supply-command-editor.tsx`, `src/components/documents/demo-document.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Reutiliza autorização e conteúdo, sem duplicar domínio.

## Atritos e contraditório

Fallback de loading difere no role de /documentos; voltar ao histórico não conserva filtros da origem.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Uniformizar estado acessível e preservar retorno seguro e filtros.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, legacy-req](../evidence/b11-followup-adminA-legacy-req.png): top 1030/2203 source pixels; navegação e leitura, comandos não confirmados.

Compatibilidade não significa componente antigo ativo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
