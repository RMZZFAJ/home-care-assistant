# Checkpoint B4

Estado: **B4.0–B4.12 e consolidação documental concluídos**.

Branch `audit/phase-b`, HEAD inicial `315399dc5c19cacc9d9cc3c609174498608f4af0`.
Árvore inicialmente limpa. Master `34dcb835c5c49068e0417f7306eb4e501aa868bc`.
Produto sem diferenças funcionais da base `37cb7f85`.

Ordem mestre lida integralmente; escopo B4.0–B4.12 sequencial.
Não corrigir produto, migrations, dependências, testes oficiais ou remoto.
Não executar reset, substituição de fixtures, mensagens externas, deploy, PR
ou merge. Encerrar com commit e push exclusivamente documentais nesta branch.

## Registro incremental

- B4.0: repositório reconhecido; stack existente identificada; Node exigido
  encontrado no cache npm. Guias Next instalados e referências A/B1/B2/B3
  consultados. Baseline e proteção em `evidence/baseline.mjs`.
  Resultados globais B3 são históricos; nenhuma suíte global B4 foi executada.
  Guard e backup precederão novos dados sintéticos; nenhum reprodutor antigo
  será reexecutado.
- B4.0 encerrado: 395 arquivos protegidos; 232 funções locais idênticas à B3;
  API/DB locais e isolamento externo conferidos. Backup externo ao Git com
  SHA-256 e TOC verificados; nenhuma substituição/reset. Build B3 disponível.
- B4.1 encerrado: leitura de 41 handlers, 61 métodos HTTP e índice de 82
  superfícies. Catálogo AST com contratos, consumidores e referências a testes.
  Identificados alvos de autoridade divergente, retry, duas transações e
  limites de consulta, ainda sem promover hipótese a achado. Sem teste mutável.
  Evidências: inventário CSV e `source-surface-index.json`. Próximo: autoridade
  HTTP com identidade real e contraprovas de contexto/sessão.
- B4.2 encerrado: 15 cenários HTTP/Auth reais em `b42-auth-results.json`.
  Ausência de sessão, contexto manipulado, papel global indevido, identidade
  sem vínculo e cookie de sessão encerrada recusados. Seleção legítima em dois
  pacientes funciona. B3-020/021 preservados com limites; sem bypass HTTP novo.
  Matriz por método distingue revisão estática de amostra executada. Quatro
  contas e dois pacientes novos; nenhuma substituição de dados. Próximo B4.3.
- B4.3 encerrado: 16 cenários; B4-001 demonstrado por HTTP201 e read-back:
  number 1.0000001 vira 1.000000; string equivalente recusada. Nova causa HTTP
  ligada a B3-018; demais controles de entrada dirigidos recusaram casos
  inválidos. Erro instrumental do read-back corrigido com retomada, sem repetir
  movimento; ver ATTEMPTS. Próximo: comandos, retry e falhas após commit.
- B4.4 encerrado: seis cenários HTTP/read-back em `b44-command-results.json`.
  B4-002 amplia BE-005 ao consumidor settings; B4-003 perde link acionável no
  retry de aprovação; B4-004 omite revisão já salva após submissão recusada.
  Mesma chave canônica e REQ recuperaram identidade; conteúdo divergente gerou
  conflito; ENT não moveu estoque ao falhar; reemissão manual funciona.
  Próximo B4.5: completude, alcance e frescor, sem repetir volume B3.
- B4.5 encerrado: seis cenários; B4-005 oculta proposta pending depois do
  limite 50, nos caminhos local/global. Total 51, apenas 48 novos registros
  necessários; banco preservou pendência; página/ID ignorados. Consumo/auditoria
  B3 referenciados sem novo volume. Hipótese genérica de ausência de listener
  refutada pela propagação do WorkspaceProvider. Próximo B4.6.
- B4.6 encerrado: mapper real controlado confirmou B4-006 (42702 ENT vira
  conflito de apelido); sete probes iniciais e contraprova específica Flow.
  Caso sintético P0001 não é extrapolado: Flow vigente42501 vira FORBIDDEN.
  Envelope cliente B1-ERR-002 revalidado;204 não é defeito de rota atual.
  Nenhuma nova persistência afirmada a partir dos mocks. Próximo B4.7.
