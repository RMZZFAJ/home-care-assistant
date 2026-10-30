# Identidade, sessão, contexto e capacidades HTTP

## Cadeia de autoridade observada

`authenticatedIdentity` valida `auth.getUser`. `authenticate` acrescenta perfil
ativo, `my_session_valid` e administração global efetiva. `patientContext`
consulta paciente autorizado, vínculo ativo, contexto selecionado e capacidades
calculadas no banco. O alias `manage` significa `access.manage`, não poder
global. `is_global_administrator` exige identidade, assurance e modo global
da sessão; ser administrador global atuando localmente não mistura esses modos.

`authenticatedIdentity` tem uso legítimo no bootstrap de contexto e aceite de
convite. As RPCs `my_workspace`, `select_active_context` e `accept_invitation`
impõem seus próprios requisitos. Exigir um vínculo pronto antes do aceite
criaria uma dependência circular. Não foi identificada razão para substituição
mecânica por `authenticate`.

APIs por objeto usam a RPC para resolver paciente e permissão. Leitura por
tabela preserva RLS; privação de linha pode resultar em 404. Não é evidência
de desaparecimento definitivo nem deve revelar se há um objeto de outro
paciente.
A [matriz HTTP](02_AUTHORIZATION_HTTP_MATRIX.csv) discrimina guardas e limites
por método, sem atribuir teste dinâmico aos ramos apenas lidos.

## Provas B4 executadas

[Quinze cenários HTTP/Auth reais](evidence/b42-auth-results.json): oito rotas
privadas negaram ausência de sessão com 401/SESSION_EXPIRED, correlação e
`no-store`; vínculo profissional selecionado leu o catálogo; trocar só o ID
do paciente na URL foi recusado; selecionar explicitamente o segundo vínculo
real permitiu a leitura; profissional não listou perfis globais; UUID aleatório
não criou contexto; identidade sem vínculo não leu o paciente; replay de cookie
de sessão encerrada recebeu 401, após leitura legítima 200 na contraprova.

As contas, dois pacientes e produtos são novos e fictícios. Backup e guard
precederam o provisionamento. Não se usaram pacientes reais nem sessões
fabricadas em SQL. Nenhum envio externo foi habilitado.

## Fronteiras herdadas, sem extrapolação

B3-021 demonstrou escrita pessoal direta e avatar com JWT ainda válido após
encerrar sessão. A B4 confirmou que a **API** recusa a sessão; não repetiu a
escrita direta nem chamou essa proteção HTTP de correção do bypass inferior.
Referência: [achados B3](../2026-10-29-phase-b3-database/14_FINDINGS_MASTER.md).

B3-020 demonstrou movimentação já esperando lock que concluiu após revogação
ou troca de contexto; nova intenção foi negada. A autenticação HTTP ocorre
antes da RPC e não cancela transação que já começou. Essa prova não autoriza
afirmar a mesma janela em toda rota. BAL já revalida após o lock de estoque;
documentos, anexos e serviços terão seus próprios pontos de verificação.

AAL2 e proteção de último administrador permanecem sustentados pelos cenários
Auth/TOTP/concorrência anteriores e definições idênticas, não por mocks ou por
uma nova execução B4. Não houve inclusão/remoção de fator nesta etapa.

## Divergência de contrato a confirmar

POST `/catalog` verifica `access.manage`, enquanto `/admin` ação product e
`/catalog/presentations` verificam `catalog.manage`. O primeiro pode recusar
um delegado de catálogo legítimo mesmo que a RPC permita; isso não demonstra
escalada. O fluxo ativo escreve por `/admin`. A B4.8 examinará o comportamento
HTTP dirigido, preservando administração local/global e capacidades distintas.

## Limites e encerramento

Sem bypass HTTP novo demonstrado nesta etapa. Nenhuma certificação de todas
as combinações de override, MFA, cookie, proxy ou produção. O paciente errado
foi testado com pessoa compartilhada entre dois vínculos e uma pessoa sem
vínculo; isso não substitui todas as negações de objetos. Próximo: preservar
valor original, validar e comparar os argumentos enviados às RPCs.
