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
