# Home Care Assistant — comando mestre de implementação de L2

## 0. Missão, aprovação e resultado exigido

**Execute L2 no produto real, mantendo a aparência e a experiência do laboratório hca-laboratorio-02-v7.html, integralmente aprovado por Renato, com as regras consolidadas neste comando.**

A meta é que Renato acesse o sistema no celular e encontre as jornadas de REQ, COM, chegada, ENT, recebimento, suficiência, DEV e ciclo das fichas com a organização, os componentes, as mensagens, os painéis e as respostas da v7, funcionando com os dados, as permissões e os serviços reais. O lote precisa entregar interface, API, persistência, autorização e efeitos operacionais integrados.

Esta é a continuação do Home Care Assistant, sistema de família/equipe para insumos. Não confundir com Conecta Care. L2 integra as etapas E04, E05 e E06 e seus impactos autorizados sobre L1.

**Continue nesta mesma conversa do Codex e na branch de trabalho atual. Não crie outra branch, outro checkout isolado ou outra PR para L2.** Preserve os commits e as alterações locais existentes. Integre o lote ao acompanhamento corrente de D-B.

A autorização é de implementação. Faça o reconhecimento necessário, organize uma sequência curta e execute. Não entregue somente um plano nem aguarde uma aprovação intermediária para escolhas técnicas já abrangidas. Não gere outro laboratório. As reservas materiais delimitadas na seção 18 não impedem o restante do trabalho.

### 0.1 Fontes obrigatórias e precedência

Leia integralmente este comando e abra o HTML v7 anexo no navegador antes de alterar a interface. Confira suas superfícies, operações e variantes em celular.

A precedência é:

1. Instruções expressas posteriores de Renato nesta conversa.
2. Este comando para os comportamentos, o alcance, os efeitos de negócio e as condições de implementação de L2.
3. A aparência e o comportamento efetivamente renderizados da v7 aprovada, nas superfícies de L2 e nos impactos de L1 expressamente autorizados.
4. As decisões mais recentes e a implementação de L1 para o restante do produto, incluindo complementos posteriores ao comando original de L1.
5. Documentação anterior e comentários históricos como contexto ou prova, sem reativar orientações superadas.

Texto e HTML se complementam: o comando especifica contratos reais que a simulação não consegue demonstrar integralmente; o HTML fixa a referência visual e de interação. Não reduza funções para reproduzir um recorte do laboratório.

A v7 já incorpora a revisão anterior e está integralmente aprovada. Não exigir outro arquivo de comentários v7, nem tratar importação inicial reversível ou duas tentativas de recuperação como escolhas visuais ainda abertas. Elas integram a versão aprovada.

O HTML contém históricos de comentários e funções antigas sobrescritas por módulos posteriores. A referência é o resultado ativo final. Não implemente código morto ou recupere uma instrução antiga apenas por encontrá-la no arquivo.

### 0.2 Identificação da referência e fotografia do repositório

- Arquivo aprovado: hca-laboratorio-02-v7.html.
- SHA-256 do HTML aprovado: 92c6115e5af4aa40de5219160009144d8a31d18afdfbda6b373d8c5f8833d7c5.
- Repositório: RMZZFAJ/home-care-assistant.
- Branch remota encontrada na preparação deste comando: feat/phase-d-implementation.
- PR existente: #7, aberta em Draft.
- HEAD remoto consultado: 8a382708582dffd355a03e2481ad55d38be3e7d6.
- Mensagem desse commit: fix(l1): preserve complement focus and stabilize browser checks.
- A referência 484d4a23 contida no laboratório é anterior. Não fazer checkout dela nem usá-la para descartar correções mais recentes.

Esses identificadores são uma fotografia, não uma ordem de congelar o trabalho. Confira o estado local e remoto efetivo ao começar; o checkout local pode conter avanços ainda não publicados. A determinação é continuar na branch atual da conversa L1, preservando o trabalho existente, sem substituí-lo por master ou por uma fotografia antiga.

A aprovação do laboratório não equivale ao aceite humano da implementação ainda por fazer, nem atesta a CI de um SHA futuro.

## 1. Retomada da execução e liberdade técnica

### 1.1 Reconhecimento inicial suficiente

1. Leia as instruções aplicáveis do repositório, o acompanhamento corrente D-B, os contratos dos domínios atingidos e as decisões posteriores de L1. Confira branch, HEAD, alterações locais, commits ainda não publicados e tarefas em curso.
2. Se houver uma operação mutável em andamento, leve-a a um ponto seguro antes de integrar L2. Não abandone uma gravação, migration ou edição pela metade.
3. Identifique os componentes e serviços reais que já atendem cada capacidade. Use o mapa da seção 15 como ponto de partida, ampliando a leitura conforme os consumidores e contratos encontrados.
4. Registre uma divisão interna curta, com o que será reutilizado, alterado ou criado, e inicie a implementação. Evite repetir a auditoria A–E ou transformar o reconhecimento em um novo projeto de documentação.

Não é necessário esperar o encerramento abstrato de toda D-B para executar L2. Preserve e registre pendências independentes já existentes. Corrija dentro do lote o que bloquear concretamente sua integração.

### 1.2 Liberdade autorizada

Você pode criar, dividir, mover, renomear, reescrever e excluir arquivos ou código substituído; reorganizar componentes e módulos; alterar contratos, tipos, endpoints, RPCs, schema e projeções; criar migrations; ajustar notificações, geração documental e testes consumidores. Faça isso na extensão necessária para cumprir as decisões de L2 e manter uma base coerente.

Não preserve uma arquitetura inadequada apenas para evitar refatoração. Também não crie uma arquitetura genérica sem consumidor demonstrável. A quantidade de arquivos, abstrações ou linhas não é critério de sucesso.

Funções reais não desenhadas no laboratório continuam existindo. Se precisarem de apresentação complementar, use estritamente a família visual aprovada, resolvendo detalhes técnicos e de composição com autonomia. Mudanças materiais de negócio não autorizadas seguem o tratamento da seção 18.

### 1.3 Uma frente principal, poucos commits e autorização de push

Organize o trabalho em poucas frentes internas, por exemplo:

1. Componentes compartilhados, impactos em L1 e formulários.
2. Operações de REQ/COM/ENT/DEV, persistência e ciclo de vida.
3. Integração final, fidelidade visual em celular e verificações de fechamento.

A ordem pode mudar conforme dependências reais. Isso é um único lote L2, sem uma entrega ou commit por cenário.

Prepare poucos commits locais coesos; uma divisão de aproximadamente 2 a 4 é uma referência, não uma obrigação artificial. Evite commits de cada pequeno ajuste, captura ou atualização de evidência. Não reescreva os commits já publicados apenas para reduzir a contagem.

**Antes de qualquer push, solicite a autorização de Renato com o conjunto concreto pronto para revisão.** A autorização atual permite implementar e preparar commits locais; não autoriza publicação automática. A regra vale também para atualização remota por API e para novos pushes de correção depois do primeiro. Não efetue merge, release ou implantação em produção por inferência.

Não retome permissões antigas de publicação automática de D-B para contornar essa condição. Apresente branch, commits, resultado das verificações, migrations e pendências antes do pedido de push.

### 1.4 Banco e ambientes

As mudanças de banco, regras e contratos necessárias às decisões deste comando estão autorizadas. Trabalhe primeiro na stack local existente e use migrations incrementais para o ambiente já implantado. Preserve migrations históricas aplicadas/protegidas e os registros reais existentes.

A aplicação incremental no ambiente de desenvolvimento/preview vinculado ao projeto pode integrar a execução do lote, com identidade do destino, reconciliação, pré-validação e proteção dos dados conforme o procedimento vigente. Coordene a ordem com a publicação do código: não deixe o ambiente atual de L1 incompatível com uma migration antecipada. A autorização de migration não autoriza push.

Não executar reset remoto, carregar fixtures no remoto, alterar produção ou contratar serviços. Não criar outra stack de testes. Reset ou substituição de dados locais não se presume pela autorização de implementar; reutilize o procedimento e as autorizações específicas vigentes.

