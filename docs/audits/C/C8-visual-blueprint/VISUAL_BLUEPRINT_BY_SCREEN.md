# Projeto visual por superfície

Direção visual aprovada pelo responsável em 04/11/2026. Especificação TO_BE; D
NÃO INICIADA.

97 superfícies B1 e 66 superfícies C3 têm granularidades diferentes. O
cruzamento registra relações muitos-para-muitos e superfícies novas; não soma
os denominadores. Todos os órfãos, redirects e demos têm destino e
justificativa. As fichas abaixo cobrem controles, ações e estados de cada
tela; overlays B1 herdam a ficha indicada e conservam seu papel/dialog/foco.

## Padrões vinculados às fichas

Desktop ≥1200: navegação lateral de 250px, conteúdo máximo1350px, área de
tarefa e ajuda em proporção aproximada1.65/0.95 quando útil. Tablet 651–1199:
duas colunas somente com campos legíveis; rail compacto não pode depender de
tooltip/hover para navegação. Móvel320–650: uma coluna, 16px de margem e
atalhos inferiores Início/REQ/ENT/Estoque/Mais com safe area e todos os
módulos autorizados em Mais. Help crítico vem antes da ação. Tabelas
indispensáveis têm região de rolagem rotulada; totais, unidade e ação não
ficam escondidos fora da viewport.

Tipografia do sistema, azul-petróleo e superfícies claras do HTML. Os pequenos
textos decorativos do protótipo não são garantia de contraste ou legibilidade;
D valida tamanho/contraste/reflow reais. Grid de 4/8px, intervalo16–24px entre
grupos, campos com label/ajuda/erro próximos e alvos principais de 44px são
objetivos de desenho, sujeitos ao ensaio de acesso; não usar cor como única
distinção de seleção/sucesso.

Loading tem skeleton/legenda e não afirma vazio. Atualizando conserva dado
anterior com data. Empty só depois de consulta válida; erro oferece repetir
leitura. Offline mostra frescor e não enfileira aceite; conflito conserva
intenção/edição; uncertain congela comando e consulta mesma chave. Sucesso
identifica efeito/quantidade/próximo responsável; P15 usa barreira persistente
sem conteúdo protegido e mensagem de ação separada.

Diálogo: título/describedby, foco inicial no título/resumo ou primeiro
inválido; Tab contido, Escape/Voltar retornam ao acionador. Destrutiva exige
escopo e confirmação sem default. Ícone decorativo aria-hidden; ação tem texto
visível. Só fechar/ajuda/setas densas podem usar ícone com nome e tooltip
acessível por foco, sem depender de hover. Mudança de filtro não abre modal.
Leitor de tela anuncia status, não repete toda a página.

- [REQ-01 — Selecionar materiais](screens/REQ-01.md).

- [REQ-02 — Revisar requisição](screens/REQ-02.md).

- [REQ-03 — Consultar requisição](screens/REQ-03.md).

- [REQ-04 — Declarar ciência](screens/REQ-04.md).

- [REQ-05 — Usar lista frequente](screens/REQ-05.md).

- [COM-01 — Solicitar aquisição](screens/COM-01.md).

- [COM-02 — Acompanhar aquisição](screens/COM-02.md).

- [COM-03 — Conferir parcela recebida](screens/COM-03.md).

- [COM-04 — Encerrar expectativa remanescente](screens/COM-04.md).

- [ENT-01 — Preparar entrega](screens/ENT-01.md).

- [ENT-02 — Minhas tarefas de entrega](screens/ENT-02.md).

- [ENT-03 — Conferir entrega pessoalmente](screens/ENT-03.md).

- [ENT-04 — Informar divergência](screens/ENT-04.md).

- [ENT-05 — Resolver pedido de cancelamento](screens/ENT-05.md).

- [ENT-06 — Encaminhar exceção e sucessão](screens/ENT-06.md).

- [BAL-01 — Organizar contagens por plantão](screens/BAL-01.md).

- [BAL-02 — Contar materiais](screens/BAL-02.md).

