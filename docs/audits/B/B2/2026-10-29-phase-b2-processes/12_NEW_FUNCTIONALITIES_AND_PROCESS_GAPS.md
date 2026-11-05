# Funcionalidades ausentes e oportunidades de simplificação

Vinte alternativas examinadas: dezenove candidatas e O10 descartada como nova
capacidade genérica por já existir solução no produto. Nenhuma foi implementada
ou
aprovada como requisito. Defeitos comprovados ficam no registro13.
Esforço é complexidade relativa, sem prazo ou orçamento estimado. Benefícios
humanos
não foram medidos; cada proposta indica como verificar ou abandoná-la.

O catálogo inclui melhorias de recursos existentes, capacidades condicionais
novas
e um processo humano. Não presume novo módulo, tabela, painel ou automação. A
versão
[CSV](12_OPPORTUNITIES.csv) permite comparar público, custo, risco e
dependências.

- **ID:** O01; **Proposta:** Preparação guiada da primeira residência;
  **Natureza:** LACUNA; **Alcance:** PEQUENA_MELHORIA

- **ID:** O02; **Proposta:** Desistir do saldo não adquirido de COM;
  **Natureza:** LACUNA; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O03; **Proposta:** Discordar ou retirar solicitação de cancelamento
  ENT; **Natureza:** LACUNA; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O04; **Proposta:** Pendências alcançáveis com próximo responsável;
  **Natureza:** OPORTUNIDADE; **Alcance:** PEQUENA_MELHORIA

- **ID:** O05; **Proposta:** Esclarecimento ligado ao relato de consumo;
  **Natureza:** LACUNA; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O06; **Proposta:** Prévia do efeito da troca de plantão sobre BAL;
  **Natureza:** OPORTUNIDADE; **Alcance:** PEQUENA_MELHORIA

- **ID:** O07; **Proposta:** Desligamento com inventário de trabalho e sucessão
  futura; **Natureza:** LACUNA; **Alcance:** NOVA_CAPACIDADE_CONDICIONAL

- **ID:** O08; **Proposta:** Embalagem e equivalência preservadas na operação;
  **Natureza:** OPORTUNIDADE; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O09; **Proposta:** Abrir origem de cada movimento autorizado;
  **Natureza:** OPORTUNIDADE; **Alcance:** PEQUENA_MELHORIA

- **ID:** O10; **Proposta:** Reaproveitamento entre documentos já existe;
  **Natureza:** RECOMENDACAO_DESCARTADA; **Alcance:** CAPACIDADE_JA_EXISTENTE

- **ID:** O11; **Proposta:** Reavaliar necessidade após aceite positivo pequeno;
  **Natureza:** PREFERENCIA; **Alcance:** PEQUENA_MELHORIA_CONDICIONAL

- **ID:** O12; **Proposta:** Retirar produto do uso com destino do saldo;
  **Natureza:** LACUNA; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O13; **Proposta:** Retomar ou abandonar anexo com resultado conhecido;
  **Natureza:** LACUNA; **Alcance:** AMPLIACAO_DE_PROCESSO

- **ID:** O14; **Proposta:** Explicar mudanças de versão e situação atual;
  **Natureza:** OPORTUNIDADE; **Alcance:** PEQUENA_MELHORIA

- **ID:** O15; **Proposta:** Mostrar frescor e recuperação no recurso
  consultado; **Natureza:** OPORTUNIDADE; **Alcance:** PEQUENA_MELHORIA

- **ID:** O16; **Proposta:** Seleções recorrentes revisáveis por residência;
  **Natureza:** HIPOTESE; **Alcance:** PEQUENA_MELHORIA_CONDICIONAL

- **ID:** O17; **Proposta:** Lote e validade somente onde a necessidade for
  demonstrada; **Natureza:** HIPOTESE; **Alcance:** NOVA_CAPACIDADE_CONDICIONAL