A primeira versão de produção pode ser consolidada. Não construir múltiplas arquiteturas de compatibilidade para experiências descartadas do laboratório. Isso não autoriza apagar autoria, movimentos, documentos ou recibos oficiais, nem alterar os bytes de exemplares emitidos.

## 2. Escopo de L2 e preservação de L1

### 2.1 Dentro do lote

- REQ: declarar necessidades, informar estoque, emitir, acompanhar, tratar duplicidade e cancelar com decisão sobre o ajuste.
- COM: preparar, aprovar planejamento, registrar aquisição, chegada, aprovação, correção, cobertura e conclusão.
- ENT: preparar e expedir, selecionar destinatário, receber, conciliar quantidade e avaliar suficiência.
- DEV: preparar e expedir devolução autônoma, receber e acompanhar seus efeitos próprios.
- Vínculos, importação de materiais, listas frequentes, extras, unidades e leitura de código.
- Ciclo de vida das fichas: revisão de pendências, conclusão, cancelamento, reversões, arquivamento, confirmação e documentos.
- Componentes e impactos compartilhados enumerados abaixo.

### 2.2 Matriz de impactos expressamente autorizados sobre L1

| Superfície | Mudança a implementar em L2 | O que conservar |
| --- | --- | --- |
| Aba Materiais | Lista compacta específica de cada ficha, status junto ao nome, fatos principais e filtros com contagens. Linha abre detalhes. | Identidade, unidade, urgência, fatos históricos, saldos atuais e informações necessárias ao domínio. |
| Detalhes do material | Painel compartilhado com Estoque, Histórico e Fichas, estados e movimentos pertinentes. | Contexto do paciente e capacidade de leitura de cada informação. |
| Fichas vinculadas | Consulta em painel e abertura da ficha completa, com retorno ao contexto anterior. | Identidade documental, vínculos formais, preenchimento, aba, rolagem e foco. |
| Andamentos | Aba própria com Todos/Automáticos/Manuais, cronologia e editor completo; atalho leva à aba. | Campos, menções, referências, rascunho, autoria, instante, audiência, privacidade e permissões mais recentes de L1. |
| Ações da ficha | Menu de três pontos no cabeçalho e FAB + para ações operacionais. | Mesma operação e mesmas capacidades em todos os pontos de entrada. |
| Próximo passo sugerido | No início da ficha, antes do conjunto de ações; botão para a providência sugerida, inclusive ciência. | Sugestão não registra o ato nem concede permissão. |
| Estado concluído/cancelado | Ações pertinentes próximas do cabeçalho durante o período permitido. | Prazo, capacidade, revisão e histórico; arquivar continua ação própria. |
| Resultado de emissão | Modal animado sobre a ficha já aberta, com PDF, compartilhar e acompanhar. | Resultado oficial e identidade da ficha. |
| Falhas operacionais | Modal da mesma família, diagnóstico copiável e até duas tentativas da experiência aprovada. | Erros de campo junto ao campo e recuperação segura de resultado incerto. |
| Carregamentos | Um mecanismo compartilhado; simples habitual e novo dinâmico aprovado para ações importantes/demoradas. | Etapas reais, controle de interação, foco e recuperação já existentes. |
| Alteração concorrente | Faixa contextual e modal com diferenças, antes/depois e impacto. | Edição própria, dados autorizados e controle de versão. |
| PDFs automáticos | Inicial na emissão e consolidado no arquivamento. | Template documental, pipeline, assinatura, validação, Storage e exemplares anteriores. |
| Rascunho de emissão | Retomada pessoal simples, panorama e retorno à etapa. | Política posterior de L1 e separação da recuperação oficial. |
| Suficiência da REQ | Contestação pela equipe, reavaliação familiar e nova avaliação após recebimento menor. | Separação entre quantidade física e decisão de suprimento; decisão anterior preservada. |

A autorização para alterar o carregamento dinâmico é expressa. Faça a mudança no componente comum; não mantenha um carregamento L1 e outro L2 de aparência concorrente.

### 2.3 Superfícies resumidas no laboratório

O HTML mostra Materiais e Andamentos como recorte para revisar L2. **Não retirar as demais abas e funções reais de L1.** Preserve Visão geral, Arquivos gerados, Anexos, Comunicações, Histórico e áreas equivalentes existentes, com seus conteúdos e capacidades.

O shell, a página inicial, o histórico, as telas de contexto e os acessos a outros lotes são representações parciais. Um aviso do laboratório indicando onde uma ação ficará deve virar integração no lugar real, não um aviso permanente de função ausente.

O PDF demonstrativo do HTML não é uma nova especificação do PDF de produção. Não substituir o documento aprovado por sua versão simplificada.

### 2.4 Limites com L3 e L4

Entregue em L2 os movimentos, consultas, painéis e acessos necessários às operações aprovadas. A reconstrução completa da página de estoque, relatórios, catálogo, administração e gestão de acessos permanece em seus lotes.

BAL conserva seu funcionamento, sua nomenclatura e capacidades próprias. Integre nele apenas o efeito pertinente dos componentes compartilhados e das diretrizes comuns já decididas; não abra um redesenho integral de BAL.

Regularização causada por revogação nasce no contexto administrativo pertinente. L2 precisa acompanhar essa consequência na ficha, sem construir uma nova administração completa.

## 3. Fidelidade visual e experiência em celular

A validação visual deste lote é **somente em celular**, como a revisão de Renato desde L1. Use a referência móvel de 412 px e uma largura compacta de 360 px, com adaptação natural às demais larguras de celular. Não abrir uma frente de revisão desktop. Preserve a adaptação existente fora do celular.

Compare o produto real e o HTML no navegador, nos mesmos estados representativos. “Usa verde”, “tem cards” ou “possui os mesmos botões” não é paridade visual suficiente.

### 3.1 Composição a reproduzir

- Fundos claros esverdeados, superfícies brancas, bordas discretas e cantos suaves.
- Verde principal e texto escuro; informações secundárias com contraste adequado; atenção em âmbar; urgência/erro em vermelho; êxito em verde.
- Ícones SVG de traço consistente e significado reconhecível. Não usar emoji como substituto de ícone.
- Tipografia real aprovada de L1, com hierarquia e dimensões compatíveis com a v7. A declaração de uma fonte no CSS do HTML não prova que ela foi carregada; não impor outro pacote de fonte por dedução.
- Separação visível entre título, contexto, grupo de dados, informação secundária e ação. Não comprimir tudo em uma lista indiferenciada nem multiplicar cartões sem função.
- Quantidades com alinhamento previsível, unidade visível e números tabulares quando apropriado.
- Texto longo, nomes de materiais, motivos e estados quebram corretamente. Menus, ícones, seletores e campos mantêm áreas de toque independentes.

### 3.2 Estrutura e navegação

- Cinco indicadores compactos de etapa no formulário; categorias dentro de Materiais têm navegação própria.
- Rodapé reúne Voltar/Continuar/Emitir e estado de salvamento, sem colidir com a navegação inferior, teclado ou área segura.
- Modais e painéis respeitam a altura útil. Cabeçalho, conteúdo rolável e ações permanecem alcançáveis.
- Painéis de consulta ocupam a largura móvel disponível. O voltar explícito e o voltar do celular restauram o contexto correto.
- Menus próximos ao rodapé não ficam cortados. O FAB respeita conteúdo e navegação.
- Preserve foco, fechamento, retorno de foco, nomes acessíveis e redução de movimentos. A animação não pode ser a única indicação de resultado.

### 3.3 Elementos exclusivos da simulação

Não levar ao produto:

- Navegação de cenários, seletor de variante/ator/tipo, reiniciar, comentários, importação/exportação da revisão ou histórico de versões do laboratório.
- Moldura fixa de celular ou largura de 412 px aplicada à página inteira.
- Pessoas, datas, saldos, números de fichas, catálogo pequeno, códigos de barras e quantidades dos exemplos.
- Flags que concedem perfis, alterações oficiais apenas em memória/localStorage, timers que sempre acabam em sucesso e serviços fictícios.
- Gerador simplificado de PDF, links locais do HTML e câmera simulada.
- Botões que apenas avisam que a função pertence a outro lote, quando a integração operacional de L2 precisa existir.

