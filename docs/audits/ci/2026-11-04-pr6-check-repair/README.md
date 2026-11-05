# Reparo dos checks do PR 6

Continuação autorizada pelo responsável em 04/11/2026 após as falhas do
[Draft PR 6](https://github.com/RMZZFAJ/home-care-assistant/pull/6).
Referência anterior: `8d9d9fce419ce187920d764e340ee7af86db8d7e`.
Este reparo altera configuração de análise e um teste de integração.
Código da aplicação, migrations e workflows permanecem preservados.
Fase D não iniciada; produção continua NO-GO.

## Causas comprovadas

- [CI 41893417912](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/41893417912):
  TypeScript falhou nos dois imports relativos de quality.probe.spec.ts,
  evidência histórica B8 relocada. A Vercel falhou pelos mesmos TS2307 no
  build do mesmo SHA. Windows foi cancelado pela matriz; browser ficou
  bloqueado pela falha do banco e o agregado falhou por consequência.
- Integração de escalas: 32/33 testes passaram. O cenário restante iniciou
  a série em 02/11/2026; em 04/11 essa data já exigia justificativa de
  retroatividade. O banco recusou corretamente com
  `retroactive reason required`.

## Correções

- tsconfig delimita docs/audits como arquivo histórico fora da compilação
  ativa. ESLint respeita essa mesma fronteira e ignora .private/.venv,
  diretórios locais de ferramentas já ignorados pelo Git. Nenhuma regra de
  análise foi desabilitada; código e testes ativos continuam cobertos.
- A integração usa os helpers existentes localToday/dayOffset para começar
  dois dias no futuro, em America/Sao_Paulo. Mantém as três ocorrências
  12x36, horários UTC exatos, virada de dia, idempotência, aprovação, revisão,
  isolamento por paciente, conflito entre pacientes e encerramento parcial.
  Também verifica a rejeição de uma data retroativa sem justificativa.

## Validação antes do push

Node 24.22.0 e npm 11.21.1: check:contracts, lint, lint:markdown,
typecheck, test e build aprovados. Unitários: 98/98 em 17 arquivos.
A primeira execução de lint local encontrou um bundle de diagnóstico em
.private; a delimitação desse diretório resolveu a descoberta indevida.

Integração de escalas: 1/1 aprovada na stack local home-care-assistant,
API 127.0.0.1:54321, DB 54322, após backup externo de 6.996.099 bytes com
SHA-256 `e8f68965a5babb564e0eab1af3516d19d53a903c662c6fe316ee5b54d069e558`
e leitura do TOC verificada. Sem reset, replay, substituição de fixtures ou
acesso ao banco remoto. A suíte completa usa os runners efêmeros da CI.

Comparação dos arquivos TypeScript: 240 entradas ativas preservadas;
26 entradas históricas removidas do escopo, todas em docs/audits.
Os arquivos históricos continuam byte a byte preservados. Os 253 hashes do
[manifesto C7–C10](../../C/C10-pr-handoff/evidence/MANIFEST.json) conferem.

O validador histórico C7 mantém 26 verificações aprovadas e acusa as duas
guardas de escopo da missão original: configuração/teste agora diferem da
base documental. Esse resultado é esperado neste reparo posterior e fica
registrado, sem alterar o validador ou a prova de fechamento C em 8d9d9fc.
Não representa nova aprovação de produção ou encerramento dos achados B8.

## Acompanhamento remoto

Commit e push deste reparo iniciam novos checks no mesmo Draft PR.
Os resultados da nova rodada serão vinculados ao SHA do reparo no PR.
O snapshot anterior continua preservado no checkpoint C10.
Não há merge, exclusão de branch ou promoção para produção.