- **ID:** O18; **Proposta:** Trabalho da própria pessoa entre residências
  autorizadas; **Natureza:** HIPOTESE; **Alcance:** NOVA_CAPACIDADE_CONDICIONAL

- **ID:** O19; **Proposta:** Contingência manual com reconciliação de fatos;
  **Natureza:** LACUNA; **Alcance:** PROCESSO_HUMANO_ANTES_DE_SOFTWARE

- **ID:** O20; **Proposta:** Tratar duplicatas de catálogo sem reescrever
  identidades; **Natureza:** HIPOTESE; **Alcance:**
  AMPLIACAO_DE_PROCESSO_CONDICIONAL

## O01 — Preparação guiada da primeira residência

**Necessidade e público:** Primeiro uso: reconhecer o que falta antes de operar.
Admin local e familiar inicial.

**Hoje:** Conta, paciente, convites, catálogo, saldo e política existem em
recursos separados.

**Alternativa proposta:** Lista com links e responsável: aceites, unidades,
saldos por custódia, destinatários e um ciclo curto acompanhado. Benefício
esperado: Evitar cadastrar unidade errada e descobrir falta de recebedor depois
da expedição.

**Complexidade e dependências:** Baixa a média; depende de conteúdo e sinais já
disponíveis, sem novo estado de liberação. P-ACC-03–05; P-CAT-01–03; P-STK-01;
política BAL.

**Risco:** Checklist rígido pode bloquear família pequena ou aparentar
certificação clínica. Alternativa mais simples: Roteiro documental de uma página
com os mesmos links.

**Decisão pendente:** Quais passos são mínimos locais e quem pode considerá-los
feitos?

**Verificação do benefício:** Sessão de primeiro uso: erros de unidade, pedidos
de ajuda e tempo até primeiro ciclo válido; baseline humano ainda não medido.

**Base:** 11_PERSONA_JOURNEYS_AND_OPERATIONAL_FRICTION.md; B27-01;
synthetic-setup.

## O02 — Desistir do saldo não adquirido de COM

**Necessidade e público:** Fornecedor não entregará todo saldo aprovado após
recebimento parcial. Família e aprovador de aquisição.

**Hoje:** Cancelar com adquirido/aceito é recusado; previsão restante continua
sem encerramento.

**Alternativa proposta:** Decisão motivada sobre restante por linha, distinta de
desfazer adquirido/recebido. Benefício esperado: Previsão mostra o que ainda se
espera; operação pode encerrar sem entrada fictícia.

**Complexidade e dependências:** Média; afeta ciclo COM, previsão, eventos e
concorrência. B2-001; contrato de aquisição/receipt; aprovação local.

**Risco:** Encerrar inadvertidamente material adquirido ainda a receber; alterar
previsão passada. Alternativa mais simples: Estado explícito de saldo não será
adquirido, com motivo e consulta do restante.

**Decisão pendente:** Quem decide, quando pode reabrir e se deve haver nova
aprovação do saldo?

**Verificação do benefício:** Caso10→2: restante8deixa previsão, dois recebidos
permanecem; comparar idade e quantidade de COM sem fato futuro esperado.

**Base:** B22-09;03_REQUISITION_ACQUISITION_AUDIT.md.

## O03 — Discordar ou retirar solicitação de cancelamento ENT

**Necessidade e público:** Cancelamento pedido não corresponde à decisão ou ao
fato físico. Destinatário e solicitante.

**Hoje:** cancellation_pending permite apenas consentir e reconciliar.

**Alternativa proposta:** Recusa motivada do recebedor e/ou retirada por
solicitante com versão e histórico, definindo retorno de estado. Benefício
esperado: Resolver desacordo sem forçar devolução ou consumo fictício.

**Complexidade e dependências:** Média; interage com atendimento REQ, estado ENT
e
conciliação. B2-002; B2-004; B2-015; política de consentimento.

**Risco:** Restaurar estado anterior ignorando fatos ocorridos depois; cancelar
unilateralmente aceite. Alternativa mais simples: Começar por retirada motivada
antes de consentimento, se isso cobrir o uso real.