A lógica de produção deve respeitar precisão, volume, dados e capacidades reais. Os exemplos não estabelecem limite de itens, números inteiros obrigatórios ou novos prazos fixos.

## 4. Componentes compartilhados e formulários

### 4.1 Sequência comum

REQ, COM, ENT e DEV seguem:

**Confirmação → Materiais → Itens extras → Observações → Revisão → processamento → resultado.**

Use uma base compartilhada com os campos específicos de cada domínio. Evite quatro implementações divergentes do mesmo formulário.

Na confirmação:

- Paciente e autor vêm do contexto autenticado e são conferidos.
- Não solicitar novamente um paciente já definido nem permitir trocar autor por um controle de simulação.
- ENT apresenta destinatário e vínculos pertinentes.
- COM aproveita origem e paciente conhecidos.
- A verificação de dados essenciais ocorre antes de abrir um preenchimento inviável.

Materiais usam listas estáveis por tipo, começando por medicamentos. Ao trocar categoria, posicione a lista de forma coerente. Não obrigar o usuário a reencontrar o início de cada categoria.

### 4.2 Material, seleção e urgência

A inclusão de material usa interruptor. A urgência da REQ usa checkbox. Os controles equivalentes seguem o significado e a representação do contexto aprovado, inclusive a indicação de suficiência na preparação da ENT.

A seleção, o nome e o menu de três pontos ficam organizados juntos. O menu reúne Detalhes e operações elegíveis, incluindo Vincular a uma ficha quando permitido.

Urgência mantém fundo avermelhado discreto e filete lateral na seleção, revisão e acompanhamento, com indicação acessível. Não criar um padrão diferente em cada cenário.

Quantidade, unidade, estoque de referência, informação desconhecida e justificativa devem continuar distinguíveis. Zero é um valor conhecido; desconhecido, não informado e restrito não são zero.

### 4.3 Listas frequentes

As listas pertencem à residência/paciente e podem ser múltiplas. REQ, COM e ENT podem utilizá-las.

Na primeira etapa, Selecionar manualmente e Usar listas frequentes organizam a escolha. Usar listas expande o seletor no próprio bloco. Criar/organizar/editar ficam no contexto correspondente, seguindo o modal da v7, sem abrir uma nova área extensa de administração.

Listas selecionam materiais. Não transportar automaticamente estoque, urgência ou justificativas de uma emissão antiga. A quantidade conhecida deve corresponder ao momento e à operação atuais.

### 4.4 Extras

Um extra iniciado durante Materiais reaparece como o mesmo registro em Itens extras. Permita conferir, editar e remover. Ele aparece uma única vez na revisão e na emissão.

A etapa existe mesmo quando não há extra. Mostre o estado vazio e a ação pertinente.

Ao digitar o nome, apresente correspondências do catálogo. O usuário escolhe explicitamente um correspondente. Extra realmente novo exige unidade de medida e gera a pendência apropriada de identificação/catálogo. Não atribuir correspondência automaticamente só por semelhança de nome.

### 4.5 Observações e revisão

Observações têm etapa própria, com entradas identificáveis e numeradas, inclusão/remoção e presença na revisão.

A revisão reúne contexto, materiais por tipo, extras, observações e vínculos. Corrigir uma parte e voltar conserva as demais. Emissão deve usar exatamente o conteúdo conferido.

Observações da emissão são fatos de origem. Em recebimento, mostre as observações de quem expediu e ofereça campo próprio ao recebedor, sem sobrepor as autorias.

### 4.6 Rascunhos: preservar a política mais recente de L1

Use o salvamento discreto do último preenchimento, pessoal, por paciente/tipo/contexto. Não gravar um formulário vazio recém-aberto como se fosse trabalho iniciado.

Ao iniciar com rascunho existente, abra Continuar ou Descartar e começar novamente, com momento, etapa e panorama dos dados. Continuar recupera os campos e o ponto de trabalho. O estado Salvando/Salvo/Falha deve corresponder à persistência real.

Confirmação oficial deve usar a revisão exata dos campos conferidos e aguardar o salvamento necessário. Conflitos entre sessões/aparelhos não podem sobrescrever silenciosamente uma edição.

A política posterior de L1 já estabelece:

- Preenchimentos longos conservam o último rascunho.
- Andamentos conserva o último preenchimento também ao fechar voluntariamente, mantendo seus quatro campos; audiência e menções seguem o ato de publicação.
- Cancelar, arquivar, revisar e outras decisões curtas não criam preparação privada retomável. Sair com mudanças pede confirmação; sair confirmado descarta campos sem executar o ato.
- Após falha, os campos permanecem na tela enquanto o resultado oficial é conferido. Recuperação de tentativa não é rascunho.

Não restaurar centrais de rascunhos ou versões de decisões curtas. Não regredir os complementos de L1 copiando o comando antigo.

## 5. Unidades, apresentações e leitura de código

Cada material tem unidade padrão de estoque. Apresentações comerciais diferentes são convertidas para essa unidade, mantendo consistência entre estoque familiar, trânsito e estoque da equipe.

Leitura de código pode auxiliar COM, chegada, ENT e DEV. A diretriz comum para BAL fica integrada ao seu domínio. REQ conserva seleção de materiais e informação de estoque.

O resultado da leitura apresenta material, apresentação reconhecida, quantidade por embalagem, conversão e quantidade final. Permita conferir e corrigir apresentação/unidade pertinente, fator e quantidade convertida, mantendo a unidade canônica do material.

Uma embalagem diferente não muda automaticamente a unidade canônica nem cria outro produto. Exemplos de caixa/par/unidade e conteúdo variável de pacotes precisam funcionar com dados reais.

Integre reconhecimento existente ou implemente o necessário dentro do escopo, com permissão de câmera, falha de leitura, código não reconhecido, seleção manual e correção. Não presumir que o código de barras contém todos os dados da apresentação. Não contratar provedor pago nem introduzir dependência externa sem necessidade demonstrada.

## 6. REQ: necessidade, estoque e cancelamento

### 6.1 Significado e emissão

REQ declara necessidade e informa o estoque atual conhecido da equipe. **Não possui quantidade solicitada.**

O campo Estoque atual vem do saldo da equipe, permite alteração manual e oferece Não sei informar. Na consulta histórica, identifique Estoque informado na REQ e seu momento, distinguindo-o do saldo atual.

**Ao emitir oficialmente a REQ, atualize a contagem dos materiais incluídos com quantidade informada.** Não sei informar conserva o saldo. Rascunho, navegação, revisão e abertura de painel não movimentam estoque.

Realize a atualização por ajuste/movimento oficial identificável, conforme a arquitetura de estoque do repositório, em transação com a emissão pertinente. Não editar diretamente um saldo agregado. Conserve valor anterior, contagem declarada, diferença, material, autor, momento e vínculo à REQ.

Revalide as referências e a concorrência relevantes antes do ato. Preserve a edição e explique uma alteração de estoque que afete a confirmação, sem aplicar silenciosamente uma informação desatualizada como decisão consciente.

### 6.2 Material já requisitado

Informe que há necessidade aberta, identifique a ficha e os dados úteis. Permita retirar o material da nova REQ ou mantê-lo com justificativa. A justificativa acompanha o material.

Se outra pessoa emitir durante o preenchimento atual, explique o fato ocorrido, em vez de apresentar apenas um erro genérico. Não perder o rascunho nem presumir que a nova necessidade foi desistida.

### 6.3 Cancelamento com decisão sobre a contagem

O cancelamento mantém sua justificativa no modal da ação. Ao acionar Confirmar cancelamento, abra o modal próprio de estoque antes da consumação completa.

Ofereça Manter a informação e Reverter o efeito da emissão, com comparação antes/depois do resultado atual. Preserve os movimentos posteriores e registre a escolha.

O cancelamento e seu efeito escolhido precisam ter resultado coerente e recuperável; não deixar a ficha cancelada com uma decisão de estoque silenciosamente perdida no fechamento do segundo modal.

