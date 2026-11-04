# Ambiente e preservação

## Destino conferido

Árvore inicial limpa, branch `audit/phase-b`, HEAD `896590e9…`, master
`34dcb835…`, origem da branch `896590e9…`. Diferença funcional desde
`37cb7f85…` vazia em src/supabase/tests/scripts/package/lockfile.
Valores completos em [baseline](evidence/baseline.json).

Projeto/container `home-care-assistant`/`supabase_db_home-care-assistant`,
labels de projeto/workdir validados pelo guard existente. API loopback 54321,
PostgreSQL loopback 54322, banco postgres, servidor 17.11, CLI 2.121.0.
Node 24.22.0 do diretório privado de runtime e npm 11.21.1 explicitamente;
o Node global 24.13.0 não é usado nos probes/checks B3.

O baseline registra 125 pacientes, 184 documentos, 587 movimentos, 53 contas
Auth e 209 objetos Storage. Somente contagens foram exportadas. São dados
anteriores a preservar; não foi autorizada sua substituição.

## Backup e efeitos externos

Novo pg_dump custom: 5.869.080 bytes, SHA-256
`28d6127b0e75086d40ab25471dadd0f0440edd2b42d7a37acb8d6ea6fe444ef4`.
Arquivo e manifesto em diretório privado do usuário fora do Git.
`pg_restore --list` aprovado. Não houve restauração integral; OPS-001 continua.

Dois jobs internos ativos, sem URL/bearer do worker no Vault e fila HTTP vazia.
Valores secretos não foram consultados/exportados. Não se altera cron/Vault.
RPCs podem gerar notificações internas sintéticas; não se chama provedor real.
Ensaios de jobs com alcance global exigem transação/rollback e verificação
de ausência de efeitos externos. Nenhuma limpeza de dados anteriores.

## Fronteiras não verificadas

Não há leitura ou alteração remota nesta fase. Configuração versionada local
não comprova Auth/RLS/cron/buckets remotos. Replay e restauração sobre a stack
existente são proibidos. Instalação limpa/evolução recebem análise e provas
históricas separadas, salvo ensaio descartável seguro posteriormente
documentado.

## Conferência final e avanço legítimo do cron existente

Snapshot privado comparou3.693 linhas originais de 20 tabelas:nenhuma ausente,
nenhum movimento/linha/evento histórico alterado. Sete cabeçalhos documentais
mudaram somente version, canonical_snapshot, content_hash e updated_at.
Comparação tipada com o backup reproduziu exatamente os hashes de antes;
cada cabeçalho recebeu um req.reminder de ator sistema, encadeado ao hash
anterior e correlacionado com execução bem-sucedida do cron já ativo.

O resultado é preservação da história com sete avanços legítimos da automação,
e não identidade byte a byte de toda a base. Nenhum dado foi restaurado ou
revertido para eliminar diferenças. Metadados Auth/contexto/saúde do cron
podem evoluir durante uso legítimo e não integram a afirmação de imutabilidade.
[Dados](evidence/data-preservation.json) e
[explicação](evidence/data-preservation-explanation.json) não exportam payload,
identificador original ou informação assistencial.232 funções permaneceram
iguais. Servidor local próprio3100 encerrado; stack Supabase anterior mantida.
