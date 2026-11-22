# PWA e acesso ao Preview protegido

Em08/11/2026 o responsável relatou falha no Samsung Galaxy S24 Ultra, Chrome e
PWA instalada, persistente após reinstalação. Esse é um relato físico de falha;
o agente não declara homologação física da correção.

## Causa reproduzida

O worker anterior buscava o precache com credentials omit. A barreira de acesso
da Vercel usa cookie, próprio do endereço acessado. Em uma origem loopback com
barreira HTTP equivalente, a página e o script foram autorizados, mas a busca
dos arquivos públicos sem cookie fez a instalação terminar em redundant.
Esse resultado foi preservado antes da correção. O parâmetro omit exclui as
credenciais; same-origin as restringe à própria origem.
[Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials) e
[autenticação Vercel](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

A proteção não foi desativada. A busca dos quatro arquivos públicos usa cookie
somente da mesma origem e recusa redirecionamentos. O build fixa tipo, tamanho
e SHA-256 de cada arquivo. O stream é limitado pelo tamanho esperado e o hash
é conferido antes de qualquer escrita. Uma página de autenticação ou resposta
privada, mesmo com status200, tipo esperado e mesmo tamanho, é recusada.

O cache recebe uma resposta nova contendo somente os bytes públicos verificados.
Não copia cookies, Vary ou cabeçalhos privados da entrega. Falha de escrita
remove somente a preparação nova incompleta; não apaga um cache já existente
da mesma versão nem outros armazenamentos. Todos os bytes são validados antes
de começar a gravação. API, páginas autenticadas, PDFs, fichas, dados do
framework e variantes com query continuam fora do cache. Não há fila ou replay.

## Estados e recuperação

O provedor observa o registro que criou, sua instalação, ativação e confirmação
de versão. Estado redundant é uma falha efetiva; o prazo de observação é
pendência, sem inventar confirmação ou falha. Repetir a preparação reusa o
registro canônico. O usuário não precisa limpar Auth, rascunhos ou armazenamento
de outros aplicativos. A mensagem de erro usa códigos fixos do worker conhecido,
sem publicar o conteúdo de exceções do navegador.

Uma ativação pendente continua sem prontidão mesmo após o prazo; a prontidão
só aparece quando o estado real permite. Não se interpreta a rejeição de uma
Promise auxiliar de activate como prova de estado redundant: esse adaptador
terminou em activated nos três motores e foi substituído por uma barreira real
que mantém a ativação pendente. As contraprovas foram preservadas. Falha de
estado durante ativação possui diagnóstico distinto nos testes de ciclo de vida.

O botão de avisos exige worker ativo e versão confirmada antes de pedir
permissão. Não espera oito segundos por um worker inexistente. Uma troca de
controlador invalida essa prontidão até nova confirmação. Instalar na tela
inicial não equivale a ativar Push; a autorização no servidor continua exigindo
conta/sessão e consentimento próprios. Inscrição testada usa transporte controlado,
sem ativar envio externo. Push, sozinho, não registra ciência ou aceite físico.

## Endereço para instalação e atualização

O Preview desta branch usa o endereço estável:

[Abrir Preview da branch](https://home-care-assistant-git-feat-phase-d-i-3d8824-rmzzfajs-projects.vercel.app).

Uma instalação por URL de deployment continua ligada àquela origem; publicações
seguintes da branch não transformam essa origem em outro endereço. Para testar
a correção, salve os rascunhos e use o endereço estável, autenticando-se nele
quando necessário. A proteção de acesso não compartilha automaticamente seu
cookie entre URLs. Não há transferência automática de sessão, bypass público
ou redirecionamento para produção.

O layout recebe VERCEL_BRANCH_URL somente em Preview e oferece um link quando
o usuário está em outra origem. Host, esquema e ausência de path/query/credencial
são validados. Isso orienta navegação; nunca concede autorização.
[Variável oficial da branch](https://vercel.com/docs/environment-variables/system-environment-variables#vercel_branch_url).

## Validação e limites

Provas incluem barreira por cookie, expiração de acesso, redirecionamento,
resposta privada de mesmo tamanho, recuperação sem reinstalação, duas abas,
troca real de versão, privacidade do cache e manutenção dos rascunhos. O botão
Push foi exercitado com registro real, API/Auth locais e transporte de inscrição
controlado. O ensaio também cobre recusa de permissão, troca de conta e o
fallback sem suporte. Os testes existentes de cache privado, no replay e
atualização foram preservados.

Os projetos Chromium, Android emulado e WebKit não são um novo ensaio físico
do Samsung. O responsável deverá revalidar esse aparelho pelo endereço estável.
Envio externo, confiança operacional, D-C e produção continuam gates próprios.
Não há migration nova neste reparo; banco local/remoto permanecem em151,
com o ledger remoto consultado novamente. Os dois jobs cron locais voltaram
ao estado ativo anterior depois dos ensaios; cron remoto não foi alterado.

São39 casos distintos aprovados em builds de produção local, compostos por
coortes qualificadas, não uma única rodada de39. A primeira passou36/36;
a classificação adicional de ativação teve três passes de interface e três
falhas da hipótese de fixture descrita acima. A rodada final passou6/6,
incluindo a ativação realmente pendente e a recuperação de interface nos três
motores. Ao todo foram48 resultados terminais:45 passes e3 falhas preservadas.
Os produtores de cache/Push e consumidores existentes mantiveram seus hashes;
o provedor/helper/mensagens finais foram reensaiados na recuperação real.

São27 unitários distintos aprovados:10 do worker,6 de ciclo de vida e11 de
crypto Push, com reensaio dos conjuntos afetados. Tipos e lint afetado passaram.
O diagnóstico anterior inclui quatro passes e uma falha do teste ao fechar um
painel já aberto; isso foi corrigido antes do ensaio de produção. O baseline
com instalação redundant é separado e não recebe aprovação. Uma duplicidade
de comentário global foi corrigida após o primeiro lint, sem suprimir regra.

[Recibo, hashes e contraprovas](PWA_PREVIEW_ACCESS_EVIDENCE.json). A CI deve
validar o SHA publicado e a inspeção do Preview protegido deve conferir os
quatro arquivos contra o manifesto daquele build, runtime e recusa de API sem
sessão da aplicação. A autenticação de acesso da Vercel não substitui Supabase
Auth. Nenhuma dessas inspeções equivale a entrega Push externa ou teste físico.

Para o reteste no Samsung, salve os rascunhos no sistema e abra o endereço
estável acima. Autentique o acesso ao Preview nesse endereço. Se o aplicativo
anterior foi instalado por outra URL, instale pelo endereço estável; aquela
origem antiga não receberá publicações posteriores da branch. Havendo uma
atualização aguardando, encerre as abas e a janela da PWA depois de salvar,
e reabra. Em Meu perfil, confira a orientação pública e só então ative avisos.
Se houver recusa, a orientação exibida permite tentar preparar novamente sem
limpar dados ou reinstalar para recuperar uma instalação malsucedida.
