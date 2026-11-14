# Triagem SonarCloud D-B

## Decisão vigente — duplicação adiada em13/11/2026

O responsável decidiu não alterar a configuração e deixar a análise da
duplicação para depois: OWNER-DEFERRED. Nenhuma exclusão, limiar ou refatoração
será aplicada para esse tema nesta etapa. O gate não recebe aprovação por isso.
Em f2491be, o check terminou ERROR somente por duplicação de3,2274% no código
novo; segurança, confiabilidade e manutenção A, hotspots revisados100% e zero
apontamentos abertos na consulta. As correções efetivas anteriores permanecem.

## Consulta em7e27795 — proposta não adotada

A PR7 registra2,6% no conjunto e3,2288% no código novo:5028 linhas duplicadas
em155722 linhas novas. O gate ERROR continua somente pelo limite de3% para
código novo; os demais critérios do gate estão OK. Não é porcentagem de falhas
operacionais ou vulnerabilidades.

3271 dessas linhas estão em58 migrations que o Git confirma como arquivos novos
da PR, cerca de65% da duplicação nova. São repetições de evolução SQL que não
devem ser eliminadas reescrevendo migrations aplicadas. A lista também contém
preparações/assertivas de testes e trechos reais de APIs. A comparação das APIs
de preparação de consumo/Flows confirmou blocos semelhantes de validação,
autorização, chamada RPC e resposta. A detecção é real, mas não comprova uma
falha funcional nem justifica remover controles para reduzir a porcentagem.

