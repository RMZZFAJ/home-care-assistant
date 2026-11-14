# D3.16 — retenção e escopo da recuperação privada

O buffer legado da REQ removia a cópia após24 horas, inclusive a chave de uma
tentativa incerta. Um comando real já confirmado perdeu sua ação de recuperação
no baseline. A contagem BAL agendada tinha o mesmo corte na seleção do modo e
na leitura do envelope. Os três cortes foram removidos conforme VI.4 da ordem
vigente: não impor TTL aos rascunhos. A expectativa antiga de24h de C032 recebe
complemento aprovado, preservando as29 colunas canônicas.

A cópia local continua opcional e restrita à aba, usuário, paciente e alvo.
Não equivale a salvar na conta nem promete sobreviver ao fechamento da aba.
Logout limpa as cópias locais hca; conclusão limpa o envelope recuperado.
O rascunho salvo na conta permanece no servidor, com revisão, hash e etapa,
até a ação autorizada correspondente. A interface explica como retomar em
outra aba, sessão ou aparelho; uma tentativa incerta pede recuperar a mesma
intenção antes de iniciar outra. Nenhuma ficha é criada por começar a digitar.

## Provas e preservação

A coorte final passou12/12: três cenários novos nos três motores e o consumidor
legado REQ em cada motor. Stack local existente, Auth real, dados fictícios e
transporte externo desabilitado pelo runner. Sem suíte mutável de banco em
paralelo, reset ou repetição das suítes globais locais.

- REQ: envelope local de26h com um comando real já confirmado. Outra aba não
  herda a cópia. Recuperar reenvia exatamente o mesmo pacote/chave, retorna a
  mesma ficha/comprovante e não altera o estado oficial. O envelope é removido.
- Conta: created_at/saved_at de um novo draft fictício são controlados para26h
  anteriores. A prova confirma a idade armazenada, troca paciente, sai da conta
  e entra como outro titular, que recupera positivamente seu próprio rascunho.
  Um contexto de navegador novo, sem cópia local, autentica o titular original
  e recupera o mesmo ID, revisão, conteúdo, hash e etapa. Sem novo efeito oficial.
- BAL: revisão opcional já aprova/aplica o comando. A fixture final conta1,
  exige movimentos reais não vazios e armazena o envelope com idade26h.
  O replay retorna a mesma ficha/versão aprovada e preserva todo o ledger e
  estado oficial, mesmo após cumprir a obrigação. Nenhuma nova chave é criada.
- O consumidor legado ainda conserva0 e7 como valores a revisar; não os
  converte em observação física confirmada. Os horários não são renovados
  por adotar ou recuperar uma intenção.

A remoção do prazo não remove o vínculo entre contagem editável e assignment/
referenceRevision atuais, a lista permitida de rotas pendentes, CAS, autorização
ou validação na API/banco. Cache privado e replay offline não foram alterados.
As provas usam metadata privada e envelopes sintéticos; não alteram relógios,
corpos ou hashes de eventos oficiais. Não representam espera real de26 horas,
aparelho físico ou avanço do relógio do servidor.

## Falhas conservadas e limites

São17 execuções de browser:14 PASS e três FAIL preservadas. O baseline perdeu
a recuperação; a primeira coorte passou a REQ e parou porque a nova fixture
usava updated_at, coluna inexistente, corrigida para saved_at conforme schema.
A segunda passou a retomada da conta e parou na expectativa submitted para
BAL com revisão opcional. O contrato existente aplica a conciliação e produz
approved; a prova final exige esse estado e ledger não vazio, sem aceitar
qualquer estado nem mudar regras do produto. A tipagem inicial de navigation
no teste também foi corrigida antes de executar browsers.

Os avisos de limite de falhas do runner não são outros casos. Houve respostas
CONTEXT_REQUIRED da consulta de notificações durante transições de sessão;
ficaram nos logs, sem dados privados e sem serem tratadas como ausência de erros.
Tipos, lint afetado e Markdown passaram. O
[manifesto](DRAFT_LIFECYCLE_EVIDENCE.json) vincula fontes, logs e contraprovas.

C032 passa localmente com a política atual e isolamento demonstrado. Isso
não aprova todos os consumidores da D-B ou os ensaios humanos/AT/aparelho.
Matriz46 PASS/50 PARTIAL/9 NOT_STARTED,105x39; demais critérios preservados.

Nenhuma migration ou mutação remota: a
[consulta read-only](DRAFT_LIFECYCLE_REMOTE_OBSERVATION.json) confirmou157,
última20261108212500. Arquivos SQL inalterados; pós-DDL anterior referenciado,
sem backup/restore/comparação integral redundante, Auth/fixture remoto ou reset.

[CI basebca3933](CI_BCA3933_OBSERVATION.json): banco e validate Windows/Ubuntu
SUCCESS, quatro browsers em andamento. Preview da base READY na origem estável;
API runtime/PWA iguais aos do probe827531e, que não foi reexecutado aqui.
O novo SHA exige sua própria CI/observação de Preview. Sonar adiado pelo
responsável. Assinatura/TSA e arquivos PDF não mudaram. PR7 Draft, sem merge
ou promoção; prioridade diária e meta D-B ativa, gates D-C/D6 preservados.
