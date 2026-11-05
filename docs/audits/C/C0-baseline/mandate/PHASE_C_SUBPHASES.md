# FASE C — PLANO GRANULAR DE EXECUÇÃO C0–C6

Guia complementar da Ordem Mestre | Para uso integral na mesma conversa do
Codex

**Status:** planejamento autorizado, implementação funcional reservada para a
futura D.
**Referências iniciais:** `PHASE_C_MASTER_ORDER.md` e
`PRODUCT_DECISIONS_MASTER.md` na raiz, movíveis/renomeáveis pelo Codex.
**Objetivo:** entregar projeto integral, pronto para aprovação e implementação
posterior, sem executar nenhuma mudança de produto.

A Fase C **não é mais uma auditoria da Fase B**. Toda releitura de evidência
deve responder a um requisito concreto de consolidação, decisão ou
especificação. O conteúdo das auditorias históricas deve ser acessível, não
copiado de novo integralmente.

## 0. Estrutura de resultados proposta

```text
docs/audits/C/
  README.md # índice, estado da fase, diferenças entre AS_IS e TO_BE
  CHECKPOINT.md                 # progresso real e retomada
  C0-baseline/
    ENVIRONMENT_AND_GIT_BASELINE.md
    INPUTS_PROVENANCE.csv
    DOCUMENTATION_MIGRATION_INVENTORY.csv
  C1-consolidation/
    FINDINGS_165_SOURCE_CROSSWALK.csv
    CAUSE_FAMILIES_MASTER.csv
    CAUSE_FAMILIES_MASTER.md
    PRIORITY_AND_RELEASE_GATES.md
    INTERDEPENDENCY_GRAPH.md
    UNVERIFIED_AND_HOMOLOGATION.md
  C2-decisions/
    PRODUCT_DECISIONS_MASTER.md
    DECISIONS_REGISTER.csv
    HUMAN_DECISIONS_REVIEW.md
    DECISION_CONFLICTS.md
    GLOSSARY_AND_NONNEGOTIABLE_RULES.md
  C3-functional-specification/
    README.md
    PERSONAS_PERMISSIONS_AND_ACTORS.md
    SCREEN_FIELD_ACTION_INVENTORY.csv
    UI_STATES_AND_MICROCOPY.md
    REQ.md
    COM.md
    ENT.md
    BAL.md
    SCHEDULES_AND_STAFFING.md
    STOCK_AND_CUSTODY.md
    CATALOGUE_AND_PRESENTATIONS.md
    CONSUMPTION_AND_OCCURRENCES.md
    IDENTITY_ACCESS_MEMBERSHIPS.md
    PWA_PUSH_AND_NOTIFICATIONS.md
    DOCUMENTS_PDFS_AND_INTEGRITY.md
    ADMINISTRATIVE_OPERATIONS.md
    USER_GUIDES_BLUEPRINT.md
    HUMAN_JOURNEYS_AND_EDGE_CASES.md
  C4-technical-design/
    README.md
    CHANGE_IMPACT_MATRIX.csv
    DATA_API_UI_EVENT_CONTRACTS.md
    MIGRATION_COMPATIBILITY_PLAN.md
    SECURITY_PRIVACY_AND_TRACEABILITY.md
    PWA_PUSH_DELIVERY_ARCHITECTURE.md
    PDF_VERIFICATION_ARCHITECTURE.md
    DRAFT_PERSISTENCE_AND_CONCURRENCY.md
    FAILURE_RECOVERY_AND_IDEMPOTENCY.md
    ARCHITECTURAL_DECISIONS.md
  C5-execution-roadmap/
    PHASE_D_WORK_PACKAGES.md
    DEPENDENCY_SEQUENCE.csv
    RELEASE_CUTS_AND_FEATURE_FLAGS.md
    ENVIRONMENT_AND_BACKUP_DECISIONS.md
    PR_AND_CI_STRATEGY.md
    USER_ACCEPTANCE_AND_HOMOLOGATION_PLAN.md
  C6-acceptance-handoff/
    ACCEPTANCE_CRITERIA_MASTER.csv
    REGRESSION_PLAN.csv
    GO_NO_GO_GATE_MATRIX.md
    DOCS_RELOCATION_REPORT.md
    SOURCE_OF_TRUTH_INDEX.md
    PHASE_C_FINAL_EXECUTIVE_REPORT.md
    PHASE_D_IMPLEMENTATION_HANDOFF.md
    OPEN_OWNER_DECISIONS.md
```

