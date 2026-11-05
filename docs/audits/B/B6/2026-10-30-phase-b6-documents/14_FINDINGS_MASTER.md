# Registro mestre B6

Treze registros, onze P2 e dois P3. Nove causas novas B6, duas manifestações
conhecidas ampliadas, um risco anterior aprofundado e uma revalidação. Sem P0/P1
novo; bloqueadores anteriores e NO-GO permanecem. Risco/limitação e defeito
reproduzido não são categorias intercambiáveis. Não houve correção.

## B6-001

**Título:** Reconstrução de legado substitui data desconhecida e pode priorizar
paciente atual

**Prioridade:** P2

**Natureza:** Falha de fidelidade documental

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_HELPER_SQL_E_PDF

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** REQ histórica

**Processo:** Registrar e recuperar origem anterior

**Pessoa afetada:** Familiar e auditor

**Evento de origem:** req.legacy_imported

**Fonte persistida:** requisitions.created_at; recipient_name_snapshot;
payload.sourceCreatedAt/patientName

**Versão:** v1 do fixture legado

**Snapshot:** body.createdAt; actors.patient; payload

**Representação:** PDF r4 e snapshot derivado

**Contrato esperado:** Preservar data original desconhecida e nome histórico
disponível, distinguindo momento de importação.

**Observado:** Fonte ficou created_at NULL e patient snapshot do papel; body
recebeu now e actors.patient do cadastro renomeado; PDF imprime data e paciente
derivados.

**Causa sustentada:** register_legacy_requisition usa coalesce(r.created_at,
now()); record_document_event monta actors.patient do cadastro sem priorizar
payload histórico; renderer prioriza actors.

**Caminho técnico:** B3 contracts/private.register_legacy_requisition;
private.record_document_event; src/lib/server/operational-pdf.ts

**Evidência:** evidence/b62-provenance-results.json#B62-S02;
evidence/pdf/PV06.pdf; evidence/images/PV06-p1.png

**Método:** Helper vigente com fixture nova/rollback; fonte/corpo comparados;
render/texto/visual reais.

**Contraprova:** Fonte original não foi reescrita; isHistorical e ciência não
comprovada aparecem; solicitante conhecido em payload é preservado.

**Limites:** Não foi importador integral1–11 nem incidente no acervo; nome
diferente modela fonte histórica já divergente do cadastro; PV06 vazio só para
helper.

**Consequência operacional:** Reconstrução pode ordenar registro pelo dia errado
ou apresentar cadastro atual como identidade histórica.

**Consequência informacional:** Incerteza temporal e proveniência de nome são
ocultadas em campos centrais.

**Consequência humana:** Leitor pode atribuir a operação à data de importação
sem perceber.

**Consequência probatória técnica:** Hash correto do derivado não comprova data
original nem restaura o nome ignorado.

**Relação A–B5:** A/B1 preservaram legado; B6 identifica seleção concreta de
campos; sem duplicar BE-007.

**Alternativas futuras:** Separar data original/data de importação; priorizar
snapshots de origem e qualificar fallback; novo renderer sem alterar bytes
antigos.

**Riscos da mudança:** Inventar data/autor no legado; reescrever evento/PDF
antigo; perder identidade operacional.

**Aceite futuro:** Data NULL imprime desconhecida; nome de origem disponível
prevalece com proveniência; data de importação aparece com rótulo próprio.

**Regressões necessárias:** Legado com/sem data, autor/paciente
conhecidos/desconhecidos, rename, duas versões, renderer original e r4.

**Decisão pendente:** Definir campos de origem versus reconstrução e tratamento
de registros já derivados.

## B6-002

**Título:** PDF rotula criação de draft como data de emissão da ENT

**Prioridade:** P2

**Natureza:** Falha de fidelidade documental

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_FONTE_HELPER_E_RENDER

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** ENT; cronologia dos demais tipos

**Processo:** Criar draft e emitir depois

**Pessoa afetada:** Emissor, recebedor e responsável

**Evento de origem:** ent.issued / ent.submit

**Fonte persistida:** operational_documents.created_at;
document_events.created_at

**Versão:** Versão de emissão após draft

**Snapshot:** body.createdAt; history.createdAt

**Representação:** PDF campo Emissão e topo

**Contrato esperado:** Data de emissão identifica o ato de emissão; criação do
draft tem rótulo próprio.

**Observado:** PV03 imprime Emissão27/10/2026 23: 30; evento de expedição
é30/10/2026 10: 00. emit_document não atualiza created_at.

**Causa sustentada:** Campo Emissão lê snapshot.createdAt, que representa
criação do documento; não seleciona evento de emissão.

**Caminho técnico:** src/lib/server/operational-pdf.ts; B3
contracts/private.emit_document

**Evidência:** evidence/b62-provenance-results.json#B62-S03;
evidence/pdf/PV03.pdf; evidence/images/PV03-p1.png; evidence/text/PV03-p2.txt

**Método:** Helper SQL de emissão em fixture com created_at anterior; leitura da
RPC draft; PDF sintético/visual.

