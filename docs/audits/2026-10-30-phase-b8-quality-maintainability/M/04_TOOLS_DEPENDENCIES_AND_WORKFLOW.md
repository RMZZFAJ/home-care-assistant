# M5–M7 — Ferramentas, dependências e fluxo de desenvolvimento

## Inventário e revisão proporcional

[tool-review.json](../evidence/tool-review.json) descobre230 scripts nos
diretórios scripts/audits, por padrões de escrita, processo, destino remoto,
saída histórica e guards. Sinais são localizadores de revisão, sem equivaler a
230 scripts executados/revisados integralmente ou 230 riscos. Há 22 scripts na
raiz; provas A/B3/B7 de seus guards foram reutilizadas por identidade de código,
aprofundando os caminhos abaixo.

**Guards locais que devem permanecer.** Test-environment valida diretório,
project_id, label/workdir do container e portas loopback 54321/54322. Preparo
aplica migrations locais e pode reiniciar; não é readonly. Replay/clean exigem
opção explícita e backup com hash/identidade; seed usa Auth oficial e altera
fixtures. Run-e 2e substitui credenciais/configuração herdadas e inicia servidor
novo com envio externo desligado. Essas ferramentas não foram executadas
mutavelmente para investigar sua existência.

**Wrapper remoto.** Supabase-project fixa projeto/identidade e recusa flags de
troca/reset/repair. Isso limita destino, sem conceder autorização para toda
query ou db push. Comando login altera estado de autenticação; dry-run e
consulta são capacidades distintas. Nenhuma operação remota mutável ocorreu.

**Backup.** Helper gera dump/manifesto privado verificável; TOC não prova
restore conjunto de Auth/Storage/jobs. B7 já documenta limites e quarentena, sem
justificar novo restore ou cópia na B8.

**REPO-002.** Audit-catalogue, build-traceability e reconcile-database escrevem
em datas fixas. Inventory-ui também substitui inventário com base antiga.
Reconcile lê catálogos e usa wrapper, mas leitura remota não torna a gravação
histórica inocente. Verify-evolution-database chama seedFixtures antes de
executar SQL em rollback; seu nome verify não significa ausência de efeitos.
Saída explícita, SHA/data e recusa de sobrescrita são critérios futuros.

**REPO-003.** Meta-templates usa token como seleção implícita do ramo capaz de
upload/POST. Busca somente a primeira página 100, tem conta/app default e guarda
privada por prefixo lexical. Fonte fixa, redirect error e timeout são controles
reais; não substituem inspect separado de submit, paginação, normalização de
destino e autorização vigente. Não executamos o script.

**REPO-004.** Tar da verificação Linux exclui env e caches, sem .private ou
.venv. Montagem readonly não impede que a cópia carregue esses dados. A .venv
Windows instalada também não serve como ambiente Python Linux. Testar seleção
com sentinels sintéticos é suficiente; não ler/copiá-la para provar o risco. CI
checkout e preview Git não contêm os arquivos locais ignorados, contraprova
contra afirmar vazamento produtivo. UploadCLI deve revisar seu próprio ignore.

**Geradores de contratos.** Build-flow-contracts/build-meta-catalog produzem
artefatos de configuração/referência; não comprovam aprovação/publicação do
provedor. Os scripts históricos datados mantêm finalidade de reprodução e podem
conter operações Auth/SQL locais: ler seu método antes de executar, sem rodar
todo evidence como se fosse uma suíte de aceitação.

## Dependências e runtime

Há 31 dependências diretas:14 runtime e 17 desenvolvimento, fixadas no package e
lock. [Consumers](../evidence/dependency-consumers.json) registra referências
lexicais sem converter ausência em inutilidade. ReactDOM é dependência do
framework; @types tem consumo implícito; markdownlint-cli2 é bin do script.
Tailwind/Turbopack está na configuração CSS; Fluent, ZXing, Decimal, Supabase,
QR, PDF/fontkit, Sharp e Zod possuem consumidores. Nenhuma dependência foi
declarada removível só porque um import literal não apareceu.

Node24.22.0/npm11.21.1 são o conjunto do projeto. Global24.13.0 diverge; seleção
por processo preserva configuração permanente. Lock e instalações limpas
Windows/Linux já têm provas; não se repetiu npmci/build sem mudança.
Python3.13.12/.venv resolve PyMuPDF2.0/fonttools4.68.0 declarados em
requirements-audit.txt. Python é ferramenta documental, sem alteração de
package.json ou instalação global. Seleção explícita do VS Code foi suficiente.

B7 registrou três nós high de um advisory re2js em cadeia dev Markdown. É um
advisory com condição opt-in não alcançada nos consumidores examinados, sem
exploração/runtime demonstrados. Reutilizamos a triagem e o lock idêntico, sem
nova auditoria npm, auditfix ou atualização por preferência de versão. B7-007
permanece oportunidade proporcional, não três vulnerabilidades novas.

## Higiene, Git e navegação histórica

Arquivos privados, credenciais de fixture e dumps ficam fora do Git. Migrations
históricas permanecem imutáveis; novos ajustes futuros exigem incremento e
validação de instalação/upgrade conforme autorização. .venv não é versionada.
Git usa autocrlf; hashes portáveis desta auditoria normalizam apenas CRLF/LF,
mantendo identidade bruta local quando usada para preservação.

Auditorias A–B8 têm índices/checkpoints e achados com IDs, CSVs e referências. O
catálogo futuro evita copiar todos os JSONs antigos. A documentação do estado
atual precisa de ponte clara, sem eliminar a história. Relatórios temporários de
ferramenta não devem sobrescrever pacotes fechados por padrão.

Scripts npm permitem executar arquivo/filtro específico; Vitest/Playwright
descobrem testes sem exigir suíte completa. Na B8, os probes isolados não
iniciaram aplicação e bloquearam rede. Os testes reais de fluxo continuam
obrigados a usar o runner local verificado, com consentimento para dados.

Não foram criados PR, branch nova, merge, reorganização, integração, serviço,
stack ou dependência. Candidatos à limpeza/refatoração são insumos para C/D;
preservação, testes com oráculos fortes e instruções atuais precedem higiene
cosmética. Não há benefício demonstrado para reescrever o sistema.
