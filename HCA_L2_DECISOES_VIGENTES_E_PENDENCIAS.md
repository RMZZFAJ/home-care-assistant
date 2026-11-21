# Home Care Assistant — decisões vigentes de L2

## Situação desta consolidação

Este registro reúne o resultado vigente das decisões de L2 para fundamentar o futuro comando mestre de implementação. A referência executável em avaliação é o laboratório **L2 v7**. Os comentários dessa revisão ainda serão incorporados antes de fechar a referência final.

Foram examinadas as mensagens disponíveis desta conversa, os **359 registros originais de revisão de L2** e as referências de L1 e do mapeamento inicial. Os históricos de comentários copiados dentro dos arquivos mais recentes foram considerados uma única vez. As decisões estão organizadas pelo assunto do produto, com suas fontes, e não pela sequência das experiências do laboratório.

Uma aprovação de cenário vale para o contexto avaliado e para as ressalvas expressas. Uma solução presente no HTML, por si só, não amplia a aprovação. Quando o usuário substituiu uma orientação, este registro incorpora o resultado da orientação mais recente. A forma de apresentação escolhida pelo assistente entre alternativas admitidas continua sujeita à revisão da v7.

**Duas pendências de produto identificadas:** o efeito de cancelar o ajuste de uma REQ quando já existe uma contagem oficial posterior e o tratamento de um recebimento acima da quantidade expedida. As perguntas e as recomendações estão no final. As demais verificações de integração técnica têm encaminhamento definido e não exigem repetir decisões de produto.

## 1. Escopo e referência para a implementação

### 1.1 O que L2 reúne

L2 abrange necessidades e REQ, aquisição e COM, chegadas ao estoque familiar, ENT, recebimento, conciliação, avaliação da suficiência, DEV e o acompanhamento dessas fichas. As etapas E04, E05 e E06 formam um conjunto de implementação. Seus cenários são formas de avaliar estados e consequências da mesma interface. A existência de 56 referências no laboratório não determina 56 lotes, telas exclusivas ou implementações independentes. Fontes M0, M6 e mapa inicial de L2.

O público é a família, a equipe e a administração do paciente do Home Care Assistant. As capacidades e o contexto de paciente continuam determinando os atos disponíveis. A revisão humana atual é exclusivamente de celular. O sistema mantém sua estrutura compartilhada e as demais superfícies já existentes. Fontes M0, M5, M8 e ordem mestre.

### 1.2 Referência de L1 e limites das representações

A base de L1 é o laboratório L1 v3 corrigido pelos comentários v3 e a implementação correspondente. L2 autoriza mudanças concretas nas superfícies indicadas na seção 10. Uma tela de contexto resumida no laboratório de L2 serve para localizar a ação em revisão. A execução deve conservar a completude da tela real e aplicar o impacto aprovado naquele ponto. Fontes M5 e M9.

O arquivo PDF simplificado que o laboratório permite baixar demonstra a geração, os dados e os acessos. O produto usa a aparência documental, os mecanismos de assinatura, a validação e o histórico já aprovados. A posição do botão ou o novo momento de geração não autoriza substituir o documento impresso pela composição simplificada do HTML. Fonte L1, seção de arquivos gerados e documentos.

### 1.3 Fronteiras com os outros lotes

| Área relacionada | Resultado decidido para L2 | Continuidade prevista |
| --- | --- | --- |
| Estoque | Entradas aprovadas, saídas, trânsito, recebimentos, contagem informada na REQ, consultas de material e acessos de chegada/aprovação. | L3 aprofunda a página de estoque, sua organização completa e relatórios. |
| Painel do material | Consulta do mesmo material, seus saldos, movimentos, fichas e estados dentro de fichas e formulários. | A informação pertence ao domínio de material/estoque e alimentará a tela completa de L3. |
| BAL | Conservar os contratos existentes e levar as diretrizes comuns de formulário, unidade, rascunho, scanner e ciclo de vida à integração pertinente. | A experiência completa de BAL fica para seu lote. |
| Acessos e revogação | A ficha acompanha a consequência operacional da indisponibilidade do recebedor. | O disparo administrativo nasce na revogação de acesso, no contexto de administração. |
| Catálogo e apresentações | Extras apontam a pendência real, a leitura permite conferência/correção e as operações usam unidade padrão. | A gestão completa do catálogo e dos mapeamentos de apresentações pertence à sua área. |
| Página inicial | Acessos para chegada avulsa e aprovação de chegadas, inclusive em lote. | Conservar a página de L1 e integrar as novas ações no lugar correspondente. |
| Comunicações, anexos, arquivos e permissões | Reutilizar o conteúdo e os comportamentos de L1, integrando os novos fatos de L2. | Reformulação adicional depende de pedido expresso. |

Fontes M5, M9, V3 registros 35–36 e 51, V6 registros 53 e 72.

## 2. Formulários, listas, extras e rascunhos

### 2.1 Sequência comum

REQ, COM, ENT e DEV seguem **Confirmação → Materiais → Itens extras → Observações → Revisão**. O processamento e o resultado da emissão vêm depois da revisão. As diferenças de informação de cada tipo de ficha usam essa mesma estrutura. Fontes M1, M9, V2 registros 10 e 17, V6 registros 16, 20, 30 e 39.

Na confirmação, paciente e pessoa que preenche vêm identificados pelo sistema. A pessoa confere esses dados. O formulário aproveita o paciente selecionado e o contexto de acesso. Na ENT, essa etapa inclui o destinatário e os vínculos pertinentes. A COM não introduz uma escolha redundante de paciente dentro do preenchimento. Fontes M1, V2 registros 17 e 34, V6 registros 29 e 38.

Materiais ficam agrupados em listas estáveis por tipo, começando por medicamentos. As categorias são subetapas ou abas da etapa Materiais. A troca de categoria posiciona a pessoa no início da lista correspondente. Os botões de voltar e continuar permanecem juntos e acessíveis, inclusive com a navegação inferior do sistema. Fontes M1, V2 registro 2, V3 registro 1.

### 2.2 Seleção, urgência e ações do item

A inclusão de um material no formulário usa interruptor. A urgência da REQ usa checkbox. A inversão pedida também alcança os controles equivalentes dos outros formulários, inclusive a indicação de suficiência na preparação da ENT. O controle de cada contexto conserva seu significado. Nos modais de avaliação e conciliação, a suficiência continua usando a representação aprovada para aquele ato. Fontes V6 registros 2, 5 e 19, V4 registro 10 e V6 registro 103.

Itens urgentes recebem o mesmo destaque na seleção, revisão e acompanhamento, com tratamento vermelho e filete lateral. Medicamentos usam ícone reconhecível de medicamento. Menu de três pontos, seletor e nome do material ficam organizados na mesma linha quando cabível, com boa área de toque. Fontes V2 registro 2, V4 registro 2, V5 registros 6 e 34–38, V6 registros 2 e 100.

O menu de três pontos do item reúne detalhes e as operações disponíveis para aquele tipo de formulário. A ação de vínculo usa a expressão **Vincular a uma ficha**. Em um tipo que não admite aquele vínculo, o menu conserva apenas as ações elegíveis. Fonte V5 registro 6, V6 registros 10, 14, 32 e 44.

