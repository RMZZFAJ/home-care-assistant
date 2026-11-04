# ORDEM MESTRA — FASE C INTEGRAL

Home Care Assistant | Consolidação, decisões, especificação funcional,
arquitetura de evolução, planejamento e organização documental

**Autoridade desta ordem:** instrução de execução da Fase C, NÃO autorização
da Fase D.
**Repositório:** `RMZZFAJ/home-care-assistant`.
**Branch de trabalho inicial:** `audit/phase-b`.
**Último HEAD documental confirmado em 30/10/2026:**
`227f26ca695a3d01512a854f4b19f2639b91ba87` (conferir antes de começar).
**Base funcional auditada:** `37cb7f85e96e551d6419871f94dd950712e2565b`.
**Fases investigativas:** A e B1–B8 encerradas, parecer NO-GO ainda vigente.
**Autorização atual:** executar integralmente C0–C6; criar, modificar,
reorganizar, arquivar e, em condições estritas, excluir documentação obsoleta;
atualizar referências e instruções; publicar commit(s) documentais na branch
autorizada. **Não executar correções funcionais.**

> **Arquivos de entrada:** `PRODUCT_DECISIONS_MASTER.md`,
`PHASE_C_SUBPHASES.md`, `DOCS_REORGANIZATION_POLICY.md` e esta
`PHASE_C_MASTER_ORDER.md` estarão inicialmente **na raiz do repositório** após
serem adicionados pelo responsável. Também poderá haver
`PHASE_C_INTERPOSITION.md`. Você está expressamente autorizado a **mover,
renomear, dividir, unificar, revisar e complementar** esses arquivos e a
tornar seus conteúdos canônicos na organização definitiva de `docs/`, desde
que preserve todas as decisões do responsável e mantenha mapa de migração. Não
presuma que os arquivos tenham de permanecer na raiz. O objetivo é a
organização final, não a preservação de nomes provisórios.

---

## I — MANDATO E CRITÉRIO DE ÊXITO

Execute **a Fase C inteira**, sem parar depois da consolidação C1. A missão é
transformar o diagnóstico A+B1–B8 e as decisões expressas do responsável em
**uma especificação completa e coerente do produto desejado**, um **projeto de
implementação tecnicamente executável** e um **repositório documental
organizado e navegável**.

**Fase B respondeu:** o que existe, o que funciona, o que falha, quais
evidências sustentam as conclusões.
**Fase C responderá:** como deve funcionar, quais escolhas foram efetivamente
aprovadas, quais mudanças precisam ocorrer, em que ordem, o que preservar,
como testar, como implantar e quando declarar aceite.
**Fase D somente depois:** escrever código funcional, executar migrations,
mudar regras em execução, homologar e publicar operação real.

Ao final de C, alguém que não programa deverá conseguir entender **o processo
antes e depois**, a responsabilidade humana, o resultado de cada ação e os
riscos. Um desenvolvedor deverá conseguir implementar sem adivinhar regras do
domínio, inclusive nos estados excepcionais. Um auditor deverá localizar a
ligação entre achado original, decisão, especificação, mudança planejada e
prova de aceite.

**Não substituir aprofundamento por mais documentos.** Evidências e
diagnósticos da B devem ser reaproveitados; C é trabalho decisório, de
modelagem e de organização. Não abrir grupo B9 ou reiniciar uma auditoria
geral.

---

## II — LEITURA, BASELINE E HIERARQUIA DAS FONTES

1. Ler `AGENTS.md` e instruções relevantes do repositório; conferir
   `git status`, branch, HEAD, diferença entre branch documental e base
   funcional, árvore, remotos e eventuais alterações locais do responsável.
   Não sobrescrever trabalho local.
2. Ler integralmente os **quatro arquivos-base** listados no preâmbulo,
   incluindo STATUS de decisões. Se o usuário os anexou em vez de copiá-los
   para a raiz, materialize-os/copie-os primeiro sem alterar significados.
3. Ler `docs/audits/phase-b/README.md`, os relatórios executivos,
   `FINDINGS_MASTER` e handoffs de A, B1–B8, e as matrizes de
   aceitação/regressão realmente pertinentes. Priorizar evidências dirigidas;
   não ler cegamente milhares de imagens, snapshots e traces.
