"""Documentary assembly only. No database, network or product writes."""
from pathlib import Path
import csv
import hashlib
import json
import textwrap

ROOT = Path(__file__).resolve().parent.parent
REPO = ROOT.parents[2]


def md(name, content):
    ROOT.joinpath(name).write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8", newline="\n")


def csv_file(name, rows):
    assert rows
    with ROOT.joinpath(name).open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def checkpoint(message):
    with ROOT.joinpath("CHECKPOINT.md").open("a", encoding="utf-8", newline="\n") as stream:
        stream.write("\n" + message + "\n")


def taxonomy():
    # Verified effective objects, not every name in an enum.
    data = [
        ("REQ", "Documento primário", "Necessidade de materiais", "submit_requisition / req.issued", "Solicitante autenticado", "requisitions;requisition_items;requisition_lifecycle", "sciencePolicy;scienceEvents;fulfillmentLines;intent", "Itens sem quantidade solicitada;estoque observado;urgência;notas", "Ciência, atendimento, arquivo e cancelamento independentes", "Sim, renderizador4", "Sim, anexo ready versiona", "src/components/requisitions/requisition-detail.tsx", "Registra necessidade declarada;não comprova compra/entrega"),
        ("COM", "Documento primário", "Aquisição familiar por compra/doação", "create_supply_document / com.issued", "Proponente;aprovador;comprador;validador distintos", "operational_documents;document_lines;purchase_receipts", "actors;lines;workflow;event;requestLinks", "Proposto/aprovado/adquirido/validado;origem;notas", "Aprovação e recebimento validado separados", "Sim, renderizador4", "Sim, anexo ready versiona", "src/components/documents/supply-detail.tsx", "Não demonstra pagamento nem atendimento da equipe por si"),
        ("ENT", "Documento primário", "Transferência entre custódias", "create_supply_document / ent.issued", "Emissor;designado;ator do aceite/conciliação", "operational_documents;document_lines;stock_movements", "actors;lines;workflow;event;requestLinks", "Expedido/aceito/conciliado;origem/destino;divergência", "Trânsito, aceite e consentimento separados", "Sim, renderizador4", "Sim, anexo ready versiona", "src/components/documents/supply-detail.tsx", "Expedição não comprova recebimento físico;aceite é registro autenticado"),
        ("BAL", "Documento primário", "Contagem e reconciliação da equipe", "create_supply_document / bal.issued;recount", "Contador;revisor familiar/supervisor", "operational_documents;document_lines;bal_approvals", "balanceContext;reviewPolicy;referenceRevision;countVersion", "Contado/referência;plantão;semanas;aprovações", "Legado e regime por plantão distintos", "Sim, renderizador4", "Sim, anexo ready versiona", "src/components/documents/supply-detail.tsx", "Escala não comprova presença;aprovar não significa contar"),
        ("EVENT", "Evento histórico", "Versionar atos documentais", "private.record_document_event + science_snapshot", "actor_id;actor_name;authority_context", "document_events", "body jsonb;previousHash;content_hash", "Ação;autoridade;conteúdo;história resumida", "Imutável para clientes;unique documento/versão", "Fonte do PDF de versão", "Snapshot de associações ready", "src/components/documents/document-timeline.tsx", "Cadeia compara conteúdo;administrador privilegiado continua confiável"),
        ("RENDER", "Representação derivada", "PDF de uma versão", "documentPdf → renderDocumentPdf", "Aplicação renderiza;ato pertence ao evento", "document_pdf_renders;Storage document-receipts", "Evento body da versão solicitada", "Hash de bytes;renderer4;path versão", "Cache de bytes privados", "É o próprio artefato", "Lista nomes/hashes;não incorpora bytes", "src/lib/server/document-pdf.ts", "Não é assinatura nem prova de entrega externa"),
        ("ORIGINAL_PDF", "Arquivo histórico original registrado", "Preservar renderizador anterior", "register_document_pdf / renderer=legacy", "Registro de serviço", "document_pdfs;Storage document-receipts", "Referência à versão original", "Path;hash;versão", "Ausência retorna404;sem reconstruir original", "Sim quando existente", "Independente", "src/lib/server/document-pdf.ts", "Zero registros locais no baseline;contrato não equivale a acervo comprovado"),
        ("SCIENCE", "Ciência", "Registrar origem de conhecimento familiar", "private.record_science", "Identidade e modo do evento", "requisition_science_events;requisition_lifecycle", "scienceEvents no evento REQ", "Expressa;app_visible;whatsapp_read;whatsapp_confirm;dispatch", "Não confundir modos", "Seção REQ", "Não obrigatório", "src/components/requisitions/requisition-detail.tsx", "Ciência automática/expressa não prova recebimento físico"),
        ("PURCHASE_RECEIPT", "Declaração e confirmação", "Chegada informada e entrada validada", "COM receive;validate_receipt;reject_receipt", "submitted_by;validador no evento", "purchase_receipts;stock_movements", "workflow;event;linhas agregadas", "Linhas;quantidades;pending/approved/rejected", "Somente validação credita família", "Agregado no COM;sem PDF próprio", "Via COM", "src/components/documents/supply-detail.tsx", "O PDF agregado não é comprovante comercial/fiscal"),
        ("CONSUMPTION", "Relato e confirmação", "Consumo/falta extraordinária", "report_extraordinary_consumption;confirm_extraordinary_consumption", "Autor do relato;confirmador", "consumption_reports;stock_movements", "Relato estruturado;confirmação/ledger", "Kind;texto;linhas;estado", "Relato não debita até confirmação", "Sem PDF próprio descoberto", "Não confundir com anexo de movimento", "src/components/stock/consumption-console.tsx", "B2-011:resposta oposta não aplicada;não inventar estorno"),
        ("LEDGER", "Evento de estoque", "Custódia e compensações", "private.move_stock;family_stock_movement", "Ator;referência;motivo", "stock_movements", "Produto;unidade;custódia;quantidade imutáveis", "Movimento;before/after;reference_type/id", "Saldo derivado;sem editar saldo", "Sem PDF próprio descoberto", "Anexo por movement_id", "src/components/stock/stock-console.tsx", "B3-005:correção sem origem limita reconstrução"),
        ("ATTACHMENT", "Evidência digital derivada", "Guardar foto/PDF sanitizado", "reserve_attachment;upload;finalize_attachment", "created_by autenticado;servidor finaliza", "attachments;Storage patient-evidence", "Id/nome/hash/bytes no evento de associação", "MIME;state;hash;alvo;tentativa", "Quarantine não é ready;associação versionada", "Listagem no PDF;arquivo separado", "É o próprio objeto", "src/components/documents/attachments.tsx", "Hash do sanitizado;sem cadeia do original capturado"),
        ("BAL_CYCLE", "Histórico complementar", "Obrigações, prazo e decisões", "run_bal_scheduler;balance_command;resolve_balance_assignment", "Sistema;profissional;decisor familiar", "bal_obligations;bal_cycles;bal_assignments;bal_deferrals;bal_cycle_events", "balanceContext vincula contagem atual", "Prazo original/efetivo;atraso;conclusão;motivos", "Semanas anteriores não simulam contagens", "Contexto parcial no BAL", "Via documento", "src/components/balances/balance-console.tsx", "História do ciclo não integralmente transcrita no PDF"),
        ("SHIFT", "Programação e decisão", "Planejar plantão relacionado ao BAL", "schedule_command;private.schedule_event", "Proponente;aprovador", "scheduled_shifts;shift_change_requests;shift_events", "Versão da escala e assignment", "Janela UTC;timezone;profissional", "Programado não equivale a presente", "Contexto do BAL;sem PDF de presença", "Não descoberto", "src/components/schedules/schedule-console.tsx", "Sem evidência de presença física"),
        ("COMMUNICATION", "Registro de comunicação", "Agendar e acompanhar mensagem", "enqueue_document_event;worker;webhook", "Sistema;destinatário;provider_reference", "notification_outbox;private logs/callbacks", "Versão/event_key;payload", "Accepted/delivered/read/seen_at distintos", "B5:tentativas e conciliação limitadas", "Mídia é PDF do evento", "Não é anexo comprovante de entrega", "src/components/notifications/document-delivery-status.tsx", "Entrega de mensagem não comprova conteúdo correto nem ato físico"),
        ("LEGACY_REQ", "Registro importado", "Conservar história anterior", "import_historical_requisitions", "Importador;autor original se disponível", "requisitions;requisition_items;operational_documents", "isHistorical;origem;data desconhecida", "Identidade original;ciência não inferida", "Não processar como pendência atual", "Reconstrução renderer4;original só se registrado", "Preservar anteriores", "src/lib/server/receipts.ts", "Autor importador não é automaticamente autor original"),
        ("DEMO", "Documento demonstrativo", "Explicar apresentação sem ato operacional", "demoDocuments;demonstracao PDF", "Personagens fictícios", "src/lib/demo-documents.ts", "Constantes TS;demo=true", "REQ/COM/ENT/BAL fictícios", "Sem persistência documental", "Marca d'água;sem QR", "Exemplos sem original real", "src/components/documents/demo-document.tsx", "Não prova que o fluxo autenticado persiste o mesmo conteúdo"),
    ]
    rows=[]
    for n, category, purpose, origin, actor, source, snapshot, fields, states, pdf, att, ui, limits in data:
        rows.append(dict(id=n,classification=category,purpose=purpose,origin=origin,actor=actor,patient="Explícito no registro;DEMO fictício",identity="UUID;REQ/COM/ENT/BAL com série/protocolo na emissão",role="Capacidade local no ato;EVENT authority_context",state=states,fields=fields,source=source,snapshot=snapshot,versions="Eventos/documento ou versão própria conforme objeto",events=origin,receipt="Derivado;ver finalidade",pdf=pdf,history="Evento/registro original conservado",attachments=att,dependencies=ui,evidentiary_limit=limits,recovery="Consulta autorizada;PDF versão específica;bytes privados quando existentes",consequence="Interpretar representação além do contrato pode atribuir ato/quantidade indevida"))
    csv_file("01_DOCUMENT_OBJECT_AND_SOURCE_INVENTORY.csv",rows)
    md("01_DOCUMENT_DOMAIN_AND_SOURCE_MAP.md", """
    # B6.1 — Taxonomia e fontes de verdade

    O inventário CSV acompanha 17 classes efetivas em 22 campos. REQ, COM, ENT
    e BAL são os quatro documentos operacionais. Não há documento autônomo de
    consumo, escala/presença ou comprovante fiscal descoberto no renderizador;
    esses registros complementam o significado, sem virar tipos PDF por enum.

    A fonte primária é a transação persistida: cabeçalho/linhas e fatos do
    domínio, ledger, recebimentos, ciência e obrigações. O evento captura uma
    versão canônica; o PDF é representação parcial desse evento, não autoridade
    superior. A tela exibe também estado atual e consultas complementares.

    ```text
    comando autorizado → transação/RPC → fatos + ledger → evento por versão
                                      ↓ trigger science_snapshot
                            body canônico + autoridade + SHA-256
                                      ↓
                    PDF renderer4 → bytes privados → registro hash de arquivo
    ```

    A fotografia/PDF anexado é sanitizado antes de armazenar. É evidência
    associada, não assinatura do documento nem prova automática do fato físico.
    O nome do remetente prova a conta que enviou sob as condições da sessão,
    não quem fotografou/assinou o papel. Histórico importado e demonstração
    exigem qualificadores próprios; DEMO não passa pelo banco.

    ## Universo e limites

    Inventário inclui origem, ator/papel, paciente, identidade, estado, campos,
    fonte, snapshot, versões, eventos, comprovante/PDF, anexos, dependências,
    limites e recuperação. Mapeamento técnico: document-pdf, operational-pdf,
    receipts, receipt, presentation, APIs documents/requisitions/attachments,
    página documentos, verificar, demonstracao e componentes de histórico.
    Referências e hashes das provas anteriores ficam em reused-evidence.json.

    Reconhecimento B6.0: 210 documentos, 745 eventos, 199 renders e zero PDFs
    originais registrados; 34 anexos, 199 objetos document-receipts, 12
    patient-evidence e cinco avatares. São contagens locais, não certificação
    de conteúdo real, acervo remoto ou recuperação conjunta. 84 migrations e
    232 rotinas conferidas sem drift de B3. Nenhum reset ou serviço novo.
    """)
    checkpoint("- B6.0 encerrado: guarda local, 395 fontes e 232 rotinas sem drift; baseline\n  sanitizado, 84 migrations, buckets/cron existentes preservados. Nenhum dado\n  privado copiado. B6.1 encerrado: 17 classes/22 campos; fonte primária, evento,\n  derivado, confirmação, legado e demo distinguidos. Próximo B6.2: autoria.")


