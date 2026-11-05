# Dependências entre grupos

## Causas anteriores preservadas

- **A UX-001 / B1-UX-001**. **Dependência operacional B7:** Resumo informado de
  escala. **Consequência / próximo aceite:** Não liberar esse fluxo por build/CI
  verde; pessoa/período/efeito precisam ser compreendidos.
- **A DB-002 / B3-001**. **Dependência operacional B7:** Seleção de REQs sem
  avanço. **Consequência / próximo aceite:** Cron/health200 não bastam; corrigir
  causa e medir progresso por paciente.
- **A OPS-001 / B3-014**. **Dependência operacional B7:** Recuperação integrada.
  **Consequência / próximo aceite:** DB/Auth/bytes/config/jobs precisam ensaio;
  B7-004 acrescenta quarentena.
- **A QA-001**. **Dependência operacional B7:** Helper transitório de navegação.
  **Consequência / próximo aceite:** Código inalterado, retry falhou; gate por
  SHA continua necessário.
- **A REPO-001**. **Dependência operacional B7:** Referências antigas de
  estado/contagens. **Consequência / próximo aceite:** Matriz atual prevalece;
  não reescrever histórico ou outros docs fora da autorização.
- **A REPO-003**. **Dependência operacional B7:** Consulta Meta pode publicar.
  **Consequência / próximo aceite:** Não executar com token como auditoria;
  separar efeito em fase autorizada.
- **A REPO-004**. **Dependência operacional B7:** Cópia Linux inclui privado.
  **Consequência / próximo aceite:** Não rodar export para repetir prova;
  minimizar cópia futura e preservar secrets.
- **A BE-003 / B3-016**. **Dependência operacional B7:** Tempo composto do
  worker. **Consequência / próximo aceite:** Lease/maxDuration120 s precisam
  ensaio por etapa; não basta aumentar plano.
- **A BE-006**. **Dependência operacional B7:** Chamadas do dashboard.
  **Consequência / próximo aceite:** Medir waterfall/p95; chamadas não provam
  lentidão.
- **B3-015 / B3-024**. **Dependência operacional B7:** Histórico/snapshots e
  autorização por linha. **Consequência / próximo aceite:** Orçamento de
  crescimento/consulta sem apagar história nem remover permissão.
- **B3-020 / B3-021 / B3-022**. **Dependência operacional B7:** Revogação em
  curso/sessão/URLs. **Consequência / próximo aceite:** Decidir janelas reais e
  não prometer recolher arquivo baixado.
- **B4-010**. **Dependência operacional B7:** Cancelamento antes de envio
  externo posterior. **Consequência / próximo aceite:** Conter e conciliar
  tentativa; HTTP final não desfaz efeito já aceito.
- **B4-011**. **Dependência operacional B7:** Envelope de ingestão misto.
  **Consequência / próximo aceite:** Métrica por item/resultado; não
  confundir200 com relato persistido.
- **B5-001 / B3-025**. **Dependência operacional B7:** Período perdido/erro
  legado abortando lote. **Consequência / próximo aceite:** Retorno conserva
  atrasos/lacunas, sem inventar presença ou contagem.
- **B5-002 / B5-003**. **Dependência operacional B7:** Hold sem retomada e
  incerteza prematura. **Consequência / próximo aceite:** Separar configuração,
  tentativa de mídia, mensagem e decisão de retry.
- **B5-010 / B4-012**. **Dependência operacional B7:** Consumidor não consulta
  após invalidação. **Consequência / próximo aceite:** Sinal/backend corretos
  não provam pendência visível ao operador.
- **B5-013 / B5-014**. **Dependência operacional B7:** Correlação e informação
  para conciliar. **Consequência / próximo aceite:** Antes de reativar após
  corte, identificar tentativa/referência com escopo mínimo.
- **B6-011**. **Dependência operacional B7:** Cache PDF não compara hash
  novamente. **Consequência / próximo aceite:** Restore deve verificar bytes;
  não regenerar/sobrescrever original silenciosamente.
- **B1/B2 demais essenciais**. **Dependência operacional B7:** Fidelidade,
  resultado parcial, fechamento e papéis. **Consequência / próximo aceite:**
  Escolher escopo só depois de considerar causas aplicáveis, não por estética.

## Relações novas sem dupla contagem

B7-001 é ligação de gates e release, não nova causa do helper. B7-002 é
predicado divergente de configuração, não descoberta de falta de e-mail. B7-003
liga artefato/config/schema, sem reabrir84 testes de instalação. B7-004 é
condição específica de restore ligado a OPS-001, não segundo registro da
ausência de restauração comprovada. B7-005 é fronteira do transporte Vercel, sem
repetir sanitização/fidelidade da B6. B7-006/007 são oportunidades P3. OBS-REUSE
permanece fora do mestre porque observabilidade/progresso já têm tratamento
B5/DB-002; metadados atuais apenas aprofundam a prova.

## Ordem de decisão sugerida, sem execução

Definir processos/canais/pacientes e responsáveis; tratar bloqueios e ramos
essenciais; estabelecer gates/config/schema; demonstrar backup/DR e sinais;
homologar pessoas/dispositivos/fornecedores necessários; só então deliberar
release gradual. Otimização estrutural e hardening opcional dependem de custo,
ameaça e benefício demonstrados. Não se iniciou a Fase C.
