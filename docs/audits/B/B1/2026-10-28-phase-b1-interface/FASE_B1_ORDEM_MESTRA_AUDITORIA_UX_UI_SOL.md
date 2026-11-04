# ORDEM MESTRA — FASE B1

## Auditoria especializada e aprofundada de interface, experiência humana e

interação — Home Care Assistant

**Destinatário:** Codex no VS Code, modelo selecionado pelo responsável (Sol).
**Natureza:** investigação especializada de ponta a ponta, **sem implementação
de correções**.
**Repositório:** `RMZZFAJ/home-care-assistant` .
**Linha de base:** `master` no commit `34dcb835c5c49068e0417f7306eb4e501aa868bc`
, que contém a documentação da Fase A. **O produto efetivamente auditado na Fase
A é o SHA anterior** `37cb7f85e96e551d6419871f94dd950712e2565b` . Verifique o
HEAD, o diff, a árvore local e os documentos antes de começar: não assuma que
este texto descreve uma versão futura.
**Diretório histórico da Fase A:**
`docs/audits/2026-10-25-production-readiness/` .

> **META PRINCIPAL — GOAL:** Descobrir e documentar, com cobertura rastreável,
evidências atuais e independência crítica, **tudo que se encontra correto,
incorreto, inadequado, incompleto, pouco compreensível, inconsistente,
excessivamente complexo, ausente ou aperfeiçoável nas interfaces e nas
interações humanas do Home Care Assistant**. A meta não é identificar alguns
exemplos de UX; é avaliar sistematicamente o produto que uma pessoa vê e usa,
até o nível de cada tela, componente, campo, ação, mensagem, estado e percurso
relevante. O relatório final deve permitir que as Fases C e D planejem mudanças
precisas, sem recorrer à memória do auditor e sem confundir hipótese,
preferência, defeito comprovado ou oportunidade.

## I. O que esta Fase B1 é — e o que não é

1. Pertence à estratégia aprovada: **A (diagnóstico holístico concluído) → B
(aprofundamentos especializados; este é apenas o grupo B1) → C (consolidação
e decisões) → D (implementação autorizada)**.
2. **Não** executar os lotes B0–B7 de implementação descritos em
`EXECUTION_ROADMAP.md` da Fase A. Aqueles são hipóteses de planejamento
posterior, não a estrutura desta Fase B investigativa.
3. Uma **conversa nova e dedicada a B1** foi escolhida para evitar carregar o
contexto operacional da Fase A. Toda transferência de conhecimento deve
ocorrer por **arquivos persistidos no repositório**, com referência a SHA e
evidências. Não depender da memória de outro chat.
4. Executar **todos os subgrupos B1.1–B1.8 em sequência dentro deste grupo**,
com checkpoints e documentos completos por subgrupo. Não encerrar depois de
uma amostra, de um achado ou de uma rodada automática verde. Não avançar ao
grupo B2 ou a outra frente antes da autorização do responsável.
5. As conclusões da Fase A são referências e hipóteses úteis, **não uma lista
fechada**. Procure de forma ativa problemas e oportunidades que não apareçam
entre seus 32 achados. Não usar relatórios externos antigos como autoridade
superior ao comportamento atual.
6. O uso real inicial será a assistência domiciliar da primeira família; **a
arquitetura continuará multipaciente**. Tratar profissionais, supervisão,
familiares, administração local, administração global e leitores segundo suas
capacidades efetivas e seu contexto, não por estereótipos fixos.
7. Priorizar compreensão humana, operação móvel sob interrupção, decisões
informadas, clareza do resultado e recuperação de erros, sem desconsiderar a
estética sóbria Fluent UI 2/Dynamics e as diferenças apropriadas entre gestão
e operação.
8. A ordem abaixo estabelece **método, cobertura, evidência e entregáveis; não
limita a capacidade investigativa**. Exemplos servem para disparar busca, não
para determinar o inventário final de problemas. Questione inclusive a
organização dos subgrupos se houver uma descoberta transversal importante;
mantenha, contudo, todos os entregáveis.

## II. Guardrails, Git, privacidade e banco

