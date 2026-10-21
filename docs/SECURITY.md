# Segurança e autorização

## Matriz efetiva

| Papel | Leitura | Requisição | Estoque | Contagem | Administração |
| --- | --- | --- | --- | --- | --- |
| Admin global | Todos | Sim | Sim | Sim | Sistema |
| Admin local | Paciente | Sim | Sim | Sim | Paciente |
| Supervisor | Vínculo | Sim | Não | Permitida | Status |
| Profissional | Vínculo | Sim | Não | Permitida | Não |
| Familiar | Vínculo | Não | Não | Não | Não |
| Leitor | Vínculo | Não | Não | Não | Não |

O papel efetivo vem do vínculo; o papel legado no perfil não amplia seu
escopo. Privilégio global exige perfil ativo, papel administrativo e flag
global explícita. Administrador local não altera perfil-base, senha, e-mail
de login, estado global ou vínculos de outros pacientes.

O último administrador global ativo não pode ser removido, revogado ou
rebaixado. Um contador transacional protege também alterações concorrentes
e exclusões que atinjam o perfil por cascata.

## Fronteiras

Toda operação valida sessão, perfil ativo, vínculo ativo, paciente, papel e
capacidade. RLS protege consultas e RPCs repetem as condições. IDs, nomes,
protocolo e flags enviados pelo navegador não são autorização. Histórico
permanece legível para usuários autorizados após inativação do paciente.

Grants explícitos e defaults foram revisados. A view de saldos usa
`security_invoker`. Funções privilegiadas têm search_path controlado;
helpers internos não são executáveis livremente. O lookup público de convite
exige hash de token aleatório e e-mail correspondentes e retorna só booleano.

Mutações HTTP exigem JSON e rejeitam origem externa. Redirects são resolvidos
e limitados à origem e aos caminhos internos permitidos. Respostas sensíveis
usam no-store. Erros externos contêm código seguro e correlação, sem SQL,
stack, tokens ou payloads privados nos logs.

## Identidade e convites

Convites concedem somente vínculo local após aceite por conta com e-mail
verificado. A autoridade atual do emissor é revalidada. Tokens são armazenados
como hash, expiram e são invalidados por revogação/reemissão. O administrador
nunca recebe credencial de login de uma conta existente. O destinatário novo
se cadastra pessoalmente pelo Auth, sem escolher papel ou privilégios globais.

Confirmação de e-mail deve estar habilitada em produção. A configuração
remota de Auth e OAuth precisa ser verificada antes da homologação; não foi
alterada nesta execução. Testes usam somente identidades e e-mails fictícios.

## Privacidade e LGPD

Coletar somente dados operacionais necessários. Observações podem conter
dados sensíveis; evitar conteúdo clínico desnecessário. Não usar dados reais
em fixtures, dumps de teste, screenshots, traces ou documentação.

O resumo de compartilhamento contém somente protocolo e orientação para
acesso autenticado. Destinatários externos vêm de configuração autorizada,
nunca do formulário. Bases legais, retenção, atendimento aos titulares,
operadores externos e políticas de backup precisam ser definidos pelo
controlador antes da operação real.

Uma tentativa de requisição cujo resultado é incerto fica em sessionStorage
do navegador por até 24 horas para recuperação idempotente. O conteúdo pode
incluir observações operacionais. É removido ao concluir, ao sair da conta
ou quando uma tentativa expirada é carregada. Usar sessão individual em
dispositivos compartilhados; esse armazenamento não é um histórico oficial.

Nenhuma auditoria garante ausência absoluta de vulnerabilidades. Consulte
os testes negativos e os limites demonstrados na auditoria datada.
