# SC-013 — Entregas e recebimentos

Rota: `/entregas` . Situação: ACTIVE.
Fonte principal:
[src/components/documents/delivery-inbox.tsx](../../../../src/components/documents/delivery-inbox.tsx)
.

## Intenção e contexto

Localizar entregas próprias ou histórico autorizado da equipe.

Perfis/capacidades: ent.read; confirmação só destinatário. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 32; **Controle:** Select; **Texto/nome ou expressão:** "Responsável
pelas entregas"; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 33; **Controle:** Select; **Texto/nome ou expressão:** "Situação
das entregas"; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 35; **Controle:** Button; **Texto/nome ou expressão:** Tentar
novamente; **Pré-condição e efeito verificável:** {() => setAttempt((value) =>
value + 1)}.
- **Linha:** 36; **Controle:** Button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page === 1}.
- **Linha:** 36; **Controle:** Button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * 20 >= total}.

Fontes de interface relacionadas: `src/components/documents/delivery-inbox.tsx`
, `src/components/workspace.tsx` ,
`src/components/documents/document-history.tsx` ,
`src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Escopo próprio é default do profissional; filtro de situação e paginação; regra
do destinatário explicitada.

## Atritos e contraditório

Trocar situação/escopo mantém lista anterior enquanto consulta sem reativar
loading; filtro pode divergir do que está visível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Rotular atualização, bloquear comandos antigos e confirmar vazio somente na
resposta da seleção corrente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, deliveries](../evidence/b11-adminA-deliveries-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, deliveries](../evidence/b11-professional-deliveries-390.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Lista densa e mudanças concorrentes precisam de injeção dirigida.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-013.

4 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [deliveries](../evidence/b11-adminA-deliveries-390.png): adminA; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [deliveries](../evidence/b11-professional-deliveries-390.png): professional;
390; READY_VIEW_STATE. top 844/844 source pixels.
- [filter-pending](../evidence/b15-followup-professional-filter-pending.png):
professional; 390; REFRESHING. top 844 of 844px; scaled to 360x650.
- [filter-empty](../evidence/b15-followup-professional-filter-empty.png):
professional; 390; EMPTY_CONFIRMED. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0106; FLD-0107; FLD-0108; FLD-0109; FLD-0110;
FLD-0111; FLD-0112. Controles de ação relacionados: 3 callsites; inventário
canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-STATE-002](../12_FINDINGS_MASTER.md#b1-state-002) —
Filtro novo pode coexistir com linhas antigas sem indicação de atualização.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
