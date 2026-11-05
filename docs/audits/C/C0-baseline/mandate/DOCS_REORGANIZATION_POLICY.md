# POLÍTICA DE REORGANIZAÇÃO REAL DO REPOSITÓRIO DOCUMENTAL

Fase C — Inventariar, classificar, migrar, arquivar, atualizar e limpar com
segurança

**Escopo autorizado:** arquivos de documentação, relatórios, evidências de
auditoria, índices, instruções de orientação e ferramentas documentais
estritamente necessárias à transição de caminho.
**Não autorizado:** alterar lógica do produto, migrations, Auth/DB remoto,
código em `src/`, scripts funcionais, testes funcionais, providers,
infraestrutura, releases ou produção.
**Status:** parte **obrigatória** da Fase C, não apenas uma proposta para D.
**Fonte de leitura:** `PHASE_C_MASTER_ORDER.md` e este documento inicialmente
na raiz do repo. Codex pode mover/renomear e consolidar ambos na nova
estrutura.

---

## 1. Finalidade concreta

Reorganizar a documentação do Home Care Assistant para que uma pessoa ou uma
IA consiga distinguir imediatamente:

1. **Qual informação está vigente hoje.**
2. **Qual relatório descreve uma execução histórica.**
3. **Quais decisões de produto foram realmente aprovadas.**
4. **Qual mudança foi planejada, mas ainda não implementada.**
5. **Quais instruções são operacionais permanentes, e quais autorizações eram
   exclusivas de uma execução antiga.**
6. **Onde consultar evidência, histórico, plano de correção e requisitos de
   aceite.**

Não basta criar novos diretórios vazios: **mover e reindexar efetivamente os
documentos pertinentes**. Mas não se deve movimentar pastas
técnicas/funcionais por estética, quebrando imports, scripts ou
reproducibilidade.

---

## 2. Inventário confirmado do estado anterior

Na referência GitHub `audit/phase-b` confirmada em 30/10/2026:

**Na raiz:** `README.md`, `AGENTS.md`, `requirements-audit.txt`, configurações
Node/Next/Vercel, `src/`, `supabase/`, `scripts/`, `tests/`.

**Arquivos diretamente sob `docs/`:** `API.md`, `ARCHITECTURE.md`, `AUDIT.md`,
`DATABASE.md`, `DEPLOYMENT.md`, `OPERATIONS.md`, `PROJECT_STATUS.md`,
`ROADMAP.md`, `SECURITY.md`, `TESTING.md`, `WHATSAPP_AI.md`.

**Subárvores:** `docs/audits/`, `docs/evolution/`, `docs/meta/`,
`docs/references/`, `docs/ui-ux/`.

**Auditorias:**

- `docs/audits/2026-10-20/` — precursor histórico.
- `docs/audits/2026-10-21/` — precursor histórico e autorizações datadas.
- `docs/audits/2026-10-25-production-readiness/` — Fase A formal.
- `docs/audits/2026-10-28-phase-b1-interface/` — B1.
- `docs/audits/2026-10-29-phase-b2-processes/` — B2.
- `docs/audits/2026-10-29-phase-b3-database/` — B3.
- `docs/audits/2026-10-30-phase-b4-backend/` — B4.
- `docs/audits/2026-10-30-phase-b5-integrations/` — B5.
- `docs/audits/2026-10-30-phase-b6-documents/` — B6.
- `docs/audits/2026-10-30-phase-b7-operational-readiness/` — B7.
- `docs/audits/2026-10-30-phase-b8-quality-maintainability/` — B8.
- `docs/audits/phase-b/` — índice B anterior.

**Problema documentado na B8:** documentos de entrada misturam contagens
antigas (19, 35, 63 vs 84 migrations), autorizações de deploy de 21/22 de
outubro e relato de PRs já históricos como se fossem estado atual. Atualizar
com a devida preservação, não reinterpretar autorização anterior como
presente.

---

## 3. Organização-alvo sugerida

