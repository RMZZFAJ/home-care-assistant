# Base operacional D-B

**Implementação parcial.** A política aprovada é diária, sete diários e quatro
semanais, cópia antes de alterações críticas, RPO alvo24h e RTO alvo8h.
Não há agendamento diário ou monitoramento de incidentes implementado neste
incremento. O ensaio abaixo não aprova o gate operacional D6.

## Implementado e exercitado

scripts/backup-archive.mjs oferece seal, verify e extract sobre diretórios
capturados explicitamente fora do repositório. AES-256-GCM por objeto, nonces
aleatórios, manifesto cifrado, hashes SHA-256, vinculação autenticada a backup
e caminho, escrita exclusiva e envelope final distinguem completo de interrompido.
Chave de256bits é fornecida separadamente, nunca gerada no Git ou incluída no
pacote. O preflight usou custódia local com ACL do operador. Recuperação dessa
chave após perda do computador ainda precisa de procedimento operacional D6.

verify-storage-capture.mjs confronta inventário, todos os bytes capturados,
tamanho, ETag de transporte quando disponível e SHA-256. ETag/MD5 é apenas
checksum legado de transporte; hashes de PDFs oficiais são confrontados com
o SHA-256 registrado no banco. Nenhum deles é assinatura digital.

restore-backup-probe.mjs autentica a cópia e extrai em destino externo novo.
Cria somente banco temporário de nome restrito no container local verificado,
restaura schema/data/Auth e metadados, verifica digests/FKs/Storage/PDF e remove
esse banco. Não importa roles no cluster, não habilita cron ou pg_net, não usa
o banco operacional como destino e não cria outra stack. A cópia de roles
integra o pacote para procedimento posterior de plataforma, sem importar
credenciais de conexão automaticamente.

Históricos gerenciados Auth/Storage e default privileges são capturados além
do dump selecionado, pois o CLI os omite. Estado atômico conjunto DB/Storage
em ambiente com gravações concorrentes exige reconciliação/quarentena própria;
o ensaio registrou somente dois controles de cron mutáveis entre snapshots,
sem divergência de fatos, identidades ou arquivos. Detalhes em [migrations](MIGRATIONS.md).

## Limites e próximos consumidores

O destino do preflight é independente do Supabase operacional, no equipamento
do operador. Isso não significa uma rotina externa diária ativa. Adaptadores
de captura/destino, agenda, retenção segura7+4, incidentes e observabilidade
ainda precisam de integração ao lote operacional desta missão. Serviços
externos permanecem desligados. Não há promessa de SLA, suporte24h ou detecção
de indisponibilidade total por verificadores internos à própria aplicação.
