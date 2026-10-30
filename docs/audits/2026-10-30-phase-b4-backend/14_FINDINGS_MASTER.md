# Registro mestre de achados B4

Fonte canônica com 32 campos por registro: [CSV](14_FINDINGS_MASTER.csv).
Treze registros: dez P2 e três P3; dois são riscos sustentados com
transporte/Storage
controlados. Nenhum P0/P1 novo. Causas anteriores permanecem no registro de
origem
e nas dependências, sem serem copiadas como descobertas inéditas.
Prioridade considera consequência e proteção compensatória; teste que reproduz
defeito não significa produto aprovado. Não há implementação nesta fase.

## B4-001

**Título:** Precisão aceita depende do tipo JSON e permite arredondamento
silencioso

**Classificação:** P2; Falha de contrato; NOVA_CAUSA_RELACIONADA;
CONFIRMADO_HTTP_READBACK.

**Processo/pessoa:** Movimento familiar; Administrador/familiar autorizado.

**Contrato:** Recusar valor original com casas excessivas, antes de coerção ou
efeito.
**Observado:** Number 1.0000001 recebeu201/confirmed e
persistiu1.000000;string equivalente recebeu400.
**Causa:** Braço number de exactQuantity não limita casas;ledger numeric(18,6)
arredonda antes da precisão da unidade.

**Caminho:** POST /api/stock/movements.
src/lib/validation/documents.ts:5;src/app/api/stock/movements/route.ts:24.

**Evidência/método:** evidence/b43-input-results.json#B43-01;B43-09;B43-10.
HTTP com Auth real e consulta independente pelo ID;recusas primeiras
preservadas da tentativa inicial.

**Persistência:** Um novo movimento sintético de1.000000 para entrada1.0000001.

**Consequência:** Operador acredita que o valor exato foi aceito. API registra
quantidade diferente sem avisar;demais consumidores do schema ficam expostos
ao mesmo tipo de entrada. Exige ator autorizado;sem saldo negativo ou acesso
cruzado demonstrado.

**Contraprova:** String de sete casas e number1.1 foram recusados;não é
ausência geral de validação.
**Limites:** Um inbound fictício;outros consumidores do schema revistos
estaticamente,não todas as escritas reproduzidas.

**Relação histórica:** B3-018 provou coerção SQL direta;B4 acrescenta o
caminho HTTP assimétrico.

**Alternativa futura:** Validar representação original finita/exata em API e
SQL antes da tipagem estreita.
**Risco da alteração:** Rejeitar clientes compatíveis sem migração;arredondar
história retroativamente.

**Aceite:** Number e string equivalentes com sete casas são recusados sem
movimento;seis casas e unidade válida persistem exatamente.
**Regressão:** Vírgula,ponto,zero BAL,positivo ENT/COM,NaN/Infinity,NULL,teto
e replay com mesmo conteúdo.

**Decisão pendente:** Decisão técnica de precisão;definir compatibilidade dos
clientes que enviam number.
**Preservar:** Unidade histórica,decimal exato,ledger e REQ sem quantidade
solicitada.

## B4-002

**Título:** Consumidor de settings cria nova intenção no retry e duplica
propostas

**Classificação:** P2; Falha de recuperação; NOVA_MANIFESTACAO;
CONFIRMADO_HTTP_E_FONTE_CONSUMIDOR.

**Processo/pessoa:** Proposta global com resposta não confirmada;
Administrador global e aprovador local.

**Contrato:** Retry conserva chave e conteúdo da mesma intenção.
**Observado:** Mesma chave devolveu mesmo ID;chaves diferentes como as do
consumidor criaram duas propostas pending.
**Causa:** PolicyConsole gera randomUUID em cada invocação,não congela
tentativa incerta.

**Caminho:** POST /api/patient-settings.
src/components/admin/policy-console.tsx:108;src/components/admin/policy-console.tsx:126.

**Evidência/método:** evidence/b44-command-results.json#B44-01;B44-02.
HTTP/Auth e read-back de duas pending;fonte liga comportamento ao
consumidor;sem UI interceptada.

