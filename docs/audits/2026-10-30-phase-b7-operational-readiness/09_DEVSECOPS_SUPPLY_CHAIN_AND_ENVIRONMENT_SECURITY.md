# B7.9 — DevSecOps e cadeia de fornecimento

## Instalação e proveniência

Lockfile v3 com 538 entradas, versões diretas correspondentes ao package.json,
integrity presente em todas as entradas resolvidas e URLs do registry npm. `npm
ci`, npm11.21.1 e versões exatas são controles a preservar. Uma entrada de
install script marcada no lock é fsevents, dev/optional; isso não prova ausência
de todo código de instalação transitivo ou comprometimento impossível. Não se
instalou dependência nem repetiu build na B7.

Quatro Actions únicas estão fixadas em SHA40 e cada tag comentada foi resolvida
por GET no repositório correspondente: checkout7.0.1, setup-node7.1.0,
supabase/setup-cli3.0.1 e upload-artifact7.0.2. Todos os SHAs correspondem às
tags consultadas. Pinning/owner correto reduz deriva; não é uma atestação
criptográfica de todos os binários, imagens, downloads de browser ou conteúdo de
registry. O npm global é instalado por versão, CLI Supabase por versão e
browsers pelo Playwright fixado.

Workflow usa contents:read; não há `pull_request_target`, segredo produtivo
injetado no workflow ou deploy/migração remota. Runners efêmeros com dados
fictícios e portas reservadas reduzem interferência. Cache é de instalação, sem
restore de sessões do navegador. Não se alterou permissão/proteção.

## Auditoria de dependências e contraditório

Foi realizada uma consulta atual ao registry com `npm audit --json
--ignore-scripts`, exit1, sem fix. Três nós high (markdownlint-cli2,
markdownlint e re2js) remontam a **um advisory**, GHSA-gg6h-894w-4m9c,
re2js2.8.6, todos devOnly no lock. A correção indicada pelo upstream é2.8.7. O
problema requer LOOKBEHINDS opt-in e matching repetido. [Advisory
primário](https://github.com/advisories/GHSA-gg6h-894w-4m9c).

O consumidor markdownlint inspecionado compila frontmatter sem esse flag e usa
regexes constantes nos rules MD011/013/039; não encontramos ativação LOOKBEHINDS
nesses consumidores. Nenhum caminho de exploração no runtime ou negação de
serviço da aplicação foi demonstrado. Não são três vulnerabilidades
independentes do produto. Nenhum nó de produção foi sinalizado nesse snapshot;
isso não certifica ausência de vulnerabilidade desconhecida.

B7-007 é acompanhamento P3 da cadeia e triagem, não um bloqueador high de
produção. Não executar `npm audit fix`, downgrade automático sugerido pelo
scanner, ou alterar lock para fabricar verde. Decisão futura: atualização
compatível ou aceitação documentada da não alcançabilidade, com revisão
periódica. O workflow atual não executa uma política explícita de auditoria de
dependências; badge externo Socket success não substitui análise do advisory.

## Artefatos, arquivos e credenciais

Somente `.env.example` é versionado. `.private`, `.venv`, supabase/.temp e
credenciais não constam nos caminhos rastreados examinados. `.vercelignore`
exclui .env, .private, Git, node_modules e artefatos de testes; não se afirma
auditoria completa de toda história Git ou de todos os arquivos remotos.
`verify-linux.sh` copia `.private` por não excluí-la; é REPO-004 herdado, não
foi executado nem corrigido. O diretório de tooling Python também deve ser
considerado em futura exportação minimizada, sem presumir publicação.

`meta-templates.mjs` pode publicar com token presente: REPO-003 permanece, e a
B7 não o usou como leitura. Vínculo de CLI com remoto não autoriza testes. O
wrapper fixa a identidade; consultas desta auditoria só leem catálogos ou
agregados, não payload pessoal nem secrets. Backups permanecem fora do Git; o
manifesto público contém hashes/metadados, nunca dumps.

## Proteções do navegador e cache

HEAD anônimo em produção `/login`:200, HTTPS/HSTS fornecido pela plataforma, sem
CSP, CSP report-only, X-Frame-Options, nosniff, Referrer-Policy ou
Permissions-Policy no retorno amostrado. Não foi encontrado equivalente no
next.config/Proxy. Preview retornou302 da proteção Vercel com X-Frame-Options
DENY; isso não atesta o shell autenticado do aplicativo. Ver B7-006 P3:
hardening proporcional a decidir, sem XSS/clickjacking explorável comprovado.
Não recomendar HSTS adicional sem necessidade; a amostra já o fornece.

APIs do wrapper e callbacks Auth têm no-store/correlação no código; login
público tinha public, max-age=0, must-revalidate. Não houve dado autenticado
nessa resposta, portanto não se infere vazamento por cache a partir dela. Fonte
privilegiada não é importada pelos consumidores UI examinados; a prova de bundle
sem service key é reaproveitada da B4, sem fingir novo bundle remoto.

Cookies são operados pelo SDK SSR e browser Supabase; não houve novo login
remoto ou captura de cookie de sessão. O desenho com SDK browser precisa acesso
JS ao material de sessão; impor HttpOnly cegamente quebraria essa arquitetura.
Flags efetivas, TLS, duração, escopo e comportamento após revogação devem ser
homologados no fluxo escolhido, junto de B3-020/021/022. Não se declara ausência
de problema nem bypass somente pela opção padrão da biblioteca.

## Operação administrativa e limites da prova

Repo público, master desprotegida e rulesets vazios foram verificados, não
presumidos. Vercel tem proteção all_except_custom_domains, gitForkProtection
true e zero deploy hooks no metadado. Drains consultados: zero no projeto/equipe
da consulta; isso não elimina logs nativos nem prova ausência de observador
externo. MFA de contas de fornecedor, pessoas com acesso, expiração/rotação,
restrições de rede, política de backup e alertas recebidos exigem evidência
administrativa/operacional adicional. Não atribuir falha confirmada apenas
porque essa homologação não foi realizada.

A correção futura deve preservar least privilege, origem aprovada, HMAC,
no-store, hashes, autorização no banco/API e segregação por paciente. Não usar
novas plataformas como substituto desses controles ou fazer mudanças nesta fase.