A lista representa **cobertura de conteúdo**, não obrigação de criar uma
centena de arquivos. É permitido consolidar arquivos correlatos, desde que
índices e critérios permaneçam acessíveis. Arquivos CSV longos devem ter
colunas mínimas para manter rastreabilidade; não duplicar texto integral de
relatórios B. `docs/audits/D/README.md` será apenas reserva de estrutura.

---

## C0 — BASELINE, CONTEXTO E PLANO DE MIGRAÇÃO DOCUMENTAL

## Perguntas a responder

- Em qual branch, commit e árvore estamos?
- Qual é o produto funcional auditado versus commit apenas documental?
- Há mudanças locais ou arquivos do usuário não comitados?
- Quais são os documentos vigentes e históricos? O que depende dos caminhos
  atuais?
- Quais referências externas, relatórios, manifestos, scripts e testes usam
  `docs/audits/` ou docs ativos?

## Atividades

1. Conferir projeto, HEAD, `master`, diff da branch, estado Git; não
   manipular sessão em execução de outra IA.
2. Fazer inventário de conteúdo `docs/` e arquivos Markdown da raiz; capturar
   antigo path, função, público, época, SHA/bytes para material evidencial,
   links internos/externos e consumidores.
3. Criar classificação preliminar `CURRENT`, `HISTORICAL_A`, `HISTORICAL_B`,
   `HISTORICAL_PRE_A`, `ACTIVE_REFERENCE`, `DUPLICATE`, `ARCHIVE_CANDIDATE`,
   `DELETE_CANDIDATE`, `UNKNOWN`.
4. Identificar pontos de risco: referências relativas de `../../src`, scripts
   com caminhos antigos, índices GitHub, manifesto de artefato, documentos
   referenciados fora do repositório, instruções antigas de autorização e
   arquivos que possuem valor probatório.
5. Registrar caminho de migração proposto e guardas; não mover sem
   inventário.
6. Abrir `CHECKPOINT.md` de C com progresso, limitações e SHA de trabalho.

## Critério de conclusão

Baseline reproduzível, 100% dos caminhos documentalmente afetados
inventariados por árvore, impossibilidade de confundir código funcional e
relatório B, plano de migração seguro.

---

## C1 — CONSOLIDAÇÃO CAUSAL E PRIORIZAÇÃO REAL

## Entradas

A `FINDINGS_MASTER`, B1–B8 `FINDINGS_MASTER`, handoffs e aceites, B8
`REGRESSION_COVERAGE_MATRIX.csv` de 119 famílias/156 IDs anteriores.
**Esperado: 165 IDs de registro bruto**; verificar e explicar divergência sem
inventar registro.

## Algoritmo de raciocínio

1. Importar cada ID original: texto, evidência, confiança, natureza,
   prioridade, estado e fonte (referência relativa real atualizada após
   migração).
2. Discriminar: `DEFECT_CONFIRMED`, `SUPPORTED_RISK`, `MISSING_CAPABILITY`,
   `QUALITY_GAP`, `DECISION_NEEDED`, `NOT_HOMOLOGATED`,
   `IMPROVEMENT_OPTIONAL`, `REFUTED`.
3. Identificar equivalências de mesma causa, não apenas palavras semelhantes.
   Explicar causa comum e por que registros diferentes pertencem à mesma
   família.
4. Identificar **dependências relacionadas mas independentes**. Ex.: banco
   não emite atualização e interface não refaz leitura são duas causas
   complementares; não juntar artificialmente.
5. Criar ID único `C-CAUSE-###`, preservando todos os IDs A/B relacionados
   como referências originais.
6. Atribuir duas dimensões: prioridade da falha e **bloqueio de lançamento
   conforme o escopo do usuário** (`BLOCKS_FIRST_RELEASE`, `GATED_BY_FEATURE`,
   `CAN_DEFER`, `REQUIRES_HOMOLOGATION`, `OWNER_DECISION`).
7. Distinguir resolução por mudança de código, contrato de produto,
   configuração, procedimento, documentação ou homologação.
8. Marcar pré-requisitos e outras causas que podem desaparecer após corrigir
   a mesma origem; ainda assim exigir regressões nos consumidores afetados.

## Obrigatórios

