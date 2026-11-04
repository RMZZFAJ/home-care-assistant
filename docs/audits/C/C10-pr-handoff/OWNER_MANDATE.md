# Autoridade da missão C7–C10

Recebida em 04/11/2026, America/Sao_Paulo, com duas atualizações expressas que
prevalecem sobre a fonte abaixo:

1. O responsável já aprovou a direção visual do HTML fornecido. Não pedir nova
   aprovação equivalente nem recriar protótipo.

2. A pasta de entrada é temporária; organização, consolidação e remoção estão
   autorizadas, preservando decisões/especificações e provas históricas.

Escopo: concluir C7–C10 na audit/phase-b, validar documentos, commit/push e
abrir Draft PR para master. Não aguardar toda CI, não fazer merge, não apagar
branches, não alterar produto/dados/infra e não iniciar D. P02 individual
permanece humana. O arquivo original e os seis outros Markdown recebidos estão
em gzip exato, com hashes no manifesto de entrada. O arquivo07 citado no
leia-primeiro não foi fornecido; a mensagem atual contém a interposição e
autorização suficientes, sem inventar conteúdo ausente.

## ORDEM MESTRA — FASE C, PARTE 2 · C7–C10

### HOME CARE ASSISTANT

FECHAMENTO DECISÓRIO, PROJETO VISUAL, CRITÉRIOS VERIFICÁVEIS E PR DE
ENCERRAMENTO

**Repositório:** `RMZZFAJ/home-care-assistant`. **Branch de trabalho:**
`audit/phase-b`. **Data da orientação:** 04/11/2026. **Estado:** Fases A,
B1–B8 e C0–C6 documentalmente concluídas; Fase D não iniciada; produto NO-GO
até correções/homologação.

#### I. AUTORIDADE E FONTES

1. Ler integralmente todos os arquivos deste pacote, inicialmente colocados em
   pasta/raiz de apoio do repositório: `01_DECISOES_APROVADAS_E_LIMITES.md`,
   `02_INVENTARIO_DE_CIENCIAS_E_ATOS.md`, `03_BRIEF_VISUAL_C8.md`,
   `04_QUALIDADE_DE_ACEITE_C9.md`, `05_POLITICA_PR_CI_BRANCHES.md` e o
   protótipo `home-care-prototipo.html`.

2. Esses caminhos são provisórios. Autoriza-se
   mover/renomear/editar/reorganizar esses **documentos** dentro da
   organização atual `docs/decisions`, `docs/audits/C`, `docs/archive`;
   preservar a fonte original e o status de aprovação. Protótipo visual é
   referência externa fornecida, não artefato de execução do aplicativo.

3. Consultar o estado efetivo no Git: branch, SHA, working tree e diferenças;
   não assumir que o HEAD de referência
   `992c6303e9da158073f2e3e75957d0faa49fa4ee` ainda é o atual. Confirmar
   baseline funcional `37cb7f85e96e551d6419871f94dd950712e2565b` e documentos
   canônicos publicados.

4. Consultar `README.md`, `AGENTS.md`, `docs/README.md`,
   `docs/current/PROJECT_STATUS.md`,
   `docs/decisions/PRODUCT_DECISIONS_MASTER.md`,
   `docs/audits/C/C1-consolidation`, `C2-decisions`,
   `C3-functional-specification`, `C4-technical-design`,
   `C5-execution-roadmap`, `C6-acceptance-handoff` e auditorias A/B para
   evidência.

5. Fonte de autoridade: **decisões humanas explícitas e mais recentes**
   prevalecem sobre propostas técnicas anteriores; decisões pendentes não
   podem ser preenchidas por suposição. Recomendação de IA não é aprovação.
   Toda proposta que extrapolar a direção do responsável será marcada
   `PENDING_OWNER`.

#### II. META DE ENCERRAMENTO

Executar **C7, C8, C9 e C10 na mesma missão documental**, produzindo:

- Registro de decisões consolidado e fiel, com novas escolhas P01–P15,
  O01/O10, regras de ciência que aguardam deliberação, pendências
  econômicas/operacionais e variantes futuras.

- **Catálogo completo de ciências/atos** do código, para escolha humana
  individual de manual/ao abrir/tácita/exclusão.

