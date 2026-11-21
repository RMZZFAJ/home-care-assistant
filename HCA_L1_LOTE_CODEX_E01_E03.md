# Home Care Assistant — Lote L1 para implementação

**Escopo:** E01–E03, padrões compartilhados e as mudanças funcionais expressamente decididas na revisão v3.  
**Data:** 13/11/2026.  
**Natureza:** ordem de execução no sistema real, com autonomia técnica e autorização obrigatória antes de qualquer push.  
**Produto:** Home Care Assistant. Não é Conecta Care.

## 1. Meta e autorização para executar

Implemente no Home Care Assistant a experiência do arquivo `hca-laboratorio-01-v3-final.html`, incorporando integralmente as decisões mais recentes de `hca-l01-v3-comentarios.json` e os critérios desta ordem. A meta é que o sistema real tenha a mesma aparência, organização, qualidade de acabamento e comportamento de interação do modelo, com as alterações solicitadas depois dele, usando os serviços e os dados reais da aplicação.

Este é um lote único de entrega. As seções abaixo organizam seu trabalho; não são comandos separados, PRs obrigatórias nem uma exigência de criar um commit por cenário. Renato decidiu seguir para implementação e revisar o resultado real. Não peça outra aprovação geral do plano, não produza outro laboratório completo e não devolva apenas uma proposta de execução.

Você está autorizado a criar, reescrever, dividir, unir, renomear, mover e remover arquivos e pastas do projeto quando isso melhorar a implementação do lote. Pode reorganizar componentes, serviços, módulos, contratos, validações, rotas, tipos e testes; alterar banco, políticas de acesso, APIs e regras de negócio nos limites das decisões desta ordem. Escolha uma arquitetura sustentável e elimine duplicações. Essa liberdade não autoriza descartar trabalho alheio, apagar arquivos pessoais, eliminar segredos/configurações necessários ou reescrever histórico remoto compartilhado.

Quando encontrar uma função existente que o laboratório não representou, preserve sua finalidade e implemente sua apresentação seguindo rigorosamente o mesmo padrão visual. Pode criar as superfícies e os elementos de apoio necessários para completar as jornadas deste lote. Não transforme a ausência de uma tela no modelo em justificativa para deixar botão sem função, esconder capacidade existente ou entregar placeholder. Também não use essa liberdade para criar módulos de negócio alheios ao objetivo.

**Resultado esperado:** percursos reais de acesso, orientação, histórico e consulta/ação sobre fichas completos no escopo definido; fidelidade visual conferida no navegador; decisões funcionais aplicadas de ponta a ponta; verificações proporcionais concluídas; poucos commits locais coerentes; tudo pronto para Renato autorizar o push e depois avaliar o Preview.

## 2. Arquivos de entrada e ordem de prevalência

Leia integralmente estes três arquivos:

1. Esta ordem: `HCA_L1_LOTE_CODEX_E01_E03.md`.
2. Modelo executável: `hca-laboratorio-01-v3-final.html`.
3. Revisão mais recente: `hca-l01-v3-comentarios.json`.

O HTML contém o histórico das revisões anteriores e o catálogo dos cenários. O JSON mais recente contém **51 registros de 51 cenários: 36 aprovações e 15 comentários; duas aprovações também têm observações escritas**. Ele cobre os 35 cenários anteriormente ajustados e os 16 exemplos novos. Os demais cenários continuam disponíveis como referência; não há exigência de submeter novamente os 141 à aprovação humana.

Identificação dos anexos conferidos:

| Arquivo | SHA-256 |
| --- | --- |
| HTML v3 | `5d328faa961136beb4b7e814b0c9dcf54adb5058f67890d6f36cd0be85fb0986` |
| Comentários v3 | `2d36f27eedd600d3048f59edeef67db546eed6c2450b172e1d8f359efaa4d78a` |

Aplique a seguinte hierarquia:

- Instruções novas e específicas de Renato e o texto dos comentários v3 prevalecem sobre o comportamento demonstrado anteriormente.
- Esta ordem consolida a execução, as escolhas técnicas delegadas, os limites e as reservas explícitas. Em caso de dúvida sobre sua síntese, confira o registro original correspondente.
- O HTML v3 é a referência visual e de interação para tudo que não foi modificado pela revisão mais recente. Use também as decisões anteriores incorporadas nele quando não tiverem sido superadas.
- O repositório atual informa a implementação e os contratos vigentes. Contratos incompatíveis com mudanças expressamente aprovadas devem ser adaptados; sua existência não é motivo para voltar a perguntar uma decisão já tomada.
- Textos históricos como “proposta”, “aguardando aprovação”, congelamento antigo dos rascunhos ou preservação de compatibilidade pré-produção não anulam as decisões posteriores desta ordem.

O campo `sourceCommit` dos comentários e os números de versão do laboratório são referências históricas. Não use esses hashes para retroceder o código atual.

## 3. Continuidade da D-B e ponto de partida

Antes de editar, faça uma checagem curta do checkout, branch, HEAD, alterações locais, PR e planejamento vigente. Leia o `AGENTS.md` aplicável e os documentos de trabalho realmente necessários. Identifique o que já foi entregue pela D-B para reaproveitar seus recursos.

Na conferência remota que fundamentou esta ordem:

- `master`: `8ec979aac340bbc19ec64288bf0acf3abea4711a`, anterior à D.
- Candidato D-B: `feat/phase-d-implementation`, `77acdfcebbe7a346ba02d72f95be1216a1697ab3`.
- PR #7: aberta, em draft, ainda não integrada à master.
- A CI daquele candidato terminou com falha no grupo `ios-2` e no agregador `database-and-browser`; SonarCloud também estava com falha. Vercel estava com status de sucesso. Isso não é um diagnóstico da causa de cada falha.

