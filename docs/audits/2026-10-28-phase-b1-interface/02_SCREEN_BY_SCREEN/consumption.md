# SC-019 — Ocorrências

Rota: `/consumo`. Situação: ACTIVE.
Fonte principal: [src/components/stock/consumption-console.tsx](../../../../src/components/stock/consumption-console.tsx).

## Intenção e contexto

Relatar falta/consumo e submeter a confirmação autorizada.

Perfis/capacidades: consumption.report/confirm e custódia. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 113 | Button | Registrar ocorrência | {(event) => setEditor(event.currentTarget)} |
| 147 | select |  <option value="consumption">Consumo extraordinário</option> <option value="shortage">Falta de material</option>  | Consultar ramo condicional na fonte |
| 154 | select |  <option value="CARE_TEAM">Equipe</option> {can(context, "stock.family.read") ? ( <option value="FAMILY">Família</option> ) : null}  | Consultar ramo condicional na fonte |
| 163 | textarea | O que aconteceu? <textarea name="text" className={inputClass} minLength={3} maxLength={2000} rows={3} required />  | Consultar ramo condicional na fonte |
| 183 | input |  <input type="checkbox" checked={Object.hasOwn(lines, product.id)} onChange={(event) => setLines((current) => { const next = { ...current }; if (event.target.checked) next[product.id] = ""; else delete next[product.id];  | "checkbox" |
| 200 | input | Quantidade · {product.unit} <input className={inputClass} type="number" inputMode="decimal" min="0.000001" step="any" value={lines[product.id]} onChange={(event) => setLines({ ...lines, [product.id]: event.target.value,  | "number" |
| 222 | button |  {uncertain ? "Recuperar relato" : "Registrar para conferência"}  | {busy} |
| 270 | button | Confirmar relato e movimento  | {busy} |
| 277 | button | Rejeitar relato  | {busy} |
| 295 | Button | Voltar | {busy \|\| uncertain} |
| 295 | Button | {uncertain ? "Recuperar confirmação" : review.accept ? "Confirmar consumo" : "Confirmar rejeição"} | {busy} |

Fontes de interface relacionadas: `src/components/stock/consumption-console.tsx`, `src/components/workspace.tsx`, `src/components/stock/flow-reviews.tsx`, `src/components/ui/primitives.tsx`, `src/components/forms/record-drawer.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Relato e débito são separados; seleção de linhas e confirmação de efeito; preserva tentativa incerta em memória.

## Atritos e contraditório

Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra mensagem genérica mesmo depois de débito; catálogo/relatos dependem de Promise.all.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Fila recuperável com alvo exato, estados explícitos e feedback específico para relatado/confirmado/rejeitado.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, consumption](../evidence/b11-adminA-consumption-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Volume 101 e Flow externo são contratos distintos; não chamar canal real.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-035 — "Registrar relato"

Componente RecordDrawer, origem `src/components/stock/consumption-console.tsx:115`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra mensagem genérica mesmo depois de débito; catálogo/relatos dependem de Promise.all.
Preservar: Relato e débito são separados; seleção de linhas e confirmação de efeito; preserva tentativa incerta em memória.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-036 — "Revisar confirmação do relato"

Componente Dialog, origem `src/components/stock/consumption-console.tsx:295`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Não tem estado de leitura; limite recente e ref ignorado; confirmação mostra mensagem genérica mesmo depois de débito; catálogo/relatos dependem de Promise.all.
Preservar: Relato e débito são separados; seleção de linhas e confirmação de efeito; preserva tentativa incerta em memória.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
