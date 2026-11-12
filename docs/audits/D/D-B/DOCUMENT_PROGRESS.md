# Andamentos persistidos nas fichas

## Publicação estruturada vigente

Destaque e menções são escolhas da publicação oficial, separadas do conteúdo
privado de quatro campos. O pacote pode incluir publication com relevance
normal/milestone/attention e mentions com até oito UUIDs distintos. Chave,
conteúdo e opções compõem a intenção; alterar qualquer um deles não recupera
uma publicação diferente. Pacotes antigos sem opções conservam o hash e a
recuperação anteriores. Rascunhos e sua apresentação não foram ampliados.

O banco valida pessoas com perfil e vínculo ativos no paciente da ficha e
congela nome e papel daquele momento em tabela privada imutável, sem grants
diretos. Nome, autoria ou papel enviados pelo navegador são recusados.
Nova publicação reconfere leitura após a trava e elegibilidade das menções;
recuperação de registro já confirmado exige leitura atual, sem exigir que a
pessoa mencionada continue ativa. Nome posterior não reescreve o registro.

GET /api/documents/[id]/progress/people recebe search e page, devolve vinte
pessoas por página, total e escopo explícitos. Exige Auth, leitura da ficha e
document.progress.create; não é diretório global nem expõe e-mail. API e banco
recusam paciente sem autorização. Todas as respostas são private, no-store.
Commit privado e consulta de recuperação transportam as opções somente no
pacote oficial; salvar a nota privada continua estritamente com os quatro
campos anteriores.

Origem manual/automática e relevância Registro/Marco importante/Atenção são
dimensões independentes. O catálogo em src/lib/documents/progress-catalog.ts
é usado pela interface; sua integração à Ficha Ampliada e à auditoria continua
pendente. Texto e menções não são assinatura, ciência, recebimento, confirmação
ou atendimento. Links continuam sob autorização atual. Os fatos de cancelamento,
ciência do cancelamento e vínculos formais entram na lista explícita da
cronologia, sem trazer logs, lembretes ou tentativas de transporte.

Validação do incremento: 19 casos com Auth real (publicação legada, detalhes,
concorrência, recusas e espera observada), 18 testes de contratos e o percurso
com perda da resposta em Chromium/iOS, cinco larguras e inspeção visual.
Banco local/remoto 229 reconciliados; CI do SHA e modalidades dos PDFs não são
aprovados por esses resultados. Estado e fila atuais no acompanhamento principal.

## Registro histórico D3.29

Lote D3.29, base dc8f970. Implementação incremental da nova função do Modelo
Integral, disponível em REQ/COM/ENT/BAL. A reorganização completa em abas e
a paridade visual das demais composições continuam pendentes.

## Contrato implementado

Registros manuais aceitam Registro complementar, Providência, Contato ou
Pendência; texto até 2000 unidades UTF-16, etapa opcional adequada ao tipo da
ficha e até oito referências distintas. Autoria, nome histórico, horário e hash
da intenção vêm do banco. Chave única por autor, com trava transacional,
confirma exatamente uma publicação sob concorrência ou resposta perdida.

O registro é acrescentado a uma tabela privada com RLS, sem grants diretos,
sem atualização ou exclusão. RPCs exigem sessão Auth real e leitura da ficha.
Nova publicação exige document.progress.create e paciente ativo, seguindo a
barreira de escrita existente. Recuperar publicação própria já confirmada
dispensa uma nova permissão de escrita, mas conserva a autorização de leitura.
Outra autoria, chave reutilizada com conteúdo diferente e referência de outro
paciente são recusadas. O papel reader não recebe a nova permissão por padrão.

Registro complementar não altera versão, snapshot, protocolo, hash documental,
PDF, estoque, atendimento, ciência ou recebimento. Auditoria guarda referência,
categoria e etapa, sem copiar o texto privado. A invalidação compartilhada usa
o mecanismo existente; não cria notificação nem transporte externo.

O feed reúne uma lista explícita de fatos documentais e os registros manuais,
em ordem cronológica ascendente, com filtros e paginação completa. Lembretes,
aberturas, tentativas de notificação e logs arbitrários não viram Andamentos.
Macroetapas não determinam a ordem; etapa relacionada é atributo. A consulta
de versões e sua integridade continuam separadas e preservadas.

## Interface e recuperação

