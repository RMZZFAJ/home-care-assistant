# Home Care Assistant — comando mestre de implementação do lote L3

**Referência aprovada:** `hca-laboratorio-03-v4-aprovado.html`  
**Escopo:** E07, E08 e E09 — estoque/movimentos/consumo, plantões/balanços e arquivos/verificação.  
**Data desta consolidação:** 22/11/2026, contexto de São Paulo.  
**Execução:** continuação da conversa e do checkout/branch local atuais do Codex.  
**Status:** autorizado para implementação conforme os limites desta ordem. Não produzir outro laboratório.

## 1. Meta e condição de conclusão

Entregar L3 **implementado no produto real**, com a aparência, a hierarquia, os componentes e as interações da v4 aprovada, integrado a L1 e L2. As quatro frentes são: consulta e movimentação de estoque; consumo e avisos de falta; plantões e balanços; arquivos e verificação pública.

A implementação precisa percorrer dados reais autorizados, preservar histórico, tratar concorrência e resultado incerto, e produzir cada efeito de estoque ou arquivo uma única vez. Interface, API, contratos, banco, permissões e recuperação fazem parte da mesma entrega. Telas estáticas, simulações no produto, flags locais de autorização, callbacks sem efeito persistido ou mudança apenas de nomenclatura não satisfazem a meta.

O refinamento visual é requisito de aceite. Reproduza proporções, densidade, espaços, tipografia, hierarquia, cores semânticas, ícones, menus, modais, painéis e transições da referência. Faça avaliação visual nas larguras de celular, dentro de um navegador de notebook. Preserve a responsividade existente; não transforme a aplicação inteira em uma moldura de telefone.

## 2. Autoridade das fontes e leitura obrigatória

Aplicar conjuntamente:

1. Esta ordem e a mensagem de interposição: decisões de produto, escopo, proteção de L1/L2, execução e critérios de conclusão.
2. `hca-laboratorio-03-v4-aprovado.html`: aparência e interação aprovadas de L3. A v4 já incorpora as decisões vigentes e os comentários recebidos. Não reaplicar versões antigas como instruções adicionais.
3. L1: `HCA_L1_LOTE_CODEX_E01_E03.md`, laboratório L1 v3 **corrigido pelos comentários v3** e os componentes compartilhados efetivamente implantados.
4. L2: `HCA_L2_COMANDO_MESTRE_CODEX_V7.md`, laboratório L2 v7 aprovado e sua implementação corrente.
5. `AGENTS.md`, `README`, `docs/README.md`, `TEMP_D_B_ATUALIZACAO.md`, `docs/ui-ux/CANONICAL_MODEL.md`, `docs/ui-ux/DESIGN_SYSTEM.md`, contratos atuais, registros de decisões, esquema e fontes relevantes do checkout.

A ordem atual substitui orientações anteriores **somente onde a alteração estiver expressa**. O código existente mostra o ponto de partida; ele não invalida mudanças de negócio já decididas aqui. O laboratório é executável de demonstração, não arquitetura de produção nem mecanismo de autorização.

Se uma diferença relevante entre ordem e laboratório não puder ser resolvida por essas regras, registre-a antes de consolidar a parte afetada. Não faça uma escolha silenciosa que altere acesso, estoque, revisão, aplicação ou evidência documental. Continue o trabalho independente.

### 2.1. O que não se transfere do laboratório para o produto

- Laterais de cenários e comentários, seletor de estados, seletor de largura, reinício de demonstração e importação/exportação de avaliação.
- Dados fictícios, horários de exemplo, IDs, saldos e resultados fixos.
- Temporizadores usados para demonstrar processamento; no produto os estados decorrem da operação real.
- Fichas de contexto abreviadas e avisos de que uma parte foi definida em outro lote.
- Estrutura monolítica, classes locais ou utilitários de simulação quando o produto possui componentes próprios.

Uma tela abreviada para mostrar “Ver ficha” ou retorno à jornada **não autoriza simplificar a ficha real**. Abas, anexos, Andamentos, permissões, referências e ações de L1/L2 continuam completos.

## 3. Base atual verificada e retomada do checkout

A inspeção de 22/11/2026 foi somente de leitura. Não executou operações reais de paciente nem alterou os ambientes.

| Fonte | Observação da inspeção | Como usar na implementação |
|---|---|---|
| GitHub `RMZZFAJ/home-care-assistant` | `master` em `fab595c7d5dafaf382619719f982d34cdeacc86e`; commit `fix(release): gate Google sign-in and provision custody by environment` | Reapurar o HEAD efetivo antes de editar. Não fixar a execução neste SHA caso haja avanço. |
| Branches remotas | Apenas `master`; `feat/phase-d-implementation` ausente | Preservar a branch local atual. Não recriar a branch histórica, trocar automaticamente de branch ou fazer reset. |
| Supabase `qwfrqychokvhdzakibid` | `ACTIVE_HEALTHY`; 320 migrations; última `20261121202419_l2_reconcile_archive_attempt` | Há mudanças L2 posteriores às referências antigas. Usar novas migrations incrementais; conferir a realidade atual. |
| Vercel, projeto Home Care Assistant | Deployment de produção `READY` no mesmo SHA `fab595c…` | Não tratar o remoto publicado como banco de testes. Compatibilizar código e migrations na liberação autorizada. |

