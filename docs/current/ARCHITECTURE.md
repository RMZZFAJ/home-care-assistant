# Arquitetura

**Fundação visual vigente:**[Modelo Integral](../ui-ux/CANONICAL_MODEL.md).
A migração retira Fluent/Griffel, usa componentes reutilizáveis e comportamento
sem aparência, preservando fronteiras, autorização e funcionalidades reais.

Contrato AS_IS da base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`.
Riscos conhecidos incluem progresso REQ, autoridade após espera, frescor e
semântica de ciência. Descrição de invariante não elimina os desvios A/B.
Estado e limites: [PROJECT_STATUS](PROJECT_STATUS.md). Planejamento futuro
em [C](../audits/C/README.md); decisões aprovadas não equivalem a
implementação.

## Organização e fronteiras

App Router, React e TypeScript organizam as páginas, componentes e Route
Handlers. Supabase Auth é a autoridade de credenciais; PostgreSQL determina
autorização, séries documentais, snapshots e transações. O paciente é a
unidade
operacional. Somente materiais sob responsabilidade familiar são gerenciados.

Identidade global e função local são independentes. O contexto vem da RPC
my_workspace, com pacientes e capacidades efetivas em uma chamada. A seleção
lembrada no navegador não concede acesso. API, RLS e RPCs revalidam a
operação.

Cada sessão Auth escolhe explicitamente administração global ou um vínculo
local existente. O modo global administra a plataforma e propõe mudanças no
paciente; não concede poderes operacionais. O administrador local altera seu
paciente imediatamente. Uma proposta global exige aprovação de outra
identidade
administradora local, mesmo quando o proponente também possui esse vínculo.
Novo paciente recebe administrador inicial por e-mail confirmado
explicitamente
informado. Convites revalidam a autoridade local do emissor no aceite.

## Domínios

- Catálogo: products preserva identidade; care_recipient_products é canônico.
- Medidas: unidade base, precisão e apresentações com código de barras.
- Documentos: REQ, COM, ENT e BAL, com UUID e série por paciente/tipo.
- Ledger: saldos confirmados familiares/equipe e trânsito, sem edição direta.
- Acesso: funções, capacidades e propostas críticas com segunda aprovação.
- Evidências: anexos privados, PDF por versão e snapshots canônicos.
- Comunicação: outbox, estados externos e ciência no aplicativo
  independentes.
- Relatos: sugestões de falta/consumo e revisão autenticada de Flow.
- Escalas: programação persistente, propostas e intervalos sem sobreposição.
- BAL por plantão: regime opt-in, obrigações semanais, atribuições, decisões
familiares e regularização com conservação dos atrasos históricos.

A interface usa shell hierárquico recolhível, tokens visuais, controles
comuns,
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

Ciência familiar é independente de atendimento e recebimento. Política do
paciente e preferências pessoais controlam ciência expressa, WhatsApp e
automática. A exibição autorizada, leitura correlacionada ou expedição
elegível
registra sua origem; nenhuma dessas evidências vira confirmação expressa.
Uma linha ENT pode atender várias REQs mediante justificativa, sem duplicar o
crédito físico. Mudanças de atendimento geram nova versão canônica da REQ.

Movimentos familiares avulsos e correções usam ledger e motivo. Cancelamento
de ENT após aceite exige consentimento do destinatário e conciliação real.
BAL conta apenas a equipe, captura revisão de estoque e segue política
opcional ou obrigatória. Reconto conserva versões anteriores.

As RPCs serializam idempotência e estoque com locks transacionais. Comandos
exigem versão esperada. Uma confirmação externa ou leitura de comprovante
que falha não desfaz o documento já persistido; o cliente recupera a mesma
intenção. O ledger não admite saldo negativo por exceção pública.

Transferência entre custódias usa a ENT como registro operacional. A página
/transferencias prepara declaração explícita com contraparte e recebedor
separados. Uma única gaveta alterna edição e conferência, preserva campos nos
conflitos e exige adoção explícita da referência atual. Resposta incerta conserva
o pacote e sua chave até recuperação; perda posterior da capacidade de criar não
impede recuperar a declaração confirmada com leitura ainda autorizada.

O detalhe mostra os três atos com nomes preservados. A contraparte decide a
concordância; o declarante expede; o recebedor confirma pessoalmente. Antes da
expedição, a quantidade aparece como Declarado e não como Expedido. Encerramento
administrativo registra o ato do administrador. As tarefas de concordância e
expedição integram o acompanhamento de entregas antes da paginação. Foco e
justificativa são conservados no conflito; adotar uma declaração encerrada não
reabilita sua confirmação. O fluxo ENT anterior permanece acessível até concluir
a equivalência necessária à substituição.

Na recuperação de recontos, a identificação e as ações podem ocupar linhas
separadas em telas estreitas. O código e o nome de quem contou mantêm espaço
visível, mesmo quando a soma dos botões excede a largura da linha.

Eventos confirmados incluem atores, conteúdo, evidências, vínculos e hash
anterior. SHA-256 verifica conteúdo canônico, com versão documental imutável
para clientes. Assinatura Ed25519 e gestão de chaves ficam para o roadmap.

REQ concluída com ciência obrigatória pendente conserva a exceção que exige
arquivamento manual justificado, inclusive após ciência tardia. O contrato
exige trabalho elegível e não trata importações históricas como
pendências atuais. A DB-002/B3-001 documenta o bloqueio histórico por terminais;
D-A o corrigiu com filtro antes dos limites, rotação e isolamento de
candidato inválido, separados do cursor BAL. Provas locais no
[checkpoint D-A](../audits/D/D-A/CHECKPOINT.md). Realtime privado transmite
somente revisões por usuário;
reconexão e consulta periódica recuperam eventos perdidos, sem apagar
rascunhos.

## Integrações

Worker reserva tarefas com lease, revalida o destinatário e persiste
resultado.
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
O destino efetivo de preview/produção precisa de verificação atual e
autorização.
Não inferir configuração ou release do relato datado em
[Execução histórica](../archive/evolution/EXECUTION.md). Estado corrente em
[PROJECT_STATUS](PROJECT_STATUS.md).
