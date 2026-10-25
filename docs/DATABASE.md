# Banco de dados

## Preservação e migrations

Migrations aplicadas são imutáveis. O guard verifica os hashes normalizados
das primeiras 63 entre Windows e Linux; toda evolução usa novos arquivos.
Instalação limpa e evolução legada são testadas na stack local, preservando
protocolos, snapshots, FKs e estoques cuja origem não pode ser atribuída.

O remoto nunca recebe reset, fixtures ou suíte mutável. Atualizações remotas
exigem autorização, identidade e destino conferidos, reconciliação,
pré-validação e backup externo verificável. Resultados e contagens atuais
ficam na [execução](evolution/EXECUTION.md), separados destas regras permanentes.

## Catálogo e medidas

products conserva identidades históricas. care_recipient_products é o catálogo
canônico por paciente: nome, aliases, categoria, unidade, precisão e estado.
Novos pacientes começam vazios e adotam modelos explicitamente. Alterações
locais não reinterpretam outros pacientes ou saldos antigos.

measurement_units permite unidades globais ou locais. product_presentations
associa GTIN/EAN/UPC à quantidade na unidade base. Unidades com história são
protegidas contra reinterpretação; material antigo é inativado.

## Documentos e auditoria

operational_documents unifica somente REQ, COM, ENT e BAL. Cada documento tem
UUID técnico, número sequencial independente por paciente/tipo, código legível,
protocolo, versão e hash canônico. Rascunhos não consomem sequência de emissão.

document_lines guarda quantidades numeric(18,6), snapshots e estados de
conferência. REQ conserva requisitions e requisition_items, sem quantidade
solicitada. document_request_links associa explicitamente linhas de COM/ENT
às linhas REQ; somente ENT aceita efetivamente atende a requisição.

requisition_item_resolutions identifica item extra no catálogo sem alterar
a linha original. A decisão e seu motivo integram uma nova versão auditável.

document_events contém snapshots confirmados, atores, vínculos, anexos,
aprovações, hash anterior e SHA-256. Eventos são imutáveis para clientes.
Hash não é assinatura assimétrica nem garantia contra administradores do banco.
Protocolos e fatos históricos anteriores permanecem preservados.

purchase_receipts separa recebimento informado e validação da entrada familiar.
bal_approvals identifica grupo, ator e versão de contagem. Reconto conserva
aprovações antigas e captura nova referência; elas não aprovam o novo balanço.

## Escalas e obrigações semanais

shift_types, shift_series e scheduled_shifts preservam a programação real em
intervalos UTC; exclusão GiST impede sobreposição do mesmo profissional entre
pacientes. shift_change_requests e shift_events conservam propostas e decisões.
Séries limitadas a 366 dias são materializadas e validadas integralmente.

bal_regimes habilita processamento por paciente, sem ativação automática pela
migration. bal_obligations preserva cada semana, prazo original, prazo efetivo,
atraso e regularização real. bal_cycles acumula obrigações sem simular contagens
anteriores. bal_assignments vincula profissional, janela e versão de plantão;
bal_deferrals conserva proposta e decisão familiar. bal_cycle_events registra
a cronologia. Comandos idempotentes privados e locks transacionais evitam
atribuições/contagens concorrentes. O worker operacional existente processa
apenas regimes habilitados, com limites e deduplicação.

Essas tabelas possuem RLS e leitura por capacidade; cliente e service_role não
possuem DML direto. Comandos públicos autorizados são a única entrada do usuário.
Helpers, funções anteriores renomeadas e tabelas de controle ficam revogados.
Contagem captura a revisão do ledger; uma alteração posterior exige nova
conferência, preservando autor original e a identidade de quem contou.

## Estoque e transações

stock_movements é o ledger oficial. FAMILY, CARE_TEAM e TRANSIT representam
custódias separadas. Expedição ENT debita a origem e credita trânsito; aceite
credita imediatamente o destino. Conciliações retiram do trânsito apenas
quantidades formalmente resolvidas. Não há edição direta de saldo.

Operações familiares avulsas e compensações exigem motivo, ator e idempotência.
Nenhuma operação pública pode produzir saldo negativo ou apagar a história.
Locks transacionais serializam movimentos concorrentes e aceites repetidos.

current_stock_balances usa security_invoker e capacidades por custódia.
stock_history mascara antes/depois familiares para leitores da equipe.
stock_overview separa confirmado, previsão, mínimo e divergência.
stock_transit lista ENT abertas sem revelar o saldo geral familiar.
Métricas de consumo usam débitos confirmados, nunca observação da REQ.

BAL trata exclusivamente estoque da equipe. A referência usa revisão do
ledger; mudança desde a contagem impede aprovação até reconto. Política
opcional aplica diretamente; política obrigatória exige os grupos e as
identidades distintas configuradas no paciente.

## Identidade, capacidades e integrações

Supabase Auth é a autoridade de identidade. profiles guarda dados pessoais e
escopo global; care_recipient_memberships define função e estado locais.
capability_definitions e capability_overrides determinam capacidades efetivas.
access_change_requests versiona propostas críticas e segunda aprovação.

private.authority_sessions associa contexto explícito à sessão Auth vigente.
Autoridade global não substitui vínculo operacional. O administrador local
aplica mudanças imediatamente; propostas globais conservam versão e exigem
aprovação de outra identidade local. Locks e guards preservam o último
administrador ativo sob revogações concorrentes. O selo privado transacional
autoriza somente o vínculo inicial explícito ou aceite de convite válido.

requisition_lifecycle conserva política, prazo, conclusão, exceção de ciência
pendente e arquivamento. requisition_science_events registra ator, modalidade e
evidência imutável. Atendimento aceito altera uma nova versão documental; hashes
e PDFs anteriores permanecem intactos. Importações não inventam ciência ou data.

my_workspace retorna pacientes e capacidades em uma chamada autorizada.
Browser metadata, IDs e seleção local não concedem acesso. RLS, grants
explícitos/defaults, schema private e SECURITY DEFINER são revisados juntos.

attachments e document_pdfs guardam referências, hashes e versões de objetos
privados no Storage. Upload sanitizado tem reserva idempotente e confirmação
de servidor. PDF é armazenado por versão imutável.

document_pdfs distingue hash do conteúdo canônico, hash dos bytes e revisão do
renderizador. O verificador público retorna somente integridade mínima, sem
nome, material, observação ou outro dado do paciente.

Outbox individual controla lease, tentativas e estados externos.
seen_at é independente de leitura do provedor. verified_phones deriva de
telefone confirmado no Auth. whatsapp_challenges associa identidade, telefone,
versão, prazo e uso único. flow_submissions e consumption_reports preservam
sugestões pendentes até revisão e confirmação autorizada.

workspace_revisions e broadcasts privados invalidam leituras autorizadas, sem
enviar snapshots clínicos. pg_cron agenda ciclo documental e worker; credencial
e URL do worker ficam no Vault, configuradas pela RPC de serviço dedicada.

## Verificação

[TESTING.md](TESTING.md) descreve replay, SQL/RLS, integração HTTP concorrente,
Auth real e E2E. Backups permanecem fora do Git. A matriz registra evidências
da revisão atual; resultados anteriores não substituem gates da evolução.
