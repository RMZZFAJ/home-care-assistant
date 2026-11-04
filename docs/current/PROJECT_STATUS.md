# Estado verificável do projeto

Referência editorial:04/11/2026, America/Sao_Paulo. **Produção NO-GO.**
Esta é a entrada canônica de estado; contratos atuais ficam em current,
decisões humanas em decisions e especificações futuras em audits/C.

<!-- c-table:start -->

- **Referência:** product_code_sha

  **Estado e prova:** `37cb7f85e96e551d6419871f94dd950712e2565b`; comparação
  de todos os arquivos não documentais contra baseline C0 no fechamento C.

- **Referência:** audit_input_sha

  **Estado e prova:** `227f26ca695a3d01512a854f4b19f2639b91ba87`, A/B1–B8
  encerradas.

- **Referência:** branch documental

  **Estado e prova:** `audit/phase-b`; SHA final de C é o commit que contém
  este estado, resolvível pelos comandos abaixo. Não gravar hash
  autorreferente no próprio manifesto.

- **Referência:** master preservada

  **Estado e prova:** `34dcb835c5c49068e0417f7306eb4e501aa868bc`; sem merge em
  C.

- **Referência:** last_production_deploy_sha

  **Estado e prova:** `NOT_VERIFIED` nesta missão. Resultados remotos B7 são
  históricos e não assumidos atuais.

- **Referência:** Fase C

  **Estado e prova:** C0–C6 documentalmente concluídas: decisões,
  especificação, planos e
  reorganização validados. A autoridade de publicação é o commit/ref
  resolvido no Git.

- **Referência:** Fase D

  **Estado e prova:** **NÃO INICIADA**; nenhuma correção
  funcional/migration/ativação realizada em C.

<!-- c-table:end -->

```sh
git branch --show-current
git rev-parse HEAD
git log -1 --format=%H -- docs/audits/C
git ls-remote origin refs/heads/audit/phase-b
```

Os 165 registros originais foram reconciliados em 121 causas, e 28 grupos de requisitos
aprovados, vários sobre os mesmos processos; não são 149 defeitos novos.
Existem 30 DEC,
20 oportunidades e 15 detalhes pendentes de decisão (P01–P12 originais e
P13–P15
derivados). Os dois P1 de decisão de escala e progresso REQ seguem abertos.
O guard protege 84 migrations; contagens de suítes anteriores ficam nos pacotes
datados e não são apresentadas como CI verde atual.

PWA/Web Push, modalidades futuras de ciência, draft cross-device e verificador
de exemplar estão planejados. WhatsApp/Meta/Flows permanecem diferidos para
ativação/homologação posterior; não remover contratos existentes. Backup com
TOC, emulação, screenshots e transporte controlado não substituem restore,
participante, aparelho/AT/impressão ou provedor real.

Consultar [C](../audits/C/README.md),
[gate futuro](../audits/C/C5-execution-roadmap/RELEASE_CUTS_AND_GATES.md)
e [história A/B](../audits/README.md). Os históricos de PRs/deploys e
autorizações
ficam em archive e auditorias datadas, sem renovar permissão corrente.
