# Complemento documental da D-B

**Precedência posterior:** o
[complemento executivo](../audits/D/D-B/OWNER_EXECUTION_SUPPLEMENT.txt) substitui
as orientações conflitantes de método e rascunhos. DOC-C.1 e expansão ainda
não implementada ficam OWNER-DEFERRED; demais requisitos documentais e a
aparência aprovada permanecem. A fila atual é o
[acompanhamento principal](../../TEMP_D_B_ATUALIZACAO.md). O comando original
abaixo é preservado com seu contexto e demais decisões.

Complemento da missão em andamento — fichas e documentos do Home Care Assistant

## 1. Natureza desta mensagem: acréscimo, não reinício

Este comando complementa a D-B que você já está executando. Não substitui a
Ordem Mestre, o Modelo Integral da aplicação, o checkpoint, a branch, o PR em
rascunho ou o plano de fechamento existente. Não abre uma nova missão, não
encerra a Goal vigente e não autoriza merge ou produção.

Não interrompa a operação, migração, teste, correção ou lote seguro que estiver
em andamento para começar este complemento. Incorpore estas decisões no próximo
ponto natural de planejamento, preserve o trabalho local e continue a tarefa
principal. Não solicite novamente aprovação do visual ou das cinco decisões
expressamente aprovadas abaixo.

A aparência dos PDFs, antes adiada por mim, fica agora autorizada somente dentro
do complemento documental definido aqui. Essa autorização não altera a aparência
canônica do restante da aplicação nem autoriza uma nova refatoração geral.

Trabalhe no mesmo chat, contexto e branch da missão atual. Não faça checkout
para um commit antigo, não crie outra branch por automatismo, não aplique
reset/stash/clean para preparar o trabalho e não descarte alterações locais
ainda não publicadas. Preserve as regras já autorizadas de commits, push,
Preview e aplicação de migrations; este complemento não cria permissão adicional
de publicação, alteração remota ou ativação externa.

## 2. Materiais que acompanham este complemento

- 02_REFERENCIA_VISUAL_FICHAS.html: referência visual aprovada e navegável de
  REQ, ENT, Devolução de materiais, COM e BAL, com estados exemplificativos,
  Ficha, Ficha Ampliada e estrutura preliminar de auditoria.
- 03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md: conteúdo, semântica e decisões que
  complementam o desenho. É parte deste comando.
- previas/: imagens de apoio para consulta rápida. Não substituem o HTML, pois
  mostram somente cenários selecionados.
- 00_LEIA_ME.md: instruções de leitura e limites dos exemplos.
Leia a especificação e examine o HTML no navegador quando chegar ao bloco
documental. Não é necessário reler toda a conversa histórica nem consultar
protótipos anteriores. As cinco decisões finais já estão incorporadas.

O HTML é referência do resultado, não um motor de PDF a ser transplantado
obrigatoriamente. Seu JavaScript de paginação, fixtures, controles de
laboratório, datas, nomes, registros profissionais, códigos e simulações não são
contratos nem dados de produção. Não copie essas simulações para a aplicação.

## 3. Continuidade do plano finito da D-B

A execução anexada registra uma reorganização em 20 etapas, ligada aos 75
critérios originais e aos 30 complementos existentes. O quadro local pode estar
mais avançado que o último commit publicado. Use seu checkpoint e seu plano
local efetivo como referência de retomada, sem substituir os arquivos por cópias
antigas dos anexos ou do GitHub.

Na observação feita para preparar este pacote, o PR #7 estava em
feat/phase-d-implementation, com último commit publicado 23fce86. O anexo do
proprietário já relatava o fechamento local da etapa 03, a divisão da próxima
etapa 04 e a correção dirigida de testes de catálogo. Isto é contexto datado,
não uma instrução para retornar àquele ponto.

### Como integrar sem desorganizar a missão

1. Termine a unidade segura em curso e mantenha a prioridade operacional
   vigente.
2. Registre um acréscimo documental identificado e finito, com vínculo às etapas
   já existentes; não recrie todo o plano nem transforme a etapa 01 em um grupo
   que recebe qualquer assunto novo.