4. Conferir estado de `README.md`, `AGENTS.md`, `docs/PROJECT_STATUS.md`,
   `docs/ROADMAP.md`, `docs/AUDIT.md`, `docs/ARCHITECTURE.md`,
   `docs/DATABASE.md`, `docs/SECURITY.md`, `docs/API.md`, `docs/TESTING.md`,
   `docs/OPERATIONS.md`, `docs/DEPLOYMENT.md`, `docs/WHATSAPP_AI.md`,
   `docs/evolution/`, `docs/ui-ux/`, `docs/meta/`, `docs/references/` e
   referências que apontam para caminhos históricos.
5. Validar os números: **165 registros brutos** esperados de A+B1–B8 (156 de
   A+B1–B7 e 9 da B8), **não 165 causas independentes**. A B8 agrupou os **156
   anteriores em 119 famílias de regressão**. Reconciliar os nove adicionais
   sem simplesmente inferir um novo total; identificar causas, manifestações,
   revalidações, lacunas de prova e oportunidades.
6. P1s herdados: `UX-001/B1-UX-001` (aprovação de escala sem informação
   decisória suficiente) e `DB-002/B3-001` (starvation/ausência de progresso
   do agendador REQ). São **duas causas bloqueadoras distintas**, não quatro
   incidentes independentes. NO-GO permanece até demonstração futura.

**Hierarquia quando houver conflito:**

- Regra expressa e mais recente do responsável > recomendação antiga do
  assistente > proposta dos relatórios.
- Fato verificado e código atual > descrição antiga de estado, sem apagar o
  histórico.
- Evidência de comportamento atual > suposição sobre interface.
- Decisões não respondidas permanecem `PENDING_OWNER`; **não converter
  sugestão técnica em aprovação fictícia**.
- Proteção de dados, integridade e separação de autoridade são restrições
  invariantes. Não transformar conveniência de UI em bypass.

Marque rigorosamente `OWNER_APPROVED`, `OWNER_DIRECTION_NEEDS_DETAIL`,
`DEFERRED`, `RECOMMENDATION_NOT_APPROVED`,
`TECHNICAL_IMPLEMENTATION_DELEGATED`, `PENDING_OWNER`, `EXISTING_TO_PRESERVE`,
`REJECTED` e, para observação, `CONFIRMED`, `SUPPORTED_RISK`, `UNVERIFIED`.

---

## III — LIMITES DA AUTORIZAÇÃO

**Permitido nesta Fase C:**

- Ler código, testes, banco e evidências para localizar contratos, SEM
  modificar comportamento e SEM repetir auditoria completa.
- Criar documentação de C completa; elaborar diagramas, matriz de decisões,
  critérios e planos.
- Reorganizar **documentos e artefatos de auditoria** em `docs/`, inclusive
  `git mv`, atualizar links, criar portais, arquivar documentos ultrapassados
  e registrar exclusões documentais estritamente demonstradas.
- Atualizar `README.md`, `AGENTS.md`, índices, tutoriais e documentos de
  orientação **apenas para refletir o estado real**. Não declarar
  implementadas as decisões aprovadas para D.
- Realizar validadores **documentais**, verificadores de links, referências,
  sintaxe de instrumentos documentais e verificações dirigidas de preservação.
- Corrigir referências em scripts **exclusivamente documentais/internos**
  somente se forem diretamente quebradas pela migração de caminhos e puderem
  ser revalidadas sem efeitos externos. Caso contrário, marcar dependência
  para D, não invadir código.
- Commit/push documentais, **sem PR, merge ou promoção para produção**.
  Preview automático previamente autorizado se for inevitável consequência do
  push, com identificação do efeito e sem alteração de configuração.

**Proibido nesta Fase C:**

- Alterar `src/`, `supabase/migrations/`, regras SQL, RLS, Auth, Storage, DB
  operacional, usuários, tabelas, APIs, funcionalidades, componentes, UI,
  arquivos de testes funcionais, dependências/runtime ou configuração
  produtiva.
- Aplicar migration, alterar banco remoto, reset, seed, deploy deliberado,
  cron externo, Meta/WhatsApp, push real, SMTP/SMS, DNS, segredos, envio real,
  restaurar backup sobre qualquer ambiente existente.
- Apagar evidência A/B, sobrescrever snapshots/manifestos, reescrever
  história Git, force-push, abrir PR ou mesclar na `master`.
- Tratar a preparação da documentação D como autorização de execução da D.

