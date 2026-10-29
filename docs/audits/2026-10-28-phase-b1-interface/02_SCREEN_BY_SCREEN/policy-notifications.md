# SC-033 — Matriz de notificações

Rota: `/configuracoes?area=notifications`. Situação: ACTIVE.
Fonte principal: [src/components/admin/notification-matrix.tsx](../../../../src/components/admin/notification-matrix.tsx).

## Intenção e contexto

Configurar eventos/funções/canais e opções de comunicação.

Perfis/capacidades: access.manage ou proposta global. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 149 | Input | "Pesquisar eventos de notificação" | "search" |
| 149 | Select | "Função nas notificações" | Consultar ramo condicional na fonte |
| 152 | Checkbox | {documentEventLabel(event) + " · " + label + " · " + channel.label} | {busy \|\| pending} |
| 152 | Button | {"Opções de " + documentEventLabel(event) + " · " + label} | {busy \|\| pending} |
| 156 | select |  <option value="optional"> Conforme preferências pessoais </option> <option value="required"> Obrigatório no aplicativo </option> <option value="silent"> Silencioso no aplicativo </option>  | {busy \|\| pending} |
| 176 | input |  <input type="checkbox" disabled={ busy \|\| pending \|\| event === "req.registered_author" } checked={ event !== "req.registered_author" && (rule?.include_pdf ?? true) } onChange={(change) => update(event, role, { inclu | {                             busy \|\| pending \|\| event === "req.registered_author"                           } |
| 195 | input | Intervalo mínimo (min) <input type="number" className={inputClass} min={0} max={10080} disabled={busy \|\| pending} key={rule?.cooldown_minutes ?? 0} defaultValue={rule?.cooldown_minutes ?? 0} onBlur={(change) => { if (  | {busy \|\| pending} |
| 222 | select | {index ? "Fim" : "Início"} | {busy \|\| pending} |

Fontes de interface relacionadas: `src/components/admin/notification-matrix.tsx`, `src/components/workspace.tsx`, `src/components/admin/admin-fields.tsx`, `src/components/ui/primitives.tsx`, `src/components/forms/record-drawer.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Diz salvamento imediato, reconsulta servidor e respeita provedor/consentimento.

## Atritos e contraditório

Ícones representam canais sem legenda persistente no toque; edição otimista com falha de reconsulta pode conservar aparência não confirmada; blur salva número.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Legenda e estado salvando/confirmado/não confirmado por célula; foco por função; não converter checkbox em switch mecanicamente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, policy-notifications](../evidence/b11-supplement-adminA-policy-notifications.png): top 1030/1187 source pixels; navegação e leitura, comandos não confirmados.

Entrega real e aceitação Meta não inferidas da matriz.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-007 — {documentEventLabel(event) + " · " + label}

Componente RecordDrawer, origem `src/components/admin/notification-matrix.tsx:153`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Ícones representam canais sem legenda persistente no toque; edição otimista com falha de reconsulta pode conservar aparência não confirmada; blur salva número.
Preservar: Diz salvamento imediato, reconsulta servidor e respeita provedor/consentimento.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
