# Dependências entre grupos

- **A/B1:** UX-001/B1-UX-001 e DB-002 continuam impedimentos do parecer
  anterior. B6 não aprovou produção nem repetiu todos os gates.
  BE-007/B1-DOC-001 e B1-UX-006 recebem manifestações B6-013/009. B1-A11Y-001
  permanece B6-012.
- **B2/B3:** B2-004/B3-002 impedem cancelamento com consumo; preservar separação
  entre consumo e devolução. B2-008/B3-005 exigem navegação/origem das
  compensações; B2-011 mantém conflito de decisão de consumo separado de
  identidade do confirmador. Não transformar sucesso HTTP em fato não aplicado.
- **B3:** B3-004 de reservas e B3-022 de URLs são dependências da custódia, sem
  limpeza automática. B3-015 de história quadrática limita exportação extensa,
  sem justificar apagar eventos. B3-014/OPS-001 exigem restore conjunto isolado
  autorizado, sem sobrepor este ambiente.
- **B4:** B4-004 precisa comunicar revisão já salva quando submit falha; B6-002
  deve distinguir essa versão draft da emissão. Cache e pipeline mantêm
  autorização e imutabilidade; B6-011 acrescenta comparação de digest. B4-007
  avatar sem associação é caminho separado de anexo de documento.
- **B5:** B5-004 de mensagem não é prova de conteúdo PDF; B5-005 exige decisão
  sobre dados mínimos externos. B5-013/014 precisam conciliação de tentativas
  sem reenvio cego após restore. Domínio canônico deve preservar QRs antigos.
- **C futura:** unificar causas, escopo inicial, responsáveis e critérios sem
  autorizar D. **D futura:** mudança de renderer versionada, novas migrations
  incrementais quando necessárias, testes dirigidos e preservação de acervo.

Nenhuma recomendação pode eliminar separação de custódia, ciência/recebimento,
relato/débito, escala/presença, contador/revisor, assinatura/hash ou original/
reconstrução. Intervenção no produto, banco remoto ou infraestrutura requer
autorização futura própria. Este documento é insumo, sem execução da Fase C.