**Contraprova:** Linha do tempo conserva hora correta do evento; não houve
alteração do timestamp persistido.

**Limites:** Não mediu desvio de relógio nem percurso HTTP de draft completo;
diferença fonte/rótulo é direta.

**Consequência operacional:** Conferência de prazo e sequência pode usar
instante errado.

**Consequência informacional:** Mistura criação, emissão e renderização.

**Consequência humana:** Pessoa pode entender que entrega foi expedida quando
ainda era rascunho.

**Consequência probatória técnica:** Metadata e campo PDF não constituem carimbo
externo ou prova física de emissão.

**Relação A–B5:** B4-004 fornece contexto de versões draft; causa de data do PDF
é nova.

**Alternativas futuras:** Selecionar timestamp do evento emitido ou renomear
criação e acrescentar emissão explícita em renderer novo.

**Riscos da mudança:** Alterar created_at histórico, confundir emissão/reemissão
e apagar período de rascunho.

**Aceite futuro:** Draft criado D1/emitido D2 mostra ambos instantes
corretamente; download tardio não inventa nova emissão.

**Regressões necessárias:** Emissão direta, draft, submit, revisão recusada,
timezone, legado sem data e reabertura.

**Decisão pendente:** Ratificar quais datas são obrigatórias no cabeçalho e
metadados.

## B6-003

**Título:** História supply resolve autores antigos pelo diretório atual

**Prioridade:** P2

**Natureza:** Inconsistência de autoria representativa

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** ALTA_FONTE_E_CONTRAPROVA_SQL

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** COM; ENT; BAL

**Processo:** Consultar autoria após rename ou desligamento

**Pessoa afetada:** Autor original e auditor

**Evento de origem:** Lista events de operational_document

**Fonte persistida:** document_events.actor_name/actor_id; profiles; diretório
atual

**Versão:** Todas as versões listadas na tela atual

**Snapshot:** body.history preservado; events omite actorName

**Representação:** UI SupplyDocumentContent

**Contrato esperado:** Nome no momento do ato permanece na história; cadastro
atual pode aparecer separado.

**Observado:** RPC lista actorId sem actor_name; supply-detail usa people.find
pelo ID e fallback Responsável registrado. PDF usa history congelada.

**Causa sustentada:** Projeção perde nome histórico e consumidor recompõe pelo
diretório vigente.

**Caminho técnico:** B3 contracts/public.operational_document. 19258.sql;
src/components/documents/supply-detail.tsx

**Evidência:** evidence/b62-provenance-results.json#B62-S01;
02_DOCUMENT_IDENTITY_AUTHORSHIP_AND_PROVENANCE.md;
05_VERSIONS_HISTORY_AND_RECONSTRUCTION.md

**Método:** Leitura exata da projeção/consumidor; rename SQL de fixture
preservou ator e hash antigos; sem navegador B6.

**Contraprova:** UUID e actor_name persistidos não mudam; PDF e read model REQ
já usam nomes de evento.

**Limites:** Efeito visual após revoke/rename não reproduzido em browser nesta
B6; conclusão estática do consumidor ativo.

**Consequência operacional:** Explicar responsabilidade exige consultar outro
percurso ou registro técnico.

**Consequência informacional:** Nome atual ou genérico ocupa lugar de atribuição
histórica legível.

**Consequência humana:** Responsável pode não reconhecer quem atuou naquela
época.

**Consequência probatória técnica:** Não é falsificação de evento; reduz
reconstrução humana da autoria.

**Relação A–B5:** Relacionado à oportunidade B1-UX-006; causa específica de
seleção de nome é nova B6.

**Alternativas futuras:** Transportar actor_name congelado com ID; qualificar
cadastro atual; fallback explícito de legado/sistema.

**Riscos da mudança:** Reescrever autoria passada; expor pessoas de outro
paciente; atribuir ação system a humano.

**Aceite futuro:** Rename/revogação não muda nome histórico apresentado; ID
permanece; nome atual é identificado como atual.

**Regressões necessárias:** Pessoa ativa/revogada, rename, ator system, legado
sem nome e usuários compartilhados A/B.

**Decisão pendente:** Aprovar padrão de nomes históricos e anonimização
autorizada sem apagar autoria.

## B6-004

**Título:** PDF ENT omite ressalvas e a natureza das conciliações

**Prioridade:** P2

**Natureza:** Falha de fidelidade documental

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_RENDER_E_FONTE

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** ENT

**Processo:** Conferir avaria, falta, devolução ou cancelamento

**Pessoa afetada:** Recebedor, família e auditor

**Evento de origem:** ent.receive; ent.resolve; ent.consent_cancel

**Fonte persistida:** document_lines.metadata.receipt;
event.resolution/reason/lines; ledger

**Versão:** Versão da conferência/conciliação

**Snapshot:** Problema/notas e evento presentes; história resumida

**Representação:** PDF e detalhe histórico resumido

