# Triagem SonarCloud D-B

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

Consulta da PR7, análise de12/11/2026 às20:58:38UTC, publicada em4d5e908:
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

Nenhum status remoto desses22 itens foi alterado. D-B-AC-030 permanece parcial
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
