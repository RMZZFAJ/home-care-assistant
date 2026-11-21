# D3.54 — preparações privadas de recursos existentes da agenda

## Implementação

O mesmo controlador atende oito finalidades:editar tipo;encerrar,aprovar e
rejeitar programação;alterar,propor alteração ou cancelar plantão;aprovar,
rejeitar e encerrar proposta obsoleta. Quatro conjuntos de campos controlados
reutilizam os controles canônicos e os campos de criação de tipo. As operações
continuam distintas;uma nova capacidade não promove proposta automaticamente.
Alternar alteração/cancelamento conserva campos latentes e a precisão nativa.

Guardar preenchimento parcial não executa operação. Autor,paciente,finalidade
e alvo real delimitam o slot privado. CAS,comparação somente leitura,descarte,
retomada em outra sessão e reconhecimento usam o controlador existente.
Referência operacional atual é separada dos campos próprios. Salvar após uma
mudança pode preservar indicação antiga sem snapshot selado;isso não autoriza
confirmar. A revisão relê o save e exige referência selada pelo banco. Adotar
a referência atual conserva os campos e exige nova revisão explícita.

Commit atômico vincula revisão privada,referência,comando,versões e chave ao
motor nativo. Confere o ator efetivo do diário,sem usar created_by como autor
da alteração. Propor produz uma nova proposta;os outros atos conservam o alvo.
Uma aprovação concorrente de origem obsoleta pode registrar somente obsolete.
Se uma mudança durante a espera permitiria aprovação diferente da revisão,a
guarda posterior reverte comando,diário,auditoria e preparação juntos.

## Resultado incerto e privacidade

A tentativa fica no aparelho antes do envio. Recarregar não envia. A consulta
aguarda a chave original;ausência de diário continua desconhecida. Versão de
origem avançada não prova não aplicação de aprovação,que ainda poderia
registrar encerramento obsoleto. Resolver explicitamente avança somente a
revisão privada sob as mesmas travas,impedindo a aplicação tardia. A chave de
resolução também é preservada antes do envio e admite recuperação idempotente.

Lista própria paginada conserva ativos,resultados,descartes e reconhecimentos.
Referências locais permitem chegar à recuperação quando o alvo saiu da lista
operacional ou o primeiro save não chegou ao servidor. São navegação,sem
autoridade e sem exibição dos campos antes da leitura privada autorizada.
Receber outra edição exige escolha explícita antes de reconhecer o resultado;
a cópia própria pode sobreviver à perda desse reconhecimento.

Sessão e vínculo vivos continuam exigidos. Leitura,descarte,reconhecimento e
consulta próprios admitem perda de escrita/paciente inativo. Snapshot nativo é
redigido quando a visibilidade operacional deixa de existir. Guardas nativas,
Origin,no-store,ausência de cache privado e de replay offline permanecem.
Tabelas privadas têm RLS fechada e grants explícitos;somente sete RPCs Auth
expõem os atos. API genérica de documentos não recebe esse conteúdo.

## Validação dirigida

São58 testes distintos de modelos/API qualificados:57 da coorte inicial e
um novo caso da comparação local,no recheck de18 casos. No banco,são23
identidades Auth
reais qualificadas:22 do conjunto completo e1 do recheck de histórico. O
recheck corrigiu uma expectativa do teste,sem mudar o SQL. Incluem oito atos,
CAS,outra sessão,perda de escrita,negativas,grants,FKs,expiração real de sessão,
concorrência,espera pela chave original,rollback integral e histórico encerrado.

A regressão de navegador revelou comparação sensível à ordem das propriedades
do envelope local. A correção compara representações validadas pelo mesmo
schema;uma cópia diferente continua protegida. Os testes passaram a exigir o
encerramento real do diálogo após o recibo,além do resultado independente no
banco. Falhas e coortes interrompidas foram preservadas. Diagnóstico Next dev
não será apresentado como qualificação de build de produção.

São40 cenários distintos de navegador de produção local qualificados. A
primeira coorte terminou34/38,com três falhas e um caso não executado. O
recheck10/10 tornou a concorrência determinística durante o POST,selecionou
um profissional real em vez da opção vazia e qualificou os casos restantes,
incluindo exceção/corte nas três engines. A entrada na lista privada em WebKit
não reproduziu a falha anterior;houve execução local lenta,sem atribuir a ela
uma correção de runtime não demonstrada. A repetição final também passou.

A inspeção visual revelou aviso falso de edição não salva:referência selada
e campos próprios eram comparados como objetos completos diferentes. O novo
controlador fornece seu estado real de edição ao painel,sem mudar o padrão
dos outros consumidores. Durante a revisão,o descarte fica desabilitado.
Coorte final13/13 nas quatro formas compartilhadas/três engines e recuperação
WebKit confirma ausência desse aviso,descarte bloqueado,campos somente leitura,
foco,quatro larguras/axe e conclusão real após recibo. Não são13 cenários novos.
Tipos e lint afetados passaram. Fontes congelados em cada coorte;nenhuma suíte
mutável de banco correu junto. Sem prova de aparelho físico ou produção.

Migration197 aplicada uma vez no remoto autorizado:196→197. Preflight com
projeto saudável,digest196 e dez dependências idênticas. Pós-check igual ao
local:197 versões/digest,24 funções/config/ACL,duas tabelas/RLS/grants/FKs e
11 índices;cinco negativas remotas com rollback,dry-run vazio e zero probes.
O índice de autor/cursor foi acrescentado depois da primeira coorte para
cobrir a FK e a lista histórica;corpos nativos/permissões não mudaram. Prepare
local final sem reset e cobertura de todas as FKs novas conferidos.

Advisors mantêm cinco classes de segurança/três performance. As adições
previstas são duas tabelas RLS fechadas e sete RPCs Auth;nenhum FK novo sem
índice. Achados globais anteriores não foram aprovados. Não houve reset,
fixtures/Auth remoto ou backup pesado redundante no banco sintético.
[Registro consolidado](SCHEDULE_RESOURCE_DRAFTS_VALIDATION.json).

## Limites

O recurso não encerra o critério amplo de todos os formulários. Contagens,
cadastros,administração e paridade das66 composições/171 relações continuam
com Codex. Homologação humana,física,de provedor e operação têm gates próprios.
PR7 Draft,sem merge,deploy manual,reset ou ativação externa. Sonar adiado por
decisão do responsável. Meta D-B ativa.
