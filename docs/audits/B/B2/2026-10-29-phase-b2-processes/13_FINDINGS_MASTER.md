# Registro mestre de achados B2

17 achados: oito defeitos, sete lacunas e duas oportunidades. Quinze P2 e dois
P3.
Treze causas/recortes novos em B2 e quatro revalidações A (DB-001, DB-003,
DB-004, BE-001).
Alguns novos recortes ampliam B1 e estão relacionados individualmente. Não se
somam
os 67 achados históricos como se fossem descobertas novas. Nenhum achado foi
corrigido.

P2 indica interrupção/inconsistência operacional delimitada, sem inferir perda
generalizada
ou bypass. P3 indica benefício de rastreabilidade/eficiência. P1 herdados A
UX-001 e
DB-002 continuam dependências separadas; B2 não altera o parecer A NO-GO.

A [versão CSV](13_FINDINGS_MASTER.csv) conserva todos os atributos e permite
filtragem.
Cenários são identificadores dentro dos JSON; testes do auditor não são
correções
ou
testes de aceitação futuros implementados. A frequência humana permanece não
medida.

- **ID:** B2-001; **Questão:** COM parcial não permite desistir formalmente do
  saldo não adquirido; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-002; **Questão:** Pedido de cancelamento ENT não tem recusa ou
  retirada formal; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-003; **Questão:** ENT aguardando consentimento fica fora da fila
  padrão de trabalho; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-004; **Questão:** ENT com consumo confirmado continua sem conseguir
  concluir cancelamento; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  REVALIDACAO_A

- **ID:** B2-005; **Questão:** Correção de estoque familiar aceita ausência do
  movimento original; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-006; **Questão:** Conversão de embalagem não conserva como a
  quantidade base foi obtida; **Prioridade:** P3; **Natureza:** OPORTUNIDADE;
  **Origem:** NOVA_CAUSA_B2

- **ID:** B2-007; **Questão:** Produto inativo com saldo não tem percurso
  próprio de esgotamento; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-008; **Questão:** Histórico de estoque não conduz igualmente às
  origens de recibo, BAL e consumo; **Prioridade:** P3; **Natureza:**
  OPORTUNIDADE; **Origem:** NOVA_CAUSA_B2

- **ID:** B2-009; **Questão:** Supervisor pode aprovar a própria contagem no
  regime BAL anterior; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-010; **Questão:** Consumo só textual não pode ser complementado
  para confirmação; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-011; **Questão:** Decisão oposta de consumo recebe sucesso sem ser
  aplicada; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:** NOVA_CAUSA_B2

- **ID:** B2-012; **Questão:** Adiamento BAL obsoleto permanece pendente e nem
  pode ser recusado; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-013; **Questão:** Aprovação posterior republica plantões além do
  corte da série; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  REVALIDACAO_A

- **ID:** B2-014; **Questão:** Substituição durante reconto pode deixar tarefa
  sem contador executável; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-015; **Questão:** Revogação de recebedor de ENT parcial não possui
  sucessão formal; **Prioridade:** P2; **Natureza:** LACUNA; **Origem:**
  NOVA_CAUSA_B2

- **ID:** B2-016; **Questão:** Reservas de anexo abandonadas esgotam o limite
  sem arquivos prontos; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  REVALIDACAO_A

- **ID:** B2-017; **Questão:** Pendência antiga de consumo não é alcançada pelo
  contador ou referência; **Prioridade:** P2; **Natureza:** DEFEITO; **Origem:**
  REVALIDACAO_A

## B2-001 — COM parcial não permite desistir formalmente do saldo não adquirido

**Domínio/processos:** Abastecimento; P-COM-03; P-COM-04; P-COM-05; P-STK-04.
P2, LACUNA; diagnóstico aberto.

**Hoje:** Aprovado10/adquirido2/recebido2 permanece partially_received;
cancelamento com motivo é recusado; restante8sem decisão terminal.

**Esperado:** Registrar desistência do restante não adquirido preservando o que
foi adquirido/recebido. **Consequência:** Família conserva previsão e pendência
digital que já decidiu não executar; abrir nova COM não encerra a anterior.

**Causa sustentada:** Cancelamento protege fatos físicos, mas não há transição
específica para saldo aprovado não adquirido. Prioridade: Pendência ou decisão
operacional fica incompleta/inconsistente no estado demonstrado; sem bypass ou
perda generalizada comprovados.

