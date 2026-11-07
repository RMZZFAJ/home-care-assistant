# Reconciliação e aplicações remotas D-B

Projeto único autorizado: `qwfrqychokvhdzakibid`. Sem reset, seed ou remoção
de dados remotos. As 84 migrations históricas permanecem protegidas.

## Aplicação inicial — D-A

**PREFLIGHT EM ANDAMENTO; nenhuma aplicação nesta missão.** Baseline aa9f168:
121 arquivos locais e 113 versões remotas, sem versão desconhecida no
`migration list --linked`. Oito pendências confirmadas, na ordem:

1. `20261106040155_phase_d2_optional_recount.sql`.
2. `20261106073728_phase_d2_bilateral_transfers.sql`.
3. `20261106075328_phase_d2_preserve_bal_draft_recount.sql`.
4. `20261106161707_phase_d2_catalogue_successors.sql`.
5. `20261106181435_phase_d2_requisition_remaining_need.sql`.
6. `20261106185554_phase_d2_private_req_bal_drafts.sql`.
7. `20261106203000_phase_d2_private_bal_reference.sql`.
8. `20261106211500_phase_d2_selected_shift_dates.sql`.

Controles agregados anteriores: 8 usuários Auth, 6 perfis, 3 pacientes,
12 documentos operacionais, 8 REQs, 145 eventos documentais, 8 movimentos,
29 objetos Storage. Esses números não representam conteúdo ou aprovação.
Jobs `hca-notification-worker` e `hca-operational-lifecycle` estavam ativos.
Não foram alterados. Backup precisa incluir bytes Storage, Auth, schema,
histórico, documentos e custódias, fora do Git, com hashes e verificação de
recuperabilidade. Arquivo criado isoladamente não satisfaz o preflight.

Compatibilidade será confrontada com Vercel production SHA 8ec979a e preview
do candidato. Preflight, decisão de aplicação e pós-validação terão registros
separados, inclusive eventuais impedimentos e correções incrementais.

## Aplicação final — D-B

**NÃO INICIADA.** Exige implementação e testes locais, revisão de ACL/RLS/RPC,
novo preflight remoto, compatibilidade, backup pré-alteração e pós-validação.
Migrations aplicadas não substituem prova dos consumidores reais.
