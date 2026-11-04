# Concorrência e recuperação

## Método que força sobreposição

12 cenários B38, com HTTPs independentes e uma conexão PostgreSQL mantendo o
lock stock do paciente. O coletor só libera a barreira após observar os
waiters em pg_locks. Isso evita chamar de concorrência duas promessas que a
biblioteca serializou. Requests, waiters, respostas e read-back persistido
ficam nos JSONs. Barreira não muda função/schema nem configura timeout global.

## Garantias exercitadas

Duas saídas de 2 contra saldo2 produziram um movimento e uma recusa, saldo0.
Mesma chave simultânea retornou o mesmo ID e criou um movimento. Conteúdo
distinto com a chave anterior gerou23505, sem nova escrita. Duas aprovações
COM da mesma versão geraram uma versão/evento novos e conflito para a segunda.
Cancelar e aceitar ENT simultaneamente também aplicaram uma única versão e
conservaram custódias. O estado final seguiu a ordem vencedora, sem estorno
inventado ou aceite posterior a cancelamento.

Aceites ENT com mesma chave simultânea e repetição após resposta ignorada
não duplicaram crédito/evento. A recuperação consultou o fato confirmado.
Não foi injetada perda física de conexão; a resposta foi deliberadamente
ignorada para testar resultado desconhecido do ponto de vista do cliente.

BAL agendado foi exercitado em criação, revisão de draft e submissão. Duas
requisições alcançaram o lock em cada operação, retornaram mesmo documento/
versão, e a recuperação continuou válida depois de fechar a atribuição.
O lock antes da consulta idempotente e a revalidação posterior preservam a
garantia corrigida pelas migrations anteriores; não devem ser removidos.

Revogações simultâneas dos dois administradores locais sintéticos deixaram
um administrador ativo e recusaram a segunda remoção. O titular remanescente
restaurou os dois vínculos B3 por RPC autorizada. Nenhuma conta global ou
preexistente foi alterada. A prova global histórica não virou novo teste B3.

## Janela nova: autorização antes da espera

B38-06 manteve uma transação de revogação ainda não confirmada segurando
stock. Um movimento familiar de administrador sintético leu o vínculo ainda
ativo e aguardou esse lock. A revogação confirmou primeiro. O movimento então
recebeu200 e gravou uma entrada, embora o vínculo já estivesse revoked.
Uma chamada nova do mesmo token retornou 42501 corretamente.

family_stock_movement exige capacidade antes de esperar, sem repeti-la depois.
O INSERT privilegiado/trigger de saldo não revalida membership. O problema
é essa janela em comando iniciado antes da revogação, não acesso livre de
usuário desligado nem isolamento cruzado. A sequência é comprovada pela
barreira e pela ordem do commit, não pela comparação de created_at, que usa
o início da transação. Não se generalizou para todos os comandos.

A política temporal de revogação precisa ficar explícita na Fase C. Se o
contrato é recusar gravações que aguardam uma revogação anterior no mesmo
lock, revalidar após a espera é necessário, como já ocorre no BAL e archive.
Preservar movimentos anteriores autorizados; não apagá-los como correção.

## Intenção oposta e modalidade de recuperação

B38-08 executou confirmar/rejeitar o mesmo relato sob barreira. As duas
chamadas responderam204 e uma única decisão ficou confirmada. É manifestação
concorrente de B2-011, sem segundo débito: a resposta não distingue intenção
oposta da repetição da mesma decisão. Estado terminal deve ser recuperável,
mas a decisão contrária precisa de conflito/resultado inequívoco.

B38-07 mostrou que criar com a mesma chave/payload e p_draft diferente
recupera o draft existente. O resultado informa draft explicitamente, sem
emissão ou débito. Tratar como detalhe do contrato de tentativa, não como
duplicação ou emissão falsa comprovada. Nova intenção exige chave/ação própria.

## Ordem de locks e limites

Estoque/documentos usam stock por paciente antes de linhas/documento; criação
acrescenta lock document por ator/chave; REQ usa requisition-patient; agenda
usa schedule por paciente e schedule-worker em ordem determinística; BAL usa
stock → bal em contagem/reconto. Cursor BAL e scheduler global serializam
lotes. Governança/vínculos revalidam em helpers internos após serialização.
Anexo/PDF e convites têm locks próprios e seguem nos domínios correspondentes.

claim_notification_jobs possui até três tentativas somente para deadlock
de um lote de banco abortado; não repete envio ao provedor dentro da transação.
Não foi provocado deadlock real do worker nesta etapa. Ausência de deadlock
nos cenários não prova ausência em todo grafo de triggers/invalidadores.
Contenção de todos os produtos de um paciente no mesmo lock é custo potencial,
não defeito sem medição. Jobs, leases e anexos seguem B3.9/B3.10.

Falhas do coletor204 e versão inicial de paciente novo estão preservadas em
ATTEMPTS e arquivos iniciais; não contam como testes aprovados. Não houve
reset, alteração funcional, remoção de teste ou operação remota.
