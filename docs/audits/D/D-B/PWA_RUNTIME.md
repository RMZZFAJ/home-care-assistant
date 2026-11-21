# D5.1 — instalação, atualização e orientação offline

Manifesto pt-BR, ícones192/512 e Apple180, identificação e escopo da mesma
origem integram a aplicação web. Meu perfil oferece Aplicativo neste aparelho:
orientação de instalação, convite quando o navegador o disponibiliza, consulta
de atualização e versão para suporte. Aceitar o convite não é anunciado como
instalação concluída; o estado depende do sinal de instalação ou modo standalone.

O convite de instalação depende de capacidade e gesto. Ausência de suporte
mantém as funções web; não dispara pedidos repetidos automaticamente.
[beforeinstallprompt tem disponibilidade limitada](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeinstallprompt_event).
Confirmação física por sistema operacional continua gate D-C.

## Cache e privacidade

O build gera service-worker.js sem segredos, com fingerprint de fontes,
configuração e assets públicos. Dev, build de produto e runner E2E usam o mesmo
gerador. O script é servido com no-store e escopo explícito. Cache contém
somente os bytes públicos de offline.html e três ícones. A busca desses quatro
arquivos usa credenciais somente da mesma origem para atravessar a proteção
de acesso ao Preview. O build fixa tamanho, tipo e SHA-256 de cada arquivo.
Redirecionamento, resposta não autorizada, conteúdo divergente e excesso de
bytes impedem a instalação. O cache recebe uma nova resposta dos bytes
verificados, sem copiar cookies, Vary ou cabeçalhos privados da entrega.
Isso substitui a captura com credenciais omitidas que falhava no Preview.

APIs, HTML autenticado, fichas, PDFs, respostas do framework e comandos não
entram nesse cache. Um GET privado depende da rede e das autorizações existentes.
POST não tem fila, background sync ou replay pelo worker. Falha de navegação
oferece apenas a orientação pública; HTTP de erro da aplicação não é convertido
em sucesso ou página supostamente atual. Offline não anuncia frescor dos dados.

O documento offline é estático, sem dados do paciente ou scripts de autenticação.
Tentar abrir novamente consulta o destino original. Login e permissões continuam
exigidos ao restabelecer a conexão. Logout não precisa apagar dados privados
desse cache porque ele não os recebe. Arquivos baixados pelo usuário têm outro
limite de custódia e não são anunciados como revogáveis pelo worker.

## Atualização e preservação

Os avisos de conexão, atualização e resultado ocupam a coluna de conteúdo do
shell. Não antecedem o cabeçalho nem ficam sob a navegação lateral fixa.
Em páginas públicas aparecem antes do conteúdo, sem bloqueá-lo. O provider
conserva estado e ações; o shell aplica inert ao cabeçalho, navegação e conteúdo
privado quando necessário, mantendo a consulta de recuperação fora dessas
regiões. Menus em portal continuam sujeitos à guarda de comandos já existente.