**Persistência:** Duas propostas fictícias pending,sem dupla aplicação.

**Consequência:** Aprovador recebe decisões aparentemente repetidas;autor não
reconhece se o primeiro envio salvou. Fila duplicada e possível ocultação de
decisões antigas por limite50. Segunda aprovação/versão seguem
obrigatórias;sem elevação de privilégio.

**Contraprova:** A API canônica deduplica corretamente uma chave conservada.
**Limites:** Não houve perda física de pacote,navegador ou duas
aprovações;teste simula o contrato do consumidor.

**Relação histórica:** BE-005 na rota admin era conhecido;B4 estende ao
consumidor da rota canônica.

**Alternativa futura:** Conservar intenção no cliente e oferecer consulta por
tentativa;unificar adaptador antigo sem retirar controle de versão.
**Risco da alteração:** Reaplicar conteúdo editado sob chave antiga;ocultar
conflito real.

**Aceite:** Após perda de resposta,reenvio recupera mesmo requestId;conteúdo
alterado conflita;conflito exige nova revisão humana.
**Regressão:** Global/local,aprovação distinta,versão antiga,duas abas,rede
perdida antes/depois do commit.

**Decisão pendente:** UX de reconciliação e retenção temporária da proposta
incerta.
**Preservar:** Global propõe;local distinto aprova;chave não autoriza nem
rebasa versão.

## B4-003

**Título:** Retry da aprovação de ingresso não recupera o link do convite

**Classificação:** P2; Falha de recuperação; NOVO_B4; CONFIRMADO_HTTP_READBACK.

**Processo/pessoa:** Aprovar ingresso sem vínculo; Administrador local e novo
integrante.

**Contrato:** Resultado confirmado precisa ser acionável ou indicar
recuperação explícita quando a resposta original se perde.
**Observado:** Primeiro200 tem URL;retry200 awaiting_acceptance omite URL;um
convite pending com hash original permanece.
**Causa:** Token aleatório novo por requisição;RPC terminal retorna resolução
anterior;URL depende de igualdade com o hash recém-gerado.

**Caminho:** POST /api/patient-settings.
src/app/api/patient-settings/route.ts:94;src/app/api/patient-settings/route.ts:112.

**Evidência/método:** evidence/b44-command-results.json#B44-03;B44-04.
HTTP/Auth;contagem e comparação booleana de hash no banco,sem expor token.

**Persistência:** Um convite pending,uma aprovação awaiting_acceptance,sem
membership automática.

**Consequência:** Quem perdeu a resposta não consegue entregar o convite
recuperando a mesma aprovação. Ingresso depende de localizar e reemitir
convite por outro percurso. Preserva hash e aceite;token não vazou e não houve
acesso indevido.

**Contraprova:** Reemissão manual autorizada retornou novo link;nenhuma
duplicação de convite na repetição.
**Limites:** Perda modelada por descarte da resposta;sem envio ou aceite
humano real.

**Relação histórica:** B2 ingresso/BE-005 dão contexto;geração efêmera de
segredo é causa adicional.

**Alternativa futura:** Retomada segura da intenção de convite ou resposta
explícita com ID e ação de reemissão.
**Risco da alteração:** Guardar token em claro,estender validade sem controle
ou reativar vínculo sem aceite.

**Aceite:** Retry de aprovação confirmada informa resultado acionável ou
recuperação explícita;convite único e token antigo tratado segundo política.
**Regressão:** Resposta perdida,expiração,revogação,reeemissão,conta
errada,autoaprovação e emissor revogado.

**Decisão pendente:** Escolher recuperação do segredo versus reemissão guiada
com rotação.
**Preservar:** Segredo em hash,conta confirmada,aceite do titular e aprovação
distinta.

## B4-004

**Título:** Revisar e submeter omite revisão já confirmada quando a submissão
falha