3. Aproveite o bloco de PDFs — especialmente apresentação/dados e
   geração/recuperação — e as dependências diretas de fichas/andamentos quando
   necessárias. As etapas 07, 09 e 10 do quadro são pontos naturais de
   integração; isso não obriga reabrir integralmente uma etapa já concluída.
   Ajuste os vínculos à versão atual de seu plano.
4. Preserve os critérios originais, seus IDs e os resultados já comprovados. Se
   surgir necessidade de critérios complementares, registre somente os novos,
   separados dos 105 existentes, com razão e ponto de conclusão. Não renumere a
   matriz toda.
5. Anote em uma atualização breve onde este complemento entrará e o que você
   decidiu aproveitar do gerador atual. Não pare aguardando meu “pode executar”.
   Já está autorizado dentro destes limites; eu poderei comentar posteriormente
   sua decisão.
O histórico recente relata avanço real de rascunhos, estoque e revisão BAL. Não
reverta, repita ou retire essas melhorias para facilitar a adaptação documental.
O Modelo Integral continua sendo o alvo da aplicação; não reinstale Fluent nem
reabra a migração visual já decidida.

## 4. Decisões finais expressamente aprovadas

Estas escolhas não estão abertas a nova rodada de validação:

1. Distintivo de bandeira lateral (opção A do estudo): único selo visual
   aprovado. Usar para ciência familiar da REQ, confirmação de recebimento da
   ENT e entrada validada da COM, com conteúdo e estado próprios. BAL sem selo.
   No código e nos documentos, usar nomes descritivos, não “opção A” ou números
   de laboratório.
2. Devolução de materiais: denominação própria para equipe → família,
   semanticamente separada da entrega família → equipe. Preservar contratos,
   movimentos e identificações históricas; não excluir, renomear retroativamente
   nem criar automaticamente um quinto tipo técnico de documento.
3. Revisão do BAL: confirma ou aponta divergências. Alteração de estoque ocorre
   por reconto ou ajuste autorizado separado, mantendo a contagem anterior e sua
   autoria. Não permitir edição silenciosa do saldo pelo parecer.
4. COM — saldo histórico: na linha de cada material, mostrar o saldo
   imediatamente após a última entrada validada daquele material naquela COM,
   até o corte da emissão, com data/hora. Parcelas e seus atos ficam em seção
   própria. Não apresentar saldo atual, não somar saldos intermediários e não
   reconstruir por aproximação.
5. Restrição de acesso: quando faltar autorização para um saldo, mostrar “Acesso
   restrito”, sem enviar ou esconder o valor dentro do PDF, sem expô-lo por
   metadados e sem convertê-lo em zero. Falta de registro, não aplicação e
   restrição de acesso são estados diferentes.
Para o BAL, o saldo apresentado é o imediatamente posterior à aplicação da
contagem correspondente, nunca uma consulta atual rebatizada de histórica.

## 5. Resultado a implementar

### 5.1 Aparência fiel, não somente conteúdo parecido

Reproduza a composição aprovada: Source Sans 3; paleta azul equilibrada; número
destacado; selo de bandeira lateral; autoria em duas linhas; identificação
clara; macroetapas com ícones; tabela agrupada; materiais urgentes destacados;
observações numeradas; cabeçalhos de continuação; bloco descritivo de
autenticidade e aviso completo de confidencialidade.

Os quatro tipos possuem particularidades. Não faça quatro cópias da REQ com
títulos trocados. Preserve a estrutura editorial de cada um, os campos
semânticos e as seções de exceção da especificação.

Não reduza a fonte para forçar uma página. Não substitua o desenho por um
relatório genérico da biblioteca. Adaptações técnicas de paginação, altura e
composição são de sua responsabilidade, desde que preservem legibilidade,
identidade e conteúdo. Variações de comprimento não devem gerar cortes ou
espaços enormes por movimentar categorias inteiras.

### 5.2 Modalidades e ações do usuário

Nomes: Ficha, Ficha Ampliada, Relatório de auditoria da ficha.

- Ficha é completa para a finalidade cotidiana, não um resumo. Todos os
  materiais e observações originais permanecem; exceções essenciais não podem
  ficar escondidas na modalidade ampliada.