### 2.3 Listas frequentes da residência

As listas frequentes pertencem à casa/paciente. Pode haver várias listas. REQ, COM e ENT podem aproveitá-las. Na primeira etapa há as escolhas Selecionar manualmente e Usar listas frequentes. Esta última expande o seletor no próprio bloco, com criação e organização das listas no mesmo contexto. A busca de listas foi considerada desnecessária para essa apresentação. Fontes V3 registros 1 e 4, V4 registros 1 e 19, V5 registro 3, V6 registros 3 e 18.

As listas orientam a seleção dos materiais. Estoque, urgência, justificativas e outros fatos de uma emissão anterior precisam corresponder ao preenchimento atual. A mudança para listas da residência não cria uma ordem para repetir essas informações históricas. Base funcional do mapa L2, seção 4.1, combinada com V3 registro 1.

### 2.4 Extras e observações

Um extra pode ser incluído durante Materiais. A etapa Itens extras apresenta o mesmo registro e permite conferi-lo, editar ou remover. O item é mostrado uma única vez na revisão e na emissão. A etapa própria existe mesmo quando a pessoa iniciou a inclusão antes. Fontes M9, V2 registro 5, V6 registros 16, 20, 30 e 39.

Ao digitar o nome de um extra, o sistema procura correspondências no catálogo e permite escolher uma delas. Um material realmente novo exige unidade de medida e gera a pendência apropriada de identificação/catálogo para a família. A escolha de um correspondente continua explícita. Fontes V4 registros 1 e 5, V5 registro 4, V6 registros 4 e 24.

Observações têm etapa própria, com entradas identificáveis e numeradas, e integram a revisão. A emissão conserva materiais, extras e observações do preenchimento final. Na confirmação de recebimento, as observações de quem expediu aparecem como informação da expedição. O recebedor registra suas observações em campo próprio. Fontes V2 registro 10, M9 e V6 registro 96.

### 2.5 Rascunho automático e pessoal

REQ, COM, ENT e DEV salvam automaticamente o preenchimento. A mesma diretriz foi estendida pelo usuário ao BAL. O rascunho é pessoal, relacionado ao paciente e ao tipo de ficha. Ao iniciar uma ficha com rascunho existente, o sistema oferece continuar ou descartar e começar de novo em um modal. Fontes M1, decisões incorporadas à V2, V3 registros 6 e 23, V6 registros 46 e 54.

O modal informa quem preencheu, quando foi salvo, a etapa e um panorama dos materiais e dados. Continuar recupera o preenchimento e o ponto de trabalho. O aviso de salvamento reflete o estado real, como salvando, salvo ou problema de gravação. A existência de rascunho de outra pessoa não deve ser apresentada como se fosse do usuário atual. Fontes V2 registros 2 e 6, V6 registros 46 e 54.

A mudança dos rascunhos de emissão não amplia automaticamente o alcance do autosave a todos os editores do sistema. Andamentos conserva os dados, as permissões e o comportamento próprios aprovados em L1. Fonte L1, seção de rascunhos, e mapa L2, seção 7.1.

## 3. Unidade de estoque e leitura de código de barras

Cada material tem uma unidade padrão de estoque. Apresentações de varejo diferentes são convertidas para essa unidade. A entrada da família faz a padronização necessária para que os saldos da família, a ENT e o estoque da equipe sejam comparáveis. Uma diferença no número de unidades por embalagem não altera automaticamente a unidade do catálogo nem cria um novo produto. Fontes V3 registros 10 e 22.

Leitura de código pode auxiliar COM, chegada, ENT e DEV, com a mesma diretriz para BAL em seu lote. A REQ usa a seleção de materiais e o estoque informado. A chegada permite leitura, preenchimento manual ou ambos. Fontes V3 registros 10 e 19, V6 registros 81–83.

Uma leitura apresenta material, apresentação reconhecida, quantidade por embalagem, conversão e quantidade final. O usuário confere o resultado e pode corrigir apresentação/unidade, fator e quantidade convertida. Essa correção está expressamente aprovada, incluindo os exemplos de pacote de fraldas com conteúdo diferente e caixa/par/unidade de luvas. Fontes V6 registros 36 e 42.

As operações usam as informações de produto e apresentação efetivamente disponíveis. O resultado de um scanner simulado não autoriza tratar qualquer código como portador completo da apresentação e da quantidade. A correção de um lançamento conserva a unidade padrão do material. A implementação real deve integrar reconhecimento, mapeamento e correção humana. Fonte V3 registro 22, V6 registro 36 e limite técnico da simulação.

Os números inteiros e os fatores preparados no HTML são dados de exemplo. As quantidades reais respeitam a unidade, a precisão e os limites do contrato do material. Não houve decisão de reduzir todas as unidades do sistema a contagens inteiras.

## 4. REQ, estoque informado e suficiência

### 4.1 Significado da REQ

A REQ declara a necessidade dos materiais e informa o estoque atual conhecido pela equipe. O campo de quantidade da REQ tem significado de saldo, e não de quantidade a comprar. Ele vem preenchido com o estoque da equipe, pode ser alterado e admite Não sei informar. Fontes M1 e base de REQ conservada no mapa L2.

**A emissão oficial da REQ atualiza o estoque da equipe dos itens incluídos com quantidade informada.** O valor declarado passa a ser a contagem daquele material. Não sei informar conserva o saldo. As ENT confirmadas continuam produzindo seus movimentos normais. Fonte M7, resposta 1, e decisões aprovadas incorporadas às V5/V6.

### 4.2 Material já requisitado

Um material com REQ em aberto gera aviso e acesso à ficha correspondente. A pessoa pode retirá-lo da nova requisição ou mantê-lo com justificativa. Essa justificativa aparece junto ao material. Quando outra pessoa emitiu a REQ durante o preenchimento atual, a mensagem explica o ocorrido e pergunta qual decisão o usuário quer tomar. Fontes V3 registros 2–3, V4 registro 3, V5 registro 15 e V6 registro 45.

### 4.3 Cancelamento e contagem

Ao cancelar uma REQ que atualizou estoque, a pessoa escolhe manter a informação de estoque ou reverter o efeito daquela emissão. A justificativa de cancelamento permanece no modal da ação. Ao acionar Confirmar cancelamento, antes de gravar o ato, o sistema apresenta um modal próprio para a decisão de estoque, mostrando os valores e a consequência para a confirmação completa. Fontes M7, resposta 1, V4 registro 14 e V6 registros 113–114.

As movimentações físicas posteriores conservam sua autoria e história. A situação específica de uma contagem posterior que já substituiu a da REQ está reservada à pergunta P1 deste registro. A reversão deve identificar o ajuste que está sendo tratado e o efeito atual, evitando apresentar uma restauração histórica como se não houvesse fatos posteriores.

### 4.4 Quantidade recebida e avaliação da necessidade

Na ENT, a família informa a quantidade expedida e se considera a necessidade parcial ou integralmente suprida. A equipe registra quanto recebeu. Se a quantidade estiver correta e a equipe entender que ainda falta material para a necessidade, pode pedir reavaliação. A família decide manter ou alterar sua avaliação. A quantidade recebida continua registrada. Fonte M3, trecho sobre divergência de quantidade e satisfação da necessidade.

