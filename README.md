# Home Care Assistant

Gestão operacional de Home Care com Next.js, React, TypeScript e Supabase.
O paciente é a unidade de administração, catálogo e autorização. O sistema
não prescreve, diagnostica ou toma decisões clínicas.

## Desenvolvimento

Use Node **24.22.0** e npm **11.21.1**, conforme os arquivos de versão.
As dependências têm versões exatas e lockfile versionado. TypeScript 6 e
ESLint 10 foram escolhidos pela compatibilidade do conjunto de ferramentas.

```sh
npm ci
```

Copie `.env.example` para `.env.local` e configure a URL e chave pública do
Supabase local: `http://127.0.0.1:54321`. Nunca use a chave de serviço como
variável pública. O projeto local `home-care-assistant` é o ambiente de
desenvolvimento e testes. Não é necessário criar uma segunda stack.
O cadastro operacional exige migrations aplicadas e vínculos autorizados.

```sh
npm run test:db:prepare
```

Esse preparo inicia/verifica o projeto local e aplica migrations locais.
Leia [Testes](docs/TESTING.md) antes de recriar dados ou carregar fixtures.

```sh
npm run dev
```

## Operação

Selecione o paciente no cabeçalho e use o menu recolhível: Visão geral,
Fichas (REQ, COM, ENT, BAL), Histórico, Estoque e Administração.
Um administrador de paciente gerencia somente
aquele contexto. Administradores globais administram todos os pacientes.
Convites permitem cadastro pessoal e aceite; revogar um vínculo não bloqueia
a conta em outros pacientes. Novos pacientes iniciam com catálogo vazio e
podem adotar modelos explicitamente.

O catálogo contém apenas insumos sob responsabilidade familiar. COM aceita
compra ou doação; recebimento validado abastece a família. ENT transfere entre
família e equipe, com trânsito e aceite do destinatário. REQ não tem quantidade
solicitada: atendimento por linha depende de ENT vinculada e aceite positivo.
BAL conta apenas o estoque da equipe, conforme a política de revisão.
O regime por plantão é habilitado por paciente: escalas reais determinam a
janela e o responsável, e adiamento exige decisão familiar. A contagem atual
pode regularizar semanas anteriores sem apagar atrasos nem simular contagens.
Consulte [Escalas](docs/ui-ux/SCHEDULES.md) e [Balanços](docs/ui-ux/BALANCES.md).

O administrador movimenta e corrige o estoque familiar diretamente, com
ledger e anexos. Cada ficha tem UUID, sequência independente por paciente/tipo,
protocolo, snapshots e SHA-256. Assinatura assimétrica é possibilidade futura.
Leia [Operação](docs/OPERATIONS.md) e o [estado atual](docs/evolution/EXECUTION.md).

## Validação

```sh
npm run check:contracts
npm run lint
npm run lint:markdown
npm run typecheck
npm test
npm run build
npm run test:db:prepare
npm run db:backup:local
npm run test:migrations -- --replay-local --backup CAMINHO_DO_BACKUP
npm run test:integration
npm run e2e
```

As etapas de banco e navegador usam exclusivamente o projeto local verificado.
O replay de migrations recria dados locais e exige a opção de consentimento
documentada em [Testes](docs/TESTING.md). Substitua CAMINHO_DO_BACKUP pelo caminho
real impresso pelo helper de backup. Nunca execute a suíte no remoto.

A auditoria atual validou a cadeia 35 limpa/legada, seis suítes SQL, seis testes
HTTP/Auth e 69 unitários. O CI publicado aprovou Windows/Linux e os 32 casos E2E
em rodada única. Consulte o [PR #1][consolidation-pr] para integração e checks.
Consulte o [relatório](docs/audits/2026-10-21/FINAL_REPORT.md) para o escopo de
Windows/Linux, preservação dos dados e homologações externas pendentes.

## Documentação

- [Arquitetura](docs/ARCHITECTURE.md): módulos e fluxos reais.
- [Banco](docs/DATABASE.md): catálogo, migrations e integridade.
- [Segurança](docs/SECURITY.md): matriz de autorização e LGPD.
- [Operação](docs/OPERATIONS.md): jornadas administrativas e operacionais.
- [APIs](docs/API.md): contratos e erros.
- [Implantação](docs/DEPLOYMENT.md): configuração e aplicação revisada.
- [Notificações e IA](docs/WHATSAPP_AI.md): integração e limites externos.
- [Auditoria](docs/AUDIT.md): evidências, rastreabilidade e pendências.

A [continuação de 21/10](docs/audits/2026-10-21/README.md) registra a autorização
para atualizar os bancos local/remoto e publicar o trabalho em blocos lógicos,
com PR e merge condicionados às verificações. Consulte o
[estado verificável](docs/PROJECT_STATUS.md) antes de assumir implantação.

[consolidation-pr]: https://github.com/RMZZFAJ/home-care-assistant/pull/1
