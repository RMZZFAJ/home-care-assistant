# SC-030 — Contas globais

Rota: `/admin?section=profiles` . Situação: ACTIVE.
Fonte principal:
[src/components/admin/global-accounts.tsx](../../../../src/components/admin/global-accounts.tsx)
.

## Intenção e contexto

Editar identidade/status/papel global sem confundir vínculo local.

Perfis/capacidades: globalAdministrationAllowed. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 15; **Controle:** Input; **Texto/nome ou expressão:** "Pesquisar
contas globais"; **Pré-condição e efeito verificável:** "search".
- **Linha:** 15; **Controle:** Button; **Texto/nome ou expressão:** {"Editar
conta " + text(row, "full_name")}; **Pré-condição e efeito verificável:**
{(event) => setEditor({ row, opener: event.currentTarget })}.
- **Linha:** 16; **Controle:** Select; **Texto/nome ou expressão:** {["admin",
"supervisor", "professional", "reader"].map((role) => &lt;option key={role}
value={role}&gt;{role}&lt;/option&gt;)}; **Pré-condição e efeito
verificável:** Consultar ramo condicional na fonte.
- **Linha:** 16; **Controle:** Button; **Texto/nome ou expressão:** Revisar
alteração; **Pré-condição e efeito verificável:** "submit".
- **Linha:** 17; **Controle:** Button; **Texto/nome ou expressão:** Voltar;
**Pré-condição e efeito verificável:** {busy}.
- **Linha:** 17; **Controle:** Button; **Texto/nome ou expressão:** Confirmar
conta global; **Pré-condição e efeito verificável:** {busy}.

Fontes de interface relacionadas: `src/components/admin/global-accounts.tsx` ,
`src/components/forms/record-drawer.tsx` , `src/components/ui/primitives.tsx` ,
`src/components/workspace.tsx` , `src/components/admin/admin-fields.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Resumo de conta e privilégio; último admin protegido pelo banco; busca
disponível.

## Atritos e contraditório

Papel global raw e lista longa sem paginação; sem confirmação de resultado
incerto entre tentativas.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Tradução do papel e resumo antes/depois; recuperação para resposta perdida e
paginação quando volume justificar.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [global, 1440px, global-accounts](../evidence/b11-global-global-accounts-1440.png)
: top 3235/3235 source pixels; navegação e leitura, comandos não confirmados.

Não conceder privilégios nem revogar conta durante inventário.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## OVL-003 — "Editar conta global"

Componente RecordDrawer, origem `src/components/admin/global-accounts.tsx:16` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo condicional do consumidor.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Papel global raw e lista longa sem paginação; sem confirmação de resultado
incerto entre tentativas.
Preservar: Resumo de conta e privilégio; último admin protegido pelo banco;
busca disponível.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## OVL-004 — "Revisar conta global"

Componente Dialog, origem `src/components/admin/global-accounts.tsx:17` .
Intenção: consulta/edição contextual dentro da jornada acima; o conteúdo exato
segue o ramo {Boolean(review)}.
Conferir nomes, objeto, efeito e possibilidade de retorno antes de confirmar.
Papel global raw e lista longa sem paginação; sem confirmação de resultado
incerto entre tentativas.
Preservar: Resumo de conta e privilégio; último admin protegido pelo banco;
busca disponível.
Prova de abrir/fechar esta variante: NOT_VERIFIED até o registro suplementar.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-030.

4 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [global-accounts](../evidence/b11-global-global-accounts-1440.png): global;
1440; READY_VIEW_STATE. top 3235/3235 source pixels.
- [global-identities](../evidence/b18-journeys-global-global-identities.png):
global; 390; READY. top 844 of 844px; scaled to 360x650.

[global-account-editor](../evidence/b18-overlays-global-global-account-editor.png)
: global; 390; READY. top 844 of 844px; scaled to 360x650; masked area
NOT_VERIFIED; text/source read separately

[global-account-review](../evidence/b18-overlays-global-global-account-review.png)
: global; 390; READY. top 844 of 844px; scaled to 360x650; masked area
NOT_VERIFIED; text/source read separately.

Campos deste consumidor: FLD-0008; FLD-0009; FLD-0010; FLD-0026; FLD-0027;
FLD-0028; FLD-0029; FLD-0030. Controles de ação relacionados: 5 callsites;
inventário canônico em ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
