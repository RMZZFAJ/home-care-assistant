# D3.47 — preenchimentos privados de consumo

## D3.67 — acompanhamento operacional e leitura preservada

Base5350fd5. O ponto fixo04.5 distingue relato textual, complemento com
materiais, conferência de consumo por custódia, falta conferida, rejeição e
movimentos efetivos da confirmação. A faixa usa FeedbackBanner do modelo
canônico. Relato e complemento não debitam estoque; falta e rejeição não
recebem descrição de consumo descontado. Os movimentos conservam quantidade,
unidade e origem próprias, sem presumir Equipe quando a custódia é desconhecida.

O detalhe mantinha botões oficiais durante a atualização e não identificava
a leitura anterior. Uma resposta antiga podia sobrescrever uma confirmação
recebida, pois a decisão fecha a versão existente sem incrementar o número.
Agora atualização/falha suspendem a orientação e as novas operações, com dados
anteriores explicitamente identificados. A referência consultada deve
corresponder ao relato, paciente, versão nativa válida e estado conhecido.
Uma consulta de
versão inferior não apaga complemento, e um relato já encerrado não reabre
pela chegada de um snapshot anterior. Uma decisão preservada conserva sua
autoria e não vira outra decisão por essa ordenação de leitura.

A consulta recusada retira os dados operacionais e a mensagem de confirmação
anterior. Os controles privados e a
recuperação própria, inclusive após inativação, mantêm o processo existente.
Durante uma operação aberta, a orientação não apresenta sua versão de trabalho
como nova providência atual. Não há novo endpoint, comando, armazenamento local,
replay automático, migration ou alteração de autorização.

Passaram13 unitários/de contrato, tipos e lint dirigido. A coorte de produção
passou27 cenários nos três perfis, sem falhas ou fontes alteradas durante a
execução. Após corrigir a mensagem anterior na recusa de leitura, o caso de
recuperação própria passou novamente nos três perfis:30 execuções,27 cenários
distintos, sem falhas. O caso usa a referência explícita da lista, conserva
as contraprovas anteriores e verifica a remoção da mensagem junto do relato.
Depois, somente sua formatação foi ajustada. Os casos novos usam Auth real,
API e banco local guardado.
As duas custódias percorrem relato textual, complemento e decisão, com versões
e origem dos movimentos verificadas por SQL independente. Complementar não
altera o ledger; confirmar gera exatamente um desconto de2 unidades da custódia
correta. O texto, os materiais e a autoria do original permanecem intactos.

Snapshots nativos anteriores foram reapresentados por GET controlado: v1 não
substitui complemento v2, e v2 pendente não reabre v2 já confirmada. A consulta
é repetida sem POST, nova decisão ou débito. Delay/falha503 suspendem operações
e identificam a leitura preservada; uma resposta200 de outro relato é recusada
antes de exibir seus dados. A perda real de stock.family.read produz403 e retira
o conteúdo operacional, sem alterar fatos de consumo ou movimentos.

Os consumidores anteriores passaram com seus oráculos preservados: duas
sessões, confirmação/complemento após resposta perdida, conflito que exige
nova revisão, falta/rejeição sem baixa e recuperação privada depois de perder
escrita e inativar o paciente. A inspeção visual e axe/overflow a320px nas duas
custódias passaram. Não é aceite de aparelho real ou de toda a aparência.
Sem SQL novo; dry-run remoto vazio em205. Ponto04.5 qualificado localmente no
escopo declarado; próximo04.6, BAL. CI própria necessária. Os complementos
documentais, a simplificação de rascunhos e os demais gates permanecem pendentes.

## D3.47 — escopo anterior preservado

Base14fdd28. Incremento de relatos familiares/equipe,complementos,aceite e
recusa. O recurso é o paciente no relato novo ou o relato real nos outros
três atos. Tipo CONSUMPTION,sem documento,protocolo ou movimento fictício.
Há cinco propósitos pessoais separados;salvar edição incompleta não publica
relato,não reconhece lembrete e não desconta estoque.

## Implementação

O controlador privado existente fornece CAS,chave por intenção,retomada
explícita,comparação de conflito,descarte e reconhecimento. Outra sessão
oferece o preenchimento,sem adotá-lo sozinha. Quantidade incompleta e texto
original permanecem privados. Referência NULL salva antes da consulta continua
NULL até adoção explícita,mesmo quando a consulta termina depois.

Referência e hash do banco vinculam custódia,catálogo,relato,último complemento,
origem de lembrete e,para aceite,o histórico físico dos materiais. Mudança
de ledger que conserva saldo ainda invalida a referência. Consulta posterior
não altera a declaração preservada. Linhas da referência mantêm sua grafia
numérica e campos históricos:normalizar2.000000 para2 antes de salvar mudava
o objeto vinculado ao hash. Comando/recibo nativos usam quantidade semântica
normalizada separadamente. Texto privado continua original;trim Unicode do
comando precisa coincidir com o navegador.

Revisar salva uma revisão privada e apresenta pacote imutável. Confirmar sela
titular,paciente,propósito,alvo,revisão,conteúdo,referência,chave e comando;
o motor nativo e o consumo privado acontecem na mesma transação. Nova chave
não consome uma preparação usando ato nativo anterior. Decisão já tomada,
versão obsoleta e autoridade revogada continuam recusadas. Relato/complemento
não descontam estoque;somente aceite de consumo produz débito. Falta e recusa
não debitam. Origem de lembrete só é reconhecida junto ao relato confirmado.

