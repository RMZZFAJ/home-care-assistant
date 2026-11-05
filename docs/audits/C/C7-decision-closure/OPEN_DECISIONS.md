# Gates remanescentes e escopo das decisões

P02 está **OWNER_APPROVED**. SCI-001–SCI-005 e ANY familiar não aguardam nova
aprovação. [Política vinculante](SCIENCE_OWNER_REVIEW.md).

P03, P05, P07, P08, P09, P10, P13, P15, OPS-01 e PERF-01 **não impedem o
início geral de D0 nem trabalhos independentes de D1**. Bloqueiam somente os
ramos e homologações abaixo. Documentação completa não aprova o gate.

Abrir branch D exige integração prévia do PR 6 à master e autorização da
missão D. Esta C não faz merge e não inicia D.

## P03 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D6 — Recuperação e liberação operacional**.

Responsável define externamente fornecedores/custos; frequência, retenção,
destino, titular/substituto e perda/parada aceitáveis ainda precisam ser
fechados; 1h/4h não são promessa.

Prova/aceite: Pesquisa comercial externa pelo responsável com ChatGPT; ensaio
isolado, objetos/configuração/DB, quarentena e recuperação comprovada.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P05 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D2/D4/D6 — Procedimentos excepcionais e responsabilidades**.

Nomear pessoas/substitutos e definir segunda conferência/canais legítimos por
fato; regularização familiar e PDF posterior já aprovados.

Prova/aceite: Aceite humano do procedimento, autores distintos e nenhuma
assinatura em nome de ausente.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P07 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D2 — Substituição segura de devolução por transferência**.

Objetivo de UI simples preferencialmente ENT aprovado; equivalência/regressão
e aceite de retirada do caminho antigo permanecem gates.

Prova/aceite: Matriz de fatos, custódias, aceite pessoal e não duplicação de
movimentos; preservar UI antiga até prova.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P08 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D3/D4/D6 — Retenção e exclusão**.

Classes/finalidades, prazos, disputa e descarte precisam definição humana
pertinente; nenhum TTL de 90/180 dias aprovado.

Prova/aceite: Compatibilidade entre draft privado, arquivo pronto, documento
oficial, backup e preservação obrigatória.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P09 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D4 — Implementação e homologação da assinatura criptográfica**.

Assinatura incorporada do sistema é obrigatória;
perfil/certificado/cadeia/chaves/TSA/custos e condições operacionais ainda a
fechar externamente pelo responsável.

Prova/aceite: Pesquisa/contratação fora desta missão; prova de assinatura,
cadeia e bytes finais no candidato; hash/QR não substituem assinatura.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P10 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D6 — Homologação física**.

Quatro classes de aparelho aprovadas; modelos/OS/navegadores, participantes,
AT e impressão reais ainda a identificar.

Prova/aceite: Aceite por tarefas reais no mesmo SHA; emulação e documentação
não equivalem à homologação física.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P13 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D5/D6 — Alertas e monitoramento**.

Segregação técnica global/suporte aprovada; limiares, severidade, prazos,
titular/substituto/custos ainda a definir; pesquisa comercial externa.

Prova/aceite: Progresso/atraso observável, escalonamento testado e operação
acordada; nenhum SLO ou atendimento 24h inventado.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## P15 — OWNER_APPROVED_SCOPE_PENDING

Ramo: **D1/D4 — Revogação e transporte de arquivos**.

Revalidar comando após espera e barreira persistente aprovados; transporte de
novo download e janela residual exigem desenho/aceite específicos.

Prova/aceite: Negativas após revogação, incerteza de comando e limite de cópia
já entregue; TTL/proxy não presumidos como aprovados.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## OPS-01 — PENDING_OWNER

Ramo: **D5/D6 — Mecanismos legados de agendamento**.

Escolher retenção/aposentadoria e tratamento de períodos perdidos por
mecanismo; correção BAL por plantão não prova todos os legados.

Prova/aceite: Inventário de produtores/consumidores, 101+ regimes, catch-up e
alternativa verificável antes de desativar.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## PERF-01 — PENDING_OWNER

Ramo: **D1/D-LATER — Desempenho e metas de aceitação**.

Medir candidato e aprovar metas de volume/latência por superfície; nenhuma
meta ou prazo de serviço inventado.

Prova/aceite: Medição autorizada com RLS preservada; otimização não substitui
correção funcional ou aceite de UX.

Estado do gate: **NÃO APROVADO por este fechamento documental**.

## Contratações e decisões efetivamente humanas

Fornecedores, preços e condições comerciais P03/P09/P13 serão pesquisados
externamente pelo responsável com ChatGPT. Não houve pesquisa, recomendação
comercial ou contratação nesta missão. Não inventar valores, garantias ou
prazos de serviço. Somente escolha ainda não tomada recebe PENDING_OWNER;
objetivo aprovado com parâmetros pendentes conserva
OWNER_APPROVED_SCOPE_PENDING.

O17/O18 e ativação Meta/WhatsApp/Flows permanecem OWNER_DEFERRED. P01/P04/
P06/P11/P12/P14, direção visual e P02 já estão decididos nos limites
expressos.