**Classificação:** P2; Falha de contrato; NOVA_CAUSA_RELACIONADA;
CONFIRMADO_HTTP_READBACK.

**Processo/pessoa:** Editar draft e emitir ENT; Emissor da entrega.

**Contrato:** Resposta composta distingue revisão salva e submissão
recusada/pendente.
**Observado:** HTTP409 INSUFFICIENT_STOCK sem persistence;draft ficou versão
nova com quantidade2 em lugar de1.
**Causa:** Duas RPCs confirmam separadamente;exceção da segunda usa envelope
de erro genérico que perde o resultado da primeira.

**Caminho:** POST /api/documents/[id]/revise.
src/app/api/documents/[id]/revise/route.ts:32;src/components/documents/supply-wizard.tsx:476.

**Evidência/método:** evidence/b44-command-results.json#B44-05. HTTP
real;leitura de versão,linhas,eventos antes/depois e retry das mesmas chaves.

**Persistência:** Draft e evento de revisão confirmados;submissão não moveu
estoque;retry conservou estado e número de eventos.

**Consequência:** Usuário pode interpretar erro como nenhuma edição salva.
Nova tentativa/edição pode partir de versão e conteúdo que o cliente não
reconhece como persistidos. Atomicidade de cada RPC e saldo preservados;sem
corrupção parcial de uma transação.

**Contraprova:** Mesmas chaves não duplicam revisão;draft pode ser recuperado
e emissão insuficiente é corretamente recusada.
**Limites:** Uma ENT sintética;COM/BAL não foram induzidos a toda falha de
segunda etapa.

**Relação histórica:** A arquitetura já observava duas transações;B4 comprova
efeito e falta de contrato parcial;B1-ERR-002 relacionado.

**Alternativa futura:** Envelope de etapas com resultado persistido ou separar
comandos visivelmente;transação única apenas se domínio justificar.
**Risco da alteração:** Prometer rollback inexistente,descartar revisão
legítima ou unir etapas com efeitos incompatíveis.

**Aceite:** Falha de submissão informa revisão confirmada/versão/chaves e
permite retomar sem duplicar eventos ou estoque.
**Regressão:** Erro antes da revisão,depois da revisão,timeout da
submissão,retry e versão concorrente.

**Decisão pendente:** Escolher experiência de duas etapas ou atomicidade
desejada sem perder draft legítimo.
**Preservar:** Eventos/versões imutáveis;chaves de revisão e submissão
distintas;estoque transacional.

## B4-005

**Título:** Proposta administrativa pending desaparece após o corte de50
mudanças

**Classificação:** P2; Falha de contrato; NOVA_CAUSA_RELACIONADA;
CONFIRMADO_HTTP_READBACK.

**Processo/pessoa:** Encontrar e revisar proposta antiga; Administrador
local/global.

**Contrato:** Toda decisão pendente autorizada pode ser localizada por
lista,ID ou filtro.
**Observado:** 51persistidas;50retornadas local/global;mais antiga pending
ausente;page/requestId ignorados.
**Causa:** LIMIT50 sem contrato de continuação,total ou detalhe,buscado pelo
consumidor como conjunto completo.

**Caminho:** GET /api/patient-settings.
src/app/api/patient-settings/route.ts:65;public.fluent_pre_matrix_governance.

**Evidência/método:** evidence/b45-read-results.json#B45-01. Apenas48
propostas novas até o limiar51;RPC autorizada,HTTP e read-back do estado
pending.

**Persistência:** A proposta permanece pending;nenhuma exclusão.

**Consequência:** Aprovador pode concluir que não há mais decisão a tomar.
Governança antiga sem percurso normal;duplicatas aumentam pressão sobre o
corte. Não há exposição adicional;ID conhecido ainda pode ser decidido com
autoridade correta.

**Contraprova:** 50mais recentes acessíveis;SQL preserva registro e pode
decidir ID conhecido.
**Limites:** Um paciente fictício;sem alegar que todos os clientes externos
carecem de ID próprio.