```text
docs/
  README.md                      # PORTAL CANÔNICO: início por público
  RELOCATION_MAP.csv             # caminhos originais, novos e justificativa
  current/                       # estado do produto realmente implementado
    README.md
    ARCHITECTURE.md
    API.md
    DATABASE.md
    SECURITY.md
    TESTING.md
    OPERATIONS.md
    DEPLOYMENT.md
    PROJECT_STATUS.md
    ROADMAP.md
    INTEGRATIONS.md
  decisions/                     # decisões humanas de produto e governança
    README.md
    PRODUCT_DECISIONS_MASTER.md
    ADR/
  runbooks/                      # procedimentos e contingência; não aplicar agora
  audits/
    README.md
    A/
      README.md
      2026-10-25-production-readiness/
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
      CHECKPOINT.md
      C0-baseline/
      C1-consolidation/
      C2-decisions/
      C3-functional-specification/
      C4-technical-design/
      C5-execution-roadmap/
      C6-acceptance-handoff/
    D/
      README.md                 # estrutura reservada, ainda não executada
    _historical/
      2026-10-20/
      2026-10-21/
  archive/
    README.md                    # registro de conteúdo não vigente e razão
    evolution/                   # se as execuções antigas forem realmente históricas
    ui-ux/                       # apenas snapshots vencidos, não guias ativos
    meta/                        # apenas materiais históricos; não segredos
    references/                  # casos demonstrados de referência obsoleta
```

**Adaptação autorizada:** o Codex pode simplificar caminhos, preferir
`docs/current/` ou manter alguns arquivos ativos em `docs/` se
scripts/exemplos utilizarem seus endereços estáveis, combinar C0/C6 por
questões organizacionais, renomear documentos para termos mais consistentes,
mover os documentos provisórios da raiz e criar `docs/index.md`/ponte quando
necessário. A existência efetiva das divisões `audits/A`, `B`, `C`, `D` e
B1–B8 organizados é obrigatória.

**Não criar duas versões ativas concorrentes do mesmo contrato.** Se mantiver
stub histórico em caminho velho, sinalizar redirecionamento, não deixar um
documento antigo afirmando que está atualizado.

---

## 4. Classificação de conteúdo antes de qualquer movimentação

Produzir CSV com
`old_path,category,current_consumer,reason,new_path,action,original_sha256,final_sha256,link_impact,validation,status`.

Categorias:

- `CURRENT_CONTRACT`: contrato em vigor e ainda utilizado.
- `CURRENT_GUIDE`: orientação operacional vigente.
- `APPROVED_DECISION`: escolha de produto efetivamente aprovada.
- `PLANNED_NOT_IMPLEMENTED`: especificação/planejamento C.
- `HISTORICAL_AUDIT_EVIDENCE`: pacote A/B com provas e manifestos.
- `HISTORICAL_EXECUTION`: execução antiga, autorização datada, PR/captura
  legada.
- `REFERENCE_MATERIAL`: material não operacional de suporte.
- `OBSOLETE_DUPLICATE`: documento cujo conteúdo foi substituído, sem
  referência exclusiva.
- `TEMP_ARTIFACT`: resultado descartável com origem e consumidores
  verificados.
- `UNKNOWN`: NÃO MOVER/EXCLUIR sem investigação.

Ações:

- `KEEP_CURRENT`, `UPDATE_CURRENT`, `GIT_MV`, `ARCHIVE`,
  `KEEP_COMPATIBILITY_STUB`, `DELETE_DOCUMENT_ONLY`, `DEFER_WITH_REASON`.

**Prioridade de segurança:** conteúdo com valor histórico/probatório pertence
a `GIT_MV` ou `KEEP`, nunca `DELETE_DOCUMENT_ONLY`.

---

## 5. Regras especiais para os relatórios de auditoria

As auditorias contêm muitos links relativos e manifestos. Pastas precisam ser
movidas **como conjuntos inteiros**, preservando:

- Texto histórico.
- Evidências originais.
- Resultados positivos e negativos.
- Capturas de tela.
- PDFs de teste.
- CSVs de achados.
- Manifestos e hashes originais.
- Inputs.
- Scripts de reprodução históricos.
- Checkpoints.

**Risco de profundidade:** mover `docs/audits/2026-10-30-phase-b4-backend`
para `docs/audits/B/B4/2026-10-30-phase-b4-backend` introduz duas camadas.
Links como `../../../src/...` e `../../..` deixam de funcionar, mesmo que
links internos `evidence/...` permaneçam corretos.

