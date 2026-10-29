# SC-038 — Mais opções

Rota: `/mais`. Situação: ACTIVE.
Fonte principal: [src/components/navigation/more-actions.tsx](../../../../src/components/navigation/more-actions.tsx).

## Intenção e contexto

Dar acesso móvel às tarefas fora da barra inferior.

Perfis/capacidades: capacidades efetivas. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 19 | Link |  <span className="hca-task-icon"><Icon name={action.icon} /></span> <span className="hca-record-main"><strong>{action.label}</strong><small>{action.description}</small></span> <Icon name="arrow" />  | {action.href} |

Fontes de interface relacionadas: `src/components/navigation/more-actions.tsx`, `src/components/workspace.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Descrições por intenção e filtragem por capacidade; mantém cinco destinos operacionais.

## Atritos e contraditório

Catálogo e unidades abre só unidades; termos custódia e Nova compra subrepresentam doação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Nomes coerentes com destinos; preferências acessíveis por tarefa, mantendo navegação existente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, more](../evidence/b11-adminA-more-390.png): top 928/928 source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, more](../evidence/b11-professional-more-390.png): top 844/844 source pixels; navegação e leitura, comandos não confirmados.

Não remover destino compatível por parecer duplicado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.