**Exclusão de documentos:** somente arquivos inequivocamente
redundantes/temporários **fora de pacotes probatórios e contratos atuais**,
com consumidor inexistente demonstrado, registro no inventário e
recuperabilidade pelo Git. Em caso de dúvida: **arquivar, não excluir**.
Exigir autorização adicional antes de remoção em massa ou destrutiva. Remoção
de código, scripts ativos e migrations fica na D, não na C.

---

## IV — REGRAS DE DOMÍNIO INEGOCIÁVEIS

- O paciente é a unidade operacional; acesso global não implica autoridade
  sobre estoque ou documentos de qualquer paciente.
- Usuário, vínculo por paciente, capacidade operacional, identidade pessoal e
  escala são conceitos distintos.
- REQ **não** passa a exigir quantidade solicitada; a declaração de
  necessidade não é ordem de compra.
- COM distingue quantidade prevista/aprovada, adquirida, recebida e validada;
  recebimento menor pode encerrar a aquisição mediante confirmação explícita
  do responsável, sem apagar histórico.
- ENT distingue expedição, trânsito, aceite físico, divergência, eventual
  devolução/consumo e encerramento administrativo. **Somente a pessoa que
  efetivamente recebeu pode confirmar recebimento físico; essa confirmação não
  é delegável.** A família indica destinatário (pré-selecionado conforme
  escala, editável antes de emissão). Encerramento excepcional por
  administrador **nunca** simula aceite do profissional desligado.
- BAL distingue contagem, reconto, revisão, autor de cada versão e
  responsável atual; nova pessoa pode ser DESIGNADA para realizar NOVO reconto
  sem herdar autoria da contagem anterior.
- Escala organiza dias, plantões e padrão de horários; não comprova presença,
  não concede permissão universal. Deve comportar escolha múltipla de dias em
  períodos >30 dias, recorrência e exceções.
- Estoque deriva de movimentos e regras transacionais, não de edição direta
  de saldo; unidade em trânsito não fica livre simultaneamente nas duas
  custódias.
- Consumir relatado não equivale a débito validado. Ciência não equivale a
  recebimento, leitura integral, comparecimento, entrega ou aprovação
  operacional.
- Zero observado é diferente de `não sei informar` e de ausência de
  preenchimento.
- Histórico, autores, versões, fatos físicos, data do evento, do registro e
  da emissão não podem ser inferidos indevidamente.
- Hash de PDF verifica bytes contra referência confiável; QR sozinho não
  prova que o exemplar foi preservado, assinatura do sistema não equivale a
  assinatura pessoal qualificada.
- Dados de teste permanecem fora da operação real; nenhuma recomendação
  permite fundir automaticamente ambientes nem restaurar mocks/fixtures em
  dados reais.

---

## V — ESCOPO APROVADO DO PRODUTO DESEJADO

**Primeiro lançamento pretendido:** sistema operacional abrangente,
especialmente REQ, COM, ENT, BAL, estoque, profissionais identificáveis,
escalas, documentos/PDFs completos e verificáveis, experiência visual e
textual humana, acesso íntegro de profissional/família/administração local,
rascunhos persistentes entre aparelhos/dias, acesso PWA com push e processos
de contingência.

**Pode ficar para etapa posterior:** WhatsApp/Meta/Flows (aprovação externa
pendente), capacidade avançada própria de supervisão e perfil somente-leitura
(quando não forem necessários ao primeiro escopo), lotes/validade com
OCR/códigos de barras e painel de tarefas multipaciente. Não remover
funcionalidades existentes por causa do adiamento; isolar/homologar a
ativação.

**Novidades centrais aprovadas:**

1. PWA instalável e Web Push, mantendo notificações internas como fonte de
   estado. Não prometer entrega garantida; política por tipo,
   opt-in/dispositivo, fallback, dedup, privacidade e suporte real precisam
   ser especificados.
2. Ciência por modalidade: manual; primeiro acesso condicionado a modal com
   consentimento para ciência antes da abertura; tácita configurável por tipo
   de documento/obrigação e registrada na emissão (presumida, **não
   leitura**). Registro de todo acesso efetivo ao documento, com ator e
   instante. Política individual sujeita a salvaguardas explícitas para atos
   não substituíveis por presunção.
3. Estoque observado na REQ: campo vazio inicialmente, valor zero somente
   digitado, alternativa explícita `Não sei informar`.