Esses dados são um checkpoint, não uma instrução para usar uma base desatualizada. Verifique o estado efetivo ao iniciar. A conversa nova deste lote deve começar depois que a execução anterior tiver parado em um checkpoint identificável. Não mantenha duas execuções escrevendo no mesmo checkout. Preserve alterações locais e não faça `reset --hard`, limpeza forçada ou descarte para produzir uma árvore aparentemente limpa.

Use uma branch de trabalho própria quando isso facilitar a separação do lote, a partir da base que efetivamente contém a D-B mais recente. Se a D-B continuar sem merge, não comece da master anterior a ela. É permitido usar branch derivada/worktree isolada e registrar sua base. Não faça merge, publique branch, atualize PR ou execute push nesta preparação.

Registre o estado inicial de forma breve. Não reinicie a auditoria das fases A–E, não reproduza todo o histórico da D-B e não trate cada diferença de documentação como nova investigação. Corrija no lote as regressões que ele causar e os problemas diretamente necessários à entrega. Falhas preexistentes fora desse alcance devem ser identificadas honestamente, sem encobrir resultados e sem ampliar automaticamente a missão.

## 4. Fidelidade visual e superfícies abrangidas

Abra o modelo no navegador e percorra as composições antes de substituí-las no sistema. Extraia seus padrões de layout, tipografia, espaçamento, cores, bordas, ícones, estados e responsividade para componentes reais da aplicação. Não basta reutilizar textos e aproximar a tela com cartões genéricos.

Referências concretas do modelo incluem Inter com alternativas de sistema, verde principal `#156f66`, texto `#193332`, fundo `#f4f6f5`, superfícies brancas, bordas suaves, hierarquia compacta, botões e campos consistentes. Os valores completos e as variações estão no próprio HTML. Ajustes por acessibilidade, texto real ou dispositivo são permitidos mantendo o resultado visual reconhecível.

Implemente o shell, cabeçalhos, contexto, menus lateral/inferior/Mais, navegação, listas, filtros, paginação, abas, tabelas, cartões, acordeões, diálogos, gavetas, formulários, avisos, carregamentos, sucessos, erros e recuperação abrangidos pelas jornadas. Preserve a mesma identidade entre perfis; permissões determinam dados e ações, não uma aplicação visual diferente para cada função.

Use o conteúdo dentro da aplicação simulada como referência de produto. Barra L01, seletor de cenários, painel de revisão, relógio fictício, botões para simular alterações, dados preparados, tempos artificiais e indicadores de laboratório são ferramentas de avaliação. Não os leve à interface de produção nem copie o motor de simulação como backend real.

Priorize desktop e celular, incluindo larguras próximas de 360 e 412 px e o uso no S24 Ultra/Chrome/PWA. Confira teclado, foco, toque, menus, alvos de ação, modais e rolagem. Não esconda conteúdo essencial para fazer uma captura parecer correta. Cor e ícone devem ter texto ou identificação acessível quando comunicarem informação essencial.

O núcleo é E01–E03. As alterações funcionais expressas nesta revisão que atingem REQ/ENT, DEV, comunicações e validação pública entram neste lote com todas as dependências necessárias. Não as adie apenas porque seu aprofundamento visual original estava em E04–E12. Isso também não antecipa a revisão integral de todos os processos dessas etapas futuras.

## 5. E01 — Acesso, conta e contexto

Implemente os percursos do modelo: entrar, recuperar/definir senha, entrar por Google, receber/aceitar/recusar convite, reconhecer conta incompatível, escolher residência/função, tratar sessão expirada ou acesso revogado e usar MFA conforme a política aplicável.

### 5.1 Retorno e contexto

- Após autenticação, restaure a consulta/destino recente e autorizado, com seus filtros, paginação e contexto, sem impor uma seleção redundante de paciente.
- A janela de retorno recente aprovada no modelo é de **30 minutos**. Revalide sessão, vínculo, paciente, capacidade e destino; o tempo sozinho não concede acesso. Destino antigo, inválido, de outro usuário ou sem contexto confirmado segue à seleção/início apropriado.
- Links para outro paciente mostram a mudança de contexto; Voltar restaura a origem real. Evite redirecionamento aberto e mistura de dados entre residências.
- Um único vínculo permite entrar diretamente. “Mudar paciente ou função” permanece visível, mas desabilitado, inclusive no seletor do cabeçalho.
- Identifique explicitamente **Função** no convite. Conta global não recebe automaticamente autoridade local.

### 5.2 Senha, convite e MFA

- Política aprovada: **mínimo de 8 caracteres, maiúscula, minúscula, número e símbolo**, respeitando o limite técnico de 72 bytes UTF-8. Aplique a mesma regra em criação, convite e recuperação, com validação coerente no cliente, servidor e configuração efetiva de autenticação. Não deixe a UI anunciar um critério que o serviço real rejeita ou ignora.
- Google aparece tanto no acordeão de entrada quanto no cadastro pelo convite. Mantenha o convite no retorno da autenticação e confira a identidade antes de permitir decisão.
- Convite emitido não tem seu conteúdo editado retroativamente; alteração de conteúdo exige revogar/cancelar e emitir outro. Estados legítimos de expiração, recusa, revogação e aceite continuam existindo.
- Na tentativa de cadastro de quem já possui conta, preserve o convite e oriente o retorno à entrada usando a informação que o contrato seguro permite. Não implemente enumeração pública de contas para reproduzir uma mensagem do exemplo.
- A saída da configuração voluntária de MFA é **“Continuar sem configurar agora”**. Preserve MFA obrigatório onde já é exigido; a revisão não aprovou uma nova política global nem frequência arbitrária de lembretes por residência.
- Feedback de autenticação deve ser percebido junto ao formulário, com foco/rolagem coerentes e preservação dos campos pertinentes. Não use mensagem genérica de sucesso quando o resultado for incerto.

## 6. E02 — Início, avisos, histórico e suporte

