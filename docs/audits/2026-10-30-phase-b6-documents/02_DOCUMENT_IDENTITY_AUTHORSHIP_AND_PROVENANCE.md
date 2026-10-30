# B6.2 — Identidade, autoria e proveniência

UUID identifica o documento; código legível e sequência são locais ao
paciente/tipo. Dois pacientes podem ter ENT-0001 sem colisão de identidade. O
protocolo acrescenta tipo, data, prefixos de paciente/emissor, sequência e
digest do UUID. Ele não é segredo autorizativo nem assinatura. Draft não recebe
sequência de emissão; private.emit_document não muda created_at.

## Provas novas e contraprovas

`evidence/b62-provenance-results.json`, B62-S01–03, usou duas contas Auth
fictícias novas, paciente e documentos novos em transação revertida. Setup de
linhas/estados foi privilegiado; não é ensaio da autorização nem da operação
física. Claims vieram de login Auth real, sem fabricar sessão ou senha no SQL.

- B62-S01: renomear emissora e paciente preservou actors.issuer e actors.patient
  já congelados; hash v1 permaneceu igual. Novo evento de recebimento
  identificou a recebedora renomeada em actorName. O responsável original e o
  ator do recebimento são campos distintos e corretamente preservados no evento.
  Não se confirmou reescrita do autor de v1.
- O destinatário em actors.recipient é relido do perfil a cada novo evento. O
  nome antigo permanece no evento anterior; a tela ENT consulta diretório atual
  para o destinatário, enquanto o PDF usa a versão. Isso deve ser explicado como
  nome da versão versus cadastro atual, não falsificação.
- B62-S03 confirmou mesmo código em pacientes diferentes e protocolos distintos.
  Comparação só por código é insuficiente fora do contexto do paciente. Não se
  confirmou duplicação de UUID ou reutilização indevida de versão. A emissão do
  fixture ocorreu três dias após created_at: o campo chamado Emissão no PDF ENT
  é data de criação do draft; aprofundar em B6.4/6.

## Legado: origem não pode ser substituída por informação atual

B62-S02 passa ao helper register_legacy_requisition um registro histórico de
data original nula e nomes explicitamente preservados. O registro fonte continua
com created_at nulo; payload.sourceCreatedAt é null; o documento operacional
adota now() em created_at. record_document_event monta actors.patient do
cadastro vigente e o renderizador prioriza esse nome sobre payload.patientName,
que conserva o nome do papel. A marca isHistorical limita ciência, mas não
corrige esses dois campos. É falha de fidelidade de derivação, sem alteração dos
fatos originais. O teste invoca o helper, não reexecuta o importador integral;
seu contrato foi conferido na definição vigente.

loadReceipt oferece legacyReconstructed e fallback de nome/catálogo para linhas
sem snapshot. Não atribuir a esses nomes fallback o mesmo nível de origem do
snapshot persistido. A apresentação Receipt não mostra explicitamente
legacyReconstructed; seu consumidor corrente é o sucesso de REQ nova, cuja
persistência anterior foi validada. Não se demonstrou exposição desse adaptador
a um legado na UI; registrar limite, sem inventar incidente.

## O que cada autoria permite concluir

created_by/actors.issuer identificam quem iniciou o documento; actor_id,
actor_name e authority_context identificam o comando da versão. A aprovação BAL
tem grupo, ator e count_version; o payload balanceContext identifica o contador
designado. Perfil profissional é autodeclarado no cadastro, sem consulta de
conselho descoberta. Registro profissional em PDF não certifica habilitação.
Associação de conta autenticada ao ato não prova presença, identidade civil
absoluta ou consentimento fora do comando registrado.

No PDF, a linha do tempo preserva nomes do snapshot; operational_document
retorna só actorId na lista de eventos. SupplyDocumentContent resolve o nome
pelo diretório atual e usa Responsável registrado se ausente. Rename/revogação
pode mudar ou retirar a atribuição legível de eventos antigos na tela, embora
actor_name original exista no banco e no PDF. É manifestação específica da
projeção, sem afirmar reescrita do evento. B6.5/10 delimita o impacto.
