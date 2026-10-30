# Registro mestre B8

Nove registros: três causas/lacunas de qualidade novas e seis revalidações ou
aprofundamentos explicitamente ligados aos IDs anteriores. Seis P2 e três P3;
nenhum P0/P1 novo. P1s anteriores e NO-GO preservados.

A contagem de registros não é soma de causas independentes das auditorias. O CSV
contém todos os campos. Não há autorização de correção nesta fase.

## B8-Q001

**Título:** Oráculos PDF atuais admitem perda integral do texto desenhado

**Eixo:** Q3/Q5

**Prioridade:** P2

**Origem:** NEW_B8

**Natureza:** LACUNA_CONFIRMADA_DE_ORACULO

**IDs anteriores:** B1-DOC-001; B6-002; B6-004; B6-005; B6-006; B6-007; B6-013

**Observado:** Cinco casos existentes passaram no baseline e com quatro chamadas
drawText substituídas em memória por texto vazio. Sete PDFs do mutante conservam
duas páginas e metadata, mas a extração PyMuPDF encontra zero caracteres;
baseline tem 1903–2326 caracteres por arquivo.

**Causa:** Assertions conferem páginas, título, largura, determinismo e
distinção de hashes, sem exigir fatos/atores/estado/conteúdo visível. A
estrutura e o QR podem sobreviver sem a informação impressa.

**Evidência:** evidence/oracle-baseline.json; evidence/oracle-blank-text.json;
evidence/mutation-blank-text.json; evidence/pdf-oracle-observations.json

**Fonte:** tests/document-pdf.test.ts:12; tests/document-pdf.test.ts:55;
tests/operational-contracts.test.ts:223; src/lib/server/operational-pdf.ts:147

**Método:** Mutação Vite em memória + testes originais com destinos privados
redirecionados + extração independente dos arquivos sintéticos.

**Contraprova:** Mutante que só troca o título é reprovado pelo caso original
selecionado; confirma sensibilidade real e atestação da transformação. Nenhum
arquivo src foi editado.

**Limites:** Não significa que os PDFs atuais estejam vazios, nem que nenhum
outro teste detecte qualquer erro PDF. Os seis casos fora do filtro não foram
executados. Fidelidade real B6 é prova separada.

**Consequência:** Uma correção futura pode remover informação material do
comprovante sem reprovar esses gates; mais páginas ou hash diferente não bastam
como aceitação.

**Aceitação futura:** Após decisão de conteúdo, teste deve reprovar PDF sem
texto/fato crítico; conferir identidade/versão, produto/quantidade/estado/atores
esperados e layout legível, com contraprovas por tipo/estado. Preservar fonte e
hash canônico.

**Regressão futura:** Teste de conteúdo por extração e proveniência, geometria
para linha longa e revisão visual humana das amostras críticas; mutação em
memória pode verificar sensibilidade, sem impor percentual geral de mutation
score.

**Decisão:** Responsável aprova fatos indispensáveis e alternativa acessível; D
implementa oráculos junto das correções B6.

**Humano/dispositivo:** Revisão visual/humana e impressão real pendentes

**Homologação remota:** Não para o oráculo local; transporte/armazenamento
remoto têm gate próprio

## B8-Q002

**Título:** Predicados SQL de saldo positivo deixam NULL passar sem reprovação

**Eixo:** Q3/Q4

**Prioridade:** P2

**Origem:** NEW_B8

**Natureza:** LACUNA_CONFIRMADA_DE_ASSERTION_SQL

**IDs anteriores:** B3-005; B3-018; B4-001

**Observado:** O guard de aceite parcial usa status<>disputed OR fullyChecked<>0
OR balance<>3 dentro de IF. Com status e contador corretos e balance NULL, a
condição é NULL e IF não rejeita. Quatro casos READ ONLY confirmam saldo 3
aceito, saldo 2 recusado, NULL aceito e status errado recusado.

**Causa:** Comparação <> em lógica SQL ternária não exige existência/valor do
resultado escalar. Padrão semelhante aparece em 41/44/50/56 de
supply-workflows.sql.

**Evidência:** evidence/sql-oracle-observations.json; evidence/sql-oracles.mjs

**Fonte:** tests/database/supply-workflows.sql:41;
tests/database/supply-workflows.sql:44; tests/database/supply-workflows.sql:50;
tests/database/supply-workflows.sql:56

**Método:** Tabela de verdade no PostgreSQL local verificado, BEGIN READ ONLY,
apenas constantes VALUES/SELECT, ROLLBACK; nenhuma fixture ou linha de paciente.

