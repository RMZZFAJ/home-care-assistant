# SC-050 — Inventário aposentado

Rota: `sem rota consumidora`. Situação: UNCONSUMED.
Fonte principal: [src/components/stock/inventory-console.tsx](../../../../src/components/stock/inventory-console.tsx).

## Intenção e contexto

Registrar o console anterior sem confundir com BAL atual.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 45 | button | Atualizar consulta | {() => { setLoading(true); setAttempt((value) => value + 1); }} |
| 46 | select | <option value="CARE_TEAM">Equipe de cuidado</option> <option value="FAMILY">Família</option> | Consultar ramo condicional na fonte |
| 46 | button | Abrir inventário | {busy \|\| loading} |
| 47 | select | <option value="">Selecione</option> {rows.map((item) => <option key={item.id} value={item.id}>{formatBrazilDate(item.created_at)} · {custody[item.location]} · {labels[item.status] ?? item.status}</option>)} | Consultar ramo condicional na fonte |
| 48 | button | Atualizar | {loading \|\| busy} |
| 49 | input | Contagem <input type="number" name="countedQuantity" min="0" step="1" required defaultValue={item.is_counted === false ? "" : item.counted_quantity} className={inputClass} /> | "number" |
| 49 | input | Justificativa da divergência <input name="justification" maxLength={1000} defaultValue={item.justification ?? ""} className={inputClass} /> | Consultar ramo condicional na fonte |
| 49 | button | Salvar contagem | {busy} |
| 50 | button | Submeter contagem para revisão | {busy \|\| loading} |
| 51 | button | Iniciar revisão | {busy \|\| loading} |
| 51 | button | Aprovar e ajustar estoque | {busy \|\| loading} |
| 52 | select | <option value="cancel">Cancelar inventário</option> {canReview && selected.status !== "draft" && <option value="reject">Rejeitar contagem</option>} | Consultar ramo condicional na fonte |
| 52 | textarea | Motivo <textarea name="reason" required minLength={3} maxLength={1000} rows={2} className={inputClass} /> | Consultar ramo condicional na fonte |
| 52 | button | Confirmar revisão | {busy} |
| 53 | button | Iniciar nova contagem com referência atual | {busy \|\| loading} |
| 55 | button | Anterior | {loading \|\| page <= 1} |
| 55 | button | Próxima | {loading \|\| page*20 >= total} |

Fontes de interface relacionadas: `src/components/stock/inventory-console.tsx`, `src/components/workspace.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Rota /inventarios redireciona, preservando links.

## Atritos e contraditório

Console ainda no código não é experiência ativa; sua presença não prova duplicação visível.

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

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

Não renderizado; nenhuma rota artificial criada.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
