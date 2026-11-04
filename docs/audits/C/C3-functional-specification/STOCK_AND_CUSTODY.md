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

  **Tipo/origem:** Seleção de áreas autorizadas

  **Obrigatório e default:** Sim, contexto permitido

  **Validação/unidade:** Equipe não vê saldo geral familiar

  **Ajuda e exemplo:** “Disponível na equipe”, não “Estoque total”
  indiscriminado.

- **Campo:** Material

  **Tipo/origem:** Busca no catálogo/identidade histórica

  **Obrigatório e default:** Sim ao movimentar

  **Validação/unidade:** Ativo para nova operação normal; inativo tem caminho
  específico

  **Ajuda e exemplo:** Unidade e precisão visíveis.

- **Campo:** Ação

  **Tipo/origem:** Entrada/retirada/correção de entrada/correção de saída

  **Obrigatório e default:** Sim, escolha explícita

  **Validação/unidade:** Direção não inferida de sinal negativo

  **Ajuda e exemplo:** “Retirar 1 unidade do estoque familiar.”

- **Campo:** Quantidade

  **Tipo/origem:** Decimal, autor

  **Obrigatório e default:** Sim, vazio

  **Validação/unidade:** Positiva, finita, até 1 bilhão, até 6 casas e precisão
do
  produto antes de coerção

  **Ajuda e exemplo:** 1,5 aceita apenas em unidade fracionável.

- **Campo:** Movimento original

  **Tipo/origem:** Referência pesquisável, servidor

  **Obrigatório e default:** Sim para correção

  **Validação/unidade:** Mesmo paciente/produto/custódia e fato compatível;
  obrigatório também API/RPC

  **Ajuda e exemplo:** “Corrigir a entrada de 2 unidades registrada em…”

- **Campo:** Motivo

  **Tipo/origem:** Texto do ator

  **Obrigatório e default:** Sim

  **Validação/unidade:** 3–1000 caracteres

  **Ajuda e exemplo:** “Entrada registrada em quantidade maior que a
  conferida.”

- **Campo:** Antes/depois

  **Tipo/origem:** Projeção do servidor

  **Obrigatório e default:** Sim no resumo

  **Validação/unidade:** Versão/ledger atual e direção/unidade

  **Ajuda e exemplo:** “Família: 5 → 4 unidades.”

- **Campo:** Anexo

  **Tipo/origem:** Reserva/arquivo privado

  **Obrigatório e default:** Opcional

  **Validação/unidade:** Regra de anexos e recuperação por tentativa

  **Ajuda e exemplo:** Não bloquear consulta do movimento já confirmado por
  falha de anexo.

- **Campo:** Origem/destino da transferência

  **Tipo/origem:** Custódias distintas

  **Obrigatório e default:** Sim no novo painel

  **Validação/unidade:** Autorização, saldo e P07

  **Ajuda e exemplo:** Sem edição direta das duas colunas de saldo.

- **Campo:** Contraparte/recebedor

  **Tipo/origem:** Pessoas elegíveis

  **Obrigatório e default:** Sim conforme P07

  **Validação/unidade:** Contrassinatura distinta de aceite físico se pessoas
  diferentes

  **Ajuda e exemplo:** Identificar quem declara, valida e recebe.

- **Campo:** Estado e período do histórico

  **Tipo/origem:** Filtros de consulta

  **Obrigatório e default:** Não, defaults explícitos

  **Validação/unidade:** Cursor estável, ID antigo alcançável

  **Ajuda e exemplo:** “Movimentos de novembro; há páginas anteriores.”

<!-- c-table:end -->

## Transições e conservação física

Entrada familiar avulsa registra fato motivado, sem criar COM artificial.
Retirada debita só a custódia autorizada. Correção cria compensação imutável
com referência obrigatória, nunca UPDATE/DELETE do ledger. Se corrigir um fato
afetaria documentos aceitos, exigir conciliação do domínio; não admitir atalho
que desfaça aceite pessoal. Nenhuma operação pública produz saldo negativo.

Transferência proposta P07-A usa ENT e conserva quantidade: origem reduz e
trânsito aumenta na expedição; destino só aumenta no aceite pessoal. A
interface
simples reduz preenchimento e explicita contraparte, não elimina as etapas.
P07-B exige mecanismo equivalente; C mantém o plano sem selecionar por conta
própria. Retorno de equipe à família tem os mesmos controles e direção clara.

Produto inativo com saldo continua na custódia verdadeira e em consulta
histórica. Inativar não gera movimento. Saldo da equipe pode permanecer
inativo
ou ser transferido legitimamente para família por escolha explícita.
Transferir
não vira débito fictício nem ação unilateral. Reativar torna disponível o
saldo
que permaneceu na mesma custódia; não cria saldo em outro produto.
Se um fato antigo do inativo precisa ser conciliado, oferecer ação específica
com autoridade e referência, preservando proteção contra novas operações
comuns
indevidas. Prazos/processo dessa exceção constam na decisão, sem “reativar
tudo”.

## Precisão, erro e consulta

Validar valor original em API e SQL antes de numeric(18,6). Number e string
equivalentes inválidos devem ser recusados; NaN/Infinity/negativo/excesso de
casas
não viram movimento arredondado. A fronteira de RPC continua exigida mesmo se
formulário limita entrada. Zero é legítimo no saldo agregado, não como
movimento
positivo vazio. Readmodel deve definir ausência como zero só onde essa é a
representação do contrato; crédito positivo esperado não aceita NULL no teste.

Lock serializa saldo e idempotência; após espera, revalidar autoridade segundo
P15. Duas saídas competem, uma recusa sem parcial quando saldo insuficiente.
Resposta perdida congela quantidade/direção/origem e recupera mesmo movimento.
Se GET de movimentos falha e saldos funcionam, manter saldos com frescor
identificado e erro somente no painel afetado. Filtro novo não recebe linhas
antigas sem rótulo de atualização; resposta de outro paciente é descartada.

Cada movimento abre sua origem exata: purchase_receipt, ENT, BAL, consumo ou
movimento compensado. Resolver tipo e ID no servidor; link não concede acesso
à COM familiar a leitor da equipe. Mostrar “Origem restrita ao seu acesso”
sem inventar 404 de outro tipo. Histórico preserva nomes e unidades do fato.

Aceites: correção sem referência falha em HTTP/RPC; correção válida se repete
sem duplicar; fator 1.0000004 em unidade inteira é recusado antes de
arredondar;
duas saídas não tornam saldo negativo; saldo 4 inativo permanece 4 e reativa na
mesma custódia; transferência não libera a mesma unidade dos dois lados;
origem antiga abre com permissão correta. Validar resumo com família/equipe.
