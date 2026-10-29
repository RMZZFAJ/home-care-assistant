"""Reconcile canonical inventory against executed evidence, never run old generators/probes."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent


def read(name):
    with (root / name).open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def write(name, rows):
    with (root / name).open("w", encoding="utf-8", newline="") as stream:
        w = csv.DictWriter(stream, list(rows[0]), quoting=csv.QUOTE_ALL, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


# Process | executed cases | what was really proved | explicit unverified boundary
mapping = """
P-ACC-01|B27-02;B28-01|Auth oficial e acesso autorizado funcionaram;identidades fictícias|Reset de senha,MFA,OAuth,SMTP e cadastro humano não executados nesta B2
P-ACC-02|B26-12;B27-06;B27-09|Contexto explícito,isola outro paciente e separa global/local|Todas corridas entre abas e mudança de capacidades não exauridas
P-ACC-03|B26-12;B27-09|Novos pacientes e administrador inicial via comando autorizado|Preparação humana completa e ativação real não homologadas
P-ACC-04|B27-02;B27-03;B27-04|Rotação,revogação,expiração e emissor revalidado|Compartilhamento manual real e entrega externa não comprovados
P-ACC-05|B27-02;B27-03;B27-08|Conta correta aceita;conta errada/token antigo/revogado recusados|Sessão de onboarding com familiar real ausente
P-ACC-06|B27-01;B27-09|Fronteira de perfilglobal/capacidade local e proposta decidida|Todos overrides e combinações de papéis não exauridos
P-ACC-07|B27-04;B27-06;B27-07;B27-08|Revogação imediata,último admin,história/outro paciente preservados|Sucessão de ENTparcial incompleta B2-015;corrida de últimos admins não repetida
P-ACC-08|B27-09|Global propõe,outro admin local aplica;sem execução operacional global|Retry do adaptador antigo A BE-005 não reexecutado
P-ACC-09|B25-02;B25-16;B28-01|Política local,alcance do snapshot e pausa do regime|Todas políticas de canal/horário e efeitos em cada domínio não exauridos
P-ACC-10||Rotas de perfil,sessões e contato reconstruídas em fonte|Não executar mutação de perfil global existente;telefone/MFA/aparelho reais pendentes
P-CAT-01|B24-06;B27-01|Criação de produtos sintéticos e inativação/reativação com saldo|Adoção de template é estática;duplicatas de uso real não observadas
P-CAT-02|B24-02;B24-04|Precisão,unidade com história e trigger de proteção|Todas unidades possíveis e migração de duplicatas não executadas
P-CAT-03|B24-05|Lookup/fator e dados da apresentação;ausência de proveniência no consumidor|Câmera real e scanner manual/browser não exercitados nesta amostra
P-REQ-01|B28-01|Emissão com seleção,observação e urgência;sem quantidade pedida|Rascunho da aba e unknown→zero herdados B1;sem nova prova humana
P-REQ-02|B22-02;B22-03|Repetição exige motivo;extra igual a alias recusado;textual preservado|Resolução/reassociação equivocada de extra só reconstruída em fonte
P-REQ-03|B22-01;B28-01|Protocolo,persistência,sem ledger,retry mesmoID|Perda/recarga visual coberta separadamente nos6E2E;durabilidade além da aba não prometida
P-REQ-04|B28-02;B28-04|Visto não é ciência;expressa elegível e exceção tardia preservada|WhatsApp/despacho e leitura integral/humana não comprovados
P-REQ-05|B23-03;B23-05;B28-03;B29-01|Vínculo/aceite atende linha;divergência bloqueia conclusão;cancelamento reabre|Suficiência física após aceite pequeno depende de validação/decisão de produto
P-REQ-06|B23-04;B28-03;B28-04;B29-01|Cancelamento comENT bloqueado;arquivo motivado e reabertura históricos|CancelamentoREQsemvínculo e arquivo automático por prazo não reexecutados
P-COM-01|B22-04;B22-07;B22-10|Compra/doação,emissão/draft e vínculos preservados|Atalho requisitionId existe em fonte;descartar criação genérica O10
P-COM-02|B22-04;B29-02|Aprovação por capacidade e corrida entre administradores|Aprovação parcial e rejeição total reconstruídas em fonte,sem novos casosB2
P-COM-03|B22-05;B22-06;B22-07|Aquisição acumulada limitada ao aprovado;sem estoque antes de receber|Conferência com fornecedor físico não verificada
P-COM-04|B22-05;B22-06;B22-08|Receipts pendentes reservam limite;validar credita;rejeitar conserva original|Correção após receiptaprovado não reproduzida;sem fatos físicos reais
P-COM-05|B22-09;B22-10|Cancelar antes de aquisição;restante parcial sem saída formal|B2-001;decisão de desistência por linha pendente
P-ENT-01|B23-01;B23-06|Custódias,destinatário e vínculos múltiplos explícitos|Wizarddraftsubmit não ensaiado separado de emissão direta;hardware ausente
P-ENT-02|B23-01;B23-06;B29-03|Expedição debita origem e cria trânsito;cancelamento semaceite devolve|Separação física/entrega de mão não comprovadas por software
P-ENT-03|B23-02;B23-03;B28-03;B29-03|Destinatário exato,parcial/integral,crédito único e retry|Compreensão humana e aceite porWhatsApp não verificados
P-ENT-04|B23-05;B23-11|received/returned/missing distintos;conciliação pode não ser integral|Todas corridas entre conciliações e saldo de múltiplas origens não exauridas
P-ENT-05|B23-06;B27-07|Sem aceite reatribui;parcial recusa e cria lacuna de sucessão|B2-015;nenhuma autorização para assinatura pelo anterior
P-ENT-06|B23-07;B23-08;B23-09;B29-01|Consentimento/devolução funcionam sem consumo;consumo positivo42702;sem recusa|B2-002/003/004;regra temporal após erro permanece não atravessada
P-STK-01|B24-01|Entrada familiar inicial avulsa com razão e ledger|Inventário físico real e estoque inicialequipe não observados
P-STK-02|B24-01;B24-02;B24-08|Entrada/saída,limites,precisão e diferença de consumo|Não mistura ajuste com consumo médio
P-STK-03|B24-01;B24-03;B29-04|Compensação referenciada preserva original;sem referência também aceita|B2-005;readbackHTTPretomado sem snapshotbefore
P-STK-04|B24-07;B24-09;B29-03|Custódias,trânsito e previsão distintos;saldo familiar protegido|Carga longa/tempo físico de trânsito não medidos
P-STK-05|B24-07;B24-08;B26-11|Histórico paginado e consumo só de saída confirmada;BALexcluído|Links por origem só examinados em fonte,B2-008
P-STK-06||Mínimo por produto/custódia;dashboard alerta sem criarREQautomaticamente|Configuração específica e alertas com usuário real não reexecutadosB2
P-STK-07||Ausência de ledger por lote/validade reconstruída|Necessidade humana não demonstrada;O17hipótese,não defeito confirmado
P-BAL-01|B25-01;B25-02|Regime anterior/política capturada;autoaprovação própria indevida B2-009|Optional e todas combinações de política não exauridos
P-BAL-02|B25-08;B25-16|Ativação opt-in,pausa conserva obrigação/reconto e história|Todos fusos/dias e mudança de regime em semanas múltiplas não executados
P-BAL-03|B25-08;B25-09;B25-12|Obrigação/atribuição real e atraso/transferência em simulação rollback|Clock dirigido não é dia real;fairness global e múltiplas semanas não reexecutados
P-BAL-04|B25-09;B25-13;B25-17;B26-10|Contador designado,todas linhas,referência e reconto formal|Contagem física humana não homologada;inativo B2-007
P-BAL-05|B25-01;B25-03;B25-13;B25-14;B26-11|Revisão distinta/agendada,referência obsoleta e ajuste sem consumo|Não há comando geral de rejeiçãoBAL;reconto é alternativa existente;legado B2-009
P-BAL-06|B25-10;B25-11;B25-15|Pedido não suspende prazo;rejeição e aprovação familiar de reconto em rollback|B2-012;aprovar extensão de obrigação ainda pending não comprovado pelo reconto counted
P-BAL-07|B25-12|Atraso de uma janela preservado e próxima atribuição simulada|Regularização de várias semanas só em fonte e referência histórica;sem novo runtime de semanas reais
P-OCC-01|B25-04;B25-05;B25-07;B29-06|Relato não debita;falta sem saída;fila antiga limitada|Texto livre sem complemento B2-010;retenção física não observada
P-OCC-02|B25-05;B25-06;B25-07;B29-05|Consumo debita na confirmação;retry não duplica;decisão oposta sucesso vazio|B2-011;corrida simultânea oposta não reproduzida
P-OCC-03||Flow sugere e autor revisa antes de relato/débito;contrato localizado|Provedor,aparelho,envelope e runtimeFlow não executadosB2
P-SCH-01|B26-07|Alterar tipo não retima ocorrências anteriores|Todos limites/inativação do tipo só em fonte
P-SCH-02|B26-01;B26-02;B26-12|Noturno12x36,transação sem série parcial,adjacência e privacidade de conflito|Todas zonas/DST e horizonte máximo não exauridos
P-SCH-03|B26-05;B26-06|Corte publicado funciona;aprovarpropostaapóscorte republica B2-013|UI não expõe sequência completa;rejeição série só em fonte;P1AUX-001persiste
P-SCH-04|B26-03;B26-04|Proposta não altera antes de decisão;obsoleta recusa aprovação mas permite rejeição|Apresentação informada herdada A/B1;sem nova renderização desse defeito
P-SCH-05|B26-08;B26-09;B26-10|Guarda janelaBAL;substituição e reatribuição de reconto com história|B2-014;ausência humana e todas corridas não exauridas
P-SCH-06||Agenda é programação;não há check-in/out no contrato|Necessidade de presença é decisão de produto;nenhum comparecimento comprovado
P-DOC-01|B25-03;B28-04;B29-01;B29-02|Versões/eventos,retificação/reconto e conflitos preservam história|Nem todo tipo/retificação extrema exercitado;assinatura digital não provada
P-DOC-02|B28-06;B28-07|Anexo ready,mesma chave/hash,conflito e reserva sem saída|B2-016;B1-ERR-001 não resolvido;nenhuma URLassinada exportada
P-DOC-03|B28-01;B28-05;B29-01|PDFprivado v1/v5hashestáveis;quatro páginas inspecionadas;403COMleitor|AmostraREQfictícia;QRfísico,impressora,tags/idioma e todos layouts não homologados
P-DOC-04|B28-05;B29-06|Versão,alvo e acesso consultáveis;omissão de consumo antigo demonstrada|Histórico administrativo100A BE-004 não reexecutado;B1-UX-006 permanece
P-DOC-05||Importação histórica revisada,protocolo e unknown não viram fatos novos;fonte rastreada|Nenhuma importação novaB2;E2E selecionado não inclui esse caso;prova B1/A é referência
P-NTF-01|B28-02|Aviso interno,visto e ciência independentes;destinatário autorizado|Cron local processa avisos;roteamento completo/grupos não exauridos
P-NTF-02||Lease,aceitação,entrega,leitura,erro e incerto rastreados em fonte|Sem mensagem real;configuração externa ausente;provedor e opt-in não homologados
P-NTF-03||Lembretes por prazo/BAL e seleção em lote reconstruídos|A DB-002/006não reexecutados nesta B2;fairness não concluída;risco herdado aberto
P-NTF-04||Aceite integral exige destinatário/telefone/desafio/versão/prazo em fonte|WhatsApp real desabilitado;divergência/cancelamento continuam no aplicativo
P-OPS-01|B27-01;B28-01|Componentes de preparação exercitados;sequência humana reconstruída|Sem checklist integrado ou preparo humano comprovado;O01candidato
P-OPS-02|B26-09;B26-10;B27-07|Recuperações específicas existem;ENTparcial e reconto exigem sucessão explícita|Processo transversal parcial;B2-014/015;nenhum módulo universal presumido
P-OPS-03|B26-12;B27-06;B27-09|Dois pacientes,contexto,privacidade de agenda e revogação local|Agregação transversal futura é hipótese;progressojobs depende A DB-002
P-OPS-04|B22-01;B28-06;B29-03|Retry de fatos e anexos com mesma identidade;backup verificado separado|Sem restore integral,operação offline,humanos ou produção;A OPS-001aberto
""".strip()
details = {line.split("|", 1)[0]: line.split("|")[1:] for line in mapping.splitlines()}
inventory = read("01_PROCESS_INVENTORY.csv")
assert set(details) == {r["process_id"] for r in inventory}
scenarios = {}
for path in (root / "evidence").glob("b2*-results.json"):
    data = json.loads(path.read_text(encoding="utf-8"))
    for item in data["scenarios"]:
        assert item["execution"] == "EXECUTED", (path, item["id"])
        assert item["id"] not in scenarios
        scenarios[item["id"]] = "evidence/" + path.name
for values in details.values():
    assert all(s in scenarios for s in values[0].split(";") if s)

transitions = [row for row in read("02_PROCESS_TRANSITIONS.csv") if int(row["transition_id"][1:]) <= 88]
tmap = {
  1:"B27-02",2:"B26-12;B27-06",3:"B27-09",4:"B26-12",5:"B27-02;B27-03",6:"B27-02",7:"B27-03",8:"B25-02;B28-01",9:"B27-09",10:"B27-04",
  11:"B24-06",12:"B24-04",13:"",14:"",15:"B22-01;B28-01",16:"B22-02",17:"",18:"B28-04",19:"B23-03;B28-03",20:"B22-06",21:"",22:"B23-04",23:"B28-04",
  24:"B22-04;B22-10",25:"B29-02",26:"B22-05;B22-06",27:"B22-05",28:"B22-06",29:"B22-08",30:"B22-10",31:"B22-09",32:"B23-01",33:"B28-03;B29-03",34:"B23-03",35:"B23-02",36:"B23-11",37:"B23-05",38:"B23-05",39:"B23-06;B27-07",40:"B27-07",41:"B23-06",42:"B23-07",43:"B23-07;B23-09",44:"B23-08",45:"B24-01",46:"B24-08",47:"B24-01;B24-03;B29-04",48:"B24-02",49:"",
  50:"B25-08",51:"B25-16",52:"B25-08;B25-12",53:"B25-09;B25-13",54:"B25-03",55:"B26-11",56:"B25-14;B25-17;B26-10",57:"B25-01;B25-13",58:"B25-10",59:"B25-10;B25-11;B25-15",60:"",61:"B25-04;B25-05",62:"B25-05",63:"B25-07",64:"B25-07",65:"",66:"B26-01",67:"B26-01;B26-06",68:"B26-05;B26-06",69:"B26-06",70:"B26-03",71:"B26-03;B26-04",72:"B26-09",73:"B26-08",74:"B26-02;B26-12",75:"",76:"B25-03;B28-04",77:"B23-11;B29-02",78:"B28-06",79:"B28-07",80:"B28-01;B28-05",81:"",82:"B28-02",83:"",84:"",85:"",86:"",87:"B27-07",88:"B22-01;B29-03"
}
notes = {
  13:"Guard/ausência de equivalência só em fonte;sem câmera real",14:"Autosave da aba em fonte e B1;sem nova assertion específica B2",17:"Resolução de extra em fonte;extra não resolvido testado separadamente",21:"Cancelamento semENTsó em fonte;cancelamento comENTfoi recusado",24:"Estados de emissão e draftcancelado executados;submit de draftpersistido não ensaiado isoladamente",25:"Aprovação total/corrida executadas;parcial/rejeição total em fonte",27:"Adquirido menos aceito e receipts pendentes;excesso recusado",32:"Emissão diretaexecutada;draftsubmit separado não ensaiado",43:"Devolução sem consumo funciona;consumo positivo falha42702 B2-004",47:"Referência obrigatória naUI,opcionalAPI/RPC;B2-005",49:"Capacidade ausente;necessidade de lote depende validação humana",55:"Estado final real é approved,sem statusconfirmed de BAL",57:"Guard esperado:agendado recusa;regime anterior aceita B2-009",59:"Rejeição e aprovação de reconto emrollback;destino stale impede rejeição B2-012",60:"Múltiplas semanas regularizadas só em fonte;simulaçãoB25-12provou atraso/transferência,não regularização multissemanal",65:"Flowexterno e revisãocompleta não executados B2",67:"Aprovação executada;rejeição de série só em fonte",69:"Transição defeituosa observada,ended_on não respeitado B2-013",75:"Ausência de check-in/out,não defeito da programação",79:"Dezquarantinebloqueiam11º;nenhuma expiração/limpeza executada",81:"Importação só em fonte/referência histórica;sem nova execuçãoB2",83:"Estados externos em fonte;zeroenvio real",84:"Guarda em fonte;sem contato incerto real com provedor",85:"A DB-002/006herdados;sem nova reprodução em lote",86:"WhatsAppreal não homologado;capacidade não executada",87:"Não há comando transversal;ENTparcial bloqueada,semaceite reatribuível",88:"RetryRPC/HTTP e seisE2Eselecionados;sem garantir offline"
}
for r in transitions:
    n = int(r["transition_id"][1:])
    cases = tmap[n]
    r["verification"] = "LEITURA_ESTATICA;TESTE_LOCAL_DELIMITADO;PERSISTENCIA" if cases else "LEITURA_ESTATICA;NAO_EXECUTADA_NESTA_B2"
    r["scenario"] = cases or "NAO_EXECUTADO_VER_LIMITES"
    r["evidence"] = ";".join(dict.fromkeys(scenarios[c] for c in cases.split(";") if c)) or r["evidence"]
    r["coverage_note"] = notes.get(n, "Execução dirigida dos cenários indicados;demais combinações não exauridas")
    if n == 55:
        r["to_state"] = "approved"
    if n in (61, 63, 64):
        r["from_state"] = r["from_state"].replace("pending", "reported")
    if n == 61:
        r["to_state"] = "reported"
    if n == 62:
        r["from_state"] = "reported consumption"
    if n == 65:
        r["to_state"] = "relato reported"
    if n == 47:
        r["guard"] = "Capacidade;motivo;saldo;referência validada apenas se fornecida naRPC/API;UIexige"
    if n == 27:
        r["guard"] = "Não exceder adquirido menos aceito menos receipts pendentes"
    if n == 28:
        r["effect"] = r["effect"].replace("validate_purchase_receipt", "credit_purchase_receipt")
    if n == 83:
        r["from_state"] = "pending/leased"
        r["to_state"] = "accepted/delivered/read/failed/uncertain"

extra = [
 (89,"P-REQ-06","archived","reopened,completedAtnull","cancelarENTvinculada","Admin autorizado","Aceiteprévio;cancelamento pendente","CONDICIONAL","Evento guarda arquivo/motivo anterior;sem apagar PDFhistórico","ResolverENTe decidir nova necessidade","B29-01"),
 (90,"P-OCC-02","confirmed","confirmed com resposta200a reject","confirmaccept:false","Outro admin autorizado","Primeira decisão já terminada","CONDICIONAL","Intenção oposta não aplicada;sucesso vazio B2-011","Consultar decisão vigente;compensação é separada","B29-05"),
 (91,"P-CAT-01","inativo comsaldo","consumo/contagem nova recusados","relatar/contar","Operador autorizado","Produto não ativo","PROIBIDA","Saldo/história preservados;falta percurso de destinação B2-007","Reativação explícita quando apropriada ou decisão de destinação","B24-06"),
 (92,"P-BAL-05","recontoactive/ciclocounted","assignmentinvalidated semsucessor","substituirpessoa no mesmo horário","Gestor de escala","Plantão mesmo intervalo;novo contador elegível","CONDICIONAL","Documento permanece submitted B2-014","Revisor designa reconto formal ao sucessor","B26-09"),
 (93,"P-BAL-05","recontosemcontadorválido","novoassignmentactive e contagemnova","assign_recount/revise","Revisor e contador sucessor","Versões e referência atuais","CONDICIONAL","Contador real muda;autor original permanece;review nova","Revisores distintos aprovam nova versão","B26-10;B26-11"),
 (94,"P-ACC-07","vínculoativo comtarefas","revogado e comandos403","membershipStatus","Admin local","Não ser último admin;escopo correto","CONDICIONAL","Outro paciente preservado;ENTparcial continua semsucessão","Encaminhar fatos futuros sem impersonação","B27-06;B27-07"),
 (95,"P-ACC-05","conviteaceito/vínculorevogado","reativação porretry recusada","accept_invitation","Titular anterior","Membershiprevoked","PROIBIDA","Convite antigo não restaura poder","Admin decide reativação explicitamente se apropriado","B27-08"),
 (96,"P-BAL-03","assignmentactive apósjanela","missed;próximoactive","process_bal_patient","Scheduler local","Clockde teste apósdeadline","CONDICIONAL","Atraso/originalDue preservados","Contagem atual regulariza conforme regra;sem retroativofalso","B25-12"),
 (97,"P-BAL-06","destinoalterado/origemválida","pending,decisãofalha stale target","refresh/decide_deferralreject","Família","Destino com versão nova","CONDICIONAL","Tarefa inválida permanece B2-012","Cumprir original;invalidar/novo pedido com decisão","B25-11"),
 (98,"P-NTF-01","avisonãovisto","visto sem ciência ouatendimento","mark_notification_seen","Titular doaviso","Aviso autorizado","LEGITIMA","Organiza aviso;zero movimento/ciência","Abrir progresso e agir conforme tarefa","B28-02"),
 (99,"P-REQ-06","REQnãoatendida","arquivo recusado","archive_requisition","Admin","Ainda semconclusão operacional","PROIBIDA","Nenhum arquivo falso","Atender porENTreal e depois decidir arquivo","B28-03"),
 (100,"P-DOC-02","anexoready","mesmoIDready","retrymesmachave/bytes","Autor autorizado","Hashidêntico","CONDICIONAL","Sem duplicararquivo/evento","Consultar mesmo anexo","B28-06"),
 (101,"P-DOC-02","anexoready","409conteúdodiferente","mesmachave/outrosbytes","Autor autorizado","Hashdiverge","PROIBIDA","Arquivo confirmado preservado","Nova intenção somente após conciliar original","B28-06"),
 (102,"P-REQ-04","concluídasemciência/exceção","ciênciaregistrada/exceçãomantida","acknowledgeexpress","Familiar elegível","Versãovigente","CONDICIONAL","Não apaga exigência de arquivo manual","Adminmotiva decisão posterior","B28-04")
]
base_fields = list(transitions[0])
for n,p,fr,to,action,actor,guard,kind,effect,recovery,cases in extra:
    transitions.append(dict(zip(base_fields,[f"T{n:03d}",p,fr,to,action,actor,guard,kind,effect,recovery,"LEITURA_ESTATICA;TESTE_LOCAL_DELIMITADO;PERSISTENCIA",";".join(dict.fromkeys(scenarios[c] for c in cases.split(";"))),cases,"Cenário transversal acrescentado na segunda passada;limites nos resultadosJSON"])))
assert len(transitions) == 102 and len({t["transition_id"] for t in transitions}) == 102

coverage, actors = [], []
role_rules = {
 "ACC":("Titular ou admin local conforme ação;global somente nos comandos de plataforma/proposta","Identidade titular/administrador legítimo","Admin local distinto para proposta global;último admin protegido","Titular dos dados ou administrador por capacidade;história conserva autoria","Titular conclui convite/login;admin local prepara trabalho;global não executa tarefa local"),
 "CAT":("Admin com catalog.manage e contexto do paciente","Admin define produto/unidade/apresentação","Admin confirma;unidade com história não reinterpreta","Leitor de catálogo do paciente;saldo pela capacidade de custódia","Operador escolhe material ativo;família resolve saldo remanescente"),
 "REQ":("Emissor comreq.create;família elegível e revisores por ação","Emissor relata necessidade semquantidadepedida","Ciência por elegível;atendimento pelo aceiteENT;arquivo porcapacidade","Leitor comreq.read no paciente","Família providencia/expede;destinatário recebe;família decide arquivo excepcional"),
 "COM":("Família/admin com capacidadeCOM específica","com.create;admin local autoaprova criação","com.approve/com.validate;receiptfamiliar podeaguardar validador","com.read no âmbito familiar;leitorREQ não ganhaCOM","Comprador adquire;recebedor informa;validador credita;expedidor preparaENT"),
 "ENT":("Expedidor habilitado;destinatário exato;conciliador poração","ent.create;origem/destino e pessoaelegível explícitos","Destinatáriorecebe/consente;reassign/cancel/resolve conforme capacidade","ent.read com escopo porpaciente;profissional vêfila própria","Destinatário confere;conciliador trata divergência;originalconsente cancelamento"),
 "STK":("Família/admin paraFAMILY;demais leem conforme custódia","stock.family.manage para avulsa;outros fatos viaCOM/ENT/BAL/consumo","Comando e referência de cada origem;nenhum saldo por edição direta","stock.family.read/team.read/transit conforme capacidade","Pessoa do fato seguinte;família resolve mínimo/trânsito e destino de inativo"),
 "BAL":("Contador capaz/designado;família/supervisão revisoras conforme política","Legado comcapacidade;agendado sóatribuição vigente","Revisores distintos porgrupo/count_version;família decide adiamento","bal.read no paciente;dados deescala conforme escopo","Contador conta;revisor aprova oudesignareconto;famíliaresolvecobertura/adiamento"),
 "OCC":("Relator comconsumption.report;confirmador da custódia","Autor relata semdébito;Flow só sugere antes derevisão","stock.family.manage paraFAMILY;consumption.confirm paraTEAM","Consulta autorizada porpaciente/custódia","Confirmador valida;autor esclarece seestrutura insuficiente;falta não debita"),
 "SCH":("Gestor equipe/própria ouproponente com capacidade específica","Tipo e séries porgestão;proponente solicita mudança","Gestor decide/revalida versão/corte;família decide adiamentoBAL separado","schedule.read.own/team conforme capacidade econtexto","Pessoa programada e revisorBAL;programação não prova comparecimento"),
 "DOC":("Autor e leitor comcapacidade do tipodocumental","Emissão por domínio;anexo por leitorautorizado","Banco sela versão;serviço validaanexo;autoridade revalidada no comando","Capacidade do documento/custódia;PDF privado;verificação pública mínima","Próxima pessoa vem do estado dedomínio;anexo/PDF não altera estoque sozinho"),
 "NTF":("Política/worker;destinatário vigente;serviço validado","Evento enfileira porregra epreferência","Worker/webhook correlaciona;ciência/aceite exigem contratos próprios","Titular doaviso e leitorautorizado do documento","Destinatário abreaplicativo e executa sua ação;incerto externo exige conciliação"),
 "OPS":("Família/admin local e participantes conforme domínios","Responsável organiza preparo/continuidade","Autoridade porpaciente/capacidade continua em cada comando","Somente vínculos e fatos autorizados;global não agrega poderimplícito","Responsável nomeado para pendência,recuperação e reconciliação física")
}
for row in inventory:
    pid = row["process_id"]
    cases, conclusion, limits = details[pid]
    ts = [t["transition_id"] for t in transitions if t["process_id"] == pid]
    proof = ";".join(dict.fromkeys(scenarios[c] for c in cases.split(";") if c))
    row["verification"] = "LEITURA_ESTATICA;TESTE_LOCAL_DELIMITADO;PERSISTENCIA" if cases else "LEITURA_ESTATICA;SEM_EXECUCAO_NESTA_B2"
    row["evidence"] = row["report"] + (";" + proof if proof else ";evidence/source-hashes.json")
    if pid in ("P-BAL-01", "P-BAL-05"):
        row["states"] = "draft;submitted;approved;reconto formal"
        row["final_states"] = "approved;reconto formal necessário"
        row["exit_condition"] = "approved ou nova contagem necessária;sem comando geral de rejected"
    if pid in ("P-OCC-01", "P-OCC-02"):
        row["states"] = "reported;confirmed;rejected"
        row["input_state"] = "não relatado" if pid.endswith("01") else "reported"
        row["exit_condition"] = "Relato reported sem débito" if pid.endswith("01") else "Decisão confirmed/rejected e movimento apenas deconsumo aceito"
    if pid == "P-OCC-01":
        row["documents_and_data"] = "consumption_reports;ledger somente após confirmação;sem outbox gerado peloRPCde relato examinado"
        row["effect_on_stock_or_documents"] = "Relato não debita;falta confirmada também não produz consumo"
    if pid == "P-NTF-02":
        row["states"] = "pending;leased;accepted;delivered;read;failed;uncertain;cancelled"
    if pid == "P-ACC-01":
        row["source_chain"] = "src/components/auth/login-form.tsx;src/app/login/page.tsx;src/app/api/context/route.ts;src/lib/server/api.ts"
    if pid == "P-ACC-10":
        row["source_chain"] = "src/app/api/profile/route.ts;src/lib/server/api.ts;08_IDENTITIES_MEMBERSHIPS_ADMIN_AUDIT.md"
    if pid == "P-REQ-01":
        row["gaps"] = "Estoque não observado e zero convergem B1-FORM-001;rascunho da aba B1-UX-005"
    coverage.append(dict(process_id=pid,subgroup=row["subgroup"],implementation=row["implementation"],semantic_reconstruction="SIM_COM_LIMITE_EXPLICITO",transitions=";".join(ts) or "CONSULTA_OU_COMPOSICAO_SEM_TRANSICAO_PROPRIA",actors="01_ACTORS_RESPONSIBILITIES_MATRIX.csv#"+pid,source_chain=row["source_chain"],local_scenarios=cases or "NAO_EXECUTADO_NESTA_B2",persistence=proof or "NAO_COMPROVADA_NESTA_B2",second_pass="SIM;contraprovas no relatório;B2.9/B2.10;limite por linha",conclusion=conclusion,limits=limits,report=row["report"]))
    responsible, initiation, completion, readers, next_actor = role_rules[row["domain"]]
    if pid == "P-ACC-04":
        initiation, completion, next_actor = "Admin local comconvite autorizado", "Admin emite/reemite/revoga;aceito não revoga membership", "Titular entra na própria conta,confirma e aceita"
    if pid == "P-ACC-05":
        initiation, completion, next_actor = "Titular com email confirmado correspondente", "Aceite verifica token,prazo,emissor e vínculo atual", "Admin confere papel e prepara primeiras tarefas"
    if pid == "P-ACC-07":
        completion, next_actor = "Admin revoga prontamente;último admin protegido", "Família/revisor resolve trabalho aberto semassinar pelo anterior"
    if pid == "P-REQ-04":
        completion, next_actor = "Familiar elegível registra modalidade prevista;sem receber material", "Expedidor/destinatário atendem;admin decide arquivo excepcional se concluída"
    if pid == "P-ENT-06":
        completion, next_actor = "Solicitante pede;destinatáriooriginal consente comfatos físicos;sem recusa/retirada atual", "Original concilia;caso revogado exige decisão de sucessão ainda ausente"
    if pid == "P-BAL-06":
        completion, next_actor = "Família/admin local decide;supervisão não substitui autorizaçãofamiliar", "Contador mantém janela original até decisão;destino novo precisa elegibilidade"
    if pid == "P-DOC-05":
        completion, next_actor = "Admin comimportação revisa dados conhecidos e fonte;sem movimentalmenteaceitar material", "Leitor consulta como histórico;arquivo/fonte não cria entrega"
    actors.append(dict(process_id=pid,responsible_roles=responsible,initiation=initiation,decision_or_completion=completion,authorized_readers=readers,authority=row["source_chain"],next_responsible=next_actor,exceptions=row["exceptions"],preservation="Identidade global distinta de papel local;capacidade do domínio e contexto revalidados;história preservada;sem autoridade pelo nome/flag"))

write("01_PROCESS_INVENTORY.csv", inventory)
write("01_PROCESS_COVERAGE.csv", coverage)
write("01_ACTORS_RESPONSIBILITIES_MATRIX.csv", actors)
write("02_PROCESS_TRANSITIONS.csv", transitions)
(root / "evidence/process-catalogue.json").write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
(root / "evidence/coverage-reconciliation.json").write_text(json.dumps({
    "processes":len(inventory),"domains":len({r["domain"] for r in inventory}),
    "with_directed_local_cases":sum(bool(details[r["process_id"]][0]) for r in inventory),
    "static_only_processes":[r["process_id"] for r in inventory if not details[r["process_id"]][0]],
    "transitions":len(transitions),"executed_transition_samples":sum(t["scenario"]!="NAO_EXECUTADO_VER_LIMITES" for t in transitions),
    "unique_directed_cases":len(scenarios),"limits":"Counts of coverage records,not full combinatorial coverage or human/provider acceptance"
},ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
print(json.dumps({"processes":len(inventory),"transitions":len(transitions),"directed_cases":len(scenarios)}))
