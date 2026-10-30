# Consultas, alcance, paginação e frescor

## Nova pendência inalcançável

**B4-005, P2, nova superfície da classe de completude conhecida.** Settings
devolve só as 50 mudanças mais recentes, sem total, página, cursor, filtro por
estado ou consulta de pedido por ID. O caminho local aplica `.limit(50)` e o
global chama a governança com o mesmo corte. Em B45-01 foram criadas somente
as mudanças necessárias para totalizar 51 no paciente fictício. A proposta
mais antiga continuou **pending** no banco e sumiu dos dois caminhos HTTP.
`page=2&requestId=...` foi ignorado e repetiu os mesmos 50 IDs.

Não houve perda de registro, revogação indevida nem impedimento SQL de decidir
um ID conhecido. O problema é descobri-lo/revisá-lo no percurso oferecido ao
administrador. O cliente `PolicyConsole` renderiza `changes` recebidas e não
possui continuação. Filtrar pendentes antes de limitar reduz o risco, mas
paginação/busca ainda precisa preservar história e ordenação estável.

Essa causa não foi contada como nova descoberta genérica de que listas precisam
de páginas: BE-001/004 e B3-011/012 já cobrem consumo e auditoria. B4 acrescenta
a fila de decisões administrativas, seu contrato HTTP e a prova com 51 itens.
Evidência: [seis cenários B4.5](evidence/b45-read-results.json).

## Mapa de leitura e recuperação

- **Documentos unificados** — Contrato observado: Página/tamanho, tipo,
  status, referência, datas; Recuperação/completude: RPC e rota por UUID;
  p_size limitado na API.
- **REQ legada** — Contrato observado: count exact, range, created_at + id;
  Recuperação/completude: Filtros protocolo/status/dia civil; detalhe por ID.
- **Entregas** — Contrato observado: Página, scope own/team e estados
  enumerados; Recuperação/completude: Default não inclui cancellation_pending:
  B2-003.
- **Estoque histórico** — Contrato observado: Página, produto, custódia e
  datas; Recuperação/completude: Retorna total; saldo consulta separada não é
  mesmo snapshot.
- **Consumo** — Contrato observado: Só 100 recentes, sem detalhe/filtro por
  ID; Recuperação/completude: B3-011/B2-017 permanecem; parâmetros extras não
  criam paginação.
- **Auditoria local** — Contrato observado: Só 100 recentes, sem continuação;
  Recuperação/completude: B3-012/BE-004; não repetir o experimento anterior.
- **Governança** — Contrato observado: Só 50 recentes em local/global;
  Recuperação/completude: B4-005; pedido antigo pending demonstrado.
- **Flow em revisão** — Contrato observado: Só 50 pending do próprio autor;
  Recuperação/completude: Fila consumível diminui ao revisar recentes; não
  igualar ao consumo sem filtro.
- **Notificações pessoais** — Contrato observado: count, página e unseen,
  destinatário próprio; Recuperação/completude: Sino exclui silent; ciência e
  visto separados.
- **Dashboard** — Contrato observado: Resumos/contadores e listas curtas;
  Recuperação/completude: Atalhos não substituem consultas completas;
  slice(12) é prioridade visual.
- **Escalas** — Contrato observado: Intervalo máximo 42 dias,
  séries/ocorrências; Recuperação/completude: Histórico de eventos limitado a
  100; pendências separadas sem esse corte.
- **BAL por plantão** — Contrato observado: Workspace de
  elegibilidade/obrigações; Recuperação/completude: Não converter atraso
  histórico em contagem executada.
- **Catálogo/unidades** — Contrato observado: Consulta RLS sem paginação
  explícita; Recuperação/completude: Limite PostgREST/volume precisa de
  orçamento; truncamento não ensaiado.

## Provas, garantias e limites

B45-02–06 exercitaram página documental, busca UUID, data inexistente, intervalo
de escala acima do contrato e filtro sem resultado. Resposta vazia 200 foi
distinta de erro 400; todas preservaram `no-store`. O resultado registra apenas
os campos efetivamente conferidos, sem afirmar equivalência de todos os dados.

B3-023 aceita NULL no limite da RPC direta; a API usa `pageParameters` e sempre
encaminha números limitados. Portanto a B4 não atribui essa ausência de teto ao
caminho HTTP normal. BE-001/004 foram rastreados até seus consumidores, sem
recriar mais de cem registros antigos apenas para reproduzir a mesma causa.

## Frescor e consistência temporal

Realtime privado transmite revisão por identidade e `WorkspaceSync` faz
reconexão/focus/online/polling. `WorkspaceProvider` escuta `hca:data-changed` e
recarrega contexto, mas preserva a referência de paciente se seus campos não
mudaram. A primeira contraprova por listener do pai era insuficiente.
**B4.12 confirmou B4-012:** mesmo após revisão avançar e contexto recarregar,
ConsumptionConsole não faz nova consulta. Ver
[prova transversal](evidence/b412-freshness-results.json). FlowReviews depende
de patientId/attempt; esse ramo continua somente estático, sem extrapolar a
prova de consumo para uma sessão de Flow externo.

B3-013 permanece: sinal não emitido não é recuperado por polling que só avisa
quando revisão muda. Atualização local de perfil emite evento compensatório,
sem certificar outras abas. Cache HTTP está desabilitado, mas isso não garante
atualização de estado React nem snapshot único de várias chamadas paralelas.

Dashboard e estoque agregam múltiplos reads; se o ledger muda entre chamadas,
dados podem pertencer a instantes distintos. Não foi demonstrada divergência
quantitativa nova por corrida nesta etapa. Qualquer read model consolidado
precisa de medição e definição de consistência, preservando autoridade atual.

Não houve benchmark remoto, varredura completa de catálogo acima de mil itens
ou homologação de stream externo. Próximo: significado de erro, efeito e retry.
