# D3.57 — verificações de navegador após falhas da CI

A CI de e497e98 registrou falhas de agenda e Andamentos em WebKit, falhas de
foco em Chromium e uma falha intermitente de seleção de aba no recebimento.
Os logs, capturas e resultados originais foram preservados. A reprodução no
commit 2e9762a executou os quatro cenários. A agenda falhou e os outros três
passaram nessa execução. [CI anterior](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/42908042331).

## Correções verificadas

- A agenda pode exibir a recuperação enquanto o pedido original ainda está
  em andamento. A comparação agora começa depois de o servidor responder e
  a resposta ser perdida no navegador. O teste exige uma rejeição, exatamente
  um evento e um comando, preservação do pacote e estado idêntico depois da
  consulta de recuperação. O oráculo original de ausência de efeitos em
  documento e estoque permanece.
- Na publicação pela segunda sessão, o seletor de Andamentos encontrava o
  painel do diálogo em fechamento e o painel da ficha. O teste aguarda o
  fechamento e confere o resultado na aba Visão geral. As verificações de
  publicação única e conservação da edição da primeira sessão permanecem.
- No cenário de foco, a segunda confirmação de descarte precisa estar visível
  antes de o teste ocultar o campo Nome. O teste move o foco para o aviso
  antes de ocultar o campo e continua a exigir foco em Categoria na retomada.

## Prova e pendências

Foram aprovados 15 cenários em Chromium, Mobile Chromium e WebKit. As duas
larguras do editor foram conferidas nas três engines. O recebimento passou
nas três engines com a mesma interação e as mesmas verificações. A falha
intermitente de seleção de aba na CI segue aberta para contraprova. A rodada
local sozinha não determina sua causa.

Tipos e lint dos testes afetados aprovados. O lote altera testes e evidências.
O dry-run do remoto de desenvolvimento retornou sem migrations pendentes.
A matriz permanece em 56 critérios aprovados localmente e 49 parciais.
A CI do commit deste lote é uma verificação independente. A PR #7 permanece
em Draft. Próximos trabalhos incluem a navegação no recebimento e os
formulários do catálogo, do cadastro e da administração.
