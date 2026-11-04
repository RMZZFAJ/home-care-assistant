# Balanços, contagens, ocorrências e consumo

P-BAL-01–07/P-OCC-01–03; T050–065. Dezessete cenários locais em
[B2.5](evidence/b25-results.json) e [suplemento](evidence/b25s-results.json).
Uma assertion inicial incorreta foi preservada em
[tentativa original](evidence/b25s-initial-attempt.json). Auth real, comandos
RPC
e persistência; duas simulações SQL têm rollback e limites próprios. Contagem
física humana e transcurso real de semanas não foram homologados.

## Três fatos distintos: contar, revisar e registrar consumo

BAL mede a quantidade física da equipe. Captura revisão do ledger e valores
de referência; o contador informa todos os produtos ativos, inclusive zero.
A primeira etapa da interface não oferece o saldo esperado como resposta.
A revisão compara os dois valores. Pela política optional, o banco aplica o
ajuste; pela required, aguarda grupos family/supervisor conforme any/all.
O estado terminal técnico de aprovação do BAL é **approved**, não confirmed.
Diferença de contagem gera referência bal no ledger; não comprova causa de uso.

Ocorrência é relato. Pode indicar shortage ou consumption, por custódia e com
texto/linhas estruturadas. Relatar não altera estoque. Confirmar consumo
estruturado é que debita; confirmar falta apenas confirma o relato; rejeitar não
debita. Essa separação deve permanecer mesmo ao simplificar formulários ou
integrar Flow. Transcrição e interpretação de texto não autorizam movimento.

- **Processo:** BAL anterior; **Quem inicia:** bal.count no paciente ainda não
  ativado; **Quem conclui/decide:** Revisores da política capturada; **Estados e
  recuperação:** draft/submitted/approved; reconto pendente com versão

- **Processo:** Configurar regime; **Quem inicia:** Família/admin com
  bal.schedule.manage; **Quem conclui/decide:** Mesma fronteira familiar;
  **Estados e recuperação:** Nunca ativado/ativado/pausado; ativação não
  retroativa

- **Processo:** Obrigação semanal; **Quem inicia:** Processamento do regime
  habilitado; **Quem conclui/decide:** Contagem real vinculada; **Estados e
  recuperação:** pending/counted/regularized; atraso preservado

- **Processo:** Atribuição; **Quem inicia:** Escala publicada e elegível; **Quem
  conclui/decide:** Pessoa designada, na janela; **Estados e recuperação:**
  active/missed/invalidated/deferred/counted

- **Processo:** Contagem agendada; **Quem inicia:** Profissional/supervisor
  realmente atribuído; **Quem conclui/decide:** Envio fecha obrigação física;
  revisão pode continuar; **Estados e recuperação:** Rascunho local/servidor;
  mesma tentativa recuperável

- **Processo:** Adiamento; **Quem inicia:** Designado ou supervisão autorizada;
  **Quem conclui/decide:** Família/admin; versões de origem e destino; **Estados
  e recuperação:** pending/approved/rejected/stale; pedido não suspende prazo

- **Processo:** Reconto formal; **Quem inicia:** Revisor com competência; **Quem
  conclui/decide:** Pessoa designada em plantão real; **Estados e recuperação:**
  Nova countVersion; autor/versões anteriores preservados

- **Processo:** Relato; **Quem inicia:** consumption.report; família para
  custódia familiar; **Quem conclui/decide:** Confirmador da custódia; **Estados
  e recuperação:** reported/confirmed/rejected

- **Processo:** Sugestão Flow; **Quem inicia:** Serviço com
  propósito/sessão/envelope; **Quem conclui/decide:** Próprio autor autenticado
  revisa; **Estados e recuperação:** Sugestão aceita vira relato, sem débito
  automático

A política de revisão pertence ao documento. B25-02 capturou required/all;
alterar a política atual para optional não liberou aquela revisão. B25-03
gravou aprovação familiar, recebeu material em outra ENT e tentou segunda
revisão:
referência obsoleta foi recusada. Reconto conservou a primeira aprovação em
countVersion1, mas exigiu novas aprovações na versão2. A antiga não aprovou a
nova contagem. Isso refuta a suspeita de reutilização indevida de revisão.

