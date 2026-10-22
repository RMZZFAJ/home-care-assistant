# Evolução integral — execução

## Autorização e contrato

Execução integral autorizada em 22/10/2026: implementação, branch, commits,
push, reset controlado local, PR, merge na master e verificação do deploy.
O último direcionamento autoriza antecipar o preview online e aplicar a cadeia
incremental ao Supabase remoto existente, preservando os segredos da Vercel.
Antes dessa aplicação: reconciliar o destino, gerar backup externo verificável
e conferir o catálogo e o administrador global. Nunca executar reset, fixtures
ou a suíte mutável contra o remoto. O preview será identificado como parcial
enquanto houver critérios de aceite pendentes.

Existem quatro fichas: REQ, COM, ENT e BAL. O sistema controla exclusivamente
insumos sob responsabilidade familiar. COM admite compra e doação sem exigir
pagamento. Administrador local movimenta e corrige o estoque familiar com
ledger e anexos. ENT transfere entre família e equipe; BAL é exclusivo da
equipe. UUID, sequência por paciente/tipo, protocolo, snapshots e SHA-256 ficam
no banco. Assinatura assimétrica permanece no roadmap; hash simples não impede
adulteração por administradores do banco.

REQ não tem quantidade solicitada. Aceite positivo explicitamente vinculado
atende sua linha. ENT acompanha separadamente linhas integralmente conferidas,
quantidades expedidas, aceitas e conciliadas. Divergências preservam aceites
válidos e exigem resolução formal para encerrar o documento.

## Base preservada

- Base Git: 701521c; branch codex/home-care-evolucao-integral publicada.
- Último commit publicado neste checkpoint: 6b3c218.
- Cadeia inicial: 35 migrations; primeiras 19 verificadas por contrato.
- Onze migrations incrementais de evolução aplicadas localmente; não editar.
- Backup local custom e manifesto externos com SHA-256 conferido.
- Restauração integral ensaiada em banco temporário do mesmo container local:
  37 produtos, 107 vínculos de catálogo, 13 identidades Auth e 13 perfis.
- Catálogo remoto anterior: 29 produtos e 29 vínculos, exportação externa
  conferida. Antes do corte, renovar backup e conferência do estado remoto.
- Administrador global remoto encontrado ativo na conferência anterior;
  autenticação e acesso ao preview ainda precisam de verificação atual.

## Matriz de execução

| Bloco | Estado real | Evidência e limite |
| --- | --- | --- |
| Preservação e runtime | Verificado localmente | Backup restaurado; Node 24.22.0 e npm 11.21.1 preparados |
| Documentos, capacidades e unidades | Implementado, aplicado localmente | UUID, sequência, snapshots, ledger, RLS, unidades e apresentações |
| REQ, COM, ENT e BAL | Implementado, validação em andamento | SQL e E2E parciais cobrem aceite positivo, divergência, reconto e cancelamento |
| Interface global | Implementada, homologação em andamento | Menu hierárquico, dashboard de tarefas, histórico, estoques e wizards |
| Perfil, scanner e anexos | Implementados, validação em andamento | Auth real, fallback de scanner, arquivos privados e sanitização |
| PDF e notificações | Implementados, validação em andamento | PDF versionado, outbox, worker e estados seguros |
| WhatsApp e Flows | Implementados sob configuração | Templates, desafio de aceite e endpoint cifrado; provedor não homologado |
| Consumo e indicadores | Base implementada | Sugestões pendentes; confirmação autorizada gera ledger uma vez |
| Preview remoto antecipado | Prioridade atual | Backup, migrations incrementais e deploy com configuração existente |
| Testes completos e revisão | Em execução | Resultados detalhados abaixo; não equivalem a homologação final |
| PR, merge e produção | Pendente | Autorizados após critérios de aceite; publicar links e evidências reais |

## Validações realizadas

- check:contracts passou: migrations históricas preservadas.
- Typecheck passou após os últimos contratos de anexos.
- Lint passou sem erros, com 11 avisos de nomenclatura de refs a revisar.
- Build passou antes dos últimos ajustes; repetir para o preview atual.
- Testes unitários: 76 testes em 11 arquivos passaram.
- SQL de invariantes passou: REQ 5/10, ENT 8/10, aceite parcial 6/10,
  idempotência, vínculos explícitos, compensações e revisões de BAL.
- Replay de migrations passou na instalação limpa e na evolução legada;
  seis suítes SQL legadas passaram. A seleção de identidade da suíte supply
  precisa ser corrigida para excluir perfil globalmente revogado e repetir
  esse gate completo. A regra de autorização recusou corretamente essa conta.
- Integração HTTP: cinco dos seis cenários passaram na última execução.
  Ajustado o teste de claim para selecionar seu evento na fila compartilhada;
  a execução completa após reset permanece pendente.
- E2E Chromium: login, erro de senha/rede, logout, administração, convites,
  onboarding, idempotência após perda de resposta, REQ/ENT parciais, reconto,
  histórico e ajustes de estoque têm resultados positivos individuais.
  A cadeia integral encontrou uma imagem inválida na fixture; fixture corrigida
  com PNG gerado, aguardando repetição. Não registrar a cadeia como aprovada.
- E2E de acessibilidade ampliado para telas e perfis; ainda não executado.
  Android, iOS/WebKit, PDF renderizado e câmera física ainda não homologados.

## Próximos passos e impedimentos

1. Publicar preview parcial com o Supabase remoto existente, após backup e
   pré-validação, sem transferir dados fictícios locais nem alterar segredos.
2. Repetir gates afetados, finalizar ligações de múltiplas REQ, visão de trânsito,
   feedback documental, revisão de Flows e demais lacunas operacionais.
3. Executar a matriz completa de permissões, concorrência, SQL, API e E2E desktop
   e mobile; corrigir falhas, atualizar a documentação e revisar o diff.
4. Restaurar e conferir integralmente o catálogo local preservado após a última
   rodada mutável. Conferir catálogo e administrador no remoto após migrations.
5. Abrir PR, verificar checks, fazer merge autorizado e conferir a master e o
   deploy efetivamente publicados.

WhatsApp/Meta, OAuth, SMS, transcrição e câmera em aparelhos físicos dependem
de configuração e/ou liberação externa. Permanecem controlados por configuração;
não há evidência de homologação externa nem de publicação de Flow nesta etapa.
Nenhuma credencial ou payload privado deve constar nos relatórios, commits,
logs, traces ou artefatos públicos.

## Retomada técnica

Runtime fora do Git: LOCALAPPDATA/home-care-assistant/runtime/node-v24.22.0-win-x64.
Invocar node com LOCALAPPDATA/home-care-assistant/tooling/node_modules/npm/bin/npm-cli.js.
Preceder PATH com o runtime acima; o npm global não atende ao pin do projeto.
Usar exclusivamente o runner que verifica a stack home-care-assistant em
127.0.0.1:54321/54322 para testes mutáveis. Não executar simultaneamente suítes
que revogam identidades globais e E2E autenticados.

O banco temporário de ensaio preserva a restauração original e não é destino da
suíte. Removê-lo somente após restaurar/conferir os dados a preservar. Backups,
manifests e credenciais ficam fora do Git. A situação do preview e seus links
serão atualizados neste arquivo após verificação efetiva.
