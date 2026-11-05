"""Field-level source/UI/PDF audit. Documentary projection; no product writes."""
from assemble import csv_file, md, checkpoint

rows=[]
def field(kind,name,source,ui,pdf,result,meaning,reference):
    rows.append(dict(id=f"F{len(rows)+1:03}",document=kind,field=name,persisted_source=source,event_snapshot="body;mesma versão salvo fonte explícita",ui=ui,pdf=pdf,result=result,human_interpretation=meaning,evidence=reference,limit="Leitura estática;casos PDF B6.6 complementam;sem ato físico comprovado"))

for kind in ['REQ','COM','ENT','BAL']:
    for name,source,ui,pdf,result,meaning in [
        ('Identidade','id;code;protocol;version','DocumentHeader','Código;protocolo;UUID;versão;rodapé','PRESENTE','Código só é único no contexto paciente/tipo'),
        ('Paciente','actors.patient;recipient_name_snapshot','snapshot no cabeçalho','actors.patient prioritário','PRESENTE_COM_RESSALVA_LEGADO','Nome corrente não deve substituir nome original importado'),
        ('Data do registro','created_at / createdAt','formatBrazilDate São Paulo','formatBrazilDate São Paulo','PRESENTE','Data do draft não é data da emissão'),
        ('Autor original','created_by;actors.issuer','REQ solicitante;supply não exibe identidade completa no cabeçalho','Solicitado por/Responsável','PRESENTE','Responsável original não autor de todos os atos posteriores'),
        ('Ator por evento','actor_id;actor_name;authority_context','REQ nome congelado;supply diretório atual','history.actorName','DIVERGENCIA_UI','Rename/revogação altera explicação legível na tela supply'),
        ('Nomes e unidades das linhas','snapshots no body','snapshots','snapshots','PRESENTE','Não consulta catálogo atual para PDF'),
        ('Observação geral','payload.notes / intent.observations','Seções de detalhe','Observação','PRESENTE','Notas gerais não incluem automaticamente motivos dos comandos'),
        ('Versão e hash','document_events;content_hash','SHA de eventos supply','Identificação/integridade;QR','PRESENTE','Hash do conteúdo não é assinatura nem hash do arquivo'),
        ('Anexos','attachments ready no evento','Lista atual com URL temporária','Nomes/hashes da versão','PARCIAL','PDF não contém bytes nem origem original antes da sanitização'),
        ('História resumida','body.history;event','Data/ação/ator;sem diff','Data/ação/ator/versão','PARCIAL','Não explica o que mudou ou por quê em cada versão'),
    ]:
        field(kind,name,source,ui,pdf,result,meaning,'private.record_document_event;private.science_snapshot;operational-pdf;detail')

