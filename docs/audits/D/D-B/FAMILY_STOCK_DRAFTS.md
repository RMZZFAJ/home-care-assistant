# D3.46 — preparação privada da movimentação familiar

Base6e1a10f. Implementação e verificações locais dirigidas concluídas neste
incremento;D-B continua parcial. Entrada avulsa,retirada e duas direções de
compensação usam o núcleo real de rascunhos privados. O recurso é o paciente,
o propósito é family_movement e o tipo é STOCK. Não se fabrica BAL,protocolo,
versão documental ou movimento para guardar edição. Há um slot pessoal por
paciente,com operação e conteúdo próprios.

## Implementação e experiência

Salvar admite campos incompletos e referência ainda não consultada. O rascunho
fica no servidor,com CAS e chave por intenção. Outra sessão oferece continuidade
explícita;conflito exige comparar versões,sem sobrescrita automática. Descarte
próprio não apaga documento,movimento ou anexo confirmado. Não há TTL novo.

Material,unidade,quantidade,motivo e referência de compensação permanecem
legíveis. Quem pode ler saldo compara o preservado com o atual. O fingerprint
do banco inclui catálogo e histórico físico daquela identidade:duas entradas
que se anulam no saldo também exigem referência nova. A consulta não reescreve
escolhas. Salvar antes da referência conserva NULL até adoção explícita,mesmo
que a consulta termine depois. Não se adota uma referência silenciosamente.

Revisar salva a versão privada e prepara o pacote exato. Confirmar revalida
titular,paciente,autoridade,conteúdo,referência e precisão;chama o comando
family_stock_movement e consome o rascunho na mesma transação. Salvar/revisar
não movimentam estoque. Chave nativa antiga não consome preparação nova.
Resposta perdida conserva pacote/chave;recuperação manual reapresenta a mesma
intenção. Resposta200 inválida não confirma sucesso.

Leitura do saldo e autorização de movimentação continuam independentes. O
servidor admite o escopo com leitura ou gestão;escrita nova exige gestão e
paciente ativo. Sem leitura,não devolve saldo nem detalhes da origem,mas permite
o ato autorizado. DTO,recibo,comparação e pacote pendente exibido são mascarados;
o pacote original de recuperação não é modificado. A variante de leitura é
revalidada sem trocar a chave da intenção. Catálogo de outra custódia autorizada
não concede acesso ao saldo familiar.

O recibo pessoal congela autoria,instante,movimento e conteúdo confirmado.
Consulta,descarte,reconhecimento e replay próprio já vinculado continuam sob
escopo vivo,inclusive com paciente inativo;salvar ou executar novo ato não.
Perda do escopo retira conteúdo protegido e oferece revalidação. Nenhum campo
privado entra no Service Worker;sem replay offline ou POST automático de
sessionStorage. O resultado preservado não promete saldo atual.

O editor usa FormField,SelectField,TextInput,TextAreaField,ActionButton e
RecordDrawer canônicos. DefinitionGrid segue a composição kv do HTML em
resumos/revisões de leitura. Precisão inválida gera erro no campo e mantém
valores/foco. Histórico,paginação,filtros,anexos e compensação de material
inativo permanecem integrados sob suas permissões próprias;gerir estoque não
concede leitura de histórico ou de anexos.

## Banco e compatibilidade

Quatro migrations incrementais178–181 criam duas tabelas privadas RLS fechadas
e nove funções,cinco privadas e quatro públicas com EXECUTE authenticated.
Search_path vazio e grants explícitos foram conferidos. Nenhum acesso direto
foi concedido a anon,authenticated ou service_role nas tabelas/helpers.

178 implementa preparação/commit;179 vincula o resumo preservado;180 mantém
escrita sem leitura de saldo e mascara retornos;181 usa a fonte autoritativa
private.stock_quantity na referência interna. A view filtrada por permissão
não serve como saldo interno de quem só pode movimentar. O comando nativo e
quatro dependências legadas conservam seus corpos LF antes/depois/local.
POST genérico de rascunhos rejeita o recurso;STOCK usa rota específica.
Quantidade exata foi extraída sem mudança semântica para evitar import cíclico.

