# Segunda passagem adversarial e recuperação

## Resultado da passagem transversal

B3.12 acrescenta nove cenários executados. A
[matriz](12_CROSS_LAYER_SCENARIOS.csv)
tem 23 recortes, incluindo os15 exemplos da ordem mestre. Referências a testes
anteriores não contam como novos testes.
[Auth/HTTP](evidence/b312-results.json),
[histórico/jobs](evidence/b312h-results.json),
[mil versões](evidence/b312v-results.json) e
[recuperação](evidence/b312-recovery.json) conservam método e limites.

Uma sessão Auth oficialmente encerrada falhou em my_session_valid e na API
perfil401, mas seu JWT ainda no prazo atualizou nome/preferências e ponteiro
de avatar próprios por RPC. Stock_overview permaneceu42501. B312-01 amplia o
achado Storage B310-10: a ausência de consulta da sessão também existe nas
duas funções de identidade. Não houve mudança de senha/e-mail, identidade de
outra pessoa ou dado operacional de outro paciente. O alcance é delimitado,
mas a promessa de encerrar aquela sessão não cobre todas as escritas.

Na barreira B312-02, uma chamada de estoque começou no paciente A e esperou.
A mesma sessão mudou oficialmente para B antes da liberação. O movimento
explícito continuou em A, e uma nova chamada para A foi recusada. É a mesma
família de ordem autorização/lock de B38-06. Troca de contexto não redirecionou
o comando para B nem retirou vínculo A. A decisão futura deve definir onde se
lineariza a autorização de uma intenção já em curso, sobretudo na revogação.

B312-03 usou o mesmo produto global e profissional com vínculos legítimos nos
dois pacientes. Vincular item REQ de B a ENT de A foi recusado; não persistiu
draft/filho. Essa contraprova isola o escopo do paciente de diferenças de
produto
ou ausência de membership. A exclusão temporal de plantões também permanece
global ao profissional, sem abrir leitura de agenda alheia.

B312-04 atravessou Auth, serviço, sessão Flow, submissão e relato: cliente não
chama flow_exchange, replay idêntico não duplica submissão, outro corpo
conflita,
outra pessoa não confirma, o dono confirma uma vez e revogação bloqueia Flow
novo ainda não usado. Não se validaram criptografia Meta, OTP, publicação ou
entrega. Outbox/Flow aceito no banco não equivale a mensagem recebida.

B312-05 acrescenta lacuna: page/size NULL passam pelo IF NOT BETWEEN, e LIMIT
NULL remove o limite da RPC de documentos. Foram devolvidos16 documentos
autorizados, contra1 na página normal. A API valida a paginação e o isolamento
permanece; há quebra do contrato de limite, sem DoS demonstrado.

## História antiga e significado das notificações

As fixtures novas de 200 e1000 versões rodaram com todos os triggers e rollback.
No ensaio1000, leitura Auth recuperou os1000 metadados de eventos e a versão1;
verificação histórica continuou verdadeira e os1000 digests independentes
coincidiram. Nenhum paciente dessas fixtures permaneceu no banco.

DB-005 ganhou medição estrutural. Aos 100,500,1000 eventos existiam5050,125250,
500500 entradas resumidas acumuladas. Corpos em texto somavam809.915,
18.030.715 e71.056.717 bytes. Soma pg_column_size era120.318,1.045.047 e
3.194.326 bytes; não representa tamanho completo de tabela/TOAST/índices ou
backup. Tempos de preparação/medição313,097/2251,616/6361,283ms não são latência
de comando de usuário. A fixture COM de um membro e sem linhas dá um recorte;
REQ inclui outros campos. Crescimento quadrático de resumos é demonstrado,
sem evidência de incidente de produção ou justificativa para reescrever hashes.

Verificação pública B312-07 devolveu somente booleano: hash exato da versão
existente true, hash errado/ID ausente false e conteúdo privado recusado.
Superfície deliberada limitada; não é vulnerabilidade só por permitir anon.
Digest ancorado no próprio banco também não é assinatura independente contra
um owner comprometido, fronteira de confiança que precisa ficar clara.

B312-08 cancelou COM durante fixture de job em processamento. O job continuou
autorizado a ler snapshot aprovado v1, enquanto documento estava cancelado v2;
nova ação de aprovação foi recusada. É notificação de evento histórico, não
permissão para agir em estado terminal. Ordenação, rótulo, horário e utilidade
de avisos atrasados requerem decisão/homologação; o teste não prova envio real.

