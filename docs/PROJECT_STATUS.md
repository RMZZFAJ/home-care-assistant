# Estado verificável do projeto

O estado da evolução integral, a versão publicada, o preview, as evidências
de testes e os impedimentos externos ficam em
[EXECUTION.md](evolution/EXECUTION.md). A refatoração Fluent 2, escalas e BAL
por plantão está detalhada no [checkpoint da interface](ui-ux/EXECUTION.md) e na
[matriz de homologação](ui-ux/ACCEPTANCE.md).

A evolução parte da master 701521c, após o
[PR de consolidação](https://github.com/RMZZFAJ/home-care-assistant/pull/1).
A evolução foi integrada pelo [PR 2](https://github.com/RMZZFAJ/home-care-assistant/pull/2)
na master fec3926, com CI aprovada. O commit temporário 014580f publicado pelo
usuário foi preservado no histórico. O fechamento e as evidências atuais estão
na matriz de execução, inclusive contas remotas e impedimento Meta.

A auditoria de 21/10 registra a base anterior e seus resultados históricos em
[Auditoria](audits/2026-10-21/README.md). Não considerar suas contagens,
migrations ou homologações como evidência automática da evolução atual.

Instruções permanentes ficam em arquitetura, banco, segurança, APIs e testes.
Incidentes e resultados transitórios pertencem à matriz de execução.