**Contrato esperado:** Representação explica ressalva e distingue aceito,
faltante, devolvido/consumido quando relevante.

**Observado:** PV03 mantém10 expedido/6 aceito e Divergência aberta, mas não
imprime CAIXA_AVARIADA ou nota. Template só imprime CONCILIADO agregado e
rótulo, sem resolution/reason.

**Causa sustentada:** Tabela projeta quantidades e issueOpen; ignora
metadata.receipt e comando do evento; história imprime só ação/ator/data.

**Caminho técnico:** src/lib/server/operational-pdf.ts; B3
contracts/public.audited_legacy_supply_command. 19263.sql

**Evidência:** evidence/b66-pdf-results.json#PV03;
evidence/b66-inspection-results.json; evidence/images/PV03-p2.png;
04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv

**Método:** Fonte de comando vigente e snapshot sintético com marcadores;
extração nativa e inspeção visual.

**Contraprova:** Quantidades aceitas e conciliadas permanecem separadas;
ressalva está no banco; não se presume recebimento por expedição.

**Limites:** Não executou todas as resoluções físicas; consumo positivo continua
bloqueado por B3-002; nenhum consumo/devolução inventado no teste.

**Consequência operacional:** Quem recebe apenas PDF precisa perguntar por que
houve diferença e para onde foi a parcela.

**Consequência informacional:** Perde qualificador material apesar de
integridade do snapshot.

**Consequência humana:** Leitor pode usar material avariado sem ver a
advertência registrada ou interpretar conciliação como devolução.

**Consequência probatória técnica:** Documento não demonstra motivo/tipo físico
somente pela soma conciliada.

**Relação A–B5:** B2-004/B3-002 são defeito de processo distinto; B6 acrescenta
projeção documental.

**Alternativas futuras:** Expor ressalva, tipo e razão por linha/ato; separar
compensação, retorno e consumo; novo renderer preservando versões.

**Riscos da mudança:** Expor conteúdo desnecessário, alterar totais ou chamar
consumed de returned.

**Aceite futuro:** PDF mostra avaria/nota e resolução missing/returned
distintamente; parcelas históricas e autores permanecem claros.

**Regressões necessárias:** Aceite integral/parcial/zero, avaria, falta,
devolução, consumo anterior, cancelamento e múltiplas conciliações.

**Decisão pendente:** Definir conteúdo mínimo do comprovante e quais ressalvas
exigem destaque.

## B6-005

**Título:** BAL aprovado não liga revisores e grupos à versão de contagem no PDF

**Prioridade:** P2

**Natureza:** Lacuna documental de aprovação

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_FONTE_E_RENDER

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** BAL legado/agendado

**Processo:** Revisar e recontar sem herdar aprovação antiga

**Pessoa afetada:** Contador e revisores

**Evento de origem:** bal.approve; bal.recount

**Fonte persistida:** bal_approvals.count_version;
workflow.countVersion/reviewPolicy

**Versão:** Versão documental distinta da contagem

**Snapshot:** approvals presente; história com nomes

**Representação:** PDF conferência/auditoria

**Contrato esperado:** Leitor identifica quem aprovou, em qual grupo e para qual
contagem, distinguindo aprovação antiga.

**Observado:** PV05 mostra contado8/referência10, reconto e nomes dos revisores,
mas omite approvals, countVersion e política; v5 documental não identifica
contagem2.

**Causa sustentada:** Renderer não consome coleção approvals nem
política/referência da contagem.

**Caminho técnico:** src/lib/server/operational-pdf.ts; src/types/documents.ts;
B3 contracts/private.record_document_event; public.revise_supply_document

**Evidência:** evidence/b66-pdf-results.json#PV05; evidence/images/PV05-p2.png;
04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv

**Método:** Comparação campo a campo e PDF real de fixture com aprovação antiga
e atual.

**Contraprova:** Nomes e eventos de revisão aparecem; contador atual tem seção
própria; SQL separa count_version corretamente.

**Limites:** Não é bypass de revisão reproduzido; regime legado com
autoaprovação é achado B3 distinto; sem pessoa contando fisicamente.

**Consequência operacional:** Família precisa retornar ao banco/console para
explicar quais aprovações sustentam o saldo.

**Consequência informacional:** Estado aprovado carece da ligação documental à
contagem efetiva.

**Consequência humana:** Pode atribuir revisão antiga ao reconto ou confundir
responsável original e contador.

**Consequência probatória técnica:** PDF sozinho não identifica autorização por
grupo/contagem completa.

**Relação A–B5:** B3 integridade BAL e reconto preservados; omissão
representativa é nova.

**Alternativas futuras:** Quadro de aprovações com grupo, identidade, data,
countVersion e política; distinguir contador de emissor.

**Riscos da mudança:** Reutilizar aprovação antiga, mostrar revisor como
contador ou chamar escala de presença.

**Aceite futuro:** Reconto mantém aprovações antigas identificadas como antigas;
PDF atual mostra somente elegíveis como vigentes e política correspondente.

