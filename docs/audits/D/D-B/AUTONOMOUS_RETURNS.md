# DOC-B.3 — Devolução autônoma de materiais

Implementação do complemento aprovado em 11/11/2026. DOC-B.3 concluído
localmente no fluxo atual; revisão geral da fase e gates externos preservados.

## Percurso e acesso cotidiano

A devolução segue somente de CARE_TEAM para FAMILY. Não exige uma entrega de
origem, não desfaz uma entrada e não cria um quinto tipo técnico de documento.
O protocolo ENT, as identidades, os movimentos e os documentos anteriores ficam
preservados. O vínculo com uma ENT conhecida continua opcional e autorizado.

A nova entrada /fichas/devolucao usa o console bilateral existente com origem
fixa na equipe. Está na navegação, em Mais, no painel administrativo diário,
na Central de fichas e no acompanhamento de entregas. O console genérico e os
preenchimentos anteriores continuam disponíveis. Pessoas, materiais, referência
atual, confirmação e recuperação usam os contratos existentes; não há nova
persistência de rascunho nem concessão de autorização pelo parâmetro da rota.

A preparação de devolução exige acesso de criação e leitura da custódia de
origem; o servidor continua responsável pela autorização. Declaração não emite
protocolo nem movimenta estoque. Concordância não é expedição ou recebimento.
Somente a expedição debita a equipe e forma trânsito; o recebimento pessoal
credita a família na quantidade efetivamente aceita. Divergências permanecem.

Fichas conhecidas mostram sua natureza pelo percurso preservado. Grupos ENT e
avisos genéricos abrangem entrega/devolução sem inferir um sentido ausente.
Rótulo de percurso desconhecido continua explícito. IDs, ciência, autoria,
recebimento e andamento não passam a ser equivalentes por essa nomenclatura.

## Representação documental V14

Novas emissões ENT usam V14: natureza própria, percurso, concordância,
expedição, recebedor e vínculo de origem preservados. A devolução sem vínculo
fica explícita. Fonte com percurso contraditório entre payload e declaração
é recusada, em vez de escolher silenciosamente uma das direções.

A reserva V14 mantém COM13, BAL12 e REQ10. Intenções antigas conservam revisão,
identidade e fonte; V10 mantém seu título original. O novo nome na aplicação
não reescreve exemplares emitidos. A nova composição visual dos PDFs permanece
em DOC-A; este incremento usa o gerador e a assinatura atuais.

Apenas a migration20261111222925 acrescenta a reserva e permite a nova revisão
nas fontes documentais. Não cria tabela, modifica estoque nem altera migrations
anteriores. Local e remoto218 reconciliados, sem reset e com dry-run vazio.

## Verificações qualificadas

- Dois cenários com Auth real: paciente sem ENT anterior, estoque da equipe
  formado por BAL nativo, origem opcional, replay, contraparte e recebedor
  distintos, expedição própria, três de cinco recebidos, saldo/trânsito e
  autorização vigente. Emissão V14 preserva a fonte; intenção V10 é recuperada
  exatamente; perda de ent.read impede nova reserva e leitura privada.
- 39 testes unitários/PDF de nome, percurso, linguagem, tarefas e regressões do
  gerador. Incluem fonte contraditória, percurso desconhecido, controle negativo
  do conteúdo, representação V10 e bytes V4/V5/V6 anteriores.
- Cinco testes do runner: coleta antes do build, compilação nova obrigatória,
  falha impede casos, custódia descartada e guardas da única stack local.
- Três cenários completos nos perfis Chromium desktop, Pixel 7 e WebKit/iPhone.
  Entrada cotidiana, retomada privada, declaração, concordância e expedição,
  recebimento de três entre cinco unidades e PDF V14 pelo pipeline real local.
  Cinco larguras, teclado e axe; saldo FAMILY33, CARE_TEAM5, trânsito2.
- Três páginas do PDF controlado e quatro do exemplar nativo inspecionadas,
  incluindo natureza, percurso, concordância, recebimento divergente, autores,
  identificação, emissão e verificação. Captura móvel conferida. A aparência
  nova continua em DOC-A; não há aprovação visual global.
- Tipos e lint dos consumidores alterados passaram. Foram localizados e
  ajustados os consumidores de nomes de página, tipo ENT e aviso genérico.

## Rodadas, limites e próximo gate

A primeira fixture BAL omitiu outro material ativo; a guarda recusou. A fixture
passou a contar todos os materiais, sem alterar a regra nativa. A seta do novo
texto documental não era representável na fonte atual; usa-se a palavra para,
sem desativar a guarda de caracteres. A fixture documental corrente agora
seleciona explicitamente representação operacional, preservando separadamente
as regras das representações antigas.

A primeira prontidão do navegador expirou antes dos casos: a compilação fria
estava dentro do prazo HTTP. O runner agora compila antes de iniciar o
Playwright; falha de build impede os casos e o lançamento direto pelo editor
conserva o requisito. Não houve aumento de timeout nem redução das guardas.
A rodada corrigida teve três casos aprovados em build de produção.

O preflight isolou a migration218 e comparou os contratos-alvo. Após a aplicação,
as218 versões, funções e grants coincidem com o local; dry-run vazio. Reserva
V14 somente authenticated; anon/service recusados. Sem mudanças de RLS/tabelas,
reset, fixtures/Auth remotos, produção ou ativação externa.

A CI do baseline40f7588 terminou com652 testes integrados aprovados e dois
oráculos BAL antigos reprovados: esperavam aplicação de estoque pelo parecer.
Ambos foram reproduzidos localmente e corrigidos para provar parecer sem
movimento e aplicação explícita subsequente. Os dois casos dirigidos passaram,
preservando autoria, pareceres anteriores, obrigações e quantidade ajustada.
Não foi alterado o produto para recuperar o comportamento antigo.

A [CI do baseline](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/43111072972)
permanece uma falha registrada; o novo SHA precisa de sua própria validação.

DOC-B permanece parcial, estimado75%; falta DOC-B.4, cancelamento/complemento
com preservação do conteúdo e das ciências e pedido próprio de confirmação.
Os105 critérios continuam57PASS/48PARTIAL;18 UI e visual85% permanecem.
CI do SHA publicado, instalação limpa,
evolução legada, integração completa, participantes/AT/aparelhos reais e
liberação operacional continuam gates próprios. Sonar permanece adiado.

[Reconciliação de migrations](MIGRATIONS.md).