- Dois P1 herdados não encerrados: escala informada e starvation da REQ.
- Verificar B6 PDF e B8 teste em branco; B7 CI/release; B3 Auth/RLS/ledger;
  B2 rotas de exceção; B5 riscos do canal diferido.
- Reconciliar papéis e semântica ENT vs transferência e ciência sem falsear
  eventos.
- **Nenhum ID esquecido**; cobertura original 165/165 no inventário.

## Critério de conclusão — C1

Cada ID original mapeia uma única vez como entrada, com manifestações diversas
quando pertinentes, e cada causa consolidada tem consequência, evidência,
decisão e teste futuro. Contagem de causas real, não soma de títulos.

---

## C2 — DECISÕES APROVADAS, PROPOSTAS E GOVERNANÇA

## Entradas — C2

`PRODUCT_DECISIONS_MASTER.md`, C1, handoffs e contratos atuais. Não confiar em
documentação antiga de autorização de banco/deploy.

## Atividades — C2

1. Registrar DEC-001–030 e O01–O20. Preservar as expressões de intenção do
   proprietário.
2. Identificar conflitos semânticos reais: ENT recebedor indelegável versus
   confirmação bilateral de transferência; ciência tácita na emissão versus
   comprovação efetiva de acesso; profissional escalado versus autorizado;
   encerramento administrativo versus confirmação física; COM inferior versus
   estado parcial.
3. Resolver por contratos coerentes quando a decisão vigente já oferece regra
   suficiente; caso exija escolha humana nova, marcar PENDING_OWNER.
4. Criar pacote de decisões em linguagem leiga: pergunta, alternativa,
   consequências, recomendação, status e impacto no lançamento. Não fazer
   perguntas durante execução salvo bloqueio impossível de contornar; concluir
   C com plano condicional.
5. Aprovar apenas em documentação decisões explicitamente feitas;
   recomendações do Codex são propostas, não escolhas presumidas.
6. Definir glossário de fatos: solicitado/observado, informado/confirmado,
   expedido/recebido, contagem/reconto/revisão, escalado/presente,
   enviado/entregue/lido, acesso/ciência presumida/ciência expressa.

## Critério de conclusão — C2

Registro canônico com origem e status, mapa de pendências pequeno e decisório,
nenhuma regra humana inventada, mecanismo de versão/supersessão de decisão.

---

## C3 — ESPECIFICAÇÃO FUNCIONAL COMPLETA DO SISTEMA DESEJADO

**C3 é a principal entrega para quem não é desenvolvedor e para quem
implementará D.** Cada domínio precisa ser especificado de ponta a ponta.

## Template obrigatório por domínio

1. **Por que existe:** necessidade cotidiana e resultado humano.
2. **Públicos/permissões:** família, admin familiar, profissional, global,
   supervisão adiada e leitura adiada.
3. **Antes e depois:** `AS_IS` comprovado, `TO_BE` decidido e diferença
   necessária.
4. **Páginas/telas/overlays:** localização, menus, atalhos, botões, fluxo de
   navegação e destino.
5. **Formulários:** tabela campo a campo: rótulo, significado,
   obrigatoriedade, validação, unidade, limites, default, texto de ajuda,
   placeholder e exemplo fictício, regra de limpar/deixar vazio, relação com
   catálogo.
6. **Estado e jornada:** máquina de estados legível, transições, autoria,
   quem pode agir, consequência, ação em caso de erro e continuidade.
7. **Mensagens:** microcopy de sucesso, erro, aviso, conflito, resultado
   incerto, carregamento, vazio, offline, retry, revogação e próxima ação.
8. **Prova e integração:** gravação, evento, snapshot, movimento,
   notificação, documento PDF, histórico, privacidade e recuperação.
9. **Adversarial:** duplicidade, concorrência, paciente trocado, revogação,
   link antigo, sessão encerrada, resposta perdida, falha de rede, mudança de
   escala e dados antigos.
10. **Aceitação:** exemplos positivos/negativos, validação humana,
    dispositivo e impressão quando pertinentes.
11. **Decisões pendentes:** nenhuma regra omitida; usar política condicional
    clara.

## Domínios específicos

**REQ:** materiais e urgência por item, quantidade de estoque observada
vazia/zero/`não sei`, emissão, autoria, ciência por modalidade, acesso,
atendimento via ENT, necessidade remanescente O11, listas recorrentes O16 e
PDF sem quantidade solicitada inventada.

