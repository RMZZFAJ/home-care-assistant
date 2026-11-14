# Acompanhamento inicial dos avisos

C-AC-023: a janela de acompanhamento usa shareWaitSeconds do paciente do
documento autorizado, no intervalo0–10 segundos. Ausência/null usa o padrão10;
valor inválido não é convertido em resultado concluído. Zero permite uma
consulta inicial de estado/política e desativa o polling subsequente.

O endpoint de avisos conserva data e acrescenta waitSeconds. A leitura da
política exige o mesmo acesso vigente ao documento, antes/depois da consulta,
sem retornar configurações ou dados de outro paciente. Não há grant para
anon ou serviço. A API continua no-store e não muda o contrato dos avisos.

## Prazo e resultados

O prazo é absoluto desde o início da observação; uma primeira resposta tardia
não reinicia a janela. Pendente/processing/uncertain são acompanhados sem
afirmar entrega. Ao consultar resultado terminal, a janela encerra polling e
deadline. Um timeout posterior não regride esse resultado para pendente.

Resposta inválida ou falha de consulta informa indisponibilidade. Fim da janela
informa somente fim do acompanhamento inicial e orienta consultar os estados.
Nenhum desses resultados confirma recebimento, ciência ou execução operacional.

O controlador possui apenas seu AbortController de leitura. Sair da tela ou
esgotar a janela cancela essa leitura; não há referência a upload, gravação ou
emissão PDF. Resposta tardia que ignora abort é descartada. O processamento
operacional e o arquivo podem terminar depois, pelos consumidores existentes.

## Provas dirigidas

- 15 unitários:0/5/10, terminal precoce, pendência além do prazo, resposta
  inicial tardia, resposta após encerramento, falha/inválidos e desmontagem.
- Dois testes HTTP com Auth real: política/default/minimização, valores
  inválidos, contexto, revogação e negativas de global/anon/serviço.
- 15 casos em build de produção nos três projetos: nove novos e seis dos
  consumidores PDF existentes. O PDF lento ficou confirmado e seus bytes foram
  confrontados com o hash, mesmo após terminar a janela5. Resultado terminal
  antes do prazo10 permaneceu terminal. Política0 não retomou polling.
- Diagnóstico3/3 separado; não é aceite de build. A primeira rodada falhou por
  um oráculo de fixture usar document_id inexistente em stock_movements; foi
  corrigido para o vínculo do paciente, conservando a comparação integral.
- Preflight revertido, aplicação local sem reset, tipos/lint afetados e
  restauração/upgrade de cópia fresca passaram. Gates de CI e humano/AT mantidos.

## Banco e limites

20261108002700 acrescenta somente document_notice_tracking_policy(uuid).
Os398 contratos de função anteriores e seus grants permanecem preservados;
nenhum corpo operacional foi alterado. A política usa o identificador do
documento e sua autorização no banco, sem confiar em papel/flag do navegador.

O fechamento remoto e seus limites são registrados em
[preflight](NOTICE_TRACKING_REMOTE_PREFLIGHT.json),
[pós-check](NOTICE_TRACKING_REMOTE_MIGRATIONS.json) e
[evidência](NOTICE_TRACKING_EVIDENCE.json). A CI precisa validar o SHA publicado;
o verde de1e11536, quando observado, não aprova este incremento. Não houve
promoção, reset, fixture/Auth remoto ou ativação de transporte externo.

Recuperação/abandono de anexos e preservação de anotações PDF são critérios
próprios; esta alteração não os declara concluídos. A
[preparação do piloto](PILOT_AND_CONTINGENCY.md) também mantém os gates humanos.
