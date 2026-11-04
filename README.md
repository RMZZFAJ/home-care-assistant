# Home Care Assistant

Gestão operacional por paciente com Next.js, React, TypeScript e Supabase.
REQ, COM, ENT e BAL distinguem necessidade, aquisição, entrega, contagem,
ciência e estoque por movimentos. O sistema não prescreve ou decide conduta
clínica.

## Estado e documentação

**Produção NO-GO.** A e B1–B8 estão encerradas como diagnóstico; C concluiu o
planejamento documental. **D NÃO INICIADA.** Base funcional auditada:
`37cb7f85e96e551d6419871f94dd950712e2565b`. O estado de deploy produtivo
nesta missão é NOT_VERIFIED; preview documental não é homologação do produto.

- [Portal por público](docs/README.md).
- [Estado por fonte e SHA](docs/current/PROJECT_STATUS.md).
- [Contratos implementados e desvios conhecidos](docs/current/README.md).
- [Decisões humanas](docs/decisions/README.md) e
  [projeto C](docs/audits/C/README.md).
- [Auditorias preservadas](docs/audits/README.md) e
  [plano D](docs/audits/D/README.md).

PWA/push, modalidades futuras de ciência, rascunhos entre aparelhos e
verificador
de exemplar são requisitos planejados; não são anunciados como implementados.
Os dois P1 herdados continuam abertos até correção/regressão autorizada.

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
guardas,
consentimento e backup pertinentes. Nunca executar testes mutáveis no remoto.

## Validação e autorização

Mudança funcional autorizada usa os gates de contratos, lint, Markdown, tipos,
unitários/build e, conforme contrato, banco/Auth/E2E pelo runner local. Os
comandos
e marcos estão no guia de testes; não há afirmação de CI verde atual baseada
em
PR antigo. Nesta C, verificações são documentais e de preservação; não se
repetem
suítes funcionais por alteração editorial. Deploy, migrations remotas, envio,
PR e merge dependem de autorização específica, nunca de relato histórico.
