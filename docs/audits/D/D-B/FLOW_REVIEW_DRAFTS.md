# D3.48 — preenchimento privado da revisão do Flow

Revisões de sugestões reais agora guardam decisão,descrição e quantidades
incompletas por usuário/paciente/sugestão,com CAS e retomada em outra sessão.
Salvar não registra relato,recusa a sugestão nem movimenta estoque. Referência
original e declaração própria ficam separadas;NULL salvo antes da consulta
continua NULL até adoção explícita. Drawer,campos,revisão somente leitura,
lista pessoal e recibo usam os componentes canônicos.

Confirmação tranca a sugestão e o catálogo na ordem nativa,revalida permissão,
versão e comando,e chama review_flow_submission consumindo o privado na mesma
transação. A chave nativa é o UUID Flow;a chave privada fica congelada no
recibo. Uma revisão aceita cria relato pendente;somente a decisão autorizada
posterior pode debitar. Recusa não depende da leitura de estoque e não concede
catálogo. Colisão com relato anterior impede somente aceite,como o motor nativo.

Lista e histórico pessoais sobrevivem à perda de escrita e paciente inativo
sob vínculo vivo;referência atual e novos atos continuam exigindo autorização
operacional. Perda do vínculo oculta o conteúdo após atualização pessoal.
Resposta perdida conserva o pacote;leitura autoritativa reconcilia apenas a
tentativa exata. Envelope válido divergente não é apagado e bloqueia reconhecer.
Não há cache privado,envio offline ou POST automático. Rotas nativas preservadas.

## Verificação proporcional

67 identidades unitárias/API qualificadas:24 consumidores inalterados+10 do
modelo BAL+33 da última rodada. Auth real8/8,com isolamento,CAS,recusa sem
catálogo,histórico inativo,cursor por sugestão e rollback integral na revogação
tardia do diário. Probes removidos. Tipos/lint dirigidos passam.

22 identidades browser qualificadas,produção local Chromium móvel/WebKit:
6 sucessos inalterados+2 conflitos corrigidos+10 consumidores posteriores+4
rechecks finais. Incluem duas sessões,quantidade incompleta,perda de resposta,
referência NULL/obsoleta,revogação,envelope divergente,paginação101,consumo,
BAL,avisos e agenda. Última rodada4/4,sem flaky/skip. Fontes34 LF congeladas;
nenhuma edição durante runner ou DB mutável paralela. Axe,foco,geometria e
1440/1150/850/500/320 exercitados;revisão1440/320 inspecionada.

Contraprovas preservadas:fixture de ack incompleta;normalização nativa de
quantidade;oráculo de audit incorreto;conflito que oferecia a mesma cópia e
mensagem de contagem física;lista de fundo inacessível por modal real. As
correções mantêm guards e controles reais. Overflow intermitente do shell
WebKit320 foi observado em rodada intermediária;drawer cabia e repetição
posterior com mesmo runtime passou. Não houve supressão ou alegação de cura
global dessa intermitência. [Validação](FLOW_REVIEW_DRAFTS_VALIDATION.json).

## Banco e CI

Migrations188/189 aplicadas uma vez,187→189,antes do commit. Versões/digest,
nove funções/configurações/ACL,duas tabelas RLS fechadas e18 dependências legadas
iguais ao local;dry-run final vazio,probes0. Produto remoto sem constraint
inválida;legado local presentation_finite_factor permanece. Sem reset,fixtures,
Auth remoto ou backup pesado redundante. Advisors mantêm cinco classes de
segurança/três de performance;adições esperadas não aprovam os achados antigos.
[Reconciliação](FLOW_REVIEW_DRAFTS_REMOTE.json).

CI e2e99d2/42786674329 falhou:consumidores antigos ainda não escolhiam custódia,
agenda não abriu o diálogo e Chromium terminou cancelado após40min. Fixtures de
custódia foram corrigidas;agenda inalterada passou nas duas engines dirigidas,
sem aprovação global de intermitências. Chromium agora tem dois shards,161 e
160 dos321 casos,união exata/disjunta;limite40min e agregado completo mantidos.
[Observação anterior](CI_E2E99D2_OBSERVATION.json). CI própria precisa validar
instalação limpa,legada,integração integral e todos os shards do novo SHA.

Quadro temporário atualizado antes do próximo lote;105 critérios,56PASS/
49PARTIAL e18 estados UI preservados. Visualglobal≈60%,formulários≈90% e
recuperação≈90% são estimativas editoriais. Próximo:inventariar continuidade
integrada de todos os formulários e completar lacunas;depois fichas/estoque,
PDF técnico e demais critérios. EST-01,decoder saldos200,66/171 e gates externos
continuam pendentes. Sonar adiado,PR7 Draft,sem merge/produção;meta ativa.
