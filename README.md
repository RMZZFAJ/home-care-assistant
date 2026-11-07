# Home Care Assistant

Gestão operacional por paciente com Next.js, React, TypeScript e Supabase.
REQ, COM, ENT e BAL distinguem necessidade, aquisição, entrega, contagem,
ciência e estoque por movimentos. O sistema não prescreve ou decide conduta
clínica.

## Estado e documentação

**Produção NO-GO.** A e B1–B8 estão encerradas como diagnóstico; C concluiu o
planejamento documental C0–C10. **D-B em execução**, conforme a
[ordem e checkpoint](docs/audits/D/D-B/README.md).
**D-A consolidada localmente (D0–D2),
com CI e gates de liberação
independentes**, conforme
[checkpoint](docs/audits/D/D-A/CHECKPOINT.md). Base funcional auditada:
`37cb7f85e96e551d6419871f94dd950712e2565b`. O estado de deploy produtivo nesta
missão é NOT_VERIFIED; preview documental não é homologação do produto.

- [Portal por público](docs/README.md).

- [Estado por fonte e SHA](docs/current/PROJECT_STATUS.md).

- [Contratos implementados e desvios conhecidos](docs/current/README.md).

- [Decisões humanas](docs/decisions/README.md) e
  [projeto C](docs/audits/C/README.md).

- [Auditorias preservadas](docs/audits/README.md) e
  [plano D](docs/audits/D/README.md).

PWA e Web Push têm implementação no candidato D-B; entrega externa permanece
desligada e aparelhos físicos aguardam homologação. PDFs usam assinatura e TSA
internas, sem afirmar ICP-Brasil. Consulte os limites e evidências no checkpoint.
Rascunhos próprios REQ/BAL entre aparelhos e os processos D0–D2 estão
implementados no candidato D-A. Os dois P1 herdados receberam correção e
regressões discriminantes. Validação local e publicação na Draft PR não
representam aprovação da CI pendente nem liberação operacional.

O [fechamento definitivo C7–C10](docs/audits/C/C10-pr-handoff/README.md)
registra P02 OWNER_APPROVED, 66 fichas e 262 controles originais revistos.
Catálogo atual: 274 controles/424 usos; 187 aceites planejados. Draft PR 6
foi integrado à master. A implementação D-A usa o Draft PR 7, sem merge ou
liberação definitiva.

## Desenvolvimento

Use Node 24.22.0 e npm 11.21.1 dos arquivos de versão; lockfile e versões
exatas.

```sh
npm ci
npm run dev
```

Configure o ambiente local conforme `.env.example`, sem chave de serviço no
browser. A stack de desenvolvimento/testes é home-care-assistant, API
127.0.0.1:54321 e DB em 127.0.0.1:54322. Não criar outra stack para a suíte.
Antes de preparo, fixtures ou replay, ler [Testes](docs/current/TESTING.md):
esses comandos podem aplicar migrations ou substituir dados e exigem as
guardas, consentimento e backup pertinentes. Nunca executar testes mutáveis no
remoto.

## Validação e autorização

Mudança funcional autorizada usa os gates de contratos, lint, Markdown, tipos,
unitários/build e, conforme contrato, banco/Auth/E2E pelo runner local. Os
comandos e marcos estão no guia de testes; não há afirmação de CI verde atual
baseada em PR antigo. Nesta C, verificações são documentais e de preservação;
não se repetem suítes funcionais por alteração editorial. Deploy, migrations
remotas, envio, PR e merge dependem de autorização específica, nunca de relato
histórico.
