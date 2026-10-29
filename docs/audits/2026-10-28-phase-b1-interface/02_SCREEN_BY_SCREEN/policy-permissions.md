# SC-032 — Matriz de permissões

Rota: `/configuracoes?area=permissions` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/permission-matrix.tsx](../../../../src/components/admin/permission-matrix.tsx)
.

## Intenção e contexto

Comparar herança e exceções por função/pessoa.

Perfis/capacidades: access.manage ou proposta global. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 24; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
permissões"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 24; **Controle:** Select; **Texto/nome ou expressão:** "Grupo de
permissões"; **Pré-condição e efeito verificável:** Consultar ramo condicional
na fonte.
- **Linha:** 24; **Controle:** Select; **Texto/nome ou expressão:** "Visualizar
permissões"; **Pré-condição e efeito verificável:** Consultar ramo condicional
na fonte.
- **Linha:** 32; **Controle:** Button; **Texto/nome ou expressão:** {label + " ·
" + name + " · " + caption}; **Pré-condição e efeito verificável:** {busy ||
def.code === "access.manage"}.
- **Linha:** 35; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy}.
- **Linha:** 35; **Controle:** Button; **Texto/nome ou expressão:** Confirmar
permissão; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/admin/permission-matrix.tsx` ,
`src/components/ui/primitives.tsx` , `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca e grupo; restrição rígida de função; confirma permissões críticas; herança
não é confundida com autorização fixa.

## Atritos e contraditório

Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure
retorna false; defaults efetivos exigem interpretação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Manter erro no contexto decisório, comparar antes/depois e fornecer foco por
pessoa no móvel.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-permissions](../evidence/b11-supplement-adminA-policy-permissions.png)
: top 1030/1219 source pixels; navegação e leitura, comandos não confirmados.

RLS não foi re-auditada integralmente nesta frente UX.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-008 — MenuPopover (título no conteúdo/consumidor)

Componente MenuPopover, origem `src/components/admin/permission-matrix.tsx:32` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure
retorna false; defaults efetivos exigem interpretação.
Preservar: Busca e grupo; restrição rígida de função; confirma permissões
críticas; herança não é confundida com autorização fixa.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-009 — "Confirmar alteração crítica"

Componente Dialog, origem `src/components/admin/permission-matrix.tsx:35` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(confirmation)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure
retorna false; defaults efetivos exigem interpretação.
Preservar: Busca e grupo; restrição rígida de função; confirma permissões
críticas; herança não é confundida com autorização fixa.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-032.

8 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [policy-permissions](../evidence/b11-supplement-adminA-policy-permissions.png)
: adminA; 390; READY. top 1030/1219 source pixels.
- [permissions-320](../evidence/b12-visual-adminA-permissions-320.png): adminA;
320; READY. top 844 of 844px; scaled to 360x650.
- [permissions-390](../evidence/b12-visual-adminA-permissions-390.png): adminA;
390; READY. top 844 of 844px; scaled to 360x650.
- [permissions-1440](../evidence/b12-visual-adminA-permissions-1440.png):
adminA; 1440; READY. top 950 of 1000px; scaled to 360x650.
- [permission-409](../evidence/b14-recovery-adminA-permission-409.png): adminA;
390; ERROR_RECOVERABLE. top 844 of 844px; scaled to 360x650.
- [matrix-keyboard](../evidence/b18-accessibility-adminA-matrix-keyboard.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.
- [permission-menu](../evidence/b18-overlays-adminA-permission-menu.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.

[permission-critical-review](../evidence/b18-overlays-adminA-permission-critical-review.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0051; FLD-0052;
FLD-0053. Controles de ação relacionados: 4 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-ERR-003](../12_FINDINGS_MASTER.md#b1-err-003) —
Conflito na permissão crítica fecha o diálogo e afasta o erro da intenção.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