- Ficha Ampliada mantém a Ficha e acrescenta seções selecionadas e autorizadas:
  andamentos, comunicações, confirmações, detalhes de vínculos e histórico de
  acesso pertinente. Andamentos podem abranger todos os registros até o corte ou
  um período; o documento declara a seleção junto ao complemento, sem banner
  inicial.
- Auditoria exige competência própria e marca-d'água nominativa. A referência de
  auditoria é preliminar, não um laudo aprovado. Você pode aperfeiçoar sua
  organização e conteúdo com os dados efetivamente existentes, dentro do bloco
  documental, sem criar uma auditoria geral do produto nem um novo projeto sem
  limite. A prioridade de acabamento permanece nas duas primeiras modalidades.
- Diferenciar gerar novo exemplar de baixar novamente o arquivo pronto.
  Re-download mantém bytes, assinatura, exportador e código originais; nova
  emissão possui identidade própria. Reutilize o ciclo existente de intenção,
  recuperação, armazenamento e verificação.

### 5.3 Dependências de produto expressamente incluídas

Estão incluídos apenas os ajustes necessários para sustentar estes documentos:

- Seleção das modalidades, complementos e período, com permissões e conteúdo
  congelados de modo consistente.
- Catálogo compartilhado de andamentos entre aplicação e PDF: origem, natureza,
  relevância, rótulo humano e ícone. Não classificar somente no PDF algo que a
  tela continua exibindo sem estrutura equivalente.
- Apresentação semanticamente correta de devoluções, sem reescrever o histórico
  nem alterar a movimentação física apenas por causa do título.
- Consulta/preservação dos saldos pós-operação e respectivos momentos. Respeitar
  movimentações de outras fichas entre parcelas de COM e revisões posteriores de
  BAL.
- Registro e apresentação da revisão do BAL no nível realmente examinado, sem
  inferir pareceres por item a partir de um texto genérico. Se faltar estrutura
  necessária, evoluí-la de forma mínima e ligada ao fluxo autorizado; a
  alteração física do estoque continua em ato separado.
- Links da ficha e vínculos documentais com retorno ao destino após login e
  autorização corrente.
- Permissões específicas para auditoria, histórico de acesso e saldos. Leitura
  da ficha não concede automaticamente todas essas competências.
Não redesenhar fora desse alcance agenda, catálogo, perfil, backups, PWA,
comunicação externa ou administração. Não acrescentar novas integrações,
reconhecimento biométrico, white label, dossiê agregador ou contratação
ICP-Brasil. Esses assuntos não foram incluídos neste complemento.

## 6. Autonomia técnica, segurança e limites da autorização

Você decide como adaptar o compositor existente, organizar componentes,
consultar os fatos e integrar a funcionalidade. Pode fazer ajustes internos
proporcionais e migrations estritamente necessárias ao novo conteúdo, observando
o procedimento e as autorizações já vigentes na missão. Não imponho stack nova,
troca de renderizador, estrutura de pastas rígida ou número mínimo de
PRs/commits.

Prefira aproveitar o pipeline já existente, inclusive assinatura interna,
emissão única por tentativa, guarda e consulta de exemplares. Uma ferramenta
diferente só se justifica quando a atual não alcançar o resultado e o custo for
proporcional; não trocar por preferência estética de engenharia.

Não modificar PDFs já emitidos. Não reemitir acervo inteiro nem assinar arquivos
antigos retroativamente. Não remover assinaturas, hashes de integridade,
proteção de chaves ou autorizações já necessários ao produto.

Quando digo que não quero “hash e testes desnecessários”, estou dispensando
burocracia extra do trabalho, não revogando a integridade real dos documentos.
Não crie manifestos de hashes das referências, novos oráculos, congelamentos de
fonte ou relatórios extensos apenas para provar que leu este pacote.

Não solicitar nova aprovação para escolher implementação, granularidade de
funções, layout já aprovado ou processamento normal autorizado. Caso exista um
impedimento material real — acesso ausente, incompatibilidade incontornável,
mudança de contrato que destruiria histórico — descreva-o de forma pontual e
continue o restante independente. Não simule sucesso nem invente dados para
evitar declarar uma lacuna.

## 7. Conferência proporcional, sem uma nova missão de auditoria

