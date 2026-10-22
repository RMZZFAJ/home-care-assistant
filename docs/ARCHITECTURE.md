# Arquitetura

## Organização

O App Router mantém páginas e Route Handlers. Componentes agrupam jornadas
de requisição, administração e estoque. Helpers de servidor centralizam
sessão, escopo de paciente, validação, contratos de erro e comprovantes.
Supabase Auth é a autoridade de credenciais; PostgreSQL é a autoridade de
autorização, protocolo, catálogo e transações.

O navegador resolve contexto por `/api/context`, seleciona um paciente e
consulta APIs autenticadas. O servidor revalida perfil e vínculo em cada
operação. RLS e RPCs repetem as restrições no banco, protegendo também a
Data API. A seleção lembrada no navegador nunca é autorização.

## Responsabilidades

- Identidade global: Auth e perfil-base; não pertence a um paciente.
- Acesso operacional: vínculo com papel e estado por paciente.
- Catálogo: identidades estáveis de produtos e definição própria por paciente.
- Estoque: ledger por paciente, produto e custódia; saldos derivados.
- Requisição: intenção canônica, protocolo e snapshots persistidos.
- Inventário: referência, contagem e aprovação por movimentos compensatórios.
- Notificações: outbox individual; provedor externo desacoplado da gravação.
- Auditoria: eventos produzidos por operações autorizadas e imutáveis ao cliente.

| Fronteira | Arquivos responsáveis |
| --- | --- |
| Sessão e capacidades por paciente | src/lib/server/api.ts; /api/context |
| Origem canônica e prévias autorizadas | src/lib/server/app-origin.ts |
| Navegação, seleção e feedback | src/components/workspace.tsx |
| Administração local/global | src/components/admin; /api/admin |
| Requisição e histórico | src/components/requisitions; /api/requisitions |
| Saldo, ledger e inventário | src/components/stock; /api/stock |
| Recibo persistido | src/lib/server/receipts.ts; src/lib/receipt.ts |
| Provedor, worker e reconciliação | src/lib/notifications; /api/notifications |
| Autorização e atomicidade efetivas | supabase/migrations; tests/database |

As rotas validam contratos e contexto e chamam operações transacionais; não
recalculam saldos ou protocolos no navegador. As telas repetem capacidades
somente para apresentar ações disponíveis. O banco continua sendo a barreira
para chamadas diretas, mesmo quando a interface omite um controle.

O console administrativo e o wizard mantêm formulários do mesmo domínio no
mesmo módulo, com subcomponentes explícitos. Notificações, estoque e inventário
têm consumidores e módulos separados. A intervenção não criou um repositório
genérico de dados nem uma hierarquia abstrata sem uso. Novas extrações devem
seguir reuso ou complexidade demonstráveis, preservando contratos e testes.

## Fluxos críticos

Submissão valida a intenção no banco, serializa a chave idempotente, recupera
o registro original ou grava requisição, itens, observações, snapshots e
eventos em transação. O servidor reconstrói o comprovante do que foi salvo.
Uma falha posterior de leitura ou mensagem não desfaz essa persistência.

Movimentação serializa chaves de estoque e registra os dois lados de uma
transferência atomicamente. Inventário captura referência e revisão; qualquer
mudança posterior impede aprovação até nova contagem.

O worker reserva tarefas com lease, revalida autorização do destinatário,
envia quando configurado e persiste o resultado. Timeout externo é incerto;
não autoriza duplicação automática. Webhooks assinados conciliam resultados.

## Next.js

As páginas autenticadas usam Suspense e leitura por requisição, conforme os
guias instalados de Cache Components. Não há cache compartilhado de sessão
ou permissão. O wrapper de erros preserva exceções internas do Next.js por
`unstable_rethrow`; não transforma prerenderização em resposta 500 estática.

Mutações e links de autenticação usam a origem configurada. Prévias Vercel
podem acrescentar somente os hosts exatos fornecidos por VERCEL_URL ou
VERCEL_BRANCH_URL, na origem vercel.app. Cabeçalhos encaminhados arbitrários
não estabelecem confiança. OAuth continua dependente dos redirects aprovados
no ambiente Auth correspondente.

Contratos de negócio e banco ficam explícitos. Não há nova camada de SaaS,
organização, ORM ou framework de agentes nesta intervenção.
