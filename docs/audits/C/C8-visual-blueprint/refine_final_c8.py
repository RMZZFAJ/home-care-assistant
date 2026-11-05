"""Regenerate corrected C8 documentary contracts from preserved pre-review input.

Every state decision is in final_closure_design_data.py. No product code,
browser session, database, or runtime test is executed by this script.
"""
from pathlib import Path
import csv
import gzip
import hashlib
import importlib.util
import io
import json
import re

ROOT = Path(__file__).resolve().parents[4]
C = ROOT / "docs/audits/C"
OUT = Path(__file__).resolve().parent
BASELINE = C / "C10-pr-handoff/final-closure/evidence/BASELINE.json"


def original(name):
    records = json.loads(BASELINE.read_text(encoding="utf-8"))["archives"]
    entry = next(r for r in records if r["path"] == name)
    return gzip.decompress((ROOT / entry["archive"]).read_bytes()).decode("utf-8-sig").replace("\r\n", "\n")


def rows_from_original(name):
    return list(csv.DictReader(io.StringIO(original(name), newline="")))


def write_rows(path, rows):
    stream = io.StringIO(newline="")
    fields = list(dict.fromkeys(k for row in rows for k in row))
    writer = csv.DictWriter(stream, fieldnames=fields, lineterminator="\n")
    writer.writeheader()
    writer.writerows(rows)
    path.write_text(stream.getvalue(), encoding="utf-8", newline="\n")


def load_data():
    spec = importlib.util.spec_from_file_location("final_closure_design_data", OUT / "final_closure_design_data.py")
    data = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(data)
    return data


def group_number(control):
    value = control["source_field_group"]
    return int(value.rsplit("-", 1)[-1]) if value.startswith("C3-FIELD-") else None


def input_error(control):
    kind, label = control["control_type"], control["label"].lower()
    if "PASSWORD_NEW" in kind or control["control_id"] == "CTRL-107-01":
        return "A nova senha precisa ter pelo menos 12 caracteres e no máximo 72 bytes UTF-8. Confira o limite; colar ou usar o gerenciador de senhas é permitido."
    if "PASSWORD" in kind:
        return "Confira a senha nesta etapa. Se não lembrar sua senha de acesso, use Recuperar acesso. Não envie sua senha ao suporte."
    if "EMAIL" in kind:
        return "Confira o endereço de e-mail completo. A confirmação da conta é uma etapa separada."
    if "AUTHENTICATOR_CODE" in kind:
        return "Informe os seis dígitos do código atual do seu autenticador. Se o código expirou, use um novo código; nunca o envie ao suporte."
    if "OTP" in kind:
        return "Confira o código recebido para esta confirmação e seu prazo de validade. Código de telefone e código do autenticador não são intercambiáveis."
    if "TEL_INPUT" in kind:
        return "Confira o código do país e o número de telefone. Informar o número ainda não confirma que ele pertence à conta."
    if "FILE" in kind or "ATTACHMENT" in kind:
        return "Confira o formato e o limite de arquivo indicados. Se já iniciou um envio sem resultado, consulte aquela tentativa antes de escolher outro arquivo."
    if "DECIMAL" in kind or "QUANTITY" in kind:
        return f"Informe {label} na unidade indicada e com a precisão permitida. O campo precisa de correção antes de confirmar."
    if "INTEGER" in kind:
        return f"Informe um número inteiro permitido para {label}; confira o intervalo indicado junto ao campo."
    if "DURATION" in kind:
        return "Confira a duração e sua unidade. Um prazo ainda não aprovado permanece A definir; não substitua esse estado por um número presumido."
    if "PUSH_PERMISSION" in kind:
        return "A permissão de notificações deste aparelho ainda não foi confirmada. Consulte a permissão do navegador e tente Ativar novamente quando ela estiver disponível. Seus avisos continuam acessíveis no aplicativo."
    if "TIMEZONE" in kind:
        return "Escolha o fuso de referência da tarefa. O fuso do aparelho não será adotado silenciosamente."
    if "DATE" in kind:
        return "Confira a data e o período desta tarefa. A data final deve respeitar o início e o alcance apresentados."
    if "TIME" in kind:
        return "Informe um horário válido e confira a data de término, inclusive quando houver virada de dia."
    if "BARCODE" in kind:
        return "Confira o código completo, incluindo os zeros iniciais, ou selecione o material manualmente."
    if kind in {"TEXTAREA", "TEXT_INPUT", "ALIAS_TOKEN_INPUT", "EXTRA_ITEM_CONTEXT_GROUP", "SEARCH_INPUT", "SEARCH_AND_FILTER_GROUP"}:
        return f"Confira {label} e o limite indicado. Corrija somente esta informação; os demais valores preenchidos foram preservados."
    return f"Escolha uma opção válida para {label} no escopo desta tarefa. Se a opção necessária não estiver disponível, volte ou procure a administração responsável."


