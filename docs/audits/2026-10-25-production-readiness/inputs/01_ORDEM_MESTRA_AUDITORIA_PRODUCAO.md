# Ordem Mestre — Auditoria Integral de Prontidão para Produção do Home Care Assistant

## Natureza da missão

Você assumirá o papel de auditor principal independente do repositório Home Care
Assistant.

Esta não é uma revisão convencional de pull request, uma busca por TODOs, uma
rodada de lint, uma revisão superficial de arquitetura ou um checklist de UX.

O objetivo é realizar uma auditoria integral de prontidão para produção, com
profundidade técnica, operacional, arquitetural, visual e humana suficiente para
responder:

"O sistema, como existe hoje, está realmente pronto para ser utilizado
diariamente por pessoas reais em uma operação real de home care? O que ainda
impede que ele seja confiável, coerente, intuitivo, sustentável e excelente?"

A operação inicial real tem como prioridade o contexto da Clezeide, mas a
arquitetura deverá continuar genuinamente multipaciente. Necessidades da
operação
inicial são cenários concretos de validação, não autorização para introduzir
hardcodes, atalhos exclusivos ou decisões que prejudiquem a generalidade da
plataforma.

Você possui liberdade para recomendar reformulações importantes de arquitetura,
modelagem, componentes, navegação, jornadas, configuração, regras e produto,
desde que cada recomendação seja fundamentada e preserve explicitamente os
invariantes que não deveriam ser sacrificados.

Processos previamente aprovados não são imunes à auditoria.

Você pode concluir que algo aprovado anteriormente deveria ser simplificado,
separado, combinado, redesenhado ou substituído.

Você não pode, nesta fase, implementar essas conclusões.

## Espírito da investigação

O trabalho deve unir as perspectivas de:

- engenheiro de software sênior;
- arquiteto de aplicações;
- especialista PostgreSQL/Supabase;
- revisor de segurança e autorização;
- engenheiro de confiabilidade;
- especialista em QA;
- designer de produto;
- especialista em Fluent UI/Dynamics;
- pesquisador de experiência do usuário;
- redator de interfaces;
- operador que precisará manter o sistema;
- familiar responsável pela assistência;
- supervisora de equipe;
- profissional usando celular durante um plantão;
- administrador global da plataforma;
- e usuário comum que não conhece a arquitetura interna.

Nenhuma dessas perspectivas, isoladamente, é suficiente.

O produto deverá ser avaliado como um sistema sociotécnico completo: pessoas,
processos, código, dados, permissões, interface, documentos, mensagens,
integrações, erros, exceções, manutenção e operação precisam funcionar em
conjunto.

## Regra fundamental contra auditoria cega

Os exemplos fornecidos nesta ordem, no protocolo auxiliar, no baseline e na
conversa histórica são lentes de investigação.

Eles NÃO constituem uma lista exaustiva do que deve ser encontrado.

Não reduza sua investigação a confirmar ou refutar os assuntos mencionados nos
anexos.

A ausência de uma categoria, módulo, tela, risco ou hipótese nas instruções não
a
retira do escopo.

Você deve:

1. formular hipóteses próprias;
2. investigar relações não sugeridas;
3. procurar erros e oportunidades que ninguém mencionou;
4. questionar premissas do próprio produto quando houver motivo;
5. procurar funcionalidades que deveriam existir e não existem;
6. procurar funções existentes cuja própria existência ou desenho não faça mais
   sentido;
7. procurar incoerências transversais que não aparecem quando arquivos são
   revisados isoladamente;
8. procurar problemas raros, estados excepcionais e combinações de estados;
9. procurar detalhes pequenos que passam em testes funcionais e code reviews;
10. procurar oportunidades de simplificação, não apenas oportunidades de
    adicionar código.

Uma auditoria que apenas percorra o checklist fornecido e confirme os pontos
previamente sugeridos será considerada incompleta.

## Resultado desejado

Ao terminar esta fase, uma pessoa que nunca participou do desenvolvimento deve
conseguir compreender, pelos documentos produzidos:

- o que o sistema é atualmente;
- como sua arquitetura funciona de verdade;
- quais são suas fontes de verdade;
- como os principais dados percorrem as camadas;
- quais jornadas cada perfil possui;
- o que está correto;
- o que está inconsistente;
- o que está frágil;
- o que está incompleto;
- o que está excessivamente complexo;
- o que está tecnicamente correto mas humanamente ruim;
- o que parece visualmente correto mas possui comportamento inadequado;
- o que deveria ser reorganizado;
- o que pode ser legado;
- o que precisa ser configurável;
- o que falta;
- o que pode ser removido;
- o que deve ser preservado;
- quais riscos impedem produção;
- quais melhorias podem aguardar;
- quais hipóteses não puderam ser comprovadas;
- como cada conclusão foi obtida;
- onde está sua evidência;
- como verificar a correção posteriormente;
- e qual seria uma sequência racional de aperfeiçoamento.

## Fase atual: investigação, não implementação

Esta fase é estritamente diagnóstica.

NÃO:

- corrija código;
- refatore componentes;
- altere migrations;
- crie migrations corretivas;
- altere schema remoto;
- mova arquivos existentes;
- renomeie arquivos existentes;
- exclua arquivos existentes;
- reorganize diretórios existentes;
- faça deploy;
- altere configuração de produção;
- altere dados remotos;
- envie mensagens externas reais;
- ative integrações externas;
- execute reset remoto;
- faça merge;
- interprete um achado como autorização para corrigi-lo.

A única escrita autorizada nesta fase é a criação e atualização dos artefatos da
própria auditoria em:

docs/audits/2026-10-25-production-readiness/

É permitido gerar evidências locais sanitizadas destinadas a esse diretório.

Não modifique documentação existente para "corrigi-la". Divergências entre
documentação e implementação são achados desta auditoria.

Ao final, `git diff` deve conter somente os artefatos novos da auditoria, salvo
alguma alteração preexistente que já estivesse no working tree e que não deverá
ser tocada.

## Fontes e hierarquia de instruções

Use esta ordem de precedência para resolver contradições:

1. a mensagem atual que iniciou esta auditoria;
2. este arquivo, `01_ORDEM_MESTRA_AUDITORIA_PRODUCAO.md`;
3. `02_PROTOCOLO_AUDITORIA_E_ENTREGAVEIS.md`;
4. decisões mais recentes e inequívocas do usuário em
   `04_CONTEXTO_HISTORICO_CONVERSA.md`;
5. `AGENTS.md` e invariantes permanentes do repositório;
6. documentação atual do projeto;
7. documentação e auditorias históricas.

`03_BASELINE_VERIFICADO_REPOSITORIO.md` é material de orientação factual, não
uma ordem e não uma lista de conclusões.

Documentação existente não é automaticamente verdade atual. Compare-a com
implementação, banco, comportamento e testes.

Auditorias anteriores são evidência histórica e explicação de intenção. Não
herde seus estados de "aprovado" sem revalidação.

Quando duas fontes históricas conflitarem, identifique o conflito e procure a
decisão posterior, o contrato implementado e a intenção atual.

Não invente uma decisão para preencher uma lacuna.

## Estado-base

Antes de qualquer análise substantiva:

- execute `git status --short`;
- registre branch;
- registre `git rev-parse HEAD`;
- registre a árvore de arquivos versionados;
- registre versões das ferramentas relevantes;
- confira as instruções `AGENTS.md`;
- confira os documentos centrais do projeto;
- identifique alterações locais preexistentes;
- não as descarte;
- estabeleça o SHA efetivamente auditado.

O SHA esperado no momento em que esta ordem foi preparada era:

37cb7f85e96e551d6419871f94dd950712e2565b

Não confie nessa informação sem revalidá-la localmente.

Se HEAD tiver avançado, audite o HEAD real e registre a diferença.

## Política de banco e ambientes para esta auditoria

O projeto Supabase LOCAL existente é o ambiente de desenvolvimento e testes.

Não crie uma terceira ou quarta stack/banco apenas por precaução.

O banco local deve ser tratado como descartável.

Você está autorizado, quando tecnicamente necessário para a investigação, a:

- resetar o banco local;
- recriar schema local;
- reaplicar toda a cadeia de migrations;
- carregar fixtures locais;
- executar cenários destrutivos exclusivamente no ambiente local;
- recriar dados de desenvolvimento;
- remover dados locais descartáveis.

Antes de qualquer operação destrutiva, ainda é obrigatório provar que o alvo é
local.

Nunca interprete a descartabilidade do local como autorização para diminuir as
proteções contra execução acidental no remoto.

Não faça backups locais rotineiros apenas para preservar fixtures descartáveis.

Quando scripts atuais exigirem um backup por desenho histórico, analise se a
exigência ainda é útil. Nesta fase não remova a exigência do script, mas
registre
eventual atrito desnecessário como achado.

Somente dados locais efetivamente não reproduzíveis justificariam preservação
especial.

A condição desejada para os ambientes de desenvolvimento/homologação é conseguir
recriar deterministicamente, quando necessário:

- catálogo relevante;
- administrador global;
- contas/perfis de teste;
- vínculos e fixtures necessários aos cenários.

O banco remoto não deve sofrer qualquer mutação durante esta auditoria.

A futura entrada em produção partirá de estado deliberadamente limpo. Portanto,
não projete a estratégia de produção como se todo o histórico atual de testes
precisasse ser migrado e preservado.

A auditoria deverá, entretanto, planejar corretamente o bootstrap de produção,
considerando não apenas tabelas PostgreSQL, mas também quando aplicável:

- Supabase Auth;
- identidades;
- vínculos;
- Storage;
- objetos;
- referências;
- segredos;
- configurações;
- destinatários;
- integrações;
- workers;
- catálogo inicial;
- administrador global;
- contas de homologação;
- políticas;
- e qualquer estado necessário fora das tabelas de negócio.

## Cobertura integral significa cobertura verificável

Não declare "revisei o repositório inteiro" de forma genérica.

Construa um inventário a partir dos arquivos versionados, preferencialmente
`git ls-files`, e reconcilie esse inventário com `COVERAGE.csv`.

Cada artefato versionado deve receber uma classificação e um modo de revisão
apropriado.

Exemplos de classes:

- SOURCE;
- ROUTE_API;
- DATABASE_MIGRATION;
- TEST;
- SCRIPT;
- CONFIG_CI;
- DOCUMENTATION_CURRENT;
- DOCUMENTATION_HISTORICAL;
- ASSET;
- GENERATED_OR_LOCK;
- OTHER.

Exemplos de métodos:

- SEMANTIC_FULL;
- STRUCTURAL;
- RUNTIME_VALIDATED;
- VISUAL_VALIDATED;
- AUTOMATED_ASSISTED;
- PARTIAL;
- BLOCKED;
- NOT_APPLICABLE.

Exemplos de estados finais:

- REVIEWED;
- PARTIAL;
- NOT_VERIFIED;
- EXCLUDED_JUSTIFIED.

