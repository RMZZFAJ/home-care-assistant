# SC-020 — Centro administrativo

Rota: `/admin`. Situação: ACTIVE.
Fonte principal: [src/components/admin/administration-navigation.tsx](../../../../src/components/admin/administration-navigation.tsx).

## Intenção e contexto

Descobrir tarefas administrativas autorizadas por domínio.

Perfis/capacidades: access.manage/catalog.manage/audit.read. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

| Linha | Controle | Texto/nome ou expressão | Pré-condição e efeito verificável |
| --- | --- | --- | --- |
| 27 | Link | Administração | {context.patient ? "/admin?careRecipientId=" + context.patient.id : "/admin"} |
| 27 | Button | Outras áreas | Consultar ramo condicional na fonte |
| 28 | Link | <Icon name={area.icon} /> <h3>{area.title}</h3> <p>{area.description}</p> | {"/admin?section=" + area.section + query} |

Fontes de interface relacionadas: `src/components/admin/administration-navigation.tsx`, `src/components/ui/primitives.tsx`.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
receberá a taxonomia do contrato real em B1.5; abrir esta página não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Agrupa organização, materiais e comunicação; seção persistida na URL.

## Atritos e contraditório

Pode haver múltiplas entradas para a mesma gestão de acesso e terminologia de dupla aprovação também no contexto local imediato.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Explicar quando a alteração é imediata ou proposta e orientar pela intenção.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, admin-overview](../evidence/b11-supplement-adminA-admin-overview.png): top 1030/1601 source pixels; navegação e leitura, comandos não confirmados.

Não redesenhar todo o menu sem evidência de compreensão.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-001 — MenuPopover (título no conteúdo/consumidor)

Componente MenuPopover, origem `src/components/admin/administration-navigation.tsx:27`.
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Pode haver múltiplas entradas para a mesma gestão de acesso e terminologia de dupla aprovação também no contexto local imediato.
Preservar: Agrupa organização, materiais e comunicação; seção persistida na URL.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.