Remoto autorizado177→181 aplicado uma vez antes do commit,sem seeds,roles,
reset ou alterações Auth. Versões/digest,nove definições/configurações/grants,
duas tabelas e cinco dependências coincidem com local;dry-run final vazio.
Não houve backup pesado redundante,conforme complemento do responsável.
O local conserva presentation_finite_factor historicamente não validada;
nenhuma constraint de produto remota está inválida. A constraint do provedor
realtime.messages observada no preflight não pertence a este incremento.
Advisors mantêm cinco classes de segurança e três de performance;os objetos
novos aparecem nos grupos esperados de tabelas fechadas,RPCs Auth e índices
ainda sem uso. Isso não é aprovação global de segurança ou performance.

Referência:[funções e privilégios Supabase](https://supabase.com/docs/guides/database/functions).
Metadados ou nomes do navegador não autorizam operações. A fonte física é o
ledger confirmado. [Reconciliação remota](FAMILY_STOCK_DRAFTS_REMOTE.json).

## Verificações e contraprovas

66 testes unitários/API distintos qualificados:55 consumidores preservados
da rodada inicial e11 repetidos após as correções afetadas.501 emojis expuseram
contagem divergente;limites usam unidades UTF16,coerentes com campo/banco.
Tipos e lint dirigidos passam.13 cenários Auth reais qualificados:12 completos
após181 e um novo de paciente inativo. Cobrem quatro ações,CAS,isolamento,
precisão,referência com mesmo saldo,chave nativa antiga,autoridade tardia,
rollback,gestão sem leitura,mascaramento e recuperação própria inativa.

18 identidades browser qualificadas em produção local:13 sucessos preservados
da rodada18,mais três rechecks e dois casos ampliados de paciente inativo.
A primeira rodada18 foi16/18,sem flaky/skip:não é declarada verde. O teste novo
de consulta tardia esperava requisição abortada corretamente pelo app;foi
corrigido para reter todas as consultas ativas e conferir o estado aceito.
O outro caso iOS falhou ao estabilizar Entrar,antes do estoque;passou no recheck
inalterado. Isso não comprova intermitência global de login resolvida.

Contraprovas anteriores preservadas:CASE corrigido antes da aplicação178;
recibo visual sem grade corrigido;compensação salva antes da referência
revelou adoção tardia indevida e ganhou caso próprio;comando nativo de usuário
com escrita sem leitura funcionava enquanto a preparação negava42501;após180,
dois asserts Auth detectaram saldo interno falso zero da view,originando181.
Nenhum assert,regra de cache ou autorização foi retirado para obter aprovação.

As rodadas exercitam sessão nova,edição/salvamento/commit sem resposta,
comparação/adoção explícitas,compensação fora da página,inativo,leitura403,
delegação sem saldo e consumidores antigos de estoque/BAL. Axe/geometria e
cinco larguras foram exercitados;editor desktop1440 e móvel320 inspecionados.
36 fontes finais têm SHA256 LF congelado. Sem suíte mutável paralela ou edição
durante o runner. Sondas temporárias removidas. Emulação não homologa pessoas
ou aparelhos. [Qualificação e hashes](FAMILY_STOCK_DRAFTS_VALIDATION.json).

CI6e1a10f/42753777648 terminou SUCCESS nos nove jobs;Preview READY. Isso valida
o lote anterior,com177 migrations,não o candidato181. CI própria deve executar
instalação limpa,evolução legada,integração completa e consumidores.
[Observação histórica](CI_6E1A10F_OBSERVATION.json).

Ainda faltam preparações de consumo e revisões Flow,composição completa EST-01,
decodificação defensiva de saldos200,paridade66/171 e demais critérios D-B.
Matriz105x39,primeiras30 colunas,56 PASS/49 PARTIAL e18 estados UI preservados.
Quadro temporário atualizado,sem promoção indevida. Sonar adiado por decisão
do responsável,PR7 Draft,sem merge/produção;meta ativa.