## Defeito de separação de responsabilidades no regime anterior

**B2-009:** no modo anterior, supervisão com capacidades padrão consegue contar
e aprovar a própria contagem pela RPC/API. B25-01 configurou revisão obrigatória
com grupo supervisor e any. A supervisora criou BAL submitted e o próprio ator
registrou aprovação; documento chegou a approved. Os IDs de contador e revisor
coincidem na persistência. Não foi necessário override nem falsificar papel.

O componente de detalhe oculta aprovação própria, mas esse controle visual não
impõe a regra na API/banco. O wrapper protege o contador de balanceContext no
regime agendado; esse contexto não existe no BAL anterior. B25-13 provou o
contraditório: contadora agendada também supervisora recebeu42501 ao tentar
aprovar seu BAL. O defeito é delimitado ao modo anterior, sem demonstrar saldo
arbitrário por pessoa sem vínculo. Prioridade P2 por revisão obrigatória que
pode perder a independência prometida.

Aceite futuro: contador original e contador real de cada versão não aprovam a
própria contagem em nenhum regime, mesmo por chamada direta ou após mudança de
papel; revisor distinto legítimo continua aprovando. Política optional não pode
ser confundida com aprovação manual da própria contagem. Não remover o regime
anterior para esconder a inconsistência.

## Regime por plantão e exceções de tempo/responsabilidade

Ativação é opt-in. B25-08 criou tipo diário, série real e regime apenas na
residência fictícia. A atribuição ficou executável para a pessoa designada;
administrador não ganhou poder de contar. B25-09 recusou outra pessoa e payload
sem atribuição/referência. O banco produz nomes, plantão, janela, semanas e data
da
contagem, não aceita esses campos como autoridade do navegador.

B25-10 manteve janela e pessoa enquanto pedido de adiamento aguardava decisão.
Supervisão foi recusada na aprovação familiar; família rejeitou e conservou
responsabilidade original. Mudança de agenda não pode deslocar prazo BAL como
atalho. Substituição no mesmo intervalo é assunto distinto, aprofundado em B2.6.

**B2-012:** após mudar a versão do plantão de destino, o pedido de adiamento
continua pending durante uma origem ainda válida. Em B25-11, a mudança foi só
de nota, uma atualização legítima. Refresh conservou o pedido; família tentou
rejeitá-lo e recebeu stale document target shift. A validação do destino impede
também a recusa. process_bal_patient sai cedo ao encontrar atribuição original
válida, antes de invalidar propostas cujo destino mudou. O painel ainda oferece
decisão pendente que não pode concluir. Ao registrar a contagem, B25-13 tornou
a proposta stale. Não houve aplicação do horário antigo, mas há pendência falsa
e interrupção de decisão. Aceite: invalidar prontamente o pedido ou permitir
rejeição segura sem aplicar o destino obsoleto; aprovação antiga deve continuar
proibida e prazo original preservado.

B25-12 simulou exatamente o fim da janela na função do scheduler dentro de
transação isolada e rollback. Atribuição anterior virou missed com prazo
histórico; próximo plantão recebeu active; atraso não foi apagado. A fixture
voltou
ao estado original. É execução dirigida de regra temporal, não espera de um dia
real nem teste de autorização HTTP do worker.

B25-15 aprovou adiamento de **reconto** em transação com papel authenticated e
claims provenientes de sessão Auth real; rollback devolveu a atribuição
original.
A obrigação já counted conservou seu prazo histórico. O auditor inicialmente
esperou extensão de obrigação pendente nesse caso e corrigiu a assertion:
adiar reconto não reescreve prazo de contagem já registrada. A extensão de prazo
semanal ainda pending permanece sustentada pelo código e regressões anteriores,
não demonstrada por essa amostra de reconto.

B25-16 pausou e reativou regime. Obrigações, reconto ativo e activated_at foram
preservados; pausado ainda permitia cumprir a tarefa existente. É coerente com a
regra de não dispensar pendências, desde que a família compreenda o alcance.
Pausa não retorna silenciosamente ao regime anterior. Mudanças de dia/tipo/fuso
produzem configuração nova; obrigações existentes conservam regime_snapshot e
prazos, em vez de recalcular passado.

