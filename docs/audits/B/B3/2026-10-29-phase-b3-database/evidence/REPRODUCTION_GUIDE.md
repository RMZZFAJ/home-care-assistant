# Reprodução e classificação dos auxiliares

Não executar todos os scripts. O estado privado contém IDs e credenciais
sintéticas fora do Git; reexecutar pode criar dados novos ou repetir cenários.
Usar Node24.22.0/npm11.21.1 e os guards do repositório na stack local existente.
Não selecionar remoto, não substituir fixtures, não usar reset/replay/seed.
As definições SQL são evidência, não migrations para aplicar.

## Somente leitura do ambiente

inspect.mjs captura catálogo/baseline e definições. Não o repetir para
sobrescrever a origem desta auditoria. preservation.mjs --after compara
hashes privados das linhas originais;--before foi executado uma vez e recusa
sobrescrita. preservation-explain.mjs extrai COPY do backup somente para
memória, sem destino de restore, e exporta apenas campos/contagens sanitizados.
b312-recovery.mjs consulta integridade agregada, funções e índice de backup;
não restaura, apaga ou altera objetos. Esses scripts requerem o contexto local
verificado e o estado privado original, sem exportar segredos ou payloads.

## Geradores documentais

analyze-chain, build-catalog, build-matrices, rpc-contracts, domain-matrices,
scenario-matrices, query-matrix, cross-layer-matrix, reconcile-matrices,
finding-register, final-evidence-matrices e csv são módulos .mjs que leem
fontes/evidências e escrevem somente nesta pasta. Geradores iniciais podem
substituir matrizes reconciliadas; não usá-los isoladamente como retomada.
Reconciliar depois e conservar os resultados coletados. Linhas geradas não
viram testes adicionais.

finish-artifacts.mjs formata prosa autoral e normaliza cópias textuais quando
necessário, guardando originais comprimidos e hashes. Não altera JSON bruto,
código funcional ou migrations. Cópias SQL perdem somente linhas vazias extras
adicionadas no fim pelo exportador; o corpo é comparado com catálogo exato.
MANIFEST registra blobs Git, evitando confundir
CRLF do checkout com LF do commit. validate-package.mjs e manifest.mjs podem
gerar relatórios/manifesto;--verify-only/--head apenas verificam quando
indicado.

## Mutáveis locais e fixtures com rollback

local-harness.mjs inicializa novas contas/pacientes/produtos fictícios e emite
sessões Auth oficiais. Credenciais ficam no diretório privado do usuário.
Não repetir initialize para substituir dados anteriores. Funções de negócio
usam RPC; preparações owner estão marcadas e não provam autorização de cliente.

b33*, b34*, b35*, b36*, b37*, b38*, b310*, b311-probe e b312-probe são
reprodutores
mutáveis com estado privado e dados novos. Não limpam dados depois. recorder
resume pula cenário já EXECUTED; esse status significa evidência coletada, e
não produto aprovado. Tentativas inválidas ficam separadas.

b39-progress/b39-leases, b311-plans, b312-history e b312-volume também preparam
dados novos, mas as fixtures indicadas são transações com rollback. Chamadas
auxiliares fora da transação podem criar COM/conta nova ou sessão. Ler arquivo
inteiro antes de qualquer execução. Simulação service SQL não é Auth HTTP.
b311-plans tem timeout30s e amostra100; a primeira tentativa1000 não concluiu.
b312-volume concluiu mil eventos documentais, um ensaio diferente do ledger.

concurrency-harness segura lock próprio em processo PostgreSQL e observa
pg_locks antes de liberar requisições Auth independentes. B38-06 comitou
deliberadamente revogação de membro B3; outros holders normalmente rollback.
Nunca deixar holder aberto. Não é prova de todas as ordens de deadlock.

http-client mantém cookies/JWT/URLs só em memória, com origem loopback fixada.
start-local-server compila em .next-e2e e abre somente3100 se livre, desativando
envio externo. O servidor próprio já foi encerrado com identidade/pai/porta
conferidos; Supabase anterior continua ativo. Não matar processos desconhecidos.

## Verificações oficiais

run-checks.mjs aceita apenas check:contracts, lint, lint:markdown, typecheck,
test
e build. O ambiente local desativa canais externos; teste unitário usa origem
care.example exigida pelos casos. Logs anteriores são arquivados antes de
repetição. Não executa test:db:prepare, migrations, integration ou e2e porque
seus runners/preparos substituem dados existentes ou usam fixtures não isoladas.
Essas suítes permanecem não executadas nesta B3, sem apagar os resultados A.

## Validar o pacote sem repetir cenários

Depois de todos os arquivos aprovados estarem selecionados no index Git:

```powershell
$b3Runtime = 'home-care-assistant/runtime/node-v24.22.0-win-x64/node.exe'
$b3Node = Join-Path $env:LOCALAPPDATA $b3Runtime
$b3Dir = 'docs/audits/2026-10-29-phase-b3-database/evidence'
& $b3Node "$b3Dir/manifest.mjs" --write --staged
& $b3Node "$b3Dir/validate-package.mjs" --staged
```

Após commit, manifest.mjs --head verifica hashes dos blobs HEAD. Para conferir
somente o pacote, sem gerar novo relatório, validate-package.mjs --head
--verify-only. Essas operações não executam nenhum reprodutor de negócio.

As exclusões autorreferentes são MANIFEST.sha256 e PACKAGE_INTEGRITY.json/.md.
O próprio manifesto não pode incluir seu hash, e os dois relatórios descrevem
sua validação. Todos os demais arquivos do pacote e o índice geral da Fase B
devem estar cobertos. O SHA do commit final fica no Git e na entrega da sessão,
sem tentar embutir autorreferência impossível dentro do mesmo commit.
