# Banco de dados

## Preservação e migrations

Migrations aplicadas são imutáveis. O guard verifica os hashes normalizados
das primeiras 19 entre Windows e Linux; toda evolução usa novos arquivos.
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

my_workspace retorna pacientes e capacidades em uma chamada autorizada.
Browser metadata, IDs e seleção local não concedem acesso. RLS, grants
explícitos/defaults, schema private e SECURITY DEFINER são revisados juntos.

attachments e document_pdfs guardam referências, hashes e versões de objetos
privados no Storage. Upload sanitizado tem reserva idempotente e confirmação
de servidor. PDF é armazenado por versão imutável.

Outbox individual controla lease, tentativas e estados externos.
seen_at é independente de leitura do provedor. verified_phones deriva de
telefone confirmado no Auth. whatsapp_challenges associa identidade, telefone,
versão, prazo e uso único. flow_submissions e consumption_reports preservam
sugestões pendentes até revisão e confirmação autorizada.

## Verificação

[TESTING.md](TESTING.md) descreve replay, SQL/RLS, integração HTTP concorrente,
Auth real e E2E. Backups permanecem fora do Git. A matriz registra evidências
da revisão atual; resultados anteriores não substituem gates da evolução.