Recomendação apresentada, sem implementação: considerar apenas migrations
imutáveis fora da conta de duplicação, mantendo sua análise de segurança,
o limite de3% e os testes/fontes de aplicação na medição. A opção específica
[Duplication Exclusions](https://docs.sonarsource.com/sonarqube-cloud/managing-your-projects/project-analysis/setting-analysis-scope/exclude-from-coverage-duplication)
não é exclusão geral de análise. Reutilização nas APIs deve ter benefício de
manutenção demonstrável e regressões pertinentes; não iniciar uma refatoração
geral por meta numérica. A decisão posterior acima adia esse tema. Nenhum
limiar, exclusão ou código foi alterado nessa análise.

## Análise publicada4315eb9

[PR7 no SonarCloud](https://sonarcloud.io/dashboard?id=RMZZFAJ_home-care-assistant&pullRequest=7).
Quality Gate ainda ERROR na consulta pontual. Quatro apontamentos S4036 de
Git/Docker por PATH desapareceram após resolução em diretórios fixos de sistema.
Ubuntu/Windows da CI42322299526 estavam aprovados; banco/browser ainda pendentes.
Isso não aprova alterações locais posteriores ou outro SHA.

Três apontamentos originais de UI receberam correção no incremento D3.1:
tipo submit explícito no cadastro e preferência, e comparação explícita das
datas ISO. A ordenação ISO anterior já era cronológica; comparator torna o
contrato explícito sem transformar esse alerta em perda de dados demonstrada.
Os três consumidores reais passaram no runner local. Reanálise publicada é
necessária; nenhuma regra foi desativada.

## S4790 — ETag legado de transporte

Issue `AaGzjRNrWrHHQUT4PNIm`, scripts/verify-storage-capture.mjs. Avaliação
técnica local: uso não destinado a autenticação ou confiança criptográfica.
O MD5 confere somente um ETag legado fornecido pelo Storage, como checksum
adicional de transporte. Não autentica usuário, certificado, documento ou backup.

A cópia usa SHA-256 por objeto e AES-256-GCM autenticado; manifesto também é
cifrado/autenticado e associa objeto ao backup/caminho. Os PDFs são confrontados
independentemente com o SHA-256 do registro documental recuperado. Alterar,
trocar, remover ou fornecer chave errada reprova o pacote; um ETag coincidente
não substitui esses controles. testes/backup-storage.test.ts e
tests/backup-archive.test.ts exercitam essas fronteiras. Não se apresenta MD5,
SHA-256 ou ETag como assinatura digital.

O apontamento continua aberto no provedor. O conector retornou Not authorized,
e authentication/validate retornou valid=false para a credencial disponível.
Foi solicitada renovação da conexão de modo assíncrono; implementação dos
demais ramos prossegue. Não foi alterado o Quality Gate ou a classificação
remota por suposição. Qualquer substituição futura desse checksum deve
preservar ou fortalecer as contraprovas de integridade, não apenas obter verde.

O responsável respondeu posteriormente e adiou a configuração do SonarCloud e
o tratamento específico dos seus apontamentos. [Decisão vigente](OWNER_AMENDMENTS.md):
OWNER_DEFERRED_SONAR_CONFIGURATION. Não serão feitas novas tentativas de
configuração/triagem nesta missão por causa dessa credencial. O estado continua
sem aprovação do provedor; os demais testes e critérios D-B prosseguem.

## Reabertura autorizada — 12/11/2026

A solicitação posterior reabriu a triagem e as correções pertinentes. A conexão
antiga desta sessão recusava a credencial. O servidor oficial instalado no
VS Code autenticou no SonarCloud EU; a consulta à API oficial usou a credencial
somente em memória, sem copiá-la para arquivo, logs ou Git. Após a recuperação
do Docker, o servidor temporário deixou de existir. O responsável o reativou
e a autenticação foi novamente validada pela API oficial. Não foi necessário
alterar o config.toml ou copiar credencial para o repositório.

Consulta histórica da PR7, análise de 12/11/2026 às 20:58:38 UTC.
Código avaliado: 4d5e908, confirmado pela API do Sonar. Este registro foi
acrescentado posteriormente, no incremento 8fc04b8; não é um SHA autorreferente.
49 apontamentos abertos, nenhum hotspot aguardando revisão. Quality Gate ERROR:
confiabilidade D, segurança D e duplicação nova3,2%; manutenção A e revisão de
hotspots100%. Esses resultados não aprovam o código local posterior.

Correções locais cobrem27 apontamentos:12 ordenações explícitas, quatro regex
com alternativa vazia, dois tipos de botão, uma condição redundante, uma regex
de fração de segundo com backtracking, a origem da mensagem do Service Worker,
quatro chamadas de utilitários Windows pelo PATH e duas associações label/input.
As ordenações de chaves e tentativas mantêm exatamente a ordem UTF-16 anterior;
não se introduziu localeCompare em identidade, snapshots ou conteúdo congelado.
O worker só responde a cliente de janela com origem idêntica; nenhuma mensagem
solicita ativação forçada. O teste novo recusa origem externa/opaca, ausência de
cliente e outro tipo de emissor, e aceita a janela legítima. Oito arquivos de
testes dirigidos passaram65 casos, incluindo cache privado, recuperação,
validação de cursor, identidade preservada e os provedores reais de assinatura.
A baixa remota dos27 apontamentos depende da análise do próximo SHA publicado.

Os22 restantes exigem classificação contextual, sem supressão coletiva:

- Oito S6845 são superfícies de rolagem focáveis por teclado. Remover tabindex
  indiscriminadamente prejudicaria a operação; a [regra ACT do W3C](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/)
  explica essa necessidade. Conservar a rolagem e conferir cada consumidor.
- S6848 usa delegação de clique em uma área com botões/links nativos. A ação
  de teclado nesses controles também gera clique; a área não vira outro botão.
- S6853 remanescente contém checkbox com nome dinâmico real dentro de label.
- S6850 refere-se ao título preenchido por script de um diálogo inicialmente
  oculto na referência documental, que não é uma rota do produto.
- S7039 é a CSP da demonstração HTML local: scripts/estilos embutidos da
  referência aprovada, sem conexão externa. Não substituir a CSP da aplicação.
- Oito S8707 referem-se a verificadores Python locais com caminhos de CLI.
  Examinar o fluxo completo e arquivos de manifesto antes de classificar;
  caminho controlado pelo operador não equivale por si a um upload público.
- S4036 remanescente executa OpenSSL em caminho absoluto fixo no probe histórico.
- S4790 continua com a análise de checksum de transporte acima. Não remover
  conferência de ETag para eliminar alerta, nem apresentar MD5 como integridade
  criptográfica do backup.

Na conferência local anterior à publicação, nenhum dos22 status remotos havia
sido alterado. D-B-AC-030 permanece parcial
até correções, conferência contextual e CI/análise do SHA final.

A consulta das1204 folhas do projeto confirmou que os maiores blocos de
CPD estão em migrations incrementais já aplicadas (259,211 e207 linhas nos
três maiores). Não reescrever esse histórico para reduzir a métrica. A
configuração de escopo de duplicação deve distinguir esse mecanismo de evolução
sem excluir as migrations da análise de segurança ou alterar o Quality Gate.
A revisão de configuração ainda não foi aplicada; o3,2% continua observado.

O lote final usou produção9e0b00fac445b17de35e7f82:cinco percursos passaram,
com filtro de estoque preservado durante atualização em segundo plano e painel
técnico em WebKit, além de Preview protegido, atualização entre abas e
PDF privado/offline/reconexão em Chromium móvel. A navegação do worker usa
cache:no-store. A hipótese de reaproveitamento de HTTP cache foi contraprovada:
a emulação offline do frame ainda recebeu HTTP200 real pelo worker, também com
no-store. A prova agora interrompe explicitamente a rede pertencente ao worker,
conforme a [documentação do Playwright](https://playwright.dev/docs/service-workers),
sem servir HTML artificial nem desabilitar o worker. O fallback é o cache público
real. As11 regressões do worker passaram após essa mudança.

### Resultado publicado e revisão contextual — 8fc04b8

A análise de12/11/2026 às22:58:55UTC confirmou o SHA8fc04b8066687e87efe027b8df6c9ce331456df1.
Os27 apontamentos tratados em código desapareceram:49→22, com bugs19→0.
Depois da conferência de fonte, CSS e finalidade,13 apontamentos receberam
FALSE-POSITIVE pela API oficial, sem comentários, alteração de regra, exclusão
de fonte ou mudança do Quality Gate. O provedor confirmou RESOLVED em todos.

- Oito S6845: todos os seletores têm overflow auto/scroll e nome acessível.
  Tabindex0 permite operar a rolagem pelo teclado; não foi removido para obter
  verde. Além da fonte, foram conferidas as regras CSS correspondentes.
- S6853: checkbox nativo dentro de label com nome/unidade dinâmicos reais.
- S6848: delegação fecha o popover somente para link/botão nativo; a área não
  representa uma ação autônoma e o clique do teclado nos filhos é preservado.
- S6850: o script define textContent do título antes de mostrar o diálogo,
  inicialmente hidden, na referência documental.
- S4036: OpenSSL é uma constante de caminho absoluto no probe histórico.
- S4790: somente ETag de transporte; os limites e contraprovas criptográficos
  já estão descritos acima. O checksum foi preservado.

Registros individuais da decisão:

- `AaHRCaMldFLyAauEqU3s` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaHLdMdUw8652HDo-OSu` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaHLRss_jy8OM9RHe5-e` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaHKwlcpCDFA_lJdfEli` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaHKwluBCDFA_lJdfElj` — typescript:S6853; FALSE-POSITIVE confirmado.
- `AaHI15gCXIWw0lPB4AW_` — Web:S6850; FALSE-POSITIVE confirmado.
- `AaHDpWV1PeUobGgKqVaZ` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaHARW6BRvlOpV2gUqrL` — typescript:S6848; FALSE-POSITIVE confirmado.
- `AaG_Y0UFf0qErduKpOVN` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaG_Y0Xrf0qErduKpOVO` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaG1YeiBtqj7RNvsFyxq` — javascript:S4036; FALSE-POSITIVE confirmado.
- `AaGz09zpnYvp-aA_EOPx` — typescript:S6845; FALSE-POSITIVE confirmado.
- `AaGzjRNrWrHHQUT4PNIm` — javascript:S4790; FALSE-POSITIVE confirmado.

Consulta posterior confirmou nove apontamentos ainda abertos: oito S8707 nos
verificadores Python locais e um S7039 na referência HTML. O Quality Gate segue
ERROR por segurança e duplicação3,2%. Esses nove não foram aprovados nem
transferidos ao responsável; a análise/correção pertinente continua com Codex.
A CI 8fc04b8 estava em execução; Ubuntu e Windows tinham passado nessa observação.

### Fechamento contextual e diagnósticos do editor

Os nove registros abaixo receberam ACCEPTED, confirmado pelo MCP oficial.
Não foram classificados como falsos positivos, corrigidos por alteração de
código ou removidos do escopo de análise. A decisão preserva o comportamento
intencional e reconhece os limites de uso:

- Oito S8707 em sete verificadores Python: são CLIs manuais de desenvolvimento,
  sem chamada de produção, rota HTTP, upload ou execução de agente no produto.
  A revisão percorreu argumentos, manifestos, raízes públicas, nomes de raster
  e destinos. Há seis destinos de relatório, três com sobrescrita intencional
  e três com criação exclusiva; restringir somente o argumento de saída não
  cobriria os demais caminhos. A documentação usa diretórios de corpus dentro
  e fora de output e aceita uma raiz pública explícita externa. Esses CLIs
  **não são uma sandbox**: caminhos e manifestos precisam ser escolhidos e
  conferidos pelo operador, inclusive quando sugeridos por uma IA. Não devem
  receber argumentos de usuário não confiável nem ser expostos como serviço.
  Uma futura integração com agente/serviço exige uma fronteira própria antes
  dessa exposição. Não foi demonstrada uma injeção de caminho pelo aplicativo.
  A execução legítima do probe de assinatura passou novamente: arquivo inteiro,
  assinatura e TSA íntegros e confiança somente na raiz interna fornecida.
  O resultado contextual é no_change, sem alegar bloqueio de caminhos arbitrários.
- S7039 na referência HTML canônica: demonstração local autocontida, com scripts
  e estilos embutidos intencionais, sem dados privados ou entrada remota.
  connect-src, object-src, base-uri e form-action continuam none. A permissão
  unsafe-inline permanece um limite conhecido dessa demonstração; não comprova
  proteção contra injeção caso seu conteúdo deixe de ser confiável. A referência
  não é publicada como rota; a CSP do aplicativo é independente e não mudou.

Registros aceitos individualmente:

- `AaG-Y0GkvXabDJNoZvPC` — d4-operational-proof/verify.py.
- `AaG-DMXZJuwU4-_1H_Rj` — d4-structure-proof/verify.py.
- `AaG9J6HTFctgTuRSUjBI` — d4-ent-terminal-proof/verify.py.
- `AaG8w3NIkxw1cHakNg6k` — d4-regularization-proof/verify.py.
- `AaG60gXQE7uBDFkTGbke` — d4-fidelity-proof/verify.py.
- `AaG2fSmpyu4V9oipB_qU` — d4-source-facts-proof/verify.py.
- `AaG1Yegitqj7RNvsFyxo` — d4-probe/verify-proof.py, raiz pública.
- `AaG1Yegitqj7RNvsFyxp` — d4-probe/verify-proof.py, PDF de entrada.
- `AaG_MVSxdWXCv_DkUAVe` — Home_Care_Assistant_Modelo_Integral.html.

A consulta posterior mantém Quality Gate ERROR somente por duplicação nova
3,2% acima de 3%; confiabilidade, segurança e manutenção A, hotspots revisados
100%. Não se alterou limiar, regra, perfil ou exclusão. Essa classificação não
aprova produção nem substitui a CI do próximo SHA.

Os comentários do CodeRabbit foram lidos na extensão do VS Code: quatro
comentários repetiam dois temas. O caminho fixo do Windows era um defeito de
portabilidade: whoami e icacls agora derivam de SystemRoot absoluto e recusam
valor relativo, mantendo ausência de fallback ao PATH. O comentário sobre SHA
autorreferente não se confirmou: 4d5e908 não continha a menção a si próprio;
ela foi adicionada em 8fc04b8. O texto acima explicita essa cronologia.

Os três S4036 indicados em test-environment usam o resolvedor compartilhado.
Docker é absoluto e Supabase vem da instalação conhecida do operador ou do
prefixo da action fixada. A versão 2.121.0 usa o binário nativo do pacote
@supabase/cli da plataforma; o antigo caminho npm supabase/bin não existe.
Supabase status também procura Docker internamente: recebe PATH restrito ao
diretório desse executável confiável. A consulta local com PATH sentinela passou
sem exibir credenciais, mantendo projeto, container e portas verificados.
Os testes do resolvedor e dos provedores reais passaram seis casos; após ajustar
o caminho do pacote, os três do resolvedor passaram novamente. A revisão
independente do patch não identificou outra regressão concreta; Linux e a action
real continuam sob a CI do próximo commit.

Os cinco TS2307 e o TS7006 do probe histórico foram resolvidos com um tsconfig
local ao diretório: o arquivo permanecia fora do projeto TypeScript principal
e o editor perdia os aliases e a tipagem contextual. O compilador desse projeto
passou sem alterar o probe ou suas conclusões históricas. Os dez avisos Markdown
listados passaram a zero no language service instalado do VS Code, com controles
positivo/negativo e conteúdo aprovado preservado. O botão Aplicar filtros recebeu
type submit explícito. O tabindex da preparação da residência foi preservado:
é uma região de rolagem que precisa continuar acessível pelo teclado.

A CI 8fc04b8 terminou: Ubuntu, Windows, banco e cinco grupos de navegador
passaram. iOS-2 teve241 casos aprovados e uma falha, repetida no retry: o teste
de offline exigia uma interceptação de requisição do worker disponível apenas
no Chromium. O artefato nativo mostra o fallback público real no WebKit.
A correção local condiciona somente esse detalhe do instrumento; conserva
fromServiceWorker, ausência de dados privados/API, cache público e reconexão.
O caso passou em mobile e iOS na coorte integrada local de oito percursos.

Dois grupos aprovados precisaram de retry: abertura do formulário da agenda em
mobile e título de revisão da declaração em Chromium. As causas não foram
comprovadas. A configuração anterior descartava seus artefatos após recuperação;
o próximo commit conserva relatórios e capturas também em jobs aprovados.
Não há supressão, timeout novo ou alteração de produto para ocultar esses casos.
