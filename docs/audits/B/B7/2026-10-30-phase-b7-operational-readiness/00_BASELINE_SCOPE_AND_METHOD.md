# B7.0 — Baseline, escopo e método

A ordem mestra de infraestrutura B7, lida integralmente, é a especificação
vigente. O B7 histórico de limpeza em `EXECUTION_ROADMAP.md` não autoriza ações.
O objetivo é diagnosticar a cadeia código, CI, configuração, implantação,
runtime, dados, detecção, continuidade e recuperação, sem implementar.

## Preservação

HEAD inicial `378298ac4df887df95a92d27cf360700a97dfeed`, branch `audit/phase-b`,
árvore limpa. Base funcional `37cb7f85e96e551d6419871f94dd950712e2565b`; master
`34dcb835c5c49068e0417f7306eb4e501aa868bc`. Somente este pacote e o índice geral
podem integrar o commit final.

As consultas SQL usam `BEGIN READ ONLY`, container local com labels conferidas e
agregados sem conteúdo pessoal. Não serão executados reset, fixtures, restore,
migrations, alterações de Auth, envio externo, configuração de provedor, deploy,
PR ou merge. Cron preexistente permanece ativo; alterações autônomas, se houver,
serão distinguidas das ações da auditoria.

## Método e evidência

Para cada hipótese: contrato, código/configuração vigente, prova anterior, menor
verificação suficiente, resultado, contraditório, limite, consequência e
critério de aceitação futuro. B7.0–B7.12 são sequenciais e têm checkpoints.
Inspeção estática, prova local controlada, CI histórica, metadado remoto,
homologação remota e aceite humano são categorias independentes.

Ausência de acesso não confirma defeito. Usar `NOT_VERIFIED —
REMOTE_ACCESS_REQUIRED` para dependências inacessíveis. Backup legível não prova
restore; HTTP 200 não prova progresso; SHA antigo com CI verde não aprova o
atual. Não se declara GO nesta fase.

## Reuso proporcional

As fases A–B6 fornecem baseline, não autorização de implementação. Revalidar
identidade do código/rotinas antes de reutilizar provas pertinentes. Não repetir
build, typecheck, lint funcional, unitários, E2E completo, replay de migrations
ou geração de PDFs por mudanças documentais. A validação final cobrirá Markdown,
links, CSVs, hashes, reconciliação, credenciais, preservação e escopo Git.

## Fontes e rastreabilidade

AGENTS, README, arquitetura, banco, segurança, operação, testes, implantação,
estado e execução são confrontados com scripts/configuração atuais. Os
documentos especializados apontam para fontes com linhas verificáveis. O
inventário de provas anteriores registra hashes e limites; não copia contratos
SQL nem artefatos visuais já auditados.
