# Decisões de produto e precedências

Fonte vigente: ordem definitiva de 04/11/2026, America/Sao_Paulo.
[Ordem preservada](../audits/C/C10-pr-handoff/final-closure/OWNER_COMPLEMENT_ORDER.md).
Aprovação de produto não é implementação ou homologação. D NÃO INICIADA.

## Política final e limites

P02 está **OWNER_APPROVED**.
[SCI-001–SCI-005 e ANY familiar](../audits/C/C7-decision-closure/SCIENCE_OWNER_REVIEW.md).
SCI-005 é obrigatória/permanente/não configurável, sem nova escolha humana.
P09-B é mínimo, P11 revisão facultativa, P12 um draft por criação/tipo e O01+
wizard global. O
[adendo P01–P15](../audits/C/C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md)
e a [matriz de gates](../audits/C/C7-decision-closure/GATE_CLASSIFICATION.csv)
registram as decisões e ramos. Objetivo aprovado com parâmetros pendentes
mantém OWNER_APPROVED_SCOPE_PENDING. OPS-01/PERF-01 têm escolhas humanas
reais. Nenhum dos dez gates impede D0 geral/D1 independente, mas seus ramos
seguem condicionados. Branch D só após integrar PR6 à master e autorizar
missão D.

Contratações/preços/fornecedores P03/P09/P13 são pesquisa externa do
responsável com ChatGPT. Sem pesquisa comercial nesta missão.

## Decisões expressas conservadas

Leitura humana do registro C2 com as precedências atuais aplicadas. Texto
anterior integral preservado nos
[inputs C10](../audits/C/C10-pr-handoff/final-closure/inputs/). Auditorias A/B
não foram reemitidas.

### DEC-001 — Escopo de primeira utilização

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

**Decisão:** disponibilizar o sistema como plataforma operacional abrangente.
Prioridades inegociáveis de funcionamento perfeito: requisições (REQ),
entregas (ENT), balanços (BAL), estoque, aquisições (COM) no processo que
sustenta esses fluxos, cadastro e identificação dos profissionais, acesso e
permissões do profissional/família/administração da família, PDFs completos,
interface consistente e linguagem humana. Formulários com orientações,
exemplos, listas úteis, estados elegantes de loading, vazio, erro, falha,
retorno incerto e sucesso. Histórico e recuperação.

### DEC-002 — Registro de acesso e modalidades de ciência

Estado: **OWNER_APPROVED**.

Política SCI-001–005 aprovada, ANY familiar por pessoa habilitada, três
modalidades elegíveis, SCI-005 invariável sem opt-out; REQ materialmente
imutável; ver SCIENCE_OWNER_REVIEW.md

### DEC-003 — Estoque não observado na REQ

Estado: **OWNER_APPROVED**.

**Decisão:** campo de estoque observado começa **sem valor**, nunca preenchido
automaticamente com zero. Usuário pode digitar zero explicitamente ou
selecionar checkbox `Não sei informar`. Não informado, não observado e zero
observado não devem colapsar no backend/PDF/histórico. Não inventar contagem a
partir do saldo calculado.

### DEC-004 — Conclusão de aquisição com quantidade menor (COM)

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

**Decisão:** quantidade prevista/pedida da COM não obriga receber/adquirir
integralmente. Mostrar quantidade esperada versus adquirida/recebida/validada,
apresentar diferença e solicitar confirmação do responsável para **concluir
com quantidade inferior**. Não apagar quantidades anteriores, histórico nem
alterar saldo sem recebimento validado. Enquanto o restante ainda for
esperado, estado parcial pode existir; a confirmação final encerra a obrigação
futura. Não introduzir quantidade solicitada obrigatória na REQ.

### DEC-005 — Desacordo de cancelamento ENT

Estado: **OWNER_APPROVED**.

Solicitante pode **retirar formalmente** o pedido de cancelamento; outra parte
pode **discordar/recusar**, segundo responsabilidade; tudo fica registrado.
Resolver com regras de concorrência, versão, justificativa, quantidades
físicas, recebimentos prévios e consumo efetivo. Sem estorno unilateral ou
falso aceite.

