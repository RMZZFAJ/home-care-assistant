# D3.52 — contexto mais rápido e regressões da agenda

A leitura my_workspace repetia verificações de autoridade por entrada do
diretório. Em Auth real,levou7700ms para3241 pacientes da conta administrativa
local e6456ms para3664 pacientes da global,próximo do timeout configurado8s.
Essas medições e as ocorrências503 anteriores são preservadas;nenhum timeout
foi ampliado nem paciente excluído para obter aprovação.

Migration196 calcula candidatos somente da autoridade de sessão e da
autoridade interna restrita ao backend/transação. Candidato não concede
permissão:can_access_recipient e patient_capabilities continuam decidindo.
O diretório completo,ordem,papéis,vínculos,campos e capacidades foram comparados
com a resposta nativa anterior e preservados. Não há cache entre chamadas,
paginação artificial,limite de pacientes ou nova autoridade no navegador.
A sessão é revalidada com relógio vivo antes de retornar.

Novas medições RPC,com3252/3675 pacientes,deram118–139ms para a conta local e
47–51ms para a global. São observações locais,uma amostra por ator antes e
três depois;não são SLA,prova física ou homologação de produção. A comparação
integral anterior/depois foi feita antes de criar novas fixtures;uma segunda
medição isolou apenas o tempo da RPC.

## Permissões e compatibilidade

Sete testes Auth distintos passaram,incluindo dois consumidores de autoridade
existentes. Cobrem lista completa,troca explícita,overrides,paciente inativo,
revogação,identidade global sem vínculo local,anon/service/sessão real expirada
e autoridade interna com ou sem seleção UI. Ponte SQL usa claims mínimos de
sessão emitida pela API Auth,role authenticated e rollback;não fabrica sessão
nem constitui evidência de provedor. Backend/transação/usuário divergentes são
recusados. Nenhum registro de teste interno permanece.

A definição my_workspace é a única alteração SQL;assinatura,configuração e
grants permanecem. Nove guardas/dependências nativos são comparados por hash.
Instalação limpa,legado e integração completa continuam gates da CI própria.

## Consumidores da agenda

A CI19a2397 aprovou banco/Ubuntu/Windows,mas revelou três falhas de consumo
nos shards2. Os testes de recuperação nativa ainda interceptavam criação de
série,que agora usa preparação privada. Eles passam a exercitar alteração
real de tipo existente,conservando pacote nativo,replay,recibo divergente,
perda de contexto,inatividade e envelope conflitante. Criações privadas seguem
com cobertura própria;nenhum teste de recuperação foi removido.

Datas escolhidas passa a observar /preparations/commit e confere a série real
pelo recibo,com todas as datas,instantes e negativas existentes. A implementação
também conserva revisão após recusa conhecida,bloqueia nova confirmação até
voltar ao preenchimento e devolve foco ao controle de revisão. Resposta incerta
continua congelada;perda de acesso e conflito CAS mantêm proteção específica.
O mês visível do calendário pertence ao estado de navegação do editor e
permanece ao voltar da revisão. O controle compartilhado conserva o uso
local anterior quando não recebe mês controlado;datas não foram alteradas
para compensar perda de navegação.

São15 identidades de navegador de produção local qualificadas:12 da primeira
coorte e três do recheck final. A primeira coorte12/15 revelou perda do mês;
a repetição0/3 passou mês/foco,mas revelou região de rolagem não alcançável
por teclado. O componente recebeu opção de região nomeada/focável,ativada
neste editor e com padrão anterior nos outros consumidores. Recheck final3/3
preserva todas as regras axe e testa PageDown real,quatro larguras e as12datas
no banco. Capturas móveis inspecionadas;nenhuma aprovação física ou humana.

Uma execução interrompida teve0casos qualificados/2skipped;outra parou no build
por JSON diagnóstico gerado inválido. Arquivo93bytes preservado antes de
regenerar somente esse artefato;nenhum banco/reset foi usado. A primeira seleção
ancorada não encontrou casos e encerrou antes do build. Contraprovas não
contam como aprovações. Fontes ficaram congeladas durante cada coorte.

Remoto195→196 reconciliado antes do commit:dez definições/config/grants iguais
ao local,nove guardas/dependências preservados,probes0 e dry-run vazio. Sem
reset,fixtures/Auth remoto ou backup pesado redundante. Advisors globais não
repetidos:nenhuma tabela,index,assinatura ou ACL nova;achados antigos não
aprovados. [Validação](WORKSPACE_CONTEXT_PERFORMANCE_VALIDATION.json).

PR7 Draft,Sonar adiado,produção NO-GO e meta ativa. Alterações/decisões privadas
restantes da agenda,contagens,cadastros e demais critérios D-B continuam.