Resposta perdida preserva o pacote original em sessão,sem POST automático.
Recuperação explícita reapresenta a mesma chave. Consulta pessoal autoritativa
pode confirmar o exato resultado já vinculado e limpar apenas o envelope que
coincide em dono,escopo,revisão,hash,chave e comando. Envelope divergente não
é apagado e bloqueia reconhecimento/descarte até recuperação da mesma
tentativa.200 inválido não confirma sucesso. Nada entra no Service Worker;
não há cache privado nem replay offline.

Paciente inativo impede consulta operacional atual e nova escrita. O autor
com leitura viva conserva somente seu preenchimento/resultado histórico,
replay já vinculado e limpeza. Sem preparação própria,a consulta pessoal
retorna NULL. Perda de leitura remove conteúdo protegido;mudança conhecida
de escopo e atualização do relato revalidam os painéis pessoais. Falha de
consulta não é classificada falsamente como revogação definitiva.

O editor unificado usa controles,RecordDrawer,DefinitionGrid e painel privados
canônicos,com revisão somente de leitura,erros no campo e foco. Mantém os
consumidores antigos,seleção de materiais,quantidades,decisões e origem de
lembrete. O alvo da refatoração visual continua o Modelo Integral;este lote
não aprova todas as66 composições/171 relações.

## Banco e contraprovas

Migrations182–187 incrementais criam duas tabelas privadas RLS fechadas e oito
funções,quatro privadas e quatro RPCs authenticated,com search_path vazio.
182 implementa o recurso;183 corrige alias PL/pgSQL42702;184 separa recuperação
privada histórica da leitura operacional;185 trava também materiais do relato
na referência de decisão;186 alinha trim Unicode;187 preserva a exigência de
paciente ativo na consulta pública da referência atual. Nenhum motor nativo
ou das16 dependências comparadas foi reescrito.

Contraprova real mostrou que a recuperação pessoal inativa falhava sob o
guard operacional original. Após a separação,a consulta de referência atual
ficou permissiva para paciente inativo;teste negativo Auth reproduziu esse
desvio e187 o corrigiu,sem retirar a recuperação própria. Sondas de revogação
após journal conferem rollback de fato nativo,privado,auditoria e journal.
Lock real de catálogo e revogação durante espera são exercitados. Preparação
não usa metadata/nome do cliente como autorização.

## Verificação e limites

53 unitários/API distintos qualificados:41 consumidores inalterados da
primeira rodada e12/12 do modelo/API atual. Invocação posterior com loader
tsx ausente falhou antes de executar casos;repetição pelo Vitest oficial
passou12/12.20 cenários Auth reais distintos qualificados,reusando sucessos
não afetados;último recheck7/7 cobre cinco atos,isolamento e inativo.
Tipos/lint dirigidos passam após corrigir acesso a capabilities opcional.

As primeiras rodadas browser diagnósticas não são aprovação. O gateway local
precisou reinício dirigido do Kong após resets de conexão;sem reset de dados.
Fixtures foram corrigidas para aguardar referência conhecida quando esse era
o objetivo,comparar texto oficial após trim e manter a referência realmente
revisada durante concorrência. Caso próprio conservaNULL explícito. A rodada
produção22 teve21 sucessos e uma seleção de material iOS fora do viewport.
Interação foi alinhada ao consumidor existente:clique real no campo,viewport
e hit-test antes da opção,sem force ou aumento de timeout.

Qualificação browser final,hashes,arquivos e rodadas estão no
[artefato de validação](CONSUMPTION_DRAFTS_VALIDATION.json).
Reconciliação remota e limites estão no [artefato remoto](CONSUMPTION_DRAFTS_REMOTE.json).

22 identidades browser de produção local qualificadas:12 sucessos inalterados
retidos da rodada22 e10/10 afetados na repetição final Chromium móvel/WebKit,
sem flaky/skip. Incluem outra sessão,NULL explícito,erro/foco,pacote perdido,
recuperação pessoal inativa e revogação sem reload. Axe/geometria e larguras
1440,1150,850,500,320 exercitadas;revisão1440/320 inspecionada.39 fontes LF
congeladas e conferidas,sem edição durante runner ou suíte DB paralela.
A conferência staged dos novos arquivos detectou três linhas vazias de EOF.
Foram retiradas somente nas migrations autorais deste lote,após os runners;
tokens SQL e definições aplicadas permanecem idênticos. Hashes antes/depois
estão discriminados;nenhum fonte de runtime mudou.

Remoto181→187 aplicado uma vez,antes do commit;dry-run final vazio. Versões,
digest,oito definições/configurações/ACL,duas tabelas e16 dependências legadas
coincidem com local. Probes0,produto remoto sem constraint inválida;legado
local presentation_finite_factor continua qualificado. Sem reset,fixtures,
Auth remoto ou backup pesado redundante. Advisors mantêm cinco classes de
segurança e três de performance;adições são duas tabelas fechadas,quatro RPCs
Auth e dois índices ainda sem uso. Não é aprovação global desses avisos.

CI14fdd28/42769763583 terminou SUCCESS nos nove jobs e Preview READY. É prova
do lote181,não do novo candidato187. CI própria ainda precisa instalar limpo,
evoluir legado,rodar integração completa e consumidores em seu SHA.
[Observação histórica](CI_14FDD28_OBSERVATION.json).

Preparações de revisão Flow continuam pendentes,assim como composição EST-01,
decoder defensivo de saldos200,paridade66/171 e critérios D-B restantes.
Quadro temporário conserva os105 critérios e responsabilidades;percentuais
são editoriais. Sem homologação humana,física,de fornecedor ou produção.
Sonar adiado por decisão do responsável,PR7 Draft,sem merge;meta ativa.