Sem confirmação, a versão instalada aguarda o ciclo natural: encerrar as abas
controladas pela anterior. Não há reload automático. A decisão posterior do
responsável em12/11/2026 acrescenta Atualizar aplicativo: a pessoa pode salvar
seus preenchimentos e confirmar a recarga desta aba, sem fechar as outras.
Antes da ativação, a versão candidata é conferida com o marcador real do
servidor. Somente uma janela da mesma origem, com confirmação explícita e a
revisão exata, pode solicitar skipWaiting. A ativação limpa somente caches
públicos próprios antigos. Sem confirmação, conserva o ciclo natural de
[atualização do Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

A confirmação explica a recarga e permite voltar para salvar. Não salva campos
automaticamente, não amplia rascunhos e não reenvia operações. As outras abas
mantêm seus campos e podem confirmar sua própria recarga depois, mesmo quando
o worker novo já está ativo. O controle é por origem e navegador; sessões em
outro aparelho não impedem a atualização. Um recibo temporário sem dados
privados permite mostrar sucesso após reabrir esta aba e conferir a revisão
ativa. Falha ou resultado não confirmado é informado, sem ciclo de reload.

Instalação recusada é identificada pelo estado real redundant; ativação e
confirmação de versão são fases distintas. O prazo de observação produz
pendência, não uma confirmação de falha. O aparelho pode tentar preparar
novamente sem limpar Auth, rascunhos ou armazenamento de outras aplicações.
Uma atualização recusada conserva o cache público da versão já ativa.

O worker anuncia as capacidades explicit-update e push-test sem mudar o
protocolo/schema anterior. A versão antiga continua utilizável para os fluxos
existentes, mas não habilita um teste que ainda não sabe apresentar. O botão
aguarda a capacidade confirmada; uma candidata sem ativação explícita é recusada
antes de receber a mensagem. A aplicação orienta consultar a atualização.

Ativar avisos exige registro ativo e versão confirmada antes de solicitar
permissão. Uma troca de controlador invalida essa prontidão até nova consulta.
O clique não espera oito segundos por um worker inexistente. Instalar a PWA
na tela inicial e inscrever Push continuam capacidades diferentes; uma não
confirma a outra. Consentimento e autorização por conta/aparelho continuam
independentes da disponibilidade do worker.

Em Preview, o layout pode oferecer o endereço estável da branch fornecido
pelo ambiente Vercel. Esse endereço é orientação de navegação, sem autoridade
e sem contexto privado na URL. Uma instalação feita por URL de deployment
continua ligada àquela origem. O usuário deve salvar seus rascunhos e abrir o
endereço estável, autenticando-se nele quando necessário; não há transferência
automática de sessão, bypass ou redirecionamento para produção.

O contrato público /api/runtime consulta um marcador SQL de protocolo/schema
sem cookie ou identidade. Ausência do marcador, incompatibilidade e infraestrutura
indisponível são resultados distintos. O marcador não concede autorização.
APIs/RPCs de negócio mantêm suas próprias verificações. O papel service_role não
precisa executar esse marcador e teve seu grant retirado incrementalmente.

Uma incompatibilidade ou perda de conexão torna a área privada inerte, mantendo
os componentes e os campos montados. A nova consulta é explícita ou ocorre na
reconexão; não submete edições. A área de autenticação permanece acessível.
O cliente também recusa novos comandos antes do fetch quando a conexão ou o
contrato estão indisponíveis, inclusive em menus fora da região inerte e nos
uploads privados. Leituras continuam possíveis; essa barreira de disponibilidade
não concede permissão nem substitui as verificações de sessão/paciente do servidor.
Uma troca de contexto recusada mostra o erro no menu e conserva a página e os
campos atuais, separadamente de uma falha na leitura inicial do contexto.
Mudanças futuras incompatíveis devem evoluir marcador e contrato conjuntamente,
com verificação de instalação limpa, evolução legada e recuperação de rascunhos.

## Sessão revogada e edição aberta

O percurso novo usa a sessão real de teste do navegador, identificada pelo
adaptador SSR público. A própria sessão é encerrada pelo Auth local. Com o
worker ativo, /api/profile recusa com 401; o campo já aberto conserva o texto.
Na navegação offline seguinte, somente a orientação pública aparece, sem o
texto privado. A reconexão exige login e não envia o campo preservado. O cache
continua restrito aos mesmos quatro arquivos públicos. Não se fabrica token,
sessão ou indisponibilidade de provedor nesse percurso.

## Evidência a distinguir

No Preview estável de7e27795, o responsável relatou no Samsung Galaxy S24 Ultra
que a atualização foi concluída e o aviso de teste chegou. Esse relato físico
comprova esses resultados no aparelho informado; não generaliza para outros
navegadores, versões de sistema ou todos os cenários de uso em background.

O teste do convite usa sinal de navegador controlado; não comprova instalação
no sistema operacional. O ensaio de atualização usa dois clientes e registro
real de outro URL do mesmo script, sem fabricar estados do worker. Essa variação
é instrumento de ciclo de vida, não prova de promoção operacional entre releases.
Web Push, VAPID, entrega em background e aparelhos físicos têm gates próprios.

Os casos PWA habilitam workers reais nos três projetos. As suítes web comuns
bloqueiam workers para que as falhas HTTP injetadas pelo Playwright cheguem ao
consumidor, conforme a
[limitação documentada de interceptação](https://playwright.dev/docs/network#missing-network-events-and-service-workers).
O caso PWA de indisponibilidade injeta apenas a resposta pública /api/runtime
por um adaptador fetch explícito, conta cada injeção e volta à consulta real na
recuperação. Auth, dados, worker, reconexão e rascunhos usam o backend local real.
Essa prova controlada não representa indisponibilidade real de um provedor.

A matriz e o manifesto deste lote devem registrar os resultados observados,
as falhas e as respectivas coortes, sem transformar diagnóstico em aceite.

## Execução da CI

Chromium, Mobile e iOS usam duas partes cada. Workers continuam seriais na stack
isolada, sem dividir uma base mutável entre jobs. O gate final exige todos.
Os seis artefatos usam o nome do navegador e a parte, sem sobrescrever os demais.
Coleta dirigida deve demonstrar união completa, sem interseção ou caso removido.
Observações por SHA, duração e contraprovas pertencem ao manifesto de execução
e ao checkpoint, separados deste contrato.

### Correções dirigidas da CI7e27795

Chromium-1 encontrou target-size no formulário do perfil após recuperar a foto
e redimensionar com rolagem anterior: um checkbox ficava sob o cabeçalho fixo.
O controle já tem rótulo com alvo mínimo44px. Os dois casos passam a usar
auditFromTop, rotina existente para a origem estável das verificações completas.
Conservam as quatro larguras, teclado, foco, todas as regras Axe, Auth, revogação,
retomada e ausência de objetos duplicados. Ambos passaram em produção local.

Chromium-2 encontrou o botão Atualizar aplicativo realmente coberto pela barra
lateral fixa. O posicionamento passou para a coluna do shell, preservando as
regiões inert e a guarda de comandos inclusive nos portais. A regressão exige
geometria abaixo do cabeçalho e à direita da navegação, clique real, cancelamento,
atualização explícita, outra aba intacta e resultado após recarregar. O caso de
falha/incompatibilidade exige edição preservada, cabeçalho e conteúdo inertes,
consulta de recuperação acessível e nenhuma escrita. Os seis casos passaram
em Chromium, Mobile e iOS, build ees5lpee9fhLBv-zRoMAb, worker725c47a1e6faeb1c07f3c570.
Tipos e lint afetados passaram. A captura nativa acrescentada ao caso conserva
a inspeção visual na próxima CI; não altera o contrato da jornada.

Logs locais: output/phase-d-work/avatar-viewport-e2e.log e
output/phase-d-work/pwa-notice-layout-e2e.log. Os artefatos nativos das duas
falhas foram preservados. Não houve force click, exclusão de regra ou aumento
de prazo; a CI do próximo SHA continua necessária.

Os grupos iOS terminaram sem cancelamento, mas cada um teve um retry aprovado.
No BAL, a observação de403 era instalada depois da revogação e o teste ainda
tentava clicar no botão que a atualização automática já podia retirar. A
observação agora antecede a mudança e o teste aciona o sinal normal de releitura
do consumidor. HTTP, Auth/RLS, retirada do conteúdo, estoque preservado e
ausência de escritas continuam reais. Essa etapa controla a invalidação no
teste; a prova do transporte Realtime permanece na integração própria.

No Push indisponível, Axe registrou o alvo parcialmente encoberto pelo cabeçalho
após os cliques anteriores. Somente essa conferência completa passa a usar
auditFromTop; as verificações de seção dos outros casos permanecem iguais.
Os três casos afetados passaram no WebKit, build SK2XznL0GF6SPpK9xxG-8, sem retry
local, aumento de prazo ou exclusão de regra. Log:
output/phase-d-work/webkit-retry-regressions.log. Isso qualifica as correções
dirigidas, não promete ausência de flakiness na próxima execução completa.
