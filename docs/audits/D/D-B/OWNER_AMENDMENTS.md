# Complementos posteriores à ordem D-B

## SonarCloud — adiamento autorizado

Em06/11/2026, America/Sao_Paulo, durante a execução D-B, o responsável determinou:

> Não me importo em resolver sonar de uma vez pois ele ainda não esta configurado
> adequadamente, a correção dos erros previstps em sonar ficam para momento
> posterior a configuração dele

Configuração do SonarCloud e tratamento dos apontamentos específicos ficam
**OWNER_DEFERRED_SONAR_CONFIGURATION**. A execução dos demais requisitos D-B
prossegue. O estado observado do provedor permanece registrado, sem atribuir
aprovação a Quality Gate falho ou não configurado. As correções já implementadas
e suas evidências são preservadas. CI funcional, testes, contratos e gates D-C
mantêm os requisitos aplicáveis da ordem.

## Eficiência da execução — 07/11/2026

O responsável solicitou reduzir tempo e custo, preservando qualidade, rigor e
execução integral. A missão continua com os mesmos critérios e limites.
As próximas entregas serão agrupadas por fluxo; diagnóstico usa verificações
menores e modo local rápido do runner. Aceite usa candidato estável com build
de produção. Suítes gerais ficam na CI do SHA publicado, com repetição local
somente por falha/hipótese concreta. Evidências mantêm origem, contraprovas e
limitações; diagnóstico não recebe status de aceite. Evitar releituras amplas,
monitoramento repetitivo e atualizações manuais duplicadas da matriz.

## Reconciliação remota antecipada — fechamento de D5.1

Em07/11/2026 o responsável determinou aplicar todas as migrations pendentes
no remoto ao fechar este lote, junto ao próximo commit, para testar o preview
Vercel durante o desenvolvimento. Essa determinação antecipa o momento do lote
remoto previsto na seção XIII da ordem; preserva preflight, compatibilidade,
backup verificável e pós-validação. O alvo continua exclusivamente
qwfrqychokvhdzakibid. Não autoriza reset, fixtures remotas, merge, promoção de
produção ou ativação de transportes externos. A PR permanece Draft e o preview
continua ambiente de desenvolvimento, sem aprovação operacional.

A orientação vigente para o fechamento da etapa em andamento é reconciliar
todas as migrations pendentes no remoto ao commitar, permitindo o teste do
preview. O procedimento acima é mantido em cada fechamento correspondente;
não equivale a homologação da versão em desenvolvimento.

## Preview protegido e PWA — 08/11/2026

O responsável relatou falha real no Samsung Galaxy S24 Ultra, Chrome e PWA
instalada, persistente após reinstalação. Autorizou correção e regressões
proporcionais, commit/push na branch atual, PR7 Draft e produção preservada.
Determinou reproduzir a barreira de acesso por cookie e revisar diagnóstico de
instalação/ativação, recuperação, botão Push, relação entre worker/PWA/inscrição,
acesso autenticado ao Preview, atualização Android/Chrome e endereço estável.
Não autoriza desativar proteção, cachear dados/respostas privadas, reduzir
autorização, replay offline ou substituir a correção por aumento do timeout.
A falha física relatada não equivale à homologação física da correção pelo agente.
