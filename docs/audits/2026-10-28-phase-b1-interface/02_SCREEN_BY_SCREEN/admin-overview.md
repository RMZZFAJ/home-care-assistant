# SC-020 — Centro administrativo

Rota: `/admin` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/administration-navigation.tsx](../../../../src/components/admin/administration-navigation.tsx)
.

## Intenção e contexto

Descobrir tarefas administrativas autorizadas por domínio.

Perfis/capacidades: access.manage/catalog.manage/audit.read. O menu não concede
autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 27; **Controle:** Link; **Texto/nome ou expressão:** Administração;
**Pré-condição e efeito verificável:** {context.patient ?
"/admin?careRecipientId=" + context.patient.id : "/admin"}.
- **Linha:** 27; **Controle:** Button; **Texto/nome ou expressão:** Outras
áreas; **Pré-condição e efeito verificável:** Consultar ramo condicional na
fonte.
- **Linha:** 28; **Controle:** Link; **Texto/nome ou expressão:** &lt;Icon
name={area.icon} /&gt; &lt;h3&gt;{area.title}&lt;/h3&gt;
&lt;p&gt;{area.description}&lt;/p&gt;; **Pré-condição e efeito verificável:**
{"/admin?section=" + area.section + query}.

Fontes de interface relacionadas:
`src/components/admin/administration-navigation.tsx` ,
`src/components/ui/primitives.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Agrupa organização, materiais e comunicação; seção persistida na URL.

## Atritos e contraditório

Pode haver múltiplas entradas para a mesma gestão de acesso e terminologia de
dupla aprovação também no contexto local imediato.

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

- [adminA, 390px, admin-overview](../evidence/b11-supplement-adminA-admin-overview.png)
: top 1030/1601 source pixels; navegação e leitura, comandos não confirmados.

Não redesenhar todo o menu sem evidência de compreensão.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-001 — MenuPopover (título no conteúdo/consumidor)

Componente MenuPopover, origem
`src/components/admin/administration-navigation.tsx:27` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Pode haver múltiplas entradas para a mesma gestão de acesso e terminologia de
dupla aprovação também no contexto local imediato.
Preservar: Agrupa organização, materiais e comunicação; seção persistida na URL.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-020.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [admin-overview](../evidence/b11-supplement-adminA-admin-overview.png):
adminA; 390; READY. top 1030/1601 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 3 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