def read_presentation(control,screen):
    """Present the actual semantic data type, not every possible mask."""
    id_,label=control["control_id"],control["label"].lower()
    special={
        "CTRL-028-01":("Nome da custódia de origem da emissão, por exemplo Família; não seletor","Mostra de onde os materiais desta entrega foram expedidos."),
        "CTRL-028-02":("Nome da custódia de destino da emissão, por exemplo Equipe; não seletor","Mostra o destino previsto. O crédito depende do recebimento pessoal pertinente."),
        "CTRL-030-01":("Lista de referências humanas das REQs vinculadas, com acesso próprio","Vínculos da expedição emitida; consultar uma REQ não altera o material ou o crédito."),
        "CTRL-060-01":("Nome da zona IANA e horário/offset da proposta ou período selecionado","Fuso de referência dos horários exibidos; não muda porque seu aparelho usa outro fuso."),
        "CTRL-051-01":("Texto integral da observação original, com autor e instante","Observação da pessoa que contou. O parecer de revisão tem campo e autoria separados."),
        "CTRL-040-02":("Quantidade/unidade e referência do consumo já confirmado","Este consumo já foi registrado. A conciliação considera o fato anterior, sem descontá-lo novamente."),
        "CTRL-069-01":("Comparação Atual/Proposto por pessoa, datas, horários, fuso e efeito BAL",control["inline_help_and_example"]),
        "CTRL-126-01":("Resumo estruturado por campo, sem JSON/payload editável","Confira o conteúdo salvo; para alterá-lo, continue no formulário de origem."),
        "CTRL-126-02":("Nome humano da etapa salva, com ação de continuar","A etapa mostra onde continuar o preenchimento; ela não é um texto para editar."),
        "CTRL-152-01":("Resultados separados de bytes, assinatura e confiança, sem input","Bytes coincidentes, assinatura íntegra e cadeia confiável são verificações distintas; sem referência não significa falso."),
        "CTRL-C7-019":("Estado Confirmado, Recusado ou Ainda incerto, com próxima ação legítima","Resultado incerto precisa de consulta antes de repetir. Só recusa comprovada permite afirmar que o ato não foi registrado."),
        "CTRL-C7-015":("Resumo rotulado de plantões, fuso e regime BAL; links para os subfluxos autorizados","Preparar escalas ou BAL abre o formulário próprio. Este resumo não recebe texto para modificar a configuração."),
        "CTRL-C7-016":("Resumo de ciência, avisos e contingência com pendências identificadas; links por capacidade","Abra a seção correspondente para configurar o que for elegível. SCI-005 permanece obrigatória e pendências externas não equivalem a homologação."),
        "CTRL-C8-003":("Pendente ou registrada, com modalidade e instante da própria pessoa","Consulta da ciência pessoal; o agregado familiar não atribui ciência a todas as pessoas."),
        "CTRL-C8-004":("Família ciente ou Pendente, acompanhado do evento que satisfaz a obrigação","Agregado ANY calculado para o conteúdo material atual, sem exigir declaração de todos."),
        "CTRL-C8-005":("Aviso permanente de regra, em texto, sem campo ou controle de desativação","Ciência por expedição oficial é obrigatória para o ator familiar habilitado; não confirma recebimento ou consumo."),
        "CTRL-C8-012":("QR privado de matrícula e alternativa de código somente por ação do titular; sem prévia pública, histórico ou captura","Confira o estado da matrícula do seu fator antes de iniciar outra; não compartilhe o QR ou o segredo."),
    }
    if id_ in special:
        return special[id_]
    if "quantidade" in label or any(x in label for x in ["previsto","aprovado","adquirido","validado","estoque","referência de estoque","devolvido","contado"]):
        return "Quantidade decimal exata com unidade e precisão da origem, sem input", "Quantidade registrada para a etapa indicada. Não é uma nova declaração de quantidade e não movimenta material ao ser consultada."
    if "fuso" in label:
        return "Zona IANA de referência; offset do instante quando aplicável", "Mostra o fuso usado nesta tarefa, sem adotar silenciosamente o fuso do aparelho."
    if any(x in label for x in ["data","instante","salvo em","janela","última consulta","validade"]):
        return "Data/hora local com rótulo do fato e fuso; desconhecido explícito", "A data pertence ao fato identificado. Data de registro e de emissão são mostradas separadamente quando forem diferentes."
    if any(x in label for x in ["autor","revisor","recebedor","solicitante","quem conferiu","titular","substituto","conciliador"]):
        return "Nome da pessoa e papel no ato, conforme registro histórico; sem token ou ID de sessão", "Identifica a pessoa relacionada a este ato; não permite transferir sua autoria para quem consulta."
    if "paciente" in label:
        return "Nome da residência/paciente do contexto autorizado, sem UUID digitável", "Confira a residência desta tarefa. Trocar contexto é uma ação separada e exige acesso autorizado."
    if "material" in label or "unidade" in label:
        return "Nome completo e unidade da origem, com quebra de linha sem corte", "Identificação do item registrado. A consulta não substitui o material ou reinterpreta sua unidade."
    if any(x in label for x in ["motivo","ressalva","antes e depois","notas"]):
        return "Texto histórico completo ou comparação rotulada, com quebras de linha", "Informação registrada no ato de origem. Não pode ser reescrita nesta consulta ou decisão."
    return "Descrição rotulada do registro específico, sem input, identificador de transporte ou valor inventado", "Informação do registro indicado, somente para consulta nesta etapa. Ausência de dado histórico permanece explicitamente identificada."


