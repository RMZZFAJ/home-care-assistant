"""Consolidates audit records; never runs probes or touches product/data."""
from assemble import ROOT, REPO, csv_file, md, checkpoint, reused
from pathlib import Path
import csv,json,hashlib

reused()
new=[]
def scenario(identifier,group,method,purpose,evidence,result,source,ui,pdf,recovery,interpretation,version='Versão/caso indicado na evidência',attachments='Sem alteração;ver cadeia B6.8',origin='NOVO_B6'):
    new.append(dict(id=identifier,group=group,origin=origin,method=method,purpose=purpose,result=result,evidence=evidence,fact_or_declaration=purpose,persisted_source=source,event='Evento do caso ou contrato explicitado;sem atribuir persistência a fixture só renderizada',version=version,snapshot='Fonte do caso preservada;hash canônico somente quando SQL o prova',history='Versões/ações indicadas na evidência;limites de reconstrução no relatório05',ui=ui,pdf=pdf,attachments=attachments,recovery=recovery,human_interpretation=interpretation,counterproof='Confrontada no relatório do subgrupo e no registro mestre',limits='Somente local/fictício ou prova anterior idêntica;sem produção,humano ou fato físico'))

for identifier,purpose,result in [
    ('B62-S01','Renomear atores/paciente após evento','Hash e emissor/paciente antigos preservados;ator novo congelado'),
    ('B62-S02','Registrar legado de data desconhecida e nome de origem diferente','Fonte preservada;derivado usa data atual/nome cadastral'),
    ('B62-S03','Emitir com criação antiga e repetir código em outro paciente','Código local repetido legítimo;protocolo distinto;data criação não muda'),
]:
    scenario(identifier,'B6.2','SQL_LOCAL_ROLLBACK',purpose,'evidence/b62-provenance-results.json#'+identifier,result,'Novos fixtures em transaction;dois Auth reais fictícios','Nome supply analisado estaticamente','PV06/03 complementam,não HTTP','Versão anterior/hash guardados','Autor do evento não é sempre emissor;incerteza legado deve aparecer')
scenario('B63-R01','B6.3','READ_ONLY','Comparar corpo/cadeia/cabeçalho/versão de todo acervo local','evidence/b63-integrity-results.json#B63-R01','Zero mismatches em745eventos/210documentos','Agregados existentes,sem corpos exportados','Não exercitada','Sem bytes analisados neste passo','Versões existentes conferidas','Hash correto não é prova de autoria humana')
cases=json.loads(ROOT.joinpath('evidence/b66-pdf-results.json').read_text(encoding='utf-8'))['cases']
visual={r['id']:r for r in csv.DictReader(ROOT.joinpath('06_PDF_VISUAL_CASES.csv').open(encoding='utf-8'))}
for c in cases:
    scenario(c['id'],'B6.6','RENDER_TEXTO_VISUAL',c['purpose'],'evidence/b66-pdf-results.json#'+c['id'],visual[c['id']]['result'],'Snapshot somente sintético;PV06 veio de helper SQL revertido','Comparação estática dos campos da tela','PDF real renderer4;imagens vistas conforme CSV','Arquivo de ensaio preservado por hash','Distinguir campo omitido/ilegível de registro perdido',version='Fixture v'+str(c['source']['version']))
