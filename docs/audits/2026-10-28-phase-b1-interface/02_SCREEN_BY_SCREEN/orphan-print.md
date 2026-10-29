# SC-051 — Impressão aposentada

Rota: `sem rota consumidora`. Situação: UNCONSUMED.
Fonte principal: [src/components/requisitions/print-button.tsx](../../../../src/components/requisitions/print-button.tsx).

## Intenção e contexto

Registrar o controle legado de impressão.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 4 | button | Imprimir / salvar como PDF | {() => window.print()} |

Fontes de interface relacionadas: `src/components/requisitions/print-button.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Não interfere no fluxo de PDF ativo sem importador.

## Atritos e contraditório

Rótulo pode ser contado indevidamente como ação disponível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Excluir da cobertura comportamental ativa e manter rastreabilidade da fonte.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

Renderização desta variante: **NOT_VERIFIED** até exploração suplementar.

Não renderizado; impressão física não homologada.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
