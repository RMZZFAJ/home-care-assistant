# Descobertas novas e lacunas estruturais

## Separação entre origem, prova e necessidade

O registro mestre tem 25 achados:16 recortes herdados e nove observações ou
mecanismos adicionais. Desses nove, há defeitos, fronteiras de autorização,
governança e riscos de capacidade/recuperação. Não são nove invasões nem25
problemas novos. A origem e a prioridade estão nos32 campos de cada registro.

- **Decisão nula** — O que foi demonstrado: NULL vira rejected em relato
  reported; Natureza/limite: Defeito RPC; API booleana mitiga; ID: B3-017.

- **Precisão original** — O que foi demonstrado: 1.0000004 vira1.000000 antes de
  validar produto inteiro; Natureza/limite: Defeito de coerção; API limita
  formato; ID: B3-018.

- **Apresentação NaN** — O que foi demonstrado: Fator não finito persiste no
  catálogo; Natureza/limite: Defeito de domínio; sem NaN no ledger demonstrado;
  ID: B3-019.

- **Autoridade após espera** — O que foi demonstrado: Movimento pré-iniciado
  comita depois de revogar; contexto tem janela equivalente; Natureza/limite:
  Garantia temporal a definir; novas chamadas negadas; ID: B3-020.

- **Sessão encerrada** — O que foi demonstrado: Perfil/avatar próprios ainda
  aceitam JWT no prazo por caminhos diretos; Natureza/limite: Lacuna comprovada;
  negócio/API recusam; ID: B3-021.

- **URL já emitida** — O que foi demonstrado: Download continua dentroTTL depois
  da revogação; Natureza/limite: Credencial temporária; decisão de governança;
  ID: B3-022.

- **Paginação nula** — O que foi demonstrado: NULL remove limite da RPC
  documental; Natureza/limite: Defeito limitado a leitura autorizada; ID:
  B3-023.

- **Custo SQL/alerta** — O que foi demonstrado: Planos amostrais e fixture1000
  interrompida no stack de autorização; Natureza/limite: Risco; amplia BE-006
  por mecanismo distinto; ID: B3-024.

- **Legado inválido** — O que foi demonstrado: Cast malformado aborta três lotes
  e health não avança; Natureza/limite: Fixture privilegiada; ingresso normal
  não demonstrado; ID: B3-025.

Busca nas conclusões A/B1/B2 não encontrou os mesmos contratos/reprodutores de
nulos, NaN, coerção, janelas de sessão/lock e URL. Tema geral de desempenho já
existia em BE-006; a novidade B3-024 é o mecanismo SQL e a evidência
proporcional.
Novo resultado não transforma o problema anterior relacionado em descoberta B3.

## Extensões de causas conhecidas

DB-002 não está só no teto25 de pacientes: um paciente com 100 terminais também
ocupa o limite interno. DB-006 passou de risco sustentado a reprodução local
de falta de progresso. DB-003 agora tem manifestação derivada de obrigação BAL.
B2-011 foi reproduzido sob decisões simultâneas. DB-005 ganhou medição de mil
versões sem perda de hash, e DB-004 ganhou teste concorrente da última vaga.
Cada causa mantém um achado; as manifestações ficam em matriz separada.

## Mecanismos existentes que devem ser aperfeiçoados

Antes de criar infraestrutura nova, aproveitar o que já existe: ledger
transacional, views por capacidade, grants fechados, keys e versões, guard de
último administrador, cursor BAL, leases e uncertain, hashes e snapshots,
assign_recount e revisão de convite. A ausência de progresso REQ não implica
que seja necessário substituir todo scheduler; o cursor BAL é contraprova.

- **Finitude/precisão** — Mecanismo atual: Guards RPC e trigger complementar;
  Lacuna concreta: Fator NaN e coerção precoce; Alternativas e custo: Validar
  antes de coercer/constraint justificada; diagnosticar legado.

- **Autoridade temporal** — Mecanismo atual: Auth/session/context e locks;
  Lacuna concreta: Alguns caminhos sem revalidação; Alternativas e custo:
  Alinhar ponto de autorização; medir locks e compatibilidade.

- **Recuperar anexo** — Mecanismo atual: Reserva/hash/key/bind; Lacuna concreta:
  Abandono sem liberação de capacidade; Alternativas e custo:
  Retomar/expirar/abandonar com prova; risco de apagar upload ativo.

- **Completude de leitura** — Mecanismo atual: Paginação de estoque/documento;
  Lacuna concreta: Duas rotas LIMIT100; Alternativas e custo: Estender contrato
  existente; medir índice, sem nova central obrigatória.

- **Progresso/saúde** — Mecanismo atual: Health, cursor BAL, outbox; Lacuna
  concreta: Terminais/poison e último sucesso insuficiente; Alternativas e
  custo: Elegibilidade/cursor/alerta de backlog; evitar sucesso falso.

- **Reconciliação entre serviços** — Mecanismo atual: Hash/bytes validados no
  upload; Lacuna concreta: Ready não é FK para objeto físico; Alternativas e
  custo: Inventário comparativo após restore; nenhuma exclusão automática agora.

- **Evolução de funções** — Mecanismo atual: 84 versões e contratos históricos;
  Lacuna concreta: Patches por replace com validação desigual; Alternativas e
  custo: Comparar corpos/ACL em replay isolado; sem editar migration antiga.

- **Retenção/capacidade** — Mecanismo atual: História verificável e compressão;
  Lacuna concreta: Orçamento de longo prazo desconhecido; Alternativas e custo:
  Medição e política de retenção; preservar hashes/documentos.

Riscos de evolução por transformação dinâmica não são drift atual comprovado:
20 diferenças diretas foram explicadas por patches posteriores; 232 rotinas
ficaram inalteradas durante a B3. Replay limpo/legado continua NOT_VERIFIED.

## Hipóteses refutadas ou delimitadas

- Uma tabela sem RLS não é exposição por si só: global_admin_guard não tem
  grants de dados aos papéis expostos; nenhum acesso foi inferido só do flag.
- SECURITY DEFINER ou função pública não significa entrada sem guarda:
  helpers antigos foram negados e a verificação pública só devolveu booleano.
- Administrador global sem vínculo não operou estoque/paciente local.
- Profissional com vínculos em dois pacientes não conseguiu criar associação
  documental cruzada, mesmo usando a mesma identidade global de produto.
- Movimento legado sem paciente já existia, ficou inalterado e é preservação
  intencional exigida no runner histórico; nenhum dado foi reatribuído.
- Metadata ready sem objeto foi fixture de serviço deliberada; não demonstra
  que cliente comum finaliza arquivo inexistente pelo upload normal.
- Leitura paginada completa em estado estável não prova cursor consistente
  sob inserts; dump legível não prova restauração; outbox não prova entrega.

## Antes de ampliar a arquitetura

Cada decisão futura precisa de problema verificável, escopo, alternativas,
custo de escrita/leitura, migração, compatibilidade e teste de recuperação.
Não se recomenda criar indiscriminadamente tabelas, índices, triggers, filas ou
funções. A primeira operação deve ganhar as garantias necessárias sem remover
as que já funcionam. Nada desta seção foi implementado.