**Relação histórica:** BE-001/004 e B3-011/012 são outras filas;B4 prova causa
no contrato de governança.

**Alternativa futura:** Página/cursor e busca autorizada;priorizar pending
antes do limite como mitigação parcial.
**Risco da alteração:** Paginação instável,contadores divergentes ou ocultação
da história decidida.

**Aceite:** Com51+mudanças,a antiga pending é encontrável por percurso normal
e por referência,sem vazar outro paciente.
**Regressão:** Pending/decidida,inserção concorrente,empate de data,filtro sem
resultado e erro distinto de vazio.

**Decisão pendente:** Contrato de navegação/histórico e prazo operacional das
decisões.
**Preservar:** Autoridade local/global,ordem estável,história e decisão por
versão.

## B4-006

**Título:** Erro interno SQL é classificado como conflito de produto e orienta
recuperação errada

**Classificação:** P2; Defeito confirmado; NOVA_CAUSA_RELACIONADA;
CONFIRMADO_ADAPTADOR_REAL_CONTROLADO.

**Processo/pessoa:** Cancelamento ENT com erro SQL; Destinatário e suporte.

**Contrato:** Falha interna segura deve conservar categoria técnica correta e
correlação,sem sugerir alteração de catálogo.
**Observado:** 42702 column reference e.body is ambiguous virou409
AMBIGUOUS_PRODUCT com mensagem de apelido.
**Causa:** Regex ambiguous/alias é aplicada sem discriminar SQLSTATE de
implementação de erro de domínio.

**Caminho:** POST /api/documents/[id].
src/lib/server/api.ts:92;src/lib/server/api.ts:58.

**Evidência/método:**
evidence/b46-errors-results.json#B46-01;B46-02;evidence/b46-flow-counterproof-results.json#B46-08.
Mapper e envelope reais com erro controlado;SQL42702 e rollback comprovados
historicamente na B3.

**Persistência:** Nenhum dado novo no teste de mapper;B3-002 preservou
cancellation_pending no rollback.

**Consequência:** Pessoa procura corrigir nome de produto para uma falha de
cancelamento. Suporte recebe categoria enganosa e perde diagnóstico seguro da
causa. SQL privado continua oculto;melhor diagnóstico não deve expor payload.

**Contraprova:** Erro desconhecido retorna503 seguro;Flow vigente42501
vira403,não convite inválido.
**Limites:** Sem nova execução SQL do cancelamento;concurrent sintético é
fragilidade geral,não bug de todo domínio.

**Relação histórica:** DB-001/B3-002 causa SQL conhecida;B4 comprova causa
adicional na classificação HTTP.

**Alternativa futura:** Códigos de domínio explícitos e SQLSTATE
allowlist;categoria técnica sanitizada no servidor.
**Risco da alteração:** Quebrar códigos públicos ou expor SQL ao tentar
melhorar diagnóstico.

**Aceite:** 42702 não vira AMBIGUOUS_PRODUCT;erros de alias de catálogo
legítimos continuam409;correlação sem dados privados.
**Regressão:** 40001,PT409,42501,23505,P0001,dependência,erro desconhecido e
logs sentinela.

**Decisão pendente:** Taxonomia de erro público e diagnóstico interno por
operação.
**Preservar:** Erros seguros,correlação,no-store e exceções internas Next
preservadas.

## B4-007

**Título:** Upload de avatar não tem retomada após falha na associação

**Classificação:** P3; Risco sustentado; NOVO_B4;
SUSTENTADO_ADAPTADOR_CONTROLADO.

**Processo/pessoa:** Atualizar foto após resposta/associação falhar; Titular e
operador de Storage.

**Contrato:** Recuperar a mesma intenção ou reconciliar objeto carregado antes
de criar outro.
**Observado:** Upload simulado aceitou;set_my_avatar falhou403;retry escreveu
outro caminho UUID.
**Causa:** Identidade só no servidor e pipeline upload→RPC sem
reserva/consulta de tentativa ou compensação.

