# SC-012 — Contagem BAL

Rota: `/fichas/bal`. Situação: ACTIVE.
Fonte principal: [src/components/balances/balance-count-wizard.tsx](../../../../src/components/balances/balance-count-wizard.tsx).

## Intenção e contexto

Contar fisicamente a equipe e revisar diferenças segundo a política.

Perfis/capacidades: bal.read+bal.count+atribuição/janela. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 30 | Button | Tentar novamente | {reload} |
| 33 | Link | Consultar balanços e plantões | "/balancos" |
| 128 | Link | Abrir ficha BAL | {"/documentos/"+saved.id} |
| 130 | Link | Consultar balanços e plantões | "/balancos" |
| 134 | Link | Consultar agendamento e pendências | "/balancos" |
| 138 | Link | Acompanhar / solicitar adiamento | "/balancos" |
| 141 | Button | Recuperar a mesma tentativa | {busy} |
| 142 | Button | Iniciar nova conferência e atualizar referência | {busy} |

Fontes de interface relacionadas: `src/components/balances/balance-count-wizard.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`, `src/components/documents/supply-wizard.tsx`, `src/components/documents/document-actions.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/forms/wizard-actions.tsx`, `src/components/documents/supply-wizard-step.tsx`, `src/components/documents/related-document.tsx`, `src/components/catalog/barcode-scanner.tsx`, `src/components/balances/use-balance-workspace.ts`, `src/components/balances/balance-count-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Regime novo tem duas etapas, campos inicialmente vazios e referência revelada só na revisão; polling 30s e reconto preservam contrato.

## Atritos e contraditório

Regime legado ainda oferece seis etapas e abre rascunho zero ao avançar; reiniciar conferência limpa todos os campos; modo depende do paciente sem explicação curta comparativa.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Explicar variante ativa; medir esforço por volume; reconferência deve avisar claramente o descarte e permitir preparação segura.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, bal-count](../evidence/b11-adminA-bal-count-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, bal-count](../evidence/b11-professional-bal-count-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [shiftWorker, 390px, scheduled-bal-count](../evidence/b11-supplement-shiftWorker-scheduled-bal-count.png): top 1030/1118 source pixels; navegação e leitura, comandos não confirmados.
- [shiftWorker, 390px, scheduled-bal-review](../evidence/b11-supplement-shiftWorker-scheduled-bal-review.png): top 1030/1118 source pixels; navegação e leitura, comandos não confirmados.
- [shiftWorker, 390px, review-ready](../evidence/b11-bal-ready-shiftWorker-review-ready.png): região não marcada; navegação e leitura, comandos não confirmados.

Apuração de 100 linhas, teclado físico e rotina interrompida com operadores pendentes.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
