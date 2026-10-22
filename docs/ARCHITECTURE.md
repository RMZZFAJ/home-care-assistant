# Arquitetura

## Organização e fronteiras

App Router, React e TypeScript organizam as páginas, componentes e Route
Handlers. Supabase Auth é a autoridade de credenciais; PostgreSQL determina
autorização, séries documentais, snapshots e transações. O paciente é a unidade
operacional. Somente materiais sob responsabilidade familiar são gerenciados.

Identidade global e função local são independentes. O contexto vem da RPC
my_workspace, com pacientes e capacidades efetivas em uma chamada. A seleção
lembrada no navegador não concede acesso. API, RLS e RPCs revalidam a operação.

## Domínios

- Catálogo: products preserva identidade; care_recipient_products é canônico.
- Medidas: unidade base, precisão e apresentações com código de barras.
- Documentos: REQ, COM, ENT e BAL, com UUID e série por paciente/tipo.
- Ledger: saldos confirmados familiares/equipe e trânsito, sem edição direta.
- Acesso: funções, capacidades e propostas críticas com segunda aprovação.
- Evidências: anexos privados, PDF por versão e snapshots canônicos.
- Comunicação: outbox, estados externos e ciência no aplicativo independentes.
- Relatos: sugestões de falta/consumo e revisão autenticada de Flow.

A interface usa shell hierárquico recolhível, tokens visuais, controles comuns,
wizards com barra de etapas acessível e histórico filtrável. Componentes de
scanner, evidências, revisão, trânsito e notificações são reutilizados onde há
consumidores reais. Regras de estoque e autorização permanecem no banco.

## Fluxos críticos

REQ persiste intenção e linhas sem quantidade solicitada. COM solicita e
aprova aquisição, registra recebimento e valida a entrada familiar. ENT
expede da origem para trânsito e permite somente ao destinatário aceitar.
Aceite parcial positivo credita o destino e atende linhas REQ explicitamente
vinculadas; a diferença permanece pendente. Conferência ENT e atendimento
REQ são indicadores separados. Compra não atende REQ.

Movimentos familiares avulsos e correções usam ledger e motivo. Cancelamento
de ENT após aceite exige consentimento do destinatário e conciliação real.
BAL conta apenas a equipe, captura revisão de estoque e segue política
opcional ou obrigatória. Reconto conserva versões anteriores.

As RPCs serializam idempotência e estoque com locks transacionais. Comandos
exigem versão esperada. Uma confirmação externa ou leitura de comprovante
que falha não desfaz o documento já persistido; o cliente recupera a mesma
intenção. O ledger não admite saldo negativo por exceção pública.

Eventos confirmados incluem atores, conteúdo, evidências, vínculos e hash
anterior. SHA-256 verifica conteúdo canônico, com versão documental imutável
para clientes. Assinatura Ed25519 e gestão de chaves ficam para o roadmap.

## Integrações

Worker reserva tarefas com lease, revalida o destinatário e persiste resultado.
Aceitação pelo provedor não significa entrega. Resultado incerto exige
conciliação antes de reenviar. Webhooks Meta exigem HMAC e deduplicação.

Aceite simplificado WhatsApp usa telefone confirmado no Auth e desafio único
com identidade, versão e prazo. Flows usa envelope cifrado do provedor, sessão
curta e revisão autenticada. Relato não produz débito até confirmação
autorizada. Nenhuma integração concede autonomia clínica ou SQL arbitrário.

## Next.js e ambientes

Guias instalados em node_modules/next/dist/docs prevalecem sobre convenções
anteriores. Páginas autenticadas usam Suspense e leitura por requisição;
sessão e permissão não têm cache compartilhado. Erros preservam exceções
internas Next com unstable_rethrow. Formulários Auth aguardam hidratação
antes de aceitar edição, protegendo digitação e envio em navegadores móveis.

Mutações e callbacks usam origem aprovada. Preview acrescenta somente hosts
exatos fornecidos por VERCEL_URL e VERCEL_BRANCH_URL. Headers arbitrários não
estabelecem confiança. OAuth depende dos redirects aprovados no Auth.

Desenvolvimento e testes usam exclusivamente a stack local verificada.
O preview online utiliza o Supabase remoto autorizado, com migrations
incrementais, sem reset nem fixtures. Consulte
[Execução](evolution/EXECUTION.md) para evidências e limitações atuais.
