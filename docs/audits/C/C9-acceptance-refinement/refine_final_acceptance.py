"""Reconcile existing 161 cases and add the final complementary scenarios."""
from pathlib import Path
import csv
import gzip
import importlib.util
import io
import json

ROOT=Path(__file__).resolve().parents[4]
C=ROOT/"docs/audits/C"
OUT=Path(__file__).resolve().parent


def original_rows(path):
    baseline=json.loads((C/"C10-pr-handoff/final-closure/evidence/BASELINE.json").read_text(encoding="utf-8"))
    entry=next(r for r in baseline["archives"] if r["path"]==path)
    raw=gzip.decompress((ROOT/entry["archive"]).read_bytes()).decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(raw,newline="")))


def write(path,rows):
    output=io.StringIO(newline="")
    fields=list(dict.fromkeys(k for row in rows for k in row))
    writer=csv.DictWriter(output,fieldnames=fields,lineterminator="\n")
    writer.writeheader();writer.writerows(rows)
    path.write_text(output.getvalue(),encoding="utf-8",newline="\n")


def main():
    spec=importlib.util.spec_from_file_location("final_closure_case_data",OUT/"final_closure_case_data.py")
    data=importlib.util.module_from_spec(spec);spec.loader.exec_module(data)
    cases=original_rows("docs/audits/C/C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    masters=original_rows("docs/audits/C/C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv")
    masters_by_id={r["acceptance_id"]:r for r in masters}
    affected={
        "C-AC-009":"Fuso, pessoa, datas, notas e efeito BAL propostos são leitura em ESC-03; motivo da decisão é próprio; não editar a proposta ao aprovar.",
        "C-AC-011":"Capacidade/política propostas são comparação tipada em leitura; corrigir cria outra proposta, não edição silenciosa pelo aprovador.",
        "C-AC-035":"GET falho não usa recuperação de mutação; relato registrado sem desconto, consumo confirmado e rejeição têm mensagens próprias; confirmado/incerto/recusado não se confundem.",
        "C-AC-042":"Consumo já confirmado é referência em leitura no consentimento ENT-05, nunca novo débito editável; motivo original e motivo da decisão têm autoria distinta.",
        "C-AC-044":"Código de barras é texto e preserva zeros; equivalência é calculada e confirmada, não identidade inferida do código.",
        "C-AC-045":"Inativar não exige transferência nem escolhe destino obrigatório; saldo fica na custódia e transferência é intenção própria.",
        "C-AC-047":"Original é leitura em CON-03/04; complemento é novo ato autoral; confirmador não edita texto/quantidade do relato para fabricar aprovação.",
        "C-AC-054":"Notas do contador permanecem em leitura em BAL-03; parecer próprio do revisor não as sobrescreve; grupo/revisor resolvidos por autoridade.",
        "C-AC-056":"Destino e prazo da proposta são leitura na decisão; mudar alvo exige outro pedido; recusa/obsolescência podem encerrar sem aprovar versão antiga.",
        "C-AC-058":"Na decisão COM-03 a quantidade declarada é leitura; novas chegadas têm campo próprio vazio; nenhuma entrada fictícia ao encerrar expectativa.",
        "C-AC-109":"Parcela/autor/instante e quantidade original ficam em leitura ao validar; replay conserva receiptId e um crédito.",
        "C-NEW-AC-005":"COM-04 mostra quantidade dispensável calculada, não input de baixa; parcela física pendente mantém sua conferência aberta.",
        "C-NEW-AC-014":"RAS-01 apresenta conteúdo e etapa em resumo de leitura; continuar abre formulário de origem; sem textarea de payload ou etapa.",
        "C-NEW-AC-015":"Resumos por tarefa têm campos propostos em leitura e só motivo próprio quando aplicável; nenhum seletor de contexto congela proposta diferente da vista.",
        "C-NEW-AC-017":"DOC-02/03 apresentam motivo, ressalva e antes/depois em leitura; falha desses dados pede atualizar seção, nunca editar fato histórico.",
        "C-NEW-AC-020":"DOC-05 calcula resultados independentes de bytes/assinatura/cadeia; resultado nunca é campo editável Coincide/Confiável.",
        "C7-AC-001":"Titular não escolhe validado externo; família declara conferência própria com ator/instante automáticos; externo exige fonte comprovada.",
    }
    changed=[]
    for row in cases:
        before=dict(row)
        id_=row["acceptance_id"]
        p02="P02" in row["decision_refs"]
        if p02:
            row["decision_dependency"]="P02_OWNER_APPROVED;NO_HUMAN_CLASSIFICATION_GATE;SCI_004_EXTERNAL_HOMOLOGATION_DEFERRED"
            row["design_status"]="DESIGN_READY"
            row["implementation_readiness"]="NOT_IMPLEMENTED;D2_TECHNICAL_CONTRACT_AND_REGRESSIONS_REQUIRED"
            row["source_specifications"]+=";docs/audits/C/C7-decision-closure/SCIENCE_OWNER_REVIEW.md"
            row["independent_oracle"]=row["independent_oracle"].replace("; bloqueado até P02","")
        if id_=="C-AC-041":
            row["action_steps"]="1. Mostrar cabeçalho/prévia mínima sem ciência. 2. Cancelar diálogo: zero efeito. 3. Confirmar e abrir: ciência pessoal com origem dialogada. 4. Reabrir/recuperar sem duplicar e testar pessoa sem capacidade."
            row["expected"]="SCI-002 substitui disparo por cabeçalho: só confirmação anterior à abertura registra ciência; acesso é evento próprio, não leitura integral; cancelar não registra e pessoa sem capacidade não declara."
            row["forbidden"]="Ciência por IntersectionObserver/scroll, leitura integral presumida, evento ao cancelar ou duplicação por reabertura/retry."
            row["independent_oracle"]="Eventos pessoais por REQ/material/ator/origem/intenção e acesso real separados; ausência de evento no controle negativo cabeçalho/cancelar."
        if id_=="C-NEW-AC-003":
            row["expected"]="SCI-001 mantida, SCI-002 dialogada, SCI-003 comunicação sem ciência, SCI-004 futura identificada condicionada, SCI-005 invariável por ator efetivo familiar autorizado; ANY familiar com eventos pessoais próprios."
            row["forbidden"]="Opt-out SCI-005, created_by no lugar do expedidor, read WhatsApp satisfazendo ciência, exigir todos, retroagir preferência ou presumir recebimento."
        if id_=="C7-AC-012":
            row["expected"]="Preferência anterior expressa somente para obrigação elegível; mudanças prospectivas; histórico imutável; ANY familiar não fabrica ciência de todos; versão de eventos/PDF não invalida ciência do mesmo conteúdo material."
            row["independent_oracle"]="Instantes de emissão/preferência/autoridade e eventos por pessoa/material; estados pessoal e familiar separados, acesso real e zero ledger de ciência."
        if id_ in affected:
            row["expected"]+=" "+affected[id_]
            row["independent_oracle"]+="; comparar controle/campo por tela e estado com CONTROL_SCREEN_CONTRACTS.csv e a fonte persistida independente"
            row["ui_states"]+="; outputs em leitura não têm erro de input; proposta/resultado/calculado não vira edição"
        if row["design_status"]=="BLOCKED_BY_OWNER_DECISION":
            row["design_status"]="DESIGN_READY_SPECIFIC_GATE_PENDING"
            row["implementation_readiness"]="NOT_IMPLEMENTED;SPECIFIC_SCOPE_GATE_NOT_GENERAL_D0_D1_BLOCKER"
        if before!=row:
            changed.append({"acceptance_id":id_,"reason":"OWNER_P02_APPROVED_AND_OR_CONTEXTUAL_C8_CONTROL_CORRECTION","previous_design_status":before["design_status"],"current_design_status":row["design_status"],"fields_changed":";".join(k for k in row if row[k]!=before[k])})
    source_screens=original_rows("docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv")
    screen_specs={r["screen_scope"]:r["source_spec"] for r in source_screens if r["record_type"]=="SCREEN_ACTIONS"}
    for n,(title,screens,fixture,steps,expected,forbidden,oracle) in enumerate(data.CASES,1):
        id_=f"C-FINAL-AC-{n:03}"
        related=list(screen_specs) if screens=="ALL_66_SCREEN_IDS" else screens.split(";")
        references=list(dict.fromkeys(screen_specs[s] for s in related))
        references.extend("docs/audits/C/C8-visual-blueprint/screens/"+s+".md" for s in related)
        references.append("docs/audits/C/C7-decision-closure/SCIENCE_OWNER_REVIEW.md" if n<=11 else "docs/audits/C/C8-visual-blueprint/CONTROL_SCREEN_CONTRACTS.csv")
        row={k:"" for k in cases[0]}
        row.update(acceptance_id=id_,cause_or_decision="P02_FINAL_OWNER_APPROVAL" if n<=11 else "C8_FINAL_SEMANTIC_REVIEW",source_ids="OWNER_COMPLEMENT_2026-11-04",decision_refs="P02;DEC-002" if n<=11 else "DEC-013;DEC-014;C8_FINAL_REVIEW",risk_and_semantic_review=title,precondition="Somente no candidato D autorizado, com baseline/destino conferidos; "+fixture,actors_and_permissions="Identidades fictícias distintas para autor/proponente, familiar habilitado, recebedor/contador/revisor conforme cenário; leitor, revogado, global sem vínculo e outro paciente como negativas; ator nunca escolhido pelo browser",test_data=fixture,action_steps="1. Capturar estado inicial e identidades. 2. "+steps+". 3. Executar controles negativos. 4. Ler estado por canal independente e registrar SHA/ambiente.",expected=expected,forbidden=forbidden,independent_oracle=oracle,side_effects="Somente o ato legítimo do cenário; retries preservam IDs e não duplicam eventos, ledger ou avisos; consultas, draft e ciência informativa não produzem aceite/consumo",authorization="Revalidar sessão/vínculo/capacidade/paciente/versão depois de espera relevante; sem autoria alheia e com negativas diretas quando o contrato for servidor",ui_states="Consultar/carregar, vazio/inelegível, input inválido só no editável, conflito, recusa comprovada, confirmado, resposta incerta e falha parcial conforme tarefa; consulta não inventa mutação",pdf_event="Conservar conteúdo material e eventos; emissão/bytes/assinatura não são aceite físico; verificar emissão antiga se cenário documental",failure_recovery="Preservar edição no escopo permitido; leitura repete GET; escrita incerta consulta mesma intenção antes de nova chave; confirmado abre resultado existente",layer="STATIC_CONTRACT;UI_ACCESSIBILITY;HTTP_RPC_DB_WHEN_APPLICABLE;HUMAN_DEVICE_WHEN_REQUIRED",fixture="FX-"+id_,automation_plan="Implementar no lote D pertinente: controle válido passa e mutante proibido falha por motivo específico; read-back/oráculo independente da resposta HTTP; não executar nesta C",accessibility_mobile="Aplicar composição e modo por tela/estado; teclado/AT, 320/390/768/1440 e zoom 400%; não focar dado imutável como input inválido",human_device_provider_requirement="P10 para tarefas físicas/AT; SCI-004 somente após homologação externa futura; nenhum aceite humano/físico/provedor realizado nesta C",source_specifications=";".join(references),planned_package="D2" if n<=17 else "D3/D4" if n<=25 else "D0/D1_SCOPE_AND_D6_GATES",release_gate="FIRST_RELEASE_REQUIRED;SPECIFIC_EXTERNAL_GATES_ONLY",decision_dependency="P02_OWNER_APPROVED;TECHNICAL_WORK_REMAINS;NO_P02_HUMAN_GATE" if n<=11 else "SEE_GATES_P03_P05_P07_P08_P09_P10_P13_P15_OPS01_PERF01;NOT_GENERAL_D0_D1_BLOCKERS",design_status="DESIGN_READY",implementation_readiness="NOT_IMPLEMENTED_OR_EXECUTED;D_AUTHORIZATION_REQUIRED",execution_status="PLANNED_NOT_EXECUTED")
        cases.append(row)
    assert len(data.CASES)==26 and len(cases)==187
    for row in cases:
        id_=row["acceptance_id"]
        master=masters_by_id.get(id_,{k:"" for k in masters[0]})
        master.update(acceptance_id=id_,cause_id=row["cause_or_decision"],source_ids=row["source_ids"],decision_refs=row["decision_refs"],planned_package=row["planned_package"],gate=row["release_gate"],positive_oracle=row["expected"],negative_oracle=row["forbidden"],persistence_oracle=row["independent_oracle"],decision_condition=row["decision_dependency"],execution_status="PLANNED_NOT_EXECUTED",specifications=row["source_specifications"],design_status=row["design_status"],case_reference="docs/audits/C/C9-acceptance-refinement/ACCEPTANCE_CASES.csv#"+id_)
        if id_ not in masters_by_id:
            master.update(current_checks="NO_NEW_FUNCTIONAL_TEST_EXECUTED_THIS_MISSION",current_gap="New discriminating design case, implementation/evidence in authorized D candidate",test_layers=row["layer"],human="PENDING_P10_IF_APPLICABLE",physical="PENDING_P10_IF_APPLICABLE",remote="NOT_EXECUTED;EXTERNAL_HOMOLOGATION_SEPARATE",domain="REQ_SCIENCE" if int(id_.rsplit('-',1)[-1])<=11 else "C8_CONTEXTUAL_TASK_STATE")
            masters.append(master)
    write(OUT/"ACCEPTANCE_CASES.csv",cases)
    write(C/"C6-acceptance-handoff/ACCEPTANCE_CRITERIA_MASTER.csv",masters)
    gap_keys=["acceptance_id","cause_or_decision","planned_package","release_gate","design_status","decision_dependency","human_device_provider_requirement","automation_plan","execution_status"]
    write(OUT/"C9_GAP_AND_DECISION_MATRIX.csv",[{k:r[k] for k in gap_keys} for r in cases])
    write(OUT/"FINAL_ACCEPTANCE_CHANGES.csv",changed+[{"acceptance_id":f"C-FINAL-AC-{n:03}","reason":"ADDED_DISCRIMINATING_CASE: "+entry[0],"previous_design_status":"NOT_PRESENT","current_design_status":"DESIGN_READY","fields_changed":"ALL_CASE_DESIGN_FIELDS"} for n,entry in enumerate(data.CASES,1)])
    report={"existing_ids_preserved":161,"existing_cases_refined":len(changed),"additional_cases":26,"total_cases":187,"all_execution_status":"PLANNED_NOT_EXECUTED","p02_human_gate":"CLOSED_OWNER_APPROVED;TECHNICAL_IMPLEMENTATION_REMAINS"}
    (OUT/"FINAL_ACCEPTANCE_COUNTS.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps(report,ensure_ascii=False))


if __name__=="__main__":
    main()