def interaction(data, screen, control):
    id_, kind = control["control_id"], control["control_type"]
    if "INTERNAL" in kind or id_ in {"CTRL-013-01", "CTRL-122-01", "CTRL-127-02", "CTRL-159-02"}:
        mode, when, component = "INTERNAL", "Dado de comando/transporte; nunca input ou identificador técnico exigido ao usuário", "NO_USER_CONTROL"
    elif kind.startswith("AUTO_FILLED") or id_ in {"CTRL-C7-002", "CTRL-C7-003"}:
        mode, when, component = "AUTO_FILLED", "Origem autoritativa do servidor; autoria/instante não escolhidos por outro usuário", "TEXT_VALUE"
    elif kind.startswith("CALCULATED"):
        mode, when, component = "CALCULATED", "Resultado derivado dos fatos/valores apresentados; sem edição manual", "CALCULATED_DESCRIPTION"
    elif "READ_ONLY" in kind or kind in {"INTERNAL_TASK_RULE_DESCRIPTION", "CUSTODY_NOTICE_AND_LINK"}:
        mode, when, component = "READ_ONLY", "Consulta do valor de origem; mudanças só no processo legitimamente responsável", "TEXT_VALUE"
    elif screen in data.READ_ONLY_SCREENS:
        mode, when, component = "READ_ONLY", "Estado de consulta/revisão da tarefa; não herdar edição do formulário de origem", "QUANTITY_WITH_UNIT" if "quantidade" in control["label"].lower() else "TEXT_VALUE"
    else:
        mode, when, component = "EDITABLE", "Somente no subestado de preparação autorizado indicado na ficha; resumo/decisão posterior é leitura", kind
    if id_.startswith("CTRL-157-") or id_.startswith("CTRL-080-") or id_ in {"CTRL-156-01", "CTRL-156-02", "CTRL-104-01", "CTRL-070-01", "CTRL-C8-006"}:
        mode, when, component = "FILTER", "Apenas consulta no escopo permitido; não altera documento, movimento ou autoridade", kind
    if (screen, id_) in data.CONTEXT_MODES:
        mode, when, component = data.CONTEXT_MODES[screen, id_]
    readonly = mode in {"READ_ONLY", "READ_ONLY_WITH_LINK", "READ_ONLY_WITH_ACCOUNT_SWITCH", "CALCULATED", "AUTO_FILLED", "SENSITIVE_READ_ONLY"}
    invisible = mode in {"HIDDEN", "INTERNAL"}
    if readonly:
        default = "Valor emitido, proposto ou calculado da fonte identificada; ausência explicitamente informada, sem valor inventado"
        if id_ in {"CTRL-C8-003","CTRL-C8-004","CTRL-C8-005","CTRL-C8-012"}:
            default = control["required_and_default"]
        mask,_ = read_presentation(control,screen)
        validation = "Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela. " + when
        error = f"Não foi possível carregar a informação “{control['label']}”. Atualize esta seção. O dado registrado não pode ser alterado aqui."
        if mode == "SENSITIVE_READ_ONLY":
            error = "Não foi possível carregar o cadastro do autenticador. Consulte o estado desta matrícula antes de iniciar outra. Nunca envie QR, segredo ou código ao suporte."
        accessibility = "Texto/lista/comparação sem aria-invalid de formulário; erro pertence à seção com ação Atualizar e foco preservado"
    elif invisible:
        default, mask, validation, error = "Não renderizar controle", "NÃO APLICÁVEL", "Somente contrato interno, com validação no servidor; não expor segredo/UUID como decisão do usuário", ""
        accessibility = "Não inserir campo escondido na ordem de foco, texto acessível ou mensagem para o usuário comum"
    elif mode == "EXPLICIT_ACTION":
        default, mask = "Sem concordância material inicial ou clique automático", "Botão/ação com nome de consequência; sem campo textual de aceite"
        validation = control["validation_and_dependencies"] + "; " + when
        error = "Esta ação não está disponível no estado atual. Consulte o resultado ou volte à tarefa; nenhuma confirmação será presumida."
        accessibility = "Botão com verbo/alvo/efeito; confirmação por teclado/touch; foco retorna ao resumo, sem aria-invalid em texto de leitura"
    else:
        default, mask = control["required_and_default"], control["mask_inputmode"]
        presentation = data.CONTROL_PRESENTATIONS.get(id_) or data.INPUT_PRESENTATIONS.get(component)
        if presentation is None:
            raise ValueError(f"Interactive presentation not authored: {screen}/{id_}/{component}")
        mask = presentation[0]
        validation = control["validation_and_dependencies"] + "; " + when
        error = input_error(control)
        accessibility = "Label visível, ajuda/erro associados, required antes do envio, aria-invalid só quando inválido; resumo leva ao input editável correto"
    if mode == "FILTER":
        default = "Sem restrição adicional inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado material"
        domains={"ENT-02":"Tarefa de receber/decidir pedido/resolver diferença e estado real da entrega; nunca selecionar outro recebedor como autorização", "CON-01":"Tipo Falta/Consumo e estado de complemento/decisão do relato; nunca transformar busca em comando de consumo", "NOT-01":"Visto/Não visto do aviso são distintos de obrigação resolvida; tipo pelo catálogo de eventos, sem categoria essencial ou prazo P13 inventados", "DOC-01":"Tipo REQ/COM/ENT/BAL; estado traduzido por tipo e período válido; filtro não troca versão documental", "CAT-01":"Busca por material/alias no catálogo local; ativo/inativo permanece estado do cadastro, sem movimento", "CAT-02":"Busca por nome/código de unidade no âmbito autorizado", "CAT-03":"Busca de apresentação do material autorizado por nome/código textual", "ID-04":"Busca de pessoa/vínculo no paciente administrado, sem enumeração de contas globais"}
        validation=domains.get(screen,"Filtro tipado da seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um enum universal para processos distintos")+"; datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros ao voltar"
        error="Confira o filtro e o período indicados. A consulta pode ser atualizada sem alterar nenhum registro."
    display_help=control["inline_help_and_example"]
    if readonly and id_ not in {"CTRL-C8-003","CTRL-C8-004","CTRL-C8-005","CTRL-069-01","CTRL-C7-008"} and mode!="SENSITIVE_READ_ONLY":
        if mode=="CALCULATED":
            display_help="Resultado calculado a partir dos fatos desta tarefa, apresentado para conferência. Ele não pode ser digitado ou corrigido aqui."
        elif mode=="AUTO_FILLED":
            display_help="Identifica quem realizou o ato e quando ele foi registrado. Não permite escolher outra pessoa como autora."
        else:
            _,display_help=read_presentation(control,screen)
    return {"usage_id": f"{screen}:{id_}", "screen_id": screen, "control_id": id_, "label": control["label"], "interaction_mode": mode, "state_and_actor_condition": when, "component_in_this_state": component, "required_and_initial_value": default, "mask_or_presentation": mask, "autocomplete": "NÃO APLICÁVEL" if readonly or invisible or mode == "EXPLICIT_ACTION" else presentation[1], "validation_and_authority": validation, "help_and_example": display_help, "error_or_read_failure_copy": error, "error_condition": "SECTION_READ_FAILED" if readonly else "NOT_RENDERED" if invisible else "LOCAL_INVALID_BEFORE_COMMAND;SERVER_REJECTION_ONLY_WHEN_CONFIRMED;UNCERTAIN_USES_SCREEN_CONTRACT", "accessibility": accessibility, "position_and_group": control["order"], "actor_authorization":data.SCREENS[screen]["guard"], "mode_outside_edit_substate":"READ_ONLY_OR_HIDDEN;NEVER_INHERIT_EDIT_IN_REVIEW" if mode=="EDITABLE_SUBFORM" else "NOT_APPLICABLE", "decision_status": "OWNER_APPROVED_POLICY;TECHNICAL_DESIGN_FOR_D", "implementation": "NOT_IMPLEMENTED_THIS_MISSION"}


