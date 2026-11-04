# Achados e tratamento

O baseline desta análise é `fc04de4`. Prioridades P0/P1 representam risco de
integridade, autorização ou bloqueio operacional no contexto do projeto; não
são pontuações CVSS. Os arquivos históricos citados foram preservados.

Os resultados históricos abaixo devem ser lidos com a
[continuação de 21/10](../2026-10-21/EXECUTION.md). Ela registra a correção da
identidade CLI, aplicação remota, preservação de integridade e validações
posteriores, sem transformar um resultado antigo em aprovação da versão final.

## F01 — Escrita direta e autoria de auditoria controlável pelo cliente

**Prioridade:** P0. A migration 006 concedia INSERT em requisições, itens,
observações e auditoria. A existência de RPCs transacionais não impedia um
cliente de tentar caminhos diretos, inclusive declarando conteúdo de auditoria.

**Correção:** migration 020 revoga DML, sequências e execução ampla; concede
SELECT e funções explicitamente necessárias, restringe defaults e mantém a
auditoria dentro das operações autorizadas. Novos objetos seguem esse modelo.

**Evidência:** suítes SQL e integração HTTP com sessão real negaram INSERT de
auditoria e administração global por administrador local. Metadados do banco
descartável registraram zero grants públicos de escrita a clientes.

## F02 — Revogação e papel efetivo inconsistentes entre operações

**Prioridade:** P0. O guard de status da migration 014 usava `v_role NOT IN`
sem tratar NULL explicitamente. A migration 017 verificava permissões do
vínculo de inventário sem exigir perfil global ativo. Papel legado e flags
podiam produzir regras diferentes das capacidades previstas por paciente.

**Correção:** helpers das migrations 020 e 026 exigem perfil e vínculo ativos,
derivam o papel por paciente e fecham a autorização quando ausente. API e UI
aplicam a mesma matriz; familiares/leitores não escrevem e apenas
administradores alteram o estoque oficial.

**Evidência:** SQL negou contagem e transição ao revogado, submissão ao leitor
e administração cruzada A/B. Revogar A manteve o acesso de uma identidade
compartilhada a B. A integração HTTP repetiu negativos com Auth real.

## F03 — View de saldo sem execução com privilégios do leitor

**Prioridade:** P0. A view herdada não declarava `security_invoker`, deixando
a composição entre privilégios da view e RLS inadequadamente protegida.

**Correção:** migration 020 define `security_invoker=true` e restringe grants.

**Evidência:** opção confirmada nos metadados; consulta do administrador A a
saldos de B retorna conjunto vazio; usuário revogado não lê saldos e anônimo
não tem SELECT. Isso foi exercitado por SQL e HTTP.

## F04 — Exceção global ampla para estoque negativo

**Prioridade:** P0. A migration 015 liberava o guard de saldo quando o ator
era administrador global, inclusive para saídas ordinárias.

**Correção:** migration 021 aplica o guard a todos os movimentos normais e
cria RPC separada de ajuste extraordinário, global e explicitamente confirmado.

**Evidência:** SQL negou saída/transferência global insuficiente, confirmação
ausente e ajuste extraordinário local. Em seis retiradas HTTP simultâneas de
duas unidades disponíveis, somente uma transferência foi aceita; os saldos
finais foram FAMILY 0 e CARE_TEAM 2.

## F05 — Ausência de proteção concorrente do último administrador global

**Prioridade:** P0. A edição global de perfis não preservava uma autoridade
global ativa mínima diante de revogação, rebaixamento ou concorrência.

**Correção:** contador transacional e trigger na migration 020, inclusive
para exclusão de perfil por cascata. Administradores locais continuam sem
permissão para editar identidades globais.

**Evidência:** SQL negou remoção do último administrador; duas conexões reais
tentaram rebaixar os dois administradores simultaneamente. Uma venceu e a
outra falhou, restando um perfil ativo e contador consistente em 1.

## F06 — Catálogo global incompatível com administração por paciente

**Prioridade:** P0 para a migração. O catálogo global não representava nomes,
unidades, aliases ou exclusividade locais e permitia confusão de escopo.

