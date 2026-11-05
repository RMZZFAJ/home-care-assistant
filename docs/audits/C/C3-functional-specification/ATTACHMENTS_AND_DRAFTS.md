# Anexos, tentativa incerta e rascunhos entre aparelhos

AS_IS: Attachments, /api/attachments, reserva idempotente, quarantine/ready,
hash e Storage privado; REQ usa sessionStorage de 24h, COM também tem draft
documental de servidor. São objetos diferentes. B1-ERR-001, B3-004, B4-007,
B6-008 e B7-005 delimitam editabilidade incerta, capacidade, avatar,
fidelidade e limite de transporte. TO_BE DEC-011/012/017, O13 e P08/P12/P15.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ARQ-01

  **Rota e situação:** Painel de anexos em documento/movimento, atual a
  alterar

  **Objetivo e ações:** Selecionar, conferir, enviar e consultar
  tentativa/arquivo.

- **Tela:** ARQ-02

  **Rota e situação:** Recuperar/abandonar, novo contrato

  **Objetivo e ações:** Consultar mesma reserva; abandonar só o não concluído,
  sem destruir ready.

- **Tela:** RAS-01

  **Rota e situação:** Retomada em cada formulário, novo contrato durável

  **Objetivo e ações:** Continuar ou descartar somente rascunho; comparar
  estado atual.

- **Tela:** RAS-02

  **Rota e situação:** Conflito entre aparelhos, novo diálogo

  **Objetivo e ações:** Comparar versões e escolher edição com autoria; não
  sobrescrever silenciosamente.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Arquivo

  **Tipo/origem por tela e estado:** ARQ-01 Arquivo: EDITABLE (FILE_PICKER);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ARQ-01 Arquivo: Ao anexar, vazio

  **Validação/unidade:** ARQ-01 Arquivo: Bytes/MIME/signature/limite de
  transporte coerentes; não só extensão; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ARQ-01 Arquivo: “Foto ou PDF do registro, sem senha.”

- **Campo:** Descrição

  **Tipo/origem por tela e estado:** ARQ-01 Descrição: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ARQ-01 Descrição: Opcional, vazio

  **Validação/unidade:** ARQ-01 Descrição: Limite explícito de contrato em D;
  não incluir dado privado desnecessário; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ARQ-01 Descrição: “Conferência da parcela de 2 unidades.”

- **Campo:** Tentativa

  **Tipo/origem por tela e estado:** ARQ-01 Tentativa: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; ARQ-02 Tentativa: INTERNAL (NO_USER_CONTROL);
  Dado de comando/transporte; nunca input ou identificador técnico exigido ao
  usuário

  **Obrigatoriedade/default na preparação:** ARQ-01 Tentativa: Não renderizar
  controle; ARQ-02 Tentativa: Não renderizar controle

  **Validação/unidade:** ARQ-01 Tentativa: Somente contrato interno, com
  validação no servidor; não expor segredo/UUID como decisão do usuário;
  ARQ-02 Tentativa: Somente contrato interno, com validação no servidor; não
  expor segredo/UUID como decisão do usuário

  **Ajuda/exemplo:** ARQ-01 Tentativa: Campo de arquivo bloqueado enquanto
  resultado for incerto.; ARQ-02 Tentativa: Campo de arquivo bloqueado
  enquanto resultado for incerto.

- **Campo:** Estado da reserva

  **Tipo/origem por tela e estado:** ARQ-01 Estado da reserva: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ARQ-02 Estado da reserva: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Obrigatoriedade/default na preparação:** ARQ-01 Estado da reserva: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ARQ-02 Estado da reserva:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ARQ-01 Estado da reserva: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ARQ-02 Estado da reserva: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** ARQ-01 Estado da reserva: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; ARQ-02 Estado da reserva: Informação
  do registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Original/derivado

  **Tipo/origem por tela e estado:** ARQ-01 Original: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ARQ-01 Derivado: READ_ONLY (TEXT_VALUE); Consulta do valor de
  origem; mudanças só no processo legitimamente responsável; ARQ-01
  Transformação aplicada: READ_ONLY (TEXT_VALUE); Consulta do valor de origem;
  mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ARQ-01 Original: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ARQ-01 Derivado: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; ARQ-01 Transformação aplicada: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado

  **Validação/unidade:** ARQ-01 Original: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ARQ-01 Derivado: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ARQ-01 Transformação aplicada: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** ARQ-01 Original: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ARQ-01 Derivado: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; ARQ-01 Transformação aplicada:
  Informação do registro indicado, somente para consulta nesta etapa. Ausência
  de dado histórico permanece explicitamente identificada.

