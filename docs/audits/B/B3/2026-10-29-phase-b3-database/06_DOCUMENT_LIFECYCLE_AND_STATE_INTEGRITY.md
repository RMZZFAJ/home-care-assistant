# Documentos e ciclo de vida

## Estados efetivos e transições

REQ é emitida submitted e seu atendimento é derivado de aceites ENT ligados
às linhas. Ciência, atendimento, divergência operacional e arquivamento são
dimensões independentes. COM passa por aprovação, aquisição, relato de chegada
e validação; ENT por expedição, aceite, divergência/conciliação e eventual
consentimento de cancelamento. BAL separa draft, submitted, aprovação aplicada
e reconto versionado. Não existe uma única máquina de estado genérica que
possa apagar essas diferenças sem alterar o produto.

Nove cenários B36 novos complementam os B35. Falha de estoque na última linha
de ENT desfez documento, movimento anterior e avanço da série documental na
mesma transação. A sequence de revisões de movimentos pode apresentar gaps
após rollback, comportamento que não indica movimento perdido.

REQ emitida não estava concluída. Expedir ENT registrou ciência por origem
dispatch quando autorizada, mas não conclusão. O aceite positivo concluiu a
necessidade. Arquivo manual foi possível; pedir cancelamento da ENT reabriu
a REQ e retirou o arquivo corrente, preservando previousArchivedAt/reason no
evento req.reopened. Consentir devolução física integral cancelou a ENT sem
consumo inventado. A linha original/aceite histórico não foram apagados.

## Hashes, versões e origem

record_document_event monta conteúdo canônico e o trigger science_snapshot
acrescenta identidade, autoridade, ciência e história antes de recalcular hash.
Olhar somente o hash anterior ao INSERT produziria conclusão incorreta.
Consulta independente comprovou zero divergências entre corpo e SHA-256 e
entre previousHash e evento anterior na cadeia exercitada. Hash v1 permaneceu
idêntico após conclusão, arquivo, reabertura e cancelamento. Verificador
aceitou o hash histórico correto e recusou outro hash.

Eventos e renders são imutáveis para clientes e possuem unicidade por versão.
O banco emite código/protocolo por paciente/tipo; draft não consome número de
emissão. Quantidade observada REQ permanece snapshot, não ordem de compra.
Origem de recebimento é authored no servidor como authenticated_session;
parâmetro do cliente não transforma esse nível em telefone verificado.
Hash não é assinatura assimétrica nem proteção contra administrador do banco.

## Falhas revalidadas e lacunas

B36-05 reproduz DB-001/B2-004 com cadeia física coerente: receber 2, confirmar
consumo 1, pedir cancelamento e consentir retorno 1/consumo 1 gera SQLSTATE
42702. O record local e e a alias e do SELECT de document_events tornam e.body
ambíguo. Versão, eventos e ledger permaneceram iguais depois da falha. O
cancelamento fica pendente; não houve corrupção ou bypass demonstrado.

Não se removeu o erro para testar o ramo posterior. Elegibilidade temporal e
reutilização de consumo entre conciliações continuam sem prova dinâmica atrás
dele. A consulta conta consumo desde emissão da ENT e desconta cancelamentos
anteriores por produto; a política de elegibilidade precisa de decisão e prova
antes de liberar esse ramo. Não criar consumo para satisfazer a transição.

B36-07 revalida B2-001: COM 10, adquirida/recebida2, conserva remanescente8 e
recusa cancelamento total. O guard preserva fatos físicos corretos, mas não
modela desistência do não adquirido. A transição futura deve tratar somente o
remanescente, sem apagar recebimento, saldo ou atendimento independente.

B2-002/003/015 permanecem dependências: desacordo ao cancelamento, fila de
consentimento e sucessão de destinatário após aceite parcial. Sem nova
reprodução específica aqui, não são novas descobertas B3. B3.12 combina
revogação e responsabilidades para ampliar o contraditório.

## Proteções negativas

Documento cancelado não recebeu novo aceite; versão antiga foi recusada;
emitido não aceitou revisão de draft; REQ cancelada não recebeu link novo;
UUID de A não foi lido por usuário só de B. Falhas preservaram estado anterior.
Triggers fecham links também ao emitir um draft previamente ligado a REQ
encerrada. Isso não equivale a testar todos os estados concorrentes.

A matriz de transições distingue permitido/proibido/condicional e indica
autoridade, persistência, evento, efeitos quantitativos, repetição e
recuperação.
Cenários de concorrência seguem B3.8. PDFs e bytes Storage seguem B3.10.
Nenhuma transição corretiva, migration ou novo teste funcional foi implementado.