**Regressões necessárias:** Any/all, supervisão/família, contador diferente,
legacy/agendado, duas contagens e fuso distinto.

**Decisão pendente:** Definir conteúdo de aprovação e vínculo com histórico de
obrigação/prazo.

## B6-006

**Título:** PDF cancelado mantém indicadores e instruções de processo em
andamento

**Prioridade:** P2

**Natureza:** Falha de apresentação semântica

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_TEXTUAL_E_VISUAL

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** ENT; COM; BAL; REQ histórica no recorte de ciência

**Processo:** Ler estado e decidir próxima ação

**Pessoa afetada:** Família e profissional

**Evento de origem:** Cancelamento/legado

**Fonte persistida:** status; workflow; isHistorical

**Versão:** Versão terminal/histórica

**Snapshot:** Estado terminal correto no snapshot

**Representação:** Cards e texto auxiliar do PDF

**Contrato esperado:** Cards e instruções concordam com estado terminal;
histórico sem ciência original não vira pendência corrente.

**Observado:** PV04 diz Cancelado, mas recebimentoPENDENTE e pessoa deve
conferir. PV10/11 dizem Cancelado e EM ANDAMENTO. PV06 histórico não comprovado
também recebe ciênciaPENDENTE.

**Causa sustentada:** Condicionais compactas só distinguem
confirmed/received/approved e truthiness da ciência; demais estados caem em
pendente/andamento.

**Caminho técnico:** src/lib/server/operational-pdf.ts: statusText, metrics,
Declaração do recebimento

**Evidência:** evidence/pdf/PV04.pdf; evidence/pdf/PV10.pdf;
evidence/pdf/PV11.pdf; evidence/images/PV04-p2.png; evidence/images/PV06-p1.png

**Método:** Snapshots sintéticos compatíveis com terminal sem aquisição/aceite;
renderer real, texto e visual.

**Contraprova:** Subtítulo e linha do tempo mostram cancelamento correto; nenhum
comando/estado persistido foi alterado.

**Limites:** Não mediu taxa de erro humano; PV06 vazio é helper controlado; não
alega toda pendência parcial incorreta.

**Consequência operacional:** Pessoa pode tentar continuar trabalho encerrado ou
cobrar ciência original impossível de obter.

**Consequência informacional:** Representações contraditórias no mesmo
comprovante.

**Consequência humana:** Dúvida sobre próxima providência e responsabilidade.

**Consequência probatória técnica:** Não invalida evento terminal, mas reduz
clareza do documento usado isoladamente.

**Relação A–B5:** B1/B5 estudaram estado/avisos; seleção específica de cards PDF
é nova B6.

**Alternativas futuras:** Estados semânticos por tipo; cancelado, histórico,
rejeitado e parcial explícitos com próxima ação aplicável.

**Riscos da mudança:** Ocultar recebimento histórico ao cancelar ou trocar
pendência real por concluído.

**Aceite futuro:** Nenhuma versão cancelada manda receber; nenhum legado
desconhecido é chamado pendência operacional atual; parciais conservam números.

**Regressões necessárias:** Todos estados dos quatro tipos, ciência tardia,
arquivo, reabertura e cancelamento antes/depois de aceite.

**Decisão pendente:** Aprovar vocabulário de estado por dimensão; evitar um
único status genérico.

## B6-007

**Título:** Linha de tabela maior que a página corta conteúdo mesmo com nome
válido de 160 caracteres

**Prioridade:** P2

**Natureza:** Falha de impressão e fidelidade

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_RPC_RENDER_E_VISUAL

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** REQ; COM; ENT; BAL no helper de tabela

**Processo:** Imprimir nome com quebras internas

**Pessoa afetada:** Qualquer leitor do PDF

**Evento de origem:** Emissão com produto permitido pelo catálogo

**Fonte persistida:** care_recipient_products.name; document_lines.name_snapshot

**Versão:** Versão renderizada

**Snapshot:** Nome160 preservado; 78 parágrafos

**Representação:** PDF tabela multipágina

**Contrato esperado:** Todo conteúdo aceito é visível ou a geração falha
explicitamente, sem corte silencioso.

**Observado:** PV09 gera6 páginas, 28spans fora da folha, FIM_B6 invisível e
texto sobre rodapé; RPC catálogo/COM aceitou e preservou o mesmo nome.

**Causa sustentada:** table troca página uma vez para altura excessiva e desenha
linha inteira; sem dividir célula maior que área útil.

**Caminho técnico:** src/lib/server/operational-pdf.ts: table/ensure/wrap;
src/app/api/catalog/route.ts; admin_upsert_recipient_product

**Evidência:** evidence/pdf/PV09.pdf; evidence/images/PV09-p2.png;
evidence/images/PV09-p5.png; evidence/b66-catalog-results.json;
evidence/b66-inspection-results.json

**Método:** Renderer real, coordenadas/texto nativo, imagens vistas e
reachability via RPC real com Auth sintético/rollback.

