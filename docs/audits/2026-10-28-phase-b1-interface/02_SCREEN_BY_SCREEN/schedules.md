# SC-014 — Escalas e plantões

Rota: `/escalas`. Situação: ACTIVE.
Fonte principal: [src/components/schedules/schedule-console.tsx](../../../../src/components/schedules/schedule-console.tsx).

## Intenção e contexto

Programar, propor, decidir, substituir e encerrar plantões.

Perfis/capacidades: schedule.read.own/team; gestão conforme capacidades. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 47 | Button | {team \|\| publishOwn ? "Alterar plantão" : "Propor alteração"} | {e => open({ kind: "shift", shift: s }, e.currentTarget)} |
| 48 | Button | Recuperar a mesma tentativa | {busy} |
| 50 | Button | Nova programação | {!data?.types.some(t => t.is_active)} |
| 51 | Button | Novo tipo de plantão | {e => open({ kind: "type" }, e.currentTarget)} |
| 53 | Input | <Input type="date" value={day} onChange={e => { if (e.target.value) setDay(e.target.value); }} /> | "date" |
| 54 | Select | <option value="week">Semana</option> <option value="month">Mês</option> | Consultar ramo condicional na fonte |
| 55 | Select | <option value="">Toda a equipe</option> {data?.professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} | Consultar ramo condicional na fonte |
| 56 | Select | <option value="">Todas</option> {Object.entries(stateLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)} | Consultar ramo condicional na fonte |
| 60 | Button | Dia anterior | {() => setDay(addDays(day, -1))} |
| 60 | Button | Próximo dia | {() => setDay(addDays(day, 1))} |
| 61 | Button | Aprovar programação | {() => setReview({ command: { action: "approve", body: { id: s.id } }, version: s.version })} |
| 61 | Button | Rejeitar programação | {e => open({ kind: "reject", id: s.id, version: s.version }, e.currentTarget)} |
| 61 | Button | Aprovar alteração | {() => setReview({ command: { action: "decide_change", body: { id: c.id, approve: true, reason: "Proposta revisada e aprovada" } } })} |
| 61 | Button | Rejeitar alteração | {e => open({ kind: "reject_change", id: c.id }, e.currentTarget)} |
| 62 | Button | Editar tipo | {e => open({ kind: "type", type: t }, e.currentTarget)} |
| 62 | Button | Encerrar série | {e => open({ kind: "end", id: s.id, version: s.version }, e.currentTarget)} |
| 66 | Button | Voltar | {busy \|\| uncertain} |
| 66 | Button | {uncertain ? "Recuperar confirmação" : "Confirmar gravação"} | {busy} |

Fontes de interface relacionadas: `src/components/schedules/schedule-console.tsx`, `src/components/workspace.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`, `src/components/schedules/schedule-forms.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Distingue programação de presença; motivo/versionamento; conflito entre pacientes não expõe outro paciente.

## Atritos e contraditório

Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia; história expõe event.action e datas de série ISO.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo antes/depois pessoa/tipo/data/fuso/BAL; visualização móvel coerente com modo e termos humanos.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, schedules](../evidence/b11-adminA-schedules-390.png): top 962/962 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 390px, scale-prior-review-390](../evidence/b11-supplement-adminA-scale-prior-review-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [adminA, 1440px, scale-prior-review-1440](../evidence/b11-supplement-adminA-scale-prior-review-1440.png): top 1000/1000 source pixels; navegação e leitura, comandos não confirmados.

Publicar alterações reais não faz parte da exploração de revisão; conflitos serão simulados no cliente local.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-033 — {editor.kind === "type" ? "Tipo de plantão" : editor.kind === "series" ? "Programação de plantões" : editor.kind === "end" ? "Encerrar programação" : "Alteração pontual"}

Componente RecordDrawer, origem `src/components/schedules/schedule-console.tsx:65`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia; história expõe event.action e datas de série ISO.
Preservar: Distingue programação de presença; motivo/versionamento; conflito entre pacientes não expõe outro paciente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-034 — "Revisar escala"

Componente Dialog, origem `src/components/schedules/schedule-console.tsx:66`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo true.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Confirmação omite objeto concreto; Mês no móvel continua mostrando só dia; história expõe event.action e datas de série ISO.
Preservar: Distingue programação de presença; motivo/versionamento; conflito entre pacientes não expõe outro paciente.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
