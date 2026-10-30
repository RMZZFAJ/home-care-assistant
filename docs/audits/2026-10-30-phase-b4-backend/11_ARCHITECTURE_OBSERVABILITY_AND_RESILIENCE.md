# Arquitetura, observabilidade e resiliência

## Estrutura e simplificação proporcional

Route Handlers adaptam HTTP; Supabase Auth identifica; RLS/capacidades
delimitam;
RPCs transacionais impõem o domínio. Cliente privilegiado atende serviços
específicos. Essa distribuição conserva transações, história e autoridade.
Não há evidência que justifique outro backend ou converter tudo em Server
Actions.

[Grafo estático](evidence/architecture-results.json): 198 arquivos TS/TSX,
453 arestas de importação runtime literal e 82 raízes use client. Nenhum caminho
cliente→`src/lib/server` foi encontrado, nem ciclo no backend examinado. Há um
ciclo de cinco módulos de shell/fachada/notificações no cliente; não demonstrou
falha funcional e não é por si só recomendação de refatoração.
Imports dinâmicos computados e bibliotecas externas não foram expandidos.

Simplificações com consumidor concreto: preservar chave na política; apresentar
resultado composto de revisão/submissão; retornar erro de domínio tipado;
permitir navegar por pendências; isolar parser por item. São mudanças futuras
limitadas aos contratos defeituosos. Evitar camada genérica sem consumidor,
DTO universal que apague semântica REQ/COM/ENT/BAL ou remoção cega de legado.

## Medição e limites

[B411-01](evidence/b411-dashboard-results.json) executou o handler real com
dependências controladas e capacidades amplas: **25 chamadas lógicas Supabase**,
oito de bootstrap encadeadas e 17 do painel. É medição do adaptador, não
latência de rede/SQL. Confirma BE-006 sem transformar o risco P3 em incidente
de produção. As últimas consultas são paralelas e capacidades menores reduzem
o trabalho. Não foi necessário repetir build ou benchmark global.

- **Dashboard amplo** — Medida disponível / limite: 25 chamadas no adaptador;
  sem p95 remoto; Alternativa, custo e regressão: Medir por etapa; consolidar
  read model se justificar; risco de autoridade stale.
- **História documental longa** — Medida disponível / limite: B3-015 já mediu
  crescimento de resumos; Alternativa, custo e regressão: Orçamento/retenção
  ou evolução de snapshot; custo alto e risco de hash histórico.
- **Movimentos/alertas** — Medida disponível / limite: Planos B3-024; sem SLO
  de produção; Alternativa, custo e regressão: Medir autorização por linha;
  otimizar após plano; risco de mascarar custódia.
- **Worker com mídia** — Medida disponível / limite: Probe virtual A140s no
  máximo permitido; Alternativa, custo e regressão: Deadline/lote/lease; custo
  médio; risco de reenvio duplicado.
- **PDF cache miss** — Medida disponível / limite: Pipeline CPU/Storage; hash
  B47 correto; Alternativa, custo e regressão: Medir cold/warm e volume; fila
  só se necessário; preservar versão/autoridade.
- **Listas incompletas** — Medida disponível / limite: Corte50/100
  demonstrado; sem ganho medido; Alternativa, custo e regressão:
  Página/busca/filtro estáveis; custo médio; risco de perder pendência por
  ordem.

Nenhum ganho de milissegundos, custo financeiro ou redução percentual foi
inventado. Benchmark futuro deve definir volume, rede e SLO antes de comparar
alternativas. Tamanho do arquivo não é evidência de gargalo.

## Falhas parciais e continuidade

Promise.all do dashboard falha o conjunto quando uma dependência necessária
falha. Isso evita inventar resultado vazio, mas torna o painel dependente de
muitos serviços. Degradação por seção pode ajudar se o produto definir quais
dados podem ser parciais; não combinar saldos de instantes incompatíveis como
snapshot único. Links diretos mitigam dependência do painel.

Storage e banco não compartilham transação. Anexo tem reserva/hash/retomada;
avatar não tem contrato equivalente (B4-007). REQ distingue falha de comprovante
de falha de persistência. Revisar/submeter omite commit parcial (B4-004).
Essas diferenças exigem respostas próprias, não timeout global mais alto.

Scheduler e envio compartilham endpoint: exceção no primeiro impede chegar ao
segundo naquela chamada. B3-001/025 explicam falta de progresso/legado, enquanto
o botão administrativo processa somente envios. Repetir o botão não garante
recuperar obrigações nem resolver o candidato que aborta o lifecycle.

## Observabilidade

Há código seguro, correlação, outbox/lease/estado, eventos imutáveis e histórico
de execução. Logs HTTP não incluem payloads, sessões ou SQL privado. Devem ser
preservados. B4-006 mostra que conservar somente código público pode esconder
falha interna sob categoria errada. Diagnóstico interno precisa de categoria
técnica segura e correlação entre handler/RPC/serviço, sem conteúdo
assistencial.

Sinais futuros: idade da pendência mais antiga, progresso de lote, último
sucesso útil, uncertain sem conciliação, reserva sem associação, falha de
geração e tempo por etapa. Cron executado ou counts.skipped não comprovam
operação concluída, como B4-010 ilustra. Instrumentação não deve disparar
mensagem repetida nem alterar snapshot/ledger para obter métricas.

## Limites e segunda passagem

Sem carga, saturação, failover, restore, p95 remoto ou medição de provedor.
B3-014 exige recuperação conjunta de Auth, banco, bytes, jobs e configuração
em ambiente isolado autorizado. Backup legível não é prova de restore.
Desempenho histórico B3 foi referenciado, não reexecutado.

`WorkspaceProvider` compartilha estruturalmente linhas de paciente: recarregar
contexto pode conservar a referência consumida por effects. A conclusão inicial
de que o listener do pai bastaria precisa de prova adicional; B4.12 investigará
apenas esse caminho novo e cruzará os demais achados sem repetir cenários.
