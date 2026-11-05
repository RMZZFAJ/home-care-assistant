# Ciência e conteúdo REQ — confronto estático AS_IS e TO_BE

Base inspecionada: 266c6541bd5d3268b7e08a839df601e823ec74b5. Leitura de rotas,
componentes, contratos e cadeia de migrations, sem acesso ao banco remoto. A
[política aprovada](SCIENCE_OWNER_REVIEW.md) governa o futuro; os
comportamentos abaixo ainda não foram corrigidos no produto.

## Dependência mutável e autoria da expedição

Em
`supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql:153`,
private.delivery_science_and_progress testa ent.issued/ent.submit,
scienceByDispatch, pending_receipt, auth.uid()=created_by e elegibilidade. A
linha 155 registra dispatch com deliveryId, deliveryVersion e sessionId; o
trigger é after insert em document_events, linha 159.

O default true em init_requisition_science, linha 30, não é invariável:
settings são mescladas à política. scienceByDispatch está na whitelist em
`supabase/migrations/20261023032230_v4_active_authority_and_governance.sql:132`
e no editor `src/components/admin/policy-console.tsx:197`. Essa escolha
mutável contraria a decisão atual.

Criador de draft não prova quem conclui o envio. Revisão em
`supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql:197`
admite criador ou administrador local competente; recusa REQ na linha 203.
Wrappers posteriores de BAL mantêm o caminho COM/ENT por fluent_pre_shift. Em
D, o evento/transição deve transportar o ator efetivo autenticado e sua
autorização revalidada, sem depender da igualdade com created_by. Retirar essa
comparação não elimina capacidade, vínculo ou autoridade de expedição.

Contraprova planejada: A cria draft; B, familiar legitimamente autorizado,
expede. Ciência pertence a B, nunca a A. Se B não representa a família, não
fabricar ciência de A ou B. Nenhuma preferência suprime SCI-005 quando o
expedidor familiar é elegível; nenhum save ou envio revertido a produz.

## Agregado e origem dos eventos

O enum AS_IS contém express, app_visible, whatsapp_read, whatsapp_confirm e
dispatch na migration de ciência, linha 14. Unicidade REQ/pessoa e trigger de
imutabilidade estão nas linhas 16–17. private.record_science usa on conflict
do nothing, linhas 55–59. Isso preserva um evento pessoal, mas não representa
sozinho todas as provas causais de expedições distintas exigidas pelo futuro.
Não substituir a primeira ciência para guardar a expedição.

private.science_satisfied, linha 43, admite all/any e desobrigação. TO_BE
adota ANY familiar. Desobrigação não é evento pessoal de todos. O histórico
conserva a origem, inclusive quando uma expedição legítima posterior ocorre
depois da ciência expressa já registrada.

acknowledge_requisition, linha 78, aceita express/app_visible. Em
`src/components/requisitions/requisition-detail.tsx:153`, o mecanismo observa
o cabeçalho, sem confirmação anterior à abertura. A D substitui o disparo,
preservando eventos antigos e separando trilha de abertura. Caminhos WhatsApp
em
`supabase/migrations/20261023040129_v4_meta_registry_and_verified_actions.sql:111`
e linha 131 devem separar confirmação identificada e evidência de transporte.
Ativação/homologação continuam postergadas.

## Imutabilidade material da REQ

A busca cobriu as migrations em ordem e as rotas requisitions. Na superfície
vigente identificada:

- src/app/api/requisitions/route.ts oferece GET de lista e POST de submit.
  src/app/api/requisitions/[id]/route.ts exporta GET. Ciência, estado e
  resolução têm comandos específicos, sem editor material geral.

- submit_requisition vigente, em
  `supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql:243`,
  cria a emissão e recupera a mesma intenção. Conteúdo divergente da chave não
  se torna edição autorizada.

- revise_supply_document recusa d.type='REQ', linha 203. Wrappers de BAL
  posteriores não habilitam edição material da REQ.

- resolve_requisition_item, linha 27, exige catalog.manage e req.review;
  acrescenta resolução em requisition_item_resolutions. Não reescreve nome
  extra, estoque observado, urgência ou notas emitidos. A própria resolução
  tem trigger de imutabilidade na linha 20.

- protect_requisition_identity, em
  `supabase/migrations/20261020002100_transactional_operations.sql:11`,
  protege protocolo, criador, paciente, intenção e hashes. Atualizar status ou
  updated_at legitimamente não equivale a editar o pedido.

- Não se identificou caminho autorizado vigente destinado a UPDATE material de
  itens/observações por usuário. DML de migração, importação de legado e
  operador privilegiado não são editor oferecido ao usuário. D deve confirmar
  privilégios efetivos e negativas diretas no candidato; leitura estática não
  é prova de imutabilidade universal do banco remoto.

## Versões e compatibilidade futura

record_science incrementa operational_documents.version, linha 62;
refresh_requisition_lifecycle também avança versão em conclusão/reabertura.
Portanto, usar qualquer incremento de versão para invalidar ciência é errado.
Identidade material preserva o conteúdo emitido; eventos, vínculos,
atendimento, acesso e emissões evoluem separadamente. Hash de snapshot com
lifecycle não serve, sem projeção, como identidade exclusivamente material.

D deverá definir esquema incremental e compatibilidade, preservando os 84
arquivos históricos de migrations e eventos legados. Pode separar obrigação
pessoal de evidência causal, desde que preserve REQ/versão material,
ENT/versão de expedição, ator/autoridade, modo e instante. Backfill não
inventa ciência, autor, preferência ou instante pretéritos. Esta missão não
cria um caminho de edição material para justificar o tratamento de versões.
