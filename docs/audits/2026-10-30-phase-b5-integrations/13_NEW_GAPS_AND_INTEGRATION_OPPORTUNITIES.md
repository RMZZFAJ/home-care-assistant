# Lacunas e oportunidades de integração

## Necessidades fundamentadas, sem criar outro motor

- **retomada de holds** — Já existe: next_attempt_at, erro, release de
  template/PDF; Falta comprovada/benefício: B5-002: caminho suportado sem
  retomada; identificar e reabrir só após regularização; Prioridade
  condicionada e custo: Para canal habilitado; aproveitar outbox/RPC, sem
  limpar filas.

- **conciliar uncertain** — Já existe: confirmação explícita e audit do retry;
  Falta comprovada/benefício: B5-013/014: tentativa/referência identificáveis
  e resultado preservado; Prioridade condicionada e custo: Antes de reenvio
  externo; mínimo de dados, sem copiar payload clínico.

- **entrada não encaminhada** — Já existe: dedup e contexto único; Falta
  comprovada/benefício: B5-006: continuação autenticada ou diagnóstico seguro;
  Prioridade condicionada e custo: Para texto inbound prometido; retenção
  mínima, não inbox bruto obrigatório.

- **avisar atraso/progresso** — Já existe: cron e health SQL; Falta
  comprovada/benefício: idade/backlog por domínio/paciente, último progresso,
  alerta responsável; Prioridade condicionada e custo: Operação precisa
  definir SLO/dono; não contratar observabilidade sem necessidade.

- **frescor de sugestões** — Já existe: revisão própria, chave por paciente,
  Realtime; Falta comprovada/benefício: B5-010: consulta precisa consumir
  invalidação; Prioridade condicionada e custo: Correção dirigida; não trocar
  protocolo Realtime inteiro.

- **protocolo Flow resiliente** — Já existe: cifragem/sessão/revisão; Falta
  comprovada/benefício: B5-008/009/011: replay, erro adequado, propósito;
  Prioridade condicionada e custo: Só se Flow entrar no escopo; homologar
  cliente real após correção.

- **telefone recuperável** — Já existe: Auth confirmado e
  register_verified_phone; Falta comprovada/benefício: B5-012: retomar só o
  vínculo, sem repetir OTP já concluído; Prioridade condicionada e custo: Só
  se SMS/WhatsApp necessário; não exigir SMS para operar sem canal.

- **conteúdo fiel/minimizado** — Já existe: catálogo versionado/short
  name/regras; Falta comprovada/benefício: B5-004/005: semântica por evento e
  campos aprovados; Prioridade condicionada e custo: Antes de ativar
  mensagens; não alterar PDFs históricos automaticamente.

## Recursos que podem ficar fora do primeiro uso

E-mail operacional, SMS operacional, transcrição de áudio e Flow REQ dedicado
não têm transporte/consumidor completo no produto atual. Não são requisitos
automáticos de lançamento. Manter desabilitados/fora da promessa se o app e a
contingência escolhida atenderem aos processos necessários. SMS Auth, Google e
Meta são decisões separadas; ativar todos aumenta custo e superfícies sem prova
de necessidade da residência.

Gestão de templates e suspensão do canal já têm peças de configuração, catálogo
e flag global/regras por paciente. Antes de criar painel novo, definir quem
opera, volume, frequência de mudança e homologação. O script Meta existente
pode alterar provedor e não foi executado; uma futura operação exige autorização
e diagnóstico privado. Integração automática de aprovação não está comprovada.

## Critério para aceitar uma oportunidade

Usar somente quando resolver problema demonstrado, houver consumidor e
responsável, o piloto precisar da função, a infraestrutura atual puder ser
aproveitada e o custo/retencão/dados adicionais forem aceitos. Escolher entre
correção técnica, configuração, decisão de produto, operação e homologação.
Não converter toda ausência em P1 ou recomendar nova fila/serviço de IA.

Comparações de texto/PDF, auditoria documental integral, novo processo de
assistência e atribuição de responsabilidades humanas permanecem fora da B5.
Este documento entrega alternativas para avaliação futura, sem iniciá-las.
