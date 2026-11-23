# Home Care Assistant

**Aparência vigente:** o [Modelo Integral](docs/ui-ux/CANONICAL_MODEL.md) substitui
Fluent UI. Em E01–E03, a referência posterior é o laboratório L1 com os
comentários v3, conforme o [comando de L1](HCA_L1_LOTE_CODEX_E01_E03.md).

Gestão operacional por paciente com Next.js, React, TypeScript e Supabase.
REQ, COM, ENT, DEV e BAL distinguem necessidade, aquisição, entrega, devolução,
contagem, ciência e estoque por movimentos. O sistema não decide conduta
clínica.

## Estado e documentação

**L3 em execução na branch `feat/phase-d-continuation`.** A
[PR 7](https://github.com/RMZZFAJ/home-care-assistant/pull/7) foi incorporada
a `master`. Seu [registro de fechamento](docs/audits/FECHAMENTO_PR7.md)
reúne a execução A–D, as evidências e a fila de continuidade. O
[PR 8 em rascunho](https://github.com/RMZZFAJ/home-care-assistant/pull/8)
acompanha L3, que segue o
[comando mestre v4](HCA_L3_COMANDO_MESTRE_CODEX_V4.md) e o
[laboratório aprovado](hca-laboratorio-03-v4-aprovado.html).

- [Acompanhamento principal e sequência restante](TEMP_D_B_ATUALIZACAO.md).
- [Execução dos lotes L1 a L4](docs/audits/D/D-B/LOTES_EXECUCAO.md).
- [Portal da documentação](docs/README.md) e
  [contratos implementados](docs/current/README.md).
- [Ordens vigentes e matriz de aceitação](docs/audits/D/D-B/README.md).
- [Decisões](docs/decisions/README.md) e [histórico](docs/audits/README.md).

Fichas em abas, Andamentos, rascunhos próprios, PWA e Web Push têm implementação
no candidato. Ficha, Ficha Ampliada e auditoria restrita usam a aparência
documental aprovada e o pipeline real de emissão, guarda e verificação.
Os PDFs usam certificado e TSA internos, sem afirmar ICP-Brasil. O
acompanhamento distingue implementação, validação técnica e avaliação humana
pendentes. Os mecanismos de rascunho existentes ficam preservados; sua
simplificação dos quatro campos de Andamentos foi autorizada no L1. A expansão
de persistência e os outros adiamentos continuam separados.

A e B encerraram o diagnóstico. C consolidou as decisões e o projeto
integrados pela PR 6. D-A consolidou D0–D2. Na D-B, os incrementos de D3–D5
e L1/L2 seguem para validação conjunta. A primeira liberação estável
prevista é 1.0.0 e depende dos gates operacionais.

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
baseada em PR antigo. Alterações exclusivamente documentais recebem conferência
de Markdown, links e preservação; suítes funcionais seguem o risco da mudança.
Deploy, migrations
remotas, envio, PR e merge dependem de autorização específica, nunca de relato
histórico.