**Prova:** [b22-results.json](evidence/b22-results.json); cenários B22-09.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/audited_legacy_supply_command.sql;evidence/contracts/credit_purchase_receipt.sql`.

**Reprodução:** EmitirCOM10; adquirir2; validar chegada2; tentar cancelar pelo
motivo de desistência dos8; consultar linhas/estado.

**Limites/contraprova:** Sem corrupção de saldo; recebimento parcial não encerra
prematuramente COM, hipótese contrária refutada emB22-06. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Definir encerramento motivado do
remanescente por linha, com versão e efeito explícito na previsão. Alternativas:
Dispensa justificada do saldo; revisão de intenção remanescente sem reescrever
linhas anteriores; manter aberto com rótulo de bloqueio enquanto contrato não
decidido.

**Dependências:** Ciclo COM; receipts; previsões; concorrência; O02.
**Decisão:**
Quem dispensa/reabre e como distinguir não adquirido de adquirido ainda
esperado?

**Aceite futuro AC-B2-001:** Com10→2, encerrar8retira apenas previsão
correspondente, conserva estoque2, receipts e eventos; tentativa repetida
recupera mesma decisão.

**Não pode ocorrer:** Não inventar compra, entrada, devolução, atendimento REQ
ou
apagar aquisição válida; recusar versão antiga e encerramento concorrente ao
fato físico.

## B2-002 — Pedido de cancelamento ENT não tem recusa ou retirada formal

**Domínio/processos:** Entrega; P-ENT-06; P-REQ-05. P2, LACUNA; diagnóstico
aberto.

**Hoje:** Depois de aceite positivo, cancellation_pending oferece apenas
consent_cancel; reject_cancel é inválido; browser confirma única decisão de
consentir.

**Esperado:** Permitir resolver desacordo ou retirada sem obrigar destinatário a
consentir em fato que contesta. **Consequência:** Documento pode ficar suspenso
indefinidamente; conclusão REQ relacionada também fica bloqueada.

**Causa sustentada:** Enumeração de comandos e formulário não modelam
recusa/retirada nem retorno justificado de estado. Prioridade: Pendência ou
decisão operacional fica incompleta/inconsistente no estado demonstrado; sem
bypass ou perda generalizada comprovados.

**Prova:** [b23-results.json](evidence/b23-results.json); cenários B23-08.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA; RENDERIZACAO.

**Rastreio:**
`src/lib/validation/documents.ts;evidence/contracts/audited_legacy_supply_command.sql;evidence/b28-consent-only.txt`.

**Reprodução:** Receber ENT; pedircancelamento; destinatário tenta discordar;
examinar ação disponível e recusa RPC.

**Limites/contraprova:** Não implica que cancelamento unilateral deva ser
permitido; aceite prévio e estoque foram preservados. Alta para o comportamento
delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Definir autoridade e transições de
recusa/retirada, com motivo, versão e efeitos em REQ. Alternativas: Começar por
retirada antes do consentimento; encaminhar desacordo para decisão local
explícita sem alterar material.

**Dependências:** Consentimento; atendimento REQ; B2-004; B2-015; O03.
**Decisão:** Qual decisão cabe a cada pessoa e qual estado permanece após
discordância?

**Aceite futuro AC-B2-002:** Recebedor recusa ou solicitante retira conforme
política aprovada; pendência tem destino conhecido e evento próprio.

**Não pode ocorrer:** Sem estorno, aceite inventado ou cancelamento total
unilateral; consentimento concorrente e dados obsoletos exigem revalidação.

## B2-003 — ENT aguardando consentimento fica fora da fila padrão de trabalho

**Domínio/processos:** Entrega e continuidade; P-ENT-06; P-DOC-04; P-NTF-01. P2,
LACUNA; diagnóstico aberto.

**Hoje:** Filtro padrão pending_receipt e tarefasdashboard omitem
cancellation_pending; Todas mostra os documentos; profissional viu fila vazia
apesar de duas pendências.

**Esperado:** Pessoa responsável por consentir encontra essa tarefa no caminho
usual de pendências. **Consequência:** Destinatário pode interpretar que não tem
trabalho, prolongando cancelamento e bloqueio REQ.

**Causa sustentada:** Consultas e filtros selecionam recebimentos pendentes sem
incluir outra ação relevante do destinatário. Prioridade: Pendência ou decisão
operacional fica incompleta/inconsistente no estado demonstrado; sem bypass ou
perda generalizada comprovados.

**Prova:** [b23-results.json](evidence/b23-results.json); cenários B23-08.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA; RENDERIZACAO.

**Rastreio:**
`src/components/documents/delivery-inbox.tsx;src/app/api/dashboard/route.ts;evidence/b28-professional-pending.txt;evidence/b28-professional-all.txt`.

**Reprodução:** CriarENTaceita; solicitarcancelamento; abrir /entregas como
destinatário no filtro inicial; compararTodas.

**Limites/contraprova:** Não desaparecimento de dados; registro acessível em
Todas/histórico; frequência humana não medida. Alta para o comportamento
delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Incluir consentimento pendente em fila
acionável ou filtro/tarefa explícita ligada ao alvo autorizado. Alternativas:
Ampliar estado pendente e identificar ação; atalho direto de notificação
complementa, mas não substitui fila encontrável.

**Dependências:** B2-002; B2-004; B2-015; consulta por capacidade; O04.
**Decisão:** Fila única por ação própria ou grupo explícito de consentimentos?

**Aceite futuro AC-B2-003:** Destinatário vê pedido aberto na fila/painel; abrir
leva ao documento exato; resolvido sai da fila.

**Não pode ocorrer:** Não mostrar consentimento a terceiro como tarefa
executável; nenhum documento terminal ou sem capacidade vaza.

## B2-004

ENT com consumo confirmado continua sem conseguir concluir cancelamento

**Domínio/processos:** Entrega e consumo; P-ENT-06; P-OCC-02; P-STK-04. P2,
DEFEITO; diagnóstico aberto.

**Hoje:** Aceitar2, confirmar consumo1 e consentir devolução1/consumo1
falha42702 por e.body ambíguo; nenhum efeito parcial persiste.

**Esperado:** Conciliação válida reconhece devolução e consumo anterior sem
duplicá-los. **Consequência:** Pedido permanece cancellation_pending apesar de
fatos físicos coerentes e pessoa autorizada.

**Causa sustentada:** Referência SQL ambígua no ramo de consumo positivo impede
atravessar conciliação. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b23-results.json](evidence/b23-results.json); cenários B23-09.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/audited_legacy_supply_command.sql;evidence/b23-results.json`.