**Correção:** catálogo canônico composto, identidades estáveis, propriedade
explícita e FKs/triggers nas migrations 020/023/024. Unidade com histórico não
pode ser alterada; o item deve ser substituído ou inativado.

**Evidência:** instalação limpa e upgrade 019 passaram. Alterar nome de A não
alterou B; produto exclusivo A ficou invisível para B; até escrita privilegiada
tentando associá-lo a B foi rejeitada. Nenhuma origem foi inventada para o
movimento legado sem paciente.

## F07 — Intenção do cliente e comprovantes dependentes do catálogo atual

**Prioridade:** P1. Hash e rótulos recebidos do cliente não eram uma fonte
segura de intenção canônica. Consultas baseadas apenas no catálogo atual
podiam modificar o significado apresentado de comprovantes antigos.

**Correção:** banco normaliza intenção, calcula hash, serializa retries e
salva snapshots. API de detalhe e histórico consomem esses valores. Registros
antigos reconstruídos têm proveniência explícita.

**Evidência:** oito submissões simultâneas com a mesma chave retornaram um
registro/protocolo; rótulo forjado foi ignorado; alteração de estoque informado
gerou conflito. O E2E renomeou um produto após a requisição e confirmou o nome
original no comprovante.

## F08 — Inventário calculado sem uma referência estável da contagem

**Prioridade:** P1. A migration 017 calculava divergência contra o saldo no
momento da aprovação, sem representar adequadamente o momento da contagem.

**Correção:** snapshot de esperado e último movimento por item, revisão de
concorrência, contagem explícita, justificativa, recontagem e ajuste único.

**Evidência:** SQL rejeitou aprovação após movimento posterior à referência;
recontagem permitiu aprovação e repetição não duplicou ajuste. O navegador
executou cadastro, contagem, revisão, aprovação e conferência do saldo final.

## F09 — Notificação interna simulava envio e faltava reconciliação externa

**Prioridade:** P1. A migration 018 marcava registros como `sent` com uma
referência interna, sem entrega a um provedor. Não havia contrato completo de
destinatários individuais, lease, incerteza e reconciliação.

**Correção:** outbox por destinatário/canal, estados distintos, claim com
`SKIP LOCKED`, lease, limite de tentativas, revogação revalidada e webhook
assinado. O adaptador Meta usa origem fixa e não inclui conteúdo clínico.

**Evidência:** SQL validou destinatários, canais desabilitados, lease expirado
como incerto e estados monotônicos. Seis workers HTTP disputaram a mesma
notificação e somente um a obteve. Testes unitários cobrem assinatura e
respostas do adaptador. Nenhuma mensagem externa foi enviada; homologação do
provedor continua dependente de configuração externa.

## F10 — Redirect externo com barra invertida no callback

**Prioridade:** P1. Em `src/app/auth/callback/route.ts` do baseline, o teste
de prefixo aceitava `/\\evil.example`; a resolução por URL interpretava uma
autoridade externa.

**Correção:** `src/lib/safe-return-path.ts` rejeita barras invertidas e
controles, resolve a URL, confere origem e limita caminhos. O callback exige
código válido e apresenta erro seguro em falhas.

**Evidência:** reprodução do caso e regressões de redirects em testes
unitários. As integrações OAuth reais não foram alteradas ou homologadas.

## F11 — CI interrompido na instalação e runtime divergente

**Prioridade:** P1. O run GitHub Actions `39485166817` falhou em `npm ci` por
entradas ausentes de `@emnapi/core` e `@emnapi/runtime`. O Node 20 do workflow
também era incompatível com a versão instalada do cliente Supabase.

**Correção em validação:** runtime e npm explícitos, lockfile reproduzível,
dependências exatas, matriz Windows/Linux e job de banco/navegador isolado.
A investigação e o estado das instalações limpas ficam em
[VERSIONS.md](VERSIONS.md) e [EXECUTION.md](EXECUTION.md).

Na coleta inicial não havia comprovação de CI publicado aprovado nem
autorização de push. Em 21/10, publicação e PR/merge foram autorizados;
novos checks precisam de evidência publicada própria. A configuração Vercel
consultada usa Node 24.x.