### DEC-006 — Desligamento, revogação e sucessão

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

Revogar acesso **nunca pode ser bloqueado** pela existência de pendências.
Antes de revogar, mostrar inventário e oferecer solicitar ao profissional que
regularize pendências passadas ainda possíveis. Revogação retira futuras
autorizações; redesignar tarefas FUTURAS (BAL, novas conferências quando
cabível) a pessoas autorizadas. Preservar autoria e vínculo histórico do
desligado. Pendência PASSADA irrecuperável pode ter **encerramento
administrativo excepcional e motivado**, sem simular recebimento físico,
assinatura ou participação de quem saiu. Se acesso for revogado imediatamente,
a pessoa não poderá concluir normalmente pelo app depois: oferecer
prévia/solicitação pré-revogação e mecanismos de conciliação pós-revogação.

### DEC-007 — Produto inativo, saldo e transferência bilateral

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

**Inativação:** estoque familiar pode manter saldo positivo inativo,
recuperável na mesma custódia quando reativado. Estoque da equipe: permitir
escolher transferir saldo para família por processo legítimo OU inativar com
saldo positivo na equipe; reativação retorna a disponibilidade sob a custódia
conservada. Sem apagar saldo ou efetuar baixa fictícia.

### DEC-008 — Complementação de relato textual de consumo

Estado: **OWNER_APPROVED**.

Permitir complementar posteriormente relato sem produto/quantidade suficiente,
vinculado ao original, versionado e auditável, antes de aplicar débito de
estoque. WhatsApp pode ser postergado; este processo é necessário no
aplicativo.

### DEC-009 — Pedidos obsoletos de BAL e escala

Estado: **OWNER_APPROVED**.

Impedir aprovação de proposta que não corresponde mais a escala, pessoa,
período ou versão atual. Encerrar como obsoleta com motivo ou exigir nova
proposta, preservando histórico e responsabilidade. Não deixar pendência
impossível de decidir.

### DEC-010 — Reconto por outra pessoa

Estado: **OWNER_APPROVED**.

Uma profissional substituta (ex.: Sheila) pode assumir NOVO reconto por
designação formal, sem herdar autoria de primeira contagem realizada por outra
(ex.: Juliana). Identificar quem contou o quê em qual versão, responsável pela
redesignação e momento.

### DEC-011 — Falha e recuperação de anexos

Estado: **OWNER_APPROVED**.

Consulta/retomada da mesma tentativa quando resultado incerto, abandono
formal/expiração segura de reservas não concluídas, preservação de uploads
ativos, objetos prontos e história. Não limpar reservas indiscriminadamente.

### DEC-012 — Rascunhos entre aparelhos e dias

Estado: **OWNER_APPROVED**.

Draft privado durável por usuário/paciente/tipo de criação e por alvo/intenção
contextual; save sem ato oficial e sem TTL 90/180 dias aprovado.

### DEC-013 — Resumo de decisões importantes

Estado: **OWNER_APPROVED**.

Antes de confirmar ações relevantes, exibir pessoa, objeto, situação atual,
alteração proposta, efeitos e próxima etapa. A apresentação precisa ser
específica do processo; não criar diálogo extra desnecessário para toda ação
trivial.

### DEC-014 — Listas e pendências

Estado: **OWNER_APPROVED**.

Melhorar listas atuais individualmente; criar busca, filtros e paginação mais
abrangentes, com acesso direto a pendências antigas, responsabilidade e
estados. Não criar central unificada por padrão; avaliar só se adicionalmente
útil.

### DEC-015 — Histórico compreensível

Estado: **OWNER_APPROVED**.

Preservar eventos e versões com autoria e integridade; apresentar alterações
em linguagem humana, como antes/depois, motivo, data correta, estado e
responsáveis; nunca inventar fato antigo ou usar nome atual sem preservar
proveniência.

### DEC-016 — Conteúdo dos PDFs

