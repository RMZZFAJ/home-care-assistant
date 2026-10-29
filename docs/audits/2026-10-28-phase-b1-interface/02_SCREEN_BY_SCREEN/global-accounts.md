# SC-030 — Contas globais

Rota: `/admin?section=profiles`. Situação: ACTIVE.
Fonte principal: [src/components/admin/global-accounts.tsx](../../../../src/components/admin/global-accounts.tsx).

## Intenção e contexto

Editar identidade/status/papel global sem confundir vínculo local.

Perfis/capacidades: globalAdministrationAllowed. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 15 | Input | "Pesquisar contas globais" | "search" |
| 15 | Button | {"Editar conta " + text(row, "full_name")} | {(event) => setEditor({ row, opener: event.currentTarget })} |
| 16 | Select | {["admin", "supervisor", "professional", "reader"].map((role) => <option key={role} value={role}>{role}</option>)} | Consultar ramo condicional na fonte |
| 16 | Button | Revisar alteração | "submit" |
| 17 | Button | Voltar | {busy} |
| 17 | Button | Confirmar conta global | {busy} |

Fontes de interface relacionadas: `src/components/admin/global-accounts.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`, `src/components/workspace.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Resumo de conta e privilégio; último admin protegido pelo banco; busca disponível.

## Atritos e contraditório

Papel global raw e lista longa sem paginação; sem confirmação de resultado incerto entre tentativas.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Tradução do papel e resumo antes/depois; recuperação para resposta perdida e paginação quando volume justificar.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [global, 1440px, global-accounts](../evidence/b11-global-global-accounts-1440.png): top 3235/3235 source pixels; navegação e leitura, comandos não confirmados.

Não conceder privilégios nem revogar conta durante inventário.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-003 — "Editar conta global"

Componente RecordDrawer, origem `src/components/admin/global-accounts.tsx:16`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Papel global raw e lista longa sem paginação; sem confirmação de resultado incerto entre tentativas.
Preservar: Resumo de conta e privilégio; último admin protegido pelo banco; busca disponível.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-004 — "Revisar conta global"

Componente Dialog, origem `src/components/admin/global-accounts.tsx:17`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Papel global raw e lista longa sem paginação; sem confirmação de resultado incerto entre tentativas.
Preservar: Resumo de conta e privilégio; último admin protegido pelo banco; busca disponível.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
