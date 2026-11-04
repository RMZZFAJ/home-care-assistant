# B7.5 — Backup, recuperação e continuidade dos dados

## Inventário atual e alcance demonstrado

`evidence/backup-inventory.json` inspeciona somente arquivos existentes fora do
Git. Dezesseis dumps custom com manifesto conferem SHA-256 e header PGDMP. Há
mais um dump sem manifesto adjacente: não foi apagado nem aceito como backup
verificado. O conjunto com manifesto ocupa 53.303.231 bytes; isso não mede
crescimento produtivo nem consumo Storage. O mais recente é de 30/10/2026
11:08:45 no fuso de São Paulo, tem 6.403.958 bytes e corresponde ao backup B6.

O TOC mais recente foi relido: 2.093 entradas, 128 TABLE DATA, incluindo Auth
(users, identities, sessions, refresh_tokens, MFA), public/private, Storage
metadata, cron.job, cron.job_run_details e vault.secrets. Nenhum SQL arquivado
foi executado. TOC não valida conteúdo de cada linha, dependências da
restauração, credenciais do cluster nem disponibilidade do serviço Auth.

Dois pares schema/data remotos históricos de 25/10 foram conferidos por hash,
sem copiar conteúdo: 104 e 103 cabeçalhos COPY. Incluem usuários/identidades,
perfis, vínculos, políticas e metadados Storage. São dumps sequenciais de schema
e dados, não uma captura integrada com os bytes dos objetos. Não há COPY de
cron/Vault nesses pares examinados; isso não exclui configuração que pudesse ser
recriada por extensão ou mecanismo externo. A matriz diferencia formatos.

Consulta autenticada `backups list` do projeto associado: API acessível, região
us-east-1, PITR false, lista de backups vazia no instante observado. Não se
conclui que nunca houve backup, que existe SLA contratado ou que outro destino
off-site inexiste. Retenção/plano/cobrança, cofre externo e política de produção
permanecem não comprovados. Nenhum backup novo ou restore foi feito.

## O que um dump de banco não recupera sozinho

Os bytes de anexos, PDFs e avatares estão fora do pg_dump. A documentação
oficial também distingue metadados Storage de seus objetos. [Supabase
Backups](https://supabase.com/docs/guides/platform/backups). Roles/tablespaces
globais não são cobertos pelo pg_dump de uma base; há dependência do destino e
da plataforma. [PostgreSQL 17
pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html).

Auth no banco não transporta automaticamente Site URL, SMTP/OAuth/SMS,
emissor/chaves, configurações de JWT e políticas da plataforma. Restaurar
sessões antigas pode reintroduzir estado que já tinha sido revogado; o corte
temporal e a invalidação precisam ser deliberados. Vault guarda ciphertext:
linha presente não demonstra acesso à chave de decriptação no novo destino.
Segredos Vercel, credenciais Meta, templates aprovados, Flow publicado, DNS,
retenção de logs e papéis de conta também exigem recuperação separada.

No local existem 199 renders, 12 evidências e cinco avatares em metadados
Storage. A B6 já mostrou que registro ready não prova objeto íntegro, e cache
PDF recuperado hoje não compara novamente seu hash (B6-011). Não sobrescrever
originais ou afirmar fidelidade de bytes a partir apenas de evento canônico.
Reaproveitar essas provas; não gerar/baixar PDFs de novo na B7.

## Risco específico ao recuperar jobs

O dump custom inclui cron.job ativo e Vault. O invocador usa URL/bearer
recuperados para efetuar HTTP; o lote de negócio também pode rodar ao abrir o
banco. Sem quarentena, restaurar esses componentes em um destino capaz de
alcançar o endpoint antigo pode iniciar trabalho antes da reconciliação. O risco
depende de scheduler habilitado, segredo decriptável e rede disponível; não foi
realizado restore nem envio indevido. É B7-004, causa operacional específica
relacionada à dependência OPS-001/B3-014, sem duplicar a ausência de ensaio
integrado como descoberta nova.

Restaurar outbox anterior ao aceite Meta pode reenviar mensagem já aceita, mesmo
quando o banco considera pending. Idempotência interna não desfaz um efeito
externo. B5-013/014 agravam correlação/conciliação; os identificadores do
provedor e a tentativa devem ser preservados antes da retomada.

## Ensaio futuro proposto — não executado

1. Obter autorização para destino descartável isolado, responsável técnico,
   janela, descarte posterior e dados permitidos. Não usar a stack atual nem
   criar projeto remoto por inferência. Registrar RPO/RTO/retenção pretendidos
   como decisões, não números inventados pela auditoria.
2. Identificar incidente, ponto de corte, SHA/schema/configuração e custódia do
   backup. Validar hashes, manifestos, versões e existência do material
   necessário. Guardar backup posterior do destino se ele tiver qualquer dado a
   preservar.
3. Preparar destino sem egress a provedores, cron/pg_net impedidos antes da
   restauração e sem URLs/bearers operacionais. Registrar esse bloqueio como
   pré-condição verificável; desabilitar o canal só na UI não basta.
4. Instalar versões/extensões/roles compatíveis. Restaurar banco por
   procedimento suportado pelo destino, preservando Auth e schemas de negócio.
   Conferir falhas e pós-condições; não aplicar restore por cima da base
   operacional.
5. Restaurar objetos em buckets privados com caminhos/versões/bytes preservados;
   comparar inventário, tamanho e SHA-256. Relacionar documento, evento, versão,
   renderer, anexo, hash e objeto. Separar órfão, ausente e divergente sem
   apagar.
6. Recuperar configuração Auth, chaves, Vault e demais segredos por cofre
   próprio; atualizar referências ao novo destino sem expô-las em log. Conferir
   políticas, redirects, usuário global, vínculos, escopos e sessões revogadas
   após o corte.
7. Conferir ledger e trânsito, protocolos/sequências, eventos/hash chain,
   catálogo, identidades Auth/perfis/vínculos, últimas contagens e revisão do
   estoque. Não reconstruir saldo por suposição nem apagar eventos para fechar
   diferenças.
8. Reconciliar outbox/tentativas, accepted/uncertain/hold/leases, callbacks e
   fatos físicos posteriores ao corte. Cruzar referências com provedor sem
   reenvio automático. Preservar incerteza até decisão autorizada.
9. Validar jornadas por papel e paciente, versões/PDF/anexo, autorização após
   revogação e procedimentos humanos. Medir tempo até serviço mínimo e total,
   perda de dados observada e esforço de reconciliação; comparar ao RPO/RTO
   aceito.
10. Retomar primeiro leitura e operações essenciais aprovadas; scheduler/worker
    somente após atestado de reconciliação, destino/configuração corretos e
    acompanhamento de backlog. Reativar canais por capacidade/paciente conforme
    decisão; comprovar progresso sem duplicação. Registrar aceite e
    aprendizados.

## Critérios de sucesso e responsabilidades

Backup íntegro e acessível sob perda da máquina original; acesso mínimo,
criptografia/isolamento e retenção aceitos; recuperação de DB/Auth/objetos/keys;
zero lacunas inexplicadas de hash/identidade; jobs mantidos em quarentena; fatos
externos conciliados; RPO/RTO medidos; donos e substitutos treinados. A matriz
CSV registra exatamente a prova e a lacuna de cada componente.

Responsável do produto decide tolerância e continuidade; operador de backup
confere execução/custódia; responsável técnico executa o ensaio autorizado;
família/equipe validam fatos físicos. Estas atribuições são propostas para
aceite, não cargos já nomeados. OPS-001 permanece aberto. A B7 não declara
restore aprovado, recuperabilidade integral ou GO.
