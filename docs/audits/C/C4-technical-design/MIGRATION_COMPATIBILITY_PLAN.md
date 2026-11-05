# Plano de evolução incremental e compatibilidade

**Não executado.** Não criar arquivos em supabase/migrations nesta C. Antes de
cada lote D, conferir cadeia atual, grants, funções vigentes, consumidores,
backup e destino autorizado. As 84 migrations e seus hashes históricos são
preservados. Nomes M1–M6 abaixo são grupos de desenho, não números de
migration.

## Sequência expandir, migrar consumidor, contrair quando autorizado

1. Congelar contratos de entrada/saída por cenário e produzir regressões que
   discriminem o defeito no baseline; salvar prova antiga sem sobrescrever B.

2. Introduzir coluna/estado/contrato novo de forma aditiva quando realmente
   necessário. Criar RPC e grants restritos no mesmo incremento; não deixar
   intervalo com tabela exposta por permissões default.

3. Ler registro antigo e novo com origem explícita. Não inferir campos físicos
   ausentes. Só fazer backfill determinístico de metadado técnico derivável,
   com contagem/hash antes/depois e amostra, nunca assinatura/data inventada.

4. Trocar API e UI sob feature gate/versionamento onde a compatibilidade
   exigir; validar cliente antigo com schema expandido e cliente novo com
   requisito mínimo.

5. Encerrar caminho antigo somente com consumidor/URL inventariados, plano de
   reversão compatível e autorização própria. Não remover histórico por
   estética.

## Grupos de alteração e salvaguardas

<!-- c-table:start -->

- **Grupo:** M1 — integridade/autoridade

  **Alteração planejada:** Corrigir seleção REQ, SQL ENT ambíguo,
  precisão/NULL/NaN, sessão direta e revalidação após lock conforme P15

  **Evolução legada e riscos:** Não editar migrations históricas; preservar
  assinaturas RPC compatíveis ou versionar. Filtrar elegibilidade antes de
  LIMIT; candidato inválido não pode sumir sem diagnóstico.

  **Prova exigida antes de aplicar fora do local:** Clean+upgrade legado, Auth
  real direto/HTTP, locks independentes, negação sem efeitos, progresso 25/100
  e dedup.

- **Grupo:** M2 — estados operacionais

  **Alteração planejada:** Dispensa COM, recusa/retirada ENT, obsolescência de
  proposta, reconto/substituição e sucessão administrativa

  **Evolução legada e riscos:** Estados novos exigem presenter antigo
  tolerante; históricos não ganham confirmação física; P06/P07/P14 fechados no
  ramo afetado.

  **Prova exigida antes de aplicar fora do local:**
  Normal/parcial/concorrente/terminal, replay e read-back do ledger; recebedor
  e autores preservados.

- **Grupo:** M3 — fonte documental

  **Alteração planejada:** Modo observado REQ, receiptId e parcelas em eventos
  futuros, nomes/datas de origem e versões

  **Evolução legada e riscos:** `legacy_unclassified` pode distinguir zero
  antigo de zero explicitamente declarado novo; não reclassificar todo zero
  passado como contagem válida. Original de evento é imutável.

  **Prova exigida antes de aplicar fora do local:** PDF/HTML/DTO/snapshot por
  versão; dados antigos e novos, nulo/zero/unknown; hash antigo continua
  igual.

- **Grupo:** M4 — edição/ciência/acesso

  **Alteração planejada:** Drafts de servidor, políticas/preferências
  versionadas e trilha de abertura

  **Evolução legada e riscos:** Separar draft de operational_documents; não
  consumir sequência. P02/P08/P12 aprovados antes de ativar retenção/ciência
  tácita.

  **Prova exigida antes de aplicar fora do local:** Duas contas/aparelhos,
  CAS, contexto trocado, conflito, atos expressos excluídos e ausência de
  acesso fictício.

- **Grupo:** M5 — arquivos/PDF

  **Alteração planejada:** Abandono/expiração segura, original/derivado,
  registro final de bytes e verificação do cache

  **Evolução legada e riscos:** Ready e originais não são apagados por nova
  limpeza; registro anterior continua distinguindo original/derivado/renderer.
  Limite de transporte coerente antes do upload.

  **Prova exigida antes de aplicar fora do local:** Falha em cada etapa,
  anotação/célula alta, digest divergente, impressão/AT e cópia histórica
  recuperável.

