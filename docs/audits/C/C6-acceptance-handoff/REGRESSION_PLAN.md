# Plano de regressão por causa

A [matriz única](ACCEPTANCE_CRITERIA_MASTER.csv) contém critérios, positivos,
negativos, checks existentes, lacuna, camadas, decisão e lote das 121 causas.
Ela é também o plano de regressão; não há segunda cópia dos mesmos registros.
Os 28 grupos de requisito aprovado têm critérios próprios na mesma matriz;
podem compartilhar ensaios discriminantes com causas, sem execução duplicada
por nomenclatura. Status de toda execução funcional: `PLANNED_NOT_EXECUTED_C`.

Antes de cada lote D autorizado, reproduzir o comportamento correto esperado
com teste que falhe no defeito atual. Não converter um probe que observa falha
em teste que aceita essa falha. Confirmar o discriminante negativo: PDF sem
texto deve reprovar; saldo positivo ausente/NULL deve reprovar; violations axe
reprovam e incomplete gera revisão rastreável; helper cobre shell tardio.

Verificações dirigidas por alteração. Nos marcos de schema/autorização,
executar
cadeia limpa/legada, SQL, integração Auth real e concorrência independente com
guardas locais e consentimento/backup para recriar dados. No marco de release,
executar gates completos do mesmo SHA. Mudança exclusivamente editorial recebe
somente verificação documental. Não repetir suítes apenas porque a fase mudou.

No erro, comparar ausência de efeitos; no sucesso, conferir read-back, ator,
paciente, versão, evento, ledger e bytes pertinentes. Uma asserção da própria
resposta HTTP é insuficiente para movimento físico ou persistência. Casos
humanos, AT, impressão, aparelho, restore e provedor têm aceite independente.