A v7 demonstra reversão após movimentos relativos, preservando entradas e consumo. O caso de outra contagem absoluta posterior está delimitado em P1, seção 18.

Reverter o cancelamento ou reabrir acompanhamento não reaplica automaticamente a contagem original da REQ.

## 7. Vínculos, importação e complementação

### 7.1 Relações e independência

| Relação | Efeito |
| --- | --- |
| REQ → COM | Preparar aquisição ligada a necessidades abertas. |
| REQ → ENT | Preparar fornecimento à equipe, usando estoque familiar disponível. |
| COM → ENT | Preparar entrega do que chegou e teve entrada aprovada. |
| ENT → DEV | Referência opcional à entrega da devolução. |
| COM recente → planejamento anterior | Cobertura explícita por material, com uma entrada física. |
| Complemento formal | Relação documental existente, com identidade, motivo, autor, momento e capacidades próprias. |

COM existe sem REQ; ENT existe sem COM; DEV existe sem ENT de origem. Compra e chegada ao estoque familiar não satisfazem automaticamente uma REQ. O atendimento depende de ENT, recebimento e avaliação aplicáveis.

### 7.2 Importação aprovada na v7

Ao partir de uma ficha aberta, preencha o vínculo geral e importe os materiais elegíveis, permitindo revisar, retirar ou desfazer a importação. Essa apresentação está aprovada.

REQ fornece materiais ainda sem atendimento integral. COM fornece à ENT o que já está disponível no estoque familiar.

Ao criar de forma avulsa e escolher um vínculo, permita apenas vincular ou vincular e importar. O vínculo de uma linha pode ser feito sem importar todos os materiais.

Mantenha a liberdade de acrescentar ou retirar materiais elegíveis. Vínculo não autoriza expedir saldo inexistente nem liberar item ainda aguardando aprovação.

### 7.3 Seletor e consulta

Use seletor comum com filtros Tudo, REQ, ENT, COM, BAL e DEV. Os resultados dependem do paciente, da leitura permitida e da relação efetivamente admitida. A ficha pode ser consultada antes da seleção.

A existência de um filtro não autoriza relacionar operacionalmente qualquer tipo com qualquer outro. Preserve complementos formais e relações reais ausentes dos poucos exemplos do HTML.

No BAL, não introduza vínculo de emissão que seu contrato não admite apenas porque o seletor compartilhado conhece esse tipo.

### 7.4 Quantidades e necessidades remanescentes

A quantidade da REQ é estoque informado, não quantidade automática a comprar. Quem prepara COM define a aquisição.

Destaque a contagem mais recente quando houver várias REQs do material e preserve consulta às anteriores. Não somar saldos de contagens diferentes como demanda.

Uma necessidade parcial pode receber outra ENT na mesma REQ. Nova REQ remanescente é emissão deliberada. Complemento formal é relação documental, com efeito distinto da entrega física e da suficiência.

## 8. COM: planejamento, aquisição, chegada e cobertura

### 8.1 Aprovar o planejamento

Na emissão, itens e quantidades são submetidos ao administrador do paciente. Se o administrador emite, a compra já fica aprovada no ato, com explicação visível.

A aprovação do planejamento pode ajustar quantidades com justificativa, preservando solicitado e autorizado. Aquisição deve respeitar a autorização efetiva e o saldo de planejamento pertinente.

Esse poder não permite editar a quantidade de uma chegada registrada por outra pessoa. São atos diferentes.

### 8.2 Registrar a compra

A compra pode misturar, por item, material já em mãos e material que ainda chegará. O interruptor ligado indica já em mãos; desligado indica chegada futura, com rótulo claro.

Se já estiver em mãos, encadeie o registro de chegada correspondente. O crédito depende da autoridade e aprovação aplicáveis. Uma compra online mantém acompanhamento do que aguarda a loja.

A COM pode continuar aberta enquanto os materiais já recebidos e aprovados são expedidos à equipe por ENT.

### 8.3 Registrar a chegada

Qualquer familiar elegível pode informar a chegada. O administrador credita no seu próprio ato; o familiar comum submete à aprovação. A autorização da COM não dispensa essa segunda aprovação.

Permita um ou vários materiais por lançamento, leitura de código, preenchimento manual ou ambos. Não limitar a lista ao pequeno número do exemplo. Materiais cuja chegada terminou deixam de compor a lista daquela operação.

Mostre quantidade esperada e chegada, falta ou excesso e a consequência antes de confirmar. Quando chegar menos, informe se aguarda outra parcela ou se a entrega foi efetivamente menor. A revisão administrativa recebe essa informação.

Use atenção em âmbar para entrega ainda esperada. Identifique que a aprovação trata da entrada no estoque, não de uma nova autorização genérica de compra.

### 8.4 Aprovar, recusar ou solicitar correção

Na chegada registrada por outro familiar, o administrador pode:

- Aprovar o crédito pertinente.
- Recusar, cancelando aquele lançamento de chegada.
- Abrir pendência para o autor corrigir e reenviar.

**A correção da quantidade pertence a quem registrou a chegada.** Não oferecer um atalho administrativo que reescreva a declaração alheia.

Exiba autor, momento, material, quantidade, diferenças e motivo/providência. A seleção deixa claro o que será decidido e permite deixar itens para depois.

### 8.5 Aprovação em lote

Permita reunir lançamentos da mesma COM e pendências de várias COMs, agrupadas pela compra correspondente.

Início, estoque e ficha devem acessar a mesma operação. Revalide autoridade, estado e versão de cada ato. Apresente o resultado efetivo de cada lançamento, sem anunciar aprovação de um item bloqueado, já decidido ou não incluído.

Crédito oficial ocorre uma vez. Repetição de clique, nova consulta e recuperação de resposta não criam outra chegada nem outro movimento.

### 8.6 Chegada avulsa e doação

Permita chegada sem COM aberta, por aquisição externa, presente ou doação, com sua identificação e aprovação aplicável. Integre o acesso à página inicial e ao cabeçalho do estoque da família.

Doação é recebimento. Pode entrar como chegada avulsa ou cobrir planejamento de compra. Não exigir uma COM de modalidade pedido de doação.

### 8.7 Cobrir planejamento anterior

Chegada iniciada na COM herda essa origem. A escolha adicional é se cobre outro planejamento.

A cobertura é explícita, por material, podendo apontar que uma compra anterior foi coberta pela mais recente. Preserve os vínculos, as quantidades de cobertura e o histórico, com **uma única entrada física**.

Não presumir cobertura só porque duas COMs têm o mesmo material. Não gerar crédito extra para cada ficha coberta. Cobertura do planejamento de compra não declara satisfeita a necessidade da equipe.

### 8.8 Concluir ou cancelar a COM

A revisão pode dispensar saldo autorizado ainda não comprado. Materiais comprados aguardando entrega e chegadas aguardando aprovação precisam de tratamento próprio.

Conclusão e cancelamento usam a estrutura comum de revisão com bloqueios específicos. Cancelar uma COM não apaga aquisições e créditos já registrados nem retira automaticamente material do estoque.

## 9. ENT, DEV, recebimento e suficiência

### 9.1 Expedição direta e disponibilidade

Retire a concordância bilateral anterior à expedição de ENT/DEV. A preparação termina em revisão e expedição direta, conservando os atos posteriores de recebimento e os controles físicos.

A mudança deve alcançar comandos, RPCs, elegibilidade, projeções, pendências e testes. Ocultar o botão de concordância sem remover o gate do contrato não cumpre o lote.

ENT sai do estoque da família para a equipe; somente material efetivamente disponível pode ser expedido. Chegada não aprovada não é estoque disponível.

DEV sai da equipe para a família, com identidade e numeração próprias. O vínculo à ENT é opcional. Não apagar aceite anterior nem reabrir REQ automaticamente por emitir DEV.

### 9.2 Destinatário e recebimento pessoal

Sugira o profissional do plantão atual real, com identificação visível. Permita escolha de outro destinatário elegível.

Troca antes do aceite segue capacidade, justificativa e histórico. A pessoa designada registra seu recebimento. Ser administrador não autoriza se fazer passar pelo recebedor.

