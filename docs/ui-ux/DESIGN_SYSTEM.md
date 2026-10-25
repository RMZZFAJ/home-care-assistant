# Design system Fluent 2

## Fundação

Fluent UI React v9 e ícones oficiais são dependências exatas. O tema claro
usa azul empresarial, superfícies neutras e tipografia do sistema, com Segoe UI
quando disponível. Não há dependência de fonte externa para apresentar a tela.

ThemeProvider mantém um renderer por montagem/renderização e emite os estilos
Griffel uma única vez no head durante SSR. A suíte verifica o HTML sem
JavaScript e a navegação: cópias no corpo não podem sobrescrever regras de
estado e variante inseridas pelo renderer no head. Fronteiras client ficam nos componentes
interativos; o layout e as verificações de sessão permanecem no servidor.
Imports Fluent são otimizados pelo Next para carregar os módulos utilizados.

## Tokens e densidade

tokens.css centraliza cores, espaçamento e medidas. As classes legadas são
compatibilidade transitória durante a migração dos consumidores.

- Azul: ação principal e seleção, não indicação de sucesso.
- Verde: sucesso ou conclusão efetivamente confirmada.
- Âmbar: atenção, prazo ou pendência.
- Vermelho: falha, risco ou divergência efetiva.
- Cinza: informação secundária, previsão e estados neutros.
- Escala de espaço: 4, 8, 12, 16, 24 e 32 px.
- Campos gerenciais: 36 px; controles móveis: pelo menos 44 px.
- Texto em campos móveis: 16 px para leitura e edição confortáveis.

Cor deve acompanhar texto ou ícone. Estoque confirmado, trânsito e previsão
não compartilham uma representação que sugira disponibilidade equivalente.

## Controles compartilhados

Os componentes existentes StatusBadge, Dialog e StepNavigator agora consomem
Badge, Dialog e Button Fluent. Os ícones utilizam o conjunto oficial.
Dialog mantém foco, Escape e restauração de foco por meio do Fluent.
StepNavigator conserva a etapa atual visível e respeita movimento reduzido.

Ao migrar módulos, priorizar lista/grade, barra de comandos e edição contextual.
Campos de quantidade conservam strings decimais e a validação existente;
não substituir quantidades exatas por arredondamentos de ponto flutuante.

## Feedback e acessibilidade

Toda leitura possui carregamento, vazio, erro e tentativa novamente. Mutações
indicam processamento, conflito ou persistência confirmada. Comunicação externa
tem seu próprio estado; gravação não é entrega de mensagem.

Labels, foco visível, navegação por teclado, erros associados, leitura assistiva
e contraste são critérios de aceite. Painéis e diálogos precisam funcionar
com teclado e toque, sem cortes nem sobreposições em 320 a 1920 px.
