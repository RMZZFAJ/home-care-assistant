# SC-025 — Alertas de estoque

Rota: `/admin?section=alerts`. Situação: ACTIVE.
Fonte principal: [src/components/admin/alert-settings.tsx](../../../../src/components/admin/alert-settings.tsx).

## Intenção e contexto

Configurar limites baixo/crítico por produto e custódia.

Perfis/capacidades: access.manage. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 37 | select |  <option value="">Selecione</option> {products .filter((product) => product.is_active !== false) .map((product) => ( <option key={text(product, "id")} value={text(product, "id")}> {text(product, "name")} </option> ))}  | Consultar ramo condicional na fonte |
| 50 | select |  <option value="CARE_TEAM">Equipe de cuidado</option> <option value="FAMILY">Família</option>  | Consultar ramo condicional na fonte |
| 57 | input | Limite baixo <input className={inputClass} name="lowThreshold" inputMode="decimal" defaultValue="0" required pattern="[0-9]+([.,][0-9]{1,6})?" />  | Consultar ramo condicional na fonte |
| 68 | input | Limite crítico <input className={inputClass} name="criticalThreshold" inputMode="decimal" defaultValue="0" required pattern="[0-9]+([.,][0-9]{1,6})?" />  | Consultar ramo condicional na fonte |
| 78 | button | Salvar regra  | "submit" |

Fontes de interface relacionadas: `src/components/admin/alert-settings.tsx`, `src/components/workspace.tsx`, `src/components/admin/admin-fields.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Precisão decimal e escopo por produto/custódia explícitos; regra tem habilitação.

## Atritos e contraditório

Limites default zero sem unidade ao lado; lista usa FAMILY/CARE_TEAM; regra desabilitada inicial pouco saliente.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Unidade resolvida do produto, explicação baixo versus crítico e resumo de habilitação; presets só se usados.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-alerts](../evidence/b11-supplement-adminA-admin-alerts.png): top 881/881 source pixels; navegação e leitura, comandos não confirmados.

Não alterar limites existentes como parte desta auditoria.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