- [BAL-03 — Consultar ou iniciar revisão](screens/BAL-03.md).

- [BAL-04 — Designar substituta para reconto](screens/BAL-04.md).

- [BAL-05 — Decidir adiamento](screens/BAL-05.md).

- [ESC-01 — Consultar escala](screens/ESC-01.md).

- [ESC-02 — Preparar série de plantões](screens/ESC-02.md).

- [ESC-03 — Decidir alteração de plantão](screens/ESC-03.md).

- [ESC-04 — Alterar ocorrência ou série](screens/ESC-04.md).

- [EST-01 — Consultar estoques](screens/EST-01.md).

- [EST-02 — Registrar movimento familiar](screens/EST-02.md).

- [EST-03 — Consultar origem de movimento](screens/EST-03.md).

- [EST-04 — Transferir ou devolver material](screens/EST-04.md).

- [CAT-01 — Gerir catálogo local](screens/CAT-01.md).

- [CAT-02 — Consultar unidades e precisão](screens/CAT-02.md).

- [CAT-03 — Gerir apresentações](screens/CAT-03.md).

- [CAT-04 — Tratar possível duplicata](screens/CAT-04.md).

- [CAT-05 — Selecionar e conferir apresentação](screens/CAT-05.md).

- [CON-01 — Consultar relatos e pendências](screens/CON-01.md).

- [CON-02 — Registrar informação operacional](screens/CON-02.md).

- [CON-03 — Complementar relato](screens/CON-03.md).

- [CON-04 — Decidir consumo](screens/CON-04.md).

- [ID-01 — Entrar e recuperar conta](screens/ID-01.md).

- [ID-02 — Meu perfil e preferências](screens/ID-02.md).

- [ID-03 — Aceitar vínculo com segurança](screens/ID-03.md).

- [ID-04 — Gerir profissionais e vínculos](screens/ID-04.md).

- [ID-05 — Selecionar contexto e lidar com acesso alterado](screens/ID-05.md).

- [ARQ-01 — Anexar prova autorizada](screens/ARQ-01.md).

- [ARQ-02 — Recuperar ou abandonar envio](screens/ARQ-02.md).

- [RAS-01 — Continuar edição privada](screens/RAS-01.md).

- [RAS-02 — Comparar edições concorrentes](screens/RAS-02.md).

- [NOT-01 — Consultar avisos e tarefas](screens/NOT-01.md).

- [NOT-02 — Preferências e aparelhos](screens/NOT-02.md).

- [NOT-03 — Definir regras de avisos](screens/NOT-03.md).

- [NOT-04 — Instalar e atualizar aplicativo](screens/NOT-04.md).

- [NOT-05 — Conciliar falha técnica](screens/NOT-05.md).

- [DOC-01 — Localizar documento e versão](screens/DOC-01.md).

- [DOC-02 — Entender história do documento](screens/DOC-02.md).

- [DOC-03 — Baixar ou emitir exemplar](screens/DOC-03.md).

- [DOC-04 — Consultar referência mínima](screens/DOC-04.md).

- [DOC-05 — Comparar exemplar e assinatura](screens/DOC-05.md).

- [ADM-01 — Ver próximas tarefas](screens/ADM-01.md).

- [ADM-02 — Administrar recursos autorizados](screens/ADM-02.md).

- [ADM-03 — Comparar configuração atual e proposta](screens/ADM-03.md).

- [ADM-04 — Decidir proposta administrativa](screens/ADM-04.md).

- [ADM-05 — Auditar e encaminhar incidente](screens/ADM-05.md).

- [ADM-06 — Mais ações e retorno seguro](screens/ADM-06.md).

- [GUI-01 — Apresentação e ajuda por perfil](screens/GUI-01.md).

- [GUI-02 — Preparar nova residência](screens/GUI-02.md).

- [GUI-03 — Regularizar contingência](screens/GUI-03.md).

- [GUI-04 — Recuperar serviço com segurança](screens/GUI-04.md).
