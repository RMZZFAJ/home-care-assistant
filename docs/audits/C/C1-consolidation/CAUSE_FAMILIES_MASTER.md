# 121 causas — índice reconciliado C7

165 fontes originais,121 causas e prioridades históricas preservadas. Revisão
individual em C7; nenhum defeito foi corrigido por documentação. Fonte
estruturada: [CAUSE_FAMILIES_MASTER.csv](CAUSE_FAMILIES_MASTER.csv). Cópia
anterior exata no arquivo C10. D NÃO INICIADA; produção NO-GO.

## C-CAUSE-001

Lembretes legados por configuração selecionam sempre um lote sem cursor.

Fontes: DB-006. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D5.

Causa: Paginação limitada sem critério de progresso entre invocações.

Revisão C7: DB-006 seleciona patient_settings de lembretes BAL/turno; cursor
bal_regimes não cobre esse mecanismo. Não pertence ao estoque observado REQ.

Esperado: 101+ configurações elegíveis recebem seus lembretes em número finito
documentado de rodadas, sem duplicação.

Decisões: DEC-024;P13.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-002

Pontos de entrada da documentação apresentam baselines diferentes como atuais.

Fontes: REPO-001;B8-M001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: C6.

Causa: Estado transitório copiado para vários documentos sem índice atual
único.

Revisão C7: REPO-001/B8-M001 revalidam divergência editorial; C6 já tratou
entradas, sem corrigir produto.

Esperado: Links iniciais levam ao SHA correto; contagens atuais são
reproduzíveis; história está identificada como datada.

Decisões: DEC-026.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-003

Script de consulta Meta pode submeter templates apenas por encontrar token.

Fontes: REPO-003;B8-M003. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Comando imperativo misturado com diagnóstico e seleção implícita de
destino.

Revisão C7: REPO-003/B8-M003 são submissão implícita e seleção de destino em
ferramenta Meta, não regra de guias do produto.

Esperado: Modo consulta não contém POST; destino inválido falha antes da rede;
listagem completa; submissão declara exatamente o que será criado.

Decisões: DEC-019;DEC-024.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-004

Cópia de verificação Linux não exclui o diretório privado local.

Fontes: REPO-004;B8-M004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D0.

Causa: Exportação por lista incompleta de exclusões em vez de conjunto
necessário ao build.

Revisão C7: Exportação Linux é fronteira de arquivos; ignore Git não governa
tar. CI limpa não demonstra vazamento atual.

Esperado: Sentinela .private não chega à cópia; código e assets necessários
continuam compilando.

Decisões: DEC-023;DEC-025.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-005

Dashboard combina muitas viagens ao Supabase antes de montar a resposta.

Fontes: BE-006. Prioridade: P3; gate: CAN_DEFER. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D-LATER.

Causa: Composição crescente de consultas independentes sobre bootstrap de
autorização com múltiplas viagens.

Revisão C7: BE-006 mede viagens estáticas, não lentidão remota; otimização
depende de orçamento.

Esperado: Orçamento de resposta acordado e medido; redução demonstrada de
viagens/custo; mesmos resultados e negações em perfis revogados ou com
override.

Decisões: DEC-014;DEC-024.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-006

Ferramentas reutilizáveis gravam diretamente em auditorias históricas.

Fontes: REPO-002;B8-M002. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D0.

Causa: Scripts de uma execução histórica mantidos como ferramentas genéricas
sem contrato de saída.

Revisão C7: Destino histórico hardcoded é risco da ferramenta; não reexecutar
para revalidar prova.

Esperado: Execução padrão não altera relatórios antigos; nova saída
identificaSHA/data; overwrite exige escolha explícita.

Decisões: DEC-023;DEC-026.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-007

Três componentes legados não possuem consumidores demonstráveis.

Fontes: UX-010;B8-M005. Prioridade: P3; gate: CAN_DEFER. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D-LATER.

Causa: Adaptadores visuais anteriores permaneceram após unificação de
histórico/documento.

Revisão C7: Ausência de consumidor é candidata a limpeza; reexport
AppWorkspace e redirect continuam ativos.

Esperado: Nenhum consumidor de build/importação/demonstração depende do
arquivo; Compatibilidade de URLs permanece testada; Nenhuma migration/API
histórica é removida por associação

Decisões: DEC-001;DEC-026.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-008

Captura histórica rotulada revisão BAL ainda apresenta a primeira etapa.

Fontes: UX-011. Prioridade: P3; gate: CAN_DEFER. Domínio: BAL; lote: D6.

Causa: Captura histórica aparentemente produzida durante transição; causa não
reproduzida nesta auditoria.

Revisão C7: UX-011 é lacuna de evidência da revisão BAL, não defeito funcional
reproduzido.

Esperado: Imagem mostra Etapa2 de 2 e comparação contada/referência; Manifesto
identifica commit e ambiente

Decisões: DEC-026;P10.
[Spec](../../../audits/C/C3-functional-specification/BAL.md).

## C-CAUSE-009

Aprovação de alteração pontual de escala não mostra o objeto da decisão.

Fontes: B1-UX-001;UX-001. Prioridade: P1; gate: BLOCKS_FIRST_RELEASE. Domínio:
SCHEDULES_AND_STAFFING; lote: D1.

Causa: A lista mostra motivo; o diálogo repete orientação genérica e não
apresenta pessoa, período atual/proposto, fuso nem efeito na atribuição BAL.
Reconfirmado em 390 e 1440 sem aprovar.

Revisão C7: B1 e A mostram ausência do objeto decisório; não é mero texto do
botão.

Esperado: Para proposta de troca de pessoa e horário, aprovador explica
antes/depois sem sair do diálogo em 390/1440; payload usa versão exibida;
conflito409 mantém revisão; nenhuma aprovação em leitura.

Decisões: DEC-013;O06.
[Spec](../../../audits/C/C3-functional-specification/SCHEDULES_AND_STAFFING.md).

## C-CAUSE-010

Confirmações de estoque, ENT e configuração BAL omitem consequências por
domínio.

Fontes: B1-UX-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: ENT;
lote: D2.

Causa: Movimento manual não repete direção/unidade; divergência ENT não
identifica item e quantidade aceita no resumo; configuração BAL não repete
dia/tipo/pessoa/fuso. Barreiras existem, mas o conteúdo decisório é
incompleto.

Revisão C7: B1-UX-002 abrange três confirmadores; ENT sozinho não cobre
estoque e configuração BAL.

Esperado: Cada variante mostra objeto, direção, unidade, pessoa/custódia e
consequência; teste divergência parcial e movimento reverso; reconsulta
coincide com resumo.

Decisões: DEC-013.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-011

Decisão de proposta administrativa exige ler JSON e identificadores.

Fontes: B1-UX-003;UX-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Presenter usa kind e JSON, sem descrição humana de regra/pessoa ou
valores atuais. Prova renderizada usa resposta GET simulada, nenhuma proposta
remota ou aprovação.

Revisão C7: A e B1 descrevem presenter administrativo técnico; prova GET
simulada não é aprovação real.

Esperado: Cobrir todos os kinds permitidos e fallback seguro desconhecido;
nenhum UUID/JSON necessário para decisão; payload de aprovação preserva
id/versão.

Decisões: DEC-013;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-012

Aceite de convite carece de prévia do vínculo.

Fontes: B1-UX-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: UI não oferece prévia confiável com paciente, papel, emissor e validade
antes do aceite. Ramo público com token fictício não emitido foi aberto;
onboarding completo passou em E2E com convite local real.

Revisão C7: Convite precisa prévia mínima; não expor paciente com token
inválido.

Esperado: Convite válido, expirado, revogado, conta errada e já aceito têm
estado/CTA distintos; nenhum aceite pode alterar papel ou paciente por
parâmetro do cliente.

Decisões: DEC-021;P01.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-013

Códigos de filtros, ações e papéis escapam à linguagem humana.

Fontes: B1-TEXT-001;UX-006. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE.
Domínio: ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Os dois filtros especiais aparecem crus nos chips apesar de terem
opções humanas; aria-label de remoção usa chave. Catálogo separa literal,
expressão e consumidor.

Revisão C7: UX-006 inclui linguagem e destino; rótulos são primários aqui,
navegação fica também em 014.

Esperado: Todas as chaves emitidas têm tradução e fallback testado; chips e
anúncio acessível coincidem; remover filtro mantém outros parâmetros.

Decisões: DEC-013;DEC-015.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-014

Alguns nomes de destino não correspondem à tarefa aberta.

Fontes: B1-NAV-001. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: A central não é o formulário de preferências, e unidades não é o
catálogo do paciente. CTA de notificação generaliza alvos distintos.

Revisão C7: Destino e intenção não são sinônimos: central, preferências e
unidades têm rotas próprias.

Esperado: Nome acessível e título de destino exprimem mesma tarefa nos seis
perfis; nenhum link individual perde alvo/contexto.

Decisões: DEC-014;O01.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-015

Títulos COM e BAL generalizam incorretamente a operação.

Fontes: B1-TEXT-002. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: COM de doação real mantém título compra no PDF e fluxo; label HTML de
BAL é semanal, enquanto o PDF já usa título geral de estoque. BAL também serve
reconto e legado.

