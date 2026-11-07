# Verificação pública D4

## Jornadas e privacidade

/verificar permite código digitável e upload sem conta. O QR V5 aponta para
/verificar/emissao/:code. O código é aleatório, com128 bits, apresentado em oito
grupos de quatro caracteres; entrada aceita HCA opcional, espaços, hífens e
caixa
indiferente. Protocolo operacional não concede acesso ao arquivo privado.

GET /api/verification?code consulta um registro ready. A resposta mínima contém
identidade/código da emissão, instante do registro, SHA/tamanho e fingerprints
registrados. Não contém paciente, materiais, nomes, documento de origem, versão,
snapshot, caminho de Storage ou credencial. O QR isolado não verifica os bytes
que alguém esteja segurando. O resultado informa esse limite e permite upload.

POST na mesma rota recebe bytes application/pdf, com código opcional na query.
O servidor calcula o digest real. Compara com o código consultado e com o acervo
por hash, distinguindo um PDF íntegro que pertence a outra emissão. Metadados do
próprio PDF não substituem a comparação nem a validação da assinatura.

Os resultados separam referência localizada, bytes coincidentes/divergentes,
assinatura íntegra/inválida/ausente, arquivo com acréscimo posterior, cadeia
interna/externa configurada/desconhecida/inválida/revogada/expirada, token
temporal
íntegro ou ausente/inválido, perfil não suportado e limite de processamento.
Falha de serviço ou de decodificação da resposta não significa falsificação.
Confiança é a política explícita da instalação; certificado/TSA internos não
representam ICP-Brasil, assinatura pessoal ou independência temporal de
terceiro.
Revogação externa por OCSP/CRL não é consultada nesta etapa.

## Limites efetivos

- Cliente e API:100 bytes a4 MiB por PDF. Transporte usa corpo binário, sem
  expansão base64. MIME/origem/tamanho declarado são conferidos; o tamanho real
  do stream também é limitado. Leitura tem prazo de10 segundos.
- Admissão compartilhada no PostgreSQL:60 consultas e12 uploads por minuto na
  instalação;20 consultas e4 uploads por sujeito. O instante é recalculado após
  o lock de admissão. Contadores antigos saem após dois minutos completos, na
  próxima admissão. Não é uma promessa de disponibilidade ou proteção de rede.
- Sujeito é HMAC com domínio próprio derivado da credencial do servidor. Apenas
  o header sobrescrito da Vercel é considerado quando VERCEL=1; fora dela,
  headers arbitrários são ignorados e há um sujeito compartilhado conservador.
  Endereços brutos não são armazenados na tabela nem nos logs da aplicação.
- A análise inteira roda em worker efêmero:ambiente sem credenciais, no máximo
  dois parsers por instância, prazo de4 segundos, heap V8 de96 MiB e stack4 MiB.
  Streams decodificados têm limite de8 MiB e orçamento acumulado de32 MiB.
- Antes do trabalho criptográfico nativo:certificado DER até16 KiB; RSA de2048
  a8192 bits e expoente público até32 bits; curvas EC nomeadas permitidas e
  chaves Ed25519/Ed448 de tamanho fixo para cadeias. Perfil documental atual
  permanece RSA/SHA256. Formato fora do orçamento é não suportado, sem declarar
  automaticamente assinatura adulterada.

O parser usa pdf-lib1.17.1 fixado. O guard de alocação envolve DecodeStream
somente dentro do worker; não modifica node_modules nem o renderizador. Esbuild
gera um bundle autocontido a partir do mesmo núcleo criptográfico da emissão,
incluído explicitamente no trace Next. Dependências externas do bundle são
somente node:crypto e node:worker_threads. Não contém Supabase, provedor de
chaves ou segredo de assinatura. Esse é isolamento de execução com orçamento,
não uma afirmação de sandbox do sistema operacional.

O arquivo recebido permanece somente em memória. Não é gravado no filesystem,
Storage, banco ou acervo permanente. O worker é encerrado inclusive em erro e
timeout. Logs públicos conservam apenas operação/código seguro/correlação.
O limite4 MiB cabe abaixo do payload de4.5 MB documentado para Functions; não
depende de ativar Blob, serviços externos, processo residente ou outro deploy.

## Legado e implantação

/verificar/:id?version&hash continua resolvendo QR antigos e compara conteúdo
canônico. A página distingue essa referência da nova conferência dos bytes.
O digest de um PDF antigo registrado permite reconhecer o acervo legado; PDF
sem assinatura incorporada continua sem assinatura. Nenhum byte antigo é
assinado retroativamente. A migração dos consumidores que ainda geram V4 por
GET e seus demais oráculos documentais continua pendente.

As RPCs de consulta mínima, legado e orçamento são exclusivas de service_role.
Anon/authenticated não podem contornar a fachada limitada do HTTP. O worker
continua sem EXECUTE para finalizar uma emissão pela sessão Auth. Índices por
SHA atendem a consulta do acervo legado. Migrations138/139 foram aplicadas
somente localmente, sem reset; remoto permanece no último estado
reconciliado121.

No desenvolvimento, npm run dev, npm test, npm run build e o runner E2E geram
o bundle. Alteração do núcleo/verificador exige reiniciar o processo de dev para
reconstruí-lo. O build de produção e a CI recompõem o artefato. O trace local
incluiu o bundle de aproximadamente2 MB. Compatibilidade de empacotamento local
não equivale a execução observada na plataforma ou liberação operacional.

## Evidências e limites

O [manifesto D4.3](D4_3_EVIDENCE.json) registra as coortes. Produção12/12 nos
três
projetos cobre referência/código sem conta, resposta200 incompleta, outra
emissão, upload coincidente em Chromium, excesso recusado no cliente, quatro
larguras/axe, QR antigo e os três casos de emissão privada existentes. O ajuste
posterior de orçamento nativo foi conferido por25 testes de unidade/API e pela
revalidação dos quatro PDFs reais; não é rotulado como nova rodada12/12 do mesmo
fonte. Os QR das páginas rasterizadas desses quatro PDFs foram decodificados
independentemente e apontaram às identidades correspondentes.

Contraprovas incluem CMS alterado com QR intacto, acréscimo posterior, raiz
desconhecida, revogação interna, carimbo ausente, bomba de object stream,
deadline, concorrência por instância e caps de chave/certificado. Auth real
comprova grants fechados e limites compartilhados, sem apagar contadores para
obter aprovação. Migração limpa/evolução, CI do SHA publicado e gates humanos,
leitores assistivos, câmera física e provedores continuam gates próprios.

Fontes primárias consultadas:

- [Worker threads Node24](https://nodejs.org/docs/latest-v24.x/api/worker_threads.html).
- [Limites de Functions](https://vercel.com/docs/functions/limitations).
- [Headers de plataforma](https://vercel.com/docs/headers/request-headers).
- [Bundle Node com esbuild](https://esbuild.github.io/api/).
- Guia local Next16:node_modules/next/dist/docs, output/trace e client/server.
