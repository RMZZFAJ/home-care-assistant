# Registro mestre B7

Sete registros: cinco P2 e dois P3. Nenhum P0/P1 novo demonstrado. Quatro
causas/lacunas novas, uma causa adicional de recuperação e duas oportunidades.
Os P1 anteriores e as dependências de homologação não foram resolvidos. Não se
declara GO nem início da Fase C. CSV e Markdown derivam dos mesmos dados.
OBS-REUSE e os demais achados conhecidos ficam nas dependências, sem novo
registro.

## B7-001

**Título:** Release nao possui vinculo obrigatorio entre SHA e conjunto de gates
aprovados

**Prioridade:** P2

**Natureza:** RISCO_SUSTENTADO_DE_GATE

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_CODIGO_E_METADADO_REMOTO

**Origem:** NOVA_CAUSA_B7

**Componente:** GitHub Actions e Vercel Git

**Ambiente:** Configuracao remota atual e publicacao historica

**Contrato esperado:** Um candidato so chega a operacao com gates e aceites do
mesmo SHA, schema e configuracao correspondentes.

**Observado:** master protected=false, rulesets vazios, CI40656069166 falha em
34dcb83 e deployment production READY no mesmo SHA. HEAD audit tem Vercel, sem
CI. createDeployments disabled refere-se a registros GitHub, nao a bloqueio
Vercel.

**Causa:** Caminhos de CI e publicacao separados sem gate obrigatorio
demonstrado; agregado DB/browser nao inclui validate. Regra de nao implantar
audit nao esta no vercel.json.

**Evidência:** evidence/ci-metadata.json; evidence/remote-baseline.json;
evidence/platform-contracts.json; .github/workflows/ci.yml:1; vercel.json:1

**Método:** GET autenticado de
conta/repo/protection/rulesets/checks/deployments; leitura de workflow e OpenAPI
oficial.

**Limite:** Publicacao historica foi de mudanca documental com base funcional
igual; nao demonstra regressao servida, invasao ou falta de autorizacao naquela
sessao. Nenhum push/deploy de teste.

**Consequência:** Uma alteracao futura pode publicar antes de seus
testes/aceites; o push desta auditoria pode criar preview apesar da proibicao.

**Condição de ocorrência:** Push ou publicacao por caminho que nao exige todos
os gates do candidato.

**Controle compensatório:** CI falha corretamente, SHA de deployment existe;
revisao e liberacao humanas podem impor parada, desde que explicitamente
verificadas.

**Contraprova:** database-and-browser falhou junto ao Chromium. O problema nao e
mascaramento de QA-001; createDeployments nao e guarda suficiente.

**Relação anterior:** QA-001 e REPO-001 sao dependencias; esta e causa distinta
da intermitencia. Sem duplicar esses achados.

**Alternativas futuras:** Exigir checks do SHA e liberar artefato identificado;
ou fluxo manual formal com aprovacao final verificavel. Para push documental,
guarda real de nao deployment na branch, sujeita a autorizacao especifica.

**Riscos de correção:** Selecionar apenas agregado DB/browser, bloquear CI por
skip indevido, alterar producao/protecao sem autorizacao ou presumir que
mensagem skip impede deploy.

**Dependências:** Conta/equipe/projeto, checks do candidato, schema/config e
regra real do Git integration.

**Aceitação futura:** Candidato com gate reprovado/skipped/ausente nao e
promovido; validate Linux/Windows e DB/browser exigidos. Commit documental
publica sem criar deployment quando esse e o limite autorizado.

**Testes futuros:** Em ambiente autorizado, demonstrar falha de cada gate e
ausencia de publicacao; registrar SHA/checks/artefato e a guarda de branch.

**Decisão pendente:** Escolher politica de release e autorizar eventual excecao
minima de configuracao antes do push documental.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Controle necessario ao primeiro release; nao autoriza
configurar nada nesta B7.

## B7-002

**Título:** API anuncia WhatsApp quando configuracao do provider e recusada

**Prioridade:** P2

**Natureza:** DEFEITO_CONFIRMADO_DE_READINESS

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_PROVA_CONTROLADA

**Origem:** NOVA_CAUSA_B7

**Componente:** notification-rules GET e metaConfiguration

**Ambiente:** Local em memoria com adaptador Auth/dados controlado

**Contrato esperado:** Canal oferecido e capacidade de transporte usam o mesmo
predicado de configuracao, separado da homologacao Meta.