**Contraprova:** Saldo 2 e status errado são recusados; comparação IS DISTINCT
FROM reprova o caso NULL. A suíte tem outras asserts de soma/coalesce e
integrações com leituras fortes.

**Limites:** Demonstra insuficiência do predicado isolado. Não prova que a suíte
inteira passaria toda mutação de remoção do ledger, nem que exista saldo ausente
no produto.

**Consequência:** Uma ausência inesperada de linha/resultado positivo pode não
ser detectada no ponto em que o teste pretende provar crédito e custódia.

**Aceitação futura:** Oráculo de saldo positivo reprova ausência/NULL e valor
incorreto, aceita somente o valor esperado e respeita a representação legítima
de saldo zero. Conferir quantidade de linhas quando a regra exigir existência.

**Regressão futura:** Contraprovas de resultado ausente, NULL, saldo errado e
saldo correto; após correção funcional, cruzar evento/versão/ator/ledger com
HTTP Auth real e rollback/isolamento apropriados.

**Decisão:** D define por readmodel quando ausência significa zero e quando
contradiz crédito positivo; não modificar funções/migrations nesta auditoria.

**Humano/dispositivo:** Não para a lógica SQL isolada

**Homologação remota:** Não para o oráculo técnico; aplicação de mudançaDB exige
processo próprio

## B8-Q003

**Título:** Helper axe descarta resultados inconclusivos necessários à revisão
humana

**Eixo:** Q9

**Prioridade:** P3

**Origem:** NEW_B8

**Natureza:** OPORTUNIDADE_DE_COMPLETAR_REVISAO

**IDs anteriores:** B1-A11Y-002; B1-A11Y-003; B6-012

**Observado:** Helper real passa no DOM sintético com zero violations e
color-contrast em incomplete. O array inconclusivo não é registrado pelo helper
da CI. Contraprova com botão sem nome é recusada.

**Causa:** Resultado é reduzido à lista violations; não há trilha de
needs-review por estado/superfície nem vínculo automático ao plano humano.

**Evidência:** evidence/browser-observations.json#Q9-01;
evidence/browser-observations.json#Q9-02; evidence/browser-results.json

**Fonte:** tests/e 2e/accessibility-audit.ts:23; tests/e
2e/accessibility-audit.ts:26

**Método:** Chromium com conteúdo sintético e bloqueio deHTTP; importação do
helper real e leitura independente do resultado axe.

**Contraprova:** Regras WCAG2/2.1/2.2AA estão habilitadas; keyboardentry,
skiplink e overflow são verificados. B1 já registra inconclusivos manualmente e
possui plano de usuários/AT.

**Limites:** Não prova defeito de contraste da aplicação; nem todo incomplete é
violação. Ausência de pluginjsx-a11y na configuração amostrada também não
significa inacessibilidade do produto.

**Consequência:** A CI pode fornecer apenasPASS sem indicar uma revisão ainda
necessária, favorecendo leitura excessiva do resultado automatizado.

**Aceitação futura:** Preservar violations como falha; registrar
incomplete/estado/regra para triagem sem reprovar indiscriminadamente. Manter
aceite humano de foco, erros, reflow e PDF/AT separado.

**Regressão futura:** Controle com violação conhecida deve falhar; controle
inconclusivo deve gerar pendência rastreável; registrar decisão de revisão e
amostras por perfil/estado.

**Decisão:** Responsável define quem revisa, quais estados são gate e qual
alternativa acessível atende o primeiro público.

**Humano/dispositivo:** NVDA/VoiceOver/TalkBack, zoom nativo e aparelho físico
não homologados

**Homologação remota:** Não para a coleta local; homologação física/humana
permanece distinta

## B8-Q004

**Título:** QA-001 revalidado: leitura transitória encaminha helper desktop ao
ramo móvel

**Eixo:** Q6

**Prioridade:** P2

**Origem:** REVALIDATION

**Natureza:** CAUSA_EXISTENTE_APROFUNDADA

**IDs anteriores:** QA-001; B1-QA-001

**Observado:** Q6-02 inicia com desktop em preparação. Helper lê nav/trigger
invisíveis e espera Navegação do plantão/Mais, inexistente nesse DOM.
Triggerdesktop fica visível, mas helper termina em timeout600 ms. DOMestável e
readiness prévia passam.

**Causa:** Decisão de variante usa isVisible imediato sem aguardar estado de
shell pronto. Esperar o locator errado depois não reavalia a escolha do ramo.

**Evidência:** evidence/browser-observations.json#Q6-01;
evidence/browser-observations.json#Q6-02;
evidence/browser-observations.json#Q6-03; evidence/ci-recheck.json