O formulário usa os componentes canônicos, com modal, labels, ajuda, validação,
contagem e foco. Texto é escapado pelo React. Inserir referência respeita também
o limite de texto; remover o vínculo não reescreve o texto digitado. A busca
paginará todas as fichas disponíveis. Sua API deriva o paciente da ficha lida
com autorização no banco e devolve o escopo explícito, sem mudar o contrato da
lista existente. Links são filtrados novamente pela permissão atual de quem lê.

Rascunho e tentativa pendente ficam em sessionStorage, por usuário e ficha,
com validação estrita. Hidratação usa o mecanismo client-ready existente; não
há publicação automática. Antes do envio, o conteúdo e a chave são guardados.
Resposta incerta congela a intenção; fechar ou recarregar permite recuperá-la
explicitamente. O logout limpa as chaves hca existentes. Falha de armazenamento
é informada, preservando o texto nesta aba; confirmação do banco não é anulada
por falha posterior ao limpar a referência local.

Leitura pendente ou recusada oculta o feed anterior e bloqueia nova publicação,
preservando edição própria. Filtros não alteram o conteúdo. A integração atual
mantém todos os conteúdos e comandos anteriores na ficha; a composição final
em abas é o próximo lote, sem redução de funções.

## Evidências e limites

[Validação e contraprovas](DOCUMENT_PROGRESS_VALIDATION.json),
[reconciliação remota](DOCUMENT_PROGRESS_REMOTE.json). Testes com Auth real
abrangem concorrência, autoria histórica, payload forjado, limites, referências,
papéis, paciente inativo, grants, RLS habilitado e leitura após revogação.
Paginação alcança 43 registros sem truncar ou reproduzir lembretes/auditoria.

Os [advisors](DOCUMENT_PROGRESS_ADVISORS.json) apontam as duas RPCs como
SECURITY DEFINER executáveis por authenticated. É uma fronteira intencional
do projeto para acessar a tabela privada, revisada com sessão, autorização,
grants explícitos e negativas reais; anon e service_role não as executam.
Não se declara limpeza geral dos demais avisos do projeto.

Navegadores controlados verificam publicação nas quatro fichas, persistência e
recuperação após reload, chave/conteúdo idênticos, escape de HTML, referências,
limite ao inserir vínculo, leitura recusada e preservação dos bytes da ficha e
dos movimentos. Editor avaliado em 320/390/768/1024/1440px. Isso não constitui
prova física Android/Chrome, assistiva ou homologação humana.

Feed, marcador e cartão manual seguem as regras do HTML. Dois cinzas auxiliares
do protótipo deram contraste 4,36/4,38 em branco no teste automático. Horário e
metadados usam o token muted da própria paleta canônica para conservar o
contraste obrigatório; nenhuma regra Axe foi reduzida.

Regressão de rolagem reproduziu um controle do conteúdo parcialmente sob o
cabeçalho em WebKit. O scroll padding considera a altura real do cabeçalho,
inclusive a linha de paciente; controles mantêm margem de rolagem. No teste
de recuperação PWA, cada largura parte da seção da tarefa, em vez do deslocamento
parcial conservado da largura anterior. Regras, larguras, worker real e
asserções de permissão/inscrição continuam intactos.

Contraprovas preservadas: seletor de teste não distinguia texto de label com
asterisco oculto do nome acessível; fixture BAL omitia produtos obrigatórios;
um metadado de erro interno entrava indevidamente no rascunho estrito; a lista
legada não devolvia o paciente por linha. Corrigidos o consumidor e os contratos
de recuperação/referência. Não foram suprimidas regras ou asserções de negócio.

A migration165 é aditiva. Refinamento local de funções ocorreu enquanto o
arquivo novo ainda não era publicado, sem reset nem alteração das migrations
históricas. Versões e funções finais são reconciliadas no remoto; sem fixture,
Auth, roles, seeds ou Vault remotos. Banco de testes descartável: sem backup ou
reconstrução integral redundante para este lote. Backup operacional e gates
D-C/D6 continuam com seus requisitos próprios.

CI do novo SHA precisa validar instalação limpa, evolução legada e integração
completa; esses jobs não foram duplicados por reset local. Sonar adiado pelo
responsável. Matriz105x39 preservada; registro UI adicional atualizado. PR7
Draft, produção NO-GO, sem merge ou ativação externa; meta permanece ativa.
