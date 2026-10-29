# SC-025 — Alertas de estoque

Rota: `/admin?section=alerts` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/alert-settings.tsx](../../../../src/components/admin/alert-settings.tsx)
.

## Intenção e contexto

Configurar limites baixo/crítico por produto e custódia.

Perfis/capacidades: access.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 37; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Selecione&lt;/option&gt; {products .filter((product) =>
product.is_active !== false) .map((product) => ( &lt;option key={text(product,
"id")} value={text(product, "id")}&gt; {text(product, "name")} &lt;/option&gt;
))}; **Pré-condição e efeito verificável:** Consultar ramo condicional na
fonte.
- **Linha:** 50; **Controle:** select; **Texto/nome ou expressão:** &lt;option
value="CARE_TEAM"&gt;Equipe de cuidado&lt;/option&gt; &lt;option
value="FAMILY"&gt;Família&lt;/option&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 57; **Controle:** input; **Texto/nome ou expressão:** Limite baixo
&lt;input className={inputClass} name="lowThreshold" inputMode="decimal"
defaultValue="0" required pattern="\[0-9\]+(`[.,][0-9]`{1,6})?" /&gt;;
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 68; **Controle:** input; **Texto/nome ou expressão:** Limite
crítico &lt;input className={inputClass} name="criticalThreshold"
inputMode="decimal" defaultValue="0" required
pattern="\[0-9\]+(`[.,][0-9]`{1,6})?" /&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 78; **Controle:** button; **Texto/nome ou expressão:** Salvar
regra; **Pré-condição e efeito verificável:** "submit".

Fontes de interface relacionadas: `src/components/admin/alert-settings.tsx` ,
`src/components/workspace.tsx` , `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Precisão decimal e escopo por produto/custódia explícitos; regra tem
habilitação.

## Atritos e contraditório

Limites default zero sem unidade ao lado; lista usa FAMILY/CARE_TEAM; regra
desabilitada inicial pouco saliente.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Unidade resolvida do produto, explicação baixo versus crítico e resumo de
habilitação; presets só se usados.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-alerts](../evidence/b11-supplement-adminA-admin-alerts.png)
: top 881/881 source pixels; navegação e leitura, comandos não confirmados.

Não alterar limites existentes como parte desta auditoria.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-025.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-alerts](../evidence/b11-supplement-adminA-admin-alerts.png): adminA;
390; READY. top 881/881 source pixels.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0011; FLD-0012;
FLD-0013; FLD-0014; FLD-0015. Controles de ação relacionados: 2 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