Quando o recebimento é menor, a suficiência fica pendente junto da divergência. A conciliação esclarece a quantidade física e uma nova avaliação familiar decide se o resultado supre a necessidade. Receber cinco de dez unidades pode terminar como parcial ou integral, conforme a avaliação familiar. Fontes M2 e M3.

A avaliação pode mudar de parcial para integral e de integral para parcial enquanto a ficha admitir a ação. Motivo, autoria e decisão anterior ficam no histórico. Uma avaliação de suficiência não movimenta materiais por si. Fontes V3 registro 11, V4 registro 18 e V6 registro 95.

Se a família já registra a avaliação válida ao resolver a divergência, essa decisão encerra a pendência correspondente. A interface reutiliza o ato registrado e evita pedir a mesma decisão outra vez. Fontes V6 registros 101, 103 e 104.

Os pedidos de revisão são identificados como pedidos da equipe, com o motivo em destaque. A ação de registrar fica ao final. O menu do item dá acesso aos detalhes e à ENT relacionada, sem repetir uma escolha de parcial/integral que já está diretamente disponível. Fontes V5 registro 47 e V6 registros 93–95.

### 4.5 Aviso da resposta familiar

Ao abrir a ficha depois da resposta familiar, quem ainda precisa conhecer a decisão recebe um modal. O aviso cobre tanto a manutenção quanto a mudança da avaliação. Quem tomou a decisão não recebe o aviso do próprio ato. A visualização registra que aquela pessoa foi informada da resposta. Fonte V6 registro 51.

Esse registro de visualização da resposta tem a finalidade própria de notificação. A ciência formal da REQ continua obedecendo às regras de L1 e ao seu contrato. A nova apresentação não converte a simples abertura de qualquer ficha em ciência formal.

## 5. Vínculos, importação e complementação

### 5.1 Relações decididas

| Relação | Efeito vigente |
| --- | --- |
| REQ para COM | Preparar aquisição de materiais ligados a necessidades abertas. |
| REQ para ENT | Preparar fornecimento à equipe para necessidades abertas, usando estoque familiar disponível. |
| COM para ENT | Preparar entrega dos materiais que chegaram e cuja entrada familiar foi aprovada. |
| ENT para DEV | Referenciar a entrega relacionada à devolução, preservando os atos anteriores. |
| COM recente para planejamento anterior | Cobertura explícita por material, com histórico e uma única entrada física. |
| Complemento formal entre fichas | Relação documental com identidade, motivo, autoria e momento próprios, segundo as capacidades e os contratos existentes. |

As fichas mantêm sua existência independente. COM pode existir sem REQ. ENT pode existir sem COM. DEV pode existir sem ENT de origem. Comprar ou receber material no estoque familiar não conclui o atendimento da REQ. A entrega à equipe passa pela ENT e pelos atos de recebimento e avaliação pertinentes. Fontes M3, M4, M7, resposta 5, e L1, seção de DEV e complementos.

### 5.2 Ponto de partida da nova ficha

Ao iniciar pela ação de uma ficha já aberta, a nova ficha recebe o vínculo geral e os materiais elegíveis. De uma REQ, vêm os materiais ainda sem atendimento integral. De uma COM, a ENT usa o que efetivamente está disponível no estoque familiar. A pessoa pode alterar, retirar e adicionar materiais. Fontes V6 registros 29, 38 e 75, combinados com M3.

Ao criar de forma avulsa e escolher o vínculo manualmente, a pessoa decide entre apenas vincular e também importar os materiais. O vínculo por material permite relacionar aquela linha sem importar toda a ficha. Fontes V6 registros 29 e 38.

Na v7, a entrada pela ficha de origem usa importação pronta e reversível. O usuário havia admitido também perguntar antes de importar. A revisão da v7 fechará a apresentação escolhida, mantendo o direito de revisar ou retirar os itens importados. Fonte V6 registros 38 e 75.

### 5.3 Componente compartilhado

O seletor é comum ao vínculo geral e ao vínculo do material. Os filtros são Tudo, REQ, ENT, COM, BAL e DEV. Os resultados respeitam o tipo de ficha, o paciente, a capacidade de acesso e a relação admitida. Tocar na ficha permite consultar seus detalhes antes de selecioná-la. Fontes V6 registros 7, 10, 14, 29, 31 e 37.

A existência de um filtro não cria uma relação operacional nova entre todos os tipos. O conjunto real de relações conserva os contratos existentes e acrescenta as relações expressamente decididas. A lista reduzida de exemplos do laboratório não autoriza retirar complementos formais ou outras relações legítimas. Fontes V5 registro 6, V6 registro 10 e L1, reserva R2.

### 5.4 Significado das quantidades importadas

As referências distinguem o estoque registrado na REQ, a data dessa informação e o estoque atual. Quando várias REQs se referem ao material, a contagem mais recente é destacada e as anteriores continuam consultáveis. Os saldos de contagens diferentes não são somados como demanda. Fontes V4 registro 19 e V6 registro 6.

Na COM, quem prepara define a quantidade que pretende comprar. Importar os materiais de uma REQ não cria uma fórmula automática de reposição. Os números previamente montados no laboratório não constituem regra de cálculo. Fonte V4 registro 19, que atribui ao usuário a escolha da quantidade de compra.

### 5.5 Complementar uma necessidade

Uma necessidade parcial pode receber outra ENT na mesma REQ. Uma nova REQ remanescente é emissão deliberada, com seu próprio contexto. Complemento formal é a relação documental entre fichas e não substitui a movimentação física ou o ato de suficiência. Fontes M3 e mapa L2, seção 10.4, apoiada no contrato de complementos de L1.

## 6. COM, compra realizada, chegada e aprovação

### 6.1 Dois atos de aprovação

A emissão da COM apresenta materiais e quantidades para aprovação do administrador do paciente. Quando ele próprio emite, a compra já fica aprovada nesse ato. A interface explica que se está autorizando a compra. Fontes M3 e V6 registro 77.

Depois, qualquer familiar pode registrar que os materiais chegaram. Se quem registra é o administrador do paciente, a entrada no estoque familiar acompanha seu ato. Se é outro familiar, a chegada aguarda a aprovação do administrador para produzir o crédito no estoque. A aprovação da emissão não substitui esta aprovação da chegada. Fontes M3, V6 registros 78 e 91–92.

A interface identifica quando o usuário atua como administrador e, por isso, o ato dispensa uma aprovação posterior. A indicação se aplica aos atos equivalentes, com os efeitos específicos de cada um. Confirmações importantes continuam apresentando a consequência antes da gravação. Fontes V3 registro 25, V4 registro 25 e V6 registros 91–92.

### 6.2 Comprar e receber

Uma compra realizada pode misturar materiais que já estão em mãos e materiais que ainda chegarão da loja. A condição é escolhida por item. O interruptor junto de seu rótulo indica que o material já está em mãos quando ligado. O estado desligado representa a chegada futura. Fontes V3 registro 26, V5 registro 33 e V6 registros 79–80.

O registro de compra que aguarda a loja mantém o acompanhamento da entrega. A entrada no estoque exige a chegada e a aprovação aplicável. Somente depois do crédito familiar os itens podem compor uma ENT. A COM pode continuar aberta enquanto parte do material já foi entregue à equipe. Fontes M3 e V4 registro 38.