- Reproduza a composição do início por contexto e capacidade. Para família/administração, em tela estreita, os blocos seguem **Suas pendências → Avisos → Requisições em aberto**, preservando as demais áreas no lugar coerente do modelo.
- O X em “Precisa de atenção” oculta aquele aviso por **24 horas**, por usuário/paciente/aviso. Não resolve a pendência. Se continuar ativa, reaparece; se já foi resolvida, não reaparece artificialmente. Profissionais não recebem X para dispensar obrigação de BAL.
- Use **Registrar consumo** como atalho profissional.
- BAL obrigatório fica em “Precisa de atenção”, com Fazer balanço e Solicitar adiamento/Adiar. Evite duplicá-lo como ação rápida.
- Pedido de adiamento exige justificativa de 3–1000 caracteres e plantão elegível do mesmo paciente. Use as regras reais de capacidade, atribuição, prazo, plantão publicado e versão. O pedido aguarda decisão familiar e não muda prazo, responsável ou estoque por si só. Não confunda solicitar com aprovar ou com transferência automática para qualquer próximo plantão.
- A preferência **Simples/Completa** fica em Meu perfil. Preserve sua disponibilidade para quem a utiliza; não redesenhe todo E11 apenas para mover esse controle.
- Histórico preserva busca, filtros, página e contexto ao abrir ficha e voltar. Aplicar filtros recolhe a área, inclusive quando a lista ficar vazia. Contexto diferente não reutiliza resultado de outro paciente.
- Diferencie lista vazia, busca sem resultados, falha, restrição, carregamento inicial e atualização. Na reconsulta, mantenha o comportamento aprovado de carga; em falha, a lista anterior autorizada pode ser recuperada explicitamente e identificada como anterior. Não substitua erro ou falta de acesso por zero registros.
- Página de endereço indisponível: ícone de erro, caminho de retorno e “Detalhes para suporte” recolhidos. Acrescente explicação curta, por exemplo: **“Estas informações ajudam a identificar o problema. Copie e envie ao suporte se precisar de ajuda.”** Mostre somente dados diagnósticos apropriados, sem tokens, credenciais ou conteúdo clínico desnecessário.

## 7. E03 — Estrutura comum das fichas

### 7.1 Cabeçalho, progresso e atualização

- Estrutura comum para REQ, COM, ENT, DEV e BAL, com identidade, número, estado, ações, metadados, urgência e ciência quando pertinentes.
- Macroprogresso inicialmente recolhido em uma barra; expansão mostra as etapas horizontais. Não force ciência e atendimento a uma sequência artificial.
- Durante a rolagem, mantenha a identificação compacta da ficha com os indicadores úteis. “Próximo passo sugerido” fica abaixo das ações e pode ser dispensado.
- Observações da emissão numeradas e preservadas como conteúdo de origem. Um andamento posterior não reescreve essa observação.
- Alteração externa relevante deve gerar percepção confiável. Use atualização em tempo real quando adequada; a faixa persistente sob o cabeçalho com **Atualizar agora** é a experiência aprovada. Escolha o mecanismo de invalidação/reconsulta compatível com a infraestrutura, sem inventar alteração ou sucesso.
- Preserve o preenchimento e o ponto de trabalho ao atualizar. Enquanto a cópia da ficha estiver desatualizada, bloqueie **nova geração** de PDF com explicação. Mantenha a consulta de exemplares já emitidos conforme a autorização. A faixa sai após atualização confirmada ou reentrada que realmente carregue o estado atual.
- Retire a aba de versões da navegação principal. Identificação técnica e auditoria autorizada continuam acessíveis de modo discreto, segundo a seção 13.

### 7.2 Materiais e atendimento em uma composição única

**Decisão mais recente E03-01:** eliminar a repetição das mesmas linhas nas abas Materiais e Atendimento. Entregue uma única aba, adotando **Materiais** como nome curto, reunindo a lista, o status do atendimento, os vínculos e os detalhes necessários. É permitido organizar seus detalhes por expansão, sem repetir a tabela inteira.

Na REQ:

- Mantenha a identificação do material. As duas colunas de dados pedidas são **Estoque observado** e **Status de atendimento do item**. Portanto, não elimine o nome do material por interpretar literalmente “apenas duas colunas”.
- Retire a coluna de prioridade. Item urgente usa fundo/tom vermelho discreto e filete vermelho junto à borda esquerda da identificação; rotina conserva aparência neutra. Identifique urgência também de maneira acessível, sem criar outra coluna.
- Acrescente filtros **Todos, Urgentes, Pendentes, Atendidos e Rotina**. Parcialmente atendido continua entre os itens em aberto; deixe sua situação explícita. Não faça “pendente” esconder a necessidade remanescente.
- Preserve diferenças entre estoque observado zero, desconhecido, não informado e informação restrita.

Aplique a mesma qualidade visual em COM, ENT, DEV e BAL quando pertinente, conservando as colunas necessárias de cada domínio: adquirido, enviado, aceito, contado etc. Não converta todos esses fatos em “atendimento de REQ”.

## 8. Regra nova — atendimento da REQ decidido pela família

Esta alteração está **aprovada para implementação** e pode exigir banco, funções, contratos, projeções, formulários, notificações e testes. Não mantenha como regra universal que qualquer aceite positivo em ENT encerra o atendimento de uma linha da REQ.

REQ continua **sem quantidade solicitada**. A família pode entender que um pacote entregue atende apenas parte da necessidade, mesmo que a quantidade física desse pacote tenha sido integralmente recebida.

Implemente:

1. Ao preparar/expedir uma ENT vinculada à REQ, a pessoa com autoridade familiar efetiva informa, por item pertinente, se essa entrega pretende atender a necessidade **parcialmente** ou **por completo**. Torne a escolha clara e consciente; não esconda uma conclusão automática.
2. Essa decisão é registrada com autoria e momento. O destinatário é informado e a vê no contexto de confirmar o recebimento, em leitura. Confirmar quantidades recebidas não lhe concede o poder de alterar a avaliação familiar.
3. A escolha da família não comprova expedição, recebimento ou movimento de estoque. Preserve os fatos físicos e as confirmações reais. Preparar/emitir uma entrega não equivale a recebê-la.
4. A linha passa a distinguir pendente, parcialmente atendida e atendida. Parcial permanece aberta para complementação futura. Um aceite positivo não promove a linha a atendida por inferência quantitativa.
5. Integre a informação à consulta, aos contadores, filtros, progresso, pendências, notificações, vínculos e conteúdo documental pertinente. Não deixe a nova regra funcionar somente na tela de emissão.
6. Cancelamento, recusa, diferença no recebimento e concorrência precisam conservar os fatos e não gerar uma conclusão por inferência quantitativa. Há uma exceção material ainda não decidida: família marcou atendimento completo, mas o recebimento físico foi menor que o expedido. Não acrescente automaticamente uma nova confirmação familiar nem declare resolvida a suficiência dessa quantidade. Trate a exceção conforme R3, sem bloquear a implementação da escolha familiar, do status parcial e da comunicação ao recebedor. Regras novas de reabertura ou de prioridade entre múltiplas decisões materiais também devem ser registradas quando não puderem ser resolvidas pelas decisões já expressas.

Reaproveite o mecanismo existente de autorização, idempotência e confirmação. O nome de uma coluna, enum ou RPC fica a seu critério. O significado da decisão e a separação dos fatos acima são obrigatórios.

## 9. Andamentos, privacidade e referências

- Mantenha cronologia crescente, sem agrupar artificialmente por fase. Eventos automáticos são compactos com detalhes secundários expansíveis; registros manuais têm leitura mais completa.
- Aplique fundos suaves correspondentes ao significado, além dos ícones: automático neutro, marco importante verde, atenção âmbar e cancelamento vermelho. A escolha deve resultar em boa leitura, sem grandes áreas saturadas.
- Nota privada precisa de identificação textual clara para seu leitor autorizado, por exemplo **“Privado · família e pessoas mencionadas”**. Não use apenas cor.
- Preserve filtros de tipo e período, recolhimento e altura máxima da cronologia. Corrija o encadeamento da rolagem: ao chegar ao início/fim da área interna, roda do mouse e gesto de toque devem permitir continuar pela página. Não prenda o usuário com `overscroll-behavior` ou captura de eventos inadequados. A cronologia não deve exigir rolagem horizontal.
- `@` sugere pessoas elegíveis e `@todos`; `#` permite referências. Amplie as referências para incluir **andamentos**, além de fichas, com resultados distinguíveis, título/trecho suficiente e identificação estável. Ao abrir, leve ao registro autorizado, expandindo/destacando-o quando necessário. Não use a posição numérica atual da lista como identidade durável.

### 9.1 Visibilidade obrigatória

- Privado familiar é visível à família autorizada e às pessoas explicitamente mencionadas e elegíveis. Menção não cria vínculo, capacidade ou acesso à ficha que a pessoa não possua.
- Quem não pode ler a nota não deve receber conteúdo, contagem denunciadora, trecho, referência, notificação, resultado de pesquisa ou informação de auditoria que revele sua existência. Implemente a regra na autorização/consulta real, não só escondendo DOM.
- **Mudança v3 E03-60:** se o texto contiver `@todos`, a opção de privado fica indisponível e o andamento será público **para as pessoas que já têm acesso à ficha**. Isso não significa publicação na internet.
- Ao inserir `@todos` em uma composição antes privada, mostre imediatamente que a visibilidade passará a “Todos com acesso à ficha”; bloqueie a seleção de privado e deixe essa consequência clara antes do comando de publicar. Revalide no servidor. Não remova a menção silenciosamente nem mantenha a antiga escolha de publicar privado com `@todos`.
- Ao remover `@todos`, a escolha de privado pode voltar a ficar disponível. Não altere silenciosamente a visibilidade de um registro já publicado.
- Referências e prévias respeitam a autorização do destino, inclusive quando o destino é outro andamento privado. Não use a referência como atalho para revelar conteúdo a uma audiência maior. Se necessário, impeça uma combinação incompatível de referência/visibilidade com orientação para ajustar a composição.

## 10. Rascunhos, operações incertas e anexos retomáveis

### 10.1 Simplificação aprovada dos rascunhos

Renato considerou os cenários de comparação e salvamento incerto confusos. Simplifique a experiência; não reconstrua o painel técnico de versões.

- Ao abrir o editor, apresente **“Continuar o rascunho?”**, uma prévia do conteúdo e quando foi salvo. As decisões principais são continuar ou descartar/começar novo, com proteção clara contra perda acidental.
- Mantenha o rascunho restrito ao usuário, paciente, ficha e operação corretos. Preserve o escopo dos quatro campos já definido — categoria, etapa, texto e referências — e o salvamento explícito. Este lote não solicita autosave universal.
- Destaque, menções e visibilidade precisam ser novamente reconhecidos/confirmados quando não fizerem parte do dado salvo; um `@todos` restaurado também precisa obedecer à regra atual de visibilidade.
- Se outra sessão salvou uma alteração, explique em linguagem comum que existe um rascunho mais recente. Preserve o texto local e permita uma escolha explícita de qual conteúdo continuar. Uma comparação detalhada pode ficar recolhida quando necessária; não imponha painéis técnicos paralelos como percurso normal.
- Simplificação visual não autoriza sobrescrever silenciosamente uma alteração concorrente. Uma escolha de substituição deve ser consciente e revalidar o estado atual.
- Salvamento privado com resultado incerto: diga o que ainda não foi confirmado e ofereça **Verificar salvamento**. Não anuncie perda, sucesso ou necessidade de reenviar sem consultar a tentativa existente.

### 10.2 Operação oficial e resultado incerto