- B4.7 encerrado: quatro cenários HTTP/PDF/Storage e três de adaptador.
  Hash real igual ao registro, versão/cache/autoridade preservados; duplicação
  de upload no mock usa bytes canônicos. B4-007 registra risco de avatar sem
  retomada após associação falhar; não órfãos reais. Reservas/TTL/restore B3
  referenciados sem repetição. Próximo B4.8. Segunda passagem deve refinar o
  efeito do compartilhamento estrutural do paciente sobre consumidores de sync.
- B4.8 encerrado: cinco cenários HTTP. B4-008 comprova divergência de catálogo
  já observada em A (P3;rota ativa funciona); B4-009 comprova UUID inválido
  como500 global/400 local. Promoção global e troca de paciente recusadas.
  Perfil/global anterior preservados; apenas override e produto fictícios novos.
  Próximo B4.9: orquestração e eventos heterogêneos, sem envio externo.
- B4.9 encerrado: cinco cenários controlados. B4-010 delimita janela entre
  upload/cancelamento/envio (risco, sem mensagem real); B4-011 confirma200 com
  texto válido descartado por interactive não suportado no mesmo lote. HMAC e
WABA divergentes negados. BE-002/003 e scheduler B3 referenciados.
Proveniência
  do servidor corrigida para build B3 `.next-e2e`, sem rebuild/reteste.
  Próximo B4.10: segurança de aplicação, sem ações remotas.
- B4.10 encerrado: seis probes de HTTP/assets, origem/CORS/retorno/cache e
  chave privilegiada; nenhum novo bypass ou segredo no browser demonstrado.
  Matriz distingue garantias, hipóteses e edge não verificado. B3-020/021 e
  B4-010 permanecem; ausência de header local não virou vulnerabilidade por
  padrão. Referências de segurança/Supabase consultadas. Próximo B4.11.
- B4.11 encerrado: grafo198arquivos/453arestas; nenhum ciclo backend ou caminho
  literal client→server. Ciclo de fachada cliente não classificado como defeito.
  Um probe do dashboard contou25chamadas, sem inferir latência remota. BE-006,
  B3-015/024 mantidos como riscos com limites. Próximo B4.12: verificar efeito
de compartilhamento estrutural sobre reload; demais cruzamentos por
referência.
- B4.12 encerrado: dois cenários novos, sem replays antigos. B4-012 comprovado
  em Chromium: revisão avançou/contexto recarregou, zero GETs consumo, reload
  completo recupera. Corrigida a contraprova inicial do relatório05. B4-013:
  criação aceita isActive=false e persiste true; atualização local funciona;
  paciente fictício termina inativo. Matriz transversal referencia causas e
  contraprovas sem inflar contagem. Investigações B4 terminadas; consolidar
  13 registros, cobertura e77cenários únicos (60 locais e17controlados).

## Encerramento documental

25 entregáveis principais; 61 métodos em 41 handlers, 82 superfícies e 102
linhas de cobertura. 27 helpers com leitura própria e 14 revisões estáticas A
reutilizadas por código idêntico. 77 cenários únicos: 60 locais e 17
controlados.
Treze registros/32 campos: dez P2/três P3; sete mecanismos novos (dois riscos),
quatro causas relacionadas, uma manifestação ampliada e uma revalidação.

395 arquivos protegidos sem alteração e 232 funções iguais à B3. As 62 tabelas
públicas foram comparadas por hashes: 60 preservaram todas as representações
originais; 19 documentos e lifecycle mudaram pelo cron ativo. Backup
decodificado
somente em memória confirmou IDs originais, estado/paciente/tipo e hash chain
de 19 req.reminder do sistema. Não houve restore, reset ou alteração de legado.

Validação proporcional em `evidence/package-validation.json`; manifesto Git
em `evidence/MANIFEST.json` . Markdown, ESLint dos auxiliares e typecheck
restrito
dos probes foram verificados. Não houve nova suíte global de produto. O servidor
próprio foi encerrado; dados sintéticos permanecem para inspeção, com
credenciais
fora do Git. Índice geral atualizado. Commit/push exclusivamente documentais
na mesma branch encerram a autorização; SHA verificável no Git, sem
autorreferência
no próprio manifesto. Master preservada. Sem deploy, PR, merge ou B5/C/D.

Para retomar, ler este checkpoint, README, registro mestre, SCENARIOS e
validação.
Não executar novamente probes mutáveis antigos ou geradores de baseline para
recriar histórico. Novas fases/correções precisam de autorização correspondente.
