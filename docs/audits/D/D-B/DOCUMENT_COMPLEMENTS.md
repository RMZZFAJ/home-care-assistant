# DOC-B.4 — vínculos formais de fichas complementares

Implementação local qualificada em 11/11/2026. DOC-B.4 permanece parcial: falta
representar cancelamento, ciência própria e vínculos de forma estruturada nos
PDFs. A aparência documental continua em DOC-A. Este incremento não altera os
105 estados originais nem conclui a fase.

## Comportamento e decisão aplicada

Uma ficha nova é emitida pelos formulários existentes. Depois, o usuário escolhe
uma ficha elegível, informa o motivo, confere as duas versões e confirma o
vínculo. A origem permanece preservada, inclusive quando cancelada. Isso aplica
a especificação aprovada: material emitido é imutável; situação, atendimento e
vínculos continuam evoluindo.

O complemento precisa ter sido emitido depois da origem, no mesmo paciente,
sem estar cancelado, rejeitado ou em preparação. O instante vem do primeiro
ato canônico com protocolo. A ordenação estrita impede ciclos. Tipos diferentes
são permitidos; uma nova ficha pode complementar mais de uma origem. O par não
se repete. Isso não cria vínculo de atendimento, crédito, baixa ou nova ciência.

A leitura de ambas as fichas e a permissão nativa de emissão do tipo da nova
ficha são exigidas. O emissor pode vinculá-la; um administrador local habilitado
pode administrar o vínculo. Não se cria autoridade a partir da URL ou do cliente.
Motivo, autoria, instante, versões e hashes anteriores ficam em relação privada
imutável. Os eventos das duas fichas recebem apenas a identidade opaca da
relação; não copiam conteúdo financeiro para uma ficha clínica.

Cada consulta revalida a leitura. Sem acesso à outra ficha, a relação retorna
somente identidade, sentido e restrição: código, motivo, autor e conteúdo do
outro documento não são enviados. Consultas têm paginação e busca delimitadas.

## Confirmação e recuperação

A transação usa a ordem paciente/estoque antes dos documentos, com ordenação
determinística das linhas. Autoridade e versões são verificadas após espera;
perda tardia de autoridade reverte relação, eventos e versões. Materiais,
estoque, recebimentos, atendimento e ciências anteriores permanecem intactos.

A intenção inclui as duas fichas, versões, motivo e chave própria. Concorrência
com a mesma chave recupera um registro. Alterar a intenção com essa chave gera
conflito. A consulta da tentativa usa as mesmas travas e identifica confirmação
ou ausência após a barreira real; ausência de uma resposta de rede é incerta.
A consulta não grava vínculo. A recuperação continua possível sem permissão de
emitir, desde que ambas as leituras permaneçam autorizadas.

Só uma confirmação enviada recebe referência opcional em sessionStorage,
separada por usuário/paciente/origem. Não há rascunho para cada campo. Recarga
não reenvia. A mesma tentativa é consultada; reenviar ou revisar exige ação
explícita após resultado ausente comprovado. Recusa de leitura retira os dados.

## Verificações locais

- Dez cenários Auth reais: REQ/COM/ENT/BAL canceladas, material/SCI/estoque
  preservados, tipos distintos com restrição financeira, concorrência,
  identidade trocada, versões antigas, cronologia inversa, paciente alheio,
  emissor, grants, paginação, espera real, recuperação e rollback tardio.
- Oito contratos/API novos e seis de ciência do cancelamento preservados:
  referência, tipo, página, emissão, acesso restrito, chave, motivo e versões.
- Seis percursos novos de navegador: REQ/COM em Chromium, Android emulado e
  WebKit/iOS emulado. Consulta503, resposta200 de outra referência, recusa403,
  gravação com resposta perdida, recarga sem replay e recuperação exata.
- Três regressões existentes da ciência do cancelamento passaram nos mesmos
  perfis. Cinco larguras, axe integral, revisão, foco e capturas móveis
  conferidos. Emulação não é prova em aparelho físico.
- Tipos, lint dos afetados e build de produção do runner passaram.

A primeira rodada teve seis Auth aprovados e duas falhas de fixture: catálogo
BAL incompleto e consulta de dois pacientes na mesma seleção ativa. Corrigidos
os dados de teste; os casos afetados passaram. A contraprova HTTP detectou um
código de erro inexistente, corrigido para VALIDATION_ERROR. As primeiras
rodadas de navegador preservam a recusa correta e a falha de seleção do rótulo
bruto. Usados os campos canônicos e nomes acessíveis reais; nenhum prazo ou
regra foi relaxado. Dez Auth, quatorze contratos e nove percursos distintos não
contam repetições como novos resultados.

## Banco remoto e limites

Migrations221–223 reconciliadas no projeto autorizado:223 versões, definições,
RLS, política, sete índices, constraints, trigger e privilégios iguais ao local,
normalizando apenas CRLF nas definições. Dry-run final vazio. Quatro RPCs são
exclusivas de authenticated; auxiliares e tabela permanecem fechados aos papéis
expostos. As 84 migrations históricas não mudaram. Sem reset, fixtures/Auth
remotos, produção, transporte externo ou backup pesado redundante.

Advisors acrescentaram quatro avisos de funções autenticadas, correspondentes
às RPCs intencionais e suas negativas verificadas. Os quatro índices novos
marcados sem uso ainda não tiveram carga no remoto. Não surgiram FKs sem índice
ou avisos initplan novos. A [orientação de funções autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
e a [orientação sobre índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
continuam registradas; os alertas anteriores não recebem aprovação genérica.

CI do SHA publicado, instalação limpa, evolução legada e integração completa
continuam verificações próprias. Sonar permanece adiado por decisão do
responsável. DOC-B está estimado em 90%; DOC-B.4 ainda não está concluído. O
próximo trabalho é congelar e apresentar os fatos estruturados no PDF,
preservando corte, permissões e exemplares anteriores.