**Decisão pendente:** Quais decisões pertencem ao solicitante e ao destinatário;
qual efeito em desacordo persistente?

**Verificação do benefício:** Recusa/retirada deixa tarefa executável, sem mover
estoque e sem apagar aceite; medir pedidos de suporte por impasse.

**Base:** B23-08; B28-consent-only; B2-002.

## O04 — Pendências alcançáveis com próximo responsável

**Necessidade e público:** Documento aberto existe, mas não aparece na fila
habitual ou fica antigo. Toda pessoa com tarefa operacional.

**Hoje:** ENTcancelamento fora do filtro padrão; consumo além100inacessível;
dashboard recorta tarefas.

**Alternativa proposta:** Completar filtros/consulta individual/paginação e
mostrar pessoa seguinte, motivo de bloqueio e idade no recurso existente.
Benefício esperado: Reduzir trabalho esquecido e distinguir aguarda outra pessoa
de minha decisão.

**Complexidade e dependências:** Média; primeiro completar contratos de
consulta, sem dashboard paralelo. B2-003; B2-017; B1-UX-007; capacidade por
paciente.

**Risco:** Priorizar por idade apenas e ocultar urgência; vazar existência de
tarefa fora de capacidade. Alternativa mais simples: Links estáveis com filtros
corretos e rótulo do limite/escopo antes de agregação.

**Decisão pendente:** Quem faz triagem de bloqueados e qual ordem faz sentido
para família?SLA só se necessário

**Verificação do benefício:** Alvo antigo e cancelamento aparecem para ator
devido; tempo até localizar tarefa e quantidade de pendências sem agente.

**Base:** B28 browser; B29-06; B25-11;10_EXCEPTION_SCENARIOS.csv.

## O05 — Esclarecimento ligado ao relato de consumo

**Necessidade e público:** Uso foi relatado antes de conseguir quantidades
estruturadas. Profissional relator e confirmador.

**Hoje:** Texto livre aceito, mas confirmação exige linhas; rejeitar e redigitar
não liga os registros.

**Alternativa proposta:** Complemento identificado/versionado ou exigência clara
de estrutura antes de relatar consumo que pretende debitar. Benefício esperado:
Conservar relato original e evitar perda de contexto ao esclarecer.

**Complexidade e dependências:** Média; depende de autoria do complemento e
revisão da decisão. B2-010; B2-011; capacidade da custódia.

**Risco:** Confirmador editar silenciosamente palavras do autor ou inferir
quantidade pelo texto. Alternativa mais simples: Separar registrar ocorrência
sem débito de registrar consumo estruturado e ligar eventual relato substituto.

**Decisão pendente:** Quem pode complementar; é necessária nova confirmação do
autor?

**Verificação do benefício:** Texto inicial imutável; complemento tem
autor/data; zero débito antes de confirmação; medir redigitações/relatos sem
solução.

**Base:** B25-04; B29-05;06_BALANCE_CONSUMPTION_AUDIT.md.

## O06 — Prévia do efeito da troca de plantão sobre BAL

**Necessidade e público:** Alterar pessoa, horário ou proposta com tarefa BAL
aberta. Gestor, contador e revisor.

**Hoje:** Guards impedem mudança de prazo, mas substituição durante reconto pode
deixar atribuição inválida sem sucessor.

**Alternativa proposta:** No resumo existente, mostrar janela, pessoa
anterior/nova, BALafetado e tarefa de designação ao revisor. Benefício esperado:
Transformar mudança de agenda em encaminhamento operacional compreensível.

**Complexidade e dependências:** Média; consulta de impacto e validação
transacional continuam distintas. B2-012; B2-014; A UX-001/B1-UX-001; B2-013.

**Risco:** Prévia envelhecer antes de confirmar; aprovar agenda não pode
conceder poder de contador. Alternativa mais simples: Aviso contextual e link
para atribuição formal de reconto existente.

