# SC-050 — Inventário aposentado

Rota: `sem rota consumidora` . Situação: UNCONSUMED.
Fonte principal:
[src/components/stock/inventory-console.tsx](../../../../src/components/stock/inventory-console.tsx)
.

## Intenção e contexto

Registrar o console anterior sem confundir com BAL atual.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 45; **Controle:** button; **Texto/nome ou expressão:** Atualizar
consulta; **Pré-condição e efeito verificável:** {() => { setLoading(true);
setAttempt((value) => value + 1); }}.
- **Linha:** 46; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="CARE_TEAM"&gt;Equipe de cuidado&lt;/option&gt; &lt;option
value="FAMILY"&gt;Família&lt;/option&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 46; **Controle:** button; **Texto/nome ou expressão:** Abrir
inventário; **Pré-condição e efeito verificável:** {busy || loading}.
- **Linha:** 47; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione&lt;/option&gt; {rows.map((item) => &lt;option
key={item.id} value={item.id}&gt;{formatBrazilDate(item.created_at)} ·
{custody\[item.location\]} · {labels\[item.status\] ??
item.status}&lt;/option&gt;)}; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 48; **Controle:** button; **Texto/nome ou expressão:** Atualizar;
**Pré-condição e efeito verificável:** {loading || busy}.
- **Linha:** 49; **Controle:** input; **Texto/nome ou expressão:** Contagem
&lt;input type="number" name="countedQuantity" min="0" step="1" required
defaultValue={item.is_counted === false ? "" : item.counted_quantity}
className={inputClass} /&gt;; **Pré-condição e efeito verificável:** "number".
- **Linha:** 49; **Controle:** input; **Texto/nome ou expressão:** Justificativa
da divergência &lt;input name="justification" maxLength={1000}
defaultValue={item.justification ?? ""} className={inputClass} /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 49; **Controle:** button; **Texto/nome ou expressão:** Salvar
contagem; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 50; **Controle:** button; **Texto/nome ou expressão:** Submeter
contagem para revisão; **Pré-condição e efeito verificável:** {busy ||
loading}.
- **Linha:** 51; **Controle:** button; **Texto/nome ou expressão:** Iniciar
revisão; **Pré-condição e efeito verificável:** {busy || loading}.
- **Linha:** 51; **Controle:** button; **Texto/nome ou expressão:** Aprovar e
ajustar estoque; **Pré-condição e efeito verificável:** {busy || loading}.
- **Linha:** 52; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="cancel"&gt;Cancelar inventário&lt;/option&gt; {canReview &&
selected.status !== "draft" && &lt;option value="reject"&gt;Rejeitar
contagem&lt;/option&gt;}; **Pré-condição e efeito verificável:** Consultar
ramo condicional na fonte.
- **Linha:** 52; **Controle:** textarea; **Texto/nome ou expressão:** Motivo
&lt;textarea name="reason" required minLength={3} maxLength={1000} rows={2}
className={inputClass} /&gt;; **Pré-condição e efeito verificável:** Consultar
ramo condicional na fonte.
- **Linha:** 52; **Controle:** button; **Texto/nome ou expressão:** Confirmar
revisão; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 53; **Controle:** button; **Texto/nome ou expressão:** Iniciar nova
contagem com referência atual; **Pré-condição e efeito verificável:** {busy ||
loading}.
- **Linha:** 55; **Controle:** button; **Texto/nome ou expressão:** Anterior;
**Pré-condição e efeito verificável:** {loading || page <= 1}.
- **Linha:** 55; **Controle:** button; **Texto/nome ou expressão:** Próxima;
**Pré-condição e efeito verificável:** {loading || page*20 >= total}.

Fontes de interface relacionadas: `src/components/stock/inventory-console.tsx` ,
`src/components/workspace.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Rota /inventarios redireciona, preservando links.

## Atritos e contraditório

Console ainda no código não é experiência ativa; sua presença não prova
duplicação visível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Documentar o sucessor e decidir retenção técnica na Fase C.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

A primeira passada não tinha renderização desta variante; o estado final e as
lacunas estão abaixo.

Não renderizado; nenhuma rota artificial criada.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-050.

Sem captura correspondente ao objeto/overlay exato; leitura estática não é
aprovação visual.

Campos deste consumidor: FLD-0198; FLD-0199; FLD-0200; FLD-0201; FLD-0202;
FLD-0203. Controles de ação relacionados: 14 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
