# SC-011 — Expedir entrega

Rota: `/fichas/ent`. Situação: ACTIVE.
Fonte principal: [src/components/documents/supply-wizard.tsx](../../../../src/components/documents/supply-wizard.tsx).

## Intenção e contexto

Transferir materiais entre família e equipe para destinatário autorizado.

Perfis/capacidades: ent.create. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 582 | Link | Acompanhar ficha <Icon name="arrow" />  | {"/fichas/" + saved.id} |
| 585 | Link | Voltar à central  | "/fichas" |
| 619 | button | Recarregar dados  | {() => {                 setLoading(true);                 setAttempt((value) => value + 1);               }} |

Fontes de interface relacionadas: `src/components/documents/supply-wizard.tsx`, `src/components/documents/document-actions.tsx`, `src/components/workspace.tsx`, `src/components/notifications/document-delivery-status.tsx`, `src/components/forms/wizard-actions.tsx`, `src/components/ui/primitives.tsx`, `src/components/documents/supply-wizard-step.tsx`, `src/components/documents/related-document.tsx`, `src/components/catalog/barcode-scanner.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Destinatário é escolha explícita; expedição avisa trânsito e próxima confirmação.

## Atritos e contraditório

Origem e destinatário corretos na revisão, mas erros de passo anterior podem ficar invisíveis na revisão final; não há busca da lista como na REQ.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Navegar ao primeiro erro e destacar unidade/quantidade e todas as relações antes da emissão.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, ent](../evidence/b11-adminA-ent-390.png): top 861/861 source pixels; navegação e leitura, comandos não confirmados.

Não confundir destinatário com técnica atendida nem alterar autoridade por perfil fixo.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
