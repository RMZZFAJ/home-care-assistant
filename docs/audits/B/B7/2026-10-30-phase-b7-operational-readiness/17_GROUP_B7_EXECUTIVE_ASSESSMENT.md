# Parecer executivo B7

A infraestrutura tem uma base verificável, mas ainda não há prova suficiente
para aprovar o primeiro uso real. O NO-GO anterior permanece. B7.0–B7.12
terminaram como diagnóstico, sem correção, migration, reset, restore, alteração
de provedor, mensagem real, deploy manual, PR, merge ou início de C. Depois, o
responsável autorizou o preview automático associado ao push documental.

## O que foi demonstrado e deve ser preservado

Ambiente local correto, guardas de destino e identidade, lockfile/versões,
Actions fixadas por SHA, CI de Windows/Linux e banco/navegadores separados,
API/banco com autorização por paciente, ledger e documentos versionados. Os
catálogos local/remoto consultados correspondem em 84 migrations e 232 rotinas
normalizadas; diferenças brutas eram só CRLF/LF. Isso não certifica todos os
objetos, dados, configuração Auth ou recuperação dos arquivos.

O remoto mantém cron ativo e respondeu360 chamadas HTTP200 na janela6h, sem
lease expirada observada; há entrega interna registrada. Portanto não se
diagnosticou uma indisponibilidade remota. Existem health/cursor/estados de jobs
e logs seguros. A lacuna é ligar esses sinais ao progresso útil e a uma pessoa
que detecta e resolve a falha dentro do prazo aceito.

## O que exige correção ou decisão

Sete registros: cinco P2 e dois P3, sem novo P0/P1 demonstrado. Quatro causas ou
lacunas próprias, uma causa adicional de recuperação ligada a OPS-001 e duas
oportunidades. Os P1 de decisão informada de escala e progresso de REQs
continuam abertos; não foram recontados como descobertas B7.

- Release: produção 34dcb83 ficou READY embora a CI desse SHA tenha falhado.
  Master não tem proteção/rulesets. Exigir prova e aceites do candidato; o gate
  de testes detectou a falha, mas não impediu essa publicação histórica.
- Configuração: API anuncia WhatsApp em quatro variantes que o provider recusa.
  Corrigir readiness antes de depender do canal, mantendo homologação separada.
- Compatibilidade: não há atestado conjunto schema/config/artefato. O estado
  atual corresponde, mas atualização e rollback precisam de gate explícito.
- Transporte: produto admite anexo10 MiB/ avatar5 MiB; Function tem teto 4,5 MB.
  PDF sintético6 MiB passou localmente; redução na sanitização ocorre depois
  dessa fronteira. Não foi provocado413 remoto. Decidir limite ou transporte.
- Recuperação: dump que inclui cron/Vault pode reativar endpoint operacional
  antigo se for restaurado sem quarentena. O risco é condicional, sem incidente
  ou restore executado; preservar uncertain e conciliar efeitos externos.

Headers adicionais do shell público e triagem de advisory dev são P3. Três nós
high npm correspondem a um advisory re2js; o flag opt-in necessário não apareceu
no consumidor inspecionado. Não há ataque/runtime explorável demonstrado. Não
usar scanner como justificativa para atualizar tudo às cegas.

## Recuperação ainda não comprovada

Dezesseis dumps locais com manifesto conferem, o TOC mais recente é legível e
dois pares SQL remotos históricos conferem por hash. Há um dump sem manifesto
que não foi aceito como prova nem removido. A consulta gerenciada retornou
backups vazios/PITR false, sem comprovar política de produção ou cópia off-site.

Banco não contém os bytes Storage. Auth, chaves, configurações, usuários,
perfis, vínculos, PDFs/anexos/avatares, jobs e efeitos após o corte precisam ser
recuperados coerentemente. Existem20 componentes na matriz e um ensaio futuro
para destino isolado, com quarentena, reconciliação e RPO/RTO medidos. Backup
com hash e TOC não equivale a restore aprovado.

## Primeiro uso e continuidade

Next/Auth/DB são indispensáveis; Storage/service key também para evidências e
PDFs aprovados no escopo. Meta/Flows/OAuth/SMS/transcrição podem ficar fora se
não forem prometidos e houver alternativa aceita. Sem WhatsApp, pendências,
ciência, recebimento físico e prazos continuam no aplicativo e na operação
humana. Isso não aprova um piloto enquanto os processos essenciais e os aceites
faltarem.

O responsável precisa decidir escopo/destino, donos/substitutos, prazos,
RPO/RTO, retenção, canais e contingência. A matriz contém15 incidentes, dez
cenários adversariais integrados,14 domínios e 22 critérios de aceitação. Ficha
física/foto pode apoiar continuidade, mas volta ao sistema por conciliação de
fatos, sem duplicar movimento, inventar saldo ou chamar ciência de recebimento.
Pessoas, aparelhos físicos, SMTP/OAuth/SMS/Meta e DR integral não foram
homologados.

## Preservação, eficiência e publicação

Foram executados dez pontos novos em memória (sete configuração/três envelope),
sem rede, upload ou banco. Onze inspeções/metadados e dez cenários de mesa
completam 31 registros de cenário, sem confundir isso com 31 testes executados.
Provas A–B6 foram reaproveitadas com identidade funcional/rotinas conferida; não
se repetiu build, suíte global, E2E ou replay por documentação.

O fechamento verificou 395 arquivos protegidos e 108 tabelas por hashes
agregados: 106 ficaram idênticas e duas tabelas privadas de progresso mudaram
por cron preexistente, explicitamente discriminadas. Nenhuma mudança inesperada
de negócio/Auth/Storage foi encontrada. Evidências de validação/preservação
ficam no pacote.

Push documental pode gerar preview pelo Git integration atual. A OpenAPI refutou
createDeployments=disabled como guarda de não implantação: é opção de registros
GitHub. Concluir commit documental é autorizado; publicar depende de um bloqueio
real de auto-deploy ou autorização específica para a exceção mínima que o
estabeleça. Não disparar preview para testar essa hipótese.

## Resolução posterior da publicação

O responsável autorizou o preview automático do push documental em 30/10/2026,
após o diagnóstico e o commit f59ed2e. Ver
[autorização](evidence/PUBLICATION_AUTHORIZATION.md). A alternativa de alterar
vercel.json não foi aplicada. A publicação pode prosseguir com verificação de
SHA/ref e status Vercel, preservando o escopo documental e a master. A hipótese
e o impedimento originais acima permanecem como histórico da investigação; esta
decisão resolve a pendência sem iniciar a Fase C.
