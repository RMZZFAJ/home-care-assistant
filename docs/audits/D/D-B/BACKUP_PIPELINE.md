# OPS.2 — captura, retenção e recuperação de backup

**Base técnica implementada; backup operacional externo não está ativo.**
CLI real já capturou o remoto144 e produziu cópia cifrada/autenticada, restaurada
em isolamento e evoluída até145. A agenda permanece desligada. RPO24h/RTO8h são
alvos de homologação; segundos do probe não comprovam recuperação operacional.

## Consumidor e configuração

scripts/operations-backup.mjs integra captura remota read-only, arquivo
AES-256-GCM existente e destino filesystem. O índice de retenção tem HMAC com
chave derivada separada por domínio, escrita temporária/sync/rename e lock
exclusivo. Cada arquivo e manifesto continua autenticado/cifrado pelo formato
anterior. O índice contém apenas referências e contadores técnicos.

Configuração e chave256bits ficam em arquivos separados, absolutos, fora do
Git/destino e sem symlinks. Diretórios novos recebem modo700 ou ACL exclusiva
do operador no Windows. O consumidor não altera ACL de diretório já existente.
Não publicar configuração, chave, captura ou recibos privados em CI.

Exemplo de estrutura, para arquivo externo preparado pelo operador:

```json
{
  "format": "hca-operator-backup-v1",
  "root": "C:/LOCAL_PRIVADO/backups/store",
  "keyFile": "C:/LOCAL_PRIVADO/custodia/backup.key",
  "scheduleEnabled": false,
  "keepCriticalCapture": true,
  "source": {
    "project": "qwfrqychokvhdzakibid",
    "cliExecutable": "C:/LOCAL_PRIVADO/bin/supabase.exe",
    "profileFile": "C:/LOCAL_PRIVADO/config/profile-pointer"
  }
}
```

profileFile referencia um arquivo que contém o caminho absoluto do profile CLI
protegido. Usa CLI2.121.0 e verifica o projeto linked; não faz link, reset, seed,
alteração de Auth ou importação de roles no cluster. Argumentos não contêm a
chave de cifragem. Comandos aceitam somente --config-file e caminho externo:

```text
node scripts/operations-backup.mjs critical --config-file CAMINHO_EXTERNO
node scripts/operations-backup.mjs scheduled --config-file CAMINHO_EXTERNO
node scripts/operations-backup.mjs verify --config-file CAMINHO_EXTERNO
```

critical é execução manual extraordinária e preserva a cópia. scheduled é o
ponto de integração para um disparador futuro; scheduleEnabled=false não captura.
Não foi criado serviço, tarefa do Windows ou contratação externa. verify
autentica os arquivos retidos, sem afirmar restauração ou disponibilidade externa.

## Política7+4

A janela diária é02h30 em Brasília; atraso superior a24h permite recuperação
no próximo tick, sem fingir cópias de dias ausentes. Um slot por data impede
repetição. Mantém sete datas diárias e quatro semanas, com a primeira captura
real bem-sucedida de cada semana. O rótulo da semana não troca capturedAt.
Críticos são preservados separadamente e não sofrem poda automática.

Índice autenticado publica a nova cópia verificada antes de podar antigas. A
fila de poda também é autenticada; cada alvo deve ter UUID, envelope/hash
coincidentes e permanecer dentro da coleção archives. Recusa links, identidade
divergente e arquivo corrompido; registra retentionComplete=false e conserva a
fila para revisão. Falha não vira backup completo. Críticos/diagnósticos retidos
exigem acompanhamento de espaço, sem exclusão silenciosa de arquivos oficiais.

Após interrupção, lock não expira nem é removido por idade. O operador precisa
confirmar que a execução terminou e conciliar índice/recibos/captura antes de
desbloquear. verify permite consultar integridade sem iniciar captura. Essa
conciliação manual integra o procedimento D6; não há recuperação automática
de lock abandonado nem promessa de serviço contínuo.

Capturas em texto claro e restaurações são temporários privados do operador.
Captura scheduled bem-sucedida é removida com limite de caminho verificado.
Críticos podem preservar captura para preflight; falhas ficam em quarentena.
Isso não permite copiar esses temporários para destino externo sem proteção.
Somente archives é o contrato de arquivo cifrado para um adaptador futuro.

## Cobertura e consistência

Captura inclui banco/Auth/identidades, schema, migrations, RLS/grants/defaults,
metadados gerenciados, catálogo, dados, inventário e bytes Storage. Registra
definições de jobs e referências Vault; valores/chaves raiz de plataforma exigem
custódia/provisionamento separado. Chaves documental/VAPID usam seus procedimentos
e backups separados; este CLI não as encontra implicitamente no ambiente.

Snapshots antes/depois e oráculo Storage recusam drift estável ou bytes ausentes.
v2 registra hash integral e hash de projeção estável: somente campos nomeados de
clock/cursor/contadores são qualificados. Fingerprint, versão, instante da política,
causa/resolução da falha e todas as tabelas de negócio continuam exatos. Contagem
alterada nunca é aceita. Não há snapshot atômico distribuído DB/Storage.

O probe mantém compatibilidade v1 com suas duas qualificações originais. O
backup crítico pré145 usou v1 e passou por restauração/upgrade reais. Depois,
v2 passou em SQL local com mutantes negativos e consulta real das143 tabelas.
Um tick scheduled manual e único exercitou o caminho completo v2: captura remota
145, arquivo cifrado, um slot diário/semanal, verificação e restauração isolada
das143 tabelas/FKs. A configuração temporária foi removida; a permanente continua
desligada. [Evidência e limites](OPS_2_EVIDENCE.json).

## Homologação restante

Teste final9/9 cobre retenção/filesystem, concorrência, interrupção, corrupção,
índice/chave/link e projeções SQL. Datas/fonte da retenção são controladas;
não representam47 dias de serviço. A cópia crítica tem139 tabelas/FKs e a v2 tem
143; ambas conferem32 objetos,31 PDFs e zero emissão assinada ready na fonte.
Recuperação de chaves, destino
independente, agenda real, monitoramento de falha/atraso, capacidade e prova D6
com egress/cron em quarentena continuam necessários. Não há SLA ou suporte24h.
