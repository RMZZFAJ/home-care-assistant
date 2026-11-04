# Ambiente, backup, recuperação e homologação

Plano de D6, **não executado em C**. P03/P04/P05/P08/P10/P13 ainda exigem
compromissos humanos. Backup com hash e TOC legível é insumo, não demonstração
de restauração. Não usar o banco local da auditoria como operação real.

## Destino e ponto de recuperação

P04-A recomenda projeto real separado de teste/preview; B exige segregação
formal com riscos explicitamente aceitos; C adia operação. Nenhum projeto foi
criado. Inventariar organizações, IDs, domínio, região, versão, limites, Auth,
Storage, cron e egress do destino antes de configurar ou copiar dados. Não
reutilizar vínculo CLI como autorização para suíte mutável remota.

Definir ponto de corte recuperável entre DB/Auth/objetos. Dump e cópia Storage
sequenciais podem refletir instantes diferentes: usar janela de consistência
autorizada ou journal/manifesto de objetos e estados que permita reconciliar
gravações em andamento. Selecionar mecanismo por RPO/custo aprovado, sem
prometer
snapshot transacional de serviços distintos. Registrar início/fim/corte,
versão do artefato, migrations, contagens e hashes sem dados privados no Git.

## Componentes que precisam ser recuperados juntos

<!-- c-table:start -->

- **Componente:** Schemas, extensions, migrations

  **Prova no backup/restore:** Cadeia, funções, triggers, views, RLS, grants e
  defaults

  **Limite/controle:** SQL histórico imutável; restore não altera schema para
  esconder drift.

- **Componente:** Usuários Auth e identidade

  **Prova no backup/restore:** Login oficial, e-mail confirmado e vínculo
  coerente

  **Limite/controle:** Hash/sessão/segredo ficam em custódia segura, nunca
  documento público.

- **Componente:** Perfis, memberships, capacidades

  **Prova no backup/restore:** Pessoas/estado/contexto e negações cruzadas

  **Limite/controle:** Não promover metadata, global ou fixture
  automaticamente.

- **Componente:** Documentos e protocolos

  **Prova no backup/restore:** IDs/séries, versões, hashes/encadeamento e
  datas de origem

  **Limite/controle:** Nenhum novo fato físico inferido no restore.

- **Componente:** Ledger/custódia

  **Prova no backup/restore:** Quantidades exatas e conservação
  family/team/transit

  **Limite/controle:** Não reconstruir saldo por edição direta.

- **Componente:** Escalas/BAL

  **Prova no backup/restore:** Séries, corte, obrigações, atribuições,
  revisões e prazos

  **Limite/controle:** Cursor/cron antigos não geram tarefas externas antes de
  conciliar.

- **Componente:** Anexos/PDFs/avatares

  **Prova no backup/restore:** Bytes, tamanho/hash, original/derivado,
  ready/quarantine e referências

  **Limite/controle:** DB não contém os bytes; objeto ausente não é PDF válido
  regenerado.

- **Componente:** Drafts e recuperação

  **Prova no backup/restore:** Conteúdo atual, bases, revisões e identidade do
  resultado confirmado

  **Limite/controle:** Não reenviar intenção já executada após corte.

- **Componente:** Jobs/outbox/tentativas

  **Prova no backup/restore:** Estados, leases, geração, referências e efeitos
  externos pós-corte

  **Limite/controle:** Uncertain continua incerto até conciliação.

- **Componente:** Push/consentimento

  **Prova no backup/restore:** Inscrições/versão de chave/opt-in e
  desassociação

  **Limite/controle:** Não disparar push de ambiente restaurado; revalidar
  titulares.

- **Componente:** Vault/chaves/configuração

  **Prova no backup/restore:** Inventário seguro e destino correto das
  chaves/URLs

  **Limite/controle:** Acesso separado; segredo de produção não habilita
  egress no ensaio.

- **Componente:** Artefato/assets/fontes/QR

  **Prova no backup/restore:** Build/schema mínimo, renderer e domínio
  confiável

  **Limite/controle:** Hash canônico não substitui fontes/bytes de
  representação emitida.

- **Componente:** Logs/audit/monitoramento

  **Prova no backup/restore:** Correlação e trilha suficiente à reconciliação

  **Limite/controle:** Retenção mínima justificada e sem payload privado.

<!-- c-table:end -->

## Ensaio isolado e quarentena

1. Obter autorização específica e destino novo/isolado. Nunca restaurar sobre
ambiente existente do usuário para “testar”. Validar backup/hash/manifesto
e acesso dos donos/substitutos; manter original protegido.
2. **Antes de carregar cron/Vault/jobs**, estabelecer negação de egress e
agendamento no destino. Verificar contenção com sentinels/transportes
controlados e inspeção; não enviar mensagem real para testar bloqueio.
3. Restaurar DB/Auth/objetos/configuração de forma coerente. Credenciais e
   URLs
do ambiente recuperado não apontam para endpoints operacionais antigos.
4. Comparar contagens/FKs/hashes e amostras de versões/atores/ledger; testar
login/autoridade, PDF/anexo antigo, draft, escala e pendência por capacidade.
5. Listar efeitos externos e fatos físicos ocorridos após o corte. Evento já
enviado/recebimento já confirmado não é repetido porque sumiu da cópia antiga.
Conciliar por referência/intenção/tentativa, com participação operacional.
6. Invalidar/revalidar leases e subscriptions conforme política, preservar
uncertain e dedup. Cron/worker só retomam após aceite de reconciliação e
conferência do destino/configuração; habilitar em etapas monitoradas.
7. Medir perda efetiva e tempo de recuperação; comparar ao RPO/RTO que o
responsável escolheu. Registrar limitações e nova tentativa somente se
evidência contradiz o aceite; não prometer metas sem compromisso humano.

## Homologação real proporcional

P10 escolhe usuários de família/profissional/admin local e supervisão se
usada,
aparelhos reais com OS/browser/versão e redes relevantes. Executar jornadas C3
com entendimento do resumo, teclado, foco, zoom/AT, impressão e recuperação.
Provar Auth e-mail de confirmação/reset; SMS/OAuth só quando habilitados.
PWA/push exige opt-in/negação, app fechado, expiração/revoke, conta trocada,
deep link e falha do serviço mantendo pendência interna.

Meta/Flows em D7 separado: conta/idioma/template/publicação/chaves reais,
callback/replay/cancelamento em andamento, minimização e tentativa antiga
versus nova. Nenhuma prova local/controlada certifica entrega/leitura externa.
Impressão/QR verificam exemplar físico e arquivo; QR legível sozinho não prova
integridade. Restaurar com sucesso técnico não prova compreensão humana.

P13 define volume e orçamento para medições de fila, latência e Storage.
Escolher
amostra representativa e teto de execução, sem carga indiscriminada ou
percentis
inventados. Guias recebem capturas pósD e aceite dos públicos. Produção
continua
NO-GO até todos os gates aplicáveis e decisões obrigatórias terem evidência.