O registro de chegada permite selecionar um ou vários materiais pendentes. Materiais cuja chegada já se completou deixam de compor a lista dessa operação. A interface aceita dez ou mais linhas com identidade clara por item e acesso à leitura de código. Fontes V3 registro 27, V5 registro 34 e V6 registro 83.

### 6.3 Diferenças na chegada da loja

O sistema compara a quantidade esperada com a chegada. Mostra falta ou excesso na própria linha e permite confirmar a diferença. Quando chega menos, a pessoa informa se ainda espera outra parcela ou se a entrega efetivamente foi menor. O administrador vê essa informação na revisão da chegada. Fonte V3 registro 28.

Uma entrega ainda aguardada é apresentada em âmbar. A indicação de ausência de entrega restante recebe o tratamento correspondente de situação resolvida. A aprovação explicita que trata da entrada no estoque. Fonte V6 registro 78.

### 6.4 Aprovar, recusar e pedir correção

O administrador pode aprovar a chegada, recusá-la ou abrir pendência para o autor corrigir. A recusa cancela o lançamento de chegada. A pendência pede uma providência e conserva o processo para correção e reenvio. A decisão final escrita pelo usuário atribui a correção da quantidade a quem registrou a chegada. Fonte V6 registro 85.

A revisão informa autor, momento, material, quantidade, diferenças e motivo/providência pertinentes. Os controles deixam claro quais itens serão aprovados e permitem desmarcar os que ficarão para depois. Fontes V4 registro 36, V6 registros 57 e 85.

### 6.5 Aprovação em lote e acessos

A aprovação pode reunir itens de diferentes lançamentos da mesma COM. Pode também reunir pendências de várias COMs, agrupadas pela compra correspondente. A pessoa seleciona o que decide naquela rodada, e cada resultado pertence ao seu lançamento e à sua COM. Fontes V3 registro 29 e V4 registro 29.

Visão inicial, estoque e ficha da COM dão acesso à mesma operação de aprovação. O ponto de entrada pode variar, mas os efeitos, as permissões e os dados são os mesmos. Fontes V3 registro 33 e V4 registros 20 e 35.

### 6.6 Chegada avulsa e doação

Material pode chegar por compra externa, presente ou doação sem COM aberta. A chegada avulsa é identificada como tal e segue a aprovação pela pessoa competente. O acesso fica na página inicial e no cabeçalho da tela de estoque da família. Fontes V2 registro 25, V3 registros 35–36 e V6 registros 88–89.

A doação é recebimento de material. Pode entrar diretamente no estoque familiar ou cobrir o planejamento de uma ou mais COMs. O fluxo final não exige emitir um pedido de doação como modalidade de compra. Fonte V3 registro 20.

### 6.7 Cobertura de outro planejamento

A chegada iniciada a partir da COM herda essa origem. A escolha adicional é se cobre outro planejamento. A associação é explícita e por material, podendo indicar que uma compra anterior foi coberta pela mais recente. Os vínculos e o histórico permanecem, e o material físico gera uma única entrada no estoque. Fontes M7, resposta 5, V4 registro 20 e V6 registro 76.

Compartilhar o mesmo produto não basta para presumir cobertura. A cobertura da compra também não declara satisfeita a necessidade da equipe. Os atos de ENT e de avaliação continuam próprios. Fontes M3 e M7, resposta 5.

### 6.8 Conclusão da compra

O saldo aprovado que ainda não foi comprado pode ser dispensado na revisão de conclusão. Isso permite concluir uma COM parcialmente executada após tratar as pendências pertinentes. Materiais já comprados que aguardam chegada e entradas que aguardam aprovação continuam exigindo tratamento. Fontes V3 registros 30–31 e V5 registro 51.

A conclusão e o cancelamento usam a mesma linguagem de revisão, com bloqueios próprios para cada ato. A interface oferece caminhos para resolver o que está aberto. A ação não apaga uma aquisição ou uma entrada física já registrada. Fontes V3 registros 30–31 e V6 registro 124.

## 7. ENT, recebimento, divergência e DEV

### 7.1 Expedição direta

ENT e DEV usam expedição direta. A preparação termina em revisão e expedição, com o destinatário e os materiais pertinentes. A concordância prévia da contraparte deixa de ser uma etapa desses fluxos. Fontes V2 registros 10 e 34, M4 e decisões aprovadas incorporadas às V3/V4.

ENT movimenta da família para a equipe. DEV movimenta da equipe para a família e tem identificação e numeração próprias em ficha, histórico, vínculos, documentos e validação. A DEV pode existir sem ENT de origem ou conservar uma referência opcional. Fontes M4 e L1, seção 12.1.

A DEV conserva os atos anteriores de entrega, recebimento e consumo. Qualquer mudança na necessidade exige sua ação pertinente. A devolução não recebe, pela simples escolha do tipo DEV, o significado de apagar o aceite da ENT ou reabrir automaticamente uma REQ. Fontes M4, M7, resposta 4, e mapa L2, seção 6.4.

### 7.2 Recebedor

A ENT sugere o profissional do plantão atual, identificado visualmente. A família pode escolher outro destinatário elegível. Antes do aceite, a troca segue as capacidades e a justificativa aplicáveis. O recebimento físico pertence à pessoa designada. Fonte V2 registro 34, V5 registro 55, V6 registros 11 e 137, e contrato existente de ENT.

### 7.3 Conferência de recebimento

Os materiais e as quantidades expedidas vêm preenchidos no recebimento. A pessoa confere e registra o que recebeu. Se mantiver os valores, confirma essas quantidades. Se os alterar, a interface identifica automaticamente as linhas divergentes e apresenta a diferença e seu impacto antes da confirmação. Fontes M1, V5 registro 45 e V6 registros 97–99.

O caso de quantidade recebida maior que a expedida exige a definição P2. A aprovação da conferência de divergências não determina, por si, de onde vêm as unidades adicionais nem quando elas entram no saldo. O laboratório mostra esse excedente em apuração; o contrato examinado ainda limita o recebimento à quantidade expedida. Essa representação da v7 fica sujeita à decisão expressa. Fonte técnica G4.

O aviso de confirmação concentra-se nas diferenças relevantes. Os dados já claros no formulário não precisam ser repetidos de forma a alongar o aviso. A emissão e o recebimento conservam observações com suas respectivas autorias. Fontes V5 registro 45 e V6 registro 96.

### 7.4 Conciliação por material

Cada divergência conserva quantidade expedida, recebida, pendente, motivo e destino esclarecido. A conciliação trata o recebimento complementar, a permanência/retorno à origem e a falta/perda conforme o contrato aplicável. Resolver um item conserva o estado próprio dos demais. Fonte do comportamento existente no mapa L2, seção 6, mantido nas aprovações V4 registro 46 e V5 registro 46.

O modal mantém separação clara entre materiais mesmo com cinco divergências. Menu de três pontos e nome permanecem juntos. A avaliação da necessidade feita durante a conciliação é aproveitada sem repetição posterior. Fontes V6 registros 100–104.

### 7.5 Cancelamento e atos pessoais

