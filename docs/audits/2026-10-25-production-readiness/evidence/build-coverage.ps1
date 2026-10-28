$ErrorActionPreference = 'Stop'
$audit = Join-Path (Get-Location) 'docs/audits/2026-10-25-production-readiness'
$evidence = Join-Path $audit 'evidence'
$inventory = Get-Content -LiteralPath (Join-Path $evidence 'tracked-files.txt')
$assigned = @()
Get-ChildItem -LiteralPath $evidence -Filter 'coverage-*.csv' | Where-Object Name -ne 'coverage-root.csv' | ForEach-Object { $assigned += (Import-Csv -LiteralPath $_.FullName).path }
$referenceScope = @('docs/audits/2026-10-20/sources/AUDITORIA.txt','docs/audits/2026-10-20/sources/MISSION.txt','docs/audits/2026-10-20/sources/SUPERPROMPT.txt','docs/references/v3/home_care_meta_templates_v3_completos.md','docs/references/v3/home_care_meta_payloads_v3_PREENCHER.json','docs/meta/templates-v4-submission.json')
$notes = @{
 '.env.example'='Contrato de variáveis públicas/servidor, flags de envio e valores vazios; nenhuma credencial real consultada.'
 '.github/workflows/ci.yml'='Jobs Windows/Linux, SQL/Auth e três navegadores; instalação fixa, guards, artifact e aggregate; CI do SHA consultada readonly.'
 '.gitignore'='Exclui env, private, temporários e resultados; não governa tar do script Linux.'
 '.vercelignore'='Exclusões para publicação; não confundir com exclusões de outras ferramentas.'
 '.vscode/settings.json'='Configuração de editor/PowerShell; não contém autorização de execução nem segredo.'
 '.node-version'='Versão24.22.0 usada nos checks; PATH global24.13 foi isolado por processo.'
 '.nvmrc'='Versão alinhada ao arquivo .node-version.'
 '.npmrc'='Política npm examinada com engines/packageManager e instalação CI.'
 'package.json'='Scripts, dependências diretas, engines e override examinados; nenhuma dependência removida por suposição.'
 'package-lock.json'='Lockv3;539entradas incluindo raiz; diretas coincidem; integridade/registry presentes; npm ls e audit passaram.'
 'next.config.ts'='Build, distDirE2E e headers examinados; configuração local é selecionada pelo runner.'
 'eslint.config.mjs'='Regras TypeScript/React/Next examinadas, sem relaxamento durante auditoria.'
 'vitest.config.mts'='Alias, ambiente e escopo de testes; probe auditável usa config separada.'
 'tsconfig.json'='Includes abrangem artefatos TS da auditoria; erro introduzido no probe foi corrigido somente nele.'
 'playwright.config.ts'='3projetos, worker1, origemlocal, servidor semreuse, tracesoff;120casos executados, um timeoutinvestigado.'
 'vercel.json'='Configuração de implantação lida; publicação e configuração remotas não modificadas.'
 'proxy.ts'='Atualiza cookies e header de retorno; getUser não substitui autorização daAPI/RPC.'
 'scripts/audit-catalogue.mjs'='Compara catálogo e grava diretóriohistórico fixo; não executado para evitar sobrescrita.'
 'scripts/backup-local-database.mjs'='Dump/manifesto/hash e guardlocal; dump pré-existente validado pelo replay, sem novo backup da auditoria.'
 'scripts/build-flow-contracts.mjs'='Gera telas7.3 e dataexchange3.0; review deENT e ocorrência não presumem débito; contrato gerado lido.'
 'scripts/build-meta-catalog.mjs'='Geração de registry/catálogo com caminhos e parâmetrosexternos; sem submissão ao provedor.'
 'scripts/build-traceability.mjs'='74requisitos e evidência histórica; destino20/10 fixo pode substituir matriz anterior.'
 'scripts/check-contracts.mjs'='Verifica84hashes e remoção de quantidade solicitada; execuçãoPASS.'
 'scripts/clean-test-database.mjs'='Limpeza local protegida e dependências FK; leitura sem execução nesta fase.'
 'scripts/e2e-environment.mjs'='Recusa destino não-local e injeta flags externasfalse; runner atualusou estecontrato.'
 'scripts/historical-migrations.json'='84paths/hashes conferidos por check:contracts; gerado não exige leitura de cada hex como código.'
 'scripts/inventory-ui.mjs'='Inventário gerado com SHA fixo; útil para arquitetura histórica, não prova cobertura atual.'
 'scripts/meta-templates.mjs'='GET seguido dePOST se tokenpresente; faltam modosinspecionar/submeter e paginação; não executado.'
 'scripts/prepare-test-database.mjs'='Preparação da stackexistente, sem stackalternativa; executadoPASS.'
 'scripts/reconcile-database.mjs'='Metadados/relatóriosemântico; destinohistórico fixo; não usado para alterar relatório antigo.'
 'scripts/run-e2e.mjs'='Propaga ambiente seguro e argumentos ao Playwright; executado para3projetos e repetição direcionada.'
 'scripts/seed-test-fixtures.mjs'='Authoficial e dadosfictícios no local; consentimento vigente autoriza preparação, nunca remoto.'
 'scripts/start-e2e-server.mjs'='Guardantesdo build; origemloopback e distDir próprio; usado no E2E.'
 'scripts/supabase-project.mjs'='Wrapper de identidade/projeto; vínculoCLI não concede autorização de migração/teste remoto.'
 'scripts/test-constants.mjs'='Identidades/pacientesfictícios e senha local isolada; valores sensíveis não reproduzidos nos relatórios.'
 'scripts/test-environment.mjs'='Projectid, workdirlabel e loopbackportas verificados antes de cada teste; backupmanifest/hash no replay.'
 'scripts/test-migrations.mjs'='Reset--local autorizado; limpa e upgrade19;14SQL e pontepgcrypto; helpersAuthreais; execuçãoPASS.'
 'scripts/verify-evolution-database.mjs'='Verificação de evolução e contratos; não substitui replay/current metadata.'
 'scripts/verify-linux.sh'='Tar omite .env mas não .private; scriptmanual não executado; CIreadonly confirma Linux doSHA.'
 'tests/e2e/accessibility-audit.ts'='AxeWCAG2/21/22AA, overflow e foco; não equivale a leitor de tela ou aparelho físico.'
 'tests/e2e/accessibility.spec.ts'='Percorrelogin e fluxos autorizados, teclado e axe; execução3projetos.'
 'tests/e2e/administration.spec.ts'='Catálogo, vínculosA/B, convites, alertas, importaçãoealiases; assertsUI+API; setupSQL explícito.'
 'tests/e2e/auth-context.ts'='Seleção espera autoridade/contextopersistido e habilitação; não só valor do combobox.'
 'tests/e2e/balance-shifts.spec.ts'='BALduasetapas, campoobrigatório, referênciareal, stale e tentativa recuperável; capturas não baselinevisual.'
 'tests/e2e/fluent-experience.spec.ts'='Papéis, responsividade, drawers e comandos; screenshots geradas não garantem inspeçãohumana de todos estados.'
 'tests/e2e/global-setup.ts'='Guard e fixtures locais antes de cenários; não usar contra sessão desconhecida.'
 'tests/e2e/login.spec.ts'='Login válido/inválido e rede; feedbackobservado comAuthlocal.'
 'tests/e2e/navigation.ts'='isVisible imediato escolhe fallback sem espera;119/120rodada encontrou timeoutChromium nessehelper.'
 'tests/e2e/onboarding.spec.ts'='Convite/cadastroMailpit/confirmação/aceite/recuperação comAuthreal; não homologa SMTPexterno.'
 'tests/e2e/personal-workspace.spec.ts'='Perfil, fotoStorageprivado e vista de notificação separada de ciência.'
 'tests/e2e/schedules.spec.ts'='Publicação, colisão e cancelamento; não verifica diffinformativo antes deaprovarproposta.'
 'tests/e2e/v4-review.spec.ts'='Duas sessões, conflitopolítica, sino silencioso e arquivamento; callbacksprovedor sãofixtureslocais.'
 'tests/e2e/v4.spec.ts'='Ciência, necessidades compartilhadas, sharePDFstub, prazoacompanhamento e matrizes; não hardware.'
 'tests/e2e/workflows.spec.ts'='CadeiaREQ/COM/ENT/BAL, permissões, resposta perdida, scannerimagem, cancelamento eFlowrevisado; semconsumocancelado no consent.'
 'docs/API.md'='Contratos das fronteiras HTTP/RPC; comparação comimplementação e usosUI, não só existência de endpoints.'
 'docs/ARCHITECTURE.md'='Paciente/contexto/catálogo/ledger/documentos como autoridades; preservação de camadasválidas.'
 'docs/AUDIT.md'='Índice e limitesda auditoriahistórica comparados aoSHAatual.'
 'docs/DATABASE.md'='Modelo/grants/migrations lidos; número63desatualizado frenteao manifesto84.'
 'docs/DEPLOYMENT.md'='Pré-validação, ambientes, segredos e configuração; nenhum deployexecutado nesta fase.'
 'docs/OPERATIONS.md'='Continuidade, backup e recuperação; aceiteintegralprodução aindaexterno.'
 'docs/PROJECT_STATUS.md'='Estado declarado confrontado comcódigo, logs e CI atual.'
 'docs/ROADMAP.md'='Separação doque existe e dependênciasfuturas; não representa autorização deimplementar.'
 'docs/SECURITY.md'='Fronteiras de confiança, logs, RLS/grants e segredos; comparação comresultado Auth/SQL.'
 'docs/TESTING.md'='Origens e runners seguros; limites de mocks e evidência real.'
 'docs/WHATSAPP_AI.md'='Contratos e limitesexternos, propostaIA revisada e flags; indisponibilidade não equivale a sucesso.'
 'AGENTS.md'='Instruçõespermanentes e preservação; ordemFaseA autoriza exclusivamente local/audit; número19desatualizado.'
 'README.md'='Bootstrap e linksprincipais; contagens35/69/32rotuladasatuais exigem correçãodocumental futura.'
 'docs/evolution/EXECUTION.md'='Leitura integral da históriaV3/V4/PR5; preservação e limitaçõesexternas datadas; topoPR5desatualizado.'
 'docs/references/README.md'='Proveniência e natureza ilustrativa dos artefatosMeta; não evidênciade envio atual.'
 'public/fonts/OFL.txt'='Licença mantida junto das fontes; não deriva condiçõeslegaisalém doarquivo.'
}
$runtime = @('.github/workflows/ci.yml','package.json','package-lock.json','next.config.ts','eslint.config.mjs','vitest.config.mts','tsconfig.json','playwright.config.ts','proxy.ts','scripts/check-contracts.mjs','scripts/e2e-environment.mjs','scripts/historical-migrations.json','scripts/prepare-test-database.mjs','scripts/run-e2e.mjs','scripts/seed-test-fixtures.mjs','scripts/start-e2e-server.mjs','scripts/test-constants.mjs','scripts/test-environment.mjs','scripts/test-migrations.mjs')
$rootRows = foreach ($path in $inventory) {
 if ($path -in $assigned -or $path -like 'docs/ui-ux/*' -or $path -in $referenceScope) { continue }
 $kind='CONFIG_CI'; $method='SEMANTIC_FULL'; $semantic='YES'; $visual='NO'; $evidenceText='HEAD 37cb7f85e96e551d6419871f94dd950712e2565b; revisão coordenada'; $limit='Revisão e testes não cobrem todas as combinações nem ambiente remoto.'
 if ($path -like 'scripts/*') { $kind='SCRIPT' }
 if ($path -like 'tests/*') { $kind='TEST' }
 if ($path -like 'docs/*' -or $path -in @('AGENTS.md','README.md')) { $kind='DOCUMENTATION_CURRENT' }
 if ($path -like 'docs/audits/*') { $kind='DOCUMENTATION_HISTORICAL'; $limit='Relatório datado; fatos deprodução não revalidados por sua leitura.' }
 if ($path -match '\.(json|csv)$' -and $path -notin @('package.json','vercel.json','.vscode/settings.json','tsconfig.json')) { $kind='GENERATED_OR_LOCK'; $method='STRUCTURAL'; $semantic='NO'; $evidenceText='evidence/artifact-structure.json; relatórios correlatos lidos' }
 if ($path -like 'docs/meta/flows/*') { $method='SEMANTIC_FULL'; $semantic='YES'; $limit='Contrato local lido; editor/publicação e funcionamento Meta não homologados.' }
 if ($path -like 'public/*') { $kind='ASSET'; $method='STRUCTURAL'; $semantic='NOT_APPLICABLE'; $evidenceText='evidence/consumer-search.txt; evidence/pdf-and-font-inspection.json' }
 if ($path -like '*.pdf') { $kind='ASSET'; $method='STRUCTURAL;VISUAL_VALIDATED'; $semantic='NOT_APPLICABLE'; $visual='HISTORICAL'; $evidenceText='evidence/pdf-and-font-inspection.json; 2páginas renderizadas einspecionadas'; $limit='Exemplo fictício histórico; não PDFatual gerado pelaaplicação.' }
 $note=$notes[$path]
 if (-not $note -and $path -like 'docs/audits/*') { $note='Artefato histórico '+[IO.Path]::GetFileName($path)+': conteúdo/método e escopo datados examinados; não convertido em evidência atual.' }
 if (-not $note -and $path -like 'docs/meta/flows/*') { $note='Telas, dataexchange, revisão/complete e dadosrequired lidos emconjunto comgerador; consumo não automático.' }
 if (-not $note -and $path -like '*.pdf') { $note='Seis páginas dastrêsamostras renderizadas, legíveis e claramente fictícias; avisos de estado e integridade presentes.' }
 if (-not $note -and $path -like '*.svg') { $note='SVGestático inicial de scaffold; conteúdo e buscas de caminho/símbolo sem consumidor demonstrado; candidato de limpeza condicionado.' }
 if (-not $note -and $path -like '*.ttf') { $note='NotoSans com3748glifos e caracteresportugueses; consumida no geradorPDF, licença adjacente.' }
 if (-not $note) { throw ('Root coverage missing explicit review note: '+$path) }
 $runtimeFlag=if ($path -in $runtime -or $path -like 'tests/e2e/*') {'PARTIAL'} else {'NO'}
 if ($runtimeFlag -eq 'PARTIAL') { $evidenceText += '; evidence/contracts.log; evidence/typecheck.log; evidence/build.log; evidence/e2e-after-probe-fix.log' }
 [pscustomobject]@{path=$path;artifact_type=$kind;responsibility=$note;review_method=$method;review_status='REVIEWED';semantic_review=$semantic;runtime_checked=$runtimeFlag;visual_checked=$visual;security_relevance=if($path -match 'auth|security|environment|proxy|config|migration|seed|backup'){ 'HIGH' }else{'CONTEXTUAL'};journeys=if($path -like 'tests/e2e/*'){'Jornadas operacionais e autorização'}else{'Engenharia; operação; documentação'};consumers_checked='Código; rotas; scripts; CI; configuração; referências e compatibilidade conforme grupo';findings='';evidence=$evidenceText;limitations=$limit;notes=$note}
}
$rootRows | Export-Csv -LiteralPath (Join-Path $evidence 'coverage-root.csv') -NoTypeInformation -Encoding utf8
$merged = @(Get-ChildItem -LiteralPath $evidence -Filter 'coverage-*.csv' | ForEach-Object { Import-Csv -LiteralPath $_.FullName })
$duplicates=@($merged | Group-Object path | Where-Object Count -gt 1)
if ($duplicates.Count) { throw ('Duplicate coverage: '+($duplicates.Name -join ', ')) }
$unexpected=@($merged.path | Where-Object { $_ -notin $inventory })
if ($unexpected.Count) { throw ('Unexpected coverage: '+($unexpected -join ', ')) }
$allFindings=@(Get-ChildItem -LiteralPath $evidence -Filter 'findings-*.json' | Where-Object Name -match '^findings-(backend|database|ui|root|testing)\.json$' | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json })
foreach ($row in $merged) {
 if ($row.semantic_review -eq 'N/A') { $row.semantic_review='NOT_APPLICABLE' }
 $linked=@($row.findings -split ';' | ForEach-Object { $_.Trim() } | Where-Object { $_ -match '^[A-Z]+-\d{3}$' })
 foreach ($finding in $allFindings) {
  $files=@($finding.files) -join '; '
  if ($files -match ('(^|;\s*)'+[regex]::Escape($row.path)+'(:\d+)?($|;)')) { $linked += $finding.id }
 }
 $row.findings=($linked | Sort-Object -Unique) -join '; '
}
$merged | Sort-Object path | Export-Csv -LiteralPath (Join-Path $audit 'COVERAGE.csv') -NoTypeInformation -Encoding utf8
[pscustomobject]@{ inventory=$inventory.Count; classified=$merged.Count; root=$rootRows.Count; missing=@($inventory | Where-Object { $_ -notin $merged.path }); methods=@($merged | Group-Object review_method | Select-Object Name,Count); semantic=@($merged | Group-Object semantic_review | Select-Object Name,Count) } | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $evidence 'coverage-reconciliation.json') -Encoding utf8
Get-Content -LiteralPath (Join-Path $evidence 'coverage-reconciliation.json')