**Caminho:** POST multipart /api/profile.
src/app/api/profile/route.ts:123;src/app/api/profile/route.ts:137.

**Evidência/método:** evidence/b47-services-results.json#B47-07. Route Handler
real com sanitização/Storage/RPC controlados,sem persistência real de órfãos.

**Persistência:** Somente memória do instrumento;nenhum órfão real declarado.

**Consequência:** Titular não distingue upload salvo de associação recusada.
Risco de objetos não referenciados acumulados e suporte sem tentativa estável.
Não demonstrado vazamento,quota esgotada ou troca indevida de avatar.

**Contraprova:** Associação no retry pode funcionar;imagem saneada e acesso
privado permanecem.
**Limites:** Sem falha de Storage real ou ensaio de retenção;P3,sem bloqueador
comprovado.

**Relação histórica:** B3-021 trata autorização direta de avatar;B1 anexo
trata UX;causa de retomada avatar é distinta.

**Alternativa futura:** Reserva/chave estável ou reconciliação após
prazo;definir retenção antes de limpar.
**Risco da alteração:** Apagar imagem ainda referenciada ou expor catálogo de
arquivos privados.

**Aceite:** Falha após upload tem identidade recuperável ou reconciliação
verificável;retry não acumula objeto sem política.
**Regressão:** Upload falha,associação falha,resposta perdida,duas abas,avatar
antigo e revogação.

**Decisão pendente:** Retenção e estratégia de retomada;execução local de
falha real adicional se priorizado.
**Preservar:** Foto privada,bytes saneados,autoridade pessoal e preservação de
dados existentes.

## B4-008

**Título:** Rotas equivalentes de catálogo exigem capacidades HTTP diferentes

**Classificação:** P3; Falha de contrato; REVALIDACAO_A; CONFIRMADO_HTTP_AUTH.

**Processo/pessoa:** Delegar administração de catálogo; Profissional com
catalog.manage.

**Contrato:** Operações equivalentes seguem capacidade catalog.manage ou
compatibilidade explícita.
**Observado:** Com catalog.manage=true e access.manage=false,catalog403 e
admin200 criou produto.
**Causa:** Alias manage da rota catalog exige access.manage;rota ativa admin
exige catalog.manage.

**Caminho:** POST /api/catalog;/api/admin action=product.
src/app/api/catalog/route.ts:59;src/app/api/admin/route.ts:458.

**Evidência/método:** evidence/b48-admin-results.json#B48-01. Concessão local
autorizada,Auth real,capacidade lida e novo produto retornado.

**Persistência:** Novo produto fictício via rota autorizada;rota recusada não
escreveu.

**Consequência:** Cliente que usa a rota alternativa recebe negação apesar da
delegação. Contrato público inconsistente;fluxo ativo continua funcional. Não
é escalada;RPC continua exigindo autoridade do catálogo.

**Contraprova:** Consumidor atual usa admin e funciona;scope cruzado e
promoção global foram negados.
**Limites:** Uma delegação de usuário;sem inventário de todos consumidores
externos.

**Relação histórica:** Observação sem ID em A
ARCHITECTURE_AND_BACKEND,revalidada dinamicamente.

**Alternativa futura:** Alinhar guarda ou aposentar escrita com
compatibilidade documentada após inventário.
**Risco da alteração:** Ampliar indevidamente poder local ou retirar endpoint
ainda consumido.

**Aceite:** Delegado legítimo tem resultado coerente;sem capacidade é negado
em ambos;compatibilidade explícita.
**Regressão:** Override usuário/papel,admin local/global,paciente
errado/inativo e consumidor ativo.

**Decisão pendente:** Estabilidade pública versus aposentadoria do POST
alternativo.
**Preservar:** Capacidade específica,contexto selecionado e catálogo canônico
por paciente.

## B4-009

**Título:** UUID inválido no modo global vira HTTP500 recuperável

**Classificação:** P3; Defeito confirmado; NOVO_B4; CONFIRMADO_HTTP_AUTH.

