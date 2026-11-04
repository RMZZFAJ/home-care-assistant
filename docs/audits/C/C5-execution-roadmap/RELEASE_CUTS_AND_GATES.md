# Corte de release e gates verificáveis

Primeiro corte pretendido: REQ/COM/ENT/BAL/estoque completos, identificação e
acesso de profissional/família/admin local, escala multi-dia/recorrências,
PDFs fiéis/verificáveis, draft durável, PWA/Web Push e contingência. A
existência
do plano não torna esse corte apto. Nenhum deploy ou GO foi realizado em C.

<!-- c-table:start -->

- **Gate:** G0 — autorização/destino

  **Condição e prova do candidato:** Branch/SHA/ambiente/escopo atual, dados
  reais separados, backups e privilégios conferidos; P04

  **Quem aceita:** Responsável + operador.

- **Gate:** G1 — P1

  **Condição e prova do candidato:** C-AC-009 e 049 passam com controles
  negativos e read-back; nenhum bloqueador terminal impede progresso

  **Quem aceita:** Engenharia/QA + usuário de escala.

- **Gate:** G2 — domínio/segurança

  **Condição e prova do candidato:** Causas centrais aplicáveis e CAPs
  completos; RPC/RLS/Auth real, precisão, concorrência, recebedor e sucessão

  **Quem aceita:** Engenharia + operação.

- **Gate:** G3 — edição/UX

  **Condição e prova do candidato:** Pendências antigas, estados e
  recuperação, rascunho entre aparelhos; teclado/reflow/AT, linguagem e
  contexto

  **Quem aceita:** Usuários P10 e acessibilidade.

- **Gate:** G4 — documentos

  **Condição e prova do candidato:** Campos por tipo/estado, B6-007/008,
  bytes/cache/exemplar, oráculo em branco, impressão/AT ou alternativa
  completa aceita

  **Quem aceita:** Responsável documental + QA/participantes.

- **Gate:** G5 — canais iniciais

  **Condição e prova do candidato:** Auth e-mail confirmação/recuperação e
  PWA/push reais autorizados; in-app completo; Meta/Flows claramente
  desligados

  **Quem aceita:** Operação + titulares participantes.

- **Gate:** G6 — recuperação

  **Condição e prova do candidato:** Restore conjunto isolado, cron/egress em
  quarentena, reconciliação e RPO/RTO medidos/aprovados; P03/P05/P13

  **Quem aceita:** Dono/substituto DR + responsável.

- **Gate:** G7 — artefato/schema/config

  **Condição e prova do candidato:** Gates Linux/Windows,
  contratos/lint/Markdown/tipos/unit/build, clean/legacy/integration e três
  projetos browser do candidato; compatibilidade e rollback

  **Quem aceita:** Engenharia/QA/release.

- **Gate:** G8 — aceite final

  **Condição e prova do candidato:** Participantes, aparelhos,
  rede/AT/impressão, guias/onboarding e riscos residuais registrados; nenhum
  pendente obrigatório disfarçado

  **Quem aceita:** Responsável pelo produto/operação.

<!-- c-table:end -->

O check agregado de banco/navegadores não substitui validate de código. Falha,
skipped, ausente ou execução de outro SHA não promove candidato. Correção de
harness preserva asserções e casos; não excluir o cenário intermitente. Não
usar testes de estrutura PDF como prova de conteúdo. Documento pós-check não
exige repetir testes funcionais se o produto não mudou, mas candidato final
precisa atestado inequívoco da mesma base funcional/schema/configuração.

## Ativação e recursos diferidos

Preservar flags reais NOTIFICATIONS_EXTERNAL_ENABLED e META_FLOWS_ENABLED
desligadas até autorização/homologação específicas. Flags novas para ciência,
draft/push ou interface simplificada são propostas técnicas e não existem por
força deste texto. Ativar por paciente/capacidade/aparelho só após prova;
rollback
de flag não apaga evento confirmado. Legado de lembretes só pode ficar fora
se houver desativação verificável e alternativa que cubra a obrigação.

Supervisão/leitor específicos podem aguardar, mas política BAL que os exige
precisa ser atendida ou alterada legitimamente. Não remover funcionalidade
existente para simular menor escopo. O17/O18 aguardam evolução. Assinatura
criptográfica adicional P09 não bloqueia núcleo de comparação de bytes se esse
ramo atender ao resultado aprovado. Headers/advisory/otimização P3 exigem
triagem,
dono e risco residual explícito, sem atualização indiscriminada.

## Estratégia de PR/CI e parada futura

PRs pequenos por contrato/lote, com problema concreto, resultado, invariantes,
testes discriminantes e migração/compatibilidade. Nada de PR nesta C. CI usa
fixtures fictícias e stack local do runner; ambiente real não recebe
seed/reset.
Migrations novas têm review de ACL/RLS/definer e clean/legacy no marco. Branch
protection/atestado de release são mudanças D autorizáveis, não configuração
alterada silenciosamente em C.

Parar expansão se há saldo divergente, autoria indevida, perda documental,
pendência essencial inacessível, envio incerto não conciliado,
incompatibilidade
de schema, restore sem prova ou gate reprovado. Conter novas operações do
ramo,
preservar fatos e aplicar rollback compatível/forward fix; não restaurar
backup
sobre operação existente por conveniência. Liberação gradual tem dono, escopo
e critério de parada; não há percentual fictício de prontidão.
