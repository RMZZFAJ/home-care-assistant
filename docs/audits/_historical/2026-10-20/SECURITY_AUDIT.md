# Auditoria de segurança e isolamento

Foi realizada análise dirigida de autorização, contratos HTTP, migrações,
grants/RLS e integrações, acompanhada de testes mutáveis apenas no ambiente
de testes autorizado. A etapa inicial utilizou uma stack auxiliar; a rodada
atual usa o projeto local home-care-assistant. Este documento registra
propriedades verificadas e seus limites;
não representa um pentest do ambiente de produção.

## Autoridade e fronteiras

A identidade é global no Supabase Auth. A autorização operacional pertence ao
vínculo ativo com o paciente, combinado com perfil global ativo. Apenas perfil
administrativo ativo com `global_scope` explícito é administrador global.
Papel legado, metadata Auth e flags recebidas do navegador não concedem
privilégios globais.

O administrador local administra catálogo, dados operacionais, convites e
vínculos estabelecidos do próprio paciente. Não altera identidade, senha,
e-mail global, revogação global ou papéis de outros pacientes. Adicionar uma
identidade exige aceite de convite; saber um UUID de usuário não basta.

| Papel | Requisição | Estoque | Contagem | Administração |
| --- | --- | --- | --- | --- |
| Global | Sim | Sim | Sim | Todos os pacientes |
| Admin local | Sim | Sim | Sim | Próprio paciente |
| Supervisor | Sim | Não | Se concedida | Apenas revisão autorizada |
| Profissional | Sim | Não | Se concedida | Não |
| Familiar/leitor | Não | Não | Não | Não |

Leitura depende de vínculo ativo; administradores globais leem todos os
pacientes. Inativar paciente impede novas operações, preservando o histórico
para quem continua autorizado. Revogação global nega todos os pacientes;
revogação do vínculo A não afeta o vínculo B.

## Controles no PostgreSQL

- RLS nas tabelas operacionais; view de saldos com `security_invoker`.
- Zero grants DML para clientes; RPCs transacionais repetem a autorização.
- Defaults de tabelas, sequências e funções restritos; grants por contrato.
- SECURITY DEFINER com search_path definido e helpers internos sem execução
  livre por clientes.
- FKs compostas e escopo derivado do pai impedem associação cruzada.
- Lock de estoque, idempotência, snapshots e ajuste único no inventário.
- Contador serializado impede perda do último administrador global ativo.
- Auditoria produzida pelo banco, sem INSERT direto do usuário.

A coleta de metadados confirmou zero constraints pendentes de validação e
zero funções SECURITY DEFINER sem search_path. `global_admin_guard` não tem
RLS porque é uma tabela interna sem grants a clientes. Objetos criados por
outros owners no futuro exigem revisão dos respectivos default privileges.

## Testes negativos e concorrentes

| Propriedade | Evidência executada | Resultado |
| --- | --- | --- |
| Anônimo não lê saldos nem executa submissão | SQL/grants e Data API | Negado |
| Admin A não lê saldo de B | SQL e HTTP com Auth real | Conjunto vazio |
| Administrador local não promove perfil global | SQL e HTTP | Negado |
| Administrador local não altera vínculo de B | SQL e HTTP | Negado |
| UUID de B não permite vínculo em A | SQL | Exige convite |
| Auditoria não aceita autoria fabricada | SQL e HTTP | INSERT negado |
| Leitor/revogado não escrevem | SQL, HTTP e navegador | Negado |
| Revogação de A preserva B | SQL, conta compartilhada | B acessível |
| Produto exclusivo não cruza paciente | SQL privilegiado | Rejeitado |
| Catálogo local não altera outro | SQL | Isolado |
| Retry não duplica requisição | Oito chamadas HTTP | Um registro |
| Saída não excede saldo | Seis chamadas HTTP | Uma aceita |
| Último admin resiste a corrida | Duas conexões HTTP | Um preservado |
| Workers não duplicam claim | Seis chamadas HTTP | Um lease |
| Outro worker não conclui lease | SQL e HTTP | Negado |
| Webhook reservado ao serviço | Grants SQL | EXECUTE negado |
| Convite exige e-mail confirmado | SQL, fixtures Auth | Divergência negada |
| Convite aceito não restaura vínculo revogado | SQL | Negado |
| Token antigo ou emissor revogado | SQL | Negado |
| Referência antiga não aprova inventário | SQL | Exige recontagem |
| Ajuste extraordinário exige global e confirmação | SQL | Demais negados |