**COM:** compra e doação, prevista/adquirida/recebida/validada, quantidades
inferiores, apresentação/embalagem, saldo pendente enquanto esperado e
conclusão por confirmação final, erros parciais, comprovante.

**ENT:** família sugere recebedor pela escala e pode escolher outro antes de
emissão; pessoa que efetivamente recebe deve confirmar pessoalmente;
expedição/trânsito/conferência/aceite/divergência/recusa/cancelamento/retirada/consumo/concilição.
Integração clara com movimentação simples bilateral sem burlar
responsabilidade indelegável.

**BAL:** contagem por plantão, revisão, self-review vedado onde política
exigir independência, reconto e redesignação por pessoa diferente, pendência
obsoleta, versão exata aprovada, responsabilidade após desligamento.

**Profissionais, papéis, escala:** cadastro/identificação, vínculos, convite,
direitos por paciente, revogação, múltiplos dias (>30 dias), recorrências,
padrão de início/fim, turno noturno, exceções, substituição, dia/horário,
prioridade de destinatário ENT, conflitos, associação com BAL. Não afirmar
presença física por escala.

**Estoque e catálogo:** family/team/transit, correção referenciada, inativação
mantendo custódia/saldo, reativação, transferência simples bilateral, saldos e
ocorrências, apresentações e conversões O08, histórico de origem O09,
duplicatas O20.

**Consumo e ocorrências:** relato livre, complemento estruturado O05, revisão
por autorizado, débito só depois de confirmação, falha/replay, texto simples
vs contagem.

**Administração e pendências:** listas paginadas, filtros e busca, propostas
legíveis, comparações de decisões, tarefas atribuídas, erro e recuperação,
configuração por paciente, administração global sem acesso tácito à custódia
local.

**Interface transversal:** Fluent consolidado, microcopy sem códigos crus,
tela vazia vs loading vs erro, frescor, recuperação de estado após resposta
perdida, foco, teclado, zoom, reflow e dispositivos.

**Documentos/PDF:** REQ/COM/ENT/BAL, versões, autores, data do ato, emissão e
importação, ressalvas, hash byte-a-byte/QR/verificação de exemplar externo,
testes de conteúdo desenhado e paginação. Não afirmar assinatura pessoal.

**PWA/push:** manifesto, iconografia, instalação, service worker apropriado,
subscriptions por usuário/dispositivo, permissões e revogação, destinatário e
tipo, privacidade e dados mínimos, deep link autenticado, atualização do app e
falhas; sem prometer capacidade não demonstrada em aparelho específico.

**Rascunhos:** persistência cross-device/day e retomada, conflitos entre
aparelhos, estado antigo, mudanças concorrentes, discriminação entre rascunho
e fato persistido, autorização e descarte com confirmação.

**Guias/contingência:** estrutura de guias para familiares, equipe e
supervisão; cenários de conexão ausente; formulário físico e reconciliação sem
duplicar fato; cuidado para não afirmar rotina clínica não aprovada.

## Critério de conclusão — C3

Usuário leigo entende todas as ações importantes; implementador encontra
estados, campos, permissões e testes suficientes; lacunas declaradas não são
mascaradas por formulação vaga.

---

## C4 — ARQUITETURA ALVO E MIGRAÇÃO DE CONTRATOS

**Não executar código.** Produzir plano exequível por mudança.

Para cada `C-CAUSE-###` e cada nova funcionalidade aprovada:

- O que muda em tela, navegação e microcopy?
- Que contrato de API/read model muda? Como preservar clientes atuais?
- Que regra SQL/RPC/RLS muda? Nova migration incremental? Compatibilidade
  legada?
- Que evento, snapshot, ledger ou histórico muda? Como preservar evidência
  antiga?
- Que outbox, cron, push, PDF, Storage ou job muda? Como tratar `uncertain`?
- Quais permissões e vínculos precisam ser mantidos?
- Qual o impacto multipaciente e nos dados existentes?
- Qual mecanismo protege idempotência, versão e concorrência?
- Como reverter a aplicação sem presumir reversão do banco?
- Qual regressão atual falha e deve passar no novo contrato?

Preparar diagramas de sequência para ENT personalizada, transferências
bilaterais, consumo, ciência, rascunhos, alteração de escala e push. Avaliar
custo de solução simples versus complexa, sem recomendar novo backend/stack
automaticamente.

**Gate:** todas as mudanças têm consumidor real, contrato e critério; as
alterações estruturais de DB não são aplicadas nesta fase.

