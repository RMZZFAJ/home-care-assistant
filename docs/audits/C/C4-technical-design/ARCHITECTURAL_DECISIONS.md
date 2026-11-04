# Alternativas arquiteturais e estado da decisão

São decisões de desenho para orientar D; finalidade humana aprovada e detalhe
proposto têm status distintos. Nenhum ADR concede execução.

<!-- c-table:start -->

- **ID:** C-ADR-01

  **Questão e alternativas:** Manter RPC/RLS/ledger/outbox ou reconstruir
  stack

  **Direção para planejamento:** Reusar controles e corrigir fronteiras
  demonstradas. Reescrita amplia risco sem consumidor/benefício provado.

  **Status/condição:** EXISTING_TO_PRESERVE; novas estruturas só para
  consumidor real.

- **ID:** C-ADR-02

  **Questão e alternativas:** Draft em sessionStorage, servidor versionado ou
  sync offline genérico

  **Direção para planejamento:** Servidor versionado atende dias/aparelhos;
  manter UX de recuperação existente até compatibilidade comprovada. Sync de
  comandos offline amplia incerteza e não integra a decisão.

  **Status/condição:** OWNER_APPROVED finalidade DEC-012; modelo técnico
  proposto; P08/P12 pendentes.

- **ID:** C-ADR-03

  **Questão e alternativas:** Transferência simples via ENT ou documento/motor
  novo

  **Direção para planejamento:** Reuso ENT com
  declaração/contrassinatura/aceite separados é recomendação de menor
  duplicação. Pode manter fluxo completo até escolha.

  **Status/condição:** PENDING_OWNER P07; não selecionar silenciosamente.

- **ID:** C-ADR-04

  **Questão e alternativas:** Verificador de hash, manifesto assinado ou
  assinatura incorporada

  **Direção para planejamento:** Registro final confiável e comparação de
  bytes primeiro; assinatura técnica opcional aumenta governança de
  chaves/confiança. QR não substitui comparação.

  **Status/condição:** OWNER_APPROVED resultado DEC-018;
  TECHNICAL_IMPLEMENTATION_DELEGATED núcleo; P09 extensão pendente.

- **ID:** C-ADR-05

  **Questão e alternativas:** Cache privado offline ou shell público e
  consulta autenticada

  **Direção para planejamento:** Shell público evita exposição de acervo por
  cache/conta compartilhada; edição não salva deve ser claramente indicada.

  **Status/condição:** PROPOSED_TECHNICAL_DEFAULT sob invariantes; não promete
  operação sem rede.

- **ID:** C-ADR-06

  **Questão e alternativas:** Teto menor de upload ou upload direto em
  quarentena

  **Direção para planejamento:** Escolher pela necessidade real e limites da
  plataforma. Teto coerente é mais simples; direto exige reserva, hash,
  autorização e finalize seguros.

  **Status/condição:** TECHNICAL_DESIGN_PROPOSED D4; requisito de arquivo real
  e P10 orientam escolha.

- **ID:** C-ADR-07

  **Questão e alternativas:** URL de 120 s aceita ou proxy revalidado

  **Direção para planejamento:** Ambos têm custo/janela diferentes; arquivo já
  baixado sempre foge à revogação. Revalidar nova consulta é obrigatório.

  **Status/condição:** PENDING_OWNER P15; não chamar janela atual de defeito
  absoluto nem aceitá-la por omissão.

- **ID:** C-ADR-08

  **Questão e alternativas:** Otimizar dashboard/histórico já ou medir
  primeiro

  **Direção para planejamento:** Preservar desenho, definir P13 e medir
  gargalo/volume. Não adicionar cache/fila/índice distribuído por contagem de
  chamadas.

  **Status/condição:** RECOMMENDATION_NOT_APPROVED para otimização estrutural;
  orçamento pendente.

<!-- c-table:end -->

Alternativas rejeitadas por regra expressa: DML direto para contornar RPC,
aceite físico por terceiro, saldo apagado para inativar, autores retroativos,
ciência chamada leitura e reset de operação/fixtures reais. São REJECTED por
invariante, não opções pendentes. Limpeza de módulos/URLs depende grafo
completo
e autorização D-LATER; AppWorkspace e /inventarios continuam preservados.