4. COM com confirmação clara de atendimento final inferior ao previsto;
   comparar quantidades e preservar histórico.
5. ENT: cancelamento pode ser retirado pelo solicitante e recusado com
   registro; responsabilidade do recebedor físico não delegável.
6. Profissional desligado: revogação nunca bloqueada; prévia/solicitação de
   regularização; tarefas futuras redesignáveis; ato histórico autoral
   imutável; excepcionalmente encerramento administrativo motivado **sem
   afirmar recebimento físico**.
7. Produto inativo pode conservar saldo na custódia familiar; saldo de equipe
   pode permanecer sob inativação ou ser transferido para família conforme
   escolha, sem perda. Reativação resgata saldo na custódia em que permaneceu.
   Nova interface simples de transferência bilateral família/equipe, iniciada
   por autorizado de qualquer lado, com confirmação da contraparte e autoria;
   **não confundir contrassinatura da transferência com confirmação física
   indelegável de ENT**.
8. Consumo textual: complemento estruturado aprovado, inclusive no app (não
   apenas pelo WhatsApp), mantendo relato original e sem débito sem
   confirmação.
9. Propostas obsoletas de escala e BAL: impedir confirmação fora de contexto,
   encerrar/reapresentar com histórico.
10. BAL: outra pessoa pode realizar novo reconto após redesignação formal,
    sem atribuição retroativa.
11. Anexos: recuperação de tentativa, abandono/expiração seguros, proteção do
    original/derivado e não remoção silenciosa de informação relevante.
12. Rascunhos duráveis entre dias e dispositivos, inclusive preenchimento e
    fluxos de decisões; ao retomar, oferecer continuar ou descartar **somente
    rascunho**, com concorrência/versão e validação do estado atual antes de
    aplicar.
13. Confirmadores humanos: situação atual, proposta, consequência, autoria e
    próxima ação visíveis; formulários com exemplos e ajuda; estados de
    loading/empty/error/retry/uncertain claros e elegantes, consistente
    Fluent.
14. Pendências: aprimorar listas existentes, filtros, busca, paginação,
    recuperação de itens antigos e indicação do próximo responsável; não criar
    central genérica sem benefício.
15. Histórico: linguagem natural e comparação fiel de versões, sem falsificar
    fatos de origem.
16. PDF: plenitude, legibilidade, datas/estados/custódia corretos, impressão,
    acessibilidade, recuperação histórica e verificação de integridade dos
    bytes; redesign gráfico poderá vir depois.
17. Verificador de autenticidade técnica do PDF emitido (hash confiável +
    comparação de upload/bytes; avaliar assinatura criptográfica do sistema
    como extensão, sem alegar ICP-Brasil).
18. Notificações informativas, de apoio e essenciais, política por
    destinatário e tipo, internas + push, WhatsApp posterior.
19. Falhas técnicas resolvidas por suporte/admin global; equipe resolve
    apenas tarefas operacionais autorizadas, família/admin local resolve
    pendências administrativas do paciente.
20. Retenção conservadora dentro de base jurídica e prazos por categoria, não
    retenção indefinida automática em afronta a direitos e deveres.
21. Guias completos para equipe e supervisão e onboarding da primeira
    residência.
22. Melhorias aprovadas da B2:
    O01/O02/O03/O04/O05/O06/O07/O08/O09/O11/O12/O13/O14/O15/O16/O19/O20, com
    status e limites no registro mestre. O10 é capacidade existente a
    preservar; O17/O18 adiadas.

O arquivo `PRODUCT_DECISIONS_MASTER.md` é a fonte detalhada. Nunca tratar
recomendações nele como decisões finais quando estiverem marcadas pendentes.

---

## VI — PLANO OBRIGATÓRIO C0–C6

O arquivo `PHASE_C_SUBPHASES.md` detalha entregáveis e critérios. Execute
**todos** os estágios, retomando por checkpoint, sem interromper por
ambiguidades não essenciais.

### C0 — Intake, baseline, guardas e migração planejada

Confirmar branch, SHA, proteção do trabalho local, inventário de documentação,
referências cruzadas, riscos de movimento e mapa de fontes. Registrar snapshot
de conteúdo/hashes originais; não começar movimentos antes de mapear
consumidores e links.

### C1 — Reconciliação causal completa

