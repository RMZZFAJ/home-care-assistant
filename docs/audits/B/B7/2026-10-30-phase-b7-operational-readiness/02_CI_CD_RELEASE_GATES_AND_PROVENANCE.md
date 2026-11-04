# B7.2 — CI/CD, gates e proveniência

## Garantias reais do workflow

- **Trigger**. **Execução:** PR e push master. **Dependência e falha:** Push
  audit não dispara. **O que não prova:** CI do HEAD audit.
- **validate**. **Execução:** Ubuntu e Windows. **Dependência e falha:** npm ci,
  contratos, lint, Markdown, tipos, unitários, build. **O que não prova:**
  Auth/DB remoto e configuração efetiva.
- **database**. **Execução:** Ubuntu, CLI 2.121.0, 40min. **Dependência e
  falha:** Preparo, backup, replay limpo/legado e integração. **O que não
  prova:** Restore, objetos e schema remoto.
- **browser**. **Execução:** Depende de database. **Dependência e falha:**
  Chromium, Pixel7/Chromium e iPhone13/WebKit; jobs isolados. **O que não
  prova:** Aparelhos físicos e aceite humano.
- **database-and-browser**. **Execução:** always, após DB e todos browsers.
  **Dependência e falha:** Exige ambos success; falha/skipped não passam. **O
  que não prova:** Não agrega validate.
- **Vercel**. **Execução:** npm fixado e build. **Dependência e falha:** Caminho
  separado da CI. **O que não prova:** Aprovação de processos e migração.

Nenhum `continue-on-error`, exclusão de cenário ou workflow dispatch foi
encontrado. `fail-fast:false` mantém os outros navegadores; um retry em CI é
permitido. Traces estão desligados; screenshots de falha e HTML são armazenados
por sete dias. A perda de artefato depois da retenção limita a investigação
posterior; isso é política a decidir, não falha de upload atual. Actions estão
fixadas por SHA e token do workflow tem `contents:read`.

## Evidência remota atual e contraprova

`evidence/ci-metadata.json` foi obtido com GET após conferir RMZZFAJ:

- Run 40241890885, SHA 37cb7f8, sucesso histórico nos sete jobs.
- Run 40656069166, SHA 34dcb83, falha: validate Linux/Windows, DB, mobile e iOS
  passaram; Chromium falhou e o agregado também falhou.
- Chromium: 39 passaram, um cenário falhou também no retry, em
  `tests/e2e/navigation.ts:10`. O log aponta “Navegação do plantão”.
- Artefato Chromium existe, não expirado na consulta, com retenção até
  04/11/2026. Não foi necessário baixar capturas já analisadas pela B1.
- HEAD 378298a tem status Vercel e comentário de preview; não tem checks CI.
- Master: `protected:false`, endpoint protection 404 “Branch not protected”,
  rulesets vazios. A permissão administrativa foi verificada; a resposta não foi
  tratada como ausência por falta de acesso.

QA-001 permanece aberto: o helper testa visibilidade instantânea e escolhe
fallback antes de aguardar estado estável. Seu código está inalterado. Não houve
reteste funcional B7, e a CI verde de 37cb7f8 não prova correção da
intermitência. O gate detectou a falha corretamente; não foi mascarada.

## Cadeia do release e lacuna própria de infraestrutura

Metadados Vercel identificam produção 34dcb83 READY e previews históricos da
branch de auditoria. Portanto a publicação histórica de produção não dependeu do
sucesso final do conjunto da CI. Isso amplia a análise de gate; não é uma nova
causa de QA-001. Ver B7-001 no registro mestre.

A configuração atual apresenta `gitProviderOptions.createDeployments=disabled` e
eventos de dispatch desligados. Contraprova na OpenAPI oficial: esse campo
controla registros GitHub Deployments, não comprova desligamento do build ou
deploy Vercel. Portanto não serve como guarda para o push documental. Previews
recentes da branch foram criados por Git. Não houve alteração de configuração
pela B7. Publicação documental exige verificar mecanismo real de não
implantação; se ele não existir, o push depende de instrução adicional
compatível com as proibições da ordem. Um release manual também precisa de gate
por SHA/schema.

O build recompila em validate, navegador e Vercel, em ambientes diferentes. Não
há promoção do mesmo artefato testado, digest de release assinado nem atestado
conjunto código/schema/configuração no fluxo versionado. Há SHA no metadado de
deploy; a hipótese de total ausência de identidade foi refutada. O problema é
relacionar essa identidade às provas e ao banco efetivo.

## Aceitação futura

Exigir validate Linux/Windows e database-and-browser do SHA candidato,
configuração identificada, migrations compatíveis, homologações aplicáveis e
aprovação humana do release. Não escolher somente o agregado de DB/browser.
Documentar o caminho de exceção e o responsável; falha intermitente exige
diagnóstico/regressão, sem ignorar checks ou ampliar timeout às cegas.
Pré-deploy deve comparar SHA, target, projeto, schema e configuração pública;
pós-deploy deve registrar o artefato servido e smoke autorizado. Nenhum deploy,
promotion, configuração de proteção ou nova CI foi executado nesta fase.
