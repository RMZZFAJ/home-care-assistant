# Lacunas novas e oportunidades proporcionais

## O que falta para representar o resultado real

O backend já possui idempotência transacional, mas ainda falta um contrato
consistente da intenção entre cliente e API. B4-002 descarta a identidade no
cliente; B4-003 não recupera o resultado acionável do convite; B4-004 não
representa etapas já confirmadas. Uma API genérica de “tentar novamente” não
substitui o resultado por comando. Priorizar completar esses percursos antes
de criar novo motor de workflow.

A governança precisa de recuperação por referência e consulta completa de
pendências (B4-005). Isso pode ser evolução do endpoint atual, não novo painel
ou banco. O consumo precisa reagir à invalidação que já existe (B4-012), sem
inventar outro transporte Realtime ou recarregar rascunhos indiscriminadamente.

O contrato de criação do paciente precisa decidir se aceita estado inativo
(B4-013). O formulário e a API hoje oferecem a opção; ignorá-la não simplifica
o produto de forma transparente. Preservar o administrador inicial explícito
é obrigatório em qualquer alternativa.

## Oportunidades por benefício demonstrável

- **Resultado de comando tipado:** IDs, versão, etapas confirmadas, certeza e
  recuperação. Benefício: não confundir erro posterior com ausência de efeito.
Depende de B4-003/004 e B1-ERR-002; risco de envelope universal apagar
domínio.
- **Erro de domínio explícito:** códigos estáveis na fronteira SQL/API e
  diagnóstico técnico seguro no servidor. Benefício: corrigir B4-006/009 sem
  devolver SQL ao cliente. Compatibilidade deve ser mantida por consumidor.
- **Contrato de revisão por read model:** assinatura por chave/revisão e
  cancelamento de resposta antiga. Benefício demonstrado em B4-012; preserve
  drafts e não inunde a rede por cada componente receber o mesmo evento.
- **Parser por item externo:** processar/recusar explicitamente cada elemento
  com dedup. Benefício: B4-011 não perde texto vizinho; risco de ação indevida
  se formato desconhecido for interpretado como comando suportado.
- **Retomada/reconciliação de avatar:** benefício condicional de reduzir
  objetos sem referência. B4-007 é P3 e não prova incidente de quota; política
  de retenção precede qualquer limpeza.
- **Bootstrap/read model consolidado:** medir BE-006 antes. Contagem25 existe;
  redução de latência não foi demonstrada. Manter desenho atual é alternativa
  legítima se o orçamento for atendido.

## Lacunas de domínio e integração herdadas

B2 já definiu falta de encerramento parcial COM, recusa/retirada de cancelamento
ENT, sucessão após revogação, produto inativo com saldo e complementação de
relato textual. B3 delimitou bloqueios transacionais, precisão direta, sessão,
lease, consultas, reservas e restore. Esses problemas não viram funcionalidades
novas B4 por serem reapresentados na fronteira HTTP.

E-mail operacional e transcrição de áudio seguem ausentes no worker; não
habilitar uma preferência como promessa de serviço implementado. Comunicação
externa real precisa de homologação própria, sem tratar accepted como entrega.

## Mudanças que devem ser descartadas como resposta automática

Reescrever backend inteiro; trocar RPCs por DML TypeScript; converter tudo em
Server Actions; remover histórico para aliviar consulta; aumentar timeouts
sem deadline/lease; apagar reservas para liberar quota; usar saldo atual para
recriar PDF histórico; exigir quantidade solicitada em REQ; tratar escala como
presença; fundir ciência, aviso visto e recebimento físico; reativar
profissional
para assinar tarefa anterior; usar cache público de autoridade.

Essas mudanças não resolvem as causas demonstradas e arriscam contratos
corretos.
A Fase C deverá escolher prioridades e alternativas com o responsável, sem
presumir que toda oportunidade deva ser implementada.
