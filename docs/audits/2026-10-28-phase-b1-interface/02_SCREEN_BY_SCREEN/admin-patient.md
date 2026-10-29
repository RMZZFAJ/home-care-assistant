# SC-021 — Cadastro do paciente

Rota: `/admin?section=patient`. Situação: ACTIVE.
Fonte principal: [src/components/admin/patient-registration.tsx](../../../../src/components/admin/patient-registration.tsx).

## Intenção e contexto

Editar nome/situação ou cadastrar paciente com administrador inicial explícito.

Perfis/capacidades: admin local; global conforme contexto. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 96 | button |  {creating \|\| !patient?.id ? "Criar paciente" : "Salvar paciente"}  | "submit" |
| 100 | button |  {creating ? "Editar atual" : "Novo paciente"}  | {onToggle} |

Fontes de interface relacionadas: `src/components/admin/patient-registration.tsx`, `src/components/workspace.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Escopo local declarado; novo cadastro global requer conta confirmada; história preservada.

## Atritos e contraditório

Desativação por checkbox+Salvar não resume efeito em novas operações; texto de desenvolvimento exige contexto técnico.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo claro de suspensão de novas operações e manutenção do histórico; manter checkbox com salvar.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-patient](../evidence/b11-adminA-admin-patient-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não desativar paciente existente para provar experiência.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
