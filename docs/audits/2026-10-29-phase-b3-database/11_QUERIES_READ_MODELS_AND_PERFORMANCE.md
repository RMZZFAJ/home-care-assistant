# Consultas, histórico, frescor e desempenho

## Completude demonstrada e seus limites

Cinco cenários Auth/HTTP novos e sete planos de SELECT estão em
[resultados](evidence/b311-results.json) e [planos](evidence/b311-plans.json).
A [matriz de consultas](11_QUERY_COVERAGE_AND_PERFORMANCE.csv) individualiza
23 modelos/consumidores, autoridade, filtros, paginação, método e limitações.
São 23 avaliações documentais, não 23 testes dinâmicos adicionais.

B311-01 criou 101 relatos novos, todos shortage e sem débito. O dashboard
contou 101 pendentes; GET consumo retornou 100. O relato alvo permaneceu
reported e foi recuperado diretamente com Auth/RLS, mas ref e page na rota
não mudaram o resultado. BE-001/B2-017 está confirmado novamente: informação
persistida e autorizada fica sem percurso de acesso no consumidor normal.
Não houve perda de dados nem falha genérica de RLS. A ordenação só por data
também não define desempate; paginação futura precisa de chave estável.

B311-02 encontrou 201 eventos já gerados no paciente B3: nenhuma fixture de
volume de auditoria foi necessária. GET administrativo mostrou100; página/ref
foram ignorados. O evento antigo continuou acessível por consulta autenticada.
BE-004 é outro contrato de rota, com causa própria, mesmo que a solução futura
possa compartilhar componentes de paginação. Não inventar uma central nova
para solucionar acesso a dados que já existem.

B311-04 percorreu28 movimentos em páginas de 3, sem faltas ou IDs repetidos.
Profissional viu17 movimentos autorizados e nenhum saldo familiar reservado.
B311-05 percorreu16 documentos em páginas de 5 e encontrou o alvo por código.
Essas provas ocorreram sem gravação simultânea: OFFSET não é cursor de
snapshot e pode deslocar páginas quando novos registros são inseridos.

## Frescor e consistência temporal

B311-03 alterou apenas o nome da identidade sintética pelo contrato oficial.
workspace_revision ficou1684 antes/depois; my_workspace novo já tinha o nome.
O trigger recebe profiles.id, mas procura care_recipient_id/user_id para
descobrir destinatários. DB-007 foi revalidado no banco; o efeito visual de
cache não foi observado em navegador. Proposta global sem vínculo e alteração
de perfil podem exigir destinatários diferentes. Autoridade efetiva continua
revalidada nas operações protegidas: revisão obsoleta não prova acesso livre.

O dashboard faz18 leituras em paralelo e combina contagens, previews e
elegibilidade. Cada consulta pode enxergar instante distinto sob concorrência.
Os limites4/6/12 são previews explícitos; o consumidor correspondente deve
permitir alcançar o restante. Essa composição não é um snapshot transacional
do paciente. Antes de impor um snapshot global, medir custo e decidir qual
consistência o uso exige. Não converter pequenas divergências transitórias em
alegação de corrupção de dados.

## Planos e medidas locais

EXPLAIN ANALYZE foi restrito a SELECTs seguros com sessão Auth real, papel
authenticated e contexto local. Nenhum índice, estatística, configuração do
produto ou policy foi alterado. Tempos são amostras únicas locais com cache
aquecido, sem distribuição, percentil, concorrência de usuários ou SLA.

| Plano | Amostra | Execução ms |
| --- | --- | ---: |
| QP-01 | View; 28 movimentos | 86,959 |
| QP-02 | Página 20 do ledger; bitmap e sort | 30,712 |
| QP-03 | Relatos 100 de 107; índice e sort | 100,713 |
| QP-04 | Auditoria 100; SeqScan 2733,203 do paciente | 199,573 |
| QP-05 | Dois eventos; índice documento/versão | 4,138 |
| QP-06 | Próximo plantão; amostra vazia/indexada | 0,070 |
| QP-07 | View; 100 movimentos novos rollback | 234,400 |

As chamadas RPC separadas mediram 42,690ms para stock_overview, 44,633ms para
document_list, 28,610ms para history e27,411ms para balance_workspace. Incluem
HTTP/rede/Auth. Não comparar diretamente ao plano de SQL sob outro caminho de
RLS para calcular ganho ou regressão percentual.

A auditoria em JSON não possui índice pela expressão de paciente/data no
catálogo atual. Isso sustenta uma hipótese mensurável de custo com crescimento;
SeqScan numa tabela pequena não basta para recomendar índice. Avaliar volume,
seletividade, escrita, tamanho e alternativa de escopo tipado antes de decidir.
O ledger já tem índice paciente/produto/data, mas history sem produto precisa
ordenar. Não adicionar todos os índices sugeridos por combinações de filtros.

## Tentativa de volume incompleta e custo de autorização

A primeira fixture de 1000 movimentos novos foi cancelada no próprio backend
após 120s. O stack estava em after_stock_alert → evaluate_stock_alert → view →
private.can → auth_session. Toda a transação foi revertida; conferência
posterior encontrou zero pacientes/linhas com os marcadores exatos. Não há
plano aprovado de 1000 movimentos nem medição válida de throughput nessa
tentativa. [Registro](evidence/b311-plans-initial-attempt.json).

O ensaio menor de 100 linhas rodou com timeout30s por comando, triggers ativos
e rollback. O total de movimentos antes/depois coincidiu e o paciente da
fixture não permaneceu. Gaps de sequência sobrevivem a rollback por projeto.
Inserção foi preparação privilegiada, não teste de autorização ou carga RPC.

A view consulta autorização por linha/custódia e o alerta a reutiliza na
inserção. O sinal é suficiente para exigir medição proporcional em ambiente
descartável: custo por produto/movimento, fan-out de invalidação e duração do
lock por paciente. Não é evidência de indisponibilidade geral. Alternativas
de pré-agregação ou cálculo interno precisam conservar RLS, precisão exata,
história imutável e consistência transacional; cache sem essas garantias pode
produzir um problema mais grave que o custo atual.

DB-005 permanece: cada evento armazena resumos acumulados e detail devolve
todo o histórico. Crescimento em soma de versões supera crescimento linear
nesse recorte. A segunda passagem B3.12 mediu mil eventos novos com rollback,
sem editar versões existentes. Planos aqui não certificam todos os caminhos
nem instalação remota. Resultados em b312v-results.json.
