# B7.1 — Topologia e ambientes

## Cadeia efetiva

Navegador chama Next.js App Router/Proxy na Vercel; sessão é validada no
Supabase Auth. PostgREST/RPC e PostgreSQL decidem autorização por paciente,
documentos e ledger. Storage privado contém anexos, PDFs derivados e avatares.
Realtime invalida leituras; reconexão/consulta periódica compensam sinais
perdidos. pg_cron executa lifecycle no banco e solicita o worker Next por
pg_net, URL e bearer no Vault. Meta recebe mensagens somente após habilitação
explícita e configuração válida. Não existe worker residente separado.

O inventário CSV identifica responsabilidade, dependência, ambiente, falha,
verificação, recuperação e dono sugerido. PostgreSQL/Auth/Next são pontos
centrais dos processos autenticados; Storage é necessário para evidências e
comprovantes. Meta, Flows, OAuth, SMS, transcrição e e-mail operacional não
devem ser tratados como disponibilidade implícita do núcleo.

## Ambientes confrontados

- **Desenvolvimento**. **Identidade verificada:** Labels, workdir, API 54321 e
  DB 54322. **Isolamento demonstrado:** Projeto local único. **Limite:** Não é
  ambiente operacional.
- **Teste dirigido B7**. **Identidade verificada:** Mesmo projeto, transações
  somente leitura. **Isolamento demonstrado:** Sem fixture/reset/login.
  **Limite:** Cron anterior continua ativo.
- **CI banco**. **Identidade verificada:** Código do workflow, runners efêmeros.
  **Isolamento demonstrado:** Banco local por job. **Limite:** Evidência
  histórica por SHA.
- **CI navegador**. **Identidade verificada:** Banco próprio em cada job Linux.
  **Isolamento demonstrado:** Credenciais fictícias e canais desligados.
  **Limite:** Emulação, não aparelho real.
- **Preview Vercel**. **Identidade verificada:** Projeto/equipe e SHAs por GET.
  **Isolamento demonstrado:** URL/proteção distintas. **Limite:** Separação de
  dados não comprovada.
- **Produção Vercel**. **Identidade verificada:** Deploy 34dcb83 READY por
  metadado. **Isolamento demonstrado:** Target production. **Limite:** READY não
  prova processos ou schema.
- **Supabase associado**. **Identidade verificada:** Doctor RMZZFAJ, ref
  qwfrqychokvhdzakibid. **Isolamento demonstrado:** Destino administrativo
  fixado. **Limite:** Não certifica separação preview/produção.

`docs/ARCHITECTURE.md` e `docs/DEPLOYMENT.md` descrevem reutilização do remoto
no preview. A listagem atual confirma as mesmas classes de variáveis em Preview
e Production, mas omite seus valores. Há risco sustentado de partilha conforme o
desenho documentado; não se afirma que um preview leu/escreveu dados reais nesta
auditoria. URLs diferentes e proteção Vercel não isolam o banco. A decisão
futura deve escolher projeto/credenciais/dataset e impedir uso operacional de
preview com poderes incompatíveis.

## Guardas preservadas

- `scripts/test-environment.mjs:15`: projeto TOML, labels e workdir do
  container.
- Mesmo helper, linhas 60–96: status em memória, host loopback e portas exatas.
- `scripts/prepare-test-database.mjs`: verifica antes de `migration up --local`.
- `scripts/e2e-environment.mjs`: sobrescreve configurações herdadas e desliga
  notificações/Flows; servidor próprio não reaproveita origem desconhecida.
- `scripts/supabase-project.mjs`: fixa identidade, projeto e perfil; rejeita
  overrides de destino, reset remoto e repair. Não é sandbox para SQL
  arbitrário.
- Replay exige consentimento e backup correspondente; B7 não o executou.

## Contraditório e aceitação

Hipótese de fixture remota pelo runner oficial refutada pelas guardas e pelo
reuso dos testes locais existentes. Um operador ainda pode chamar CLI/SQL fora
do wrapper; a regra de operação e permissões de conta continuam necessárias. Não
executar `meta-templates.mjs` como consulta: REPO-003 já cobre seu efeito
mutável. Não executar o export Linux: REPO-004 já cobre `.private`.

Antes de operação: conferir projeto, conta, origem, chave pública e identidade
do serviço em cada ambiente; demonstrar que Preview não modifica dataset
operacional; definir o que fica ligado; registrar dono e procedimento de
contingência. As condições não foram configuradas nesta fase.

Evidência: `evidence/baseline.json`, `evidence/remote-baseline.json`, metadados
de variáveis e arquivos de origem acima. Consulta remota de dados de pacientes e
homologação de operação permanecem fora deste recorte.