**Fonte:** tests/e 2e/navigation.ts:4; tests/e 2e/navigation.ts:10; tests/e
2e/workflows.spec.ts:342

**Método:** Helper real, DOM sintético controlado, três cenários; reuso dos
artefatos CI B7 e GETatual dos metadados GitHub.

**Contraprova:** Desktoppronto funciona, assim como mesmo DOM após condição
explícita de readiness; CI histórica mobile/iOS passou e agregado manteve
falhaChromium.

**Limites:** Não mede frequência nem exclui outros fatores de
isolamento/ordem/tempo. Não houve repetição da suíte completa ou mudança de
timeout do projeto.

**Consequência:** Falso negativo no gate reduz confiança e dificulta distinguir
regressão real do produto de falha de harness.

**Aceitação futura:** Helper aguarda estado autorizado/pronto e escolhe
navegação correspondente ao shell; teste cobre variantes desktop
colapsado/expandido, operações móveis e hidratação tardia sem sleeps
arbitrários.

**Regressão futura:** Regressão determinística de readiness com helper, depois
caso afetado pelo runnerlocal em stack autorizada e CI nos três projetos;
repetir apenas para estimar estabilidade após correção.

**Decisão:** D corrige harness preservando assertions do produto; responsável
aprova quando considerar gate estável.

**Humano/dispositivo:** Não para o helper; mobilefísico continua separado

**Homologação remota:** CIpublicada no mesmoSHA necessária após correção

## B8-M001

**Título:** REPO-001 revalidado: entradas vigentes ainda misturam contagens e
autorizações antigas

**Eixo:** M4

**Prioridade:** P2

**Origem:** REVALIDATION

**Natureza:** DRIFT_DOCUMENTAL_EXISTENTE

**IDs anteriores:** REPO-001

**Observado:** README chama35 migrations/69 unitários/32 E2E de auditoria atual;
AGENTS diz19 hashes; DATABASE diz63; guard protege84. PROJECT_STATUS remete
baselines antigos e EXECUTION ainda descrevePR5 emexecução; DEPLOYMENT conserva
autorização de 22/10 como presente.

**Causa:** Estado transitório e autorização histórica permanecem em fontes
apresentadas como entrada vigente, sem vínculo único à branch/SHA e à missão
atual.

**Evidência:** evidence/SOURCE_ANCHORS.csv; evidence/documentation-links.json;
evidence/regression-reconciliation.json

**Fonte:** README.md:81; AGENTS.md:44; docs/DATABASE.md:6;
docs/DEPLOYMENT.md:50; docs/PROJECT_STATUS.md:9; docs/evolution/EXECUTION.md:5

**Método:** Comparação dos dez documentos requeridos, execução vigente, código
do guard e metadadosCI; 34links locaisinline válidos.

**Contraprova:** Regras essenciais de paciente, ledger, Auth e preservação
permanecem válidas; documentos datados são fontes históricas legítimas.
Linkválido não equivale a conteúdoatual.

**Limites:** Não se atualizou documentação geral nem se transformou autorização
passada em permissão presente. Contratos desejados divergentes do bug devem
orientar a correção, não ser enfraquecidos.

**Consequência:** Operador/desenvolvedor pode inferir prontidão, contagem ou
autorização indevida a partir da entrada errada.

**Aceitação futura:** Entradas permanentes apontam ao estado datado porSHA sem
contagens voláteis; autorização corrente separada de história; contratos e
limitações do release coerentes entre docs.

**Regressão futura:** Revisão documental com origem/data/SHA, links/anchors e
comparação de comandos/contagens geradas quando necessárias; preservar
relatórios históricos.

**Decisão:** C define fonte única do estado e responsáveis; D atualiza somente
documentos vigentes no momento apropriado.

**Humano/dispositivo:** Responsável valida instruções de operação e autorização

**Homologação remota:** Metadados de release atuais, sem alterações de provedor

## B8-M002

**Título:** REPO-002 revalidado: utilitários reutilizáveis sobrescrevem destinos
históricos fixos

**Eixo:** M5/M7

**Prioridade:** P3

**Origem:** REVALIDATION

**Natureza:** RISCO_DE_MANUTENCAO_EXISTENTE

**IDs anteriores:** REPO-002; UX-011

**Observado:** audit-catalogue escreve em 21/10, build-traceability em 20/10 e
reconcile-database em 21/10. inventory-ui atualiza inventário com base fixa
antiga. Há 230 scripts inventariados por padrões,18 com sinal lexical de destino
histórico; isso não equivale a 230 revisões completas.

