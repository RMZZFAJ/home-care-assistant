# D3.62 — leitura conferida do estoque e referência BAL

As consultas de saldos, trânsito e movimentos validam a resposta recebida
antes de adotá-la. Campos ausentes, quantidades inválidas, duplicidades,
datas ilegíveis e divergências de paciente, custódia, página ou filtros
geram mensagem de recuperação. A última leitura válida do mesmo âmbito
permanece identificada com sua data. Uma consulta incorreta de outro
âmbito não substitui os dados atuais nem produz um vazio confirmado.

Os modelos preservam saldo negativo, ausência de custódia autorizada,
material inativo, mínimo ausente ou zero e médias com mais casas decimais.
Os limites de escrita continuam nos comandos nativos. As respostas das
APIs acrescentam o paciente e a seleção efetivamente consultados. Os
campos anteriores permanecem disponíveis aos consumidores existentes.

## Referência da contagem

A revisão BAL agendada reutiliza balance_count_reference, que obtém
revisão e quantidades no próprio banco e possui a autorização específica
bal.read. A visão geral de estoque deixou de ser a origem dessa revisão.
O consumidor compara as revisões e o conjunto de materiais antes de
avançar. O caminho sem regime valida a mesma resposta em sua abertura,
revisão e atualização de referência.

Uma falha de leitura preserva a contagem física e permite consultar de
novo. Mudança comprovada de estoque, catálogo, plantão ou responsável
continua exigindo a conferência apropriada. Quantidade indisponível
deixa de entrar nessa revisão como zero presumido.

O aviso no colgroup de StockOverview foi corrigido. As colunas usam
identificadores semânticos estáveis. O ESLint dirigido confirmou a
correção do apontamento no arquivo solicitado.

## Validação

Passaram 47 testes unitários/API e 30 cenários de navegador com Auth
real nos perfis Chromium desktop, Mobile Chromium e WebKit. A coorte de
estoque aprovou 18 casos, incluindo
101 materiais, cinco larguras, permissão da equipe, resposta invertida,
erro/vazio, histórico paginado e respostas 200 corrompidas. A coorte BAL
aprovou 12 casos de revisão, observação anterior e recuperação de resposta
perdida, nos modos agendado e sem regime.

O caso novo de BAL retira stock.team.read do profissional no paciente
fictício. A consulta geral recebe 403 e a revisão autorizada obtém a
referência própria de três unidades. Respostas inválida ou de outro
paciente conservam os dois campos físicos e as notas. A leitura válida
mostra a diferença correta, com zero nova ficha ou movimento pela UI.
Os testes conferem os fatos oficiais antes e depois. Tipos e lint dos
fontes afetados passaram.

### Corrida no teste anterior do catálogo

A CI do baseline 23fce86 falhou no caso de recuperação do gestor delegado
em Mobile Chromium. O teste retirava a permissão ao ver a intenção congelada,
estado que aparece enquanto o pedido ainda está em andamento. O servidor
podia receber essa retirada antes de confirmar o ato e responder 403.

O teste agora aguarda a confirmação e a perda controlada de sua resposta
antes da retirada. Continua exigindo o mesmo pacote, recuperação única,
preservação de documentos e estoque e recusa de uma nova chave. Os dois
casos envolvidos passaram nos três perfis, totalizando seis verificações
adicionais e 36 cenários distintos no lote. O caso de sucessor passou
sem alteração; seu primeiro timeout e o retry aprovado na CI foram
preservados como observação intermitente. A CI própria continua necessária.

### Remoto e validação conjunta

O remoto segue reconciliado em 205 migrations. O dry-run está vazio.
O incremento reutiliza as funções nativas existentes. Instalação limpa
e evolução legada do baseline 23fce86 passaram na CI observada, junto
às validações Linux/Windows. A CI do novo SHA continua sendo um gate
próprio. [Resultados](STOCK_READ_VALIDATION.json).

## Plano de fechamento

A revisão de planejamento criou etapas finitas com escopo, condição de
fechamento e pontos individuais. Os 75 critérios canônicos e os 30
complementos aparecem no registro de etapas. O conteúdo e os estados dos
105 critérios foram preservados. A organização permite registrar um
bloco local concluído enquanto seu critério composto ainda tem trabalho
em outra etapa.

As etapas 01, 02, 03 e 07 têm conclusão local no escopo declarado. A 03
foi fechada neste incremento. A próxima execução é a 04, com seis pontos
de conferência das fichas. Os nove formulários restantes têm lista própria
na etapa 14. [Registro fixo](EXECUTION_STAGES.csv) e
[quadro funcional](../../../../TEMP_D_B_ATUALIZACAO.md).

## D3.69 — listas de estoque e histórico acima de100 movimentos

Base4de848c. O ponto05.1 foi conferido sem mudança no produto. Os17 fontes
registrados no pacote anterior continuam idênticos. A comparação Git com
90f832d também confirmou os consumidores de estoque, APIs, leitor compartilhado,
autorização, quantidades, migrations, dependências e quatro arquivos de testes
anteriores sem alterações. Os18 cenários de estoque da coorte D3.62 são
reaproveitados explicitamente; não foram executados novamente. Os demais casos
BAL e catálogo daquele pacote não entram nessa contagem.

A lacuna era o volume do histórico: o caso anterior percorria23 movimentos.
O novo caso cria101 entradas pelo comando nativo com Auth real e percorre a
lista com mais de100 registros, página por página. A sequência completa de
IDs deve coincidir com SQL independente sobre o ledger, por data e ID em ordem
decrescente. O teste recusa perda, duplicação e interrupção na primeira página.

O filtro de produto percorre mais de50 registros e o período usa os limites
do dia em São Paulo, reiniciando a paginação. Uma resposta real do produto
anterior é retida e entregue depois de mudar produto e página; a tela conserva
a seleção atual. Somente o teste retira o sinal de abort desse GET para
comprovar a resposta tardia, sem mudança no fetch de produção. Há liberação
garantida da resposta retida. Período futuro produz vazio verdadeiro; limpar
os filtros retorna à primeira página original. Nenhum POST operacional parte
da leitura; snapshots completos de documentos e movimentos permanecem iguais.

Passaram três execuções novas, uma por perfil, com build de produção e fontes
congelados, sem falhas, repetições ou casos ignorados. Tipos e lint dirigido
passaram. São21 cenários de estoque qualificados:18 anteriores reaproveitados
e3 novos. A aparência, cinco larguras/axe, autorização da equipe, resposta
invertida de custódia e validação de respostas corrompidas mantêm as provas
anteriores, pois seus consumidores e dependências estão intactos.

Sem SQL novo; dry-run remoto vazio em205. Ponto05.1 fechado localmente;
próximo05.2, fichas e requisições. Restam os outros nove pontos de listas,
validação conjunta e CI do SHA publicado. Os105 critérios mantêm56 PASS locais
e49 PARTIAL. O complemento DOC-A/B/C/D permanece separado e não recebe nova
aprovação por esta conferência.