As suítes SQL fazem rollback e complementam cinco testes de integração com
sessões emitidas pelo Auth local. Mocks unitários não foram usados como prova
de RLS. Os dez testes de navegador aprovados cobrem um subconjunto dos fluxos
e não equivalem à enumeração completa de cada papel em cada endpoint.
Um E2E desktop posterior passou cadastro pessoal, confirmação de e-mail,
aceite, recuperação de senha e novo login no ambiente descartável.

## HTTP, autenticação e dados sensíveis

O helper `src/lib/server/api.ts` exige JSON nas mutações, restringe a origem
contra a URL pública configurada, rejeita `Sec-Fetch-Site: cross-site` e limita
bytes efetivamente lidos do corpo. Validação strict rejeita campos extras.
Identidade é confirmada por `auth.getUser`, seguida de perfil e vínculo.

Erros recebem código seguro e correlação. Logs de erro incluem operação,
código e correlação; não incluem payload, identidade, SQL bruto ou token.
Respostas usam `no-store`. A aplicação preserva exceções internas do Next em
vez de convertê-las indevidamente em erro de domínio.

Redirects usam resolução de URL, origem e lista interna de caminhos. Testes
incluem barras invertidas, autoridade externa e valores malformados. O resumo
de compartilhamento usa somente protocolo e orientação para acesso autenticado.

Convites armazenam hash, expiração e emissor. O token temporário de aceite é
recebido no fragmento da URL e removido da barra de navegação. Cadastro pessoal
usa Auth público; administrador não recebe credencial de conta existente.
O lookup anônimo retorna apenas booleano e exige token de alta entropia e
e-mail correspondente. A confirmação de e-mail precisa ser conferida no
ambiente remoto antes de homologar o onboarding real.

## Notificações externas

O worker exige autoridade global ou segredo de execução, usa chave de serviço
somente no servidor e revalida o destinatário antes de enviar. A outbox tem
estado por destinatário/canal, lease e tentativas. Timeout ou resultado
ambíguo fica `uncertain`; não há reenvio automático presumindo falha.

O adaptador permite somente `graph.facebook.com`, não segue redirects e envia
template sem paciente ou conteúdo clínico. Webhook exige HMAC SHA256 do corpo
original e compara segredos em tempo constante. A reconciliação associa a
referência ao job e impede regressão de `read`/`delivered` para estado anterior.

O canal externo permaneceu desligado. Estados de provedor foram exercitados
com dublês e eventos fictícios; nenhum teste afirma entrega real no WhatsApp.
O canal de e-mail de notificações ainda exige adaptador/configuração próprios.

Na migration 029, alerta da família fica restrito à família e administradores
configurados; alerta da equipe chega à equipe, supervisão e administradores.
Família recebe alertas da equipe apenas por configuração explícita. O teste
SQL dedicado verificou a separação, o opt-in, a prioridade dos críticos e o
cancelamento de avisos obsoletos após reposição. Isso não concede novos
acessos: todo destinatário ainda exige perfil e vínculo ativos.

## Limites da coleta e dependências externas

O acesso remoto inicial de leitura foi recusado com 403. Em 21/10, o perfil
explícito corrigiu a conta administrativa; a cadeia foi aplicada e os grants
de clientes e objetos públicos foram comparados. As correções 033/034 de
service_role/defaults foram aplicadas nos dois ambientes e validadas com Auth
real, testes SQL e comparação final, documentados na continuação.
Configuração remota de Auth, OAuth e provedores continua sem homologação.
Nenhuma credencial foi copiada para documentação, testes ou CI. Fixtures,
screenshots e traces contêm dados sintéticos.

Armazenamento transitório no navegador e traces de testes precisam seguir as
políticas de privacidade da operação. Retenção, bases legais, operadores,
atendimento ao titular e recuperação de backup são decisões do controlador.
MFA/SSO, monitoração e resposta a incidentes dependem do ambiente operacional.
Ausência de falha nos casos testados não comprova ausência de vulnerabilidades.

Ver [achados](FINDINGS.md), [banco](DATABASE_AUDIT.md) e
[evidências atuais](../2026-10-21/EXECUTION.md) para o estado de cada frente.
