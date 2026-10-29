# SC-031 — Regras do paciente

Rota: `/configuracoes?area=rules` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/policy-rules.tsx](../../../../src/components/admin/policy-rules.tsx)
.

## Intenção e contexto

Editar política versionada por grupo.

Perfis/capacidades: access.manage ou proposta global. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 25; **Controle:** Button; **Texto/nome ou expressão:** {"Editar " +
group.title}; **Pré-condição e efeito verificável:** {(event) => {
onStartEditing(); setEditor({ group: group.code, baseline: settings, opener:
event.currentTarget }); }}.
- **Linha:** 29; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value=""&gt;Não configurado&lt;/option&gt; {days.map((day, index) =>
&lt;option key={day} value={index}&gt;{day}&lt;/option&gt;)}; **Pré-condição e
efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 30; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value="optional"&gt;Opcional&lt;/option&gt; &lt;option
value="required"&gt;Obrigatória&lt;/option&gt;; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 31; **Controle:** Checkbox; **Texto/nome ou expressão:**
{roles[role as keyof typeof roles]}; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 32; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value="any"&gt;Qualquer grupo&lt;/option&gt; &lt;option value="all"&gt;Todos ·
pessoas distintas&lt;/option&gt;; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 35; **Controle:** Checkbox; **Texto/nome ou expressão:** {label};
**Pré-condição e efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 36; **Controle:** Checkbox; **Texto/nome ou expressão:**
{roles[role as keyof typeof roles]}; **Pré-condição e efeito verificável:**
Consultar ramo condicional na fonte.
- **Linha:** 37; **Controle:** Select; **Texto/nome ou expressão:** &lt;option
value="any"&gt;Uma pessoa autorizada&lt;/option&gt; &lt;option
value="all"&gt;Todas as pessoas responsáveis&lt;/option&gt;; **Pré-condição e
efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 40; **Controle:** Checkbox; **Texto/nome ou expressão:** "Aceite
ENT simplificado pelo WhatsApp verificado"; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 41; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
name="patientShortName" maxLength={60}
defaultValue={String(values.patientShortName ?? "")} /&gt;; **Pré-condição e
efeito verificável:** Consultar ramo condicional na fonte.
- **Linha:** 42; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
name={String(key)} type="number" min={Number(min)} max={Number(max)} required
defaultValue={String(values[String(key)])} /&gt;; **Pré-condição e efeito
verificável:** "number".
- **Linha:** 45; **Controle:** Input; **Texto/nome ou expressão:** &lt;Input
name="archiveDays" type="number" required min={1} max={365}
defaultValue={String(values.archiveDays)} /&gt;; **Pré-condição e efeito
verificável:** "number".
- **Linha:** 46; **Controle:** Button; **Texto/nome ou expressão:** Registrar
política; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/admin/policy-rules.tsx` ,
`src/components/forms/record-drawer.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/workspace.tsx` , `src/components/admin/reminder-settings.tsx` ,
`src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Snapshot de edição, grupos revisáveis e distinção local/proposta; documentos
antigos preservam emissão.

## Atritos e contraditório

Nome curto vazio não é enviado para remover; regras BAL legadas coexistem com
programação por plantão; shareWaitSeconds não controla DocumentActions.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Indicar quais regras pertencem ao regime ativo, permitir remoção explícita de
nome curto e tornar configurações efetivas verificáveis.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy](../evidence/b11-adminA-policy-390.png): top 844/844
source pixels; navegação e leitura, comandos não confirmados.

Contrato de política permanece no servidor e não é configuração arbitrária de
garantias.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-010 — {groups.find((group) => group.code === editor.group)?.title ??

"Editar política"}

Componente RecordDrawer, origem `src/components/admin/policy-rules.tsx:26` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Nome curto vazio não é enviado para remover; regras BAL legadas coexistem com
programação por plantão; shareWaitSeconds não controla DocumentActions.
Preservar: Snapshot de edição, grupos revisáveis e distinção local/proposta;
documentos antigos preservam emissão.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-031.

3 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [policy](../evidence/b11-adminA-policy-390.png): adminA; 390;
READY_VIEW_STATE. top 844/844 source pixels.
- [policy-messages](../evidence/b11-supplement-adminA-policy-messages.png):
adminA; 390; READY. top 844/844 source pixels.
- [policy-rule-editor](../evidence/b18-overlays-adminA-policy-rule-editor.png):
adminA; 390; READY. top 844 of 844px; scaled to 360x650.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0057; FLD-0058;
FLD-0059; FLD-0060; FLD-0061; FLD-0062; FLD-0063; FLD-0064; FLD-0065; FLD-0066;
FLD-0067; FLD-0068; FLD-0069; FLD-0070; FLD-0071; FLD-0072. Controles de ação
relacionados: 3 callsites; inventário canônico em ACTION_CONTROLS.csv. Não são
comandos todos executados.

Diagnósticos associados: [B1-FORM-007](../12_FINDINGS_MASTER.md#b1-form-007) —
Apagar nome curto não comunica intenção de remoção;
[B1-VIS-001](../12_FINDINGS_MASTER.md#b1-vis-001) — Fundação visual precisa de
consolidação orientada pelo resultado, com exceções explícitas.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