**Decisão pendente:** Adotar transferência em casos seguros ou exigir decisão de
revisor; como avisar ausência de sucessor?

**Verificação do benefício:** Troca pessoa/horário/cicloopen/counted com
antes/depois; medir tempo sem contador executável; zero autoria falsa.

**Base:** B26-08–11; B25-11;07_SCHEDULES_SHIFTS_AUDIT.md.

## O07 — Desligamento com inventário de trabalho e sucessão futura

**Necessidade e público:** Pessoa perde acesso com ENTparcial, reconto,
propostas ou ciência em aberto. Admin local, família e substituto.

**Hoje:** Revogação correta não transfere todas tarefas; ENTparcial não admite
sucessor de recebimento.

**Alternativa proposta:** Listar trabalho atingido e oferecer encaminhamentos
por domínio; termo de transferência só para fatos futuros se aprovado. Benefício
esperado: Revogar prontamente e continuar operação sem impersonação.

**Complexidade e dependências:** Alta para sucessão formal; baixa a média para
inventário e links existentes. B2-015; B2-014; política familiar de custódia;
backend/RLS.

**Risco:** Herdar autorização familiar ou assinatura de outra pessoa;
condicionar revogação urgente ao encerramento. Alternativa mais simples:
Inventário consultável depois da revogação com responsáveis nomeados e
procedimentos de domínio.

**Decisão pendente:** Quem pode atestar restante físico e quem autoriza assunção
de custódia?

**Verificação do benefício:** Revogação imediata; outras residências intactas;
história preservada; nenhuma tarefa parcial sem encaminhamento ou limitação
visível.

**Base:** B27-05–08; B1-FORM-006;08_IDENTITIES_MEMBERSHIPS_ADMIN_AUDIT.md.

## O08 — Embalagem e equivalência preservadas na operação

**Necessidade e público:** Quantidade física é embalagem, mas documento grava
somente unidade base. Quem recebe/doa material por caixa ou frasco.

**Hoje:** Lookup encontra fator; scanner converte; linha emitida não conserva
origem da conversão.

**Alternativa proposta:** Escolha consultável de apresentação, resumo
caixas×fator=base e snapshot da equivalência quando usada. Benefício esperado:
Conferir cálculo depois e reduzir contas repetidas sem reinterpretar história.

**Complexidade e dependências:** Média; precisão, conversão, edição de
apresentação e PDF. B2-006; B1-FORM-005; P-CAT-02/03.

**Risco:** Apresentações com mesmo nome mas conteúdo diferente; conversão
silenciosa ou fator mutável no passado. Alternativa mais simples: Mostrar
equivalência e confirmar quantidade base; registrar origem em metadata já
suportada.

**Decisão pendente:** Quais processos precisam apresentação original e quais
produtos justificam isso?

**Verificação do benefício:** Dois pacotes×10=20 base; fator futuro12não altera
anterior; medir correções por erro de embalagem; sem arredondamento silencioso.

**Base:** B24-05;05_STOCK_CUSTODY_MOVEMENTS_AUDIT.md.

## O09 — Abrir origem de cada movimento autorizado

**Necessidade e público:** Conferir por que saldo mudou por receipt, BAL ou
consumo. Família, supervisão e auditor local.

**Hoje:** Ledger preserva reference_type/id, mas navegação direta favorece
document.

**Alternativa proposta:** Traduzir referência e abrir origem autorizada no
recurso existente, com contexto correto e retorno ao filtro. Benefício esperado:
Menos cópia de IDs e comparação manual entre telas.

**Complexidade e dependências:** Baixa a média; algumas origens precisam detalhe
autorizado antes inexistente. B2-008; B2-017; B1-UX-006; capacidade da origem.

**Risco:** Link revelar COM familiar a quem só pode ler equipe; inferir
documento errado do mesmoUUID. Alternativa mais simples: Rótulo explicativo e
código da origem sem link quando leitor não tiver capacidade.

**Decisão pendente:** Quais detalhes cada público pode abrir sem ampliar
permissão?