### 9.3 Conferir quantidades

Preencha materiais e quantidades expedidas. Quem recebe confere e registra as quantidades recebidas. Valores mantidos confirmam o previsto; alterações geram divergências identificadas por linha.

Antes de confirmar, mostre as diferenças e seu impacto. Evite repetir número da ficha e identidade já evidentes quando isso apenas alongar o aviso. Conserve observações do expedidor e do recebedor separadas.

A interface e a persistência distinguem expedido, recebido declarado, recebido reconhecido, saldo em trânsito e eventual excedente. Não usar um único número para fatos diferentes.

### 9.4 Quantidade física e suficiência

Ao preparar a ENT vinculada a REQ, a família com autoridade efetiva informa, por material, atendimento parcial ou integral.

A equipe recebe a quantidade e pode discordar da suficiência mesmo quando não há diferença física. Registre o pedido da equipe e seu motivo para decisão familiar.

No recebimento menor, mantenha suficiência pendente e solicite nova avaliação familiar. A família pode reconhecer a quantidade menor e considerar a necessidade integralmente suprida, ou mantê-la parcial.

A antiga reserva R3 de L1 sobre recebimento menor foi resolvida por essa decisão. Não a reapresentar como pergunta.

Permita parcial → integral e integral → parcial nos estados elegíveis, com motivo, autoria e preservação da decisão anterior. Não reescrever silenciosamente a declaração original da emissão.

A decisão de suficiência não movimenta estoque. Faça seus efeitos aparecerem em materiais, filtros, contadores, progresso, pendências, vínculos, avisos e documentos.

### 9.5 Conciliação por material

Preserve expedido, recebido, restante, motivo e destino esclarecido. Trate recebimento complementar, permanência/retorno à origem e falta/perda conforme o contrato real.

A resolução de um material não resolve os demais. A interface precisa continuar clara com várias divergências, separadas por material e com ação ao final.

Se a família já registra a avaliação válida durante a conciliação, aproveite essa decisão e encerre a pendência correspondente. Não repetir a mesma avaliação. Se a quantidade foi conciliada sem decisão familiar válida, conserve a necessidade de avaliação.

O pedido de revisão aparece como pedido da equipe, com motivo em destaque. Menu do item dá acesso aos detalhes e à ENT, sem repetir uma escolha parcial/integral que já está diretamente disponível.

### 9.6 Recebimento excedente: parte aprovada

A v7 permite declarar quantidade maior que a expedida e mostra excedente pendente. Implemente essa parte aprovada:

- Registre a quantidade integral declarada.
- Reconheça inicialmente no destino somente a quantidade coberta pela expedição.
- Identifique o excedente separadamente, em apuração, sem inventar saída adicional da origem.
- Na ENT com diferença, preserve a avaliação pertinente da suficiência.
- Aplique o sentido inverso correspondente na DEV.

O ato final de regularizar a origem adicional não está representado na v7. Siga P2, seção 18. Não usar a conciliação do trânsito já expedido como autorização implícita para aumentar a saída.

## 10. Cancelamento físico, reabertura e regularização

### 10.1 Antes e depois do recebimento

Cancelamento de ENT/DEV não é apenas troca de status.

Antes do aceite, confirme a interrupção e o destino físico do material conforme a situação. Não restituir saldo à origem apenas porque a ficha foi marcada como cancelada.

Depois do recebimento, a solicitação exige decisão do recebedor original. Considere aguardo, consentimento, recusa e retirada do pedido antes da decisão, conforme a capacidade e o estado.

O consentimento e a conferência física conservam o consumo já registrado. Quantidades devolvidas não são constantes do exemplo do laboratório; dependem dos fatos e das movimentações.

A solicitação, sozinha, não simula o ato pessoal nem completa a conciliação.

### 10.2 Reabrir acompanhamento

Reverter conclusão/cancelamento cabe ao administrador do paciente, com justificativa e preservação do evento anterior.

Reabrir ENT/DEV conserva recebimento, retorno e consumo. Reabrir REQ não reaplica a contagem. Qualquer nova movimentação física segue uma ação própria, com seus controles.

### 10.3 Revogação do recebedor e apuração

Quando a indisponibilidade decorre de revogação de acesso, a proposta de regularização nasce naquele contexto administrativo. A ficha acompanha a proposta, evidências, responsáveis e revisão independente pertinente.

A regularização não inventa aceite do recebedor. Mantenha em apuração a parte ainda desconhecida e permita registrar posteriormente o destino apurado pela ação e revisão adequadas.

Não encerrar a pendência apenas para fazer o status coincidir com um exemplo visual.

## 11. Conclusão, cancelamento, prazo e arquivamento

### 11.1 Revisão de pendências

Use a revisão da v7, com itens resolvidos, atenção e bloqueios, ações ou instruções específicas e acordeões inicialmente recolhidos.

Conclusão e cancelamento compartilham linguagem visual, mas têm condições diferentes. Revalide fatos após alteração concorrente. Não permitir concluir por uma fotografia obsoleta das pendências.

### 11.2 Período posterior

Depois de concluída ou cancelada, a ficha entra no período definido pela política do paciente/residência. Nesse período continuam os Andamentos, documentos e reversões autorizados.

As ações pertinentes ficam próximas ao cabeçalho. Arquivar manualmente fica no menu de três pontos. Concluir e arquivar é caminho do administrador, sujeito às duas validações.

A política padrão pode ser indicada como motivo de arquivamento.

### 11.3 Arquivar e confirmar

Ao fim do prazo, o sistema arquiva. O administrador também pode antecipar manualmente.

No arquivamento:

1. Registre o estado e os fatos do arquivo.
2. Gere automaticamente o PDF consolidado.
3. Disponibilize consulta/download.
4. Apresente a confirmação administrativa: confirmar encerramento definitivo ou reverter com motivo.

Desde o arquivamento cessam alterações operacionais, novos Andamentos e novas emissões de PDF. Durante a espera pela confirmação, permanecem consulta, download e a decisão administrativa de confirmar/reverter.

Confirmar definitivamente preserva o exemplar consolidado. A confirmação posterior fica no histórico do sistema e não dispara outra geração automática.

Reverter o arquivo preserva o exemplar já emitido no histórico e restabelece o acompanhamento permitido. Não editar os bytes daquele PDF.

A ação de declarar nova necessidade a partir da ficha fica disponível até o arquivamento. Isso não elimina as entradas normais de criação de uma nova REQ no sistema.

### 11.4 Política real

Use a configuração efetiva da residência. O valor de sete dias exibido nos exemplos corresponde ao padrão existente na fotografia consultada, não a uma nova regra universal imposta pelo laboratório.

Confirme a política e os contratos atuais; não trocar configuração real pelo número fixo do HTML.

## 12. Documentos, ciência e comunicações

### 12.1 PDF inicial automático

A emissão gera automaticamente o PDF inicial. O processamento verifica a ciência automática aplicável e processa os avisos próprios antes de compor os fatos conhecidos do exemplar.

A autoria da ficha é da pessoa que emitiu. A geração automática do PDF é identificada como ação do sistema. A assinatura técnica mantém sua identidade própria.

Não fabricar ciência de todos os familiares, confirmação de envio, entrega ou leitura. Preferência e consentimento prévios aplicáveis, capacidades e regras de ciência continuam vigentes.

As etapas da emissão podem seguir Registrar ficha → Conferir ciência aplicável → Processar avisos → Gerar PDF, com nomes adequados ao tipo e avanço por fatos reais. Não aguardar indefinidamente leitura de mensagens nem anunciar que uma fila é entrega confirmada.

### 12.2 PDF consolidado e exemplares

O gatilho do consolidado automático é o arquivamento, não a simples conclusão.

Antes do arquivo, preserve a geração autorizada de exemplares de acompanhamento e sua autoria. Depois do arquivo, disponibilize o consolidado preservado.

Use o template documental aprovado, pipeline de reserva/renderização/assinatura/Storage/verificação e conteúdo pertinente dos novos atos L2. Preserve identificadores, hashes, histórico e bytes dos exemplares emitidos.

