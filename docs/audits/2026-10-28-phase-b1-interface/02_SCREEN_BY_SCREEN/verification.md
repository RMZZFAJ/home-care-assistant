# SC-005 — Verificação pública

Rota: `/verificar/[id]` . Situação: ACTIVE.
Fonte principal:
\[src/app/verificar/\[id\\]/page.tsx](../../../../src/app/verificar/\[id\]/page.tsx).

## Intenção e contexto

Conferir hash e versão sem divulgar conteúdo privado.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 62; **Controle:** a; **Texto/nome ou expressão:** Acessar documento
com autorização; **Pré-condição e efeito verificável:** "/login".

Fontes de interface relacionadas: `src/app/verificar/[id]/page.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Explica limite do SHA-256 e não exibe dados assistenciais.

## Atritos e contraditório

Parâmetros ausentes e ausência de correspondência recebem a mesma frase; acesso
autorizado vai ao login genérico.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Distinguir link incompleto de não correspondência; ação para reler QR ou abrir
documento autorizado com retorno seguro.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, verify-invalid](../evidence/b11-public-verify-invalid-390.png)
: top 844/844 source pixels; navegação e leitura, comandos não confirmados.

QR físico e indisponibilidade real da RPC não homologados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-005.

1 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [verify-invalid](../evidence/b11-public-verify-invalid-390.png): public; 390;
READY_VIEW_STATE. top 844/844 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 1 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