- **Campo:** Tipo/intenção do rascunho

  **Tipo/origem por tela e estado:** RAS-01 Tipo do rascunho: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Alvo e intenção: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Obrigatoriedade/default na preparação:** RAS-01 Tipo do rascunho: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; RAS-01 Alvo e intenção: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** RAS-01 Tipo do rascunho: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Alvo e intenção: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** RAS-01 Tipo do rascunho: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; RAS-01 Alvo e intenção: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Conteúdo e etapa

  **Tipo/origem por tela e estado:** RAS-01 Conteúdo da edição: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Etapa atual: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Obrigatoriedade/default na preparação:** RAS-01 Conteúdo da edição: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; RAS-01 Etapa atual: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** RAS-01 Conteúdo da edição: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Etapa atual: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** RAS-01 Conteúdo da edição: Confira o conteúdo salvo; para
  alterá-lo, continue no formulário de origem.; RAS-01 Etapa atual: A etapa
  mostra onde continuar o preenchimento; ela não é um texto para editar.

- **Campo:** Base do documento/ledger/política

  **Tipo/origem por tela e estado:** RAS-01 Versão documental base: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Revisão do ledger base: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; RAS-01 Versão da política base: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** RAS-01 Versão documental base:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; RAS-01 Revisão do ledger
  base: Não renderizar controle; RAS-01 Versão da política base: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** RAS-01 Versão documental base: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; RAS-01 Revisão do ledger base: Somente contrato
  interno, com validação no servidor; não expor segredo/UUID como decisão do
  usuário; RAS-01 Versão da política base: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** RAS-01 Versão documental base: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; RAS-01 Revisão do ledger base: “A
  entrega mudou desde ontem. Revise antes de continuar.”; RAS-01 Versão da
  política base: Informação do registro indicado, somente para consulta nesta
  etapa. Ausência de dado histórico permanece explicitamente identificada.

- **Campo:** Último salvamento

  **Tipo/origem por tela e estado:** RAS-01 Salvo em: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; RAS-01 Revisão do rascunho: READ_ONLY (TEXT_VALUE); Consulta do
  valor de origem; mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** RAS-01 Salvo em: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; RAS-01 Revisão do rascunho: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado

  **Validação/unidade:** RAS-01 Salvo em: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; RAS-01 Revisão do rascunho: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** RAS-01 Salvo em: A data pertence ao fato identificado.
  Data de registro e de emissão são mostradas separadamente quando forem
  diferentes.; RAS-01 Revisão do rascunho: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

- **Campo:** Escolha na retomada

  **Tipo/origem por tela e estado:** RAS-01 Escolha na retomada:
  EXPLICIT_ACTION (RESUME_OR_DISCARD_BUTTONS); Continuar, descartar e começar
  nova ou voltar; nenhuma destrutiva preselecionada

  **Obrigatoriedade/default na preparação:** RAS-01 Escolha na retomada: Sem
  concordância material inicial ou clique automático

  **Validação/unidade:** RAS-01 Escolha na retomada: Descartar não elimina
  documento emitido ou ato confirmado; Continuar, descartar e começar nova ou
  voltar; nenhuma destrutiva preselecionada

  **Ajuda/exemplo:** RAS-01 Escolha na retomada: Continuar rascunho ou
  Descartar e começar nova; um por usuário/paciente/tipo de criação e por alvo
  contextual P12.

- **Campo:** Escolha de conflito

  **Tipo/origem por tela e estado:** RAS-02 Escolha de conflito:
  EXPLICIT_ACTION (COMPARISON_ACTIONS); Escolher abrir versão do servidor ou
  revisar meus campos; novo save CAS ocorre no formulário

  **Obrigatoriedade/default na preparação:** RAS-02 Escolha de conflito: Sem
  concordância material inicial ou clique automático

  **Validação/unidade:** RAS-02 Escolha de conflito: Novo compare-and-swap;
  nenhuma fusão automática de decisão; Escolher abrir versão do servidor ou
  revisar meus campos; novo save CAS ocorre no formulário

  **Ajuda/exemplo:** RAS-02 Escolha de conflito: Comparar campos, autor e
  instantes.

