# Base operacional D-B

**Implementação parcial.** A política aprovada é diária, sete diários e quatro
semanais, cópia antes de alterações críticas, RPO alvo24h e RTO alvo8h.
Não há agendamento diário ou monitoramento de incidentes implementado neste
incremento. O ensaio abaixo não aprova o gate operacional D6.

Atualização OPS.2: o [pipeline](BACKUP_PIPELINE.md) agora integra captura remota,
destino filesystem cifrado, sete slots diários/quatro semanais, críticos
preservados e recibos de falha. CLI real e restauração/upgrade isolados foram
exercitados. A agenda permanente continua desligada; não há backup operacional
externo ativo. Monitoramento persistente/consumidor técnico é o próximo lote.
[Evidência atual](OPS_2_EVIDENCE.json); as seções seguintes preservam os marcos
anteriores e seus limites específicos.

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

## Cobertura de emissões assinadas — OPS.1

O probe agora inclui private.pdf_issuances em state=ready, conferindo cada SHA
contra os bytes capturados. Intenções sem arquivo pronto não são inventadas
como artefatos recuperáveis. Um check to_regclass conserva compatibilidade com
backups anteriores à tabela privada. O recibo separa total de PDFs e emissões
assinadas conferidas. [Evidências](OPS_1_EVIDENCE.json).

Regressão SQL em banco isolado na stack existente passou: schema legado sem
tabela de emissão, ready ausente recusado, ready coincidente aceito, conteúdo
adulterado recusado e intenção incerta sem upload excluída da exigência de ready.
Usa digest de PDF sintético assinado real; não é restauração integral de dados
assinados de produção. Nenhuma tabela do banco operacional local foi alterada.

O backup cifrado original foi restaurado novamente em destino externo novo com
ACL do operador:122 conjuntos/digests estáveis, FKs,29 objetos e28 PDFs
conferidos; zero emissões assinadas nesse backup anterior à D-B. O banco isolado
foi removido, sem cron/pg_net.4,702s é duração do probe, não RTO operacional.
Chave permaneceu na custódia separada, sem cópia no repositório ou logs públicos.

## Limites e próximos consumidores

O fechamento D5.1 produziu novo backup extraordinário do remoto121 e ensaiou a
evolução até143:129 conjuntos estáveis/FKs,32 objetos,31 PDFs legados e nenhuma
emissão assinada ready na fonte. Pacote78 arquivos/9.289.109 bytes, cifrado e
autenticado, custódia separada e ACL do operador. O probe isolado levou8,639s e
foi removido, sem cron/pg_net. [Recibo e limites](D5_REMOTE_PREFLIGHT.json).
Esse resultado atualiza a prova pré-migration e não comprova agenda7+4, perda do
computador do operador, recuperação da chave ou restauração operacional D6.

O destino do preflight é independente do Supabase operacional, no equipamento
do operador. Isso não significa uma rotina externa diária ativa. Adaptadores
de captura/destino, agenda, retenção segura7+4, incidentes e observabilidade
ainda precisam de integração ao lote operacional desta missão. Serviços
externos permanecem desligados. Não há promessa de SLA, suporte24h ou detecção
de indisponibilidade total por verificadores internos à própria aplicação.