Procedimento recomendado:

1. Capturar hash LF/bytes e caminhos originais.
2. Identificar links Markdown, HTML, CSV/JSON estruturados, caminhos de CLI,
   GitHub anchors, imports/reproduções, referencias de scripts e documentos
   atuais.
3. Mover com `git mv`, mantendo a árvore inteira.
4. Atualizar caminhos apenas onde necessários e seguros. Para links textuais
   editoriais em relatórios, documentar `old_hash/new_hash` e a substituição
   de link, **sem alterar conclusões**. Os manifestos anteriores permanecem
   intactos e o relatório de relocação explica diferenças de hash geradas por
   atualização editorial.
5. Preservar o valor dos experimentos datados; links dentro de um JSON de
   prova podem ser registros históricos e não referências que devam ser
   reescritas. Anotar no mapa quando a URL antiga é dado, não hiperlink vivo.
6. Não recalcular manifests antigos para 'passar' como se o experimento
   tivesse ocorrido na nova data.
7. Verificar acessibilidade via índice novo, e onde necessário preservar stub
   de caminho antigo com o mínimo de conteúdo de encaminhamento, sem duplicar
   provas.
8. Reexecutar somente validações documentais proporcionais; não executar
   novamente SQL mutável, Meta, geração de PDFs, E2E, migrations, ou testes
   reais em pacientes.

Se a movimentação de certa evidência quebrar mecanismo crítico não reparável
apenas em documentação, **preserve-a no caminho original e crie índice lógico
na nova estrutura**, registrando exceção. Melhor preservar a prova do que
obter simetria estética.

---

## 6. Documentação vigente versus arquivos históricos

**Objetivo:** atualizar o que permanece ativo e arquivar o que virou
fotografia de outubro, sem apagar história.

Avaliar especificamente:

**`README.md` (raiz):** atualizar visão do sistema, links canônicos, comandos
seguros e distinção entre software implementado e C aprovada. Remover ou mover
para histórico alegações de 'CI verde' e contagens incompatíveis com o SHA
atual. Não declarar release apto nem que PWA já funciona.

**`AGENTS.md`:** preservar o bloco gerenciado por Next (não o remover se
ferramenta o regenera), corrigir referência a '19 hashes' quando proteção
atual envolve 84 migrations, descrever hierarquia de fontes e obrigação de
buscar `docs/README.md`, `docs/decisions/` e a versão atual. Distinguir
autorização local de documentação historicamente concedida. Não adotar
instruções antigas como permissão atual.

**`docs/PROJECT_STATUS.md`:** fonte do estado atual por data e SHA, com
comparativo `product_code_sha`, `audit_branch_sha`,
`last_production_deploy_sha` somente se efetivamente verificado; se não,
indicar `NOT_VERIFIED`. Registrar A+B1–B8 concluídas, C documental em
execução/concluída conforme real, D não iniciada, NO-GO; não apresentar PR5
histórico como progresso contemporâneo.

**`docs/DEPLOYMENT.md`:** remover do texto vigente autorização de 22/10 como
se valesse para qualquer missão; transferir a autorização datada ao histórico;
manter procedimentos técnicos corretos e tornar claro que atualizações remotas
exigem autorização nova.

**`docs/evolution/EXECUTION.md`:** preservar narrativa de implementação
passada como histórico datado; atualizar portal para evitar tratá-la como
estado vivo de fase C.

**`docs/ROADMAP.md`, `docs/AUDIT.md`, `docs/WHATSAPP_AI.md`:** alinhar termos
'deferido', 'implementado', 'homologado', 'não verificado' e 'dependência
externa'.

**`docs/ui-ux`, `docs/meta`, `docs/references`:** classificar arquivo a
arquivo; guias ainda válidos podem permanecer ativos, snapshots de
implementação antiga vão ao archive. Não arquivar indiscriminadamente manual
válido. Não copiar dados privados ou arquivos `.env`.

**`README.md` futuro de D:** reservar escopo/fases, mas informar claramente
“NÃO EXECUTADO”.

---

## 7. Exclusão controlada de documentos obsoletos

