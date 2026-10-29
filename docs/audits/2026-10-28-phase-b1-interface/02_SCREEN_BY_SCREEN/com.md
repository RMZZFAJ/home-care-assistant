# SC-010 — Compra ou doação

Rota: `/fichas/com`. Situação: ACTIVE.
Fonte principal: [src/components/documents/supply-wizard.tsx](../../../../src/components/documents/supply-wizard.tsx).

## Intenção e contexto

Organizar aquisição sem afirmar entrada física no estoque.

Perfis/capacidades: com.create. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 582 | Link | Acompanhar ficha <Icon name="arrow" />  | {"/fichas/" + saved.id} |
| 585 | Link | Voltar à central  | "/fichas" |
| 619 | button | Recarregar dados  | {() => {                 setLoading(true);                 setAttempt((value) => value + 1);               }} |

Fontes de interface relacionadas: `src/components/documents/supply-wizard.tsx`, `src/components/documents/document-actions.tsx`, `src/components/workspace.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/forms/wizard-actions.tsx`, `src/components/ui/primitives.tsx`, `src/components/documents/supply-wizard-step.tsx`, `src/components/documents/related-document.tsx`, `src/components/catalog/barcode-scanner.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Origem compra/doação explícita; vínculos REQ não equivalem a atendimento; quantidades strings decimais.

## Atritos e contraditório

Seleção longa sem busca no wizard de suprimento; revisão final não repete compra/doação nem justificativas de necessidade compartilhada.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Revisão com origem e relações; busca por material por categoria e total selecionado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, com](../evidence/b11-adminA-com-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Estado servidor de rascunho completo difere de preenchimento incompleto nesta aba.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