Importar **todos** os registros A+B1–B8 (165 brutos esperados), preservando
identificadores e proveniência. Derivar causas consolidadas sem somar relatos
repetidos, distinguir defeito, lacuna, risco, homologação, melhoria e decisão,
severidade técnica x gate operacional. Reconhecer as 119 famílias de A+B1–B7
como referência, não impô-las como resultado definitivo de C. Nenhum ID
omitido. Produzir crosswalk
ID original → família → causa → decisão → especificação → implementação
planejada → verificação.

### C2 — Decisões do proprietário e governança

Ingerir integralmente o registro de decisões, reconciliar com contratos
existentes e nova orientação. Marcar como aprovação, delegação, adiamento,
recomendações e questões abertas. Quando houver dois conceitos semanticamente
divergentes, propor alternativas, **não escolher silenciosamente**. Gerar
pacote legível de decisões ainda necessárias para o proprietário; não impedir
conclusão do plano. Decisões abertas serão condições de implementação, não
aprovação presumida.

### C3 — Projeto funcional e experiência detalhada

Especificar o sistema desejado POR DOMÍNIO, FLUXO E TELA, incluindo usuários e
permissões, REQ, COM, ENT, BAL, escalas, estoque/custódia, catálogo,
profissionais, administração, documentos/histórico/PDF, PWA/push, notificações
internas, manutenção e contingência. Para cada tela/form/modal: objetivo,
papéis, rota atual/proposta, entrada/saída, campo por campo (tipo, origem,
obrigatório, default, validação, máscara, exemplo, texto de apoio, tradução
humana), botões, habilitação, estados
(loading/empty/error/success/conflict/offline/uncertain),
responsividade/teclado/AT, histórico, risco, critérios e exceções. Evidenciar
o que já existe, o que deve mudar e o que é novo. Preservar procedimentos sem
aplicativo para falhas e responsabilidades humanas. Documentar texto de
microcopy proposto, sem inventar dado clínico.

### C4 — Arquitetura de alterações e segurança da evolução

Mapear por causa/decisão as camadas e componentes afetados: UX, UI, API,
contratos DTO, banco/RPC/RLS, migrations incrementais, eventos, ledger,
Storage, geração/verificação PDF, notificações, PWA, workers, acessibilidade,
documentação e testes. Produzir plano de migração *sem executar*. Definir
compatibilidade, idempotência, origem/autoria, proteção multipaciente,
retries, transações, regressões e rollback/forward. Identificar decisões
arquiteturais (`ADR`) somente quando houver alternativas relevantes; não criar
tabela nem abstração por preferência.

### C5 — Lotes, dependências, sequenciamento e estratégia de release

Organizar Fase D em etapas executáveis, com prioridades, riscos,
entradas/saídas, owner sign-off, QA proporcional, especificações finalizadas,
pré-condições, gates completos nos marcos pertinentes e ativação de
capacidades. Não estimar tempo/custo inventado nem usar % fictício de
prontidão. Separar: bloqueadores, corretivos do primeiro uso, capacidades
novas aprovadas, opcionais futuras, homologação externa e decisão pendente.
Determinar Fase D como sequência de mudanças autorizáveis, sem executá-las.

### C6 — Aceitação, reorganização efetiva dos documentos, handoff e encerramento

Implementar a migração documental do `DOCS_REORGANIZATION_POLICY.md`, com
`git mv`, mapa `old_path → new_path`, trilha de alteração de links e
salvaguardas. Atualizar orientação viva, índices e fonte de estado por SHA.
Confirmar leitura contínua dos pacotes A/B sem alterar silenciosamente
evidências. Consolidar critérios por processo e cenários adversariais, testes
de regressão e aceites humanos/físicos/remotos. Validar documentação,
integridade, origem, referências, exclusões e preservação funcional. Entregar
plano D, decisões pendentes e parecer **C concluída / D não iniciada / NO-GO
de produção mantido**.

**C6 não significa esperar até o último minuto para planejar a
reorganização.** Mapear em C0, preparar em C1–C5, executar em etapa controlada
e validar antes do encerramento.

---

## VII — DOCUMENTAÇÃO: REORGANIZAÇÃO REAL, SEM APAGAR A HISTÓRIA

O repositório hoje possui `docs/audits/2026-10-20`, `2026-10-21`,
`2026-10-25-production-readiness`, oito pastas B datadas e
`docs/audits/phase-b`, além de documentação viva e históricos em
`docs/evolution`, `docs/ui-ux`, `docs/meta`, `docs/references`. **Não
classifique tudo como descartável pela data.**

