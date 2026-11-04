"""Canonical B2 findings and future acceptance criteria. Documentary writes only."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
findings = []


def add(number, title, domain, processes, nature, observed, expected, consequence,
        cause, cases, source, reproduction, limits, recommendation, alternatives,
        dependencies, decision, positive, negative, *, priority="P2", prior="Nenhuma causa equivalente identificada nos32A/35B1",
        novelty="NOVA_CAUSA_B2", evidence_class="TESTE_LOCAL;PERSISTENCIA;LEITURA_ESTATICA", severity=None):
    identifier = f"B2-{number:03d}"
    evidence = []
    for case in cases.split(";"):
        if case.startswith("B25-") and int(case.split("-")[1]) >= 15:
            file = "b25s-results.json"
        elif case.startswith("B2"):
            file = case[:3].lower() + "-results.json"
        else:
            continue
        if file not in evidence:
            evidence.append(file)
    findings.append(dict(id=identifier, title=title, domain=domain, processes=processes,
        priority=priority, nature=nature, status="ABERTO_DIAGNOSTICO_SEM_CORRECAO",
        novelty=novelty, current_behavior=observed, expected=expected,
        operational_consequence=consequence, probable_cause=cause,
        evidence=";".join("evidence/" + f for f in evidence), scenarios=cases,
        source=source, reproduction=reproduction, evidence_class=evidence_class,
        confidence="Alta para o comportamento delimitado;frequência/impacto humano não medidos",
        limits=limits, relation_A_B1=prior, recommendation=recommendation,
        alternatives=alternatives, dependencies=dependencies, decision=decision,
        future_acceptance_positive=positive, future_acceptance_negative=negative,
        acceptance_id="AC-" + identifier,
        priority_reason=severity or ("Pendência ou decisão operacional fica incompleta/inconsistente no estado demonstrado;sem bypass ou perda generalizada comprovados" if priority == "P2" else "Rastreabilidade/eficiência pode melhorar;fato central e saldo permanecem disponíveis"),
        product_sha="37cb7f85e96e551d6419871f94dd950712e2565b"))


add(1, "COM parcial não permite desistir formalmente do saldo não adquirido", "Abastecimento", "P-COM-03;P-COM-04;P-COM-05;P-STK-04", "LACUNA",
    "Aprovado10/adquirido2/recebido2 permanece partially_received;cancelamento com motivo é recusado;restante8sem decisão terminal",
    "Registrar desistência do restante não adquirido preservando o que foi adquirido/recebido",
    "Família conserva previsão e pendência digital que já decidiu não executar;abrir novaCOM não encerra a anterior",
    "Cancelamento protege fatos físicos,mas não há transição específica para saldo aprovado não adquirido",
    "B22-09", "evidence/contracts/audited_legacy_supply_command.sql;evidence/contracts/credit_purchase_receipt.sql",
    "EmitirCOM10;adquirir2;validar chegada2;tentar cancelar pelo motivo de desistência dos8;consultar linhas/estado",
    "Sem corrupção de saldo;recebimento parcial não encerra prematuramente COM,hipótese contrária refutada emB22-06",
    "Definir encerramento motivado do remanescente por linha,com versão e efeito explícito na previsão",
    "Dispensa justificada do saldo;revisão de intenção remanescente sem reescrever linhas anteriores;manter aberto com rótulo de bloqueio enquanto contrato não decidido",
    "CicloCOM;receipts;previsões;concorrência;O02", "Quem dispensa/reabre e como distinguir não adquirido de adquirido ainda esperado?",
    "Com10→2,encerrar8retira apenas previsão correspondente,conserva estoque2,receipts e eventos;tentativa repetida recupera mesma decisão",
    "Não inventar compra,entrada,devolução,atendimentoREQ ou apagar aquisição válida;recusar versão antiga e encerramento concorrente ao fato físico")

add(2, "Pedido de cancelamento ENT não tem recusa ou retirada formal", "Entrega", "P-ENT-06;P-REQ-05", "LACUNA",
    "Depois de aceite positivo,cancellation_pending oferece apenas consent_cancel;reject_cancel é inválido;browser confirma única decisão de consentir",
    "Permitir resolver desacordo ou retirada sem obrigar destinatário a consentir em fato que contesta",
    "Documento pode ficar suspenso indefinidamente;conclusãoREQ relacionada também fica bloqueada",
    "Enumeração de comandos e formulário não modelam recusa/retirada nem retorno justificado de estado",
    "B23-08", "src/lib/validation/documents.ts;evidence/contracts/audited_legacy_supply_command.sql;evidence/b28-consent-only.txt",
    "ReceberENT;pedircancelamento;destinatário tenta discordar;examinar ação disponível e recusaRPC",
    "Não implica que cancelamento unilateral deva ser permitido;aceite prévio e estoque foram preservados",
    "Definir autoridade e transições de recusa/retirada,com motivo,versão e efeitos em REQ",
    "Começar por retirada antes do consentimento;encaminhar desacordo para decisão local explícita sem alterar material",
    "Consentimento;atendimentoREQ;B2-004;B2-015;O03", "Qual decisão cabe a cada pessoa e qual estado permanece após discordância?",
    "Recebedor recusa ou solicitante retira conforme política aprovada;pendência tem destino conhecido e evento próprio",
    "Sem estorno,aceite inventado ou cancelamento total unilateral;consentimento concorrente e dados obsoletos exigem revalidação",
    evidence_class="TESTE_LOCAL;PERSISTENCIA;LEITURA_ESTATICA;RENDERIZACAO")

add(3, "ENT aguardando consentimento fica fora da fila padrão de trabalho", "Entrega e continuidade", "P-ENT-06;P-DOC-04;P-NTF-01", "LACUNA",
    "Filtro padrão pending_receipt e tarefasdashboard omitem cancellation_pending;Todas mostra os documentos;profissional viu fila vazia apesar de duas pendências",
    "Pessoa responsável por consentir encontra essa tarefa no caminho usual de pendências",
    "Destinatário pode interpretar que não tem trabalho,prolongando cancelamento e bloqueioREQ",
    "Consultas e filtros selecionam recebimentos pendentes sem incluir outra ação relevante do destinatário",
    "B23-08", "src/components/documents/delivery-inbox.tsx;src/app/api/dashboard/route.ts;evidence/b28-professional-pending.txt;evidence/b28-professional-all.txt",
    "CriarENTaceita;solicitarcancelamento;abrir /entregas como destinatário no filtro inicial;compararTodas",
    "Não desaparecimento de dados;registro acessível em Todas/histórico;frequência humana não medida",
    "Incluir consentimento pendente em fila acionável ou filtro/tarefa explícita ligada ao alvo autorizado",
    "Ampliar estado pendente e identificar ação;atalho direto de notificação complementa,mas não substitui fila encontrável",
    "B2-002;B2-004;B2-015;consulta por capacidade;O04", "Fila única por ação própria ou grupo explícito de consentimentos?",
    "Destinatário vê pedido aberto na fila/painel;abrir leva ao documento exato;resolvido sai da fila",
    "Não mostrar consentimento a terceiro como tarefa executável;nenhum documento terminal ou sem capacidade vaza",
    evidence_class="TESTE_LOCAL;PERSISTENCIA;LEITURA_ESTATICA;RENDERIZACAO")

add(4, "ENT com consumo confirmado continua sem conseguir concluir cancelamento", "Entrega e consumo", "P-ENT-06;P-OCC-02;P-STK-04", "DEFEITO",
    "Aceitar2,confirmar consumo1 e consentir devolução1/consumo1 falha42702 por e.body ambíguo;nenhum efeito parcial persiste",
    "Conciliação válida reconhece devolução e consumo anterior sem duplicá-los",
    "Pedido permanece cancellation_pending apesar de fatos físicos coerentes e pessoa autorizada",
    "Referência SQL ambígua no ramo de consumo positivo impede atravessar conciliação",
    "B23-09", "evidence/contracts/audited_legacy_supply_command.sql;evidence/b23-results.json",
    "Usar consumo extraordinário realmente confirmado no próprio cenário após aceite2;tentar consent_cancel com retorno1/consumo1;comparar versão,eventos e saldo",
    "Atomicidade correta;subhipótese de vinculação temporal do consumo ficou atrás do erro e não foi comprovada;sem contorno artificial",
    "Corrigir contrato técnico em fase autorizada e verificar semântica de consumo elegível antes de liberar transição",
    "Preservar pendência com fato físico documentado;procedimento excepcional precisa autoridade e história,sem consumo ou devolução fictícios",
    "Auditoria especializada de banco/backend;consumo;referências;concorrência;O03", "Confirmar que somente consumo comprovado e elegível à entrega pode ser conciliado",
    "Retorno1/consumo1 conclui uma vez;eventos e consumo originais permanecem;retry não duplica movimentos",
    "Não debitar consumo novamente,não fabricar saldo e não aceitar soma diferente do aceito;erros não deixam efeito parcial",
    prior="A DB-001;mesma causa reexecutada com cadeia física e consequência operacional", novelty="REVALIDACAO_A")

add(5, "Correção de estoque familiar aceita ausência do movimento original", "Estoque", "P-STK-03;P-DOC-01", "DEFEITO",
    "Formulário exige referência,mas RPC e schemaHTTP a tornam opcional;correction_in sem referência grava family_manual/reference_idnull",
    "Correção compensatória aponta fato original válido ou é explicitamente classificada como entrada avulsa diferente",
    "Auditor não consegue reconstruir qual erro foi compensado;controle prometido no fluxo não é imposto na fronteira",
    "family_stock_movement valida p_reference apenas quando não nulo;API repassa null",
    "B24-03;B29-04", "src/app/api/stock/movements/route.ts;evidence/contracts/family_stock_movement.sql;src/components/stock/stock-console.tsx",
    "Enviar correction_in como admin autorizado omitindo referenceId porRPC e HTTP;consultar movimento persistido",
    "Não bypass de permissão;entrada familiar avulsa já é legítima;HTTP201 comprovado,read-back retomado sem snapshot anterior",
    "Alinhar validação por ação e exigir vínculo de compensação naAPI/banco,com mensagem de recuperação",
    "Separar claramente ajuste inicial/avulso de correção e evitar rotular entrada sem referência como compensação",
    "Unidades/precisão;saldo;capacidade;O09", "Qual fato cada ação significa e quais referências podem receber compensação múltipla?",
    "Correção exige movimento da mesma residência/produto/escopo;origem e compensações são reencontráveis;avulsa legítima continua",
    "Recusar referência ausente,alheia ou inválida;sem editar/apagar ledger;sem arredondamento ou saldo negativo")

add(6, "Conversão de embalagem não conserva como a quantidade base foi obtida", "Catálogo e quantidades", "P-CAT-03;P-COM-01;P-ENT-01", "OPORTUNIDADE",
    "Lookup conserva apresentação/fator,mas linha emitida pelo wizard não guarda código,número de embalagens ou equivalência usada;metadata observada vazia",
    "Quando apresentação for usada,pessoa consegue conferir cálculo original depois que cadastro mudar",
    "Revisão posterior depende de memória/anexo;mesma quantidade base não explica dois pacotes ou vinte unidades soltas",
    "Conversão em scan atualiza quantidade,sem transportar proveniência ao payload emitido",
    "B24-05", "src/components/documents/supply-wizard.tsx;src/app/api/catalog/presentations/route.ts;evidence/b24-results.json",
    "Cadastrarfator10;consultar apresentação;emitirCOM20base;alterarfator12;inspecionar metadata da linha e consumidor scan",
    "Nenhuma leitura de câmera real;linha20foi enviada porRPC;ausência de proveniência no scanner é sustentada por fonte;saldo histórico não foi reinterpretado",
    "Avaliar snapshot opcional de apresentação usada e resumo explícito embalagens×fator=base",
    "Confirmar quantidade base manual com equivalência visível e anotação identificada;não criar módulo novo antes de necessidade",
    "B1-FORM-005;unidades imutáveis;precisão;O08", "Quais operações precisam guardar apresentação original para conferência?",
    "Dois pacotes×10mantêm20base e fator original depois de cadastro12;seleção manual sem código continua possível",
    "Sem converter unidade não equivalente,arredondar silenciosamente ou aplicar fator atual a documento passado",
    priority="P3", prior="Amplia B1-FORM-005 com proveniência operacional;causa de persistência distinta da gestão visual",
    evidence_class="TESTE_LOCAL_LOOKUP;PERSISTENCIA;LEITURA_ESTATICA_DO_CONSUMIDOR")

add(7, "Produto inativo com saldo não tem percurso próprio de esgotamento", "Catálogo e estoque", "P-CAT-01;P-STK-04;P-OCC-01;P-BAL-04", "LACUNA",
    "Inativar comFAMILY4/TEAM4 mantém saldo visível,mas novas linhas de consumo/BAL são recusadas por produto inativo;reativar funciona",
    "Inativação define o que fazer com saldo/tarefas remanescentes sem perder história ou presumir descarte",
    "Família pode precisar reativar cadastro para registrar fato real;inventário digital e retirada de uso ficam sem decisão explícita",
    "Flag de catálogo governa elegibilidade de novas operações,sem estado/processo de destinação do saldo existente",
    "B24-06", "evidence/contracts/admin_upsert_recipient_product.sql;evidence/contracts/report_extraordinary_consumption.sql;evidence/contracts/v3_create_supply_document.sql",
    "Criar saldo em ambas custódias;inativar;consultarvisibilidade;tentar consumo/contagem;reativar explicitamente",
    "Saldo não sumiu nem foi zerado;destino físico/humano não verificado;inativação em si pode ser regra desejada",
    "Definir significado de retirada de uso e oferecer prévia/encaminhamento do saldo,tarefas e eventual reativação",
    "Aviso e procedimento explícito podem bastar;ou estado de esgotamento com operações limitadas se a família precisar",
    "Política catálogo;unidade;BAL/consumo;O12", "Inativo bloqueia tudo ou permite apenas destinação dos remanescentes?Quem atesta o fato físico?",
    "Saldo e história preservados;destinação tem autor/motivo;lista informa inatividade;reativação é explícita",
    "Não zerar,somar a outro produto ou inferir consumo/descarte;não liberar uso novo indevido")

add(8, "Histórico de estoque não conduz igualmente às origens de recibo,BAL e consumo", "Estoque e história", "P-STK-05;P-DOC-04", "OPORTUNIDADE",
    "Movimentos têm reference_type/id de purchase_receipt,bal,consumption;ação de navegação do consumidor favorece reference_type=document",
    "Leitor autorizado identifica e consulta origem de cada fato sem copiar IDs entre telas",
    "Explicar variação de saldo exige cruzamento manual;fato existe,mas sua prova fica menos alcançável",
    "Renderização de referência trata documento genérico sem resolver todos os tipos de origem",
    "B24-01;B26-11", "src/components/stock/stock-console.tsx;evidence/contracts/stock_history.sql;evidence/contracts/credit_purchase_receipt.sql;evidence/contracts/apply_bal.sql",
    "Comparar referências dos créditosCOM/ajustesBAL/consumo com regra de links do histórico",
    "Não perda de referências nem falha de persistência;interação de todos os links não foi automatizada nesta B2",
    "Resolver origem por tipo e capacidade,com rótulo legível e retorno ao filtro existente",
    "Mostrar código/motivo sem link se não houver capacidade;completar detalhe de consumo em vez de novo painel",
    "B2-017;B1-UX-006;autorização da origem;O09", "Que detalhe cada público pode consultar sem ampliar acesso à família?",
    "Cada referência abre origem exata autorizada ou explica restrição;contexto e filtros são preservados",
    "Não tratar receiptIDcomo documentID,nem revelarCOM a leitor de equipe;nenhuma permissão inferida do link",
    priority="P3", prior="Relaciona B1-UX-006/A UX-009;novo recorte de navegação por origem do ledger",
    evidence_class="LEITURA_ESTATICA;PERSISTENCIA_DAS_REFERENCIAS")

add(9, "Supervisor pode aprovar a própria contagem no regime BAL anterior", "Balanço", "P-BAL-01;P-BAL-05", "DEFEITO",
    "BALlegado com revisão required/supervisor/any foi contado e aprovado pelo mesmo supervisor porRPC;agendado equivalente recusou42501",
    "Revisão manual prometida como independente exclui quem contou em todos os regimes",
    "A contagem pode receber ajuste aprovado sem segunda pessoa,apesar do controle exibido naUI",
    "Guard de identidade distinta examina balanceContext do regime agendado;modo anterior não possui esse contexto;UIoculta ação própria mas banco aceita",
    "B25-01;B25-13", "evidence/contracts/supply_document_command.sql;evidence/contracts/fluent_pre_shift_command.sql;evidence/contracts/audited_legacy_supply_command.sql",
    "Usar supervisor real com capacidade de contar;configurar required supervisorany sem ativação porplantão;criarBAL;tentaraprovar próprioID",
    "Sem override ou falsificação;regime agendado protegeu corretamente;optional não significa revisão manual própria",
    "Uniformizar regra de identidade do contador/revisor e versões reais de reconto emAPI/banco",
    "Conservar modo anterior com guard equivalente;decidir explicitamente exceções de política sem depender daUI",
    "Política capturada;count_version;reconto;backend/RLS", "A independência é universal ou há exceção explícita de política que precisa ser comunicada?",
    "Contador de qualquer versão não revisa a própria contagem nos modos aplicáveis;revisor distinto conclui e aplica uma vez",
    "Não remover regime para esconder defeito,não reutilizar aprovação antiga nem confundir optional com autoaprovação manual")

add(10, "Consumo só textual não pode ser complementado para confirmação", "Ocorrências e consumo", "P-OCC-01;P-OCC-02", "LACUNA",
    "Relato consumptioncom lines=[]é aceito e fica reported;confirmar falha structured confirmation required;não há complemento preservando encadeamento",
    "Relato que precisa debitar tem caminho para obter quantidades e decisão sem perder sua origem",
    "Rejeitar e redigitar são saídas parciais;confirmador não consegue concluir aquele relato quando apura a quantidade depois",
    "Contrato permite estrutura opcional no relato,mas confirmação exige linhas e não oferece ação de esclarecimento",
    "B25-04", "src/app/api/consumption/route.ts;evidence/contracts/report_extraordinary_consumption.sql;evidence/contracts/confirm_extraordinary_consumption.sql",
    "Relatar consumo só textual como profissional;confirmador autorizado tenta aceitar;examinar açõesAPI/UI e estado reported",
    "Proteção contra débito ambíguo é correta;falta sem linhas pode ser confirmada sem saída;não generalizar a todo relato",
    "Separar ocorrência sem débito ou criar complemento identificado;definir quem atesta quantidades",
    "Exigir estrutura no consumo que pretende débito;ou ligar relato estruturado substituto ao original sem editar texto passado",
    "B2-011;O05;capacidade/custódia;histórico", "Autor ou confirmador pode complementar e precisa nova confirmação do autor?",
    "Texto original continua consultável;quantidades têm autor/data;confirmação única após esclarecimento autorizado",
    "Não interpretar texto como débito automático,não apagar relato original nem permitir confirmação sem saldo/estrutura")

add(11, "Decisão oposta de consumo recebe sucesso sem ser aplicada", "Ocorrências e concorrência", "P-OCC-02;P-DOC-01", "DEFEITO",
    "Depois de confirmed,rejeição por outro admin retornaHTTP200/data:null e mantém confirmed;mesma decisão repetida também retorna sem nova saída",
    "Distinguir recuperação da mesma decisão de conflito de intenção contrária,informando fato vigente",
    "Segundo confirmador pode acreditar que rejeitou consumo ainda efetivo no estoque",
    "confirm_extraordinary_consumption retorna sem resultado/erro para todo estado diferente de reported,sem comparar decisão;UIinterpreta sucesso",
    "B25-05;B25-06;B29-05", "evidence/contracts/confirm_extraordinary_consumption.sql;src/app/api/consumption/route.ts;src/components/stock/consumption-console.tsx",
    "Confirmarrelatoestruturado;segundo admin envia accept:false porHTTP;relerstatus,movimentos e resposta",
    "Nenhum débito duplicado ou estorno;corrida simultânea oposta é risco não reproduzido aqui;prova sequencial suficiente para resposta contraditória",
    "Retornar resultado explícito da decisão e conflito em intenção oposta;preservar idempotência da mesma intenção",
    "Exibir decisão vigente ao reconsultar e impedir feedbackdeoperação concluída para intenção não aplicada",
    "Backend/API;UXfeedback;O05", "Se fato confirmado estava errado,qual procedimento compensatório separado deve ser usado?",
    "Retry igual recupera autor/data/decisão;oposto retorna conflito legível com estado atual;zero novo movimento",
    "Não alternar confirmed/rejected retroativamente,não estornar silenciosamente e não chamar rejeição de realizada")

add(12, "Adiamento BAL obsoleto permanece pendente e nem pode ser recusado", "BAL e escala", "P-BAL-06;P-SCH-05;P-NTF-01", "DEFEITO",
    "Atualizar nota/version do destino deixa deferralpending com origem válida;refreshnãoinvalida;decide reject também falha stale target;contagem posterior torna stale",
    "Pedido inválido sai da fila ou admite rejeição segura sem aplicar destino antigo",
    "Família recebe tarefa que não consegue decidir;pedido pendente não suspende prazo original",
    "process_bal_patient retorna ao encontrar atribuição original válida antes de limpar destino obsoleto;decisão valida alvo até para rejeição",
    "B25-11;B25-13", "evidence/contracts/process_bal_patient.sql;evidence/contracts/balance_command.sql",
    "Pediradiamento;alterarapenasnota do plantãodestino;refresh;famíliatentarejeitar;compararestado e prazo",
    "Não houve adiamento indevido;origem continuou válida;obsolescência limpa após contagem;sem prova de todas corridas do scheduler",
    "Reconciliar validade antes de publicar tarefa ou permitir recusa independente do destino,com evento de motivo",
    "Marcar stale prontamente e solicitar novo pedido;preservar cumprimento original enquanto família decide",
    "B2-014;scheduler;versões;O06", "Pedido stale deve encerrar automaticamente ou exigir ciência/decisão familiar informada?",
    "Mudança de destino obsoleta pedido,retira ação inexequível e conserva prazo original;aprovação antiga recusada",
    "Não aplicar intervalo antigo,não adiar por mudança de agenda nem apagar solicitação histórica")

add(13, "Aprovação posterior republica plantões além do corte da série", "Escalas", "P-SCH-02;P-SCH-03;P-BAL-03", "DEFEITO",
    "Propor,end_series e aprovar versão atual muda ocorrências cancelled após corte para published enquanto ended_on permanece",
    "Aprovação respeita corte ou recusa série já encerrada;histórico de programação continua coerente",
    "Volta a haver cobertura programada que gestor havia encerrado;possível efeito futuro em atribuiçãoBAL",
    "Ramo approve atualiza ocorrências propostas/canceladas sem impor limite ended_on",
    "B26-06", "evidence/contracts/schedule_command.sql;src/lib/validation/schedules.ts",
    "Propor3plantões;encerrar a partir dosegundo;aprovar com versão atual;consultar ended_on,status e ocorrências",
    "Sequência aceita porAPI/RPC;UI atual só oferece encerrar série publicada;BALderivado não reproduzido;sem alegação de presença",
    "Revalidar estado/corte ao aprovar e manter eventos de decisão;apresentar impacto antes da confirmação",
    "Recusar aprovação de encerrada e exigir nova série explícita;ou publicar apenas até corte se a política permitir",
    "A UX-001/B1-UX-001P1;BAL;concorrência;O06", "Encerrada pode aprovar parte anterior ou deve ser terminal para proposta?",
    "Após corte nenhum plantão futuro volta a published por aprovação repetida/concorrente;versão e motivos mantidos",
    "Não apagar cancelled,desfazer corte silenciosamente ou gerar responsabilidadesBAL sobre ocorrências indevidamente restauradas",
    prior="A DB-003;revalidação local e consequência sobre expectativa de cobertura", novelty="REVALIDACAO_A")

add(14, "Substituição durante reconto pode deixar tarefa sem contador executável", "Escala e balanço", "P-SCH-05;P-BAL-04;P-BAL-05;P-OPS-02", "LACUNA",
    "No reconto formal de ciclo counted,troca de pessoa no mesmo horário invalida assignment e refreshnão cria sucessor;assign_recount por revisor recupera",
    "Troca torna explícita a necessidade e o responsável por designar novo reconto,ou transfere em condições formalmente seguras",
    "BAL permanece submitted até revisor perceber que substituto não tem atribuição executável",
    "Revalidação invalida pessoa anterior;processamento sai do ciclo counted sem transferência prevista no ciclo open",
    "B26-09;B26-10;B26-11", "evidence/contracts/process_bal_patient.sql;evidence/contracts/balance_command.sql;evidence/contracts/bal_assign.sql",
    "Manter recontoactiveem ciclojácounted;substituirprofissionalmesmaintervalo;refresh;consultarassignment;revisordesigna outro;substitutoconta",
    "Não generalizar a ciclo open/draft;recuperação manual existente funcionou;não demonstrada perda definitiva de contagem",
    "Exibir impacto e encaminhar tarefa de nova designação ao revisor;automatizar só após regra de sucessão definida",
    "Aviso com link assign_recount já existente;transferência explícita do revisor sem alterar autor original",
    "B2-012;B2-015;UXdecisão;O06/O07", "Transferir automaticamente ou exigir revisor;como comunicar intervalo sem responsável?",
    "Substituto sabe se pode contar;revisor recebe ação precisa;novo contador e autor original preservados;review por versão",
    "Não permitir contador anterior revogado,nem transferir assinatura,horário ou revisão familiar implicitamente")

add(15, "Revogação de recebedor de ENT parcial não possui sucessão formal", "Pessoas e custódia", "P-ACC-07;P-ENT-05;P-ENT-06;P-OPS-02", "LACUNA",
    "Revogação remove acesso corretamente;ENTsem aceite reatribui,mas parcial não admite reassign,aceite administrativo ou consentimento do sucessor",
    "Retirar acesso prontamente e encaminhar conciliação dos fatos futuros a pessoas identificadas,sem assinar pelo anterior",
    "Recebimento restante/cancelamento pode ficar bloqueado depois de desligamento legítimo",
    "Consentimento e reatribuição protegem pessoa original;falta processo para transferência documentada de responsabilidade futura",
    "B27-05;B27-06;B27-07;B27-08", "evidence/contracts/admin_set_membership_status.sql;evidence/contracts/audited_legacy_supply_command.sql;evidence/contracts/accept_invitation.sql",
    "PrepararENTparcialcom1aceito/1transito;revogarrecebedor;tentarreassign/aceiteadmin/consentsucessor;compararENTsemaceite e outropaciente",
    "Salvaguardas corretas;sem apagamento;profissional fictícia foi reativada só para outros testes,não como solução universal;compensação física exige decisão humana",
    "Inventário de tarefas ao desligar e contrato explícito de sucessão de conferências futuras,com conciliação excepcional quando necessária",
    "Prévia/lista de pendências e decisão local com evidência;termo de transferência sem reescrever aceite original",
    "B2-002;B2-004;B2-014;autoridade porpaciente;O07", "Quem atesta restante físico após saída e quem autoriza sucessão de custódia?",
    "Revogação imediata preserva outro paciente e história;ENTparcial tem encaminhamento claro com identidades próprias",
    "Não atrasar revogação urgente,reativar silenciosamente,impersonar anterior,zerar saldo ou fabricar estorno",
    prior="Amplia B1-FORM-006 além do editor:consequência em trabalho parcial;causa de sucessão distinta")

add(16, "Reservas de anexo abandonadas esgotam o limite sem arquivos prontos", "Documentos e continuidade", "P-DOC-02;P-OPS-04", "DEFEITO",
    "Dez reservas novas sem upload permanecem quarantine e consomem limite10;décima primeira é recusada;nenhum arquivo ready nesse alvo",
    "Tentativas abandonadas têm ciclo de recuperação/expiração que não bloqueia indefinidamente comprovante legítimo",
    "Pessoa pode perder capacidade de anexar evidência embora não existam dez anexos válidos",
    "Contagem do limite inclui reservas não rejeitadas,sem saída de abandono/expiração identificada",
    "B28-07", "src/app/api/attachments/route.ts;evidence/b28-probe.mjs;evidence/b28-results.json",
    "EmREQfictícia reservardezanexoscomchavesdistintassemupload;tentar11º;consultarestados",
    "Retry com chave conhecida consegue retomar;não executada limpeza,expiração ou sobrescrita;abandono por usuário simula interrupção antes de arquivo",
    "Definir ciclo de reserva com consulta por chave,prazo/abandono e retenção auditável compatível com upload concorrente",
    "Primeiro facilitar consulta/retomada;procedimento autorizado para reserva antiga até política implementada",
    "Storage/backend;B1-ERR-001;limites/abuso;O13", "Quando considerar abandono,quem pode cancelar e quais metadados permanecem?",
    "Reservas abandonadas não bloqueiam para sempre;retry idêntico e upload em andamento preservados;história da liberação verificável",
    "Não apagar ready,não expor URLassinada,não liberar reserva concorrente ativa e não aumentar limite sem tratar ciclo",
    prior="A DB-004 revalidado;B1-ERR-001 é consequência visual correlata,sem fundir causas", novelty="REVALIDACAO_A")

add(17, "Pendência antiga de consumo não é alcançada pelo contador ou referência", "Consumo e consulta", "P-OCC-01;P-OCC-02;P-DOC-04;P-NTF-01", "DEFEITO",
    "Após100relatosposteriores,alvoreportedfica fora daAPI(limit100),mesmo comref;dashboardmostra102pendentes;alvo permanece no banco",
    "Toda pendência autorizada e referência individual continuam recuperáveis além da janela recente",
    "Pessoa vê trabalho no painel/aviso,mas não encontra registro para decidir;acúmulo pode persistir indefinidamente",
    "Lista recente limitada foi usada como fila completa;sem cursor/status/detalheID;consumerignora ref",
    "B29-06", "src/app/api/consumption/route.ts;src/components/stock/consumption-console.tsx;src/lib/notifications/navigation.ts;src/app/api/dashboard/route.ts",
    "Relatarfaltapendente;criar100posterioressemdebitarestoque;GETcomref;compararcontador e SQLdoalvo",
    "Sem perda de dados;UIcemlinhas não foi renderizada;navegação estática acompanha API;novo loteB2executado comAuthreal",
    "Fila paginada/filtro de pendentes e detalheIDautorizado;resolverrefindependente da página atual",
    "Priorizar pendentes com navegação completa e explicar janela;suporte autorizado localiza até correção,sem alterar saldo",
    "Backend/consulta;B1-UX-007;A BE-004 correlação,escopo distinto;O04/O09", "Quais filtros/ordenação atendem família sem esconder pendentes antigas?",
    "Maisde100relatos:refabre alvo correto,cursor sem salto/duplicação,total/escopo claro;estado atual fica acionável",
    "Sem carregar tudo,duplicar registros,expor outra custódia/paciente ou resolver falta por débito;limite maior sozinho não satisfaz",
    prior="A BE-001;B1-UX-007;execução de volume independente nestaB2", novelty="REVALIDACAO_A")

fields = list(findings[0])
assert len(findings) == 17 and len({f["id"] for f in findings}) == 17
with (root / "13_FINDINGS_MASTER.csv").open("w", encoding="utf-8", newline="") as stream:
    writer = csv.DictWriter(stream, fields, quoting=csv.QUOTE_ALL, lineterminator="\n")
    writer.writeheader()
    writer.writerows(findings)
(root / "evidence/findings-canonical.json").write_text(json.dumps(findings, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

lines = ["# Registro mestre de achados B2", "",
         "17 achados: oito defeitos,sete lacunas e duas oportunidades. Quinze P2 e dois P3.",
         "Treze causas/recortes novos em B2 e quatro revalidações A (DB-001,DB-003,DB-004,BE-001).",
         "Alguns novos recortes ampliam B1 e estão relacionados individualmente. Não se somam",
         "os67achados históricos como se fossem descobertas novas. Nenhum achado foi corrigido.", "",
         "P2 indica interrupção/inconsistência operacional delimitada, sem inferir perda generalizada",
         "ou bypass. P3 indica benefício de rastreabilidade/eficiência. P1 herdados A UX-001 e",
         "DB-002 continuam dependências separadas;B2 não altera o parecer A NO-GO.", "",
         "A [versãoCSV](13_FINDINGS_MASTER.csv) conserva todos os atributos e permite filtragem.",
         "Cenários são identificadores dentro dosJSON;testes do auditor não são correções ou",
         "testes de aceitação futuros implementados. A frequência humana permanece não medida.", "",
         "| ID | Questão | Prioridade | Natureza | Origem |", "| --- | --- | --- | --- | --- |"]
for f in findings:
    lines.append(f"| {f['id']} | {f['title']} | {f['priority']} | {f['nature']} | {f['novelty']} |")
for f in findings:
    evidence_links = ", ".join(f"[{Path(path).name}]({path})" for path in f["evidence"].split(";"))
    lines += ["", f"## {f['id']} — {f['title']}", "",
              f"**Domínio/processos:** {f['domain']}; {f['processes']}. {f['priority']}, {f['nature']}; diagnóstico aberto.", "",
              f"**Hoje:** {f['current_behavior']}.", "",
              f"**Esperado:** {f['expected']}. **Consequência:** {f['operational_consequence']}.", "",
              f"**Causa sustentada:** {f['probable_cause']}. Prioridade: {f['priority_reason']}.", "",
              f"**Prova:** {evidence_links};cenários {f['scenarios']}. Classe: {f['evidence_class']}.", "",
              f"**Rastreio:** `{f['source']}`.", "",
              f"**Reprodução:** {f['reproduction']}.", "",
              f"**Limites/contraprova:** {f['limits']}. {f['confidence']}.", "",
              f"**Relação histórica:** {f['relation_A_B1']}; {f['novelty']}.", "",
              f"**Recomendação para fase autorizada:** {f['recommendation']}. Alternativas: {f['alternatives']}.", "",
              f"**Dependências:** {f['dependencies']}. **Decisão:** {f['decision']}", "",
              f"**Aceite futuro {f['acceptance_id']}:** {f['future_acceptance_positive']}.", "",
              f"**Não pode ocorrer:** {f['future_acceptance_negative']}."]
(root / "13_FINDINGS_MASTER.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

acceptance = ["# Cenários futuros de aceitação", "",
              "Especificações para uma implementação futura autorizada, não testes implementados",
              "nesta auditoria. CadaACremete à evidência atual do achado e ao comportamento que",
              "precisa ser preservado. Dados fictícios;Authreal;paciente/custódia explícitos;",
              "leitura de banco independente;história,versão e movimentos antes/depois.", "",
              "## Critérios por achado", ""]
for f in findings:
    acceptance += [f"### {f['acceptance_id']} — {f['title']}", "",
                   f"**Preparar:** {f['reproduction']}.", "",
                   f"**Resultado positivo:** {f['future_acceptance_positive']}.", "",
                   f"**Resultado proibido:** {f['future_acceptance_negative']}.", "",
                   f"**Decidir antes:** {f['decision']}", "",
                   f"**Limite atual a superar:** {f['limits']}.", ""]
acceptance += ["## Sequências de preservação entre processos", "",
              "| ID | Sequência futura | Prova positiva | Recusa/preservação exigida |", "| --- | --- | --- | --- |",
              "| AC-X01 | REQ arquivada→cancelarENT→devolver→reabrir | Necessidade atual e motivo anterior reencontráveis;PDF antigo idêntico | Nenhuma reescrita de arquivo ou débito fictício |",
              "| AC-X02 | Dois admins aprovamCOMv1simultaneamente | Uma decisão e um conflito legível | Sem duas versões aplicadas ou estoque por aprovação |",
              "| AC-X03 | Perda antes/depois decommit;recarga;revogação | Mesma chave/intenção recupera;alvo autorizado consultável | Sem multiplicar aceite;revogação não ignorada por idempotência |",
              "| AC-X04 | PolíticaBALmuda durante revisão | Documento conserva regra capturada e revisões porcount_version | Aprovação antiga não aplica contagem nova;contador não revisa a si |",
              "| AC-X05 | Troca de profissional entre pacientes | Outro contexto legítimo preservado;conflito agenda privado | Sem vazamento de nome/agenda ou poder global automático |",
              "| AC-X06 | Pausar regime com obrigação/reconto aberto | Pendência e atraso continuam visíveis/executáveis conforme regra | Sem apagar semanas ou voltar silenciosamente a modo anterior |",
              "| AC-X07 | Produto inativo/precisão/apresentação alterada | Destino do saldo e equivalência histórica verificáveis | Sem reinterpretar unidade ou arredondar;sem merge de identidades |",
              "| AC-X08 | Aviso visto→ciência→atendimento→arquivo | Cada fato tem responsável e evidência própria | Visto/leitura/despacho não se tornam aceite físico |",
              "| AC-X09 | Lifecycle com terminais antigos e vários pacientes | Lotes progridem entre todos elegíveis e não lembram canceladas | Sem monopólio por paciente ou cursor que salta trabalho |",
              "| AC-X10 | Provedor incerto/revogação/webhook tardio | Conciliação correlacionada e continuidade pelo aplicativo | Sem reenvio cego ou duplicar intenção humana;homologação externa autorizada |",
              "| AC-X11 | Interrupção e ficha física→retomada | Autor,fato e origem reconhecidos;restore integral aprovado | Sem importar ausente como zero,sem duplicar estoque ou identidade |", "",
              "## Aceitar ou abandonar propostas de produto", "",
              "O01–O20 têm medidas próprias no [catálogo12](12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md).",
              "Antes/depois precisa usar tarefas equivalentes e participantes dos públicos afetados.",
              "Medir erro de decisão,pedidos de ajuda,redigitação,tempo até localizar próxima tarefa e",
              "pendências sem agente. Não há meta percentual fundamentada nesta B2. O10 já possui",
              "capacidade parcial/adequada e não deve ser criado de novo;hipóteses só avançam após",
              "necessidade demonstrada. Benefício ausente ou risco maior justifica abandonar proposta.", "",
              "Nenhum aceite futuro está marcado como cumprido pela mera descrição. Gates humanos,",
              "aparelhos,provedores,restauração e produção dependem de autorização/ensaio próprios.", ""]
(root / "14_ACCEPTANCE_SCENARIOS.md").write_text("\n".join(acceptance), encoding="utf-8")
print(json.dumps({"findings": len(findings), "attributes": len(fields),
                  "nature": {n: sum(f["nature"] == n for f in findings) for n in {f["nature"] for f in findings}},
                  "priorities": {p: sum(f["priority"] == p for f in findings) for p in {f["priority"] for f in findings}}}))
