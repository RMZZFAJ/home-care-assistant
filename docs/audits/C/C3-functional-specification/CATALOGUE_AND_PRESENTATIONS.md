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

  **Tipo/origem:** Texto local

  **Obrigatório e default:** Sim, vazio

  **Validação/unidade:** 2–160 caracteres, texto longo deve caber em tela/PDF

  **Ajuda e exemplo:** “Compressa Exemplo.”

- **Campo:** Categoria

  **Tipo/origem:** Seleção canônica

  **Obrigatório e default:** Sim

  **Validação/unidade:** Medicamentos/higiene/dieta atuais; sem categoria
  inferida pelo nome

  **Ajuda e exemplo:** Seleção pronta com rótulo humano.

- **Campo:** Unidade base

  **Tipo/origem:** Unidade cadastrada

  **Obrigatório e default:** Sim antes de movimentar

  **Validação/unidade:** Não reinterpretar produto com história

  **Ajuda e exemplo:** “unidade”, com casas 0 ou precisão permitida.

- **Campo:** Precisão

  **Tipo/origem:** Inteiro da unidade

  **Obrigatório e default:** Sim

  **Validação/unidade:** 0–6; proteger história

  **Ajuda e exemplo:** Quantidade inválida é recusada, não arredondada.

- **Campo:** Aliases

  **Tipo/origem:** Lista textual local

  **Obrigatório e default:** Não, vazia

  **Validação/unidade:** Até 30 nomes, 1–160 caracteres, sem duplicata vazia

  **Ajuda e exemplo:** “Nome usado na residência.”

- **Campo:** Descrição/ordem

  **Tipo/origem:** Texto/opção administrativa

  **Obrigatório e default:** Não

  **Validação/unidade:** Até 2000; ordem 0–1000000 herdada

  **Ajuda e exemplo:** Não muda unidade/custódia.

- **Campo:** Ativo

  **Tipo/origem:** Boolean

  **Obrigatório e default:** Escolha explícita

  **Validação/unidade:** Saldo positivo permitido sob inativação

  **Ajuda e exemplo:** “Inativo: saldo e histórico serão mantidos.”

- **Campo:** Destino do saldo da equipe

  **Tipo/origem:** Manter/transferir legitimamente

  **Obrigatório e default:** Ao inativar com saldo

  **Validação/unidade:** Não executar transferência sem contraparte/aceite

  **Ajuda e exemplo:** “Manter 4 unidades inativas na equipe.”

- **Campo:** Nome da apresentação

  **Tipo/origem:** Texto

  **Obrigatório e default:** Sim ao cadastrar, vazio

  **Validação/unidade:** 2–160 quando usado; referência à base

  **Ajuda e exemplo:** “Pacote com 10 unidades.”

- **Campo:** Código de barras

  **Tipo/origem:** Identificador textual

  **Obrigatório e default:** Opcional se seleção manual; obrigatório ao
  associar scan

  **Validação/unidade:** Preservar zeros; formato/check digit aplicável;
  unicidade conforme catálogo

  **Ajuda e exemplo:** Não tratar código desconhecido como produto autorizado.

- **Campo:** Fator base

  **Tipo/origem:** Decimal informado

  **Obrigatório e default:** Sim

  **Validação/unidade:** Finito, positivo, até 6 casas e equivalência válida;
  NaN/Infinity recusados também RPC

  **Ajuda e exemplo:** “1 pacote = 10 unidades.”

- **Campo:** Número de embalagens

  **Tipo/origem:** Decimal/inteiro conforme apresentação

  **Obrigatório e default:** Quando apresentação usada

  **Validação/unidade:** Produto do fator exato; não converter unidade
  incompatível

  **Ajuda e exemplo:** “2 pacotes = 20 unidades.”

- **Campo:** Comparação de duplicatas

  **Tipo/origem:** Leitura de duas identidades

  **Obrigatório e default:** Sim para decisão O20

  **Validação/unidade:** Saldos, unidade, movimentos e vínculos separados

  **Ajuda e exemplo:** “Manter ID A para novas seleções; ID B conserva
  história.”

- **Campo:** Justificativa de alias/inativação

  **Tipo/origem:** Texto do gestor

  **Obrigatório e default:** Ao resolver duplicata/alteração relevante

  **Validação/unidade:** Proposta 3–1000 com evento e autoria

  **Ajuda e exemplo:** Não somar saldos silenciosamente.

<!-- c-table:end -->

## Regras e transições

Novo paciente inicia vazio. Adotar modelo cria/adota explicitamente itens
selecionados sem dados/saldos de outra residência. Busca COM/ENT usa
capacidade
já demonstrada na REQ; teclado/AT, alias, categoria e nomes longos preservam
seleções. Catálogo maior usa paginação/busca, sem renderizar tudo por
obrigação.

Apresentação consultável mostra código/fator/estado. Converter conserva no
snapshot o código, nome da embalagem, quantidade de embalagens, fator e
unidade
base usados. Alterar fator 10→12 depois não muda documento de 2 pacotes = 20.
Entrada manual em base segue possível. Scan é conveniência; câmera negada,
foto inválida, código não encontrado e offline têm caminhos manuais claros.
OCR, lotes e validade permanecem DEFERRED por O17, sem campos obrigatórios
novos.

Inativar/reativar segue o domínio estoque, sem apagar saldo. Duplicata O20 é
tratamento de seleção e identidade, não merge destrutivo. Proposta técnica:
marcar sucessor/alias para novas escolhas, inativar duplicata quando permitido
e manter links/histórico/saldo separados. Transferir saldo, se necessário,
é operação legítima própria, não consequência automática da escolha do nome.
Se houver unidade incompatível, não unir nem converter por palpite.

## Recuperação e aceite

Editar tem versão; alias removido explicitamente difere de omissão para
manter.
Colisão de código mostra material correspondente autorizado; conflito mantém
formulário e foco. Resposta perdida consulta mesma intenção; catálogo atualiza
consumidores sem apagar rascunho. Delegado catalog.manage deve ter
comportamento
coerente nas rotas equivalentes, sem ganhar access.manage para contornar bug.

Aceites: consultar/editar apresentação existente; código duplicado recusado;
NaN/Infinity recusados direto; 2×10 continua 20 após mudar fator; inativo com
saldo mantém custódia; tratar duplicata conserva IDs/movimentos/PDFs;
1/5/20/100
itens e alias acessíveis em COM/ENT/REQ. Pessoas validam legibilidade e
seleção
manual com câmera indisponível. Nunca copiar estoque observado via O16.