A topologia-alvo preferencial é:

```text
docs/
  README.md                         # portal atual, por público e fonte
  current/ # contratos e guias VIGENTES (se a migração for segura)
  decisions/                        # decisão canônica e ADRs atuais
  runbooks/                          # procedimentos futuros, sem executar deploy
  audits/
    README.md                       # índice mestre das auditorias
    A/
      2026-10-25-production-readiness/  # A íntegra, evidence e inputs
    B/
      README.md
      B1/2026-10-28-phase-b1-interface/
      B2/2026-10-29-phase-b2-processes/
      B3/2026-10-29-phase-b3-database/
      B4/2026-10-30-phase-b4-backend/
      B5/2026-10-30-phase-b5-integrations/
      B6/2026-10-30-phase-b6-documents/
      B7/2026-10-30-phase-b7-operational-readiness/
      B8/2026-10-30-phase-b8-quality-maintainability/
    C/
      README.md
      C0-baseline/
      C1-consolidation/
      C2-decisions/
      C3-functional-specification/
      C4-technical-design/
      C5-execution-roadmap/
      C6-acceptance-handoff/
    D/
      README.md                    # RESERVADO, D não executada
    _historical/
      2026-10-20/
      2026-10-21/
  archive/                           # conteúdo histórico não probatório, com índice
  RELOCATION_MAP.csv                 # mapa canônico de caminhos antigos
```

Esta estrutura é **orientadora e não uma dependência cega**: Codex pode
melhorar nomes, reduzir níveis redundantes, preservar no lugar documentos
vigentes necessários à automação, ou criar referências transitórias, desde que
cumpra a divisão **A/B/C/D** no domínio de auditorias e atualize todos os
consumidores. A autorização para mover/renomear os arquivos provisórios da
raiz é explícita.

**Distinções obrigatórias:**

- `docs/current` = como o produto funciona **HOJE**. Não confundir requisitos
  futuros com implementação presente.
- `docs/decisions` e `docs/audits/C` = como o produto **DEVERÁ** funcionar e
  o que foi aprovado; separar recomendações e pendências.
- `docs/audits/A`, `B`, `_historical` = evidências datadas e conclusões
  históricas; não reescrever para simular resultado atual.
- `docs/audits/D` = estrutura de planejamento, não prova de implementação.
- `docs/archive` = conteúdo obsoleto, substituído ou contextual, mas ainda
  necessário para rastreabilidade.
- Scripts e fixtures vivos devem continuar identificáveis e funcionais; não
  mover estruturas técnicas só para deixar a árvore simétrica.

**Proteções antes de `git mv`:** faça inventário de referências Markdown
relativas, caminhos em CSV/JSON/evidence, links de GitHub, comandos,
`AGENTS.md`, scripts e testes. Preserve hashes de evidências. Ao mover uma
pasta inteira, links internos relativos geralmente permanecem, mas links
relativos que sobem até `src/` ou `docs/` **mudam de profundidade**: tratar
explicitamente. Escolher por caso entre reescrita editorial de link com
registro de antes/depois, redirect documental/compatibilidade ou preservação
de localização quando houver dependência rígida. NUNCA alterar dados de um
experimento para passar no validador. Manifestos antigos são documentos
históricos: não recalcular para disfarçar alteração. Produza mapa e manifesto
de migração à parte.

**Aposentadoria documental:** primeiro `ACTIVE`, `HISTORICAL_EVIDENCE`,
`ARCHIVED`, `REDUNDANT_DOCUMENT`, `DELETE_CANDIDATE` ou
`KEEP_FOR_COMPATIBILITY`. Mover históricos com `git mv`; eliminar arquivo
inequivocamente redundante somente depois de demonstrar ausência de
consumidores e registrar a justificativa. Em caso de risco de quebra,
preservar stub/índice de encaminhamento mínimo ou adiar para D. **Não eliminar
evidências de A/B, README históricos, inputs, capturas, CSV de achados, PDFs
de prova, relatórios ou manifestos.**

