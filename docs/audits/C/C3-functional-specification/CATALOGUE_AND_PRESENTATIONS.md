# Catálogo, apresentações e duplicatas

AS_IS: seção Catálogo de /admin, /unidades e /api/catalog/presentations.
care_recipient_products é canônico local; products preserva identidade.
Apresentações/scan e entrada manual existem; B1-FORM-005 e B2-006 mostram
consulta e proveniência incompletas; B3-019 aceita NaN direto. TO_BE DEC-007,
O08/O12/O16/O20, sem trocar identidade de movimento histórico.

## Telas e campos

<!-- c-table:start -->

- **Tela:** CAT-01

  **Rota e situação:** /admin seção catálogo, atual a alterar

  **Objetivo e ações:** Buscar, cadastrar, editar, inativar/reativar, adotar
  modelo explicitamente.

- **Tela:** CAT-02

  **Rota e situação:** /unidades, atual a preservar

  **Objetivo e ações:** Consultar unidades e precisão; proibir reinterpretar
  unidade já usada.

- **Tela:** CAT-03

  **Rota e situação:** Apresentações no material, novo percurso de consulta

  **Objetivo e ações:** Listar/criar/editar equivalências e códigos, com
  histórico de fator usado.

- **Tela:** CAT-04

  **Rota e situação:** Duplicatas, novo diálogo contextual

  **Objetivo e ações:** Comparar identidades, escolher nome/alias e encaminhar
  inativação sem fundir ledger.

- **Tela:** CAT-05

  **Rota e situação:** Seleção/scan nos formulários, atual a alterar

  **Objetivo e ações:** Buscar nome/alias; manual/câmera/foto quando
  disponível; confirmar equivalência.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Nome

  **Tipo/origem por tela e estado:** CAT-01 Nome: EDITABLE (TEXT_INPUT);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Nome: Sim, vazio

  **Validação/unidade:** CAT-01 Nome: 2–160 caracteres, texto longo deve caber
  em tela/PDF; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-01 Nome: “Compressa Exemplo.”

- **Campo:** Categoria

  **Tipo/origem por tela e estado:** CAT-01 Categoria: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Categoria: Sim

  **Validação/unidade:** CAT-01 Categoria: Medicamentos/higiene/dieta atuais;
  sem categoria inferida pelo nome; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-01 Categoria: Seleção pronta com rótulo humano.

- **Campo:** Unidade base

  **Tipo/origem por tela e estado:** CAT-01 Unidade base: EDITABLE_SUBFORM
  (UNIT_SELECTOR_OR_READ_ONLY_UNIT); Cadastro sem uso; quando houver uso
  histórico é READ_ONLY e a alteração incompatível é recusada; CAT-02 Unidade
  base: READ_ONLY (UNIT_DESCRIPTION); Identidade da unidade selecionada;
  nome/código/dimensão de novo cadastro têm campos próprios; unidade usada não
  é reinterpretada

  **Obrigatoriedade/default na preparação:** CAT-01 Unidade base: Sim antes de
  movimentar; CAT-02 Unidade base: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** CAT-01 Unidade base: Não reinterpretar produto com
  história; Cadastro sem uso; quando houver uso histórico é READ_ONLY e a
  alteração incompatível é recusada; CAT-02 Unidade base: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Identidade da unidade selecionada; nome/código/dimensão de
  novo cadastro têm campos próprios; unidade usada não é reinterpretada

  **Ajuda/exemplo:** CAT-01 Unidade base: “unidade”, com casas 0 ou precisão
  permitida.; CAT-02 Unidade base: Identificação do item registrado. A
  consulta não substitui o material ou reinterpreta sua unidade.

- **Campo:** Precisão

  **Tipo/origem por tela e estado:** CAT-02 Precisão: EDITABLE_SUBFORM
  (INTEGER_SELECT_0_6); Precisão inteira 0–6 apenas quando cadastro/uso
  permitir; depois READ_ONLY

  **Obrigatoriedade/default na preparação:** CAT-02 Precisão: Sim

  **Validação/unidade:** CAT-02 Precisão: 0–6; proteger história; Precisão
  inteira 0–6 apenas quando cadastro/uso permitir; depois READ_ONLY

  **Ajuda/exemplo:** CAT-02 Precisão: Quantidade inválida é recusada, não
  arredondada.

