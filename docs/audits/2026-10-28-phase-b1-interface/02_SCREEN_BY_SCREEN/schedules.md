# SC-014 — Escalas e plantões

Rota: `/escalas` . Situação: ACTIVE.
Fonte principal:
[src/components/schedules/schedule-console.tsx](../../../../src/components/schedules/schedule-console.tsx)
.

## Intenção e contexto

Programar, propor, decidir, substituir e encerrar plantões.

Perfis/capacidades: schedule.read.own/team; gestão conforme capacidades. O menu
não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 47; **Controle:** Button; **Texto/nome ou expressão:** {team ||
publishOwn ? "Alterar plantão" : "Propor alteração"}; **Pré-condição e efeito
verificável:** {e => open({ kind: "shift", shift: s }, e.currentTarget)}.
- **Linha:** 48; **Controle:** Button; **Texto/nome ou expressão:** Recuperar a
mesma tentativa; **Pré-condição e efeito verificável:** {busy}.
- **Linha:** 50; **Controle:** Button; **Texto/nome ou expressão:** Nova
programação; **Pré-condição e efeito verificável:** {!data?.types.some(t =>
t.is_active)}.
- **Linha:** 51; **Controle:** Button; **Texto/nome ou expressão:** Novo tipo de
plantão; **Pré-condição e efeito verificável:** {e => open({ kind: "type" },
e.currentTarget)}.
- **Linha:** 53; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
type="date" value={day} onChange={e =&gt; { if (e.target.value)
setDay(e.target.value); }} />; **Pré-condição e efeito verificável:** "date".
- **Linha:** 54; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value="week"&gt;Semana&lt;/option&gt; &lt;option
value="month"&gt;Mês&lt;/option&gt;; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 55; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Toda a equipe&lt;/option&gt; {data?.professionals.map(p =>
&lt;option key={p.id} value={p.id}&gt;{p.name}&lt;/option&gt;)};
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 56; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Todas&lt;/option&gt; {Object.entries(stateLabels).map(([k, v]) =>
&lt;option key={k} value={k}&gt;{v}&lt;/option&gt;)}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 60; **Controle:** Button; **Texto/nome ou expressão:** Dia
anterior; **Pré-condição e efeito verificável:** {() => setDay(addDays(day,
-1))}.
- **Linha:** 60; **Controle:** Button; **Texto/nome ou expressão:** Próximo dia;
**Pré-condição e efeito verificável:** {() => setDay(addDays(day, 1))}.
- **Linha:** 61; **Controle:** Button; **Texto/nome ou expressão:** Aprovar
programação; **Pré-condição e efeito verificável:** {() => setReview({
command: { action: "approve", body: { id: s.id } }, version: s.version })}.
- **Linha:** 61; **Controle:** Button; **Texto/nome ou expressão:** Rejeitar
programação; **Pré-condição e efeito verificável:** {e => open({ kind:
"reject", id: s.id, version: s.version }, e.currentTarget)}.
- **Linha:** 61; **Controle:** Button; **Texto/nome ou expressão:** Aprovar
alteração; **Pré-condição e efeito verificável:** {() => setReview({ command:
{ action: "decide_change", body: { id: c.id, approve: true, reason: "Proposta
revisada e aprovada" } } })}.
- **Linha:** 61; **Controle:** Button; **Texto/nome ou expressão:** Rejeitar
alteração; **Pré-condição e efeito verificável:** {e => open({ kind:
"reject_change", id: c.id }, e.currentTarget)}.
- **Linha:** 62; **Controle:** Button; **Texto/nome ou expressão:** Editar tipo;
**Pré-condição e efeito verificável:** {e => open({ kind: "type", type: t },
e.currentTarget)}.
- **Linha:** 62; **Controle:** Button; **Texto/nome ou expressão:** Encerrar
série; **Pré-condição e efeito verificável:** {e => open({ kind: "end", id:
s.id, version: s.version }, e.currentTarget)}.
- **Linha:** 66; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy || uncertain}.
- **Linha:** 66; **Controle:** Button; **Texto/nome ou expressão:** {uncertain ?
"Recuperar confirmação" : "Confirmar gravação"}; **Pré-condição e efeito
verificável:** {busy}.

Fontes de interface relacionadas:
`src/components/schedules/schedule-console.tsx` , `src/components/workspace.tsx`
, `src/components/forms/record-drawer.tsx` , `src/components/ui/primitives.tsx`
, `src/components/schedules/schedule-forms.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Distingue programação de presença; motivo/versionamento; conflito entre
pacientes não expõe outro paciente.

## Atritos e contraditório

Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia;
história expõe event.action e datas de série ISO.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo antes/depois pessoa/tipo/data/fuso/BAL; visualização móvel coerente com
modo e termos humanos.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, schedules](../evidence/b11-adminA-schedules-390.png): top
962/962 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, scale-prior-review-390](../evidence/b11-supplement-adminA-scale-prior-review-390.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados
- [adminA, 1440px, scale-prior-review-1440](../evidence/b11-supplement-adminA-scale-prior-review-1440.png)
: top 1000/1000 source pixels; navegação e leitura, comandos não confirmados.

Publicar alterações reais não faz parte da exploração de revisão; conflitos
serão simulados no cliente local.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-033 — {editor.kind === "type" ? "Tipo de plantão" : editor.kind ===

"series" ? "Programação de plantões" : editor.kind === "end" ? "Encerrar
programação" : "Alteração pontual"}

Componente RecordDrawer, origem
`src/components/schedules/schedule-console.tsx:65` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia;
história expõe event.action e datas de série ISO.
Preservar: Distingue programação de presença; motivo/versionamento; conflito
entre pacientes não expõe outro paciente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-034 — "Revisar escala"

Componente Dialog, origem `src/components/schedules/schedule-console.tsx:66` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo true.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia;
história expõe event.action e datas de série ISO.
Preservar: Distingue programação de presença; motivo/versionamento; conflito
entre pacientes não expõe outro paciente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-014.

10 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [schedules](../evidence/b11-adminA-schedules-390.png): adminA; 390;
READY_VIEW_STATE. top 962/962 source pixels.
- [schedule-type](../evidence/b11-supplement-adminA-schedule-type.png): adminA;
390; READY. top 844/844 source pixels.
- [schedule-series](../evidence/b11-supplement-adminA-schedule-series.png):
adminA; 390; READY. top 844/844 source pixels.

[scale-prior-review-390](../evidence/b11-supplement-adminA-scale-prior-review-390.png)
: adminA; 390; READY. top 844/844 source pixels

[scale-prior-review-1440](../evidence/b11-supplement-adminA-scale-prior-review-1440.png)
: adminA; 1440; READY. top 1000/1000 source pixels.

- [schedule-390](../evidence/b12-visual-adminA-schedule-390.png): adminA; 390;
READY. top 844 of 844px; scaled to 360x650.
- [schedule-1440](../evidence/b12-visual-adminA-schedule-1440.png): adminA;
1440; READY. top 950 of 1000px; scaled to 360x650.

[month-selected-day-rendered](../evidence/b18-accessibility-adminA-month-selected-day-rendered.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650

[decision-dialog1440](../evidence/b18-accessibility-adminA-decision-dialog1440.png)
: adminA; 1440; READY. Original image opened; full viewport/image as
displayed

[decision-after-escape](../evidence/b18-followup-adminA-decision-after-escape.png)
: adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0162; FLD-0163; FLD-0164; FLD-0165; FLD-0166;
FLD-0167; FLD-0168; FLD-0169; FLD-0170; FLD-0171; FLD-0172; FLD-0173; FLD-0174;
FLD-0175; FLD-0176; FLD-0177; FLD-0178; FLD-0179; FLD-0180; FLD-0181; FLD-0182;
FLD-0183; FLD-0184; FLD-0185; FLD-0186; FLD-0187; FLD-0188. Controles de ação
relacionados: 14 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-UX-001](../12_FINDINGS_MASTER.md#b1-ux-001) —
Aprovação de alteração pontual de escala não mostra o objeto da decisão;
[B1-A11Y-002](../12_FINDINGS_MASTER.md#b1-a11y-002) — Fechar decisão e continuar
edição podem devolver foco ao corpo;
[B1-NAV-002](../12_FINDINGS_MASTER.md#b1-nav-002) — Seletor Mês mantém
visualização de dia no móvel.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