for args in [
    ('REQ','Quantidade solicitada','Não integra contrato','Ausente','Ausente','CORRETO','Número de itens é contagem de linhas;não quantidade física','AGENTS;README;operational-pdf'),
    ('REQ','Estoque observado','requisition_items.current_stock','Estoque observado na emissão','Não consumido na tabela','OMISSAO_EDITORIAL','Perde contexto da necessidade;sem corrupção/estoque oficial','BE-007;B6.6 PV01'),
    ('REQ','Urgência','line.urgent','Urgente por linha','Prioridade + contador','PRESENTE','Urgência é declaração do solicitante','operational-pdf'),
    ('REQ','Atendimento por item','fulfillmentLines;ENT vinculada com aceite','Indicador por item','Só contagem agregada','PARCIAL','PDF parcial não identifica qual item está atendido','PV01;requisition-detail'),
    ('REQ','Ciência por modo e pessoa','scienceEvents;sciencePolicy','Modo/ator/data','Tabela independente','PRESENTE','Automática não é expressa nem recebimento','PV01;private.record_science'),
    ('REQ','Situação parcial','fulfilled>0;completed_at null','Atendimento parcial','Aguardando atendimento ou ciência pendente','DIVERGENCIA_ROTULO','Contador revela parte;subtítulo não nomeia parcial','PV01;presentation.ts'),
    ('REQ','Arquivo e motivo','sciencePolicy.archived_at;archive_reason;event','Estado e motivo no progresso','Estado arquivada;sem motivo','PARCIAL','História não permite saber por que arquivou apenas no PDF','archive_requisition;operational-pdf'),
    ('REQ','Origem histórica','is_historical;sourceCreatedAt;requester_name_snapshot','Data original desconhecida;ciência não comprovada','Histórico + data derivada;ciência PENDENTE no card','DIVERGENCIA_SEMANTICA','Dado desconhecido pode aparentar data conhecida e pendência atual','B62-S02;PV06'),
    ('COM','Origem compra/doação','payload.origin','Payload no processo','Título compra;sem origem específica','PARCIAL','Doação não é pagamento/comprovante fiscal','PV02;create_supply_document'),
    ('COM','Proposto/aprovado/adquirido/validado','document_lines','Quatro valores','Duas tabelas com quatro valores','PRESENTE','Validação é entrada familiar;aprovado não é comprado','PV02'),
    ('COM','Chegada informada pendente','purchase_receipts state pending','Lista receipts pending','Sem detalhar chegada informada','OMITIDO','Zero validado não distingue nada recebido de chegada não validada','operational_document;operational-pdf'),
    ('COM','Responsável por validar','validated_by/at;event actor_name','Diretório atual e evento','Evento resumido sem ID de receipt','PARCIAL','Cronologia não mapeia parcela a recebimento específico','record_document_event;purchase_receipts'),
    ('COM','Motivo de rejeição/desistência','event.reason;receipt.reason','Estado;API tem dado','Não renderiza event.reason','OMITIDO','Destinatário do PDF desconhece ressalva/motivo','PV02;audited_legacy_supply_command'),
    ('COM','Pendência numérica','approved-purchased;purchased-accepted','Valores permitem cálculo','Valores permitem cálculo','DERIVAVEL','Pendência não foi apagada;não presumir recebimento integral','B36-07;PV02'),
    ('COM','Cancelado/rejeitado','status cancelled/rejected','Badge terminal','Subtítulo terminal;card EM ANDAMENTO','CONTRADICAO_DE_ESTADO','Card genérico sugere trabalho corrente terminal','operational-pdf;PV04 variantes'),
    ('ENT','Origem/destino','payload.source/destination','Família/equipe','Família/equipe','PRESENTE','Custódias e trânsito não são saldo único','PV03'),
    ('ENT','Emissão','ent.issued/ent.submit created_at','Header created_at','Rótulo Emissão usa snapshot.createdAt','DATA_INADEQUADA','Draft antigo pode ser impresso com data anterior ao ato','B62-S03;PV03'),
    ('ENT','Recebedor designado','recipient_id;actors.recipient','Diretório atual','Nome da versão','PRESENTE_COM_RESSALVA','Designado não implica recebeu;actor do evento é prova separada','B62-S01;PV03'),
    ('ENT','Expedido/aceito/conciliado','document_lines','Três quantidades','Duas tabelas','PRESENTE','Aceito positivo é crédito confirmado independente da divergência','PV03;PV04'),
    ('ENT','Problema e ressalva','metadata.receipt.problem/notes','Resumo só estado/quantidade','Sem texto da ressalva','OMITIDO','Divergência aberta não explica avaria/falta/observação','PV03'),
    ('ENT','Tipo de conciliação','event.resolution;reason;ledger','Estado e quantidade;sem motivo histórico','Só CONCILIADO agregado','OMITIDO','missing e returned podem ter mesmo PDF numérico e consequências distintas','PV04;audited_legacy_supply_command'),
    ('ENT','Consumo versus devolução','event.lines returnQuantity/consumedQuantity','Operação consent_cancel;história resumida','Não detalha parcelas','OMITIDO','Não inferir material devolvido só do cancelamento','B36-05;PV04'),
    ('ENT','Ato de aceite','workflow.acceptedBy/At;history actor','Diretório + evento','Conferência em data;timeline','PARCIAL','Conta que aceitou não é emissor inicial','PV03'),
    ('ENT','Estado cancelado','status cancelled;workflow cancellation','Linha expedição cancelada e compensada','Card recebimento PENDENTE;linha pode aguardar conferência','CONTRADICAO_DE_ESTADO','Pessoa pode procurar aceite de expedição já cancelada','PV04'),
    ('BAL','Contagem/referência','quantity;metadata.expectedQuantity','Contado/saldo referência','Duas tabelas','PRESENTE','Contagem é declaração física;referência é ledger no momento','PV05'),
    ('BAL','Diferença','Contado-referência','Derivável','Derivável;sem delta explícito','DERIVAVEL','Não é perda de dados;melhoria possível de leitura','PV05'),
    ('BAL','Contador e plantão','payload.balanceContext','Nome/janela;formatBrazilDate fixo','Nome/janela timezone do contexto','PRESENTE_COM_DIFERENCA_FUSO','UI São Paulo e PDF timezone da escala podem divergir sem rótulo UI','PV05;receipt.ts;supply-detail'),
    ('BAL','Semanas e contagem atual','balanceContext.weeks/countedAt','Semanas + ressalva','Semanas + ressalva','PRESENTE','Regulariza semanas anteriores sem simular contagens','PV05'),
    ('BAL','Aprovações por contagem','approvals count_version;workflow countVersion','Diretório em histórico;sem grade approvals','Não consome approvals/countVersion','OMITIDO','Não distingue quais revisores aprovaram qual contagem','PV05;bal_approvals'),
    ('BAL','Reconto e referência','event;countVersion;referenceRevision','Ação;percursos balancos','Só rótulo evento + versão documental','PARCIAL','Versão documental não é versão de contagem','PV05;revise_supply_document'),
    ('BAL','Prazo/atraso/adiamento','bal_obligations/deferrals/cycle_events','Console balanços','Sem prazos/decisões;apenas semanas','FORA_DO_SNAPSHOT_PDF','Reconstituir responsabilidade exige ciclo além do PDF','B3-014;balanceContext'),
]:
    field(*args)

