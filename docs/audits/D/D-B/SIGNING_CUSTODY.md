# Custódia e política de assinatura documental

## Implementação inicial

O provedor Node usa dois P12 com senhas aleatórias: assinatura técnica e TSA
RFC3161, com certificados distintos. A raiz privada não pertence ao segredo
do runtime. A chave de TSA exige EKU crítico e exclusivo timeStamping.
Nenhum certificado representa assinatura pessoal do solicitante, ICP-Brasil
ou independência temporal de terceiro.

O bootstrap local é scripts/create-local-pdf-custody.mjs. Ele só cria diretório
novo e absoluto, fora do repositório; recusa sobrescrita. Usa OpenSSL para
provisionamento, RSA3072, chaves cifradas, arquivos600 e diretório700 em Unix,
ou ACL de herança removida com acesso do usuário atual no Windows. Não instala
confiança no sistema nem ativa serviço externo. A validade inicial é de365 dias
para folhas e3650 dias para a raiz; a validação usa a época do token temporal.

Uma custódia local foi criada em7/11/2026 sob LOCALAPPDATA, na versão
local-20261107-v1. Os dois caminhos foram configurados somente em.env.local.
O material privado não integra a evidência versionada. A restrição de ACL não
equivale a HSM, backup independente ou isolamento contra o dono da máquina.
A raiz continua em custódia local protegida; isolamento físico/offline ainda
precisa de procedimento operacional verificado.

## Configuração e ambientes

HCA_PDF_SIGNING_SECRET contém JSON privado com environment, keyVersion,
signerP12, signerPassword, timestampP12 e timestampPassword. P12 são base64.
HCA_PDF_TRUST_POLICY é JSON separado, com environment, revision, roots
(pem/trust), revokedFingerprints e issuers (keyVersion, signerFingerprint,
timestampFingerprint). Somente certificados públicos e identificadores
pertencem à política de confiança.

Para desenvolvimento local, os adaptadores com sufixo_FILE aceitam caminhos
absolutos fora do workspace. Configurar simultaneamente valor e arquivo é erro.
Preview e produção aceitam somente valores do ambiente protegido, sem depender
de arquivo local, OpenSSL ou processo residente durante uma emissão. O ambiente
configurado precisa coincidir com VERCEL_ENV, quando preview/production; em
desenvolvimento é local. Não reutilizar a custódia local em outro ambiente.

A aplicação lê a política pública também sem chaves privadas. Downloads e
verificação histórica não requerem acesso ao segredo de assinatura. Ausência,
configuração inválida, certificado expirado na nova emissão ou incidente de
chave produzem indisponibilidade segura; não há fallback B-B ou sem assinatura.

## Rotação, renovação e incidente

1. Provisionar nova versão no ambiente correto e conferir finalidade, cadeia,
   fingerprint e validade dos dois certificados. Nunca editar a identidade de
   uma versão já usada.
2. Acrescentar a nova raiz e o par de fingerprints à política, mantendo os pares
   históricos. Incrementar revision. Conferir um arquivo antigo com a política
   ampliada antes de ativar o novo segredo.
3. Trocar o segredo ativo, mantendo keyVersion novo. Emitir e validar exemplar
   sintético de cada tipo antes de qualquer gate operacional.
4. Em comprometimento, retirar o segredo ativo e incluir os fingerprints
   comprometidos na denylist. Manter os registros e bytes históricos. O sistema
   reavalia a confiança atual, sem reescrever o resultado registrado na emissão.
5. Conferir efeitos em arquivo antigo, nova emissão e download. Comunicar o
   incidente pelo processo autorizado, sem publicar chaves ou dados privados.

Renovação é uma nova versão, mesmo que preserve a raiz. A denylist inicial é
interna e configurada; não representa consulta OCSP/CRL independente nem prova
de ausência de revogação externa. Evolução ICP-Brasil requer novos adaptadores
de assinatura/custódia, TSA, cadeia, revogação e política, além de homologação.

## Recuperação e limites de evidência

Preservar separadamente os P12 cifrados, senhas, política e identificação da
versão. Uma cópia que carrega P12 e senhas juntas precisa de envelope cifrado,
chave de recuperação independente, acesso mínimo e restauração ensaiada em
destino isolado. Nunca incluir segredos em logs ou evidências de teste.

O bootstrap e o carregamento dos provedores constituem base funcional.
Restauração da custódia, rotação completa e procedimento de incidente ainda
necessitam de ensaio próprio; este documento não os aprova. Os testes E2E usam
PKI efêmera e a descartam ao final. Ela não substitui a custódia do produto nem
confiança operacional, homologação humana ou leitura em dispositivo físico.