**Observado:** CFG04a07: API200 e canal whatsapp anunciado com Graph
ausente/invalido, ID malformado ou idioma invalido; provider=null. Sete casos
passaram, zero rede.

**Causa:** Handler verifica somente flag/token/ID truthy; provider valida tambem
formato, Graph, idioma e template.

**Evidência:** evidence/configuration-results.json;
evidence/configuration.test.ts; src/app/api/notification-rules/route.ts:44;
src/lib/notifications/provider.ts:46

**Método:** Handler e provider reais; mock apenas de autorizacao/dados; fetch
proibido.

**Limite:** Nao prova Auth/RLS, incidencia remota, falha de mensagem real ou
aprovacoes Meta.

**Consequência:** Operador configura/preve canal sem transporte disponivel e
pode confiar em aviso que nao saira.

**Condição de ocorrência:** Ativacao externa com valores incompletos/malformados
que passam pelo predicado reduzido.

**Controle compensatório:** Provider falha seguro e nao envia; outbox/pendencias
e canal interno podem existir.

**Contraprova:** Config completa concorda; flag false e token ausente nao
anunciam canal. Nao e ativacao irrestrita.

**Relação anterior:** B5 separa preferencia/config/transporte/homologacao e
ausencia de email; esta divergencia de predicado e adicional.

**Alternativas futuras:** Readiness unico com causa segura compartilhado entre
API e worker, sem expor segredos; manter externo desligado no percurso aprovado.

**Riscos de correção:** Aceitar config invalida para fazer canal aparecer;
confundir READY local com template aprovado ou entrega.

**Dependências:** Variaveis privadas por ambiente e contratos Meta.

**Aceitação futura:** Todo canal anunciado passa o mesmo contrato de
configuracao do worker; ausencia/invalidez informa indisponibilidade segura;
homologacao continua separada.

**Testes futuros:** Matriz de cada campo ausente/invalido, flag desligada e
config valida; teste do destino somente sob homologacao autorizada.

**Decisão pendente:** Definir disponibilidade exibida e necessidade do canal no
primeiro escopo.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Pode ficar desligado se alternativa humana/interna aprovada
atender ao processo.

## B7-003

**Título:** Release nao atesta compatibilidade conjunta de schema e configuracao

**Prioridade:** P2

**Natureza:** LACUNA_OPERACIONAL_DE_COMPATIBILIDADE

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_INSPECAO_E_CATALOGOS

**Origem:** NOVA_LACUNA_B7

**Componente:** Build deploy migrations e runtime

**Ambiente:** Local/remoto atual e atualizacoes futuras

**Contrato esperado:** Antes de servir o candidato, verificar schema/RPCs,
config essencial e convivencia com versao anterior.

**Observado:** vercel.json instala/builda; CI valida banco efemero separado.
Clientes validam presenca tardiamente. Nao ha manifesto minimo consumido pelo
release. Catalogos atuais conferem84versoes/232 rotinas.

**Causa:** Procedimento documental exige revisao manual, mas nao ha atestado de
compatibilidade/config vinculado ao artefato servido.

**Evidência:** 04_DATABASE_MIGRATION_AND_DEPLOY_COMPATIBILITY.md;
evidence/schema-metadata.json; vercel.json:1;
src/lib/server/service-client.ts:5; src/lib/supabase/server.ts:4

**Método:** Leitura de scripts/config e catalogos somente leitura, sem
build/replay novo.

**Limite:** Nao ha incompatibilidade atual demonstrada; hashes de rotinas nao
certificam todos objetos/dados/config. Timeout15 s foi da consulta, nao runtime.

**Consequência:** Codigo novo pode receber erro por RPC/schema antigo; migracao
pode inviabilizar codigo anterior; ausencia de service key afeta PDF/anexo mesmo
sem Meta.

**Condição de ocorrência:** Ordem incorreta de deploy/migration, config faltante
ou rollback sem prova de convivencia.

**Controle compensatório:** Docs de deploy exigem destino/backup/revisao;
wrappers fixam ambiente e migrations sao incrementais/protegidas.

**Contraprova:** 84 migrations e 232 rotinas normalizadas local/remoto
coincidem; 218diferencas brutas eram somente CRLF/LF.

**Relação anterior:** B3 prova reproducao/integridade; REPO-001 cobre docs
antigas. Esta lacuna liga o artefato ao contrato e nao duplica replay.

**Alternativas futuras:** Manifesto simples de contratos e preflight de leitura
com prova por candidato; matriz de convivencia e expansao/contracao quando
necessario.

