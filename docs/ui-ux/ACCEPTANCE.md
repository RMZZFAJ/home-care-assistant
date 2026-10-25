# Matriz de homologação Fluent 2

Os resultados datados e links de execução estão em [EXECUTION.md](EXECUTION.md).
Esta matriz relaciona os critérios aprovados às verificações reproduzíveis.
O inventário cobre páginas e componentes indiretos; uma rota existente não
constitui evidência de persistência, autorização ou funcionamento visual.

| Critério | Verificação |
| --- | --- |
| Gestão e supervisão | Fluent: cinco perfis e tarefas reais |
| Menus e cinco destinos móveis | Fluent/A11y: teclado e capacidades |
| Troca de perfil e paciente | Context/Review: confirmação e isolamento |
| Perfil e autenticação | Login/Onboarding/Personal: recuperação e foto |
| Administração no celular | Admin/Fluent: catálogo, vínculos e unidades |
| Matrizes e autoridade | Review/Authority/BAL: conflitos e proibições |
| REQ mantém etapas e intenção | Workflows: emissão, recuperação e 5/10 |
| COM compra/doação | Workflows: recebimento e validação familiar |
| ENT e divergência | Workflows: 8/10 linhas, aceite e conciliação |
| Visualizador e URLs antigas | Fluent/Admin/Workflows: quatro tipos |
| Estoque real e estimativas | Fluent/Workflows: custódias e compensação |
| Histórico e pesquisa | Workflows/Fluent: período, tipo, página e URL |
| Avisos e sino | Review/Personal: silenciosas, paciente e atualização |
| Escalas sem check-in | Schedules: séries, proposta e sobreposição |
| BAL no plantão designado | BAL Auth/E2E: janela e duas etapas |
| Atraso e transferência | BAL Auth: relógio e histórico das atribuições |
| Família/supervisão avisadas | BAL Auth/Outbox: eventos deduplicados |
| Adiamento familiar | BAL Auth/E2E: pendência não suspende o prazo |
| Regularização histórica | BAL Auth: data real e documento único |
| Referência e autoria real | BAL Auth/E2E/PDF: reconto e revisão distinta |
| BAL idempotente | Balance idempotency: criação/revisão/envio concorrentes |
| Rotação do scheduler | SQL fairness: 101 regimes e cursor privado |
| Preservação e migrations | Backup, clean/legacy, contratos e SQL/RLS |
| Anexos, scanner e consumo | Workflows/Fluent: revisão e estoque |
| Acessibilidade | Axe WCAG 2/2.1/2.2 AA, teclado, foco e toque |
| Responsividade | A11y/BAL: sem overflow e com navegação alcançável |

Identificadores correspondem aos arquivos em tests/e2e e tests/integration:
Fluent = fluent-experience; A11y = accessibility; Context = auth-context;
Review = v4-review; Admin = administration; Personal = personal-workspace;
Authority = fluent-authority; BAL = balance-shifts. Login, Onboarding,
Schedules e Workflows usam seus próprios nomes. SQL fica em tests/database.

## Inspeção visual

Referências em references foram comparadas às capturas reais em
output/playwright/fluent. Todas as capturas dessa suíte usam dados fictícios.
Gestão mantém cabeçalho, lateral agrupada, comandos, listas e edição contextual.
Operação mantém tarefas pessoais, ações proporcionais e navegação inferior.
Documentos, matrizes, histórico, estoque, agenda e BAL compartilham a fundação
Fluent, preservando os significados de cada estado e operação.

Seleção das capturas inspecionadas, com datas no
[manifesto](evidence/2026-10-25/manifest.json):

| Área | Evidência |
| --- | --- |
| Gestão e supervisão | [Desktop](evidence/2026-10-25/dashboard-adminA-desktop-chromium.png), [mobile](evidence/2026-10-25/dashboard-supervisor-mobile-ios.png) |
| Catálogo e perfil | [Editor](evidence/2026-10-25/catalogo-edicao-ios.png), [perfil](evidence/2026-10-25/perfil-ios.png) |
| Matrizes | [Permissões](evidence/2026-10-25/permissoes-matriz-ios.png), [avisos](evidence/2026-10-25/notificacoes-matriz-ios.png) |
| Documentos | [ENT desktop](evidence/2026-10-25/documento-ent-desktop-ios.png), [REQ mobile](evidence/2026-10-25/documento-req-mobile-ios.png) |
| Histórico e estoque | [Filtros](evidence/2026-10-25/historico-filtros-mobile-ios.png), [custódias](evidence/2026-10-25/estoque-mobile-ios.png) |
| Escalas | [Agenda](evidence/2026-10-25/escalas-mobile-ios.png) |
| BAL | [Contagem](evidence/2026-10-25/bal-contagem-ios.png), [revisão](evidence/2026-10-25/bal-revisao-ios.png), [decisão familiar](evidence/2026-10-25/bal-adiamento-familiar-ios.png) |

Captura de página inteira pode posicionar barras fixas na altura do viewport
inicial. A validação de alcance dos controles usa geometria no navegador,
incluindo a barra inferior inteiramente visível e botões acima dela; o BAL
também conserva capturas separadas de topo e rodapé.

A contagem verifica larguras de 320, 360, 390, 428, 768, 1024, 1366 e 1920 px.
Os projetos completos utilizam Desktop Chrome, Pixel 7 e iPhone 13 em navegadores
reais automatizados. Emulação não constitui teste físico de câmera, teclado
virtual do aparelho ou leitura por uma pessoa com tecnologia assistiva.

## Fronteiras de homologação

OAuth Google, entrega SMTP, SMS, WhatsApp e Flows reais exigem evidência do
provedor. Transporte simulado e avisos disponíveis no aplicativo não representam
entrega Meta. Escalas e ciclos BAL usam os eventos configuráveis do aplicativo;
a matriz não oferece WhatsApp para eventos sem contrato externo preparado.

As contas de homologação existem no Auth remoto e têm vínculos próprios.
Credenciais ficam somente em `.private/homologacao/ACESSOS.md`, excluídas de
Git e upload da Vercel. O novo regime foi ativado apenas no paciente fictício
de validação. Os dados e regimes dos outros pacientes foram preservados.
