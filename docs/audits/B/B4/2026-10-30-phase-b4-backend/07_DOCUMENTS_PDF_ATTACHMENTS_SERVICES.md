# Documentos, PDFs, anexos e consistência entre serviços

## Identidade documental e representação

Documento/evento/hashes canônicos são produzidos pelo banco. `documentPdf`
autoriza primeiro via `operational_document`, escolhe a versão pedida ou a
atual, procura o renderizador 4 e lê bytes privados. Cache ausente consulta o
evento daquela versão, renderiza, grava sem upsert, relê os bytes canônicos e
registra seu SHA-256. O original legado só é entregue quando já existe;
ausência não autoriza regenerar uma versão chamada original.

[B47-01–04](evidence/b47-pdf-results.json) exercitaram HTTP/Auth/Storage reais:
bytes `%PDF-` e hash idêntico ao registro, repetição com mesmos bytes, versão
inexistente 404, cache existente recusado no contexto de outro paciente e
original ausente 404. Não houve inspeção visual completa ou assinatura digital.

[B47-05–06](evidence/b47-services-results.json), com Storage controlado,
confirmaram que falha ao baixar PDF registrado não o substitui e upload
concorrente duplicado devolve/registra os bytes já armazenados. Não é prova de
corrida de Storage real nem benchmark. A hipótese de sobrescrita silenciosa
por simplesmente haver dois renders foi refutada no adaptador.

## Arquivos e confiança

Anexo segue reserva por chave → bytes saneados → upload sem upsert → comparação
SHA se o objeto já existe → finalização privilegiada → associação autorizada.
O serviço não confia no MIME declarado isoladamente. Imagem tem formato/pixels
verificados e metadados removidos; PDF ativo/protegido/excessivo é recusado,
páginas são copiadas e anotações removidas. Nome elimina controles e
separadores;
caminho vem da reserva, não do nome enviado.

As provas Auth/Storage B3 de MIME, replay, associação, revogação e imutabilidade
permanecem válidas pela igualdade das definições. B3-004/B2-016 continuam:
reservas abandonadas consomem limite; não há rotina segura de abandono
oferecida.
B1-ERR-001 continua: interface de upload não congela corretamente arquivo após
resposta perdida. Nada disso autoriza apagar bucket/reservas nesta auditoria.

Se upload confirmou e bind falhou, não existe transação distribuída automática
entre Storage e PostgreSQL. A mesma chave/mesmos bytes permitem retomar. O
contrato precisa distinguir ready, associado, reservado e resultado incerto;
não apresentar ausência de anexo visível como prova de que não há bytes.

## Risco novo proporcional: avatar sem retomada

**B4-007, P3, risco sustentado por adaptador controlado.** Avatar gera caminho
UUID no servidor, grava objeto e depois chama `set_my_avatar`. B47-07 induziu
falha autorizativa nessa associação após upload aceito; resposta 403 não
conservou uma identidade recuperável. Retry criou outro caminho. O instrumento
simula o armazenamento; **não afirma dois órfãos persistidos no banco real**.

Mesmo alteração normal deixa arquivos antigos no desenho atual, sem política
de retenção/consulta de tentativa. Não foi demonstrado esgotamento de quota,
vazamento ou troca indevida de avatar. Alternativas: reserva estável, retomada
por hash/chave ou reconciliação auditável de objetos não referenciados após
prazo aceito. Limpeza imediata automática arrisca apagar objeto ainda em uso e
não deve ser adotada sem definição de retenção.

## Revogação, integridade e limites

Nova consulta revalida autoridade. URL de evidência/PDF assinada anteriormente
pode continuar válida no TTL: B3-022 demonstrou 120s para seu recorte; avatar
de contexto usa 900s, enquanto `/profile` usa 120s. São credenciais temporárias,
não promessa de revogar cópia baixada. B3-021 de avatar direto após logout não
foi declarado corrigido pelo guard HTTP.

Consulta PDF autoriza antes de render/Storage privilegiado; não revalida de
novo imediatamente antes de devolver bytes. O significado da revogação em
leitura já iniciada precisa ser decidido; B3-020 não é automaticamente prova
desse caminho. Não foi executada corrida PDF/revogação nesta etapa.

Download de cache lê somente object_path e não recalcula contra sha256 do
registro antes de devolver. Objeto é privado e imutável no fluxo normal, e a
conferência real B47-01 coincidiu. Corrupção de bytes/restore administrativo é
risco a incluir no ensaio B3-014, não exploração pública demonstrada.

BE-007 permanece oportunidade editorial: estoque observado da REQ está no
snapshot/tela, mas não na tabela PDF. Não é quantidade solicitada nem saldo
oficial; eventual renderer novo deve preservar bytes antigos. Não repetir
auditoria visual para comprovar essa seleção estática de campos.

Sem homologação remota, restore, device ou provedor. Próximo: administração e
efeitos das capacidades nas rotas equivalentes.