**Riscos de correção:** Gate verificar apenas numero maximo de migration,
consultar dado privado no health, bloquear rollback compativel ou executar
migration automaticamente sem backup.

**Dependências:** Responsavel de release, politica de schema, config por
ambiente e ensaio de recuperacao.

**Aceitação futura:** Destino/candidato mostram contratos minimos e config
essencial; versao antiga/nova testadas com schema evoluido; parada antes de
mutacoes se incompativel.

**Testes futuros:** Schema anterior, migration aplicada sem deploy, deploy sem
incremento e service key ausente em ambiente isolado autorizado.

**Decisão pendente:** Escolher mecanismo de atestado, ordem de cutover e
estrategia de retorno.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Necessario ao deploy seguro; nao exige novo ambiente ou
alteracao nesta auditoria.

## B7-004

**Título:** Restore sem quarentena pode reativar cron e endpoint operacional
antigo

**Prioridade:** P2

**Natureza:** RISCO_SUSTENTADO_DE_RECUPERACAO

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_FONTE_E_TOC_CONDICIONAL

**Origem:** CAUSA_ADICIONAL_RELACIONADA_OPS001

**Componente:** Backup custom cron Vault pg_net e worker

**Ambiente:** Destino futuro de restore ou copia operacional

**Contrato esperado:** Jobs e comunicacao externa ficam impedidos antes de
recuperar estado; so retomam apos reconciliacao e identidade correta.

**Observado:** TOC custom contem cron.job ativo e vault.secrets; invocador chama
endpoint oficial se bearer valido. Nao ha procedimento homologado de
quarentena/reconciliacao antes da reativacao.

**Causa:** Backup de dados pode incluir estado de agendamento/segredo que produz
efeito externo ao recuperar, sem coordenacao transacional com provedor.

**Evidência:** evidence/backup-inventory.json;
supabase/migrations/20261023041624_v4_document_read_models_and_worker_cron.sql:54;
05_BACKUP_RESTORE_AND_DISASTER_RECOVERY.md

**Método:** TOC/header/hash e definicao vigente identica ao baseline; analise de
cenario, sem restore.

**Limite:** Dump local mais recente nao tinha URL/bearer de worker; chave de
Vault pode nao ser recuperavel; pares SQL remotos examinados nao incluem COPY
cron/Vault. Risco depende do formato, rede, scheduler e segredo validos.

**Consequência:** Copia/restore pode chamar producao ou reenviar tarefa anterior
a efeito externo ja realizado, antes da conciliacao.

**Condição de ocorrência:** Restaurar cron/config suficiente num destino com
scheduler e egress habilitados.

**Controle compensatório:** Endpoint e fixo e bearer exige formato; uncertain
exige decisao no fluxo normal. Destino sem rede/cron impede efeito.

**Contraprova:** B7 nao restaurou, nao enviou e nao encontrou segredo worker no
local; existencia do TOC nao prova execucao indevida.

**Relação anterior:** OPS-001/B3-014 e recuperacao B5/B6; causa especifica, nao
novo registro da falta de ensaio integral.

**Alternativas futuras:** Quarentena de egress/cron antes do restore e
inventario de jobs/segredos; reconciliar outbox/provedor antes de ativar. Usar
mecanismos existentes.

**Riscos de correção:** Quarentena aplicada tarde, restaurar ciphertext sem
chave, limpar uncertain, reativar endpoint antigo ou omitir trilha de revogacao.

**Dependências:** Destino isolado autorizado, keys, procedimento do provedor,
donos de dados/comunicacao e B5-013/014.

**Aceitação futura:** Ensaio comprova zero chamada externa antes do aceite;
destino/segredos corretos, efeitos posteriores ao corte conciliados e retomada
sem duplicacao.

**Testes futuros:** Restore isolado com egress proibido, cron recuperado,
segredo controlado e efeito externo modelado anterior ao corte; medir RPO/RTO.

**Decisão pendente:** Autorizar ensaio, definir RPO/RTO e responsaveis de
quarentena/conciliação.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Requisito de recuperacao do primeiro ambiente real; nao
executar sobre ambientes existentes.

## B7-005

**Título:** Upload anunciado excede limite de body da Vercel Function

**Prioridade:** P2

**Natureza:** INCOMPATIBILIDADE_CONFIRMADA_DE_CONTRATOS

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_FONTE_PROVA_LOCAL_E_DOC_OFICIAL