Arquivos semanticamente relevantes — código, migrations, scripts, configuração,
testes e documentação — devem receber leitura compatível com seu conteúdo.

"Arquivo por arquivo e linha por linha" significa que conteúdo semanticamente
relevante não pode ser pulado por conveniência.

Não finja, entretanto, que revisar `package-lock.json` linha a linha possui o
mesmo significado de revisar uma função de autorização. Lockfiles, binários,
assets e gerados devem receber inspeção apropriada à sua natureza.

Ferramentas automáticas de busca, AST, imports, lint, testes, grep, contagem,
scripts e consultas são auxiliares.

Elas NÃO substituem interpretação semântica.

Nenhum arquivo relevante deve desaparecer da cobertura apenas porque não
produziu um match em uma busca.

## Reconstrua o sistema antes de julgá-lo

Comece formando um modelo mental verificável do produto.

Mapeie, entre outros elementos que descobrir:

- páginas e rotas;
- shells;
- navegação;
- componentes;
- formulários;
- APIs;
- server actions, quando existentes;
- bibliotecas de domínio;
- validação;
- schemas;
- migrations;
- tabelas;
- views;
- functions/RPCs;
- triggers;
- RLS;
- grants;
- roles;
- workers;
- cron/agendamentos;
- outbox;
- notificações;
- PDFs;
- anexos;
- Storage;
- Auth;
- integrações;
- scripts operacionais;
- seeds;
- fixtures;
- CI;
- testes;
- docs;
- observabilidade;
- e relacionamentos entre esses elementos.

Não trate o mapa de diretórios como arquitetura.

Reconstrua responsabilidades reais e fluxo real dos dados.

## Auditoria transversal

Para jornadas e ações importantes, rastreie a cadeia completa quando aplicável:

persona/objetivo
→ rota/tela
→ componente/controle
→ estado do frontend
→ validação
→ API/server boundary
→ lógica de domínio
→ banco/RPC
→ autorização
→ RLS/grants/SECURITY DEFINER
→ transação/concorrência
→ evento/outbox/notificação
→ documento/PDF/histórico
→ observabilidade
→ testes
→ recuperação de falha.

Não aprove uma ação simplesmente porque sua UI funciona.

Não aprove um endpoint simplesmente porque seu teste HTTP passa.

Não aprove uma RPC simplesmente porque sua implementação SQL parece correta.

O comportamento precisa ser coerente entre camadas.

## Auditoria humana e de produto

Observe o produto como ele será usado.

Pelo menos estes contextos precisam integrar sua investigação, sem limitar a
ela:

- familiar/gestor;
- supervisora;
- profissional operacional;
- administrador local;
- administrador global;
- usuário com pouca familiaridade tecnológica;
- usuário móvel durante um plantão;
- primeiro acesso;
- usuário recorrente;
- usuário retomando uma atividade interrompida.

Pense em situações como:

- pressa;
- interrupção;
- mão única/celular;
- internet lenta;
- perda temporária de conexão;
- toque duplo;
- back do navegador;
- refresh;
- retomada;
- duas pessoas atuando simultaneamente;
- dado que ficou stale;
- registro incorreto;
- necessidade de corrigir um fato;
- ausência de dados;
- dados parciais;
- permissão insuficiente;
- recurso inativo;
- integração externa indisponível;
- resposta do servidor perdida;
- operação que foi persistida mas o cliente não recebeu confirmação;
- conflito entre plantões;
- troca de profissional;
- alteração posterior do estoque;
- e outros cenários que você próprio deverá formular.

Não limite o produto aos happy paths.

## Auditoria de UX/UI

Esta dimensão é central, não cosmética.

Execute o sistema localmente quando isso agregar evidência.

Inspecione as páginas relevantes renderizadas, em vez de inferir toda a
experiência apenas por JSX/CSS.

Avalie a experiência completa e também suas minúcias.

Entre outras coisas que você próprio deverá expandir, procure:

- hierarquia da informação;
- prioridade das ações;
- local dos botões;
- ação primária correta;
- ações perigosas;
- ações redundantes;
- ações escondidas;
- ícones;
- títulos;
- subtítulos;
- labels;
- descrições;
- helper text;
- placeholders;
- tooltips quando realmente necessários;
- cards;
- agrupamentos;
- divisores;
- espaçamento;
- alinhamento;
- largura;
- densidade;
- tamanho de alvos de toque;
- tabelas;
- listas;
- timelines;
- menus;
- tabs;
- drawers;
- dialogs;
- painéis;
- wizards;
- navegação;
- breadcrumbs quando pertinentes;
- histórico;
- filtros;
- ordenação;
- busca;
- paginação;
- confirmação;
- estado vazio;
- estado parcial;
- carregamento;
- carregamento incremental;
- ação pendente;
- sucesso;
- aviso;
- erro;
- retry;
- conflito;
- desabilitado;
- offline/degradação;
- acessibilidade;
- foco;
- teclado;
- leitor de tela;
- contraste;
- movimento reduzido;
- responsividade;
- e coerência entre áreas.

Não conclua que um componente deve ser Fluent apenas porque existe uma versão
Fluent.

Também não preserve um componente legado apenas porque ele funciona.

Determine qual representação oferece melhor consistência, semântica,
acessibilidade, manutenção e ergonomia.

A linguagem visual-alvo é Fluent/Dynamics, preservando adaptações próprias
justificadas para operação móvel.

Procure especificamente pela sensação de "duas aplicações misturadas", mas não
presuma previamente onde ela existe.

Diferencie:

- coexistência intencional;
- adaptação responsiva intencional;
- compatibilidade transitória;
- inconsistência visual real;
- inconsistência comportamental;
- dívida técnica invisível ao usuário.

