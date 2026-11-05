"""Reconcile living prose/precedence after the final C8 and C9 generation."""
from pathlib import Path
import csv
import io
import json
import re

ROOT=Path(__file__).resolve().parents[4]
C=ROOT/"docs/audits/C"
HERE=Path(__file__).resolve().parent


def read(path):
    with path.open(encoding="utf-8-sig",newline="") as stream:
        return list(csv.DictReader(stream))


def write_rows(path,rows):
    stream=io.StringIO(newline="")
    fields=list(dict.fromkeys(k for r in rows for k in r))
    writer=csv.DictWriter(stream,fieldnames=fields,lineterminator="\n")
    writer.writeheader();writer.writerows(rows)
    path.write_text(stream.getvalue(),encoding="utf-8",newline="\n")


def put(path,text):
    path.write_text(text.strip()+"\n",encoding="utf-8",newline="\n")


def section(path,heading,body):
    text=path.read_text(encoding="utf-8-sig")
    marker="\n## "+heading
    if marker in text:
        text=text[:text.index(marker)]
    put(path,text+marker+"\n\n"+body)


NARRATIVE = {
    "C3-functional-specification/REQ.md": """
P02 está **OWNER_APPROVED**. Fonte vinculante:
[política SCI-001–SCI-005](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md).
Manual expressa, diálogo antes de abrir e tácita por preferência anterior
expressa são configuráveis somente para obrigação informativa elegível.
Cabeçalho exposto não registra ciência. WhatsApp read é comunicação;
confirmação identificada futura depende de homologação do canal postergado.

A administração familiar define quem pode declarar no paciente. Uma ciência
válida de qualquer habilitado satisfaz a obrigação (ANY); equipe vê
“Família ciente”, sem atribuir evento a todos. Minha ciência permanece
pessoal. Sem habilitado, mostrar pendência de designação. Não exigir todos,
gerenciar conversas familiares ou concluir responsabilidade civil pelo estado.

SCI-005 é obrigatória/permanente/não configurável na expedição oficial de ENT
vinculada por ator familiar habilitado. Nunca em save/draft; não depende de
scienceByDispatch ou created_by. Não autoriza quem não representa a família
nem confirma recebimento/consumo.
[Divergências AS_IS](../C7-decision-closure/SCIENCE_AS_IS_TO_BE_ANALYSIS.md)
serão tratadas na D.

REQ material emitida permanece imutável; não se identificou editor autorizado
vigente. Estado, atendimento, resolução auditada de extra, ciência e histórico
são fatos separados. Versão técnica/eventos/PDF do mesmo conteúdo não
reinicia ciência. Não criar editor para justificar versões. Se alteração
material for autorizada futuramente: identidade nova, ciência própria,
agregado pendente e aviso pertinente, sem reescrever o passado.
""",
    "C3-functional-specification/ENT.md": """
SCI-005 é invariável na expedição oficial concluída por familiar habilitado:
REQ/material, ENT/versão, ator efetivo e instante. Nenhum toggle ou preferência
a desliga. Criador de draft não define o ator. Sem autoridade familiar, não
inventar ciência nem atribuí-la a terceiro; expedição legítima e pendência
familiar permanecem fatos separados. A
[política vinculante](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md) prevalece.

ENT-03 confirma recebimento pessoal com origem/destino/material/expedido/
unidade/recebedor/vínculos em leitura. Conferência integral é ação explícita,
não texto livre. ENT-04 edita somente a declaração própria de aceito/problema/
ressalva e mostra todas as linhas antes da confirmação. Conciliação tem
painel/capacidade próprios; não edita a expedição no aceite.

ENT-05 mostra consumo confirmado como referência calculada, não input de novo
débito. Motivo do pedido é leitura ao decidir; motivo da decisão é autoral.
""",
    "C3-functional-specification/COM.md": """
COM-02 lê origem, materiais, previsto e observações emitidos; aprovação e
aquisição abrem subformulários próprios. COM-03 distingue NOVA_CHEGADA
(quantidade inicialmente vazia/editável) de DECIDIR_PARCELA (quantidade,
autor e instante originais em leitura). Decidir não corrige a prova.
COM-04 calcula o dispensável na versão revista; não pede baixa fictícia nem
altera o previsto para fazer a conta fechar.
""",
    "C3-functional-specification/BAL.md": """
BAL-03 conserva valores/notas da contadora em leitura. Grupo, elegibilidade e
ator vêm da autoridade; parecer próprio do revisor não sobrescreve notas.
Revisão facultativa no primeiro uso. BAL-05 decide alvo/prazo congelados;
mudar destino exige preparar outro pedido, sem aprovar versão diferente.
""",
    "C3-functional-specification/SCHEDULES_AND_STAFFING.md": """
ESC-02 usa início+duração como base única de edição e mostra fim calculado
com data/+1 dia. Não manter duração/fim como inputs contraditórios.
ESC-03 apresenta fuso/pessoa/horários/motivo/notas do proponente e efeito BAL
em leitura. Só motivo próprio da decisão, quando exigido, é editável.
Corrigir proposta exige outro fluxo; aprovar aplica versão vista ou conflita.
ESC-01 consulta fuso configurado; selecionar datas não altera publicação.
""",
    "C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md": """
Motivo, ressalva e antes/depois em DOC-02/03 são descrições/comparações em
leitura. Falha pede atualizar seção, não corrigir fato histórico.
DOC-05 calcula bytes/assinatura/confiança separadamente; usuário não escolhe
Coincide/Confiável. DOC-04 não publica protocolo privado/paciente/material.
Reemissão sem mudança material não invalida ciência.
""",
    "C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md": """
Titular informa credencial; conferência familiar tem autor/instante
automáticos e resultado próprio. Validado externamente exige fonte comprovada,
nunca selo autoselecionado. Administração familiar concede capacidade de
ciência no paciente; ANY não exige todos.

Senha de login, nova senha, código de contato e TOTP são estados/controles
distintos. Login usa current-password; criar/trocar usa new-password.
TOTP atual tem seis dígitos e Auth oficial; QR de matrícula é privado, nunca
rascunho/log/screenshot. Destinatário/papel do convite são leitura no aceite.
""",
    "C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md": """
Ordem/precisão são inteiros, não textareas. Barcode é texto com zeros;
equivalência é calculada. Nova unidade tem nome/código/dimensão/âmbito/
precisão separados conforme /api/units; unidade usada não é reinterpretada.
Inativar conserva saldo/custódia; transferência é intenção independente,
nunca destino obrigatório ou efeito automático do cadastro.
""",
    "C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md": """
RAS-01 mostra conteúdo/etapa em resumo de leitura; continuar abre formulário
de origem, sem editor de payload/etapa serializados. RAS-02 compara campos e
exige revisão/save CAS sem fusão automática. ARQ-02 consulta arquivo/tentativa
fixos; não troca bytes sob a mesma intenção. Save/reconexão não confirmam atos.
""",
    "C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md": """
P02 está OWNER_APPROVED. Visto, push, envio, mensagem lida, abertura, ciência e
recebimento são distintos. SCI-003 não satisfaz ciência; SCI-004 futura exige
canal homologado. SCI-005 não aparece como opção desativável. Preferências
manual/dialogada/tácita só por obrigação elegível, sem opt-in implícito.
Tarefa interna não desaparece ao desligar push.
""",
    "C3-functional-specification/UI_STATES_AND_MICROCOPY.md": """
Fonte granular: C8 CONTROL_SCREEN_CONTRACTS.csv por tela/controle/estado.
READ_ONLY/CALCULATED/AUTO_FILLED são texto/comparação, não input disabled ou
aria-invalid. Falha de leitura pertence à seção com Atualizar.
EDITABLE_SUBFORM só aparece no estado/ator indicados; revisão/história não
herdam editor. INTERNAL/HIDDEN não entram no foco ou texto acessível.

B1 no catálogo de microcopy é referência histórica, não texto futuro
automaticamente aprovado. Não substituir strings por compartilharem uma linha
de código. Label, título, ação, vazio, sucesso e erro têm funções distintas.
Expressões dinâmicas usam presenter tipado. Placeholders só usam resultados
confirmados, sem chaves/enums/instruções técnicas na UI comum.
GET falho não é envio incerto; timeout não prova recusa. Parcial identifica
etapa real. Diálogo só para decisão/consentimento/descarte pertinentes;
filtros/avisos de seção não exigem diálogo. Contraste/reflow/AT/aparelhos
continuam provas do candidato D, sem aceite por linter.
""",
    "C4-technical-design/DATA_API_UI_EVENT_CONTRACTS.md": """
P02 OWNER_APPROVED: três modalidades informativas elegíveis, ANY familiar e
SCI-005 invariável. Na expedição oficial, resolver ator da sessão/evento,
nunca created_by/escala/nome/metadata; revalidar autoridade após locks.
Configuração/preferência não suprime SCI-005 para expedidor familiar
habilitado. Se evidência obrigatória não persistir, expedição elegível não
conclui parcialmente. PDF/aviso podem processar depois com resultado honesto.
Expedidor ENT legítimo sem representação familiar não ganha ciência; manter
pendência familiar sem atribuir ato a terceiro.

Persistir REQ/material, ENT/versão de expedição, ator/autoridade, origem,
instante e causa estável. Deduplicar causa, não cada linha. Várias linhas da
mesma REQ em uma ENT têm uma causa por REQ; expedições distintas conservam
provas próprias e express anterior. Separar obrigação pessoal e evidência
causal se a unicidade antiga REQ/pessoa não representar ambas sem perda.

ANY agrega ciência válida de autorizado na origem. Sem habilitado é pendente;
legado desobrigado não é evento pessoal nem Família ciente. Revogação não
apaga evento legítimo e vínculo novo não retroage tácita.
Versão técnica, conteúdo material e emissão PDF são identidades distintas.
Projeção material exclui atendimento/ciência/vínculo posterior/renderer.
Snapshot com lifecycle não é hash exclusivamente material. REQ não recebe
editor para justificar versão; alteração material futura autorizada exige
nova ciência/agregado/aviso, preservando M1.

D evolui schema incrementalmente, preservando 84 migrations/eventos
históricos e sem inventar backfill. app_visible antigo não se torna diálogo;
whatsapp_read futuro é comunicação; all antigo recebe compatibilidade
prospectiva sem exigir todos. SCI-004 continua gate externo sem ativação.
Payload de decisão não recebe campos de leitura como parâmetros editáveis.
Testar caminhos diretos Auth/RPC/RLS, não apenas DOM.
""",
    "C4-technical-design/SECURITY_PRIVACY_AND_TRACEABILITY.md": """
Administração familiar concede req.science/representação no próprio paciente;
preferência pessoal não concede capacidade. SCI-005 não usa identidade do
criador/recebedor para suprir expedidor sem autoridade. Revogado após espera
não escreve ciência nova; evento válido anterior conserva vigência/autor.
Decisão não admite alterar campos materiais da proposta congelada. Ausência
de input no DOM não é guarda de servidor. QR/segredo MFA e endpoint/chaves
push não entram em evidência pública/log/rascunho geral.
""",
    "C4-technical-design/MIGRATION_COMPATIBILITY_PLAN.md": """
D separa material/eventos/emissão e evidência causal por expedição, com ANY
familiar. Flags não desligam SCI-005; retirar created_by não retira
capacidade/estado. Preservar enum/eventos e nomes históricos, sem chamar
app_visible de diálogo ou inventar ciência na emissão para vinculado depois.
Migração incremental/compatibilidade/testes continuam trabalho técnico da D,
não escolha humana P02 em aberto.
""",
}


