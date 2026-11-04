# Handoff documental para a Fase C

Este é um conjunto de insumos para decisão posterior. Não inicia C, não escolhe
escopo final de lançamento e não autoriza implementação D, B6 ou provedor real.

## Portões e decisões a avaliar

- **Bloqueadores anteriores** — Entradas: DB-002/B3-001 e UX-001/B1-UX-001 P1;
  Decisão/resultado necessário: Progresso e decisão informada
  corrigidos/validados para o escopo; sem GO atual.

- **Correção técnica de comunicação** — Entradas: B5-004/006/007/010; B4-011;
  Decisão/resultado necessário: Mensagem fiel, item/lote sem perda silenciosa,
  origem verdadeira e consumidor atualizado.

- **Correção técnica de recuperação** — Entradas: B5-002/003/008/009/011/013;
  Decisão/resultado necessário: Hold retomável, etapa correta,
  replay/protocolo/propósito e tentativa correlacionada.

- **Risco entre serviços** — Entradas: B5-012; Decisão/resultado necessário:
  Definir retorno parcial e retomada do vínculo de telefone; ensaio real
  isolado após correção.

- **Continuidade de tempo** — Entradas: B5-001; DB-006/B3-025;
  Decisão/resultado necessário: Legado recupera/explica lacuna ou fica fora do
  piloto; cron saudável não basta.

- **Operação e arquitetura mínima** — Entradas: B5-014; BE-003/B3-016; B3-014;
  Decisão/resultado necessário: Identidade de tentativa,
  SLO/alerta/responsável, orçamento medido e recuperação/restore.

- **Governança** — Entradas: B5-005 e retenção; Decisão/resultado necessário:
  Campos/destinos/cópias/retencão/operadores aprovados, documentação fiel.

- **Configuração** — Entradas: Vault, flag global, regras por paciente,
  aprovação de template, Auth redirects; Decisão/resultado necessário:
  Conferir ambiente certo com autorização; nada é ativado pela B5.

- **Homologação externa** — Entradas: Meta/Flows/callbacks, SMTP/SMS/OAuth e
  aparelho real; Decisão/resultado necessário: Provas de provedor/cliente e
  aceite humano distintos dos mocks/SQL locais.

- **Melhoria opcional** — Entradas: e-mail operacional, áudio, Flow REQ,
  painéis adicionais; Decisão/resultado necessário: Só implementar se
  necessidade do primeiro uso justificar custo/dados/complexidade.

## Sequência sugerida de análise, sem execução

1. Fixar quais processos/canais serão prometidos e quais podem continuar
   desligados. Aprovar contingência, prazo e responsável; não habilitar todos
   por existirem campos de configuração.
2. Reunir causas compartilhadas com B1/B2/B3/B4 para evitar correções isoladas:
   progresso, estado, conteúdo, intenção, retorno parcial e frescor.
3. Decidir garantias de cancelamento/revogação em andamento e identidade de
   tentativa externa; comparar alternativas que conservem callbacks tardios
   e não façam retry cego de uncertain.
4. Definir critérios de progresso/idade de fila e identificação operacional,
   usando outbox, painel e audit existentes. Não há prova que exija outro motor.
5. Aprovar plano incremental de implementação/regressão a partir do
   [registro mestre](14_FINDINGS_MASTER.md) e dos
   [critérios](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md).
   Esses documentos não são testes aprovados de correção.
6. Autorizar separadamente ambiente de homologação, configuração de conta,
   envio de amostras, callback, falha/recuperação, restore e aceite
   físico/humano.

## Roteiro mínimo para homologação futura autorizada

- Conta/número/template/idioma/categoria e aprovação efetivos; dados fictícios,
  opt-in, telefone confirmado e escopo correto. Comparar texto final/PDF/hash.
- Accepted, delivered, read, failed e ausência de callback; erro130497,429,
  resposta perdida e atrasos; não anunciar compreensão humana.
- Lotes heterogêneos, erro de um item, reentrega e dedup com resultado por item;
  nenhum desconhecido vira comando.
- Retry entre tentativas: antigo callback não encerra lease nova; referência
  ausente não prova não envio; conciliação identificável e auditada.
- Revogação/cancelamento antes de preparo, durante upload e depois da aceitação;
  não prometer desfazer cópias já entregues.
- Flow: publicação/entrada real, cifra/chaves, INIT/BACK/erros, prazo, replay,
  sessão por propósito, revisão e falha após efeito; relato não debita sozinho.
- Auth: e-mail/SMS/Google, callback aprovado, expiração, verificador PKCE,
  resultado parcial e recuperação; não usar conta/provedor real sem autorização.
- Operação sem canal: família/profissional encontram pendências, sabem quem
  age e recuperam erro nos dispositivos utilizados. Medir somente amostra/volume
  necessário para SLO aceito, sem teste de carga indiscriminado.

## Evidência e limites que acompanham as decisões

Baseline, topologia e hashes ligam a B5 à base funcional e às provas anteriores.
44 pontos novos são classificados por método. Os 14 registros têm 31 campos,
incluindo efeito externo, contraprova, limitações e decisão aberta. B5-002 usa
estado sintético de hold; B5-012 usa confirmação Auth simulada; B5-009 ainda
requer cliente Meta. B58-U02 é hipótese refutada e não correção pendente.

Nenhum dado/migration histórico deve ser alterado para fazer a fila parecer
saudável. Não dispensar RLS/locks, registrar ciência expressa a partir de read,
fingir recebimento ou tratar formulário de consumo como débito. Produto e
ambientes externos permanecem fora das mudanças documentais desta autorização.
