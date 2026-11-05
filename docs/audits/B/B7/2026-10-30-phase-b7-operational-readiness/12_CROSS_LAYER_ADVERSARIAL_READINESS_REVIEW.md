# B7.12 — Cenários integrados e contraditório

## Segunda passagem A–J

São dez análises por contrato, evidência histórica e metadado atual, não dez
outages/restores/deploys executados. Provas novas em memória: CFG01–07 e
UPL1/6/11. `evidence/SCENARIOS.csv` identifica método, contraprova e limite.

- **A Código antes do schema**. **Falha e prova mínima:** Build não consulta
  contrato remoto; RPC ausente pode falhar. **Contraprova / contenção futura:**
  Catálogos atuais84/232 correspondem; não há incompatibilidade atual
  demonstrada. **Resultado:** B7-003, gate antes de servir mutações.
- **B Migration aceita, deploy falha**. **Falha e prova mínima:** Aplicação
  antiga continua com dado migrado. **Contraprova / contenção futura:** Wrappers
  preservam assinaturas escolhidas, não toda versão antiga. **Resultado:**
  Ensaio de convivência e forward fix.
- **C Restore parcial**. **Falha e prova mínima:** ready/PDF/Auth ref sem
  bytes/configuração. **Contraprova / contenção futura:** TOC inclui
  Auth/metadados, não bytes/globals; B6 delimita hash de cache. **Resultado:**
  OPS-001/B3-014/B6-011, ensaio integral isolado.
- **D Worker silencioso**. **Falha e prova mínima:** Cron local success sem
  secrets não produz HTTP. **Contraprova / contenção futura:** Remoto360
  HTTP200/6h, sem lease vencida; não houve outage remoto provado. **Resultado:**
  Sinais/aging/dono herdados da B5.
- **E Entrega física durante corte**. **Falha e prova mínima:** Reemissão pode
  duplicar representação do mesmo fato. **Contraprova / contenção futura:**
  Idempotência protege intenção conservada, não saldo presumido. **Resultado:**
  Conferir origem física e ledger antes de escrever.
- **F Mensagem incerta após restore**. **Falha e prova mínima:** Banco pode
  anteceder aceite externo. **Contraprova / contenção futura:** uncertain exige
  decisão; B5-013/014 limitam conciliação. **Resultado:** B7-004, quarentena e
  confronto com provedor.
- **G Revogação e links**. **Falha e prova mínima:** Nova recusa não invalida
  link/cópia prévia. **Contraprova / contenção futura:** B3-020/021/022 separam
  sessão, operação em voo e link120 s. **Resultado:** Aceitar semântica e não
  prometer recolher cópias.
- **H Verde de outro SHA**. **Falha e prova mínima:** audit só tem Vercel;
  produção 34dcb83 tem CI falha. **Contraprova / contenção futura:** SHA existe
  e agregado falhou corretamente. **Resultado:** B7-001, candidato/checks
  correspondentes.
- **I Ambiente errado**. **Falha e prova mínima:** CLI direto contorna wrapper;
  preview não isola DB. **Contraprova / contenção futura:**
  Labels/workdir/loopback e perfil fixo funcionam. **Resultado:** Preservar
  guards; nenhum teste remoto.
- **J Piloto sem WhatsApp**. **Falha e prova mínima:** Pendências e prazos
  continuam sem canal. **Contraprova / contenção futura:** Entrega interna tem
  cron; Meta é opcional em certos percursos. **Resultado:** Decisão
  humana/correções aplicáveis, sem aprovar piloto.

## Contraprovas que mudaram ou limitaram conclusões

1. Há health/cursor/log de cron. A lacuna de progresso/dono já está na B5 e não
   virou novo achado; OBS-REUSE é só referência de revalidação.
2. 218 hashes brutos divergiam por CRLF/LF; zero diferença normalizada.
3. CI detectou QA-001: retry e agregado falharam; não há mascaramento
   demonstrado.
4. Vercel tem SHA/produção buildada; não há prova de next dev em produção.
5. Fluid suporta 120 s; risco temporal composto e lease não exigem upgrade cego.
6. Config completa, flag desligada e token ausente concordam em UI/provider.
7. Upload1 MiB passa e 11 MiB é recusado; conflito está no intervalo do
   transporte.
8. Dump custom inclui Auth/cron/Vault; pares SQL históricos têm outro alcance.
9. Três nós npm high são dev e derivam de um advisory; flag exigido não apareceu
   nos consumidores examinados. Não há exploração runtime demonstrada.
10. DENY do preview vem da proteção Vercel; não atesta shell produtivo.
11. createDeployments=disabled controla registros GitHub Deployments, conforme
    OpenAPI oficial, e não comprova auto-deploy Vercel desligado. O padrão
    git.deploymentEnabled é true e não foi sobrescrito no vercel.json atual.

Previews recentes source=git da branch reforçam a necessidade de guarda antes do
push documental. Não se testou `[skip vercel]` como guarda: o repo não usa
turbo-ignore e não foi comprovado que a mensagem impeça build nativo. Não se
alterou provedor, cancelou deployment ou disparou workflow. Fontes: [Git
Configuration](https://vercel.com/docs/project-configuration/git-configuration)
e `evidence/platform-contracts.json`.

## Conclusão da segunda passagem

Sete registros: cinco P2/dois P3; quatro causas/lacunas próprias novas, uma
causa adicional de recuperação relacionada a OPS-001 e duas oportunidades.
Nenhum P0/P1 novo demonstrado. P1 anteriores e homologações continuam abertos.
Diagnóstico B7.0–B7.12 completo, sujeito a validação/preservação finais;
publicação depende de push compatível com a proibição de deploy.