O cancelamento sem aceite trata o trânsito segundo o contrato físico. O cancelamento depois do recebimento exige a decisão do recebedor original. A solicitação pode aguardar, receber consentimento ou ser recusada. O pedido por si não substitui o ato pessoal nem produz todos os efeitos da conciliação. Fontes V3 registro 49, V5 registro 54 e V6 registros 132–136, com o contrato existente de cancelamento.

Ao reverter conclusão ou cancelamento de ENT/DEV, reabre-se o acompanhamento. Retorno, recebimento e consumo continuam registrados. Uma nova movimentação física usa uma ação própria. Fonte M7, respostas 3 e 4.

### 7.6 Revogação e apuração

Se a indisponibilidade do recebedor decorre de revogação de acesso, a proposta de regularização nasce nesse contexto administrativo. A ficha acompanha o processo resultante, suas evidências e a revisão independente prevista. O registro de parte ainda desconhecida continua em apuração, com responsável e história. Fontes V3 registro 51, V4 registros 51–52, V6 registros 138–140 e contrato existente de regularização.

## 8. Conclusão, cancelamento, reversão e arquivo

### 8.1 Revisar e concluir

Concluir uma ficha passa pela revisão das pendências reais. O modal destaca o motivo de bloqueio, mostra itens resolvidos com confirmação visual, atenção em âmbar e bloqueios com o tratamento de erro. As pendências abrem em acordeões inicialmente recolhidos, com a ação correspondente ou orientação específica para resolução. Fontes V3 registro 30, V4 registro 30 e V6 registros 105–106.

Cancelamento e conclusão compartilham a estrutura, respeitando condições diferentes. Os botões dependem da capacidade e do estado. A revisão deve se manter verdadeira depois que outra pessoa altera os dados. Fontes V3 registro 31, V6 registros 64 e 124.

### 8.2 Período após concluir ou cancelar

Depois de concluída ou cancelada, a ficha entra no período definido para o arquivamento. Nesse período, continua permitindo os andamentos, documentos e reversões autorizados. A reversão de conclusão ou cancelamento cabe ao administrador do paciente, exige justificativa e preserva a decisão anterior no histórico. Fontes V4 registros 12 e 14, M7, resposta 3.

Ações pertinentes ficam próximas ao cabeçalho nesse estado. A ação de arquivar manualmente fica no menu de três pontos. Concluir e arquivar também é um caminho previsto para o administrador, sujeito às validações da conclusão e do arquivo. No motivo do arquivamento, é possível indicar a política padrão. Fontes V4 registro 12, V6 registros 107 e 115.

### 8.3 Política e arquivamento

A administração do paciente define a política de arquivamento da residência. Ao final do prazo, o sistema arquiva. O administrador também pode antecipar o arquivo manualmente. A regra alcança fichas concluídas e canceladas. Fonte V4 registros 12 e 14, M7, resposta 2.

O arquivamento gera automaticamente o PDF consolidado e abre a confirmação do administrador. Ele confirma o encerramento definitivo ou reverte o arquivamento com motivo. O arquivo permanece disponível para consulta e download. Fontes M7, resposta 2, V6 registro 108 e aprovações dos registros 109–110.

Desde o arquivamento, deixam de ser admitidos novos andamentos, alterações operacionais e novas emissões de PDF. A espera pela confirmação administrativa conserva a consulta, o download do consolidado e as decisões de confirmar ou reverter pelo administrador. Reverter o arquivamento é o ato próprio para retomar o acompanhamento permitido. Fontes V4 registros 12 e 14 e V6 registro 108.

Após a confirmação definitiva, a ficha fica encerrada e o PDF preservado é o exemplar disponível. A confirmação administrativa posterior ao arquivo permanece no histórico do sistema. O requisito de gerar o PDF no arquivamento não transforma essa confirmação posterior em uma segunda geração automática. Fontes M7, resposta 2, V4 registro 12 e V6 registro 108.

O caminho de declarar nova necessidade a partir daquela ficha está disponível até o arquivamento. Esta restrição se refere à ação na ficha arquivada. O abastecimento futuro do paciente continua tendo as entradas normais de criação de REQ. Fonte V4 registro 14.

### 8.4 Política existente e exemplos

Não foi criado um novo prazo fixo de produto nesta consolidação. No código consultado para a v7, a administração já dispõe de `archiveDays`, com valor padrão de 7 dias e configuração por residência. A implementação deve considerar a política efetiva e seus contratos. Os sete dias exibidos no exemplo não dispensam a leitura dessa configuração. Fonte técnica G1.

## 9. PDFs, ciência e avisos da emissão

### 9.1 PDF inicial

A emissão gera automaticamente o primeiro PDF. Antes de produzi-lo, o fluxo verifica a ciência automática aplicável e realiza o processamento dos avisos próprios da ficha, para que o exemplar inclua os fatos disponíveis desse momento. A autoria da ficha continua atribuída a quem a emitiu. A geração automática do PDF é identificada como ação do sistema. Fontes V2 registro 7 e V6 registros 15, 21 e 28.

A confirmação de emissão oferece baixar o PDF, compartilhar o link e acompanhar a ficha. O download é acessível diretamente nesse resultado. Compartilhar o link conserva as permissões de consulta e a identidade da ficha. Fontes V6 registros 15, 21 e 28.

### 9.2 PDF consolidado

O outro momento de geração automática decidido é o arquivamento. O PDF consolidado registra o estado do arquivo e os fatos abrangidos. Após o encerramento definitivo, baixa-se esse exemplar preservado. A conclusão, por si, não é o novo gatilho de PDF consolidado. Fonte V6 registro 108.

Durante o período anterior ao arquivo, continua a possibilidade autorizada de gerar PDFs de acompanhamento. A existência desses pedidos de usuário conserva sua autoria própria, distinta da geração automática de emissão e de arquivamento. Fonte V4 registro 14 e L1, arquivos gerados.

### 9.3 Ciência e estados reais das comunicações

A verificação de ciência automática usa as regras e preferências aplicáveis à emissão. A ciência pessoal, a ciência por expedição e as permissões familiares de L1 conservam seus significados. O novo fluxo não converte autoria de emissão, envio de aviso ou visualização de uma resposta familiar em ciência formal sem o fundamento correspondente. Fontes V6 registros 21 e 28, L1 e contratos de ciência já consultados.

O PDF e a aba de Comunicações mostram o estado efetivamente conhecido de cada aviso, conforme os canais existentes. Fila, envio, aceitação, entrega, leitura, falha e resultado incerto não são fundidos numa confirmação genérica. O L1 já separa o documento salvo do acompanhamento dos avisos iniciais. Fontes L1, seção 11, e G2.

Se a ficha oficial já foi gravada e uma etapa auxiliar precisa de recuperação, a interface conserva esse fato e permite recuperar a etapa correspondente. O erro não deve induzir a emitir outra ficha ou repetir um crédito físico. Essa é uma consequência técnica da recuperação existente, a ser integrada à geração automática. Fontes L1, recuperação/arquivos/comunicações, e G2.

## 10. Mudanças expressamente autorizadas em superfícies de L1