**Reprodução:** Usar consumo extraordinário realmente confirmado no próprio
cenário após aceite2; tentar consent_cancel com retorno1/consumo1; comparar
versão, eventos e saldo.

**Limites/contraprova:** Atomicidade correta; subhipótese de vinculação temporal
do consumo ficou atrás do erro e não foi comprovada; sem contorno artificial.
Alta para o comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** A DB-001; mesma causa reexecutada com cadeia física e
consequência operacional; REVALIDACAO_A.

**Recomendação para fase autorizada:** Corrigir contrato técnico em fase
autorizada e verificar semântica de consumo elegível antes de liberar transição.
Alternativas: Preservar pendência com fato físico documentado; procedimento
excepcional precisa autoridade e história, sem consumo ou devolução fictícios.

**Dependências:** Auditoria especializada de banco/backend; consumo;
referências; concorrência; O03. **Decisão:** Confirmar que somente consumo
comprovado e elegível à entrega pode ser conciliado

**Aceite futuro AC-B2-004:** Retorno1/consumo1 conclui uma vez; eventos e
consumo originais permanecem; retry não duplica movimentos.

**Não pode ocorrer:** Não debitar consumo novamente, não fabricar saldo e não
aceitar soma diferente do aceito; erros não deixam efeito parcial.

## B2-005 — Correção de estoque familiar aceita ausência do movimento original

**Domínio/processos:** Estoque; P-STK-03; P-DOC-01. P2, DEFEITO; diagnóstico
aberto.

**Hoje:** Formulário exige referência, mas RPC e schema HTTP a tornam opcional;
correction_in sem referência grava family_manual/reference_idnull.

**Esperado:** Correção compensatória aponta fato original válido ou é
explicitamente classificada como entrada avulsa diferente. **Consequência:**
Auditor não consegue reconstruir qual erro foi compensado; controle prometido no
fluxo não é imposto na fronteira.

**Causa sustentada:** family_stock_movement valida p_reference apenas quando não
nulo; API repassa null. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b24-results.json](evidence/b24-results.json),
[b29-results.json](evidence/b29-results.json); cenários B24-03; B29-04. Classe:
TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`src/app/api/stock/movements/route.ts;evidence/contracts/family_stock_movement.sql;src/components/stock/stock-console.tsx`.

**Reprodução:** Enviar correction_in como admin autorizado omitindo referenceId
por RPC e HTTP; consultar movimento persistido.

**Limites/contraprova:** Não bypass de permissão; entrada familiar avulsa já é
legítima; HTTP201 comprovado, read-back retomado sem snapshot anterior. Alta
para o comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Alinhar validação por ação e exigir
vínculo de compensação na API/banco, com mensagem de recuperação. Alternativas:
Separar claramente ajuste inicial/avulso de correção e evitar rotular entrada
sem referência como compensação.

**Dependências:** Unidades/precisão; saldo; capacidade; O09. **Decisão:** Qual
fato cada ação significa e quais referências podem receber compensação múltipla?

**Aceite futuro AC-B2-005:** Correção exige movimento da mesma
residência/produto/escopo; origem e compensações são reencontráveis; avulsa
legítima continua.

**Não pode ocorrer:** Recusar referência ausente, alheia ou inválida; sem
editar/apagar ledger; sem arredondamento ou saldo negativo.

## B2-006

Conversão de embalagem não conserva como a quantidade base foi obtida

**Domínio/processos:** Catálogo e quantidades; P-CAT-03; P-COM-01; P-ENT-01. P3,
OPORTUNIDADE; diagnóstico aberto.

**Hoje:** Lookup conserva apresentação/fator, mas linha emitida pelo wizard não
guarda código, número de embalagens ou equivalência usada; metadata observada
vazia.

**Esperado:** Quando apresentação for usada, pessoa consegue conferir cálculo
original depois que cadastro mudar. **Consequência:** Revisão posterior depende
de memória/anexo; mesma quantidade base não explica dois pacotes ou vinte
unidades soltas.

**Causa sustentada:** Conversão em scan atualiza quantidade, sem transportar
proveniência ao payload emitido. Prioridade: Rastreabilidade/eficiência pode
melhorar; fato central e saldo permanecem disponíveis.

**Prova:** [b24-results.json](evidence/b24-results.json); cenários B24-05.
Classe: TESTE_LOCAL_LOOKUP; PERSISTENCIA; LEITURA_ESTATICA_DO_CONSUMIDOR.

**Rastreio:**
`src/components/documents/supply-wizard.tsx;src/app/api/catalog/presentations/route.ts;evidence/b24-results.json`.

