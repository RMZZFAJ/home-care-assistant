# SC-035 — Unidades e apresentações

Rota: `/unidades` . Situação: ACTIVE.
Fonte principal:
[src/components/catalog/unit-console.tsx](../../../../src/components/catalog/unit-console.tsx)
.

## Intenção e contexto

Criar unidades e converter código de embalagem em quantidade base.

Perfis/capacidades: catalog.manage ou global. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 91; **Controle:** Button; **Texto/nome ou expressão:** Nova
unidade; **Pré-condição e efeito verificável:** {(event) => setEditor({ mode:
"unit", opener: event.currentTarget })}.
- **Linha:** 91; **Controle:** Button; **Texto/nome ou expressão:** Configurar
apresentação; **Pré-condição e efeito verificável:** {(event) => setEditor({
mode: "presentation", opener: event.currentTarget })}.
- **Linha:** 92; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
unidades"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 117; **Controle:** select; **Texto/nome ou expressão:**
{context.patient && !globalMode ? ( &lt;option value="patient"&gt;Paciente
selecionado&lt;/option&gt; ) : null} {globalMode ? &lt;option
value="global"&gt;Global&lt;/option&gt; : null}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 126; **Controle:** input; **Texto/nome ou expressão:** Código
&lt;input name="code" className={inputClass} maxLength={30} required /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 135; **Controle:** input; **Texto/nome ou expressão:** Nome
&lt;input name="name" className={inputClass} minLength={2} maxLength={80}
required /&gt;; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 145; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="count"&gt;Contagem&lt;/option&gt; &lt;option
value="volume"&gt;Volume&lt;/option&gt; &lt;option
value="mass"&gt;Massa&lt;/option&gt; &lt;option
value="package"&gt;Embalagem&lt;/option&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 154; **Controle:** input; **Texto/nome ou expressão:** Casas
decimais &lt;input name="decimals" className={inputClass} type="number"
min="0" max="6" defaultValue="0" required /&gt;; **Pré-condição e efeito
verificável:** "number".
- **Linha:** 164; **Controle:** button; **Texto/nome ou expressão:** Criar
unidade; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 179; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione&lt;/option&gt; {products.map((product) => ( &lt;option
key={product.id} value={product.id}&gt; {product.name} &lt;/option&gt; ))};
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 216; **Controle:** select; **Texto/nome ou expressão:** {units
.filter( (unit) => !unit.care_recipient_id || unit.care_recipient_id ===
context.patient?.id, ) .map((unit) => ( &lt;option key={unit.id}
value={unit.code}&gt; {unit.name} &lt;/option&gt; ))}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 236; **Controle:** input; **Texto/nome ou expressão:** Precisão do
produto &lt;input name="decimals" type="number" min="0" max="6"
className={inputClass} defaultValue={product.quantity_decimals ?? 0} required
/&gt;; **Pré-condição e efeito verificável:** "number".
- **Linha:** 248; **Controle:** input; **Texto/nome ou expressão:** EAN / GTIN /
UPC opcional &lt;input name="barcode" inputMode="numeric"
pattern="[0-9]{8,14}" className={inputClass} /&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 257; **Controle:** input; **Texto/nome ou expressão:** Nome da
apresentação &lt;input name="name" className={inputClass} placeholder="Caixa
com 20 unidades" /&gt;; **Pré-condição e efeito verificável:** Consultar ramo
condicional na fonte.
- **Linha:** 265; **Controle:** input; **Texto/nome ou expressão:** Quantidade
base por embalagem &lt;input name="baseQuantity" type="number" min="0.000001"
step="any" className={inputClass} /&gt;; **Pré-condição e efeito
verificável:** "number".
- **Linha:** 273; **Controle:** button; **Texto/nome ou expressão:** Salvar
unidade / apresentação; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/catalog/unit-console.tsx` ,
`src/components/workspace.tsx` , `src/components/forms/record-drawer.tsx` ,
`src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Unidades históricas protegidas; dimensão e precisão; escopo global/local claro.

## Atritos e contraditório

Sem listagem de apresentações existentes para consultar/editar; busca sem match
deixa tabela vazia sem estado específico; nome/quantidade da embalagem não
required condicionalmente ao código.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Lista por produto com exemplos da conversão, campos condicionais e erro
associado; vazio por filtro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, units](../evidence/b11-adminA-units-390.png): top 1030/1106
source pixels; navegação e leitura, comandos não confirmados.

Não inventar conversão de embalagem ou alterar medida de produto com história.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-015 — "Nova unidade"

Componente RecordDrawer, origem `src/components/catalog/unit-console.tsx:96` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Sem listagem de apresentações existentes para consultar/editar; busca sem match
deixa tabela vazia sem estado específico; nome/quantidade da embalagem não
required condicionalmente ao código.
Preservar: Unidades históricas protegidas; dimensão e precisão; escopo
global/local claro.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-016 — "Unidade base e código de embalagem"

Componente RecordDrawer, origem `src/components/catalog/unit-console.tsx:171` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Sem listagem de apresentações existentes para consultar/editar; busca sem match
deixa tabela vazia sem estado específico; nome/quantidade da embalagem não
required condicionalmente ao código.
Preservar: Unidades históricas protegidas; dimensão e precisão; escopo
global/local claro.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-035.

6 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [units](../evidence/b11-adminA-units-390.png): adminA; 390; READY_VIEW_STATE.
top 1030/1106 source pixels.
- [unit-new](../evidence/b11-supplement-adminA-unit-new.png): adminA; 390;
READY. top 844/844 source pixels.
- [presentation](../evidence/b11-supplement-adminA-presentation.png): adminA;
390; READY. top 844/844 source pixels.
- [units-390](../evidence/b12-visual-adminA-units-390.png): adminA; 390; READY.
top 844 of 844px; scaled to 360x650.
- [units-1440](../evidence/b12-visual-adminA-units-1440.png): adminA; 1440;
READY. top 950 of 1000px; scaled to 360x650.

[forced-colors-emulated](../evidence/b18-accessibility-adminA-forced-colors-emulated.png)
: adminA; 320; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0093; FLD-0094; FLD-0095; FLD-0096; FLD-0097;
FLD-0098; FLD-0099; FLD-0100; FLD-0101; FLD-0102; FLD-0103; FLD-0104. Controles
de ação relacionados: 6 callsites; inventário canônico em ACTION_CONTROLS.csv.
Não são comandos todos executados.

Diagnósticos associados: [B1-FORM-002](../12_FINDINGS_MASTER.md#b1-form-002) —
Validações não acompanham limites e foco dos campos em todos os caminhos;
[B1-FORM-005](../12_FINDINGS_MASTER.md#b1-form-005) — Apresentações têm cadastro
sem visão equivalente de consulta/gestão no consumidor.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