- **Somente investigação.** Não alterar `src/` , `supabase/migrations/` ,
`supabase/seed.sql` , `scripts/` existentes, `tests/` existentes,
configurações, permissões, dependências, workflow, deploy, provedores, projeto
Supabase remoto ou aplicação em produção. Não reorganizar, excluir ou renomear
código/arquivos. Defeitos graves devem ser relatados e receber reprodução e
proposta; jamais ser corrigidos nesta fase.
- Pode **criar unicamente documentos de auditoria, dados fictícios de prova,
capturas sanitizadas e reprodutores isolados dentro de**
`docs/audits/2026-10-28-phase-b1-interface/` . Arquivos executáveis de prova
devem ficar nessa pasta, ser claramente identificados como mutáveis ou somente
leitura, e jamais serem confundidos com testes permanentes já incorporados ao
produto.
- Antes de qualquer ação Git, conferir `git status` , branch, HEAD, arquivos não
versionados e alterações feitas por terceiros. **Não usar reset, clean, stash,
checkout destrutivo, force push ou rebase** para preparar o trabalho. Se a
árvore estiver suja, preservar e documentar; usar a estratégia segura
disponível ou pedir intervenção apenas se houver bloqueio real.
- Quando seguro, trabalhar em **branch própria para documentação B1**, sugerida
`audit/phase-b1-human-interface-2026-10-28` . Commit no final **exclusivamente
dos novos artefatos de B1**, após validação; não fazer merge na master, não
publicar deploy, não abrir PR com alterações de produto. Se o ambiente não
permitir branch/commit sem tocar em trabalho preexistente, guardar os
documentos e informar o bloqueio.
- **O GitHub informou visibilidade `public` e `master` sem proteção na consulta
prévia.** Revalidar tais metadados, tratá-los como risco de governança para o
responsável e, sobretudo, **não colocar nomes de pacientes reais, dados
clínicos, fotografias reais, telefone, e-mail pessoal, credenciais, tokens,
JWT, payloads privados ou capturas com informação sensível no repositório**.
Usar nomes fictícios e informações sintéticas. Reportar achados de privacidade
em termos sanitizados, sem publicar exemplos sensíveis.
- Banco Supabase **local existente** `home-care-assistant` é o ambiente
autorizado para testes mutáveis e descartáveis. Verificar positivamente
projeto, containers, portas `127.0.0.1:54321` e `:54322` , flags de envio
externo desabilitadas e identidade dos dados antes de rodar provas. Não criar
terceira/quarta stack ou exigir backups locais repetitivos sem necessidade
justificada; não ignorar guardas de scripts existentes. **Nenhum acesso
mutável ao remoto**, nenhuma chamada real de WhatsApp/SMTP/Meta, nenhuma
alteração em Auth/Storage remoto.
- A Fase A registrou fixtures, sessões e anexos sintéticos locais; não presumir
que o banco local continua naquele estado. Preparar fixtures conforme
necessidade e registrar as mutações. Testes que escrevem no banco precisam ser
classificados como tal. Evitar enviar notificações a pessoas reais.
- **O último CI verificado no commit documental `34dcb835` terminou com falha no
projeto Chromium desktop** (run `40656069166` ), enquanto banco, Linux,
Windows, Chromium móvel e WebKit aprovaram. O job apontou
`tests/e2e/workflows.spec.ts` e `tests/e2e/navigation.ts` , tentando encontrar
`Navegação do plantão` em layout desktop, alinhado a QA-001. Revisar os logs
atuais, comprovar se a causa é a mesma e registrar **sem alterar o helper**.
Essa informação é evidência prévia, não prova automática de toda falha futura.
- Não declarar acesso a browser, screenshots, sistema operativo, hardware ou
conectores que não estejam realmente disponíveis. Se uma capacidade faltar,
documentar `NOT_VERIFIED` , seus efeitos e a forma concreta de validação
posterior.

## III. Preparação B1.0 — reconhecimento, cobertura e plano operacional

Antes de auditar subgrupos:

1. Ler `AGENTS.md` , README, arquitetura viva e os seguintes relatórios Fase A,
no mínimo: `README.md` , `EXECUTIVE_READINESS.md` , `METHOD_AND_EVIDENCE.md`
, `COVERAGE_SUMMARY.md` , `FINDINGS_MASTER.csv/.md` ,
`UI_UX_DESIGN_SYSTEM.md` , `MICROCOPY_TERMINOLOGY_AND_FORMS.md` ,
`JOURNEYS_AND_INFORMATION_ARCHITECTURE.md` ,
`PRODUCT_GAPS_AND_CONFIGURATION.md` , `HOMOLOGATION_AND_ACCEPTANCE.md` ,
`PHASE_B_HANDOFF.md` e `evidence/UI_RUNTIME_REVIEW.md` .
2. Verificar SHA do produto, mudanças introduzidas somente pela auditoria,
estado da CI, scripts e ambientes. Documentar limitações antes dos testes. A
versão do produto é a mesma da Fase A salvo prova contrária; distinguir
baseline e documentação posterior.
3. Inventariar **todas as rotas/telas com superfície visual**, respectivos
layouts, dashboards, formulários, dialogs, drawers, menus, tabs, tabelas,
listas, cards, mensagens, wizards, componentes compartilhados, páginas de
erro, autenticação, páginas públicas (quando aplicável), visualizadores e
PDFs tratados como interface documental. Mapear a cada item: caminho,
consumidor, perfil/capacidade, jornada, estados relevantes, origem de dados,
componente e comando de negócio. Distinguir rota ativa, redirecionamento,
compatibilidade, protótipo e componente sem consumidor.
4. Fazer **leitura semântica completa dos arquivos relevantes de interface**,
incluindo `src/app/**` com UI, `src/components/**` , `src/theme/**` , folhas
CSS, bibliotecas de labels/status, validações e contratos de interface, e
testes associados. Inspecionar APIs/DB/RPC dirigidamente quando necessários
para entender o comportamento visível; B1 não vira auditoria geral repetida
de todos os 503 arquivos.
5. Criar matriz canônica de cobertura B1 com uma linha por superfície e por
arquivo relevante. Estados `REVIEWED_STATIC` , `RENDERED_AND_INSPECTED` ,
`BEHAVIOR_EXERCISED` , `PARTIAL` , `NOT_VERIFIED` , `EXCLUDED_WITH_REASON` .
São dimensões, não rótulos que se excluem: leitura, renderização e execução
devem ser indicadas **separadamente**. Uma captura automática não equivale a
inspeção humana; abrir um componente não comprova todos seus estados.
6. Planejar amostras sistemáticas de perfis e larguras (incluindo 320, 390, 768,
1440, 1920 quando pertinentes), dados vazios e densos, campos longos, estados
felizes e adversos, leitor de tela/teclado/zoom quando disponíveis. Evitar
matriz cartesiana desnecessária; justificar seleção, rastrear cada combinação
não examinada e aprofundar as de maior risco.
7. Criar índice `README.md` , `CHECKPOINT.md` , inventários iniciais, mapa de
jornadas e manifesto de evidências. Registrar o planejamento de ordem dos
oito subgrupos. Em cada checkpoint: concluído/não concluído, provas, arquivos
lidos, telas exercitadas, lacunas, descobertas novas, próximos experimentos e
critério real para continuar.