- Revisão semântica **de todas** as 121 causas e 149 critérios, não apenas
  validação de IDs preenchidos; correções fundamentadas de links e lotes.

- **Projeto visual por superfície** cobrindo 97 superfícies inventariadas na
  B1 x 66 superfícies planejadas na C3, botões, ícones, labels, máscaras,
  ajuda, diálogos, acordeões, formulários, responsividade e guias.

- Critérios de aceite C9 operacionais completos e oráculos negativos precisos,
  prontos para D executar sem introduzir testes superficiais.

- Handoff D atualizado, distinção AS_IS/TO_BE, PR **draft** A–C preparado e
  aberto conforme política, sem merge nesta missão.

**Não há autorização para alterar comportamento funcional, código de produção,
testes executáveis, Supabase/migrations, deploy, infraestrutura ou dados
remotos.** Esta é a última etapa de investigação/planejamento. O próprio HTML
fornecido é referência visual estática; não inserir no aplicativo em C.

#### III. C7 — DECISÕES, INVENTÁRIO DE CIÊNCIA E COERÊNCIA CAUSAL

**C7.0 Reconhecer a fonte**: verificar todas as 15 pendências P01–P15 e cada
resposta do responsável, normalizando status `OWNER_APPROVED`,
`OWNER_APPROVED_SCOPE_PENDING`, `OWNER_DEFERRED`, `PENDING_OWNER` sem apagar
as deliberações antigas. P01 aprovado com conferência pelo administrador
familiar; P03 proteção intermediária aprovada mas RPO/RTO e custos não
aprovados; P04 separado; P05 PDF de regularização e comunicação proporcional;
P06 resposta manual apta; P07 interface simples + investigação da devolução e
distinção de correção; P08 rascunhos não oficiais; P09 assinatura
criptográfica incorporada obrigatória; P10 dispositivos; P11 revisão BAL
opcional; P12 um rascunho por tipo; P13 segregação de alertas; P14 COM; P15
revogação e UX específica. Atualizar o registro humano com rastreabilidade sem
usar inferências como aprovação.

**C7.1 P02 — Inventário obrigatório, sem decisão automática:** inspecionar
arquivos reais e enumerar **TODAS** as ciências registráveis por tipo de
documento/ator/estado, distinguindo acesso, abertura, leitura, aviso,
aceitação, revisão, aprovação, compra, recebimento e transferência. Entregar
`SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv` e `SCIENCE_OWNER_REVIEW.md` com
ID, origem, efeito, manual/ao abrir/tácita elegíveis, evidência técnica e
campo de resposta do responsável. **Não inventar a classificação aprovada.**
Continuar demais trabalhos, mas registrar P02 como `OWNER_REVIEW_REQUIRED` até
manifestação humana. Não declarar fechamento integral da política de ciência
se ainda aberta.

**C7.2 P03 — Operação real dos backups:** preparar
`BACKUP_OPERATING_MODEL_FOR_OWNER.md`, linguagem não técnica, com opções de
provedores/ferramentas, custo verificável ou campos para cotação, rotina
diária/semanal/mensal, automação e falhas, responsável/substituto, testes
reais de restore em fase posterior, cobertura Auth/Storage/jobs e diferença
entre backup e continuidade. **Sem contratação, sem alterar ambiente**. Manter
metas 1h/4h apenas hipóteses até validação de capacidade/custo.

**C7.3 P07 — Matriz de movimentações:** mapear cada tipo presente: ENT
expedição/recebimento/devolução, transferência solicitada, compra validada,
consumo, inventário inicial, BAL, ajuste compensatório, descarte, inativação
com saldo, estorno, erro de contagem e qualquer outro movimento real. Para
cada fato definir se vira **transferência** (movimento físico entre custódias)
ou processo próprio (consumo/crédito/ajuste), pré-condições, autorização,
saldo, confirmação, efeito do registro, protocolo e vínculo. **Proibir criar
transferência fictícia para corrigir saldo**; não excluir UI antiga sem
equivalência demonstrada.