Revisão C7: Título enganoso ocorre no HTML e PDF; doação e BAL legado/reconto
são variantes obrigatórias.

Esperado: Compra, doação, BAL inicial/reconto/legado têm título e metadados
coerentes; protocolo/hash do histórico preservados.

Decisões: DEC-016;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-016

Página pública desconhecida cai em mensagem inglesa sem caminho de
recuperação.

Fontes: B1-TEXT-003. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Fallback Next padrão em inglês, sem main e sem CTA de retorno do
produto na prova pública390.

Revisão C7: Fallback público 404 é recuperação de navegação; não substituir
tratamento 401/403.

Esperado: 404 público em português com heading/main/CTA; 401/403 mantêm
tratamento próprio e retorno seguro.

Decisões: DEC-001;DEC-014.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-017

Anexo com resposta perdida deixa arquivo editável apesar de persistência
confirmada.

Fontes: B1-ERR-001;UX-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: ATTACHMENTS_AND_DRAFTS; lote: D3.

Causa: POST local retornou201 ao interceptor após commit e foi abortado ao
cliente; GET encontrou arquivo ready328bytes. UI permite mudar arquivo. A
primeira tentativa400 por MIME não persistiu e foi separada.

Revisão C7: B1 separou erro MIME sem persistência de resposta perdida depois
de ready; ambos precisam casos.

Esperado: Perda antes/depois do commit,400 e timeout distintos; GETready
reconcilia sem duplicar; input não muda durante desconhecido; arquivo
confirmado fica reconsultável.

Decisões: DEC-011;DEC-012.
[Spec](../../../audits/C/C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).

## C-CAUSE-018

Adaptador de erro mistura recuperação de leitura com resultado incerto de
escrita.

Fontes: B1-ERR-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Leitura abortada pede recuperar tentativa que não existe; JSON inválido
em escrita pode aconselhar repetição sem certeza. ApiError preserva
status/code mas não estrutura de recommendedAction nem certeza por comando.

Revisão C7: Read failure e escrita incerta exigem modelos distintos; status
sozinho não prova efeito.

Esperado: 401/403/404/409/422/429/500, invalidJSON, timeout eabort têm CTA
apropriado ao efeito; falha de leitura não recomenda recuperar mutação.

Decisões: DEC-013;DEC-014.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-019

Conflito na permissão crítica fecha o diálogo e afasta o erro da intenção.

Fontes: B1-ERR-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: POST409 controlado faz o diálogo fechar. O texto geral existe, mas não
conserva a alteração pretendida dentro da decisão nem reposiciona foco.

Revisão C7: 409 de permissão perde intenção/foco; não há evidência de mudança
aplicada indevida.

Esperado: 409 não aparenta sucesso; nova versão visível e nenhuma reaplicação
automática; Tab começa na reconciliação, não no topo da página.

Decisões: DEC-013;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-020

Consultas sem estado próprio afirmam vazio/configuração ausente antes do
resultado.

Fontes: B1-STATE-001;UX-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: GETs retidos exibem conclusões negativas; sino com 500 mantém afirmação
em dia; perfil500 mantém loading. Matriz distingue ramos com loading correto.

Revisão C7: Zeros iniciais e loading infinito são defeitos de estado em
consumidores diferentes.

Esperado: Delay,200vazio,200comdados,500 e retry em cada consumidor citado;
nenhum loading infinito com erro nem mensagem em dia antes de 200.

Decisões: DEC-014;O15.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-021

Filtro novo pode coexistir com linhas antigas sem indicação de atualização.

Fontes: B1-STATE-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ENT; lote: D3.

Causa: DeliveryInbox não reativa loading no filtro; a linha antiga permanece
sob o filtro novo. StockConsole tem transições de dependência sem a mesma
marcação do botão Atualizar.

Revisão C7: Filtro e dados divergentes atingem inbox e estoque, não apenas
administração.

Esperado: Alternar rapidamente filtros com respostas invertidas, erro e vazio;
resultado corresponde à chave atual e foco permanece no filtro.

Decisões: DEC-014;O15.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-022

Falha secundária no estoque descarta saldo válido e apresenta ausência.

Fontes: B1-STATE-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D2.

Causa: GET de saldos200 continha dois produtos; GET de movimentos500 levou a
zero nomes e mensagens de lista vazia com erro, perdendo resultado válido.

Revisão C7: Promise conjunta perde saldo válido quando movimentos falham; não
é saldo zero persistido.

Esperado: Cada endpoint falha isoladamente e ambos falham; saldos válidos ou
indisponibilidade explícita permanecem; nenhum vazio falso.

Decisões: DEC-014;O15.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-023

Prazo fixo de acompanhamento regride resultado concluído e mistura preparo de
PDF.

Fontes: B1-STATE-004;UX-012. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: PWA_PUSH_AND_NOTIFICATIONS; lote: D5.

Causa: Relógio virtual11s após notificações200data[] mudou mensagem concluída
para processamento. Consumidor fixa10s e não recebe shareWaitSeconds;
mesmaAbortController cobre PDF e avisos.

Revisão C7: Timeout compartilha PDF/avisos e ignora configuração; não
converter terminal em pendente.

Esperado: Completou antes do prazo, pendente além do prazo, PDF lento,
política0/5/10 e desmontagem: nenhum resultado terminal regride nem PDF é
cancelado por outro estado.

Decisões: DEC-014;DEC-020.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-024

Leitura sem rede mantém aparência atual sem indicação visível de
desatualização.

Fontes: B1-STATE-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Emulação offline: navigator.onLine=false e falha de sync, sem aviso
visível no painel já carregado. Não demonstrou comando autorizado
indevidamente.

Revisão C7: Leitura offline aparenta atualidade; não foi provado bypass de
comando.

Esperado: Offline, reconexão, sessão revogada e troca de paciente mostram
frescor correto; comandos revalidam e não são enfileirados silenciosamente.

Decisões: DEC-014;O15.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-025

Estoque não observado e zero convergem silenciosamente na REQ.

Fontes: B1-FORM-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: REQ;
lote: D1.

Causa: Escolha de material real produziu zero sem contagem digitada; extra7
apagado virou0. BAL começa vazio, contraprova de alternativa existente.

Revisão C7: Seleção/apagamento convertem vazio em zero; contrato precisa
tagged modes em todas as camadas.

Esperado: Selecionar, apagar0/7, voltar etapa, rascunho e submit não
transformam ausência em contagem; zero explícito é aceito; nenhuma mudança de
contrato só no browser.

Decisões: DEC-003.
[Spec](../../../audits/C/C3-functional-specification/REQ.md).

## C-CAUSE-026

Validações não acompanham limites e foco dos campos em todos os caminhos.

Fontes: B1-FORM-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Observação1001 chega à revisão e POST400 real em inglês; extra sem nome
gera erro geral,0aria-invalid e foco em Avançar. Campos de apresentação
tornam-se obrigatórios sem ajuda antecipada consistente.

Revisão C7: Validação de observação/extra/apresentação não acompanha limite e
foco; não limitar só um formulário.

Esperado: 1000/1001, extra sem nome, múltiplas etapas e apresentação
incompleta: erro compreensível, anunciado, no campo correto, sem emissão
inválida e sem apagar valor.

Decisões: DEC-013.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-027

Ajuda e teto de senha nova variam entre cadastro e perfil.

Fontes: B1-FORM-003. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: Comprimento em caracteres não equivale a bytes UTF-8; o perfil permite
digitar muito além do contrato. Nenhuma senha real foi alterada pela
exploração; E2E usa conta local descartável.

Revisão C7: Limite de bytes de senha difere de caracteres; não testar
alterando conta real.

Esperado: 12caracteres,72 bytes e UTF-8 acima do teto tratados coerentemente;
password manager funciona; nenhum segredo em DOM exportado/log.

Decisões: DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-028

Seleção COM/ENT não aproveita busca já disponível para catálogos maiores.

Fontes: B1-FORM-004. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
CATALOGUE_AND_PRESENTATIONS; lote: D2.

Causa: Injeções GET com 1/5/20/100: REQ encontra alias e reduz a1; COM
conserva todas as linhas. Não é prova de lentidão de produção ou erro de
estoque dos IDs simulados.

Revisão C7: Busca existente em REQ é contraprova; listas simuladas não
comprovam lentidão remota.

Esperado: 1/5/20/100itens, nome longo, alias, semresultado e mudar categoria
preservam escolhas; teclado/AT acessam seleção e total.

Decisões: DEC-001;O08.
[Spec](../../../audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).

## C-CAUSE-029

Apresentações têm cadastro sem visão equivalente de consulta/gestão no
consumidor.

Fontes: B1-FORM-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CATALOGUE_AND_PRESENTATIONS; lote: D2.

Causa: UI examinada não lista apresentações existentes por material nem
oferece consulta/revisão equivalente à tabela de unidades. API possui upsert;
não se conclui inexistência de dados no banco.

Revisão C7: Consulta de apresentações falta no consumidor, apesar de upsert já
existir.

Esperado: Cadastrar, consultar, editar/rejeitar código duplicado e ler
conversão em entrada manual/scan; histórico antigo mantém valor.

Decisões: O08;O09.
[Spec](../../../audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).

## C-CAUSE-030