Rascunho privado é diferente de uma publicação/ciência/envio oficial cujo resultado se perdeu. Preserve o conteúdo capturado e a identidade dessa tentativa. Verificar resultado consulta/recupera a mesma operação; não cria uma segunda publicação, ciência, entrega ou anexo.

Mantenha saída para fechar por enquanto, reabrir e verificar. Evite editor travado sem controle de recuperação. Para ciência, use processamento progressivo e consultas automáticas limitadas antes de apresentar incerteza; o modelo usa até duas verificações. Mensagens de progresso devem refletir fatos conhecidos, sem afirmar entrega de notificação ou escrita confirmada antes da resposta.

### 10.3 Retomar anexo no próprio cartão

Em E03-34, **Retomar envio** deve continuar no cartão do anexo pendente: preparação, envio/verificação, resultado ou erro e ação de recuperação. Preserve arquivo, destino e tentativa quando ainda disponíveis. Não transfira automaticamente o usuário ao formulário de primeiro envio para exigir o mesmo comando novamente.

Se o navegador perdeu os bytes ou a autorização do arquivo, peça a seleção necessária dentro desse contexto, explicando por quê. Não finja poder restaurar um arquivo indisponível. Não abandone uma reserva que tenha envio/resultado pendente sem primeiro reconciliar a situação.

PDF, imagem, documento de texto e outros tipos já suportados devem ter ícones reconhecíveis, extensão/rótulo e nome legível, tanto em Arquivos gerados quanto em Anexos. Não são necessários logotipos de Adobe/Microsoft. A menção ao ícone DOCX não autoriza, sozinha, ampliar os formatos aceitos pelo upload. Preserve os limites e controles reais de arquivo, salvo mudança expressa desta ordem.

O arquivo simplificado que o laboratório gera para demonstrar a ação não substitui o layout documental/PDF já aprovado no projeto. Preserve a referência impressa consolidada e seu mecanismo real de emissão/assinatura, adaptando os dados e os pontos expressamente solicitados. “Consolidar V1” não significa voltar ao primeiro desenho experimental do PDF.

## 11. Comunicações da ficha

Transforme a aba em uma central coerente das comunicações vinculadas àquela ficha: avisos internos, Push, e-mail, WhatsApp e outros canais efetivamente suportados. Organize a informação por finalidade/importância, destinatário, canal, momento, estado e tentativas. Dê destaque a avisos operacionais importantes, como ciência familiar e ENT expedida aguardando recebimento.

- Diferencie criação do aviso, fila, tentativa, aceitação pelo provedor, envio, falha, leitura conhecida e resultado desconhecido, conforme os fatos que cada canal realmente fornece. “Sem confirmação de leitura” não é o mesmo que “não lido”.
- Ciência familiar, confirmação de recebimento e leitura de comunicação continuam atos independentes.
- Permita à pessoa autorizada selecionar uma comunicação reenviável, o canal disponível e confirmar o reenvio. Exemplo obrigatório: a família reforçar o pedido de confirmação de uma ENT ainda pendente.
- Cada reenvio deliberado é uma nova tentativa ligada à comunicação/finalidade original. Recuperar resposta perdida de uma tentativa continua usando sua identidade original. Não confunda as duas operações nem envie duas vezes por um clique repetido.
- Revalide destinatário, acesso, paciente, estado atual da ficha e se o aviso ainda faz sentido. Respeite limites de envio e controles existentes, com feedback claro; não acrescente frequência automática de cobrança ou custo por decisão implícita.
- Não prometa leitura ou entrega que o canal não comprova. Abrir um link de WhatsApp não prova que a mensagem foi enviada. Se esse for o mecanismo existente, identifique corretamente a abertura/encaminhamento externo e os limites de confirmação.
- Você pode criar/adaptar contratos, persistência, projeções e integração necessárias. Reutilize provedores aprovados e configurados. Se um canal depende de contratação, credencial ou política comercial ainda inexistente, conclua o restante, mostre a indisponibilidade real e registre exatamente a dependência. Não simule sucesso nem escolha um serviço pago por conta própria.
- Notificações e mensagens não podem vazar texto de andamento privado para pessoa ou dispositivo sem autorização.

Aprofundar esta aba não exige reconstruir todas as preferências, dispositivos e administração de comunicações de E11. Implemente as dependências concretas que a tornem funcional.

## 12. DEV e validação pública com duas camadas

### 12.1 Devolução

DEV passa a ter identificação e numeração próprias, com a mesma estrutura visual das demais fichas. Pode existir sem ENT de origem ou manter uma referência opcional a uma entrega anterior.

A identidade deve ser coerente na emissão, histórico, consulta, vínculos, APIs/projeções pertinentes, PDF e validação. Não entregue apenas uma troca de sigla no cabeçalho enquanto o restante apresenta a mesma ficha como ENT. É permitido reutilizar o motor de transferência/recebimento internamente; a modelagem deve sustentar a distinção de produto e sua numeração. Preserve origem/destino, permissões, confirmação de recebimento e efeitos de custódia/estoque aplicáveis à devolução.

### 12.2 Verificar documento

Mantenha a validação em página própria e diferencie:

- consulta por código: localiza uma emissão;
- conferência de arquivo: verifica se aquele exemplar corresponde ao registro e quais garantias técnicas foram confirmadas;
- emissão não localizada, arquivo diferente e serviço indisponível: resultados distintos, sem concluir fraude/falsificação automaticamente.

Implemente duas camadas no mesmo percurso:

1. **Pública:** resultado e metadados verificáveis necessários, incluindo identificação do emissor/assinatura técnica quando disponível e pertinente. Não exponha dados do paciente, materiais, notas ou detalhes pessoais apenas porque alguém possui um código.
2. **Autenticada e autorizada:** mais detalhes, autoria de geração da cópia e informações de assinatura/autoria disponíveis no contrato real. Login sozinho não basta: confira vínculo, contexto e capacidade de ler o documento.