def update_narratives():
    for path in (C/"C4-technical-design").glob("*.md"):
        text=path.read_text(encoding="utf-8-sig")
        text=text.replace("P02 por SCI-ID, retenção, fornecedores e parâmetros operacionais continuam\ndelimitados em C7.", "P02 e SCI-001–SCI-005 estão OWNER_APPROVED. Retenção, fornecedores e\nparâmetros mantêm gates específicos, sem bloquear D0 geral ou D1 independente.")
        put(path,text)
    p=C/"C3-functional-specification/REQ.md"
    put(p,p.read_text(encoding="utf-8-sig").replace("P02 segue OWNER_REVIEW_REQUIRED por SCI-ID.", "P02 está OWNER_APPROVED pela ordem definitiva."))
    for path,body in NARRATIVE.items():
        section(C/path,"Fechamento definitivo — tarefa, estado e política",body)


def update_decisions_and_gates():
    for path in (C/"C5-execution-roadmap").glob("*.md"):
        text=path.read_text(encoding="utf-8-sig")
        text=text.replace("Nada de PR nesta C.", "Draft PR 6 reúne A–C; sem merge nesta missão.")
        text=text.replace("P02 por SCI-ID continua aberta", "P02 por SCI-ID está OWNER_APPROVED")
        text=text.replace("Matriz vigente:161", "Matriz vigente:187")
        text=text.replace("Flags novas para ciência,\ndraft/push ou interface simplificada são propostas técnicas e não existem por\nforça deste texto.", "Flags técnicas de rollout não podem transformar SCI-005 em opção de\ndesligamento. Se o efeito obrigatório falhar, não concluir parcialmente\nexpedição familiar elegível.")
        put(path,text)
    section(C/"C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md","Gates específicos após ordem definitiva","""
P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem início geral de D0
ou trabalhos independentes D1. Bloqueiam apenas implementação/homologação de
seus ramos, conforme
[matriz canônica](../C7-decision-closure/GATE_CLASSIFICATION.csv).
Documentação completa não aprova gate. P02 está OWNER_APPROVED.
Fornecedores/preços/contratações P03/P09/P13 são pesquisa externa do
responsável com ChatGPT, sem pesquisa comercial nesta missão.
Abrir branch D exige integrar previamente PR6 à master e autorizar missão D.
""")
    p=C/"C5-execution-roadmap/DEPENDENCY_SEQUENCE.csv"
    rows=read(p)
    for row in rows:
        row["decision_conditions"]=row["decision_conditions"].replace("P02:classificação individual SCI-001–005","P02_OWNER_APPROVED;technical_D2_only")
        if row["package"] in {"D0","D1"}:
            row["decision_conditions"]="Dez gates P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral/D1 independente; respeitar ramos; branch D só após integrar PR6 à master e autorizar missão"
    write_rows(p,rows)
    p=C/"C2-decisions/DECISIONS_REGISTER.csv"
    decisions=read(p)
    refinements={
        "O01":"Guia opcional configurável no primeiro acesso e reabrível pelo titular; wizard de criação/preparação de residência somente pelo global no primeiro escopo.",
        "O10":"Mesmo download preserva bytes/ID; nova emissão tem ID, solicitante, instante e assinatura técnica próprios, sem invalidar ciência do mesmo conteúdo material.",
        "DEC-018":"Verificar exemplar e bytes; assinatura incorporada do sistema P09-B é mínimo obrigatório; perfil/cadeia/certificado/custos mantêm gate D4.",
        "DEC-012":"Draft privado durável por usuário/paciente/tipo de criação e por alvo/intenção contextual; save sem ato oficial e sem TTL 90/180 dias aprovado.",
    }
    for row in decisions:
        if row["decision_id"] in refinements:
            row["scope"]=refinements[row["decision_id"]]
    write_rows(p,decisions)
    master=["# Decisões de produto e precedências","","Fonte vigente: ordem definitiva de 04/11/2026, America/Sao_Paulo.","[Ordem preservada](../audits/C/C10-pr-handoff/final-closure/OWNER_COMPLEMENT_ORDER.md).","Aprovação de produto não é implementação ou homologação. D NÃO INICIADA.","","## Política final e limites","","P02 está **OWNER_APPROVED**. [SCI-001–SCI-005 e ANY familiar](../audits/C/C7-decision-closure/SCIENCE_OWNER_REVIEW.md).","SCI-005 é obrigatória/permanente/não configurável, sem nova escolha humana.","P09-B é mínimo, P11 revisão facultativa, P12 um draft por criação/tipo e O01+","wizard global. O [adendo P01–P15](../audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md)","e a [matriz de gates](../audits/C/C7-decision-closure/GATE_CLASSIFICATION.csv)","registram as decisões e ramos. Objetivo aprovado com parâmetros pendentes","mantém OWNER_APPROVED_SCOPE_PENDING. OPS-01/PERF-01 têm escolhas humanas reais.","Nenhum dos dez gates impede D0 geral/D1 independente, mas seus ramos seguem","condicionados. Branch D só após integrar PR6 à master e autorizar missão D.","","Contratações/preços/fornecedores P03/P09/P13 são pesquisa externa do","responsável com ChatGPT. Sem pesquisa comercial nesta missão.","","## Decisões expressas conservadas","","Leitura humana do registro C2 com as precedências atuais aplicadas. Texto","anterior integral preservado nos","[inputs C10](../audits/C/C10-pr-handoff/final-closure/inputs/).","Auditorias A/B não foram reemitidas.",""]
    for row in decisions:
        if row["decision_id"].startswith("P"):
            continue
        master += ["### "+row["decision_id"]+" — "+row["title"],"","Estado: **"+row["status"]+"**.","",row["scope"],""]
    master += ["## Fontes estruturadas e contratos","","[Registro C2](../audits/C/C2-decisions/DECISIONS_REGISTER.csv),","[cruzamento](../audits/C/C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv),","[C3](../audits/C/C3-functional-specification/README.md),","[C8](../audits/C/C8-visual-blueprint/README.md) e","[aceites C9](../audits/C/C9-acceptance-refinement/README.md).",""]
    put(ROOT/"docs/decisions/PRODUCT_DECISIONS_MASTER.md","\n".join(master))
    put(C/"C2-decisions/HUMAN_DECISIONS_REVIEW.md","""
# Decisões humanas — estados vigentes

P02 está **OWNER_APPROVED**, inclusive cinco origens, três modalidades
elegíveis, ANY familiar e SCI-005 obrigatória/permanente/não configurável.
[Política vinculante](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md).

P03/P05/P07/P08/P09/P10/P13/P15 mantêm OWNER_APPROVED_SCOPE_PENDING.
OPS-01/PERF-01 conservam escolhas humanas PENDING_OWNER. Os dez gates não
impedem D0 geral/D1 independente; bloqueiam seus ramos e homologações.
[Matriz](../C7-decision-closure/GATE_CLASSIFICATION.csv) e
[detalhes](../C7-decision-closure/OPEN_DECISIONS.md).
Branch D exige integrar PR6 à master e autorização posterior. Documentação
não aprova gate. Pesquisa comercial P03/P09/P13 pertence ao responsável
externamente com ChatGPT; nada foi pesquisado/contratado nesta C.

As alternativas anteriores estão preservadas exatamente nos inputs C10;
não são uma lista de perguntas atuais a reconfirmar.
""")