Editor de vínculo permite trocar pessoa sem explicar destino do vínculo
anterior.

Fontes: B1-FORM-006. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D3.

Causa: Fonte de edição e comando não comunicam se trocar a seleção
cria/atualiza outro vínculo enquanto o anterior permanece. Não foi feita
alteração de permissão para provar hipótese.

Revisão C7: Trocar alvo no editor é ambiguidade, não revogação comprovada;
separar editar de vincular.

Esperado: Editar função da mesma pessoa não altera outra; trocar alvo requer
fluxo explícito; revogação exige revisão própria e revalidação no servidor.

Decisões: DEC-021;P01.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-031

Apagar nome curto não comunica intenção de remoção.

Fontes: B1-FORM-007. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D3.

Causa: Apagar campo omite propriedade do payload. Interface não distingue
manter de remover; resultado de backend para remoção não foi exercitado.

Revisão C7: Omissão e remoção de nome curto divergem no payload; escolher
intenção explícita.

Esperado: Inalterado, novo, vazio e espaços têm resultado definido e preview
consistente; backend e UI concordam; não altera outro paciente.

Decisões: DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-032

Promessa de rascunho no dispositivo excede persistência da aba.

Fontes: B1-UX-005;UX-007. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ATTACHMENTS_AND_DRAFTS; lote: D3.

Causa: REQ recupera na mesma aba, mas aba independente autenticada não
recupera. Usa sessionStorage com prazo24h; COM tem também documento/rascunho
servidor, que é outro objeto.

Revisão C7: Mensagem promete dispositivo, mas REQ é aba/24h; draft servidor
COM é objeto distinto.

Esperado: Mesma aba, nova aba, fechar sessão, expirar24h, trocar paciente e
mudar usuário têm comportamento/texto coerentes; nenhuma emissão duplicada.

Decisões: DEC-012;P08;P12.
[Spec](../../../audits/C/C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).

## C-CAUSE-033

Fundação visual precisa de consolidação orientada pelo resultado, com exceções
explícitas.

Fontes: B1-VIS-001;UX-008. Prioridade: P3; gate: CAN_DEFER. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: 37padrões catalogados; medidas mostram convergência real, botões44px,
inputs internos42px e seletor36desktop/44móvel. Não se comprovou defeito por
mera classe verde histórica.

Revisão C7: B1 mede convergência e exceções; tokens não são defeito só por cor
histórica. C8 agora aprova direção.

Esperado: Comparação visual antes/depois nos cincoviewports, focus, disabled e
alto contraste; nenhuma mudança sem consumidor demonstrável.

Decisões: DEC-001.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-034

Histórico tem versões e integridade, mas exige tradução manual de mudanças de
negócio.

Fontes: B1-UX-006;UX-009. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Detalhes documentais apresentam trilha real; tarefa quem mudou o quê
ainda depende de interpretar eventos/valores.

Revisão C7: Diff humano falta, mas versões reais existem; não alegar perda de
histórico.

Esperado: Versões múltiplas, ator indisponível, catálogo alterado e permissões
limitadas mostram diff humano consistente com snapshot; PDFversionado
permanece acessível.

Decisões: DEC-015;O14.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-035

Feedback genérico não distingue relato de consumo, confirmação e aquisição.

Fontes: B1-FEED-001. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
CONSUMPTION_AND_OCCURRENCES; lote: D2.

Causa: Mesmo texto após relato sem débito e confirmação com débito. Prova
read-back: relato manteve20; confirmação levou20→19família,10equipe
inalterado. COM possui recuperação boa, mas sucesso pouco específico.

Revisão C7: Feedback de relato/decisão/aquisição tem efeitos diferentes;
crédito de COM é secundário mantido.

Esperado: Relatar, aceitar, rejeitar e recuperar tentativa mostram efeito e
próximo responsável exatos; histórico e saldos coincidem.

Decisões: DEC-008;DEC-013;P14.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-036

PDF da REQ omite estoque observado presente na ficha.

Fontes: B1-DOC-001;BE-007;B6-013. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE.
Domínio: DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: PDF atual da REQ real de duas linhas inspecionado nas duas páginas;
omissão confirmada no renderizador. Quantidade solicitada continua
corretamente ausente.

Revisão C7: Fontes A/B1/B6 convergem na omissão; B6 acrescenta atendimento por
item, que não pode se perder.

Esperado: REQ nova/legada, zero, decimal, texto longo e versão antiga:
observação temporal correta e sem coluna de pedido; PDF mantém legibilidade.
Decisão editorial documentada; se incluído, campo histórico e unidade
corretos, flags por item coerentes e renderer antigo preservado.

Decisões: DEC-003;DEC-016.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-037

Fechar decisão e continuar edição podem devolver foco ao corpo.

Fontes: B1-A11Y-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Trap de 9Tabs é correto, dados permanecem, mas fechamento/continuação
perdem ponto de foco; próximoTab do diálogo vai ao skiplink. Descartar
restaura Novo item corretamente.

Revisão C7: Trap funciona; retorno do foco em fechar/continuar é problema
diferente.

Esperado: Escape, Voltar, Confirmar, Continuar eDescartar por teclado em
390/1440; foco nuncaBODY após tarefa; AT anuncia destino e dados preservados.

Decisões: DEC-001;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-038

Observação válida contínua rompe reflow da revisão em 320px.

Fontes: B1-A11Y-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Valor é válido dentro do limite1000; sai horizontalmente do card e
página, sem necessidade de submit. Axe0violações não detectou este defeito.

Revisão C7: Texto válido contínuo rompe reflow; axe sem violations não detecta
geometria.

Esperado: 320px, zoom nativo400%,300caracteres contínuos/URL e nome longo: sem
rolagem global indevida; botões legíveis e conteúdo copiável.

Decisões: DEC-001.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-039

Seletor Mês mantém visualização de dia no móvel.

Fontes: B1-NAV-002. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
SCHEDULES_AND_STAFFING; lote: D1.

Causa: CSS/consumer força visão diária abaixo1024 apesar do seletor manter
Mês. Não houve perda de plantão provada; expectativa de navegação é
incoerente.

Revisão C7: Mês selecionado e dia renderizado são incoerência de intervalo,
não perda comprovada de agenda.

Esperado: 390/768/1440, Semana/Mês, troca de data: rótulo, setas e intervalo
coincidem, sem ocultação silenciosa de resultados.

Decisões: DEC-001;O06.
[Spec](../../../audits/C/C3-functional-specification/SCHEDULES_AND_STAFFING.md).

## C-CAUSE-040

CI desktop segue falhando por escolha transitória de navegação no helper.

Fontes: B1-QA-001;QA-001;B8-Q004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: USER_GUIDES_AND_CONTINUITY; lote: D0.

Causa: Logs atuais do run40656069166:39pass e 1falha no jobdesktop, mesmo alvo
após retry. SeleçãoB1de6E2E passou, mas não cobriu nem corrigiu esta
instabilidade.

Revisão C7: A/B1/B8 sustentam decisão transitória do helper; não assumir
defeito permanente no shell.

Esperado: Reproduzir causa e passar fluxo afetado em desktop/móvel/WebKit sem
seleção transitória; CIcompleto necessário para gate, sem
declarar6testes=suíteinteira.

Decisões: DEC-001;DEC-024.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-041

Ciência automática continua ligada à exposição do cabeçalho.

Fontes: B1-UX-008;UX-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
REQ; lote: D2.

Causa: Fonte atual observa cabeçalho, antes da lista de materiais. B1executou
ciência expressa em novaREQ; não reproduziu evento automático habilitado. A já
demonstrou o gatilho.

Revisão C7: Cabeçalho visível não prova leitura; nova modalidade depende de
P02 e não de limiar de scroll.

Esperado: Modo automático/expresso/desabilitado, topo apenas, scroll e
revisita têm eventos/textos coerentes; nenhuma ciência de leitor sem
capacidade.

Decisões: DEC-002;P02.
[Spec](../../../audits/C/C3-functional-specification/REQ.md).

## C-CAUSE-042

Pedido de cancelamento ENT não tem recusa ou retirada formal.

Fontes: B2-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: ENT;
lote: D2.

Causa: Enumeração de comandos e formulário não modelam recusa/retirada nem
retorno justificado de estado

Revisão C7: Falta transição de recusa/retirada, enquanto proibição de
cancelamento unilateral é correta.

Esperado: Recebedor recusa ou solicitante retira conforme política aprovada;
pendência tem destino conhecido e evento próprio Contraprova: Sem estorno,
aceite inventado ou cancelamento total unilateral; consentimento concorrente e
dados obsoletos exigem revalidação

Decisões: DEC-005.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-043

ENT aguardando consentimento fica fora da fila padrão de trabalho.

Fontes: B2-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: ENT;
lote: D2.

Causa: Consultas e filtros selecionam recebimentos pendentes sem incluir outra
ação relevante do destinatário

Revisão C7: Documento existe em Todas, mas fila padrão omite ação do
recebedor.

Esperado: Destinatário vê pedido aberto na fila/painel; abrir leva ao
documento exato; resolvido sai da fila Contraprova: Não mostrar consentimento
a terceiro como tarefa executável; nenhum documento terminal ou sem capacidade
vaza