**Verificação do benefício:** Testar document, purchase_receipt, bal,
consumption, family_manual; origem legível ou restrição clara; tempo para
explicar saldo.

**Base:** B24/B26 movimentos; src/components/stock/stock-console.tsx.

## O10 — Reaproveitamento entre documentos já existe

**Necessidade e público:** Mesmos produtos são selecionados de novo em
documentos relacionados. Familiar que providencia e prepara entregas.

**Hoje:** supply-wizard recebe requisitionId, carrega linhas e conserva
vínculos; resumo de linhas mostra associação explícita.

**Alternativa proposta:** Não criar novamente o atalho genérico; preservar
recurso existente e só ampliar após observar uma limitação específica. Benefício
esperado: Evitar desenvolvimento redundante e preservar decisão explícita de
quantidade/destino.

**Complexidade e dependências:** Nenhum desenvolvimento genérico recomendado;
eventual melhoria depende de prova adicional. P-REQ-02/05; P-COM-01; P-ENT-01;
B1-FORM-004.

**Risco:** Herança indevida de quantidade inexistente na REQ; vínculos
excessivos; envio a destinatário implícito. Alternativa mais simples: Usar o
fluxo com requisitionId e busca existente; B1-FORM-004 trata busca onde ainda
insuficiente.

**Decisão pendente:** Nenhuma capacidade nova aprovada; verificar se usuários
descobrem o recurso existente antes de ampliar

**Verificação do benefício:** Provar atalho existente, quantidade/destinatário
explícitos e ausência de emissão automática; abandonar nova proposta se o atual
atende.

**Base:** src/components/documents/supply-wizard.tsx:143; B22-04; B23-01;
segunda passada B2.10.

## O11 — Reavaliar necessidade após aceite positivo pequeno

**Necessidade e público:** Uma linha atende por aceite positivo, mas a
necessidade humana pode continuar. Emissor REQ e familiar.

**Hoje:** REQ não pede quantidade; aceite positivo vinculado atende linha;
repetição justificada permite nova REQ.

**Alternativa proposta:** Explicar a regra e oferecer atalho revisar
necessidade/nova REQ justificada se o usuário ainda precisar. Benefício
esperado:
Evitar entender linha atendida como cobertura material indefinida.

**Complexidade e dependências:** Baixa para explicação/atalho; média se criado
ciclo formal de reavaliação. Regra central REQ; B23-03/05; ciência e conclusão
independentes.

**Risco:** Reintroduzir quantidade pedida ou reabrir linha automaticamente sem
nova necessidade. Alternativa mais simples: Texto de ajuda e link para nova REQ
com contexto da anterior.

**Decisão pendente:** A família quer declaração explícita de suficiência ou a
regra atual explicada basta?

**Verificação do benefício:** Participantes distinguem linha atendida de
cobertura futura; nenhuma quantidade solicitada adicionada; medir novasREQs
desnecessárias.

**Base:** B23-03;02_PROCESS_STATE_MAPS.md.

## O12 — Retirar produto do uso com destino do saldo

**Necessidade e público:** Inativar produto ainda com material físico ou tarefa
aberta. Admin catálogo, família e equipe.

**Hoje:** Ledger/saldo preservados, mas consumo e novas contagens exigem produto
ativo.

**Alternativa proposta:** Prévia de saldo/tarefas e política explícita: esgotar
uso, reativar justificadamente, transferir ou descartar por fato real. Benefício
esperado: Evitar material sem percurso de baixa e reativação ad hoc.

**Complexidade e dependências:** Média a alta conforme política; primeira etapa
é prévia e procedimento. B2-007; P-CAT-01; P-STK-04; P-OCC-01; BAL.

**Risco:** Zerar automaticamente; permitir novo uso de produto retirado sem
decisão; presumir descarte clínico. Alternativa mais simples: Aviso de saldo e
orientação de reativação explícita quando apropriada.

**Decisão pendente:** O que significa inativo para cada família e quais fatos
podem acontecer com saldo remanescente?