Atualizar `README.md`, `AGENTS.md` e documentos ativos para: apontar a fonte
única do estado atual por branch/SHA; corrigir contagens desatualizadas
(19/35/63 vs 84 migrations), PRs e autorizações passadas apresentadas como
atuais; indicar B concluída, C planejando, D não iniciada; distinguir snapshot
documental, código funcional e deploy real; apontar contratos preservados e
docs de mudança proposta. **Jamais afirmar que o produto já implementou
PWA/push, ciência futura ou outras decisões da C.**

---

## VIII — NÍVEL DE DETALHE MÍNIMO DA ESPECIFICAÇÃO

Nenhum domínio será declarado especificado só por conter um título e cinco
bullets. Para cada processo/variante relevante:

1. Objetivo humano, papel e situação concreta.
2. Situação atual (`AS_IS`) amparada por código/evidências.
3. Resultado desejado (`TO_BE`) com origem na decisão do responsável ou
   recomendação condicionada.
4. Dados e termos: significado, fonte, unidade, precisão, nulo/zero/ausente,
   data/evento, pessoa e custódia.
5. Estados possíveis, transições permitidas e terminais.
6. Tela/rota, posição de ações, diálogos, campos, listas e defaults.
7. Exemplos reais de **formato**, sempre fictícios, e microcopy amigável.
8. Identidade e autorização por ação; regra de pessoa que confirma ato
   físico.
9. Concorrência, versão, duplicação, desconexão, retomada e erro.
10. Efeito sobre saldo/ledger, documento, revisão, notificações e histórico.
11. Privacidade, informação mínima e retenção.
12. Teste de aceitação positivo e negativo; contraexemplo adversarial;
    dependências.
13. Decisão pendente ou aprovação explícita para pontos ainda abertos.
14. Compatibilidade com usuário móvel, teclado, leitor de tela e impressão
    quando aplicável.

Para o novo PWA, identificar capacidade por navegador/dispositivo, instalação,
subscribe/unsubscribe, privacidade, falha, supressão de duplicados, deep
links, revalidação da permissão e risco de usar push como prova de ciência.
Verificar a infraestrutura atual antes de projetar, sem declarar
implementação.

Para a escala, especificar edição de múltiplos dias >30 dias, horários
atravessando meia-noite, fuso, recorrência, exceção, feriado, troca, revisão,
profissional previsto, substituição, conflitos, efetivo recebedor e vínculo
com BAL. Não transformar agenda em comprovação de presença.

Para PDFs, conteúdo mínimo por REQ/COM/ENT/BAL, versões e ressalvas, data,
hash de bytes, verificação por upload, diferença entre QR e arquivo, emissão
determinística, revogação de acesso, acessibilidade e texto/geometry
adversarial. Incorporar B8-Q001: **o teste precisa reprovar PDF sem conteúdo
impresso**; B6-007/008 são bloqueadores dos caminhos documentais afetados.

---

## IX — QUALIDADE E REGRESSÕES NA C

A B8 identificou oráculos insuficientes para conteúdo PDF (B8-Q001), `NULL` em
asserção SQL (B8-Q002), observações inconclusivas de acessibilidade (B8-Q003),
flakiness de navegação (B8-Q004) e manutenção das fontes (`B8-M001` etc.).

Em C não corrija esses testes; **especifique** a regressão que deverá falhar
antes da correção e passar depois. Vincule cada causa à matriz da B8, sem
criar casos duplicados por nomenclatura. Diferencie teste local, integração,
navegador, aparelho físico, humano, provedor externo, restore, homologação e
gate de release. Não afirmar 100% cobertura ou WCAG por automatização. Uma
verificação que aceita resultado errado não constitui prova adequada.

---

## X — DECISÕES ABERTAS E AUTONOMIA

Existem definições ainda não aprovadas explicitamente: identidade/verificação
de credenciais profissionais, exceções à ciência tácita, alvo de RPO/RTO e
backup, separação do ambiente real, responsável pela contingência, regra de
escala versus autorização, reconciliação fina de transferência bilateral
versus aceite indelegável, política de quando quantidade COM inferior
representa conclusão, detalhes de retenção, cobertura real de aparelhos/canais
e caminho técnico de assinatura do sistema.

**Não interromper C por falta delas.** Para cada uma:

- Formular alternativa A/B/C com custo, risco, consequência, recomendação.
- Marcar `PENDING_OWNER` se não decidida.
- Produzir plano condicional para a Fase D (implementação bloqueada no ponto
  exato, outras partes podem continuar).
- Não apresentar recomendação como fato aprovado; não solicitar uma nova
  rodada genérica de esclarecimentos antes de terminar C.