Não confundir a listagem de exemplares, inclusive nomes técnicos como pdf_archive, com o ato de arquivar a ficha.

### 12.3 Falha parcial e recuperação

Se a ficha foi salva e a geração ou os avisos falharam, mostre esse fato e recupere a etapa auxiliar. Não induzir nova emissão de ficha, nova expedição ou novo crédito para conseguir outro PDF.

Não afirmar PDF disponível antes da confirmação efetiva. Resultado recuperado conserva a identidade do documento e da tentativa.

### 12.4 Ciência, leitura e privacidade

Ciência formal, ciência por expedição, conhecimento da resposta familiar, leitura de uma comunicação e recebimento físico são fatos distintos.

Preserve consultas públicas limitadas, validação de arquivo/código e acesso autenticado aos detalhes. Não expor conteúdo privado em PDF, busca, contadores, referências ou notificações por causa de uma mudança visual.

Comunicações conserva canais, elegibilidade, limites, reenvio deliberado e histórico. Fila, processamento, aceitação pelo provedor, enviado, entregue, lido, falha e incerto continuam estados distintos. Recuperar uma resposta não é reenviar deliberadamente.

Não introduzir provedor pago nem enviar notificações reais a terceiros durante testes.

## 13. Materiais, painéis, Andamentos e ações

### 13.1 Aba Materiais

Use a lista compacta da v7: nome e status juntos, unidade/identificação secundária, fatos em duas colunas no celular, chevron e linha inteira acionável.

| Tipo | Informações principais |
| --- | --- |
| REQ | Estoque informado na REQ, estado de suprimento e estoque familiar atual pertinente. |
| COM | Solicitado/autorizado, comprado, chegou/entrou e estoque atual pertinente. |
| ENT | Expedido, em trânsito, recebido e saldo atual do destino. |
| DEV | Mesma organização, com o sentido e os fatos próprios da devolução. |

Rótulos distinguem quantidade histórica de saldo atual. A linha compacta não apaga detalhes: eles ficam no painel.

Filtros têm nomes e contagens coerentes: Todos, Urgentes, Pendentes e resolução pertinente ao tipo, como Supridos/Recebidos/Conferidos. Preserve opções e funções reais pertinentes fora do recorte. Parcial continua entre necessidades abertas.

Card de chegadas da COM fica em Materiais. Urgência mantém seu padrão.

### 13.2 Painel e retorno

O painel do material oferece Estoque, Histórico e Fichas, com dados do domínio e acesso às referências permitidas.

Painel → ficha vinculada → ficha completa → voltar deve conservar origem, aba, rolagem, foco e preenchimento. Não substituir silenciosamente a ficha original nem fechar a edição ao consultar um vínculo.

Reutilize os mecanismos de foco e navegação já estabilizados em L1. Observe especialmente consultas assíncronas dos seletores e respostas atrasadas.

### 13.3 Andamentos

A aba reúne cronologia, filtros Todos/Automáticos/Manuais e editor completo. O atalho Novo andamento leva à aba.

Preserve campos, categoria, etapa, autoria, instante, referências a fichas/andamentos, menções e rascunho da política atual. A mudança de posição não reduz o contrato.

Privado usa interruptor; público só é oferecido onde a capacidade vigente o permite. A aprovação do controle visual não altera as restrições mais recentes de L1, inclusive a publicação familiar privada. Menção não concede acesso à residência ou à ficha. Preserve o tratamento vigente de audiência e @todos, respeitando quem pode publicar para aquela audiência.

### 13.4 Ações

Menu de três pontos no cabeçalho: copiar/compartilhar link, revisão de conclusão, cancelamento, arquivo e ações administrativas pertinentes.

FAB +: criar ENT/COM, registrar ciência, compra realizada, chegada e Novo andamento, conforme contexto e capacidade.

Use a mesma implementação quando a ação vier da ficha, início, estoque, sugestão de próximo passo, painel ou revisão de pendências. Não criar fluxos com permissões ou resultados diferentes para o mesmo ato.

Próximo passo sugerido fica no início, antes das ações, com botão correspondente. O local dos controles permanece previsível entre estados.

## 14. Carregamentos, resultados, falhas e atualizações

### 14.1 Uma base compartilhada

Reutilize o mecanismo comum de L1, incluindo OperationActivityHost/diálogo ou seu sucessor efetivo. Modifique-o para a referência aprovada, sem sistemas paralelos de overlay.

- Simples sobreposto: padrão de consultas e gravações curtas, cartão branco, atividade, título e mensagem breve.
- Dinâmico: ações importantes/demoradas, emissão, entrada após login e seleção de paciente, com ícones de conexão, etapa atual e lista de concluída/ativa/futura.

Use etapas reais, por operação. Não inserir demora artificial para exibir a animação nem encerrar o carregamento antes de confirmar o resultado necessário.

### 14.2 Resultado

Na emissão, a ficha já está aberta ao fundo do modal.

Reproduza o medalhão branco animado, símbolo verde, giro, breve crescimento e acomodação. Na falha, use a mesma família com símbolo vermelho; incerteza recebe atenção coerente.

No sucesso de emissão, Baixar PDF e Compartilhar link ficam lado a lado; Acompanhar ficha ocupa a linha seguinte. Acompanhar fecha o modal e revela a ficha.

Conclusão, arquivamento e registros importantes usam a mesma linguagem de resultado. Respeite preferência de redução de movimentos.

### 14.3 Erros e tentativas

Erros de validação ficam junto aos campos. Falhas operacionais usam mensagem contextual no modal compartilhado.

Detalhes para suporte ficam recolhidos, com diagnóstico legível, controle de expansão e copiar. Não incluir segredos, tokens ou payload privado desnecessário.

Informe rascunho salvo apenas quando o salvamento é conhecido. Incerteza de gravação não pode ser descrita como perda ou sucesso confirmado.

A v7 aprovada usa até duas tentativas explícitas na experiência de recuperação. Depois, mantenha a explicação e o diagnóstico copiável. Esse limite de interface não altera a necessidade de descobrir o resultado da mesma tentativa oficial nem autoriza repetir uma gravação incerta.

Antes de repetir uma ação, confirme resultado aplicado ou ausência de aplicação pelo mecanismo confiável existente. Preserve a barreira contra aplicação tardia depois de uma ausência comprovada e a prevenção de duplicatas.

### 14.4 Abertura inviável e vazio

Falha essencial de catálogo/dados/contexto deve ser apresentada antes da primeira etapa, com recuperação pertinente.

Catálogo realmente vazio tem estado próprio: ação de cadastro para quem pode e orientação para pedir cadastro ao administrador nos demais perfis. Não apresentar erro de acesso como catálogo vazio.

### 14.5 Concorrência e resposta familiar

Atualize fichas e Andamentos conforme a infraestrutura existente. Alteração relevante ao conteúdo em uso aparece em faixa sob o cabeçalho, com acesso ao que mudou.

O modal mostra informação anterior/atual e efeito no ato, incluindo valor anterior riscado quando pertinente. Diferencie novo andamento de mudança material da operação.

Preserve edição e ponto de trabalho. Mudanças de estoque, unidade e destinatário precisam ser consideradas na preparação. Enquanto a ficha estiver desatualizada, preserve a proteção de L1 contra nova geração documental sobre uma referência não atualizada; exemplares existentes continuam consultáveis conforme acesso.

Após resposta familiar sobre suficiência, quem ainda precisa conhecer a decisão recebe o aviso, tanto quando houve mudança quanto manutenção. Quem decidiu não recebe aviso do próprio ato; quem já conheceu não precisa vê-lo novamente. Registre conhecimento individual sem transformá-lo em ciência formal da REQ.

### 14.6 Mudança de acesso

Se a capacidade passar a consulta, ofereça a consulta permitida e preserve o último preenchimento para retomada autorizada. Não acrescentar download de resumo que foi retirado da referência ativa.

Se o acesso à residência for revogado, mostre o aviso sobre fundo neutro, sem dados da residência atrás do modal. Cesse consultas e comandos não autorizados, inclusive respostas atrasadas e componentes já montados.

