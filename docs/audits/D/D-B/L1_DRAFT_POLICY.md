# L1 — política de rascunhos revisada pelo responsável

**14/11/2026 — implementação e aplicação remota verificadas; publicação e CI
do SHA final são o gate de fechamento.**
Esta decisão posterior substitui a obrigação anterior de conservar rascunhos
para todas as decisões curtas. Os contratos de permissão, efeitos oficiais,
concorrência e recuperação segura permanecem obrigatórios.

- Fichas REQ, COM, ENT, BAL e outros preenchimentos com etapas extensas conservam
  somente o último rascunho do usuário naquele contexto. Ao voltar ao
  preenchimento, um diálogo oferece Continuar ou Descartar e começar novamente.
  Não há central de versões de rascunho na experiência L1.
- Andamentos também conservam somente o último preenchimento. Na resposta à
  pergunta de esclarecimento, o responsável escolheu guardar o último também
  ao fechar voluntariamente. A próxima abertura oferece Continuar ou Descartar.
  O rascunho mantém os quatro campos; visibilidade e menções de publicação
  continuam sendo escolhas do ato de publicar, conforme o contrato vigente.
- Cancelar, arquivar e outras decisões curtas não salvam formulários privados
  nem criam uma preparação a ser retomada. Sair com mudanças pede confirmação;
  sair confirmado descarta os campos sem executar a ação.
- Uma falha conserva os campos na tela para nova tentativa. Antes de concluir
  que nada mudou, o sistema confere o resultado oficial. Resultado aplicado é
  reconhecido sem repetir o ato. Ausência confirmada permite tentar novamente;
  fechar descarta o preenchimento.
- Quando nem o resultado pode ser consultado, a mensagem declara a incerteza,
  apresenta a referência segura e orienta a procurar supervisão. Não afirma
  falsamente que nada foi registrado. Uma chave técnica de duplicidade não é
  um rascunho de decisão nem aparece como tarefa pendente para o usuário.
- A comprovação de ausência precisa impedir que uma requisição original atrasada
  aplique a ação depois dessa comprovação. O registro técnico fechado contém
  somente identidade da tentativa e escopo, sem campos de formulário.
- Dados e recibos históricos não são apagados para limpar a interface. PDFs,
  anexos e atos já confirmados conservam seus próprios contratos e recuperação.

A DEV já existe no repositório. Esta revisão não amplia o escopo L2; preserva
o funcionamento existente e seus fatos documentais.

## Implementação e verificação

Cancelamento, arquivamento e associação de extra da REQ; decisões operacionais
de COM/ENT; regularização administrativa; concordância, recusa, retirada e
expedição de transferência; revisão e designação de reconto; programação,
atribuição e adiamento do BAL usam confirmação sem salvar formulários privados.
As centrais dessas decisões foram retiradas. Endpoints e recibos históricos
permanecem compatíveis, separados da apresentação L1 atual.

O salvamento discreto foi habilitado somente nos preenchimentos longos L1.
Não bloqueia digitação; a confirmação oficial aguarda a gravação e usa a revisão
exata dos campos conferidos. Não há gravação automática de um formulário vazio
recém-aberto. Conflitos entre aparelhos exigem comparação e escolha explícitas.
Os quatro campos de Andamentos continuam separados de visibilidade e menções.

A migration incremental `20261114194500_l1_decisions_without_drafts.sql` mantém
recibos oficiais privados por autor e chave. A consulta de ausência fecha a chave
na mesma barreira transacional da execução. Isso evita anunciar ausência e depois
receber a aplicação tardia do pedido original. Uma chave fechada não contém
intenção, campos ou resultado. Grants diretos dos clientes e do serviço são
revogados; as RPCs conferem sessão Auth real, leitura, autoridade, versão,
referência e autorização novamente após possíveis esperas.

As 22 regressões nativas dirigidas passaram com Auth real: REQ, COM, ENT,
transferência, regularização, revisão/reconto e as seis decisões de programação
do BAL, além de escopo, grants, revogação concorrente e tentativa atrasada.
Os testes de interface que exigiam salvar ou retomar decisões curtas foram
atualizados para o comportamento que o responsável aprovou. Os contratos legados
continuam em suas suítes nativas, inclusive CAS, negativas e resultado imutável.
Esta mudança de expectativa é decorrente da retirada funcional da preparação
curta, e não uma exclusão de regra para obter CI verde.