Estado: **TECHNICAL_IMPLEMENTATION_DELEGATED**.

O responsável autoriza a proposta técnica de PDFs completos e corretos por
REQ/COM/ENT/BAL, ciente de futuro redesenho visual. Mínimos: identidade e
versão, estados e datas corretas, material, quantidade, origem/recebimento,
estoque observado quando existente, atores, ressalvas, conciliações, histórico
relevante, impressão legível, quebra de página segura, acessibilidade e
verificação de integridade. Conteúdo deve decorrer de snapshot/registro com
fonte, sem reconstruir por dados cadastrais atualizados. Registrar layout como
`PROPOSED_TECHNICAL_DEFAULT`, não presumir que redesign futuro foi aprovado.

### DEC-017 — Anexos original/derivado

Estado: **OWNER_APPROVED**.

Proteger contra conteúdo ativo, mas não eliminar silenciosamente ressalvas e
anotações visualmente relevantes; considerar achados B6-008. Decidir por
classe quando preservar original seguro em custódia restrita, quando preservar
derivado fiel e quando recusar arquivo com perda relevante. Com retenção, hash
e cadeia de transformação. Não remover sanitização sem substituição segura.

### DEC-018 — Autenticidade de PDFs emitidos

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

Verificar exemplar e bytes; assinatura incorporada do sistema P09-B é mínimo
obrigatório; perfil/cadeia/certificado/custos mantêm gate D4.

### DEC-019 — Dados enviados ao WhatsApp

Estado: **OWNER_DEFERRED**.

Aguardar aprovação/tratativas da Meta. Preservar B5, pendências e minimização
de dados. Não colocar WhatsApp como gate do primeiro lançamento se estiver
explicitamente desabilitado. Não cancelar funcionalidades internas
relacionadas apenas por terem surgido na auditoria WhatsApp.

### DEC-020 — Categorias de notificações

Estado: **OWNER_APPROVED**.

Categorias: informativas, auxiliares do cumprimento de obrigações e
essenciais. Política por processo, pessoa, prazo, minimização, deduplicação e
canal (in-app + push inicialmente; WhatsApp posterior). Push não pode ser
fonte única de verdade nem comprovante de ciência.

### DEC-021 — Tratamento de problemas técnicos

Estado: **OWNER_APPROVED**.

Profissionais não resolvem erros técnicos de plataforma. A equipe resolve
apenas tarefas operacionais autorizadas e recebe mensagens humanas de
recuperação. Família/administração da residência resolve pendências
administrativas e conciliações legítimas do paciente. Administração
global/suporte técnico diagnostica infraestrutura, integração, falhas internas
e logs, sem transferir chaves e detalhes SQL para equipe. Definir fluxo de
escalonamento e controle de acesso.

### DEC-022 — Revogação em andamento

Estado: **OWNER_APPROVED_SCOPE_PENDING**.

Impedir novas ações após revogação; preservar identidade, autoria e histórico;
tarefas futuras reatribuídas por autorização. Operações já iniciadas e URLs
temporárias precisam de regra definida de revalidação e limites realistas;
arquivo já baixado não pode ser apagado retroativamente. Nenhuma interpretação
pode autorizar terceiro a assinar recebimento físico por quem saiu.

### DEC-023 — Retenção de dados

Estado: **OWNER_APPROVED;PENDING_OWNER**.

Preservar no mínimo pelo prazo legal pertinente e adotar postura conservadora
para não perder documentos e evidências. Definir base, categoria, finalidade,
prazos, controles de acesso, anonimização/exclusão quando cabível, backups e
incidentes. Não equiparar política conservadora a guardar tudo indefinidamente
sem fundamento; LGPD e outras obrigações legais permanecem sujeitas a análise
específica.

### DEC-024 — Monitoramento

Estado: **OWNER_APPROVED**.

Aproveitar capacidade técnica de logging/telemetria existente, não os
REGISTROS fictícios das auditorias. No ambiente real, começar com dados de
produção legítimos/operacionais, sem mistura de fixtures. Monitorar além de
HTTP 200: progresso de jobs, filas, atraso, pendência, falha de arquivo, push,
restore, erro e correlação. Definir responsáveis e SLOs proporcionais.