- **Grupo:** M6 — push/tentativas

  **Alteração planejada:** Subscription própria, estado por dispositivo e
  tentativa externa por geração

  **Evolução legada e riscos:** Reusar outbox/evento interno; separar
  transporte e efeito operacional. Novo worker não herda segredo/URL de outro
  ambiente.

  **Prova exigida antes de aplicar fora do local:** CSRF/SSRF/escopo,
  revoke/expiração/dedup, callback antigo versus lease nova e zero entrega em
  canal desligado.

<!-- c-table:end -->

Mudanças apenas de presenter, foco, filtro ou state machine de consulta podem
dispensar migration. A existência de uma causa não exige nova tabela. O
implementador deve demonstrar consumidor e necessidade antes de ampliar
schema.

## Modelos novos propostos e integridade referencial

Draft, subscription e acesso têm consumidores demonstrados. Chaves e FKs devem
incluir paciente/usuário pertinentes ou validar vínculo transacional; um UUID
global sozinho não prova contexto. Referências históricas não usam ON DELETE
CASCADE que apague fatos ao desligar pessoa ou inativar produto. Autor e alvo
mantêm identidade estável, com dados pessoais sob política P08. Índices seguem
predicados reais de titular/target/cursor e FKs, com EXPLAIN em volume
representativo somente se necessário; sem programa de índices por hábito.

Cada tabela exposta recebe RLS, USING/WITH CHECK apropriados e grants/defaults
revisados. Preferir acesso restrito por RPC onde o produto já o exige. Função
privilegiada precisa search_path fixo, autorização explícita, EXECUTE mínimo e
review de helper/serviço; service_role não é bypass de regra de domínio. Não
usar GUC arbitrário definido pelo cliente como identidade autorizada.

## Backfill, rollout e retorno

Diagnóstico de legado é read-only antes da decisão. Campo desconhecido recebe
marcação de origem desconhecida; nenhuma conta/protocolo antigo é recriado.
Backfill técnico, quando autorizado, opera em lotes com checkpoint, chave,
predicado estável e recuperação; recusa colisões em vez de escolher
silenciosamente. Comparar contagens/FKs/hashes e representação dos casos
críticos antes/depois.

Rollback da aplicação só ocorre para artefato compatível com schema expandido.
Evento/ledger confirmado não é revertido por checkout do código; corrigir com
novo evento/compensação legítima ou forward fix incremental. Se houver
incerteza física/external, conter novas ações e conciliar, sem
reenviar/reaplicar cegamente. Migration destrutiva ou remoção de campo antigo
fica fora do primeiro rollout salvo necessidade demonstrada e aprovação
específica.

Release exige atestado de artefato, schema mínimo, runtime, configuração de
capacidades e destino. Sem compatibilidade comprovada, parar antes de mutação
ou promoção. Backup legível não autoriza restore sobre ambiente existente.

## Precedência técnica C7–C10

As matrizes causais foram revisadas semanticamente, com domínios secundários
explícitos. P06/P11/P12/P14 e garantia de comando P15 já foram respondidos;
P02 e SCI-001–SCI-005 estão OWNER_APPROVED. Retenção, fornecedores e
parâmetros mantêm gates específicos, sem bloquear D0 geral ou D1 independente.
P09-B é obrigatório, com identidade própria por emissão; não ativar núcleo só
de hash como substituto. Toda evolução de schema usa migration incremental e
preserva os 84 hashes históricos.
[Adendo vigente](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md).

## Fechamento definitivo — tarefa, estado e política

D separa material/eventos/emissão e evidência causal por expedição, com ANY
familiar. Flags não desligam SCI-005; retirar created_by não retira
capacidade/estado. Preservar enum/eventos e nomes históricos, sem chamar
app_visible de diálogo ou inventar ciência na emissão para vinculado depois.
Migração incremental/compatibilidade/testes continuam trabalho técnico da D,
não escolha humana P02 em aberto.