def screen_copy(screen_id, old, detail):
    view_only = screen_id in {"ENT-02", "ESC-01", "EST-01", "EST-03", "CON-01", "NOT-01", "NOT-04", "DOC-01", "DOC-02", "DOC-04", "ADM-01", "ADM-05", "ADM-06", "GUI-01", "GUI-04"}
    title = old["title"].lower()
    return {
        "LOADING": f"Consultando os dados para {title}…",
        "UPDATING": "Atualizando esta seção. A informação anterior continua identificada pela última consulta; confira o resultado antes de agir.",
        "EMPTY": detail["empty"],
        "ERROR": f"Não foi possível consultar os dados para {title}. Atualize esta seção. Se continuar, procure o responsável pela tarefa com a referência de atendimento disponível.",
        "OFFLINE": "Sem conexão. Não foi possível atualizar esta consulta. Nenhuma confirmação será enviada automaticamente ao reconectar." if view_only else "Sem conexão. Sua edição ainda não está confirmada no sistema. Não considere emissão, ciência ou recebimento concluídos; reconecte e consulte a mesma tarefa antes de confirmar.",
        "CONFLICT": "Os dados mudaram desde a revisão. Compare o estado atual antes de preparar uma nova decisão; sua edição permanece disponível no escopo autorizado." if not view_only else "A referência consultada mudou. Atualize esta seção para consultar o estado correto; a leitura não decide a tarefa.",
        "UNCERTAIN": "NÃO_APLICÁVEL_À_LEITURA: falha de GET usa ERROR; não inventar envio ou oferecer recuperar mutação inexistente" if view_only else "Ainda não foi possível confirmar o resultado desta ação. Consulte a mesma tentativa antes de alterar os dados ou tentar outra vez; ela pode já ter sido registrada.",
        "REVOKED_BARRIER": "Seu acesso a este contexto mudou. Novas ações estão bloqueadas. Entre novamente ou procure a administração; se havia uma ação em andamento, consulte seu resultado por um acesso autorizado.",
        "DENIED_NO_EFFECT": "Esta leitura não está disponível no seu acesso atual. Volte a um contexto permitido." if view_only else "Esta ação foi recusada antes da confirmação. Confira a informação ou permissão indicada; os dados editáveis foram preservados no escopo permitido.",
        "PARTIAL_SAVE": "NÃO_APLICÁVEL_À_LEITURA: não apresentar mensagem de gravação nesta tarefa de consulta" if view_only else "A etapa [etapa confirmada] foi registrada; [etapa restante] ainda não foi concluída. Consulte o resultado e retome somente a etapa pendente. Não repetir o que já foi confirmado.",
        "SUCCESS": detail["success"],
        "PRIMARY_ACTION": old["primary_action"],
        "SECONDARY_ACTIONS": old["secondary_actions"],
        "EFFECT_HELP": detail["readonly"],
        "RECOVERY_HELP": detail["recovery"],
        "CONTEXT_HELP": detail["sequence"],
    }


