# UI, UX e sistema de design

SHA examinado: `37cb7f85e96e551d6419871f94dd950712e2565b`.
Fase A investigativa, atualização em 27/10/2026. Nenhuma correção foi
implementada.

A fundação Fluent está implementada e os fluxos principais preservam identidade,
paciente, capacidades e contratos documentais. A maior lacuna de experiência
encontrada é a revisão de decisões: uma proposta de alteração de plantão pode
ser
aprovada sem exibir quem ou qual período será alterado (UX-001). A existência de
um diálogo e de uma transação segura não resolve essa ausência de informação.

## Alcance e evidência

O escopo contém 113 artefatos: 112 arquivos textuais lidos semanticamente, mais
favicon ICO inspecionado estruturalmente. Inclui páginas/layouts/CSS fora de API
e callbacks Auth, todos os componentes e tema. O CSV individual registra método.
Os componentes Auth também foram examinados; a exclusão refere-se às rotas
`src/app/auth/**`, examinadas pela frente backend.

Os 38 artefatos de `docs/ui-ux/**` receberam método apropriado: documentos
normativos e de execução lidos, inventários gerados reconciliados
estruturalmente,
referências HTML examinadas como protótipos e 22 imagens históricas abertas
individualmente. Capturas históricas não são evidência de execução deste SHA.
Os HTMLs de referência não foram homologados funcionalmente nem tratados como
contrato de autorização.

A exploração local ocorreu em27/10/2026 no Chromium, com Auth e dados
sintéticos reais, origem127.0.0.1:3100 verificada e envio externo desativado.
Confirmou UX-001/002/003/004/012 e mediu14 dashboards prontos de6perfis.
Não houve overflow horizontal nesses dashboards, nas larguras examinadas.
Isso não declara contraste AA, foco perfeito ou todos os módulos verificados.
Detalhes e limites: [registro renderizado](evidence/UI_RUNTIME_REVIEW.md).

## Fundação preservável e limites

- **Tema e SSR**

  Evidência no código: `src/theme/providers.tsx`, `tokens.css`

  Avaliação: Provider Fluent real e registro de estilos; não é apenas imitação
  visual

- **Layout contextual**

  Evidência no código: `layout/workspace-context.tsx`, `workspace-shell.tsx`

  Avaliação: Contexto vem da API; alternância e shell próprios por atuação

- **Controles**

  Evidência no código: `ui/primitives.tsx`

  Avaliação: Badge, Dialog e ícones compartilhados; preservar nomes acessíveis
  e
  restauração de foco

- **Campos e edição**

  Evidência no código: `forms/record-drawer.tsx`, `settings-section.tsx`

  Avaliação: Edição contextual, confirmação de descarte e campos mantidos
  montados

- **Documento**

  Evidência no código: `documents/document-header.tsx`,
  `document-timeline.tsx`

  Avaliação: Identificação/estado/versão centralizados, detalhes progressivos

- **Compatibilidade**

  Evidência no código: `app/design-system.css:45`, `:48`, utilitários nos
  wizards

  Avaliação: Cores locais de seleção e regras globais aumentam custo de
  consistência (UX-008)

Caminhos de componentes nesta tabela são relativos a `src/components/`.
A inspeção encontrou padrões úteis, não motivo para reescrever a aplicação.
Controles nativos podem ser apropriados; adoção de Fluent não exige substituição
mecânica de cada elemento. CSS antigo na raiz também não prova cor final:
tokens e regras posteriores precisam ser considerados na cascata.

## Comparação com referências e Fluent/Dynamics

As referências internas adotam listas densas, comandos curtos, edição lateral,
matrizes e documento com próxima ação. A implementação preserva esse modelo
na gestão e acrescenta navegação operacional de cinco destinos. O protótipo
mobile antigo tinha quatro destinos e REQ simplificada: não deve sobrepor a
decisão posterior de cinco destinos e sete etapas.