## IV. Investigação específica: executar os oito subgrupos INTEGRALMENTE

### B1.1 — Inventário e auditoria de TODAS as superfícies de interface

Para cada rota/página e cada overlay significativo (modal, drawer, popover,
menu, wizard, confirmação, tooltip, toast), identificar:

- **Por que existe** e qual intenção humana atende; perfis/contextos
autorizados, entradas e destinos, relações com outras telas; existência de
conteúdos ocultos, desnecessariamente duplicados ou ausentes.
- Componentes e campos realmente exibidos; prioridades visuais; títulos,
subtítulos, cards, tabelas, agrupamento, ordens, alinhamentos, espaçamentos,
ações primárias/secundárias, ícones, estados, densidade, responsividade e
rolagem; comparar desktop/mobile e perfis.
- Para **cada ação**: identificador de controle, texto, localização,
pré-condição, expectativa humana, mudança de estado, comportamento visível,
falha, sucesso, confirmação, recuperação, consequência em outras telas e fonte
da verdade.
- Para **cada conteúdo**: a pessoa entende o que significa, de onde veio, quão
atualizado está, se representa previsão/observação/confirmado/pendência e qual
próximo passo? O conteúdo importante está na posição correta?
- Inspeção **renderizada** da tela quando viável; screenshots com cenário,
viewport, usuário fictício, estado pronto e legenda exata. Não usar
screenshots de loading como evidência de estado final. Quando renderização não
for viável, registrar limitação sem marcar aprovado.
- Um diagnóstico por superfície, mesmo que não haja problemas: **méritos
preserváveis, atritos observados, oportunidades novas, evidências,
incertezas**. Identificar superfícies ainda NÃO examinadas; jamais declarar
“todas as telas” sem inventário reconciliado.
- Avaliar telas públicas, login, convite, confirmação de e-mail, recuperação de
senha, escolha/troca de paciente, configuração, painel
global/local/família/supervisão/profissional/leitor, REQ/COM/ENT/BAL, estoque,
consumo, escala, documentos, histórico, notificações e administração. Essa
enumeração **não substitui descoberta de rotas reais**.

### B1.2 — Design system, consistência Fluent/Dynamics e qualidade visual fina

- Inventariar controles Fluent e legados, tokens, CSS global, especificidade,
classes locais, estilos sobrepostos, duplicações e variantes comportamentais.
Não deduzir defeito pela coexistência de classes; verificar **resultado final
renderizado**.
- Auditar tipografia, hierarquia, densidade, grade, margens, alinhamento,
padrões de agrupamento, tamanhos de campo e botão, contraste, ícones, seleção,
foco, estados disabled, confirmação e responsividade em cada componente
compartilhado e consumidor relevante.
- Confrontar padrões repetidos: ações primárias, barras de comando, cards,
grids, tabelas, filtros, formulários, drawers, dialogs, timelines, estados e
PDFs. Apresentar comparação **antes observado / padrão-alvo recomendado /
fundamento / exceção justificada**.
- Fluent 2 é linguagem-base aprovada; Dynamics é referência de organização
empresarial, não obrigação de copiar telas ou marca. Mobile pode exigir
variantes próprias. Checkbox (seleção para salvar) não é sinônimo de switch
(alteração imediata); não migrar mecanicamente componentes.
- Avaliar refinamentos que pessoas normalmente não percebem: distribuição de
espaços, superfícies excessivamente vazias, alinhamentos de rótulos, ações
afastadas do objeto, ícones ambíguos, tamanho de toque, títulos redundantes,
popovers cortados, scroll aninhado, cabeçalhos que escondem a tarefa, linhas
do tempo ilegíveis, excesso de cards, feedback pouco saliente, inconsistência
entre telas antigas e novas.