---

## C5 — ROTEIRO DE IMPLEMENTAÇÃO E LIBERAÇÃO

## Modelo dos lotes de D

**D0:** autorização, ambiente seguro, checkpoints de CI, testes de regressão e
governança documental mínima.

**D1:** bloqueadores e integridade das operações: progresso REQ, decisões de
escala, SQL de cancelamento ENT, concorrência, precisão, sessões e proteção
multipaciente conforme escopo.

**D2:** contratos de processo COM/ENT/BAL/consumo/estoque/custódia, sucessão,
pessoa recebedora e transferências, escalas recorrentes.

**D3:** apresentação/UX, estados/feedback, formulários, rascunhos
cross-device, busca/paginação, navegação, cadastro e permissões.

**D4:** documentos/PDF/anexos/integridade/assinatura técnica, conteúdo e
regressões reais.

**D5:** PWA/push e comunicações internas, integração entre camadas e
comportamento offline; canais Meta separados para futuro.

**D6:** governança de release, compatibilidade, restore/contingência, manuais,
testes de aparelhos/pessoas reais e GO/NO-GO.

Esta é apenas proposta de alto nível; **reordenar segundo dependências**, não
seguir nomenclatura como cronograma fixo. É possível colocar documentação PDF
antes de partes de UX quando exigir mesma mudança de eventos. Não calcular
número de semanas imaginário.

## Matriz de planejamento por lote

- ID, dependências, pré-condições, decisão aprovada, responsável humano,
  arquivos e subsistemas, riscos, alterações planejadas.
- Teste mínimo de desenvolvimento, integração/CI por marco, QA humana e
  ambiente específico.
- Critérios objetivos de saída, documentação, possível feature flag, plano de
  reversão/reconciliação.
- Canais/perfis adiados e suas garantias de desativação.
- Contenção do push e suas limitações; nenhum canal externo envia dado real
  sem autorização.

## Gate de prontidão

Separar `FIRST_RELEASE_REQUIRED`, `CONDITIONAL`, `DEFERRED`,
`OPERATIONAL_HOMOLOGATION`, `PENDING_OWNER`, com justificativa explícita.
Exigir tratamento dos P1, correções aplicáveis ao primeiro uso, restauração
integrada, CI vinculada ao SHA, dispositivo/usuário real, PDF, estoque e
permissões, sem prometer perfeição absoluta sem evidência.

---

## C6 — ACEITAÇÃO, REORGANIZAÇÃO E HANDOFF

## Reorganização documental

Concluir movimentos preparados desde C0 conforme
`DOCS_REORGANIZATION_POLICY.md`, com mapa, classificação e preservação.
Garantir `docs/audits/A`, `docs/audits/B/B1..B8`, `docs/audits/C/C0..C6`,
`docs/audits/D`. Indexar os períodos 20/21 de outubro como histórico
preparatório; diferenciar docs atuais de futuras decisões. Corrigir fontes de
orientação atuais e os links que o movimento afetar. Não alterar pacotes
probatórios silenciosamente.

## Critérios de aceitação por causa

1. Contrato aprovado e testável.
2. Caso normal positivo.
3. Caso de erro/duplicidade/concorrência.
4. Resultado persistido, ou falta de efeito quando houve recusa.
5. Autorização, ator, paciente, ledger, evento, versão e histórico quando
   relevantes.
6. Interface e comunicação coerentes.
7. Recuperação/retry.
8. Acessibilidade, dispositivo e impressão quando pertinentes.
9. Distinção entre simulação local e homologação real.
10. Ligação ao ID original, causa C, decisão e lote D.

## Entrega para o responsável

Dois níveis de saída:

- **Executivo, não técnico:** sistema atual, resultado desejado, principais
  diferenças, decisões do responsável registradas, pendências, prioridades,
  motivos do NO-GO e o que será feito na D.
- **Engenharia:** todas as especificações, grafos, contratos, esquemas,
  matriz de change-impact, ordem, regressões, gates e dependências.

## Encerramento

Checklist final: 165 IDs cobertos, todas as DEC registradas, O01–O20 mapeadas,
PENDING_OWNER explícitos, fases A/B preservadas, fases C preenchidas, D
reservada, links atuais íntegros, documentação viva atualizada, produtos e
migrations intocados, nenhuma operação remota mutável, nenhum GO inventado.
Commit/push **documental** e SHA comunicado. C não executa implementação.
