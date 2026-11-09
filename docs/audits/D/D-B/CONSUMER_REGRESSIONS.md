# Regressões dos consumidores, referência COM e foco

D3.36, base27d2a06. [Fontes e provas](CONSUMER_REGRESSIONS_VALIDATION.json),
[observação CI](CI_27D2A06_OBSERVATION.json). Lote local validado; CI completa
do novo SHA continua sendo gate próprio. Não conclui a paridade canônica.

## Causas e correções

O foco correto chegava à justificativa ou ao botão de revisão e era substituído
pelo contêiner do diálogo no mesmo quadro. A biblioteca recupera foco quando o
controle ativo desaparece. Os registros de chamadas e eventos provaram essa
ordem; adiar o foco para um efeito após o commit, sozinho, não resolveu.

O helper compartilhado mantém o foco no diálogo estável antes de retirar o
controle. Depois da atualização do DOM, o destino previsto recebe foco.
Regularização, retorno da revisão de escala e nova consulta de origem usam esse
transferência de foco. Nenhum atraso adicional, force, desativação do trap
ou regra de
acessibilidade foi introduzido. Instrumentação registra elemento, condição e
ordem, sem valores de campos; não atribui aprovação humana/AT/aparelho físico.

A COM tinha dois estados de referência: a ficha adotava a versão comparada,
mas o preenchimento privado mantinha a anterior e bloqueava nova revisão.
Agora a adoção explícita exige leitura autorizada das duas versões exatas e
atualiza a referência do preenchimento da mesma COM/paciente/propósito.
Confirmação anterior é desmarcada. Erro,403 ou200 inválido bloqueiam adoção,
ocultam fatos e conservam o motivo. CAS e nova confirmação permanecem exigidos.

Contraprova adicional revelou perda real do motivo: FormData omite os controles
desabilitados pelo conflito. A adoção usa o último motivo capturado do formulário
privado e sempre limpa a confirmação. A referência só muda por ato explícito;
atualização externa isolada não adota outra versão. Duas tentativas oficiais
usam versões e chaves distintas e produzem um único encerramento.

Consumidores antigos seguem as abas reais para materiais/regularização e usam
marcos, metadados e título inequívocos. A troca entre pacientes nos testes de
PDF sai primeiro da ficha anterior; a exigência do vínculo do documento continua
ativa. O teste BAL retém todos os GETs relevantes e verifica ausência de ação
habilitada enquanto consulta, sem aguardar menu de ficha ainda não disponível.
Auditoria responsiva inicia no topo após redimensionar, preservando axe e todas
as verificações de largura, foco, campos, estoque, PDF e autorização.

## Provas e limites

20 cenários distintos aprovados:16 móveis Chromium e4 WebKit/iOS. Rodadas e
contraprovas preservadas:14 iniciais com6 aprovados/8 falhos;16 seguintes com13
aprovados/3 falhos;4 de diagnóstico com2 aprovados/2 falhos;8 finais aprovados.
Repetições não inflam a contagem. Casos aprovados de fontes/consumidores
inalterados foram conservados; fontes congeladas em cada runner e nenhuma
suíte mutável de banco paralela. Tipos, lint, Markdown e links dirigidos passaram.

Os fluxos completos REQ→COM→ENT→BAL, dez linhas e negativas, importação física
preservada, PDF assinado/versão anterior, Web Push controlado, origem exata do
estoque, datas/conflito reservado, referência recusada e confirmação desmarcada
permanecem cobertos. Verificação real de navegador usa Auth local e envio externo
desabilitado; não é homologação de provedor, Android físico ou tecnologia assistiva.

Sem SQL novo:169 versões reconciliadas e84 migrations históricas preservadas.
CI27d2a06 aprovou Windows/Ubuntu/banco e teve Preview READY; browsers estavam
em andamento na observação. Não aprova este novo SHA nem a CI completa.
Matriz105x39, primeiras30 colunas,56 PASS/49 PARTIAL e18 requisitos UI mantidos.
Demais formulários, paridade66/171 e gates externos continuam. Sonar adiado,
PR7 Draft, sem merge/produção. Assinatura, backups, monitoramento e transportes
não recebem nova aprovação por este lote.