**Reprodução:** Cadastrarfator10; consultar apresentação; emitirCOM20base;
alterarfator12; inspecionar metadata da linha e consumidor scan.

**Limites/contraprova:** Nenhuma leitura de câmera real; linha20foi enviada
por RPC; ausência de proveniência no scanner é sustentada por fonte; saldo
histórico não foi reinterpretado. Alta para o comportamento delimitado;
frequência/impacto humano não medidos.

**Relação histórica:** Amplia B1-FORM-005 com proveniência operacional; causa de
persistência distinta da gestão visual; NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Avaliar snapshot opcional de apresentação
usada e resumo explícito embalagens×fator=base. Alternativas: Confirmar
quantidade base manual com equivalência visível e anotação identificada; não
criar módulo novo antes de necessidade.

**Dependências:** B1-FORM-005; unidades imutáveis; precisão; O08. **Decisão:**
Quais operações precisam guardar apresentação original para conferência?

**Aceite futuro AC-B2-006:** Dois pacotes×10 mantêm20base e fator original
depois de cadastro12; seleção manual sem código continua possível.

**Não pode ocorrer:** Sem converter unidade não equivalente, arredondar
silenciosamente ou aplicar fator atual a documento passado.

## B2-007 — Produto inativo com saldo não tem percurso próprio de esgotamento

**Domínio/processos:** Catálogo e estoque; P-CAT-01; P-STK-04; P-OCC-01;
P-BAL-04. P2, LACUNA; diagnóstico aberto.

**Hoje:** Inativar comFAMILY4/TEAM4 mantém saldo visível, mas novas linhas de
consumo/BAL são recusadas por produto inativo; reativar funciona.

**Esperado:** Inativação define o que fazer com saldo/tarefas remanescentes sem
perder história ou presumir descarte. **Consequência:** Família pode precisar
reativar cadastro para registrar fato real; inventário digital e retirada de uso
ficam sem decisão explícita.

**Causa sustentada:** Flag de catálogo governa elegibilidade de novas operações,
sem estado/processo de destinação do saldo existente. Prioridade: Pendência ou
decisão operacional fica incompleta/inconsistente no estado demonstrado; sem
bypass ou perda generalizada comprovados.

**Prova:** [b24-results.json](evidence/b24-results.json); cenários B24-06.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/admin_upsert_recipient_product.sql;evidence/contracts/report_extraordinary_consumption.sql;evidence/contracts/v3_create_supply_document.sql`.

**Reprodução:** Criar saldo em ambas custódias; inativar; consultarvisibilidade;
tentar consumo/contagem; reativar explicitamente.

**Limites/contraprova:** Saldo não sumiu nem foi zerado; destino físico/humano
não verificado; inativação em si pode ser regra desejada. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Definir significado de retirada de uso e
oferecer prévia/encaminhamento do saldo, tarefas e eventual reativação.
Alternativas: Aviso e procedimento explícito podem bastar; ou estado de
esgotamento com operações limitadas se a família precisar.

**Dependências:** Política catálogo; unidade; BAL/consumo; O12. **Decisão:**
Inativo bloqueia tudo ou permite apenas destinação dos remanescentes?Quem atesta
o fato físico?

**Aceite futuro AC-B2-007:** Saldo e história preservados; destinação tem
autor/motivo; lista informa inatividade; reativação é explícita.

**Não pode ocorrer:** Não zerar, somar a outro produto ou inferir
consumo/descarte; não liberar uso novo indevido.

## B2-008

Histórico de estoque não conduz igualmente às origens de recibo, BAL e consumo

**Domínio/processos:** Estoque e história; P-STK-05; P-DOC-04. P3, OPORTUNIDADE;
diagnóstico aberto.

**Hoje:** Movimentos têm reference_type/id de purchase_receipt, bal,
consumption; ação de navegação do consumidor favorece reference_type=document.

**Esperado:** Leitor autorizado identifica e consulta origem de cada fato sem
copiar IDs entre telas. **Consequência:** Explicar variação de saldo exige
cruzamento manual; fato existe, mas sua prova fica menos alcançável.

**Causa sustentada:** Renderização de referência trata documento genérico sem
resolver todos os tipos de origem. Prioridade: Rastreabilidade/eficiência pode
melhorar; fato central e saldo permanecem disponíveis.

**Prova:** [b24-results.json](evidence/b24-results.json),
[b26-results.json](evidence/b26-results.json); cenários B24-01; B26-11. Classe:
LEITURA_ESTATICA; PERSISTENCIA_DAS_REFERENCIAS.

**Rastreio:**
`src/components/stock/stock-console.tsx;evidence/contracts/stock_history.sql;evidence/contracts/credit_purchase_receipt.sql;evidence/contracts/apply_bal.sql`.

**Reprodução:** Comparar referências dos créditos COM/ajustes BAL/consumo com
regra de links do histórico.

**Limites/contraprova:** Não perda de referências nem falha de persistência;
interação de todos os links não foi automatizada nesta B2. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Relaciona B1-UX-006/A UX-009; novo recorte de navegação
por origem do ledger; NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Resolver origem por tipo e capacidade,
com rótulo legível e retorno ao filtro existente. Alternativas: Mostrar
código/motivo sem link se não houver capacidade; completar detalhe de consumo em
vez de novo painel.

**Dependências:** B2-017; B1-UX-006; autorização da origem; O09. **Decisão:**
Que detalhe cada público pode consultar sem ampliar acesso à família?

**Aceite futuro AC-B2-008:** Cada referência abre origem exata autorizada ou
explica restrição; contexto e filtros são preservados.

**Não pode ocorrer:** Não tratar receiptIDcomo documentID, nem revelar COM a
leitor de equipe; nenhuma permissão inferida do link.

## B2-009 — Supervisor pode aprovar a própria contagem no regime BAL anterior

**Domínio/processos:** Balanço; P-BAL-01; P-BAL-05. P2, DEFEITO; diagnóstico
aberto.

**Hoje:** BALlegado com revisão required/supervisor/any foi contado e aprovado
pelo mesmo supervisor por RPC; agendado equivalente recusou42501.

**Esperado:** Revisão manual prometida como independente exclui quem contou em
todos os regimes. **Consequência:** A contagem pode receber ajuste aprovado sem
segunda pessoa, apesar do controle exibido na UI.

**Causa sustentada:** Guard de identidade distinta examina balanceContext do
regime agendado; modo anterior não possui esse contexto; UIoculta ação própria
mas banco aceita. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b25-results.json](evidence/b25-results.json); cenários B25-01;
B25-13. Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/supply_document_command.sql;evidence/contracts/fluent_pre_shift_command.sql;evidence/contracts/audited_legacy_supply_command.sql`.