**Contraprova:** PV07 lista longa comum e PV08 token157 sem espaços não
cortaram; wrap de palavras funciona.

**Limites:** Entrada adversarial com LF interno; frequência real desconhecida;
não explora limite acima160 nem vulnerabilidade de acesso.

**Consequência operacional:** Identificação do material fica incompleta no
comprovante impresso.

**Consequência informacional:** Snapshot íntegro não corresponde a todo conteúdo
visível.

**Consequência humana:** Leitor pode perder parte decisiva do nome/descrição sem
aviso.

**Consequência probatória técnica:** Hash e abertura do PDF não provam que a
impressão contém todos os campos.

**Relação A–B5:** Teste anterior só contava páginas; causa específica de célula
indivisível é nova B6.

**Alternativas futuras:** Paginar conteúdo de célula grande ou validar contrato
textual com mensagem explícita; renderer novo, sem reescrever passado.

**Riscos da mudança:** Truncar silenciosamente para caber, mudar conteúdo
histórico ou recusar nomes legítimos sem migração.

**Aceite futuro:** Marcador final fica visível e extraível; todas linhas dentro
da área útil; rodapé livre; falha explícita se conteúdo não representável.

**Regressões necessárias:** LF interno, nomes/unidades longos, palavra sem
espaços, notas, anexos, história extensa e todas tabelas.

**Decisão pendente:** Definir preservação de parágrafos em cadastro versus
normalização futura autorizada.

## B6-008

**Título:** Sanitização de PDF passivo remove ressalvas visíveis em anotações

**Prioridade:** P2

**Natureza:** Falha de fidelidade de anexo

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_SANITIZADOR_E_VISUAL

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** Anexo PDF externo

**Processo:** Enviar ficha anotada ou comprovante com ressalva

**Pessoa afetada:** Autor do envio e leitor

**Evento de origem:** sanitizeFile antes de reservar/upload

**Fonte persistida:** Arquivo recebido; derivado sanitizado; attachments.sha256

**Versão:** Arquivo de envio, sem versão real criada no ensaio

**Snapshot:** Hash do derivado; não hash do original

**Representação:** Anexo armazenável/apresentado como Validado

**Contrato esperado:** Transformação segura preserva informação visual relevante
ou recusa/explica perda antes de confirmar.

**Observado:** B68-C01 removeu FreeText EMBALAGEM AVARIADA e Ink visíveis;
texto-base preservado. Mesma ressalva como conteúdo de página sobreviveu.

**Causa sustentada:** PDF passivo é copiado e todas Annots são deletadas, sem
achatar aparência permitida ou informar perda; original/hash não integra
custódia normal.

**Caminho técnico:** src/lib/server/files.ts: sanitizeFile;
src/app/api/attachments/route.ts; src/components/documents/attachments.tsx

**Evidência:** evidence/b68-sanitize-results.json;
evidence/b68-visual-results.json; evidence/attachments/annotation-source.pdf;
evidence/attachments/annotation-sanitized.pdf

**Método:** Dois PDFs passivos sintéticos; sanitizeFile real; quatro páginas
origem/derivado visualmente vistas e hashes comparados.

**Contraprova:** Texto de content stream e imagem de papel não usam esse mesmo
mecanismo; controle de PDF ativo continua necessário.

**Limites:** Sem upload/Storage, assinatura digital real ou todos os tipos de
anotação; traço é fictício.

**Consequência operacional:** Ressalva/registro visual pode desaparecer antes do
armazenamento sem operador perceber.

**Consequência informacional:** Arquivo final tem conteúdo visual materialmente
menor que a origem.

**Consequência humana:** Leitor pode acreditar que o comprovante externo não
continha ressalva.

**Consequência probatória técnica:** Hash do sanitizado prova esses bytes, não
fidelidade ao original recebido nem assinatura.

**Relação A–B5:** B3/B4 provaram segurança/sanitização; perda semântica de
anotação não havia sido caracterizada.

**Alternativas futuras:** Achatar aparência permitida, derivado visual seguro ou
recusa informada; definir guarda restrita original/hash/vínculo conforme
necessidade.

**Riscos da mudança:** Reintroduzir scripts/ações ativas, expor original
sensível ou invalidar assinatura sem aviso.

**Aceite futuro:** FreeText/Ink e campos visíveis relevantes sobrevivem em
derivado passivo ou são recusados com aviso; hash/proveniência qualificados.

**Regressões necessárias:** PDF com/sem anotações, formulário, scan, foto, ativo
recusado, 100 páginas, rotação e replay do mesmo derivado.

**Decisão pendente:** Escolher estratégia de preservação visual e retenção do
original; não atribuir assinatura fictícia.

## B6-009

**Título:** Versões preservadas não têm recuperação histórica acionável no
percurso documental

**Prioridade:** P3

**Natureza:** Oportunidade de rastreabilidade humana

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** ALTA_FONTE_CONTRATO_HTTP_ANTERIOR

**Origem:** NOVA_MANIFESTACAO_ANTERIOR

**Documento afetado:** REQ; COM; ENT; BAL

