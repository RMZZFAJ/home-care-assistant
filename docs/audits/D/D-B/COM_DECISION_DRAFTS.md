# Rascunhos das decisões COM e referências oficiais

Incremento D3.34, base fcf04fa. Validação/rejeição de parcela, encerramento
de expectativa e cancelamento completam os sete propósitos operacionais COM
com preenchimento privado. Os demais formulários ENT/BAL/REQ continuam no
gate de D-B-AC-001, que permanece parcial.
[Fontes e resultados](COM_DECISION_DRAFTS_VALIDATION.json),
[reconciliação remota](COM_DECISION_DRAFTS_REMOTE.json).

## Implementação

Os novos propósitos reutilizam proprietário, paciente, alvo, etapa, CAS,
descarte e recuperação do kernel existente. A parcela selecionada e o motivo
voltam na retomada. O banco vincula o receiptId confirmado ao preenchimento
salvo e exige sua confirmação marcada para encerrar a expectativa. Salvar,
retomar, comparar e fechar a revisão não executam o ato oficial.

Parcela antes selecionada que ficou indisponível permanece identificada no
controle, sem substituir silenciosamente pela primeira pendente. Depois de
comparar as referências, o usuário precisa escolher expressamente outra
parcela elegível. Opções mostram número coerente com a lista da ficha, data,
quantidade de produtos e autoria preservada, distinguindo parcelas criadas no
mesmo instante. A autorização continua usando o identificador no servidor.

Comparação obsoleta consulta as duas versões exatas pelo histórico Auth
existente. O preenchimento privado não é fonte dos fatos oficiais. Erro,
recusa ou200 inválido retiram esses fatos e bloqueiam a adoção da referência,
preservando o formulário. A consulta não altera a URL ou seleciona outra aba.
Campos adicionais não descritos mantêm a ressalva do leitor histórico.

Adotar outra versão desmarca a confirmação anterior de encerramento e pede
nova conferência. Desmarcar um checkbox salvo também persiste seu estado
desmarcado. O resumo privado distingue quantidades em preparação, motivo,
referência legível da parcela e confirmação marcada/desmarcada; não apresenta
chaves técnicas como nomes de campos nem chama aprovação de recebimento.

## Provas e contraprovas

23 unitários/API,30 cenários Auth reais e20 cenários distintos de navegador
aprovados, com reuso qualificado registrado por fonte e consumidor. Cobertura
de quatro novos slots, sete propósitos COM, outro usuário administrador,
segunda sessão, CAS concorrente, descarte, propósito/parcela trocados,
revogação sob lock, confirmação desmarcada, consumo único e replay.

Chromium/WebKit comprovam retomada da parcela exata, escolha anterior que
ficou indisponível, troca explícita, resultado recuperado após resposta perdida
e reload sem outro POST oficial, fechamento de revisão sem efeito, referência
exata,403/200 inválido, nova confirmação após mudança e desmarcação persistida.
Regressões de aquisição/chegada, conferência, PDFs distintos e ENT preservadas.
Axe e duas capturas de viewport inspecionadas; isso não aprova paridade integral,
aparelho físico, tarefa humana ou assistiva. Tipos/build, lint e proteção das
84 migrations históricas aprovados.

Falha real preservada: FormData omitia o checkbox desmarcado e a mescla com a
base recuperava o antigo valor marcado. Uma contraprova leu esse valor no
servidor; a correção captura explicitamente o estado desmarcado e passa nos
dois navegadores. Falhas dos oráculos também ficam registradas: rótulos após
remontagem exigiram os nomes acessíveis dos controles; uma chamada multilinha
restante foi corrigida pela AST. Captura full-page ultrapassou o limite WebKit
de32767px após expandir os fatos; a captura virou viewport, conservando todas
as asserções e todos os fatos disponíveis para leitura. Nenhum timeout foi
aumentado e nenhum caso foi removido.

## Remoto e limites

Migrations167/168:20261109125807 e20261109130033. Pré-validação confirmou166
versões, compatibilidade dos rascunhos e quatro corpos anteriores. Dry-run
listou somente essas duas migrations, seeds=[] e roles=[]. Aplicação oficial
com perfil/destino fixados; sem reset, fixtures, Auth/Vault ou backup redundante.

Pós-check: local168/remoto168, última20261109130033, digest ordenado igual,
quatro corpos candidatos e ACL conferidos. Sem leitura direta da tabela
privada por anon/authenticated; commit continua restrito a authenticated.
Apontamentos de segurança iguais após excluir apenas observed_at, mantendo
os avisos anteriores. Não é aprovação global de segurança ou operação.

CI fcf04fa aprovou Windows/Ubuntu/banco e Preview READY; browsers ainda em
andamento na consulta. Novo SHA exige CI própria, inclusive cadeia limpa,
evolução legada e integração completa. A matriz corrige o gate antigo que
ainda dizia haver56 consumidores Fluent: sua retirada técnica já foi provada
em D3.28; a paridade integral do Modelo Integral continua pendente.

Matriz105x39, primeiras30 colunas preservadas,56 PASS/49 PARTIAL. Demais
formulários, paridade visual,66/171 e gates D-C/D6/humanos/AT/aparelhos/
provedores permanecem. Sonar adiado, PR7 Draft, sem merge ou produção.
Assinatura, backup, monitoramento e transportes não recebem nova aprovação.