def main():
    data = load_data()
    old_controls = rows_from_original("docs/audits/C/C8-visual-blueprint/FORM_CONTROL_CATALOG.csv")
    controls = []
    for original_control in old_controls:
        row = dict(original_control)
        row.update(data.CONTROL_OVERRIDES.get(row["control_id"], {}))
        if row["control_id"] == "CTRL-031-01":
            row["screen_ids"] += ";ENT-03"
        if row["control_id"] == "CTRL-107-01":
            row["screen_ids"] += ";ID-03"
        if row["control_id"] in {"CTRL-157-01","CTRL-157-02","CTRL-157-03","CTRL-157-04"}:
            row["screen_ids"] += ";ENT-02;CON-01;NOT-01;DOC-01"
        for key in ["inline_help_and_example","validation_and_dependencies","required_and_default"]:
            row[key]=re.sub(r'\.{2,}', '.', row[key])
        row["error_copy"] = "Erro depende do estado: usar error_or_read_failure_copy em CONTROL_SCREEN_CONTRACTS.csv, nunca validar leitura como input"
        row["context_contract"] = "CONTROL_SCREEN_CONTRACTS.csv;lookup_by_screen_id_and_control_id"
        row["source_authority"] = "FINAL_OWNER_COMPLEMENT_2026-11-04;C3_DOMAIN_RULES;INDIVIDUAL_TASK_REVIEW"
        controls.append(row)
    for id_, screens, label, kind, required, validation, help_ in data.NEW_CONTROLS:
        row = {k: "" for k in controls[0]}
        row.update(control_id=id_, source_field_group="FINAL_C8_GAP", screen_ids=screens, label=label, order=f"FINAL.{id_.rsplit('-',1)[-1]}", control_type=kind, mask_inputmode="Conforme componente específico; conteúdo privado não é exportado", autocomplete="current-password" if id_ == "CTRL-C8-001" else "off", required_and_default=required, validation_and_dependencies=validation, empty_value="Ausência explícita sem declaração ou resultado inventados", inline_help_and_example=help_, error_copy="Usar contrato de interação por tela/estado", accessibility="Contrato contextual por tela; nunca erro de campo sobre valor somente leitura", responsive_layout="Mesmo agrupamento da ficha; uma coluna móvel", source="docs/audits/C/C7-decision-closure/SCIENCE_OWNER_REVIEW.md" if id_ in {"CTRL-C8-003","CTRL-C8-004","CTRL-C8-005"} else "docs/audits/C/C8-visual-blueprint/final_closure_design_data.py", status="TO_BE_SPECIFIED_NOT_IMPLEMENTED", context_contract="CONTROL_SCREEN_CONTRACTS.csv", source_authority="FINAL_OWNER_COMPLEMENT_2026-11-04;IDENTIFIED_SPECIFICATION_GAP")
        controls.append(row)
    for control in controls:
        presentation = data.CONTROL_PRESENTATIONS.get(control["control_id"]) or data.INPUT_PRESENTATIONS.get(control["control_type"])
        if presentation:
            control["mask_inputmode"], control["autocomplete"] = presentation
    by_id = {r["control_id"]: r for r in controls}
    old_screens = rows_from_original("docs/audits/C/C8-visual-blueprint/SCREEN_BLUEPRINTS.csv")
    assert set(data.SCREENS) == {r["screen_id"] for r in old_screens} and len(old_controls) == 262
    usages = [interaction(data, screen, control) for control in controls for screen in control["screen_ids"].split(";")]
    usage_map = {(r["screen_id"],r["control_id"]):r for r in usages}
    assert len(usage_map) == len(usages)

    edges = rows_from_original("docs/audits/C/C8-visual-blueprint/B1_TO_C3_SURFACE_CROSSWALK.csv")
    edge_review, corrected_edges = [], []
    for n, row in enumerate(edges, 1):
        before = row["c3_screen_id"]
        disposition = "CONFIRMED_INTENT_WITH_DISTINCT_TASK_STATE"
        if (row["b1_surface_id"], before) in {("OVL-003", "ID-02"), ("OVL-026", "NOT-02")}:
            edge_review.append({"original_edge": f"EDGE-{n:03}", "source_surface": row["b1_surface_id"], "original_target": before, "current_target": "", "review_result": "REMOVED_SPURIOUS_RELATION", "reason": "Editar conta global não é Meu perfil; alterar senha não é preferências de push"})
            continue
        if row["b1_surface_id"] == "SC-030" and before == "ID-02":
            row["c3_screen_id"] = "ADM-04"
            disposition = "CORRECTED_GLOBAL_TARGET_VERSUS_SELF_PROFILE"
        if row["b1_surface_id"] == "OVL-029":
            row["c3_screen_id"] = "REQ-03"
            disposition = "CORRECTED_REQ_CANCEL_ARCHIVE_NOT_SCIENCE_DIALOG"
        if row["b1_surface_id"] == "OVL-019" and before in {"COM-01", "ENT-01", "BAL-02"}:
            row["c3_screen_id"] = {"COM-01":"COM-02", "ENT-01":"ENT-03", "BAL-02":"BAL-03"}[before]
            disposition = "CORRECTED_RELATED_DOCUMENT_IS_READ_ONLY_DETAIL"
        target = row["c3_screen_id"]
        row["profile"] = next(s["profile"] for s in old_screens if s["screen_id"] == target)
        row["relationship_kind"] = "NEW_TASK_NO_AS_IS_EQUIVALENT" if not row["b1_surface_id"] else "READ_ONLY_RELATED_DOCUMENT" if row["b1_surface_id"] == "OVL-019" else "COMPATIBILITY_LINK" if row["b1_lifecycle"] in {"COMPATIBILITY","REDIRECT"} else "HISTORICAL_CANDIDATE_NOT_ACTIVE_UI" if row["b1_lifecycle"] == "UNCONSUMED" else "JOURNEY_HANDOFF_NOT_PERMISSION_EQUIVALENCE" if row["b1_surface_id"] == "SC-023" else "RELATED_TASK_WITH_CONTEXTUAL_VARIANTS"
        row["coverage_and_reason"] = f"Origem: {row['b1_intent'].strip()}. Destino: {target}, {data.SCREENS[target]['state']} Limite: {data.SCREENS[target]['guard']} Relação de intenção não torna campo editável nem transfere autoridade entre atores."
        row["review_result"] = disposition
        if row["b1_surface_id"] == "OVL-037":
            row["coverage_and_reason"] += " Flow é canal postergado; apenas referência de contrato futuro, sem ativar ou confirmar consumo por sugestão externa."
        if row["b1_surface_id"] == "OVL-013":
            row["coverage_and_reason"] += " Editor configure/assign consulta BAL-01; variantes recount e decide/deferral têm relações próprias adicionadas."
        corrected_edges.append(row)
        edge_review.append({"original_edge": f"EDGE-{n:03}", "source_surface": row["b1_surface_id"], "original_target": before, "current_target": target, "review_result": disposition, "reason": row["coverage_and_reason"]})
    origin = next(r for r in corrected_edges if r["b1_surface_id"] == "OVL-013")
    for target in ["BAL-04", "BAL-05"]:
        row = dict(origin)
        row.update(c3_screen_id=target, profile=next(s["profile"] for s in old_screens if s["screen_id"]==target), review_result="ADDED_MISSING_EDITOR_VARIANT", coverage_and_reason=f"OVL-013 possui variantes de reconto/adiamento/decisão além de configurar. {target}: {data.SCREENS[target]['guard']} {data.SCREENS[target]['readonly']}")
        corrected_edges.append(row)
    assert len(edge_review) == 171 and len(corrected_edges) == 171
    write_rows(OUT / "B1_TO_C3_SURFACE_CROSSWALK.csv", corrected_edges)
    write_rows(OUT / "SURFACE_RELATION_SEMANTIC_REVIEW.csv", edge_review)

    # Preserve all 4,205 exact B1 source cells. A replacement is based on the
    # literal and semantic context, never every string sharing a source line.
    old_copy = rows_from_original("docs/audits/C/C8-visual-blueprint/UI_COPY_AND_MICROCOPY_MASTER.csv")
    copies, copy_review = [], []
    exact_replacements = {
        "Aceitar convite com minha conta": "Aceitar vínculo com minha conta",
        "Confirmando…": "Aceitando vínculo…",
        "This page could not be found.": "Página não encontrada. Confira o endereço ou volte ao início permitido.",
        "Balanço semanal": "Balanço de estoque",
        "Compra de insumos": "Compra ou doação de insumos",
        "Automática · conteúdo exibido": "Registro histórico por exposição do cabeçalho",
        "Automática: conteúdo exibido": "Registro histórico por exposição do cabeçalho",
        "Duração em minutos": "Duração do plantão (minutos)",
        "Primeiro dia / âncora": "Primeiro dia da programação",
        "Fuso horário": "Horário de referência da programação",
        "Rascunho deste dispositivo recuperado.": "Preenchimento recuperado. Confira os dados e o estado do rascunho antes de concluir.",
    }
    unsafe_future = {"Ciência automática registrada após exibição do conteúdo.", "Rascunho incompleto salvo somente neste dispositivo. Nenhuma contagem foi emitida.", "Rascunho salvo neste dispositivo.", "Operação confirmada. Relatos só alteram o estoque após confirmação autorizada."}
    component_targets = {}
    for edge in corrected_edges:
        path = edge["b1_component"].split(":",1)[0]
        if path:
            component_targets.setdefault(path,set()).add(edge["c3_screen_id"])
    for row in old_copy:
        if not row["copy_id"].startswith("B1-"):
            continue
        old_proposed = row["proposed"]
        literal = row["current_exact"]
        dynamic = row["kind"] in {"DYNAMIC_VALUE","DYNAMIC_TEMPLATE","DYNAMIC_ATTRIBUTE"} or "SOURCE_EXPRESSION_CONTEXT" in row["decision_status"]
        row["screen_or_surface_ids"] = ";".join(sorted(component_targets.get(row["source"].split(":",1)[0],set())))
        row["proposed"] = "" if dynamic else exact_replacements.get(literal,literal)
        if literal == "Confirmando…" and "accept-invitation.tsx" not in row["source"]:
            row["proposed"] = literal
        if literal == "Produto" and "stock-console.tsx:196" in row["source"]:
            row["proposed"] = "Material"
        obsolete = literal in unsafe_future
        if obsolete:
            row["proposed"] = ""
        row["decision_status"] = "SOURCE_EXPRESSION_NOT_LITERAL_COPY;USE_TYPED_CONTEXT_PRESENTER" if dynamic else "HISTORICAL_BEHAVIOR_NOT_ADOPTED;USE_C8_STATE_COPY" if obsolete else "EXACT_LITERAL_CONTEXT_REPLACEMENT" if row["proposed"] != literal else "SOURCE_REFERENCE_RETAINED;C8_STATE_CONTRACT_TAKES_PRECEDENCE"
        row["decision_dependency"] = "P02_OWNER_APPROVED;SCI_005_INVARIANT;SPECIFIC_EXTERNAL_GATES_ONLY"
        row["review_basis"] = "EXACT_LITERAL_AND_MEANING;NOT_SOURCE_LINE_SUBSTITUTION"
        row["normative_future_copy"] = "NO_HISTORICAL_SOURCE_REFERENCE;USE_CONTEXTUAL_C8_COPY_OR_EXPLICIT_REPLACEMENT"
        copies.append(row)
        copy_review.append({"copy_id":row["copy_id"],"source":row["source"],"original_proposed":old_proposed,"corrected_proposed":row["proposed"],"review_result":row["decision_status"],"reason":"Preservar função textual e condição da origem; mensagem de sucesso não substitui título, botão, vazio, data, fuso ou expressão dinâmica" if old_proposed != row["proposed"] else "Origem exata preservada como referência histórica; consumidor futuro obedece contrato contextual da ficha"})
    assert len(copies) == 4205

    screens, screen_review = [], []
    for old in old_screens:
        sid, detail = old["screen_id"], data.SCREENS[old["screen_id"]]
        desktop, mobile, keyboard = data.LAYOUTS[detail["layout"]]
        own = [r for r in usages if r["screen_id"] == sid]
        screen = dict(old)
        if sid == "REQ-04":
            screen.update(primary_action="Confirmar ciência e abrir", secondary_actions="Voltar sem registrar; Consultar política de ciência", consequence="Só confirmação elegível registra ciência; não comprova leitura integral nem recebimento", profile="Pessoa familiar habilitada com vínculo e req.science vigentes")
        if sid == "NOT-02":
            screen["specific_rule"] = "P02 aprovada; três modalidades por obrigação elegível; SCI-005 permanente fora de qualquer opção de desativação"
        if sid == "ADM-03":
            screen["specific_rule"] = "ANY familiar e SCI-005 invariáveis; P11 revisão facultativa; propostas não alteram imediatamente regra vigente"
        if sid == "DOC-05":
            screen["primary_action"] = "Verificar este exemplar"
        if sid == "COM-03":
            screen["primary_action"] = "Validar a parcela exibida"
        screen["composition"] = detail["sequence"]
        screen["specific_rule"] = detail["readonly"]
        screen["control_ids"] = ";".join(r["control_id"] for r in own)
        screen["b1_surface_ids"] = ";".join(dict.fromkeys(r["b1_surface_id"] for r in corrected_edges if r["c3_screen_id"]==sid and r["b1_surface_id"]))
        screen["process_states"] = detail["state"]
        screen["write_authority"] = detail["guard"]
        screen["recovery_contract"] = detail["recovery"]
        screen["blocking_read_dependencies"] = data.READ_DEPENDENCY_GUARDS.get(sid,"Informação indisponível não recebe valor inventado; bloquear somente ação que depende dela, preservando consultas e encaminhamentos autorizados.")
        screen["desktop_composition"] = desktop
        screen["mobile_composition"] = mobile
        screen["focus_and_accessibility"] = keyboard
        screen["reconstruction_decision"] = detail["reconstruction"]
        screen["acceptance_ids"] += ";C-FINAL-AC-022;C-FINAL-AC-023;C-FINAL-AC-025"
        if sid in {"REQ-03","REQ-04","ENT-01","NOT-02","ADM-03","ID-04"}:
            screen["acceptance_ids"] += ";C-FINAL-AC-001;C-FINAL-AC-002;C-FINAL-AC-003"
        screens.append(screen)
        for kind, value in screen_copy(sid,screen,detail).items():
            copies.append({"copy_id":f"COPY-{sid}-{kind}","screen_or_surface_ids":sid,"source":f"docs/audits/C/C8-visual-blueprint/screens/{sid}.md","kind":kind,"current_exact":"","proposed":value,"context_and_condition":detail["state"] + ("; MODELO_COM_ETAPAS_SUBSTITUIR_SOMENTE_COM_RESULTADOS_CONFIRMADOS" if kind=="PARTIAL_SAVE" else ""),"source_classification":"TO_BE_SCREEN_STATE_COPY","decision_status":"NOT_RENDERED_NOT_APPLICABLE" if value.startswith("NÃO_APLICÁVEL") else "CONTEXTUAL_COPY_SPECIFIED_NOT_IMPLEMENTED","decision_dependency":"P02_OWNER_APPROVED;SPECIFIC_EXTERNAL_GATES_ONLY","verification":"SEMANTIC_STATIC_REVIEW;NO_RUNTIME_OR_HUMAN_ACCEPTANCE","review_basis":"INDIVIDUAL_SCREEN_TASK_AND_STATE"})
        lines = [f"# {sid} — {screen['title']}","","Direção visual OWNER_APPROVED. Especificação TO_BE; nenhuma tela implementada", "nesta revisão. Ordem complementar definitiva prevalece sobre exemplos antigos.","","## 1–3. Finalidade, autorização e estado","",detail["state"],"", "Finalidade: " + screen["title"] + ".", "",detail["guard"],"","AS_IS/rota: " + screen["route_as_is_to_be"] + ".","","## 4–14. Campos, modos de interação e validação","",detail["readonly"],"","Cada ocorrência abaixo resolve o controle no estado desta tarefa. READ_ONLY", "é texto/comparação, não um input disabled. Subformulário só aparece quando", "sua condição/autoridade é satisfeita; consultar não abre edição automaticamente.",""]
        for usage in own:
            lines += [f"### {usage['control_id']} — {usage['label']}","",f"**Modo/componente:** {usage['interaction_mode']} / {usage['component_in_this_state']}.","",f"**Quando/ator:** {usage['state_and_actor_condition']}.","",f"**Obrigatoriedade/inicial:** {usage['required_and_initial_value']}.","",f"**Máscara/apresentação:** {usage['mask_or_presentation']}. Autocomplete: {usage['autocomplete']}.","",f"**Validação:** {usage['validation_and_authority']}.","",f"**Ajuda/exemplo:** {usage['help_and_example']}",""]
            if usage["error_or_read_failure_copy"]:
                lines += ["**Mensagem e condição:** “" + usage["error_or_read_failure_copy"] + "” — " + usage["error_condition"] + ".",""]
            lines += ["**Acessibilidade:** " + usage["accessibility"] + ".",""]
        if not own:
            lines += ["Não há campo de negócio digitável nesta tarefa; navegação/instrução seguem as ações abaixo.",""]
        lines += ["## 15–18. Hierarquia, ações, consequências e mensagens","",detail["sequence"],"",desktop,"",f"Primária: **{screen['primary_action']}**. Secundárias: {screen['secondary_actions']}.","", "Efeito: " + screen["consequence"] + ".", "", "Sucesso/resultado: “" + detail["success"] + "”", "", "Vazio/inelegível: “" + detail["empty"] + "”", "", "Alertas de consulta/validação permanecem inline na seção. Diálogo somente para", "decisão/consentimento/descarte que o exige; nunca para cada filtro ou aviso.", "", "## 19–20. Falhas, recuperação e continuidade", "",detail["recovery"],"","Leitura falha repete consulta da seção. Escrita incerta consulta a mesma", "intenção antes de novo comando. Recusa comprovada, confirmado, conflito e", "incerto têm resultados distintos; nenhuma mensagem presume que nada ocorreu.","","Voltar conserva contexto/edição permitidos e devolve foco ao acionador. Depois", "de resultado confirmado, abrir o alvo/resultado existente, sem repetir o ato.","","## 21–24. Móvel, acessibilidade, referência e negócio","",mobile,"",keyboard,"","Identidade aprovada: teal/papel claro, tipografia hierárquica, bordas suaves,", "cards e barra de contexto. Prioridade da tarefa e regras de autorização", "governam o layout; exemplos do protótipo não são controles obrigatórios.","", "Referência do protótipo: " + screen["prototype_reference"] + ". Sem captura real ou aceite humano de interface futura nesta C.","",detail["reconstruction"],"","## Contratos e aceites relacionados","", "[Catálogo de controles](../FORM_CONTROL_CATALOG.csv),", "[interação por tela/estado](../CONTROL_SCREEN_CONTRACTS.csv) e", "[microcopy canônica](../UI_COPY_AND_MICROCOPY_MASTER.csv).", "", "Aceites de domínio existentes: " + screen["acceptance_ids"] + ".", "Associação de domínio não significa execução em cada tela; a D seleciona", "cenário/estado conforme o caso. C-FINAL-AC-025 percorre as 66 fichas.", ""]
        (OUT / "screens" / f"{sid}.md").write_text("\n".join(lines),encoding="utf-8",newline="\n")
        sheet=OUT/"screens"/f"{sid}.md"
        body=sheet.read_text(encoding="utf-8")
        body=body.replace("## 19–20. Falhas, recuperação e continuidade\n\n","## 19–20. Falhas, recuperação e continuidade\n\n"+screen["blocking_read_dependencies"]+"\n\n")
        sheet.write_text(body,encoding="utf-8",newline="\n")
        screen_review.append({"screen_id":sid,"purpose":screen["title"],"authorized_profile":detail["guard"],"process_state":detail["state"],"visible_fields":";".join(u["control_id"] for u in own if u["interaction_mode"] not in {"HIDDEN","INTERNAL"}),"editable_fields":";".join(u["control_id"] for u in own if u["interaction_mode"] in {"EDITABLE","EDITABLE_SUBFORM","FILTER","SELECTION"}),"read_only_fields":";".join(u["control_id"] for u in own if u["interaction_mode"].startswith("READ_ONLY")),"calculated_fields":";".join(u["control_id"] for u in own if u["interaction_mode"]=="CALCULATED"),"automatic_fields":";".join(u["control_id"] for u in own if u["interaction_mode"] in {"AUTO_FILLED","INTERNAL"}),"control_types":"CONTROL_SCREEN_CONTRACTS.csv;"+sid,"required_values":"Per control/state, not inherited creation defaults in review","initial_values":"Per control/state; zero/unknown/unfilled distinct; no implicit material consent","masks_validation":"Per usage; read-only outputs have presentation, no user correction","contextual_help":"Per usage; domain guard: "+detail["guard"],"examples":"Per control/state and fictitious data; no authority inferred from example","hierarchy":detail["sequence"],"available_actions":screen["primary_action"]+";"+screen["secondary_actions"],"action_consequence":screen["consequence"],"success_error_messages":detail["success"]+";read errors and uncertainty are separate","failure_recovery":detail["recovery"],"navigation_continuity":"Return preserves context and focus; confirmed action opens same result","mobile":mobile,"accessibility":keyboard,"approved_reference_consistency":screen["prototype_reference"]+";visual identity preserved, process corrected","business_consistency":detail["readonly"],"reconstruction":detail["reconstruction"],"dimensions_reviewed":"24_INDIVIDUAL_TASK_DIMENSIONS;NOT_A_RUNTIME_OR_HUMAN_ACCEPTANCE","status":"SEMANTIC_REVIEW_COMPLETED;D_NOT_IMPLEMENTED"})

    for usage in usages:
        if usage["interaction_mode"] in {"HIDDEN","INTERNAL"}:
            continue
        for kind,value in {"LABEL":usage["label"],"INLINE_HELP":usage["help_and_example"],"READ_ERROR" if usage["interaction_mode"] in {"READ_ONLY","READ_ONLY_WITH_LINK","READ_ONLY_WITH_ACCOUNT_SWITCH","CALCULATED","AUTO_FILLED","SENSITIVE_READ_ONLY"} else "FIELD_ERROR":usage["error_or_read_failure_copy"]}.items():
            copies.append({"copy_id":f"COPY-{usage['screen_id']}-{usage['control_id']}-{kind}","screen_or_surface_ids":usage["screen_id"],"source":"CONTROL_SCREEN_CONTRACTS.csv;"+usage["usage_id"],"kind":kind,"current_exact":"","proposed":value,"context_and_condition":usage["state_and_actor_condition"]+";"+usage["error_condition"],"source_classification":"CONTEXTUAL_CONTROL_COPY","decision_status":"CONTEXTUAL_COPY_SPECIFIED_NOT_IMPLEMENTED","decision_dependency":"P02_OWNER_APPROVED;SPECIFIC_EXTERNAL_GATES_ONLY","verification":"STATIC_SEMANTIC_REVIEW;NOT_RUNTIME_ACCEPTANCE","review_basis":"CONTROL_SCREEN_STATE_MODE;READ_OUTPUT_IS_NOT_EDITABLE_INPUT"})
    write_rows(OUT / "CONTROL_SCREEN_CONTRACTS.csv",usages)
    write_rows(OUT / "SCREEN_BLUEPRINTS.csv",screens)
    write_rows(OUT / "SCREEN_SEMANTIC_REVIEW.csv",screen_review)
    write_rows(OUT / "FORM_CONTROL_CATALOG.csv",controls)
    write_rows(OUT / "UI_COPY_AND_MICROCOPY_MASTER.csv",copies)
    write_rows(OUT / "MICROCOPY_SEMANTIC_REVIEW.csv",copy_review)
    control_review=[]
    for before in old_controls:
        after=by_id[before["control_id"]]
        own=[u for u in usages if u["control_id"]==before["control_id"]]
        control_review.append({"control_id":before["control_id"],"original_screens":before["screen_ids"],"current_screens":after["screen_ids"],"original_type":before["control_type"],"corrected_type":after["control_type"],"review_result":"CORRECTED_COMPONENT_AND_CONTEXT" if before["control_type"]!=after["control_type"] else "CONTEXT_AND_DOMAIN_RULE_REVIEWED","state_contracts":";".join(u["usage_id"] for u in own),"modes":";".join(dict.fromkeys(u["interaction_mode"] for u in own)),"error_review":"Read-only/calculated/automatic use section read failure; editable uses contextual validation; internal/hidden no user message","required_default_review":after["required_and_default"],"specific_validation_review":after["validation_and_dependencies"],"identity_and_authority_review":"Value never grants actor capability; task/state/target checked separately","prototype_and_mobile_review":"Task layout family and mobile/focus contract in each screen","status":"INDIVIDUALLY_REVIEWED_ORIGINAL_CONTROL;NOT_RUNTIME_ACCEPTANCE"})
    for before, review in zip(old_controls, control_review):
        review["original_presentation"] = before["mask_inputmode"]
        review["corrected_catalog_presentation"] = by_id[before["control_id"]]["mask_inputmode"]
        review["contextual_presentation_authority"] = "CONTROL_SCREEN_CONTRACTS.csv; current component and state govern each actual use"
    write_rows(OUT / "CONTROL_SEMANTIC_REVIEW.csv",control_review)
    # C3 is the functional summary; C8 resolves each constituent control/state.
    inventory=rows_from_original("docs/audits/C/C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv")
    fields=[r for r in inventory if r["record_type"]=="FIELD"]
    for n,row in enumerate(fields,1):
        members=[c for c in controls if group_number(c)==n]
        own=[u for u in usages if u["control_id"] in {c["control_id"] for c in members}]
        row["type_source"]="; ".join(f"{u['screen_id']} {u['label']}: {u['interaction_mode']} ({u['component_in_this_state']}); {u['state_and_actor_condition']}" for u in own)
        row["required_default"]="; ".join(dict.fromkeys(u["screen_id"]+" "+u["label"]+": "+u["required_and_initial_value"] for u in own))
        row["validation_unit"]="; ".join(dict.fromkeys(u["screen_id"]+" "+u["label"]+": "+u["validation_and_authority"] for u in own))
        row["help_example"]="; ".join(dict.fromkeys(u["screen_id"]+" "+u["label"]+": "+u["help_and_example"] for u in own))
        row["screen_scope"]=";".join(dict.fromkeys(cscreen for c in members for cscreen in c["screen_ids"].split(";")))
        row["state_policy"]="C8 CONTROL_SCREEN_CONTRACTS.csv; choose by screen/control/state; never inherit editable creation controls into review or history"
        row["authorization"]="; ".join(dict.fromkeys(data.SCREENS[s]["guard"] for s in row["screen_scope"].split(";")))
    screen_sources={r["screen_scope"]:r for r in inventory if r["record_type"]=="SCREEN_ACTIONS"}
    for control in controls:
        if control["control_id"].startswith("CTRL-C8-"):
            first=control["screen_ids"].split(";")[0]
            template=screen_sources[first]
            row={k:"" for k in fields[0]}
            row.update(record_type="FIELD",domain=template["domain"],screen_scope=control["screen_ids"],route_or_surface=template["route_or_surface"],field_label=control["label"],type_source=control["control_type"]+";context by CONTROL_SCREEN_CONTRACTS.csv",required_default=control["required_and_default"],validation_unit=control["validation_and_dependencies"],help_example=control["inline_help_and_example"],actions_outcome="See individual task/state; never infer authority from field",state_policy="C8 per-screen interaction mode",authorization="; ".join(dict.fromkeys(data.SCREENS[s]["guard"] for s in control["screen_ids"].split(";"))),source_spec=template["source_spec"],source_line="0",status="TO_BE_SPECIFIED_NOT_IMPLEMENTED")
            fields.append(row)
            inventory.append(row)
    paths={r["source_spec"] for r in fields}
    for path in paths:
        domain_rows=[r for r in fields if r["source_spec"]==path]
        text=original(path)
        matches=list(re.finditer(r'<!-- c-table:start -->.*?<!-- c-table:end -->',text,re.S))
        if len(matches)<2:
            raise ValueError("Expected field table in "+path)
        replacement=["<!-- c-table:start -->",""]
        for field in domain_rows:
            replacement += [f"- **Campo:** {field['field_label']}","", "  **Tipo/origem por tela e estado:** "+field["type_source"],"", "  **Obrigatoriedade/default na preparação:** "+field["required_default"],"", "  **Validação/unidade:** "+field["validation_unit"],"", "  **Ajuda/exemplo:** "+field["help_example"],""]
        replacement += ["<!-- c-table:end -->"]
        start,end=matches[1].span()
        text=text[:start]+"\n".join(replacement)+text[end:]
        (ROOT/path).write_text(text,encoding="utf-8",newline="\n")
    for row in fields:
        lines=(ROOT/row["source_spec"]).read_text(encoding="utf-8").splitlines()
        needle="- **Campo:** "+row["field_label"]
        row["source_line"]=str(next(i for i,line in enumerate(lines,1) if line==needle))
    write_rows(C / "C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv",inventory)
    for control in controls:
        n=group_number(control)
        if n:
            control["source"]=fields[n-1]["source_spec"]+":"+fields[n-1]["source_line"]
        elif control["control_id"].startswith("CTRL-C8-"):
            row=next(r for r in fields if r["field_label"]==control["label"])
            control["source"]=row["source_spec"]+":"+row["source_line"]
    write_rows(OUT / "FORM_CONTROL_CATALOG.csv",controls)
    summary={"original_screens_reviewed":66,"original_controls_reviewed":262,"additional_controls":len(data.NEW_CONTROLS),"current_controls":len(controls),"control_screen_contracts":len(usages),"original_surface_relations_reviewed":len(edge_review),"current_surface_relations":len(corrected_edges),"source_B1_copy_rows_reviewed_preserved":4205,"source_copy_proposals_corrected":sum(r["original_proposed"]!=r["corrected_proposed"] for r in copy_review),"component_types_corrected":sum(r["original_type"]!=r["corrected_type"] for r in control_review),"current_copy_rows":len(copies),"prototype":"HTML_AND_8_PNG_PRESERVED;APPROVED_DIRECTION;NOT_RECREATED","evidence_class":"STATIC_SEMANTIC_AND_REFERENCE_IMAGE_REVIEW;NO_PRODUCT_IMPLEMENTATION_OR_HUMAN_ACCEPTANCE"}
    (OUT/"FINAL_REVIEW_COUNTS.json").write_text(json.dumps(summary,ensure_ascii=False,indent=2)+"\n",encoding="utf-8",newline="\n")
    print(json.dumps(summary,ensure_ascii=False))


if __name__=="__main__":
    main()
