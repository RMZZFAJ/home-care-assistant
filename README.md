# Home Care Assistant

**Aparência vigente:** o [Modelo Integral](docs/ui-ux/CANONICAL_MODEL.md) substitui
Fluent UI. Em E01–E03, a referência posterior é o laboratório L1 com os
comentários v3, conforme o [lote vigente](HCA_L1_LOTE_CODEX_E01_E03.md).

Gestão operacional por paciente com Next.js, React, TypeScript e Supabase.
REQ, COM, ENT e BAL distinguem necessidade, aquisição, entrega, contagem,
ciência e estoque por movimentos. O sistema não prescreve ou decide conduta
clínica.

## Estado e documentação

**D-B em execução; produção e merge não autorizados.** A branch é
`feat/phase-d-implementation`; a PR #7 permanece Draft. O L1 partiu de `56babc7`.
O [registro L1](docs/audits/D/D-B/L1_IMPLEMENTATION.md) identifica o trabalho local.
A primeira versão
estável de produto será 1.0.0; não está sendo publicada nesta missão.

- [Acompanhamento principal e sequência restante](TEMP_D_B_ATUALIZACAO.md).
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

A e B encerraram o diagnóstico; C registra o planejamento histórico; D-A
consolidou D0–D2. Esses marcos não aprovam automaticamente a CI do candidato
atual, serviços externos, aparelhos físicos ou liberação operacional.

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
