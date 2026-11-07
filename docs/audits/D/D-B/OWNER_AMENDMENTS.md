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