**Processo:** Reconstruir o que mudou e baixar versão antiga

**Pessoa afetada:** Administrador e auditor

**Evento de origem:** Listagem de eventos/DocumentActions

**Fonte persistida:** document_events; PDF por versão

**Versão:** Históricas e atual

**Snapshot:** body preservado e endpoint version existente

**Representação:** UI história e ações

**Contrato esperado:** Leitor autorizado alcança versão antiga e entende
alteração/motivo sem construir URL manual.

**Observado:** Listas mostram ação/data/versão/hash; Baixar PDF fixa versão
atual; não há link por evento nem diff de campos/motivos.

**Causa sustentada:** Apresentação de histórico resume evento técnico sem ação
de recuperação e contexto de mudança.

**Caminho técnico:** src/components/documents/document-actions.tsx;
document-header.tsx; document-timeline.tsx; supply-detail.tsx

**Evidência:** 05_VERSIONS_HISTORY_AND_RECONSTRUCTION.md;
../2026-10-30-phase-b4-backend/evidence/b47-pdf-results.json;
../2026-10-28-phase-b1-interface/12_FINDINGS_MASTER.csv

**Método:** Fonte de consumidores e prova HTTP B47 reaproveitada, sem rerodar
cenário.

**Contraprova:** API recupera versão exata, 404 para inexistente e não substitui
original legado; histórico real não se perdeu.

**Limites:** Sem medição de tarefa por usuário ou incidente de perda; navegação
antiga não automatizada nesta B6.

**Consequência operacional:** Auditoria cotidiana depende de suporte técnico ou
interpretação manual.

**Consequência informacional:** Dificulta selecionar a evidência correta, apesar
da preservação.

**Consequência humana:** Responsável pode usar PDF atual quando precisava de
anterior.

**Consequência probatória técnica:** Limita recuperabilidade operacional, sem
falsificar ou apagar prova técnica.

**Relação A–B5:** Amplia B1-UX-006 e contexto B2-008; prioridadeP3 preservada.

**Alternativas futuras:** Links de PDF por versão autorizada; resumo de
mudanças/motivos e comparação sem mutar evento.

**Riscos da mudança:** Confundir atual com histórico, ampliar acesso ou baixar
versão errada por cache.

**Aceite futuro:** Evento oferece PDF exato e identidade visível; mudanças
significativas têm antes/depois/motivo quando disponível.

**Regressões necessárias:** Arquivo/reabertura, reconto, rename, versão
inexistente, revogação e original ausente.

**Decisão pendente:** Aprovar profundidade do histórico no primeiro lançamento e
público autorizado.

## B6-010

**Título:** COM não leva identidade das parcelas de recebimento ao snapshot de
declaração

**Prioridade:** P2

**Natureza:** Falha de rastreabilidade e lacuna documental

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_RPCS_E_PROJECAO

**Origem:** CAUSA_NOVA_B6

**Documento afetado:** COM e purchase_receipts

**Processo:** Informar duas chegadas e validar/rejeitar parcelas

**Pessoa afetada:** Familiar, validador e auditor

**Evento de origem:** com.receive; com.reject_receipt; com.validate_receipt

**Fonte persistida:** purchase_receipts; document_lines; document_events

**Versão:** Versões de declaração e decisões posteriores

**Snapshot:** body não inclui receipts; event de receive só linhas

**Representação:** Snapshot histórico/PDF agregado

**Contrato esperado:** Cada declaração de chegada identifica sua parcela e
permite correlacionar decisão posterior de forma inequívoca.

**Observado:** B612-S01 criou duas parcelas de 1 por RPC, uma rejeitada e uma
aprovada; eventos com.receive não contêm receiptId e snapshot não contém
receipts. PDF omite chegada pendente e razão de rejeição.

**Causa sustentada:** r_id é gerado no receive mas record_document_event recebe
só p_body; coleção purchase_receipts não integra montagem do body; PDF só
projeta quantidades agregadas.

**Caminho técnico:** B3 contracts/public.audited_legacy_supply_command.
19263.sql: 62, 152; private.record_document_event;
src/lib/server/operational-pdf.ts

**Evidência:** evidence/b612-receipts-results.json; evidence/pdf/PV02.pdf;
evidence/b66-inspection-results.json#PV02

**Método:** RPCs reais com dois atores Auth sintéticos e read-back/rollback;
PDF/control markers anterior da mesma projeção.

**Contraprova:** As duas linhas purchase_receipts e motivos permanecem no banco;
API atual retorna receipts; saldo final correto1, sem duplicação.

**Limites:** Não é apagamento de receipt nem prova de crédito errado; as duas
declarações foram na mesma transação de ensaio; sem cenário HTTP de falha.

**Consequência operacional:** Reconstruir quem declarou/decidiu sobre cada
parcela exige dados externos ao snapshot e correlação manual.

**Consequência informacional:** Snapshot não é autossuficiente para proveniência
das parcelas; agregado validado não descreve chegada pendente.

