# B7.11 — Estratégia de implantação e prontidão

## Matriz operacional

`11_RELEASE_READINESS_MATRIX.csv` consolida os14 domínios pedidos, com estado,
prova, falha, limite, dependência, aceite, prioridade, responsável, decisão para
C, opção de desativação e consequência no primeiro uso. Nenhuma linha declara
GO. Pronto no contrato local, configuração, correção, decisão e homologação são
estados diferentes. O SHA servido e o schema consultado são evidência de
identidade, não aceite dos processos.

## Estratégias comparadas para decisão futura

- **Projeto operacional novo**. **Benefício e dependências:** Separação
  explícita de dataset, Auth e serviços. **Risco e reversibilidade:**
  Migração/provisionamento/chaves/custo e restore precisam ensaio. **Evidência /
  decisão necessária:** Autorizar destino e preservação; não criado pela B7.
- **Projeto associado existente**. **Benefício e dependências:** Preserva
  integrações e identidades conhecidas. **Risco e reversibilidade:** Requer
  identificar dados reais/teste e compartilhamento com preview. **Evidência /
  decisão necessária:** Inventário, backup, permissões, sem limpeza/reset por
  inferência.
- **Piloto sem Meta/Flows**. **Benefício e dependências:** Núcleo web e
  notificações internas podem sustentar percurso aprovado. **Risco e
  reversibilidade:** Família/equipe precisam consultar app e assumir
  contingência/prazos. **Evidência / decisão necessária:** Corrigir bloqueios
  aplicáveis e aceitar alternativa humana.
- **Ativação por paciente**. **Benefício e dependências:** Regime BAL opt-in e
  regras locais já existem. **Risco e reversibilidade:** Flag externa é global;
  regras/identidades precisam limitar elegibilidade. **Evidência / decisão
  necessária:** Conferir efeito no paciente autorizado e isolamento dos demais.
- **Liberação por capacidade**. **Benefício e dependências:** Adia opcional sem
  prometer função inexistente. **Risco e reversibilidade:** Não esconder
  dependência essencial nem usar menu como autorização. **Evidência / decisão
  necessária:** Escopo e critérios por processo aprovados pelo responsável.

Combinações são possíveis. A auditoria não escolhe unilateralmente destino,
escopo do piloto ou riscos aceitos. Não precisa introduzir microsserviço ou novo
motor de fila para executar uma liberação gradual com os controles atuais.

## Sequência segura proposta, sem execução

1. Decisão humana: escopo dos processos/papéis/pacientes, recursos desligados,
   responsáveis/substitutos, canais de contingência, RPO/RTO e critérios de
   parada. Resolver bloqueios A/B1/B3 e falhas dos fluxos essenciais escolhidos.
2. Release candidato: SHA/artefato identificados, checks do mesmo SHA, resultado
   de QA-001 conhecido, matriz de configuração e esquema mínimo/compatibilidade
   antiga/nova. Não usar verde antigo nem status Vercel como substitutos.
3. Destino: conferir conta/equipe/projeto/target e dado permitido; separar
   preview de operação conforme decisão. Guardar backup recuperável integrado e
   validar DR em ambiente isolado antes da exposição a dados reais.
4. Banco: inventariar instalado, revisar lock/backfill/timeouts/compatibilidade,
   aplicar somente incrementos autorizados após pré-validação. Se falhar,
   interromper cutover, registrar o que persistiu e não reparar histórico à
   força.
5. Serviços: configurar Auth/Storage/keys/redirects/canais e Vault em operação
   autorizada, manter jobs/canais contidos até reconciliação; conferir URLs e
   correspondência de segredos sem registrá-los no relatório.
6. Bootstrap: usuário Auth e administrador global explícitos; primeiro paciente
   e administrador local sob autoridade correta. Catálogo vazio só recebe itens
   adotados/revisados. Não inventar vínculo operacional pelo papel global.
7. Estoque inicial: levantar materiais reais, custódia, unidade e precisão;
   registrar entrada/contagem no fluxo apropriado com autoria e evidência.
   Separar histórico desconhecido e trânsito; não editar saldo diretamente.
8. Primeiro uso: REQ sem quantidade, COM com recebimento validado, ENT com
   destinatário/quantidade física e aceite, programação real de escala e BAL com
   contagem atual e revisão aplicável. As jornadas escolhidas precisam de
   homologação própria, sem carregar fixture local em remoto.
9. Implantar/promover somente com autorização futura e gates aprovados.
   Registrar SHA, schema, ambiente, configuração, autor, instante e razão do
   cutover.
10. Pós-deploy: smoke por papel/contexto, dados autorizados, refusas esperadas,
    anexo/PDF dentro do limite coerente, hash/versão e recuperação de erro.
    Acompanhar dependências e backlog, não somente shell/login.
11. Ativar scheduler/worker somente após verificar reconciliação, regras e
    destino. Conferir avanço útil e ausência de reenvio/duplo movimento.
    Meta/Flows ficam desligados até homologação específica aprovada.
12. Monitoramento inicial: dono observa falhas/aging/latência segundo prazos
    aceitos e registra a revisão de aceite. Não considerar ausência de
    reclamação como prova de normalidade ou ciência/recebimento de materiais.

## Parada, rollback e recuperação

Parar a liberação se identidade divergir, migration/pós-condição falhar,
configuração essencial faltar, autorização ou isolamento falhar, histórico/hash
divergir, estoque não reconciliar, prova essencial faltar ou progresso exceder
prazo aceito. Conter a capacidade afetada e preservar estados incertos.

Rollback de aplicação exige artefato anterior identificável e compatível com
schema/dados atuais, configuração correspondente e verificação posterior. Ele
não desfaz movimentos, decisões, mensagens, migração de dados ou revogações.
Quando não for compatível, forward fix incremental ou recuperação em destino
isolado são alternativas a avaliar; não apagar dados para fazer o código antigo
voltar. Não executar rollback real nesta fase.

Depois de falha de migração, conferir versões aplicadas e integridade antes de
escolher retorno. Depois de restore, conferir DB/Auth/objetos/configuração e
fatos externos antes de jobs. Não reenviar toda fila, marcar uncertain como
failed em massa ou dar baixa de estoque para igualar uma contagem presumida.

## Recursos que podem permanecer desligados

Meta WhatsApp, Flows, aceite simplificado externo, OAuth/SMS não exigidos pelo
percurso aprovado, transcrição e e-mail operacional sem transporte podem ficar
fora do primeiro escopo. Isso exige não prometê-los e oferecer alternativa
aceita. Notificações internas dependem de scheduler e leitura humana, mesmo sem
WhatsApp. Auth/DB/autorização/ledger e recuperação dos registros essenciais não
podem ser dispensados. Storage/service key continuam necessários a anexos e PDF
quando esses processos integrarem o uso aprovado.

Esta estratégia é insumo para C. Nenhuma conta, projeto, estoque, paciente,
flag, cron, configuração, migration, deploy ou rollback foi executado por ela.