## Formulários e semântica de controles

Não avalie somente se um campo aceita um valor.

Pergunte se o campo deveria existir naquela forma.

Investigue onde a natureza do dado sugere:

- texto livre;
- autocomplete;
- combobox;
- select;
- conjunto de opções;
- radio;
- checkbox;
- switch;
- date/time picker;
- quantidade;
- unidade;
- tag;
- lista configurável;
- ou outro padrão.

Não transforme tudo em dropdown.

Verifique cardinalidade, frequência de mudança, possibilidade de novos valores,
necessidade de configuração administrativa, impacto no banco e ergonomia.

Diferencie cuidadosamente:

- selecionar um valor dentro de um formulário;
- confirmar uma condição;
- habilitar uma preferência imediatamente.

Checkbox e switch não são intercambiáveis apenas por estética.

Procure oportunidades de reduzir digitação repetitiva, erros ortográficos e
vocabulário inconsistente.

## Linguagem humana e microcopy

Faça uma auditoria sistemática da linguagem exibida ao usuário.

Não aceite automaticamente nomes vindos de:

- colunas;
- enums;
- status;
- funções;
- endpoints;
- nomes internos;
- termos escolhidos durante desenvolvimento;
- traduções literais;
- nomenclatura de IA.

Pergunte:

"Uma pessoa que não conhece o banco entenderia isso?"

"Esse termo descreve a coisa pelo significado operacional ou pelo nome técnico?"

"Este texto explica suficientemente a consequência?"

"Uma explicação curta abaixo do campo reduziria erro?"

"Este título deveria dizer o que o usuário fará, e não o nome da entidade?"

"Este erro orienta a recuperação?"

"Este sucesso deixa claro o que foi efetivamente confirmado?"

Diferencie mensagem técnica de mensagem operacional.

Erros apresentados ao usuário devem, quando possível:

1. explicar o que aconteceu;
2. preservar privacidade e segurança;
3. dizer o que a pessoa pode fazer em seguida;
4. distinguir falha temporária, conflito e rejeição definitiva.

Audite também consistência terminológica: a mesma coisa não deveria receber
nomes diferentes em áreas diferentes sem motivo.

Produza um inventário das principais mudanças de nomenclatura sugeridas.

## Funcionalidades ausentes e oportunidades de produto

Não considere o trabalho concluído quando os recursos existentes estiverem
revisados.

Pergunte também:

"Que problema real ainda não possui uma boa ferramenta?"

"Que informação o sistema já possui mas não apresenta no momento adequado?"

"Que ação obriga o usuário a navegar desnecessariamente?"

"Que configuração deveria existir para não depender de alteração de código?"

"Que resumo permitiria tomar uma decisão mais rapidamente?"

"Que relação entre dados está sendo desperdiçada?"

"Que automação segura poderia eliminar trabalho manual?"

"Que recurso parece ter sido planejado pela arquitetura mas nunca se tornou
experiência completa?"

"Que recurso existe tecnicamente mas está praticamente invisível?"

"Que processo poderia ser simplificado ou eliminado?"

"Que tela deveria existir?"

"Que tela talvez não devesse existir?"

Não recomende funcionalidade apenas porque seria interessante.

Associe toda oportunidade relevante a:

- problema humano;
- cenário;
- pessoa afetada;
- frequência;
- workaround atual;
- valor;
- custo/complexidade;
- dependências;
- riscos;
- e alternativa mais simples.

## Arquitetura e backend

Avalie criticamente:

- responsabilidades;
- limites de módulos;
- acoplamento;
- coesão;
- duplicação;
- lógica espalhada;
- lógica no lugar errado;
- abstrações prematuras;
- abstrações sem consumidor;
- funções gigantes;
- contratos;
- validações;
- serialização;
- tratamento de erros;
- idempotência;
- retries;
- concorrência;
- atomicidade;
- stale state;
- expected versions;
- transações;
- compensações;
- side effects;
- segurança de falhas;
- caminhos excepcionais;
- caching;
- consultas repetidas;
- responsabilidade entre cliente/servidor/banco;
- estabilidade de URLs;
- e manutenção futura.

Procure bugs reais e também estruturas que tornam futuros bugs mais prováveis.

## Banco de dados

Examine a cadeia cumulativa das migrations e o schema resultante.

Não avalie apenas a migration mais recente.

Quando seguro, reconstrua o banco local do zero e valide a instalação limpa.

Avalie, conforme aplicável:

- tabelas;
- colunas;
- tipos;
- nulabilidade;
- defaults;
- constraints;
- foreign keys;
- composite keys;
- uniqueness;
- índices;
- enums/status;
- JSON/JSONB;
- normalização;
- desnormalização deliberada;
- snapshots;
- histórico;
- temporalidade;
- ledger;
- auditoria;
- soft deletion/inativação;
- relações multipaciente;
- dados derivados;
- ownership;
- duplicidades semânticas;
- fontes de verdade;
- triggers;
- functions;
- RPCs;
- locks;
- idempotência;
- search_path;
- extensões;
- privilégios;
- e evolução futura.

Procure tanto:

- colunas que faltam;
- colunas que sobraram;
- colunas que deveriam ser separadas;
- estruturas que deveriam virar tabelas;
- tabelas que talvez não precisassem existir;
- atributos duplicados;
- estados impossíveis;
- e inconsistências entre contrato TypeScript/API/DB.

Não normalize por dogma.

Não desnormalize por conveniência.

Justifique pela semântica e pelos padrões de acesso.