csv_file('04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv',rows)
md('04_DOCUMENT_SEMANTIC_FIDELITY.md', """
# B6.4 — Fidelidade semântica dos quatro documentos

A matriz acompanha cada campo da fonte persistida à tela e ao PDF. Presença,
omissão editorial, diferença semântica e campo derivável são categorias
distintas. A seleção do renderizador4 não altera os fatos guardados.

## REQ

Não possui quantidade solicitada. ITENS SOLICITADOS conta linhas; a ressalva
explica isso. Estoque observado fica na fonte/tela, ausente no PDF (BE-007,
oportunidade editorial). Ciência mantém modo/pessoa/data e declaração de que
emissão/envio não comprovam ciência. Atendimento é contado no PDF, mas a
tabela de materiais não marca quais linhas foram atendidas. O subtítulo
escolhe ciência/conclusão, sem o estado parcial usado pela tela; avaliar o
conjunto do documento, pois o contador oferece contraprova à ocultação total.

Histórico importado recebe qualificador de ciência não comprovada, mas o
card usa PENDENTE e a data do documento derivado pode ocupar o lugar da
data original desconhecida. Em arquivo, o motivo persiste em lifecycle/event,
sem ser transcrito na linha do tempo PDF. Não alterar legado para completar
campos cujo valor é desconhecido.

## COM

As quantidades proposta/aprovada/adquirida/validada são separadas corretamente.
O remanescente pode ser calculado; compra não atende REQ nem credita equipe.
Porém o evento não inclui a coleção completa de purchase_receipts, apenas
linhas agregadas e o comando atual. PDF não apresenta chegada ainda pendente
de validação nem motivos de rejeição de parcela; zero validado não diz se
ninguém entregou ou se ainda falta validar. Título Compra e ausência de
origin reduzem reconhecimento de doação, sem transformar o PDF em nota fiscal.

## ENT

Expedido, aceito e conciliado aparecem separados; aviso inicial recusa a
presunção de recebimento. Os detalhes do problema e notas do aceite ficam
em metadata.receipt e no comando do evento, mas não na representação. A soma
conciliada não distingue falta de devolução. Cancelamento com consumo anterior
precisa manter parcelas físicas separadas; B3-002 impede hoje um ramo válido,
mas não autoriza afirmar que consumo foi devolvido. Histórico resumido não
contém razões ou quantidades por transição. O rótulo Emissão usa createdAt do
documento, que pode anteceder a emissão real de draft. B62-S03 sustenta o corte
de fonte; B6.6 confronta a impressão efetiva.

## BAL

Referência/contado e contexto de plantão/semanas são representados, com ressalva
correta de contagem atual. Não se usa escala como prova de presença. O PDF
não imprime approvals, countVersion, política vigente ou revisor por grupo,
embora a aprovação seja determinante do significado. Linha do tempo bal.approve
não mostra qual count_version foi aprovada; aprovações antigas não podem ser
reinterpretadas como aprovação de reconto. Prazo/adiamento/atraso estão no
ciclo, fora do snapshot parcial: é dependência de recuperação, sem afirmar que
o dado foi perdido. UI usa São Paulo; seção BAL PDF aplica timezone do contexto.

## Consequência transversal

Rótulos compactos têm escolhas incompatíveis com alguns estados terminais:
COM/BAL cancelado ou rejeitado permanece EM ANDAMENTO no card; ENT cancelada
recebe PENDENTE no card de recebimento. O subtítulo correto é contraprova de
perda de estado, mas não elimina a ambiguidade do mesmo comprovante. Não
concluir corrupção, pagamento, devolução ou presença pelo texto do PDF.

Fontes: operational-pdf, presentation, supply-detail, supply-line-summary,
requisition-detail e contratos privados record_document_event/science_snapshot,
audited_legacy_supply_command, apply_bal e register_legacy_requisition. Provas
novas B62; contraprovas B36/B47 reaproveitadas. Matriz explicita os limites.
""")
checkpoint('- B6.4 encerrado: matriz de campos e estados produzida;quantidades/custódias\n  corretas separadas das omissões e ambiguidades. Novas hipóteses: origem\n  legado,data de emissão,motivos ENT,aprovações BAL e cards terminais. Prova\n  visual será B6.6;nenhuma falha chamada corrupção só por omissão. Próximo B6.5.')
