# B6.8 — Anexos, proveniência e custódia

## Cadeia implementada

- **Recepção**. **Fonte/controle:** boundedUpload; limite10MB; MIME e bytes. **O
  que prova:** Servidor recebeu o corpo. **Limite:** Não prova origem da
  foto/papel.
- **Sanitização imagem**. **Fonte/controle:** sharp; orientação; até4096px;
  JPEG88; sem EXIF. **O que prova:** Derivado seguro nos limites do conversor.
  **Limite:** Bytes/metadados originais não preservados.
- **Sanitização PDF**. **Fonte/controle:** Recusa ativo/protegido/>100p;
  copyPages; remove Annots. **O que prova:** Novo PDF passivo produzido.
  **Limite:** Pode remover informação visual relevante.
- **Reserva**. **Fonte/controle:** reserve_attachment;
  autor/paciente/alvo/chave. **O que prova:** Intenção autorizada e path
  próprio. **Limite:** Quarantine não significa arquivo íntegro.
- **Upload**. **Fonte/controle:** Sem upsert; compara hash em colisão. **O que
  prova:** Bytes sanitizados confirmados. **Limite:** Não transação única entre
  serviços.
- **Finalização**. **Fonte/controle:** Serviço confirma hash/bytes. **O que
  prova:** Metadado ready do derivado. **Limite:** Serviço é fronteira de
  confiança.
- **Associação**. **Fonte/controle:** Bind autorizado; novo evento. **O que
  prova:** Alvo e versão vinculados. **Limite:** Ready e associado são garantias
  distintas.
- **Consulta**. **Fonte/controle:** RLS/capacidade; URL120s; no-store API. **O
  que prova:** Nova autorização para obter arquivo. **Limite:** Não revoga
  cópia/URL já obtida.

SHA-256 de attachments é do arquivo sanitizado, não dos bytes inicialmente
recebidos. Filename pode conservar extensão original apesar de PNG/WebP virar
JPEG; MIME real persiste separado. O PDF principal lista nome/hash do anexo, sem
incorporar páginas ou descrever captura, dispositivo e autor original.
uploaded_by/created_at identificam envio autenticado, não fotógrafo, signatário
ou presença no local. Não existe hash do original junto ao derivado descoberto
nesse contrato. A remoção de EXIF não torna imagem falsa por si; limita a
proveniência conservada. A interface mostra ready como Validado, sem explicar
que isso é validação técnica de arquivo e não confirmação do conteúdo.

## Perda visual confirmada em PDF passivo

B68-C01 exercitou sanitizeFile real sobre dois PDFs de uma página, totalmente
fictícios, sem upload. A origem continha texto-base normal e anotações FreeText
de ressalva e Ink. O derivado preservou texto-base e removeu ambas as anotações.
Inspeção visual de origem/derivado confirmou desaparecimento da ressalva
EMBALAGEM AVARIADA e do traço. Hashes antes/depois estão em
b68-sanitize-results.json. Extração e quatro imagens estão em
b68-visual-results.json e evidence/attachments.

Contraprova: segundo PDF continha a mesma ressalva no conteúdo normal da página.
Sanitização a preservou visualmente e no texto. Portanto não é perda de todo
texto, falha de OCR, corrupção aleatória ou mera remoção de metadados. São
elementos visíveis removidos porque copyPages é seguido da exclusão
indiscriminada de Annots. Formulários preenchidos, notas e assinaturas visuais
podem depender desse tipo de representação; não se testou uma assinatura digital
real nem todos os tipos de anotação. O traço era explicitamente fictício, sem
identidade humana. Fotos rasterizadas de papel não usam esse mesmo mecanismo;
não generalizar o defeito a toda ficha fotografada.

Alternativas futuras precisam manter a proteção contra conteúdo ativo: achatar
aparência de anotações permitidas antes da cópia, produzir derivado visual
seguro ou recusar com explicação os documentos cuja informação seria removida.
Preservação restrita do original e hash/vínculo entre original e derivado é
decisão de governança/custo. Não aceitar conteúdo ativo como contorno, inventar
assinatura, expor original ou sobrescrever anexo antigo.

## Interrupções e retenção

B3/B4 já provaram MIME real, imagem sem EXIF, colisão de chave, associação
versionada, revogação e acesso cruzado. Definições idênticas; sem replay.
B1-ERR-001 conserva a lacuna de retomada visual. B3-004: reservas abandonadas
consomem capacidade10 e não possuem abandono/TTL seguro. B4-007: avatar pode ser
gravado sem associação retomável, caminho separado do anexo documental.

B67-R02 encontrou21 quarantine sem objetos e 13 ready, um sem metadado de
objeto. O ready faltante é a fixture privilegiada B310-09 conhecida; não foi
causado por B6. O servidor normalmente verifica bytes antes de finalize; SQL do
finalizador não certifica o Storage por si. Não houve limpeza nem nova perda
real. Registro pronto sem URL deve orientar recuperação, não fingir conteúdo
comprovado. Não inferir abandono só pela idade nem excluir ready/ histórico para
liberar capacidade. Política de retenção e restauração conjunta permanece
pendente em B6.11.
