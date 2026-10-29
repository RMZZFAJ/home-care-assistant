# SC-031 — Regras do paciente

Rota: `/configuracoes?area=rules`. Situação: ACTIVE.
Fonte principal: [src/components/admin/policy-rules.tsx](../../../../src/components/admin/policy-rules.tsx).

## Intenção e contexto

Editar política versionada por grupo.

Perfis/capacidades: access.manage ou proposta global. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 25 | Button | {"Editar " + group.title} | {(event) => { onStartEditing(); setEditor({ group: group.code, baseline: settings, opener: event.currentTarget }); }} |
| 29 | Select | <option value="">Não configurado</option> {days.map((day, index) => <option key={day} value={index}>{day}</option>)} | Consultar ramo condicional na fonte |
| 30 | Select | <option value="optional">Opcional</option> <option value="required">Obrigatória</option> | Consultar ramo condicional na fonte |
| 31 | Checkbox | {roles[role as keyof typeof roles]} | Consultar ramo condicional na fonte |
| 32 | Select | <option value="any">Qualquer grupo</option> <option value="all">Todos · pessoas distintas</option> | Consultar ramo condicional na fonte |
| 35 | Checkbox | {label} | Consultar ramo condicional na fonte |
| 36 | Checkbox | {roles[role as keyof typeof roles]} | Consultar ramo condicional na fonte |
| 37 | Select | <option value="any">Uma pessoa autorizada</option> <option value="all">Todas as pessoas responsáveis</option> | Consultar ramo condicional na fonte |
| 40 | Checkbox | "Aceite ENT simplificado pelo WhatsApp verificado" | Consultar ramo condicional na fonte |
| 41 | Input | <Input name="patientShortName" maxLength={60} defaultValue={String(values.patientShortName ?? "")} /> | Consultar ramo condicional na fonte |
| 42 | Input | <Input name={String(key)} type="number" min={Number(min)} max={Number(max)} required defaultValue={String(values[String(key)])} /> | "number" |
| 45 | Input | <Input name="archiveDays" type="number" required min={1} max={365} defaultValue={String(values.archiveDays)} /> | "number" |
| 46 | Button | Registrar política | {busy} |

Fontes de interface relacionadas: `src/components/admin/policy-rules.tsx`, `src/components/forms/record-drawer.tsx`, `src/components/ui/primitives.tsx`, `src/components/workspace.tsx`, `src/components/admin/reminder-settings.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Snapshot de edição, grupos revisáveis e distinção local/proposta; documentos antigos preservam emissão.

## Atritos e contraditório

Nome curto vazio não é enviado para remover; regras BAL legadas coexistem com programação por plantão; shareWaitSeconds não controla DocumentActions.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Indicar quais regras pertencem ao regime ativo, permitir remoção explícita de nome curto e tornar configurações efetivas verificáveis.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy](../evidence/b11-adminA-policy-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Contrato de política permanece no servidor e não é configuração arbitrária de garantias.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-010 — {groups.find((group) => group.code === editor.group)?.title ?? "Editar política"}

Componente RecordDrawer, origem `src/components/admin/policy-rules.tsx:26`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Nome curto vazio não é enviado para remover; regras BAL legadas coexistem com programação por plantão; shareWaitSeconds não controla DocumentActions.
Preservar: Snapshot de edição, grupos revisáveis e distinção local/proposta; documentos antigos preservam emissão.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
