"""Build traceable screen/control/copy specifications, never app components."""
from pathlib import Path
import csv
import importlib.util
import json
import re

ROOT = Path(__file__).resolve().parents[4]
BASE = ROOT / "docs/audits/C"
OUT = Path(__file__).resolve().parent
B1 = ROOT / "docs/audits/B/B1/2026-10-28-phase-b1-interface"


def read(path):
    with path.open(encoding="utf-8-sig", newline="") as stream:
        return list(csv.DictReader(stream))


def write(path, rows):
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]), lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)


def load():
    spec = importlib.util.spec_from_file_location("blueprint_design_data", OUT / "blueprint_design_data.py")
    data = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(data)
    return data


SPLITS = {
    28:["Origem", "Destino"],29:["Material", "Quantidade expedida"],37:["Problema", "Ressalva"],40:["Devolvido", "Consumo já confirmado"],
    44:["Fuso", "Dia da semana", "Tipo de plantão"],50:["Atribuição", "Início da janela", "Fim da janela", "Versão da atribuição"],
    58:["Duração em minutos", "Fim padrão"],61:["Data inicial", "Data final"],65:["Data âncora", "Válido até"],
    66:["Data da exceção", "Ação da exceção"],68:["Motivo", "Notas"],78:["Origem", "Destino"],79:["Contraparte", "Recebedor físico"],
    80:["Estado do movimento", "Data inicial", "Data final"],86:["Descrição", "Ordem"],109:["Função profissional", "Registro profissional"],
    111:["Telefone", "Código de confirmação"],112:["Novo e-mail", "Novo telefone"],113:["Papel", "Estado do vínculo"],
    114:["Capacidade", "Override"],115:["Validade do convite", "Emissor do convite"],119:["Sessão", "Descrição do aparelho"],
    124:["Original", "Derivado", "Transformação aplicada"],125:["Tipo do rascunho", "Alvo e intenção"],126:["Conteúdo da edição", "Etapa atual"],
    127:["Versão documental base", "Revisão do ledger base", "Versão da política base"],128:["Salvo em", "Revisão do rascunho"],
    143:["Documento", "Tipo", "Protocolo"],144:["Versão da ficha", "Revisão do renderizador"],145:["Data do fato", "Data do registro", "Data da emissão"],
    146:["Autor do fato", "Revisor", "Recebedor"],147:["Estado da linha", "Estado do documento"],148:["Motivo", "Ressalva", "Antes e depois"],
    153:["Paciente", "Modo de atuação"],154:["Nome do paciente", "Estado ativo"],156:["Seção", "Buscar"],
    157:["Estado", "Tipo", "Data inicial", "Data final", "Responsável"],159:["Página", "Cursor", "Total consultado"],
    160:["Proposta", "Versão da proposta"],162:["Capacidade proposta", "Política proposta"],165:["Job", "Tentativa", "Referência externa"],
    166:["Fato físico", "Tipo de processo"],167:["Paciente", "Referência conhecida"],168:["Data do fato", "Hora do fato", "Fuso do fato"],
    169:["Pessoa que realizou", "Pessoa que recebeu"],170:["Material", "Unidade", "Quantidade física", "Custódia"],
    171:["Ressalva", "Evidência física"],172:["Conciliador", "Decisão"],174:["Titular", "Substituto", "Prazo de resposta"],
}

READONLY = {1,13,21,47,49,50,69,76,93,101,115,119,122,123,124,125,127,128,137,141,142,143,144,145,146,147,150,151,153,158,159,160,164,165}
QUANTITIES = {3,16,18,19,20,25,36,40,48,58,73,84,91,92,99}
SEARCH = {2,15,17,30,31,35,38,46,53,54,59,60,70,71,74,78,79,82,83,88,90,96,98,113,114,132,133,155,162}
CHOICE = {12,14,22,27,28,43,44,63,64,66,67,72,80,87,95,102,117,129,130,131,134,135,138,140,154,156,157,166,172}
MULTILINE = {6,8,9,23,24,26,32,33,37,39,41,42,51,55,68,75,85,86,94,97,100,103,118,121,126,148,161,171}


