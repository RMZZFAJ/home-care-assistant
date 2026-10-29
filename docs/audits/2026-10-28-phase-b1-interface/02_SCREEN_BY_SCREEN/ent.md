# SC-011 — Expedir entrega

Rota: `/fichas/ent` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/supply-wizard.tsx](../../../../src/components/documents/supply-wizard.tsx)
.

## Intenção e contexto

Transferir materiais entre família e equipe para destinatário autorizado.

Perfis/capacidades: ent.create. O menu não concede autoridade; sessão, API e
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

Destinatário é escolha explícita; expedição avisa trânsito e próxima
confirmação.

## Atritos e contraditório

Origem e destinatário corretos na revisão, mas erros de passo anterior podem
ficar invisíveis na revisão final; não há busca da lista como na REQ.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Navegar ao primeiro erro e destacar unidade/quantidade e todas as relações antes
da emissão.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, ent](../evidence/b11-adminA-ent-390.png): top 861/861 source
pixels; navegação e leitura, comandos não confirmados.

Não confundir destinatário com técnica atendida nem alterar autoridade por
perfil fixo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-011.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [ent](../evidence/b11-adminA-ent-390.png): adminA; 390; READY_VIEW_STATE. top
861/861 source pixels.

Campos deste consumidor: FLD-0091; FLD-0092; FLD-0125; FLD-0126; FLD-0127;
FLD-0128; FLD-0129; FLD-0130; FLD-0131; FLD-0132. Controles de ação
relacionados: 3 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-UX-002](../12_FINDINGS_MASTER.md#b1-ux-002) —
Confirmações de estoque, ENT e configuração BAL omitem consequências por
domínio; [B1-FORM-004](../12_FINDINGS_MASTER.md#b1-form-004) — Seleção COM/ENT
não aproveita busca já disponível para catálogos maiores.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