**Processo/pessoa:** Consultar seção administrativa global; Administrador
global e suporte.

**Contrato:** Identificador malformado recebe erro de entrada,sem sugerir
indisponibilidade transitória.
**Observado:** Global500 INTERNAL_ERROR retryable=true;local400
PATIENT_REQUIRED.
**Causa:** uuid.parse lança ZodError não traduzido;api só reconhece ApiError.

**Caminho:** GET /api/admin?section=catalog. src/app/api/admin/route.ts:225.

**Evidência/método:** evidence/b48-admin-results.json#B48-02;B48-03. Duas
consultas HTTP reais,mesmo input inválido e modos distintos.

**Persistência:** Não aplicável;consultas sem mutação.

**Consequência:** Usuário tenta novamente um parâmetro que precisa corrigir.
Falso incidente interno e ruído de suporte/monitoramento. Sem dado privado ou
stack expostos;sem bypass.

**Contraprova:** Mesmo input local e outros parseUuid/patientContext
classificam entrada corretamente.
**Limites:** Um ramo global;sem afirmar que toda validação usa parse inseguro.

**Relação histórica:** B1-ERR-002 é recuperação genérica;esta é causa nova de
entrada não traduzida.

**Alternativa futura:** Usar parseUuid/safeParse e erro público de validação.
**Risco da alteração:** Alterar ocultação legítima de recursos existentes/sem
permissão.

**Aceite:** Global/local recebem4xx seguro para UUID malformado e não
retryable;objeto oculto continua não enumerável.
**Regressão:** UUID inexistente,bem formado,paciente errado,seção inválida e
sessão ausente.

**Decisão pendente:** Correção técnica sem mudança de autoridade;preservar
códigos compatíveis.
**Preservar:** Ocultação autorizativa e logs seguros com correlação.

## B4-010

**Título:** Cancelamento durante preparo externo não impede a chamada
posterior de envio

**Classificação:** P2; Risco sustentado; NOVO_B4;
SUSTENTADO_ORQUESTRACAO_CONTROLADA.

**Processo/pessoa:** Revogar destinatário durante envio com mídia;
Destinatário revogado e responsável pelo paciente.

**Contrato:** Definir ponto de cancelamento e revalidar autoridade junto à
fronteira de envio,sem fingir atomicidade rede/banco.
**Observado:** Transporte em memória cancelou durante upload;adapter ainda
chamou messages;complete protegeu cancelled e resumo contou skipped.
**Causa:** Validação única precede preparo/upload;não há nova autoridade
verificada entre mídia e mensagem.

**Caminho:** POST /api/notifications/worker;/api/admin/notifications.
src/lib/notifications/worker.ts:40;src/lib/notifications/worker.ts:57;src/lib/notifications/provider.ts:146.

**Evidência/método:** evidence/b49-integration-results.json#B49-01. Worker e
Meta adapter reais,com RPC/transporte inteiramente simulados;zero chamadas
externas.

**Persistência:** Estado cancelled é simulado;nenhum envio real ou acesso
indevido de produção provado.

**Consequência:** Pessoa pode receber documento após operador acreditar que o
cancelamento já impede novas etapas. Resumo skipped não prova que o transporte
não foi chamado;conciliação necessária. Risco de divulgação pós-revogação em
janela;sem exfiltração real demonstrada.

**Contraprova:** Complete tardio não sobrescreve cancelled;novas chamadas e
validações normais reavaliam destinatário.
**Limites:** SQL de revogação/lease e provedor real não exercitados;política
de in-flight ainda precisa definição.

**Relação histórica:** B3-020/016 e BE-003 são relacionados;esta janela de
orquestração é adicional,não generalização SQL.

**Alternativa futura:** Revalidar próximo ao envio,deadline,token de
cancelamento e conciliação explícita de send_started/accepted.
**Risco da alteração:** Afirmar que cancelamento desfaz mensagem já aceita ou
reenviar resultado incerto.