Decisões: DEC-014;O04.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-044

Conversão de embalagem não conserva como a quantidade base foi obtida.

Fontes: B2-006. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
CATALOGUE_AND_PRESENTATIONS; lote: D2.

Causa: Conversão em scan atualiza quantidade, sem transportar proveniência ao
payload emitido

Revisão C7: Scan perde proveniência no payload; alterar fator atual não pode
reescrever 2×10.

Esperado: Dois pacotes×10mantêm20base e fator original depois de cadastro12;
seleção manual sem código continua possível Contraprova: Sem converter unidade
não equivalente, arredondar silenciosamente ou aplicar fator atual a documento
passado

Decisões: O08.
[Spec](../../../audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).

## C-CAUSE-045

Produto inativo com saldo não tem percurso próprio de esgotamento.

Fontes: B2-007. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D2.

Causa: Flag de catálogo governa elegibilidade de novas operações, sem
estado/processo de destinação do saldo existente

Revisão C7: Inativação conserva saldo corretamente; falta percurso de
destinação, não zeragem.

Esperado: Saldo e história preservados; destinação tem autor/motivo; lista
informa inatividade; reativação é explícita Contraprova: Não zerar, somar a
outro produto ou inferir consumo/descarte; não liberar uso novo indevido

Decisões: DEC-007;O12.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-046

Histórico de estoque não conduz igualmente às origens de recibo, BAL e
consumo.

Fontes: B2-008. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D2.

Causa: Renderização de referência trata documento genérico sem resolver todos
os tipos de origem

Revisão C7: reference_type heterogêneo exige resolver receipt/BAL/consumo, não
usar todo ID como documentId.

Esperado: Cada referência abre origem exata autorizada ou explica restrição;
contexto e filtros são preservados Contraprova: Não tratar receiptIDcomo
documentID, nem revelarCOM a leitor de equipe; nenhuma permissão inferida do
link

Decisões: O09.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-047

Consumo só textual não pode ser complementado para confirmação.

Fontes: B2-010. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CONSUMPTION_AND_OCCURRENCES; lote: D2.

Causa: Contrato permite estrutura opcional no relato, mas confirmação exige
linhas e não oferece ação de esclarecimento

Revisão C7: Texto é relato legítimo; falta complemento estruturado sem apagar
original.

Esperado: Texto original continua consultável; quantidades têm autor/data;
confirmação única após esclarecimento autorizado Contraprova: Não interpretar
texto como débito automático, não apagar relato original nem permitir
confirmação sem saldo/estrutura

Decisões: DEC-008;O05.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-048

Revogação de recebedor de ENT parcial não possui sucessão formal.

Fontes: B2-015. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: ENT;
lote: D2.

Causa: Consentimento e reatribuição protegem pessoa original; falta processo
para transferência documentada de responsabilidade futura

Revisão C7: Proteção do recebedor original é correta; sucessão futura não pode
impersonar aceite parcial passado.

Esperado: Revogação imediata preserva outro paciente e história; ENTparcial
tem encaminhamento claro com identidades próprias Contraprova: Não atrasar
revogação urgente, reativar silenciosamente, impersonar anterior, zerar saldo
ou fabricar estorno

Decisões: DEC-006;DEC-022;P05;P15.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-049

Candidatos terminais podem impedir indefinidamente o progresso de REQ.

Fontes: B3-001;DB-002. Prioridade: P1; gate: BLOCKS_FIRST_RELEASE. Domínio:
REQ; lote: D1.

Causa: LIMIT aplicado antes de eliminar candidatos que o processamento pula,
sem avanço persistente nesse recorte.

Revisão C7: DB-002/B3-001 são lifecycle terminal antes do LIMIT; risco
independente de 001 e cursor BAL.

Esperado: Com25/100 bloqueadores e vários alvos, execuções limitadas alcançam
todos; cada lembrete elegível aparece uma vez; falha não perde posição.

Decisões: DEC-024;DEC-030;P13.
[Spec](../../../audits/C/C3-functional-specification/REQ.md).

## C-CAUSE-050

Cancelamento ENT com consumo real confirmado falha no SQL de reconciliação.

Fontes: B3-002;DB-001;B2-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: ENT; lote: D2.

Causa: Variável/alias e no ramo de soma de eventos impede resolver referência
SQL.

Revisão C7: 42702 impede ramo consumo positivo; hipótese temporal ainda
precisa teste após correção, sem presumir aritmética resolvida.

Esperado: Entrega aceita com parte consumida permite consentimento coerente;
retorno físico apenas uma vez; consumo anterior permanece único.

Decisões: DEC-005;DEC-007.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-051

Aprovação posterior pode republicar plantões além do encerramento da série.

Fontes: B3-003;DB-003;B2-013. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: SCHEDULES_AND_STAFFING; lote: D1.

Causa: Decisão aplica proposta guardada sem revalidar o corte vigente da série
na materialização.

Revisão C7: A/B2/B3 revalidam corte; B3 adiciona BAL derivado de ocorrência
indevida.

Esperado: Encerrar após proposta e depois aprovar não publica ocorrência fora
do corte nem cria BAL derivado dela.

Decisões: DEC-009;O06.
[Spec](../../../audits/C/C3-functional-specification/SCHEDULES_AND_STAFFING.md).

## C-CAUSE-052

Reservas abandonadas ocupam permanentemente a capacidade de anexos.

Fontes: B3-004;DB-004;B2-016. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: ATTACHMENTS_AND_DRAFTS; lote: D3.

Causa: Contagem inclui reservas sem expiração/abandono e sem percurso de
recuperação de capacidade.

Revisão C7: Dez quarantine sem bytes esgotam vaga; serialização do limite já
funciona.

Esperado: Após abandono comprovado, nova intenção obtém vaga sem tocar ready;
retry válido recupera mesmo arquivo/hash/versão.

Decisões: DEC-011;O13;P08.
[Spec](../../../audits/C/C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).

## C-CAUSE-053

Correção compensatória aceita movimento sem referência ao fato corrigido.

Fontes: B3-005;B2-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D2.

Causa: Validação de referência é condicional à presença, sem obrigatoriedade
para ação compensatória.

Revisão C7: UI exige referência, RPC/HTTP a omitem; falta deve falhar em
ambas, sem bloquear inbound legítimo.

Esperado: Correção sem origem é recusada sem efeito; com origem compatível
cria compensação imutável e repetível.

Decisões: DEC-007;O09.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-054

BAL legado permite ao supervisor revisar a própria contagem.

Fontes: B3-006;B2-009. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
BAL; lote: D2.

Causa: Guard de identidade distinta está no caminho agendado e não cobre a
rota legada equivalente.

Revisão C7: Legado permite autoaprovação; optional não autoriza auto-revisão
quando revisão é iniciada.

Esperado: Contador efetivo não revisa própria versão; revisor autorizado
distinto funciona; reconto zera elegibilidade de aprovações anteriores.

Decisões: DEC-010;DEC-029;P11.
[Spec](../../../audits/C/C3-functional-specification/BAL.md).

## C-CAUSE-055

Decisão oposta de consumo retorna sucesso sem ter sido aplicada.

Fontes: B3-007;B2-011. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CONSUMPTION_AND_OCCURRENCES; lote: D2.

Causa: Retorno antecipado quando status não é reported não compara intenção
nem retorna decisão tipada.

Revisão C7: Resposta terminal null mascara decisão oposta; proteção de débito
único é contraprova mantida.

Esperado: Mesma decisão recupera estado; decisão oposta recebe
conflito/resultado inequívoco; no máximo um débito sob concorrência.

Decisões: DEC-008;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-056

Adiamento BAL com alvo alterado permanece pendente e nem rejeição conclui.

Fontes: B3-008;B2-012. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
BAL; lote: D2.

Causa: Checagem de versão/estado do alvo antecede o ramo de rejeição e não
oferece estado obsoleto terminal.

Revisão C7: Rejeição não deveria exigir alvo antigo ainda aprovável; prazo
original não pode mudar sozinho.

Esperado: Alvo alterado não aprova silenciosamente; recusa/invalidação conclui
uma vez e mantém prazo original.

Decisões: DEC-009.
[Spec](../../../audits/C/C3-functional-specification/BAL.md).

## C-CAUSE-057

Substituição em reconto invalida atribuição sem criar sucessor
automaticamente.

Fontes: B3-009;B2-014. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
BAL; lote: D2.

Causa: Seleção automática não percorre esse estado do ciclo/reconto da mesma
forma que ciclo aberto.

Revisão C7: Ciclo counted tem lacuna de sucessão; assign_recount já recupera,
não perda definitiva.

Esperado: Após substituição, há um único caminho elegível para reconto;
preservam-se autor, contador, prazos, atraso e revisão de versão.

Decisões: DEC-010;DEC-029.
[Spec](../../../audits/C/C3-functional-specification/BAL.md).

## C-CAUSE-058

COM parcialmente realizada não permite desistir apenas do remanescente.

Fontes: B3-010;B2-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
COM; lote: D2.

Causa: Contrato só oferece cancelamento integral incompatível com fatos
físicos já existentes.

Revisão C7: Cancelamento total protege fatos; novo encerramento precisa
atingir somente expectativa.

