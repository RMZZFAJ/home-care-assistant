# Segurança e autorização

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
de perfil não permite autoaprovação. A versão da política impede aplicar decisão
antiga sobre configuração nova. Cadastro inicial exige e-mail confirmado informado
explicitamente; privilégio global não concede acesso operacional automático.
A administração de acesso de administrador ativo não pode ser removida por
override; revogar seu vínculo é a operação própria.

O último administrador global ativo é protegido inclusive sob concorrência.
O último administrador local ativo também é preservado por transação serializada.
Revogação local não remove acesso da mesma conta a outro paciente. Paciente
inativo conserva histórico autorizado e recusa novas operações.

## Autoridade em escalas e balanços

Consulta própria, proposta, gestão própria, gestão de equipe e tipos são
capacidades distintas. O profissional precisa de vínculo ativo; conflito de
agenda entre pacientes informa somente a indisponibilidade do período.

BAL no regime por plantão exige a pessoa realmente designada e uma janela
vigente, também nas RPCs de criação, revisão e submissão. Gestão de agenda não
autoriza deslocar o prazo do BAL. Aprovação de adiamento e revisão familiar
exigem familiar/administrador local, mesmo se existir override incompatível para
supervisão. Quem contou não aprova a própria contagem. Administração global não
recebe essas competências sem vínculo e contexto local explícitos.

## Banco, APIs e objetos privados

RLS, grants explícitos/defaults e SECURITY DEFINER são revisados em conjunto.
Helpers internos não são executáveis livremente. Funções privilegiadas têm
search_path controlado. Serviço não possui DML público geral: usa a allowlist
de RPCs de worker, evidências e webhook. Toda nova função exige grant próprio.

Ledger e eventos confirmados são imutáveis para clientes. Saldo vem de
movimentos transacionais não negativos. SHA-256 compara conteúdo canônico;
não é assinatura assimétrica nem proteção contra administradores do banco.

Uploads têm limites, reserva idempotente, validação de formato e sanitização.
Imagens perdem metadados; PDFs ativos ou excessivos são recusados e páginas
passivas são copiadas para novo arquivo. Objetos e PDFs ficam privados, com
links temporários e acesso revalidado pela capacidade documental ou custódia.
Anexos não ampliam a autorização do seu autor após revogação.

Mutações rejeitam origem externa e validam contratos. Respostas sensíveis usam
no-store e correlação. Logs omitem payload privado, SQL, credenciais e tokens.
O navegador conserva tentativas incertas por até 24 horas para recuperação
idempotente; conclusão e saída removem os rascunhos. Não é histórico oficial.

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
A referência é o [código oficial do Auth](https://github.com/supabase/auth/blob/master/internal/api/password.go).
OAuth, confirmação de e-mail e SMS reais exigem configuração e teste próprios.

TOTP usa exclusivamente os contratos oficiais Supabase Auth. Após cadastrar e
confirmar um fator, operações administrativas exigem AAL2. Token AAL1, fator
apenas iniciado ou sessão revogada não satisfazem a exigência. O QR privado não
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
definidos pelo controlador. Resultados reais e limites da revisão ficam na
[matriz](evolution/EXECUTION.md); não presumir homologação externa.