O comando para entrar deve manter o contexto da verificação. Após autenticar, volte à mesma emissão/página e amplie os detalhes permitidos; não encaminhe automaticamente à home. Se for preciso escolher contexto, preserve o destino de verificação. Se a pessoa autenticada não tiver acesso, conserve o resultado público e explique a limitação sem revelar conteúdo protegido.

Distinga **quem gerou o exemplar**, **quem registrou/emitou a ficha** e **qual entidade/chave/certificado realizou a assinatura técnica**. Não atribua assinatura pessoal ou ICP-Brasil a quem apenas clicou em Gerar PDF. O laboratório não realiza criptografia; no sistema, conecte a experiência à verificação real já existente e amplie seus metadados de maneira autorizada.

## 13. Decisão transversal — uma V1 de produção, sem legado de teste

**Esta decisão já foi tomada por Renato. Não pedir novamente se deve haver compatibilidade com dados ou documentos experimentais anteriores ao lançamento.** O banco local/remoto utilizado até aqui contém dados de teste; a primeira versão colocada em produção será a V1 consolidada.

Consequências autorizadas:

- Remova caminhos de compatibilidade, adaptadores, formatos de transição, templates antigos e código duplicado que existam exclusivamente para sustentar dados/documentos experimentais descartáveis.
- Consolide contratos e nomes correntes. Versões internas de experimentação visual, inclusive os muitos ajustes do PDF, são histórico de trabalho; não precisam virar opções operacionais permanentes.
- Escolha a estrutura final correta, mesmo que demande nova migration, alteração de payload, mudança de tipo ou atualização dos consumidores. Não escreva um subsistema de migração de dados fictícios para justificar compatibilidade que foi dispensada.
- Preserve um caminho reproduzível para instalar a estrutura final em banco vazio e atualizar o ambiente de desenvolvimento conforme a estratégia escolhida. Não adulterar silenciosamente o histórico de migrations já aplicadas em um ambiente compartilhado é uma necessidade de execução, não obrigação de manter o domínio antigo.
- Dados/fixtures de testes automatizados podem ser atualizados à estrutura consolidada. Não faça a UI reproduzir estados legados apenas para manter snapshots antigos.

**O que continua necessário:** concorrência, revisão técnica usada para impedir sobrescrita, autoria, trilha de atos, recuperação idempotente, integridade e imutabilidade dos exemplares emitidos pela versão consolidada. Isso não constitui compatibilidade com produto anterior. “Uma V1” não significa apagar a história futura de uma ficha ou permitir reescrever um documento oficial.

O lote permite preparar e aplicar alterações de schema/contratos nos ambientes de desenvolvimento/homologação identificados. A limpeza final para entrada em produção é uma operação própria: não execute um reset destrutivo amplo de ambiente remoto apenas para economizar trabalho ou deixar a revisão visual vazia. Se for indispensável destruir/recriar um ambiente específico, apresente o alvo e a operação concreta para autorização antes de executá-la; isso não reabre a decisão sobre abandonar compatibilidade. Preserve o trabalho da D-B até seu checkpoint e não faça uma limpeza indiscriminada do repositório fora das dependências do lote.

## 14. Reservas expressas e uma exceção contratual a decidir

Estas reservas afetam apenas os pontos indicados. Continue todo o restante autorizado.

### R1 — “Parecer” do BAL

E03-04 pede explicação antes da decisão. Portanto, **não considere aprovada a troca global de “parecer” por “revisão”, nem uma alteração do significado desse ato**. Preserve provisoriamente o comportamento atual, aplicando o padrão visual comum. Registre essa reserva na entrega.

O contrato vigente distingue contagem física, avaliação por outra pessoa habilitada e aplicação ao estoque. O parecer é essa avaliação registrada, com autoria, observações e avaliações por item quando expressas; não é uma nova contagem e, no regime novo, não aplica estoque por si só. No regime obrigatório, a aplicação tem requisitos próprios; no facultativo, o parecer posterior não repete uma aplicação já realizada pela contagem. Renato decidirá a nomenclatura após compreender isso. Uma eventual autorização futura para trocar o rótulo não implica automaticamente remover esses controles.

### R2 — Fichas complementares

E03-01 pergunta o que é o recurso e por que emitir outra ficha. Isso **não é ordem para remover o recurso, torná-lo obrigatório ou alterar sua regra de negócio**.

No contrato atual, uma ficha complementar é uma ficha nova, com identidade/emissão próprias, formalmente vinculada à anterior com motivo, autoria e momento. Pode ter tipo diferente, respeitados mesmo paciente, ordem de emissão, estados e capacidades. A ação “Emitir nova ficha” inicia uma ficha própria e depois permite estabelecer o vínculo; não significa editar a emissão original. O vínculo sozinho não confirma ciência, não entrega/recebe material e não movimenta estoque.

Preserve o recurso existente e seu acesso autorizado; sua apresentação pode receber o acabamento comum e uma explicação mais clara, sem inventar obrigação. Mudança de finalidade, regras de elegibilidade, remoção ou substituição por outro mecanismo fica para decisão de Renato.

### R3 — Atendimento completo indicado pela família, com recebimento físico parcial

A revisão autorizou a família a decidir suficiência e o recebedor a confirmar o fato físico. Não estabeleceu se uma aceitação quantitativamente menor deve invalidar a avaliação familiar anterior ou exigir reconfirmação. Como a REQ não tem quantidade solicitada, uma quantidade menor ainda pode ser suficiente.

Não trate uma regra nova de reconfirmação como aprovada. Registre essa exceção para Renato decidir entre preservar a classificação familiar expressa ou solicitar nova avaliação familiar diante da divergência, indicando sua recomendação e os efeitos em pendências/conclusão. Não atribua essa decisão ao recebedor. O restante do atendimento por item e das melhorias deste lote está autorizado e deve avançar; identifique o tratamento dessa exceção como reservado, sem apresentá-lo como concluído por suposição.