Fonte de código: [commit examinado](https://github.com/RMZZFAJ/home-care-assistant/commit/fab595c7d5dafaf382619719f982d34cdeacc86e) e [árvore examinada](https://github.com/RMZZFAJ/home-care-assistant/tree/fab595c7d5dafaf382619719f982d34cdeacc86e). Os caminhos desta ordem foram conferidos nessa árvore ou identificados nela como pontos de integração; a inspeção não equivale a auditoria integral de cada RPC histórico.

Antes de editar, confira branch, status, commits locais, trabalho em andamento e instruções permanentes. Preserve o que já existir. Use o mesmo checkout e branch local; **não abra nova branch, PR ou worktree para L3**. Não interrompa uma operação de gravação em andamento; faça a transição em um ponto seguro.

## 4. Organização, autonomia e conflitos materiais

Execute **um lote L3** em poucas fases internas. Uma organização suficiente é: base compartilhada e contratos; estoque/consumo; plantões/BAL; documentos/verificação e integração final. Pode reorganizar a sequência conforme dependências reais, sem converter cada tela em um lote ou pedido de aprovação.

Há autonomia para criar, mover, renomear, dividir, modularizar, reescrever ou apagar código obsoleto do escopo, simplificar a organização interna e consolidar componentes duplicados. Pode alterar tipos, validação, APIs, RPCs, RLS e esquema quando necessário às decisões expressas. Preserve dados e funções úteis; remoção de código não significa apagar histórico operacional.

Funções reais não desenhadas no laboratório devem permanecer acessíveis e receber o mesmo padrão visual. Resolva detalhes normais de implementação. Só traga para decisão uma incompatibilidade grande ainda não resolvida pelas fontes: por exemplo, uma migração de legado que obrigue a escolher um novo significado para registros existentes. Informe fato, impacto e recomendação; não bloqueie partes independentes.

## 5. Sistema visual compartilhado — obrigatório

### 5.1. Identidade e superfícies

Preservar a identidade HCA em verde/teal, fundos claros, contraste legível, ícones vetoriais da família existente e hierarquia de títulos, descrições, metadados e números. Não introduzir tema pronto, Fluent UI ou outra biblioteca de aparência concorrente. Não substituir ícones por emojis.

Listas precisam de alinhamento consistente entre identificação, estado, data e ação. Quantidades devem ter unidade e significado próximos. Não misturar campos de negócios com informações técnicas de implementação. Evitar múltiplos cartões de alerta repetindo a mesma informação e rodapés com ações concorrentes sem hierarquia.

Decisões curtas, filtros, confirmação, motivo, falha e suporte usam modal. Consulta extensa, material, operação e formulário contextual usam painel quando a referência o demonstra. Uma página nova só é necessária quando representa um destino real da navegação. Cabeçalho e ações fixas devem continuar visíveis sem impedir rolagem do conteúdo.

### 5.2. Componentes atuais a reutilizar

| Necessidade | Fontes atuais e orientação |
|---|---|
| Cabeçalho/etapas de wizard | `src/components/forms/supply-wizard-heading.tsx`, `supply-wizard-stages.tsx`; adaptar os tipos para novos consumidores sem copiar o wizard. |
| Materiais e referências | `src/components/forms/use-wizard-material-references.tsx` e componentes de catálogo/painel já usados por L2. |
| Rodapé, saída, rascunho | `src/components/forms/wizard-actions.tsx`, `simple-draft-panel.tsx`; preservar `SupplyWizardFooter` e `SupplyWizardExit`. |
| Carregamento | `src/components/ui/operation-activity.tsx`: `useOperationActivity`, `PageLoadingActivity`, `OperationActivityHost`. Um host e os dois modos existentes. |
| Diálogos/painéis | `src/components/ui/overlays.tsx`: `Dialog` e `Drawer`; título, contexto, ícone, foco, rolagem e footer consistentes. |
| Faixa sob cabeçalho | `src/components/documents/document-freshness.tsx`, `.hca-document-freshness` em `src/app/l1-ui.css`; generalizar o padrão compacto para os avisos equivalentes. |
| Erro, incerteza e suporte | `src/components/documents/document-operation-failure-dialog.tsx`, `useOperationSupport` e recuperação real. |
| Andamentos | `src/components/documents/document-progress.tsx`, componentes `progress-*` e `document-timeline.tsx`. |
| Retorno da visita a material/ficha | `src/components/documents/material-visit-return.tsx`, `material-visit-context.ts`, `src/lib/documents/material-visit.ts`. |
| Arquivos | `src/components/ui/file-record.tsx` e componentes documentais existentes. |
| Tokens e estilos | `src/app/canonical-ui.css`, `src/app/l1-ui.css` e sistema visual vigente. |

Esses caminhos são referências para investigar consumidores e reaproveitar comportamento, não obrigação de preservar a organização física dos arquivos. Não introduzir um terceiro carregamento ou diálogo apenas porque o HTML é autônomo.

### 5.3. Faixas de aviso e atualização

Usar faixa fina, contínua, imediatamente abaixo do cabeçalho da tela ou do painel ao qual pertence: ícone, texto curto, ação discreta e fechamento quando cabível. A proporção é a de um aviso do Word. A referência existente `DocumentFreshness` usa fundo âmbar, borda inferior e ação discreta; o `FeedbackBanner` em formato de card não satisfaz sozinho essa decisão.

Variantes semânticas: atenção/estoque atualizado, informação/retorno à origem, sucesso/disponibilidade, falha conforme a causa. **BAL disponível usa verde.** Alteração relevante de referência deve levar à comparação antes de gravar. Fechar o aviso não equivale a aceitar saldo, resolver divergência ou autorizar aplicação.

### 5.4. Carregamento e resultado

O padrão simples sobreposto é usado nas consultas e operações comuns. O dinâmico apresenta etapas em ações demoradas ou importantes, como emissão de ficha/documento e aplicação de contagem, conforme L1/L2. Etapas representam estados reais; não usar progresso fictício para ocultar falha ou espera.

Sucesso só depois da confirmação da operação. Timeout ou perda de resposta não são fracasso confirmado. Explicar quando é necessário conferir o resultado antes de repetir. Preservar chave/identidade da mesma tentativa. Depois de esgotada a recuperação de interface, oferecer detalhes seguros copiáveis e explicar que devem ser enviados ao responsável pelo sistema. Não expor payloads privados, segredos ou stack traces.

### 5.5. Acesso indisponível

**Está autorizada a consolidação do padrão de acesso indisponível nos contextos equivalentes do repositório**, além de L3. Usar a superfície compartilhada da v4: motivo compreensível, ação válida de retorno/entrada e nenhuma exposição de dados da ficha. Distinguir sessão expirada, falta de vínculo, revogação e indisponibilidade quando essa distinção puder ser comunicada com segurança.

Não fazer uma reforma geral de navegação por esse motivo. Autorização permanece validada na API e no banco; a tela é a apresentação do resultado.

## 6. Estoque — visão, custódias e quantidades

### 6.1. Visão por autorização

A área de estoque reúne **Família e Equipe**, com trânsito e compromissos visíveis conforme a permissão do usuário. Quem tem acesso aos dois estoques pode compará-los. Quem só pode consultar a equipe recebe somente os dados autorizados da equipe; não entregar valores familiares escondidos no DOM, payload ou estado cliente.

As capacidades reais do contexto determinam leitura e escrita. Não derivar acesso de nome, metadata editável, ID ou seletor de ator. Movimento manual familiar é ação do administrador autorizado no exemplo; conferir e aplicar o contrato real correspondente. Consumo da equipe possui autorização própria, conforme seção 8.

### 6.2. O que cada número representa

- Saldo confirmado/disponível pertence à custódia identificada.
- Compra prevista/aprovada, chegada ainda não aprovada e material em trânsito são informações separadas. Não compõem saldo confirmado do destino antecipadamente.
- ENT transfere família → equipe conforme os atos de L2. DEV registra retorno equipe → família conforme seu processo próprio.
- Não misturar “quantidade entregue/recebida” com “necessidade satisfeita”. São decisões distintas preservadas de L2.
- Nenhuma saída pode produzir saldo negativo. Validar atomicamente no servidor, inclusive sob concorrência.
- Unidade e precisão seguem o produto real; não arredondar arbitrariamente nem somar unidades incompatíveis.

Mostrar mínimo em âmbar, abaixo do mínimo em vermelho e falta/zero com destaque na custódia afetada, sem pintar a outra custódia como se tivesse o mesmo problema. Mostrar atualização **por material e custódia**, com leitura relativa e data/hora absoluta acessível. Não atribuir o mesmo horário a saldos que mudaram em atos diferentes.

### 6.3. Material em trânsito

Organizar a consulta por material, com fichas relacionadas e origem/destino. Suportar várias ENT referentes ao mesmo material. Destacar expedido e recebido; apresentar pendência, divergência e reconciliação somente quando existirem. Números da ficha são acessos à origem.

Os valores devem derivar dos atos reais e ter a mesma interpretação nas telas de estoque, painel, ENT e histórico. Não usar cálculo visual para apagar uma pendência nem somar em trânsito a um saldo já recebido. Uma divergência física em avaliação continua separada da avaliação de satisfação da REQ.

## 7. Material compartilhado, histórico e movimentos manuais

### 7.1. Painel único de material

Usar o mesmo painel a partir de estoque, wizard e aba Materiais de uma ficha. As áreas comuns são Estoque, Histórico e Fichas. Partindo de uma ficha, a aba contextual dessa ficha é **a primeira e abre selecionada**; explicar “Material nesta ficha” e mostrar os números pertinentes ao tipo. Partindo de wizard, não acrescentar uma aba contextual artificial.

COM, ENT, DEV, BAL, REQ e consumo possuem significados próprios. Não mostrar quantidade requisitada como contrato da REQ; não interpretar CON como se fosse REQ. Para consumo, os dados pertinentes incluem quantidade contabilizada e saldos/efeitos vinculados. Se um dado não existe, comunicar sua ausência em vez de inventar zero.

### 7.2. Histórico em duas camadas

Histórico geral e histórico do material seguem o mesmo padrão:

1. Operações recolhidas em acordeons, com tipo/origem, autoria, instante, custódia e resumo legível.
2. Expansão com os materiais e impactos consolidados daquela operação.
3. Painel/modal de detalhe granular com saldo anterior, efeito, saldo posterior, motivo, origem e acessos pertinentes.

Agrupar pelo **ato/operação real**, não simplesmente por mesmo produto, data ou número da ficha. Correções e recebimentos distintos da mesma ficha não se fundem em um único ato. Preservar o livro granular e sua ordem; o agrupamento é uma projeção de consulta. Não somar comprimidos, fraldas e pacotes em um total quantitativo sem significado.

Entradas em verde, saídas em vermelho, ajustes mistos identificados como tais; autoria de lançamento manual explícita. Consultas crescentes precisam de paginação/filtros ou carregamento adequado. Não carregar todo o histórico privado apenas para filtrar no navegador.

### 7.3. Fichas vinculadas e retorno

Fichas relacionadas têm busca e filtro por tipo. Primeiro, acordeon com informações úteis da relação; depois, **Ver ficha**. Abrir em Materiais, destacando o material de origem. O retorno deve restaurar tela/painel de origem, aba, acordeon, filtro, seleção, rolagem, foco e preenchimento do wizard.

Estender `MaterialVisitReturn` e o contexto validado existente. Não converter a consulta em uma saída involuntária do preenchimento. Se acesso ou ficha mudou, apresentar o estado correspondente e um retorno seguro, sem contornar nova verificação de autorização.

### 7.4. Movimentação familiar

Entrada avulsa, retirada e correção suportam **vários materiais na mesma operação**, motivo, autoria e revisão clara dos efeitos. Correção preserva o lançamento original e a relação entre atos; não apaga um saldo antigo diretamente. **Entrada avulsa não gera rascunho.** Não transportar para ela o rascunho de wizard de ficha longa.

Se o estoque mudar durante o preenchimento, preservar a intenção e solicitar conferência da referência atualizada. Em resposta incerta, consultar a tentativa original e mostrar o resultado já registrado, sem lançar novamente. Bloquear quantidade inválida ou saída superior ao saldo em transação.

Pontos a examinar: `src/components/stock/stock-overview.tsx`, `stock-movement-history.tsx`, `transit-stock.tsx`, `family-stock-preparation.tsx`, rotas `/api/stock/...`, `src/lib/server/stock-origin.ts` e `stock-preparation.ts`.

## 8. Consumo do plantão e avisos de falta

### 8.1. Consumo direto — alteração de contrato já decidida

Consumo é registro normal do uso de materiais pela equipe no plantão. Profissional/equipe e supervisão autorizados registram materiais e quantidades; a emissão confirmada faz **baixa direta no estoque da equipe**, sem aprovação familiar. Não consumir diretamente do estoque da família nesse fluxo. A família acompanha e comenta conforme suas capacidades.

Não aceitar consumo somente textual. É preciso ao menos um material e quantidade válida; zero ou campo vazio não equivale a consumo. Observação complementa o registro. O consumo é facultativo por padrão; a configuração do paciente/residência pode exigir seu registro ao final do plantão. Preservar o mecanismo real de fechamento/lembrete e não criar obrigatoriedade universal silenciosa.

O contrato encontrado ainda contém `reported/confirmed/rejected`, relato extraordinário, local `FAMILY | CARE_TEAM`, complemento e decisão. **Não basta ocultar a aprovação ou trocar os rótulos.** Ajustar tipos, validação, API, RPC/transação, projeções e UI para a nova semântica. Preservar relatos e decisões legadas com sua interpretação histórica. Não baixar retroativamente registros antigos pendentes nem reaplicar os que já produziram movimento. Se a migração exigir uma escolha de produto não dedutível dos fatos, registrar esse caso para decisão.

### 8.2. Preenchimento e rascunho

Usar o wizard compartilhado: **Confirmação → Materiais → Itens extras → Observações → Revisão → emissão/sucesso**. Paciente e responsável vêm do contexto autorizado, preenchidos e sem edição arbitrária. Materiais mantêm categorias e organização estável. A etapa de extras aparece após materiais; extras adicionados durante o preenchimento aparecem ali também. Item já catalogado permanece na categoria correta.

Itens extras de consumo precisam possuir identidade e saldo de equipe que possam ser efetivamente consumidos. Não usar um nome livre para inventar saldo ou contornar catálogo/quantidade disponível. Reutilizar o suporte real a itens extras e identificar claramente indisponibilidade.

Rascunho automático e simples para o preenchimento extenso: último preenchimento, diálogo Continuar/Descartar ao iniciar novamente, sem botão obrigatório “Salvar rascunho”. Preservar política e concorrência de L1/L2. Recuperação de emissão oficial incerta é separada do rascunho.

### 8.3. Ficha, correção e cancelamento

Consumo e falta têm lista com filtros, estado, origem e acompanhamento. Ficha de consumo reúne Materiais e Andamentos reais. Reutilizar o componente completo, com autoria, instante, audiência, referências e ações pertinentes; não substituir por uma timeline decorativa nem apenas uma caixa de texto.

Correção registra nova versão e movimenta **somente a diferença** entre valores anteriores e novos. Cancelamento preserva o registro como cancelado e registra a compensação correspondente. Ambos exigem motivo quando previsto, versão vigente e identificação do ato. Correção que aumenta consumo precisa verificar saldo; não admitir saldo negativo. Repetição de confirmação/timeout não pode duplicar baixa ou compensação.

### 8.4. Aviso de falta

Aviso de falta comunica a necessidade à família; é reiterável e permite conversa. Não abre aprovação, não movimenta estoque e não é uma segunda REQ disfarçada. A família pode comentar. Pessoas, fichas, consumos e avisos podem ser referenciados em Andamentos conforme os controles atuais de acesso.

O cenário “Continuar consumo iniciado no WhatsApp” representa entrada contextual por fluxo/lembrete existente. Sugestões devem ser conferidas; somente a emissão autorizada movimenta estoque. Não criar serviço, canal, contrato ou configuração nova de WhatsApp apenas pelo título do cenário. Se uma integração planejada não estiver implementada no checkout, distinguir esse fato e preservar seu escopo original, sem simular produção.

Pontos a examinar: `src/components/stock/consumption-console.tsx`, `consumption-editor.tsx`, `src/types/consumption.ts`, `src/lib/validation/consumption.ts`, APIs e RPCs de consumo/decisão/revisão e a origem de lembrete existente.

## 9. Plantões e balanços — área unificada e horários

### 9.1. Organização

Organizar **Plantões e balanços** em uma mesma área: agenda, balanços previstos e histórico. Preservar URLs/links de `/escalas` e `/balancos` por navegação compatível, conforme a arquitetura existente. Configurações estruturais, tipos e regras pertencem ao contexto de administração; ações rotineiras permanecem na agenda por menu, painel ou modal.

Usar “Plantão” e “Pedido de alteração”. O menu do plantão permite ações pertinentes: trocar profissional, alterar horário, cancelar ocorrência e encerrar futuras ocorrências. Separar a ocorrência da série e apresentar alcance antes de confirmar. Usuário sem capacidade de executar diretamente usa pedido e decisão autorizada, conforme o contrato.

### 9.2. Cadastro e recorrência

Cadastro informa profissional, data/primeiro dia, repetição opcional, escala quando aplicável, término opcional e informação adicional. Um plantão isolado não exige série. Escalas 12×36, 24×24 e 24×48 são ciclos de trabalho/descanso; não converter indevidamente em seleção fixa de dias da semana.

Os tipos definem duração/ciclo e características próprias. **O horário padrão de início pertence à residência e é configurado fora dos tipos.** Novo cadastro usa o padrão pertinente e a duração. **Horário especial** revela início e término manuais para aquela exceção. Desligado, não exibir campos redundantes que pareçam obrigatórios.

Preservar os períodos que o produto suporta, como diurno/noturno; 07h/19h do laboratório são exemplos, não valores de produção. Alterar o padrão da residência não reescreve horários de plantões já registrados. Término de recorrência é opcional; materialização futura deve ter horizonte técnico limitado, sem criar infinitas linhas.

Não expor seletor de fuso no cadastro. Manter o fuso efetivo da residência/configuração do projeto, datas locais e conversões corretas — a ausência do campo não autoriza usar UTC arbitrariamente nem presumir um único fuso para todo o Brasil. Tratar virada de dia e duração de 24 horas sem perder a data de término.

### 9.3. Alteração com impacto em BAL

Troca, cancelamento, mudança de horário ou término de série que afetem um BAL aberto precisam identificar a ficha afetada e pedir o encaminhamento pertinente: manter quando válido, designar ou adiar conforme contrato e ação. Não cancelar/reatribuir contagem silenciosamente. Preservar pedido, decisão, justificativa e histórico.

Pontos a examinar: `src/components/schedules/...`, `src/lib/validation/schedules.ts`, `scheduled_shifts`, séries/tipos/pedidos e os vínculos com balanços. O contrato de origem exige início no tipo e fim da série; implementar a nova organização de ponta a ponta.

## 10. BAL — programação, contagem, revisão e aplicação

### 10.1. Previsto e responsabilidade

A lista de balanços previstos comunica responsável, momento permitido e pendência de decisão. Profissional designado/elegível inicia na janela autorizada. Outra pessoa pode solicitar autorização com justificativa ao administrador do paciente. Ausência de responsável, ambiguidade, pedido, adiamento e recontagem são estados contextuais do mesmo acompanhamento.

Programação/configuração do regime tem observação opcional; não exigir uma justificativa obrigatória sem finalidade nesse cadastro. Isso não remove motivos exigidos para adiamento, troca, cancelamento ou decisão. Designar, pausar, solicitar e decidir usam os painéis/modais da referência e não movimentam estoque.

### 10.2. Contagem e extras

Wizard de cinco etapas: **Confirmação → Materiais → Itens extras → Observações → Revisão**. A confirmação identifica paciente/autor e contexto sem despejar a lista de materiais. Contagem usa categorias do catálogo e painel compartilhado. Mostrar referência, contado e diferença de forma distinta.

Extras são materiais não catalogados efetivamente encontrados na equipe; separar de itens já incorporados ao catálogo. Recontagem começa com os materiais da contagem anterior, preserva suas versões e permite acrescentar item catalogado esquecido na categoria ou extra real na etapa própria. Não obrigar a repetir todo o catálogo para avaliar uma recontagem específica.

Rascunho automático simples, última versão, retomada/descartar e preservação de referência seguem L1/L2. Estoque alterado durante preenchimento exige comparação e reconferência; não substituir a contagem digitada silenciosamente.

### 10.3. Conclusão depois do término do plantão — mudança expressa

**Uma contagem iniciada validamente durante o período autorizado pode ser concluída depois do término do plantão.** O relógio, sozinho, não deve descartar o trabalho nem bloquear a emissão.

Registrar/verificar admissão válida no servidor, vinculada a paciente, profissional, atribuição e versão. Não aceitar como prova uma flag local ou apenas a presença de rascunho. Manter essa evidência ao retomar a mesma contagem admitida.

A exceção não permite iniciar outra contagem fora da janela, ignorar revogação real de acesso, alterar paciente, usar atribuição incompatível ou sobrescrever operação concorrente. Preservar as verificações pertinentes. O código encontrado bloqueia pela perda de `eligibility.available`; adaptar o contrato de continuidade, não apenas remover `disabled`.

### 10.4. Pareceres e aplicação são atos diferentes

Manter contagem, parecer e aplicação como atos independentes. Pareceres de família e supervisão mostram autoria, contagem examinada, data, materiais e conclusão: **Não conferi / Confere / Diferença**. “Não conferi” não pode virar confirmação. Diferença tem encaminhamento e comentário conforme a referência. Preservar a política real de revisão obrigatória/facultativa; não instituir uma terceira política por interpretação do desenho.

O autor da contagem não pode revisar a própria contagem. Parecer de supervisão exige capacidade de supervisão; familiar comum não assume esse papel. Parecer familiar segue as capacidades vigentes. Aplicação é ação autorizada conforme o regime do BAL, não privilégio deduzido do rótulo de uma tela.

No regime de revisão obrigatória, a contagem emitida aguarda os pareceres/encaminhamentos exigidos e a conclusão de aplicação. No regime facultativo existente, a emissão pode aplicar o ajuste conforme seu contrato e permitir parecer posterior. **Parecer posterior não reaplica estoque.** A aplicação ocorre exatamente uma vez, com diferenças, saldos, autoria e origem auditáveis.

Não converter diferença de contagem em consumo. Se o estoque mudou depois da referência, apresentar conflito e resolução autorizada antes de aplicar, sem sobrescrever entradas/saídas concorrentes. Recontagem, reabertura ou consulta não apagam movimentos nem movimentam automaticamente.

### 10.5. Ficha BAL

Preservar a ficha e sua identidade ao trocar abas: **Andamentos, Materiais, Revisões, Contagens e Arquivos**. As áreas de parecer/aplicação pertencem à ficha; não impor telas soltas ou repetição do wizard. Histórico de contagens e revisões permanece consultável. Arquivos usa a mesma ficha, cabeçalho e estado.

Pontos a examinar: `src/components/balances/balance-count-wizard.tsx`, `use-balance-workspace.ts`, demais componentes do módulo, `src/lib/validation/balances.ts`, `src/types/balances.ts`, rotas `/api/balances/...` e RPCs de admissão/revisão/aplicação.

## 11. Arquivos da ficha e geração documental

### 11.1. Escopo documental

Refinar a experiência **dentro do sistema**: consultar acervo, escolher conteúdo, gerar exemplar, visualizar/baixar, anexar, consultar versões, tratar erro e verificar documento. **Não reestilizar o PDF nem outros arquivos gerados neste lote.** Preservar especificação documental, layout aprovado e pipeline de emissão/assinatura atuais. Novos fatos de consumo/BAL/decisões podem ser incorporados ao conteúdo onde necessários, pelos padrões existentes.

Não modificar bytes de exemplar já emitido. Visualizar e baixar usam o mesmo exemplar e emissão; não geram outro documento. Novo PDF depende de geração explícita ou evento de ciclo de vida já aprovado. Não disparar geração a cada consulta ou refresh.

### 11.2. Acervo e opções

Gerados e Anexos são opções da área Arquivos da ficha. Cartões mostram identidade, formato, origem, autoria/data, estado e ações. Usar marcador PDF vermelho reconhecível, vetorial/local, coerente com `FileRecord`; ele identifica formato e não certificação Adobe ou confiança documental.

Os modos Ficha, Ficha ampliada e Auditoria seguem conteúdo e permissões existentes. Datas e filtros precisam ser válidos e gerar exatamente o escopo revisado. Auditoria não pode expor conteúdo a um usuário sem permissão.

“Conteúdo anterior” significa exemplar preservado emitido antes da atualização mais recente da ficha. Explicar isso; não classificá-lo automaticamente como inválido, adulterado ou substituído. Histórico de exemplares permite distinguir data, conteúdo e emissão. Falha ao consultar o acervo aparece no modal compartilhado, com estado recuperável na área após fechar. Falta de acesso usa o padrão de acesso indisponível.

### 11.3. Anexação — retentativa no mesmo fluxo

Escolher, identificar, enviar, conferir resultado e retentar acontecem **no mesmo modal/fluxo de envio**. Preservar seleção e campos enquanto esse fluxo permanecer aberto. Se o usuário fechar ou sair antes de concluir, a próxima tentativa exige selecionar/preencher novamente.

**Não manter fila, card “Retomar envio”, página de retomada ou rascunho externo dessa seleção incompleta.** Essa é uma alteração expressa sobre a experiência anterior. Não reintroduzi-la por copiar a política antiga de anexos.

Isso não autoriza apagar a evidência técnica de uma tentativa enviada. Se a resposta se perdeu, reconciliar internamente pela mesma identidade/hash/recibo. Se o servidor concluiu, o anexo aparece normalmente no acervo; fechar o modal não apaga um anexo confirmado. Se não concluiu, uma nova abertura começa uma seleção nova. Impedir duplicata e tratar reservas incompletas/limpeza técnica sem transformar essa recuperação em uma fila de trabalho para o usuário.

Preservar o limite e os formatos reais: **4 MB; PDF, JPEG, PNG e WebP**, conforme o contrato examinado. Informar limite antes da escolha. Validar tamanho, tipo real, autorização, vínculo à ficha e confirmação no servidor. Seleção de PDF para verificação pública não altera nem registra anexo na ficha.

Pontos a examinar: `src/components/documents/attachments.tsx`, `src/lib/documents/attachment-attempt.ts`, rotas `/api/attachments/...`, acervo e geração existentes. Preservar idempotência e recibos de preparação/confirmação.

## 12. Validação pública — experiência própria e resultados verdadeiros

### 12.1. Página de chegada

Reconstruir a apresentação pública da v4: marca Home Care Assistant, ajuda, explicação curta para quem não conhece o sistema, caminhos **Tenho um código / Tenho o PDF**, formulário, resultado, próxima ação e explicações progressivas. A página pública não usa cabeçalho de paciente, avatar autenticado nem navegação inferior operacional.

Preservar as rotas `/verificar`, `/verificar/[id]` e `/verificar/emissao/[code]` ou sua compatibilidade funcional. QR/código devem levar ao contexto correto. O estado inicial de código é vazio, com instrução de onde encontrá-lo. O estado de resultado tem texto específico e permite nova consulta sem obrigar a reiniciar todo o percurso.

### 12.2. Dimensões independentes

| Dimensão | O que pode afirmar | O que não pode inferir |
|---|---|---|
| Registro da emissão | Código localizou ou não localizou uma emissão | Código localizado não prova o conteúdo do arquivo em poder da pessoa. |
| Correspondência do arquivo | Bytes/conteúdo correspondem ao exemplar segundo a verificação real, ou divergem/não puderam ser examinados | Não derivar integridade do nome, extensão ou existência de código. |
| Assinatura técnica | Presente/confirmada, inválida, ausente ou não avaliada, segundo o verificador | Não afirmar autoria pessoal, ICP-Brasil ou assinatura externa sem prova. |
| Carimbo de tempo e confiança | Resultado técnico do carimbo e política/cadeia de confiança efetivamente avaliados | Carimbo interno não equivale a tempo independente de terceiro; confiança desconhecida não equivale automaticamente a fraude. |

Apresentar evidências separadas, ressalvas e próxima ação. Não usar um selo genérico “Válido” que esconda falha de assinatura, carimbo ou confiança. Correspondência exata de arquivo e confiança da assinatura são propriedades diferentes.

### 12.3. Estados que precisam de tratamento

- Código incompleto/inválido; emissão localizada; emissão não localizada; serviço indisponível.
- Arquivo correspondente; arquivo de outra emissão; diferente do exemplar.
- Assinatura ausente ou não confirmada; carimbo não confirmado.
- PDF ilegível; perfil não suportado; limite de análise/tempo/tamanho.
- Certificado revogado; confiança não reconhecida; política de confiança indisponível.
- Detalhes privados exigindo entrada; acesso autorizado; acesso indisponível/revogado.

Esses estados já decorrem de contratos ou capacidades existentes; não inventar resultados para preencher a tela. “Não encontrado”, erro de rede e análise incompleta não significam falsificação. Diferenciar erro de infraestrutura de resultado técnico negativo.

O contrato examinado usa código normalizado de 32 caracteres hexadecimais, com tratamento de apresentação/prefixo conforme o utilitário atual; PDF até 4 MB, validação de conteúdo/MIME, orçamento de consulta e processamento. Reutilizar limites e verificadores; não ampliar limites silenciosamente. Na implementação, usar os resultados reais, nunca as respostas fixas do laboratório.

### 12.4. Privacidade, limites e autenticação

Não expor paciente, profissionais, materiais, identificadores internos ou outros metadados privados no resultado público, HTML, payload, logs ou detalhes copiáveis. O documento enviado para verificação é analisado para essa finalidade; não vira anexo nem publicação automática. Não oferecer download público do original privado.

Detalhes da ficha exigem autenticação **e autorização atual para aquela ficha/paciente**. Preservar código/contexto de retorno durante a entrada, sem criar redirecionamento arbitrário. Login por si só não concede acesso. Sessão revogada ou conta sem vínculo recebe o estado compartilhado e retorno útil à consulta pública.

Assinatura e TSA atuais são técnicas/internas; o contrato examinado informa `externalTimeIndependence: false`. Não prometer ICP-Brasil, identidade pessoal, carimbo independente externo ou consulta OCSP/CRL que não existam. A v4 melhora a clareza e a apresentação; não muda o nível de garantia criptográfica.

Pontos a examinar: `src/components/documents/public-verification.tsx`, `private-verification-details.tsx`, `src/lib/documents/public-verification.ts`, `src/lib/server/public-pdf.ts`, `src/app/api/verification/route.ts` e as rotas públicas.

## 13. Matriz expressa de impactos sobre L1 e L2

| Superfície anterior | Alteração autorizada em L3 | Limite de preservação |
|---|---|---|
| Painel compartilhado do material e aba Materiais | Aba contextual primeira/ativa, histórico por operação, fichas em acordeons, contexto e retorno completos | Não reduzir abas/conteúdo das fichas nem alterar regras de REQ/COM/ENT/DEV por inferência visual. |
| Faixas de atualização/aviso | Consolidar faixa fina sob cabeçalho e variantes, inclusive disponibilidade de BAL em verde e retorno contextual | Preservar a semântica de confirmação/reconferência; aviso fechado não resolve pendência. |
| Acesso indisponível | Padronizar os contextos equivalentes do repositório | Sem afrouxar acesso nem expor dados; não é autorização para redesenhar todas as telas. |
| Wizards e rascunhos | Estender componentes existentes a consumo/BAL | Não redesenhar REQ/COM/ENT/DEV nem substituir autosave/concorrência aprovados. |
| Carregamentos, diálogos e erros | Reutilizar e completar o padrão comum nos fluxos L3 | Manter os dois carregamentos e etapas reais; não criar padrão concorrente. |
| Andamentos | Integrar consumo, falta e BAL ao componente canônico e às referências pertinentes | Preservar autoria, audiência, menções/referências, política de rascunho e recuperação. |
| Arquivos, acervo e anexos | Refinar consulta, opções, marcadores, estados; retentativa de upload apenas no modal atual | Preservar exemplares, idempotência, privacidade e geração real; não manter retomada externa superada. |
| Verificação externa | Nova página pública e organização de resultados da v4 | Não alterar as garantias criptográficas nem tornar conteúdo privado público. |
| Stock originado por L2 | Nova consulta e projeção histórica, com acesso à origem | Preservar atos físicos, divergência, satisfação, revisões familiares, compensações e vínculos. |
| PDFs gerados | Acrescentar somente novos fatos necessários usando padrão existente | Sem reestilização, sem regravar exemplares emitidos e sem recriar pipeline. |

Pontos de L2 a proteger expressamente:

- COM pode existir sem REQ; ENT pode existir sem COM. Comprar ou receber na família não atende uma REQ; o atendimento depende da ENT e das decisões pertinentes.
- Aprovação de emissão/chegada por administrador conforme papel; atos do próprio administrador não criam autoaprovação redundante. Item ainda não aprovado no estoque familiar não pode ser expedido como disponível.
- Divergência física de quantidade e discordância sobre satisfação são coisas diferentes. Recebimento menor exige nova avaliação familiar conforme a decisão L2, sem resolver integral/parcial silenciosamente.
- REQ atualiza estoque informado no ato de emissão quando há valor; cancelamento preserva a decisão de manter/reverter conforme o contrato aprovado. Reversão não pode apagar movimentos posteriores.
- Arquivamento, ciência/decisão, reversão/reabertura e PDF consolidado seguem L2. Reabrir acompanhamento não gera movimento físico automático.
- Associação explícita entre planejamentos/compras preserva histórico e uma única entrada física; não presumir cobertura apenas pelo mesmo produto.
- DEV é autônoma e preserva registros de retorno/recebimento/consumo; nenhuma consulta de L3 desfaz esses atos.

## 14. Contratos, migrações e segurança operacional

Investigar consumidores reais antes de mudar contratos: UI, tipos, APIs, RPCs, projeções, histórico, geração de arquivos, fixtures e testes existentes. Corrigir o conjunto, sem manter duas semânticas ativas sob o mesmo rótulo.

Funções críticas usam transação com autorização no servidor/banco, controle de versão, identidade da operação e efeitos auditáveis. Estoque oficial vem de movimentações; não editar saldo materializado diretamente. Guardar origem/versão/autor/data suficientes para reconstruir correções, cancelamentos e aplicação. Não confundir idempotência de gravação com rascunho de formulário.

Alterações de esquema devem usar **novas migrations incrementais**, sem modificar migrations aplicadas nem quebrar seu manifesto de integridade. Revisar RLS, grants, defaults e `SECURITY DEFINER` em conjunto. Preservar identidades e legado; novas regras não autorizam recalcular retroativamente fatos históricos como se tivessem ocorrido sob a nova política.

Não usar serviços reais, enviar mensagens externas ou exercer ações de paciente para validar o laboratório. Na implementação, usar o ambiente local de desenvolvimento autorizado, dados fictícios e isolamento já definido. Nenhuma chave, `.env`, token, prontuário ou payload privado vai para documentação, trace ou CI.

## 15. Execução, ambientes, commits e autorização de push

### 15.1. Continuidade e commits

Manter a frente atual e poucas fases internas. A referência é **3 a 5 commits locais coesos**, conforme as dependências, em vez de um commit por cenário ou correção cosmética. Uma divisão maior só precisa de justificativa técnica objetiva; não sacrificar segurança/transação para obedecer uma contagem artificial.

Preparar as alterações e verificações antes de pedir liberação. **Antes de qualquer push, inclusive de correções posteriores, pedir autorização explícita do usuário para o conjunto correspondente.** Apresentar commits, resumo, migrations, testes, limitações e riscos concretos. Não fazer pushes intermediários para usar a CI como ciclo de edição; reduzir cancelamentos sucessivos de pipelines.

Não abrir nova PR/branch/worktree, não resetar o trabalho local, não reescrever commits alheios e não fazer merge/deploy automático por causa desta ordem.

### 15.2. Limites de ambiente

Esta ordem autoriza preparar e implementar as mudanças necessárias de código/contrato e novas migrations, validando-as no ambiente local autorizado. Não presume que o remoto Supabase/Vercel seja descartável. A observação atual inclui deployment de produção.

Aplicação de migrations remotas, alterações de infraestrutura/Auth/configuração remota e publicação precisam da autorização correspondente ao ambiente, além de pré-validação, reconciliação e backup quando aplicáveis. Não aplicar uma mudança de contrato no remoto enquanto a aplicação publicada ainda é incompatível. Apresentar uma sequência de liberação compatível no pacote de push, separando o que precisa acompanhar o código.

Respeite autorizações específicas já vigentes para o ambiente e a operação; não peça novamente a mesma autorização. A exigência expressa de pedir antes de qualquer push permanece. Na ausência de autorização remota correspondente, conclua o preparo local e apresente o conjunto concreto para liberação.

Preservar as regras locais de `AGENTS.md`: projeto local `home-care-assistant`, API `127.0.0.1:54321`, banco `127.0.0.1:54322`; conferir origem/containers antes de testes mutáveis. Não criar outra stack para a suíte. Reset/fixtures que substituam dados locais precisam da autorização e preservação exigidas pelo repositório; não usar o vínculo remoto do CLI como destino de teste. Nunca resetar remoto nem carregar fixtures nele.

## 16. Verificação proporcional e critérios de aceite

Usar Node/npm e orientações da versão efetiva do repositório. Antes de escrever código de Next.js, ler os guias locais aplicáveis em `node_modules/next/dist/docs/`, conforme `AGENTS.md`. O laboratório não escolhe versão nem dependência do produto.

### 16.1. Verificação funcional discriminante

| Área | Evidência necessária |
|---|---|
| Custódias | Perfil da equipe não recebe dados familiares, inclusive por acesso direto à API/origem/painel; perfil autorizado vê ambas. |
| Estoque e concorrência | Saída não negativa; dois comandos concorrentes não consomem o mesmo saldo indevidamente; referência alterada exige reconferência. |
| Histórico | Uma operação com vários materiais é agrupada sem fundir atos distintos; detalhe mantém origem, autoria e movimentos. |
| Retorno | Wizard → material → ficha → origem restaura etapa, campos, aba, expansão, scroll e foco. |
| Consumo | Emissão faz uma baixa na equipe, sem aprovação familiar; correção aplica delta; cancelamento compensa uma vez; replay não duplica. |
| Falta | Novo aviso/reiteração/comentário não cria aprovação nem movimento de estoque. |
| Legado de consumo | Registros anteriores mantêm significado e não geram baixas retroativas por migração. |
| Horários | Padrão externo aos tipos, exceção local, ciclo/virada de dia corretos; mudança do padrão não reescreve plantão existente. |
| BAL e tempo | Início sem elegibilidade continua negado; contagem admitida conclui depois do plantão; revogação real/versão incompatível continua protegida. |
| BAL e parecer | Autor não revisa própria contagem; supervisão exige papel; parecer não movimenta; aplicação e recuperação ocorrem uma vez conforme política. |
| Anexo | Retentativa no modal, fechar limpa seleção; confirmado permanece; resultado incerto reconciliado sem fila externa e sem duplicação. |
| Documentos | Visualizar/baixar preserva mesmo exemplar; geração nova explícita; conteúdo anterior explicado; layout dos PDFs preservado. |
| Público | Código não prova arquivo; quatro evidências independentes; falha parcial não vira validade global; nenhum dado privado exposto. |
| Detalhes privados | Login sem vínculo é insuficiente; revalidação de acesso e retorno à consulta funcionam. |

### 16.2. Verificação visual e de interação

Conferir no navegador as superfícies representativas em 360 e 412 px; investigar 390/430 quando houver quebra específica. Não criar uma segunda auditoria de desktop. Preservar o comportamento responsivo existente.

Verificar hierarquia e densidade, números e unidades, rolagem interna de listas/modais/painéis, botões fixos, labels e mensagens, foco/teclado/Escape, estado vazio, carregamento, erro, sucesso, incerteza, acesso indisponível e retorno à origem. Nenhum botão de demonstração sem ação real deve entrar no produto. O menu de cenários pertence apenas ao laboratório.

### 16.3. Gates do repositório

Executar tipos/lint e regressões locais dos consumidores afetados. Mudanças de banco/autorização exigem preparação/regressões locais com Auth real, negativas e concorrência pertinentes; mocks sozinhos não provam RLS. Respeitar instalação limpa/evolução legada/integração conforme os gates vigentes, aproveitando CI quando já programada para o conjunto.

Não executar suíte mutável em paralelo com E2E da mesma base. Não repetir a suíte inteira a cada ajuste sem hipótese concreta; repetir os testes afetados. Não remover controles nem reduzir testes para obter verde. Depois de push autorizado, CI precisa validar o SHA publicado — resultado anterior não cobre o novo conjunto.

### 16.4. Cobertura do laboratório aprovado

O laboratório contém **35 cenários e 194 estados diretos**. Os IDs abaixo organizam a referência; não representam 194 etapas de implementação nem exigem 194 testes redundantes.

| Cenário | Superfície/resultado de referência |
|---|---|
| E07-01 | Estoques da família e da equipe, mínimos, busca e permissões. |
| E07-02 | Painel compartilhado, histórico, fichas e contexto de origem. |
| E07-03 | Trânsito por material/ficha e quantidades coerentes. |
| E07-04 | Histórico agrupado e origem granular. |
| E07-05 | Movimentação familiar com vários materiais. |
| E07-06 | Referência alterada e recuperação do movimento. |
| E07-07 | Lista de consumo e avisos de falta. |
| E07-08 | Wizard de consumo, extras e aviso de falta. |
| E07-09 | Andamentos, correção e concorrência do consumo. |
| E07-10 | Emissão com baixa direta e recuperação. |
| E07-11 | Aviso reiterável, consulta e cancelamento compensatório. |
| E07-12 | Continuidade contextual de consumo iniciado pelo canal existente. |
| E07-13 | Atualização, falha e acesso indisponível. |
| E08-01 | Hub de plantões, previstos e histórico. |
| E08-02 | Cadastro, recorrência, tipos, horários da residência e horário especial. |
| E08-03 | Alteração de ocorrência/série e impacto em BAL. |
| E08-04 | Pedido de alteração e decisão. |
| E08-05 | BAL previsto, elegibilidade e pedido de autorização. |
| E08-06 | Programação/configuração de balanços. |
| E08-07 | Responsável e designação. |
| E08-08 | Pedido de adiamento. |
| E08-09 | Decisão de adiamento e alvo alterado. |
| E08-10 | Contagem, extras, rascunho, recontagem e continuidade após plantão. |
| E08-11 | Revisão final, emissão e políticas de revisão. |
| E08-12 | Parecer familiar/supervisão e impedimento de autorrevisão. |
| E08-13 | Aplicação, conflito, pendência e resposta incerta. |
| E08-14 | Recontagem e histórico preservado. |
| E09-01 | Acervo na ficha, versões, erro e permissão. |
| E09-02 | Conteúdo e opções de geração. |
| E09-03 | Geração e recuperação do exemplar. |
| E09-04 | Seleção e envio de anexo. |
| E09-05 | Retentativa/resultado no mesmo modal e nova seleção após sair. |
| E09-06 | Página pública inicial e consulta por código. |
| E09-07 | Conferência do PDF e evidências técnicas independentes. |
| E09-08 | Entrada e detalhes autorizados sem exposição pública. |

## 17. Entrega final ao responsável

Antes de solicitar push, apresentar:

- Meta atendida e comportamento implementado por frente, com caminhos de acesso e capturas relevantes da interface em celular.
- Componentes compartilhados reutilizados/alterados e impactos efetivos em L1/L2, associados à matriz desta ordem.
- Mudanças de contrato, novas migrations, estratégia de legado e sequência de liberação compatível.
- Verificações realmente executadas, resultados e limitações. Não chamar simulação ou leitura de código de teste de produção.
- Commits locais e diff resumido; autorização de push ainda pendente.
- Incompatibilidades materiais não decididas, se houver, com consequência e recomendação. Não esconder pendências sob um estado de sucesso.

Atualizar os registros de execução pertinentes, incluindo `docs/audits/D/D-B/LOTES_EXECUCAO.md` e o acompanhamento vigente, sem criar vários diários redundantes. Registrar decisões permanentes separadamente de incidentes temporários. A entrega é o sistema implementado e verificável; não uma nova rodada de plano ou de laboratório.
