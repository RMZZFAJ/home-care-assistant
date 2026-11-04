# Base, escopo e método

## Autoridade e versão

Ordem mestra integral recebida por anexo textual, preservada em
[MASTER_ORDER](evidence/MASTER_ORDER.txt). A autorização inclui investigação
local com dados sintéticos e commit exclusivamente documental ao concluir.
Não inclui reset, reconstrução, fixtures sobre dados existentes, operações
remotas ou correções. A única pasta nova autorizada é esta auditoria; o índice
geral da Fase B pode ser atualizado.

Reconhecimento inicial: branch `audit/phase-b`, árvore limpa e HEAD
`73bedcbc09f9edba8c8869b60ea84950cddc82fc`. `master` aponta para
`34dcb835c5c49068e0417f7306eb4e501aa868bc`. A comparação entre HEAD e o produto
`37cb7f85e96e551d6419871f94dd950712e2565b` não apresenta alterações em
`src`, `supabase`, `tests`, `scripts`, `package.json` ou `package-lock.json`.
Os commits documentais e de organização posteriores não são novas versões
funcionais. As auditorias A e B1 foram preservadas.

## Método por processo

Reconstruir necessidade humana, atores, autoridade, entradas, estados,
transições, documentos, estoque, responsáveis seguintes, exceções e retomada.
Rastrear interface → API → RPC/consulta → fatos persistidos. Executar testes
dirigidos somente quando o isolamento for comprovado. Realizar segunda passada
adversarial por subgrupo, com hipóteses contrárias e recomendações descartadas.

Cada conclusão distingue `LEITURA_ESTATICA`, `TESTE_LOCAL`, `RENDERIZACAO`,
`PERSISTENCIA`, `RISCO_SUSTENTADO`, `NAO_VERIFICADO` e `VALIDACAO_HUMANA`.
Uma análise estática pode comprovar ausência de capacidade ou um ramo lógico;
não comprova o funcionamento integral da jornada. Um cenário rejeitado não
comprova gravação. Não houve validação por participantes humanos nesta B2.

Defeito, lacuna, oportunidade, preferência e hipótese são naturezas distintas.
Prioridade considera consequência e alcance demonstrados, sem elevar risco
hipotético a defeito confirmado. Manifestações da mesma causa foram reunidas.

## Preservação e ambiente

Stack existente identificada: projeto `home-care-assistant`, container
`supabase_db_home-care-assistant`, API em `127.0.0.1:54321` e PostgreSQL em
`127.0.0.1:54322`. A identidade do repositório, labels e destinos foram
verificados pelo guard antes dos testes mutáveis. Credenciais foram lidas
somente por processos locais e não foram persistidas no pacote.

O shell inicial usava Node 24.13.0. Os checks e reprodutores usaram o Node
24.22.0 portátil e o CLI npm global 11.21.1 explicitamente. Não foi executado
test: db: prepare, replay ou seed de substituição: a ordem proíbe reconstruir o
banco e não altera schema/autorização. Ensaios com rollback e novos objetos
sintéticos estão identificados. Backup foi criado e pg_restore --list passou;
não houve restauração, limpeza ou modificação de dados reais.

## Referências e limites

AGENTS, README, arquitetura, operação, banco, segurança, APIs e testes foram
consultados. Os materiais obrigatórios A/B1 foram lidos no B2.0 em blocos e
campos pertinentes; 371 hashes de referência foram preservados. A base A
continua NO-GO; conclusão
da B2 não modifica esse parecer nem homologa produção ou provedores externos.

Supabase skill utilizada como orientação técnica de isolamento e autoridade.
Suas instruções de alteração de schema não se aplicam: não há autorização
para executar alterações. A segunda passada foi feita sequencialmente pelo
mesmo auditor; independência de perspectiva não significa outro participante.

## Fechamento da cobertura

66 processos/102 transições reconciliados; 81 cenários locais dirigidos e seis
E2E selecionados. Uma amostra executada em 57 processos não comprova todos
seus ramos. Nove processos têm somente reconstrução estática nesta B2; perfil,
mínimos, lotes, Flow, presença, importação, provedores, lembretes e WhatsApp
trazem
limites específicos. A cobertura separa implementação parcial, ausência de
capacidade, comportamento comprovado e necessidade humana ainda hipotética.
Os relatórios registram contraprovas e recomendações abandonadas.
