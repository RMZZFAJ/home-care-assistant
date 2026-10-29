# Protocolo de Auditoria e Entregáveis

## Função deste documento

Este protocolo complementa a Ordem Mestre.

Ele define padrões mínimos de investigação, evidência e documentação.

Não deve ser interpretado como um checklist exaustivo de problemas possíveis.

Quando a investigação revelar uma dimensão relevante não prevista aqui,
incorpore-a.

## Sequência investigativa recomendada

A auditoria deve ser iterativa.

Uma sequência eficiente é:

RECONHECER
→ MAPEAR
→ INSPECIONAR
→ EXECUTAR
→ CRUZAR
→ QUESTIONAR
→ CONTRADIZER
→ CONSOLIDAR
→ VERIFICAR COBERTURA.

Volte a etapas anteriores sempre que uma descoberta alterar seu entendimento.

Não imponha artificialmente uma única passagem linear.

## Reconhecimento

Antes de abrir arquivos aleatoriamente:

- inventarie a árvore;
- identifique tecnologias;
- identifique entry points;
- identifique fontes de verdade;
- identifique documentação;
- identifique migrations;
- identifique scripts;
- identifique testes;
- identifique rotas;
- identifique integrações;
- identifique configuração;
- identifique artefatos históricos.

Construa perguntas iniciais, não conclusões iniciais.

## Revisão por arquivo

Para código semanticamente relevante, avalie conforme aplicável:

- propósito;
- consumidores;
- dependências;
- autoridade;
- entradas;
- saídas;
- erros;
- estados;
- side effects;
- segurança;
- concorrência;
- tipos;
- duplicação;
- nomenclatura;
- legibilidade;
- testabilidade;
- adequação de localização;
- dívida;
- e relação com jornadas.

Atualize COVERAGE durante o trabalho, não apenas no fim.

## Revisão por componente de UI

Para cada componente/tela relevante, pense em:

- para quem existe;
- objetivo principal;
- contexto de entrada;
- informação mais importante;
- ação primária;
- ações secundárias;
- ação destrutiva;
- quantidade de decisões;
- carga cognitiva;
- discoverability;
- hierarquia;
- layout;
- consistência;
- densidade;
- toque;
- teclado;
- leitor de tela;
- loading;
- empty;
- error;
- success;
- stale;
- disabled;
- pending;
- conflict;
- offline/degraded;
- responsividade;
- wording;
- recuperação de erro;
- saída/continuação da jornada.

Não crie achado apenas porque "eu faria diferente".

Relacione a sugestão a princípio, padrão, comportamento ou problema humano
observável.

## Revisão de informação e linguagem

Crie uma tabela de termos quando surgirem inconsistências.

Colunas úteis:

internal_term
current_user_label
locations
persona
problem
suggested_label
reason
requires_data_contract_change
notes

Procure especialmente:

- nomes de enum aparecendo na UI;
- anglicismos;
- termos técnicos;
- status sem verbo claro;
- siglas não explicadas;
- títulos que descrevem entidade em vez de objetivo;
- mensagens que culpam usuário;
- mensagens sem ação de recuperação;
- inconsistências singular/plural;
- termos diferentes para o mesmo conceito.

## Revisão de campos

Para campos relevantes, registre quando houver problema:

- dado representado;
- cardinalidade;
- origem;
- formato;
- frequência de alteração;
- possibilidade de valor customizado;
- obrigatoriedade;
- validação;
- componente atual;
- componente recomendado;
- impacto de modelagem.

Não faça recomendações puramente visuais desconectadas do dado.

## Revisão de jornada

Mapeie cada jornada importante em estrutura semelhante:

TRIGGER
→ DISCOVERY
→ START
→ INPUT
→ VALIDATION
→ CONFIRMATION
→ PERSISTENCE
→ FEEDBACK
→ DOWNSTREAM EFFECT
→ HISTORY
→ CORRECTION/RECOVERY.

Pergunte onde:

- a pessoa pode abandonar;
- pode duplicar;
- pode interpretar errado;
- precisa esperar;
- perde contexto;
- encontra informação tarde;
- precisa navegar demais;
- não sabe se concluiu;
- não sabe quem deve agir;
- não consegue desfazer/corrigir;
- cria dependência manual.

## Revisão de regras de negócio

Para cada regra importante:

- onde está definida?
- existe mais de uma implementação?
- frontend e backend concordam?
- banco também a garante?
- qual camada é autoridade?
- como falha?
- qual erro chega ao usuário?
- é configurável ou hardcoded?
- deveria ser configurável?
- existe exceção real?
- concorrência muda o resultado?
- existe histórico suficiente para auditoria?

## Revisão do banco

Reconstrua schema final e dependências.

Procure:

- duplicate semantics;
- weak constraints;
- missing FK;
- FK inadequada;
- dados derivados armazenados sem justificativa;
- estado duplicado;
- campos polimórficos excessivos;
- JSON utilizado para evitar modelagem;
- enum impossível de evoluir;
- ausência de índices em caminhos demonstráveis;
- índices redundantes;
- funções sobrepostas;
- migrations corretivas acumuladas;
- triggers difíceis de rastrear;
- estado temporal mal representado;
- inconsistência entre snapshot e identidade;
- possibilidade de cross-patient relation;
- comportamento de delete/inactivation;
- privilégio excessivo;
- bypass acidental.

Diferencie "migration histórica feia" de "schema final ruim".

Uma cadeia de migrations pode ser longa e ainda produzir schema excelente.

## RLS e autorização

Construa uma matriz quando necessário:

persona
× capability
× patient context
× resource
× operation
× expected result
× actual enforcement layer.

Não analise RLS isoladamente.

Relacione:

API

- sessão
- RPC
- grant
- policy
- definer
- ownership
- contexto de paciente.

Tente acessos negativos seguros no ambiente local.

## Concorrência

Procure operações em que duas pessoas ou dois retries possam atuar.

Investigue:

- double submit;
- retries;
- lost response;
- version conflict;
- stale read;
- stock adjustment;
- inventory/balance;
- acceptance;
- scheduling;
- invitation;
- role changes;
- notifications;
- outbox.

Não presuma idempotência apenas pela existência de `idempotencyKey`.

Rastreie como ela é aplicada.

## Legacy/dead code

Nunca use apenas busca de imports.

Antes de classificar como DELETE_CANDIDATE:

- grep;
- busca de símbolo;
- dynamic import;
- string reference;
- route;
- configuration;
- CI;
- scripts;
- SQL;
- RPC;
- cron;
- persisted URL;
- email/message template;
- PDF;
- docs;
- test;
- fallback;
- backwards compatibility.

Registre a busca de consumidores.

## Design system

Monte um inventário dos padrões coexistentes.

Exemplos de dimensões, não categorias obrigatórias:

- Fluent component;
- wrapper próprio sobre Fluent;
- HTML nativo estilizado;
- componente legado;
- Tailwind direto;
- CSS design-system;
- tokens;
- inline style;
- browser native.

Descubra quais coexistências são intencionais.

Construa uma proposta de padrão futuro apenas após compreender os casos.

Verifique diferenças reais renderizadas.

## Ícones

Não avalie ícone apenas pelo nome da biblioteca.

Pergunte:

- ação é reconhecível?
- texto deveria acompanhar?
- icon-only possui accessible name?
- mesmo significado usa mesmo ícone?
- ícones iguais significam coisas diferentes?
- símbolo é apropriado para contexto brasileiro?
- tamanho e peso são coerentes?

## Timelines e histórico

Avalie:

- cronologia;
- agrupamento;
- autor;
- data/hora;
- ação;
- versão;
- causa;
- estado;
- relação com documento;
- mudanças importantes versus ruído;
- capacidade de reconstrução posterior.

Histórico não deve ser somente bonito; deve ser investigável.

## Estados assíncronos

Para toda mutação significativa, procure distinguir:

- idle;
- editing;
- validating;
- submitting;
- accepted by app;
- persisted;
- external processing;
- externally delivered;
- failed;
- uncertain;
- retrying;
- conflict.

Evite UX que diga "sucesso" antes do fato que realmente importa.

## Configurabilidade

Para regras hardcoded encontradas, pergunte:

- varia por paciente?
- varia por família?
- varia por profissional?
- varia por tipo de operação?
- muda com frequência?
- é política de negócio?
- exige auditoria?
- quem pode alterá-la?
- precisa de versionamento?
- precisa de default global/local?

Nem toda constante precisa virar configuração.

## Produto multipaciente

O cenário inicial da Clezeide deve ser usado para concretude.

Para toda recomendação específica, pergunte:

"Isso é característica desta residência ou conceito geral?"

Quando específico, avalie se deve ser:

- dado;
- configuração;
- catálogo;
- política local;
- preferência;
- template;
- ou não fazer parte do produto.

Evite hardcode.

## Operação móvel

Dê atenção especial às jornadas da profissional.

Avalie:

- área de toque;
- scroll;
- teclado virtual;
- inputs numéricos;
- camera/scanner;
- abertura de modal;
- bottom navigation;
- posição dos controles;
- perda de contexto;
- orientação;
- safe areas;
- uma mão;
- legibilidade;
- carregamento;
- conexão instável.

Não transforme a interface móvel em mera redução do desktop.

## Administração

Evite dois extremos:

- esconder informação necessária;
- expor toda complexidade técnica.

Avalie configurações por frequência e risco.

Configuração rara pode tolerar mais densidade.

Ação operacional frequente deve minimizar fricção.

## Testes exploratórios

Além de automatização, execute walkthroughs deliberados.

Registre roteiro e observação.

Não converta todo comportamento exploratório imediatamente em novo teste nesta
fase.

Registre qual automação futura teria valor.

## Performance

Quando possível, associe achados a evidência:

- query;
- plano;
- request count;
- bundle;
- render;
- payload;
- tempo;
- índice;
- algoritmo.

Quando não houver medição, classifique como risco, não defeito confirmado.

## Segurança

Não realize ataque destrutivo ao remoto.

No local, explore negativamente:

- cross-patient access;
- privilege escalation;
- ID tampering;
- role mismatch;
- unauthorized RPC;
- stale membership;
- revoked membership;
- direct table access quando deveria ser proibido.

Documente apenas de modo seguro.

## Documentação de evidência

MANIFEST.csv deve possuir, quando aplicável:

evidence_id
type
path
created_at
related_finding
scenario
sanitized
notes.

Screenshots devem ter nomes inteligíveis.

Não acumule imagens sem associação a achado ou observação.

## Esquema de FINDINGS_MASTER.csv

Use colunas equivalentes a:

id
title
nature
domain
priority
confidence
status
persona
journey
summary
observed
expected
reproduction
evidence
files
routes
components
api
database_objects
root_cause
human_impact
technical_impact
operational_impact
security_integrity_impact
workaround
recommendation
alternatives
invariants
dependencies
effort
regression_risk
acceptance_criteria
tests_required
human_decision
countercheck
countercheck_result.

Pode acrescentar colunas.

## Esquema de COVERAGE.csv

Use colunas equivalentes a:

path
artifact_type
responsibility
review_method
review_status
semantic_review
runtime_checked
visual_checked
security_relevance
journeys
consumers_checked
findings
evidence
limitations
notes.

O total de paths deve reconciliar com o inventário versionado, descontando
apenas
exclusões explicitamente justificadas.

## Resumo executivo

O resumo não deve esconder risco sob uma média.

Um P0 continua P0 mesmo que 99% do sistema esteja ótimo.

Também não transforme dezenas de P3 cosméticos em argumento para NO-GO.

Explique o raciocínio de prontidão.

## Homologação

Separe:

- verificado estaticamente;
- verificado por teste automatizado;
- verificado localmente;
- verificado visualmente;
- exige dispositivo físico;
- exige provedor externo;
- exige ambiente de produção/homologação;
- exige validação humana.

Não promova um nível de evidência ao seguinte.

## Roadmap posterior

O roadmap deverá agrupar mudanças por dependência e domínio, e não apenas por
prioridade.

Considere:

- correções bloqueadoras;
- fundações estruturais;
- design system;
- jornadas;
- backend/database;
- observabilidade;
- integrações;
- limpeza;
- homologação.

Não execute nenhuma delas nesta fase.

## Revisão final da própria auditoria

Antes de encerrar, faça uma revisão da documentação produzida.

Procure:

- achados duplicados;
- achados contraditórios;
- prioridade inconsistente;
- recomendação que viola outro contrato;
- referência quebrada;
- arquivo da cobertura sem classificação;
- evidência ausente;
- afirmação excessiva;
- opinião apresentada como fato;
- resultado histórico apresentado como atual;
- sugestão estética tratada como bug;
- bug grave tratado como mera melhoria.

Corrija os documentos da auditoria antes de finalizar.

## Regra de ouro

A qualidade desta auditoria não será medida pela quantidade de páginas ou pela
quantidade de achados.

Será medida pela capacidade de revelar, com evidência, aquilo que uma revisão
convencional não perceberia e transformar isso em decisões seguras e
executáveis.