| Superfície | Resultado vigente de L2 | Referência |
| --- | --- | --- |
| Aba Materiais | Lista compacta por tipo de ficha, com os fatos principais e o status junto ao nome. Área de toque do material abre detalhes. | V3 registros 11–13 e 32, V4 registro 32, V5 registro 28, V6 registros 69–73. |
| Detalhes de material | Painel com informações de estoque, movimentos, fichas, estado e história do material, compartilhado com o domínio de estoque. | V4 registro 19 e V6 registro 72. |
| Fichas vinculadas | Painel consultável a partir do formulário ou da ficha, com retorno à origem e acesso à ficha consultada. Voltar do celular recupera o painel e o foco. | V5 registro 27, V6 registros 7 e 70. |
| Andamentos | Aba própria com cronologia e editor completo. Privado usa interruptor, desligado corresponde a público. O atalho de novo andamento leva à aba. | V3 registro 17 e V6 registro 68. |
| Ações de ficha | Menu de três pontos no alto à direita e FAB + no canto inferior direito, com distribuição estável das ações. | V4 registro 8, V5 registro 26, V6 registro 68. |
| Próximo passo sugerido | Aparece no início da ficha, antes das ações. Quando sugere registrar ciência, inclui o botão para realizar esse ato. | V2 registro 8 e V3 registro 17. |
| Pós-conclusão/cancelamento | Ações pertinentes próximas ao cabeçalho, com reversão, andamento e acesso documental no período permitido. Arquivar fica no menu. | V6 registros 107 e 115–118. |
| Resultado de emissão | Modal de sucesso sobre a ficha emitida, com animação e botões pertinentes. | V6 registro 49. |
| Falhas operacionais | Modal compartilhado com mensagem contextual, diagnóstico copiável e tentativas limitadas. | V6 registros 50–52, 56 e 112. |
| Carregamento dinâmico | Apresentação nova aprovada, integrada ao componente único com títulos e etapas próprios de cada operação. | V6 registro 48 e M9. |
| Alterações concorrentes | Faixa persistente e modal focado no que mudou, valor anterior e impacto no ato atual. | V3 registro 15, V4 registro 7, V6 registros 51 e 67. |
| Emissão e arquivo de documentos | Geração automática e informação de sistema, com ciência e avisos aplicáveis. | V6 registros 21, 28 e 108. |
| Entrada em criação com rascunho | Aviso pessoal, panorama e retomada simples para os formulários de L2. | M1, V3 registro 6 e V6 registros 46 e 54. |

### 10.1 Dados centrais da aba Materiais

| Ficha | Informação principal solicitada |
| --- | --- |
| REQ | Estoque informado na requisição, estado de suprimento da necessidade e estoque familiar para consulta. |
| COM | Solicitado / autorizado, comprado, chegaram / entraram e estoque atual pertinente. |
| ENT | Expedido, em trânsito, recebido e informação de estoque da equipe contextualizada após o recebimento. |
| DEV | Mesma organização visual, com os dados e o sentido da devolução. |

As quantidades históricas e os saldos atuais têm rótulos próprios. O painel mantém o detalhamento que não cabe na linha. O card de chegadas da COM pertence à área de Materiais. Fontes V3 registro 33, V4 registro 32 e V6 registro 6.

Os filtros de materiais apresentam seus nomes e contagens, com as opções pertinentes. A linha inteira oferece uma área de toque previsível para consultar detalhes. A urgência mantém o padrão já definido. Fontes V5 registros 28–29 e V6 registros 69 e 73.

### 10.2 Menu e FAB

O menu de três pontos reúne copiar/compartilhar o link, cancelamento, arquivamento e ações equivalentes de administração da ficha. O FAB + reúne ações operacionais, como preparar ENT/COM, registrar ciência, compra realizada, chegada e novo andamento. O conjunto disponível depende do contexto e da capacidade. A mesma ação utiliza o mesmo fluxo quando acessada pela ficha, sugestão de próximo passo, painel ou revisão de pendências. Fontes V3 registros 17 e 33 e V6 registro 68.

Próximo passo sugerido aparece no início da ficha, antes do conjunto de ações. Quando indicar uma providência, oferece seu acesso correspondente, inclusive o botão de registrar ciência. A distribuição dos demais controles permanece estável entre estados, respeitando as capacidades disponíveis. Fontes V2 registro 8 e V3 registro 17.

A nova aba Andamentos conserva a cronologia, categoria, etapa, texto, referências, menções, privacidade e demais funções já aprovadas. Mudar a localização do editor não constitui redução de seu contrato. Fontes V3 registro 17 e L1, Andamentos.

## 11. Carregamento, sucesso, erro e atualização

### 11.1 Um padrão compartilhado de processamento

O carregamento simples, sobreposto à tela, é o padrão para consultas e gravações curtas. O carregamento dinâmico apresenta etapas em operações demoradas ou momentos importantes, incluindo emissão de ficha, entrada após login e seleção de paciente. As operações reutilizam uma base, variando título, etapas e estado. Fonte M9, V5 registro 5 e V6 registros 27, 48 e 62.

Há autorização expressa para substituir a apresentação anterior do carregamento dinâmico de L1 pelo modelo aprovado durante L2. A implementação integra a mudança ao mecanismo compartilhado já existente. Tempos e progressão artificiais do laboratório demonstram a experiência, enquanto o sistema avança por fatos reais da operação. Fontes V6 registro 48, M9 e referência técnica G3.

### 11.2 Modal de resultado

Na emissão, o modal de sucesso aparece sobre a ficha que já está aberta ao fundo. Acompanhar ficha fecha o modal e revela esse acompanhamento. A animação usa círculo branco com confirmação verde, giro, breve crescimento e acomodação no tamanho final. A falha operacional usa a mesma família de modal e a animação correspondente com símbolo vermelho. Fontes V6 registros 49–50.

O padrão de sucesso é usado também nos resultados importantes de conclusão, arquivamento e registros equivalentes. Uma resposta recuperada apresenta o resultado confirmado da ação com a mesma linguagem, preservando a identidade da operação. Fontes V6 registros 59, 63, 76 e 112.

### 11.3 Falhas recuperáveis

Erros de campo ficam junto ao campo. Falhas operacionais, como emissão, andamento ou ciência, usam o modal compartilhado e explicam o problema real. Em formulários, o estado do rascunho informa se o progresso foi preservado. Fontes V3 registro 11 e V6 registro 50.

Detalhes para suporte ficam em acordeão com controle visual coerente, diagnóstico organizado, botão de copiar e orientação para encaminhá-lo ao responsável pelo sistema. Quando há recuperação pertinente, oferecer uma ou duas tentativas. Persistindo a falha, o acesso de repetir deixa de aparecer e os detalhes continuam copiáveis. A v7 adota duas tentativas dentro da faixa autorizada. Fontes V6 registros 50, 52 e 112.

Falha para carregar dados essenciais deve ser detectada antes da abertura da primeira etapa. Um catálogo realmente vazio tem estado próprio, com acesso ao cadastro para quem pode cadastrar e orientação para pedir o cadastro ao administrador nos demais perfis. Fonte V3 registro 16, V4 registro 16 e V6 registro 53.

### 11.4 Atualização concorrente e acesso

