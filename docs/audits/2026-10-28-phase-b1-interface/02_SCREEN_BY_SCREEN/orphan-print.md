# SC-051 — Impressão aposentada

Rota: `sem rota consumidora` . Situação: UNCONSUMED.
Fonte principal:
[src/components/requisitions/print-button.tsx](../../../../src/components/requisitions/print-button.tsx)
.

## Intenção e contexto

Registrar o controle legado de impressão.

Perfis/capacidades: sem consumidor encontrado. O menu não concede autoridade;
sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 4; **Controle:** button; **Texto/nome ou expressão:** Imprimir /
salvar como PDF; **Pré-condição e efeito verificável:** {() =>
window.print()}.

Fontes de interface relacionadas: `src/components/requisitions/print-button.tsx`
.

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
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

A primeira passada não tinha renderização desta variante; o estado final e as
lacunas estão abaixo.

Não renderizado; impressão física não homologada.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-051.

Sem captura correspondente ao objeto/overlay exato; leitura estática não é
aprovação visual.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 1 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
