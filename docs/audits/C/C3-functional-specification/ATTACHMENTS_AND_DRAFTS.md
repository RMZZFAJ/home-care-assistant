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

  **Tipo/origem:** Seleção local do usuário

  **Obrigatório e default:** Ao anexar, vazio

  **Validação/unidade:** Bytes/MIME/signature/limite de transporte coerentes;
  não só extensão

  **Ajuda e exemplo:** “Foto ou PDF do registro, sem senha.”

- **Campo:** Descrição

  **Tipo/origem:** Texto do autor

  **Obrigatório e default:** Opcional, vazio

  **Validação/unidade:** Limite explícito de contrato em D; não incluir dado
  privado desnecessário

  **Ajuda e exemplo:** “Conferência da parcela de 2 unidades.”

- **Campo:** Tentativa

  **Tipo/origem:** Chave e fingerprint do servidor/cliente

  **Obrigatório e default:** Sim no upload, ocultos

  **Validação/unidade:** Mesmo arquivo/conteúdo na mesma intenção

  **Ajuda e exemplo:** Campo de arquivo bloqueado enquanto resultado for
  incerto.

- **Campo:** Estado da reserva

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Somente leitura

  **Validação/unidade:**
  Reservado/enviando/processando/ready/rejeitado/abandonado/expirado

  **Ajuda e exemplo:** Ready não equivale a validação humana da informação.

- **Campo:** Original/derivado

  **Tipo/origem:** Hash, formato, transformação, servidor

  **Obrigatório e default:** Sim quando transformado

  **Validação/unidade:** Cadeia identifica perda/recusa e original restrito
  conforme classe

  **Ajuda e exemplo:** “Derivado seguro; a ressalva foi preservada” só após
  comprovação.

- **Campo:** Tipo/intenção do rascunho

  **Tipo/origem:** Contexto do formulário

  **Obrigatório e default:** Sim, origem implícita visível em resumo

  **Validação/unidade:** Usuário/paciente/tipo/target; não mistura REQ e
  aprovação

  **Ajuda e exemplo:** “Rascunho de nova ENT para Residência Exemplo.”

- **Campo:** Conteúdo e etapa

  **Tipo/origem:** Campos e passo atual

  **Obrigatório e default:** Automático após confirmação de save

  **Validação/unidade:** Validação parcial não emite fato; esquema versionado

  **Ajuda e exemplo:** Campos vazios ficam vazios.

- **Campo:** Base do documento/ledger/política

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim quando ação depende de fato

  **Validação/unidade:** Versões/assignment/contexto na retomada

  **Ajuda e exemplo:** “A entrega mudou desde ontem. Revise antes de
  continuar.”

- **Campo:** Último salvamento

  **Tipo/origem:** Instante/versão confirmados

  **Obrigatório e default:** Somente leitura

  **Validação/unidade:** Não mostrar salvo se request falhou

  **Ajuda e exemplo:** “Salvo no servidor às 09:10; disponível em outro
  aparelho.”

- **Campo:** Escolha na retomada

  **Tipo/origem:** Continuar/descartar rascunho

  **Obrigatório e default:** Sim, sem descarte preselecionado

  **Validação/unidade:** Descartar não elimina documento emitido ou ato
  confirmado

  **Ajuda e exemplo:** “Descartar somente esta edição.”

- **Campo:** Escolha de conflito

  **Tipo/origem:** Versão A/B ou copiar alterações

  **Obrigatório e default:** Se edição concorrente

  **Validação/unidade:** Novo compare-and-swap; nenhuma fusão automática de
  decisão

  **Ajuda e exemplo:** Comparar campos, autor e instantes.

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