**Reprodução:** Usar supervisor real com capacidade de contar; configurar
required supervisorany sem ativação porplantão; criar BAL; tentaraprovar
próprioID.

**Limites/contraprova:** Sem override ou falsificação; regime agendado protegeu
corretamente; optional não significa revisão manual própria. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Uniformizar regra de identidade do
contador/revisor e versões reais de reconto em API/banco. Alternativas:
Conservar
modo anterior com guard equivalente; decidir explicitamente exceções de política
sem depender da UI.

**Dependências:** Política capturada; count_version; reconto; backend/RLS.
**Decisão:** A independência é universal ou há exceção explícita de política que
precisa ser comunicada?

**Aceite futuro AC-B2-009:** Contador de qualquer versão não revisa a própria
contagem nos modos aplicáveis; revisor distinto conclui e aplica uma vez.

**Não pode ocorrer:** Não remover regime para esconder defeito, não reutilizar
aprovação antiga nem confundir optional com autoaprovação manual.

## B2-010 — Consumo só textual não pode ser complementado para confirmação

**Domínio/processos:** Ocorrências e consumo; P-OCC-01; P-OCC-02. P2, LACUNA;
diagnóstico aberto.

**Hoje:** Relato consumptioncom lines=[]é aceito e fica reported; confirmar
falha structured confirmation required; não há complemento preservando
encadeamento.

**Esperado:** Relato que precisa debitar tem caminho para obter quantidades e
decisão sem perder sua origem. **Consequência:** Rejeitar e redigitar são saídas
parciais; confirmador não consegue concluir aquele relato quando apura a
quantidade depois.

**Causa sustentada:** Contrato permite estrutura opcional no relato, mas
confirmação exige linhas e não oferece ação de esclarecimento. Prioridade:
Pendência ou decisão operacional fica incompleta/inconsistente no estado
demonstrado; sem bypass ou perda generalizada comprovados.

**Prova:** [b25-results.json](evidence/b25-results.json); cenários B25-04.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`src/app/api/consumption/route.ts;evidence/contracts/report_extraordinary_consumption.sql;evidence/contracts/confirm_extraordinary_consumption.sql`.

**Reprodução:** Relatar consumo só textual como profissional; confirmador
autorizado tenta aceitar; examinar ações API/UI e estado reported.

**Limites/contraprova:** Proteção contra débito ambíguo é correta; falta sem
linhas pode ser confirmada sem saída; não generalizar a todo relato. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Separar ocorrência sem débito ou criar
complemento identificado; definir quem atesta quantidades. Alternativas: Exigir
estrutura no consumo que pretende débito; ou ligar relato estruturado substituto
ao original sem editar texto passado.

**Dependências:** B2-011; O05; capacidade/custódia; histórico. **Decisão:**
Autor ou confirmador pode complementar e precisa nova confirmação do autor?

**Aceite futuro AC-B2-010:** Texto original continua consultável; quantidades
têm autor/data; confirmação única após esclarecimento autorizado.

**Não pode ocorrer:** Não interpretar texto como débito automático, não apagar
relato original nem permitir confirmação sem saldo/estrutura.

## B2-011 — Decisão oposta de consumo recebe sucesso sem ser aplicada

**Domínio/processos:** Ocorrências e concorrência; P-OCC-02; P-DOC-01. P2,
DEFEITO; diagnóstico aberto.

**Hoje:** Depois de confirmed, rejeição por outro admin retornaHTTP200/data:
null e mantém confirmed; mesma decisão repetida também retorna sem nova saída.

**Esperado:** Distinguir recuperação da mesma decisão de conflito de intenção
contrária, informando fato vigente. **Consequência:** Segundo confirmador pode
acreditar que rejeitou consumo ainda efetivo no estoque.