**C7.4 P09 — Modelo de documento assinado:** estabelecer identidade técnica do
sistema, certificado/chaves/guarda, opção interoperável de assinatura (avaliar
PAdES), novo exemplar por emissão, hashes e versão da ficha, fluxo de
assinatura, leitor-verificação, QR, validade, carimbo de tempo e
custos/fornecedores condicionais. Separar quem **solicitou** a emissão de quem
**assinou criptograficamente** (sistema). Evitar expor
IP/localização/dispositivo em PDF, QR ou página pública; registrar contexto
técnico mínimo com acesso restrito e retenção. Não inventar certificação
jurídica qualificada.

**C7.5 P08/P12 — Rascunhos:** especificar estado transitório privado por
tipo/usuário/paciente e intenção, retomada multidispositivo, escolha continuar
ou descartar, eliminação segura sujeita a preservação obrigatória, nenhum
protocolo oficial ou efeito material antes de envio. Analisar cópias técnicas
e obrigações legais sem prometer eliminar todos os vestígios. Decisão de
descarte não apaga ato emitido. Tratar aprovação/entrega como rascunhos
contextuais sem permitir criar nova intenção duplicada.

**C7.6 P11 — BAL:** política de revisão facultativa para primeiro uso, com
possibilidade de família/supervisão revisar, autoria de contador/revisor
diferenciada, reconto opcional e sucessão por substituta. Revisar regras já
existentes para evitar contradições, sem modificá-las em C.

**C7.7 O01/onboarding:** admin global cria nova residência/paciente por
wizard; perfil usuário tem guia opcional no primeiro login configurável por
administração autorizada e reabertura pelo próprio usuário. Manuais com etapas
e prints reais futuros; perfil da família/equipe primeiro, supervisão
posterior.

**C7.8 Assuntos transversais:** atualização de textos, decisões e matriz de
rastreio. Resolver compatibilidade com ciência, PDFs, transferências e acesso
sem inventar permissões. Se nova decisão realmente necessária, registrar
questionário objetivo por ID, recomendação e efeito de adiamento.

**C7.9 REVISÃO SEMÂNTICA DAS 121 CAUSAS:** cada causa e associação de origem
precisa ter inspeção humana-simulada por leitura de fonte/evidência, não
matching de string. Caso de atenção: `C-CAUSE-001` / `DB-006` e atribuição
potencialmente incorreta ao domínio REQ. Diferenciar de `C-CAUSE-049`
(`DB-002`,`B3-001`) e evitar juntar riscos independentes. Entregar matriz
`CAUSE_SEMANTIC_VERIFICATION.csv`, lista de alterações fundamentadas,
contagens e casos de divergência sem apagar evidências. Essa revisão deve
preceder a C9.

#### IV. C8 — BLUEPRINT VISUAL DEFINITIVO

**C8.0** O HTML fornecido `home-care-prototipo.html` é *proposta elaborada
fora do Codex*, não aprovação automática. **Não gastar tokens recriando
protótipos temporários**, não criar refactors na C8; documentar equivalências
e propor ajustes por escrito. O responsável avaliará a tela navegável.

**C8.1** Cruzar as 97 superfícies B1 com as 66 C3, atribuir cobertura real
para cada componente, modal, campo, estado e rota. Não presumir equivalência
dos denominadores. Mapear todas as superfícies órfãs/históricas e decisões de
manter/remover.

**C8.2** Elaborar `VISUAL_BLUEPRINT_BY_SCREEN.md` e fichas por tela, com
hierarquia, desktop/mobile/tablet, texto vs ícone, rótulos, tooltip, ajuda
inline, exemplos, sequência, default, máscara, autocomplete, listas, ações e
consequências, vãos e densidade, estados, teclado/leitor de tela, suporte e
manual contextual. Não basta dizer “seguir design system” ou “aplicar Fluent”.

**C8.3** Criar `UI_COPY_AND_MICROCOPY_MASTER.csv` para cada mensagem real e
nova, separando atual/proposta/status; evitar expressões técnicas, promessas
de ciência de leitura, aceite por terceiros, estoque de REQ interpretado como
zero, e rascunho como registro oficial.

**C8.4** Criar `COMPONENT_DECISIONS.md`: quando refazer telas do zero
(problema sistêmico de composição) vs quando evoluir componente existente;
requisitos de preservar APIs/movimentos/permissões; ganhos e riscos
mensuráveis. Liberdade explícita de redesenhar telas problemáticas na **D**;
não impor manutenção estética do legado.

