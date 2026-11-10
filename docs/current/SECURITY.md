# Segurança e autorização

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
Garantias exigidas abaixo têm desvios delimitados em B3/B4: JWT encerrado
ainda alcança perfil/avatar diretos, há janela após lock e URL já emitida
mantém TTL. Sanitização também tem perda visível B6-008; não alegar fidelidade
integral. Ver política pendente P15 antes de prometer revogação instantânea.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

## Identidade e capacidades

Auth valida credenciais. Perfil ativo, escopo global e vínculo local são
conceitos distintos. Privilégio global exige administração global ativa no
banco. Administrador local só administra recursos e vínculos de seu paciente;
não altera senha, e-mail, perfil-base ou escopo global de outra pessoa.

Funções padrão incluem administrador do paciente, familiar, supervisor,
profissional e leitor. capability_definitions e overrides locais determinam
as capacidades efetivas. COM permanece no âmbito familiar/administrativo.
A equipe não lê o saldo geral familiar; a consulta mínima por produto da REQ
tem capacidade própria. APIs e banco aplicam essas regras sem confiar no
menu, metadata, nomes, UUIDs ou flags do navegador.

Sessão Auth vigente e contexto explicitamente selecionado são obrigatórios.
Administrador local altera seu paciente imediatamente. Mudança proposta no
modo global exige aprovação de outra identidade administradora local. Troca
de perfil não permite autoaprovação. A versão da política impede aplicar
decisão
antiga sobre configuração nova. Cadastro inicial exige e-mail confirmado
informado
explicitamente; privilégio global não concede acesso operacional automático.
A administração de acesso de administrador ativo não pode ser removida por
override; revogar seu vínculo é a operação própria.

O último administrador global ativo é protegido inclusive sob concorrência.
O último administrador local ativo também é preservado por transação
serializada.
Revogação local não remove acesso da mesma conta a outro paciente. Paciente
inativo conserva histórico autorizado e recusa novas operações.

## Autoridade em escalas e balanços

Consulta própria, proposta, gestão própria, gestão de equipe e tipos são
capacidades distintas. O profissional precisa de vínculo ativo; conflito de
agenda entre pacientes informa somente a indisponibilidade do período.

BAL no regime por plantão exige a pessoa realmente designada e uma janela
vigente, também nas RPCs de criação, revisão e submissão. Gestão de agenda não
autoriza deslocar o prazo do BAL. Aprovação de adiamento e revisão familiar
exigem familiar/administrador local, mesmo se existir override incompatível
para
supervisão. Quem contou não aprova a própria contagem. Administração global
não
recebe essas competências sem vínculo e contexto local explícitos.

A revisão BAL consulta o contador efetivo do evento oficial, inclusive no
legado, e registra revisor/grupo segundo autoridade do banco. Observações do
contador e parecer próprio são fatos separados. Revogação durante espera do
estoque ou de FK de perfil impede o efeito; evento, parecer e ledger fazem
rollback juntos. Recuperar um ato próprio já confirmado não exige renovar a
capacidade de escrita, mas exige leitura viva do paciente. RLS e grants de
balance_reviews não oferecem edição ou exclusão direta, nem ao service_role.

Emissão REQ, inclusive necessidade remanescente, mantém req.create no núcleo
transacional e revalida após os locks e a escrita. A API exige leitura viva
para também recuperar a chave já confirmada após perda só da escrita. Outra
chave exige novamente capacidade de emitir; trocar conteúdo conflita. Origem
estrangeira/histórica não autoriza novo vínculo operacional. Sessão revogada
durante espera tardia de perfil reverte emissão e evento causal da origem.
O núcleo privado não tem EXECUTE para clientes; a nova RPC pública tem grant
somente authenticated. RLS e grants das tabelas existentes permanecem.

