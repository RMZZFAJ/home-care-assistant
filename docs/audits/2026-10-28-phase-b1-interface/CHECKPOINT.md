# Checkpoint persistente B1

Estado: **EM EXECUÇÃO — B1.1**. B1.0 concluído; B1.1 ainda não concluído.
Atualização: 29/10/2026, America/Sao_Paulo; a execução atravessou a meia-noite.
Evidências técnicas usam ISO UTC.

## Base e guardrails

Produto 37cb7f85e; HEAD documental inicial 34dcb835.
Branch audit/phase-b1-human-interface-2026-10-28. Quatro anexos não versionados
preexistentes preservados. Nenhum arquivo do produto, migration, configuração,
teste permanente ou dado remoto alterado. Sem deploy, merge ou push.

CI atual reconsultada: run 40656069166 falhou no Chromium desktop e agregado;
demais jobs aprovaram. Causa observada corresponde a QA-001 (navigation.ts:10).
P1 de escala da Fase A continua aberto até investigação B1 específica.

## Progresso sequencial

| Etapa | Estado | Prova/critério restante |
| --- | --- | --- |
| B1.0 | Concluído | Baseline, guards, fixtures e inventário inicial persistidos |
| B1.1 | Em execução | 112 fontes UI lidas; 43 superfícies base e 40 overlays; 51 capturas; faltam variantes/overlays e reconciliação |
| B1.2 | Pendente | Comparar padrões e medir resultado visual |
| B1.3 | Pendente | Catálogo de textos literais/dinâmicos e propostas completas |
| B1.4 | Pendente | Catálogo de erros/códigos e provas de recuperação |
| B1.5 | Pendente | Estados por superfície e injeções representativas |
| B1.6 | Pendente | Cada ação significativa e consequência/feedback |
| B1.7 | Pendente | Cada campo e redução de esforço fundamentada |
| B1.8 | Pendente | Personas, teclado/mobile, contraditório e síntese |
| Fechamento | Pendente | IDs, links, privacidade, hashes, checks e commit docs-only |

## Ambiente e ações locais

Docker Desktop inicialmente parado; iniciado oculto, retomando containers
existentes. Node 24.22.0 localizado no cache npm e verificado; padrão global
24.13.0 preservado. Projeto/workdir e portas validados pelo guard existente.
84 migrations e 114 pacientes locais preexistentes. Banco/fixtures não resetados.
Servidor iniciado por scripts/start-e2e-server.mjs, que reutiliza a validação
do runner existente e substitui URLs/chaves por locais; build isolado aprovado.
Envio externo false, Meta Flows false. O carregamento de .env.local pelo Next
não substitui os valores locais injetados pelo harness.

Exploração atual criou sessões Auth e selecionou contextos locais das contas
sintéticas. Paciente A e domínios das contas verificados antes da captura.
Lista global de pacientes mascarada nas imagens e omitida do texto exportado.
Nenhum comando documental confirmado pela varredura inicial. Abrir documento
pode registrar ciência automática conforme política: essa possibilidade está
declarada no reprodutor. Nenhum reset, seed, exclusão ou mutação remota.

Nove folhas de contato abertas e inspecionadas: **somente regiões indicadas**
em contact-sheet-map.json. Imagens longas foram vistas parcialmente; imagens
desktop reduzidas não comprovam legibilidade fina. Originais permanecem
disponíveis. Não há validação com usuários reais, hardware ou leitor de tela.

Primeira tentativa de varredura parou ao pressupor main na 404 padrão. Falha
do reprodutor preservada em runtime-sweep-attempt-1.json; reprodutor corrigido
somente nesta pasta. Segunda tentativa: 51 capturas, zero falhas de exploração.
O arquivo de tentativa 1 referencia quatro capturas substituídas pela segunda
execução; usar seus metadados somente para diagnóstico da falha, não imagem
como evidência temporal da primeira tentativa.

## Descobertas a consolidar, sem correção

- P1 da escala (A UX-001) continua aberto: resumo decisório será reexercitado.
- Convite não antecipa paciente/função/validade no aceite (evidência estática).
- Confirmações de estoque/ENT/BAL omitem partes concretas do efeito; ampliar
  investigação além da escala e distinguir defeito de risco de compreensão.
- 404 observada em inglês, sem ação de recuperação contextual.
- Histórico de trânsito observado com nome genérico Produto; confirmar relação
  com overview vazio e detalhar efeito humano.
- Erros de extras/observações REQ sem salto/foco correspondente; nome curto
  de mensagens vazio omitido do payload; unidade e requisito de senha divergem
  entre formulário/contrato. São hipóteses dirigidas, ainda sem prioridade final.

## Próximo ponto concreto

Completar exploração das seções administrativas, configurações, etapas e
overlays. Usar fixture local nova isolada para COM/ENT/BAL quando necessária,
sem substituir dados existentes. Reconciliar inventário/avaliações B1.1 antes
de iniciar B1.2. Catálogos transversais B1.3–B1.7 ainda não concluídos.

## B1.1 — 2026-10-29T03:40:24.793Z

Concluído o inventário e primeira avaliação: 97 superfícies (51 bases, 40 overlays/seções, seis variantes de demo), 142 linhas de cobertura; 112 fontes UI lidas integralmente. Há 113 capturas de navegador e seis páginas PDF inspecionadas. Estados de leitura, renderização, execução e inspeção separados. Dois erros de premissa do harness preservados; COM já aprovada e destinatário ENT distinto do trabalhador BAL. Captura transitória de BAL explicitamente reclassificada; prova pronta em b11-bal-ready. Nenhum produto/remoto alterado. Fixtures novas aditivas, sem reset; COM de doação está aprovada, corrigindo a descrição inicial pending approval.

