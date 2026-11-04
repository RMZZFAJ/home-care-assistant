# B6.5 — Versões e reconstrução histórica

## Preservação e acesso

Cada evento confirma uma versão com body próprio. Cabeçalho, linhas e leitura
atual não substituem esse corpo histórico. A API PDF aceita version positiva,
busca evento exato e retorna404 para versão ausente, sem cair na atual.
renderer=legacy só devolve arquivo original registrado; não o reconstrói.
B47-01–04 comprovam esses contratos em HTTP/Auth/Storage da mesma base.

DocumentHeader/DocumentActions vincula Baixar PDF à versão atual. As listas de
eventos de REQ/supply mostram versões e, em supply, hashes; não oferecem link
para PDF de cada versão. O endpoint permite acesso técnico, mas o percurso
humano não oferece seleção histórica completa. Não é perda do evento. B1-UX-006
já registrava a tradução manual da história; B6 amplia a manifestação com
autoria pelo diretório atual e ausência de versão histórica acionável.

## Sequências reconstruíveis e limites

- **REQ emitida → ENT aceita → concluída**. **O que permanece:** Aceites/links e
  versões REQ. **Lacuna representativa:** PDF conta atendidos sem marcar linhas.
  **Evidência:** B36-02; PV01.
- **REQ arquivada → cancelar ENT → reabrir**. **O que permanece:** req.reopened
  conserva arquivo anterior/motivo. **Lacuna representativa:** Motivos ausentes;
  antigo exige versão. **Evidência:** B36-03/04.
- **ENT parcialmente aceita → conciliar falta/devolução**. **O que permanece:**
  Aceito positivo, issueOpen e ledger. **Lacuna representativa:** CONCILIADO não
  distingue missing/returned. **Evidência:** audited_legacy_supply_command;
  PV03/04.
- **ENT aceita → consumo → consentir cancelamento**. **O que permanece:**
  Consumo e estado anterior íntegros após erro. **Lacuna representativa:** Ramo
  bloqueado42702; não fingir devolução. **Evidência:** B3-002/B36-05.
- **COM10 → adquirir/validar2**. **O que permanece:** Remanescente8 e recibo.
  **Lacuna representativa:** PDF agregado omite receipt/motivo. **Evidência:**
  B36-07; PV02.
- **Revisar draft → submissão recusada**. **O que permanece:** Nova versão
  draft; nenhum estoque movido. **Lacuna representativa:** HTTP não comunica
  revisão salva. **Evidência:** B4-004/B44-05.
- **BAL contado → revisão → reconto**. **O que permanece:** count_version e
  referências. **Lacuna representativa:** PDF não liga revisor à contagem.
  **Evidência:** B3.7; PV05.
- **Renomear responsável após ato**. **O que permanece:** actor_name original no
  evento/PDF. **Lacuna representativa:** Tela supply resolve nome atual.
  **Evidência:** B62-S01; operational_document; supply-detail.
- **Paciente inativo/profissional desligado**. **O que permanece:** Eventos/FKs
  conservados; novos atos limitados. **Lacuna representativa:** Nome pode sair
  do diretório corrente. **Evidência:** B3 autorização; fonte supply.
- **Mil versões**. **O que permanece:** Hash e v1 acessíveis na prova B3.
  **Lacuna representativa:** Custo quadrático/história acumulada no PDF.
  **Evidência:** B3-015; sem repetir volume.

## Cronologia e contraditório

created_at do documento/evento, acceptedAt, countedAt, validated_at,
completed_at e archived_at têm significados distintos. PDF usa createdAt no topo
e metadata, história usa hora do evento, BAL usa timezone do plantão. Metadata
PDF não é timestamp independente de renderização ou de terceiro. Versão ordena
atos persistidos; não prova sequência física de fatos declarados
retrospectivamente. Reasons e parcelas quantitativas exigem body/ledger além da
história resumida. Data de origem desconhecida deve continuar desconhecida.

Não se confirmou versão antiga substituída nem hash reescrito por rename.
Reabertura altera estado corrente com evento e preserva evidência anterior. O
problema de acesso/explicação não autoriza editar PDF/evento/aprovação antiga
para simular história perfeita. Não se repetiram cenários mutáveis já provados.