### B1.3 — Linguagem, textos exibidos e ajuda contextual: catálogo EXAUSTIVO

- Construir inventário estruturado dos **textos literais e textos dinâmicos**
que podem chegar ao usuário: menu, title, heading, label, placeholder,
legenda, opção de lista, filtro, botão, tooltip, ajuda, aviso, confirmação,
histórico, erro, sucesso, vazio, loading, notificação, accessibility label e
valores de status; incluir textos gerados pela API quando expostos.
- Mapear origem no código e **superfície renderizada**, perfil e cenário;
classificar `HUMAN_CLEAR` , `TECHNICAL_EXPOSED` , `AMBIGUOUS` , `INCONSISTENT`
, `MISSING_GUIDANCE` , `MISLEADING` , `NOT_VERIFIED` . Não contar dicionário
existente como prova de que todos os valores estão cobertos.
- Propor português claro, profissional, conciso e natural, adequado a familiares
e técnicas; não infantilizar, não usar jargão sem explicação. **Não alterar o
significado de contratos:** ciência não é aceite; COM não é ENT; estoque
transitório não é recebido; proposta não é aplicação; REQ não pede quantidade
solicitada; escala não comprova presença; contagem BAL não é consumo
automático; hash não é assinatura digital.
- Para cada proposta: texto atual exato, texto alternativo completo, razão,
impacto e se exige mudança de interface, backend ou estado. Localizar casos
que merecem ajuda **logo abaixo do campo**, tooltip, exemplo, indicação de
escopo ou mensagem introdutória — e casos em que textos adicionais apenas
atrapalhariam.
- Criar glossário humano canônico por domínio, com termos alternativos e
política de tradução para situações raras, estados desconhecidos e erros.
Examinar português em plurais, datas, unidades, fuso, nomes longos e números.
- Capturar relações incorretas entre nomes de menu e destino real; expor códigos
internos como `science_required` /`archive_pending`, JSON de propostas,
nomenclatura técnica de escala/âncora/duração, preferências, custódia e outros
que descobrir por conta própria.

### B1.4 — Catálogo transversal de ERROS e tratamento humano de falhas

- Investigar **todos os caminhos de erro** relevantes que alcançam interface:
validações do formulário, API, autenticação, sessão expirada, perfil sem
acesso, paciente/contexto inválido, permissões revogadas, conflito de edição,
quantidades/estoque, ações indisponíveis, armazenamento de anexo,
documento/PDF, agendamento, timeout, resposta perdida,
401/403/404/409/422/429/500, falha de rede e situações ainda não modeladas.
- Para cada erro, mapear **código técnico/origem → cenário observável → texto
atual → local/forma visual → efeito real no servidor → certeza sobre
persistência → dados que permanecem no formulário → próxima ação segura →
texto ideal → CTA de recuperação → telemetria/correlação sanitizada**.
- Diferenciar **não gravado**, **gravado**, **ainda processando** e **resultado
desconhecido**. NUNCA recomendar simples “tentar novamente” quando isso possa
duplicar uma operação ou trocar o arquivo de uma tentativa incerta.
- Verificar erros exibidos longe do campo, genéricos, que desaparecem rápido,
apenas em console, que deixam spinner infinito, que perdem preenchimento,
mensagens contraditórias ou que não oferecem recuperação. Verificar foco,
leitura por leitor de tela e localização do aviso.
- Produzir **catálogo por código + catálogo por tela/jornada** e matriz de
cenários de injeção de falhas. Se não for seguro reproduzir, registrar
hipótese e prova necessária; não forçar falha remota.

### B1.5 — Todos os estados de carregamento, vazio, atualização e espera

- Auditar explicitamente os estados `INITIAL` , `LOADING` , `REFRESHING` ,
`READY` , `EMPTY_CONFIRMED` , `PARTIAL` , `ERROR_RECOVERABLE` ,
`ERROR_BLOCKED` , `SUBMITTING` , `PERSISTED` , `DELIVERY_PENDING` ,
`UNKNOWN_RESULT` , `OFFLINE` , `STALE_CONTEXT` , `NO_PERMISSION` quando
aplicáveis; adaptar a taxonomia ao contrato real, sem criar estados fictícios
por obrigação.
- Para cada consulta/campo/lista/tela: quando a consulta começa, o que aparece
antes, como evita afirmar ausência prematura, o que conserva durante refresh,
como apresenta erro parcial, o que acontece com resultados antigos e como a
pessoa solicita recuperação.
- Verificar `Suspense` , spinners, placeholders, skeletons, overlays, timers,
timeouts, feedback de submit, listas, paginação e transição entre pacientes;
evitar spinner genérico ou tela congelada quando a pessoa necessita contexto.
- Reproduzir **delay, erro, vazio real e resposta parcial** em superfícies
representativas; identificar o restante sem fingir execução. UX-004 e UX-012
são hipóteses iniciais, não limites.
- Exigir proposta de estado visual, frase exata, CTA, comportamento do foco e
condição de transição para cada lacuna relevante. Não inventar sucesso de
canal externo quando apenas a persistência interna foi comprovada.

