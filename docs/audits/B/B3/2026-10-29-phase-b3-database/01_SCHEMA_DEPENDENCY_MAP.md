# Modelo de dados e dependências

## Inventário canônico

62 tabelas public, nove private, uma view e duas sequences de produto.
232 rotinas public/private, incluindo quatro de unaccent. Não há materialized
view nem procedure no catálogo de produto. O
[inventário](01_DATABASE_OBJECT_INVENTORY.csv) contém 1.098 objetos/subobjetos:
colunas, tipos, defaults, nullability, PK/FK/CHECK/UNIQUE/exclusão, índices,
triggers, policies, owners e consumidores. A cobertura distingue metadados,
semântica e execução; linhas de inventário não são testes.

## Identidade e catálogo

Auth users → profiles → memberships → paciente → catálogo local. Perfil global
não é papel local. authority_sessions referencia sessão Auth e guarda um
contexto por sessão; modo global exige paciente nulo. Membership é único por
paciente/pessoa. Override possui exatamente um sujeito, papel ou usuário.
Convite depende do titular confirmado e da autoridade vigente do emissor.

products conserva identidade; care_recipient_products conserva nome, unidade,
precisão e atividade locais. FKs compostas ligam linhas e movimentos ao catálogo
local. Trigger impede adotar produto exclusivo alheio. Unidade com história
não muda: o guard verifica ledger, linhas documentais e itens REQ.

## Documentos e fatos físicos

REQ conserva identidade, protocolo, linhas, observações, resoluções de extras,
ciência e lifecycle. derive_item_patient deriva escopo do pai na REQ e no
inventário anterior. Estoque observado pode ser desconhecido somente na
importação histórica; trigger exige observação operacional. Quantidade
solicitada não pertence à REQ. Resolver extra não reescreve linha emitida.

Documentos operacionais possuem séries por paciente/tipo, linhas e eventos.
FK composta documento/paciente impede linha com cabeçalho alheio. Links de
atendimento também dependem de validação RPC/trigger de paciente, produto e
estado fechado. Eventos guardam snapshots/hash; recibo COM e aprovação BAL
são fatos separados. CHECKs impõem comprado ≤ aprovado ≤ intenção, aceito ≤
expedido e aceito + conciliado ≤ expedido para valores numéricos usuais.
Finitude numeric fica como hipótese para B3.5, sem defeito confirmado aqui.

Ledger aponta paciente, produto, ator, custódias e origem polimórfica.
Saldo é entrada menos saída. reference_type/reference_id não possui FK
universal; integridade depende do comando criador. Revogação de DML e
triggers de eventos protegem clientes; não protegem contra owner/superusuário.
Não há edição de saldo legítima no modelo.

## Escalas, BAL e serviços

Tipos, séries, ocorrências, propostas e eventos usam FKs compostas de paciente.
Exclusão GiST impede sobreposição de profissional publicado entre pacientes;
proposta não é presença nem reserva definitiva. BAL separa regime, obrigação
semanal, ciclo, atribuição, adiamento e aprovação. CHECKs preservam fatos
obrigatórios das obrigações; índices parciais impõem exclusividades ativas.
Contagem, aprovação e regularização são entidades diferentes.

Anexo exige exatamente um alvo documento/movimento e bytes entre 1 e 10 MiB.
FK simples garante existência; paciente correspondente depende da reserva.
quarantine/ready/rejected não prova existência de bytes Storage. PDFs/renders
referenciam documento/versão; hash documental e hash de bytes são distintos.
Challenges e Flows vinculam identidade, versão, prazo e propósito.

Notificação tem exatamente uma origem REQ/alerta/documento/relato/lembrete.
Estado de entrega e seen_at são independentes. Regras por paciente derivam
destinatários atuais. Eventos preservam ator por FK; exclusão de conta pode
ser impedida pela história. Cursor, comandos e autoridade temporária privados
não são escrita direta do cliente.

## Avaliação e contraditório

FKs compostas e derivação de escopo protegem os pontos principais de pai/filho.
Não exigir FK composta indiscriminadamente sem verificar a entrada autorizada.
Links polimórficos, JSON, status text e arquivos exigem prova na RPC. Ausência
de enum de status não prova escrita arbitrária quando DML está revogado.
CHECK quantitativo não demonstra sozinho conservação, finitude ou revisão.

Não foi demonstrada duplicação desnecessária: estruturas anteriores têm
consumidores/história e não são candidatas automáticas à exclusão. A
imutabilidade de unidades e a preservação de estoque legado sem atribuição
devem sobreviver às correções. Dependências detalhadas estão no catálogo.
