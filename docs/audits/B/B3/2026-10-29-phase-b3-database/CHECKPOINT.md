# Checkpoint B3

Estado: **B3.0–B3.12 e consolidação documental concluídos**.

| Etapa | Estado |
| --- | --- |
| B3.0 | Baseline e isolamento conferidos |
| B3.1 | Inventário e relações documentados |
| B3.2 | Cadeia e limites de drift documentados |
| B3.3 | 14 cenários Auth; 186 tentativas DML recusadas |
| B3.4 | Cinco cenários e matriz de contratos privilegiados |
| B3.5 | 12 cenários; duas falhas quantitativas novas |
| B3.6 | Nove cenários; hashes, rollback e cancelamento |
| B3.7 | 11 cenários; corte pode derivar BAL incorreto |
| B3.8 | 12 cenários forçados; janela de revogação identificada |
| B3.9 | Sete cenários rollback e matriz de progresso |
| B3.10 | Dez cenários API/Storage; limites de revogação |
| B3.11 | Cinco cenários, sete planos; completude/frescor revalidados |
| B3.12 | Nove cenários, 23 recortes e inventário de recuperação |
| Consolidação | 25 achados, matrizes e verificação documental reconciliados |

Retomar por `evidence/baseline.json`, `evidence/catalog.json` e esta pasta.
Árvore inicial limpa; nenhuma alteração funcional, remota ou de esquema.
Backup verificável fora do Git. Não executar reset, fixtures substitutivas,
correções nem reprodutores mutáveis antigos. Encerramento limitado a commit e
push documental autorizados na mesma branch. O SHA fica no Git e na entrega
da execução, sem autorreferência dentro do mesmo commit.

94 cenários, sete planos SELECT, 25 achados/32 campos. Checks seguros aprovados;
98 testes unitários.371 arquivos protegidos sem alteração e232 funções iguais.
Nenhuma linha original ausente; sete cabeçalhos avançaram por req.reminder
do cron já ativo, com backup/encadeamento/execução conferidos. Demais hashes
originais das 20 tabelas iguais. Servidor próprio3100 encerrado.

Replay/restore integral, remoto, provedor, humano e dispositivo permanecem não
comprovados. CI histórica failure identificada. NO-GO anterior preservado;
B4/C/D não iniciadas. Ver PACKAGE_INTEGRITY e checkpoint de consolidação.