Escolha as verificações adequadas às alterações e reaproveite as existentes. Não
é exigida uma quantidade de testes, uma matriz combinatória completa, múltiplos
parsers, repetição integral das suítes a cada ajuste visual ou novas
formalidades de homologação.

A conferência prática deve ser suficiente para saber que:

- Os PDFs reais gerados se parecem com a referência aprovada e permanecem
  legíveis em tamanho real.
- Materiais, observações, categorias e andamentos longos não desaparecem, não
  são cortados e paginam corretamente.
- Datas, autores, contagens, parcelas e saldos mantêm o significado definido,
  inclusive restrição e ausência de dados.
- Links, código, QR, geração, recuperação e assinatura já existentes continuam
  funcionando; não se usa texto decorativo para fingir validação.
- Cancelamento, divergência, revisão facultativa e encerramento administrativo
  não são convertidos em sucesso indevido.
- A nova modalidade/filtro não amplia permissões nem modifica exemplares
  antigos.
Isso não obriga uma revisão completa de todo o sistema. A CI e os gates já
aprovados para a missão permanecem; não adicionar uma camada paralela de
exigências. Testar o que mudou e o que pode sofrer regressão. Não desabilitar
verificações úteis para obter verde.

Dados locais de teste são descartáveis conforme a política atual. Não repetir
backups locais nem criar outros bancos desnecessariamente. O banco remoto e os
efeitos externos continuam subordinados às autorizações já existentes, sem
ampliá-las por este texto.

## 8. Escopo finito deste complemento

Para que o acréscimo não vire mais uma etapa interminável, distribua-o dentro do
plano vigente nestes quatro resultados, podendo usar seus próprios
identificadores:

A — Apresentação documental: compositor comum, quatro famílias e devolução, selo
aprovado, cabeçalhos, tabelas, observações, autenticidade e confidencialidade.

B — Conteúdo e atos específicos: saldos históricos, revisão de BAL, divergências
ENT, parcelas COM, fatos de ciência e origem, sem dados inventados ou efeitos
implícitos.

C — Modalidades e consulta: Ficha/Ampliada/auditoria preliminar restrita,
seções, períodos, links e catálogo de andamentos compartilhado.

D — Integração ao pipeline: emissões e arquivos antigos preservados,
assinatura/verificação atuais mantidas, conferência visual e funcional
proporcional, atualização breve do plano e apresentação de exemplos reais.

Esses resultados têm fim. Descobertas não relacionadas entram no acompanhamento
normal/backlog apropriado; não se tornam automaticamente requisito para terminar
este complemento. Auditoria técnica detalhada, white label e pacote de fichas
relacionadas não podem ser usados para prolongar o fechamento das fichas comuns.

## 9. Documentação e comunicação esperadas

Use os arquivos de acompanhamento que já mantém. Não crie vinte relatórios
novos.

Na incorporação ao plano, informe brevemente: onde entra, dependências reais e
abordagem escolhida. Depois continue, sem aguardar nova rodada de aceite.

Nas entregas, informe: o que mudou, o que foi preservado, como ficou a geração,
quais verificações relevantes fez e quais limites reais permanecem.
Disponibilize amostras dos PDFs efetivamente gerados para a avaliação visual do
responsável.

Registre os cinco aceites finais e estas regras de documentos em um local
canônico adequado do repositório, sem copiar toda a conversa. A referência HTML
pode ser guardada junto à documentação de design, sem migrar os controles de
laboratório para o produto.

As designações numéricas das rodadas desta conversa não pertencem ao software.
Não renomear a aplicação, banco, ficha ou renderizador com “V7/V8/V9” por causa
das maquetes. “Assinatura interna · V1 · Não ICP-Brasil” é a única identificação
funcional visual desse gênero explicitamente mantida pelo proprietário, separada
dos controles técnicos existentes. Não renumerar aqueles controles.

## 10. Ordem imediata

Receba este pacote como complemento aprovado. Preserve e conclua a unidade de
trabalho atual; registre o acréscimo no plano finito e implemente-o no ponto
documental adequado, mantendo o restante da missão em andamento. Não inicie nova
auditoria geral, não peça para eu reaprove as escolhas e não interrompa a D-B
para replanejar tudo.
