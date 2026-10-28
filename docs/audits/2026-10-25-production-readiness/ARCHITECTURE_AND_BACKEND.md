# Arquitetura e backend

SHA auditado: `37cb7f85e96e551d6419871f94dd950712e2565b`.
Leitura desta frente: 106 arquivos versionados de rotas, bibliotecas, tipos
e testes unitários. A planilha `evidence/coverage-backend.csv` identifica cada
arquivo. A leitura não equivale a executar todas as combinações de permissões.
Também foram lidos integralmente os nove arquivos de `tests/integration/`,
registrados em `evidence/coverage-integration.csv` e discutidos em
`evidence/INTEGRATION_REVIEW.md`.

## Modelo real de execução

A aplicação não possui um servidor de domínio independente do Next. Route
Handlers traduzem HTTP para consultas com o cliente da sessão e comandos RPC.
O cliente privilegiado fica nos caminhos de worker, webhook, finalização de
anexos e armazenamento de PDFs. Não é o cliente geral das operações de negócio.

`src/lib/server/api.ts` concentra quatro fronteiras distintas:

1. Corpo limitado em bytes, origem aprovada, JSON e schemas Zod estritos.
2. Identidade Auth verificada, perfil ativo e sessão ainda válida no banco.
3. Vínculo ativo, contexto explicitamente selecionado e capacidades efetivas.
4. Tradução de falhas para códigos públicos, correlação e `no-store`.

`authenticatedIdentity` é intencionalmente menos restritivo que `authenticate`:
permite consultar/selecionar contexto e aceitar convite antes de existir um
vínculo operacional pronto. Não se deve substituir um pelo outro mecanicamente.
As RPCs correspondentes continuam responsáveis pela autorização do comando.

O navegador não decide a autoridade. Os helpers `can`/`may` controlam a oferta
de ações; as consultas usam RLS e os comandos revalidam no banco. Rotas por UUID
como `/api/documents/:id` delegam a identificação do paciente à RPC, em vez de
aceitar uma associação documental enviada pelo cliente.

## Rastreamento dos domínios

- Entrada: Emissão REQ; Backend e autoridade: `requisitionInputSchema`,
  `patientContext(req.create)`; Persistência e consequência:
  `submit_requisition`, snapshots; leitura por `loadReceipt`; Recuperação:
  `RECEIPT_PENDING` confirma persistência e conserva ID; repetir mesma chave
- Entrada: Ciência REQ; Backend e autoridade: `/requisitions/:id/science`, modo
  e versão esperada; Persistência e consequência: `acknowledge_requisition`;
  modalidade registrada separadamente; Recuperação: Conflito exige atualizar
  versão; não substitui aceite de materiais
- Entrada: Arquivamento/cancelamento REQ; Backend e autoridade: motivo e
  contexto; RPC específica; Persistência e consequência: Histórico
  administrativo separado de atendimento; Recuperação: Rotas não usam o envelope
  de comando COM/ENT/BAL; não supor contrato uniforme
- Entrada: COM/ENT/BAL; Backend e autoridade: `createSupplySchema` e
  `supplyCommandSchema`; Persistência e consequência: `create_supply_document`,
  `supply_document_command`; ledger/transação no banco; Recuperação: Chave e
  versão esperada; quantidade decimal normalizada
- Entrada: Edição/reconto; Backend e autoridade: `/documents/:id/revise`;
  Persistência e consequência: `revise_supply_document`; submissão posterior usa
  outra RPC/chave; Recuperação: Duas transações: uma falha de submissão pode
  deixar revisão salva; conservar ambas as chaves
- Entrada: Consumo/falta; Backend e autoridade:
  `report_extraordinary_consumption` e confirmação distinta; Persistência e
  consequência: Relato não debita automaticamente; confirmação autorizada aplica
  efeito; Recuperação: Recuperação da fila antiga é incompleta: BE-001
- Entrada: Estoque familiar; Backend e autoridade: `/stock/movements`,
  capacidade específica; Persistência e consequência: `family_stock_movement`,
  motivo, correção com referência; Recuperação: Sem editar saldo; transferências
  pertencem à ENT