O responsável autorizou remover documentos desnecessários, **não evidências
importantes nem código operacional**. O Codex deverá encontrar candidatos
reais, não inventar nomes para mostrar trabalho.

### Pode remover com prova e registro

- Arquivo documental temporário sem valor histórico, consumidores e
  autoridade.
- Duplicata perfeita, já preservada numa fonte canônica, sem referência
  específica nem valor evidencial independente.
- Stub antigo não mais necessário após confirmar referências e
  compatibilidade.
- Diretório vazio resultante da migração.

### NÃO remover na C

- Qualquer parte dos pacotes A ou B1–B8, inclusive documentos repetidos, pois
  podem explicar o método e o contexto de prova.
- Documentos de referência necessários para repetir/interpretar auditorias
  antigas.
- Migrações, contratos SQL, registros de usuário, PDFs operacionais ou anexos
  reais.
- Componentes, APIs, scripts funcionais ou testes da aplicação, mesmo se
  candidatos a código morto em B8.
- Conteúdos de outros projetos/usuário sem relação demonstrada.

### Antes de excluir

1. Demonstrar que o arquivo é realmente obsoleto e não referenciado por
   código, docs ativos, testes ou contrato externo conhecido.
2. Registrar
   `path,reason,consumer_evidence,history_recoverable,decision,commit`.
3. Preferir `git rm` somente dentro do escopo documental.
4. Conferir a lista removida no diff antes do push.
5. Se a remoção for incerta, **mover ao archive ou adiar**.

**Não fazer exclusões em massa com glob sem revisar a lista exata de
arquivos.**

---

## 8. Ferramentas e validação da migração

### Validações

- `git status` e diff/status entre HEAD inicial e final.
- Contagem e íntegra de arquivos A/B antes/depois.
- Verificação de SHA-256 dos arquivos probatórios cujos bytes não deveriam
  mudar.
- Lista das mudanças editoriais de links, com diffs limitados às referências.
- Links Markdown locais existentes e resolução de caminhos que apontam a
  `src/` ou documentos atuais.
- Source anchors e índices atualizados.
- Referências de bibliotecas de documentos/GUI do usuário preservadas quando
  conhecidas; links do GitHub podem precisar trocar endereço.
- Exposição de secrets = zero; não listar nem copiar credenciais.
- Diff funcional = zero, migrations = zero, testes de produto = zero.
- Indicadores de estado NO-GO/C planejada/D ainda não iniciada consistentes.

### Exceções documentadas

Alguns links contidos em JSON e logs são dados históricos e não devem ser
reescritos. Relatar quais ficam apontando à origem antiga e como consultá-los
hoje no índice de relocação. Não apresentar '0 broken links' de maneira
enganosa quando o validador excluiu históricos.

### Publicação

- Movimentos na branch `audit/phase-b`; preservar `master` e commits
  anteriores.
- Commits por marco documental se necessário, com mensagens explícitas de
  migração.
- Push somente após validar conteúdo e lista de deletados.
- Não abrir PR, merge ou deploy funcional.

---

## 9. Critério de aceitação desta política

A reorganização está concluída quando uma pessoa consegue:

1. Abrir `docs/README.md` e localizar **em poucos cliques** o estado atual,
   decisões e auditorias.
2. Encontrar Fase A, B1–B8, C0–C6 e D reservada nas quatro seções
   estruturais.
3. Saber se cada documento é `VIGENTE`, `HISTÓRICO`, `DECISÃO APROVADA`,
   `PLANEJADO NÃO IMPLEMENTADO` ou `ARQUIVADO`.
4. Localizar os relatórios originais e evidências sem perder
   hashes/manifestos originais.
5. Navegar pelos links corrigidos, ou entender exceções reais mapeadas.
6. Consultar os 165 registros A+B e o registro mestre de decisões sem
   depender dos caminhos antigos.
7. Compreender que um plano aprovado na C não significa implementação na D.
8. Reexecutar somente os verificadores documentais necessários, sem provocar
   alteração remota nem reset.
9. Conferir um mapa completo de arquivos movidos, arquivados, excluídos e
   preservados.

A migração é **obrigatória**, mas o critério de sucesso não é quantidade de
arquivos movidos: é clareza, conservação histórica e ausência de quebra
funcional.
