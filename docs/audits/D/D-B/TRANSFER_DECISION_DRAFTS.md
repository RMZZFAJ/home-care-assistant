# D3.40 — preenchimentos privados dos atos de transferência

Base60c419b. Concordância, recusa, retirada/encerramento e expedição usam quatro
propósitos ENT privados, separados por titular e ficha. O núcleo existente
preserva texto bruto, versão, etapa e nomes documentais entre sessões/aparelhos,
com CAS e descarte próprio. Salvar não altera declaração, concordância, estoque,
recebimento, eventos ou avisos oficiais. Não há replay offline.

Retomada exige consulta Auth atual, comparação e adoção explícita antes da
revisão. Resposta403 ou200 inválido impede adoção e retira os fatos consultados.
O formulário também consulta a ficha antes de salvar a revisão; encerramento
concorrente preserva o texto e devolve foco ao campo. Não há conversão de
concordância em expedição ou de expedição em recebimento. A consulta pessoal
continua acessível após perda de escrita ou encerramento, sem formulário oficial.

A API conserva o contrato anterior e aceita draftCommit explícito. A confirmação
vincula propósito, ação, alvo, versão e texto canônico à revisão privada.
Expedição tem corpo vazio e não declara aceite/divergência. Motivo bruto mantém
Unicode e quebras de linha; o vínculo usa o mesmo trim de ECMAScript da API.
O RPC oficial existente aplica os efeitos; a guarda final repete a autorização
real depois do journal privado. Replay recupera o resultado exato com leitura
atual, inclusive após perda de escrita; reconhecer o resultado não repete o ato.
Administrador local pode encerrar com autoria própria; override isolado não
substitui papel local nem identidade designada. Declaração original é imutável.

21 testes unitários/API e18 cenários distintos com Auth real aprovados. Incluem
CAS entre sessões, privacidade, texto adulterado, ação/versão trocadas, replay,
revogação sob lock observado e após journal, encerramento administrativo,
rollback de fatos/journal/papel e negativa de leitura. Quatro probes iniciais
falharam por predicado ausente no ON CONFLICT do teste; os quatro foram
corrigidos e repetidos, conservando os nove sucessos inalterados.

14 cenários de navegador aprovados, sete Chromium móvel e sete WebKit. Dois
fluxos antigos por motor conservam declaração incerta, três autores, material
inativo, recebimento parcial, PDF e ato encerrado. Cinco novos por motor cobrem
quatro atos entre sessões e consulta após perda de escrita. Axe, revisão com
foco, resposta perdida e igualdade do pacote, retomada sem POST oficial, estoque
e fatos preservados. Duas capturas inspecionadas; paridade visual integral segue
pendente. Os18 fontes ficaram congelados e conferidos durante a rodada final.
Um teste MJS administrativo independente foi acrescentado depois, sem alterar
os fontes consumidos pelos navegadores.

A rodada inicial foi interrompida após1 sucesso e4 falhas: retorno de foco real
e seletores de label nos testes novos. Contraprovas e logs preservados; o HTML
incompleto não foi usado como aprovação. Corrigido o foco após o campo voltar
a ficar habilitado, com seletores pelo nome acessível. Nenhum timeout, contrato
ou regra axe foi reduzido. O pré-list pelo npm do PowerShell consumiu flags;
foi interrompido antes dos casos e substituído pela chamada direta do runner.

Migration173 reconciliada no projeto autorizado: local173/remoto173, zero
pendências, digest ordenado igual, cinco funções/ACL/constraint iguais.
Predecessor172 coincide integralmente com a prova publicada; constraint ampliada,
sem locks/transactions antigos na pré-verificação e dry-run com uma candidata.
Advisors mantêm os cinco tipos anteriores, iguais salvo observed_at. Sem reset,
fixtures/Auth/Vault remoto ou backup redundante do banco sintético descartável.

Matriz105x39, primeiras30 colunas e56 PASS/49 PARTIAL preservadas. A declaração
inicial da transferência ainda precisa de rascunho persistente próprio; BAL/REQ
contextuais, paridade66/171 e demais gates continuam. CI60c419b aprovou
Windows/Ubuntu/banco, com browsers em andamento na observação e Preview READY.
A CI do novo SHA é independente. Sonar adiado pelo responsável; PR7 Draft, sem
merge/produção. Assinatura, backups, monitoramento e gates D-C sem nova aprovação.

[Provas](TRANSFER_DECISION_DRAFTS_VALIDATION.json),
[reconciliação remota](TRANSFER_DECISION_DRAFTS_REMOTE.json) e
[CI anterior](CI_60C419B_OBSERVATION.json).
