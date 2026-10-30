# Tentativas instrumentais

- B4.0: thread já possuía goal criado por `/goal`; tentativa de criar outro
  foi recusada. Goal existente confirmado e preservado, sem efeito no produto.
- B4.3: primeira execução de `b43-input.mjs` concluiu nove recusas esperadas e
  um HTTP 201. A consulta de conferência do auditor usou `location`, coluna
  inexistente do ledger. Inspeção de schema mostrou `destination_location`.
  Auxiliar corrigido e retomado com `--resume`: recupera somente o movimento
  novo pela pessoa/paciente/motivo fictícios, confere o valor e executa os
  cenários restantes. As primeiras assertivas são identificadas como vindas
  da tentativa anterior. Nenhum reset, exclusão ou novo movimento no resume.
- B4.9: metadado inicial do auxiliar citava BUILD_ID de `.next`. O ambiente
  guardado define HCA_E2E=true e `next.config.ts` usa `.next-e2e`. Inspeção
  confirmou build B3 de 30/10 01:35 UTC, ID `xmyfMmpMX4DoypZZsNBM1`, conforme
  `B3/evidence/local-app-process.json` e `local-app.log`. Corrigida somente a
  proveniência no auxiliar e no metadado. Mesmo código funcional base37cb7f85;
nenhuma recompilação, troca de servidor ou repetição de cenários foi
necessária.
- Consolidação: seletor `pg_restore --table=public.nome` não encontrou tabela
  no arquivo. A inspeção retornou somente 672 bytes e nenhum cabeçalho COPY.
  Help local conferido; usado `--schema=public --table=nome`. O comando apenas
  decodifica SQL para stdout em memória, sem conexão/restore de banco.
  Nenhum dado privado foi impresso e nenhum teste mutável foi repetido.
- Git: a cópia textual da ordem tinha seis cabeçalhos com espaços finais de
  quebra Markdown. Normalizados apenas esses espaços e EOL para LF, sem mudar
  palavras. SHA-256 do anexo original e da cópia ficam no baseline. A validação
  afetada é somente whitespace/documentação; nenhum teste de produto repetido.
