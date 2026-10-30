# Baseline, escopo e método B5

## Base verificada em 30/10/2026

Branch `audit/phase-b`, HEAD inicial B4
`a21cea055dc2ba858b261924ee6dd7781112b2bf`, origem no mesmo SHA; árvore limpa
antes deste pacote. Master conservada em
`34dcb835c5c49068e0417f7306eb4e501aa868bc`. Nenhuma diferença de produto frente
a `37cb7f85e96e551d6419871f94dd950712e2565b`.

[Baseline executado](evidence/baseline.json): 395 arquivos protegidos e 232
funções locais com definições idênticas ao catálogo B3. Isso permite referenciar
os contratos [B3](../2026-10-29-phase-b3-database/evidence/catalog.json) sem
copiá-los e as provas A/B1/B2/B3/B4 sem apresentá-las como novas execuções.

Node exigido 24.22.0 foi selecionado por processo; o global é 24.13.0.
Dependências existentes, sem instalação/atualização. Supabase CLI 2.121.0,
projeto e labels `home-care-assistant`, API `127.0.0.1:54321`, DB `54322`,
container `supabase_db_home-care-assistant` saudável. Dois crons de minuto
ativos; nenhum URL/bearer do worker no Vault e fila HTTP vazia. Flags externas
ausentes em `.env.local` equivalem a desabilitadas pelo contrato literal `true`.
Nenhum valor secreto foi gravado. Outros containers preexistentes não são alvo.

## Autoridade e limites

A ordem mestre anexada foi lida integralmente; SHA-256 em baseline. B5.0–B5.12
sequenciais, diagnóstico, handoff e commit/push documental na branch existente.
Sem correção, migration, reset, substituição de fixtures, configuração externa,
mensagem real, deploy, PR, merge ou B6/C/D. A instrução atual de validação
proporcional prevalece sobre a bateria geral do AGENTS nesta auditoria.

PDF só é examinado quanto a seleção, versão, autoridade e transporte; composição
e fidelidade integral ficam para B6. Retenção/base legal são questões de
governança, sem parecer jurídico. Não há certificação de produção ou GO.

## Instrumentação e prova

Reconstruir saída, entrada e automação interna por transição, usando a menor
prova suficiente. Cada hipótese tem expectativa, contrato vigente, prova,
leitura independente quando aplicável, contraprova e limite. Separar leitura
estática, SQL local com rollback, adaptador controlado, HTTP local e homologação
externa. Mocks de RPC não provam persistência, RLS ou comportamento Meta.

Probes controlados substituem o transporte e recusam rede imprevista; não
dependem apenas da falta de credenciais. SQL mutável exige guarda de projeto,
dados sintéticos, transação e rollback. Cron existente continua ativo. Snapshot
de hashes permite distinguir mudanças automáticas de intervenção do auditor.
Auxiliares passam por sintaxe/imports/entradas/retornos antes de execução.

Não repetir build, typecheck global, unitários completos, migrations ou E2E
completos: produto idêntico e dúvidas novas restritas. Provas B3 de starvation,
cursor BAL, leases, callbacks e isolamento; B4 de janela de envio, lote misto e
consumo stale são baseline, sem replay indiscriminado. Testes dirigidos serão
registrados junto à hipótese e não repetidos por ajustes de Markdown.

## Fontes consultadas

AGENTS, README, arquitetura, banco, segurança, API, testes, operação e WhatsApp;
guias Next instalados de Route Handlers. Pacotes A/B1/B2/B3/B4, registros
mestres,
relatórios de scheduler/integração, critérios, dependências e handoffs orientam
a atribuição de origem. Descoberta B5, manifestação conhecida, hipótese e limite
de homologação permanecem classes diferentes.

Os contratos SQL são os instalados, reconciliados com B3; nomes `v3`/`v4` podem
ser delegados ativos, não necessariamente código morto. O inventário B5 registra
gatilhos, consumidores, configuração e disponibilidade real de cada mecanismo.