def update_c8_indexes():
    out=C/"C8-visual-blueprint"
    counts=json.loads((out/"FINAL_REVIEW_COUNTS.json").read_text(encoding="utf-8"))
    cases=read(C/"C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    screens=read(out/"SCREEN_BLUEPRINTS.csv")
    for screen in screens:
        sid=screen["screen_id"]
        extra=[r["acceptance_id"] for r in cases if r["acceptance_id"].startswith("C-FINAL-") and "/screens/"+sid+".md" in r["source_specifications"]]
        screen["acceptance_ids"]=";".join(dict.fromkeys(screen["acceptance_ids"].split(";")+extra))
        p=out/"screens"/(sid+".md")
        text=p.read_text(encoding="utf-8")
        text=re.sub(r"Aceites (?:de domínio existentes|relacionados):.*?(?=Associação de domínio)","Aceites relacionados: "+screen["acceptance_ids"]+".\n",text,flags=re.S)
        put(p,text)
    write_rows(out/"SCREEN_BLUEPRINTS.csv",screens)
    overview=["# Especificação visual por tarefa e estado","","Direção HTML/oito PNG aprovada, sem protótipo equivalente recriado.","Especificação TO_BE; **D NÃO INICIADA**.","","66 fichas, 262 controles originais e 171 relações originais revistos.","Catálogo atual: 274 controles, 424 usos contextuais, 171 relações reconciliadas.","","## Precedência dos contratos","","Ficha define finalidade/ator/estado e os 24 pontos. Catálogo define identidade","do controle; CONTROL_SCREEN_CONTRACTS resolve cada screen_id/control_id:","modo, componente, condição, autoridade, default, validação, mensagem e foco.","EDITABLE_SUBFORM só é editável no estado/ator indicado; fora dele é leitura","ou oculto conforme a condição. Nunca herdar editor de criação na aprovação.","READ_ONLY/CALCULATED/AUTO_FILLED são texto, não input disabled; INTERNAL/HIDDEN","não entram no foco ou texto acessível.","","## Identidade aprovada e composição","","Teal #146c78, texto #19333d e papel #f4f7f8; superfícies claras/bordas suaves,","radius próximo de 14px e agrupamento 16–24px orientam o estilo. Desktop tem","navegação/contexto persistentes; tarefa/consequência antes de ajuda secundária.","Tipografia/contraste/reflow precisam de prova no candidato, sem reproduzir","texto decorativo minúsculo como requisito acessível.","","Móvel segue a tarefa em uma coluna, com quantidades/unidades/ações alcançáveis.","ENT usa cartões e não copia tabela que corta quantidade no exemplo móvel.","ADM prioriza tarefas antes de pilha de métricas; Mês preserva intervalo/lista.","Barra inferior/ações fixas não cobrem conteúdo, teclado ou foco.","","## Mensagens e estados","","Leitura falha atualiza seção; escrita incerta consulta mesma intenção;","confirmado não regride; parcial identifica etapas reais. Vazio só depois de","consulta válida. READ_ERROR não é FIELD_ERROR; output não pede Revise campo.","Diálogo só para decisão/consentimento/descarte pertinentes.","","Catálogo mantém 4.205 fontes B1 exatas como histórico. Não são automaticamente","copy futura. Substituição usa literal/contexto, nunca toda string na mesma","linha. Expressão dinâmica usa presenter tipado; novas mensagens têm condição","por tarefa/estado. Placeholders não expõem códigos/chaves e só usam fatos","confirmados.","","## Fichas revistas",""]
    overview += [f"- [{r['screen_id']} — {r['title']}](screens/{r['screen_id']}.md)." for r in screens]
    overview += ["","## Evidência e limites","","[24 dimensões](SCREEN_SEMANTIC_REVIEW.csv),","[controles](CONTROL_SEMANTIC_REVIEW.csv),","[relações](SURFACE_RELATION_SEMANTIC_REVIEW.csv) e","[fontes de texto](MICROCOPY_SEMANTIC_REVIEW.csv).","Revisão semântica e inspeção de referências não são implementação, aceite","humano, WCAG certificada ou homologação física; P10 permanece D6.",""]
    put(out/"VISUAL_BLUEPRINT_BY_SCREEN.md","\n".join(overview))
    put(out/"README.md","""
# C8 — revisão integral da especificação visual

**66 fichas, 262 controles originais e 171 relações originais revisados.**
Catálogo atual: **274 controles**, com 12 lacunas supridas, e **424 usos**
contextuais. Direção visual OWNER_APPROVED; telas não implementadas.

- [Fichas e composição](VISUAL_BLUEPRINT_BY_SCREEN.md).
- [Catálogo](FORM_CONTROL_CATALOG.csv) e [usos por estado](CONTROL_SCREEN_CONTRACTS.csv).
- [24 dimensões por ficha](SCREEN_SEMANTIC_REVIEW.csv),
  [controles revistos](CONTROL_SEMANTIC_REVIEW.csv) e
  [relações revistas](SURFACE_RELATION_SEMANTIC_REVIEW.csv).
- [Microcopy](UI_COPY_AND_MICROCOPY_MASTER.csv) e
  [revisão B1](MICROCOPY_SEMANTIC_REVIEW.csv).
- [Inconsistências corrigidas](FINAL_SEMANTIC_REVIEW_REPORT.md) e
  [componentes](COMPONENT_DECISIONS.md).
- [HTML aprovado](prototype/home-care-prototipo.html), preservado com oito PNG.

Dados atuais: final_closure_design_data.py, refinados pelo pipeline de
fechamento. Geradores iniciais isolados não devem sobrescrever a revisão.
Histórico exato em C10. Captura de referência não é aceite do produto futuro.
""")
    put(out/"VISUAL_OWNER_REVIEW.md","""
# Aprovações e limites da referência

Direção do HTML/oito PNG: **OWNER_APPROVED**, sem reconfirmação equivalente.
P02: **OWNER_APPROVED**, inclusive ANY familiar e SCI-005 invariável.
Nenhuma classificação SCI humana em branco.

66 fichas e 262 controles originais foram revistos. Detalhes técnicos novos
são especificação para D, não aceite de interface já implementada.
Processo/autoridade prevalecem sobre exemplos: cadastro global não pertence
à família, tabela não corta quantidade e revisão não herda edição.
P10 conserva homologação humana/física/AT/impressão D6. Linters, documento,
captura e emulação não aprovam esse gate.
""")
    findings=[
        ("C8-F01","EDITABILIDADE_HERDADA","REQ-02;COM-02;ENT-03","Editor da criação em revisão/consulta","Modos explícitos; conteúdo emitido/expedido em leitura"),
        ("C8-F02","PROPOSTA_MUTAVEL_NA_DECISAO","ESC-03;ADM-04;BAL-05","Fuso/notas/política/alvo editáveis ao decidir","Proposta congelada; só motivo próprio; versão revista ou conflito"),
        ("C8-F03","ETAPAS_MISTURADAS","COM-03;COM-04;ENT-05","Editar chegada ao validar; dispensa digitada; consumo já confirmado debitável","Chegada/decisão separadas; dispensável calculado; consumo como referência"),
        ("C8-F04","AUTORIA_ALHEIA","BAL-03;CON-03;CON-04","Notas/original reutilizados para outro autor","Original em leitura; parecer/complemento próprios"),
        ("C8-F05","RESUMO_COMO_INPUT","RAS-01;DOC-02;DOC-03;DOC-05;GUI-02","Payload/etapa/história/resultado como textarea/input; resumo de configuração editável","Resumo, passado e resultado em leitura; configuração abre subfluxo autorizado por link"),
        ("C8-F06","TIPO_INADEQUADO","ESC-02;CAT-01;CAT-02;CAT-03;ID-02;ID-04;ADM-02;GUI-03;ENT-03;ENT-04","58 tipos de componente inadequados; máscaras antigas de opções/busca herdadas em texto/grupos","Inteiros, códigos, arquivo/avatar, linhas e resultados tipados; apresentação por componente/estado e autocomplete correto"),
        ("C8-F07","ERRO_DE_CAMPO_IMUTAVEL","ALL_66_SCREEN_IDS","Revise aplicado a leitura/cálculo","Erro de seção distinto do input; interno sem mensagem/foco indevidos"),
        ("C8-F08","COPY_POR_LINHA","B1_4205_ROWS","150 propostas erradas por substituir título/botão/vazio/dado por mesma frase","Literal/contexto; presenter dinâmico; copy por estado"),
        ("C8-F09","RELACAO_ESPURIA","OVL-003;OVL-026;OVL-029;OVL-019;SC-030;OVL-013","Global/perfil, senha/push, cancelar/ciência, consulta/criação e variantes BAL","Duas removidas, cinco corrigidas e duas variantes adicionadas com rastro"),
        ("C8-F10","CAMPO_AUSENTE","ID-01;ID-02;CAT-02;REQ-03;ENT-01;ADM-03;NOT-02","12 lacunas de login/parecer/ciência/busca/unidade/MFA","12 controles próprios com condição, autoridade, validação e sigilo"),
        ("C8-F11","COMPOSICAO_MOVEL","ENT-03;ENT-04;ESC-01;ADM-01","Quantidade cortada, mês reduzido e métricas ocultando tarefa","Cartões rotulados, intervalo/lista, prioridade e foco alcançáveis"),
        ("P02-F01","DECISAO_SUPERADA","REQ-03;REQ-04;ADM-03;NOT-02","P02 pendente/all ainda sem decisão","OWNER_APPROVED, ANY e modalidades elegíveis; canais postergados"),
        ("P02-F02","GAP_AS_IS_PARA_D","ENT-01;REQ-03","scienceByDispatch mutável e auth.uid()=created_by no produto","Especificar invariável por ator efetivo; implementar só na D"),
        ("P02-F03","IDENTIDADE_MATERIAL","REQ-03;DOC-02;DOC-03","Invalidar por versão técnica/PDF e presumir editor","REQ imutável; conteúdo/evento/emissão separados"),
        ("GATE-F01","BLOQUEIO_GERAL","D0;D1;D4;D5;D6","Parâmetros/contratações como veto geral","Dez gates por ramo, nenhum aprovado pela documentação"),
    ]
    write_rows(out/"FINAL_REVIEW_FINDINGS.csv",[dict(zip(["finding_id","category","affected","before","corrected_specification"],r),classification="DOCUMENTARY_CORRECTION_OR_OWNER_SUPERSESSION;NOT_RUNTIME_FIX") for r in findings])
    report=["# Revisão semântica C8 — resultados","","66 fichas, 262 controles originais, 171 relações originais e os catálogos de","mensagens foram examinados contra C3/decisões/protótipo. Foram corrigidos","58 tipos de componente e 150 propostas de copy B1. Catálogo atual: 274 controles,","424 usos e "+str(counts["current_copy_rows"])+" linhas de texto, incluindo as 4.205 fontes B1 exatas.","Os números não são oráculo de qualidade; cada correção tem cenário positivo","e contraprova nos casos C-FINAL-AC, sem execução funcional nesta C.",""]
    for id_,category,affected,before,after in findings:
        report += ["## "+id_+" — "+category,"","Contexto: "+affected+".","","Antes: "+before+".","","Correção documental: "+after+".",""]
    report += ["## Confronto adversarial","","Revisão não herda edição; proposta não muda ao aprovar. Leitura falha","recupera pela seção/origem. ANY não inventa ciência de todos. SCI-005 não","concede capacidade nem substitui recebimento. Consulta, save, confirmado e","incerto têm mensagens/efeitos próprios. Não mostrar implementação ao usuário.","A implementação será provada na D; P10 e os gates específicos permanecem.",""]
    put(out/"FINAL_SEMANTIC_REVIEW_REPORT.md","\n".join(report))
    return counts


def update_acceptance_and_handoff():
    out=C/"C9-acceptance-refinement"
    put(out/"README.md","""
# C9 — aceites do fechamento definitivo

**187 casos de design**: 161 IDs anteriores preservados, 20 desses casos
refinados e 26 cenários discriminantes acrescentados. Todos
PLANNED_NOT_EXECUTED; não são testes escritos/executados nesta missão.

- [Matriz canônica](../C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv).
- [Casos completos](ACCEPTANCE_CASES.csv),
  [gates](C9_GAP_AND_DECISION_MATRIX.csv) e
  [alterações](FINAL_ACCEPTANCE_CHANGES.csv).
- [Estratégia](ACCEPTANCE_EXECUTION_BLUEPRINT.md) e
  [contraprovas](DISCRIMINATING_EXAMPLES.md).

P02 está OWNER_APPROVED sem classificação humana pendente. Trabalho técnico
D2 e homologação futura SCI-004 são condições distintas. Os dez gates são
específicos e não impedem D0 geral/D1 independente; branch D só após integrar
PR6 à master e autorizar D.

C-FINAL-AC-001–011: ciência/ANY/expedição/versões/dialogada/tácita.
012–024: controles, estado, autoria, mensagens e relações.
025: 66 tarefas em responsividade/acessibilidade e pessoas P10.
026: gates/autoridade. Todos têm dados, passos e oráculo independente.

DESIGN_READY indica especificação suficiente para o trabalho planejado, sem
provar execução ou liberar produto. DESIGN_READY_SPECIFIC_GATE_PENDING mantém
o ramo condicionado ao gate indicado; não bloqueia D0 geral/D1 independente.
""")
    p=out/"ACCEPTANCE_EXECUTION_BLUEPRINT.md"
    put(p,p.read_text(encoding="utf-8-sig").replace("os 161 casos","os 187 casos").replace("P02:classificação individual SCI-001–005","P02_OWNER_APPROVED;technical_D2_only"))
    section(p,"Casos finais e execução futura","C-FINAL-AC-001–026 acrescentam discriminantes P02/C8; 20 casos existentes\nrefinados e 161 IDs preservados. Todos PLANNED_NOT_EXECUTED. Controle válido\ndeve passar e contraprova falhar por razão própria na implementação D, sem\nresultado de execução fabricado nesta C.")
    p=out/"DISCRIMINATING_EXAMPLES.md"
    put(p,p.read_text(encoding="utf-8-sig").replace("## P02 por SCI-ID —","## P02 aprovada —"))
    section(p,"Contraprovas da ordem definitiva","A cria draft, B expede: ciência de B mesmo com flag legada false; save não\ngera ciência. Um habilitado satisfaz família sem ciência dos demais. ENT-03\nnão edita expedição; ESC-03 não edita fuso/notas da proposta; COM-03 não\nreescreve parcela ao validar; DOC-05 não permite escolher resultado.\nGET falho não é escrita incerta; readonly não pede corrigir fato. Casos\nC-FINAL-AC trazem dados, passos e read-back independentes.")
    for name in ["C6-acceptance-handoff/PHASE_D_IMPLEMENTATION_HANDOFF.md","C10-pr-handoff/PHASE_D_HANDOFF_UPDATED.md"]:
        p=C/name
        text=p.read_text(encoding="utf-8-sig").replace("contém161 critérios","contém187 critérios").replace("P02 individual permanece humana","P02 individual está OWNER_APPROVED")
        text=text.replace("causas,28 grupos de finalidade e12 complementos.", "causas,28 grupos de finalidade,12 complementos C7 e26 complementos definitivos.")
        text=text.replace("P02 por SCI-ID\n   bloqueia nova política","P02 por SCI-ID\n   está OWNER_APPROVED e não tem classificação humana pendente")
        put(p,text)
        section(p,"Gates por ramo e pré-condição da branch","P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral/D1\nindependente, mas seus ramos/homologações seguem condicionados pela\n[matriz canônica](../C7-decision-closure/GATE_CLASSIFICATION.csv).\nContratações P03/P09/P13 são pesquisa externa do responsável. Documentação\nnão aprova gate. Branch D somente após integrar PR6 à master e autorizar\nmissão D. C8 tem 274 controles/424 usos e C9 187 casos planejados.")
    for name in ["C7-decision-closure/SEMANTIC_CHANGE_REPORT.md","C6-acceptance-handoff/PHASE_C_FINAL_EXECUTIVE_REPORT.md"]:
        p=C/name
        text=p.read_text(encoding="utf-8-sig")
        note="> Relato intermediário preservado. Contagens/pendências referem-se ao\n> fechamento anterior. Estado atual no\n> [relatório definitivo C10](../C10-pr-handoff/PHASE_C_FINAL_PART2_REPORT.md)."
        if text.startswith("> Relato intermediário"):
            _,text=text.split("\n\n",1)
        if note not in text:
            heading,body=text.split("\n",1)
            text=heading+"\n\n"+note+"\n"+body
        put(p,text)
    p=HERE/"OWNER_MANDATE.md"
    text=p.read_text(encoding="utf-8-sig")
    if "## História da missão inicial" not in text:
        text="# Autoridade inicial e precedência definitiva\n\nA missão inicial abaixo é histórica e foi executada. Sua condição P02 pendente\nfoi superada pela [ordem definitiva](final-closure/OWNER_COMPLEMENT_ORDER.md).\nP02 agora OWNER_APPROVED, sem reconfirmação das escolhas respondidas.\n\n## História da missão inicial\n\n"+text
    before,tail=text.split("## História da missão inicial",1)
    if tail.lstrip().startswith("# Autoridade da missão"):
        tail=re.sub(r"(?m)^(#{1,4}) ",r"##\1 ",tail)
    text=before+"## História da missão inicial"+tail
    put(p,text)


def update_entry_points():
    for name in ["C2-decisions/README.md","C3-functional-specification/README.md","C4-technical-design/README.md","C5-execution-roadmap/README.md","C6-acceptance-handoff/README.md","C7-decision-closure/README.md"]:
        p=C/name
        if not p.exists():
            put(p,"# "+p.parent.name+" — entrada documental\n\nRegistro estruturado e cruzamento decisório no mesmo diretório.")
        text=p.read_text(encoding="utf-8-sig")
        text=text.replace("P02 está "+chr(96)+"OWNER_REVIEW_REQUIRED"+chr(96), "P02 está **OWNER_APPROVED**")
        text=text.replace("inventário concluído não equivale à\naprovação de modalidades", "modalidades e ANY foram aprovados pela ordem definitiva")
        text=text.replace("inventário concluído não equivale à\naprovação das modalidades", "as modalidades e ANY foram aprovados pela ordem definitiva")
        put(p,text)
        section(p,"Fechamento definitivo vigente","P02 OWNER_APPROVED. Revisão individual das 66 fichas e 262 controles\noriginais; catálogo atual de 274 controles/424 usos, 171 relações e 187 casos\nplanejados. [Relatório C10](../C10-pr-handoff/PHASE_C_FINAL_PART2_REPORT.md)\ne [política de ciência](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md).\nD NÃO INICIADA; gates específicos permanecem.")
    p=ROOT/"README.md"
    text=p.read_text(encoding="utf-8-sig")
    text=re.sub(r"O \[fechamento C7–C10\].*?O Draft PR documental não autoriza merge ou D\.", "O [fechamento definitivo C7–C10](docs/audits/C/C10-pr-handoff/README.md)\nregistra P02 OWNER_APPROVED, 66 fichas e 262 controles originais revistos.\nCatálogo atual: 274 controles/424 usos; 187 aceites planejados. Draft PR 6\npermanece para revisão, sem merge ou início D.", text,flags=re.S)
    put(p,text)
    for name in ["docs/README.md","docs/decisions/README.md","docs/audits/C/README.md"]:
        p=ROOT/name
        text=p.read_text(encoding="utf-8-sig")
        if name=="docs/decisions/README.md":
            text=text.replace("P02 segue\n[revisão individual]", "P02 está OWNER_APPROVED na\n[política definitiva]")
            text=text.replace("[Questões iniciais P01–P15]", "[Estados vigentes P01–P15]").replace("preservam deliberações anteriores", "registram as respostas atuais; versões anteriores estão arquivadas")
            put(p,text)
        relative={"docs/README.md":"audits/C/C10-pr-handoff/README.md","docs/decisions/README.md":"../audits/C/C10-pr-handoff/README.md","docs/audits/C/README.md":"C10-pr-handoff/README.md"}[name]
        section(p,"Fechamento definitivo de 04/11/2026","P02 OWNER_APPROVED; 66 fichas/262 controles originais revistos, catálogo de\n274 controles/424 usos e 187 casos planejados. [Entrega vigente]("+relative+").\nD NÃO INICIADA; sem merge. Gates específicos não são aprovados por documento.")
    p=ROOT/"docs/current/PROJECT_STATUS.md"
    text=p.read_text(encoding="utf-8-sig")
    start=text.index("**C7–C10 concluídas")
    end=text.index("<!-- c-table:start -->",start)
    text=text[:start]+"""**C7–C10 concluídas e fechamento definitivo incorporado em 04/11/2026.**
[Checkpoint](../audits/C/C10-pr-handoff/CHECKPOINT.md). As 121 causas e 165
origens permanecem reconciliadas. P02 está OWNER_APPROVED: SCI-001 mantida,
SCI-002 dialogada, SCI-003 comunicação, SCI-004 futura condicionada e
SCI-005 obrigatória/permanente/não configurável por ator efetivo habilitado;
ANY familiar sem exigir todos.

Revisão individual: 66 fichas, 262 controles originais e 171 relações.
Catálogo atual: 274 controles/424 usos; 187 casos planejados (20 refinados
entre os 161 anteriores e 26 novos), todos PLANNED_NOT_EXECUTED. Os 12
controles adicionais cobrem lacunas de estado, login/MFA/unidade e ciência.
Direção visual aprovada; nenhuma tela/política foi implementada por esta C.
Código/configuração/testes permanecem idênticos ao SHA de entrada
266c6541bd5d3268b7e08a839df601e823ec74b5; o reparo anterior de CI nesse SHA
é distinto desta missão documental. Base de aplicação permanece a auditada.

P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral/D1
independente; ramos e homologações seguem gates específicos. Contratações
P03/P09/P13 são pesquisa externa do responsável com ChatGPT. Abrir branch D
exige integração prévia do PR6 à master e autorização posterior.
Kit temporário continua removido; HTML/oito PNG e auditorias A/B preservados.
Draft PR não autoriza merge, cleanup de branches ou produção.

"""+text[end:]
    put(p,text)
    text=p.read_text(encoding="utf-8-sig")
    text=text.replace("comparação\n  de todos os arquivos não documentais contra baseline C0 no fechamento C.", "base de aplicação\n  src/supabase preservada; suporte e testes do reparo CI foram congelados em\n  266c654 e permanecem intactos nesta ordem complementar.")
    put(p,text)
    put(HERE/"PHASE_C_FINAL_PART2_REPORT.md","""
# Fechamento definitivo da Fase C

04/11/2026, America/Sao_Paulo. Ordem complementar incorporada na
audit/phase-b, Draft PR 6 para master. C0–C10 não foram repetidas.
Base de entrada: 266c6541bd5d3268b7e08a839df601e823ec74b5, com CI integral
aprovada na consulta inicial. Este novo candidato tem verificações próprias.

## Decisões registradas

P02 OWNER_APPROVED: cinco origens definidas, três modalidades informativas
elegíveis, ANY familiar e SCI-005 obrigatória/permanente/não configurável.
SCI-005 usa ator efetivo habilitado da expedição oficial, não created_by,
e nunca save/draft. Read WhatsApp é comunicação; confirmação futura depende
de homologação externa. REQ materialmente imutável; eventos/PDF não invalidam
ciência do mesmo conteúdo. [Política](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md)
e [confronto AS_IS](../C7-decision-closure/SCIENCE_AS_IS_TO_BE_ANALYSIS.md).

## Revisão visual executada

66 fichas, 262 controles e 171 relações originais individualmente revistos.
58 tipos de componente corrigidos, 150 propostas B1 corrigidas e 12 controles
ausentes adicionados. Catálogo atual: 274 controles, 424 usos por tela/estado,
171 relações reconciliadas e 6.479 linhas de copy, com 4.205 fontes B1 exatas.
As 24 dimensões de cada ficha estão no registro semântico. HTML e oito PNG
aprovados preservados, sem recriar protótipo equivalente.

Correções incluem ENT-03 sem edição de expedição, ESC-03 sem editar proposta,
COM-03 chegada separada de decisão, ENT-05 sem redebitar consumo, BAL-03 com
parecer próprio, RAS-01 sem editor de payload, DOC com histórico/resultados em
leitura e mensagens por etapa/certidão. Relações globais, de consulta e de
cancelamento foram corrigidas com rastro. Composição móvel evita cortes e
prioriza tarefa. [Achados e correções](../C8-visual-blueprint/FINAL_SEMANTIC_REVIEW_REPORT.md).
Isso é revisão de especificação, não correção funcional ou aceite humano.

## Aceites e coerência documental

161 IDs anteriores preservados; 20 casos refinados e 26 discriminantes novos,
total 187 PLANNED_NOT_EXECUTED. C2/C3/C4/C5/C7/C8/C9/C10, decisões, índices e
estado atual reconciliados. Não foram escritos/executados testes funcionais
novos nesta missão. [Alterações](../C9-acceptance-refinement/FINAL_ACCEPTANCE_CHANGES.csv).
121 causas/165 origens históricas conservadas, sem inflar defeitos com a
contagem de correções editoriais/decisórias.

## Gates e fronteiras

P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 não impedem D0 geral/D1
independente. Cada ramo/implementação/homologação mantém seu gate, nenhum
aprovado por completar documento. P03/P09/P13 terão pesquisa comercial
externa pelo responsável com ChatGPT; não houve pesquisa ou contratação.
P09-B permanece mínimo obrigatório; Meta/Flows/O17/O18 postergados.
[Matriz de gates](../C7-decision-closure/GATE_CLASSIFICATION.csv).

Branch D depende de integrar PR6 à master e autorização posterior. Sem merge,
branch excluída, código funcional/configuração/teste alterados, migration,
banco/ambiente remoto modificado, deploy deliberado ou início D.
Produção permanece NO-GO.

## Evidências e validação

Ordem exata, baseline e 213 documentos anteriores arquivados por hash/gzip em
final-closure. Auditorias A/B/C0, fontes/protótipo e não documentais preservados.
Resultados atuais em [validação documental](DOCUMENTARY_VALIDATION_REPORT.md)
e [checkpoint](CHECKPOINT.md). SHA final é o commit publicado que contém este
relatório; estado do PR/CI será informado na entrega, sem aguardar todos jobs.
""")
    put(HERE/"README.md","""
# C10 — fechamento definitivo e revisão do Draft PR 6

**P02 OWNER_APPROVED; C8 integralmente revista; 187 aceites planejados.**
66 fichas/262 controles/171 relações originais examinados. Catálogo atual:
274 controles, 424 usos por tela/estado; 20 casos refinados e 26 adicionados.

- [Relatório executivo definitivo](PHASE_C_FINAL_PART2_REPORT.md).
- [Checkpoint/publicação](CHECKPOINT.md) e [validação](DOCUMENTARY_VALIDATION_REPORT.md).
- [Ordem complementar](final-closure/OWNER_COMPLEMENT_ORDER.md) e
  [baseline exato](final-closure/evidence/BASELINE.json).
- [Política de ciência](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md),
  [gates remanescentes](OPEN_OWNER_GATES.md), [C8](../C8-visual-blueprint/README.md)
  e [aceites C9](../C9-acceptance-refinement/README.md).
- [Entrada futura D](PHASE_D_HANDOFF_UPDATED.md) e [revisão do PR](PR_REVIEW_CHECKLIST.md).

Ordem inicial/validações intermediárias preservadas nos arquivos/inputs
datados. A condição antiga P02 pendente foi superada expressamente; não repetir
C0–C10 ou reconfirmar política. Não rodar geradores iniciais isolados sobre
as matrizes atuais. Validador do fechamento definitivo é a entrada atual.

Sem implementação funcional, migration, operação remota, pesquisa comercial,
deploy deliberado, merge ou início D. Branch D só após integrar PR6 à master
e autorização posterior. Gates específicos não são aceitos por documentação.
""")
    put(HERE/"PR_REVIEW_CHECKLIST.md","""
# Checklist de revisão do Draft PR 6

- P02 OWNER_APPROVED, cinco origens e ANY; SCI-005 não opcional.
- Ator de expedição efetivo versus created_by e autorização própria.
- Conteúdo material REQ versus eventos/atendimento/ciência/emissão PDF.
- 66 fichas/262 controles/171 relações originais revistos; 274/424 atuais.
- ENT-03/ESC-03 e demais estados em leitura/edição/cálculo corretos.
- 4.205 fontes B1 exatas, sem substituição cega por linha.
- 161 IDs preservados, 20 refinados, 26 novos; 187 planejados, não executados.
- Dez gates específicos, sem impedir D0 geral/D1 independente.
- Pesquisa comercial P03/P09/P13 externa pelo responsável; sem valores inventados.
- História A/B/C0, protótipo e baseline preservados; apenas docs/README mudaram.
- Verificações do SHA final, PR ainda Draft; nenhum gate aprovado por documento.
- Sem merge, limpeza de branch, implantação deliberada ou início D.
""")
    put(HERE/"CHECKPOINT.md","""
# Checkpoint — fechamento definitivo C

04/11/2026, America/Sao_Paulo. Branch audit/phase-b; entrada
266c6541bd5d3268b7e08a839df601e823ec74b5. PR 6 OPEN/Draft para master.
Master observada: 34dcb835c5c49068e0417f7306eb4e501aa868bc.
Entrada com CI integralmente aprovada; não usar seus resultados como prova do
novo SHA. Não aguardar todos os jobs no encerramento.

## Conclusão do conteúdo

P02 OWNER_APPROVED, ANY familiar e SCI-005 invariável por ator efetivo
habilitado. Verificação AS_IS constatou scienceByDispatch/created_by;
alteração futura especificada, sem corrigir produto.
66 fichas, 262 controles e 171 relações originais examinados. Catálogo:
274 controles, 424 usos. 58 componentes e 150 propostas de copy corrigidos.
20 dos 161 aceites refinados, 26 novos: 187 PLANNED_NOT_EXECUTED.
C2–C10, contratos/índices/decisões e relatório reconciliados.

## Preservação e validação

Baseline de 2.654 arquivos rastreados e 213 versões documentais exatas em
final-closure; ordem original em gzip com hash. Arquivos não documentais,
A/B/C0 e HTML/oito PNG preservados. Kit temporário continua ausente.
Validações atuais e detalhes: DOCUMENTARY_VALIDATION_REPORT.md e evidências.
Os snapshots de publicação/validação anteriores continuam preservados;
o validador atual usa a base desta ordem, mantendo o reparo CI 266c654.

## Publicação e limites

Commit/push na mesma branch e atualização do Draft PR 6 autorizados.
O SHA final é resolvido pelo Git/ref que contém este checkpoint; não há
hash autorreferente no manifesto. A entrega e descrição do PR informam CI
do último SHA e jobs pendentes, sem acompanhá-los até concluir.
Sem merge/exclusão de branch/código/migration/banco/ambiente remoto/deploy
deliberado/contratação/pesquisa comercial/início D.
P03/P05/P07/P08/P09/P10/P13/P15/OPS-01/PERF-01 conservam gates por ramo,
sem impedir D0 geral ou D1 independente. Branch D exige integrar PR6 à
master e autorização posterior. Produção NO-GO.
""")
    put(HERE/"DOCUMENTARY_VALIDATION_REPORT.md","""
# Validação documental — fechamento definitivo

O conteúdo da ordem complementar foi consolidado. As validações deste
candidato estão sendo registradas pelo validador definitivo; não reutilizar
o resultado intermediário de 28 checks como aprovação do novo conteúdo.
Resultados serão atualizados antes do commit/push.
""")


def update_indexes_and_reports():
    update_decisions_and_gates()
    update_c8_indexes()
    update_acceptance_and_handoff()
    update_entry_points()


def main():
    update_narratives()
    update_indexes_and_reports()


if __name__=="__main__":
    main()