**Causa sustentada:** confirm_extraordinary_consumption retorna sem
resultado/erro para todo estado diferente de reported, sem comparar decisão;
UIinterpreta sucesso. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b25-results.json](evidence/b25-results.json),
[b29-results.json](evidence/b29-results.json); cenários B25-05; B25-06; B29-05.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/confirm_extraordinary_consumption.sql;src/app/api/consumption/route.ts;src/components/stock/consumption-console.tsx`.

**Reprodução:** Confirmarrelatoestruturado; segundo admin envia accept: false
por HTTP; relerstatus, movimentos e resposta.

**Limites/contraprova:** Nenhum débito duplicado ou estorno; corrida simultânea
oposta é risco não reproduzido aqui; prova sequencial suficiente para resposta
contraditória. Alta para o comportamento delimitado; frequência/impacto humano
não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Retornar resultado explícito da decisão e
conflito em intenção oposta; preservar idempotência da mesma intenção.
Alternativas: Exibir decisão vigente ao reconsultar e impedir feedbackdeoperação
concluída para intenção não aplicada.

**Dependências:** Backend/API; UXfeedback; O05. **Decisão:** Se fato confirmado
estava errado, qual procedimento compensatório separado deve ser usado?

**Aceite futuro AC-B2-011:** Retry igual recupera autor/data/decisão; oposto
retorna conflito legível com estado atual; zero novo movimento.

**Não pode ocorrer:** Não alternar confirmed/rejected retroativamente, não
estornar silenciosamente e não chamar rejeição de realizada.

## B2-012 — Adiamento BAL obsoleto permanece pendente e nem pode ser recusado

**Domínio/processos:** BAL e escala; P-BAL-06; P-SCH-05; P-NTF-01. P2, DEFEITO;
diagnóstico aberto.

**Hoje:** Atualizar nota/version do destino deixa deferralpending com origem
válida; refreshnãoinvalida; decide reject também falha stale target; contagem
posterior torna stale.

**Esperado:** Pedido inválido sai da fila ou admite rejeição segura sem aplicar
destino antigo. **Consequência:** Família recebe tarefa que não consegue
decidir; pedido pendente não suspende prazo original.

**Causa sustentada:** process_bal_patient retorna ao encontrar atribuição
original válida antes de limpar destino obsoleto; decisão valida alvo até para
rejeição. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b25-results.json](evidence/b25-results.json); cenários B25-11;
B25-13. Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/process_bal_patient.sql;evidence/contracts/balance_command.sql`.

**Reprodução:** Pediradiamento; alterarapenasnota do plantãodestino; refresh;
famíliatentarejeitar; compararestado e prazo.

**Limites/contraprova:** Não houve adiamento indevido; origem continuou válida;
obsolescência limpa após contagem; sem prova de todas corridas do scheduler.
Alta para o comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Reconciliar validade antes de publicar
tarefa ou permitir recusa independente do destino, com evento de motivo.
Alternativas: Marcar stale prontamente e solicitar novo pedido; preservar
cumprimento original enquanto família decide.

**Dependências:** B2-014; scheduler; versões; O06. **Decisão:** Pedido stale
deve encerrar automaticamente ou exigir ciência/decisão familiar informada?

**Aceite futuro AC-B2-012:** Mudança de destino obsoleta pedido, retira ação
inexequível e conserva prazo original; aprovação antiga recusada.

**Não pode ocorrer:** Não aplicar intervalo antigo, não adiar por mudança de
agenda nem apagar solicitação histórica.

## B2-013 — Aprovação posterior republica plantões além do corte da série

**Domínio/processos:** Escalas; P-SCH-02; P-SCH-03; P-BAL-03. P2, DEFEITO;
diagnóstico aberto.

**Hoje:** Propor, end_series e aprovar versão atual muda ocorrências cancelled
após corte para published enquanto ended_on permanece.

**Esperado:** Aprovação respeita corte ou recusa série já encerrada; histórico
de programação continua coerente. **Consequência:** Volta a haver cobertura
programada que gestor havia encerrado; possível efeito futuro em atribuição BAL.

**Causa sustentada:** Ramo approve atualiza ocorrências propostas/canceladas sem
impor limite ended_on. Prioridade: Pendência ou decisão operacional fica
incompleta/inconsistente no estado demonstrado; sem bypass ou perda generalizada
comprovados.