**Causa:** Ferramenta e resultado de execução anterior compartilham caminho e
base hardcoded; execução por conveniência pode substituir proveniência e
invalidar manifestos.

**Evidência:** evidence/tool-review.json; evidence/LIMITATIONS_AND_ATTEMPTS.md

**Fonte:** scripts/audit-catalogue.mjs:6; scripts/build-traceability.mjs:3;
scripts/reconcile-database.mjs:8; scripts/inventory-ui.mjs:34;
scripts/verify-evolution-database.mjs:6

**Método:** Leitura de 22 scripts raiz e amostragem dirigida do inventário
histórico; sem executar mutadores ou geradores antigos.

**Contraprova:** Reconcile usa queriesreadonly e wrapper com identidade; vários
probes datados pertencem corretamente à sua execução histórica. A correção B4 de
três linhas é exceção autorizada e explicitada.

**Limites:** Não houve sobrescrita de evidência pela execução de scripts
antigos. A alteraçãoB4 torna seu hash Markdown atual diferente do manifesto
antigo, preservado porGit; CSV/provas não mudaram.

**Consequência:** Perda de cronologia e repetibilidade aparente; script com
nomeverify também pode semear fixtures, como verify-evolution-database.

**Aceitação futura:** Ferramentas reutilizadas recebem destino/base explícitos e
recusam sobrescrita por padrão; modo de reprodução histórica é identificado.
Ajuda informa leitura versus mutação antes de operar.

**Regressão futura:** Ensaios em diretório temporário próprio com sentinel,
recusa de caminhos fora do destino e detecção de conteúdo existente; sem rede/DB
quando o teste é de saída.

**Decisão:** Manter ferramenta histórica junto do pacote ou extrair só
consumidores reais, sem reorganização ampla.

**Humano/dispositivo:** Revisor de evidência valida proveniência e exceções

**Homologação remota:** Não executar remoto para provar destino de arquivo

## B8-M003

**Título:** REPO-003 revalidado: script Meta mistura inspeção com submissão
remota implícita

**Eixo:** M5

**Prioridade:** P2

**Origem:** REVALIDATION

**Natureza:** RISCO_OPERACIONAL_EXISTENTE

**IDs anteriores:** REPO-003

**Observado:** Com token, meta-templates consulta100templates e, se não encontra
o nome/idioma, pode criar upload e submeter template porPOST. Não há subcomando
explícito de submit; conta/app têm defaults. Guarda de destino usa
prefixo.private sem normalização de caminho.

**Causa:** Presença de credencial seleciona operação mutável; nomes/saída
parecem diagnóstico, mas não delimitam conta, intenção de submissão ou paginação
completa.

**Evidência:** evidence/tool-review.json; evidence/SOURCE_ANCHORS.csv

**Fonte:** scripts/meta-templates.mjs:5; scripts/meta-templates.mjs:49;
scripts/meta-templates.mjs:132

**Método:** Somente leitura de fonte; sem executar script, obter token,
consultarMeta ou submeterarquivo/template.

**Contraprova:** OrigemGraph é fixa, redirects recusados, timeout e códigos
seguros existem. Sem token o script só registra bloqueio local; isso não torna
seguro executá-lo com credencial herdada.

**Limites:** Não foi demonstrado abuso externo nem publicação indevida atual. É
risco de operador/ferramenta, não vulnerabilidade remota da aplicação.

**Consequência:** Execução tida como consulta pode alterar configuração externa
e enviar amostra PDF sem intenção concreta de publicação.

**Aceitação futura:** Inspeção padrão sóGET e paginação completa; submit
explícito com identidade/destino/amostra revisados e autorização vigente.
Resolver caminho privado antes de gravar.

**Regressão futura:** Transportestub grava métodos/URLs sem rede: inspect nunca
POST, credencial herdada não ativa submit, conta/tokens não vazam e
destino.private/../docs é recusado.

**Decisão:** Responsável define quando e por quem homologarMeta; D separa
capacidades antes de reutilização.

**Humano/dispositivo:** Revisão de conta/amostra e autorização de submissão

**Homologação remota:** Somente homologaçãoMeta posterior autorizada

## B8-M004

**Título:** REPO-004 aprofundado: cópia Linux inclui também ambiente Python
local

**Eixo:** M5/M6

**Prioridade:** P2

**Origem:** REVALIDATION

**Natureza:** MANIFESTACAO_ADICIONAL_DE_CAUSA_EXISTENTE

**IDs anteriores:** REPO-004