Semanas antigas são regularizadas por contagem atual real, com actual_count_at
e vínculo ao mesmo BAL, sem fabricar contagens retroativas. Essa cadeia foi
reconstruída em process_bal_patient/finish_bal_count e testes históricos.
A B2 executou atraso de uma janela; regularização de múltiplas semanas e plantão
noturno não são marcadas como nova persistência comprovada nesta etapa.

## Contagem terminada não significa revisão terminada

B25-13 deixou obrigação counted e documento submitted. São fatos compatíveis:
a pessoa contou no prazo, mas o ajuste ainda aguarda revisão. O visualizador
possui seção de contagens em revisão e deve preservá-la. Não se recomenda
retroceder o atraso físico porque a família demorou a revisar.

B25-14 recusou cancelamento de BAL já vinculado à obrigação; ofereceu reconto
formal, sem apagar a primeira versão. B25-17 registrou reconto com zero para um
produto cuja referência era um. O ledger continuou um enquanto revisão estava
pendente. A diferença não virou débito de consumo nem ajuste prematuro.
Foi deixada nova atribuição formal para B2.6 examinar passagem de
responsabilidade.

Não existe comando geral de rejeitar BAL na enumeração atual. O processo usa
reconto motivado e, onde permitido, cancelamento anterior à aplicação. Reconto
é uma alternativa operacional real; um status rejected isolado não é melhoria
obrigatória. A família deve decidir se precisa também declarar discordância
sem solicitar nova contagem e qual responsável assumiria o próximo passo.

## Relatos incompletos e decisões conflitantes

**B2-010:** relato de consumption só textual é aceito, mas não pode ser
complementado para confirmação. B25-04 persistiu reported com lines=[];
confirmar foi recusado por structured confirmation required. API e interface
oferecem relatar/confirmar/rejeitar, sem complementar linhas mantendo ligação
com o original. Rejeitar e redigitar estruturado é saída possível, com esforço
e perda de encadeamento entre relato e esclarecimento. A promessa de conferir
quantidades depois é incompleta. Alternativas: exigir estrutura no consumo que
pretende debitar, ou permitir complemento versionado pelo autor/confirmador sem
editar o relato original. Não interpretar texto automaticamente como
autorização.

B25-05 confirmou consumo estruturado uma única vez; retry idêntico não debitou
de novo. **B2-011:** decidir o contrário depois devolveu sucesso vazio.
B25-06 tentou rejeitar o relato já confirmado; RPC retornou null sem erro e
estado continuou confirmed com o primeiro confirmador. API devolve200 e a
interface trata a operação como confirmada. O banco preserva o primeiro fato,
mas não informa que a segunda intenção não foi aplicada. O mesmo risco existe
entre revisores simultâneos com decisões opostas. Aceite: retry da mesma decisão
recupera resultado; decisão oposta devolve conflito/estado atual explicitamente,
sem estornar consumo ou apresentar rejeição como realizada.

B25-07 confirmou falta e rejeitou consumo sem qualquer débito. O texto do
diálogo ainda generaliza confirmação de consumo, relacionado ao feedback B1.
Não elevar essa frase a corrupção do saldo. A fila de consumo continua cortada
nos cem recentes e não resolve ref do aviso: A-BE-001/B1-UX-007 permanecem
dependências para B2.9, sem afirmar nova execução de volume nesta etapa.

## Segunda passada e transferência

Contraprovas preservadas: política capturada; aprovações por versão; referência
obsoleta recusada; contador agendado sem autoaprovação; falta sem débito; retry
sem duplicação; pausa sem apagar pendências; obrigação contada com revisão
separada. A diferença entre regimes revelou B2-009, que a UI sozinha escondia.
O pedido de adiamento obsoleto revelou B2-012, além do caminho normal de
decisão.

Aceites B2-009–012 e dependências de unidades/inativação B2-007 serão
consolidados. Banco/backend devem cobrir concorrência, locks e autoridade;
integrações devem validar Flow/avisos reais posteriormente. Ausência de pessoa,
substituição durante contagem, aprovação muito posterior e volume histórico
continuam na investigação transversal. Nenhuma correção, conversão de diferença
em consumo ou remoção de história foi realizada.