Esperado: Recebidos2 permanecem; 8 podem receber encerramento explícito sem
novo movimento; previsão pendente zera apenas parte desistida.

Decisões: DEC-004;P14.
[Spec](../../../audits/C/C3-functional-specification/COM.md).

## C-CAUSE-059

Relatos antigos não são alcançáveis pela rota normal após 100 registros
recentes.

Fontes: B3-011;BE-001;B2-017;B1-UX-007. Prioridade: P2; gate:
BLOCKS_FIRST_RELEASE. Domínio: CONSUMPTION_AND_OCCURRENCES; lote: D2.

Causa: LIMIT100 sem paginação/filtro de ID na rota, apesar de persistência e
RLS permitirem leitura direta.

Revisão C7: A/B1/B2/B3 convergem no corte consumo; auditoria citada em B1 tem
causa 060 separada.

Esperado: Comcentenas de relatos, referência antiga abre e todas páginas são
alcançáveis; contador explica conjunto completo.

Decisões: DEC-014;O04.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-060

Auditoria administrativa trunca eventos antigos sem percurso de consulta.

Fontes: B3-012;BE-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Query administrativa fixa LIMIT100 sem contrato de paginação ou
referência.

Revisão C7: Auditoria antiga existe no banco; truncamento é contrato distinto
da fila consumo 059.

Esperado: Evento antigo alcançável por referência/página; ordem determinística
e escopo idêntico sob limites.

Decisões: DEC-014;DEC-015.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-061

Edição de perfil não avisa consumidores pela revisão de workspace.

Fontes: B3-013;DB-007. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: Trigger extrai care_recipient_id/user_id; profiles usa id e não gera
destinatário nesse ramo.

Revisão C7: profiles.id e proponente global sem membership faltam no fan-out;
B3 não mediu efeito visual.

Esperado: Editar perfil próprio incrementa revisão e atualiza consumidor;
outro usuário sem relação não recebe dados. Destinatários globais sem
membership recebem somente a invalidação autorizada que lhes corresponde, sem
payload privado.

Decisões: DEC-014;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-062

Restauração operacional conjunta ainda não foi comprovada.

Fontes: B3-014;OPS-001. Prioridade: P2; gate: REQUIRES_HOMOLOGATION. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D6.

Causa: Sem ensaio em destino isolado autorizado com bytes/configuração e
validação operacional conjunta.

Revisão C7: Backup legível não é falha de restore nem prova de recuperação;
ensaio segue não executado.

Esperado: Restore isolado recupera login, permissões, hashes, ledger, bytes e
filas conciliadas; responsável mede RPO/RTO e documenta recuperação.

Decisões: DEC-025;P03;P04.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-063

Snapshots acumulam quadraticamente resumos do histórico.

Fontes: B3-015;DB-005. Prioridade: P3; gate: CAN_DEFER. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D-LATER.

Causa: Cada evento inclui resumo de todos os anteriores, sem copiar
recursivamente corpos completos.

Revisão C7: DB-005/B3-015 medem resumos cumulativos quadráticos, não cópia
recursiva integral. Primário é snapshot documental.

Esperado: Publicar orçamento em volume representativo e manter hash/PDF de
versões antigas após eventual evolução.

Decisões: DEC-015;DEC-023;DEC-024.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-064

Orçamento máximo do worker externo permanece sem validação operacional.

Fontes: B3-016;BE-003. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Pior caso de caminhos encadeados pode exceder orçamento de execução;
sem medição B3 de provedor.

Revisão C7: Risco do worker externo tem simulação A de 140s; B3 não repetiu
medição real.

Esperado: Lote sob atrasos/falhas termina dentro do orçamento ou reprograma
estado inequívoco; no máximo envio conciliado por intenção.

Decisões: DEC-019;DEC-024;P13.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-065

Valor nulo na decisão de consumo é persistido como rejeição.

Fontes: B3-017. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CONSUMPTION_AND_OCCURRENCES; lote: D2.

Causa: CASE WHEN p_accept THEN confirmed ELSE rejected sem rejeição explícita
de NULL.

Revisão C7: CASE NULL vira rejeição na RPC direta; boolean API mitiga só
caminho normal.

Esperado: Reported+null falha sem mudar status/ledger/eventos; true/false
explícitos funcionam com mesma capacidade.

Decisões: DEC-008.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-066

RPC familiar arredonda excesso de casas antes de validar precisão do produto.

Fontes: B3-018. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D1.

Causa: Coerção numeric18,6 ocorre antes da validação do trigger; valor
original já foi perdido.

Revisão C7: Validação SQL ocorre depois de numeric(18,6); API não protege RPC
direta.

Esperado: 1.0000004 em produto inteiro é recusado sem movimento; quantidade
permitida persiste exatamente e retry mantém ID.

Decisões: DEC-007.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-067

Fator NaN de apresentação é aceito no catálogo por RPC direta.

Fontes: B3-019. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CATALOGUE_AND_PRESENTATIONS; lote: D2.

Causa: Comparações de positividade/arredondamento não excluem NaN de numeric
no PostgreSQL.

Revisão C7: NaN numeric passa positividade/arredondamento; exige finitude
direta no catálogo.

Esperado: NaN/Infinity/zero/negativo recusados sem alteração de catálogo;
fatores fracionários válidos preservados.

Decisões: O08.
[Spec](../../../audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).

## C-CAUSE-068

Movimento já em espera pode concluir depois da revogação ou troca de contexto.

Fontes: B3-020. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: private.require_cap é executado antes do lock e não repetido após
esperar; BAL agendado possui revalidação.

Revisão C7: require_cap anterior ao lock deixa janela; P15 agora escolhe
revalidação antes do commit.

Esperado: Revogação/contexto confirmado enquanto o comando espera impede nova
escrita após o lock; recusa não deixa movimento/evento parcial.

Decisões: DEC-022;P15.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-069

JWT de sessão encerrada ainda escreve identidade e avatar próprios.

Fontes: B3-021. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: Esses contratos verificam auth.uid/ownprefix/status, sem consultar
auth_session como os entrypoints de negócio.

Revisão C7: Sessão encerrada ainda escreve próprio perfil/avatar direto; não é
acesso a paciente alheio.

Esperado: JWT de sessão encerrada não escreve perfil/avatar nem ponteiro;
login novo legítimo funciona; negado não muda registro/bytes.

Decisões: DEC-021;DEC-022;P15.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-070

URL de arquivo já emitida continua válida durante TTL após revogar vínculo.

Fontes: B3-022. Prioridade: P3; gate: OWNER_DECISION. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D4.

Causa: URL assinada é credencial temporária independente da consulta de
membership em cada download.

Revisão C7: URL já emitida dura TTL; prazo expirado não foi testado. Garantia
do transporte continua gate.

Esperado: Decisão publicada; seTTLaceito, linkexpira no prazo e novaAPInega;
seproxy, revogação revalidada por download.

Decisões: DEC-022;P15.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-071

NULL explícito remove o limite de página da RPC documental.

Fontes: B3-023. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: IF NOT BETWEEN com NULL não entra no erro; LIMIT NULL significa sem
limite.

Revisão C7: NULL em BETWEEN escapa validação e LIMIT NULL remove teto; não
demonstrou DoS.

Esperado: NULL explícito tem comportamento definido; nenhuma chamada
autorizada passa do limite máximo; omissão mantém default normal.

Decisões: DEC-014.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-072

Custo de autorização e alerta por movimento exige orçamento medido.

Fontes: B3-024. Prioridade: P3; gate: CAN_DEFER. Domínio: STOCK_AND_CUSTODY;
lote: D-LATER.

Causa: Cálculo de saldo/permits por linha reutilizado em trigger e fan-out;
medição isola sinal, não causa única de latência remota.

Revisão C7: Amostra owner sem claims não mede throughput Auth; não atribuir
toda latência a RLS.

Esperado: Medir distribuição de latências/locks e custo por volume; desenho
escolhido conserva RLS, ledger exato e rollback.

Decisões: DEC-024.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-073

Um registro legado malformado pode abortar repetidamente o lote operacional.

Fontes: B3-025. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D1.

Causa: Cast inválido não é isolado por candidato; transação inteira aborta
preservando atomicidade.

Revisão C7: Cast de política legada aborta lote comum; é
isolamento/recuperação scheduler, não estoque REQ.

Esperado: Dado inválido provoca alerta identificável; recuperação autorizada
preserva origem e retoma alvos válidos sem duplicar efeitos.

Decisões: DEC-024;P13.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-074

Precisão aceita depende do tipo JSON e permite arredondamento silencioso.

Fontes: B4-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D1.

Causa: Braço number de exactQuantity não limita casas; ledger numeric(18,6)
arredonda antes da precisão da unidade.

Revisão C7: Braço JSON number aceita sete casas enquanto string recusa; mesma
regra precisa ambas fronteiras.

Esperado: Number e string equivalentes com sete casas são recusados sem
movimento; seis casas e unidade válida persistem exatamente.

Decisões: DEC-007.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-075

Consumidor de settings cria nova intenção no retry e duplica propostas.

Fontes: B4-002;BE-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: PolicyConsole gera randomUUID em cada invocação, não congela tentativa
incerta.