**Consequência humana:** Leitor do PDF pode desconhecer rejeição ou validação
ainda necessária.

**Consequência probatória técnica:** Evento não identifica formalmente qual
receipt criou; data/quantidade não substituem referência inequívoca.

**Relação A–B5:** B36-07/B5-004 tratam parcial e mensagem; lacuna de
identidade/snapshot é nova B6.

**Alternativas futuras:** Associar receiptId ao evento de declaração e preservar
estado/linhas/autor/decisão por versão; representar pendências e motivos
proporcionalmente.

**Riscos da mudança:** Inventar associação retroativa ambígua, alterar hashes
antigos ou tratar pendente como entrada validada.

**Aceite futuro:** Cada nova parcela tem evento com ID e proveniência; histórico
explica rejeição/validação e PDF distingue informado/validado sem alterar saldo.

**Regressões necessárias:** Parcelas idênticas, dois autores, recebimento admin
automático, rejeição, múltiplas validações e resposta perdida.

**Decisão pendente:** Definir conteúdo mínimo por parcela e estratégia não
destrutiva para legado sem elo formal.

## B6-011

**Título:** Cache PDF confia no objeto registrado sem comparar novamente o hash
de bytes

**Prioridade:** P2

**Natureza:** Risco sustentado de recuperação

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_ADAPTADOR_CONTROLADO

**Origem:** RISCO_ANTERIOR_APROFUNDADO

**Documento afetado:** PDF r4 e original legado

**Processo:** Recuperar após corrupção ou restauração administrativa

**Pessoa afetada:** Administrador e leitor autorizado

**Evento de origem:** Download de cache existente

**Fonte persistida:** document_pdf_renders/document_pdfs.sha256; Storage bytes

**Versão:** Versão/renderer do cache

**Snapshot:** Hash canônico separado do hash de arquivo

**Representação:** documentPdf resposta de cache

**Contrato esperado:** Divergência entre bytes e digest registrado é detectada
antes de oferecer comprovante como recuperado.

**Observado:** B67-C01 devolveu bytes controlados divergentes em cache r4 e
legado; SELECT só pede object_path, não sha256.

**Causa sustentada:** Ramo existente baixa e retorna sem recalcular digest nem
conferir assinatura PDF; registro de serviço é confiança.

**Caminho técnico:** src/lib/server/document-pdf.ts: lookup/existing

**Evidência:** evidence/b67-cache-results.json;
../2026-10-30-phase-b4-backend/07_DOCUMENTS_PDF_ATTACHMENTS_SERVICES.md

**Método:** Serviço real com resultado autorizativo e Storage controlados; sem
corromper bucket real.

**Contraprova:** B47-01 bytes reais coincidiram; objetos privados e sem upsert
no fluxo normal; autorização antecede download.

**Limites:** Não é vulnerabilidade pública ou incidente real; metadados199/199
não comprovam integridade de cada byte.

**Consequência operacional:** Restore/corrupção privilegiada pode entregar
arquivo incorreto sem diagnóstico específico.

**Consequência informacional:** Hash guardado não é comparado no ponto de
recuperação.

**Consequência humana:** Leitor pode confiar na recuperação de um artefato que
não coincide com o registrado.

**Consequência probatória técnica:** Integridade de arquivo precisa de
comparação efetiva, não só existência do digest.

**Relação A–B5:** Risco estático B4 aprofundado por nova contraprova de
adaptador; B3-014 dependente.

**Alternativas futuras:** Verificação segura de bytes e estado de integridade;
reconciliação preservando objeto/registro para investigação.

**Riscos da mudança:** Sobrescrever/regenerar original ao detectar falha;
confundir hash de body com hash PDF; latência não medida.

**Aceite futuro:** Digest divergente gera erro recuperável explícito sem
transmitir como arquivo válido; original não é substituído.

**Regressões necessárias:** Cache correto, bytes alterados, arquivo ausente,
truncado, colisão de render, legado e revogação.

**Decisão pendente:** Definir política de falha e reconciliação de integridade
em restauração.

## B6-012

**Título:** PDFs examinados continuam sem idioma e árvore de estrutura acessível

**Prioridade:** P2

**Natureza:** Falha de acessibilidade documental

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_ESTRUTURA_PDF

**Origem:** REVALIDACAO_ANTERIOR

**Documento afetado:** REQ; COM; ENT; BAL

**Processo:** Ler PDF com tecnologia assistiva

**Pessoa afetada:** Pessoa com deficiência visual

**Evento de origem:** renderDocumentPdf

**Fonte persistida:** Catálogo do PDF

**Versão:** Onze PDFs renderer4 examinados

**Snapshot:** Conteúdo textual extraível

**Representação:** PDF sem /Lang e /StructTreeRoot

**Contrato esperado:** Representação possui idioma e estrutura semântica
apropriada ou alternativa acessível claramente descoberta.

**Observado:** Onze PDFs não contêm Lang nem StructTreeRoot; texto nativo
extraível e fontes embutidas não estabelecem leitura semântica.