<!-- c-table:end -->

## Fluxo do arquivo e recuperação

Reservar com chave/fingerprint → upload → validar/sanitizar → vincular ready.
Perda de resposta antes/depois de cada etapa consulta tentativa autorizada.
Ready encontrado encerra recuperação e apresenta arquivo; usuário não pode
trocar bytes mantendo a chave antiga. Nova escolha exige outra intenção depois
de resolver a anterior. Rejeição explícita não é uncertain; transporte perdido
não prova rejeição. Anexo salvo sem resposta não vira duas cópias por retry.

Abandono é ato formal sobre reserva incompleta e sem upload ativo/resultado
pendente. Expiração requer política P08 e proteção contra corrida com
finalize. Ready, derivado válido, original restrito e história não são
removidos para recuperar a vaga. Job de limpeza futuro usa
estado/lease/versão, grace period aprovado e trilha, não contagem
indiscriminada do bucket. Dez reservas abandonadas não devem impedir nova
intenção para sempre.

PDF ativo é recusado ou transformado por mecanismo seguro. Ressalva visível em
FreeText/Ink/campo passivo deve sobreviver em derivado fiel ou o arquivo ser
recusado com explicação. Não retirar sanitização para corrigir B6-008.
Original, se retido, fica em custódia restrita sem execução no navegador; hash
do derivado não é chamado hash do original. Política por classe P08.

Teto de negócio não pode exceder o transporte vigente. Alternativas em D4:
limite seguro com overhead e aviso antecipado, ou upload direto autorizado com
quarentena, tamanho/hash, conclusão e retomada verificados. Nenhuma solução
foi implementada em C. Avatar segue ciclo equivalente adequado a perfil
próprio.

## Fluxo do rascunho e concorrência

Abrir formulário consulta rascunho do usuário no paciente/intenção.
Encontrado, mostra tipo, target, data e continuar/descartar. Save de servidor
versionado não consome protocolo, não aceita recebimento, não aprova nem
movimenta estoque. Abrange preenchimento e decisões de múltiplas etapas,
inclusive divergência, aprovação, correção e pedido; conclusão sempre é
comando separado revalidado.

Outro aparelho carrega a versão confirmada. Dois editores usam
expectedDraftVersion; segundo save obsoleto recebe conflito e conserva sua
edição local para comparar. Não aplicar LWW a quantidades, recebedor ou
decisão. Retomar amanhã relê permissões, catálogo, documento, assignment e
ledger. Base antiga pode ser revisada como rascunho, jamais executada
automaticamente.

Offline informa edição ainda não salva; não promete disponibilização em outro
aparelho até confirmar sync. Não enfileira recebimento/aceite em background.
Na conclusão confirmada, marcar rascunho consumido pela identidade do
resultado; se resposta se perde, recuperar comando antes de descartar.
Logout/revogação retiram acesso local a conteúdo; servidor guarda conforme
política, sem transferir a outro usuário. Retenção/abandono temporal aguardam
P08/P12.

Aceites: queda antes/depois do commit mantém mesmo arquivo; fingerprint
diferente conflita; abandono concorrente com ready não apaga pronto; PDF com
anotação não perde informação silenciosamente; save em A recupera em B amanhã;
save concorrente exige revisão; descartar não remove ENT emitida; retomar
aprovação obsoleta impede efeito; troca de usuário/paciente não recupera dados
alheios. Revisão móvel/AT cobre foco, arquivo e estado uncertain.

## Atualização vinculante C7–C10

P12 aprova um rascunho de criação por usuário/paciente/tipo e contextuais por
intenção/alvo; continuar ou descartar/iniciar. P08 separa save privado de
documento, sem protocolo/PDF/ciência/ledger. Descarte não apaga
ready/oficial/backups/preservação obrigatória; nenhum TTL automático de 90/180
dias aprovado.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

RAS-01 mostra conteúdo/etapa em resumo de leitura; continuar abre formulário
de origem, sem editor de payload/etapa serializados. RAS-02 compara campos e
exige revisão/save CAS sem fusão automática. ARQ-02 consulta arquivo/tentativa
fixos; não troca bytes sob a mesma intenção. Save/reconexão não confirmam
atos.
