# Banco de dados

## Fonte e preservação

As 19 migrations iniciais são imutáveis, verificadas por hashes normalizados
entre Windows e Linux. Correções são arquivos incrementais posteriores.
Não executar migrations remotas nem reconciliações sem revisão e autorização.

Os schemas esperado, local existente e remoto são realidades distintas.
O relatório comparativo fica na [auditoria](audits/2026-10-20/README.md), com
atualizações na [continuação de 21/10](audits/2026-10-21/README.md).
Um acesso remoto recusado não comprova drift. A autorização de 21/10 permite
atualizar o remoto correto após reconciliação, validação e backup verificável.

## Catálogo por paciente

`products` preserva identidades textuais históricas, inclusive IDs com acentos.
Modelos globais têm proprietário nulo; novos itens exclusivos têm paciente
proprietário. `care_recipient_products` contém nome, unidade, categoria,
aliases, ordenação e estado locais, com chave paciente/produto.

A conversão copia a disponibilidade global anterior para os pacientes já
existentes. Não atribui paciente a movimentações legadas sem origem conhecida.
Novos pacientes começam vazios; a adoção de modelos é explícita. Alterações
locais não modificam outros pacientes ou o modelo global.

FKs compostas e triggers derivam o paciente do registro pai e impedem usar
produto exclusivo em outro paciente. Alterar unidade com histórico exige
substituição por novo item. Produtos com histórico são inativados.

## Integridade operacional

- Protocolo global e único; sequência começa em 12, sem reutilizar números.
- Formatos anteriores permanecem válidos; largura mínima de seis dígitos.
- Hash calculado no banco inclui paciente e intenção normalizada.
- Mesmo conteúdo/chave recupera o original; conteúdo diferente gera conflito.
- Requisição e seus snapshots são gravados atomicamente.
- Importação 1–11 preserva campos originais conhecidos e não consome sequência.
- Data, solicitante e status desconhecidos não são inventados na importação.
- Ledger separa FAMILY e CARE_TEAM; transferência tem origem e destino juntos.
- Saldo negativo exige ajuste extraordinário global explícito e auditado.
- Inventário aprovado usa referência estável e revisão transacional de estoque.
- Auditoria e escritas críticas não aceitam DML direto de usuários comuns.

## Verificação

`test:migrations` verifica instalação limpa e evolução a partir da migration
019 com dados fictícios. Confere protocolo histórico, itens, saldos de dois
pacientes, FKs e preservação de estoque sem paciente. As suítes SQL exercitam
RLS, RPCs, catálogo, inventário, importação, convites e outbox. A integração
HTTP utiliza identidades Auth reais e concorrência entre conexões distintas.

O banco local home-care-assistant é o alvo desses testes. O replay exige
backup e consentimento explícito, conforme [Testes](TESTING.md). O remoto
nunca recebe reset, fixtures ou a execução da suíte mutável.
