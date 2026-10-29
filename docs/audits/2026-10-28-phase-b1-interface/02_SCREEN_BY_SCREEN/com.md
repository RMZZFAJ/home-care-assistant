# SC-010 — Compra ou doação

Rota: `/fichas/com` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/supply-wizard.tsx](../../../../src/components/documents/supply-wizard.tsx)
.

## Intenção e contexto

Organizar aquisição sem afirmar entrada física no estoque.

Perfis/capacidades: com.create. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 582; **Controle:** Link; **Texto/nome ou expressão:** Acompanhar
ficha &lt;Icon name="arrow" /&gt;; **Pré-condição e efeito verificável:**
{"/fichas/" + saved.id}.
- **Linha:** 585; **Controle:** Link; **Texto/nome ou expressão:** Voltar à
central; **Pré-condição e efeito verificável:** "/fichas".
- **Linha:** 619; **Controle:** button; **Texto/nome ou expressão:** Recarregar
dados; **Pré-condição e efeito verificável:** {() => { setLoading(true);
setAttempt((value) => value + 1); }}.

Fontes de interface relacionadas: `src/components/documents/supply-wizard.tsx` ,
`src/components/documents/document-actions.tsx` , `src/components/workspace.tsx`
, `src/components/notifications/document-delivery-status.tsx` ,
`src/components/forms/wizard-actions.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/documents/supply-wizard-step.tsx` ,
`src/components/documents/related-document.tsx` ,
`src/components/catalog/barcode-scanner.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Origem compra/doação explícita; vínculos REQ não equivalem a atendimento;
quantidades strings decimais.

## Atritos e contraditório

Seleção longa sem busca no wizard de suprimento; revisão final não repete
compra/doação nem justificativas de necessidade compartilhada.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Revisão com origem e relações; busca por material por categoria e total
selecionado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, com](../evidence/b11-adminA-com-390.png): top 844/844 source
pixels; navegação e leitura, comandos não confirmados.

Estado servidor de rascunho completo difere de preenchimento incompleto nesta
aba.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-010.

9 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [com](../evidence/b11-adminA-com-390.png): adminA; 390; READY_VIEW_STATE. top
844/844 source pixels.
- [com-products](../evidence/b11-supplement-adminA-com-products.png): adminA;
390; READY. top 1030/1587 source pixels.
- [com-390](../evidence/b12-visual-adminA-com-390.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [com-1440](../evidence/b12-visual-adminA-com-1440.png): adminA; 1440; READY.
top 950 of 1000px; scaled to 360x650.
- [com-1](../evidence/b17-followup-adminA-com-1.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [com-5](../evidence/b17-followup-adminA-com-5.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [com-20](../evidence/b17-followup-adminA-com-20.png): adminA; 390; READY. top
844 of 844px; scaled to 360x650.
- [com-100](../evidence/b17-followup-adminA-com-100.png): adminA; 390; READY.
top 844 of 844px; scaled to 360x650.
- [text-size-stress](../evidence/b18-accessibility-adminA-text-size-stress.png)
: adminA; 320; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0091; FLD-0092; FLD-0125; FLD-0126; FLD-0127;
FLD-0128; FLD-0129; FLD-0130; FLD-0131; FLD-0132. Controles de ação
relacionados: 3 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-TEXT-002](../12_FINDINGS_MASTER.md#b1-text-002) —
Títulos COM e BAL generalizam incorretamente a operação;
[B1-STATE-004](../12_FINDINGS_MASTER.md#b1-state-004) — Prazo fixo de
acompanhamento regride resultado concluído e mistura preparo de PDF;
[B1-FORM-004](../12_FINDINGS_MASTER.md#b1-form-004) — Seleção COM/ENT não
aproveita busca já disponível para catálogos maiores;
[B1-UX-005](../12_FINDINGS_MASTER.md#b1-ux-005) — Promessa de rascunho no
dispositivo excede persistência da aba.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