**Observado:** Tar de verify-linux exclui env/Git/caches, porém não.private
nem.venv. A .venv Windows instalada para os avisosPython pertence à máquina e
seria copiada pela mesma regra. .gitignore protegeGit; não altera
automaticamente o tar.

**Causa:** Exclusões independentes divergem do conjunto de artefatos locais
privados/gerados; montagemreadonly da origem não impede cópia/leitura no
destino.

**Evidência:** evidence/tool-review.json; evidence/dependency-consumers.json

**Fonte:** scripts/verify-linux.sh:4; .gitignore:43; .vercelignore:1;
requirements-audit.txt:1

**Método:** Inspeção literal dos argumentostar e das fronteirasGit/Vercel/CI;
sem executar cópia, ler conteúdo privado ou reconstruirLinux.

**Contraprova:** CI usa checkout limpo, sem .venv local nem.private não
versionada; preview Git não publica arquivos ignorados locais. A fonte montada
éreadonly e não há prova de vazamentoexterno.

**Limites:** Não se inferiu inclusão da .venv em deployGit. UploadCLI com ignore
próprio deve ser inspecionado antes de usar; não foi executado para confirmar
risco.

**Consequência:** Cópia desnecessária de evidências privadas e ambiente de
outroSO, maior custo e risco de ferramenta agir sobre material que o texto diz
excluir.

**Aceitação futura:** Listagem do arquivo/cópia exclui privados, env, venv e
saídas geradas; inclui todos os fontes/lock necessários; origem permanece
intacta. Não eliminar evidência para reduzir volume.

**Regressão futura:** Ensaio de listagem com sentinels sintéticos em workspace
temporário, sem dados privados nem instalação; conferir Windows/Linux e conteúdo
esperado.

**Decisão:** D escolhe allowlist ou exclusões verificadas proporcionais; não
criar nova stack ou reorganizar a aplicação.

**Humano/dispositivo:** Revisor valida fronteira de arquivos

**Homologação remota:** Não para o teste de cópia; nenhuma publicação requerida

## B8-M005

**Título:** UX-010 revalidado: candidatos à limpeza exigem grafo completo e
compatibilidade deURLs

**Eixo:** M1/M2/M3

**Prioridade:** P3

**Origem:** REVALIDATION

**Natureza:** OPORTUNIDADE_DE_HIGIENE_EXISTENTE

**IDs anteriores:** UX-010; UX-008

**Observado:** GrafoAST final aponta quatro módulos sem entrada:
RequisitionHistory, InventoryConsole, PrintButton e types/operations. CincoSVG
iniciais sem referênciaativa lexical. AppWorkspace é reexportado
porworkspace.tsx e utilizado; /inventarios é redirect compatível e tem
safeReturn/teste.

**Causa:** Implementações substituídas e tipos antigos continuam no repositório;
uma busca parcial confundiria reexportação/entrypoint público com código morto.

**Evidência:** evidence/inventory.json; evidence/consumer-review.json;
M/01_REPOSITORY_AND_CANDIDATES.md

**Fonte:** src/components/workspace.tsx:30; src/app/inventarios/page.tsx:1;
src/types/operations.ts:1; src/lib/safe-return-path.ts:22

**Método:** Importações, reexportações e imports dinâmicos AST; busca lexical
separada e leitura de consumidores/rotas. Nenhuma remoção.

**Contraprova:** AppWorkspace KEEP após contraprova; PatientContext ativo vem de
types/workspace, não de types/operations apesar do nome igual. FontesNoto têm
consumo explícito pelo renderer PDF.

**Limites:** Sem censo de bookmarks, acesso externo ou URLs de assets.
Classificação é candidato, não autorização nem prova universal de inutilidade.

**Consequência:** Manutenção em implementação errada ou remoção apressada pode
quebrar shell, tipos reexportados e compatibilidade externa.

**Aceitação futura:** Limpeza futura demonstra zero consumidores internos
completos, preserva entrypoints e versões/história, e valida URLs/retornos
autorizados afetados. Nenhuma reorganização estética ampla.

**Regressão futura:** Revisão do grafo com reexports, testes decompatibilidade
deURLs e verificações afetadas por cada remoção autorizada; não apagarprovas
históricas.

**Decisão:** C/D decidem remover quatro módulos; assets ficamDEPRECATE_CANDIDATE
até esclarecer consumo externo. /inventarios e AppWorkspace KEEP.

**Humano/dispositivo:** Responsável informa links/consumidores externos se
houver

**Homologação remota:** Logs ou integração externa somente em revisão futura
autorizada