- Entrada: Escalas/BAL; Backend e autoridade: schemas discriminados e RPCs
  `schedule_command`/`balance_command`; Persistência e consequência: Tipos,
  séries, atribuição, prazo e decisão familiar distintos; Recuperação:
  Versão/conflito; agenda não comprova presença física
- Entrada: Administração; Backend e autoridade: `/admin`, `/patient-settings`,
  capacidades locais ou modo global; Persistência e consequência: Global propõe;
  aprovação local separada; catálogo e identidade global distintos; Recuperação:
  Propostas via `/admin` não preservam chave no cliente: BE-005
- Entrada: Evidências; Backend e autoridade: upload limitado, sanitização,
  reserva e hash; Persistência e consequência: Storage privado,
  `finalize_attachment`, `bind_validated_attachment`; Recuperação: Mesmo objeto
  é comparado por SHA; resultado incerto não autoriza trocar arquivo
- Entrada: PDF; Backend e autoridade: acesso ao documento, versão de evento e
  renderizador 4; Persistência e consequência: `document_pdf_renders`, objeto
  privado, hash do arquivo separado do conteúdo; Recuperação: Reutiliza PDF
  existente; original histórico tem caminho explícito

O catálogo está corretamente dividido: `products` conserva identidades;
`care_recipient_products` apresenta nome, unidade, aliases e atividade locais.
O catálogo estático de 29 itens em `src/lib/catalog.ts` ainda serve aos testes
e à referência histórica; não substitui a consulta autorizada do paciente.

## Contratos que devem ser preservados

- REQ não aceita quantidade solicitada. `currentStock` é observação, não saldo
  oficial. Rótulos de produto enviados pelo navegador são descartados antes
  da RPC de emissão.
- COM compra/recebimento e ENT aceite são fatos diferentes. Não há motivo
  para colapsar os dois documentos como simples melhoria de arquitetura.
- Quantidades operacionais usam `decimal.js` e strings normalizadas; a REQ
  mantém contrato numérico próprio. A diferença exige atenção ao evoluir APIs,
  mas não demonstra por si só erro de saldo.
- Versão, hash canônico e snapshot são responsabilidade do banco. PDF é uma
  representação desse conteúdo, com hash próprio e sem promessa de assinatura.
- Cancelamento e correção devem conservar história; abandonar uma abstração
  legada não autoriza apagar seus registros ou URLs persistidos.

## Diagnóstico e estrutura-alvo recomendada

A base possui fronteiras de segurança explícitas e contratos de recuperação
mais cuidadosos que um CRUD simples. Não se recomenda reescrever tudo em
Server Actions, introduzir outro backend ou substituir RPCs transacionais por
múltiplas operações TypeScript. Nenhuma dessas mudanças resolve os achados.

O problema demonstrado na leitura é a dispersão de contratos de apresentação
e de recuperação. BE-002 mostra que um único mapa genérico de parâmetros de
notificação mistura significado de campos de ENT e BAL. BE-005 mostra uma
rota administrativa gerando a identidade da tentativa no servidor enquanto
outras recebem a chave do cliente. BE-001 e BE-004 mostram filas limitadas
tratadas como se fossem consultas completas.

BE-007 identifica um contexto perdido na representação compartilhada: a tela
mostra estoque observado na emissão, enquanto a tabela do PDF REQ apresenta
somente material, unidade e prioridade. O dado continua no snapshot. A decisão
de produto é como preservá-lo ou explicar sua omissão, sempre distinguindo
observação histórica de quantidade solicitada e saldo oficial. Uma alteração
futura deve criar renderizador versionado e preservar os arquivos anteriores.
Após contraditório, BE-007 permanece oportunidade editorial P3, sem bloqueio
isolado. BE-006 também é P3: a contagem de chamadas é concreta, mas nenhum
orçamento de latência ou custo foi demonstrado como descumprido.

Estrutura futura proposta, sem executá-la:

- Preservar `src/app/api` como adaptadores HTTP finos.
- Organizar contratos e presenters por domínio em `src/lib`, com consumidores
  reais: emissão, administração, notificações e documentos. Não criar camadas
  vazias apenas para uniformizar pastas.
- Definir envelopes tipados de RPC/read models; `rpc` atualmente devolve dados
  sem validação de resultado e os consumidores fazem casts. Manter as funções
  SQL autoritativas e testar o formato real, não duplicar suas regras.
- Separar parâmetros de eventos de notificação por tipo/evento. Derivar datas,
  autores e contadores do evento correspondente, com teste de conteúdo final.
- Consolidar a consulta do dashboard em read model autorizado quando medição
  justificar: BE-006 identifica até 25 operações Supabase em uma carga ampla,
  não um tempo de resposta já medido como inadequado.

O POST de `/api/catalog` exige `access.manage`, enquanto `/api/admin` para
produto e apresentações usam `catalog.manage`. A busca de consumidores mostrou
GET ativo de catálogo e escrita pela administração; não foi demonstrado defeito
da jornada atual. Registrar a divergência de endpoint como compatibilidade a
resolver antes de tornar esse POST uma API pública estável. Não removê-lo sem
inventário de consumidores externos.

## Qualidade dos testes desta frente

Os testes unitários não são apenas snapshots de implementação. Exercitam
limites de origem/corpo, dados removidos da REQ, resultado persistido com falha
de comprovante, ambiguidades de catálogo, quantidades, envelope cifrado, HMAC,
reconciliação de worker e sanitização de evidências. São controles úteis.

Limites concretos:

- `tests/api/worker.test.ts` usa um job e transporte instantâneo; não verifica
  o orçamento do lote nem lease real. Probe BE-003 adiciona apenas evidência
  diagnóstica, sem alterar a suíte do produto.
- `tests/template-registry.test.ts` testa presença/mapeamento de templates e
  parâmetros necessários, não o significado dos valores produzidos para cada
  evento. Por isso BE-002 sobrevive à suíte existente.
- `tests/document-pdf.test.ts` verifica páginas, dimensões, título e hashes
  distintos. Não prova legibilidade, posição do texto, precisão de contadores
  nem conteúdo extraído. A inspeção visual pertence à evidência complementar.
- Mocks de autorização em `guards`/`requisition-persistence` testam o adaptador,
  não RLS. Apenas SQL e integração Auth real podem comprovar a camada de banco.
- Não há teste unitário de navegação para um relato mais antigo que o limite
  da lista. O dashboard pode continuar contando a pendência que a lista omite.

## Contraditório e limites

A hipótese de três motores de PDF foi refutada: `document-pdf.ts` reutiliza
`operational-pdf.ts`, e o caminho demonstrativo chama o mesmo renderizador.
O cache do PDF e seu renderizador versionado são compatibilidade, não duplicação
sem propósito. No caminho separado de **anexos**, o fallback de upload compara
o hash do objeto persistido; não foi identificada sobrescrita silenciosa
decorrente de troca de arquivo. A falha de recuperação visual após erro de rede
continua sendo um problema distinto, registrado pela frente de UX.

Foram executados três probes determinísticos com mocks e relógio virtual,
registrados em `evidence/backend-probes.log`. Não fizeram chamada à Meta,
mutação de banco, teste de lease real nem medição de latência de produção.
Os resultados da suíte geral são registrados pelo relatório de método.

A suíte de integração do auditor raiz passou em 33/33 cenários locais. Seu
teste realtime confirma emissão REQ e isolamento de tópico; não cobre todos
os gatilhos de invalidação. A revisão cruzada com o banco identificou que o
fallback de 30 segundos em `WorkspaceSync` só notifica a UI quando a revisão
muda. Se um gatilho não incrementa a revisão para o destinatário, esse polling
não corrige sozinho a informação stale. A autoedição na mesma aba dispara
`hca:profile-updated`, e respostas 401/403 de `/api/sync` provocam revalidação:
esses mitigadores impedem tratar a lacuna de atualização como bypass de acesso.