**Verificação do benefício:** Inativar com4+4 preserva história e caminho de
destinação; sem consumo implícito; medir produtos inativos com saldo sem
encaminhamento.

**Base:** B24-06;05_STOCK_CUSTODY_MOVEMENTS_AUDIT.md.

## O13 — Retomar ou abandonar anexo com resultado conhecido

**Necessidade e público:** Conexão cai, arquivo não termina ou chave se perde.
Operador móvel que anexa comprovante.

**Hoje:** API recupera mesmos bytes; UIincerta tem defeito conhecido; quarantine
conta para limite10sem prazo de saída.

**Alternativa proposta:** Conservar intenção/bytes, consultar tentativa e tratar
abandono/expiração conforme política, sem apagar ready. Benefício esperado:
Preservar capacidade de prova e reduzir conflito de reenvio.

**Complexidade e dependências:** Média a alta; Storage, metadados, limite,
concorrência e retenção. B2-016; B1-ERR-001; A DB-004.

**Risco:** Apagar arquivo pronto ou reserva ativa; liberar limite para abuso;
publicar URLtemporária. Alternativa mais simples: Primeiro consulta por chave e
resumo fixo; procedimento autorizado para reserva antiga.

**Decisão pendente:** Prazo de abandono, quem pode cancelar e quais metadados
conservar?

**Verificação do benefício:** Dez reservas antigas não impedem novo comprovante
válido; upload ativo e retry preservados; medir reservas semreadyporidade.

**Base:** B28-06/07;09_DOCUMENTS_SCIENCE_COMMUNICATION_AUDIT.md.

## O14 — Explicar mudanças de versão e situação atual

**Necessidade e público:** Arquivo histórico foi superado por cancelamento,
reabertura ou reconto. Leitor de PDF/histórico e decisor local.

**Hoje:** Versões/hashes/eventos preservados, mas diferenças de negócio exigem
reconstrução manual.

**Alternativa proposta:** Resumo do que mudou, autor, motivo e próximo passo no
detalhe existente; PDFhistórico continua fiel. Benefício esperado: Evitar agir
sobre documento superado e reduzir interpretação de JSON/IDs.

**Complexidade e dependências:** Média; traduzir eventos de domínio sem nova
fonte de verdade. B1-UX-006; A UX-009; B29-01; B1-DOC-001.

**Risco:** Reescrever PDF antigo com informação posterior ou apresentar hash
como assinatura. Alternativa mais simples: Link situação atual e rótulo versão
histórica; resumo textual dos eventos existentes.

**Decisão pendente:** Quais mudanças precisam comparação campo a campo e quais
bastam como evento legível?

**Verificação do benefício:** Versão5idêntica após reabertura; atual mostra
pendência; participante identifica qual documento deve orientar a próxima ação.

**Base:** B28-05; B29-01; pdf-inspection.json.

## O15 — Mostrar frescor e recuperação no recurso consultado

**Necessidade e público:** Consulta falha ou filtro/contexto muda enquanto dados
anteriores ainda aparecem. Pessoa em rede instável.

**Hoje:** B1 comprovou estados antigos com aparência atual e erros que não dizem
o que permaneceu válido.

**Alternativa proposta:** Indicar atualização/falha/última confirmação no
recurso e preservar valores válidos; escrita depende de versão atual. Benefício
esperado: Pessoa reconhece limite de decisão sem descartar saldo já comprovado.

**Complexidade e dependências:** Média; estado de leitura e de escrita precisam
contratos distintos. B1-STATE-002/003/005; B1-ERR-002; versões API.

**Risco:** Usar dados locais antigos para autorizar mutação; inventar modo
offline transacional. Alternativa mais simples: Aviso de última consulta e
recarregar recurso afetado; sem cache novo.

**Decisão pendente:** Qual atraso é tolerável por tarefa e quais ações devem
exigir atualização explícita?

