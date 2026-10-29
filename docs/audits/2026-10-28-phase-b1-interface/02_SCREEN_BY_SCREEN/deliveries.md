# SC-013 — Entregas e recebimentos

Rota: `/entregas`. Situação: ACTIVE.
Fonte principal: [src/components/documents/delivery-inbox.tsx](../../../../src/components/documents/delivery-inbox.tsx).

## Intenção e contexto

Localizar entregas próprias ou histórico autorizado da equipe.

Perfis/capacidades: ent.read; confirmação só destinatário. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 32 | Select | "Responsável pelas entregas" | Consultar ramo condicional na fonte |
| 33 | Select | "Situação das entregas" | Consultar ramo condicional na fonte |
| 35 | Button | Tentar novamente | {() => setAttempt((value) => value + 1)} |
| 36 | Button | Anterior | {page === 1} |
| 36 | Button | Próxima | {page * 20 >= total} |

Fontes de interface relacionadas: `src/components/documents/delivery-inbox.tsx`, `src/components/workspace.tsx`, `src/components/documents/document-history.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Escopo próprio é default do profissional; filtro de situação e paginação; regra do destinatário explicitada.

## Atritos e contraditório

Trocar situação/escopo mantém lista anterior enquanto consulta sem reativar loading; filtro pode divergir do que está visível.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Rotular atualização, bloquear comandos antigos e confirmar vazio somente na resposta da seleção corrente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, deliveries](../evidence/b11-adminA-deliveries-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, deliveries](../evidence/b11-professional-deliveries-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Lista densa e mudanças concorrentes precisam de injeção dirigida.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