Revisão C7: A observa alias API gerando UUID; B4 observa consumidor settings.
Ambos precisam transportar intenção estável.

Esperado: Após perda de resposta, reenvio recupera mesmo requestId; conteúdo
alterado conflita; conflito exige nova revisão humana.

Decisões: DEC-013;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-076

Retry da aprovação de ingresso não recupera o link do convite.

Fontes: B4-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: Token aleatório novo por requisição; RPC terminal retorna resolução
anterior; URL depende de igualdade com o hash recém-gerado.

Revisão C7: Convite não duplica, mas retry perde URL porque novo token não
corresponde ao hash antigo.

Esperado: Retry de aprovação confirmada informa resultado acionável ou
recuperação explícita; convite único e token antigo tratado segundo política.

Decisões: DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-077

Revisar e submeter omite revisão já confirmada quando a submissão falha.

Fontes: B4-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio: ENT;
lote: D3.

Causa: Duas RPCs confirmam separadamente; exceção da segunda usa envelope de
erro genérico que perde o resultado da primeira.

Revisão C7: B4-004 reproduziu ENT, não COM. Revisão e submit são commits
separados em todos os supply; lote é recuperação D3.

Esperado: ENT informa revisão confirmada/versão/intenção quando submit falha;
retoma sem duplicar. COM e BAL recebem casos equivalentes sem alegar prova
anterior desses ramos.

Decisões: DEC-012;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/ENT.md).

## C-CAUSE-078

Proposta administrativa pending desaparece após o corte de 50 mudanças.

Fontes: B4-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: LIMIT50 sem contrato de continuação, total ou detalhe, buscado pelo
consumidor como conjunto completo.

Revisão C7: Corte 50 de access changes é diferente de auditoria 100; manter ID
próprio.

Esperado: Com51+mudanças, a antiga pending é encontrável por percurso normal e
por referência, sem vazar outro paciente.

Decisões: DEC-014;O04.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-079

Erro interno SQL é classificado como conflito de produto e orienta recuperação
errada.

Fontes: B4-006. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D3.

Causa: Regex ambiguous/alias é aplicada sem discriminar SQLSTATE de
implementação de erro de domínio.

Revisão C7: Regex ambiguous/alias confunde SQLSTATE 42702 com ambiguidade de
catálogo; não é erro do produto.

Esperado: 42702 não vira AMBIGUOUS_PRODUCT; erros de alias de catálogo
legítimos continuam409; correlação sem dados privados.

Decisões: DEC-013.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).

## C-CAUSE-080

Upload de avatar não tem retomada após falha na associação.

Fontes: B4-007. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D4.

Causa: Identidade só no servidor e pipeline upload→RPC sem reserva/consulta de
tentativa ou compensação.

Revisão C7: Upload avatar gera novo caminho depois de falha de ponteiro; P3
sem Storage real ensaiado.

Esperado: Falha após upload tem identidade recuperável ou reconciliação
verificável; retry não acumula objeto sem política.

Decisões: DEC-011;P08.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-081

Rotas equivalentes de catálogo exigem capacidades HTTP diferentes.

Fontes: B4-008. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
CATALOGUE_AND_PRESENTATIONS; lote: D2.

Causa: Alias manage da rota catalog exige access.manage; rota ativa admin
exige catalog.manage.

Revisão C7: Delegado catalog.manage funciona em admin mas alias pede
access.manage; não ampliar papel para contornar.

Esperado: Delegado legítimo tem resultado coerente; sem capacidade é negado em
ambos; compatibilidade explícita.

Decisões: DEC-021;O08.
[Spec](../../../audits/C/C3-functional-specification/CATALOGUE_AND_PRESENTATIONS.md).

## C-CAUSE-082

UUID inválido no modo global vira HTTP500 recuperável.

Fontes: B4-009. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D1.

Causa: uuid.parse lança ZodError não traduzido; api só reconhece ApiError.

Revisão C7: UUID malformado global lança ZodError não traduzido; local já
retorna 400.

Esperado: Global/local recebem4xx seguro para UUID malformado e não retryable;
objeto oculto continua não enumerável.

Decisões: DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-083

Cancelamento durante preparo externo não impede a chamada posterior de envio.

Fontes: B4-010. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Validação única precede preparo/upload; não há nova autoridade
verificada entre mídia e mensagem.

Revisão C7: Cancelamento durante upload ainda permite messages; complete
preserva cancelled mas não impede transporte.

Esperado: Ensaio controlado de revogação antes/depois do upload e callback
tardio respeita garantia documentada; estado final reconcilia transporte.

Decisões: DEC-019;DEC-022;P15.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-084

Item interativo não reconhecido faz webhook confirmar lote sem processar texto
válido.

Fontes: B4-011. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: safeParse do array inteiro falha por interactive sem button_reply; null
vira arrayvazio silenciosamente.

Revisão C7: safeParse do lote perde texto válido junto de interactive não
reconhecido; HMAC continua necessário.

Esperado: Lote misto processa texto válido exatamente uma vez ou responde
rejeição recuperável explícita; item não suportado não executa ação.

Decisões: DEC-019.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-085

Criação de paciente aceita isActive=false e persiste cadastro ativo.

Fontes: B4-013. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D3.

Causa: Campo validado não é encaminhado na criação com administrador; RPC usa
true fixo.

Revisão C7: Criação ignora isActive=false apesar de atualizar existente
funcionar; wizard precisa respeitar estado.

Esperado: Criar inativo preserva false e bloqueia novas operações, ou
validação rejeita opção antes de criar qualquer paciente.

Decisões: DEC-021;P04.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-086

Lembretes legados não recuperam períodos perdidos ao atravessar o dia.

Fontes: B5-001. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D5.

Causa: Elegibilidade calculada somente no instante corrente, sem agenda
persistida/cursor de datas nesse legado.

Revisão C7: Lembretes legados são internos também; não adiar toda falha para
D7 Meta. Catch-up exige política OPS-01.

Esperado: Com serviço ausente no dia D e retorno D+1, política escolhida
identifica o período perdido ou o recupera uma vez; nenhuma contagem/ciência é
fabricada.

Decisões: DEC-024;P13.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-087

Hold por template ausente fica pendente sem retomada pela API.

Fontes: B5-002. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Holds e retry têm conjuntos incompatíveis: liberação só cobre aprovação
de nome/versão já vinculados ou PDF; retry só failed/uncertain.

Revisão C7: Hold pending/infinity sem template vinculado não libera; contrato
conhecido já funciona.

Esperado: Hold por contrato ausente, depois de regularizado, tem ação
suportada e auditada que torna elegível apenas o trabalho autorizado; template
conhecido e PDF continuam liberando corretamente.

Decisões: DEC-019.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-088

Timeout no upload de mídia vira entrega incerta antes de iniciar a mensagem.

Fontes: B5-003. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Catch geral ignora a etapa em que falhou e aplica semântica de messages
ao upload.

Revisão C7: Exceção media e messages têm certezas diferentes; não chamar
upload de entrega incerta.

Esperado: Exceção anterior a messages não afirma mensagem aceita/entregue nem
exige conciliação de entrega; exceção durante/depois de messages mantém
uncertain e não reenvia automaticamente.

Decisões: DEC-019;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-089

Representação genérica também confunde conclusão REQ, COM parcial e
cancelamento ENT.

Fontes: B5-004;BE-002. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Seleção/valores genéricos por evento/status não distinguem fato
operacional, origem do ato e data pertinente.

Revisão C7: BE-002 e B5-004 compartilham presenter genérico, mas
datas/contadores/autores por tipo ficam casos distintos.

Esperado: REQ usa data do atendimento concluído; COM já validada não pede
validação; ENT final se distingue de consentimento pendente; contadores/atores
corretos por evento. Lembrete distingue ciência de materiais; aviso ao
confirmador não atribui autoria de relato alheio.

Decisões: DEC-019;DEC-013;DEC-015.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-090

Minimização anunciada não é garantida pelo conteúdo externo preparado.

Fontes: B5-005. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Texto de governança diverge do contrato de templates e fallback; short
name é opcional, sem gate de conteúdo mínimo.

Revisão C7: Conteúdo externo real contradiz minimização anunciada; opt-in não
decide sozinho conjunto de campos.

Esperado: Responsável aprova matriz de campos/destinos; mensagem real
sintética contém só o conjunto aprovado e explica limites de cópia/retencão;
documentação corresponde ao contrato.

Decisões: DEC-019;DEC-023;P08.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-091

Entrada sem contexto ou resposta recusada não recebe continuação recuperável.

Fontes: B5-006. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Resultado de contexto/RPC é ignorado para a resposta; processed usa
tamanho de arrays, sem handoff durável mínimo.

Revisão C7: NeedsAuthenticatedSelection é ignorado; processed conta arrays sem
efeito durável.

Esperado: Texto ambíguo e comando recusado ficam explicitamente
ignorados/pendentes com recuperação aprovada; processed não afirma efeito
inexistente; contexto único continua deduplicado.

Decisões: DEC-019;DEC-008.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-092

Resposta externa sem ocorrências é apresentada como vista no aplicativo.

Fontes: B5-007. Prioridade: P3; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: seen_at acumula resolução externa e visualização interna, enquanto UI
atribui origem única.