### B1.6 — Feedback, confirmações, notificações e microinterações de resultado

- Inventariar **todas as ações com consequência** (criar, revisar, confirmar,
recusar, publicar, cancelar, arquivar, anexar, receber, contar, adiar, alterar
política, enviar convite, trocar perfil, etc.) e suas respostas visíveis.
- Para cada ação, examinar: feedback imediato, ocupação/posição, duração,
legibilidade, proximidade da ação, sucesso efetivo vs mera aceitação de
proposta, próxima responsabilidade, estados intermediários, aviso persistente,
histórico e como reencontrar confirmação após fechar a tela.
- Distinguir `toast` efêmero, aviso inline, status persistente, modal decisório,
badge e central de notificações. Escolher o padrão pelo valor operacional, não
pela aparência. Prevenir excesso de modais e popups.
- Mensagens de sucesso devem declarar **o que foi salvo**, **o que ainda não
ocorreu** e **o que a pessoa deve fazer a seguir**, quando pertinente.
Mensagens de erro devem esclarecer recuperação, sem transmitir código técnico
como explicação principal.
- Contrastar estados de documento salvo, comunicação interna enfileirada,
WhatsApp entregue/lido, ciência, recebimento de material, contagem, revisão e
alteração de escala. Avaliar sons/animações apenas se fizerem sentido e
puderem ser acessíveis/configuráveis.
- Criar modelo recomendável de feedback por classes de operação, com exemplos
concretos e mapeamento de consumidores, não apenas lista genérica de “usar
toasts”.

### B1.7 — Formulários, campos, listas e eficiência do preenchimento

- Catalogar **cada formulário e campo operante**: tipo atual, label,
placeholder, ajuda, formato, validação, required/optional, valor inicial,
estado disabled, dependências, opções predefinidas, controle de permissão,
persistência, comportamento no celular e recuperação de erro.
- Perguntar por que existe; se pode ser dispensado, inferido com segurança,
quebrado, agrupado, movido, preenchido automaticamente de modo visível,
transformado em select/combobox/preset/checkbox/switch/radio, ou mantido texto
livre com exceções. Não recomendar mudança sem confirmar fonte de opções e
persistência/contrato.
- Investigar busca e seleção de catálogo, categorias, unidades e apresentações,
materiais frequentes, quantidades/decimais, divergências ENT, motivos de
estoque, BAL com muitos itens, escala e duração/fuso, políticas de avisos e
perfis. **Não pedir quantidade solicitada em REQ**. Nenhum default deve
transformar ausência de contagem em zero confirmado.
- Avaliar fluxo com uma mão e interrupção, 1/5/20/100 linhas, campos dinâmicos,
validação no campo certo, teclado móvel, persistência do rascunho, scroll ao
primeiro erro, aviso antes de perder alterações, clareza de salvar versus
mudança imediata.
- Propor alterações **campo a campo**; justificar quando manter o componente
existente. Avaliar necessidades de novas configurações somente quando há
comportamentos legítimos alternativos e responsável capaz de escolher. Não
converter toda constante em configuração.

### B1.8 — Navegação, acessibilidade, hierarquia de tarefas e auditoria

integrada por persona

- Percorrer tarefas reais de **profissional, supervisão, família, administrador
local/global e leitor**, com capacidades verdadeiras da fixture e contexto
selecionado. Verificar caminhos, menus, descoberta de ações, permissões
explicadas, relação entre histórico/entregas/estoque, preferências,
notificações e propostas.
- Para cada jornada relevante mapear **intenção inicial → ponto de entrada →
cliques/toques/rolagem → decisão → resultado → próxima ação → recuperação →
reconsulta histórica**. Identificar atalhos justificados, ações escondidas,
menus redundantes, telas que deveriam ter contextualização/link e obstáculos
humanos sob pressão.
- Verificar uso em tela pequena, nomes extensos, zoom, foco, ordem Tab, Escape,
labels acessíveis, contraste, área de toque, teclado virtual e leitor de tela
conforme ferramentas reais disponíveis. Emulação de mobile não substitui
aparelho físico; explicitar limites e plano de validação humana posterior.
- Criar **cognitive walkthrough** de tarefas críticas em condições normais e
adversas. Pergunta fundamental: alguém que nunca viu o sistema sabe o que
fazer, o que foi registrado e o que ainda exige ação? Não atribuir compreensão
humana a uma automação sem sessões humanas reais.
- Revisar as próprias descobertas: uma sugestão de remover confirmação pode
desproteger operação crítica; um switch pode representar persistência imediata
e não seleção; um botão maior pode encobrir a lista; uma informação
simplificada pode perder distinção jurídica/operacional. Aplicar contraditório
antes de recomendar.
- Na síntese B1, identificar padrões transversais que mereçam abordagem
compartilhada na futura Fase D e achados que devem ser transferidos aos grupos
B2–B9, sem implementá-los ou omiti-los por não pertencerem a UX.