## 15. Integração técnica e pontos de partida no repositório

Os caminhos abaixo orientam a busca; não são limite de escopo nem obrigação de manter a estrutura. Confirme nomes e consumidores atuais antes de editar.

| Área | Referências iniciais |
| --- | --- |
| Regras e execução corrente | AGENTS.md; TEMP_D_B_ATUALIZACAO.md; docs/audits/D/D-B/OWNER_EXECUTION_SUPPLEMENT.txt; L1_DRAFT_POLICY.md; L1_IMPLEMENTATION.md; L1_CI_STABILIZATION.md. |
| Aparência e sobreposições | src/app/lab-model.css; src/app/l1-ui.css; src/components/ui/operation-activity.tsx; src/components/ui/overlays.tsx; tokens e estilos compartilhados efetivos. |
| Fichas e painéis | src/components/documents/document-tabs.tsx; document-progress.tsx; document-actions.tsx; related-document.tsx; supply-detail.tsx; src/components/requisitions/requisition-detail.tsx. |
| Operações e recebimento | src/components/documents/supply-command-fields.tsx; supply-command-editor.tsx; delivery-regularization.tsx; src/lib/documents/delivery-confirmed-quantity.ts. |
| Rascunho e navegação | src/components/forms/simple-draft-panel.tsx; src/lib/forms/draft-navigation.ts; controladores de criação/retomada e foco atuais. |
| Acesso e contexto | src/components/auth/complete-entry.tsx; src/components/layout/workspace-context.tsx. |
| Avisos e documentos | src/lib/notifications/initial-tracking.ts; pipeline documental atual; docs/documents/03_ESPECIFICACAO_DOCUMENTAL_APROVADA.md. |
| Testes consumidores | Suítes atuais de jornadas L1, REQ/COM/ENT/DEV, compras/chegadas, suficiência, Andamentos, rascunhos, estoque, PDF e permissões. |

### 15.1 Mudanças que não podem ficar só no frontend

- REQ com contagem conhecida deve produzir ajuste oficial recuperável e vinculado à emissão.
- Suficiência precisa admitir decisões posteriores, contestação e reavaliação, preservando o fato de emissão e suas novas projeções.
- Expedição direta exige evolução do contrato que condicionava a saída à concordância bilateral.
- COM precisa persistir aprovação do planejamento, chegada, autoria da correção, aprovação em lote e cobertura explícita.
- Recebimento declarado, reconhecido, divergência e suficiência são fatos distintos.
- Ciclo da ficha, arquivamento, confirmação e reversões precisam de condições reais.
- Gatilhos automáticos de PDF integram o pipeline e sua recuperação.
- Novos fatos devem aparecer nos dados de leitura, pendências, contadores, histórico e documentos pertinentes.

Na fotografia anterior, contratos úteis para localizar essas diferenças incluíam:

- 20261105191000_phase_d2_purchase_implicit_authority.sql.
- 20261106073728_phase_d2_bilateral_transfers.sql.
- 20261113191247_l1_family_fulfillment_and_return_identity.sql.
- 20261114194500_l1_decisions_without_drafts.sql.
- 20261112005024_phase_d4_document_complements.sql.

Esses são pontos de leitura históricos. Evolua pelas migrations incrementais apropriadas; não reescreva migrations aplicadas para satisfazer o novo contrato.

### 15.2 Integridade e autorização

Reutilize RPCs/transações e padrões existentes, revalidando identidade, paciente, autoridade, referência e estado nos atos críticos. RLS, grants e funções privilegiadas devem continuar coerentes com a API e os consumidores.

Não confiar em perfil escolhido no navegador. Administração global não implica autoridade local. Administrador não substitui recebimento pessoal. Autosave, leitura, importação e vínculo não produzem atos físicos.

Repetição e perda de resposta devem conservar uma única emissão, chegada, entrada, saída ou decisão. Não criar segunda chave apenas porque a primeira resposta demorou.

Quantidades respeitam precisão e unidade do material. Não reduzir tudo a inteiro por causa dos exemplos.

### 15.3 Regressões de L1 a evitar

Preserve decisões posteriores ao mestre original. Exemplos verificados no repositório:

- Senha mínima de 6 caracteres, com os demais requisitos vigentes; não restaurar 8 ao ler o documento antigo.
- Política de rascunhos e decisões curtas da seção 4.6.
- Privacidade efetiva de Andamentos e leituras individuais autorizadas.
- Correções de foco em seletores de vínculos, retorno de navegação e respostas atrasadas.
- Distinção entre atualização explícita e leitura automática em curso.
- Assinaturas, validação pública/autenticada, recuperação de anexos e estados reais das comunicações.

Não redesenhar esses domínios por iniciativa lateral. Aplique apenas o efeito dos componentes ou regras de L2 autorizados.

## 16. Cobertura e validação proporcionais

O laboratório contém 56 referências e 175 variantes efetivamente carregadas. Elas organizam estados das mesmas superfícies; não representam 56 implementações independentes nem exigem 175 jornadas completas repetidas.

### 16.1 Matriz agrupada

| Família | Referências do laboratório | Resultado a conferir |
| --- | --- | --- |
| REQ e formulário comum | E04-01, E04-02, E04-04, E04-05 | Cinco etapas, listas, urgência, estoque conhecido/desconhecido, extras únicos, observações e revisão. |
| COM e vínculos | E05-01, E05-03, E05-04, E05-07 | Origem/avulsa, vínculo/importação, consulta, scanner/conversão e revisão administrativa. |
| ENT e DEV | E04-10; E06-01, E06-02, E06-03, E06-04, E06-16 | Destinatário, disponibilidade, cinco etapas, vínculo opcional e expedição direta no sentido correto. |
| Rascunho e duplicidade | E04-03, E04-06; E05-05 | Contexto pessoal, continuar/descartar, etapa retomada e justificativa de necessidade repetida. |
| Emissão e recuperação | E04-07; E05-16; E06-05 | Carregamento, PDF, sucesso real, ciência aplicável, falha e resultado incerto sem duplicar ato. |
| Atualização e acesso | E04-15, E04-16; E05-15; E06-12, E06-17 | Diferença/impacto, decisão vista/não vista, erro/vazio, consulta e revogação. |
| Ficha e painéis | E04-08, E04-09, E04-11; E05-14, E05-19 | Menu/FAB, ciência pessoal, filtros, materiais e ida/volta com preservação de L1. |
| Compra e chegada | E05-06, E05-08, E05-09, E05-10, E05-11, E05-20 | Dois atos de aprovação, compra mista, parcial, autoria, correção e lote. |
| Cobertura e avulsa | E05-02, E05-17, E05-18 | Associação explícita, um crédito físico e acessos compartilhados. |
| Recebimento e conciliação | E06-06, E06-07, E06-08, E06-18 | Valores preenchidos, diferença antes de confirmar, resolução por material e suficiência aproveitada. |
| Suficiência | E04-13, E04-17, E04-18; E06-15 | Quantidade correta/necessidade contestada, recebimento menor, parcial/integral e histórico. |
| Ciclo REQ/COM | E04-12, E04-14; E05-12, E05-13 | Bloqueios, prazo, estoque no cancelamento, reversão, PDF no arquivo e confirmação. |
| Cancelamento ENT/DEV | E06-10, E06-11 | Trânsito/recebido, decisão pessoal, recusa/pendência, consumo e reabertura sem movimento duplicado. |
| Recebedor e apuração | E06-09, E06-13, E06-14 | Troca, regularização, revisão independente e quantidade ainda desconhecida. |

Mapeie cada referência à superfície real compartilhada correspondente. Não criar página por ID de cenário.

### 16.2 Verificações que importam