**Aceite:** Ensaio controlado de revogação antes/depois do upload e callback
tardio respeita garantia documentada;estado final reconcilia transporte.
**Regressão:** Lease vencida,timeout,revogação,callback anterior ao complete e
envio já aceito.

**Decisão pendente:** Garantia operacional exata de revogação em andamento e
homologação externa autorizada.
**Preservar:** Uncertain sem reenvio cego,callback monotônico,destinatário
atual e dados mínimos.

## B4-011

**Título:** Item interativo não reconhecido faz webhook confirmar lote sem
processar texto válido

**Classificação:** P2; Defeito confirmado; NOVO_B4;
CONFIRMADO_HANDLER_CONTROLADO.

**Processo/pessoa:** Receber lote heterogêneo de mensagens; Pessoa relatando
falta/consumo e responsável.

**Contrato:** Mensagem não suportada não suprime mensagem válida
vizinha;resposta deve refletir rejeição/processamento.
**Observado:** Texto+nfm_reply assinados e ativo correto retornaram200
receivedtrue processed0,sem RPC;texto sozinho processou1.
**Causa:** safeParse do array inteiro falha por interactive sem
button_reply;null vira arrayvazio silenciosamente.

**Caminho:** POST /api/notifications/webhook.
src/lib/notifications/webhook.ts:102;src/lib/notifications/webhook.ts:121;src/app/api/notifications/webhook/route.ts:77.

**Evidência/método:**
evidence/b49-integration-results.json#B49-02;B49-03;B49-04;B49-05. Handler
real,HMAC/conta reais do payload sintético,RPC controlada;nenhuma persistência
inferida.

**Persistência:** Nenhuma RPC chamada no lote misto;sem banco real nessa prova.

**Consequência:** Relato enviado pode não aparecer e não receber explicação de
rejeição. HTTP200 elimina sinal de falha que permitiria recuperação do lote
pelo contrato de retry. HMAC/WABA continuam protegidos;é perda de ingestão,não
bypass de assinatura.

**Contraprova:** Texto isolado ingere;HMAC ou WABA errados dão403 antes do
serviço.
**Limites:** Sem lote real da Meta nem frequência observada;formato nfm_reply
documentado por fonte primária de integração AWS.

**Relação histórica:** A citava homologação de lote após RPC falhar;esta causa
de descarte200 é nova.

**Alternativa futura:** Validar por item,registrar rejeição segura e preservar
dedup/retry para mensagens válidas.
**Risco da alteração:** Processar conteúdo desconhecido como comando ou
duplicar itens já confirmados no replay.

**Aceite:** Lote misto processa texto válido exatamente uma vez ou responde
rejeição recuperável explícita;item não suportado não executa ação.
**Regressão:**
Texto,button_reply,list_reply,nfm_reply,áudio,malformado,assinatura
errada,replay e falha parcial.

**Decisão pendente:** Política de item incompatível e homologação de
lotes/retry reais.
**Preservar:** HMAC do corpo bruto,WABA/telefone,identidade verificada e
relato sem débito automático.

## B4-012

**Título:** Invalidação confirmada não recarrega a consulta de consumo já aberta

**Classificação:** P2; Defeito confirmado; NOVO_B4;
CONFIRMADO_BROWSER_HTTP_REVISAO.

**Processo/pessoa:** Acompanhar novo relato em outra sessão;
Profissional/familiar com tela aberta.

**Contrato:** Invalidação confirmada atualiza read model mesmo que
paciente/capacidades sejam iguais.
**Observado:** Revisão avançou e contexto recarregou;zero GETs consumo após
sinal;relato aparece só no reload completo.
**Causa:** Compartilhamento estrutural conserva context.patient;effect depende
dessa referência/attempt e não da revisão.

**Caminho:** GET /api/consumption;/api/sync;/api/context.
src/components/layout/workspace-context.tsx:61;src/components/stock/consumption-console.tsx:76.

**Evidência/método:** evidence/b412-freshness-results.json#B412-01. Chromium
local,Auth real,POST real,revisionRPC e contagem de GET/DOM;evento explícito
injetado.

