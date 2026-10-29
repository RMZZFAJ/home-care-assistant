# SC-043 — Demonstrações públicas

Rota: `/documentos/[demo-id]` . Situação: PUBLIC_DEMO.
Fonte principal:
[src/components/documents/demo-document.tsx](../../../../src/components/documents/demo-document.tsx)
.

## Intenção e contexto

Rever apresentação fictícia e PDF sem dados reais.

Perfis/capacidades: público. O menu não concede autoridade; sessão, API e
banco revalidam o escopo. Dados desta inspeção são fictícios locais.

## Hierarquia e controles

A tabela registra controles da fonte principal. Controles compostos e variantes
condicionais constam nos inventários transversais; não foram todos acionados.

- **Linha:** 25; **Controle:** a; **Texto/nome ou expressão:** Consultar PDF
fictício; **Pré-condição e efeito verificável:** {"/api/demonstracao/" + id +
"/pdf"}.
- **Linha:** 31; **Controle:** a; **Texto/nome ou expressão:** Acessar o
sistema; **Pré-condição e efeito verificável:** "/login".

Fontes de interface relacionadas: `src/components/documents/demo-document.tsx` .

## Estados e origem da verdade

A superfície é avaliada separadamente em consulta inicial, pronta/vazia,
falha, atualização e submissão quando aplicável. O inventário de estados
tem sua taxonomia reconciliada em06_LOADING_STATES_MATRIX.csv; abrir esta página
não comprova
seus ramos de erro, autorização ou resultado incerto. Estado documental,
ledger e decisões permanecem na API/banco; armazenamento da aba não é histórico.

## Méritos a preservar

Aviso sem valor operacional e IDs fixos; não consulta pacientes.

## Atritos e contraditório

Visualização HTML demonstra só materiais, sem reproduzir estados do visualizador
privado.

A ausência de problema numa captura não elimina os riscos estáticos acima.
Permissões ausentes podem explicar a falta de um comando; não são defeito
por si. Recomendações dependem de confirmar o cenário e o papel responsável.

## Proposta concreta e hipótese adversarial

Tratar como demonstração, nunca captura de aceitação de produção; documentar
limites.

Experimento futuro: pedir a uma pessoa deste perfil que explique o resultado
e a próxima responsabilidade após interrupção; observar erro, redigitação e
reconsulta. Se um controle equivalente já resolver a tarefa, preferir tornar
esse caminho descobrível antes de acrescentar página ou configuração.

## Evidência atual e limites

- [public, 390px, demo-1](../evidence/b11-followup-public-demo-1.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-2](../evidence/b11-followup-public-demo-2.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-3](../evidence/b11-followup-public-demo-3.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-4](../evidence/b11-followup-public-demo-4.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-5](../evidence/b11-followup-public-demo-5.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.
- [public, 390px, demo-6](../evidence/b11-followup-public-demo-6.png): top
844/844 source pixels; navegação e leitura, comandos não confirmados.

PDF precisa revisão própria e impressão/QR físico não homologados.

Validação humana, aparelhos físicos e integrações reais: **NOT_VERIFIED**.

## Reconciliação final B1

Esta seção é o estado final; a observação inicial acima permanece
contextualizada pela passada em que foi feita. IDs: SC-043; DEMO-1; DEMO-2;
DEMO-3; DEMO-4; DEMO-5; DEMO-6.

12 registro(s) de captura/estado associado(s), com região inspecionada e
comportamento limitado a cada cenário na matriz01.

- [demo-1](../evidence/b11-followup-public-demo-1.png): public; 390; READY. top
844/844 source pixels.
- [demo-1](../evidence/b11-followup-public-demo-1.png): public; 390; READY. top
844/844 source pixels.
- [demo-2](../evidence/b11-followup-public-demo-2.png): public; 390; READY. top
844/844 source pixels.
- [demo-2](../evidence/b11-followup-public-demo-2.png): public; 390; READY. top
844/844 source pixels.
- [demo-3](../evidence/b11-followup-public-demo-3.png): public; 390; READY. top
844/844 source pixels.
- [demo-3](../evidence/b11-followup-public-demo-3.png): public; 390; READY. top
844/844 source pixels.
- [demo-4](../evidence/b11-followup-public-demo-4.png): public; 390; READY. top
844/844 source pixels.
- [demo-4](../evidence/b11-followup-public-demo-4.png): public; 390; READY. top
844/844 source pixels.
- [demo-5](../evidence/b11-followup-public-demo-5.png): public; 390; READY. top
844/844 source pixels.
- [demo-5](../evidence/b11-followup-public-demo-5.png): public; 390; READY. top
844/844 source pixels.
- [demo-6](../evidence/b11-followup-public-demo-6.png): public; 390; READY. top
844/844 source pixels.
- [demo-6](../evidence/b11-followup-public-demo-6.png): public; 390; READY. top
844/844 source pixels.

Campos deste consumidor: nenhum esquema de entrada próprio; consultar consumidor
composto. Controles de ação relacionados: 2 callsites; inventário canônico em
ACTION_CONTROLS.csv. Não são comandos todos executados.

Nenhum achado raiz adicional atribuído a esta superfície. Preservar os méritos
específicos; ausência de achado não é homologação humana.

Estados por consulta e falha estão em06e05; campos/ações em08e07.
Autorização,rejeição definitiva,resultado desconhecido e retorno de foco não se
inferem de abrir a tela. Lacunas mantidas: variantes não capturadas,leitor de
tela,hardware,rede celular real e compreensão humana.
