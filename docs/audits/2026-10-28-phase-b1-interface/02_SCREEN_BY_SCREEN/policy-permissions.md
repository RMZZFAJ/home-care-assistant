# SC-032 — Matriz de permissões

Rota: `/configuracoes?area=permissions`. Situação: ACTIVE.
Fonte principal: [src/components/admin/permission-matrix.tsx](../../../../src/components/admin/permission-matrix.tsx).

## Intenção e contexto

Comparar herança e exceções por função/pessoa.

Perfis/capacidades: access.manage ou proposta global. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 24 | Input | "Pesquisar permissões" | "search" |
| 24 | Select | "Grupo de permissões" | Consultar ramo condicional na fonte |
| 24 | Select | "Visualizar permissões" | Consultar ramo condicional na fonte |
| 32 | Button | {label + " · " + name + " · " + caption} | {busy \|\| def.code === "access.manage"} |
| 35 | Button | Voltar | {busy} |
| 35 | Button | Confirmar permissão | {busy} |

Fontes de interface relacionadas: `src/components/admin/permission-matrix.tsx`, `src/components/ui/primitives.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca e grupo; restrição rígida de função; confirma permissões críticas; herança não é confundida com autorização fixa.

## Atritos e contraditório

Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure retorna false; defaults efetivos exigem interpretação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Manter erro no contexto decisório, comparar antes/depois e fornecer foco por pessoa no móvel.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-permissions](../evidence/b11-supplement-adminA-policy-permissions.png): top 1030/1219 source pixels; navegação e leitura, comandos não confirmados.

RLS não foi re-auditada integralmente nesta frente UX.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-008 — MenuPopover (título no conteúdo/consumidor)

Componente MenuPopover, origem `src/components/admin/permission-matrix.tsx:32`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure retorna false; defaults efetivos exigem interpretação.
Preservar: Busca e grupo; restrição rígida de função; confirma permissões críticas; herança não é confundida com autorização fixa.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-009 — "Confirmar alteração crítica"

Componente Dialog, origem `src/components/admin/permission-matrix.tsx:35`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(confirmation)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Matriz larga com rolagem aninhada; confirmação fecha mesmo quando configure retorna false; defaults efetivos exigem interpretação.
Preservar: Busca e grupo; restrição rígida de função; confirma permissões críticas; herança não é confundida com autorização fixa.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