### DEC-025 — Backup, continuidade e restauração

Estado: **TECHNICAL_IMPLEMENTATION_DELEGATED;PENDING_OWNER**.

Projetar recuperação de PostgreSQL, Auth, Storage, documentos, hashes,
segredos/configurações e jobs, com quarentena de cron/notificações após
restore e reconciliação antes de retomar. Testar em ambiente isolado e
autorizado, sem substituir dados atuais. Perguntar ao responsável apenas pelos
valores/compromissos necessários no marco de decisão de implantação.

### DEC-026 — Guias completos

Estado: **OWNER_APPROVED**.

Produzir documentação de uso ampla e humana, passo a passo, para equipe e
supervisão, com capturas atualizadas após D, exemplos fictícios, permissões,
rotinas REQ/COM/ENT/BAL, estoque, escalas, pendências, recuperação e
contingência. A C define estrutura e conteúdo-base; material final de
screenshots e procedimentos testados depois da implementação/homologação. Não
declarar UI futura como UI presente.

### DEC-027 — Oportunidades de funcionalidades

Estado: **OWNER_APPROVED;EXISTING_TO_PRESERVE;DEFERRED**.

O responsável aprovou expressamente O08, O09, O14, O15, O16 e O20; O10 deve
ser preservado sem duplicação. As respostas adicionais aprovaram O05 e O11;
O17 e O18 ficam para o futuro. Outras oportunidades foram cobertas por
decisões 1–26. C deverá verificar integração e priorização por causa, não
transformar sugestões em novos módulos desnecessários.

### DEC-028 — Destinatário da ENT e confirmação pessoal indelegável

Estado: **OWNER_APPROVED**.

A família **indica a pessoa que está recebendo** na criação da entrega. O
sistema sugere e preenche inicialmente o profissional escalado naquele
dia/horário, mas o campo é **editável pela família antes de emitir**. **Apenas
a pessoa que efetivamente recebeu poderá confirmar que recebeu. A confirmação
não pode ser delegada.** Não basta ser técnico escalado ou ter permissão
genérica. Uma troca legítima de destinatário antes de emissão deve ficar
registrada; após emissão/ato físico, uma mudança exige procedimento correto de
substituição/correção com preservação do documento e dos eventos, nunca
usurpação do aceite. Se não houver profissional adequado na escala, não
presumir identidade.

### DEC-029 — Reconto por substituta

Estado: **OWNER_APPROVED**.

Exemplo expresso: **Sheila pode fazer novo reconto** anteriormente solicitado
quando a pessoa original não estiver disponível, com designação registrada e
autoria das contagens anteriores preservada. A confirmação de recebimento ENT
continua indelegável; são atos distintos.

### DEC-030 — O05, O11, O17 e O18

Estado: **OWNER_APPROVED;DEFERRED**.

- O05: complementar consumo textual no app, sem aguardar WhatsApp. - O11: após
  atendimento parcial de REQ, permitir informar necessidade remanescente/novo
  documento vinculado e justificado, **sem introduzir quantidade solicitada na
  REQ nem duplicar crédito físico**. - O17: lote/validade fica para evolução
  futura com OCR/código de barras. - O18: visão consolidada de tarefas entre
  residências fica para evolução futura.

### O01 — Preparação guiada da primeira residência

Estado: **OWNER_APPROVED**.

Guia opcional configurável no primeiro acesso e reabrível pelo titular; wizard
de criação/preparação de residência somente pelo global no primeiro escopo.

### O02 — Encerrar COM com quantidade inferior

Estado: **OWNER_APPROVED**.

Encerrar COM com quantidade inferior; `OWNER_APPROVED` conforme DEC-004.

### O03 — Retirada/discordância de cancelamento ENT

Estado: **OWNER_APPROVED**.