scenario('B66-S02','B6.6','SQL_LOCAL_ROLLBACK','Validar alcance de nome160/LF até snapshot COM','evidence/b66-catalog-results.json#B66-S02','Catálogo e COM reais aceitam nome exato/hash válido','RPC com claims Auth reais;novo paciente/catálogo/COM;rollback','Schema HTTP confere limite;sem browser','PV09 demonstra projeção de tabela comum','Nenhum cadastro antigo alterado','Tamanho válido não garante altura de célula representável')
scenario('B67-C01','B6.7','ADAPTADOR_CONTROLADO','Modelar corrupção administrativa de bytes de cache','evidence/b67-cache-results.json#B67-C01','Cache r4/legado retorna bytes divergentes','Storage fake;serviço documentPdf real','Não exercitada','Nenhum PDF real alterado','Risco de comparação ausente','Não é exploração pública nem corrupção real de bucket')
scenario('B67-R02','B6.7','READ_ONLY','Conciliar metadados documentais e objetos Storage','evidence/b67-storage-results.json#B67-R02','199renders com objeto;ready faltante de fixtureB3;sem órfão de objetos','Metadados locais somente','Ready sem URL não prova disponibilidade','Nenhum download/byte verificado','Sem limpeza;retenção/restore pendentes','Linha de objeto não equivale a bytes íntegros')
scenario('B68-C01','B6.8','SANITIZADOR_VISUAL','Comparar ressalva FreeText/Ink e conteúdo normal','evidence/b68-sanitize-results.json#B68-C01','Anotações visíveis removidas;content stream preservado','PDFs novos em memória/disco;sem upload','Ready=Validado é projeção técnica','4PDFs origem/derivado e4imagens vistos','Origem de ensaio preservada;produto não guarda original neste contrato','Arquivo sanitizado não é cópia visualmente equivalente por inferência')
scenario('B69-O01','B6.9','QR_OFFLINE','Decodificar QR de versões3/5 em pixels','evidence/b69-qr-results.json#B69-O01','UUID/versão/hash exatos;domínio fixo;sem fetch','PNG extraído dos PDFs sintéticos','Página pública lida em fonte,sem abrir produção','QR em76pt;2PNGs180px','URL/domínio histórico exige decisão','Consulta de tupla não verifica os bytes do exemplar apresentado')
scenario('B610-V01','B6.10','RASTER_CINZA_VISUAL','Inspecionar contraste digital em monocromático','evidence/images/PV03-p1-gray.png','Cabeçalho/tabela/texto distinguíveis no raster','Mesmo PV03,sem gerar PDF novamente','Não exercitada','Cinza digital visto;não papel','Sem efeito em artefato original','Impressora/baixa visão/câmera continuamNOT_VERIFIED')
scenario('B612-S01','B6.12','SQL_LOCAL_ROLLBACK','Declarar duas parcelasCOM;rejeitar uma e validar outra','evidence/b612-receipts-results.json#B612-S01','Duas receipts preservadas;receive semreceiptId;body semreceipts;crédito1 correto','RPCs reais/claims Auth;novas linhas;rollback','API atual retorna receipts;PDF não','PV02 e projeção vigente complementam;sem rerender','Fonte banco conserva parcelas/motivo;falta elo no evento criador','Não confundir zero validado com ausência de chegada relatada')
scenario('B612-R02','B6.12','READ_ONLY','Explicar único evento sem ator nem authority system','evidence/b612-legacy-context-results.json#B612-R02','Um req.legacy_imported sem authority;sem evidência de rotina atual falsa','Agregado de legado,sem nome/ID','Não exercitada','Legado requer qualificação','Ausência de autoria original não deve ser preenchida artificialmente','Não generalizar legado sem contexto a automação atual')
assert len(new)==23

prior=[
 ('H01','REQ concluída/arquivo/reabertura','../2026-10-29-phase-b3-database/evidence/b36-results.json#B36-03','Versão/hash antigos preservados;motivo anterior existe'),
 ('H02','ENT com consumo anterior/cancelamento','../2026-10-29-phase-b3-database/evidence/b36-results.json#B36-05','42702 rollback;sem consumo inventado;B3-002'),
 ('H03','COM parcialmente adquirida/recebida','../2026-10-29-phase-b3-database/evidence/b36-results.json#B36-07','Remanescente8 existe;sem desistência parcial modelada'),
 ('H04','PDF versão ausente','../2026-10-30-phase-b4-backend/evidence/b47-pdf-results.json#B47-02','404;não substitui por atual'),
 ('H05','PDF de outro paciente','../2026-10-30-phase-b4-backend/evidence/b47-pdf-results.json#B47-03','403mesmo com cache existente'),
 ('H06','Original legado ausente','../2026-10-30-phase-b4-backend/evidence/b47-pdf-results.json#B47-04','404;não reconstrói original'),
 ('H07','Foto sanitizada/associação/replay','../2026-10-29-phase-b3-database/evidence/b310-results.json#B310-01','JPEG sem EXIF;bytes/hash/associação controlados'),
 ('H08','Reserva abandonada','../2026-10-29-phase-b3-database/evidence/b310-results.json#B310-05','Capacidade10esgotada;sem limpeza'),
 ('H09','URL após revogar vínculo','../2026-10-29-phase-b3-database/evidence/b310-results.json#B310-06','Nova APIrecusa;URLantiga válida dentro prazo;expiração final não medida'),
 ('H10','Correção de estoque sem referência','../2026-10-29-phase-b3-database/evidence/b35-results.json#B35-11','Compensação sem elo aceita;saldo/ledger permanecem'),
 ('H11','Revisão salva/submissão recusada','../2026-10-30-phase-b4-backend/evidence/b44-command-results.json#B44-05','Draft avança;errocomposto omite primeira etapa'),
 ('H12','História de mil eventos','../2026-10-29-phase-b3-database/evidence/b312v-results.json#B312-09','Hashv1econteúdo conservados;custoquadrático'),
]
for identifier,purpose,evidence,result in prior:
    scenario(identifier,'TRANSVERSAL','PROVA_ANTERIOR_REUTILIZADA',purpose,evidence,result,'Mesma base37cb7f85e;232rotinas sem drift','Limites da prova original mantidos','Sem nova geração/reproduçãoB6','Conforme prova original e relatórios05/07/08/11','Fato preservado não é garantia humana/física',origin='HERDADO_SEM_REEXECUCAO')