Decidir pedido pendente de adiamento exige bal.defer.approve e autoridade
familiar efetiva. Recusar alvo obsoleto não exige que ele continue aprovável;
aprovar exige a mesma versão/destino e pessoa ainda elegível. O comando
revalida o decisor após esperas e, na aprovação, a capacidade de contar do
destino antes de confirmar. Proposta e autoria não vêm de campos editáveis.
Recuperação própria usa leitura viva, enquanto nova decisão exige escrita.

## Banco, APIs e objetos privados

RLS, grants explícitos/defaults e SECURITY DEFINER são revisados em conjunto.
Helpers internos não são executáveis livremente. Funções privilegiadas têm
search_path controlado. Serviço não possui DML público geral: usa a allowlist
de RPCs de worker, evidências e webhook. Toda nova função exige grant próprio.

Ledger e eventos confirmados são imutáveis para clientes. Saldo vem de
movimentos transacionais não negativos. SHA-256 compara conteúdo canônico;
não é assinatura assimétrica nem proteção contra administradores do banco.

Consultar origem de movimento usa o cliente Auth do chamador e as permissões
existentes, sem service_role ou novos grants. Leitura de estoque não concede
com.read. A parcela COM é resolvida pelo vínculo real ao documento; receiptId
não é documentId. Documento/relato e material são conferidos no mesmo paciente.
Movimento invisível responde404; origem restrita produz explicação genérica sem
conteúdo documental. Nomes atuais do perfil/catálogo não são apresentados como
snapshots históricos. A consulta não escreve no ledger, documento ou eventos.

Uploads têm limites, reserva idempotente, validação de formato e sanitização.
Imagens perdem metadados; PDFs ativos ou excessivos são recusados e páginas
passivas são copiadas para novo arquivo. Objetos e PDFs ficam privados, com
links temporários e acesso revalidado pela capacidade documental ou custódia.
Anexos não ampliam a autorização do seu autor após revogação.

Mutações rejeitam origem externa e validam contratos. Respostas sensíveis usam
no-store e correlação. Logs omitem payload privado, SQL, credenciais e tokens.
A recuperação local usa cópia opcional da aba, sem expiração por tempo imposta.
Conclusão remove o envelope da tentativa; logout limpa as cópias locais hca.
Rascunho salvo na conta permanece no servidor e não é apagado pelo logout.
Recuperação revalida o acesso e preserva a chave original. Não é histórico oficial.

Gestão de identidade/sucessor exige catalog.manage por paciente, sem conceder
access.manage ou leitura de custódia. A comparação retorna saldo restrito como
NULL; seu histórico compartilhado contém somente metadados de identidade, sem
capturar estoque visto por outro gestor. Comandos exigem intenção exata e motivo
próprio; autoria vem da sessão. RLS, grants e helpers privados não oferecem DML
direto. Esperas de estoque/catálogo e uma espera tardia de perfil foram testadas
com Auth real; encerrar a sessão antes da confirmação reverte os efeitos.
Inativar não autoriza novo movimento comum, merge ou conversão de unidades.

## Autenticação pessoal

Convite concede vínculo local somente após aceite pela identidade de e-mail
correspondente confirmado. Autoridade do emissor, prazo e revogação são
revalidados. Token fica em hash no banco e é removido da URL pela interface.
Administradores nunca recebem senha de outra conta.

Alterações de contato, vínculo de provedor e encerramento de outras sessões
exigem autenticação recente. Telefone usado em aceite WhatsApp deriva do
telefone confirmado no Auth. Dados de perfil ou do navegador não comprovam
posse de telefone. Tokens já emitidos expiram conforme a política do Auth.