## Segurança e autorização

Audite como sistema único:

- Supabase Auth;
- sessão;
- identidade global;
- vínculo por paciente;
- papel/capacidade;
- API;
- RLS;
- grants;
- SECURITY DEFINER;
- search_path;
- service role;
- funções privadas;
- Storage;
- arquivos;
- URLs públicas;
- webhooks;
- workers;
- segredos;
- logs;
- payloads;
- e UI.

Teste mental e tecnicamente mudanças de contexto e tentativa de cruzar
pacientes.

Procure autoridade indevidamente confiada ao cliente.

Procure endpoints cuja segurança aparente dependa apenas da UI.

Procure RLS que permita acesso mais amplo do que a API pretende.

Procure função privilegiada sem revalidação adequada.

Procure caminhos em que o service role transforme uma regra de aplicação em
apenas convenção.

Não confunda "não há botão" com "não há permissão".

## Testes e qualidade

Execute os checks existentes que forem seguros e úteis.

Registre exatamente:

- comando;
- ambiente;
- momento;
- resultado;
- evidência;
- limitações.

CI verde não constitui prova geral de produto pronto.

Audite também os próprios testes.

Pergunte:

- o teste afirma comportamento importante ou apenas implementação?
- há falso conforto?
- cenários excepcionais estão ausentes?
- existem testes que passam mesmo com UX ruim?
- existe código sem contrato testado?
- existem regras críticas cobertas apenas por mocks?
- concorrência real é exercitada quando necessária?
- RLS é testada com identidade real?
- regressões visuais relevantes são detectáveis?
- responsividade é realmente verificada?
- erros e estados vazios são testados?
- acessibilidade está presente apenas no happy path?

Não diminua regras ou remova testes para conseguir verde.

## Exploração visual

Além dos E2E existentes, faça inspeção exploratória deliberada.

Use viewports representativos, por exemplo:

- 320 px;
- ~390/412 px;
- ~768 px;
- ~1280/1440 px;
- ~1920 px,

ajustando quando outra largura revelar comportamento relevante.

Não é obrigatório testar cada pixel.

É obrigatório compreender as transições responsivas importantes.

Registre capturas intencionais quando servirem como evidência, não apenas
screenshots de falha.

Associe capturas ao manifesto de evidências.

Não coloque dados pessoais ou segredos nos artefatos.

## Integrações e degradação segura

Integrações externas não precisam necessariamente estar homologadas para que a
operação interna inicial seja possível.

Mas uma integração indisponível não pode criar falsa sensação de conclusão.

Para cada integração relevante, descubra:

- o que já funciona;
- o que depende de credencial/provedor;
- o que não foi homologado;
- como a falha aparece;
- o que é persistido antes dela;
- se há retry;
- se há idempotência;
- se há estado incerto;
- quem percebe a falha;
- qual é a alternativa operacional;
- e se essa alternativa é segura.

Classifique claramente:

"operação interna pode prosseguir com contingência"

versus

"dependência externa bloqueia uso".

## Performance e confiabilidade

Não faça micro-otimização especulativa.

Procure evidências de:

- N+1;
- consultas repetitivas;
- payloads excessivos;
- serialização desnecessária;
- componentes excessivamente grandes;
- re-renderizações problemáticas;
- bundles evitáveis;
- operações bloqueantes;
- loops;
- falta de paginação;
- índices ausentes;
- queries perigosas;
- polling desnecessário;
- corrida;
- retry storm;
- duplicação de trabalho;
- timeouts;
- ausência de backpressure;
- e pontos únicos de falha.

Diferencie problema medido de risco inferido.

## Observabilidade e operação

Pergunte como um operador perceberia:

- erro;
- job parado;
- mensagem não entregue;
- worker atrasado;
- conflito;
- usuário sem autorização;
- inconsistência;
- processamento parcialmente concluído;
- erro repetitivo;
- problema de integração;
- e degradação.

Avalie logs, correlação, eventos, métricas disponíveis, auditoria de negócio,
privacidade e capacidade de diagnóstico.

Não proponha logging de dados sensíveis apenas para facilitar debugging.

## Organização do repositório

Esta fase deve AUDITAR a organização, não alterá-la.

Para qualquer candidato a reorganização, classifique como:

- KEEP;
- MOVE;
- RENAME;
- MERGE;
- ARCHIVE;
- DELETE_CANDIDATE;
- GENERATED_IGNORE.

Antes de considerar DELETE_CANDIDATE, procure:

- imports diretos;
- imports dinâmicos;
- referências textuais;
- scripts;
- configuração;
- testes;
- migrations;
- funções do banco;
- URLs persistidas;
- links históricos;
- geração dinâmica;
- compatibilidade;
- documentação;
- deploy;
- CI;
- mecanismos de fallback;
- e uso operacional.

Ausência de import TypeScript não prova ausência de consumidor.

Para cada mudança estrutural proposta, registre:

- situação atual;
- destino pretendido;
- motivo;
- consumidores;
- dependências;
- risco;
- impacto de histórico/compatibilidade;
- e verificação que deverá acompanhar a mudança.

Produza também uma árvore-alvo recomendada para o repositório.

Não a execute nesta fase.

## Documentação

Classifique os documentos existentes por finalidade:

- fonte de verdade atual;
- referência técnica atual;
- procedimento operacional atual;
- decisão histórica;
- auditoria histórica;
- evidência de execução;
- documentação desatualizada;
- duplicação;
- candidato a consolidação;
- candidato a arquivo histórico.

Não apague documentação antiga simplesmente porque contém números antigos.