def control_type(number, label):
    if number in READONLY:
        return "READ_ONLY_DESCRIPTION", "SEM_MASCARA;valor do servidor", "off"
    if number in {120,149} or label == "Evidência física":
        return "FILE_PICKER", "MIME/bytes/limite do transporte; não extensão apenas", "off"
    if number in {106,107}:
        return "PASSWORD_WITH_REVEAL", "Sem máscara de conteúdo; limite em bytes; mostrar/ocultar com nome acessível", "current-password" if number == 106 else "new-password"
    if label in {"E-mail de acesso", "Novo e-mail", "Administrador inicial"}:
        return "EMAIL_INPUT", "Formato e-mail; sem autocapitalização", "email"
    if "telefone" in label.lower():
        return "TEL_INPUT", "E.164; prefixo internacional e7–15 dígitos; formato visual não altera valor", "tel"
    if label == "Código de confirmação":
        return "OTP_INPUT", "6–8 dígitos conforme contrato Auth; nunca em screenshot/log", "one-time-code"
    if "Data" in label or label in {"Válido até", "Início do regime"}:
        return "DATE_INPUT", "DD/MM/AAAA na apresentação; ISO no transporte; não inferir fuso", "off"
    if "Hora" in label or label in {"Início padrão", "Fim padrão"}:
        return "TIME_INPUT", "HH:mm com data de fim/+1dia quando aplicável", "off"
    if label in {"Fuso", "Fuso do fato"}:
        return "SEARCHABLE_TIMEZONE", "Zona IANA configurada, exemplo America/Sao_Paulo", "off"
    if number == 29:
        return ("SEARCHABLE_COMBOBOX", "Busca nome/alias; ID selecionado", "off") if label == "Material" else ("DECIMAL_TEXT_INPUT", "Vírgula/ponto; string exata; unidade junto; sem arredondar", "off")
    if number in QUANTITIES or label == "Quantidade física":
        return "DECIMAL_TEXT_INPUT", "Vírgula/ponto; inputmode decimal; precisão antes da coerção; zero só onde permitido", "off"
    if number in {4,5,27,43,87,135} or label == "Estado ativo":
        return "CHECKBOX_OR_SWITCH", "Sem máscara; rótulo descreve efeito; vazio não equivale a concordância", "off"
    if number in SEARCH or label in {"Material", "Contraparte", "Recebedor físico", "Responsável", "Titular", "Substituto", "Conciliador"}:
        return "SEARCHABLE_COMBOBOX", "Busca por nome/alias autorizado; seleção por ID; nenhum ID digitado como autorização", "off"
    if number in CHOICE:
        return "RADIO_OR_SELECT", "Opções finitas com rótulo humano; sem opção material preaceita", "off"
    if number in MULTILINE:
        return "TEXTAREA", "Sem máscara; contador e limite do contrato visíveis; quebra de linha/reflow", "off"
    if number == 108:
        return "TEXT_INPUT", "Nome completo; não validar identidade por string", "name"
    return "TEXT_INPUT", "Sem máscara artificial; preservar texto e limite do contrato", "off"


