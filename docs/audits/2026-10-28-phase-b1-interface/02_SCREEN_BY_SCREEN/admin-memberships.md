# SC-022 — Pessoas e vínculos

Rota: `/admin?section=memberships`. Situação: ACTIVE.
Fonte principal: [src/components/admin/membership-management.tsx](../../../../src/components/admin/membership-management.tsx).

## Intenção e contexto

Vincular conta existente, editar função e revogar/reativar vínculo.

Perfis/capacidades: access.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 18 | Button | Vincular conta | {(event) => setEditor({ row: null, opener: event.currentTarget })} |
| 19 | Input | "Pesquisar pessoas" | "search" |
| 20 | Button | {"Editar vínculo de " + name(row)} | {(event) => setEditor({ row, opener: event.currentTarget })} |
| 20 | Button | {row.status === "revoked" ? "Reativar" : "Revogar"} | {() => setChange(row)} |
| 22 | Select | <option value="">Selecione uma conta</option> {directory.map((person) => <option key={text(person, "user_id") \|\| text(person, "id")} value={text(person, "user_id") \|\| text(person, "id")}>{text(person, "full_name")}</ | Consultar ramo condicional na fonte |
| 22 | Button | Salvar vínculo | {busy} |
| 24 | Button | Voltar | {busy} |
| 24 | Button | Confirmar alteração | {busy} |

Fontes de interface relacionadas: `src/components/admin/membership-management.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`, `src/components/workspace.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca por nome/função, confirmação de revogação e distinção de conta global.

## Atritos e contraditório

Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo antigo; nomes repetidos dificultam escolha; vazio prematuro.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Identidade não editável no drawer de edição; nova associação em ação explícita; distinguir nomes homônimos sem expor contato indevido.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-memberships](../evidence/b11-adminA-admin-memberships-390.png): top 1030/1965 source pixels; navegação e leitura, comandos não confirmados.

Não executar revogação de conta compartilhada para testar apresentação.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-005 — {editor.row ? "Editar vínculo" : "Vincular conta existente"}

Componente RecordDrawer, origem `src/components/admin/membership-management.tsx:21`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo antigo; nomes repetidos dificultam escolha; vazio prematuro.
Preservar: Busca por nome/função, confirmação de revogação e distinção de conta global.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-006 — {change?.status === "revoked" ? "Reativar vínculo" : "Revogar vínculo"}

Componente Dialog, origem `src/components/admin/membership-management.tsx:24`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(change)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Editar deixa trocar Conta vinculada, mas payload não identifica o vínculo antigo; nomes repetidos dificultam escolha; vazio prematuro.
Preservar: Busca por nome/função, confirmação de revogação e distinção de conta global.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
