# Alcance e tentativas B8

## Manutenção prévia

Somente seleção local do interpretador e três linhas Markdown. Sem instalação,
alteração de imports, lógica Python ou testes de banco nessa atividade.

## Experimento de oráculos PDF

Configuração `vitest.oracles.mts` aplica mutações Vite somente em memória e
redireciona destinos de saída dos testes para `.private/b8-quality/<modo>`.
Assertions originais são preservadas. Sem rede; fetch global recusa transporte.

Com Node 24.22.0, executar Vitest com a configuração deste diretório e:

```text
HCA_B8_MUTANT=baseline
--testNamePattern
'approved document presentation|renderiza comprovante Unicode longo'
HCA_B8_MUTANT=blank-text
--testNamePattern
'approved document presentation|renderiza comprovante Unicode longo'
HCA_B8_MUTANT=wrong-title
--testNamePattern 'renders all four types'
```

Usar `--reporter=json --outputFile` com o arquivo oracle correspondente. No
PowerShell, definir a variável via `$env:HCA_B8_MUTANT`. Baseline: cinco PASS,
seis casos deliberadamente fora do filtro. Sem texto: cinco PASS, seis fora do
filtro. Título incorreto: um FAIL esperado, dez fora do filtro. Esse FAIL é
contraprova da sensibilidade do teste, não falha do produto. Inspeção
independente: `inspect-oracle-pdfs.py`, quatorze observações; sete arquivos por
modo, sem versionar as saídas temporárias.

As primeiras tentativas de trocar modo reutilizaram transforms do cache
persistente Vitest 5 e não produziram artefatos do mutante. Foram descartadas
como provas. Cache por modo, atestação de quatro/uma substituições e extração
independente tornaram verificável a aplicação efetiva. A configuração final
desabilita fsModuleCache e fixa também seu destino privado por modo. Três
entradas de cache identificadas como produzidas pela B8 foram movidas para
quarentena privada, sem remover os demais caches. Não se inferiu sobrevivência
de mutante a partir apenas de exit0 ou do relatório inicial sem artefato.

## Navegador sintético

Cinco probes importam os helpers reais e usam apenas setContent em about:blank,
com bloqueio de HTTP/HTTPS. Não há servidor, build, login, fixture ou escrita de
negócio. Não substituem o runner oficial para fluxos da aplicação. Q6 reproduz
QA-001 com scheduling controlado; não mede sua frequência na CI. Q9 demonstra
perda de needs-review em gradiente sintético; não prova defeito de contraste no
Home Care Assistant. Botão sem nome é recusado como controle.

Tentativa inicial de configuração usou import.meta em arquivo tratado como
CommonJS pelo Playwright: SyntaxError antes dos testes. Corrigido somente o
instrumento B8 para resolução por cwd. O primeiro reporter gerou caminho
relativo aninhado; resultado bruto de cinco PASS foi movido ao destino
documentado e a configuração final usa caminho absoluto. Estado auxiliar foi
movido para o diretório privado. Uma tentativa de remover diretórios vazios foi
recusada pela revisão automática; a alternativa sem exclusão foi concluída.
Nenhuma repetição funcional foi necessária por mudanças de destino documental.

## SQL e inventário

Quatro casos de verdade SQL executados em BEGIN READ ONLY, somente VALUES e
SELECT, via harness que verifica stack local. Não há fixture nem leitura de
linha de paciente. O predicado isolado admite NULL; isso não prova que toda a
suíte aceitaria qualquer mutação que remova um lançamento.

Inventário AST inicialmente não incluía reexportações. A leitura independente de
workspace.tsx:30 refutou a hipótese de AppWorkspace órfão. Coletor ajustado para
reexports/imports dinâmicos; candidato classificado KEEP. Tipos com mesmo nome
não demonstram consumo de types/operations.ts.

Busca de manutenção inventariou 230 scripts por padrões, sem executá-los; esses
sinais não equivalem a 230 revisões completas nem a 230 defeitos. Referências
externas, bookmarks e URLs de assets não foram censados.

## Limites de homologação

A primeira conferência comparou requirements-audit.txt também à base funcional
37cb7f8, onde essa ferramenta Python ainda não existia. A diferença é anterior
ao baseline B8 e seu hash permaneceu preservado desde294382b. O relatório final
separa essa adição histórica de tooling do diff funcional vazio; nenhuma
dependência foi alterada pela B8. Preservação dos dados nesta fase é sustentada
pela ausência de mutações e pelo escopo readonly, sem alegar comparação de
hashes de todas as linhas de banco. A âncora SQL foi corrigida de 46 para50, sem
repetir a consulta ou alterar seus resultados.

Sem leitor de tela humano, aparelho físico, impressora, rede móvel real,
restore, carga remota, benchmark novo, replay, suíte completa ou novo CI.
Resultados históricos são reutilizados por identidade de código e referências
precisas. Não há certificação WCAG, LGPD ou de segurança assistencial completa.
P1s anteriores e NO-GO permanecem; fases C/D não iniciadas.