**Verificação do benefício:** Perda de rede nunca parece confirmação nova;
leitura antiga rotulada; medir erros de decisão após filtro ou interrupção.

**Base:** Referência B1; B29-02/03 protege gravação, sem provar compreensão.

## O16 — Seleções recorrentes revisáveis por residência

**Necessidade e público:** Mesmos grupos de materiais são lembrados
repetidamente. Família e profissional com rotina de materiais.

**Hoje:** Catálogo e aliases ajudam busca; REQ e COM continuam documentos
independentes.

**Alternativa proposta:** Lista de seleção reutilizável com itens ativos, sem
quantidade pedida na REQ e sem emissão automática. Benefício esperado: Reduzir
esquecimento e seleção repetida quando houver padrão real.

**Complexidade e dependências:** Baixa a média; começar por escolha recente ou
lista simples sem nova configuração global. P-CAT-01; P-REQ-01; O10; validação
humana da frequência.

**Risco:** Reforçar itens obsoletos, rotina de compra sem necessidade ou
autoridade presumida. Alternativa mais simples: Favoritos de consulta ou
reaproveitar última seleção com revisão obrigatória.

**Decisão pendente:** Existe repetição suficiente na primeira família para
compensar manutenção da lista?

**Verificação do benefício:** Estudo antes/depois: tempo de seleção, omissões e
itens retirados; cancelar proposta se não reduzir esforço sem aumentar erros.

**Base:** 11_PERSONA_JOURNEYS_AND_OPERATIONAL_FRICTION.md; necessidade ainda não
observada com usuários.

## O17 — Lote e validade somente onde a necessidade for demonstrada

**Necessidade e público:** Precisar distinguir fisicamente produto igual com
origem/validade diferente. Família que mantém materiais com lotes distintos.

**Hoje:** Saldo por produto e custódia; metadata/anexo não constituem ledger por
lote.

**Alternativa proposta:** Primeiro validar necessidade e procedimento físico; se
necessário, rastreio explícito desde recebimento até saída. Benefício esperado:
Permitir responder qual lote ainda existe sem misturar quantidades iguais.

**Complexidade e dependências:** Alta; receipts, ENT, contagem, perdas,
conversões e histórico precisam identidade física coerente. P-STK-07; decisão do
responsável; grupos de banco/backend e operação humana.

**Risco:** Criar campos decorativos sem consequência; inventário físico não
manter correspondência. Alternativa mais simples: Anexo/observação e
procedimento manual quando suficiente, sem prometer rastreabilidade formal.

**Decisão pendente:** Quais produtos/casos exigem rastreio; quem
registra/confere; qual volume justifica capacidade nova?

**Verificação do benefício:** Se adotado, simular dois lotes e devolução sem
misturar; avaliar esforço de entrada e confiabilidade física; sem alegar
exigência legal nesta B2.

**Base:** P-STK-07;05_STOCK_CUSTODY_MOVEMENTS_AUDIT.md; NAO_VERIFICADO_HUMANO.

## O18 — Trabalho da própria pessoa entre residências autorizadas

**Necessidade e público:** Trocar contextos para descobrir onde precisa agir.
Profissional ou gestor com múltiplos vínculos.

**Hoje:** Contexto explícito isola corretamente; consulta transversal de
trabalho não foi demonstrada.

**Alternativa proposta:** Se houver demanda, lista mínima de tarefas autorizadas
com paciente explícito e navegação para contexto correto. Benefício esperado:
Evitar que um paciente menos consultado seja esquecido sem dar poder global
implícito.

**Complexidade e dependências:** Alta para agregação segura; baixa para atalhos
de contextos recentes. A DB-002/006; P-ACC-02; B26-12; autoridade e freshness.

**Risco:** Vazar nome/detalhe de paciente sem capacidade; confundir a custódia
ao agir; agregação mascarar jobsemprogresso. Alternativa mais simples: Seletor
de pacientes com estado autorizado de acesso e lembrete de revisar cada
contexto.

**Decisão pendente:** Usuário atual opera mais de um paciente?Quais tarefas
justificam agregação?

