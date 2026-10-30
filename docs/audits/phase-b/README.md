# Fase B — aprofundamentos especializados

Branch única local e remota: `audit/phase-b`. Todos os subgrupos futuros da
Fase B devem continuar nessa branch. `master` permanece na base documental A.
A criação de novos grupos depende da autorização correspondente.

## Estado atual

- B1.1–B1.8: investigação concluída, sem correções de produto.
- B2.0–B2.10: investigação de processos concluída, sem implementação.
- B4.0–B4.12: investigação de backend/APIs concluída em 30/10/2026,
  sem correções. 61 métodos HTTP, 77 cenários dirigidos e 13 registros;
  dez P2/três P3, com causas novas, relacionadas e herdadas discriminadas.
  NO-GO anterior preservado; B5/C/D não iniciadas.
- [Executivo B4](../2026-10-30-phase-b4-backend/17_GROUP_B4_EXECUTIVE_ASSESSMENT.md).
- [Índice B4](../2026-10-30-phase-b4-backend/README.md).
- [Achados B4](../2026-10-30-phase-b4-backend/14_FINDINGS_MASTER.md).
- [Insumos B4 para C](../2026-10-30-phase-b4-backend/18_PHASE_C_DECISION_HANDOFF.md).
- B3.0–B3.12: investigação de banco/autorização concluída em30/10/2026,
  sem correções.94 cenários locais;25 achados,com16 recortes herdados e nove
  observações/mecanismos adicionais. NO-GO anterior preservado.
- [Executivo B3](../2026-10-29-phase-b3-database/17_GROUP_B3_EXECUTIVE_ASSESSMENT.md).
- [Índice B3](../2026-10-29-phase-b3-database/README.md).
- [Achados B3](../2026-10-29-phase-b3-database/14_FINDINGS_MASTER.md).
- [Transferência documental B3](../2026-10-29-phase-b3-database/18_PHASE_C_DECISION_HANDOFF.md).
- [Executivo
  B2](../2026-10-29-phase-b2-processes/16_GROUP_B2_EXECUTIVE_ASSESSMENT.md).
- [Índice B2](../2026-10-29-phase-b2-processes/README.md).
- [Achados B2](../2026-10-29-phase-b2-processes/13_FINDINGS_MASTER.md).
- [Decisões pendentes para
  C](../2026-10-29-phase-b2-processes/17_PHASE_C_DECISION_HANDOFF.md).
- [Índice B1](../2026-10-28-phase-b1-interface/README.md).
- [Achados B1](../2026-10-28-phase-b1-interface/12_FINDINGS_MASTER.md).
- [Transferência](../2026-10-28-phase-b1-interface/15_CROSS_GROUP_DEPENDENCIES_AND_PHASE_C_HANDOFF.md).
- [Entradas originais da Fase
  A](../2026-10-25-production-readiness/inputs/README.md).

O histórico inclui o commit temporário do responsável, o encerramento B1 e
os checkpoints antigos. Os snapshots antigos são preservados por ancestralidade,
sem reaplicar versões anteriores de código ou migrations. Não há PR aberto
por esta reorganização nem merge na `master`.

## Ferramentas locais

As verificações JavaScript/Markdown continuam usando Node/npm do projeto.
Os scripts Python documentais usam ambiente virtual local com dependências
fixadas em `requirements-audit.txt`:

```powershell
uv venv --python 3.13 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements-audit.txt
```

No VS Code, selecionar o interpretador `.venv` do workspace. O ambiente não é
versionado. Isso resolve os imports reais de PyMuPDF/fonttools, mantendo
Pylance e as validações habilitados. A instalação não executa os reprodutores
mutáveis de banco nem regenera capturas ou resultados históricos.

Markdown permanece validado. Colchetes literais em rotas e exemplos são
escapados para não serem interpretados como referências. Tailwind continua
validando o código; fragmentos documentais Markdown são tratados como texto,
evitando analisar excertos truncados como se fossem componentes ativos.

O projeto usa PostgreSQL. A extensão SQL Server removida precisa encerrar seu
serviço na reinicialização do VS Code; seus diagnósticos T-SQL não devem ser
usados para alterar migrations PostgreSQL históricas.
