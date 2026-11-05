# ENT — expedição, recebimento pessoal e conciliação

AS_IS: /fichas/ent, /entregas e /fichas/:id, supplyCommandSchema e ledger de
FAMILY/CARE_TEAM/TRANSIT. Expedição e aceite são distintos; parcial positivo
credita destino. B2-002/003/004/015 e B3-002 delimitam cancelamento, fila e
sucessão falhos. TO_BE aplica DEC-005/006/007/013/022/028, sem assinatura
alheia.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ENT-01

  **Rota e situação:** /fichas/ent, atual a alterar

  **Objetivo e ações:** Preparar materiais/quantidades, custódias e recebedor;
  revisar e expedir.

- **Tela:** ENT-02

  **Rota e situação:** /entregas, atual a alterar

  **Objetivo e ações:** Ver todas as tarefas executáveis, inclusive
  consentimento de cancelamento; filtros e referência antiga.

- **Tela:** ENT-03

  **Rota e situação:** /fichas/:id, atual a alterar

  **Objetivo e ações:** Conferir tudo ou indicar divergências; ver trânsito,
  aceites e responsável.

- **Tela:** ENT-04

  **Rota e situação:** Diálogo de divergência, atual a alterar

  **Objetivo e ações:** Quantidade efetivamente recebida e ressalvas por
  linha; resumo antes da confirmação.

- **Tela:** ENT-05

  **Rota e situação:** Cancelamento/retirada/recusa, atual e novas ações

  **Objetivo e ações:** Registrar intenção e resolver desacordo com retorno de
  estado correto.