**Prova:** [b26-results.json](evidence/b26-results.json); cenários B26-06.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/schedule_command.sql;src/lib/validation/schedules.ts`.

**Reprodução:** Propor3plantões; encerrar a partir dosegundo; aprovar com versão
atual; consultar ended_on, status e ocorrências.

**Limites/contraprova:** Sequência aceita por API/RPC; UI atual só oferece
encerrar série publicada; BALderivado não reproduzido; sem alegação de presença.
Alta para o comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** A DB-003; revalidação local e consequência sobre
expectativa de cobertura; REVALIDACAO_A.

**Recomendação para fase autorizada:** Revalidar estado/corte ao aprovar e
manter eventos de decisão; apresentar impacto antes da confirmação.
Alternativas: Recusar aprovação de encerrada e exigir nova série explícita; ou
publicar apenas até corte se a política permitir.

**Dependências:** A UX-001/B1-UX-001P1; BAL; concorrência; O06. **Decisão:**
Encerrada pode aprovar parte anterior ou deve ser terminal para proposta?

**Aceite futuro AC-B2-013:** Após corte nenhum plantão futuro volta a published
por aprovação repetida/concorrente; versão e motivos mantidos.

**Não pode ocorrer:** Não apagar cancelled, desfazer corte silenciosamente ou
gerar responsabilidades BAL sobre ocorrências indevidamente restauradas.

## B2-014

Substituição durante reconto pode deixar tarefa sem contador executável

**Domínio/processos:** Escala e balanço; P-SCH-05; P-BAL-04; P-BAL-05; P-OPS-02.
P2, LACUNA; diagnóstico aberto.

**Hoje:** No reconto formal de ciclo counted, troca de pessoa no mesmo horário
invalida assignment e refreshnão cria sucessor; assign_recount por revisor
recupera.

**Esperado:** Troca torna explícita a necessidade e o responsável por designar
novo reconto, ou transfere em condições formalmente seguras. **Consequência:**
BAL permanece submitted até revisor perceber que substituto não tem atribuição
executável.

**Causa sustentada:** Revalidação invalida pessoa anterior; processamento sai do
ciclo counted sem transferência prevista no ciclo open. Prioridade: Pendência ou
decisão operacional fica incompleta/inconsistente no estado demonstrado; sem
bypass ou perda generalizada comprovados.

**Prova:** [b26-results.json](evidence/b26-results.json); cenários B26-09;
B26-10; B26-11. Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/process_bal_patient.sql;evidence/contracts/balance_command.sql;evidence/contracts/bal_assign.sql`.

**Reprodução:** Manter recontoactiveem ciclojácounted;
substituirprofissionalmesmaintervalo; refresh; consultarassignment;
revisordesigna outro; substitutoconta.

**Limites/contraprova:** Não generalizar a ciclo open/draft; recuperação manual
existente funcionou; não demonstrada perda definitiva de contagem. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** Nenhuma causa equivalente identificada nos 32 A/35B1;
NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Exibir impacto e encaminhar tarefa de
nova designação ao revisor; automatizar só após regra de sucessão definida.
Alternativas: Aviso com link assign_recount já existente; transferência
explícita do revisor sem alterar autor original.

**Dependências:** B2-012; B2-015; UXdecisão; O06/O07. **Decisão:** Transferir
automaticamente ou exigir revisor; como comunicar intervalo sem responsável?

**Aceite futuro AC-B2-014:** Substituto sabe se pode contar; revisor recebe ação
precisa; novo contador e autor original preservados; review por versão.

**Não pode ocorrer:** Não permitir contador anterior revogado, nem transferir
assinatura, horário ou revisão familiar implicitamente.

## B2-015 — Revogação de recebedor de ENT parcial não possui sucessão formal

**Domínio/processos:** Pessoas e custódia; P-ACC-07; P-ENT-05; P-ENT-06;
P-OPS-02. P2, LACUNA; diagnóstico aberto.

**Hoje:** Revogação remove acesso corretamente; ENTsem aceite reatribui, mas
parcial não admite reassign, aceite administrativo ou consentimento do sucessor.

**Esperado:** Retirar acesso prontamente e encaminhar conciliação dos fatos
futuros a pessoas identificadas, sem assinar pelo anterior. **Consequência:**
Recebimento restante/cancelamento pode ficar bloqueado depois de desligamento
legítimo.

**Causa sustentada:** Consentimento e reatribuição protegem pessoa original;
falta processo para transferência documentada de responsabilidade futura.
Prioridade: Pendência ou decisão operacional fica incompleta/inconsistente no
estado demonstrado; sem bypass ou perda generalizada comprovados.

**Prova:** [b27-results.json](evidence/b27-results.json); cenários B27-05;
B27-06; B27-07; B27-08. Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`evidence/contracts/admin_set_membership_status.sql;evidence/contracts/audited_legacy_supply_command.sql;evidence/contracts/accept_invitation.sql`.

**Reprodução:** PrepararENTparcialcom1aceito/1transito; revogarrecebedor;
tentarreassign/aceiteadmin/consentsucessor; compararENTsemaceite e
outropaciente.

**Limites/contraprova:** Salvaguardas corretas; sem apagamento; profissional
fictícia foi reativada só para outros testes, não como solução universal;
compensação física exige decisão humana. Alta para o comportamento delimitado;
frequência/impacto humano não medidos.

**Relação histórica:** Amplia B1-FORM-006 além do editor: consequência em
trabalho parcial; causa de sucessão distinta; NOVA_CAUSA_B2.

**Recomendação para fase autorizada:** Inventário de tarefas ao desligar e
contrato explícito de sucessão de conferências futuras, com conciliação
excepcional quando necessária. Alternativas: Prévia/lista de pendências e
decisão local com evidência; termo de transferência sem reescrever aceite
original.

**Dependências:** B2-002; B2-004; B2-014; autoridade porpaciente; O07.
**Decisão:** Quem atesta restante físico após saída e quem autoriza sucessão de
custódia?

**Aceite futuro AC-B2-015:** Revogação imediata preserva outro paciente e
história; ENTparcial tem encaminhamento claro com identidades próprias.

