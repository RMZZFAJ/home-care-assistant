# SC-021 — Cadastro do paciente

Rota: `/admin?section=patient` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/patient-registration.tsx](../../../../src/components/admin/patient-registration.tsx)
.

## Intenção e contexto

Editar nome/situação ou cadastrar paciente com administrador inicial explícito.

Perfis/capacidades: admin local; global conforme contexto. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 96; **Controle:** button; **Texto/nome ou expressão:** {creating ||
!patient?.id ? "Criar paciente" : "Salvar paciente"}; **Pré-condição e efeito
verificável:** "submit".
- **Linha:** 100; **Controle:** button; **Texto/nome ou expressão:** {creating ?
"Editar atual" : "Novo paciente"}; **Pré-condição e efeito verificável:**
{onToggle}.

Fontes de interface relacionadas:
`src/components/admin/patient-registration.tsx` , `src/components/workspace.tsx`
, `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Escopo local declarado; novo cadastro global requer conta confirmada; história
preservada.

## Atritos e contraditório

Desativação por checkbox+Salvar não resume efeito em novas operações; texto de
desenvolvimento exige contexto técnico.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Resumo claro de suspensão de novas operações e manutenção do histórico; manter
checkbox com salvar.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-patient](../evidence/b11-adminA-admin-patient-390.png):
top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não desativar paciente existente para provar experiência.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-021.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-patient](../evidence/b11-adminA-admin-patient-390.png): adminA; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [global-patients](../evidence/b11-global-global-patients-1440.png): global;
1440; READY_VIEW_STATE. top 1000/1000 source pixels.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0047; FLD-0048;
FLD-0049; FLD-0050. Controles de ação relacionados: 3 callsites; inventário
canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