As fichas e os Andamentos devem refletir alterações em tempo real. A faixa de atualização aparece abaixo do cabeçalho quando a alteração afeta o conteúdo em uso. Seu acesso mostra o que mudou e a consequência, preservando o preenchimento da pessoa. Fontes V3 registro 15, V4 registro 7, V5 registros 17–18 e 21.

O modal destaca as informações efetivamente alteradas, incluindo o valor anterior riscado quando pertinente. Novo andamento e alteração dos dados da ficha têm significados próprios. Na preparação de uma ficha, importam mudanças de estoque, unidade, plantão do destinatário e outros fatos que afetem aquela operação. Fonte V6 registros 51 e 67.

Se a capacidade passa a ser de consulta, a interface trata o estado e conserva o rascunho para uma eventual retomada autorizada. A opção de baixar um resumo não foi considerada necessária para esse caso. Se o acesso à residência é revogado, o aviso aparece sobre uma tela neutra. Fonte V6 registros 65–66.

## 12. Funções retiradas ou substituídas no resultado vigente

Esta lista registra o alcance funcional que importa à implementação, sem reconstituir as tentativas de desenho.

| Elemento retirado ou substituído | Resultado vigente |
| --- | --- |
| Concordância bilateral anterior à expedição de ENT/DEV | Expedição direta com os atos pessoais próprios de recebimento e cancelamento posterior. |
| COM emitida como pedido de doação | Doação registrada como chegada, avulsa ou associada a planejamento de compra. |
| Edição da quantidade de chegada por outro autor na aprovação | Administrador aprova, recusa ou pede correção a quem lançou. |
| Dependência de botão Salvar rascunho na criação | Salvamento automático e retomada pessoal. |
| Repetição de decisão familiar já feita na conciliação | Uso da decisão válida registrada no próprio ato. |
| PDF consolidado automático na simples conclusão | Geração automática no arquivamento. |
| Sucesso de emissão como etapa impressa dentro do formulário | Modal de sucesso sobre a ficha emitida. |
| Escolha única de condição de compra para todos os itens | Indicação individual de já em mãos ou chegada futura. |
| Avisos genéricos sem dizer o que mudou | Alteração e impacto concretos, no contexto em uso. |
| Bloco de detalhes e histórico inteiro em cada linha da lista de materiais | Linha principal compacta e painel de detalhes compartilhado. |
| Abertura de formulário inviável por falha essencial já conhecida | Verificação inicial e aviso de recuperação. |

Fontes das regras nas seções correspondentes. Elementos herdados que possuem equivalente funcional continuam acessíveis segundo o alcance aprovado. A simplificação da representação de contexto do laboratório não acrescenta nenhuma retirada à lista.

## 13. Tratamentos técnicos que seguem o que já foi decidido

Os pontos abaixo são consequências de integração. Eles ajudam a converter a decisão de produto em resultado correto e não constituem novas regras submetidas a aprovação.

- **Operações oficiais recuperáveis.** Repetição de clique, queda de resposta e nova consulta à mesma tentativa devem conservar a identidade da emissão, chegada, crédito, expedição ou decisão. O estado confirmado vem do registro oficial.
- **Autoridade por ato.** Ser administrador permite os atos atribuídos à administração, incluindo a autoaprovação decidida para COM/chegada. A identidade do recebedor e a autoria de uma correção continuam pessoais.
- **Vínculos e fatos físicos.** Consulta, importação, cobertura e complemento formal conservam os seus efeitos próprios. O produto só movimenta estoque nas ações que os autorizam.
- **Persistência das decisões.** Suficiência, correção, aprovação, reversão e arquivo precisam aparecer no acompanhamento, histórico, avisos e documentos pertinentes, com autoria e momento. A regra não se limita à aparência do formulário.
- **Precisão dos dados.** Unidade padrão, precisão de quantidade, tempo do saldo, disponibilidade para expedição e informação desconhecida seguem os contratos do material e dos movimentos.
- **Aproveitamento de L1.** Usar os componentes existentes para avisos, carregamentos, rascunhos, painéis, Andamentos, arquivos, comunicações e acessos, aplicando os impactos explicitamente autorizados de L2.
- **Consulta ao estado atual no fechamento do lote.** O commit examinado para a v7 foi `484d4a23a6059d795502629579426e8dc8eb6e4e` da PR #7. A futura implementação precisa se apoiar no estado então disponível e na execução atual de L1. Esse identificador é uma fotografia de referência.
- **Uma base de produção consolidada.** A orientação de L1 de consolidar a primeira versão de produção continua aplicável. A autorização para reorganizar estruturas pré-produção não suprime a trilha dos atos da versão que entrará em uso.

## 14. Pendências materiais para Renato

### P1 — Cancelar uma REQ cuja contagem já foi substituída

**A decisão já tomada** é oferecer manter ou reverter o ajuste de estoque realizado na emissão da REQ.

**A situação ainda precisa de definição específica** quando outra contagem oficial já sucedeu aquela informação. Exemplo de um mesmo material, sem movimentos intermediários para simplificar a comparação.

1. O sistema mostrava 12 unidades.
2. A REQ A informou 8 unidades e atualizou o estoque para 8.
3. Depois, uma REQ B ou um BAL aplicado confirmou uma nova contagem de 20 unidades.
4. A pessoa cancela a REQ A e escolhe reverter sua informação de estoque.

**Recomendação.** Conservar as 20 unidades da contagem posterior, registrar o cancelamento de A e explicar que o ajuste anterior já foi sucedido por uma contagem mais recente. Se só houver movimentos depois de A, o cálculo da reversão preserva esses movimentos e mostra a consequência antes da confirmação.

**Pergunta.** Você concorda que a reversão de uma REQ anterior preserve uma contagem oficial posterior e seus movimentos subsequentes, com essa explicação no modal?

**Por que precisa de resposta.** A atualização do estoque na emissão da REQ é uma mudança decidida em L2. “Reverter para antes da REQ” resolve o caso simples, mas não determina por si só a precedência entre duas contagens físicas. O código de sucessão de reconto consultado trata atribuições de BAL e não decide essa nova regra de cancelamento da REQ.

### P2 — Receber mais unidades do que foram expedidas

**A decisão já tomada** é preencher o recebimento com os valores expedidos, permitir a conferência e identificar automaticamente as diferenças. A divergência física e a avaliação da suficiência continuam sendo decisões distintas.

**A situação ainda precisa de definição específica** quando o recebimento declarado excede a expedição. Exemplo: a família expediu 10 unidades, mas o profissional informa ter recebido 12. As duas unidades adicionais ainda não estão cobertas pela saída de estoque registrada na expedição.

**Recomendação.** Registrar a declaração de 12 unidades; reconhecer inicialmente no estoque da equipe as 10 cobertas pela expedição; apresentar as outras duas em apuração. A confirmação da família sobre a saída adicional permite um ajuste vinculado à mesma entrega, debitando a origem e creditando o destino com os controles de disponibilidade pertinentes e preservando o histórico. A pessoa não precisa refazer o preenchimento inteiro. Enquanto a origem adicional não for confirmada ou esclarecida, o excedente continua identificado como pendência. Para DEV, aplicar o mesmo princípio no sentido inverso.

**Pergunta.** Você concorda com esse tratamento do excedente — declaração completa, crédito inicial limitado ao que foi expedido e regularização das unidades adicionais após a confirmação da origem — tanto na ENT quanto na DEV?