Histórico pode ser importante para explicar por que a arquitetura existe.

Separe "desatualizado e perigoso" de "histórico legítimo".

Investigue se alguém novo conseguiria descobrir:

- como executar;
- como testar;
- como desenvolver;
- como operar;
- quais regras são críticas;
- quais docs são atuais;
- quais docs são históricas;
- e onde registrar futuras decisões.

## Bootstrap e futuro reset para produção

Produza um plano diagnóstico de como o produto deveria chegar a um ambiente
limpo de produção.

Não execute o reset.

O plano deverá distinguir:

- schema/migrations;
- configurações permanentes;
- catálogo;
- paciente inicial;
- administrador global;
- contas de homologação;
- Auth;
- vínculos;
- Storage;
- objetos necessários;
- templates;
- integrações;
- segredos;
- workers/jobs;
- políticas;
- dados de negócio que NÃO devem ser transportados;
- e fixtures que devem existir somente em desenvolvimento.

A meta é reprodutibilidade, não preservação indiscriminada do banco atual.

## Classificação obrigatória das conclusões

Não coloque tudo sob o rótulo "problema".

Cada registro deve indicar a natureza predominante:

- DEFECT_CONFIRMED
- RISK_SUPPORTED
- EXPERIENCE_INCONSISTENCY
- PRODUCT_OPPORTUNITY
- ARCHITECTURE_DEBT
- DOCUMENTATION_DRIFT
- REPOSITORY_HYGIENE
- TEST_GAP
- OBSERVABILITY_GAP
- EXTERNAL_DEPENDENCY
- OPEN_QUESTION

Outras categorias podem ser introduzidas quando melhorarem a análise.

Diferencie claramente:

FATO OBSERVADO
de
INFERÊNCIA
de
HIPÓTESE
de
RECOMENDAÇÃO.

## Prioridade

Utilize como referência:

P0 — bloqueador

Risco intolerável de segurança, autorização, integridade, corrupção, perda
relevante, vazamento ou falha de operação essencial.

P1 — alta

Problema importante em jornada ou contrato crítico que deveria ser resolvido
antes do uso real e não possui mitigação operacional satisfatória.

P2 — média

Problema relevante, mas compatível com operação inicial controlada quando existe
workaround seguro ou impacto limitado.

P3 — aperfeiçoamento

Refinamento, conveniência, limpeza, consistência, organização ou evolução que
não
bloqueia a operação segura.

Prioridade não equivale a dificuldade.

Uma correção de texto pode ter impacto enorme.

Uma pequena mudança de banco pode ser tecnicamente delicada.

Registre impacto e esforço separadamente.

## Confiança

Registre também confiança:

CONFIRMED
STRONG
MODERATE
SPECULATIVE

Não aumente prioridade apenas por incerteza.

Uma hipótese especulativa grave deve continuar explicitamente sendo uma hipótese
até que haja evidência.

## Contraditório obrigatório

Antes de consolidar qualquer:

- P0;
- P1;
- recomendação de mudança arquitetural relevante;
- recomendação destrutiva;
- remoção de arquivo/tabela/rota;
- mudança de contrato;
- grande redesenho de jornada,

tente refutar sua própria conclusão.

Pergunte:

- que evidência mostraria que estou errado?
- existe consumidor escondido?
- existe contrato histórico?
- existe requisito de compatibilidade?
- existe cenário que justifica a complexidade?
- estou confundindo preferência estética com problema?
- estou ignorando uma regra de segurança?
- uma etapa aparentemente redundante protege alguma decisão crítica?
- estou atribuindo ao código um comportamento que não reproduzi?

Procure a contraprova.

Ao final, marque a conclusão como:

- CONFIRMED_AFTER_CHALLENGE;
- DOWNGRADED;
- WITHDRAWN;
- STILL_UNCERTAIN.

Não maximize a quantidade de achados.

Maximize a confiabilidade dos achados.

## Estrutura obrigatória de cada achado relevante

Cada achado deve permitir decisão posterior sem reler o repositório do zero.

Inclua, quando aplicável:

- ID estável;
- título humano;
- natureza;
- domínio;
- prioridade;
- confiança;
- persona afetada;
- jornada;
- descrição;
- comportamento observado;
- comportamento esperado/ideal;
- cenário de reprodução;
- pré-condições;
- arquivos;
- linhas/faixas;
- rota;
- componente;
- endpoint;
- tabela;
- RPC;
- migration;
- evidência;
- origem da evidência;
- causa provável;
- consequência humana;
- consequência técnica;
- consequência operacional;
- segurança/integridade;
- propagação entre camadas;
- workaround existente;
- proposta principal;
- alternativas;
- benefício;
- trade-offs;
- invariantes a preservar;
- dependências;
- esforço aproximado;
- risco de regressão;
- critério de aceite;
- teste/regressão recomendado;
- necessidade de decisão humana;
- estado do contraditório.

Não invente campos não aplicáveis apenas para preencher formulário.

## Evidência

Uma conclusão técnica deve apontar para evidência verificável.

Utilize, conforme o caso:

- arquivo e linha;
- comando;
- teste;
- SQL;
- resposta sanitizada;
- screenshot;
- estado renderizado;
- comportamento reproduzível;
- documentação;
- histórico;
- diff;
- dependência;
- configuração.

Não inclua segredo, token, cookie, credencial ou dado pessoal.

Ausência de evidência não é evidência de ausência.

Quando algo não puder ser verificado, escreva NOT_VERIFIED.

## Documentos obrigatórios da auditoria

Crie:

docs/audits/2026-10-25-production-readiness/

