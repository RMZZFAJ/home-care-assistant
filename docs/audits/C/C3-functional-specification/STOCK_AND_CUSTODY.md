# Estoque, custódia e correções referenciadas

AS_IS: /estoque, StockConsole, /api/stock/balances e movements, ledger
stock_movements, views por capacidade. FAMILY/CARE_TEAM/TRANSIT são distintos;
B3/B4 demonstram integridade concorrente e desvios de referência/precisão.
TO_BE preserva movimentos oficiais, DEC-007/013/015, O09/O12 e P07/P15.

## Telas e campos

<!-- c-table:start -->

- **Tela:** EST-01

  **Rota e situação:** /estoque, atual a alterar

  **Objetivo e ações:** Saldos confirmados por custódia, trânsito e previsão
  separados; atualizar sem apagar painel válido.

- **Tela:** EST-02

  **Rota e situação:** Movimento familiar no estoque, atual a alterar

  **Objetivo e ações:** Entrada, retirada ou compensação referenciada; revisar
  e registrar.

- **Tela:** EST-03

  **Rota e situação:** Histórico de movimentos, atual a alterar

  **Objetivo e ações:** Filtros, origem autorizada, autor e antes/depois;
  recuperar item antigo.

- **Tela:** EST-04

  **Rota e situação:** Transferência simples, novo painel

  **Objetivo e ações:** Selecionar origem/destino e pessoa; processo
  condicional P07 vinculado à ENT.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Custódia consultada

  **Tipo/origem por tela e estado:** EST-01 Custódia consultada: FILTER
  (AUTHORIZED_CUSTODY_FILTER); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade

  **Obrigatoriedade/default na preparação:** EST-01 Custódia consultada: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material

  **Validação/unidade:** EST-01 Custódia consultada: Filtro tipado da
  seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar

  **Ajuda/exemplo:** EST-01 Custódia consultada: “Disponível na equipe”, não
  “Estoque total” indiscriminado.

- **Campo:** Material

  **Tipo/origem por tela e estado:** EST-02 Material: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; EST-04 Material:
  EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Material: Sim ao
  movimentar; EST-04 Material: Sim ao movimentar

  **Validação/unidade:** EST-02 Material: Ativo para nova operação normal;
  inativo tem caminho específico; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura; EST-04
  Material: Ativo para nova operação normal; inativo tem caminho específico;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-02 Material: Unidade e precisão visíveis.; EST-04
  Material: Unidade e precisão visíveis.