## F12 — Fluxos administrativos e operacionais incompletos

**Prioridade:** P1. Existência de SQL e endpoints no baseline não correspondia
a uma operação integrada de catálogo local, administração, estoque,
inventário, convites e recuperação de acesso.

**Correção:** componentes por domínio com contexto de paciente, formulários,
estados de rede, detalhes/histórico e verificações de capacidade. Cadastro por
convite usa Auth público pessoal e não fornece credenciais ao administrador.

**Evidência e limite:** dez cenários Playwright passaram em desktop e celular,
incluindo axe no login/formulário, fluxo operacional, leitor e resposta
perdida. Um E2E desktop posterior passou convite, cadastro pessoal,
confirmação de e-mail local, aceite, recuperação de senha e novo login.
Essa evidência usa Auth e Mailpit descartáveis, sem homologação do provedor
remoto de e-mail. Consultar as evidências finais da rodada completa.

## F13 — Alertas ignoravam custódia e prioridade crítica

**Prioridade:** P1. A função de enqueue da migration 022 usava todos os
destinatários configurados para qualquer alerta, sem distinguir família e
equipe. O claim ordenava por horário e ID, sem prioridade crítica.

**Correção:** migration 029 roteia alertas FAMILY para família e
administradores configurados; alertas CARE_TEAM para equipe, supervisão e
administradores. Família recebe alerta da equipe apenas com opt-in explícito.
O claim prioriza críticos já elegíveis e cancela avisos pendentes cujo alerta
foi resolvido antes do envio. Requisições mantêm os destinatários configurados.

**Evidência:** `alerts-routing.sql` passou no PostgreSQL descartável,
verificando grupos, opção familiar, deduplicação, prioridade antes de alerta
baixo mais antigo, reposição e preservação de evidência já entregue.
O replay completo até 029 estava em execução ao registrar esse resultado.

## F14 — Seleção recorrente da conta errada no CLI

**Prioridade:** P1 operacional. A instalação Windows observada usava uma conta
padrão diferente da conta com acesso ao projeto. Não havia token de ambiente
nem segunda instalação no PATH que explicasse as recusas. A sessão correta do
dashboard não alterava por si só a identidade do CLI.

**Correção:** perfil nomeado e home externo específicos, identidade/projeto
fixados e wrapper que recusa overrides e destinos incompatíveis. O ponteiro
padrão foi alinhado sem excluir credenciais de outras contas.

**Evidência:** doctor repetido, novos processos com identidade correta,
listagem/aplicação autorizada das migrations e oito testes negativos. Não
se atribui a causa a bug Windows/Linux sem evidência.

## F15 — Resolução de extensão na conexão de migrations

**Prioridade:** P1 de implantação. A 021 usava digest sem schema explícito;
a conexão de migrations não resolveu a extensão e reverteu sua transação.

**Correção:** 02050 cria ponte privada para o schema real de pgcrypto e 032
remove somente a ponte marcada. Nenhuma migration aplicada foi reescrita.

**Evidência:** instalação limpa, upgrade019, teste com search_path restrito e
segunda aplicação remota concluída. Hashes operacionais antes/depois iguais.

## Dependências externas e verificações finais

A revisão final também identificou dois problemas de grants. O fallback do
worker consultava diretamente a outbox, permitido pelos defaults locais e
recusado no remoto; 033 substituiu essa leitura por RPC mínima e removeu os
grants diretos do serviço. O REVOKE de defaults por schema não removia o
EXECUTE global de PUBLIC; 034 restringiu o default do criador postgres.
Os dois caminhos de migrations, seis suítes SQL, seis testes HTTP/Auth reais
e comparação final local/remoto validaram a correção. Consulte
[SERVICE_GRANTS_REVIEW.md](../2026-10-21/SERVICE_GRANTS_REVIEW.md).

OAuth, confirmação de e-mail remota, provedor, template, webhook e agendamento
precisam de configuração/homologação externa. Retenção e operação com dados
pessoais dependem do controlador. Publicação/CI e validações finais têm
resultados próprios na continuação, sem sucesso presumido.