## 15. Liberdade técnica, incompatibilidades e limite de escopo

Resolva autonomamente composição de componentes, nomes de arquivos, divisão de módulos, rotas internas, estado de UI, índices, ajustes de queries, contratos e organização das migrations. Não transforme decisões de engenharia reversíveis em perguntas de produto.

Os seguintes temas já autorizam mudanças reais, mesmo quando o código atual disser outra coisa: atendimento parcial decidido pela família; central de comunicações e reenvio autorizado; privacidade e `@todos`; referência a andamentos; identidade DEV; política de senha aprovada; continuidade da validação após login; fim da compatibilidade pré-produção; simplificação visual dos rascunhos. Não registre sua mera existência como impedimento.

Registre para Renato apenas incompatibilidades grandes que exijam uma escolha material ainda não tomada, como nova autoridade para alterar um ato, mudança irreconciliável de efeito de estoque/assinatura, exposição adicional de dados pessoais, obrigação financeira externa ou remoção de uma função sem equivalente autorizado.

Use um registro curto por decisão: **ponto, cenário afetado, incompatibilidade concreta, opções viáveis, recomendação, consequência de cada opção e parte que pode continuar**. Suspenda somente o trecho dependente. Não invente regra importante para encerrar uma pendência, não oculte a divergência e não paralise todo o lote por ela.

## 16. Organização da execução, commits e push

Organize internamente o lote em poucas frentes, podendo ajustá-las conforme as dependências reais:

1. base compartilhada, E01 e E02;
2. estrutura das fichas e ações comuns;
3. contratos e integrações das decisões novas;
4. acabamento, verificação integrada e documentação curta.

Não é necessário pedir autorização entre essas frentes. A meta sugerida é **2–4 commits locais coerentes, preferencialmente 3**, agrupando mudanças relacionadas. Não crie commit por tela, comentário, cenário, teste ou pequeno ajuste de redação. A quantidade é orientação de organização, não motivo para produzir um commit impossível de revisar; se uma divisão adicional for necessária, justifique brevemente.

Commits locais não disparam a CI remota. O controle principal é concentrar a publicação: prepare e valide o conjunto localmente e peça autorização para **um push do lote consolidado**. Não desative workflows, não enfraqueça gates, não altere gatilhos de CI e não use skip-CI para contornar verificações.

**Antes de qualquer push, pare e peça autorização explícita de Renato.** A regra também vale para criar a branch remota, publicar commits por outra ferramenta/API e realizar push de correções posteriores. Autorizações antigas de publicação automática da D-B não valem para este lote.

No pedido, apresente um resultado concreto e revisável: branch/base/HEAD, commits locais, resumo das mudanças, validações e resultados, migrations/configurações aplicadas ou pendentes, decisões reservadas e comando/destino de push pretendido. Não peça permissão antes de fazer o trabalho local autorizado.

Depois de autorizado, faça o push do conjunto aprovado e acompanhe os checks dessa cabeça e o Preview. Corrija problemas reais; um novo conjunto de commits a publicar exige novo pedido de push. Não faça merge, marque liberação de produção nem publique release sem autorização correspondente. A execução não deve se autodeclarar aprovada visualmente por Renato.

## 17. Verificação proporcional e critério de entrega

Use os testes e gates existentes. Faça verificação focada onde há risco material de regressão: isolamento entre pacientes, visibilidade privada, novos estados de atendimento, confirmação física/estoque, rascunho concorrente, recuperação sem duplicação, reenvio de comunicação e validação contextual. Ajustes simples de texto/ícone/estilo exigem inspeção proporcional, não uma bateria nova por detalhe.

No navegador, compare aplicação e modelo na mesma largura e estado. Verifique visualmente composições representativas de acesso, início, histórico, REQ, COM, ENT/DEV, BAL, comunicações, arquivos/anexos e validação. Inclua um exemplo de erro/recuperação e um estado móvel com tabela, modal e rolagem. Os cenários do laboratório são mapa de comportamento; não é obrigatório cadastrar manualmente 141 condições no banco.

Use fixtures/dados sintéticos e mecanismos de teste existentes para reproduzir caminhos relevantes. Não envie notificações reais a pessoas não envolvidas só para produzir evidência. Não reinvente um segundo backend ou ferramenta de testes maior do que a entrega. Quando os riscos concretos e gates exigidos estiverem resolvidos, encerre a verificação; não amplie para contraprovas e auditorias sem uma falha ou dúvida real a resolver.

Critérios mínimos:

| Critério | Resultado verificável |
| --- | --- |
| Aparência | Layout, proporções, tipografia, cores, densidade, ícones e componentes reconhecíveis como o modelo, com as alterações v3 aplicadas. |
| E01/E02 | Retornos, contexto, convites, senha, MFA pertinente, avisos 24h, histórico e ações funcionam com o backend real. |
| Materiais | Uma composição útil, sem repetição de tabelas; urgência sem coluna exclusiva; filtros coerentes. |
| Atendimento REQ | Escolha familiar parcial/completo persistida e comunicada; recebimento e estoque independentes; parcial continua aberto. |
| Andamentos | Cronologia legível, referências funcionais, fundos por significado, privado identificado e sem vazamento. |
| Rolagem | Ao atingir limites internos, o usuário consegue continuar a rolagem da página. |
| Rascunhos/recuperação | Retomada simples; texto preservado; conflito sem perda silenciosa; confirmação incerta sem duplicar atos. |
| Anexos/PDF | Retomada no cartão, ícones por tipo, arquivos gerados separados; nova geração aguarda atualização da ficha. |
| Comunicações | Finalidade, destinatário, canal e tentativas reais; reenvio autorizado; sem falsa confirmação de entrega/leitura. |
| DEV | Identidade/número próprios e coerência dos consumidores; origem ENT opcional. |
| Validação | Público mínimo, informação técnica verdadeira, login retorna ao mesmo contexto, detalhes exigem autorização real. |
| V1 | Estrutura consolidada, sem compatibilidade mantida apenas por dados de teste, com rastreabilidade futura preservada. |
| Continuidade | D-B preservada, nenhuma publicação sem autorização e reservas/incompatibilidades materiais visíveis. |