**Causa sustentada:** Renderer desenha textos/tabelas diretamente sem tags
semânticas nem setLanguage.

**Caminho técnico:** src/lib/server/operational-pdf.ts; PDF Catalog

**Evidência:** evidence/b66-inspection-results.json;
../2026-10-28-phase-b1-interface/evidence/pdf-inspection.json

**Método:** Inspeção estrutural PyMuPDF e leitura do renderer; causa B1
reaproveitada.

**Contraprova:** Texto é extraível e HTML autenticado existe; isso não equivale
a ausência total de alternativa.

**Limites:** Sem leitor de tela real ou pessoa com deficiência testada; não
declara toda leitura impossível.

**Consequência operacional:** Documento compartilhado pode ter navegação/ordem
de leitura inadequadas.

**Consequência informacional:** Cabeçalhos e células não têm semântica
programática explícita.

**Consequência humana:** Leitor de AT pode não compreender associação entre
quantidade e material.

**Consequência probatória técnica:** Afeta acesso à informação, não hash/autoria
ou verdade física.

**Relação A–B5:** B1-A11Y-001 revalidado em amostra nova; sem duplicar causa
como descoberta independente.

**Alternativas futuras:** Renderer com tags/idioma ou alternativa HTML acessível
fiel e fácil de encontrar; homologação AT.

**Riscos da mudança:** Trocar biblioteca sem preservar renderer antigo, quebrar
layout ou declarar conformidade só por tags.

**Aceite futuro:** Idioma e leitura por headings/tabelas são comprovados por
estrutura e AT; alternativa mantém campos/versão autorizados.

**Regressões necessárias:** Quatro tipos, multipágina, nomes longos, zoom/baixa
visão, AT e versão histórica.

**Decisão pendente:** Definir público, alternativa acessível e gate humano de
lançamento.

## B6-013

**Título:** Tabela REQ omite contexto observado e situação de cada linha
atendida

**Prioridade:** P3

**Natureza:** Oportunidade de fidelidade editorial

**Estado:** ABERTO_DIAGNOSTICO_SEM_CORRECAO

**Confiança:** CONFIRMADO_FONTE_E_RENDER

**Origem:** NOVA_MANIFESTACAO_ANTERIOR

**Documento afetado:** REQ

**Processo:** Compartilhar necessidade parcialmente atendida

**Pessoa afetada:** Familiar e profissional

**Evento de origem:** REQ com estoque observado/fulfillment parcial

**Fonte persistida:** requisition_items.current_stock; fulfillmentLines

**Versão:** Versão parcial corrente

**Snapshot:** Estoque e flags por item no body

**Representação:** PDF tabela de materiais

**Contrato esperado:** Compartilhamento conserva contexto necessário ou declara
claramente a projeção resumida, sem quantidade solicitada.

**Observado:** PV01 mostra1/2 atendidos e estoque7 no snapshot; PDF não imprime
observação7 nem identifica qual item já foi atendido.

**Causa sustentada:** Tabela seleciona só número/material/unidade/prioridade;
fulfillment é consumido apenas no contador.

**Caminho técnico:** src/lib/server/operational-pdf.ts: REQ table;
src/components/requisitions/requisition-detail.tsx

**Evidência:** evidence/pdf/PV01.pdf; evidence/b66-pdf-results.json#PV01;
../2026-10-25-production-readiness/FINDINGS_MASTER.csv#BE-007

**Método:** Comparação de snapshot, texto e imagem; causa BE-007 conhecida
ampliada para flags por linha.

**Contraprova:** Contador parcial e nota sobre REQ sem quantidade solicitada
estão corretos; dados permanecem na tela/banco.

**Limites:** Decisão de produto/editorial; não corrupção nem obrigação de
mostrar saldo atual; sem medição de erro humano.

**Consequência operacional:** Destinatário retorna ao app para contexto da
necessidade e item pendente.

**Consequência informacional:** Documento resumido perde contexto por linha.

**Consequência humana:** Pode exigir contato adicional para entender o que ainda
falta.

**Consequência probatória técnica:** Não compromete digest; limita informação
contida no comprovante isolado.

**Relação A–B5:** A BE-007/B1-DOC-001 revalidados; manifestação de situação por
linha acrescentada, sem duplicação.

**Alternativas futuras:** Indicar observado/desconhecido e atendimento por item,
ou assumir explicitamente resumo com caminho autorizado ao detalhe.

**Riscos da mudança:** Chamar observado de saldo oficial/quantidade solicitada;
usar catálogo/estoque atual no passado.

**Aceite futuro:** Decisão editorial documentada; se incluído, campo histórico e
unidade corretos, flags por item coerentes e renderer antigo preservado.

**Regressões necessárias:** Zero/desconhecido/fracionário, extra não resolvido,
parcial/arquivo/reabertura e nomes longos.

**Decisão pendente:** Aprovar conteúdo mínimo da REQ compartilhada; manter
mínimo de digitação e contrato sem quantidade solicitada.