- **Campo:** Ação

  **Tipo/origem por tela e estado:** EST-02 Ação: EDITABLE (RADIO_OR_SELECT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Ação: Sim, escolha
  explícita

  **Validação/unidade:** EST-02 Ação: Direção não inferida de sinal negativo;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-02 Ação: “Retirar 1 unidade do estoque familiar.”

- **Campo:** Quantidade

  **Tipo/origem por tela e estado:** EST-02 Quantidade: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; EST-04 Quantidade: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Quantidade: Sim, vazio;
  EST-04 Quantidade: Sim, vazio

  **Validação/unidade:** EST-02 Quantidade: Positiva, finita, até 1 bilhão,
  até 6 casas e precisão do produto antes de coerção; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  EST-04 Quantidade: Positiva, finita, até 1 bilhão, até 6 casas e precisão do
  produto antes de coerção; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-02 Quantidade: 1,5 aceita apenas em unidade
  fracionável.; EST-04 Quantidade: 1,5 aceita apenas em unidade fracionável.

- **Campo:** Movimento original

  **Tipo/origem por tela e estado:** EST-02 Movimento original: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Movimento original: Sim
  para correção

  **Validação/unidade:** EST-02 Movimento original: Mesmo
  paciente/produto/custódia e fato compatível; obrigatório também API/RPC;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-02 Movimento original: “Corrigir a entrada de 2
  unidades registrada em…”

- **Campo:** Motivo

  **Tipo/origem por tela e estado:** EST-02 Motivo: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; EST-04 Motivo: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Motivo: Sim; EST-04
  Motivo: Sim

  **Validação/unidade:** EST-02 Motivo: 3–1000 caracteres; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; EST-04 Motivo: 3–1000 caracteres; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura

  **Ajuda/exemplo:** EST-02 Motivo: “Entrada registrada em quantidade maior
  que a conferida.”; EST-04 Motivo: “Entrada registrada em quantidade maior
  que a conferida.”

- **Campo:** Antes/depois

  **Tipo/origem por tela e estado:** EST-02 Antes/depois: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** EST-02 Antes/depois: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** EST-02 Antes/depois: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** EST-02 Antes/depois: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.

- **Campo:** Anexo

  **Tipo/origem por tela e estado:** EST-02 Anexo: EDITABLE
  (ATTACHMENT_SECTION); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-02 Anexo: Opcional

  **Validação/unidade:** EST-02 Anexo: Regra de anexos e recuperação por
  tentativa; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-02 Anexo: Anexe evidência pelo fluxo de arquivo
  autorizado; um nome ou caminho digitado não equivale a arquivo pronto.

- **Campo:** Origem/destino da transferência

  **Tipo/origem por tela e estado:** EST-04 Origem: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; EST-04 Destino:
  EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-04 Origem: Sim no novo
  painel; EST-04 Destino: Sim no novo painel

  **Validação/unidade:** EST-04 Origem: Autorização, saldo e P07; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; EST-04 Destino: Autorização, saldo e P07; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** EST-04 Origem: Sem edição direta das duas colunas de
  saldo.; EST-04 Destino: Sem edição direta das duas colunas de saldo.

- **Campo:** Contraparte/recebedor

  **Tipo/origem por tela e estado:** EST-04 Contraparte: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; EST-04 Recebedor
  físico: EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** EST-04 Contraparte: Sim conforme
  P07; EST-04 Recebedor físico: Sim conforme P07

  **Validação/unidade:** EST-04 Contraparte: Pessoa competente na contraparte;
  concordância não substitui aceite pessoal do recebedor real; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; EST-04 Recebedor físico: Contrassinatura distinta de
  aceite físico se pessoas diferentes; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** EST-04 Contraparte: Identificar quem declara, valida e
  recebe.; EST-04 Recebedor físico: Identificar quem declara, valida e recebe.

- **Campo:** Estado e período do histórico

  **Tipo/origem por tela e estado:** EST-03 Tipo ou origem do movimento:
  FILTER (FILTER_SELECT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; EST-03 Data inicial: FILTER
  (DATE_INPUT); Apenas consulta no escopo permitido; não altera documento,
  movimento ou autoridade; EST-03 Data final: FILTER (DATE_INPUT); Apenas
  consulta no escopo permitido; não altera documento, movimento ou autoridade

  **Obrigatoriedade/default na preparação:** EST-03 Tipo ou origem do
  movimento: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material; EST-03 Data inicial: Sem restrição adicional inicialmente, salvo
  filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não
  cria zero ou estado material; EST-03 Data final: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material

  **Validação/unidade:** EST-03 Tipo ou origem do movimento: Filtro tipado da
  seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar; EST-03 Data
  inicial: Filtro tipado da seção/tarefa, com valores permitidos e escopo
  autorizados; não aceitar um enum universal para processos distintos; datas
  em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; EST-03 Data final: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar

  **Ajuda/exemplo:** EST-03 Tipo ou origem do movimento: “Movimentos de
  novembro; há páginas anteriores.”; EST-03 Data inicial: “Movimentos de
  novembro; há páginas anteriores.”; EST-03 Data final: “Movimentos de
  novembro; há páginas anteriores.”

<!-- c-table:end -->

## Transições e conservação física

Entrada familiar avulsa registra fato motivado, sem criar COM artificial.
Retirada debita só a custódia autorizada. Correção cria compensação imutável
com referência obrigatória, nunca UPDATE/DELETE do ledger. Se corrigir um fato
afetaria documentos aceitos, exigir conciliação do domínio; não admitir atalho
que desfaça aceite pessoal. Nenhuma operação pública produz saldo negativo.

Transferência simples aprovada P07 usa preferencialmente ENT e conserva
quantidade: origem reduz e trânsito aumenta na expedição; destino só aumenta
no aceite pessoal. A interface simples reduz preenchimento e explicita
contraparte, não elimina as etapas. P07-B exige mecanismo equivalente; C
mantém o plano sem selecionar por conta própria. Retorno de equipe à família
tem os mesmos controles e direção clara.

Produto inativo com saldo continua na custódia verdadeira e em consulta
histórica. Inativar não gera movimento. Saldo da equipe pode permanecer
inativo ou ser transferido legitimamente para família por escolha explícita.
Transferir não vira débito fictício nem ação unilateral. Reativar torna
disponível o saldo que permaneceu na mesma custódia; não cria saldo em outro
produto. Se um fato antigo do inativo precisa ser conciliado, oferecer ação
específica com autoridade e referência, preservando proteção contra novas
operações comuns indevidas. Prazos/processo dessa exceção constam na decisão,
sem “reativar tudo”.

## Precisão, erro e consulta

Validar valor original em API e SQL antes de numeric(18,6). Number e string
equivalentes inválidos devem ser recusados; NaN/Infinity/negativo/excesso de
casas não viram movimento arredondado. A fronteira de RPC continua exigida
mesmo se formulário limita entrada. Zero é legítimo no saldo agregado, não
como movimento positivo vazio. Readmodel deve definir ausência como zero só
onde essa é a representação do contrato; crédito positivo esperado não aceita
NULL no teste.

Lock serializa saldo e idempotência; após espera, revalidar autoridade segundo
P15. Duas saídas competem, uma recusa sem parcial quando saldo insuficiente.
Resposta perdida congela quantidade/direção/origem e recupera mesmo movimento.
Se GET de movimentos falha e saldos funcionam, manter saldos com frescor
identificado e erro somente no painel afetado. Filtro novo não recebe linhas
antigas sem rótulo de atualização; resposta de outro paciente é descartada.

Cada movimento abre sua origem exata: purchase_receipt, ENT, BAL, consumo ou
movimento compensado. Resolver tipo e ID no servidor; link não concede acesso
à COM familiar a leitor da equipe. Mostrar “Origem restrita ao seu acesso” sem
inventar 404 de outro tipo. Histórico preserva nomes e unidades do fato.

Aceites: correção sem referência falha em HTTP/RPC; correção válida se repete
sem duplicar; fator 1.0000004 em unidade inteira é recusado antes de
arredondar; duas saídas não tornam saldo negativo; saldo 4 inativo permanece 4
e reativa na mesma custódia; transferência não libera a mesma unidade dos dois
lados; origem antiga abre com permissão correta. Validar resumo com
família/equipe.

## Atualização vinculante C7–C10

P07 aprova interface simples baseada preferencialmente em ENT, condicionando
retirada da UI antiga à equivalência. A taxonomia C7 distingue transferência
física, COM, consumo, abertura, BAL, compensação e descarte; é proibido
deslocamento fictício para ajustar saldo. P15 exige autoridade após espera no
comando.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).
