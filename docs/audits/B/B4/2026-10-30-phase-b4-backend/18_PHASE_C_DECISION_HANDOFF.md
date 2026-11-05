# Insumos para decisões futuras da Fase C

Este documento transfere evidências e alternativas. Não inicia a Fase C,
não escolhe implementação definitiva e não autoriza B5, correções ou publicação
de produto. O responsável deverá decidir prioridades e condições antes de
executar.

## Correções técnicas necessárias

- **B4-001/P2:** validar quantidade original antes de coerção. Depende de
  B3-018/019 e clientes que usam number. Comparar rejeição exata versus migração
  explícita de representação; nunca arredondar história. Aceite AC-B4-001.
- **B4-002/P2:** conservar identidade de proposta na interface e no adaptador
  antigo. Depende de BE-005, versão e segunda aprovação. Risco: reaplicar uma
  intenção editada sob chave velha. Aceite AC-B4-002.
- **B4-004/P2:** representar revisão salva/submissão recusada ou incerta.
  Comparar envelope de etapas e comandos separados; transação única só se o
  domínio exigir. Preservar draft/eventos/ledger. Aceite AC-B4-004.
- **B4-005/P2:** permitir localizar toda proposta autorizada. Página/cursor,
  busca ou pendentes separadas; não retirar história nem ignorar empate de
  ordenação. Relacionar consumo/auditoria B3 sem juntar causas. AC-B4-005.
- **B4-006/P2 e B4-009/P3:** códigos de domínio/entrada seguros e corretos.
  Não devolver SQL nem transformar falta de permissão em recurso enumerável.
  Migrar consumidores com compatibilidade. AC-B4-006/009.
- **B4-011/P2:** não confirmar silenciosamente lote descartado. Validação por
  item e política explícita de incompatível/retry. Depende de dedup SQL e
  homologação de reentrega; nenhum comando desconhecido automático. AC-B4-011.
- **B4-012/P2:** read model precisa responder ao sinal recebido. Rever
  assinatura
por revisão/chave, preservando rascunho e descartando resposta de outro
paciente.
  É independente do trigger ausente B3-013. AC-B4-012.

## Decisões de produto

- **B4-003/P2:** convite aprovado perdido recupera segredo com mecanismo seguro
  ou orienta reemissão com rotação? A identidade/estado precisa ser acionável;
  hash e aceite pessoal são obrigatórios. AC-B4-003.
- **B4-013/P2:** permitir criação inativa ou rejeitar/remover essa opção? Hoje
  a escolha é aceita e ignorada. Definir comportamento antes de mudar RPC/UI,
  preservando administrador inicial confirmado. AC-B4-013.
- **B4-008/P3:** manter POST alternativo de catálogo coerente com capacidade
  ou aposentar com contrato de compatibilidade? A rota ativa funciona; não dar
  access.manage a todo delegado para contornar a diferença. AC-B4-008.
- Lacunas B2 de encerramento COM/ENT, sucessão, saldo inativo e relato textual
  exigem definição de responsabilidade e fato físico, não só ajuste de código.
  Conservar os critérios B2/B3 e a aprovação humana de escala P1.

## Decisões operacionais e riscos sustentados

- **B4-010/P2:** definir até qual ponto cancelamento/revogação deve impedir
  etapas externas. Minimizar janela e conciliar transporte já iniciado; não
  prometer desfazer mensagem aceita. Medir deadline/lease e esclarecer resumo
  skipped. Depende de B3-016/020, BE-003 e ensaio externo autorizado. AC-B4-010.
- **B4-007/P3:** definir retenção e retomada/reconciliação de avatar. Custo
  atual
  não foi medido; não iniciar limpeza de arquivos. Storage real local precisa
  de prova adicional se priorizado. AC-B4-007.
- Definir prazo de frescor, progresso máximo de fila, volume esperado, SLO,
  retenção, RPO/RTO e responsáveis por conciliação. Não inferir esses números
  das durações de testes locais ou do tamanho dos arquivos.

## Refatorações opcionais

Consolidar bootstrap/dashboard somente após medição:25 chamadas lógicas não
demonstram p95 inadequado. Manter desenho atual é alternativa válida. DTOs ou
contratos de resultado devem ter consumidores reais; marcação server-only é
defesa adicional, sem exposição atual demonstrada. O ciclo de fachada do cliente
não exige reescrita do backend. BE-007 é decisão editorial de renderer futuro,
com PDFs antigos preservados.

## Homologações pendentes

Provedor Meta/Flows/templates, entrega/leitura, lotes/retry/callback tardio,
revogação em andamento, SMTP/SMS/OAuth, ambiente remoto, clean/legacy conforme
plano autorizado, restore conjunto, rede/dispositivo real e decisões humanas.
Não homologar todos indiscriminadamente: selecionar os canais/regimes que o
responsável pretende liberar. Canal desabilitado exige contingência operacional
realmente validada; tipo de preferência não equivale a serviço implementado.

## Mudanças a descartar

Não reescrever backend, substituir RPC por DML, remover história, transformar
ciência em aceite físico, exigir quantidade solicitada, usar agenda como
presença, aumentar timeout sem orçamento, reenviar uncertain cegamente ou limpar
reservas/buckets para mascarar causa. Não reativar profissional para assinar
pelo antecessor. Essas alternativas violam contratos preservados ou não têm
benefício demonstrado.

## Evidência mínima para uma decisão posterior

Ler [registro de32 campos](14_FINDINGS_MASTER.csv),
[aceites futuros](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md),
[dependências](16_CROSS_GROUP_DEPENDENCIES.md) e
[índice de cenários](evidence/SCENARIOS.csv).
Separar onze comportamentos confirmados de dois riscos controlados; distinguir
sete mecanismos novos de causas relacionadas e revalidações. Registrar dono,
alternativa escolhida, risco aceito, migração/compatibilidade e teste
necessário.
Nenhuma dessas decisões foi tomada automaticamente nesta fase.