- Inspeção visual móvel com estados representativos, textos longos, muitos itens, teclado, rolagem, menus, modais e painéis. Compare também sucesso, erro, carregamento, vazio, conflito e recuperação.
- Casos discriminantes para REQ conhecida/desconhecida, ajuste na emissão, cancelamento e preservação dos movimentos.
- Dois atos de aprovação COM, autoaprovação efetiva, correção pelo autor, lote multi-COM e indisponibilidade de entrada não aprovada para ENT.
- Cobertura explícita com uma entrada física, inclusive após resposta perdida.
- Recebimento correto, menor, excedente inicial e contestação apenas de suficiência; decisão já feita não é repetida.
- DEV autônoma, cancelamento físico, consentimento pessoal e reabertura sem repetir movimento.
- Arquivo/PDF/confirmar/reverter com bloqueio e exemplar preservados.
- Permissões reais, paciente correto, negativas pertinentes, concorrência e prevenção de duplicatas.

Use dados fictícios e estados preparados nos instrumentos locais de teste. Renato não precisa montar um banco com todas as falhas para a implementação ser verificada. O produto final, entretanto, deve usar fluxos e dados reais.

### 16.3 Método de teste

Siga a política atual do repositório: verificações locais pelo impacto, tipos/lint dos fontes afetados, contratos/API, Auth real quando houver banco/autorização e E2E móvel dirigido pelo runner que confere a stack.

Reaproveite testes consumidores existentes. Atualize expectativas que passaram a contrariar uma regra expressamente modificada, como concordância bilateral anterior. Preserve as verificações de autoria, quantidade, isolamento, concorrência e recuperação que continuam válidas.

Não escrever testes que apenas repetem a implementação ou executar toda a suíte a cada ajuste visual. Após corrigir, repita os casos afetados. Amplie quando houver falha concreta, risco transversal ou gate obrigatório.

Instalação limpa, evolução das migrations e integração completa continuam nos gates aplicáveis; aproveite a CI já programada quando adequada. Não rodar suítes mutáveis de banco em paralelo com E2E sobre a mesma stack.

Não enfraquecer asserções, exclusões, regras ou controles apenas para obter verde. Também não transformar cada detalhe em uma investigação autônoma com múltiplas provas redundantes.

A CI precisa corresponder ao SHA publicado. Antes da autorização de push, descreva honestamente o resultado local e os gates remotos ainda pendentes. Após o push autorizado, acompanhe os gates conforme a instrução vigente da conversa. Não declarar aprovado com base no verde de um commit anterior.

## 17. Entrega, registros e critério de conclusão

### 17.1 Registro suficiente

Atualize o acompanhamento principal e a matriz já usados em D-B, com:

- Funções e superfícies entregues.
- Impactos efetivos em L1.
- Contratos e migrations alterados.
- Verificações realizadas e resultados.
- Pendências materiais concretas e limites.
- Referências úteis para Renato validar no celular.

Preserve evidência suficiente para revisão, sem criar outro diário obrigatório por pequena alteração. Atualize instruções permanentes de aparência/contrato quando necessário para que agentes futuros conheçam L2, mantendo estados transitórios no acompanhamento.

### 17.2 Critério de pronto

L2 está pronto para avaliação da implementação quando:

1. A aparência e a interação móveis correspondem à v7 nas superfícies aprovadas.
2. Os atos funcionam com UI/API/banco/permissões integrados.
3. Estoque, quantidade física, suficiência e vínculos mantêm significados distintos e efeitos corretos.
4. Os impactos autorizados em L1 foram aplicados e suas demais funções conservadas.
5. Erro, conflito, acesso, retomada e resultado incerto funcionam com dados verdadeiros.
6. PDFs e comunicações mantêm contratos reais e recuperação sem duplicidade.
7. As verificações proporcionais e os gates exigíveis têm estado explícito.
8. As reservas efetivamente não resolvidas estão identificadas; não escondidas por uma tela de sucesso.

A aprovação da v7 é a aprovação da referência. A implementação entregue ainda será conferida por Renato.

### 17.3 Mensagem antes do push

Apresente resultado concreto: o que mudou, onde conferir, commits locais, branch atual, testes, migrations aplicadas/pendentes, compatibilidade do ambiente e questões abertas. Então peça autorização para publicar o conjunto.

Depois de autorizado, faça o push na mesma branch e conserve a PR corrente. Não abrir outra PR, não mesclar e não liberar produção sem instrução específica.

## 18. Reservas materiais estritamente delimitadas

A aprovação integral da v7 fecha as decisões representadas nela. Dois casos não foram completamente demonstrados e não receberam resposta individual às perguntas do levantamento. Isso não autoriza reabrir as demais regras nem parar todo o lote.

Primeiro, confira se existe decisão expressa mais recente na conversa corrente ou regra vigente que já resolva o caso sem contrariar L2. Se houver, aplique e registre a fonte. Caso contrário, prepare a proposta concreta, descreva seu efeito e peça a decisão de Renato apenas sobre esse ponto. Continue as partes independentes.

### P1 — Reverter a contagem de uma REQ superada por outra contagem

Aprovado: manter/reverter o ajuste da REQ, com antes/depois e preservação de movimentos posteriores.

Não demonstrado: estoque 12 → REQ A conta 8 → outra REQ/BAL confirma 20 → cancelamento de A com reversão. A v7 só demonstra movimentos relativos após a primeira contagem.

Recomendação anteriormente apresentada, ainda sem resposta individual: preservar a contagem oficial mais recente e seus movimentos, registrando que a contagem de A foi superada.

Não aplicar restauração cega nem afirmar que essa precedência foi expressamente aprovada. Delimite a decisão apenas ao cancelamento de contagem superada. O cancelamento comum e o restante da REQ seguem a implementação.

### P2 — Ato final de regularização do excedente recebido

Aprovado na v7: registrar, por exemplo, 12 recebidas para 10 expedidas; reconhecer inicialmente 10; identificar 2 excedentes em apuração; equivalente na DEV.

Não demonstrado: quem confirma a origem das 2 adicionais, qual ato registra saída/crédito adicionais e como termina o caso se a origem não confirmar.

Recomendação anteriormente apresentada, ainda sem resposta individual: confirmação da origem e ajuste vinculado à mesma entrega, com débito na origem e crédito no destino, disponibilidade pertinente e histórico, sem refazer todo o preenchimento.

Não converter a apuração de trânsito existente em autorização para aumentar a expedição. Implemente a parte inicial aprovada e apresente somente a decisão necessária ao fechamento do excedente. Não marcar o fluxo final como concluído enquanto esse efeito estiver indefinido.

### Outras incompatibilidades

Se encontrar incompatibilidade grande que exija uma escolha de produto ainda não tomada, registre: comportamento real, referência aprovada, conflito, impacto e recomendação. Pergunte apenas a escolha material e continue o que for independente.

Não pedir nova autorização para reestruturação técnica, escolha de arquivo, reutilização de componente ou regra já decidida neste comando.

## 19. Referências para retomada

### Anexos de execução

1. Este comando mestre.
2. hca-laboratorio-02-v7.html — referência executável integralmente aprovada.

A consolidação de decisões e os comentários históricos foram absorvidos neste comando. Não é necessário anexar todas as versões antigas como ordens concorrentes.

### Fontes de apoio

- [Laboratório v7 aprovado](https://chatgpt.com/library?file_id=libfile_876feb346af88191b96921f3bc24056c&account_id=personal).
- [Consolidação que fundamentou o comando](https://chatgpt.com/library?file_id=libfile_47574f17f564819182bd60173ecc884d&account_id=personal). Seu status anterior de revisão é histórico; a v7 foi aprovada depois.
- [PR #7 em continuidade](https://github.com/RMZZFAJ/home-care-assistant/pull/7).
- [HEAD remoto consultado nesta preparação](https://github.com/RMZZFAJ/home-care-assistant/commit/8a382708582dffd355a03e2481ad55d38be3e7d6).
- [Instruções atuais verificadas no repositório](https://github.com/RMZZFAJ/home-care-assistant/blob/8a382708582dffd355a03e2481ad55d38be3e7d6/AGENTS.md).
- [Política L1 posterior ao comando original](https://github.com/RMZZFAJ/home-care-assistant/blob/8a382708582dffd355a03e2481ad55d38be3e7d6/docs/audits/D/D-B/L1_DRAFT_POLICY.md).

As fontes de apoio não substituem os anexos locais nem autorizam regressão a um estado anterior. A implementação deve partir do trabalho atual desta conversa e da branch atual.
