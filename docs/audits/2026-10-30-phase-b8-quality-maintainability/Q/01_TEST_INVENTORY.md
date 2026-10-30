# Q1 — Verificações efetivamente existentes

## Inventário e contagem

O [inventário AST](../evidence/inventory.json) contém 41 módulos de testes e
suporte: 17 arquivos Vitest, 11 specs Playwright e quatro helpers de navegador,
sete arquivos de integração e dois helpers de fixtures. Há 82 declarações
Vitest, 31 de integração e 36 de navegador. Declarações parametrizadas e loops
geram mais casos: esses números não são resultados de execução.

A [descoberta Playwright](../evidence/browser-discovery.json) lista 120 casos,
40 por projeto, em 11 specs. A listagem não iniciou servidor/globalSetup ou
testes. Chromium desktop, Pixel 7 em Chromium e iPhone 13 em WebKit são projetos
emulados; não equivalem a três aparelhos homologados.

Há 16 arquivos SQL. Quatorze integram a lista operacional de
`scripts/test-migrations.mjs`; `assume-context.sql` é helper e
`migration-search-path.sql` possui finalidade própria. A ausência de BEGIN ou
ROLLBACK em supply-workflows não demonstra escrita permanente: o runner envolve
esse arquivo em transação revertida. Não executamos essas suítes.

## Responsabilidade de cada gate

- **Vitest:** ambiente Node, include `tests/**/*.test.ts`. Validação, origem,
  retorno seguro, erros, quantidades, datas, catálogo, transporte falso e PDF.
  Não há suíte isolada de montagem React com DOM/Testing Library. Isso não
  elimina a cobertura de componentes exercitados pelas jornadas de navegador.
- **Contratos:** 84 hashes normalizados de migrations e procura do campo
  removido de quantidade REQ. Protege imutabilidade e um contrato textual; não
  comprova atomicidade, precisão, autorização ou completude das jornadas.
- **SQL:** RLS/grants, invariantes, ciência, custódias, conflitos, outbox,
  scheduler e contexto. Usa sessões previamente emitidas pelo Auth; a ponte SQL
  não equivale a um token HTTP completo. Predicados também são oráculos e
  precisam rejeitar NULL quando contradiz crédito positivo, conforme B8-Q002.
- **Integração:** Auth oficial, Data API e RPCs reais, MFA, revogação, Realtime,
  administradores e concorrência. `test-concurrency=1` preserva fixtures
  compartilhadas. Não inclui o servidor Next em toda chamada RPC.
- **Playwright:** UI, handlers Next e persistência real local, com preparação
  SQL identificada. Algumas falhas de rede são induzidas após `route.fetch`,
  proporcionando prova forte da mesma intenção após persistência.
- **Axe/teclado:** tags WCAG 2 A/AA, 2.1 AA e 2.2 AA, entrada por teclado, salto
  ao main, largura e estados percorridos. Sem certificação completa;
  needs-review não é retido no helper CI, conforme B8-Q003.
- **Visual/PDF:** screenshots são salvas, mas não há comparação automática
  `toHaveScreenshot` contra baseline aprovado. Os testes PDF atuais não extraem
  conteúdo nem exigem estrutura acessível. B1/B6 têm inspeções documentais
  adicionais, separadas do gate contínuo.
- **Instalação/evolução:** replay limpo e legado 019→84 com consentimento,
  backup verificado e stack efêmera CI. Não é ensaio de restore completo nem
  motivo para recriar o desenvolvimento durante esta auditoria.

## Resultados reutilizados e resultado B8

A Fase A registrou 98/98 unitários e 33/33 integrações. E2E local foi 119/120,
com repetição dirigida 2/3; não foi aprovação integral. A CI do código funcional
37cb7f8 passou; a CI 40656069166 do SHA documental 34dcb83 falhou no helper
Chromium. [Reconsulta](../evidence/ci-recheck.json) confirma os mesmos
metadados, sem disparar outra CI. Provas e limites originais estão nas
[referências anteriores](../evidence/PRIOR_REFERENCES.json).

O código funcional, suíte e scripts permanecem idênticos à base funcional. A B8
executou somente cinco casos PDF selecionados em dois modos e um caso de
contraprova, cinco probes de navegador sintético e quatro casos SQL readonly.
São 20 observações dirigidas, incluindo um FAIL esperado do mutante de título,
não uma nova suíte global verde. Filtros e tentativas descartadas estão em
[limitações](../evidence/LIMITATIONS_AND_ATTEMPTS.md).

## CI e alcance das afirmações

Windows/Linux validam contratos, lint, Markdown, tipos, unitários e build. Banco
é pré-requisito dos três jobs de navegador, cada qual com stack própria. O
agregado exige banco e browsers, sem incluir o job validate em seu needs. Esse
desenho e a falta de vínculo obrigatório com deploy já são B7-001; não se contam
novamente como descoberta B8.

Não há gate de cobertura comportamental por achado, orçamento de p95, comparação
visual aprovada ou homologação física/humana. Adicionar percentual genérico de
linhas cobertas não resolveria os oráculos demonstrados. Para D, preservar os
checks existentes e acrescentar casos que discriminem o defeito da correção em
seu contrato efetivo.