**Persistência:** Novo relato sintético devolvido por HTTP e exibido após
reload;nenhum movimento de estoque.

**Consequência:** Pessoa vê ausência de relato quando o backend já o
registrou. Revisão/ação pode atrasar;polling que emite o mesmo sinal não
resolve o consumidor. Sem autorização contornada;comando continua revalidado
no servidor.

**Contraprova:** Backend revision e GETcontext funcionaram;reload completo
recuperou;prova não é B3-013.
**Limites:** Uma tela Chromium local;evento Realtime não homologado nem
FlowReviews testado dinamicamente;sem humano/device.

**Relação histórica:** B3-013 não emite sinal;B4 encontra consumidor que não
reage ao sinal já recebido;B1 estados relacionados.

**Alternativa futura:** Assinar revisão diretamente no read model ou invalidar
por chave explícita sem apagar drafts.
**Risco da alteração:** Recarregar form em edição,duplicar consultas ou
misturar respostas de pacientes.

**Aceite:** Novo relato e decisão em outra sessão atualizam lista após sinal
sem reloadmanual;draft permanece e resposta antiga é descartada.
**Regressão:** Mesmas capacidades,perfil alterado,reconexão,polling,eventos
rápidos,contexto trocado e erro de consulta.

**Decisão pendente:** Prazo de frescor e lista de consumidores que devem
responder à revisão.
**Preservar:** Realtime sem payload privado,rascunhos preservados,contexto e
autoridade atuais.

## B4-013

**Título:** Criação de paciente aceita isActive=false e persiste cadastro ativo

**Classificação:** P2; Defeito confirmado; NOVO_B4; CONFIRMADO_HTTP_READBACK.

**Processo/pessoa:** Cadastrar residência inicialmente inativa; Administrador
global e administrador inicial.

**Contrato:** Honrar inatividade solicitada ou recusar a opção de criação
explicitamente.
**Observado:** POST isActivefalse retornou200 is_activetrue;consulta
confirmoutrue e administrador ativo.
**Causa:** Campo validado não é encaminhado na criação com administrador;RPC
usa true fixo.

**Caminho:** POST /api/admin action=recipient.
src/app/api/admin/route.ts:376;src/components/admin/patient-registration.tsx:81;public.create_patient_with_administrator.

**Evidência/método:** evidence/b412-create-state-results.json#B412-02. HTTP
real e leitura independente do paciente/vínculo;contraprova de atualização
local.

**Persistência:** Novo paciente fictício nasceu ativo;atualização posterior
funcionou e ele termina inativo;vínculo inicial preservado.

**Consequência:** Operador acredita cadastrar uma residência sem habilitar
operações,mas recebe estado contrário. Pode disponibilizar operação antes da
preparação pretendida;sem ação real efetuada nesse intervalo. Exige global e
administrador inicial confirmado;nenhuma autoridade indevida foi concedida.

**Contraprova:** Atualizar paciente existente parafalse funciona;criação
explícita do administrador segue correta.
**Limites:** Uma residência fictícia;impacto operacional posterior não
executado;sem produção.

**Relação histórica:** Nova causa;B2 distingue cadastro/ativação mas não
provou campo ignorado.

**Alternativa futura:** Propagar estado no contrato de criação ou tornar
criação sempre ativa explícita e recusar false.
**Risco da alteração:** Quebrar onboarding,inativar histórico indevidamente ou
dispensar administrador explícito.

**Aceite:** Criar inativo preserva false e bloqueia novas operações,ou
validação rejeita opção antes de criar qualquer paciente.
**Regressão:** Criar ativo/inativo,email não confirmado,global sem
vínculo,atualização posterior,history e retry de criação.

**Decisão pendente:** Decidir se criação inativa é suportada;nenhuma aceitação
silenciosa de campo ignorado.
**Preservar:** Administrador inicial explícito,identidade global distinta de
papel local,história e paciente como unidade operacional.
