# SC-012 — Contagem BAL

Rota: `/fichas/bal` . Situação: ACTIVE.
Fonte principal:
[src/components/balances/balance-count-wizard.tsx](../../../../src/components/balances/balance-count-wizard.tsx)
.

## Intenção e contexto

Contar fisicamente a equipe e revisar diferenças segundo a política.

Perfis/capacidades: bal.read+bal.count+atribuição/janela. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 30; **Controle:** Button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {reload}.
- **Linha:** 33; **Controle:** Link; **Texto/nome ou expressão:** Consultar
balanços e plantões; **Pré-condição e efeito verificável:** "/balancos".
- **Linha:** 128; **Controle:** Link; **Texto/nome ou expressão:** Abrir ficha
BAL; **Pré-condição e efeito verificável:** {"/documentos/"+saved.id}.
- **Linha:** 130; **Controle:** Link; **Texto/nome ou expressão:** Consultar
balanços e plantões; **Pré-condição e efeito verificável:** "/balancos".
- **Linha:** 134; **Controle:** Link; **Texto/nome ou expressão:** Consultar
agendamento e pendências; **Pré-condição e efeito verificável:** "/balancos".
- **Linha:** 138; **Controle:** Link; **Texto/nome ou expressão:** Acompanhar /
solicitar adiamento; **Pré-condição e efeito verificável:** "/balancos".
- **Linha:** 141; **Controle:** Button; **Texto/nome ou expressão:** Recuperar a
mesma tentativa; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 142; **Controle:** Button; **Texto/nome ou expressão:** Iniciar
nova conferência e atualizar referência; **Pré-condição e efeito
verificável:** {busy}.

Fontes de interface relacionadas:
`src/components/balances/balance-count-wizard.tsx` ,
`src/components/workspace.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/documents/supply-wizard.tsx` ,
`src/components/documents/document-actions.tsx` ,
`src/components/notifications/document-delivery-status.tsx` ,
`src/components/forms/wizard-actions.tsx` ,
`src/components/documents/supply-wizard-step.tsx` ,
`src/components/documents/related-document.tsx` ,
`src/components/catalog/barcode-scanner.tsx` ,
`src/components/balances/use-balance-workspace.ts` ,
`src/components/balances/balance-count-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Regime novo tem duas etapas, campos inicialmente vazios e referência revelada só
na revisão; polling 30s e reconto preservam contrato.

## Atritos e contraditório

Regime legado ainda oferece seis etapas e abre rascunho zero ao avançar;
reiniciar conferência limpa todos os campos; modo depende do paciente sem
explicação curta comparativa.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Explicar variante ativa; medir esforço por volume; reconferência deve avisar
claramente o descarte e permitir preparação segura.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, bal-count](../evidence/b11-adminA-bal-count-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, bal-count](../evidence/b11-professional-bal-count-390.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados
- [shiftWorker, 390px, scheduled-bal-count](../evidence/b11-supplement-shiftWorker-scheduled-bal-count.png)
: top 1030/1118 source pixels; navegação e leitura, comandos não confirmados
- [shiftWorker, 390px, scheduled-bal-review](../evidence/b11-supplement-shiftWorker-scheduled-bal-review.png)
: top 1030/1118 source pixels; navegação e leitura, comandos não confirmados
- [shiftWorker, 390px, review-ready](../evidence/b11-bal-ready-shiftWorker-review-ready.png)
: região não marcada; navegação e leitura, comandos não confirmados.

Apuração de 100 linhas, teclado físico e rotina interrompida com operadores
pendentes.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-012.

7 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [bal-count](../evidence/b11-adminA-bal-count-390.png): adminA; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [bal-count](../evidence/b11-professional-bal-count-390.png): professional;
390; READY_VIEW_STATE. top 844/844 source pixels.

[scheduled-bal-count](../evidence/b11-supplement-shiftWorker-scheduled-bal-count.png)
: shiftWorker; 390; READY. top 1030/1118 source pixels

[scheduled-bal-review](../evidence/b11-supplement-shiftWorker-scheduled-bal-review.png)
: shiftWorker; 390; SUBMITTING. top 1030/1118 source pixels.

- [review-ready](../evidence/b11-bal-ready-shiftWorker-review-ready.png):
shiftWorker; 390; READY. Original image opened; full viewport/image as
displayed.

[bal-review-after-receipt](../evidence/b16-feedback-shiftWorker-bal-review-after-receipt.png)
: shiftWorker; 390; READY. top 916 of 916px; scaled to 360x650

[bal-count-persisted](../evidence/b16-feedback-shiftWorker-bal-count-persisted.png)
: shiftWorker; 390; PERSISTED. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0081; FLD-0082; FLD-0091; FLD-0092; FLD-0125;
FLD-0126; FLD-0127; FLD-0128; FLD-0129; FLD-0130; FLD-0131; FLD-0132. Controles
de ação relacionados: 8 callsites; inventário canônico em ACTION_CONTROLS.csv.
Não são comandos todos executados.

Diagnósticos associados: [B1-TEXT-002](../12_FINDINGS_MASTER.md#b1-text-002) —
Títulos COM e BAL generalizam incorretamente a operação;
[B1-STATE-004](../12_FINDINGS_MASTER.md#b1-state-004) — Prazo fixo de
acompanhamento regride resultado concluído e mistura preparo de PDF;
[B1-UX-005](../12_FINDINGS_MASTER.md#b1-ux-005) — Promessa de rascunho no
dispositivo excede persistência da aba.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
