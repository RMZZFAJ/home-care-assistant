# Estado verificável do projeto

Esta página aponta para a auditoria datada; não substitui seus resultados.

- Base da intervenção: fc04de4, incluindo os commits 7f79ebb e fc04de4.
- Branch de consolidação: codex/home-care-consolidacao.
- Snapshot publicado pelo usuário: 527cef4, preservado na branch anterior.
- Código e migrations novos: validação conjunta de banco, API e interface.
- Ambiente de desenvolvimento e testes: projeto local home-care-assistant.
- Supabase CLI: acesso recuperado com perfil nomeado da conta correta.
- Bancos local e remoto: 35 migrations aplicadas, versão máxima 034.
- Compatibilidade de extensão: ponte incremental 02050 aplicada e removida por 032.
- Remoto: hashes dos registros originais preservados; houve acréscimos durante
  a inspeção, por isso as contagens e hashes totais atuais são diferentes.
- Metadados: objetos públicos, grants de clientes e quatro default ACLs iguais.
- Serviço: sem privilégios diretos; cinco RPCs autorizadas explicitamente.
- Windows: lint, typecheck, 69 testes unitários e build aprovados.
- Linux: instalação e sete checks aprovados; ver escopo na auditoria.
- E2E publicado: 32/32 aprovados em rodada única no GitHub Actions.
- CI Windows/Linux e banco/navegador: run 39697862144 aprovado no código 8fe30fe.
- Publicação: [PR #1](https://github.com/RMZZFAJ/home-care-assistant/pull/1).
  Seu estado registra a integração posterior e os checks do fechamento documental.
- Prévia Vercel: READY; smoke HTTP login 200 e API sem sessão 401.
- Produção: a implantação resultante é rastreada no PR e na Vercel.

Leia o [checkpoint](audits/2026-10-20/CHECKPOINT.md), a
[execução](audits/2026-10-20/EXECUTION.md), a matriz daquela auditoria e a
[continuação de 21/10](audits/2026-10-21/README.md).
Estados transitórios e incidentes de editor não pertencem às instruções
permanentes de arquitetura e desenvolvimento.