A comparação com [princípios
Fluent](https://fluent2.microsoft.design/design-principles)
usa foco na tarefa, adaptação à plataforma e inclusão. A orientação de
[layout Fluent](https://fluent2.microsoft.design/layout) sustenta proximidade,
hierarquia e espaçamento consistente, sem exigir copiar identidade Microsoft.
Fontes consultadas em 27/10/2026. Dynamics é referência de organização
empresarial;
não foi obtido um conjunto específico de telas/versionamento de Dynamics para
afirmar conformidade pixel a pixel.

- **Hierarquia**

  O que se observa: Dashboard gerencial destaca decisões; documento usa
  grandes
  blocos antes de materiais

  Recomendação: Conservar foco em tarefa; medir tempo/rolagem até conteúdo
  essencial

- **Densidade**

  O que se observa: Mobile histórico tem cabeçalho documental extenso; tabelas
  administrativas rolam internamente

  Recomendação: Ajustar resumo e detalhes por tarefa, sem esconder informação
  que
  autoriza decisão

- **Seleção**

  O que se observa: Azul predomina no shell, verde suave ainda em opções REQ

  Recomendação: Unificar seleção sem confundí-la com sucesso

- **Texto**

  O que se observa: Mistura ações familiares com “transacional”, “custódia”,
  enums
  e JSON

  Recomendação: Vocabulário de domínio, detalhes técnicos sob demanda

- **Matrizes**

  O que se observa: Filtros e herança existem; canais usam ícones/tooltip

  Recomendação: Legenda legível por toque, nome acessível e indicação de
  salvamento

- **Feedback**

  O que se observa: Alguns módulos tratam estados completos; outros mostram
  vazio
  precoce

  Recomendação: Estado de leitura explícito e reutilizável (UX-004)

- **Confirmação**

  O que se observa: Diálogos existem, mas alguns resumos são genéricos

  Recomendação: Resumo de efeito concreto antes da confirmação (UX-001/005)

## Achados e decisão

- **UX-001**

  Prioridade: P1

  Tipo: Defeito confirmado em runtime

  Consequência: Aprovação de escala sem dados de decisão

- **UX-002**

  Prioridade: P2

  Tipo: Risco apoiado

  Consequência: Ciência automática de cabeçalho pode ser interpretada como
  conteúdo lido

- **UX-003**

  Prioridade: P2

  Tipo: Defeito confirmado em runtime

  Consequência: Upload incerto admite troca de arquivo sob a mesma tentativa

- **UX-004**

  Prioridade: P2

  Tipo: Defeito confirmado em runtime

  Consequência: Carregamento/erro confundidos com ausência

- **UX-005**

  Prioridade: P2

  Tipo: Inconsistência

  Consequência: Aprovação exige interpretar payload técnico

- **UX-006**

  Prioridade: P3

  Tipo: Inconsistência

  Consequência: Códigos, filtros e destinos de menu pouco claros

- **UX-007**

  Prioridade: P2

  Tipo: Risco apoiado

  Consequência: Expectativa de rascunho mais durável que a sessão da aba

- **UX-008**

  Prioridade: P3

  Tipo: Dívida

  Consequência: Decisões de apresentação distribuídas

- **UX-009**

  Prioridade: P3

  Tipo: Oportunidade

  Consequência: Versões podem explicar o que mudou

- **UX-010**

  Prioridade: P3

  Tipo: Higiene

  Consequência: Três componentes sem consumidor demonstrável

- **UX-011**

  Prioridade: P3

  Tipo: Documentação

  Consequência: Captura histórica de revisão BAL mostra etapa de contagem

- **UX-012**

  Prioridade: P2

  Tipo: Defeito confirmado em runtime

  Consequência: Acompanhamento inicial ignora configuração e degrada mensagem
  após
  prazo

Detalhes, alternativas, contraditório e critérios de aceite estão em
[evidence/findings-ui.json](evidence/findings-ui.json). P1 de UX-001 refere-se à
decisão operacional sem revisão satisfatória dentro do produto; não afirma
bypass de autorização, sobreposição permitida ou violação transacional.

## Estados e acessibilidade que ainda exigem render

- **320,390,768,1440,1920px**

  Método planejado: Geometria document/clientWidth, captura topo/rodapé,
  tabulação

  Estado atual: Dashboards medidos; outros módulos/rodapés pendentes.

- **Perfil profissional e supervisor**

  Método planejado: Cinco destinos, Mais, tarefa atribuída e recusa contextual

  Estado atual: Dashboard renderizado; demais percursos na matriz E2E.

- **Familiar/admin local/global/leitor**

  Método planejado: Comandos, menus, contexto e dados disponíveis

  Estado atual: Dashboard renderizado; demais percursos na matriz E2E.

- **Erro, vazio, pendente**

  Método planejado: Delay/500/200vazio e recuperação sem falsear sucesso

  Estado atual: UX-004 reproduzido em consumo com delay e500.

- **Diálogo/drawer**

  Método planejado: Tab, Shift+Tab, Escape, retorno de foco e descarte

  Estado atual: Tab contido e Escape fecha diálogo de escala; retorno de foco
  após animação não medido.

- **Alta densidade**

  Método planejado: Muitos itens, nomes longos, propostas e vínculos

  Estado atual: ENT14linhas e114pacientes globais vistos; matriz densa pendente.

- **Zoom/teclado virtual/tecnologia assistiva**

  Método planejado: Zoom200%, dispositivo real e leitor de tela

  Estado atual: Não verificado

- **Anexo/scanner**

  Método planejado: Foto, arquivo inválido, recusa de câmera e resposta
  perdida

  Estado atual: Resposta perdida de upload reproduzida; câmera real não
  verificada.

As imagens históricas de página inteira podem desenhar barra fixa no ponto de
captura: isso não comprova sobreposição em runtime. A imagem
`bal-revisao-ios.png` mostra Contagem/Etapa 1 e não comprova a etapa2 (UX-011).
Capturas de catálogo, matrizes, documentos, estoque, perfil, escalas e BAL são
úteis para compreender a evolução visual, não para encerrar a validação atual.

## Estrutura-alvo proporcional

Consolidar padrões já consumidos: estados de leitura, sumário de decisão,
campo de quantidade, seleção de produto, lista de alterações e detalhes
diagnósticos. Evitar um componente genérico sem consumidor real. Migrar um
fluxo por vez e comparar antes/depois em teclado e mobile.

Aceite global da evolução visual: pessoa compreende paciente, papel, próximo
passo e efeito antes da ação; erros oferecem recuperação; conteúdo relevante
não depende só de cor; carregamento não afirma ausência; saldo, previsão,
ciência, atendimento e conferência conservam significados distintos.