**C8.5** Criar `GUIDED_HELP_AND_SCREENSHOTS_PLAN.md` por perfil e processo,
com guias acessíveis no primeiro acesso e no perfil; capturas de
**funcionalidade real** só serão feitas na D. Diferenciar imagens estáticas do
protótipo de telas validadas do aplicativo.

**C8.6** Criar `VISUAL_OWNER_REVIEW.md` com link para protótipo, decisões
visuais resolvidas, desvios e pontos de aprovação. **Não declarar blueprint
aprovado se o responsável não confirmou a direção do protótipo.** A C8 pode
ser completa como proposta auditável, mas trava de implementação visual
permanece até aprovação.

#### V. C9 — TESTES E ACEITE ESPECIFICADOS

**C9.1** Cruzar 149 aceites e 121 causas com os 165 achados e todas as
decisões complementares; atualizar mapeamento depois do C7.
`ACCEPTANCE_CRITERIA_MASTER.csv` deve ter linha por critério, links corretos,
prioridade de release, especificação por domínio e camada.

**C9.2** Converter os cenários em casos de teste verificáveis: estado inicial,
atores/permissões, dados fictícios, passos, resultado esperado, resultado
proibido, oráculo independente, efeitos laterais, erro/retry, persistência,
acessibilidade, móvel, dispositivo físico ou provedor externo, lote D,
dependência de decisão e execução `PLANNED_NOT_EXECUTED`.

**C9.3** Fazer exemplos completos para aceites críticos de ENT indelegável,
BAL revisão facultativa, P02, P09, rascunhos, P15, transferências, PWA,
scheduler e PDF sem texto. Conferir que teste não passe na presença do defeito
e que `NULL` não satisfaça saldo positivo. Não prometer 149 testes
automatizados já escritos.

**C9.4** Entregar `ACCEPTANCE_EXECUTION_BLUEPRINT.md` e
`C9_GAP_AND_DECISION_MATRIX.csv`, diferenciando teste pronto para implementar,
pendência humana, aparelho físico, integração externa e homologação remota.
Atualizar lotes D0–D7 conforme dependências.

**C9.5** NENHUMA alteração de testes executáveis da D ou funcional nesta
etapa. Validação documental dirigida e estática é permitida; não executar
cargas, migrations remotas, nem suites desproporcionais.

#### VI. C10 — FECHAMENTO DOCUMENTAL E DRAFT PR

**C10.1** Atualizar `docs/current/PROJECT_STATUS.md`, documentos C3/C4/C5/C6,
`docs/decisions` e índices; distinguir diretrizes aprovadas e política P02
pendente, protótipos propostos e funcionalidades não implementadas. Não
adulterar históricos A/B/C já datados. Publicar relatórios e bases C7–C10 em
estrutura canônica por subfase. Manter arquivo HTML de referência em diretório
C8 claramente descrito como *protótipo estático*, se aprovado para incluir.

**C10.2** Reconciliar links/IDs de causas, decisions, critério, lotes D e
tela; verificar que cada mudança deriva de fonte real; usar checksum/mapa
quando relevante; preservar arquivos históricos. Identificar honestamente
lacunas.

**C10.3** Revisar árvore Git e alterações exclusivamente documentais/apoio
autorizado; conferir `.vscode/settings.json`, `.gitignore`,
`requirements-audit.txt`. Sem arquivos privados, credenciais, caches ou
artefatos não autorizados. Publicar commit(s) com escopo claro na
`audit/phase-b`.

**C10.4** Criar PR **DRAFT** de `audit/phase-b` para `master` com descrição
executiva e mapa de evidências e documentos, disparando CI conforme
configuração do GitHub. **Não aguardar todos os jobs**: entregar
número/link/SHA/checks pendentes. Em caso de CI concluída rapidamente,
reportar sem fazer merge automático. Não usar check do Vercel Preview Comments
como substituto de CI de validação.

**C10.5** **NÃO FAZER MERGE NESTA MISSÃO.** O usuário retornará após
CI/revisão (inclusive eventual IA externa), para autorizar revisão e merge.
Nessa nova missão, CI deve estar verde para o último commit e Vercel
master/deploy deve estar protegido/claramente autorizado.