def main():
    data = load()
    source_inventory = read(BASE / "C3-functional-specification/SCREEN_FIELD_ACTION_INVENTORY.csv")
    source_screens = {r["screen_scope"]: r for r in source_inventory if r["record_type"] == "SCREEN_ACTIONS"}
    fields = [r for r in source_inventory if r["record_type"] == "FIELD"]
    designs = [line.split("|") for line in data.SCREENS.strip().splitlines()]
    assert len(designs) == 66 and all(len(row) == 9 for row in designs)
    assert {r[0] for r in designs} == set(source_screens)
    controls = []
    for number, field in enumerate(fields, 1):
        labels = SPLITS.get(number, [field["field_label"]])
        for subindex, label in enumerate(labels, 1):
            kind, mask, autocomplete = control_type(number, label)
            validation = field["validation_unit"]
            if number in {111,112}:
                validation = validation.replace("Telefone + e ", "Telefone E.164 com prefixo internacional e ")
            help_copy = field["help_example"]
            required = field["required_default"]
            if number == 31:
                validation = "Pessoa vinculada/elegível; escala sugere; escolha manual pela família com exceção registrada P06"
            if number == 52:
                required = "Somente se revisão facultativa for iniciada; não universal"
            if number == 109:
                required = "Função individual; registro só quando aplicável à profissão P01"
                help_copy = "Informado, conferido pela família e validado externamente são estados distintos; cuidadora sem registro aplicável não fornece COREN fictício."
            if number == 129:
                help_copy = "Continuar rascunho ou Descartar e começar nova; um por usuário/paciente/tipo de criação e por alvo contextual P12."
            row = {
                "control_id": f"CTRL-{number:03}-{subindex:02}", "source_field_group": f"C3-FIELD-{number:03}",
                "screen_ids": field["screen_scope"].replace(",", ";"), "label": label,
                "order": f"{number}.{subindex}", "control_type": kind, "mask_inputmode": mask,
                "autocomplete": autocomplete, "required_and_default": required,
                "validation_and_dependencies": validation,
                "empty_value": "Manter ausência distinta de zero; não criar aceite/contagem/consentimento por default",
                "inline_help_and_example": help_copy,
                "error_copy": f"Revise {label.lower()}: " + validation + ".",
                "accessibility": "Label visível + describedby de ajuda/erro; aria-invalid e foco no primeiro inválido; combobox/setas/Enter/Escape conforme controle; dados preservados ao voltar",
                "responsive_layout": "Duas colunas só quando cabem label/unidade/erro; 320–650 uma coluna; quantidade e unidade juntas; revisão em leitura; sem rolagem global",
                "source": field["source_spec"] + ":" + field["source_line"],
                "status": "TO_BE_SPECIFIED_NOT_IMPLEMENTED",
            }
            controls.append(row)
    extra_fields = [
        ("ID-02;ID-04","Situação da credencial","RADIO_OR_SELECT","Informado/conferido pela família/validado externamente; última opção só com prova externa","Nenhum selo automático"),
        ("ID-04","Quem conferiu a credencial","READ_ONLY_DESCRIPTION","Identidade do administrador familiar que realizou a conferência","Servidor, não nome livre atribuído a terceiro"),
        ("ID-04","Data e resultado da conferência","READ_ONLY_DESCRIPTION","Instante/valor conferido/resultado preservados; dado alterado pede nova conferência","Não editar histórico da conferência"),
        ("ID-04;GUI-02","Mostrar guia no primeiro acesso","CHECKBOX_OR_SWITCH","Configuração por administração autorizada; usuário pode reabrir no perfil","Escolha explícita no cadastro/vínculo; sem mudar permissões"),
        ("DOC-02;DOC-03;DOC-04","Identificador da emissão","READ_ONLY_DESCRIPTION","ID opaco do exemplar emitido; distinto da versão da ficha","Emissão nº2 da versão3"),
        ("DOC-03","Exemplar a baixar","RADIO_OR_SELECT","Selecionar emissão existente; bytes idênticos no novo download","Não selecionar nova emissão silenciosamente"),
        ("DOC-03","Solicitante e instante da emissão","READ_ONLY_DESCRIPTION","Pessoa autorizada solicitante e timestamp/fuso persistidos","Sistema é signatário técnico, não a pessoa solicitante"),
        ("DOC-05","Assinatura e cadeia de confiança","READ_ONLY_DESCRIPTION","Íntegra/adulterada, confiável/desconhecida/revogada/expirada separados; indisponível é outro estado","Não equivaler a assinatura pessoal ou fato físico"),
        ("GUI-02","Paciente e residência","TEXT_INPUT","Nome2–160 e estado escolhido respeitado; sem fixtures em operação","Nova residência somente pelo global"),
        ("GUI-02","Fuso da residência","SEARCHABLE_TIMEZONE","Zona IANA escolhida; não herdar do aparelho","America/Sao_Paulo"),
        ("GUI-02","Administrador familiar inicial","EMAIL_INPUT","E-mail confirmado explicitamente e vínculo inicial autorizado","Global não recebe capacidade operacional por criar"),
        ("GUI-02","Equipe a vincular","SEARCHABLE_COMBOBOX","Pessoas/credenciais individuais e convites com aceite pessoal","Sem contas compartilhadas"),
        ("GUI-02","Materiais e apresentações","MULTISELECT_SEARCH","Adotar modelo explicitamente; unidades/fatores preservados","Catálogo começa sem dados de outro paciente"),
        ("GUI-02","Saldo físico inicial por custódia","DECIMAL_TEXT_INPUT","Origem/motivo/quantidade reais; movimento próprio de abertura","Não criar contagens passadas fictícias"),
        ("GUI-02","Escalas e regime BAL","CONFIGURATION_SUMMARY","Horários/fuso/recorrência, revisão facultativa no primeiro uso","Preparação encaminha aos formulários autorizados"),
        ("GUI-02","Comunicação e contingência","CONFIGURATION_SUMMARY","P02 por tipo ainda bloqueada, avisos/donos/canais reais e backup a contratar","Configuração não é homologação"),
        ("ENT-06;GUI-03","Motivo e base da regularização","TEXTAREA","Fato, motivo excepcional, autoridade, medidas, ressalvas e evidências","Sem inventar declaração pessoal"),
        ("GUI-03","Comunicar envolvidos com segurança","CHECKLIST","Pessoa/canal/base legítima; proporcional, inclusive desligado quando cabível","Tentativa não comprova leitura/recebimento"),
        ("ID-05","Resultado da intenção consultada","READ_ONLY_DESCRIPTION","Recusa sem persistência vs confirmado vs ainda incerto","Não afirmar ação não registrada antes da consulta quando resultado incerto"),
        ("RAS-01","Confirmar descarte somente do rascunho","EXPLICIT_DESTRUCTIVE_CONFIRMATION","Escopo privado/tipo/alvo e versão; sem apagar documentos, ready ou preservação obrigatória","Sem opção destrutiva default"),
    ]
    for number, (screens, label, kind, validation, example) in enumerate(extra_fields, 1):
        controls.append({"control_id": f"CTRL-C7-{number:03}", "source_field_group": "OWNER_C7_COMPLEMENT", "screen_ids": screens, "label": label, "order": f"C7.{number}", "control_type": kind, "mask_inputmode": "Conforme tipo; string decimal exata/data local com fuso; identificador opaco só leitura", "autocomplete": "email" if kind == "EMAIL_INPUT" else "off", "required_and_default": "Conforme etapa; leitura de servidor ou escolha explícita; sem confirmação material por default", "validation_and_dependencies": validation, "empty_value": "Ausência explícita, sem zero/aceite/credencial inventados", "inline_help_and_example": example, "error_copy": "Revise " + label.lower() + ". " + validation, "accessibility": "Rótulo/ajuda/erro associados; teclado/foco e anúncio do resultado; não só cor/ícone", "responsive_layout": "Uma coluna em móvel; prévia antes/depois empilhada; ação sempre visível sem cobrir teclado", "source": "docs/audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md", "status": "TO_BE_SPECIFIED_NOT_IMPLEMENTED"})
    write(OUT / "FORM_CONTROL_CATALOG.csv", controls)

    b1_rows = read(B1 / "01_INTERFACE_INVENTORY.csv")
    edges = []
    for original in b1_rows:
        id_ = original["surface_id"]
        if id_.startswith("SC-"):
            targets = data.SC_MAPPING[int(id_.split("-")[1])].split(",")
        elif id_.startswith("OVL-"):
            targets = data.OVL_MAPPING[int(id_.split("-")[1])].split(",")
        else:
            assert id_.startswith("DEMO-")
            targets = ["DOC-02", "DOC-03"]
        disposition = "REFORMULAR" if original["lifecycle"] not in {"COMPATIBILITY", "REDIRECT", "UNCONSUMED", "PUBLIC_DEMO"} else "PRESERVAR"
        reason = "Origem e destino têm intenções relacionadas; contrato/controle/estado detalhados na ficha C8; equivalência não é identidade de denominadores"
        if original["lifecycle"] == "UNCONSUMED":
            disposition = "REMOVER_COM_JUSTIFICATIVA"
            reason = "Candidato sem consumidor demonstrado; função já coberta no destino. Remoção somente em D autorizada, após grafo/URLs/assets; nada removido nesta C"
        for target in targets:
            design = next(r for r in designs if r[0] == target)
            edges.append({"b1_surface_id": id_, "b1_route": original["route"], "b1_component": original["component"], "b1_type": original["type"], "b1_lifecycle": original["lifecycle"], "b1_intent": original["human_intent"], "b1_evidence": original["evidence"], "c3_screen_id": target, "disposition": disposition, "profile": design[2], "prototype_reference": design[7], "control_reference": "FORM_CONTROL_CATALOG.csv;screen_ids=" + target, "coverage_and_reason": reason, "evidence_class": "B1_HISTORICAL_INVENTORY_PLUS_C8_STATIC_DESIGN;NOT_NEW_RUNTIME", "implementation": "NOT_STARTED_PHASE_D"})
    covered = {r["c3_screen_id"] for r in edges}
    for screen in source_screens:
        if screen not in covered:
            design = next(r for r in designs if r[0] == screen)
            edges.append({k: "" for k in edges[0]})
            edges[-1].update({"b1_surface_id": "", "c3_screen_id": screen, "disposition": "NEW_C3_NO_B1_EQUIVALENT", "profile": design[2], "prototype_reference": design[7], "control_reference": "FORM_CONTROL_CATALOG.csv;screen_ids=" + screen, "coverage_and_reason": "Requisito novo C3/C7; não inventar superfície AS_IS equivalente", "evidence_class": "TO_BE_STATIC_DESIGN_ONLY", "implementation": "NOT_STARTED_PHASE_D"})
    assert len({r["b1_surface_id"] for r in edges if r["b1_surface_id"]}) == 97
    assert {r["c3_screen_id"] for r in edges} == set(source_screens)
    write(OUT / "B1_TO_C3_SURFACE_CROSSWALK.csv", edges)

    cases = read(BASE / "C9-acceptance-refinement/ACCEPTANCE_CASES.csv")
    screen_rows = []
    index = "# Projeto visual por superfície\n\nDireção visual aprovada pelo responsável em 04/11/2026.\nEspecificação TO_BE; D NÃO INICIADA.\n\n"
    index += "97 superfícies B1 e 66 superfícies C3 têm granularidades diferentes.\nO cruzamento registra relações muitos-para-muitos e superfícies novas; não\nsoma os denominadores. Todos os órfãos, redirects e demos têm destino e\njustificativa. As fichas abaixo cobrem controles, ações e estados de cada\ntela; overlays B1 herdam a ficha indicada e conservam seu papel/dialog/foco.\n\n"
    index += "## Padrões vinculados às fichas\n\nDesktop ≥1200: navegação lateral de250px, conteúdo máximo1350px, área\nde tarefa e ajuda em proporção aproximada1.65/0.95 quando útil. Tablet\n651–1199: duas colunas somente com campos legíveis; rail compacto não\npode depender de tooltip/hover para navegação. Móvel320–650: uma coluna,\n16px de margem e atalhos inferiores Início/REQ/ENT/Estoque/Mais com safe\narea e todos os módulos autorizados em Mais. Help crítico vem antes da\nação. Tabelas indispensáveis têm região de rolagem rotulada; totais,\nunidade e ação não ficam escondidos fora da viewport.\n\n"
    index += "Tipografia do sistema, azul-petróleo e superfícies claras do HTML.\nOs pequenos textos decorativos do protótipo não são garantia de contraste\nou legibilidade; D valida tamanho/contraste/reflow reais. Grid de4/8px,\nintervalo16–24px entre grupos, campos com label/ajuda/erro próximos e\nalvos principais de44px são objetivos de desenho, sujeitos ao ensaio\nde acesso; não usar cor como única distinção de seleção/sucesso.\n\n"
    index += "Loading tem skeleton/legenda e não afirma vazio. Atualizando conserva\ndado anterior com data. Empty só depois de consulta válida; erro oferece\nrepetir leitura. Offline mostra frescor e não enfileira aceite; conflito\nconserva intenção/edição; uncertain congela comando e consulta mesma chave.\nSucesso identifica efeito/quantidade/próximo responsável; P15 usa barreira\npersistente sem conteúdo protegido e mensagem de ação separada.\n\n"
    index += "Diálogo: título/describedby, foco inicial no título/resumo ou primeiro\ninválido; Tab contido, Escape/Voltar retornam ao acionador. Destrutiva exige\nescopo e confirmação sem default. Ícone decorativo aria-hidden; ação tem\ntexto visível. Só fechar/ajuda/setas densas podem usar ícone com nome e\ntooltip acessível por foco, sem depender de hover. Mudança de filtro não\nabre modal. Leitor de tela anuncia status, não repete toda a página.\n\n"
    sheets = OUT / "screens"
    sheets.mkdir(exist_ok=True)
    for design in designs:
        id_, title, audience, composition, primary, secondary, consequence, proto, special = design
        original = source_screens[id_]
        assigned = [r for r in controls if id_ in r["screen_ids"].split(";")]
        refs = [r["b1_surface_id"] for r in edges if r["c3_screen_id"] == id_ and r["b1_surface_id"]]
        acceptance_ids = [r["acceptance_id"] for r in cases if original["domain"] in [Path(p).stem for p in r["source_specifications"].split(";")]]
        screen_rows.append({"screen_id": id_, "title": title, "profile": audience, "route_as_is_to_be": original["route_or_surface"], "composition": composition, "primary_action": primary, "secondary_actions": secondary, "consequence": consequence, "prototype_reference": proto, "specific_rule": special, "b1_surface_ids": ";".join(dict.fromkeys(refs)), "control_ids": ";".join(r["control_id"] for r in assigned), "acceptance_ids": ";".join(acceptance_ids), "status": "DIRECTION_OWNER_APPROVED;TO_BE_SPECIFIED_NOT_IMPLEMENTED"})
        index += f"- [{id_} — {title}](screens/{id_}.md).\n"
        body = f"# {id_} — {title}\n\nEstado: direção visual OWNER_APPROVED; especificação TO_BE, não implementada.\n\n"
        body += f"Perfil e permissão: {audience}. Banco/API revalidam capacidade, alvo e\nversão; menu/ID/escala não concedem autorização.\n\nRota/superfície: {original['route_or_surface']}. Gatilho: navegar pela tarefa\nou abrir o alvo contextual autorizado. Objetivo: {original['actions_outcome']}\n\n"
        body += f"## Composição e sequência\n\n{composition}.\n\nDesktop: aplicar essa hierarquia no shell aprovado, tarefa primeiro e\najuda lateral quando útil. Tablet: preservar ordem de foco e duas colunas\nsó se rótulos/valores couberem. Móvel: empilhar na mesma ordem; diálogo\nlongo ocupa largura disponível e rola internamente, footer não cobre\ncampo/teclado; resumo/ações continuam alcançáveis.\n\n{special}.\n\n"
        body += f"## Ações e efeito\n\nPrimária: **{primary}**. Secundárias: {secondary}.\n\nConsequência: {consequence}. Mostrar objeto/quantidade/pessoa/versão antes\nde qualquer decisão material. Retorno/Voltar preserva edição e contexto;\npróximo destino é resultado do ato ou tarefa pertinente, nunca novo envio\nautomático. Em resposta incerta consultar intenção antes de prosseguir.\n\n"
        body += "## Controles em ordem de tarefa\n\nOs IDs abaixo são canônicos no catálogo de controles. Campos compostos C3\nforam desdobrados; na revisão/detalhe aparecem em leitura, não novamente\neditáveis. Servidor é a origem de identidade/versões/estados.\n\n"
        for field in assigned:
            body += f"- **{field['control_id']} — {field['label']}**. {field['control_type']}.\n  Ordem {field['order']}; {field['required_and_default']}.\n  Máscara/autocomplete: {field['mask_inputmode']}; {field['autocomplete']}.\n  Dependência/validação: {field['validation_and_dependencies']}.\n  Ajuda/exemplo: {field['inline_help_and_example']}.\n  Erro: {field['error_copy']}.\n\n"
        if not assigned:
            body += "Tela de orientação/consulta sem novo campo de dado. Links/botões têm\nnome, alvo e estado próprios; não adicionar formulário sem necessidade.\n\n"
        body += "## Estado, teclado e ajuda\n\nHerda os estados descritos no blueprint; em cada painel a falha é isolada.\nSkeleton não cria ausência; erro não elimina dado válido de outra seção.\nFoco vai ao primeiro inválido; sucesso anuncia efeito, Escape/Voltar\nrestauram acionador. Combobox usa setas/Enter/Escape e label associado.\nTooltip em botão Ajuda sobre [campo] é acessível por foco; regra necessária\npermanece inline. Sem informação só por cor, hover, gesto ou QR.\n\n"
        body += f"Ajuda contextual: guia da tarefa e perfil, reabrível pelo perfil. Captura\nreal futura: `SHOT-{id_}` no mesmo SHA de D, sem dados pessoais/segredos.\nProtótipo: `{proto}`; ausência de exemplo no HTML é declarada, sem novo\nmockup equivalente. B1: {', '.join(dict.fromkeys(refs)) or 'Nova superfície C3, sem equivalente B1'}.\n\n"
        body += f"Critérios C9 relacionados: {', '.join(acceptance_ids)}. A associação é\npor domínio; cada caso preserva seu discriminante específico e não significa\nque todos os critérios foram executados nesta tela. Fonte funcional: \n[{original['domain']}](../../C3-functional-specification/{original['domain']}.md).\n"
        (sheets / f"{id_}.md").write_text(body, encoding="utf-8")
    write(OUT / "SCREEN_BLUEPRINTS.csv", screen_rows)
    (OUT / "VISUAL_BLUEPRINT_BY_SCREEN.md").write_text(index + "\n", encoding="utf-8")
    build_copy(controls, designs)
    print(json.dumps({"b1_surfaces":97,"c3_screens":66,"crosswalk_edges":len(edges),"source_field_groups":174,"controls":len(controls)}, ensure_ascii=False))


