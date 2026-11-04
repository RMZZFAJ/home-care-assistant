# Revisão semântica dos testes de integração

Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. Leitura integral dos nove
arquivos de `tests/integration/`, concluída em 27/10/2026. Execução pelo auditor
raiz em 26/10/2026: **33 testes aprovados, nenhuma falha**, Node 24.22.0,
API local `127.0.0.1:54321`, envio externo desabilitado. Evidência:
`integration.json` e `integration.log`. Esta revisão não executou fixtures.

## O que a suíte demonstra

- Arquivo: `balance-idempotency.test.mjs`; Evidência principal: Três cenários
  BAL create/revise/submit; duas transações HTTP com sessão real aguardam o
  mesmo lock antes de qualquer commit; identidade, versão e snapshot iguais no
  retry; uma emissão/evento; Limite da evidência: Contrato RPC, sem browser ou
  resposta HTTP da aplicação perdida
- Arquivo: `balance-shifts.test.mjs`; Evidência principal: Opt-in, responsável
  de plantão, atraso, adiamento, expiração, ambiguidade, isolamento, revisão do
  ledger, troca de profissional e revisor distinto; Limite da evidência: Relógio
  e história ajustados em pacientes fictícios; cenário local não prova scheduler
  externo periódico
- Arquivo: `database.test.mjs`; Evidência principal: RLS/grants, identidades
  reais, canonicalização REQ, custódias ENT, proteção do último global, claims
  exclusivos e papel de serviço sem grants diretos; Limite da evidência: Alguns
  cenários chamados concorrentes usam `Promise.all` sobre o mesmo cliente SDK,
  sem provar sobreposição no lock
- Arquivo: `fluent-authority.test.mjs`; Evidência principal: Delegação separada
  de catálogo e auditoria; revogação; isolamento paciente; impossibilidade de
  alterar vínculos; Limite da evidência: Valida autoridade SQL, não ergonomia
  nem aparência Fluent
- Arquivo: `schedules.test.mjs`; Evidência principal: Proposta/aprovação,
  recorrência noturna 12x36, exceção, escopo, conflito entre pacientes e
  encerramento de série; Limite da evidência: Datas fixas de novembro/2026;
  merece futura revisão de dependência de calendário quando a regra de passado
  mudar
- Arquivo: `v4-review.test.mjs`; Evidência principal: Revogação enquanto archive
  espera lock; ciência coletiva; filtros de pendências; proposta global/convite;
  hold de template sem tentativas infinitas e reativação; Limite da evidência:
  Registry Meta e identidade telefônica são fixtures locais; não representam
  aprovação ou contato real
- Arquivo: `v4-workflows.test.mjs`; Evidência principal: REQ/ENT/ciência
  independentes, governança, arquivo manual, realtime privado real, lembretes,
  TOTP real, revogação Auth e contratos Flow/WhatsApp; Limite da evidência: Flow
  e callback são RPCs locais; não atravessam criptografia/transporte Meta e UI
  do dispositivo
- Arquivo: `shift-fixtures.mjs`; Evidência principal: Cria identidade pelo Auth
  oficial, vínculo explícito e escala real; helper de dia sem depender do fuso
  da máquina; Limite da evidência: Setup privilegiado é preparação; não é
  autorização de usuário de produto
- Arquivo: `v4-fixtures.mjs`; Evidência principal: Seleciona contexto real,
  renova cliente após sessão inválida, cria paciente isolado e ledger por RPC,
  busca job em fila retida; Limite da evidência: Clientes por nome compartilham
  contexto e fixtures globais; execução serial é parte da validade

## Forças que devem permanecer

- Auth real e Data API exercitam RLS e grants; testes não simulam `auth.uid()`
  como substituto universal. Setup SQL é identificado e separado dos comandos
  em teste (`v4-fixtures.mjs:73–113`).
- O teste BAL usa barreira observável de dois waiters e requests independentes
  (`balance-idempotency.test.mjs:10–46,67–85`). O teste de archive comprova que
  a
  revogação ocorre enquanto a transação aguarda (`v4-review.test.mjs:72–125`).
- A suíte preserva fatos separados: ciência não é atendimento, envio aceito não
  é leitura, atraso não vira contagem retroativa e regularização não apaga o
  prazo original. São asserções de domínio, não apenas HTTP 200.
- Realtime não se limita a verificar WebSocket aberto: prepara o stream do
  banco, recebe revisão, consulta novamente via RLS e rejeita tópico alheio
  (`v4-workflows.test.mjs:411–535`).
- TOTP realmente eleva AAL; a sessão limitada falha e token após signOut é
  revalidado (`v4-workflows.test.mjs:635–707`).
- Claims e completion verificam dono da lease e monotonicidade de callback;
  service role recebe RPCs necessárias sem grants em tabelas privadas
  (`database.test.mjs:406–522`).

## Lacunas e melhorias propostas para fase posterior

1. **Fronteira HTTP da aplicação:** grande parte destes testes chama PostgREST
   diretamente. O sucesso SQL não cobre corpo/headers/cookies/origem/erros de
   cada rota Next. BE-005 é exemplo: SQL idempotente não impede a API de gerar
   nova chave. Incluir recuperação pela mesma chave no adaptador HTTP.
2. **Conteúdo operacional e volume:** não há asserção dos valores finais dos
   templates por evento, nem histórico com mais de cem consumos/eventos. Isso
   explica por que BE-001, BE-002 e BE-004 coexistem com 33/33 verdes.
3. **Prazo real do worker:** claim exclusivo e autorização são bem cobertos;
   lote com preparo/upload/envio lentos, interrupção e expiração durante o lote
   não são demonstrados. BE-003 exige teste integrado de lease além do probe
   de relógio virtual.
4. **Invalidação por tipo de evento:** o teste realtime recebe um evento REQ.
   Não comprova perfil alterado, proposta global sem membership ou todas as
   origens de `invalidate_workspace`. Acrescentar matriz evento × destinatário
   para a regressão transversal investigada pelo auditor de banco.
5. **Concorrência antiga:** `database.test.mjs:132–136,200–209,227–237` usa o
   mesmo cliente para várias chamadas. Isso confirma o resultado de retries,
   mas a sobreposição depende do SDK/agendamento. Reusar barreira somente nos
   invariantes cujo risco exige duas transações simultâneas; não generalizar
   força do teste BAL para todos os testes antigos.
6. **Isolamento entre testes:** aprovação local de templates, preferências e
   contatos alterados por alguns cenários permanecem no ambiente descartável
   (`v4-review.test.mjs:596–669`; `v4-workflows.test.mjs:835–881`). Não é
   corrupção
   remota; é dependência de fixture conhecida. Registrar baseline e ordem,
   restaurar estado compartilhado quando isso favorecer execução isolada,
   preservando eventos imutáveis. A busca de jobs em fila retida é defesa útil,
   mas pode reservar jobs de outros cenários (`v4-fixtures.mjs:47–59`).
7. **Oráculos negativos:** muitos testes usam `assert.ok(error)`; isso pode
   aceitar falha por razão diferente da autorização esperada. Para fronteiras
   críticas, conferir código seguro e ausência do efeito persistido; preservar
   exemplos fortes já existentes com `42501`, `PT409` e contagem de eventos.

Essas lacunas não anulam a suíte nem implicam falha de produção por si mesmas.
Definem o alcance da evidência e quais testes futuros melhor discriminariam
regressões reais. A execução atual não homologa SMTP, Google OAuth, Meta,
dispositivos físicos, latência de produção ou scheduler hospedado.
