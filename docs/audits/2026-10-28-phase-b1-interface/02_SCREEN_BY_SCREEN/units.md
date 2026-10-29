# SC-035 — Unidades e apresentações

Rota: `/unidades`. Situação: ACTIVE.
Fonte principal: [src/components/catalog/unit-console.tsx](../../../../src/components/catalog/unit-console.tsx).

## Intenção e contexto

Criar unidades e converter código de embalagem em quantidade base.

Perfis/capacidades: catalog.manage ou global. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 91 | Button | Nova unidade | {(event) => setEditor({ mode: "unit", opener: event.currentTarget })} |
| 91 | Button | Configurar apresentação | {(event) => setEditor({ mode: "presentation", opener: event.currentTarget })} |
| 92 | Input | "Pesquisar unidades" | "search" |
| 117 | select |  {context.patient && !globalMode ? ( <option value="patient">Paciente selecionado</option> ) : null} {globalMode ? <option value="global">Global</option> : null}  | Consultar ramo condicional na fonte |
| 126 | input | Código <input name="code" className={inputClass} maxLength={30} required />  | Consultar ramo condicional na fonte |
| 135 | input | Nome <input name="name" className={inputClass} minLength={2} maxLength={80} required />  | Consultar ramo condicional na fonte |
| 145 | select |  <option value="count">Contagem</option> <option value="volume">Volume</option> <option value="mass">Massa</option> <option value="package">Embalagem</option>  | Consultar ramo condicional na fonte |
| 154 | input | Casas decimais <input name="decimals" className={inputClass} type="number" min="0" max="6" defaultValue="0" required />  | "number" |
| 164 | button | Criar unidade  | {busy} |
| 179 | select |  <option value="">Selecione</option> {products.map((product) => ( <option key={product.id} value={product.id}> {product.name} </option> ))}  | Consultar ramo condicional na fonte |
| 216 | select |  {units .filter( (unit) => !unit.care_recipient_id \|\| unit.care_recipient_id === context.patient?.id, ) .map((unit) => ( <option key={unit.id} value={unit.code}> {unit.name} </option> ))}  | Consultar ramo condicional na fonte |
| 236 | input | Precisão do produto <input name="decimals" type="number" min="0" max="6" className={inputClass} defaultValue={product.quantity_decimals ?? 0} required />  | "number" |
| 248 | input | EAN / GTIN / UPC opcional <input name="barcode" inputMode="numeric" pattern="[0-9]{8,14}" className={inputClass} />  | Consultar ramo condicional na fonte |
| 257 | input | Nome da apresentação <input name="name" className={inputClass} placeholder="Caixa com 20 unidades" />  | Consultar ramo condicional na fonte |
| 265 | input | Quantidade base por embalagem <input name="baseQuantity" type="number" min="0.000001" step="any" className={inputClass} />  | "number" |
| 273 | button | Salvar unidade / apresentação  | {busy} |

Fontes de interface relacionadas: `src/components/catalog/unit-console.tsx`, `src/components/workspace.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Unidades históricas protegidas; dimensão e precisão; escopo global/local claro.

## Atritos e contraditório

Sem listagem de apresentações existentes para consultar/editar; busca sem match deixa tabela vazia sem estado específico; nome/quantidade da embalagem não required condicionalmente ao código.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Lista por produto com exemplos da conversão, campos condicionais e erro associado; vazio por filtro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, units](../evidence/b11-adminA-units-390.png): top 1030/1106 source pixels; navegação e leitura, comandos não confirmados.

Não inventar conversão de embalagem ou alterar medida de produto com história.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-015 — "Nova unidade"

Componente RecordDrawer, origem `src/components/catalog/unit-console.tsx:96`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Sem listagem de apresentações existentes para consultar/editar; busca sem match deixa tabela vazia sem estado específico; nome/quantidade da embalagem não required condicionalmente ao código.
Preservar: Unidades históricas protegidas; dimensão e precisão; escopo global/local claro.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-016 — "Unidade base e código de embalagem"

Componente RecordDrawer, origem `src/components/catalog/unit-console.tsx:171`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Sem listagem de apresentações existentes para consultar/editar; busca sem match deixa tabela vazia sem estado específico; nome/quantidade da embalagem não required condicionalmente ao código.
Preservar: Unidades históricas protegidas; dimensão e precisão; escopo global/local claro.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
