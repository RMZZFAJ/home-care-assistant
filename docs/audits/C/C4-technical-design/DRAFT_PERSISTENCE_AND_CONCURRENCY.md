# Persistência de rascunhos e concorrência

DEC-012 aprova edição entre aparelhos/dias; P08/P12 deixam retenção e abandono
temporal pendentes. Este desenho não grava documento oficial nem substitui
idempotência da operação. O10 e drafts documentais existentes serão
reutilizados
onde atendem, sem fingir que sessionStorage já oferece persistência remota.

## Modelo e API propostos

<!-- c-table:start -->

- **Elemento:** Rascunho de edição

  **Campos/contrato:** id, owner_user_id, care_recipient_id, kind, intent_id,
  target tipado, schema_version, content, base_versions, revision, status,
  saved_at

  **Restrição verificável:** Titular e paciente obrigatórios; leitura/escrita
  só própria e autorizada; target documental usa FK quando aplicável; demais
  referências tipadas são revalidadas.

- **Elemento:** Identidade de criação

  **Campos/contrato:** creation_request_id e hash de conteúdo inicial

  **Restrição verificável:** Unicidade por titular/paciente/intenção; retry
  não cria dois rascunhos.

- **Elemento:** Metadado de save

  **Campos/contrato:** save_request_id, expected_revision, content_hash,
  result_revision, instante

  **Restrição verificável:** Recuperar save com resposta perdida mesmo após
  outra edição, sem guardar cópia de texto a cada tecla. Retenção acompanha
  janela de recuperação aprovada.

- **Elemento:** Base operacional

  **Campos/contrato:** documentVersion, assignmentVersion, ledgerRevision,
  policyVersion e contexto pertinente

  **Restrição verificável:** Serve para detectar obsolescência; não concede
  autorização nem fixa permissão futura.

- **Elemento:** Resultado final

  **Campos/contrato:** consumed_resource_id/outcome tipado e versão

  **Restrição verificável:** Documento/ato confirmado tem referência real;
  retry não emite novamente.

- **Elemento:** GET /api/drafts proposto

  **Campos/contrato:** Listar próprios por paciente/kind/target e buscar id

  **Restrição verificável:** Mais de um rascunho mostra escolha por
  título/data; não escolher o último silenciosamente.

- **Elemento:** Save proposto

  **Campos/contrato:** Conteúdo parcial tipado, expectedDraftRevision e
  saveRequestId

  **Restrição verificável:** Compare-and-swap; resposta 409 conserva edição;
  conteúdo diferente com a mesma chave é conflito.

- **Elemento:** Discard proposto

  **Campos/contrato:** id, expectedDraftRevision, motivo de descarte técnico

  **Restrição verificável:** Só active não consumido; terminal concorrente
  recupera estado, não elimina fato oficial.

<!-- c-table:end -->

Tabela privada com RLS defensiva e RPC pública autorizada segue o padrão do
produto; nenhum DML geral novo. Se houver estrutura equivalente vigente no
candidato, adaptar em vez de duplicar. Referências históricas de fatos não
usam
cascade de exclusão por desligamento. Índice por owner/paciente/status/kind e
saved_at atende a consulta demonstrada; avaliar plano antes de índices extras.

## Save, retomada e comando

Autosave propõe um intervalo adequado à edição, sem prometer SLA numérico em
C.
Só anuncia salvo após confirmação com revision/saved_at. Estado em memória
não confirmado é “ainda não salvo”. Erro transitório mantém conteúdo e oferece
retry da mesma tentativa. Campos inválidos para emissão podem existir no draft
com marcação de validação parcial; não transportar segredo Auth, OTP ou
endpoint
push para conteúdo genérico de rascunho.

Retomada verifica titular, vínculo, target, schemaVersion e bases atuais.
Conteúdo legado passa por adaptação explícita de schema com versão;
desconhecido
é recuperável para revisão, não descartado automaticamente. Alteração de
catálogo,
recebedor, escala ou ledger abre comparação e marca campos afetados.
Quantidade
observada antiga fica com sua data, jamais anunciada como nova contagem.

Dois aparelhos editam revision 5. A salva e obtém 6; B recebe 409 em expected 5,
conserva o texto local e consulta 6. Usuário compara/copia campos permitidos e
salva revisão nova. Não mesclar automaticamente decisão, quantidade, pessoa,
ciência ou significado operacional por ordem de chegada. Metadata de tentativa
permite saber que o save de A ocorreu mesmo se sua resposta se perdeu.

Finalizar envia comando com chave estável e versão operacional atual. Se o
comando confirma, marcar consumido com referência; falha nessa marcação não
desfaz o fato. Retomar primeiro recupera resultado da intenção e associa o
draft, em vez de emitir novamente. Se comando foi recusado sem efeito, draft
permanece editável. Se uncertain, identidade/conteúdo congelados até consulta.

## Privacidade, descarte e aceite

Logout limpa exposição local; revogação impede consulta/save/finalização nova.
Conservação no servidor segue P08/P12, sem acesso de outro membro ou conta.
Descartar é ato sobre rascunho, com confirmação só quando há conteúdo
relevante;
não apaga anexos ready ou documento emitido. Expiração automática fica inativa
até política aprovada, com salvaguarda contra finalize/save concorrentes.

Aceites: nova aba, outro aparelho e dia seguinte; duas edições com 409;
resposta
de save perdida; finalize confirmado e marcação de draft falha; target
obsoleto;
usuário/paciente trocado; revogado; discard concorrente com consumo. Oráculos
comparam um fato oficial, versões e ausência de acesso cruzado. Backup inclui
drafts e metadados necessários à recuperação, respeitando retenção.