**C10.6** Branch cleanup **depois** do merge, nova autorização/identificação,
preservar commits via merge commit/tag ou outra retenção comprovada; não
apagar branches não integradas. Nova branch D será criada a partir da master
mesclada em missão posterior. Não usar `git push --delete` sem inventário e
validação.

#### VII. ENTREGÁVEIS MÍNIMOS

Em `docs/audits/C/` criar subpastas `C7-decision-closure`,
`C8-visual-blueprint`, `C9-acceptance-refinement`, `C10-pr-handoff` (adapte
nomenclatura sem duplicar canônicos), contendo:

**C7:** `README.md`, `PRODUCT_DECISIONS_C7_ADDENDUM.md`,
`SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv`, `SCIENCE_OWNER_REVIEW.md`,
`BACKUP_OPERATING_MODEL_FOR_OWNER.md`, `STOCK_MOVEMENT_TAXONOMY.md`,
`PDF_SIGNING_ISSUANCE_AND_VERIFICATION.md`, `DRAFT_NON_OFFICIAL_CONTRACT.md`,
`CAUSE_SEMANTIC_VERIFICATION.csv`, `OPEN_DECISIONS.md`.

**C8:** `README.md`, `B1_TO_C3_SURFACE_CROSSWALK.csv`,
`VISUAL_BLUEPRINT_BY_SCREEN.md`, `UI_COPY_AND_MICROCOPY_MASTER.csv`,
`FORM_CONTROL_CATALOG.csv`, `COMPONENT_DECISIONS.md`,
`GUIDED_HELP_AND_SCREENSHOTS_PLAN.md`, `VISUAL_OWNER_REVIEW.md`,
`prototype/home-care-prototipo.html` apenas como referência de design.

**C9:** `README.md`, `ACCEPTANCE_EXECUTION_BLUEPRINT.md`,
`ACCEPTANCE_CASES.csv`, `C9_GAP_AND_DECISION_MATRIX.csv`, revisões canônicas
da matriz de aceites e links, relatório de exemplos discriminantes.

**C10:** `README.md`, `CHECKPOINT.md`, `PHASE_C_FINAL_PART2_REPORT.md`,
`PHASE_D_HANDOFF_UPDATED.md`, `PR_REVIEW_CHECKLIST.md`,
`DOCUMENTARY_VALIDATION_REPORT.md`, `BRANCH_AND_PROVENANCE_REPORT.md`,
`OPEN_OWNER_GATES.md`.

Evitar documentação repetida: arquivos complementares podem apontar aos
canônicos desde que a cobertura permaneça integral.

#### VIII. CRITÉRIOS DE ENCERRAMENTO

- 15 pendências P01–P15 refletidas corretamente (especialmente P02 ainda em
  classificação individual; P03 parâmetros não contratados; P09 assinatura B
  obrigatória).

- 121 causas e 149 critérios revisados semanticamente; links incorretos
  corrigidos com evidência.

- Todas superfícies B1 e C3 reconciliadas ou explicitamente justificadas;
  blueprint granular de controles e conteúdo.

- Protótipo de origem preservado e identificado como proposta, aprovação
  visual do responsável separada.

- 149+ critérios prontos como **design de testes**, sem fingir execução
  funcional.

- Backlog D reordenado com dependências e critérios de release; documentos
  canônicos atualizados.

- Nenhuma alteração de produto, banco, integrações ou produção; histórico e
  evidências preservados.

- Draft PR criado com CI iniciada quando tecnicamente possível, **sem esperar
  CI nem fazer merge**; relatar eventual impedimento concreto em vez de forçar
  alteração.

- Bloqueios humanos remanescentes não serão ocultados: **C7–C10 pode ser
  entregue como pacote de planejamento, com PR draft, mas a política de
  ciência P02 não será intitulada aprovada antes de decisão do responsável.**

**EXECUTE C7→C8→C9→C10, EM UMA MISSÃO DOCUMENTAL, UTILIZANDO OS PROTÓTIPOS QUE
JÁ FORAM PRODUZIDOS. NÃO INICIE FASE D.**