Entregue uma síntese única do que mudou, um pequeno conjunto de capturas/comparações úteis e um roteiro curto para Renato validar os pontos novos no sistema. Atualize o planejamento e a documentação afetada de forma concentrada, distinguindo implementado, verificado, dependente de ambiente e reservado ao proprietário. Não crie um dossiê por componente.

## 18. Mapa das observações textuais da v3

Este mapa evita omissões e permite relacionar a execução ao JSON original. As aprovações sem texto mantêm os comportamentos correspondentes do modelo.

| Cenário | Decisão/encaminhamento obrigatório |
| --- | --- |
| E02-24 | Explicar a finalidade de “Detalhes para suporte”. |
| E03-01 | Urgência visual, filtros de itens, unificação Materiais/Atendimento, atendimento parcial familiar, central de comunicações; complementares reservadas apenas quanto à decisão de produto. |
| E03-02 | Aplicar os padrões pertinentes à COM, preservando seus fatos próprios. |
| E03-03 | Aplicar os padrões pertinentes à ENT, incluindo a informação de atendimento escolhida pela família. |
| E03-04 | Explicar parecer; reservar troca global de nomenclatura/significado até decisão específica. |
| E03-14 | Corrigir continuidade da rolagem entre andamentos e página. |
| E03-20 | Mesma correção para cronologia extensa, inclusive toque. |
| E03-26 | Ícones que identifiquem o tipo de arquivo em PDFs/arquivos gerados. |
| E03-31 | Mesma identificação de tipos em anexos. |
| E03-34 | Retomar envio no próprio cartão da reserva/anexo, preservando a tentativa. |
| E03-37 | Simplificar rascunho/conflito, preservando conteúdo e escolha consciente. |
| E03-38 | Simplificar salvamento incerto sem confundir rascunho e operação oficial. |
| E03-40 | Abandonar compatibilidade pré-produção e consolidar V1; não eliminar controles da vida futura do produto. |
| E03-57 | Fundos por significado, privado claramente identificado e referências a andamentos. |
| E03-60 | `@todos` força visibilidade para todos com acesso; privado indisponível e consequência visível antes de publicar. |
| E03-66 | DEV aprovada; manter coerência visual e propagar os comentários pertinentes da REQ. |
| E03-70 | Validação em duas camadas, autoria/assinatura corretas e autenticação que conserva a consulta. |

## 19. Fontes e limites da conferência que originou o lote

Os anexos de Renato são a fonte das decisões. A inspeção técnica adicional foi pontual e em leitura. Não comprovou o estado de alterações ainda não publicadas na conversa do Codex, nem executou o sistema autenticado, migrações ou comunicações reais nesta rodada.

- [PR D-B #7](https://github.com/RMZZFAJ/home-care-assistant/pull/7).
- [Candidato D-B consultado](https://github.com/RMZZFAJ/home-care-assistant/commit/77acdfcebbe7a346ba02d72f95be1216a1697ab3).
- [CI consultada desse candidato](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/43377638270).
- [Gatilhos e concorrência da CI](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/.github/workflows/ci.yml).
- [Continuidade da execução D-B](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/docs/audits/D/D-B/OWNER_EXECUTION_SUPPLEMENT.txt).
- [Schema da REQ, sem quantidade solicitada](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/src/lib/validation/requisition.ts).
- [Cálculo atual de atendimento da REQ](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/supabase/migrations/20261022085111_operational_completion_and_authenticated_reviews.sql) e [lifecycle que também deve ser adaptado](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/supabase/migrations/20261023073958_v4_verification_corrections.sql).
- [Recebimento físico e efeitos de estoque](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/supabase/migrations/20261022052012_workflow_guards_and_read_models.sql).
- [Consulta atual de comunicações documentais](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/src/components/notifications/document-delivery-status.tsx), [worker de canais](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/src/lib/notifications/worker.ts) e [contrato atual das tentativas](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/src/lib/operations/notification-attempts.ts).
- [Separação entre parecer e aplicação do BAL](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/docs/audits/D/D-B/BAL_REVIEW_APPLICATION.md) e [regra executável correspondente](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/supabase/migrations/20261111183942_phase_d4_bal_review_application_separation.sql).
- [Contrato dos complementos formais](https://github.com/RMZZFAJ/home-care-assistant/blob/77acdfcebbe7a346ba02d72f95be1216a1697ab3/supabase/migrations/20261112005024_phase_d4_document_complements.sql).
- Os caminhos de referência adicionais estão no modelo e nos documentos do repositório. Confira-os no HEAD efetivo antes de editar; não se limite a essa lista para localizar consumidores.

Achados que evitam uma implementação apenas aparente: o atendimento atual da REQ é inferido de aceite positivo em ENT e aparece em mais de um cálculo; a projeção documental atual não reúne todas as tentativas nem o transporte Push; o retry administrativo existente para falha/incerteza não substitui um novo lembrete familiar após um aviso já entregue. O worker de notificações inspecionado tem ramos de aplicativo/WhatsApp, mas o canal e-mail cai em `CHANNEL_NOT_CONFIGURED`; isso não é prova de que qualquer canal externo esteja habilitado no ambiente. Confira a configuração efetiva sem expor segredos e adapte os consumidores relacionados, sem reconstruir histórico de tentativas que não foi registrado.

**Inicie pela conferência curta de continuidade, apresente sua organização em poucas linhas e execute o lote. A próxima autorização geral exigida é a publicação por push, após o trabalho local concreto e revisável. Reservas pontuais seguem a seção 14 e incompatibilidades materiais seguem a seção 15.**
