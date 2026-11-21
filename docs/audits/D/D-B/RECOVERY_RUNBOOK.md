# GUI-04 — roteiro técnico de recuperação

Base76fabb6. Administração global → Monitoramento e suporte agora reúne o
procedimento de recuperação e os registros técnicos do ambiente selecionado.
Este incremento implementa a consulta inicial de GUI-04; não libera restore
operacional, não designa pessoas e não encerra a revisão das66 composições.
[Provas](RECOVERY_RUNBOOK_EVIDENCE.json), [remoto](RECOVERY_RUNBOOK_REMOTE_OBSERVATION.json)
e [CI anterior](CI_76FABB6_OBSERVATION.json).

## Comportamento implementado

O roteiro ordena impacto e responsável, cópia/ensaio, isolamento, reconciliação
e gate de retomada. Identificador, hash do manifesto, contagens, resultado,
data e correlação vêm da consulta técnica autorizada. Não expõe arquivos,
caminhos, chaves ou conteúdo clínico. Sem inventário completo, responsável
designado ou evidência de quarentena operacional, a interface informa os limites.

A compatibilidade exige os últimos registros dos componentes de cópia e
recuperação no recorte: sucesso, mesmo identificador/hash/contagens positivas
e ensaio posterior à cópia. Registro mais novo de falha ou retenção impede
emprestar sucesso antigo. Observação de componente mais recente que o evento
disponível também impede confirmação. Compatibilidade de registros não prova
os arquivos nem autoriza restauração; o operador precisa conferi-los.

Cliente recusa envelope de outro ambiente. Em consulta pendente,503, resposta
inválida ou autorização recusada, o roteiro não mostra fatos anteriores como
atuais. O painel pode conservar sua referência anterior de consulta, explicitada
como tal; as ações dependentes permanecem bloqueadas. Atualizar usa somente GET,
mantém foco e impede consulta repetida durante a espera. Não há inputs ou botão
genérico para restaurar, reativar jobs ou reenviar mensagens.

## Validação proporcional

- 18 testes unitários: contratos existentes e vínculo seguro de cópia/ensaio,
  incluindo falha posterior, cópia diferente, evidência incompleta e recorte antigo.
- Três cenários Chromium: roteiro com eventos controlados persistidos por RPC
  local, erro/ambiente/foco, mesma alteração incerta, histórico e recusa local403.
- Cinco larguras do roteiro:320,390,768,1024,1440; geometria e Axe sem violações.
- Relação REQ→ENT passou no Chromium e iOS; primeiro aguarda a gravação legítima
  da abertura da REQ, depois exige zero gravações na consulta relacionada e
  compara também seu histórico de aberturas. Estado físico e negativas mantidos.
- Tipos e lint dirigidos. Nenhuma mudança de SQL, autorização ou transportes.

A primeira execução GUI-04 falhou na asserção de foco: disabled nativo removia
o foco durante GET. Corrigido com aria-disabled e guarda de clique, conforme
outras consultas existentes. Contraprova e hashes preservados. Uma execução
posterior foi interrompida sem resultado terminal; não foi contada como PASS.
A repetição completa terminou3/3. O ajuste da fronteira REQ→ENT responde à CI
anterior, que falhou no iOS nas duas tentativas; não exclui a rota do contador.

## Evidência reutilizada e gates

As dez fontes completas e o corpo/setup da prova de leitura do guia em
[D3.19](DAILY_READ_RECOVERY_EVIDENCE.json) foram qualificados por hash.
GUI-04 fecha a lacuna de leitura de C-FINAL-AC-023, com PASS local composto;
isso não constitui aceite humano ou aprovação universal de todos os estados.
Os scripts/SQL de backup, probe e telemetria pertinentes permanecem idênticos
às provas anteriores, com qualificação discriminada no recibo. Os eventos novos
são controlados: não representam nova cópia nem restauração real.

Supabase local/remoto164, última20261109024515 e digest ordenado coincidentes;
nenhuma migration nova/pendente para aplicar antes do commit. Sem reset remoto,
fixtures remotas ou backup redundante. PR7 permanece Draft. A CI anterior teve
Windows/Ubuntu/banco e três grupos de browsers aprovados, mas iOS-2 falhou;
não é aprovação global nem do novo SHA. Preview anterior observado READY.

Continuam pendentes: reconciliação das66 composições/171 relações, comparação
dos cinco viewports, designação e exercício humano de titular/substituto,
aparelhos/AT, destino externo e custódia de chaves, quarentena/restore operacional,
RPO/RTO e aceite D-C/D6. Canais externos sem ativação; Sonar adiado pelo responsável.
Matriz56 PASS/48 PARTIAL/1 NOT_STARTED; missão permanece ativa e produção NO-GO.