Dentro desse diretório, produza documentação equivalente às responsabilidades a
seguir.

README.md

Índice da auditoria, SHA base, status, artefatos, convenções e instruções para
navegação.

EXECUTIVE_READINESS.md

Síntese executiva:

- estado geral;
- recomendação GO / CONDITIONAL GO / NO-GO;
- P0/P1;
- principais riscos;
- principais oportunidades humanas;
- dependências externas;
- o que precisa acontecer antes da operação real.

METHOD_AND_EVIDENCE.md

Registre:

- método;
- fases efetivamente executadas;
- comandos;
- ferramentas;
- ambientes;
- resets;
- testes;
- inspeções visuais;
- limitações;
- critérios de evidência;
- divergências entre planejado e executado.

REPOSITORY_AND_ARCHITECTURE_MAP.md

Mapa da arquitetura real e fluxo entre frontend/backend/banco/serviços,
independentemente de como os diretórios foram nomeados.

COVERAGE.csv

Uma linha para cada artefato versionado do inventário.

Colunas mínimas:
path,
artifact_type,
responsibility,
review_method,
review_status,
runtime_checked,
visual_checked,
related_journeys,
related_findings,
evidence,
notes.

COVERAGE_SUMMARY.md

Resumo de cobertura, contagens reconciliadas, lacunas, exclusões justificadas e
qualquer parte que não possa ser honestamente classificada como revisada.

FINDINGS_MASTER.csv

Registro estruturado para classificação, priorização e futura automação.

FINDINGS_MASTER.md

Versão humana completa dos achados e suas evidências.

ARCHITECTURE_AND_BACKEND.md

Diagnóstico técnico e arquitetura-alvo proposta quando pertinente.

DATABASE_AUTH_SECURITY.md

Modelagem, migrations, integridade, concorrência, autorização, RLS, grants,
Auth, Storage e segurança.

UI_UX_DESIGN_SYSTEM.md

Auditoria visual e comportamental profunda, incluindo Fluent/Dynamics,
responsividade, estados, componentes, ícones, layout, acessibilidade e
consistência.

JOURNEYS_AND_INFORMATION_ARCHITECTURE.md

Mapas de jornadas atuais, atritos, caminhos redundantes, gaps, estados
excepcionais, diferenças por perfil e jornadas-alvo propostas.

MICROCOPY_TERMINOLOGY_AND_FORMS.md

Inventário de linguagem, rótulos, mensagens, status, campos, helper texts,
semântica de controles e propostas de humanização/padronização.

PRODUCT_GAPS_AND_CONFIGURATION.md

Ferramentas faltantes, oportunidades, configurações ausentes, funcionalidades
subutilizadas e simplificações.

AUTOMATION_INTEGRATIONS_RELIABILITY.md

Workers, jobs, mensagens, outbox, notificações, webhooks, integrações,
idempotência, retry, contingência e degradação.

TESTING_PERFORMANCE_OBSERVABILITY.md

Qualidade da suíte, lacunas, desempenho, instrumentação e capacidade de
diagnóstico operacional.

REPOSITORY_HYGIENE_AND_DOCUMENTATION.md

Mapa KEEP/MOVE/RENAME/MERGE/ARCHIVE/DELETE_CANDIDATE, documentação atual versus
histórica e árvore-alvo.

DATABASE_RESET_SEED_AND_GO_LIVE.md

Plano futuro para ambiente limpo de produção e estratégia de reset/reseed local.

HOMOLOGATION_AND_ACCEPTANCE.md

Matriz verificável do que deve ser homologado antes de produção e do que pode
ser homologado posteriormente.

EXECUTION_ROADMAP.md

Plano posterior de correções em lotes coerentes, dependências e critérios de
saída.

Não implemente o roadmap.

PHASE_B_HANDOFF.md

Recomende quais auditorias especializadas devem acontecer depois desta visão
holística, baseando-se NOS ACHADOS REAIS, não apenas nas categorias sugeridas
antes de começar.

CHECKPOINT.md

Estado final desta execução:

- SHA;
- cobertura;
- documentos;
- números de achados;
- P0/P1;
- verificações executadas;
- verificações pendentes;
- perguntas;
- decisões necessárias;
- próximo ponto de retomada.

evidence/MANIFEST.csv

Índice de screenshots, logs sanitizados ou outros artefatos gerados.

## Qualidade da documentação

Não produza frases vazias como:

"melhorar a responsividade"
"melhorar a UX"
"refatorar backend"
"adicionar mais testes"
"padronizar componentes"

sem especificar evidência, localização, problema e resultado desejado.

A documentação deverá ser útil para execução posterior.

Evite também inflar relatórios com repetição.

Quando o mesmo problema sistêmico explicar vinte ocorrências, documente a causa
sistêmica e vincule as ocorrências, em vez de fingir que são vinte descobertas
independentes.

## Cobertura de jornadas

Reconstrua as jornadas existentes a partir do sistema real.

Não confie apenas em nomes de arquivos ou em documentação antiga.

As categorias conhecidas de REQ, COM, ENT, BAL, estoque, escalas, administração,
histórico, notificações e perfil são pontos de partida, não definição completa
do produto.

Procure jornadas adicionais e relações entre elas.

Investigue também como uma jornada começa e termina.

Por exemplo:

- quem percebe que há algo a fazer?
- como chega à tela?
- sabe qual é a próxima ação?
- como confirma?
- o que acontece depois?
- quem é notificado?
- como o fato aparece no histórico?
- como um erro é corrigido?
- como se descobre posteriormente quem fez o quê?

## Critério especial de humanidade