- **Campo:** Aliases

  **Tipo/origem por tela e estado:** CAT-01 Aliases: EDITABLE
  (ALIAS_TOKEN_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Aliases: Não, vazia

  **Validação/unidade:** CAT-01 Aliases: Até 30 nomes, 1–160 caracteres, sem
  duplicata vazia; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-01 Aliases: Adicione cada nome alternativo como item
  separado, por exemplo Fralda G; remover um alias é escolha explícita.

- **Campo:** Descrição/ordem

  **Tipo/origem por tela e estado:** CAT-01 Descrição: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; CAT-01 Ordem: EDITABLE
  (INTEGER_NUMBER_INPUT); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Descrição: Não; CAT-01
  Ordem: Não

  **Validação/unidade:** CAT-01 Descrição: Descrição opcional até 2000
  caracteres; não herda a regra numérica da ordem; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura;
  CAT-01 Ordem: Ordem inteira de 0 a 1000000 segundo contrato herdado; não
  usar textarea; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-01 Descrição: Não muda unidade/custódia.; CAT-01
  Ordem: Não muda unidade/custódia.

- **Campo:** Ativo

  **Tipo/origem por tela e estado:** CAT-01 Ativo: EDITABLE
  (CHECKBOX_OR_SWITCH); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Ativo: Escolha explícita

  **Validação/unidade:** CAT-01 Ativo: Saldo positivo permitido sob
  inativação; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-01 Ativo: “Inativo: saldo e histórico serão
  mantidos.”

- **Campo:** Destino do saldo da equipe

  **Tipo/origem por tela e estado:** CAT-01 Destino do saldo da equipe:
  READ_ONLY_WITH_LINK (CUSTODY_NOTICE_AND_LINK); Inativar conserva saldo;
  iniciar transferência abre EST-04 com intenção separada

  **Obrigatoriedade/default na preparação:** CAT-01 Destino do saldo da
  equipe: Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** CAT-01 Destino do saldo da equipe: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Inativar conserva saldo; iniciar transferência abre EST-04
  com intenção separada

  **Ajuda/exemplo:** CAT-01 Destino do saldo da equipe: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Nome da apresentação

  **Tipo/origem por tela e estado:** CAT-03 Nome da apresentação: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-03 Nome da apresentação: Sim
  ao cadastrar, vazio

  **Validação/unidade:** CAT-03 Nome da apresentação: 2–160 quando usado;
  referência à base; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-03 Nome da apresentação: “Pacote com 10 unidades.”

- **Campo:** Código de barras

  **Tipo/origem por tela e estado:** CAT-03 Código de barras: EDITABLE
  (BARCODE_TEXT_WITH_SCAN); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; CAT-05 Código de
  barras: EDITABLE (BARCODE_TEXT_WITH_SCAN); Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-03 Código de barras: Opcional
  se seleção manual; obrigatório ao associar scan; CAT-05 Código de barras:
  Opcional se seleção manual; obrigatório ao associar scan

  **Validação/unidade:** CAT-03 Código de barras: Preservar zeros;
  formato/check digit aplicável; unicidade conforme catálogo; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura; CAT-05 Código de barras: Preservar zeros; formato/check
  digit aplicável; unicidade conforme catálogo; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-03 Código de barras: Não tratar código desconhecido
  como produto autorizado.; CAT-05 Código de barras: Não tratar código
  desconhecido como produto autorizado.

- **Campo:** Fator base

  **Tipo/origem por tela e estado:** CAT-03 Fator base: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-03 Fator base: Sim

  **Validação/unidade:** CAT-03 Fator base: Finito, positivo, até 6 casas e
  equivalência válida; NaN/Infinity recusados também RPC; Somente no subestado
  de preparação autorizado indicado na ficha; resumo/decisão posterior é
  leitura

  **Ajuda/exemplo:** CAT-03 Fator base: “1 pacote = 10 unidades.”

- **Campo:** Número de embalagens

  **Tipo/origem por tela e estado:** CAT-05 Número de embalagens: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-05 Número de embalagens:
  Quando apresentação usada

  **Validação/unidade:** CAT-05 Número de embalagens: Produto do fator exato;
  não converter unidade incompatível; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CAT-05 Número de embalagens: “2 pacotes = 20 unidades.”

- **Campo:** Comparação de duplicatas

  **Tipo/origem por tela e estado:** CAT-04 Comparação de duplicatas:
  READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** CAT-04 Comparação de duplicatas:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** CAT-04 Comparação de duplicatas: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** CAT-04 Comparação de duplicatas: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Justificativa de alias/inativação

  **Tipo/origem por tela e estado:** CAT-01 Justificativa de alias/inativação:
  EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; CAT-04 Justificativa de
  alias/inativação: EDITABLE (TEXTAREA); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CAT-01 Justificativa de
  alias/inativação: Ao resolver duplicata/alteração relevante; CAT-04
  Justificativa de alias/inativação: Ao resolver duplicata/alteração relevante

  **Validação/unidade:** CAT-01 Justificativa de alias/inativação: Proposta
  3–1000 com evento e autoria; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; CAT-04 Justificativa
  de alias/inativação: Proposta 3–1000 com evento e autoria; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** CAT-01 Justificativa de alias/inativação: Não somar
  saldos silenciosamente.; CAT-04 Justificativa de alias/inativação: Não somar
  saldos silenciosamente.

- **Campo:** Nome da unidade

  **Tipo/origem por tela e estado:** TEXT_INPUT;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Somente novo cadastro autorizado;
  obrigatório e vazio

  **Validação/unidade:** 2–80 caracteres conforme /api/units; unidade usada
  não é renomeada para reinterpretar fatos

  **Ajuda/exemplo:** Use um nome compreensível, por exemplo Unidade. Confira
  se a unidade já existe antes de cadastrar.

- **Campo:** Código da unidade

  **Tipo/origem por tela e estado:** TEXT_INPUT;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Somente novo cadastro autorizado;
  obrigatório e vazio

  **Validação/unidade:** 1–30 caracteres conforme /api/units; código textual
  preservado e unicidade pelo contrato; não é código de barras do material

  **Ajuda/exemplo:** Código curto da unidade, por exemplo un. Não use um
  código de embalagem como unidade base.

- **Campo:** Dimensão da unidade

  **Tipo/origem por tela e estado:** RADIO_GROUP;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Novo cadastro; escolha explícita
  sem conversão de unidade histórica

  **Validação/unidade:** Contagem, volume, massa ou embalagem conforme enum
  atual; não converter dimensões incompatíveis

  **Ajuda/exemplo:** Escolha a natureza da unidade. Um fator de embalagem não
  autoriza converter massa em volume.

- **Campo:** Âmbito da unidade

  **Tipo/origem por tela e estado:** AUTHORIZED_SCOPE_SELECT;context by
  CONTROL_SCREEN_CONTRACTS.csv

  **Obrigatoriedade/default na preparação:** Só criação: opções retornadas
  pela autoridade global/local; não editar depois pelo valor do browser

  **Validação/unidade:** Global somente por autoridade global; paciente
  somente no contexto autorizado; não derive permissão do ID

  **Ajuda/exemplo:** Confira se a unidade será do paciente ou global. Só
  aparecem os âmbitos que você pode administrar.

<!-- c-table:end -->

## Regras e transições

Novo paciente inicia vazio. Adotar modelo cria/adota explicitamente itens
selecionados sem dados/saldos de outra residência. Busca COM/ENT usa
capacidade já demonstrada na REQ; teclado/AT, alias, categoria e nomes longos
preservam seleções. Catálogo maior usa paginação/busca, sem renderizar tudo
por obrigação.

Apresentação consultável mostra código/fator/estado. Converter conserva no
snapshot o código, nome da embalagem, quantidade de embalagens, fator e
unidade base usados. Alterar fator 10→12 depois não muda documento de 2
pacotes = 20. Entrada manual em base segue possível. Scan é conveniência;
câmera negada, foto inválida, código não encontrado e offline têm caminhos
manuais claros. OCR, lotes e validade permanecem DEFERRED por O17, sem campos
obrigatórios novos.

Inativar/reativar segue o domínio estoque, sem apagar saldo. Duplicata O20 é
tratamento de seleção e identidade, não merge destrutivo. Proposta técnica:
marcar sucessor/alias para novas escolhas, inativar duplicata quando permitido
e manter links/histórico/saldo separados. Transferir saldo, se necessário, é
operação legítima própria, não consequência automática da escolha do nome. Se
houver unidade incompatível, não unir nem converter por palpite.

## Recuperação e aceite

Editar tem versão; alias removido explicitamente difere de omissão para
manter. Colisão de código mostra material correspondente autorizado; conflito
mantém formulário e foco. Resposta perdida consulta mesma intenção; catálogo
atualiza consumidores sem apagar rascunho. Delegado catalog.manage deve ter
comportamento coerente nas rotas equivalentes, sem ganhar access.manage para
contornar bug.

Aceites: consultar/editar apresentação existente; código duplicado recusado;
NaN/Infinity recusados direto; 2×10 continua 20 após mudar fator; inativo com
saldo mantém custódia; tratar duplicata conserva IDs/movimentos/PDFs;
1/5/20/100 itens e alias acessíveis em COM/ENT/REQ. Pessoas validam
legibilidade e seleção manual com câmera indisponível. Nunca copiar estoque
observado via O16.

## Fechamento definitivo — tarefa, estado e política

Ordem/precisão são inteiros, não textareas. Barcode é texto com zeros;
equivalência é calculada. Nova unidade tem nome/código/dimensão/âmbito/
precisão separados conforme /api/units; unidade usada não é reinterpretada.
Inativar conserva saldo/custódia; transferência é intenção independente, nunca
destino obrigatório ou efeito automático do cadastro.
