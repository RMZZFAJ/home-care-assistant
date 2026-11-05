# Tentativas e limites do procedimento

## B3.0–B3.2

O comando /goal já havia criado objetivo ativo; a tentativa adicional de criar
um objetivo foi recusada e não alterou o objetivo existente. Ordem mestre foi
lida em partes para recuperar trechos truncados pelo limite de saída.
Busca rg com wildcard no argumento de caminho PowerShell retornou erro123;
foi substituída por diretório mais -g. Nenhuma consulta mutável envolvida.

O comparador direto de funções encontrou 20 corpos diferentes porque não
executa os patches dinâmicos posteriores. Esses resultados foram preservados;
não são 20 defeitos/drifts confirmados. Replay no banco existente não executado.

## B3.3

Título original B33-03 descrevia todos como sem vínculo B. O administrador
fictício possui A e B, mas estava em contexto A; os outros cinco papéis
não tinham B. Relatório corrige essa distinção sem alterar o resultado real.

## B3.6

Primeira execução do arquivo b36-probe.mjs falhou ao compilar: await foi
usado dentro de callback não async. Nenhum módulo foi executado nem dado
gravado nessa tentativa. Cliente foi resolvido antes do callback e o script
passou a ser conferido com node --check antes de executar. É erro do auxiliar
de auditoria, sem evidência de defeito no produto.

## B3.8

B38-08 inicial chegou ao banco, mas o coletor tentou ler JSON de uma resposta
204 sem corpo e falhou. Os sete cenários anteriores estavam completos. Arquivo
inicial preservado; o relato novo daquela tentativa permanece no banco, sem
limpeza. Coletor passou a tratar corpo vazio como null e o cenário8 foi repetido
com relato novo, sem repetir cenários1–7. A tentativa inválida não conta como
prova de resposta, e seu read-back separado registra somente dados sintéticos.

O preparo B38-09 inicial tentou configurar versão0 num paciente novo sem linha
patient_settings. A RPC cria o default versão1 e recusou PT409 corretamente.
Não havia contagem/agenda criada. Tentativa preservada; o paciente e a conta
novos foram reutilizados, com versão inicial1 explícita, sem reset ou limpeza.

## B3.9

A fixture inicial B39-01 usou UUID minúsculo no protocolo documental de teste;
o CHECK exige letras maiúsculas. A execução abortou integralmente com 23514,
antes de chamar scheduler; nenhum dado da fixture persistiu. Resultado inicial
preservado. O gerador passou a usar upper na identificação sintética e retomou
o mesmo cenário; não foi alterada regra do produto.

## B3.10

B310-06 inicial esperava403 na leitura após revogação; a API respondeu404,
ocultando o paciente sem acesso, comportamento seguro. O teste já havia enviado
arquivo novo e revogado somente o leitor B3, mas sua coleta foi marcada inválida
por essa expectativa excessiva. Arquivo inicial preservado; retomada reativou o
leitor por convite novo autorizado e repetiu somente06 com anexo novo.403/404
passaram a ser tratados como recusas equivalentes; nenhuma regra de produto
foi relaxada. URLs assinadas/cookies não foram escritos no relatório.

## B3.11

QP-07 inicial tentou preparar1000 movimentos novos com triggers ativos dentro
de rollback. O comando ultrapassou120s; o próprio backend identificado foi
cancelado, a conexão terminou e a transação foi revertida. Não é plano concluído
nem medição de throughput. Stack da interrupção: alerta → view → autorização.
Repetição limitada100, timeout30s, confirmou zero linhas/pacientes da tentativa
e total do ledger antes/depois igual. Preservados registro inicial e resultados
do ensaio menor. Nenhum trigger foi desativado, regra relaxada ou índice criado.

## B3.12

Fixture inicial do histórico ativou claims de administrador antes de inserir
o primeiro vínculo do paciente novo. guard_membership_elevation recusou
corretamente: ainda não havia autoridade local. Toda a transação abortou antes
de gerar versões. Tentativa preservada. A preparação privilegiada nova passou
a preceder as claims; a leitura usa sessão Auth real, sem afirmar que o owner
bootstrap demonstra permissão de cliente.200 versões e depois outro cenário
independente de 1000 concluíram com triggers ativos e rollback.

O scanner encontrou um movimento sem paciente. O contraditório localizou a
fixture legada que test-migrations exige preservar. Hash privado comprova que
o registro já existia e não mudou desde o baseline B3. Não foi atribuído a
paciente por inferência, apagado ou apresentado como corrupção nova.
ready sem bytes é a fixture explicitamente privilegiada B310-09. Contagens
de anomalias isoladas não substituem avaliação do contrato e da origem.

O read-back B38-08 incompleto foi conferido em b312-recovery.json:
dois relatos sintéticos permanecem, incluindo a tentativa inicial. Os IDs/
estados não transformam a resposta204 que o coletor não leu em prova válida.

## Consolidação e verificações

Lint inicial identificou imports sem uso e referências explícitas a globals
Node nos auxiliares novos. Foram ajustados somente esses auxiliares. A barreira
também passou a propagar falha de liberação fora do finally. Nenhum teste ou
configuração do produto foi alterado. Logs anteriores foram arquivados.

Markdownlint identificou linhas/tabelas longas, espaços e títulos. Os documentos
foram reformatados sem reduzir regras. Conteúdo comparativo extenso passou a
registros empilhados; matrizes CSV mantêm a estrutura tabular. Logs de
tentativas
evidenciam essas falhas documentais e a validação posterior.

A primeira comparação do backup passou por JSON JavaScript e perdeu escala
de números de snapshots na representação textual do hash. A consulta seguinte
reconstruiu tuplas tipadas somente em SELECT, preservando o texto JSON original.
Hashes do baseline coincidiram. Os sete cabeçalhos alterados receberam um novo
req.reminder de sistema em execução do cron preexistente; apenas versão,
snapshot, hash e updated_at mudaram. REQ usa sciencePending, sem flag scheduled;
ação/ator e correlação cron provaram a origem. Resultado inicial foi preservado.
Não houve restore nem escrita de reparo.

Preflight final deixou apenas os dois links de manifesto/integridade ainda em
geração. A seleção Git, geração do manifesto e validação final fecham esses
links. Arquivo preflight não é aprovação e permanece como trilha da conferência.