**Verificação do benefício:** Revogação retira tarefa imediatamente; nenhum
detalhe externo; seleção muda contexto antes de gravar; medir trocas necessárias
e pendências esquecidas.

**Base:** B26-12; B27-06;10_EXCEPTION_SCENARIOS.csv X19.

## O19 — Contingência manual com reconciliação de fatos

**Necessidade e público:** Aplicativo indisponível durante movimentação física
necessária. Família, equipe e responsável por continuidade.

**Hoje:** Foto/anexo e importação histórica existem, mas não provam restore
integral nem um procedimento humano aceito.

**Alternativa proposta:** Combinar quem anota fato, hora, produto, quantidade,
custódia e autor; reconciliar após retorno com origem identificada e sem
duplicar. Benefício esperado: Continuar com responsabilidade conhecida e evitar
reconstrução por memória.

**Complexidade e dependências:** Média para procedimento/ensaio; alta para
sincronização offline automática que não está proposta. A OPS-001; P-DOC-02/05;
backupAuth/Storage; RPO/RTO.

**Risco:** Documento manual ser registrado como recebimento/ciência de quem não
participou; dupla entrada após recuperação. Alternativa mais simples: Ficha
física simples e foto, com uma pessoa responsável pela reconciliação posterior.

**Decisão pendente:** Responsável, prazo e perda admissível de dados; quando
fazer ensaio autorizado?

**Verificação do benefício:** Ensaio humano e restore no destino autorizado
conservam eventos, anexo e estoque; nenhuma promessa de recuperação com base só
no dump local.

**Base:** backup-verification.json;10_EXCEPTION_SCENARIOS.csv X21.

## O20 — Tratar duplicatas de catálogo sem reescrever identidades

**Necessidade e público:** Mesmo material cadastrado duas vezes com
aliases/unidades parecidas. Admin catálogo e quem procura materiais.

**Hoje:** Produtos têm identidade histórica; inativação existe; merge de
saldos/documentos não foi localizado.

**Alternativa proposta:** Apresentar candidatos por nome/alias/unidade e
permitir indicar uso futuro preferido sem fundir história; resolver saldos por
fatos. Benefício esperado: Menos seleção do item errado e menos mínimos
separados indevidamente.

**Complexidade e dependências:** Média para detecção/aviso; alta para qualquer
migração histórica, que não é recomendação automática. P-CAT-01/02; B2-007;
units e aliases; validação humana da equivalência.

**Risco:** Confundir produtos clinicamente diferentes ou unidades não
equivalentes; somar estoques sem fato físico. Alternativa mais simples:
Nome/alias claros, inativação explícita com destino do saldo e orientação de
escolha.

**Decisão pendente:** Há duplicatas reais no catálogo da primeira família e qual
equivalência pode ser atestada?

**Verificação do benefício:** Prova com dois nomes parecidos nunca associa
automaticamente; história/IDs/saldos intactos; medir seleções erradas e esforço
de correção.

**Base:** P-CAT-02; P-STK-04; B24-04/06; HIPOTESE_DE_USO.

## Segunda passada e propostas descartadas

Não propor compra automática a partir de REQ; quantidade pedida na REQ; saldo
por
edição direta; consumo inferido de BAL; presença inferida de escala; ciência por
visto;
sucessor assinando pelo desligado; reenviar resultado externo incerto; apagar
reservas
ou eventos para limpar fila. As distinções são controles operacionais, não
etapas
redundantes. A simplificação deve reduzir preenchimento e explicar
responsabilidade.

A hipótese de criar estoque inicial por COM foi abandonada porque movimento
familiar
avulso já existe. Não se propõe módulo de presença como correção da agenda.
Lote,
duplicatas, listas recorrentes e visão multipaciente exigem necessidade
demonstrada
antes de custo adicional. O critério de continuar uma proposta é benefício
observável
sem perda das regras centrais; ausência de benefício é motivo para não
implementá-la.
