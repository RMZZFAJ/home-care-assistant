# Segurança de aplicação e privacidade

## Parecer e limites

As amostras HTTP recusaram ausência de sessão, contexto manipulado, papel
inadequado, identidade sem vínculo, cookie encerrado, origem hostil e callback
de outro WABA. Não foi demonstrado novo IDOR, escalada global, injeção SQL,
RCE, SSRF ou vazamento de segredo no browser. Isso não é certificação de
ausência de vulnerabilidades. B3-020/021 e o risco B4-010 permanecem abertos.

A revisão usou a skill security-best-practices e suas referências Next/React/
browser, confrontadas com Next 16.4.2 instalado e a política Supabase real.
Recomendação genérica de HttpOnly não é aplicada mecanicamente ao cliente SSR
Supabase, cujo fluxo browser usa tokens. A
[documentação oficial de sessões](https://supabase.com/docs/guides/auth/sessions)
explica `session_id`, verificação de `auth.sessions` após logout e a limitação
de cookies HttpOnly para aplicações ricas. O dado local não prova flags remotas.

## Matriz adversarial de segurança

- **Autenticação HTTP** — Controle observado / evidência: getUser +
  perfil/sessão; B42-01–15; Limite e decisão: Não corrige caminhos diretos
  B3-021.
- **Paciente/objeto** — Controle observado / evidência: RLS/RPC, contexto
  explícito; B42/B47/B48; Limite e decisão: Amostras não cobrem toda
  combinação de override.
- **Privilégio global** — Controle observado / evidência: Modo/assurance +
  requireGlobal; B48-04; Limite e decisão: Sem novo teste MFA; definições B3
  iguais.
- **CSRF JSON/multipart** — Controle observado / evidência: Origin exata,
  cross-site recusado, JSON; B43/B410-01; Limite e decisão: Ausência de header
  em cliente HTTP não prova CSRF browser.
- **CORS** — Controle observado / evidência: Preflight sem ACAO; B410-02;
  Limite e decisão: Não foi inspecionada configuração edge remota.
- **Retorno OAuth** — Controle observado / evidência: PKCE, safeReturnPath e
  origem configurada; B410-03; Limite e decisão: OAuth real não homologado.
- **Cache privado** — Controle observado / evidência: api no-store; PDF
  privado; B42/B47/B410-04; Limite e decisão: Estado React tem contrato
  próprio de frescor.
- **Segredo servidor** — Controle observado / evidência: service key só em
  servidor; B410-06; Limite e decisão: Busca exata da chave local, não
  histórico completo.
- **Upload e paths** — Controle observado / evidência: Reserva/ID servidor,
  bytes/MIME/hash, saneamento; Limite e decisão: B3-004/021 e B4-007 não
  resolvidos.
- **Webhook** — Controle observado / evidência: HMAC bruto, WABA e telefone;
  B49-04–05; Limite e decisão: B4-011 é ingestão perdida, não HMAC contornado.
- **Egress/SSRF** — Controle observado / evidência: Meta host fixo,
  redirect:error, timeouts; Limite e decisão: Sem fetch arbitrário por URL
  enviada pelo usuário.
- **SQL/comandos** — Controle observado / evidência: SDK parametriza
  RPC/filtros; sem shell no runtime; Limite e decisão: Não reaudita toda SQL
  da B3.
- **Logs/erros** — Controle observado / evidência: Código/operação/correlação;
  B46-04; Limite e decisão: Diagnóstico insuficiente B4-006; não expor payload
  para compensar.
- **Verificação pública** — Controle observado / evidência: Boolean de
  hash/versão; B410-05 e SQL; Limite e decisão: UUID/protocolo não concede
  acesso documental.
- **Headers browser** — Controle observado / evidência: CSP/frame options
  ausentes na amostra local; Limite e decisão: Verificar edge; sem exploração
  demonstrada por mera ausência.

[Seis probes B4.10](evidence/b410-security-results.json) não executaram carga,
ataque remoto, provedor, alteração de cookies ou configuração. O callback
hostil foi recusado no retorno; a API privada permaneceu no-store.
`.env.example`
é o único arquivo de ambiente versionado; a chave de serviço local não foi
encontrada nos assets estáticos examinados. Nenhuma chave entrou no resultado.

## Fluxos e superfícies sem exploração demonstrada

Proxy renova Auth, mas não é a barreira única: handlers e RPCs decidem. Não
há Server Actions de domínio para receber permissões diferentes silenciosamente.
Tipos TypeScript não são tratados como validação; Zod e SQL validam runtime.
REQ descarta rótulos fornecidos pelo navegador; perfil metadata não define
papel.

Busca por sinks de HTML, eval, shell, caminhos e URL de egress não revelou
caminho controlado por input até execução privilegiada. Textos são interpolados
em JSX, arquivo não vai a public, links de anexo são emitidos pelo Storage.
Não foi executada fuzzing de parser ou varredura de todas dependências; versões
pinadas não constituem prova de ausência de advisory.

Sem rate limiter próprio nas rotas da aplicação. Auth tem seus controles e
infra pode ter WAF/limites; não foi demonstrado esgotamento ou configuração
remota. PDFs públicos fictícios e parsing de arquivos pedem orçamento de
recursos sob volume autorizado, não teste de saturação nesta stack preservada.
Não introduzir novo serviço/queue apenas por essa observação.

## Questões de privacidade preservadas

PDF/observação podem conter informação privada e os templates usam nome curto
do paciente e eventualmente PDF. Comentário dizendo que omitem todo dado do
paciente não descreve esse payload. Destinatário autorizado e opt-in são
necessários; isso não foi classificado como vazamento real a pessoa indevida.

URL já emitida tem TTL; rascunho de recuperação no sessionStorage é temporário,
não histórico oficial. Revogar acesso não apaga cópia baixada. Retenção,
finalidade e operação de suporte precisam de decisão do controlador, sem
presumir conformidade jurídica a partir de testes locais.

B4-010 é janela sustentada de envio em andamento; B3-021 é bypass pessoal
direto já comprovado. Não aumentar para P0/P1 sem um caminho adicional e impacto
demonstrados. Nenhuma correção ou configuração foi aplicada. Próximo:
arquitetura, dependências, desempenho medido e resiliência.