- **Tela:** ENT-06

  **Rota e situação:** Sucessão/exceção administrativa, novo painel

  **Objetivo e ações:** Redesignar tarefa futura ou encerrar exceção sem
  simular aceite físico.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Origem/destino

  **Tipo/origem por tela e estado:** ENT-01 Origem: EDITABLE
  (RADIO_OR_SELECT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ENT-03 Origem: READ_ONLY
  (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar edição do
  formulário de origem; ENT-01 Destino: EDITABLE (RADIO_OR_SELECT); Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; ENT-03 Destino: READ_ONLY (TEXT_VALUE); Estado de
  consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Obrigatoriedade/default na preparação:** ENT-01 Origem: Sim, contexto de
  intenção visível; ENT-03 Origem: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado;
  ENT-01 Destino: Sim, contexto de intenção visível; ENT-03 Destino: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ENT-01 Origem: FAMILY e CARE_TEAM distintos;
  autorização em cada direção; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-03 Origem:
  Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao
  usuário correção deste valor nesta tela. Estado de consulta/revisão da
  tarefa; não herdar edição do formulário de origem; ENT-01 Destino: FAMILY e
  CARE_TEAM distintos; autorização em cada direção; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  ENT-03 Destino: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Estado de
  consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Ajuda/exemplo:** ENT-01 Origem: “Da família para a equipe.”; ENT-03
  Origem: Mostra de onde os materiais desta entrega foram expedidos.; ENT-01
  Destino: “Da família para a equipe.”; ENT-03 Destino: Mostra o destino
  previsto. O crédito depende do recebimento pessoal pertinente.

- **Campo:** Material e quantidade expedida

  **Tipo/origem por tela e estado:** ENT-01 Material: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-03 Material:
  READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar
  edição do formulário de origem; ENT-01 Quantidade expedida: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; ENT-03 Quantidade expedida:
  READ_ONLY (QUANTITY_WITH_UNIT); Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Obrigatoriedade/default na preparação:** ENT-01 Material: Sim, vazio;
  ENT-03 Material: Valor emitido, proposto ou calculado da fonte identificada;
  ausência explicitamente informada, sem valor inventado; ENT-01 Quantidade
  expedida: Sim, vazio; ENT-03 Quantidade expedida: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado

  **Validação/unidade:** ENT-01 Material: Positivo/exato; saldo disponível na
  origem; unidade/fator junto; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-03 Material:
  Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao
  usuário correção deste valor nesta tela. Estado de consulta/revisão da
  tarefa; não herdar edição do formulário de origem; ENT-01 Quantidade
  expedida: Positivo/exato; saldo disponível na origem; unidade/fator junto;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ENT-03 Quantidade expedida: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Ajuda/exemplo:** ENT-01 Material: “3 unidades saem da família.”; ENT-03
  Material: Identificação do item registrado. A consulta não substitui o
  material ou reinterpreta sua unidade.; ENT-01 Quantidade expedida: “3
  unidades saem da família.”; ENT-03 Quantidade expedida: Quantidade
  registrada para a etapa indicada. Não é uma nova declaração de quantidade e
  não movimenta material ao ser consultada.

- **Campo:** REQs atendidas

  **Tipo/origem por tela e estado:** ENT-01 REQs atendidas: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-03 REQs
  atendidas: READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não
  herdar edição do formulário de origem

  **Obrigatoriedade/default na preparação:** ENT-01 REQs atendidas: Não,
  nenhuma; ENT-03 REQs atendidas: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** ENT-01 REQs atendidas: Mesmo paciente/produto,
  justificativa se várias necessidades; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; ENT-03
  REQs atendidas: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Estado de
  consulta/revisão da tarefa; não herdar edição do formulário de origem

  **Ajuda/exemplo:** ENT-01 REQs atendidas: Vincular não duplica material ou
  crédito.; ENT-03 REQs atendidas: Vínculos da expedição emitida; consultar
  uma REQ não altera o material ou o crédito.

- **Campo:** Recebedor

  **Tipo/origem por tela e estado:** ENT-01 Recebedor: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-03 Recebedor:
  READ_ONLY (TEXT_VALUE); Estado de consulta/revisão da tarefa; não herdar
  edição do formulário de origem

  **Obrigatoriedade/default na preparação:** ENT-01 Recebedor: Sim, sugestão
  pela escala se inequívoca; editável antes de emissão; ENT-03 Recebedor:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ENT-01 Recebedor: Pessoa vinculada/elegível; escala
  sugere; escolha manual pela família com exceção registrada P06; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; ENT-03 Recebedor: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Estado de consulta/revisão da tarefa; não herdar edição do formulário de
  origem

  **Ajuda/exemplo:** ENT-01 Recebedor: “Quem receberá fisicamente? Confirme a
  pessoa.”; ENT-03 Recebedor: Identifica a pessoa relacionada a este ato; não
  permite transferir sua autoria para quem consulta.

- **Campo:** Justificativa de troca

  **Tipo/origem por tela e estado:** ENT-01 Justificativa de troca: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ENT-06 Justificativa de troca: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ENT-01 Justificativa de troca: Se
  mudar destinatário fora da sugestão ou depois da preparação; ENT-06
  Justificativa de troca: Se mudar destinatário fora da sugestão ou depois da
  preparação

  **Validação/unidade:** ENT-01 Justificativa de troca: 3–1000;
  versão/instante preservados; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; ENT-06 Justificativa
  de troca: 3–1000; versão/instante preservados; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ENT-01 Justificativa de troca: “Outro profissional
  receberá os materiais.”; ENT-06 Justificativa de troca: “Outro profissional
  receberá os materiais.”

- **Campo:** Observações de expedição

  **Tipo/origem por tela e estado:** ENT-01 Observações de expedição: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ENT-01 Observações de expedição:
  Não, vazio

  **Validação/unidade:** ENT-01 Observações de expedição: Até 2000; não
  substitui ressalva de recebimento; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ENT-01 Observações de expedição: “Pacote fechado entregue
  para conferência.”

- **Campo:** Conferência integral

  **Tipo/origem por tela e estado:** ENT-03 Conferência integral:
  EXPLICIT_ACTION (EXPLICIT_CONFIRM_BUTTON); Somente recebedor; confirmação
  após resumo de TODAS as linhas

  **Obrigatoriedade/default na preparação:** ENT-03 Conferência integral: Sem
  concordância material inicial ou clique automático

  **Validação/unidade:** ENT-03 Conferência integral: Resumo de todas as
  linhas e quantidades; Somente recebedor; confirmação após resumo de TODAS as
  linhas

  **Ajuda/exemplo:** ENT-03 Conferência integral: “Confirmo que recebi os
  materiais listados.”

- **Campo:** Linhas com divergência

  **Tipo/origem por tela e estado:** ENT-04 Linhas com divergência: EDITABLE
  (LINE_CHECKBOX_GROUP); Selecionar apenas linhas da ENT exibida; nenhuma
  busca de produto novo

  **Obrigatoriedade/default na preparação:** ENT-04 Linhas com divergência:
  Não, lista vazia significa aceite integral após confirmação

  **Validação/unidade:** ENT-04 Linhas com divergência: Revisão mostra também
  linhas não selecionadas; Selecionar apenas linhas da ENT exibida; nenhuma
  busca de produto novo

  **Ajuda/exemplo:** ENT-04 Linhas com divergência: Selecione as linhas com
  diferença. Antes de confirmar, confira também as linhas indicadas como
  recebidas integralmente.

- **Campo:** Quantidade aceita

  **Tipo/origem por tela e estado:** ENT-04 Quantidade aceita: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ENT-04 Quantidade aceita: Sim
  nessas linhas, sem aceite implícito

  **Validação/unidade:** ENT-04 Quantidade aceita: De 0 ao ainda
  expedido/pendente; precisão da unidade; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ENT-04 Quantidade aceita: “Recebi 2 de 3 unidades.”

- **Campo:** Problema e ressalva

  **Tipo/origem por tela e estado:** ENT-04 Problema: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ENT-04 Ressalva: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ENT-04 Problema: Condicional à
  divergência; vazio, sem copiar ressalva de expedição; ENT-04 Ressalva:
  Opcional, salvo exigência específica do fato; vazio

  **Validação/unidade:** ENT-04 Problema: Problema da linha com diferença, até
  500 caracteres; obrigatório quando o fluxo exigir explicação da divergência;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; ENT-04 Ressalva: Ressalva própria do
  recebedor, até 1000 caracteres; não substitui quantidade aceita; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** ENT-04 Problema: “Uma unidade não chegou”; não inferir
  consumo.; ENT-04 Ressalva: “Uma unidade não chegou”; não inferir consumo.

- **Campo:** Resolução da diferença

  **Tipo/origem por tela e estado:** ENT-03 Resolução da diferença:
  EDITABLE_SUBFORM (DOMAIN_ACTION_CHOICES); Painel Resolver pendência por
  capacidade específica; nunca parte da confirmação pessoal comum

  **Obrigatoriedade/default na preparação:** ENT-03 Resolução da diferença:
  Sim ao conciliar

  **Validação/unidade:** ENT-03 Resolução da diferença: Quantidade positiva
  até pendência; motivo 3–1000; Painel Resolver pendência por capacidade
  específica; nunca parte da confirmação pessoal comum

  **Ajuda/exemplo:** ENT-03 Resolução da diferença: Recebido, devolvido e
  falta apurada têm efeitos diferentes. Abra a ação permitida e confira
  quantidade, motivo e custódias.

- **Campo:** Motivo do cancelamento

  **Tipo/origem por tela e estado:** ENT-05 Motivo do cancelamento:
  EDITABLE_SUBFORM (TEXTAREA); Só SOLICITAR; ao decidir pedido existente o
  motivo original é READ_ONLY

  **Obrigatoriedade/default na preparação:** ENT-05 Motivo do cancelamento:
  Sim, vazio

  **Validação/unidade:** ENT-05 Motivo do cancelamento: 3–1000 e versão atual;
  Só SOLICITAR; ao decidir pedido existente o motivo original é READ_ONLY

  **Ajuda/exemplo:** ENT-05 Motivo do cancelamento: “Solicitar cancelamento”,
  não “Cancelar tudo” após aceite.

- **Campo:** Devolvido e consumido

  **Tipo/origem por tela e estado:** ENT-05 Devolvido: EDITABLE_SUBFORM
  (DECIMAL_TEXT_INPUT); Só consentimento que declara devolução física;
  limitado pelo remanescente conciliável; ENT-05 Consumo já confirmado:
  CALCULATED (QUANTITY_WITH_REFERENCE); Consumo já confirmado com referência;
  nunca nova quantidade debitável

  **Obrigatoriedade/default na preparação:** ENT-05 Devolvido: Sim no
  consentimento aplicável; ENT-05 Consumo já confirmado: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado

  **Validação/unidade:** ENT-05 Devolvido: Compatíveis com aceites e consumo
  já confirmado; Só consentimento que declara devolução física; limitado pelo
  remanescente conciliável; ENT-05 Consumo já confirmado: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consumo já confirmado com referência; nunca nova
  quantidade debitável

  **Ajuda/exemplo:** ENT-05 Devolvido: Consumido antes não é debitado outra
  vez.; ENT-05 Consumo já confirmado: Resultado calculado a partir dos fatos
  desta tarefa, apresentado para conferência. Ele não pode ser digitado ou
  corrigido aqui.

- **Campo:** Motivo de retirada/recusa

  **Tipo/origem por tela e estado:** ENT-05 Motivo de retirada/recusa:
  EDITABLE_SUBFORM (TEXTAREA); Só recusa do recebedor/retirada do solicitante
  em pedido vigente

  **Obrigatoriedade/default na preparação:** ENT-05 Motivo de retirada/recusa:
  Sim na nova ação

  **Validação/unidade:** ENT-05 Motivo de retirada/recusa: 3–1000; vínculo à
  solicitação vigente; Só recusa do recebedor/retirada do solicitante em
  pedido vigente

  **Ajuda/exemplo:** ENT-05 Motivo de retirada/recusa: “Discordo: estes
  materiais permanecem recebidos.”

- **Campo:** Motivo de exceção

  **Tipo/origem por tela e estado:** ENT-06 Motivo de exceção: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ENT-06 Motivo de exceção: Sim ao
  encerrar administrativamente

  **Validação/unidade:** ENT-06 Motivo de exceção: Não admite caixa “recebi
  por outra pessoa”; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ENT-06 Motivo de exceção: “Não foi possível obter a
  declaração pessoal.”

- **Campo:** Ciência obrigatória pela expedição

  **Tipo/origem por tela e estado:** READ_ONLY_POLICY_NOTICE;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Regra permanente, independente de
  preferências; nenhum toggle, checkbox de desligamento ou override

  **Validação/unidade:** Expedição oficial de ENT vinculada por ator familiar
  habilitado gera SCI-005 na mesma transação; draft não gera; ator efetivo
  difere de created_by

  **Ajuda/exemplo:** Expedir a entrega vinculada registra a ciência do
  responsável familiar autorizado que realiza a expedição. Isso não confirma
  recebimento ou consumo.

- **Campo:** Buscar no conjunto autorizado

  **Tipo/origem por tela e estado:** SEARCH_INPUT;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Filtro opcional, vazio; não
  altera recurso ou contexto

  **Validação/unidade:** Termo aplicado ao tipo de dado da tela e à consulta
  autorizada; retorno conserva busca; não revelar outro paciente

  **Ajuda/exemplo:** Busque pelo nome ou referência apresentados nesta tarefa.
  Limpe a busca para voltar ao conjunto autorizado.

<!-- c-table:end -->

## Máquina de estados e pessoa responsável

Rascunho → expedida/em trânsito → recebida ou divergência → conciliação →
encerrada. Cancelamento é uma dimensão com
pedido/consentimento/recusa/retirada, não uma borracha da história. Preservar
estado anterior no pedido para retornar a ele quando retirado/recusado,
revalidando fatos ocorridos durante a espera.

Expedir debita origem e credita trânsito na mesma transação. Aceite pessoal
positivo debita trânsito e credita destino uma vez; zero aceita nada e
conserva pendência. Linhas não marcadas em divergências são integralmente
aceitas só quando o recebedor confirma resumo completo. Não chamar 2/3
unidades aceitas de “linha integralmente conferida”; atendimento REQ e
encerramento ENT diferem.

Antes de emitir, família indica pessoa sugerida pela agenda, podendo editar.
Após emitir e antes do fato físico, reassign existente deve invalidar desafios
e exigir motivo/versão; não reescrever emissão original. Se outra pessoa já
recebeu de fato, procedimento corretivo preserva declaração e identifica quem
recebeu; admin não toma seu lugar. Casos sem identidade elegível seguem P06 e
contingência, sem fabricar assinatura.

Depois de aceite, pedir cancelamento não estorna. Recebedor competente pode
consentir com conciliação, recusar formalmente; solicitante pode retirar.
Decisões concorrentes usam versão e chave do pedido; segunda ação oposta
conflita, repetição igual recupera. O SQL deve considerar consumo confirmado
anterior e devolução real, corrigindo C-CAUSE-050 sem duplicar baixa/retorno.

## Desligamento e transferência bilateral

Revogação sempre imediata. Mostrar antes as tarefas e oferecer regularização
sem condicionar revogação. Aceites históricos ficam da pessoa original. Novo
profissional pode assumir conferências futuras legitimamente designadas, não
aceitar o passado em nome dela. Parcial irrecuperável admite encerramento
administrativo motivado, com situação física desconhecida explícita e saldo
conciliado apenas por fatos comprovados/compensação autorizada referenciada.

P07 aprovou transferência simples preferencialmente no motor ENT: declaração
do iniciador, concordância da contraparte e aceite do recebedor real são fatos
distintos quando as pessoas diferem. Se a mesma pessoa faz dois atos, resumo e
eventos mantêm seus significados. Devolução física pode seguir esse percurso;
compra, consumo, abertura e compensação permanecem próprios. A UI antiga só é
retirada após equivalência/regressões demonstradas na D.

## Recuperação, comunicação e provas

Chave estável por expedição/recebimento/resolução/pedido; versão do estado
apresentado. Resposta perdida recupera o mesmo ato e quantidades; saldo
negativo, revogação, paciente trocado e versão antiga recusam sem efeitos
parciais. Revisão salva e expedição recusada têm resposta por etapa. Estado
uncertain proíbe mudar recebedor/conteúdo da tentativa até conciliar.

Fila padrão inclui a tarefa certa do destinatário: receber, decidir pedido ou
resolver divergência, com próximo responsável. PDF mostra autores, emissão
real, ressalvas/avaria, parcelas aceitas, returned/missing/received e natureza
administrativa de exceção. Aviso de cancelamento concluído não pede consentir.
Aplicar estados comuns, foco de retorno e layout de quantidades em móvel/AT.

Aceites: profissional escalado diferente não aceita sem ser recebedor;
admin/global não aceitam por ela; 3 expedidos e 2 aceitos conservam 1 em
trânsito; consumo 1 e devolução 1 não debitam consumo 2; recusar/retirar
pedido mantém fatos; revogar parcial não bloqueia segurança nem cria
assinatura substituta; duas REQs vinculadas não duplicam crédito. Familiares e
recebedor explicam o resumo, inclusive cenário sem escala e assinatura
indisponível, antes do GO.

## Atualização vinculante C7–C10

P06 foi aprovado: sugestão de escala editável pela família para pessoa
vinculada/elegível com motivo. Aceite físico pessoal permanece indelegável.
P07 aprova interface simples preferencialmente ENT; antiga devolução só sai
após equivalência demonstrada. P05 exige dossiê/PDF de regularização sem
simular assinatura de desligado.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

SCI-005 é invariável na expedição oficial concluída por familiar habilitado:
REQ/material, ENT/versão, ator efetivo e instante. Nenhum toggle ou
preferência a desliga. Criador de draft não define o ator. Sem autoridade
familiar, não inventar ciência nem atribuí-la a terceiro; expedição legítima e
pendência familiar permanecem fatos separados. A
[política vinculante](../C7-decision-closure/SCIENCE_OWNER_REVIEW.md)
prevalece.

ENT-03 confirma recebimento pessoal com origem/destino/material/expedido/
unidade/recebedor/vínculos em leitura. Conferência integral é ação explícita,
não texto livre. ENT-04 edita somente a declaração própria de aceito/problema/
ressalva e mostra todas as linhas antes da confirmação. Conciliação tem
painel/capacidade próprios; não edita a expedição no aceite.

ENT-05 mostra consumo confirmado como referência calculada, não input de novo
débito. Motivo do pedido é leitura ao decidir; motivo da decisão é autoral.