## Contraditório de integridade e preservação estrutural

O catálogo final manteve232 funções, nenhuma alterada ou ausente. Todas as
constraints public/private estavam validadas.720 eventos instalados schema2
tinham zero divergências entre body e digest. Joins agregados de escopo de
linhas, eventos, anexos e notificações documentais apontaram zero divergências.
São consultas owner para integridade, não provas de acesso por papéis expostos.

O scanner achou um movimento sem paciente/catálogo local. Seu hash coincide
com o baseline privado e a linha corresponde à fixture que test-migrations
explicitamente exige preservar. O schema anterior não tinha paciente e a view
deliberadamente exclui esse legado. Não foi inventada nova corrupção nem
atribuído paciente por suposição. O único ready sem metadado Storage corresponde
à fixture privilegiada B310-09, não a uma falha comprovada do upload normal.

## Recuperação: inventário de dependências

- **PostgreSQL** — O que precisa ser recuperado junto: Schema, dados, FKs,
  índices, enums, funções, grants, defaults; Prova B3: Dump legível/hash;
  catálogo; Pendência: Restore e comparação funcional.

- **Auth** — O que precisa ser recuperado junto: Users, identities, sessões,
  assurance; configuração JWT/OAuth/SMTP; Prova B3: Auth data consta do dump;
  sessões reais locais; Pendência: Configuração/plataforma/chaves e recuperação
  de login.

- **Autoridade** — O que precisa ser recuperado junto: Membership, capabilities,
  contextos, governança, convites; Prova B3: Contratos e negações reais;
  Pendência: Definir sessões/convites após desastre e rotação.

- **Storage** — O que precisa ser recuperado junto: Bytes, bucket/policy, nomes,
  hashes, metadados DB; Prova B3: Upload/download sintético e PDF histórico;
  Pendência: Restaurar bytes e reconciliar referências.

- **Documentos/ledger** — O que precisa ser recuperado junto: Versões/hash
  anterior, snapshots, movimento/referência; Prova B3: Digests e rollback; mil
  versões; Pendência: Reconciliar restore sem inventar consumo/saldo.

- **Cron/jobs** — O que precisa ser recuperado junto: pg_cron/pg_net, schedules,
  health, cursor, leases/outbox; Prova B3: Dois jobs locais; cenários de
  falha/progresso; Pendência: Reinício seguro e incerteza externa
  pós-restauração.

- **Vault/segredos** — O que precisa ser recuperado junto: Dados criptografados
  e dependências de chave/plataforma; Prova B3: Presença de objetos no dump;
  valores não exportados; Pendência: Validar decriptação e reconfiguração segura
  no destino.

- **Integrações** — O que precisa ser recuperado junto: Estado Meta,
  template/aprovação, IDs externos, callbacks, SMTP; Prova B3: Contratos locais
  e estado incerto; Pendência: Homologação externa e conciliação de mensagens já
  enviadas.

- **Render/config** — O que precisa ser recuperado junto: Fontes, renderer,
  variáveis, domínios/origens, flags; Prova B3: Bytes/hash PDF local; env
  externo desativado; Pendência: Reprodutibilidade de layout e URLs no destino.

- **Operação** — O que precisa ser recuperado junto: Procedimento, dono,
  RPO/RTO, janela, alertas e rollback; Prova B3: Dependências enumeradas;
  Pendência: Ensaio cronometrado com responsável e evidência.

O backup privado anterior à escrita continua com 5.869.080 bytes e SHA-256
28d6127b…fe444ef4. O índice inclui dados Auth, documentos, contexto privado e
metadados Storage. Não inclui prova de bytes de buckets restaurados nem de
configurações externas/decriptação. OPS-001 permanece aberto. Não houve restore
sobre a stack existente nem outra stack criada como substituta.

## Limites explícitos da segunda passagem

Não se injetou exceção física de backend após commit, queda de rede real,
crash do PostgreSQL, failover, deadlock de todas as ordens de locks ou execução
remota. Ignorar uma resposta e repetir a intenção prova idempotência naquele
caminho; não certifica toda recuperação de infraestrutura. Não houve replay
limpo/legado B3, restore integral, navegador, aceite humano/dispositivo físico
ou entrega externa. Garantias aprovadas são recortes, nunca certificação total.