def reused():
    phases = [
        ("2026-10-25-production-readiness", "FINDINGS_MASTER.csv", ["BE-007", "OPS-001"]),
        ("2026-10-28-phase-b1-interface", "12_FINDINGS_MASTER.csv", ["B1-ERR-001", "B1-UX-006", "B1-A11Y-001"]),
        ("2026-10-29-phase-b2-processes", "13_FINDINGS_MASTER.csv", ["B2-004", "B2-008", "B2-011"]),
        ("2026-10-29-phase-b3-database", "14_FINDINGS_MASTER.csv", ["B3-002", "B3-004", "B3-005", "B3-014", "B3-015", "B3-022"]),
        ("2026-10-30-phase-b4-backend", "14_FINDINGS_MASTER.csv", ["B4-004", "B4-007"]),
        ("2026-10-30-phase-b5-integrations", "14_FINDINGS_MASTER.csv", ["B5-004", "B5-005"]),
    ]
    rows=[]
    for phase, filename, ids in phases:
        path=REPO/"docs/audits"/phase/filename
        records=list(csv.DictReader(path.open(encoding="utf-8-sig")))
        for identifier in ids:
            found=next((r for r in records if r.get("id",r.get("ID"))==identifier), None)
            assert found, (identifier,path)
            fields=('id','title','priority','nature','observed','current_behavior','cause','probable_cause','evidence','counterproof','limits','relation','relation_A_B1')
            rows.append(dict(id=identifier,source=path.relative_to(REPO).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),record={k:found[k] for k in fields if k in found},applicability="Produto37cb7f85 e 232 rotinas B3 conferidos no baseline B6;prova reaproveitada sem reexecutar"))
    ROOT.joinpath("evidence/reused-evidence.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__ == "__main__":
    reused()
    taxonomy()
