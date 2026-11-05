# RPCs e autoridade privilegiada

## Reconstrução da superfície

O catálogo individualiza 232 rotinas, 228 da aplicação e quatro da extensão.
A [matriz](04_RPC_SECURITY_AND_CALLERS.csv) registra assinatura, owner, ACL
efetiva, definer/invoker, search_path, parâmetros, validações, locks, efeitos,
exceções, retorno, repetição e chamadores SQL/API. A extração ajuda a revisão
sem afirmar que um marcador prova todos os ramos. Contratos de domínio são
aprofundados em B3.5–B3.11 e reexaminados em B3.12.

As rotinas privilegiadas rodam como postgres; a fronteira é a autorização do
entrypoint, não RLS dentro do definer. Funções privadas de política são
estritamente selecionadas. Helpers v3/v4/fluent anteriores ainda são usados
por wrappers vigentes, mas não podem ser chamados diretamente pelos papéis
expostos. Três tentativas HTTP dessas rotas retornaram 42501 (B34-01).

SECURITY DEFINER declara search_path; a maioria usa vazio e nomes qualificados.
Rotinas antigas usam public ou public/extensions. Os schemas não concedem
CREATE aos papéis expostos; não foi demonstrado shadowing explorável.
Isso reduz uma hipótese, sem dispensar revisão de novos owners/defaults.

## Autoridade real por família

Identidade passa por auth_session, contexto, membership/capacidade e assurance.
Criação inicial de paciente exige administrador global e e-mail confirmado
explícito; selo membership_authority vale somente para backend/tx/usuário/
paciente/papel exatos. Aceite revalida sessão, e-mail, prazo, estado e emissor
local depois de obter o lock do paciente. O helper antigo mais permissivo não
é a entrada exposta. Repetição de convite aceito não reativa vínculo revogado.

Governança exige administrador local para aplicar imediatamente, ou global
para propor com versão. Aprovar proposta global exige identidade local distinta.
O request guarda proposta original; parâmetros atuais não substituem seu
conteúdo. Entrada de nova pessoa torna-se convite/awaiting_acceptance, não
vínculo unilateral. Locks de estoque/política e FK de atores preservam história.
O último administrador é protegido por guard transacional; concorrência é
aprofundada em B3.8, não presumida por uma execução isolada.

Catálogo usa lock próprio e verificação de aliases normalizados e produto
exclusivo. Unidade histórica tem trigger complementar. Alertas e preferências
validam custódia, membro e tipo; identidades e destinos não vêm de metadata.
Mudanças globais de perfil ficam em admin_set_profile, com contexto global e
assurance, não em administração local nem update direto.

Documentos/estoque exigem capacidades específicas, idempotência e versão.
O banco calcula protocolo/snapshot/hash; labels e claims do navegador não
substituem catálogo/ator. RPCs de serviço permitem finalização de evidência,
PDF, desafio, webhook e worker, não DML geral nem movimento familiar.
Authenticated tentou finalização/configuração do worker e service_role tentou
movimento familiar: todos recusados com 42501 em B34-02/03, sem configurar nada.

## Sucesso, intenção e efeitos

B34-04 revalida B2-011: após confirmar falta, outro administrador rejeita e
recebe sucesso/null, mas o estado continua confirmed. Preservar a primeira
decisão é correto; sucesso da intenção oposta é informação incorreta. O
adaptador genérico rpc devolve null sem validar resultado e o consumidor
interpreta sucesso. Não há estorno nem segundo débito demonstrado.

B34-05 acrescenta manifestação nova: p_accept=null em relato reported retorna
sucesso/null e grava rejected. O CASE trata qualquer valor que não seja true
como rejeição; não há validação booleana na RPC. A API usa schema booleano,
um controle compensatório que não cobre chamada RPC direta autorizada.
É defeito de contrato delimitado, sem bypass de capacidade. Critério futuro:
null deve ser inválido e não alterar relato/história; false legítimo deve
continuar funcionando. A prioridade será calibrada no registro mestre.

## Limites e contraditório

Não classificar owners altos ou EXECUTE authenticated como exploração sem
reconstruir os guards. Os testes refutaram helpers antigos e serviço como
rotas alternativas livres. Não há vazamento confirmado nesta etapa.
Ramos de revisão/estoque, autoridade após espera, nulos adicionais, falha de
retorno após commit e integrações permanecem ligados aos próximos subgrupos.
MFA atual, mudança remota e comprometimento de credencial de serviço não foram
simulados. Nenhuma função/grant/policy foi alterada.

## Resultado da segunda passagem

B312-01 delimitou uma exceção à proteção de sessão de negócio: update_my_profile
e set_my_avatar aceitam JWT de sessão encerrada para identidade própria.
API/estoque recusam a mesma sessão. B312-05 também encontrou NULL removendo
limite documental. Esses resultados impedem generalizar os guards dos
entrypoints protegidos para todas as rotinas. Ver B3-021/B3-023 no registro
mestre. A cobertura separa34 casos diretos, sete contratos SQL simulados e
objetos apenas estáticos/indiretos; extração de 232 definições não é prova
dinâmica completa de cada função.
