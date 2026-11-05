"""Document all science modes and neighbouring acts from real source contracts."""
from pathlib import Path
import csv
import re

ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
SCIENCE = "supabase/migrations/20261023032906_v4_requisition_science_and_lifecycle.sql"
META = "supabase/migrations/20261023040129_v4_meta_registry_and_verified_actions.sql"
CORRECTIONS = "supabase/migrations/20261023073958_v4_verification_corrections.sql"
DOCUMENTS = "src/lib/validation/documents.ts"
BAL = "src/lib/validation/balances.ts"
SCHEDULE = "src/lib/validation/schedules.ts"


def anchor(path, term):
    lines = (ROOT / path).read_text(encoding="utf-8").splitlines()
    found = next((i for i, line in enumerate(lines, 1) if term in line), None)
    if found is None:
        raise ValueError(f"Missing source marker: {path}: {term}")
    return f"{path}:{found}"


def main():
    rows = []

    def add(id_, area, name, trigger, actor, state, effect, path, marker,
            kind="MATERIAL_ACT", as_is="EXISTS_STATIC_VERIFIED", policy="NOT_CONFIGURABLE_PERSONAL_ACT", mode="", risk="Ato material exige decisão/declaração expressa e capacidade própria"):
        is_science = kind == "SCIENCE"
        rows.append({
            "science_id": id_, "area": area, "display_name": name,
            "trigger": trigger, "document_and_version": state,
            "obligated_actor": actor, "authorized_actor": actor,
            "as_is_behavior": as_is, "registered_mode": mode,
            "recorded_effect": effect, "act_class": kind,
            "evidence": anchor(path, marker),
            "manual_eligible_proposal": "CANDIDATE_OWNER_CHOICE" if is_science else ("EXPRESS_ACT_ONLY" if kind == "MATERIAL_ACT" else "NOT_A_SCIENCE_MODE"),
            "dialog_on_open_eligible_proposal": "CANDIDATE_NEW_CONTRACT_NOT_IMPLEMENTED" if is_science else "NO_SUBSTITUTION_OF_THIS_ACT",
            "tacit_eligible_proposal": "CANDIDATE_ONLY_IF_OWNER_APPROVES_THIS_ID;NEVER_PROVES_READING" if is_science else "NO_SUBSTITUTION_OF_THIS_ACT",
            "non_configurable": "NO_OWNER_CHOICE_YET" if is_science else "YES_FOR_MATERIAL_OR_NON_SCIENCE_FACT",
            "risk_impact": risk,
            "recommendation_not_approval": "Rever origem e modalidade separadamente; consentimento prospectivo e trilha; manter canal deferido quando aplicável" if is_science else "Conservar semântica/autoria e nunca substituir por ciência tácita",
            "owner_response": "", "owner_decided_at": "",
            "policy_status": policy,
            "future_scope": "P02;REQ-04;D2" if is_science else "Preservar fato e corrigir lacunas no lote do domínio",
        })

    eligible = "Admin/familiar ou pessoa explicitamente elegível na policy da emissão, com req.science e vínculo ativo; any/all não muda identidade"
    add("SCI-001", "REQ", "Ciência expressa no aplicativo", "Clique pessoal Confirmar ciência", eligible,
        "REQ não histórica/não arquivada/não cancelada; versão esperada atual; sem evento anterior da pessoa",
        "requisition_science_events; req.science_recorded/satisfied; versão documental avança; sem estoque",
        SCIENCE, "if p_mode='express'", "SCIENCE", policy="OWNER_REVIEW_REQUIRED", mode="express", risk="Declaração pessoal de ciência não prova leitura integral; preferência scienceExpress habilitada no AS_IS")
    add("SCI-002", "REQ", "Ciência automática por exibição no aplicativo", "IntersectionObserver do cabeçalho visível com documento não oculto", eligible,
        "REQ vigente; scienceAutomatic da policy e preferência; versão atual; pessoa sem ciência",
        "Mesmo registro único por REQ/pessoa, mode app_visible; não há trilha geral de acesso independente comprovada",
        "src/components/requisitions/requisition-detail.tsx", 'mode: "app_visible"', "SCIENCE", policy="OWNER_REVIEW_REQUIRED", mode="app_visible", risk="UX-002/B1-UX-008: cabeçalho não é conteúdo lido; nova política não pode chamar isso leitura")
    add("SCI-003", "REQ/WhatsApp", "Ciência derivada de read correlacionado", "Webhook read de req.issued e template esperado", eligible,
        "Notificação/telefone confirmado/template correlacionados; scienceAutomatic em policy/preferência; canal deferido",
        "record_science whatsapp_read com referência/notificação/evento/template; transport read separado da declaração manual",
        META, "'whatsapp_read'", "SCIENCE", policy="OWNER_REVIEW_REQUIRED", mode="whatsapp_read", risk="Read do provedor não demonstra compreensão nem leitura integral; ativação/homologação Meta permanece diferida")
    add("SCI-004", "REQ/WhatsApp", "Confirmação de ciência por desafio", "Botão/resposta em desafio válido", eligible,
        "Telefone Auth confirmado, token único, versão/prazo/vínculo vigentes, scienceWhatsApp; canal deferido",
        "record_science whatsapp_confirm e desafio usado; inbound deduplicado; sem aceite físico",
        META, "'whatsapp_confirm'", "SCIENCE", policy="OWNER_REVIEW_REQUIRED", mode="whatsapp_confirm", risk="Não é assinatura pessoal de PDF ou confirmação de recebimento ENT; botão de ciência exige correlação e política aprovada")
    add("SCI-005", "REQ vinculada a ENT", "Ciência derivada da expedição", "ent.issued/submit vinculado à linha REQ", eligible + "; precisa ser emissor da ENT",
        "ENT pending_receipt; scienceByDispatch; emissor elegível; REQ vinculada",
        "record_science dispatch com deliveryId/version/session; atendimento REQ continua dependendo de aceite positivo",
        SCIENCE, "'dispatch'", "SCIENCE", policy="OWNER_REVIEW_REQUIRED", mode="dispatch", risk="Expedir não é receber nem ler; confirmar se esta origem deve permanecer política automática por tipo")

    add("ACT-001", "REQ", "Ciência satisfeita any/all/desobrigada", "Agregação de policy e eventos", eligible,
        "eligible_users e policy fixados na emissão", "science_satisfied retorna boolean; pode ser true por ciência não exigida sem evento pessoal",
        SCIENCE, "create function private.science_satisfied", "DERIVED_STATE", policy="OWNER_REVIEW_REQUIRED_ANY_ALL")
    # The full command schema is a real, enumerable material-act boundary.
    for number, action, area, name, actor, effect in [
        (2,"submit","COM/ENT/BAL","Enviar/emitir ficha","Autor competente com versão atual","Ato oficial; protocolo/evento; efeito de estoque apenas conforme tipo"),
        (3,"approve","COM","Aprovar aquisição","Aprovador familiar/admin competente","Aprova quantidade; não compra nem credita"),
        (4,"purchase","COM","Registrar aquisição","Responsável autorizado à compra/doação","Quantidade adquirida; não valida chegada"),
        (5,"receive","COM","Informar chegada de parcela","Familiar autorizado declarante","purchase_receipt própria; nenhum crédito antes da validação"),
        (6,"validate_receipt","COM","Validar parcela física","Validador autorizado","Crédito FAMILY único por receiptId; decisão material"),
        (7,"reject_receipt","COM","Rejeitar parcela","Validador autorizado com motivo","Parcela rejeitada preservada; zero crédito"),
        (8,"receive","ENT","Confirmar recebimento integral","Somente recebedor designado que recebeu fisicamente","Aceite pessoal e crédito do destino uma vez"),
        (9,"receive","ENT","Manifestar divergência/aceite parcial","Recebedor designado pessoalmente","Quantidade aceita/zero, nota e restante em trânsito; sem delegação"),
        (10,"resolve","ENT","Resolver diferença received/returned/missing","Responsável competente pelo fato/linha","Conciliação de custódia distinta de ciência; não imputa assinatura alheia"),
        (11,"cancel","ENT","Pedir cancelamento","Emissor/competente segundo estado","Intenção material; após aceite não estorna sozinha"),
        (12,"consent_cancel","ENT","Consentir cancelamento/devolução/consumo","Recebedor competente com fato físico e motivo","Conciliação material; consumo anterior não é debitado outra vez"),
        (13,"reassign","ENT","Redesignar recebedor futuro","Emissor/gestor competente antes do fato, conforme estado","Muda responsabilidade futura; não autoria passada"),
        (14,"approve","BAL","Revisão familiar iniciada","Familiar/admin legítimo distinto do contador efetivo","Revisão explícita da count_version; facultativa P11"),
        (15,"approve","BAL","Revisão de supervisão iniciada","Supervisor elegível distinto do contador efetivo","Revisão própria quando ativada; não exige supervisão no primeiro uso"),
        (16,"submit","BAL","Confirmar contagem física","Contador designado/legítimo","Contagem oficial; aplicação explícita conforme política, não ciência/consumo"),
    ]:
        add(f"ACT-{number:03}",area,name,f"Comando {action}",actor,"Documento/linha/versão/estado vigente",effect,DOCUMENTS,f'"{action}"')

    for number, name, marker, actor, effect in [
        (17,"Solicitar adiamento BAL", "request_deferral", "Profissional designado", "Proposta não muda prazo até decisão familiar"),
        (18,"Decidir adiamento BAL", "decide_deferral", "Família/admin autorizado", "Decisão de prazo/versionamento; não ciência"),
        (19,"Designar reconto BAL", "assign_recount", "Designador competente", "Nova atribuição com contadora própria; preserva original"),
        (20,"Configurar regime BAL", "configure", "Família/admin autorizado", "Regime/versão/intervalo; não produz contagem retroativa"),
    ]:
        add(f"ACT-{number:03}","BAL",name,marker,actor,"Ciclo/atribuição/política vigentes",effect,BAL,marker)

    for number, marker, name, effect in [
        (21,"series","Propor/publicar série","Agenda prevista, nunca presença"),
        (22,"approve","Aprovar proposta de escala","Decisão de pessoa/intervalo/efeito BAL"),
        (23,"reject","Rejeitar proposta de escala","Mantém programação anterior e evento de recusa"),
        (24,"end_series","Encerrar série","Corte explícito sem reescrever fatos passados"),
        (25,"change","Alterar/substituir profissional de plantão","Nova responsabilidade futura; não recebimento físico"),
        (36,"propose_change","Propor alteração pontual","Intenção pendente, sem publicar mudança"),
        (37,"decide_change","Decidir alteração pontual","Aprovação/recusa expressa do antes/depois e efeito BAL"),
        (38,"cancel","Cancelar ocorrência","Cancela programação com motivo, preservando fato anterior"),
        (39,"type","Configurar tipo de plantão","Padrão de horário/duração; não declaração de comparecimento"),
    ]:
        add(f"ACT-{number:03}","ESC",name,marker,"Gestor/proponente/aprovador conforme capacidade e tipo de proposta","Série/plantão e versão vigentes",effect,SCHEDULE,f'"{marker}"')

    rest = [
        (26,"ID","Aceitar convite","src/app/api/invitations/accept/route.ts","accept_invitation","Titular de e-mail confirmado","Membership pessoal; não ciência tácita"),
        (27,"ID","Aprovar proposta de acesso","src/components/admin/policy-console.tsx","approve","Outra identidade administradora local elegível","Decisão de capacidade/versionamento; não mera abertura"),
        (28,"ID","Revogar vínculo","src/components/admin/membership-management.tsx","status","Admin autorizado do paciente","Recusa novas ações; não apaga autoria ou prova"),
        (29,"CON","Relatar falta/consumo","src/app/api/consumption/route.ts","POST","Relator autorizado","Relato sem débito ou prova automática de fato"),
        (30,"CON","Confirmar/rejeitar consumo","src/app/api/consumption/route.ts","confirm_extraordinary_consumption","Confirmador competente da custódia","Decisão explícita; consumo confirmado pode debitar uma vez"),
        (31,"CON/Flow","Revisar submissão Flow","src/components/stock/flow-reviews.tsx","review","Autor autenticado e capacidade própria","Revisão de sugestão; não ledger automático; canal deferido"),
        (32,"NOT","Declarar sem ocorrências","supabase/migrations/20261023044520_v4_event_routing_and_scheduled_reminders.sql","create function public.acknowledge_no_issues","Destinatário do desafio confirmado","Resolve lembrete; AS_IS também marca seen_at; não prova plantão ou leitura no app"),
        (33,"EST","Entrada/retirada/correção familiar","src/app/api/stock/movements/route.ts","family_stock_movement","Ator autorizado na custódia","Ledger motivado/compensatório, não transferência fictícia"),
        (34,"CAT","Inativar material com saldo","src/components/admin/catalogue-management.tsx","isActive","Gestor do catálogo local","Flag não movimenta; conservação do saldo"),
        (35,"ID","Consentir telefone/MFA/contato","src/components/auth/contact-settings.tsx","verify","Titular reautenticado","Posse/contato via Auth; não ciência de documento"),
    ]
    for number, area, name, path, marker, actor, effect in rest:
        add(f"ACT-{number:03}",area,name,"Ação autenticada específica",actor,"Estado/versão/propósito do próprio domínio",effect,path,marker)

    add("ACT-040","REQ","Emitir requisição","Envio pessoal de REQ","Profissional/autor com capacidade REQ","Paciente e intenção válidos","Protocolo e snapshot oficiais; nenhuma quantidade solicitada", "src/app/api/requisitions/route.ts", "POST")
    add("ACT-041","REQ","Arquivar manualmente","Comando motivado","Admin local com req.archive","REQ e condições de arquivamento válidas","Arquivamento não cria ciência retroativa", "src/app/api/requisitions/[id]/archive/route.ts", "archive_requisition")
    add("ACT-042","REQ","Alterar etapa/cancelar REQ","PATCH de etapa","Ator com capacidade e versão/contexto válidos","REQ existente","Estado administrativo não representa compra/recebimento", "src/app/api/requisitions/[id]/status/route.ts", "transition_requisition_status")
    add("ACT-043","BAL","Resolver cobertura ambígua","Comando assign","Família/designador autorizado","Ciclo e plantão vigentes","Define contador legítimo, não faz contagem por ele", BAL, '"assign"')
    add("ACT-044","BAL","Atualizar processamento do regime","Comando refresh","Ator autorizado ao regime","Política vigente","Atualiza obrigações/atribuições, não confirma físico", BAL, '"refresh"', "AUTOMATION_NOT_SCIENCE")
    add("ACT-045","COM","Cancelar aquisição sem apagar fato físico","Comando cancel","Ator autorizado","Estado compatível e motivo","Cancelamento não elimina parcela validada", DOCUMENTS, '"cancel"')
    add("ACT-046","BAL","Revisar edição/reconto","Endpoint revise","Contador autorizado/designado","Versão e janela revalidadas","Nova contagem/versionamento; nenhum autosave oficial tácito", "src/app/api/documents/[id]/revise/route.ts", "POST")

    for id_, area, name, path, marker, effect in [
        ("OBS-001","NOT","Marcar aviso visto","supabase/migrations/20261022043228_communications_attachments.sql","create function public.mark_notification_seen","seen_at do destinatário; não leitura integral nem ciência REQ"),
        ("OBS-002","NOT","accepted/delivered/read externo",META,"p_state<>'read'","Estado do transporte; só mapeamento correlacionado SCI-003 cria ciência no AS_IS"),
        ("OBS-003","DOC","Baixar PDF autorizado","src/lib/server/document-pdf.ts","document_pdfs","Entrega de bytes; não recebimento de materiais/assinatura pessoal"),
        ("OBS-004","REQ","Visualização do cabeçalho","src/components/requisitions/requisition-detail.tsx","IntersectionObserver","Sinal visual parcial; ciência automática é SCI-002 e não prova leitura"),
        ("OBS-005","ARQ","Autosave local REQ","src/components/requisitions/requisition-wizard.tsx","sessionStorage","Preenchimento transitório; não emissão oficial"),
        ("OBS-006","DOC","Hash/verificação pública","src/app/verificar/[id]/page.tsx","export","Consulta mínima de integridade; não fato físico ou ciência"),
        ("OBS-007","REQ","Ciência registrada/satisfeita no evento",CORRECTIONS,"'req.science_satisfied'","Evento derivado do registro de ciência, sem novo declarante independente"),
        ("OBS-008","REQ","Arquivamento automático",CORRECTIONS,"'req.archived.automatic'","Estado de ciclo por policy; não declaração pessoal de ciência"),
    ]:
        add(id_,area,name,"Observação técnica/consulta","Ator autorizado ou serviço correlacionado","Recurso/versionamento autorizados",effect,path,marker,"OBSERVATION_NOT_SCIENCE",policy="NOT_A_SCIENCE_MODE")

    planned = [
        ("FUT-001","DOC","Registro independente de abertura efetiva","DOC-02/REQ-03","Cada acesso autorizado real; não existe document_opened geral comprovado"),
        ("FUT-002","REQ","Diálogo na primeira abertura","REQ-04","Antes da exibição: escolha explícita, cancelar não gera ciência; modalidade depende de P02"),
        ("FUT-003","COM/ENT/BAL/aviso","Ciência informativa genérica fora de REQ","NOT-03","Nenhum armazenamento autônomo de ciência COM/ENT/BAL foi comprovado; inventariar futura necessidade por tipo antes de adicionar"),
        ("FUT-004","DOC","Assinatura criptográfica do sistema","DOC-03","Nova emissão P09 obrigatória; não assinatura pessoal ou ciência tácita"),
        ("FUT-005","ARQ","Save/descarte de draft privado servidor","RAS-01/02","Objeto não oficial; sem protocolo/ledger/PDF/ciência"),
        ("FUT-006","NOT","Opt-in Web Push por aparelho","NOT-02","Permissão de transporte específica; não aceita ato material"),
        ("FUT-007","EST/ENT","Transferência bilateral simplificada","EST-04","Declaração da contraparte e aceite físico separados quando pessoas diferentes; sem nova ciência tácita"),
    ]
    for id_, area, name, screen, effect in planned:
        rows.append({**dict.fromkeys(rows[0], ""), "science_id": id_, "area": area, "display_name": name, "trigger": "Requisito futuro " + screen, "document_and_version": "TO_BE_NOT_IMPLEMENTED", "obligated_actor": "Conforme contrato futuro, sem identidade inventada", "authorized_actor": "Capacidade do usuário e paciente revalidada", "as_is_behavior": "NOT_IMPLEMENTED_OR_NOT_PROVEN", "recorded_effect": effect, "act_class": "FUTURE_REQUIREMENT", "evidence": "docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv", "manual_eligible_proposal": "CONDITIONAL_ON_OWN_CONTRACT", "dialog_on_open_eligible_proposal": "P02_ONLY_FOR_ELIGIBLE_SCIENCE", "tacit_eligible_proposal": "NO_AUTOMATIC_APPROVAL", "non_configurable": "MATERIAL_ACTS_NEVER_TACIT", "risk_impact": "Não apresentar TO_BE como evento já existente", "recommendation_not_approval": "Implementar somente depois de contrato/gate aplicável aprovado", "policy_status": "PENDING_OWNER" if id_ in {"FUT-002","FUT-003"} else "OWNER_APPROVED_PURPOSE_NOT_IMPLEMENTED", "future_scope": screen})

    modes = set(re.findall(r"'([^']+)'", re.search(r"check\(mode in \(([^)]+)\)\)", (ROOT / SCIENCE).read_text(encoding="utf-8")).group(1)))
    assert modes == {r["registered_mode"] for r in rows if r["act_class"] == "SCIENCE"}
    with (OUT / "SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv").open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    review = """# Revisão humana P02, por tipo e origem

**OWNER_REVIEW_REQUIRED.** Inventário concluído; classificação individual
continua pendente. As cinco origens abaixo são o conjunto completo do enum
persistido `requisition_science_events.mode`, conferido no código. Todas são
da REQ; não há ciência autônoma COM/ENT/BAL comprovada. Os demais atos estão
no catálogo para impedir que um aceite material seja convertido em ciência.
66 linhas de atos não significam 66 tipos de ciência nem equivalem às 66
superfícies C3 ou aos processos B2.

| ID | Origem AS_IS | Proposta para avaliar, não aprovada | Resposta do responsável |
| --- | --- | --- | --- |
| SCI-001 | Clique pessoal express no app | Conservar opção manual; decidir diálogo/tácita para a ciência informativa deste tipo | A PREENCHER |
| SCI-002 | app_visible observa cabeçalho | Substituir promessa de leitura por origem honesta; decidir se automática/tácita permanece | A PREENCHER |
| SCI-003 | read de WhatsApp correlacionado | Preferir evidência de transporte separada; manter canal deferido; decidir admissibilidade futura | A PREENCHER |
| SCI-004 | Confirmação WhatsApp por desafio | Conservar correlação pessoal; decidir equivalência com ciência manual, sem habilitar canal agora | A PREENENCHER |
| SCI-005 | Expedição ENT vinculada gera ciência REQ | Decidir se expedir é origem admissível de ciência informativa; nunca recebimento | A PREENCHER |

O responsável pode responder: `SCI-001: manual e diálogo, nunca tácita`;
`SCI-002: excluir origem automática`; ou `SCI-005: manter com condições...`.
Precisamos de modalidade admissível, exclusões, regra por perfil/tipo,
vigência e responsável/data. As opções candidatas do CSV não significam que
uma origem de transporte se tornará manual sem outro contrato: a nova
declaração manual teria origem própria. Excluir uma origem futura não apaga
eventos históricos. Não ativar tácita antes da tabela aprovada.

## Regras que permanecem mesmo depois da resposta

- Abertura efetiva tem trilha própria; acesso não implica ciência ou leitura.
- Diálogo antes do conteúdo não comprova leitura integral. Cancelar não
  registra ciência; reabrir não duplica evento já válido.
- Tácita exige preferência anterior, política/tipo aprovados, elegibilidade
  e origem explícita. Não atribuir ciência retroativa à pessoa vinculada depois.
- Mudança de preferência vale prospectivamente; guarda-se a regra usada.
- Recebimento ENT, contagem/revisão BAL, compra, decisão administrativa,
  assinatura, divergência e transferência física são atos próprios expressos.
- `any`, `all` e `scienceRequired=false` são governança agregada. True por
  desobrigação não é evento de ciência de cada pessoa. Aprovar vigência e
  responsabilidade sem transformar retorno booleano em declaração pessoal.
- AS_IS possui unicidade REQ/pessoa; a D deve definir validade por versão
  relevante sem reescrever eventos anteriores nem disparar ciência a cada
  abertura. Mudança material de conteúdo exige regra explícita, não suposição.

## Catálogo legível completo

Cada linha traz classe, ator, efeito e fonte verificável. Contratos futuros
estão rotulados, inclusive a trilha geral document_opened, que não foi
encontrada como fato geral implementado. O CSV conserva os campos de resposta.

"""
    for row in rows:
        review += f"### {row['science_id']} — {row['display_name']}\n\n"
        review += f"Área: {row['area']}. Classe: `{row['act_class']}`. Estado: `{row['policy_status']}`.\n\n"
        review += f"Ator: {row['authorized_actor']}. Condição: {row['document_and_version']}.\n\n"
        review += f"Efeito: {row['recorded_effect']}. Fonte: `{row['evidence']}`.\n\n"
    (OUT / "SCIENCE_OWNER_REVIEW.md").write_text(review, encoding="utf-8")
    print(f"{len(rows)} acts; {len(modes)} real science modes; all five await individual owner review.")


if __name__ == "__main__":
    main()
