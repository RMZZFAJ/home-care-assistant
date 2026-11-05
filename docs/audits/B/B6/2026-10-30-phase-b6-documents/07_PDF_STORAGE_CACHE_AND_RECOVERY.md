# B6.7 — Cache, Storage e recuperação

documentPdf autoriza pelo documento antes de usar serviço privilegiado.
Seleciona versão exata, renderer4, evento body e hash. Cache ausente rende,
upload sem upsert, relê bytes de Storage e registra SHA-256 desses bytes.
Conflito concorrente adota bytes já armazenados, sem substituir arquivo.
B47-01–06 provam bytes/hash/reuso reais e falhas/corrida modeladas na mesma
base; não repetir HTTP/Auth/Storage apenas para conferir o mesmo contrato.

## Confirmação nova do limite de cache

B67-C01 usou serviço real com clientes/bytes controlados: em cache r4 e original
legado, SELECT pede apenas object_path. O serviço devolveu bytes fictícios
divergentes do sha256 registrado, sem consultar evento ou comparar digest.
Nenhum objeto real foi corrompido. É risco de recuperação após
corrupção/restauração administrativa, já apontado estaticamente em B4, agora
demonstrado no adaptador. Não é prova de adulteração pública, bypass de RLS,
incidente no bucket ou autorização indevida. No fluxo normal objetos são
privados e imutáveis; B47-01 coincidiu com o hash registrado como contraprova.

Futuro controle pode falhar de modo seguro e orientar reconciliação quando
digest não coincide. Não regenerar/sobrescrever silenciosamente PDF registrado
como resposta à divergência. Original não é intercambiável com renderização
posterior do mesmo conteúdo. Reproduzir bytes exige artefato guardado;
reproduzir significado depende do evento, fonte, versão do renderer e fontes.

## Estados de falha

- **Versão inexistente**. **Comportamento/limite:** 404; sem cair na atual.
  **Recuperação a preservar:** Seleção explícita correta.
- **Original não registrado**. **Comportamento/limite:** 404; zero originais no
  baseline. **Recuperação a preservar:** Não chamar reconstrução de original.
- **Cache registrado sem bytes recuperáveis**. **Comportamento/limite:** 503
  PERSISTENCE_UNCONFIRMED. **Recuperação a preservar:** Preservar referência;
  conciliar objeto.
- **Upload duplicado**. **Comportamento/limite:** Relê objeto e registra seu
  hash. **Recuperação a preservar:** Sem upsert de histórico.
- **Bytes gravados, registro incerto**. **Comportamento/limite:** Retry pode
  reler path determinístico. **Recuperação a preservar:** Não apagar objeto por
  resposta perdida.
- **Registro existe, bytes divergentes**. **Comportamento/limite:** Sem
  comparação no cache hoje. **Recuperação a preservar:** Detectar e distinguir
  corrupção de autorização.
- **Revogação durante leitura iniciada**. **Comportamento/limite:** Autoriza no
  início; sem segunda validação na resposta. **Recuperação a preservar:**
  Definir semântica; não prometer revogar cópia obtida.

B67-R02 reconcilia apenas metadados locais de renders/anexos e Storage.
Existência de linha storage.objects não garante bytes íntegros. Fixtures antigas
com ready sem objeto foram deliberadamente deixadas em B3; não as atribuir a
perda causada por B6. Nenhuma limpeza, substituição ou restauração executada.

Hash canônico identifica conteúdo do evento; hash de arquivo identifica bytes
guardados; assinatura digital de pessoa não está implementada. Cache HTTP é
private, no-store; isso não recupera nem revoga cópia já baixada. B3-022 de URL
assinada aplica-se à credencial temporária emitida, não ao cache autenticado da
rota PDF. A recuperação integral permanece dependência B3-014/OPS-001.