A política de novas senhas respeita o limite do bcrypt configurado no Auth,
inclusive tamanho em bytes; o aplicativo não calcula hashes de credenciais.
A referência é o
[código oficial do Auth](https://github.com/supabase/auth/blob/master/internal/api/password.go).
OAuth, confirmação de e-mail e SMS reais exigem configuração e teste próprios.

TOTP usa exclusivamente os contratos oficiais Supabase Auth. Após cadastrar e
confirmar um fator, operações administrativas exigem AAL2. Token AAL1, fator
apenas iniciado ou sessão revogada não satisfazem a exigência. O QR privado
não
entra em logs, documentação ou artefatos versionados.

## WhatsApp e Flows

Webhooks verificam HMAC, WABA e Phone Number ID antes do processamento.
Aceite simples exige opt-in
do paciente, destinatário, telefone confirmado, desafio único, versão e prazo
válidos. Mudança de destinatário ou versão invalida o desafio. Eventos
registram o nível de verificação usado; esse canal não permite divergência,
cancelamento ou reatribuição.

Flows exige sessão curta e envelope cifrado. A sugestão é revista pelo autor
no aplicativo e segue como relato pendente. Texto ambíguo não movimenta
estoque. Chaves privadas e credenciais ficam exclusivamente no servidor.
Canais desligados ou indisponíveis retornam estado controlado, sem simular
envio, aceite ou publicação no provedor.

## Testes e privacidade

A suíte usa identidades Auth oficiais fictícias, com credenciais aleatórias
em estado local ignorado e envio externo desabilitado. Não inserir hashes de
senha manualmente nem carregar fixtures no remoto. Traces ficam desabilitados.
Backups e dados privados não pertencem ao Git nem ao upload Vercel.

Observações podem conter dados sensíveis: registre apenas informações
operacionais necessárias. Retenção, base legal e operadores devem ser
definidos pelo controlador. Resultados atuais e limites ficam em
[PROJECT_STATUS](PROJECT_STATUS.md); execuções arquivadas são datadas, não
comprovação atual de homologação externa.

## Rascunho próprio e prazo Auth durante espera

Rascunhos REQ/BAL usam tabelas privadas com RLS defensiva e nenhum grant de
leitura/escrita direta para clientes ou service_role. RPCs públicas têm grant
somente authenticated; helpers privados ficam sem EXECUTE dos clientes. Dono
sempre vem de auth.uid, com sessão/contexto/vínculo e leitura do domínio vivos.
Papel administrativo de outra pessoa não libera o preenchimento. Save/descarte
novos exigem capacidade de escrever; chave confirmada e reconhecimento técnico
do resultado exigem leitura viva. Campos de autor/estado/quantidade solicitada
não são transportados como controles de autorização. Logs não recebem conteúdo.

O prazo absoluto de auth.sessions.not_after é confrontado com o relógio real,
também depois de espera. Revogar a sessão e expirar seu prazo durante uma
transação são contraprovas distintas: ambas devem recusar a escrita e reverter
efeitos. Três regressões com Auth real cobrem o prazo em rascunho, REQ e estoque
familiar; não usam token forjado nem inferem expiração só de um sleep.

A referência de contagem consulta somente o paciente selecionado com bal.read
vivo, como a referência dos BAL já emitidos. EXECUTE da nova RPC é exclusivo
de authenticated. A confirmação sem plantão revalida leitura após o mutex e
compara a revisão de ledger antes de criar documento. Recuperação da própria
chave permanece sujeita às comparações canônicas nativas. Campos privados
saem da tela ao perder leitura; capacidades de escrita continuam separadas da
recuperação de comando já confirmado. Logout limpa as cópias hca da sessão.

Datas escolhidas não transportam papel ou autor. Native schedule_command
conserva autorização por paciente e pessoa e revalida após o lock do
profissional. Versão do tipo impede mudança silenciosa de horário. Conflito em
outro paciente recusa o conjunto inteiro sem revelar seu nome ou notas. A
negativa de leitura desse paciente foi exercitada com Auth real. A decisão da
proposta mantém motivo/notas do proponente e grava motivo próprio do decisor,
inclusive no terminal obsoleto após corte.

A apresentação de vínculos ENT→REQ usa o cliente autenticado do próprio
leitor. IDs são obtidos da ficha nativa, com filtro adicional do paciente e
RLS nas REQs; campos do browser não definem autorização. Família/global não
confirmam pelo recebedor. A matriz D-A registra as esperas observadas de
sessão/vínculo/capacidade e rollback dos comandos cobertos. Essa prova não se
estende automaticamente a comandos futuros ou à operação remota.

## Conferência profissional D3.17

Registro informado não concede papel/capacidade nem comprova fonte externa.
Conferência exige ator Auth distinto do titular, contexto do paciente e papel
local/capacidade compatíveis. O servidor produz autoria/instante, bloqueia
revisão obsoleta e revalida após espera. Tabelas/helper privados não recebem
acesso direto; RPCs guardadas têm grants explícitos. Negativas com Auth real
incluem revogação de vínculo e sessão durante locks, sem efeito parcial.
[Provas e limites](../audits/D/D-B/PROFESSIONAL_CREDENTIALS.md).

## Preparação privada de programação e plantões

As preparações BAL por recurso resolvem titular pelo Auth e revalidam
paciente,propósito e alvo reais no banco. Salvar/confirmar exige autoridade
do ato;descarte próprio,consulta e reconhecimento não concedem escrita
operacional. Só um pacote já vinculado recupera seu resultado após perda da
capacidade de decidir. Chave nativa antiga não cria esse vínculo retroativo.
Helpers e tabelas não oferecem grants aos clientes ou service_role.

O envelope incerto usa prefixo hca e escopo por conta/paciente/propósito/
recurso,é validado antes de exibir e segue a limpeza de logout. Retomada local
não faz POST automático;sessionStorage não concede permissão. Respostas não
são armazenadas pelo Service Worker e mutações não são reproduzidas offline.

## Preparação privada de movimentação familiar

O escopo pessoal STOCK admite leitura ou gestão familiar;somente escrita nova
exige gestão e paciente ativo. Tabelas/helpers permanecem sem grants diretos;
quatro RPCs Auth têm search_path vazio e guardas no banco. O snapshot interno
usa o ledger autoritativo. Leitura e gestão independentes não autorizam revelar
saldo ou origem:referência,contexto,recibo,replay e apresentação pendente são
mascarados quando necessário. O pacote original de recuperação é preservado,
sem reaplicação offline. Revogação tardia e rollback são exercitados com Auth
real. Resultado próprio pode ser recuperado com paciente inativo;nenhum novo
movimento é autorizado por isso. [Provas](../audits/D/D-B/FAMILY_STOCK_DRAFTS.md).

## Preenchimentos privados de consumo

Custódia,dono,propósito e alvo são conferidos no banco;metadata/nomes do
cliente não autorizam leitura ou decisão. Duas tabelas/helpers fechados e
quatro RPCs Auth mantêm RLS/grants/search_path explícitos. Nova confirmação
revalida autoridade,referência e intenção após locks. Revogação tardia reverte
o ato nativo e seus registros privados/auditoria/journal.

Recuperação própria de histórico inativo não abre a consulta operacional
atual. Perda conhecida de escopo e atualização pessoal ocultam conteúdo até
revalidação,sem confundir erro de consulta com revogação definitiva. Pacote
pendente divergente não é apagado nem autoriza reconhecimento. Cache privado,
replay offline e envio automático permanecem ausentes.
[Contraprovas Auth e limites](../audits/D/D-B/CONSUMPTION_DRAFTS.md).

## Revisão privada do Flow

A sugestão,preenchimento e resultado pertencem ao titular autenticado com
vínculo vivo no paciente. Administração alheia não concede acesso ao privado.
Nova escrita exige autoridade atual e paciente ativo;recuperação própria não
concede nova revisão. Registro exige leitura da equipe;recusa não revela
catálogo a quem não tem essa leitura. Duas tabelas/helpers fechados e cinco
RPCs Auth não alteram o escopo nativo do provedor.

Pacote incerto conserva a mesma chave;somente resultado autoritativo do pacote
exato reconcilia a leitura. Outro envelope tipado permanece preservado e
bloqueia reconhecimento. Perda de vínculo protege o conteúdo após revalidação.
Cache privado/replay offline continuam ausentes;nenhum canal Meta foi ativado.

## Recuperação pessoal da agenda

A referência local de escala é separada por conta/paciente e nunca autoriza
comando. RPC de consulta usa auth.uid(),vínculo vivo e diário do próprio ator;
retorna somente seu comando e identidade/estado/versão do resultado. Outro
ator não encontra a chave. Envelope/200 divergente não é limpo;consulta/online/
reload não enviam POST. Perda de acesso retira os dados do painel. Senhas,OTP,
MFA e capacidades de convite ficam fora de rascunhos comuns do inventário.

Andamentos incompletos usam preparação privada por auth.uid()/paciente/ficha,
sem acesso direto às duas tabelas. Leitura exige vínculo vivo e leitura da
ficha;perda de publicação/paciente inativo não apaga histórico pessoal. Commit
revalida escrita nativa e escopo ao concluir;revogação tardia reverte fato,
consumo,diário e auditoria. Rótulos referenciados dependem da leitura atual.
Recuperação por consulta espera a trava original,revalida acesso e não escreve.
Somente prova correspondente ao pacote exato permite limpeza local;outro
envelope permanece. Nova preparação após concorrência exige decisão explícita
e preserva texto próprio. Sem cache privado,envio automático ou replay offline.

Preparações de novos tipos/séries usam duas tabelas privadas RLS fechadas,
quatro helpers sem execute público e quatro RPCs Auth com search_path vazio.
Vínculo vivo autoriza somente leitura,descarte e reconhecimento próprios;
publicação exige capacidade nativa atual/paciente ativo. Propor somente para
si conserva aprovação posterior. Referências atuais não divulgam rótulos sem
leitura operacional. O alvo ainda inexistente fica nulo,sem IDs artificiais.
Chave nativa anterior não pode ser reaproveitada como consumo privado. Recusa
tardia reverte a transação inteira. Prova de não aplicação exige vínculo
imutável de chave ou avanço monotônico da revisão privada/tipo selecionado.
Não há limpeza por ausência,publicação automática,cache privado ou replay offline.

my_workspace limita trabalho aos candidatos de autoridade guardada no banco,
incluindo backend/transação/usuário da autoridade interna. IDs apenas limitam
a consulta;can_access_recipient/patient_capabilities conservam a decisão. Não
se reduz a autoridade interna à seleção da UI nem se concede capacidade pela
presença no diretório global. Guardas/grants nativos permanecem e a sessão é
revalidada no retorno,sem cache entre chamadas. Testes reais negam vínculo
revogado,sessão expirada,anon/service e escopo interno divergente.

## Continuidade de alterações existentes da agenda

As preparações D3.54 não recebem owner nem referência operacional do cliente.
IDs selecionam o recurso; Auth vivo, vínculo atual, visibilidade e capacidades
nativas decidem o acesso. Leitura privada, consulta de resultado, descarte e
reconhecimento próprios admitem perda de escrita/paciente inativo sob vínculo
vivo. Snapshot operacional é redigido quando a leitura nativa deixa de ser
permitida; campos e recibos próprios não incluem o snapshot de terceiros.

Salvar campos com hash antigo não sela autoridade. Commit exige snapshot
selado pelo servidor, revisão privada, intenção exata e versão nativa. O
resultado obsolete preserva o comportamento nativo sem permitir aprovação
após alteração concorrente; a guarda posterior ao comando reverte qualquer
resultado incompatível. Ausência de diário não apaga tentativa. Resolução
explícita avança CAS sob a chave original e bloqueia aplicação tardia. Nenhum
reenvio offline, cache privado ou autorização por sessionStorage foi criado.
