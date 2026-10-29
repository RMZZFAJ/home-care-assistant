# SC-024 — Catálogo

Rota: `/admin?section=catalog`. Situação: ACTIVE.
Fonte principal: [src/components/admin/catalogue-management.tsx](../../../../src/components/admin/catalogue-management.tsx).

## Intenção e contexto

Manter catálogo local ou adotar modelo existente.

Perfis/capacidades: catalog.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 20 | Button | Novo item | {(event) => setEditor({ row: null, mode: "product", opener: event.currentTarget })} |
| 20 | Button | Adotar modelo | {(event) => setEditor({ row: null, mode: "model", opener: event.currentTarget })} |
| 21 | Input | "Pesquisar catálogo" | "search" |
| 21 | Select | "Situação dos produtos" | Consultar ramo condicional na fonte |
| 22 | Button | {"Editar " + text(row, "name")} | {(event) => setEditor({ row, mode: "product", opener: event.currentTarget })} |
| 23 | Button | Anterior | {page <= 1} |
| 23 | Button | Próxima | {page * 15 >= filtered.length} |
| 26 | Select | <option value="">Selecione</option> {templates.map((row) => <option key={text(row, "id")} value={text(row, "id")}>{text(row, "name")} · {text(row, "unit")}</option>)} | Consultar ramo condicional na fonte |
| 26 | Button | Adotar modelo | {busy} |
| 28 | Select | <option value="medicamentos">Medicamentos</option> <option value="higiene">Higiene</option> <option value="dieta">Dieta</option> | Consultar ramo condicional na fonte |
| 34 | Button | Salvar item | {busy} |

Fontes de interface relacionadas: `src/components/admin/catalogue-management.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca, ativo/inativo, paginação, drawer contextual e proteção de unidades com história.

## Atritos e contraditório

Unidade livre apesar de cadastro próprio; aliases por vírgula; nomes longos quebram tabela em muitas linhas.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Seleção canônica com exceção contratual, chips de aliases, nome mais largo e coluna de ações próxima.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-catalog](../evidence/b11-adminA-admin-catalog-390.png): top 1030/1793 source pixels; navegação e leitura, comandos não confirmados.

Mudança de unidade histórica exige decisão de domínio, não apenas componente.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-002 — {editor.mode === "model" ? "Adotar modelo existente" : editing ? "Editar item" : "Adicionar item exclusivo deste paciente"}

Componente RecordDrawer, origem `src/components/admin/catalogue-management.tsx:24`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Unidade livre apesar de cadastro próprio; aliases por vírgula; nomes longos quebram tabela em muitas linhas.
Preservar: Busca, ativo/inativo, paginação, drawer contextual e proteção de unidades com história.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