## V. Perspectiva obrigatória: encontrar O QUE NINGUÉM AINDA PEDIU

Em **cada subgrupo**, realizar duas passadas independentes:

1. **Auditoria de conformidade e problemas observáveis** — reconstruir o que
existe, testar, encontrar diferenças entre intenção, código e comportamento.
2. **Auditoria inventiva e adversarial** — imaginar uma pessoa real entrando
pela primeira vez, uma rotina interrompida, uso com pouca familiaridade
tecnológica, informação incompleta, pressa, muitos registros, duas pessoas
simultâneas e interfaces inconsistentes. Perguntar que informação, atalho,
orientação, estado, página, configuração, ligação ou ferramenta **deveria
existir e não existe**, sem pressupor que as propostas anteriores sejam
suficientes.

A cada hipótese, formular objeção: já existe equivalente? Há regra que explica a
ausência? A proposta cria mais cliques, manutenção, confusão ou risco? Pode ser
resolvida com texto ou reorganização em vez de nova tabela/página? Qual
evidência sustentaria implementação? **Quantidade de achados não mede qualidade
da auditoria.**

## VI. Achados Fase A a aprofundar — pontos de partida, NÃO fronteiras

Especial atenção a `UX-001` (aprovação de escala sem resumo), `UX-002` (ciência
automática observando cabeçalho), `UX-003` (upload de resposta perdida),
`UX-004` (vazio prematuro), `UX-005` (JSON de propostas), `UX-006` (vocabulário
e navegação), `UX-007` (rascunho por aba), `UX-008` (Fluent/legados), `UX-009`
(histórico), `UX-012` (timeout e feedback). Investigar implicações de
`BE-001/004` (listas antigas invisíveis), `BE-005` (reenvio), `BE-007` (PDF),
`DB-001/003/004/007` (estados visíveis e autoridade), `QA-001`
(reprodutibilidade) e qualquer achado transversal novo. Não tratar achados
confirmados como já corrigidos. Não repetir automaticamente a prioridade
original; justificar o impacto humano por perfil e etapa.

## VII. Evidências, modelo de achado e rastreabilidade

Todo achado deve conter, no mínimo:

- `id` único (`B1-UX-###`, `B1-TEXT-###` , `B1-ERR-###` , `B1-STATE-###` ,
`B1-FORM-###` , ou taxonomia equivalente coerente), `source_a_id` quando
existir, subgrupo, superfície, rota, perfil, jornada, controle/campo/estado.
- Natureza (`DEFECT_CONFIRMED`, `RISK_SUPPORTED` , `EXPERIENCE_INCONSISTENCY` ,
`MISSING_CAPABILITY` , `PRODUCT_OPPORTUNITY` , `NOT_VERIFIED` etc.),
confiança, impacto, frequência plausível, gravidade P0–P3 e critério objetivo
de priorização.
- **Atual exato**, resultado observado, **esperado** e consequência humana;
reprodução passo a passo, dados fictícios, viewport/ambiente, captura ou log
sanitizado; código/linhas e contratos relevantes. Não inventar linha quando a
referência não foi conferida.
- Recomendação concreta **com proposta visual/textual/comportamental** quando
cabível, alternativas consideradas, decisões necessárias do responsável,
invariantes a preservar, dependências com outros grupos, riscos e critérios de
validação futuros.
- **Contraditório:** hipótese alternativa analisada, evidência contrária e
motivo da conclusão. Distinguir “não encontrei” de “não existe”.
- `verification_status` expresso para estática, renderização, E2E e teste
humano; não marcar como comprovado em produção algo observado apenas em
fixture local.

Toda evidência deve identificar SHA, data/hora, ferramenta, perfil fictício,
contexto, ação, estado e resultado. Capturas devem estar sanitizadas e
corresponder ao estado correto. Logs devem omitir segredos e dados pessoais.
Gerar manifesto com hashes, sem exigir inúmeros backups do banco local.
**Distinguir fotografia de protótipo/história de captura atual do produto em
execução.**

## VIII. ENTREGÁVEIS OBRIGATÓRIOS — documentação realmente preenchida

Criar `docs/audits/2026-10-28-phase-b1-interface/` com uma estrutura navegável,
adaptável somente para melhorar legibilidade (não para suprimir conteúdo):

