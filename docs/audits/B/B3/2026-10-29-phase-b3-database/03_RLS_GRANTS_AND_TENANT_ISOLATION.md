# RLS, grants e isolamento entre pacientes

## Resultado comprovado

14 cenários dirigidos com Auth real; um deles contém 186 tentativas HTTP de
INSERT/UPDATE/DELETE nas 62 tabelas públicas, todas recusadas com 42501.
Usuário administrador local também não possui DML direto. service_role não
altera ledger nem paciente diretamente. A matriz combina essas execuções com
grants efetivos e capacidades lidas; linhas estáticas não viram novos testes.

Cinco papéis locais, profissional compartilhado, convidado ainda sem aceite,
revogado local, usuário de outro paciente, administrador global e anon foram
considerados. Admin fictício possui vínculos A e B: no B33-03 sua recusa é por
contexto A, enquanto family/supervisor/professional/reader não têm vínculo B.
O título inicial do cenário descrevia todos como sem vínculo; esta precisão
corrige a interpretação, sem repetir/alterar o resultado observado.

## Composição real de acesso

public/private não concedem CREATE aos papéis expostos. private concede USAGE
e EXECUTE somente a quatro helpers de política para authenticated, não é schema
REST exposto. Teste REST private retorna PGRST106. public e graphql_public são
os schemas configurados; funções privadas não se tornam endpoints REST por
terem USAGE. É necessário testar GraphQL e configuração remota separadamente.

global_admin_guard é a única tabela pública sem RLS, mas não possui grants
de acesso aos papéis expostos. As demais 61 públicas e nove privadas têm RLS.
Não há política de DML suficiente para superar grants revogados; antigas
policies INSERT em audit_events/REQ permanecem inertes para o cliente.
Não classificá-las como exploração sem privilégio efetivo.

SELECT de ledger é concedido por coluna: tabelas de grants simples podem
mostrar ausência de SELECT geral mesmo quando colunas operacionais são
legíveis. Antes/depois de saldo familiar ficam fora desse grant. View de saldo
usa security_invoker e predicado por custódia, não owner que ignora RLS.
Read models definer mascaram saldos conforme a capacidade.

Policies filhas de documento consultam pais sob RLS; não autorizam leitura
somente por conhecer UUID. COM real de A ficou invisível e RPC recusou tanto
profissional de A quanto leitor de B; administrador local autorizado leu.
Catálogo global de identidades e definições de capacidade têm leitura geral
intencional; não contêm autoridade operacional implícita.

## Identidade, contexto e revogação

auth_session verifica sessão Auth real, usuário, perfil ativo e prazo. Contexto
está associado à sessão, não ao UUID lembrado no navegador. member_can consulta
vínculo e overrides atuais; user_metadata alterada para admin/global não mudou
perfil nem concedeu estoque. Atualização direta do próprio perfil foi recusada.

Revogar vínculo A retirou leitura e operação do token já emitido, preservando
B. Logout local retirou a sessão: reutilizar o mesmo token retornou sessão
inválida e recusou workspace. Conta convidada confirmada sem aceite ficou sem
pacientes e não selecionou A. Global sem vínculo local não selecionou nem
operou A, apesar de poder administrar o diretório global.

Esses ensaios verificam chamadas iniciadas após revogação. Revogação durante
espera por lock exige B3.8/B3.12; não é inferida deste verde. TOTP/AAL2 é
exigido
para administração quando há fator verificado; não é MFA universal obrigatório.
A configuração efetiva de produção permanece NOT_VERIFIED.

## Públicos limitados e limites

Dois contratos de aplicação são deliberadamente anônimos: verificação mínima
de integridade e elegibilidade de convite por hash/email. Valores inválidos
retornaram false, sem dados do paciente. As quatro rotinas unaccent pertencem
à extensão, não são quatro vazamentos de aplicação. Os defaults globais
revogam PUBLIC EXECUTE para novas rotinas postgres; ACLs finais de wrappers
históricos e serviços são aprofundadas em B3.4.

Nenhum acesso cruzado ou escalada foi demonstrado nesses cenários. Isso não
certifica todas as RPCs, estados, GraphQL, configuração remota ou provedores.
Também não transforma privilégio de superusuário/owner em capacidade legítima
do cliente. Grants, owners, herança/defaults e colunas foram capturados sem
ler senhas de roles, claims reutilizáveis ou segredos.