Revisão C7: seen_at mistura resposta externa e visto no app; não apagar
resolução legítima do lembrete.

Esperado: Resposta externa resolve uma vez e exibe origem verdadeira; visto
interno continua independente de delivered/read e ciência.

Decisões: DEC-019;DEC-002.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-093

Flow sem ocorrências recusa replay idêntico após sucesso.

Fontes: B5-008. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Ramo no_issues rejeita used_at antes de recuperar resultado,
diferentemente do ramo de texto.

Revisão C7: Flow no_issues não recupera replay; texto já o faz. Não prova
presença em plantão.

Esperado: Replay idêntico dentro da política recupera o mesmo resultado e uma
submissão; conteúdo divergente recusa; prazo/revogação seguem política
explícita.

Decisões: DEC-019;DEC-012.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-094

Erros de sessão e avisos do cliente Flow não usam a recuperação do protocolo
cifrado.

Fontes: B5-009. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Wrapper API genérico trata falhas da fronteira Flow; union de data não
inclui notificação de erro.

Revisão C7: Boundary Flow usa JSON aberto em erro cifrado; resultado local não
homologa cliente Meta.

Esperado: Token inválido e client error seguem contrato oficial escolhido e
são verificáveis no cliente Meta; nenhuma operação é aplicada em recusa;
código/erro não expõem dados.

Decisões: DEC-019.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-095

FlowReviews não consulta após invalidação confirmada; fila admin tem padrão
semelhante.

Fontes: B5-010;B4-012. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
CONSUMPTION_AND_OCCURRENCES; lote: D3.

Causa: FlowReviews depende somente de patientId/attempt; admin load depende de
seção/ID/página, sem revisão. Contexto igual não força o efeito.

Revisão C7: Produtor revision funciona; consumo/FlowReviews/fila admin não
dependem dela. Primário é consumidor de lista, não instalação PWA.

Esperado: Nova submissão aparece sem reload após sinal/reconexão; fila admin
atualiza conforme política; troca de paciente continua limpando seleção e
dados anteriores. Exigir o mesmo caso de duas sessões para consumo,
FlowReviews e fila administrativa; preservar edição e descartar resposta
antiga.

Decisões: DEC-014;O15.
[Spec](../../../audits/C/C3-functional-specification/CONSUMPTION_AND_OCCURRENCES.md).

## C-CAUSE-096

Sessão Flow de ocorrência aceita corpo de confirmação de outro propósito.

Fontes: B5-011. Prioridade: P3; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Union HTTP mistura propósitos e v3_flow_exchange valida só
objeto/tamanho para sessão occurrence.

Revisão C7: Union mistura propósitos; sessão occurrence armazena body de ENT
sem criar movimento, efeito limitado.

Esperado: Sessão occurrence recusa operation confirm/mode/line de ENT sem
consumir token nem criar submissão; payload occurrence correto segue
revisável.

Decisões: DEC-019;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-097

Confirmação Auth de telefone pode concluir sem vínculo interno retomável por
HTTP.

Fontes: B5-012. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D7.

Causa: Duas etapas confirmam fora de uma transação única; HTTP só oferece
verifyPhone completo e não distingue etapa confirmada.

Revisão C7: Auth confirma telefone antes de falha no vínculo; ensaio foi
simulado, não incidente OTP real.

Esperado: Falha após confirmação informa etapa real e retoma vínculo pelo
phone atual Auth; retry não depende de OTP já usado; número não confirmado
nunca é registrado.

Decisões: DEC-019;DEC-021.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-098

Callback de tentativa antiga encerra lease nova e impede correlação da nova
mensagem.

Fontes: B5-013. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Uma referência na mesma linha atravessa retries; webhook correlaciona
por referência ou ID somente quando referência é nula, sem geração da
tentativa.

Revisão C7: Referência única atravessa retries; callback de tentativa antiga
encerra lease nova.

Esperado: Retry gera contexto de tentativa distinto; callback antigo não
encerra lease atual; novo callback/complete é reconciliado; história de ambas
permanece e nenhum reenvio cego ocorre.

Decisões: DEC-019;DEC-012.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-099

Percurso administrativo omite referência e tentativa necessárias à conciliação
prescrita.

Fontes: B5-014. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Read model e apresentação não atendem ao procedimento de conciliação
exigido pela ação de retry.

Revisão C7: Operador recebe pedido de conciliação sem referência/tentativa;
nulo pode ser desconhecido real.

Esperado: Operador autorizado distingue evento/job/tentativa e referência
quando existente; ausência não significa não aceito; decisão de conciliação
fica auditável e scoped ao paciente.

Decisões: DEC-019;DEC-024;P13.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-100

Reconstrução de legado substitui data desconhecida e pode priorizar paciente
atual.

Fontes: B6-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: register_legacy_requisition usa coalesce(r.created_at, now());
record_document_event monta actors.patient do cadastro sem priorizar payload
histórico; renderer prioriza actors.

Revisão C7: Legado conserva fonte mas reconstrução usa now/cadastro atual;
desconhecido precisa continuar desconhecido.

Esperado: Data NULL imprime desconhecida; nome de origem disponível prevalece
com proveniência; data de importação aparece com rótulo próprio.

Decisões: DEC-015;DEC-016.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-101

PDF rotula criação de draft como data de emissão da ENT.

Fontes: B6-002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Campo Emissão lê snapshot.createdAt, que representa criação do
documento; não seleciona evento de emissão.

Revisão C7: created_at é criação de draft, não emissão; novo exemplar também
tem instante distinto.

Esperado: Draft criado D1/emitido D2 mostra ambos instantes corretamente;
download tardio não inventa nova emissão.

Decisões: DEC-016;P09;O10.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-102

História supply resolve autores antigos pelo diretório atual.

Fontes: B6-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Projeção perde nome histórico e consumidor recompõe pelo diretório
vigente.

Revisão C7: Supply histórico reconsulta diretório atual; PDF já usa snapshot
como contraprova.

Esperado: Rename/revogação não muda nome histórico apresentado; ID permanece;
nome atual é identificado como atual.

Decisões: DEC-015;DEC-022.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-103

PDF ENT omite ressalvas e a natureza das conciliações.

Fontes: B6-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Tabela projeta quantidades e issueOpen; ignora metadata.receipt e
comando do evento; história imprime só ação/ator/data.

Revisão C7: Renderer omite avaria/nota/resolution; quantidades corretas não
bastam.

Esperado: PDF mostra avaria/nota e resolução missing/returned distintamente;
parcelas históricas e autores permanecem claros.

Decisões: DEC-016.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-104

BAL aprovado não liga revisores e grupos à versão de contagem no PDF.

Fontes: B6-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Renderer não consome coleção approvals nem política/referência da
contagem.

Revisão C7: PDF mistura versão documental e de contagem; autoaprovação SQL é
causa 054 distinta.

Esperado: Reconto mantém aprovações antigas identificadas como antigas; PDF
atual mostra somente elegíveis como vigentes e política correspondente.

Decisões: DEC-016;DEC-029;P11.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-105

PDF cancelado mantém indicadores e instruções de processo em andamento.

Fontes: B6-006. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Condicionais compactas só distinguem confirmed/received/approved e
truthiness da ciência; demais estados caem em pendente/andamento.

Revisão C7: Fallbacks de renderer tratam terminal/desconhecido como pendente;
estado persistido correto é contraprova.

Esperado: Nenhuma versão cancelada manda receber; nenhum legado desconhecido é
chamado pendência operacional atual; parciais conservam números.

Decisões: DEC-016;DEC-013.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-106

Linha de tabela maior que a página corta conteúdo mesmo com nome válido de 160
caracteres.

Fontes: B6-007. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: table troca página uma vez para altura excessiva e desenha linha
inteira; sem dividir célula maior que área útil.

Revisão C7: Nome válido com LF gera célula maior que folha; wrap comum não
corrige paginação interna.

Esperado: Marcador final fica visível e extraível; todas linhas dentro da área
útil; rodapé livre; falha explícita se conteúdo não representável.

Decisões: DEC-016.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-107

Sanitização de PDF passivo remove ressalvas visíveis em anotações.

Fontes: B6-008. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ATTACHMENTS_AND_DRAFTS; lote: D4.

Causa: PDF passivo é copiado e todas Annots são deletadas, sem achatar
aparência permitida ou informar perda; original/hash não integra custódia
normal.

Revisão C7: Sanitização remove Annots visíveis; preservar segurança sem perder
FreeText/Ink silenciosamente.

Esperado: FreeText/Ink e campos visíveis relevantes sobrevivem em derivado
passivo ou são recusados com aviso; hash/proveniência qualificados.

Decisões: DEC-017;DEC-023;P08.
[Spec](../../../audits/C/C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).

## C-CAUSE-108

Versões preservadas não têm recuperação histórica acionável no percurso
documental.

Fontes: B6-009. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Apresentação de histórico resume evento técnico sem ação de recuperação
e contexto de mudança.

Revisão C7: API de versão exata existe; falta ação humana por evento, não
retenção.

Esperado: Evento oferece PDF exato e identidade visível; mudanças
significativas têm antes/depois/motivo quando disponível.

Decisões: DEC-015;O14;O10.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-109

COM não leva identidade das parcelas de recebimento ao snapshot de declaração.

