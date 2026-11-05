# Notificações internas, Realtime e coerência

## Consumidores e recuperação

- **WorkspaceSync** — Sinal/consulta: broadcast privado;
  sync30s/foco/online/visibility/reconnect; Isolamento/recuperação: Tópico
  uid, revisão sem payload; 401/403 revalida perfil; Conclusão: Emissão não
  basta se consumidor ignora revisão.

- **WorkspaceProvider** — Sinal/consulta: hca:data-changed → contexto;
  Isolamento/recuperação: Sequência/Abort; compartilha objetos de paciente
  iguais; Conclusão: Explica B4-012; não é ausência geral de listener.

- **Sino** — Sinal/consulta: useLiveRevision e polling30s;
  Isolamento/recuperação: Sequência de request, Abort e key por paciente no
  shell; Conclusão: Contraprova: reagiu ao novo sinal; vazio em erro/loading
  continua B1.

- **Central** — Sinal/consulta: useLiveRevision; paginação/filtro/manual;
  Isolamento/recuperação: key por paciente, Abort; seen independente de canal;
  Conclusão: Consulta paginada existente; não recomendar outra caixa.

- **Tracking documental** — Sinal/consulta:
  useLiveRevision/foco/visibility/manual, id/versão; Isolamento/recuperação:
  Abort por efeito; estado do provedor separado; Conclusão: Não certifica
  entrega, mesmo exibindo mensagem disponível.

- **FlowReviews** — Sinal/consulta: patientId/attempt local;
  Isolamento/recuperação: Atualiza após revisão própria; sem
  listener/foco/poll/manual próprio; Conclusão: Novo consumidor stale
  confirmado B5-010.

- **Consumo** — Sinal/consulta: objeto patient/attempt;
  Isolamento/recuperação: Perfil pode recarregar sem mudar referência patient;
  Conclusão: B4-012 reutilizado, sem replay do caso antigo.

- **BAL workspace** — Sinal/consulta: evento e polling30s/foco;
  Isolamento/recuperação: Consulta própria, distinta do legado; Conclusão:
  Revisão estática, sem novo E2E BAL.

`AppWorkspace` usa key paciente/modo, oculta conteúdo quando há erro de
autoridade/contexto e remonta read models na troca. A caixa e o sino também
têm chaves próprias. Não foi demonstrada mistura de dados entre pacientes.

## B5-010: Flow pendente não chega à tela aberta

[B58-U01](evidence/b58-browser-results.json): Chrome desktop real, build B3
`.next-e2e` idêntico ao produto atual, servidor próprio com guarda da stack e
canais externos false. Uma nova submissão foi criada por Auth/RPC locais e
conferida por SQL. Revisão de sync3→5; um evento hca:data-changed; uma consulta
de contexto e três do sino; zero GET de Flow em 35s; texto novo não apareceu.
Reload completo mostrou a sugestão. Há persistência e emissão; falta consumo.

É manifestação adicional da causa de invalidação da B4-012, não um novo motor
de notificações quebrado nem falha da Meta. FlowReviews não usa revisão e seu
efeito depende só de patientId/attempt. Polling do sync não força o efeito.
Canal Flow desligado não dispensa atualizar sugestões já persistidas, conforme
o próprio texto do produto. Não exigir publicação externa para reproduzir.

## Contraprova de troca de contexto

[B58-U02](evidence/b58-switch-results.json) refutou a hipótese de seleção antiga
persistente: após escolher o segundo paciente, não havia textarea antigo e a
lista era vazia. `AppWorkspace` remonta o conteúdo por paciente/modo. SQL
independente conservou a submissão original pending_confirmation. O primeiro
capturador esperava stale=true e falhou porque encontrou false; essa recusa
do oráculo está preservada em ATTEMPTS, sem repetir a operação ou inventar um
achado. O status HTTP da tentativa auxiliar não foi salvo e não é afirmado.

## Entre canais e estados

Caixa pessoal pode mostrar várias linhas/canais do mesmo evento. Unread conta
linhas não vistas, não tarefas físicas nem mensagens entendidas. Internal é
disponibilidade no app; accepted é aceitação externa; delivered/read vêm do
callback. seen_at não decide ciência/recebimento. B5-007 qualifica a exceção em
que “sem ocorrências” externo marca seen_at e recebe rótulo de aplicativo.

Regras required preservam canal interno; modo silent também cria linha interna,
sem destaque no sino. Regras opcionais/preferência podem desabilitar internal;
assim, external-only não garante tarefa interna de acompanhamento. Decidir
quais processos essenciais exigem regra required e validação humana, sem
forçar ruído para todo evento. Documento, dashboard e permissões continuam
independentes do sucesso do WhatsApp.

B3-013 conserva emissão ausente para perfil e certas identidades globais;
polling de revisão igual não resolve sinal inexistente. Sessão/revogação
revalidada na consulta não é certificação de apagamento de dados já exibidos.
Offline não oferece fila local de decisões; erros/resultado incerto devem
permanecer recuperáveis por intenção, sem repetir movimento físico.

Nenhuma suíte de UI completa foi repetida. Uma submissão pendente e dois
pacientes fictícios novos permanecem para inspeção; credenciais, logs CLI e
storage state ficam fora do Git. Não houve trace, vídeo ou mensagem externa.