**Origem:** NOVA_CAUSA_B7

**Componente:** Anexos avatar e transporte Next na Vercel

**Ambiente:** Local controlado e contrato publicado da plataforma

**Contrato esperado:** Arquivo que a UI permite deve atravessar transporte ou
receber limite coerente antes de tentar.

**Observado:** UI e helper10 MiB, avatar5 MiB. PDF6 MiB em multipart6291639
bytes passa boundedUpload e sanitiza para 572 bytes. Vercel documenta4.5 MB
body; reducao server ocorre depois da fronteira.

**Causa:** Limite de negocio/aplicacao nao considera teto de entrada da Function
e overhead multipart.

**Evidência:** evidence/upload-envelope-results.json;
evidence/upload-envelope.test.ts; src/lib/server/files.ts:46;
src/components/documents/attachments.tsx:74; src/app/api/profile/route.ts:121;
[Fonte primária](https://vercel.com/docs/functions/limitations)

**Método:** Tres envelopes PDF validos em memoria; helper/sanitizador reais;
zero upload/rede/DB; consulta primaria de limite.

**Limite:** Nao se provocou413 remoto nem se demonstrou arquivo produtivo
falhando. Impacto esperado e condicional ao tamanho e transporte atual; teste
nao mede throughput.

**Consequência:** Foto/PDF autorizado pelo produto pode ser rejeitado pela
plataforma antes de sanitizacao/erro seguro da API.

**Condição de ocorrência:** Body acima de 4.5 MB no caminho Function, mesmo se o
arquivo sanitizado final seria pequeno.

**Controle compensatório:** Arquivos menores podem atravessar; 11 MiB e recusado
pelo helper. Documento ja salvo nao deve ser reemitido por falha de anexo.

**Contraprova:** 1 MiB aceito e 11 MiB recusado, sem alegar ausencia total de
limite. PDFs grandes de resposta nao foram demonstrados.

**Relação anterior:** B4/B6 validaram seguranca/fidelidade de bytes; esta e
fronteira adicional da plataforma, nao repeticao de sanitizacao.

**Alternativas futuras:** Teto coerente com margem e mensagem; ou transporte
direto/resumivel com reserva autorizada, quarentena, sanitizacao e finalizacao
segura.

**Riscos de correção:** Remover sanitizacao, permitir objeto publico, confiar
hash do browser, usar signed URL sem escopo ou reduzir limite sem orientar
usuario.

**Dependências:** Contrato de evidencia, limite do provedor e decisao de
tamanho/transporte.

**Aceitação futura:** Cliente/API/transporte coerentes em limite e borda; erro
util antes de envio inviavel; validacao/sanitizacao/autorizacao e idempotencia
preservadas.

**Testes futuros:** Bordas abaixo/no/acima do teto com multipart real, avatar e
anexos; erro plataforma com recuperacao em ambiente autorizado, sem dado
pessoal.

**Decisão pendente:** Escolher teto proporcional ou investir em novo transporte;
definir requisito real de arquivo.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Relevante se anexos/fotos/PDF integram processos essenciais do
piloto.

## B7-006

**Título:** Shell publico amostrado nao possui politica de headers de hardening

**Prioridade:** P3

**Natureza:** MELHORIA_OPCIONAL_DE_DEFESA_EM_PROFUNDIDADE

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_PARA_AMOSTRA_LIMITADA

**Origem:** OPORTUNIDADE_B7

**Componente:** Headers browser/edge

**Ambiente:** HEAD anonimo login production

**Contrato esperado:** Politica de embedding, conteudo, referencia e capacidades
e deliberada e compativel com o produto.

**Observado:** HEAD/login200 sem CSP, frame-options, nosniff, referrer-policy ou
permissions-policy. HSTS existe. Preview302 protegido tem DENY.

**Causa:** Nao ha politica versionada equivalente nos arquivos examinados;
amostra de producao nao mostra politica no edge.

**Evidência:** evidence/security-metadata.json; next.config.ts:1; proxy.ts:1

**Método:** HEAD anonimo sem corpo/cookie retido e leitura de config.

**Limite:** Nenhuma tela autenticada em frame, XSS ou clickjacking foi
explorado. Header da protecao preview nao atesta app.

**Consequência:** Menor defesa adicional do browser, sem ataque ou exposicao de
dados comprovados.

**Condição de ocorrência:** Depende de embedding ou outro vetor adicional;
ausencia de CSP sozinha nao comprova XSS.

**Controle compensatório:** React escaping, origem/autorizacao, no-store,
privacidade de objetos e HTTPS existentes.

**Contraprova:** TLS/HSTS presentes; preview possui protecao propria. Nao
recomendarHSTS adicional indiscriminadamente.

**Relação anterior:** Complemento de infraestrutura, sem refazer matriz HTTP B4
ou audit UI B1.

**Alternativas futuras:** Politica gradual report-only/compatibilidade e depois
enforcement onde aprovado; documentar embedding permitido.

**Riscos de correção:** Quebrar scripts Next/Fluent, scanner, camera, Auth ou
PDFs com politica generica.

**Dependências:** Guia Next instalado, dominios/recursos efetivos e homologacao
browser.

**Aceitação futura:** Politica aceita e verificada em rotas alvo, com jornadas
essenciais funcionando; ou risco residual explicitamente aceito.

**Testes futuros:** Headers efetivos e compatibilidade de Auth, camera, PDF e
navegador; teste de embedding somente autorizado.

**Decisão pendente:** Definir se embedding e necessario e quais
capacidades/origens sao permitidas.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Opcional proporcional; nao novo bloqueador por exploracao
comprovada.

## B7-007

**Título:** Advisory de dependencia Markdown dev requer triagem e acompanhamento

**Prioridade:** P3

**Natureza:** MELHORIA_OPCIONAL_DE_CADEIA_DE_FORNECIMENTO

**Estado:** OPEN_DIAGNOSIS

**Confiança:** ALTA_METADATA_E_CONSUMIDOR_EXAMINADO

**Origem:** OPORTUNIDADE_B7

**Componente:** markdownlint-cli2 para markdownlint para re2js

**Ambiente:** Ferramentas dev/CI e instalacao de build

**Contrato esperado:** Alertas de dependencias sao triados por alcance/condicao,
com decisao e revisao.

**Observado:** npm audit exit1:3 nos high relacionados a um advisory re2js2.8.6.
TodosdevOnly; upstreamcorrige2.8.7. Consumidores markdownlint examinados nao
ativam LOOKBEHINDS exigido.

**Causa:** Versao transitiva no lock pertence a intervalo do advisory; workflow
nao possui politica explicita de triagem desse resultado.

**Evidência:** evidence/dependency-audit.json; evidence/security-metadata.json;
node_modules/markdownlint/lib/markdownlint.mjs:812; [Fonte
primária](https://github.com/advisories/GHSA-gg6h-894w-4m9c)

**Método:** Consulta atual registry, lock, advisory primario e leitura dos
consumidores; sem PoC de carga ou update.

**Limite:** Nao ha exploracao demonstrada no runtime ou CI pelo caminho
inspecionado; nao tratar CVSS como prioridade operacional automatica.

**Consequência:** Alerta pode ficar sem dono/revisao; mudanca futura de
consumidor/config pode alterar alcance.

**Condição de ocorrência:** Uso opt-in LOOKBEHINDS com matching repetido
conforme advisory; nao localizado na amostra atual.

**Controle compensatório:** Dependencia dev, regexes constantes sem flag
observado, versoes fixas e lock verificavel.

**Contraprova:** Nenhum no prod sinalizado nesse snapshot; 3 nos nao sao3causas.
Ausencia de alerta prod nao garante ausencia universal de vulnerabilidade.

**Relação anterior:** Atualiza evidencias historicas de auditoria npm; nao
invalida resultado datado ou exige upgrade cego.

**Alternativas futuras:** Atualizacao transitiva compativel e validada em fase
autorizada; ou decisao documentada de nao alcance com prazo/dono de reavaliacao.

**Riscos de correção:** npm audit fix/downgrade automatico pode quebrar tooling,
alterarlock ou mascarar condicao sem triagem.

**Dependências:** Mantenedor de tooling, compatibilidade e processo de
monitoramento.

**Aceitação futura:** Advisory triado, decisao/dono/revisao registrados; se
atualizar, lock e verificacoes afetadas passam sem afrouxar regras.

**Testes futuros:** Confirmar consumidor/flags e escopoapos mudanca; testar
Markdown/ferramenta sem executar carga maliciosa ampla.

**Decisão pendente:** Escolher janela/dono para manutencao de dependencias e
politica de excecao.

**Responsável sugerido:** Engenharia e responsavel do produto

**Primeiro uso:** Acompanhamento P3; nao vulnerabilidade runtime comprovada nem
bloqueador equivalente aos P1 herdados.
