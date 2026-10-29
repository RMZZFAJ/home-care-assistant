# SC-038 — Mais opções

Rota: `/mais` . Situação: ACTIVE.
Fonte principal:
[src/components/navigation/more-actions.tsx](../../../../src/components/navigation/more-actions.tsx)
.

## Intenção e contexto

Dar acesso móvel às tarefas fora da barra inferior.

Perfis/capacidades: capacidades efetivas. O menu não concede autoridade; sessão,
API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 19; **Controle:** Link; **Texto/nome ou expressão:** &lt;span
className="hca-task-icon"&gt;&lt;Icon name={action.icon} /&gt;&lt;/span&gt;
&lt;span
className="hca-record-main"&gt;&lt;strong&gt;{action.label}&lt;/strong&gt;&lt;small&gt;{action.description}&lt;/small&gt;&lt;/span&gt;
&lt;Icon name="arrow" /&gt;; **Pré-condição e efeito verificável:**
{action.href}.

Fontes de interface relacionadas: `src/components/navigation/more-actions.tsx` ,
`src/components/workspace.tsx` , `src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Descrições por intenção e filtragem por capacidade; mantém cinco destinos
operacionais.

## Atritos e contraditório

Catálogo e unidades abre só unidades; termos custódia e Nova compra
subrepresentam doação.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Nomes coerentes com destinos; preferências acessíveis por tarefa, mantendo
navegação existente.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [adminA, 390px, more](../evidence/b11-adminA-more-390.png): top 928/928
source pixels; navegação e leitura, comandos não confirmados.
- [professional, 390px, more](../evidence/b11-professional-more-390.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.

Não remover destino compatível por parecer duplicado.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-038.

2 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [Mais — captura da navegação](../evidence/b11-adminA-more-390.png): adminA;
  390; READY_VIEW_STATE.
top 928/928 source pixels.
- [Mais — captura da navegação](../evidence/b11-professional-more-390.png):
  professional; 390;
READY_VIEW_STATE. top 844/844 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 1 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Diagnósticos associados: [B1-NAV-001](../12_FINDINGS_MASTER.md#b1-nav-001) —
Alguns nomes de destino não correspondem à tarefa aberta.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