def build_copy(controls, designs):
    original = read(B1 / "04_TEXT_INVENTORY.csv")
    rewrites = read(B1 / "evidence/TEXT_REWRITES.csv")
    copy = []
    for source_index, row in enumerate(original, 1):
        selected = [r for r in rewrites if r["rewrite_id"] in row["proposal_ids"].split(";")]
        proposed = row["proposal_complete"] or (selected[0]["proposal_complete"] if selected else row["original_exact"])
        status = "SOURCE_COPY_RETAINED;NO_NEW_HUMAN_HOMOLOGATION"
        if row["classification"] == "NOT_VERIFIED":
            status = "SOURCE_EXPRESSION_CONTEXT;NOT_AUTOMATICALLY_A_USER_MESSAGE"
            proposed = ""
        elif selected or row["proposal_complete"]:
            status = "PROPOSED_COPY_FROM_B1_REFINED_BY_C7_RULES;NOT_IMPLEMENTED"
        if "Ciência automática registrada após exibição do conteúdo" in row["original_exact"]:
            proposed = "Ciência registrada automaticamente conforme a política e sua preferência. Isso não comprova leitura integral."
            status = "C7_REQUIRED_SEMANTIC_CHANGE;P02_OWNER_GATE"
        copy.append({"copy_id": f"B1-ROW-{source_index:04}-" + row["text_id"], "screen_or_surface_ids": row["surface_ids"], "source": row["file"] + ":" + row["line"], "kind": row["source_kind"], "current_exact": row["original_exact"], "proposed": proposed, "context_and_condition": row["expression_context"], "source_classification": row["classification"], "decision_status": status, "decision_dependency": "P02 somente quando ciência elegível; P09 assinatura obrigatória; demais regras C7 prevalecem", "verification": "B1_STATIC_COPY_INVENTORY;NOT_NEW_RENDERED_OR_HUMAN_ACCEPTANCE"})
    for field in controls:
        for kind, value in [("LABEL",field["label"]),("INLINE_HELP",field["inline_help_and_example"]),("FIELD_ERROR",field["error_copy"])]:
            copy.append({"copy_id": "COPY-" + field["control_id"] + "-" + kind, "screen_or_surface_ids":field["screen_ids"],"source":field["source"],"kind":kind,"current_exact":"","proposed":value,"context_and_condition":field["validation_and_dependencies"],"source_classification":"C8_CONTROL_SPECIFICATION","decision_status":"TO_BE_COPY_SPECIFIED_NOT_IMPLEMENTED","decision_dependency":"Campo segue aprovação/gate do processo, sem inferir P02","verification":"DESIGN_ONLY"})
    states = {
        "LOADING":"Carregando {title}…",
        "UPDATING":"Atualizando. Os dados anteriores foram consultados em {hora}.",
        "EMPTY":"Nenhum resultado para esta consulta. Revise os filtros ou inicie a tarefa permitida.",
        "ERROR":"Não foi possível consultar agora. Tente consultar novamente.",
        "OFFLINE":"Sem conexão. Última consulta em {hora}. Confirmações exigem nova conexão e autorização.",
        "CONFLICT":"Este registro mudou. Compare as informações antes de decidir novamente.",
        "UNCERTAIN":"Ainda não sabemos se a ação terminou. Consulte esta tentativa antes de repetir.",
        "REVOKED_BARRIER":"Seu acesso a este contexto mudou. Escolha outro acesso disponível ou busque ajuda.",
        "DENIED_NO_EFFECT":"A ação não foi registrada porque seu acesso mudou. Você pode voltar a um contexto permitido.",
        "PARTIAL_SAVE":"A edição foi salva. A etapa seguinte não foi concluída. Consulte os detalhes antes de continuar.",
    }
    for design in designs:
        id_, title, _, _, primary, secondary, consequence, _, special = design
        values = {**states, "PRIMARY_ACTION":primary,"SECONDARY_ACTIONS":secondary,"EFFECT_HELP":consequence,"CONTEXT_HELP":special}
        for kind, value in values.items():
            copy.append({"copy_id":f"COPY-{id_}-{kind}","screen_or_surface_ids":id_,"source":"docs/audits/C/C8-visual-blueprint/screens/"+id_+".md","kind":kind,"current_exact":"","proposed":value.replace("{title}",title.lower()),"context_and_condition":"DENIED_NO_EFFECT só com recusa sem persistência comprovada; PARTIAL_SAVE só com etapa confirmada; EMPTY só após 200 válido; ação material usa nome/quantidade/fato real","source_classification":"C8_SCREEN_SPECIFICATION","decision_status":"TO_BE_COPY_SPECIFIED_NOT_IMPLEMENTED","decision_dependency":"P02 quando modalidade de ciência; acesso/ações seguem capacidades reais","verification":"DESIGN_ONLY;DEVICE_HUMAN_ACCEPTANCE_FUTURE"})
    assert len({r["copy_id"] for r in copy}) == len(copy)
    write(OUT / "UI_COPY_AND_MICROCOPY_MASTER.csv", copy)


if __name__ == "__main__":
    main()