csv_file('evidence/SCENARIOS.csv',new)

stats={'requiredDeliverables':25,'inventoryObjects':17,'inventoryFields':22,
       'fieldRows':sum(1 for _ in csv.DictReader(ROOT.joinpath('04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv').open(encoding='utf-8'))),
       'findings':13,'findingFields':33,'P2':11,'P3':2,'newCauses':9,'newManifestations':2,'priorRiskDeepened':1,'revalidation':1,
       'newScenarios':23,'priorScenarioReferences':12,'scenarioRows':35,'priorFindingRecords':18,
       'primaryPdfs':11,'primaryPages':32,'primaryVisualPages':20,'grayscaleVisualPages':1,'attachmentPdfs':4,'attachmentVisualPages':4,
       'methods':{m:sum(r['method']==m and r['origin']=='NOVO_B6' for r in new) for m in sorted({r['method'] for r in new if r['origin']=='NOVO_B6'})}}
ROOT.joinpath('evidence/coverage-reconciliation.json').write_text(json.dumps(stats,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

md('12_ADVERSARIAL_DOCUMENT_RECONSTRUCTION.md',"""
# B6.12 — Reconstrução adversarial e contraditório

A matriz mestre evidence/SCENARIOS.csv cobre23cenários/pontos novos e12
referências anteriores,sem chamá-los35E2E. Cinco pontos SQL mutáveis em três
transações bem-sucedidas foram integralmente revertidos;três agregados são
READ ONLY. Onze casos são renderização;há cache controlado,sanitizador,
QR offline e cinza digital. Cada registro distingue fonte/declaração,evento,
versão,snapshot,história,tela,PDF,anexos,recuperação e interpretação.

## Segunda passagem que acrescentou evidência

B612-S01 criou COM10,adquiriu3,declarou duas parcelas1+1 como familiar e
rejeitou uma/validou outra como administrador. Todos os comandos foram RPCs
vigentes sob claims de duas sessões Auth fictícias. Ao fim,duas receipts com
estados diferentes e motivo existiam,crédito validado era1. O snapshot de
declaração não continha receipts e ambos eventos com.receive omitiam receiptId
do registro que criaram. O retorno atual da API continha as parcelas. Assim,
não é perda de registro nem crédito errado;é falta de elo inequívoco no evento
criador e representação histórica incompleta. Não reexecutar PDF: a projeção
inalterada já foi examinada em PV02 e no código. Primeira montagem SQL
ambígua do instrumento foi corrigida,com rollback;ATTEMPTS separa o incidente.

B612-R02 investigou o único evento de ator nulo sem authority system do
agregado B63:um req.legacy_imported sem authority. Não é evidência de tarefa
automática atual inventada. Legado sem contexto precisa qualificação,sem
atribuir autoria original a quem importou ou preencher assinatura fictícia.

## Contraprovas e hipóteses refutadas

- Renomear emissor/paciente não reescreveu hash/identidade antigos;B62-S01.
- Mesmo código em dois pacientes não é colisão de documento;protocolo e UUID
  distinguem identidade;B62-S03.
- Versão inexistente não vira versão atual;original ausente não é regenerado;
  cache privado não contorna autorização;B47 reaproveitado.
- Não existe falha geral de palavra longa ou paginação comum:PV08/PV07
  preservam conteúdo;PV09 isola célula mais alta que a página.
- Sanitizador não apaga toda ressalva:content stream preservado,FreeText/Ink
  removidos;contraprova visual B68-C01.
- Continuação não perde identidade de documento:código/versão e página ficam
  no rodapé. Não classificar espaço livre intencional como corrupção.
- QR carrega versão/hash exatos e não nome do paciente;consulta mínima não é
  vazamento do documento completo nem assinatura digital.
- Nome dos revisores BAL aparece na história. O achado é ausência de ligação
  a grupo/contagem,sem afirmar ausência total de autoria ou aprovação no banco.

## Limites de reconstrução

REQ arquivada/reaberta,ENT com consumo e COM parcial reutilizam B36;revisão
salva/submissão recusada reutiliza B44;identidade/autoridade entre pacientes
reutiliza B3/B47. Não fazer replay mecânico dos25cenários sugeridos na ordem.
Nome histórico,unidade anterior,inativação,papel revogado e evento system
foram confrontados com snapshots/contratos;nem todas as combinações receberam
novo ensaio dinâmico. Campo com fallback não autoriza inventar original.

Autenticidade humana,presença,fato físico,pagamento,recebimento material e
assinatura não decorrem automaticamente do hash,QR ou perfil profissional.
Impressão real,AT,câmera física,restauração conjunta e operação externa
permanecem NOT_VERIFIED. Essas limitações não são falhas atuais reproduzidas.
Treze registros deduplicados no mestre distinguem nove causas novas,duas
manifestações anteriores,um risco aprofundado e uma revalidação.
""")

md('13_NEW_DOCUMENT_GAPS_AND_OPPORTUNITIES.md',"""
# Lacunas documentais e oportunidades proporcionais

Nove causas novas B6 estão detalhadas em B6-001–008 e B6-010. Elas tratam
fidelidade de legado,data de emissão,autoria pelo cadastro atual,ressalvas ENT,
aprovações BAL,estados terminais,overflow,sanitização de anotações e identidade
de parcelasCOM. Não são nove corrupções do banco nem autorização de correção.

Priorizar na decisão futura perdas materiais de representação:ressalva de
anexo que desaparece,célula cortada e data/estado que afirmam acontecimento
distinto. Em seguida,completar rastreabilidade de decisões/parcelas e atribuição
histórica. As causas têm critérios individuais,no arquivo15,sem pedir
reescrita integral do módulo documental.

B6-009 e013 ampliam oportunidades conhecidas:acesso acionável a versões,
mudanças compreensíveis,contexto observado e atendimento por linha REQ.
Continuam P3,não bloqueios artificiais. A opção de omitir estoque observado
pode ser legítima se o resumo e o percurso ao detalhe forem explicitados.
Nunca transformá-lo em quantidade solicitada ou saldo oficial.

B6-011 aprofunda risco de cache já apontado em B4;B6-012 revalida acessibilidade
B1. Retenção de reservas,URL emitida,correção sem referência,cancelamento com
consumo e restore conjunto permanecem causas anteriores,encaminhadas sem
novos IDs artificiais. QR/domínio e assinatura são decisões de necessidade,
não funcionalidades presumidas obrigatórias só por haver comprovante.

Oportunidades opcionais:audit trail legível com comparação entre versões,
exportação de pacote documental autorizado,distinção explícita de original e
derivado,verificação adicional de arquivo e eventual assinatura conforme
necessidade real. Benefício deve superar custo/privacidade;nenhuma foi
implementada ou tratada como validação jurídica automática.
""")

md('16_CROSS_GROUP_DEPENDENCIES.md',"""
# Dependências entre grupos

- **A/B1:** UX-001/B1-UX-001 e DB-002 continuam impedimentos do parecer
  anterior. B6 não aprovou produção nem repetiu todos os gates. BE-007/B1-DOC-001
  e B1-UX-006 recebem manifestações B6-013/009. B1-A11Y-001 permanece B6-012.
- **B2/B3:** B2-004/B3-002 impedem cancelamento com consumo;preservar separação
  entre consumo e devolução. B2-008/B3-005 exigem navegação/origem das
  compensações;B2-011 mantém conflito de decisão de consumo separado de
  identidade do confirmador. Não transformar sucesso HTTP em fato não aplicado.
- **B3:** B3-004 de reservas e B3-022 de URLs são dependências da custódia,
  sem limpeza automática. B3-015 de história quadrática limita exportação
  extensa,sem justificar apagar eventos. B3-014/OPS-001 exigem restore conjunto
  isolado autorizado,sem sobrepor este ambiente.
- **B4:** B4-004 precisa comunicar revisão já salva quando submit falha;
  B6-002 deve distinguir essa versão draft da emissão. Cache e pipeline
  mantêm autorização e imutabilidade;B6-011 acrescenta comparação de digest.
  B4-007 avatar sem associação é caminho separado de anexo de documento.
- **B5:** B5-004 de mensagem não é prova de conteúdo PDF;B5-005 exige decisão
  sobre dados mínimos externos. B5-013/014 precisam conciliação de tentativas
  sem reenvio cego após restore. Domínio canônico deve preservar QRs antigos.
- **C futura:** unificar causas,escopo inicial,responsáveis e critérios sem
  autorizar D. **D futura:** mudança de renderer versionada,novas migrations
  incrementais quando necessárias,testes dirigidos e preservação de acervo.

Nenhuma recomendação pode eliminar separação de custódia,ciência/recebimento,
relato/débito,escala/presença,contador/revisor,assinatura/hash ou original/
reconstrução. Intervenção no produto,banco remoto ou infraestrutura requer
autorização futura própria. Este documento é insumo,sem execução da Fase C.
""")

md('17_GROUP_B6_EXECUTIVE_ASSESSMENT.md',"""
# Parecer executivo B6

A B6.0–B6.12 terminou como diagnóstico documental,sem correções. O sistema
preserva fatos e versões com controles relevantes,mas suas representações
ainda podem omitir ressalvas ou sugerir datas,autores e pendências inadequados.
O parecer NO-GO anterior permanece. Esta auditoria não aprova produção.

## O que já pode ser reconhecido como correto

REQ registra necessidade sem quantidade solicitada;COM separa aquisição e
recebimento validado;ENT separa expedição,trânsito e aceite;BAL distingue
contagem atual,referência e revisão. Histórico,hashes,versões e acesso por
paciente existem. A leitura independente dos745eventos locais de210documentos
não encontrou divergência de hash,cadeia,versão,identidade ou cabeçalho.
Rename não reescreveu o nome original do emissor/paciente nem o hash antigo.

Versões anteriores podem ser recuperadas pelo endpoint autorizado. Versão
ausente não é substituída pela atual;arquivo original ausente não é recriado.
Mas a interface não facilita baixar cada versão nem explicar suas mudanças.
Zero PDFs originais estavam registrados no baseline local;isso não certifica
existência de acervo original remoto. PDFs r4 são representações derivadas.

## Problemas que precisam entrar na decisão de correção

- PDF legado pode mostrar data atual quando a original é desconhecida e
  priorizar nome cadastral sobre o snapshot histórico. A fonte continua intacta.
- ENT pode imprimir como Emissão a data em que o draft foi criado,dias antes
  da expedição. Cancelados podem continuar com cards/instruções de recebimento
  pendente ou operação em andamento.
- Histórico supply usa nomes atuais do diretório,embora o evento tenha nome
  do momento do ato. O PDF conserva esse nome histórico corretamente.
- Ressalvas de avaria e natureza das conciliações ENT não acompanham as
  quantidades no PDF. BAL não relaciona revisão/grupo à versão de contagem.
- Duas parcelasCOM foram preservadas corretamente,uma rejeitada e outra
  validada;os eventos de declaração não identificam a receipt que criaram
  e o snapshot não inclui a coleção de parcelas. PDF agregado não explica
  chegada ainda pendente de validação nem motivo de rejeição.
- Nome permitido de160caracteres com quebras internas faz célula atravessar
  rodapé e perder texto visível. Palavra longa comum e tabela extensa normal
  passaram como contraprova:é defeito específico de célula alta.
- Sanitização de PDF passivo apagou ressalva e traço visíveis em anotações.
  Texto-base e a mesma ressalva gravada como conteúdo normal sobreviveram.
  O arquivo sanitizado não é automaticamente fiel ao original recebido.

Treze registros:11P2 e2P3,nove causas novas,duas manifestações conhecidas,
um risco aprofundado e uma revalidação. Sem P0/P1 novo;isso não prova ausência
universal de defeitos. Os bloqueadores de A/B1/B3 continuam abertos.

## O que o comprovante realmente comprova

Hash canônico permite comparar conteúdo registrado;hash PDF identifica bytes
guardados,mas o download do cache hoje não o compara novamente. Essa lacuna
foi demonstrada com bytes controlados,sem corromper bucket real. QR decodificado
preserva ID/versão/hash e consulta correspondência mínima;não recebe o arquivo
do leitor,não valida assinatura e não prova recebimento físico. O domínio do
QR é fixo e precisa de continuidade operacional.

Não há assinatura digital assimétrica de pessoa ou carimbo externo implementado.
Nome,conta e perfil profissional não substituem confirmação humana do fato.
Ciência expressa,automática,leitura de mensagem e aceite de material são atos
distintos. Anexo prova o derivado armazenado e sua associação,sem provar por
si quem capturou o papel ou se o conteúdo declarado aconteceu.

## Apresentação,limites e próximos responsáveis

Onze PDFs fictícios/32páginas;20páginas selecionadas vistas,mais uma em cinza.
Quatro páginas adicionais de anexos origem/derivado foram vistas. As amostras
comuns são sóbrias e legíveis no raster;PV09 tem corte confirmado. Idioma/tags
acessíveis continuam ausentes,causa B1 revalidada. Impressão real,AT,câmera,
dispositivos físicos e compreensão por pessoas continuam NOT_VERIFIED.

Incluir estoque observado/atendimento por linha e melhorar navegação histórica
são escolhas editoriais P3. Guarda de original/derivado,retenção,dados mínimos,
responsável pela conferência,domínio e eventual assinatura exigem decisão do
produto/operação. Restore conjunto de banco,Auth,bytes,configuração e jobs
continua NOT_VERIFIED;backup com hash/TOC não o substitui.

Código,232rotinas SQL e dados públicos originais foram preservados. As78contas
Auth anteriores conservaram13campos estáveis;duas contas fictícias novas
permanecem,sem pacientes/documentos novos persistidos nos ensaios revertidos.
Não houve envio externo,alteração remota,deploy,PR ou merge. O handoff18
organiza decisões futuras sem iniciar C/D.
""")

md('18_PHASE_C_DECISION_HANDOFF.md',"""
# Insumos documentais para decisão futura da Fase C

Este handoff não inicia C nem autoriza implementação. Cada achado possui
causa,prova,contraprova,riscos,aceite e regressão nos arquivos14/15. A decisão
deve reconciliar A–B6 por causa,sem criar lista duplicada por tela e PDF.

## Correções técnicas

**Problemas/evidência:** B6-007 de célula cortada(PV09/B66-S02),B6-008 de
anotação removida(B68-C01),B6-010 de receipt sem elo(B612-S01) e B6-011 de
cache sem comparação(B67-C01). **Alternativas:** fragmentação segura de
células;derivado visual passivo ou recusa informada;identidade de parcela por
evento;verificação de digest na recuperação. **Benefício:** preservar conteúdo
e detectar divergência. **Custo:** médio;medir renderer/sanitizador/armazenamento,
sem estimar preço sem projeto. **Risco:** reintroduzir conteúdo ativo,reescrever
original,mudar saldo ou perder replay. **Dependências:** B3/B4 de integridade,
retenção e contratos de recepção. **Aceite:** AC-B6-007/008/010/011.
**Responsável:** liderança técnica com responsável documental/operacional.

## Correções de representação documental

**Problemas/evidência:** B6-001/002/003/004/005/006 e suas provas de fonte,
SQL e PDF. **Alternativas:** datas com significado próprio,nome histórico,
ressalvas e aprovações contextualizadas,estado terminal coerente. **Benefício:**
familiar/profissional reconstrói o ato sem inferir informação errada. **Custo:**
pequeno a médio por renderer/projeção;depende de decisão dos campos mínimos.
**Risco:** inventar dado original,apagar autoria ou confundir aprovação com
contagem. **Dependências:** taxonomia e máquina de estados A–B3. **Aceite:**
respectivos AC no arquivo15. **Responsável:** produto/operação valida linguagem;
técnica define migração/renderer futuro sem substituir históricos.

## Decisões de produto

**Problemas:** completude esperada de cada PDF e descoberta de versões
(B6-009/013);papel do QR/assinatura. **Evidência:** PV01,projeções05/09 e
consulta mínima. **Alternativas:** documento resumido explicitamente rotulado
ou detalhes por linha;links históricos;eventual verificação adicional/assinatura
se houver necessidade demonstrada. **Benefício:** clareza com custo proporcional.
**Custo:** pequeno para projeção;desconhecido para assinatura/infra externa.
**Risco:** aumentar dados sensíveis/papel ou alterar contrato REQ. **Dependências:**
privacidade/acesso e renderer. **Aceite:** AC-B6-009/013 e limite técnico09.
**Responsável:** dono do produto com família/equipe;nenhuma obrigatoriedade
jurídica de mecanismo específico é presumida por esta auditoria.

## Decisões operacionais

**Problemas:** quem confere papel/material,quem revisa BAL,quem guarda cópias
e quem concilia divergência/retorno. **Evidência:** B6-004/005/006/010 e
B2-004/011/B3-005. **Alternativas:** procedimento de conferência/ressalva
separando declaração e confirmação;resumo por ato e responsável;tratamento
manual de casos bloqueados sem inventar consumo. **Benefício:** continuidade
e responsabilidade reconhecível. **Custo:** treinamento e operação a medir.
**Risco:** assinar por terceiro,usar escala como presença ou contornar guard.
**Dependências:** correções de processo B2/B3 e comunicação B5. **Aceite:**
pessoa reconstitui quem declarou/recebeu/revisou e próxima ação usando a
documentação escolhida. **Responsável:** administrador da residência e equipe.

## Governança,privacidade e retenção

**Problemas:** original/derivado,quarantine,URLs e cópias fora do servidor;
B3-004/022,B4-007,B6-008 e relatório11. **Alternativas:** retenção por classe,
preservação restrita da origem quando necessária,reconciliação de órfãos,
prazo/proxy adequado e comunicação dos limites. **Benefício:** recuperar sem
destruir evidência ou prometer revogação impossível. **Custo:** bytes/acesso/
processo a estimar. **Risco:** apagar arquivo ativo/válido,vazar original ou
confundir ready com validação do conteúdo. **Aceite:** política com dono,prazos,
exceções,recuperação e acesso por paciente;sem exclusão implementada nesta fase.
**Responsável:** controlador/responsável operacional com apoio técnico e
assessoria jurídica quando o contexto exigir definição normativa.

## Recursos opcionais

Pacote exportável autorizado,comparação entre versões,assinatura adicional e
outro formato de impressão dependem de necessidade real. Benefício/custo,
privacidade e manutenção precisam ser comparados antes de escolher. Não há
prova de que A5,certificação externa ou redesenho visual integral sejam
requisitos do contrato. Responsável: produto;aceite exige caso de uso e
preservação de compatibilidade/versões,sem trocar hash por assinatura fictícia.

## Homologação pendente

**Problemas/evidência:** B3-014/OPS-001,B1-A11Y-001/B6-012 e limites06/10/11.
**Alternativas:** impressão física/QR/AT com amostra escolhida;ensaio de
recuperação em destino isolado autorizado com bytes,Auth,configuração e jobs;
teste humano por tarefa. **Benefício:** demonstrar operação real e RPO/RTO.
**Custo:** ambiente/tempo a planejar;nenhuma restauração sobre este ambiente.
**Risco:** reenviar mensagens após restore ou tratar emulação como aceitação
física. **Aceite:** critérios13/15 reconciliados com A e resultados por método,
sem declarar verde global a partir de imagem/hash. **Responsável:** operação,
plataforma,acessibilidade e dono do produto. Depende de nova autorização.
""")

md('README.md',f"""
# Fase B6 — documentos,PDFs,histórico e fidelidade

B6.0–B6.12 investigados em30/10/2026 na branch `audit/phase-b`,produto
`37cb7f85e96e551d6419871f94dd950712e2565b`,HEAD inicial
`69048034dc2532ffbe5d1dbca7dbd041c1f4be16`. Sem correções. NO-GO anterior
preservado;C/D,deploy,PR e merge não iniciados.

Começar pelo [parecer executivo](17_GROUP_B6_EXECUTIVE_ASSESSMENT.md),
[registro mestre](14_FINDINGS_MASTER.md) e
[handoff](18_PHASE_C_DECISION_HANDOFF.md). Estado de fechamento no
[checkpoint](CHECKPOINT.md).

## Cobertura e limites

- 17classes documentais/22campos no inventário;{stats['fieldRows']}linhas na
  matriz de fidelidade. Quatro documentos operacionais e complementos separados.
- 13registros/33campos:11P2/2P3;nove causas novas,duas manifestações conhecidas,
  um risco aprofundado e uma revalidação. Sem P0/P1 novo;anteriores permanecem.
- 23cenários/pontos novos e12provas anteriores referenciadas,não35E2E.
  Cinco pontos SQL mutáveis em três transações revertidas,três READ ONLY,
  onze casos de render,cache controlado,sanitizador,QR e cinza digital.
- Onze PDFs primários/32páginas;20páginas vistas e1cinza adicional. Quatro
  PDFs de anexo origem/derivado com4páginas vistas. São artefatos fictícios.
- 745eventos locais conferidos por agregado,sem divergência de hash/cadeia.
  Impressão física,AT,câmera,usuários reais,produção e restore conjunto:
  NOT_VERIFIED. PDF/QR/hash não provam fato físico ou assinatura humana.

## Mapa de leitura

1. [Baseline](00_BASELINE_SCOPE_AND_METHOD.md),
   [inventário](01_DOCUMENT_OBJECT_AND_SOURCE_INVENTORY.csv),
   [fontes](01_DOCUMENT_DOMAIN_AND_SOURCE_MAP.md) e
   [autoria](02_DOCUMENT_IDENTITY_AUTHORSHIP_AND_PROVENANCE.md).
2. [Integridade](03_EVENTS_SNAPSHOTS_HASHES_AND_IMMUTABILITY.md),
   [fidelidade](04_DOCUMENT_SEMANTIC_FIDELITY.md),
   [campos](04_DOCUMENT_FIELD_FIDELITY_MATRIX.csv) e
   [versões](05_VERSIONS_HISTORY_AND_RECONSTRUCTION.md).
3. [PDF](06_PDF_RENDERING_CONTENT_AND_LAYOUT.md),
   [casos visuais](06_PDF_VISUAL_CASES.csv),
   [cache](07_PDF_STORAGE_CACHE_AND_RECOVERY.md),
   [anexos](08_ATTACHMENTS_PROVENANCE_AND_CUSTODY.md) e
   [QR](09_QR_VERIFICATION_AND_EVIDENTIARY_LIMITS.md).
4. [Leitura e impressão](10_HISTORY_PRINTING_AND_HUMAN_INTERPRETATION.md),
   [retenção/restore](11_DOCUMENT_SECURITY_RETENTION_AND_RESTORE.md) e
   [contraditório](12_ADVERSARIAL_DOCUMENT_RECONSTRUCTION.md).
5. [Lacunas](13_NEW_DOCUMENT_GAPS_AND_OPPORTUNITIES.md),
   [mestre CSV](14_FINDINGS_MASTER.csv),
   [aceites](15_ACCEPTANCE_AND_REGRESSION_CRITERIA.md) e
   [dependências](16_CROSS_GROUP_DEPENDENCIES.md).

## Evidências e execução

[Cenários](evidence/SCENARIOS.csv),[reconciliação](evidence/coverage-reconciliation.json),
[provas anteriores](evidence/reused-evidence.json),
[tentativas instrumentais](evidence/ATTEMPTS.md),
[preservação](evidence/preservation-results.json),
[validação](evidence/package-validation.json) e [manifesto](evidence/MANIFEST.json).
Os instrumentos sob evidence são reprodutores documentais,não suíte para
rodar em lote. Não reexecutar scripts Auth/SQL antigos para retomar memória.
Credenciais/dump ficam fora do Git. Novos pacientes/documentos foram revertidos;
duas contas Auth fictícias de ensaio permanecem. Nenhum objeto Storage antigo
foi alterado nem documento real publicado.
""")

order=Path('C:/Users/renat/.codex/attachments/fa265b85-8212-4d7c-94cf-21e317188821/pasted-text-1.txt')
original=order.read_bytes()
normalized='\n'.join(line.rstrip() for line in original.decode('utf-8-sig').splitlines())+'\n'
ROOT.joinpath('evidence/MASTER_ORDER.txt').write_text(normalized,encoding='utf-8',newline='\n')
ROOT.joinpath('evidence/order-provenance.json').write_text(json.dumps({'originalSha256':hashlib.sha256(original).hexdigest(),'normalizedSha256':hashlib.sha256(normalized.encode()).hexdigest(),'normalization':'UTF8 LF;trailing whitespace removed;wording unchanged'},indent=2)+'\n',encoding='utf-8')
checkpoint('- B6.12 encerrado: COM de duas parcelas por RPC confirmou falta de receiptId\n  no evento criador e coleção ausente do snapshot;saldo1correto,ambas parcelas\n  preservadas. Agregado de ator nulo isolou um legado sem authority,sem falsa\n  rotina atual. Contraprovas explícitas;23pontos novos/12referências anteriores.\n  B6.0–12 concluídos. Consolidação13registros,aceites e handoff produzidos.\n  Preservação:395fontes,232rotinas,todas linhas públicas originais e78contas\n  Auth estáveis;2novas contas fictícias. Próximo:validação documental,índice,\n  manifesto,commit/push exclusivos na branch existente. Nenhuma implementação.')
print(json.dumps(stats,ensure_ascii=False))
