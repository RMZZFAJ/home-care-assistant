# Q6 — Flakiness, isolamento e confiabilidade do harness

## QA-001: causa sustentada e reprodução independente

O helper de navegação lê nav.isVisible e trigger.isVisible imediatamente. Quando
ambos ainda estão indisponíveis durante preparação desktop, escolhe o menu móvel
“Navegação do plantão / Mais”. A espera posterior desse locator não reavalia a
variante. A [API
Playwright](https://playwright.dev/docs/api/class-locator#locator-is-visible)
explica que isVisible não aguarda visibilidade; aumentar o timeout da ação
errada não corrige essa decisão.

Três [casos sintéticos](../evidence/browser-observations.json) importam o helper
real. Q6-01: desktop estável passa. Q6-02: trigger inicialmente oculto torna-se
visível após 80 ms; helper expira no locator móvel ausente em 600 ms. Q6-03: a
mesma estrutura passa com readiness prévia. O timeout curto é do probe isolado,
sem alteração no projeto ou tentativa de obter suíte verde.

Isso aprofunda QA-001/B1-QA-001; não cria outra causa. O caso “dez linhas” da CI
40656069166 já falhou nesse caminho, inclusive no retry. Os demais projetos
passaram; o agregado continuou falhando. Não houve remoção de teste ou mudança
de assert. Não foi estimada frequência nem descartada qualquer outra corrida.

Futura correção deve aguardar shell/contexto e variante efetivos, cobrindo
desktop aberto/fechado, gestão móvel e operação móvel. Depois, executar o caso
afetado pelo runner local autorizado e CI dos três projetos. Repetição serve
para medir estabilidade após a correção, não para selecionar uma passagem.

## Fixtures, estado e ordem

- Playwright usa um worker, fullyParallel false, contexto de navegador por teste
  e novo servidor, sem reuseExistingServer. Supabase é compartilhado apenas
  dentro do runner local/job conhecido; cada job CI tem stack própria.
- Integrações Node usam concorrência1. Helpers guardam sessões por ator e mudam
  contexto explicitamente. Alguns cenários alteram permissões, MFA ou sessões de
  identidades comuns; a sequência e o estado são pré-condições.
- Há identidades/entidades UUID novas por cenário e protocolos físicos alocados
  a partir do próximo disponível. História confirmada não é apagada para
  “limpar” a suíte. Isso aumenta a necessidade de predicados da fixture.
- Claims de fila percorrem lotes até achar o job do teste, podendo reservar
  outros jobs locais preexistentes. Não se trata de suíte readonly nem de
  ambiente seguro para rodar sem consentimento sobre dados a preservar.
- Relógio real, virada de dia, cron concorrente e sessão compartilhada são
  riscos de ambiente a controlar em casos futuros. Não foram confirmados como
  causas adicionais do timeout observado.

Uma fixture criada por SQL não prova o fluxo de criação pelo usuário. Mocks de
provider não tornam inexistente o atraso real. Promise.all no mesmo SDK não
substitui a barreira HTTP independente do teste BAL. Esses limites precisam
permanecer visíveis nos resultados.

## Ambiente e artefatos

O runner deriva credenciais da stack local verificada, troca configurações
herdadas, fixa origem/portas e desliga transporte externo. Traces ficam off para
evitar captura de credenciais. Falha de navegador preserva screenshot e
relatório HTML; CI retém o report por sete dias. Artefato temporário não é
arquivo histórico permanente e sua ausência futura não torna uma prova verde.

O primeiro ensaio de oráculos B8 mostrou outra armadilha do instrumento: cache
persistente reaproveitou transforms ao trocar variável de modo. Foram exigidas
atestações da mutação e inspeção de saída antes de considerar o resultado. A
configuração final isola os caches e desliga esse reaproveitamento. Essa
ocorrência não foi atribuída ao produto ou à suíte normal.

## Falsos positivos e negativos

Falso negativo confirmado: helper espera menu móvel inexistente enquanto o
desktop está pronto. Falso conforto demonstrado: PDF sem texto passa e axe sem
violations pode conter needs-review. Uma screenshot nomeada “revisão” pode
mostrar etapa anterior, conforme UX-011. Setup com dados reais fictícios não
homologa aparelho, rede, provedor ou aceite humano.

Não existe evidência que justifique desabilitar retries, aumentar timeouts
globalmente, excluir cenários ou recriar a stack. A correção deve responder à
condição concreta, manter os oráculos do domínio e verificar as dependências
afetadas. O restante permanece como condição de isolamento e homologação.