```text
README.md
CHECKPOINT.md
00_BASELINE_SCOPE_AND_METHOD.md
01_INTERFACE_INVENTORY.csv
01_INTERFACE_COVERAGE.csv
01_COMPONENT_TEXT_SOURCE_COVERAGE.csv
02_SCREEN_BY_SCREEN/ # arquivos MD por domínio/rota, com avaliação individual
real
03_FLUENT_VISUAL_CONSISTENCY.md
03_COMPONENT_PATTERNS.csv
04_TEXT_INVENTORY.csv
04_TERMINOLOGY_AND_REWRITES.md
05_ERROR_CATALOG.csv
05_ERRORS_AND_RECOVERY.md
06_LOADING_STATES_MATRIX.csv
06_LOADING_EMPTY_ERROR_STATES.md
07_FEEDBACK_ACTIONS_MATRIX.csv
07_FEEDBACK_AND_NOTIFICATIONS.md
08_FORM_FIELD_CATALOG.csv
08_FORMS_AND_INPUT_EFFICIENCY.md
09_JOURNEYS_NAVIGATION_AND_PERSONAS.md
10_MOBILE_ACCESSIBILITY_AND_HUMAN_TEST_PLAN.md
11_NEW_PRODUCT_GAPS_AND_UNASKED_QUESTIONS.md
12_FINDINGS_MASTER.csv
12_FINDINGS_MASTER.md
13_ACCEPTANCE_TEST_MATRIX.md
14_GROUP_B1_EXECUTIVE_ASSESSMENT.md
15_CROSS_GROUP_DEPENDENCIES_AND_PHASE_C_HANDOFF.md
evidence/
MANIFEST.csv
# cenários, capturas atuais, logs sanitizados, reprodutores e matrizes
auxiliares
```

**Requisitos de qualidade dos arquivos:**

- `01_INTERFACE_INVENTORY.csv` : inventário reconciliado de superfícies reais:
ID, rota, componente, tipo, perfil/capacidade, ativa/legada/protótipo,
funções, estado, subgrupo, evidência, avaliação e lacunas. Identificar
superfícies descobertas dinamicamente.
- `01_INTERFACE_COVERAGE.csv` : uma linha por superfície/estado representativo,
com distinção entre lido, renderizado, exercitado, inspecionado, não
verificado e motivo. **Não aceitar 100% nominal baseado apenas em leitura do
código**.
- `01_COMPONENT_TEXT_SOURCE_COVERAGE.csv` : relacionar arquivos fonte relevantes
(incluindo tratamento apropriado de estilos, recursos e dados dinâmicos), sem
supor que a matriz da Fase A automaticamente comprova B1.
- `02_SCREEN_BY_SCREEN/` : **avaliação própria de cada superfície real**, com
estrutura padrão: papel da tela, contexto, hierarquia, lista de controles,
estados, atritos, méritos, sugestões concretas, links de evidência e o que
ainda não foi verificado. Não produzir 1 parágrafo genérico por tela;
aprofundar telas densas em subarquivos.
- `03_*` : mapa dos padrões realmente usados, variantes, diferenças visualmente
demonstradas, propostas proporcionais e exceções justificadas.
- `04_*` : **inventário de textos originais**, origens/consumidores e propostas
reescritas completas, com localização e contexto; abarcar literais e chaves
dinâmicas sem fingir que cada combinação foi renderizada.
- `05_*` : **catálogo de erros por código e por cenário/interface**, origem,
formato atual, persistência confirmada/incerta, mensagem recomendada, CTA,
próxima ação, manutenção de dados e testes; registrar erros que hoje só
aparecem em console ou não são expostos.
- `06_*` : estados separados de loading, atualização, vazio, falha, sucesso e
resultado incerto em todas as superfícies inventariadas; indicar evidência por
cenário e estados não reproduzidos.
- `07_*` : matrizes de **cada ação significativa e seu feedback**, com sucesso,
pendência, proposta, falha, encerramento, tempo de exposição e reconsulta.
- `08_*` : **campo por campo**, com diagnóstico de input, label, validação,
obrigatoriedade, opções prontas, ajuda, persistência, configuração e
recomendação.
- `09_*` : jornada por persona e percursos transversais, perdas de contexto,
número de interações quando medido, descobribilidade e prioridade humana.
- `10_*` : acessibilidade e mobile testados versus não testados; plano explícito
para aparelhos físicos, rede ruim e teste com profissionais/família.
- `11_*` : lacunas FUNCIONAIS novas descobertas, não apenas reapresentação dos
32 achados anteriores; propostas com custo, benefício e contraditório; nenhum
invento apresentado como requisito obrigatório sem evidência.
- `12_FINDINGS_MASTER.csv/.md` : registro mestre consistente, granular,
deduplicado, com links e evidência, ponte com achados da Fase A e
decisões/aceites. Nunca gerar 300 achados artificiais a partir de 300 textos
equivalentes; agrupar causa raiz preservando matriz de manifestações.
- `13_ACCEPTANCE_TEST_MATRIX.md` : critérios de aceite para futuras correções,
cobrindo texto, estado, visual, ação, autorização, mobile, rede/recuperação,
histórico e regressões. Estes são **testes sugeridos, não implementados
agora**.
- `14_GROUP_B1_EXECUTIVE_ASSESSMENT.md` : diagnóstico humano, o que já é bom,
áreas problemáticas, lacunas de avaliação, riscos para o primeiro uso e
prioridade relativa; não emitir “READY” em virtude de uma captura.
- `15_CROSS_GROUP_DEPENDENCIES_AND_PHASE_C_HANDOFF.md` : contexto de
transferência para B2–B9 e Fase C, relações com backend/banco/regras,
problemas abertos, decisões do usuário e recomendações sem implementar.
- `CHECKPOINT.md` : progresso real por subgrupo, contagens reconciliadas, base,
status das provas e do CI, bloqueios, próximos passos, ações locais com dados
sintéticos e declaração explícita de que nenhum código/produto/remoto foi
modificado.
- `evidence/MANIFEST.csv` : evidências atuais, hash/bytes, ferramentas e
proveniência; arquivos históricos referenciados, não copiados
desnecessariamente.