Os diálogos de retomada e de saída e a conferência de resultado sem preparação
são complementos posteriores ao laboratório, solicitados explicitamente pelo
responsável. Usam os mesmos controles, sobreposição e linguagem visual L1.
Não representam um novo processo operacional ou uma central de pendências.

## Aplicação remota incremental

Destino conferido: RMZZFAJ, projeto `qwfrqychokvhdzakibid`, CLI fixado 2.121.0.
O dry-run apresentou somente a migration desta revisão. Backup crítico cifrado
`5cb965de-678e-49d0-84dc-a46a69099e30`: 81 arquivos, 16.326.929 bytes,
manifesto `ea80410991d40333c1832eb682029826a797c5e8725247e0a3b7585e19997c6d`,
verificação, limpeza e retenção concluídas. Não representa restore ou D6.

A pré-validação executou a migration inteira, conferiu grants/RLS, reverteu e
confirmou 259 migrations. A aplicação terminou em 260; os hashes de eventos,
estoque, exemplares e metadados de Storage permaneceram iguais. Os seis corpos
de função coincidem com o local após normalizar somente os finais de linha.
As tabelas privadas permanecem sem grants diretos aos clientes e serviço.
O dry-run final não tem pendências. Não houve reset, fixtures remotas, mudança
de Auth ou envio externo.

## Verificação dirigida da interface

Tipos e lint dos fontes alterados passaram. O runner guardado executou build
novo de produção e os cenários com banco local e Auth real, sem envio externo.
No mobile, os 12 casos dirigidos passaram: acesso e troca de paciente sob
sobreposição, recuperação de senha com envio explícito, os quatro tipos de
rascunho, menu Mais por ponteiro/teclado, Andamentos e decisões de REQ.

No iOS, nove desses casos passaram inicialmente. Os três que falharam antes do
fluxo alvo encontraram consulta local indisponível ou o seletor de pacientes
saturado por fixtures retidas. Menu e rascunhos passaram novamente com
identidades Auth reais novas no mesmo paciente sintético; nenhuma autorização
foi simulada, nenhum timeout foi ampliado e não houve reset para repetir o teste.
O seletor continua coberto pelo cenário próprio de troca de paciente.

A comparação de dois aparelhos COM e a recuperação da declaração de transferência
após perda de escrita também passaram em Chromium/iOS. O teste de resposta
inválida de REQ agora espera a confirmação da recuperação antes do reload;
conserva a igualdade dos dois pacotes, revisão e campos, sem novo ato oficial.
A repetição final passou nos seis casos Chromium/iOS: ENT, resposta inválida REQ
e arquivamento REQ. Os demais cenários dirigidos cobriram as decisões de COM/ENT,
BAL, transferência e regularização, incluindo descarte e resposta perdida.

A inspeção da captura do menu confirmou linhas alinhadas à esquerda, sem as
bordas de botões da barra de ações. A regressão exige esse estilo e a seleção
visível de Materiais após a ação por mouse ou teclado. A URL mudar sozinha não
é considerada aprovação. Conflitos e recibos oficiais continuam discriminados
dos rascunhos simples, com os controles necessários à recuperação real.

Estas verificações não são a suíte completa nem aceite humano ou em dispositivo
físico. A publicação permanece na branch existente; o gate solicitado é a CI do
SHA publicado iniciar corretamente os seis jobs de navegador, sem falha anterior.
Replay limpo, evolução legada e integração completa são verificados nessa CI.

## Correção anterior ao início dos navegadores

Na CI de `6ebcf0f1`, Ubuntu passou. O Windows executou 1.089 testes e encontrou
um único timeout: o comprovante Unicode longo, com duas renderizações e extração
independente de texto, levou 5.199 ms contra o padrão Vitest de 5.000 ms.
O caso agora usa os mesmos 30 segundos limitados dos probes de estrutura PDF.
Os 45 itens, conteúdo estável, paginação e título continuam obrigatórios;
nenhuma asserção, fixture ou renderização foi removida. Os nove testes desse
arquivo passaram na repetição dirigida no Windows local. Não houve alteração
de produto ou banco. A CI do commit corretivo precisa validar o conjunto e
iniciar corretamente os navegadores; o verde de Ubuntu do SHA anterior não é
aprovação do novo SHA.
