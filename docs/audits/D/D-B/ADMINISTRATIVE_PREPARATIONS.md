# D3.61 — continuidade de alertas, destinatários e vínculos

Os quatro editores permitem guardar campos incompletos no servidor,
retomar o preenchimento privado, comparar revisões concorrentes e
descartar a própria edição. A confirmação usa a revisão e a referência
administrativa apresentadas. Uma mudança de material, unidade, regra,
vínculo ou configuração exige nova comparação, conservando os campos.

O controlador compartilhado também atende o catálogo. Os editores usam
os componentes canônicos do Modelo Integral. O seletor global de contas
tem busca pelo nome e páginas de 30 resultados, com ordenação por nome e
identidade. A conta selecionada permanece no preenchimento ao trocar a
consulta. O caminho anterior de consulta de perfis continua compatível.

## Confirmação e recuperação

A alteração local chama o comando nativo e registra seu comprovante na
mesma transação do consumo privado. No contexto global, a confirmação
registra uma proposta que continua sujeita à aprovação local distinta.
As funções nativas e suas assinaturas permanecem preservadas.

Antes do envio, a aba guarda o pacote exato por conta, paciente, contexto,
finalidade e alvo. Uma resposta perdida mantém esse pacote. A pessoa pode
consultar seu comprovante ou reenviar explicitamente a mesma tentativa.
O cliente confere o titular, o contexto, a revisão e a identidade do
resultado antes de limpar a referência. Após confirmação em formulário
aberto, a pessoa pode iniciar outro preenchimento com a revisão correta.

Meu perfil oferece consulta das tentativas ainda guardadas nesta aba.
Quando a pessoa revoga ou reduz deliberadamente seu próprio vínculo,
o banco permite recuperar exclusivamente o comprovante original na
mesma sessão autenticada. Outra sessão ou outra chave não recebe essa
exceção. A consulta do perfil apenas lê o resultado e mantém a referência
quando o comprovante está ausente, divergente ou inacessível.

## Banco e autorização

As migrations 20261111010628, 20261111012930 e 20261111013009 criam as
preparações administrativas e corrigem qualificadores e variáveis SQL
identificados durante as regressões locais. Os arquivos já aplicados
localmente foram preservados. As duas tabelas privadas têm RLS e acesso
direto vedado. Somente as duas RPCs públicas recebem execução autenticada.
As verificações de acesso são repetidas depois das esperas por travas.
Uma revogação concorrente impede a alteração e o registro do comando.

## Verificações e limites

Passaram 23 testes unitários/API e seis cenários com Auth real. São 33
cenários distintos de navegador qualificados entre as rodadas. A coorte
final aprovou 18 casos em Chromium, Mobile Chromium e WebKit. O editor de
destinatário passou por acessibilidade automatizada e geometria nas
larguras 320, 390, 768, 1150 e 1440. Tipos e lint dirigido passaram.

A rodada inicial revelou o limite antigo de mil contas no seletor global
e uma disputa de leitura no teste móvel. A sequência de duas confirmações
revelou uma referência anterior reutilizada depois de reconhecer o
resultado. A revisão privada agora invalida essa consulta. Uma recusa
por referência obsoleta também preserva o hash que a pessoa havia visto
para exigir comparação explícita. As contraprovas foram preservadas.

O teste anterior do catálogo passou a ler o comprovante nativo e conserva
as verificações independentes da identidade e dos dados no catálogo. O
teste do sino inicia a falha controlada depois da primeira leitura
confirmada. A falha intermitente ENT observada na CI anterior passou
localmente nas três engines com o mesmo fluxo, sem correção presumida.

O remoto recebeu as três migrations e passou de 202 para 205 versões.
Os tokens de todas as migrations remotas correspondem aos arquivos da
branch. Dez funções nativas foram preservadas e os 16 corpos, configurações
e permissões consultados coincidem com o local. As tabelas privadas estão
fechadas. Duas negativas sem sessão passaram com rollback e o dry-run
final ficou vazio. Controles de usuários, perfis, fichas, movimentos e
objetos permaneceram iguais. Os metadados de 19 aplicações locais antigas
divergem dos arquivos atuais, sem divergência no histórico remoto ou nas
funções consultadas. Esses metadados locais foram preservados.

Os avisos adicionados pelos advisors correspondem às duas tabelas
intencionalmente fechadas, às duas RPCs autenticadas e a três índices
novos ainda sem uso. As classes anteriores persistem. Instalação limpa,
evolução legada, integração completa e CI do próprio SHA continuam gates.
A matriz conserva 56 critérios com prova local e 49 parciais. Perfil,
administração restante, paridade integral e homologações seguem pendentes.
[Resultados](ADMINISTRATIVE_PREPARATIONS_VALIDATION.json).