Retirada/discordância de cancelamento ENT; `OWNER_APPROVED` conforme DEC-005.

### O04 — Pendências localizáveis e próximos responsáveis

Estado: **OWNER_APPROVED**.

Pendências localizáveis e próximos responsáveis; `OWNER_APPROVED` conforme
DEC-014.

### O05 — Complementar relato textual de consumo

Estado: **OWNER_APPROVED**.

Complementar relato textual de consumo; `OWNER_APPROVED` conforme DEC-008/030.

### O06 — Prévia do efeito de troca sobre BAL

Estado: **OWNER_APPROVED**.

Prévia do efeito de troca sobre BAL; `OWNER_APPROVED` como decisão informada
de escala.

### O07 — Inventário e sucessão após desligamento

Estado: **OWNER_APPROVED**.

Inventário e sucessão após desligamento; `OWNER_APPROVED` conforme DEC-006.

### O08 — Apresentação/embalagem, equivalência e proveniência

Estado: **OWNER_APPROVED**.

Apresentação/embalagem, equivalência e proveniência; `OWNER_APPROVED`
expressamente.

### O09 — Link para origem autorizada de movimentos de estoque

Estado: **OWNER_APPROVED**.

Link para origem autorizada de movimentos de estoque; `OWNER_APPROVED`
expressamente.

### O10 — Reaproveitamento entre documentos

Estado: **OWNER_APPROVED**.

Mesmo download preserva bytes/ID; nova emissão tem ID, solicitante, instante e
assinatura técnica próprios, sem invalidar ciência do mesmo conteúdo material.

### O11 — Necessidade remanescente após atendimento parcial

Estado: **OWNER_APPROVED**.

Necessidade remanescente após atendimento parcial; `OWNER_APPROVED` conforme
DEC-030.

### O12 — Inativação mantendo/destinando saldo

Estado: **OWNER_APPROVED**.

Inativação mantendo/destinando saldo; `OWNER_APPROVED` conforme DEC-007.

### O13 — Retomada/abandono de anexos

Estado: **OWNER_APPROVED**.

Retomada/abandono de anexos; `OWNER_APPROVED` conforme DEC-011.

### O14 — História de versões traduzida para linguagem humana

Estado: **OWNER_APPROVED**.

História de versões traduzida para linguagem humana; `OWNER_APPROVED`
expressamente.

### O15 — Frescor/estado da consulta e recuperação

Estado: **OWNER_APPROVED**.

Frescor/estado da consulta e recuperação; `OWNER_APPROVED` expressamente.

### O16 — Seleções recorrentes de materiais por residência

Estado: **OWNER_APPROVED**.

Seleções recorrentes de materiais por residência; `OWNER_APPROVED`
expressamente; jamais copiar estoque observado antigo como contagem atual.

### O17 — Lote/validade, OCR/código de barras

Estado: **OWNER_DEFERRED**.

Lote/validade, OCR/código de barras; `OWNER_DEFERRED` até evolução específica.

### O18 — Trabalho multipaciente consolidado

Estado: **OWNER_DEFERRED**.

Trabalho multipaciente consolidado; `OWNER_DEFERRED` até evolução específica.

### O19 — Contingência manual e reconciliação

Estado: **OWNER_APPROVED**.

Contingência manual e reconciliação; `OWNER_APPROVED` quanto à finalidade;
detalhes/autoridade continuam em C.

### O20 — Tratamento de duplicatas de catálogo

Estado: **OWNER_APPROVED**.

Tratamento de duplicatas de catálogo; `OWNER_APPROVED` expressamente; não
apagar identidades históricas/movimentos.

## Fontes estruturadas e contratos

[Registro C2](../audits/C/C2-decisions/DECISIONS_REGISTER.csv),
[cruzamento](../audits/C/C2-decisions/DECISION_SPECIFICATION_CROSSWALK.csv),
[C3](../audits/C/C3-functional-specification/README.md),
[C8](../audits/C/C8-visual-blueprint/README.md) e
[aceites C9](../audits/C/C9-acceptance-refinement/README.md).