Em cada área relevante pergunte:

"Uma pessoa mediana, sem conhecer o projeto e sem ter participado do
desenvolvimento, entende o que está vendo e o que deve fazer?"

Depois pergunte:

"Uma pessoa cansada, no celular e com pouco tempo entende?"

Depois:

"Uma pessoa que cometeu um erro consegue se recuperar?"

Depois:

"Uma pessoa que precisa descobrir seis meses depois o que aconteceu consegue
reconstruir os fatos?"

A resposta deve ser baseada no produto real, não em intenção presumida.

## Não confundir completude técnica com completude operacional

Uma tabela existente não significa recurso completo.

Um endpoint existente não significa jornada completa.

Um botão existente não significa affordance adequada.

Uma mensagem de sucesso não significa que a operação externa ocorreu.

Uma migration aplicada não significa modelagem ideal.

Uma CI verde não significa prontidão humana.

Um PDF gerado não significa documentação compreensível.

Um teste E2E não significa bom design.

Uma feature documentada não significa feature discoverable.

Uma função não utilizada não significa função removível.

## Critério de prontidão para a operação inicial

A operação interna poderá ser considerada candidata a produção mesmo com
integrações externas pendentes quando existir alternativa operacional segura e
claramente comunicada.

Não flexibilize:

- segurança;
- autorização;
- integridade;
- segregação entre pacientes;
- rastreabilidade essencial;
- capacidade de corrigir erros críticos;
- coerência de dados;
- ou confiabilidade de processos essenciais.

Diferencie:

"MVP operacional seguro"

de

"produto completamente evoluído".

O objetivo não é bloquear produção por perfeccionismo.

Também não é liberar produção porque os testes estão verdes.

## Condição de encerramento

Não finalize esta auditoria apenas porque já encontrou muitos problemas.

A Fase A está concluída somente quando, de forma honesta:

1. o HEAD auditado estiver registrado;
2. o inventário de arquivos estiver reconciliado;
3. cada artefato versionado possuir tratamento na cobertura;
4. os arquivos semanticamente relevantes tiverem recebido análise apropriada;
5. a arquitetura real estiver reconstruída;
6. as jornadas críticas tiverem rastreamento transversal;
7. a experiência renderizada tiver sido inspecionada onde tecnicamente possível;
8. os principais perfis e estados tiverem sido considerados;
9. banco, API, frontend e autorização tiverem sido confrontados;
10. testes existentes tiverem sido avaliados como testes, e não apenas
    executados;
11. hipóteses relevantes tiverem sido testadas;
12. P0/P1 e recomendações estruturais tiverem passado por contraditório;
13. incertezas estiverem explicitamente declaradas;
14. os documentos obrigatórios estiverem completos;
15. os documentos forem internamente consistentes;
16. nenhum achado importante depender apenas de opinião não identificada;
17. `git diff` mostrar somente os artefatos autorizados da auditoria, além de
    eventuais alterações preexistentes não tocadas;
18. e existir um handoff claro para a próxima fase.

Se algum item não puder ser cumprido, não finja conclusão.

Registre BLOCKED ou NOT_VERIFIED, explique exatamente por quê e continue com
tudo
o que for possível.

## Persistência

Não interrompa a investigação apenas porque uma primeira rodada de achados
parece
suficiente.

Após cada grande dimensão, pergunte:

"O que eu ainda não olhei?"

"Que premissa estou assumindo?"

"Que parte dessa jornada só aparece quando cruzo duas áreas?"

"Que evidência contraria minha leitura?"

"O que um code review convencional não observaria?"

"Que detalhe um usuário perceberia em cinco segundos e um engenheiro ignoraria?"

Use essas perguntas como mecanismo de segunda passagem.

## Comunicação durante a execução

Não solicite aprovação para pequenas decisões investigativas seguras.

Tome decisões reversíveis dentro dos limites desta ordem.

Não espere confirmação apenas para executar leitura, testes locais seguros,
inspeção visual ou documentação.

Pare e registre necessidade de decisão somente quando:

- uma ação necessária ultrapassar os limites autorizados;
- existir risco de atingir ambiente remoto;
- a conclusão depender de decisão de produto genuinamente não inferível;
- ou a evidência necessária for inacessível.

Mesmo nesses casos, continue todas as demais partes independentes da auditoria.

## Resposta final desta execução

Sua mensagem final deve ser curta em comparação com os documentos.

Ela deve informar:

- SHA auditado;
- estado do working tree;
- cobertura total e lacunas;
- testes/inspeções realmente executados;
- quantidade de achados por prioridade;
- quantidade por natureza;
- P0/P1;
- principais oportunidades de UX/produto;
- principais divergências entre documentação e implementação;
- principais candidatos de reorganização;
- status do plano de bootstrap;
- limitações;
- documentos criados;
- e recomendação para a Fase B.

Não substitua a documentação completa por uma longa mensagem no chat.

## Início obrigatório

Antes de formular conclusões:

1. leia integralmente esta ordem;
2. leia `02_PROTOCOLO_AUDITORIA_E_ENTREGAVEIS.md`;
3. leia o baseline;
4. leia a conversa histórica prestando atenção à cronologia das decisões;
5. leia `AGENTS.md`;
6. identifique as fontes de verdade atuais;
7. faça o preflight;
8. monte o inventário;
9. só então inicie a auditoria substantiva.

Ao final da leitura inicial, não produza uma resposta superficial listando o que
"pretende" fazer e aguardando aprovação.

Comece a executar a auditoria.

Esta ordem já constitui autorização para toda atividade investigativa local
descrita acima.