O volume de documentos deve corresponder ao **trabalho realmente feito**:
tabelas preenchidas, registros específicos e capturas relevantes. Um sumário de
5 páginas sem inventários e matrizes completas NÃO cumpre a missão. Também não
inflar volume repetindo textos sem novas provas. Validar integridade das
referências, IDs, estado e evidências.

## IX. Execução progressiva e governança de contexto para o modelo escolhido

Para preservar qualidade com o modelo Sol e tarefas longas:

1. **B1.0** — estabelecer baseline, inventários e plano; criar checkpoint
verificável.
2. **B1.1** — concluir mapa de telas e primeira auditoria individualizada,
registrando lacunas de renderização.
3. **B1.2** — concluir revisão visual/sistema de design com comparações
observadas.
4. **B1.3** — concluir catálogo de linguagem e microcopy.
5. **B1.4** — concluir catálogo de erros e recuperação.
6. **B1.5** — concluir matriz de estados de carregamento/vazio/erro.
7. **B1.6** — concluir feedback/notificações e ações.
8. **B1.7** — concluir análise campo por campo de formulários.
9. **B1.8** — concluir jornadas, mobile, acessibilidade e síntese adversarial.
10. **Fechamento B1** — reconciliação do inventário/achados, contraditório,
    rastreabilidade, documentos de transferência, revisão do pacote e commit
    docs-only quando seguro.

Cada etapa usa os documentos anteriores como CONTEXTO PERSISTIDO, não recita
tudo no chat. Ao terminar cada subgrupo, registrar o estado e iniciar o seguinte
**sem necessitar novo comando**, desde que exista acesso e autorização já
previstos. Se a conversa estiver prestes a exceder sua capacidade de contexto,
**salvar checkpoint completo**, encerrar sem declarar B1 concluído e indicar
claramente como retomar **o MESMO grupo** em nova conversa. É melhor retomada
verificável que conclusão fabricada.

**Atenção à expressão E2E:** significa examinar a experiência de ponta a ponta
para cada tarefa e executar testes end-to-end quando adequados. Não significa
disparar indiscriminadamente a suíte E2E completa a cada subgrupo, nem confundir
aprovação de testes com qualidade de microcopy. Executar testes proporcionais
com documentação de quais caminhos foram de fato exercitados.

## X. Critérios de conclusão e relatório final

A Fase B1 somente poderá ser declarada concluída quando:

- Todos os oito subgrupos possuírem entregáveis **preenchidos** e revisados.
- Inventário de todas as superfícies descobertas reconciliado com
rotas/componentes ativos, e indicação honesta de qualquer superfície ou
cenário não renderizado/exercitado.
- Inventário de textos, erros, estados e campos possuir cobertura verificável
com origens identificadas e limitações nomeadas.
- Evidências atuais e achados novos estiverem ligados aos registros da Fase A,
mas não dependam exclusivamente deles.
- Houver **crítica autônoma e contraditória**, incluindo avaliação do que já
está correto, novas necessidades plausíveis e propostas recusadas por
custo/risco/duplicação.
- O pacote explicar, em linguagem acessível para o responsável pelo produto, o
que se passa na rotina da família/equipe e quais decisões humanas permanecem
necessárias.
- Os testes/explorações executados apresentarem ambiente, método, sucesso,
falha, limitação e não alterarem o produto ou remoto.
- Nenhum P0/P1 relevante descoberto permanecer escondido atrás de uma média
visual. Relatar imediatamente no checkpoint, mas não corrigir sem Fase D
autorizada.
- A documentação estiver íntegra, sem segredos/PII, com referências verificáveis
e estado Git preservado; o commit contém **somente** a pasta documental
autorizada.

**Definição final de sucesso:** Não basta que a interface compile, que o design
pareça bonito ou que 32 achados antigos tenham sido analisados. O sucesso é
dispor de um diagnóstico humano e técnico, detalhado, rastreável e útil de
**toda a experiência efetiva** — inclusive suas exceções, lacunas e
oportunidades ainda não imaginadas — para alimentar a Fase C e planejar a
implementação apenas na Fase D.

**Inicie agora pelo reconhecimento B1.0, sem modificar o produto.**