Segunda passada: inclui convite sem prévia, resumos incompletos além da escala, trânsito sem nome, 404 e oportunidades de continuidade. Contraditório por superfície. Próxima etapa B1.2: medir cascata, espaços, foco, contraste e controles em larguras representativas. Não confundir cobertura estática completa de UI com execução de todos os estados.

## B1.2 — 2026-10-29T03:45:35.750Z

Concluído: relatório visual, 37 padrões com alvo/fundamento/exceção, 25 combinações de tela/largura e drawer320. Cascata medida distingue azul atual de verde legado. Sem overflow global nessas amostras; matriz/etapas têm scroll interno. Foco visível medido; contraste parcial sem violações detectadas, cinco grupos inconclusivos. Seis folhas e dois originais desktop inspecionados. Segunda passada recusou reescrita integral, switch mecânico, barras fixas indiscriminadas e remoção de confirmações. Próxima etapa B1.3: literais, expressões e dicionários, incluindo textos de API. Produto e remoto preservados.

## B1.3 — 2026-10-29T03:50:22.123Z

Concluído catálogo com 4195 registros de texto, 686 expressões JSX dinâmicas, 30 propostas completas e 27 templates externos lidos como texto, sem envio. Os 12343 candidatos originais têm disposição rastreável; CSS/testes/chaves não são contados como mensagens aprovadas. Chips especiais reproduzidos e JSON observado em read-model sintético injetado, não proposta persistida. Glossário e política de desconhecidos no relatório04. Segunda passada preserva distinções ciência/aceite/COM/ENT/BAL e recusa traduzir contratos internos no banco. Próxima etapa B1.4: erros por código, tela e persistência, com falhas controladas. Nenhum produto/remoto alterado.

## B1.3 — 2026-10-29T03:55:31.037Z

Concluído catálogo com 4151 registros de texto, 686 expressões JSX dinâmicas, 30 propostas completas e 27 templates externos lidos como texto, sem envio. Os 12343 candidatos originais têm disposição rastreável; CSS/testes/chaves não são contados como mensagens aprovadas. Chips especiais reproduzidos e JSON observado em read-model sintético injetado, não proposta persistida. Glossário e política de desconhecidos no relatório04. Segunda passada preserva distinções ciência/aceite/COM/ENT/BAL e recusa traduzir contratos internos no banco. Próxima etapa B1.4: erros por código, tela e persistência, com falhas controladas. Nenhum produto/remoto alterado.

## B1.4 — 2026-10-29T04:00:14.021Z

Concluído catálogo de 32 códigos públicos, 212 ramos de origem e 252 registros de erro; catálogo por 97 superfícies e matriz de injeções. Rejeição real400 da observação1001 em inglês, cenários401/403/404/409/422/429/500 injetados, JSON inválido, rede, perfil e confirmação crítica. Os status injetados não são atribuídos ao servidor real. Provas de upload separadas por accepted.status; primeira400 não é prova de gravação. Segunda passada distingue certeza de persistência, impede retry cego e aponta ausência de contexto/CTA. Próxima etapa B1.5: estados inicial, refresh, vazio, parcial, offline e prazo. Produto/remoto preservados.

## B1.5 — 2026-10-29T04:06:02.510Z

Concluído inventário de 81 consultas/comandos e 948 estados aplicáveis em 97 superfícies. Taxonomia separa estado atual de proposta; não atribui implementação a estados ausentes. Delay, vazio real, erro, parcial, refresh sob filtro e offline exercitados; prazo de avisos verificado com relógio virtual declarado. Primeiro seletor de entregas incorreto preservado e repetido com nome acessível real. Segunda passada prioriza distinguir dado antigo de atual e não ocultar saldo válido por falha só do histórico. Próxima etapa B1.6: ações, confirmações, efeitos e reconsulta com mutações sintéticas aditivas. Nenhum produto/remoto alterado.

## B1.6 — 2026-10-29T04:14:02.126Z

Concluído inventário de 342 controles e 131 variantes de ação em 17 domínios. COM aquisição com resposta perdida recuperada pelo mesmo payload/chave e apenas um evento; ENT recebida com transferência e atendimento REQ; relato não debita até confirmação; BAL real por profissional designado, aprovado pela política vigente e reconsultado pela família, com PDF atual; revisão familiar distinta não executada neste cenário. Provas e mutações exclusivamente na fixture B1. Falha inicial de label Custódia repetida com name do campo; nenhuma gravação naquela tentativa. Segunda passada exige feedback por efeito e próxima responsabilidade, preservando confirmação crítica e estado incerto. Próxima etapa B1.7: catálogo campo a campo, validação, dados densos e continuidade. Produto/remoto preservados.

## B1.7 — 2026-10-29T04:25:24.096Z

Concluído catálogo campo a campo: 213 callsites, com label/binding, condição, default, validação, unidade, teclado, opções, persistência e recomendação. Primitivos separados de campos reais. Amostras1/5/20/100 de catálogo simuladas; não são benchmark remoto nem escrita de100materiais. REQ zero inicial, extra apagado→zero, erro sem aria-invalid/foco e escopo de rascunho por aba reproduzidos; limites servidor/UI e casos não reproduzidos nomeados. Segunda passada conserva texto livre para exceções, evita doses/presets clínicos e configurações sem necessidade. Próxima etapa B1.8: jornadas por seis personas, teclado, mobile, acessibilidade e síntese contraditória. Produto/remoto preservados.
