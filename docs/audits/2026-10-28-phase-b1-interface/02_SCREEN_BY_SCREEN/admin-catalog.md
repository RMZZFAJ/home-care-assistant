# SC-024 — Catálogo

Rota: `/admin?section=catalog` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/catalogue-management.tsx](../../../../src/components/admin/catalogue-management.tsx)
.

## Intenção e contexto

Manter catálogo local ou adotar modelo existente.

Perfis/capacidades: catalog.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 20; **Controle:** Button; **Texto/nome ou expressão:** Novo item;
**Pré-condição e efeito verificável:** {(event) => setEditor({ row: null,
mode: "product", opener: event.currentTarget })}.
- **Linha:** 20; **Controle:** Button; **Texto/nome ou expressão:** Adotar
modelo; **Pré-condição e efeito verificável:** {(event) => setEditor({ row:
null, mode: "model", opener: event.currentTarget })}.
- **Linha:** 21; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
catálogo"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 21; **Controle:** Select; **Texto/nome ou expressão:** "Situação
dos produtos"; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 22; **Controle:** Button; **Texto/nome ou expressão:** {"Editar " +
text(row, "name")}; **Pré-condição e efeito verificável:** {(event) =>
setEditor({ row, mode: "product", opener: event.currentTarget })}.
- **Linha:** 23; **Controle:** Button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {page <= 1}.
- **Linha:** 23; **Controle:** Button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {page * 15 >= filtered.length}.
- **Linha:** 26; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione&lt;/option&gt; {templates.map((row) => &lt;option
key={text(row, "id")} value={text(row, "id")}&gt;{text(row, "name")} ·
{text(row, "unit")}&lt;/option&gt;)}; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 26; **Controle:** Button; **Texto/nome ou expressão:** Adotar
modelo; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 28; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value="medicamentos"&gt;Medicamentos&lt;/option&gt; &lt;option
value="higiene"&gt;Higiene&lt;/option&gt; &lt;option
value="dieta"&gt;Dieta&lt;/option&gt;; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 34; **Controle:** Button; **Texto/nome ou expressão:** Salvar item;
**Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas:
`src/components/admin/catalogue-management.tsx` , `src/components/workspace.tsx`
, `src/components/ui/primitives.tsx` , `src/components/forms/record-drawer.tsx`
, `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Busca, ativo/inativo, paginação, drawer contextual e proteção de unidades com
história.

## Atritos e contraditório

Unidade livre apesar de cadastro próprio; aliases por vírgula; nomes longos
quebram tabela em muitas linhas.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Seleção canônica com exceção contratual, chips de aliases, nome mais largo e
coluna de ações próxima.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-catalog](../evidence/b11-adminA-admin-catalog-390.png):
top 1030/1793 source pixels; navegação e leitura, comandos não confirmados.

Mudança de unidade histórica exige decisão de domínio, não apenas componente.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-002 — {editor.mode === "model" ? "Adotar modelo existente" : editing ?

"Editar item" : "Adicionar item exclusivo deste paciente"}

Componente RecordDrawer, origem
`src/components/admin/catalogue-management.tsx:24` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Unidade livre apesar de cadastro próprio; aliases por vírgula; nomes longos
quebram tabela em muitas linhas.
Preservar: Busca, ativo/inativo, paginação, drawer contextual e proteção de
unidades com história.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-024.

7 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-catalog](../evidence/b11-adminA-admin-catalog-390.png): adminA; 390;
READY_VIEW_STATE. top 1030/1793 source pixels.
- [catalog-new](../evidence/b11-supplement-adminA-catalog-new.png): adminA;
390; READY. top 844/844 source pixels.
- [catalog-model](../evidence/b11-supplement-adminA-catalog-model.png): adminA;
390; READY. top 844/844 source pixels.
- [catalog-320](../evidence/b12-drawer-adminA-catalog-320.png): adminA; 320;
READY. top 844 of 844px; scaled to 360x650.
- [skip-link](../evidence/b18-accessibility-adminA-skip-link.png): adminA; 390;
READY. top 844 of 844px; scaled to 360x650.
- [dirty-drawer](../evidence/b18-accessibility-adminA-dirty-drawer.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.
- [administration-menu](../evidence/b18-overlays-adminA-administration-menu.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0016; FLD-0017;
FLD-0018; FLD-0019; FLD-0020; FLD-0021; FLD-0022; FLD-0023; FLD-0024; FLD-0025.
Controles de ação relacionados: 9 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-A11Y-002](../12_FINDINGS_MASTER.md#b1-a11y-002) —
Fechar decisão e continuar edição podem devolver foco ao corpo.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