**Por que precisa de resposta.** O código examinado para a v7 impede quantidade recebida acima da expedida, tanto na validação do formulário quanto no contrato de recebimento. A v7 representa um excedente pendente, mas essa simulação não é uma decisão aprovada sobre a origem e o crédito das unidades extras. Aceitar o valor maior exige definir esse efeito de estoque, além de alterar a interface. Fonte técnica G4.

## 15. O que depende da revisão da v7

A revisão da v7 pode ratificar ou corrigir a apresentação final, inclusive distribuição dos elementos, textos, painéis, ícones e animações. A decisão vigente de negócio continua sendo a registrada aqui, acrescida das respostas e dos comentários que Renato enviar.

Duas escolhas de apresentação que a v7 adotou dentro das alternativas admitidas ficam explicitadas para essa revisão.

- Início por ficha de origem com os materiais elegíveis já importados e possibilidade de retirar a importação.
- Duas tentativas de recuperação nos erros preparados, dentro da faixa de uma ou duas pedida pelo usuário.

A representação de excedente recebido em apuração depende da resposta P2; ela não integra a lista de regras de estoque já aprovadas.

As quantidades, pessoas, datas, códigos de barras e tempos de animação dos exemplos não são parâmetros aprovados do ambiente real. Os arquivos de comentários e o HTML continuam servindo como prova da referência avaliada. O comando final será fundamentado no resultado aprovado desta consolidação e da revisão da v7.

## 16. Preferências já dadas para o futuro lote

O usuário autorizou liberdade técnica para reorganizar arquivos, nomes, módulos, pastas e implementação, inclusive os contratos e o banco quando a decisão de produto exigir. Funções reais ausentes da representação do laboratório devem seguir a aparência e os padrões aprovados. Incompatibilidades grandes que exijam decisão importante ainda aberta são registradas para Renato decidir.

O trabalho deve ser reunido em um lote coerente, com poucos commits organizados. O push depende da permissão de Renato. Essas orientações foram dadas na preparação do lote anterior e continuam como preferências de condução do trabalho. A entrega atual é a base de decisões para a redação posterior, após a revisão em andamento. Fonte M10.

## 17. Índice das fontes

### Comentários originais

Os números dos registros citados são posições no array `reviews`, começando em 1. A identificação pelo cenário e pelo estado está no próprio registro. Os arquivos preservam os textos originais.

| Referência | Quantidade | Fonte |
| --- | --- | --- |
| V2 | 50 | [hca-l02-v2-comentarios (1).json](https://chatgpt.com/library?file_id=libfile_6ab8f922af0c8191ab687b0b5c60842f&account_id=personal) |
| V3 | 56 | [hca-l02-v3-comentarios.json](https://chatgpt.com/library?file_id=libfile_0a6c29eacef48191aaf48928a3c26280&account_id=personal) |
| V4 | 56 | [hca-l02-v4-comentarios.json](https://chatgpt.com/library?file_id=libfile_230afb1712108191a598ae2ae4e98911&account_id=personal) |
| V5 | 57 | [hca-l02-v5-comentarios (2).json](https://chatgpt.com/library?file_id=libfile_4e437e6ac16c8191883c94a05524c373&account_id=personal) |
| V6 | 140 | [hca-l02-v6-comentarios.json](https://chatgpt.com/library?file_id=libfile_0078c6a70924819196e522c27ef4bc64&account_id=personal) |

### Mensagens desta conversa

| Referência | Mensagem identificável | Decisões centrais |
| --- | --- | --- |
| M0 | “Na verdade eu não sei se devemos seguir para o laboratório da REQ agora...” | Planejamento global, jornadas, laboratórios e agrupamento em lotes. |
| M1 | “Crítica geral, eu não gostei desse novo formato de ficha de requisição...” | Etapas, listas por tipo, estoque atual, autosave e conferência do recebimento. |
| M2 | “Decidi que no recebimento menor é solicitado uma nova avaliação familiar.” | Nova avaliação familiar após recebimento menor. |
| M3 | “1. uma compra tem várias etapas...” | Aprovação da COM e da chegada, autoaprovação, estoque, independência das fichas e suficiência. |
| M4 | “Eu esperava um novo laboratório versão final e ja coloque que dev segue conforme sua recomendação.” | Aceitação da direção de DEV. |
| M5 | “Como estamos fazendo em lotes e as vez tem telas que estão prontas no lote anterior...” | Impactos explícitos em L1, preservação da completude e limites L3/L4. |
| M6 | “Acabou que você fez mais um lab de processos...” | Estados preparados e revisão visual sem repetir jornadas completas. |
| M7 | “Respostas”, seguida de cinco itens. | Estoque na emissão, arquivamento e confirmação, reversão pelo administrador, reabertura sem movimento e cobertura COM. |
| M8 | “Quero uma nova versão de lab agora com meus comentários ja incluídos...” | Avaliação apenas em celular. |
| M9 | “Fiz alguns comentários, FAÇA NOVO LAB...” | Etapas finais, carregamentos, consulta a L1 e autorização expressa de impactos. |
| M10 | “Aqui estão as minhas decisões, eu quero que com base nisso ja elabore o lote ao codex...” | Liberdade de implementação, incompatibilidades materiais, poucos commits e permissão antes de push. |

### Referências de base e código consultado

- [Lote L1 consolidado](https://chatgpt.com/library?file_id=libfile_5ef8f9dc8548819186a49ce2bcef2130&account_id=personal).
- [Comentários L1 v3](https://chatgpt.com/library?file_id=libfile_1b1ed7102c1c819183dadbeb05e9f927&account_id=personal).
- [Mapeamento inicial de L2](https://chatgpt.com/library?file_id=libfile_5bd43e8278b08191accc8bef0f9bcd77&account_id=personal). Suas descrições de código são datadas e foram lidas à luz das decisões posteriores.
- [Laboratório L2 v7 em revisão](https://chatgpt.com/library?file_id=libfile_876feb346af88191b96921f3bc24056c&account_id=personal).
- G1 — [Políticas da residência no código consultado](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/components/admin/policy-console.tsx) e [editor de regras](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/components/admin/policy-rules.tsx).
- G2 — [Acompanhamento dos avisos iniciais no código consultado](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/lib/notifications/initial-tracking.ts).
- G3 — [Componente compartilhado de processamento no código consultado](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/components/ui/operation-activity.tsx).
- G4 — [Validação do recebimento no formulário consultado](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/components/documents/supply-command-fields.tsx), [contrato de quantidades do recebimento](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/supabase/migrations/20261022053539_draft_recounts_and_catalogue_contracts.sql) e [interpretação da quantidade confirmada](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/src/lib/documents/delivery-confirmed-quantity.ts).
- [Contrato de complementos formais no código consultado](https://github.com/RMZZFAJ/home-care-assistant/blob/484d4a23a6059d795502629579426e8dc8eb6e4e/supabase/migrations/20261112005024_phase_d4_document_complements.sql).

As fontes G1–G4 e o contrato de complementos são referências técnicas do estado usado na criação da v7. A conferência desta consolidação reutilizou essa fotografia para resolver dúvidas pontuais. O estado remoto futuro será conferido no fechamento do lote.