**Não pode ocorrer:** Não atrasar revogação urgente, reativar silenciosamente,
impersonar anterior, zerar saldo ou fabricar estorno.

## B2-016 — Reservas de anexo abandonadas esgotam o limite sem arquivos prontos

**Domínio/processos:** Documentos e continuidade; P-DOC-02; P-OPS-04. P2,
DEFEITO; diagnóstico aberto.

**Hoje:** Dez reservas novas sem upload permanecem quarantine e consomem
limite10; décima primeira é recusada; nenhum arquivo ready nesse alvo.

**Esperado:** Tentativas abandonadas têm ciclo de recuperação/expiração que não
bloqueia indefinidamente comprovante legítimo. **Consequência:** Pessoa pode
perder capacidade de anexar evidência embora não existam dez anexos válidos.

**Causa sustentada:** Contagem do limite inclui reservas não rejeitadas, sem
saída de abandono/expiração identificada. Prioridade: Pendência ou decisão
operacional fica incompleta/inconsistente no estado demonstrado; sem bypass ou
perda generalizada comprovados.

**Prova:** [b28-results.json](evidence/b28-results.json); cenários B28-07.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`src/app/api/attachments/route.ts;evidence/b28-probe.mjs;evidence/b28-results.json`.

**Reprodução:** EmREQfictícia reservardezanexoscomchavesdistintassemupload;
tentar11º; consultarestados.

**Limites/contraprova:** Retry com chave conhecida consegue retomar; não
executada limpeza, expiração ou sobrescrita; abandono por usuário simula
interrupção antes de arquivo. Alta para o comportamento delimitado;
frequência/impacto humano não medidos.

**Relação histórica:** A DB-004 revalidado; B1-ERR-001 é consequência visual
correlata, sem fundir causas; REVALIDACAO_A.

**Recomendação para fase autorizada:** Definir ciclo de reserva com consulta por
chave, prazo/abandono e retenção auditável compatível com upload concorrente.
Alternativas: Primeiro facilitar consulta/retomada; procedimento autorizado para
reserva antiga até política implementada.

**Dependências:** Storage/backend; B1-ERR-001; limites/abuso; O13. **Decisão:**
Quando considerar abandono, quem pode cancelar e quais metadados permanecem?

**Aceite futuro AC-B2-016:** Reservas abandonadas não bloqueiam para sempre;
retry idêntico e upload em andamento preservados; história da liberação
verificável.

**Não pode ocorrer:** Não apagar ready, não expor URLassinada, não liberar
reserva concorrente ativa e não aumentar limite sem tratar ciclo.

## B2-017

Pendência antiga de consumo não é alcançada pelo contador ou referência

**Domínio/processos:** Consumo e consulta; P-OCC-01; P-OCC-02; P-DOC-04;
P-NTF-01. P2, DEFEITO; diagnóstico aberto.

**Hoje:** Após100relatosposteriores, alvoreportedfica fora da API(limit100),
mesmo comref; dashboardmostra102pendentes; alvo permanece no banco.

**Esperado:** Toda pendência autorizada e referência individual continuam
recuperáveis além da janela recente. **Consequência:** Pessoa vê trabalho no
painel/aviso, mas não encontra registro para decidir; acúmulo pode persistir
indefinidamente.

**Causa sustentada:** Lista recente limitada foi usada como fila completa; sem
cursor/status/detalheID; consumerignora ref. Prioridade: Pendência ou decisão
operacional fica incompleta/inconsistente no estado demonstrado; sem bypass ou
perda generalizada comprovados.

**Prova:** [b29-results.json](evidence/b29-results.json); cenários B29-06.
Classe: TESTE_LOCAL; PERSISTENCIA; LEITURA_ESTATICA.

**Rastreio:**
`src/app/api/consumption/route.ts;src/components/stock/consumption-console.tsx;src/lib/notifications/navigation.ts;src/app/api/dashboard/route.ts`.

**Reprodução:** Relatarfaltapendente; criar100posterioressemdebitarestoque;
GETcomref; compararcontador e SQLdoalvo.

**Limites/contraprova:** Sem perda de dados; UIcemlinhas não foi renderizada;
navegação estática acompanha API; novo loteB2executado comAuthreal. Alta para o
comportamento delimitado; frequência/impacto humano não medidos.

**Relação histórica:** A BE-001; B1-UX-007; execução de volume independente
nesta B2; REVALIDACAO_A.

**Recomendação para fase autorizada:** Fila paginada/filtro de pendentes e
detalheIDautorizado; resolverrefindependente da página atual. Alternativas:
Priorizar pendentes com navegação completa e explicar janela; suporte autorizado
localiza até correção, sem alterar saldo.

**Dependências:** Backend/consulta; B1-UX-007; A BE-004 correlação, escopo
distinto; O04/O09. **Decisão:** Quais filtros/ordenação atendem família sem
esconder pendentes antigas?

**Aceite futuro AC-B2-017:** Maisde100relatos: refabre alvo correto, cursor sem
salto/duplicação, total/escopo claro; estado atual fica acionável.

**Não pode ocorrer:** Sem carregar tudo, duplicar registros, expor outra
custódia/paciente ou resolver falta por débito; limite maior sozinho não
satisfaz.