É aceitável avançar em C1–C6 e registrar no encerramento que **C documental
está concluída com decisões condicionais pendentes de aceite**. Só D recebe
trabalho que já possui contrato autorizado, após nova aprovação expressa.

---

## XI — REQUISITOS DE ENTREGA FINAL

Obrigatórios:

- Portal de documentação e mapa de caminhos migrados.
- Inventário dos 165 achados e reconciliação causal sem perda.
- Registro mestre de decisões do proprietário e revisões.
- Catálogo de decisões ainda exigidas, **apresentado em linguagem não
  técnica**.
- Especificações detalhadas por processo/tela/campo/transição.
- Matriz de perfis/capacidades/responsabilidades, sem misturar escalado e
  autorizado.
- Glossário e microcopy humano dos estados e mensagens.
- Arquitetura-alvo e plano de migrações/compatibilidade (**não executar**).
- PWA/push, assinatura/verificador de PDF e rascunhos cross-device desenhados
  com modelo de segurança.
- Roadmap de D por lotes com dependências, gates, riscos, donos e
  oportunidades adiadas.
- Aceites de processo e matriz de regressão baseada nos 165 IDs/causas
  reconciliadas.
- Plano de homologação real e liberação gradual.
- Plano de backup/restore/contingência proporcional, com decisões abertas.
- Documentação viva revisada e história arquivada com
  preservação/verificação.
- Handoff formal `C → D`, resumido para responsável não técnico e detalhado
  para implementação.
- `CHECKPOINT.md` de C atualizado ao longo da execução, manifestos e
  validações documentais proporcionais.

**Critério de qualidade da apresentação:** documentos operacionais fáceis de
ler, com diagramas/tabelas somente quando ajudam, nomenclatura consistente e
exemplos de usuário; evitar dumping de JSON, jargão sem explicação e títulos
que escondem requisitos não decididos. Manter especificações granulares para
engenharia em documentos próprios.

---

## XII — CHECKPOINTS, PUBLICAÇÃO E ENCERRAMENTO

1. Execute C0–C6 **na mesma missão**, com checkpoints após cada estágio e
   após movimento de grandes conjuntos de documentos. Em compactação, retome
   pelo checkpoint, sem refazer leitura global/provas A/B.
2. Antes de reorganizar, faça `git status`, liste arquivos não
   rastreados/alterações existentes e proteja trabalho do responsável. Não
   substitua conteúdo fora do escopo.
3. Use commits documentais coerentes por marco de migração, se isso reduzir
   risco; não criar commit temporário descartável nem reescrever histórico
   remoto. `git mv` preserva rastreabilidade Git.
4. Compare arquivos de produto, migrations e testes existentes com a base;
   diferenças só poderão existir em docs, raiz de orientação e ferramentas
   documentais expressamente necessárias à migração. Qualquer diferença
   funcional → parar alterações funcionais e registrar.
5. Valide links, índices, referências de fontes, linhas da matriz de
   decisões, 165 IDs, rastreabilidade, status de pendência e manifests. Links
   quebrados dentro de documentos arquivados devem ser classificados e
   resolvidos quando tecnicamente seguro; exceções documentadas, não ocultas.
6. `docs/audits/D/README.md` deve afirmar claramente **D NÃO INICIADA**. NÃO
   criar falsos resultados D.
7. Faça commit/push somente para `audit/phase-b`, com mensagem
   `docs(phase-c): complete planning, decisions and documentation organization`
   ou equivalente; não alterar `master`, não abrir PR, não executar
   merge/deploy ou qualquer comando remoto mutável para testar produto.
8. A conclusão final deverá declarar: SHA de C, árvore documental, total
   bruto e causas independentes apuradas, decisões aprovadas/pendentes, lotes
   D, riscos para primeiro uso, documentos vivos atualizados, exclusões
   justificadas, limites de validação, códigos/migrations preservados, **D não
   iniciada e produção NO-GO**.

**ORDEM FINAL:** leia os documentos-base provisórios na raiz, reconheça o
repositório, execute C0–C6 integralmente, reorganize fisicamente a
documentação com preservação, conclua o planejamento detalhado do produto,
publique apenas alterações documentais e encerre com handoff implementável.
Não pare em C1. Não implemente D. Não assuma que recomendação técnica é
decisão do responsável.