Fontes: B6-010. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: r_id é gerado no receive mas record_document_event recebe só p_body;
coleção purchase_receipts não integra montagem do body; PDF só projeta
quantidades agregadas.

Revisão C7: Recibos permanecem no banco, mas event body não carrega receiptId;
manter distinção entre persistência e representação.

Esperado: Cada nova parcela tem evento com ID e proveniência; histórico
explica rejeição/validação e PDF distingue informado/validado sem alterar
saldo.

Decisões: DEC-016;P14.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-110

Cache PDF confia no objeto registrado sem comparar novamente o hash de bytes.

Fontes: B6-011. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Ramo existente baixa e retorna sem recalcular digest nem conferir
assinatura PDF; registro de serviço é confiança.

Revisão C7: Cache baixa sem digest; não é incidente público demonstrado.
Assinatura agora também é obrigatória.

Esperado: Digest divergente gera erro recuperável explícito sem transmitir
como arquivo válido; original não é substituído.

Decisões: DEC-018;P09.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-111

PDFs examinados continuam sem idioma e árvore de estrutura acessível.

Fontes: B6-012;B1-A11Y-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE.
Domínio: DOCUMENTS_PDFS_AND_INTEGRITY; lote: D4.

Causa: Renderer desenha textos/tabelas diretamente sem tags semânticas nem
setLanguage.

Revisão C7: Texto extraível não é árvore semântica; AT real permanece gate
separado.

Esperado: Idioma e leitura por headings/tabelas são comprovados por estrutura
e AT; alternativa mantém campos/versão autorizados.

Decisões: DEC-016;P10.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-112

Release nao possui vinculo obrigatorio entre SHA e conjunto de gates
aprovados.

Fontes: B7-001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D6.

Causa: Caminhos de CI e publicacao separados sem gate obrigatorio demonstrado;
agregado DB/browser nao inclui validate. Regra de nao implantar audit nao esta
no vercel.json.

Revisão C7: B7 demonstrou gates não vinculados à promoção; preview documental
foi autorizado depois e não é requisito de zero preview vigente.

Esperado: Promoção exige validate Linux/Windows e DB/browser concluídos para
mesmo candidato/schema/config. Preview documental autorizado é separado de
promoção produtiva.

Decisões: DEC-024;DEC-025.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-113

API anuncia WhatsApp quando configuracao do provider e recusada.

Fontes: B7-002. Prioridade: P2; gate: GATED_BY_FEATURE. Domínio:
PWA_PUSH_AND_NOTIFICATIONS; lote: D7.

Causa: Handler verifica somente flag/token/ID truthy; provider valida tambem
formato, Graph, idioma e template.

Revisão C7: API só olha flag/token/ID truthy; provider valida conjunto maior;
anúncio não é entrega.

Esperado: Todo canal anunciado passa o mesmo contrato de configuracao do
worker; ausencia/invalidez informa indisponibilidade segura; homologacao
continua separada.

Decisões: DEC-019.
[Spec](../../../audits/C/C3-functional-specification/PWA_PUSH_AND_NOTIFICATIONS.md).

## C-CAUSE-114

Release nao atesta compatibilidade conjunta de schema e configuracao.

Fontes: B7-003. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D6.

Causa: Procedimento documental exige revisao manual, mas nao ha atestado de
compatibilidade/config vinculado ao artefato servido.

Revisão C7: Compatibilidade não é defeito de schema atual; hashes normalizados
B7 eram iguais.

Esperado: Destino/candidato mostram contratos minimos e config essencial;
versao antiga/nova testadas com schema evoluido; parada antes de mutacoes se
incompativel.

Decisões: DEC-025;P04.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-115

Restore sem quarentena pode reativar cron e endpoint operacional antigo.

Fontes: B7-004. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D6.

Causa: Backup de dados pode incluir estado de agendamento/segredo que produz
efeito externo ao recuperar, sem coordenacao transacional com provedor.

Revisão C7: TOC cron/Vault sustenta risco condicionado, não envio indevido
observado.

Esperado: Ensaio comprova zero chamada externa antes do aceite;
destino/segredos corretos, efeitos posteriores ao corte conciliados e retomada
sem duplicacao.

Decisões: DEC-025;P03;P13.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-116

Upload anunciado excede limite de body da Vercel Function.

Fontes: B7-005. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
ATTACHMENTS_AND_DRAFTS; lote: D4.

Causa: Limite de negocio/aplicacao nao considera teto de entrada da Function e
overhead multipart.

Revisão C7: Upload é contrato de transporte do arquivo; sanitizar depois não
evita limite de entrada. D4, não só gate D6.

Esperado: Cliente/API/transporte coerentes em limite e borda; erro util antes
de envio inviavel; validacao/sanitizacao/autorizacao e idempotencia
preservadas.

Decisões: DEC-011;P15.
[Spec](../../../audits/C/C3-functional-specification/ATTACHMENTS_AND_DRAFTS.md).

## C-CAUSE-117

Shell publico amostrado nao possui politica de headers de hardening.

Fontes: B7-006. Prioridade: P3; gate: CAN_DEFER. Domínio:
IDENTITY_ACCESS_MEMBERSHIPS; lote: D-LATER.

Causa: Nao ha politica versionada equivalente nos arquivos examinados; amostra
de producao nao mostra politica no edge.

Revisão C7: Ausência de headers em amostra pública não prova XSS/frame
autenticado; política precisa teste de compatibilidade.

Esperado: Politica aceita e verificada em rotas alvo, com jornadas essenciais
funcionando; ou risco residual explicitamente aceito.

Decisões: DEC-021;DEC-023.
[Spec](../../../audits/C/C3-functional-specification/IDENTITY_ACCESS_MEMBERSHIPS.md).

## C-CAUSE-118

Advisory de dependencia Markdown dev requer triagem e acompanhamento.

Fontes: B7-007. Prioridade: P3; gate: CAN_DEFER. Domínio:
USER_GUIDES_AND_CONTINUITY; lote: D-LATER.

Causa: Versao transitiva no lock pertence a intervalo do advisory; workflow
nao possui politica explicita de triagem desse resultado.

Revisão C7: Três nós dev são um advisory, com alcance condicionado; não
classificar como três falhas de produção.

Esperado: Advisory triado, decisao/dono/revisao registrados; se atualizar,
lock e verificacoes afetadas passam sem afrouxar regras.

Decisões: DEC-024.
[Spec](../../../audits/C/C3-functional-specification/USER_GUIDES_AND_CONTINUITY.md).

## C-CAUSE-119

Oráculos PDF atuais admitem perda integral do texto desenhado.

Fontes: B8-Q001. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
DOCUMENTS_PDFS_AND_INTEGRITY; lote: D0.

Causa: Assertions conferem páginas, título, largura, determinismo e distinção
de hashes, sem exigir fatos/atores/estado/conteúdo visível. A estrutura e o QR
podem sobreviver sem a informação impressa.

Revisão C7: B8 provou teste passar sem texto; contrato do oráculo deve nascer
D0 e validar renderer D4.

Esperado: Após decisão de conteúdo, teste deve reprovar PDF sem texto/fato
crítico; conferir identidade/versão, produto/quantidade/estado/atores
esperados e layout legível, com contraprovas por tipo/estado. Preservar fonte
e hash canônico.

Decisões: DEC-016.
[Spec](../../../audits/C/C3-functional-specification/DOCUMENTS_PDFS_AND_INTEGRITY.md).

## C-CAUSE-120

Predicados SQL de saldo positivo deixam NULL passar sem reprovação.

Fontes: B8-Q002. Prioridade: P2; gate: BLOCKS_FIRST_RELEASE. Domínio:
STOCK_AND_CUSTODY; lote: D0.

Causa: Comparação <> em lógica SQL ternária não exige existência/valor do
resultado escalar. Padrão semelhante aparece em 41/44/50/56 de
supply-workflows.sql.

Revisão C7: Predicado isolado aceita NULL; não prova que suíte inteira aceita
toda remoção de ledger.

Esperado: Oráculo de saldo positivo reprova ausência/NULL e valor incorreto,
aceita somente o valor esperado e respeita a representação legítima de saldo
zero. Conferir quantidade de linhas quando a regra exigir existência.

Decisões: DEC-007.
[Spec](../../../audits/C/C3-functional-specification/STOCK_AND_CUSTODY.md).

## C-CAUSE-121

Helper axe descarta resultados inconclusivos necessários à revisão humana.

Fontes: B8-Q003. Prioridade: P3; gate: BLOCKS_FIRST_RELEASE. Domínio:
ADMINISTRATIVE_OPERATIONS; lote: D0.

Causa: Resultado é reduzido à lista violations; não há trilha de needs-review
por estado/superfície nem vínculo automático ao plano humano.

Revisão C7: incomplete não é violação automática, mas descartá-lo elimina
revisão; axe não prova tarefa humana.

Esperado: Preservar violations como falha; registrar incomplete/estado/regra
para triagem sem reprovar indiscriminadamente. Manter aceite humano de foco,
erros, reflow e PDF/AT separado.

Decisões: DEC-001;P10.
[Spec](../../../audits/C/C3-functional-specification/ADMINISTRATIVE_OPERATIONS.md).
