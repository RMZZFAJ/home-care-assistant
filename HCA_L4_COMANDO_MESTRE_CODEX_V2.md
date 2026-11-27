# Home Care Assistant — comando mestre de L4

**Referência aprovada:** `hca-laboratorio-04-v2-aprovado.html`  
**SHA-256 do HTML:** `6db3ae8c3c4f01914d4c80c1227cbe38c72bd2353e380ee87312b412a9efbdb9`  
**Cobertura da referência:** 27 cenários e 180 estados diretos (E10: 53; E11: 72; E12: 55).  
**Abrangência:** E10 — residência, pessoas, permissões e catálogo; E11 — conta, avisos e aplicativo; E12 — ajuda, criação de residência e continuidade.  
**Situação:** autorizado para implementação, com os comentários da revisão v1 já consolidados na v2.  
**Data da consolidação:** 22/11/2026.  
**Projeto:** Home Care Assistant, distinto da Conecta Care.

## 1. Meta e condição de conclusão

Implementar L4 no sistema real com a aparência, a hierarquia, a organização, os textos e as interações da referência aprovada, integrando-os aos dados, contratos e permissões reais. A experiência deve continuar naturalmente L1, L2 e L3, com os mesmos componentes compartilhados e as alterações expressamente delimitadas nesta ordem.

Não basta oferecer funções equivalentes com outra apresentação. A meta é a correspondência visual e funcional das superfícies de L4: listas, matriz, formulários, filtros, painéis, confirmações, avisos, carregamentos, sucessos, erros e recuperação. Cada função só está concluída quando interface, API, banco, autorização e histórico funcionam conjuntamente, conforme seu alcance.

O laboratório **v2 já contém as decisões finais**. Ele não é uma versão anterior a comentários que ainda precisem ser aplicados. Não reconstruir a discussão entre versões nem produzir outro laboratório. Os 125 registros da revisão v1 foram consolidados na referência e nesta ordem; observações repetidas de refinamento têm efeito sobre o conjunto visual, sem criar 125 tarefas ou commits.

## 2. Fontes, precedência e continuidade

Leia integralmente este comando e o HTML aprovado antes de editar. Preserve os anexos como referências versionadas, no arranjo já usado para L1–L3; o HTML de simulação não deve ser servido como uma rota do produto nem alterado para contornar um gate. Verifique sua integridade pelo SHA-256 acima. Confira também as instruções atuais do checkout, `AGENTS.md`, `README.md`, `docs/README.md`, `TEMP_D_B_ATUALIZACAO.md`, `docs/audits/D/D-B/LOTES_EXECUCAO.md`, os contratos dos domínios atingidos e as referências visuais canônicas.

Ordem de precedência para este lote:

1. Decisões expressas desta ordem e eventuais instruções posteriores do responsável.
2. `hca-laboratorio-04-v2-aprovado.html` para a aparência, organização e comportamento das superfícies de L4.
3. Decisões aprovadas de L1, L2 e L3, preservadas salvo os impactos expressamente autorizados aqui.
4. Modelo integral e sistema visual compartilhado, para padrões e funções não exemplificados no recorte.
5. Implementação e contratos atuais, que devem ser preservados quando não houver mudança aprovada e evoluídos quando houver.

L1 mantém laboratório v3 **mais comentários v3**; L2 mantém laboratório v7 e sua ordem; L3 mantém laboratório v4 aprovado e sua ordem. A condição de L1 não deve ser transferida para L4: **a v2 de L4 já nasce consolidada**.

### 2.1. O que pertence apenas ao laboratório

- Cenários à esquerda, seleção direta de estados no cabeçalho, largura do aparelho, painel de comentários, importação/exportação de revisão, reinício de exemplo e carregamento mantido para inspeção são ferramentas do laboratório. Não entram no produto.
- Pessoas, contatos, códigos, contagens e exemplos são fictícios. Não criar fixtures no ambiente real para reproduzi-los.
- O produto é examinado em **largura de celular, dentro do notebook**. Usar essa largura para a comparação visual; preservar a responsividade existente sem abrir uma nova frente de redesign de desktop.
- Uma consulta abreviada de ficha, estoque ou plantão de L1–L3 demonstra acesso e retorno. Não autoriza reduzir abas, documentos, comunicações, anexos, Andamentos, materiais, ações ou regras já implementados.
- Senha, MFA, convites, câmera, Push, instalação, envio, backup e restauração são simulados no HTML. A implementação deve usar os serviços reais existentes e representar sua disponibilidade verdadeira.
- A aparência dos PDFs e arquivos gerados continua fora de escopo. Preservar modelo documental, pipeline, assinatura, exemplares e histórico.

## 3. Estado consultado e retomada segura

Consulta de leitura realizada em 22/11/2026:

| Fonte | Estado observado | Consequência para a execução |
| --- | --- | --- |
| GitHub | `RMZZFAJ/home-care-assistant`; branch remota `feat/phase-d-continuation`; SHA `7e8f21190f1bf0257a6534a00872c064a1a25a98`, seis commits à frente de `master` | Há trabalho de L3 posterior à base de L4 v1. Reapurar HEAD, alterações locais e instruções antes de começar. |
| Produção | `master` em `fab595c7d5dafaf382619719f982d34cdeacc86e`; deployment READY | Não confundir produção com o candidato de L3. |
| Preview | Deployment `dpl_Erh18yxBkT4gjfWZjPMb91ZJ9JNs`, READY no SHA de L3 consultado | Estado de deploy não comprova conclusão funcional ou aprovação integral de L3. |
| Supabase | Projeto `qwfrqychokvhdzakibid`; 332 migrations; última `20261122212641_l3_stock_review_repairs` | Reconciliar migrations locais e remotas; nunca reaplicar o histórico nem usar contagem como autorização de escrita. |
| Permissões | 48 definições; inclui `consumption.team.write` e `consumption.team.correct` introduzidas em L3 | A matriz deve enumerar a fonte atual completa, sem congelar uma lista incompleta do laboratório. |
| Registro de execução | L3 em execução e L4 aguardando ordem aprovada | Esta entrega fornece a referência de L4; não declara encerrada a execução de L3. |

Fontes de referência: [commit consultado](https://github.com/RMZZFAJ/home-care-assistant/tree/7e8f21190f1bf0257a6534a00872c064a1a25a98), [instruções nesse commit](https://github.com/RMZZFAJ/home-care-assistant/blob/7e8f21190f1bf0257a6534a00872c064a1a25a98/AGENTS.md), [registro de execução](https://github.com/RMZZFAJ/home-care-assistant/blob/7e8f21190f1bf0257a6534a00872c064a1a25a98/docs/audits/D/D-B/LOTES_EXECUCAO.md).

Essas referências são datadas. Não trocar de branch, fazer reset, descartar alterações ou restaurar esse SHA para reproduzir a consulta. O trabalho local do Codex não foi inspecionado por este laboratório. Continue no checkout e na branch efetivamente atuais, preservando o que avançou desde então.

O registro de L3 informa que preview e produção consultam o mesmo Supabase. Verifique novamente essa condição antes de migrar contratos. Se persistir, a evolução precisa manter o aplicativo ainda publicado funcional durante a transição; não assumir isolamento só porque a URL diz preview.

## 4. Organização da execução e autonomia

L4 é um lote único, organizado em poucas frentes coesas: base compartilhada e permissões; residência/catálogo; conta/avisos/aplicativo; ajuda/continuidade e integração final. Essas frentes não exigem branches ou PRs próprias nem transformam cada cenário em lote separado.

Você pode criar, mover, renomear, dividir, modularizar, reescrever e remover arquivos ou código obsoleto do escopo. Pode alterar tipos, regras, APIs, contratos, RPCs, RLS, grants e criar migrations incrementais necessárias às decisões desta ordem. Escolha a organização técnica mais adequada e preserve dados, funcionalidades válidas, registros oficiais e trabalho existente.

Se uma função real não estiver exemplificada no HTML, integre-a usando estritamente o mesmo sistema visual. Sua ausência na simulação não autoriza removê-la. Evite uma segunda família de componentes, atalhos exclusivamente visuais ou regras mantidas apenas no cliente.

Uma incompatibilidade material que exija decisão de produto ainda não tomada deve ser registrada com diferença, efeito, alternativas e recomendação, sem paralisar partes independentes. Mudanças já decididas — por exemplo, exceção pessoal além da função e retirada de rascunhos extras de L4 — não devem voltar como perguntas apenas porque o contrato antigo é diferente.

## 5. Padrões transversais obrigatórios

### 5.1. Identidade e superfícies

Preservar tipografia, verde, fundos, bordas, densidade, espaçamentos, ícones SVG, botões e hierarquia de L1–L3, refinados conforme a v2. Não introduzir tema pronto, outro conjunto de ícones ou um recobrimento de componentes incompatíveis.

Uma página organiza uma área; um painel apresenta detalhes ou edição composta sem perder a origem; um modal trata decisão breve, confirmação ou resultado. Usar títulos concretos, conteúdo agrupado por assunto e uma ação principal clara. Evitar grandes faixas repetindo o estado já indicado no título ou no cartão.

Manter rolagem vertical dentro da tela e dos painéis, cabeçalho/rodapé utilizáveis, retorno ao ponto de origem, foco e teclado, contraste e nomes acessíveis. Conteúdo extenso não deve empurrar ações para fora de uma região impossível de rolar. Na matriz, a rolagem horizontal fica contida no componente, com a primeira coluna identificável; a página inteira não transborda.

### 5.2. Reutilização dos componentes reais

Antes de criar variantes, conferir os consumidores e os componentes existentes, inclusive:

- `src/components/ui/operation-activity.tsx` — carregamentos simples e por etapas;
- `src/components/ui/overlays.tsx`, `controls.tsx` e `icon.tsx` — modais, painéis, controles e ícones;
- `src/components/auth/new-password-field.tsx` e `src/lib/validation/password.ts` — campo e requisitos de nova senha;
- `src/components/documents/document-operation-failure-dialog.tsx` e `use-operation-support.ts` — resultado de falha, correlação e recuperação;
- `src/components/ui/file-record.tsx`, navegação e contexto compartilhado — ficha, origem e retorno;
- os padrões de Andamentos, rascunho e recuperação aprovados nos lotes anteriores.

Se um componente existente ainda tiver responsabilidade estreita, extraia a parte reutilizável sem mudar o comportamento dos seus consumidores antigos. A implementação real aprovada é a referência dos detalhes compartilhados; uma aproximação no HTML não autoriza criar carregamento, botão ou modal concorrente.

### 5.3. Carregamentos

O carregamento simples sobreposto permanece o padrão para consultas, gravações curtas e ações usuais. Foi expressamente mantido na revisão. O dinâmico, com etapas, fica para operações relevantes ou demoradas: acesso após login/seleção de paciente, emissão e criação de residência, entre as já definidas.

Não inventar nova categoria de loader. A etapa apresentada deve corresponder a uma atividade real; não usar progresso falso como confirmação de gravação. Impedir dupla submissão enquanto a operação está em curso.

### 5.4. Sucessos, falhas, concorrência e duas tentativas

Sucesso de operação aparece no modal canônico e somente após confirmação do resultado. Falha operacional aparece no modal de erro, com título, causa compreensível, próxima ação e detalhes seguros para suporte. Não apresentar erros ou sucessos de gravação como banners permanentes na página. Validações de campo permanecem próximas ao campo; um arquivo inválido e falhas de serviços recebem os modais específicos da referência.

Para falhas recuperáveis, permitir **no máximo duas novas tentativas após a falha inicial**. Depois, retirar a ação de tentar novamente e oferecer copiar detalhes e voltar/fechar, orientando informar o responsável pelo sistema. Falhas permanentes, requisitos não preenchidos e limites do provedor não devem oferecer uma tentativa impossível. Respeitar o intervalo informado pelo serviço.

Uma resposta ausente não prova que nada foi salvo. O modal pode dizer “Não foi possível confirmar o resultado”; a recuperação consulta a **mesma tentativa** antes de autorizar outra gravação. Não reapresentar centro técnico de comprovantes ao usuário comum. Não gerar chave nova em repetição de resultado incerto, não duplicar atos e não sobrescrever uma revisão posterior para recuperar a anterior.

O limite de tentativas restringe a ação de recuperação apresentada, não elimina o registro oficial. Reabrir a tela ou recarregar não deve criar um atalho para repetir cegamente uma operação cujo resultado ainda é desconhecido. Quando houver recuperação de resultado pelo servidor, atualizar a consulta e apresentar o estado confirmado.

Detalhes copiados contêm código seguro, correlação, ação, instante e tentativas pertinentes. Não expor senha, tokens, segredo TOTP, payload privado, foto, corpo de mensagem ou dados clínicos em diagnóstico.

Conflitos de versão usam comparação ou modal de atualização, conforme a superfície. Não aplicar uma versão antiga silenciosamente. No caso específico de preferências pessoais, descartar a edição concorrente e carregar a configuração atual; não criar uma escolha de resgatar o formulário antigo.

### 5.5. Política de preenchimento e registros

**Não há novos rascunhos persistentes em L4** para perfil, contatos, catálogo, unidade, apresentação, configuração, decisão curta ou preparação de residência. A edição existe enquanto o formulário está aberto; ao sair/fechar/descartar, a próxima abertura começa com os dados confirmados ou um novo preenchimento. Não exibir botão “salvar rascunho”, centro de preparações, inventário de formulários abandonados ou promessa de salvamento automático geral.

Preservar separadamente:

| Objeto | Tratamento |
| --- | --- |
| Formulário de L4 ainda não confirmado | Sem persistência privada adicional; pode ser perdido ao sair. Reabrir não recupera edição abandonada. |
| REQ, COM, ENT, BAL, DEV e outros preenchimentos extensos expressamente aprovados em L1–L3 | Mantêm sua política de último rascunho, retomada/descartar e concorrência. Consumo extenso de L3 também permanece no contrato aprovado. |
| Andamentos | Mantêm o último preenchimento e a recuperação já aprovados. |
| Tentativa oficial submetida | Mantém chave, autorização, consulta de resultado e prevenção de duplicatas. Não é rascunho. |
| Cadastro confirmado, histórico, declaração, complemento, conciliação, incidente e evidência técnica | Permanecem registros oficiais, com suas regras de alteração e auditoria. |

Remover a superfície de rascunho não exige apagar migrations históricas ou dados oficiais. Evoluir o caminho ativo e planejar a desativação das estruturas privadas obsoletas sem perda de registros válidos.

## 6. E10 — residência, participantes e governança

### 6.1. Administração da residência

Organizar a visão da residência, identificação, participantes, permissões, regras e catálogo por ações legíveis. Manter identidade global separada do papel por paciente. Conta global não recebe automaticamente acesso clínico, estoque, avisos, ciência ou operação local.

Editar a residência existente não cria outra, não altera autoria passada e não confirma atos operacionais. Criar nova residência usa o fluxo único de E12, com retorno à origem; não manter dois formulários concorrentes de criação.

### 6.2. Pessoas, convites e desligamento

Preservar função por paciente, vínculo ativo, convite pendente, validade, aceite, recusa, revogação, reemissão e estados sem acesso. Convite por link não deve anunciar e-mail enviado se o serviço real apenas gerou o link. Reemitir invalida o anterior conforme o contrato.

Conta errada, link inválido, expirado ou revogado não revelam paciente ou destinatário indevidamente. A aceitação acontece pela identidade correta; uma proposta aprovada pode ainda aguardar aceite. Mostrar esse resultado sem fingir vínculo concluído.

Antes do desligamento, o painel apresenta impactos e pendências que o usuário pode compreender e consultar. Preservar autoria, recebimentos e histórico. O desligamento não conclui pendências automaticamente; seus encaminhamentos seguem os próprios processos. Não inventar bloqueio absoluto por existir pendência quando a regra atual não o exige.

### 6.3. Credencial profissional

Separar declaração do titular, conferência familiar, dados alterados e informação não confirmada. Não apresentar conferência da família como consulta automática a conselho profissional. Preservar versão conferida, autor, instante e justificativa nos casos exigidos.

Mudança do titular durante a revisão exige comparar a versão atual e retomar a conferência; não validar silenciosamente dados antigos. O contexto global não substitui a pessoa autorizada a fazer a conferência familiar.

### 6.4. Permissões — mudança de contrato expressamente aprovada

Implementar uma **matriz real** com permissões nas linhas e tipos de perfil nas colunas. A lista completa deve vir das definições atuais, com busca e agrupamento por área. Não substituir a matriz por uma pequena lista de permissões escolhidas nem cortar capacidades para caber no celular.

Na mesma área, selecionar uma pessoa e consultar **todas as suas permissões**, permitindo exceção específica. Mostrar estado efetivo e origem: padrão da função, configuração da função ou exceção pessoal. A opção herdar retira a exceção e volta a calcular o resultado atual. A revisão de alteração mostra antes/depois e o alcance, individual ou de todas as pessoas daquela função.

Os cinco perfis locais observados são administrador do paciente, familiar, profissional, supervisão e leitura. Administração global mantém área própria; não é uma coluna que automaticamente concede tudo no paciente. O inventário atual tem 48 capacidades, incluindo as duas de consumo de L3; a implementação deve tolerar novas definições válidas sem omiti-las.

**Uma exceção pessoal pode conceder capacidade além dos limites usuais da função.** Essa decisão substitui o bloqueio antigo baseado apenas em `allowed_roles`. O sistema apresenta aviso claro de que aquela pessoa receberá acesso normalmente indisponível para seu perfil, identifica a capacidade e a consequência e exige confirmação explícita da pessoa autorizada a administrar permissões. Registrar histórico com ator, sujeito, paciente, capacidade e antes/depois.

Essa regra deve valer no cálculo efetivo e nos consumidores: UI, API, RPC e RLS, incluindo os caminhos de COM, estoque familiar, contagem, consumo, regularização e administração de acesso quando contemplados pela capacidade. Uma concessão que aparece na matriz mas continua negada por teste de papel no servidor está incompleta. Uma exceção negada também precisa impedir a ação em todas as camadas.

A autorização para ultrapassar os limites da função é **individual**. Não estendê-la silenciosamente a toda uma coluna de perfil. A configuração coletiva continua dentro da elegibilidade vigente da função; não confundir elegibilidade com um default inicialmente desativado. Uma célula coletiva inelegível explica o limite e conduz à exceção de uma pessoa. A exceção pessoal autorizada é aplicada no cálculo efetivo de modo que a barreira antiga não a anule.

Na lista de exceções pessoais, o antigo bloqueio de `access.manage` não deve impedir a concessão individual aprovada. Tratar sua concessão/remoção como capacidade crítica, com alcance explicado e confirmação. A configuração coletiva dessa capacidade mantém a proteção vigente; não transformar a exceção pessoal em autorização geral de todo o perfil. O usuário autorizado a gerir permissões continua sujeito à autorização vigente para a ação e ao escopo do paciente. Não permitir autoelevação por requisição forjada.

**Limites estruturais preservados:** isolamento entre pacientes; existência de contexto/vínculo válido quando necessário; separação entre poder global e local; identidade/autoria; conferência por pessoa distinta nos processos que a exigem; proteção do último administrador global ativo; registros de auditoria. A exceção muda o acesso à capacidade, não transforma sua execução em aceite de outra pessoa, dispensa de revisão independente ou movimentação física automática.

Não alterar padrões de função por conveniência do exemplo. Ler defaults e configurações reais. As mudanças de autorização exigem contraprovas com Auth real, revogação e concorrência, conforme a seção de verificação.

### 6.5. Propostas e regras

Propostas globais relativas a contexto local continuam sujeitas à decisão local independente, onde o contrato exige. Mostrar conteúdo atual, alteração proposta, autor e situação. Proponente não aprova a própria proposta. Uma referência superada exige nova comparação/proposta, sem aplicar a antiga silenciosamente.

Resposta não recebida na decisão usa modal de falha e consulta da mesma tentativa. Uma aprovação de vínculo que ainda exige aceite deve manter essa distinção.

Regras da residência permanecem versionadas. Não reabrir ciência, arquivamento, atendimento, estoque ou divergência aprovados em L1/L2/L3. Documentos emitidos preservam a política da emissão. Limites baixo/crítico por material e custódia não movimentam estoque.

Configuração de avisos distingue evento, perfil, canal, preferência, obrigatório/silencioso no aplicativo e destinatários. Destino precisa estar verificado quando o canal exige; consentimento, serviço e autorização não são substituídos por uma configuração da matriz.

## 7. E10 — catálogo, unidades e apresentações

### 7.1. Catálogo organizado

Preservar categorias, nomes alternativos, descrição, ordem, unidade, precisão, identidade e situação. Manter a organização por tipo coerente com as listas e wizards de L2. Cadastro de catálogo não representa compra, recebimento nem saldo.

Criar, editar e adotar modelo sem rascunho persistente adicional. Ao detectar possível duplicata, abrir **modal de decisão** com comparação e caminho para consultar o item existente; não usar faixa permanente nem fundir automaticamente. Nome semelhante não torna equivalentes dosagem, tamanho, apresentação ou identidade.

Conflito de versão exige atualizar a referência antes de gravar. Se o usuário sai de um formulário não gravado, o próximo acesso começa sem aquela edição. Não restaurar campos abandonados por meio de um centro de preparações.

### 7.2. Situação e sucessor

Item inativo tem identificação de situação discreta e consistente, sem um grande alerta permanente. Inativar/reativar mantém a identidade e o histórico. Motivo, referência e validações existentes continuam exigidos.

Um sucessor orienta novas escolhas; não transfere saldo, converte unidade, substitui fatos passados nem mistura custódias. Mudança de referência de estoque/cadastro durante a decisão exige nova conferência. Reativação segue o contrato atual para retirar a indicação de sucessor.

### 7.3. Unidades, apresentação e código

Manter tipos de unidade, precisão admitida, unidade base, equivalência positiva e histórico de versões. Item com movimentação/histórico conserva sua unidade; outra unidade pode exigir outro item. Alterar fator de embalagem não reescreve quantidades antigas.

Código de barras é texto, preservando zeros iniciais e validação vigente. Câmera indisponível oferece digitação e a alternativa existente apropriada, sem bloquear o cadastro por depender da câmera. Não inventar unicidade ou conversão automática que o contrato não possui.

### 7.4. Histórico do material e resultado de edição

Retirar a **central de comprovantes/tentativas de catálogo** da experiência comum. O usuário acompanha o histórico do material e o resultado da edição na própria ação. Não criar uma ficha/documento artificial para representar um recibo técnico.

O registro idempotente continua internamente. Se o resultado da gravação é incerto, consultar a mesma operação pelo modal; se há rejeição confirmada, permitir nova tentativa pertinente; se o usuário sai, não retomar o preenchimento privado abandonado. Resultado confirmado aparece uma vez e não duplica material, apresentação ou histórico.

A consulta técnica da tentativa mantém o escopo de titular, modo administrativo e paciente. Não transformar o endpoint de recibos pessoais em histórico coletivo. O histórico visível do material contém somente eventos oficiais autorizados; não expõe recibos, payloads ou tentativas privadas de outras pessoas. A retirada da central e a concessão de uma capacidade local não ampliam automaticamente esse acesso técnico.

## 8. E11 — perfil, contatos e segurança

### 8.1. Perfil e foto

Organizar dados pessoais e identificação profissional com resumo claro e edição objetiva. Identidade da conta não depende de vínculo com um paciente. Salvar perfil termina em modal de sucesso; erro, em modal de falha.

Foto usa seleção e prévia no painel adequado, com validação real de tipo/tamanho e resultado acessível. Arquivo inválido gera modal específico. Retirar do fluxo comum a superfície autônoma “há uma foto mais recente” e o resgate de edições abandonadas. Isso não autoriza sobrescrever foto posterior: preservar comparação de versão e recuperação segura da tentativa submetida, tratar conflito no próprio fluxo e carregar a foto vigente.

Falha de limpeza de objeto antigo não deve transformar associação já confirmada em falha de salvamento. Não armazenar senha, token ou dados de autenticação nos comentários, rascunhos ou diagnósticos.

### 8.2. Contatos e provedor

E-mail, telefone e métodos de acesso mantêm exigência de sessão recente e confirmação quando necessária. Solicitar confirmação não significa que novo contato já está ativo. SMS indisponível precisa produzir mensagem visível, explicativa e com ação adequada.

Representar o acesso Google com o símbolo reconhecível multicolorido e o mesmo acabamento visual dos demais controles. A disponibilidade depende da configuração real; não apresentar integração fictícia como ativa nem alterar provedores remotamente para fazer o cenário aparecer.

### 8.3. Senha, MFA e sessões

Reutilizar o campo de nova senha de L1: critérios visíveis abaixo do campo, mudando para verde conforme atendidos. Preservar regra atual de mínimo de seis caracteres, maiúscula, minúscula, número, símbolo e máximo de 72 bytes UTF-8. Não criar uma política de força diferente, bloquear colar ou impedir gerenciador de senhas.

MFA TOTP só fica ativo depois da confirmação válida; código preparado, inválido/expirado, ativo, sessão sem confirmação suficiente e remoção são estados distintos. Não inventar recuperação universal ou reduzir nível de autenticação exigido.

Sessão atual e outras sessões são compreensíveis. Preservar o alcance real da ação de encerrar outras sessões; não prometer revogação instantânea de tokens já emitidos nem criar revogação individual sem contrato que a sustente.

## 9. E11 — central, sino, preferências e ciência

### 9.1. Avisos acionáveis e autorizados

Refinar a central com filtros, referência, contexto do paciente, momento, estado de visto e ação específica. Evitar uma lista genérica de cartões iguais com apenas uma palavra diferente. Detalhes do aviso abrem em painel, e o destino abre a área correta, mantendo retorno.

**Um aviso cujo destino já se sabe inacessível não deve ser oferecido.** Omitir o aviso e a ação na central e no sino; contagens, paginação e payload devem seguir o mesmo recorte autorizado. Não convidar a pessoa a abrir algo para depois negar um acesso que o sistema já conhecia.

Revalidar na abertura: se a permissão mudou depois da listagem, tratar a corrida com mensagem segura, retirar dados não autorizados e voltar à área disponível. A ocultação não substitui autorização na API/RLS. Links internos ou externos antigos continuam protegidos.

Não confundir vazio legítimo, falha de consulta e resultado antigo. Um contador antigo não se apresenta como atual. Uma consulta falha usa o modal de erro e identifica a referência temporal de eventual conteúdo anteriormente carregado.

Marcar como visto, aceitação/entrega pelo provedor, leitura e **ciência operacional** continuam fatos distintos. Abrir o aviso não aprova compra, não confirma recebimento nem resolve tarefa pendente. O usuário executa o ato correspondente na ficha.

### 9.2. Preferências e ciência

Preferências de canais/apresentação e de ciência mantêm grupos claros e consentimento no ponto de decisão. Preservar modalidade manual, diálogo e tácita quando elegíveis, subordinadas à política do paciente e à capacidade vigente. Aplicação prospectiva; não reescrever ciência passada nem atribuir consentimento a outra pessoa.

Em conflito com configuração atualizada por outra sessão, **não preservar/resgatar o formulário antigo**: informar o conflito no modal, carregar a versão atual e permitir edição nova. Guardar somente a referência necessária para prevenir gravação concorrente.

Salvar gera sucesso confirmado ou erro modal. Resposta incerta é descrita honestamente e consulta a mesma tentativa. Aplicar o limite de duas novas tentativas; após ele, copiar detalhes e informar o responsável. Não manter banner de incerteza como estado permanente da página.

## 10. E11 — Push, aparelhos e aplicativo

### 10.1. Ativação e estados do aparelho

Separar claramente: suporte do navegador, permissão nativa, inscrição confirmada no servidor, sessão vinculada, serviço habilitado, pausa e revogação. Permissão nativa concedida sem inscrição confirmada não significa Push ativo.

Solicitar permissão somente após ação da pessoa. Negativa nativa orienta como alterar configurações; não repetir prompts. Navegador sem suporte e serviço indisponível têm apresentação e próximos passos diferentes de erro de inscrição ou aparelho ativo. Não reaproveitar o mesmo alerta com troca superficial de texto para todas as situações.

Tela bloqueada usa conteúdo genérico; abrir a notificação revalida sessão, paciente e acesso. Pausar, retomar e revogar mantêm alcance real; não apagam tarefas internas nem ciência. Sair da sessão impede envios futuros pertinentes, sem prometer cancelar o que o serviço já aceitou.

### 10.2. Teste com espera limitada

Teste se refere ao aparelho atual elegível. Exibir preparação/consulta com duração limitada; a interface aguarda **até 30 segundos** por uma resposta conclusiva, encerrando antes quando ela chega. Não deixar “aguardando” indefinidamente.

Os 30 segundos limitam a espera da interface. Não expiram, cancelam nem declaram automaticamente falha da tentativa no servidor; manter sua chave e consultar o resultado até que o estado seja conhecido.

Ao esgotar o prazo, mostrar modal de erro dizendo que o resultado não pôde ser confirmado. Consultar a mesma tentativa; não disparar notificações repetidas para tentar descobrir o resultado. Tratar limites de frequência e `Retry-After` do provedor, inclusive quando excedem o prazo visual.

“Aceito pelo serviço” não prova entrega ou exibição no aparelho. O modal de sucesso descreve exatamente o resultado observado e orienta conferir o dispositivo. Falha, limitação, expiração e resposta ausente têm mensagens e próximas ações próprias, no padrão de modal.

Aplicar o teto de duas tentativas de recuperação da operação. Novo envio só ocorre quando o contrato confirmar que é permitido e a pessoa solicitar, sem multiplicação automática de teste. Não fazer testes de envio real indiscriminados para validar aparência.

### 10.3. Instalação, preparação e atualização

Instalação, preparação e Push são ações distintas. Se a instalação não é oferecida pelo navegador, manter uso web e orientação pertinente. Preparação falha gera modal de erro; verificação concluída e versão já atual geram resultado claro.

Atualização disponível é apresentada na área do aplicativo, de modo objetivo, sem banner redundante. A pessoa escolhe **atualizar esta aba**. Retirar inventário de formulários abertos, salvamento automático geral e jornada de resgate de telas abandonadas. A navegação até essa área não deve obrigar percorrer um catálogo de pendências de formulário.

Se há operação crítica efetivamente em envio nessa aba, aguardar sua conclusão ou consultar o resultado com limite; não recarregar cegamente e não reenviar. Essa proteção não se transforma em preservação geral de campos. Só a aba que confirmou atualiza; não forçar recarga das demais.

Falha de atualização mostra modal e mantém estado verdadeiro da versão; sucesso mostra modal. Sem rede, não enfileirar comandos privados nem prometer autosave de todo o sistema. Os rascunhos expressamente aprovados de L1–L3 mantêm seu próprio contrato. Ao voltar a rede, revalidar conexão, sessão, autorização e compatibilidade antes de uma nova ação; não executar automaticamente o que falhou.

Versão incompatível recebe modal de erro com ação apropriada. Não esconder um bloqueio real sob o rótulo de atualizado.

## 11. E12 — ajuda e criação de residência

### 11.1. Orientação contextual

Guias organizam tarefas por perfil/contexto e abrem orientações em painel, preservando retorno à tarefa. Ler, pular ou concluir guia não aceita convite, não confirma ciência, não recebe material e não cria residência.

O progresso pessoal do guia e a configuração do primeiro acesso continuam registrados no seu escopo. São registros oficiais de orientação/configuração, não rascunhos extras de formulário.

Atualizar textos legados às decisões já aprovadas: “estoque atual”; REQ e sua atualização de estoque no contrato de L2; divergência de quantidade distinta da avaliação de satisfação; consumo da equipe com baixa conforme L3; aviso de falta sem movimento. Não usar a ajuda para reintroduzir regras antigas.

Preparação da rotina local mostra tarefas e situação consultada de catálogo, pessoas e configurações, conforme a permissão. Metadados não atestam estoque físico conferido, presença das pessoas ou residência operacionalmente pronta. O próximo passo abre a função real responsável.

### 11.2. Criação de residência sem centro de rascunhos

Usar um único fluxo: **preencher → revisar → confirmar criação → acompanhar tarefas locais**. Eliminar a central de preparações privadas, botão de salvar rascunho e retomada de formulário abandonado. O cadastro confirmado e suas tarefas posteriores permanecem oficiais.

O contrato antigo `save/create/discard` exige uma preparação salva antes da criação. Evoluir essa dependência para permitir a criação a partir do formulário confirmado, sem produzir rascunho privado por preenchimento ou navegação. A tabela atual `private.residence_preparations` também contém registros `preparing` associados a residências já criadas: preservar esses vínculos, cadastros e históricos. Não apagar indiscriminadamente a tabela nem os registros técnicos de comandos/idempotência em `private.phase_d3_commands`; migrar ou reorganizar as estruturas conforme sua finalidade.

Preservar identificação, fuso, administração inicial, titular/substituto distintos e validações vigentes. A conta administradora inicial precisa atender aos requisitos atuais de identidade e confirmação. Planejar participação não aceita convite nem cria automaticamente todos os vínculos. Criador global não obtém, só por isso, acesso local aos dados do paciente.

Criação utiliza carregamento por etapas e confirmação do mesmo comando. Resultado ausente usa consulta idempotente antes de repetir; sair do formulário não autoriza criar residência duplicada. Conflitos de conta/referência são resolvidos antes de confirmar.

## 12. E12 — contingências, suporte e continuidade

### 12.1. Declaração e dossiê

Preservar lista, detalhes, materiais, evidências, comunicações declaradas e histórico em dossiê coerente. Declaração registra o que ocorreu fora do fluxo digital, com autor e instantes; **não gera por si só uma segunda movimentação física**.

Desconhecido continua desconhecido, sem converter quantidade ausente em zero ou preencher autoria/horário por suposição. Complemento acrescenta informação preservando o fato original. Evidências seguem autorização e pipeline vigentes; não reestilizar seus arquivos.

Aplicar simplificação de formulários sem novos rascunhos. A declaração confirmada, complemento e evidência são registros oficiais. Revisão de unidade ou referência atualizada exige conferência explícita; não fazer conversão silenciosa.

### 12.2. Conferência independente e vínculo

A pessoa que declarou ou complementou não confere a própria informação quando a regra exige independência. Revisor autorizado escolhe explicitamente a referência digital do mesmo paciente e processo e registra a justificativa pertinente.

Se o ato digital ainda não existe, orientar ao fluxo próprio, com retorno ao dossiê. Vincular não repete estoque, recebimento, consumo, ciência ou autoria. Referência incompatível, complemento novo e evidência pendente impedem confirmar com base superada.

Mostrar comparações e conflitos em modal apropriado; carregar o estado atual e exigir nova conferência. Não criar persistência privada extra para resgatar decisões curtas. Resultado incerto consulta a mesma decisão; confirmação produz modal de sucesso e histórico atualizado.

Depois do vínculo, manter o bloqueio vigente a novos complementos e decisões que alterem o dossiê já conciliado. Consulta e finalização/recuperação de evidências continuam sujeitas às autorizações atuais do paciente e do domínio, conforme seus contratos; a vinculação não dispensa essas verificações.

### 12.3. Central técnica, incidentes e evidências

Área técnica é contexto global próprio. Administração local não ganha acesso técnico global, e papel global não revela automaticamente mensagens, fichas ou informações clínicas do paciente. Usar metadados minimizados e correlação, distinguindo ambiente/fonte.

Incidente, acompanhamento, histórico, severidade e política permanecem registros reais. Reconhecer ou encerrar incidente não reinicia serviço, não reenvia mensagem e não comprova solução externa. Concorrência ou resposta ausente usa o mesmo padrão de comparação/erro/recuperação.

Consultas de cópia, ensaio, compatibilidade e tentativas são evidências com limites explícitos. Correspondência de referências não prova que arquivos estão disponíveis nem que restauração foi ensaiada. Registro legado sem histórico de tentativas mostra a lacuna.

Não implementar botões que executem backup, restauração, reset ou reenvio como consequência deste laboratório. A área consulta/organiza evidências e encaminha ações autorizadas; operações de infraestrutura dependem da autorização própria. Não confundir estado de transporte com ciência ou recebimento de material.

## 13. Impactos expressos sobre L1, L2 e L3

| Mudança de L4 | Superfícies/contratos atingidos | Limite da alteração |
| --- | --- | --- |
| Matriz completa e exceção além da função | Leitura e ações de fichas, COM, estoques, consumo, contagem/BAL, agenda, administração e respectivos endpoints/RPCs/RLS | A capacidade efetiva passa a governar o acesso; preservam-se paciente, autoria, independência e regras do ato. Não reescrever as jornadas desses lotes. |
| Capacidades de consumo de L3 | `consumption.team.write` e `consumption.team.correct` e seus consumidores | Incluir na matriz atual; não voltar ao consumo legado nem remover baixa, correção ou histórico definidos em L3. |
| Ocultar aviso já inacessível | Central, sino, contagem, paginação, payload e destino de avisos de todos os lotes | Omitir conteúdo não autorizado; revalidar na abertura. Não ampliar acesso nem concluir tarefa ao marcar visto. |
| Resultados em modais e duas recuperações | Ações de L4; extração/reuso dos componentes compartilhados quando necessária | Preservar os contratos já aprovados dos consumidores de L1–L3; não substituir loaders nem alterar ciência/estoque por padronização visual. |
| Retirar rascunhos extras | Perfil, preferências, catálogo, unidades/apresentações, preparação/criação e decisões curtas de L4 | Não eliminar rascunhos extensos ou Andamentos já aprovados; não apagar tentativa submetida nem registro oficial. |
| Atualização do aplicativo simplificada | PWA, conexão e navegação para atualização | Remover inventário geral de formulários; preservar proteção da operação em envio e a política própria dos rascunhos autorizados. |
| Cadastro e inativação de material | Seletores, listas e painel compartilhado de material dos lotes anteriores | Refletir identidade/situação/sucessor; não converter saldo, reescrever documento ou simplificar o painel de material. |
| Ajuda alinhada | Guias e textos contextuais de REQ, ENT, COM, DEV, BAL e consumo | Atualizar orientação às decisões vigentes; não criar nova regra de negócio. |
| Abertura de ficha/estoque/plantão pela ajuda, aviso ou contingência | Rotas, painéis e retorno existentes | Abrir a superfície completa do lote responsável e voltar à origem; o resumo do HTML não substitui essa superfície. |
| Preparação e criação de residência | Administração global, fluxo E12 e navegação E10 | Um único cadastro confirmado, sem centro privado de preparações; tarefas locais preservadas. |

Ficam preservados, entre outros: abas e Andamentos das fichas; nova aparência de Materiais e painéis aprovados em L2; wizards com confirmação, materiais, extras, observações e revisão conforme cada contrato; separação COM/entrada familiar/ENT; divergência de quantidade distinta da avaliação de atendimento; ciência e arquivamento de L2; estoques por custódia e trânsito; consumo, agenda e admissão de contagem de L3; acervo e validação pública de L3; PDFs existentes.

## 14. Fontes de implementação a localizar

Os caminhos abaixo foram identificados na investigação. Revalidar nomes e responsabilidades no checkout; mover ou modularizar quando necessário. A lista orienta a busca e não limita os consumidores a conferir.

| Área | Fontes iniciais |
| --- | --- |
| Residência e vínculos | `src/components/admin/administration-navigation.tsx`, `patient-registration.tsx`, `membership-management.tsx`, `membership-impact.tsx`, validadores de convite e credencial |
| Permissões | `src/components/admin/permission-matrix.tsx`, `global-accounts.tsx`, `src/lib/capability-labels.ts`, `src/lib/client/capabilities.ts`, APIs e funções SQL de capacidade efetiva, `capability_definitions` |
| Propostas e política | `governance-proposals.tsx`, `policy-rules.tsx`, `notification-matrix.tsx`, `alert-settings.tsx`, contratos e APIs correspondentes |
| Catálogo | `catalogue-management.tsx`, `catalogue-preparation-editor.tsx`, `src/lib/catalog-match.ts`, `src/components/catalog/catalogue-identity-management.tsx`, `unit-console.tsx`, `unit-preparation-editor.tsx`, `presentation-management.tsx`, `barcode-scanner.tsx`, `catalogue-receipt-console.tsx` |
| Conta | `profile-tabs.tsx`, `profile-console.tsx`, `avatar-settings.tsx`, `contact-settings.tsx`, `mfa-settings.tsx`, preferências, APIs de perfil e Auth |
| Avisos e Push | `notification-center.tsx`, `notification-bell.tsx`, navegação/presentation de avisos, API de destino, `science-preference.tsx`, `push-settings.tsx`, `src/lib/push/subscription.ts`, `src/lib/server/web-push-test.ts` |
| Aplicativo | `pwa-settings.tsx`, `pwa-provider.tsx`, service worker e contratos de versão/atualização |
| Guias e criação | `src/components/guides/user-guide.tsx`, `local-preparation.tsx`, `residence-preparation.tsx`, `src/lib/guide-content.ts`, APIs de preparação e validadores |
| Contingência | `src/components/contingencies/contingency-page.tsx`, `contingency-form.tsx`, `src/lib/validation/contingency.ts`, APIs/RPCs de declaração, evidência e conciliação |
| Técnica | `src/components/admin/technical-tabs.tsx`, `technical-notifications.tsx`, `operations-console.tsx`, `recovery-runbook.tsx`, `src/lib/operations/contracts.ts`, API de operações |

Conferir também mudanças recentes de L3 em `canonical-ui.css`, `l1-ui.css`, navegação/contexto, ficha compartilhada, estoque, consumo, agenda/BAL e contratos versionados. Não reaplicar cópias antigas desses arquivos para obter a aparência do laboratório.

## 15. Banco, ambientes, commits e push

### 15.1. Contratos e migrations

Mudanças de contrato necessárias às decisões desta ordem estão autorizadas no desenvolvimento. Criar migrations incrementais; não editar o histórico, apagar registros oficiais ou enfraquecer RLS para acompanhar o desenho. Revisar conjuntamente API, RPC, políticas, grants e `SECURITY DEFINER` quando atingidos.

Preservar compatibilidade necessária com o aplicativo ainda publicado, especialmente se ambientes usam o mesmo banco. Distinguir parâmetro antigo, registro legado e nova forma de gravação. Não usar fallback permissivo que conceda acesso porque a matriz ainda não carregou.

Verificar stack, origem e containers antes de testes mutáveis. Usar a stack local já definida no projeto; não criar outra sem necessidade. Reset e fixtures obedecem à autorização vigente e à proteção dos dados; nenhum reset ou fixture remoto é autorizado por este lote.

Prepare migrations, valide evolução e documente o destino. Aplicação remota segue autorização expressa já vigente para aquele ambiente ou, se ausente, decisão específica do responsável, com material pronto para revisão. Esta ordem não concede alteração indiscriminada de Auth, provedores, infraestrutura, segredos, publicação ou dados remotos.

### 15.2. Continuidade e poucos commits

Continue na **mesma conversa, no mesmo checkout e na branch atual**. Não abrir nova branch, PR ou worktree para L4. Preserve a PR em andamento, se houver, e os commits/alterações de L3. Termine ou acomode a operação em andamento em ponto seguro antes de iniciar alterações dependentes; não sobrepor duas implementações no mesmo arquivo sem integração consciente.

Trabalhar em poucas fases e poucos commits locais coesos; aproximadamente **3 a 5 commits** é referência, ajustável por razão técnica concreta. Não gerar dezenas de commits/pushes para cada tela, comentário ou correção pequena. Não reescrever histórico existente apenas para reduzir contagem.

**Antes de qualquer push, pedir autorização ao responsável.** Apresentar commits prontos, escopo, migrations/destinos, verificações e limitações. Não fazer push, merge ou publicação automática por considerar que a implementação do lote foi autorizada. Se já houver autorização posterior específica, cumpri-la conforme seu alcance, sem reinventar um bloqueio.

## 16. Verificação proporcional e aceite

### 16.1. Integração que precisa ser provada

Selecionar testes discriminantes pelos contratos realmente alterados. Reusar testes e runners existentes, atualizar consumidores/fixtures pertinentes e não criar uma suíte que apenas espelhe o HTML.

- Permissões: inventário completo, herança, configuração por função, exceção permitir/negar, concessão além do perfil com confirmação, `access.manage`, histórico e revogação. Conferir UI/API/RPC/RLS com identidades Auth reais, paciente diferente, contexto global/local e concorrência. Incluir consumo da equipe e os consumidores antes presos a papel.
- Governança: convite por identidade correta, link inválido sem vazamento, proposta com revisor distinto, referência superada e último administrador global protegido.
- Catálogo: duplicata sem fusão automática, unidade com histórico, sucessor sem movimento, códigos com zero inicial, saída sem rascunho extra e repetição idempotente da mesma edição.
- Perfil/segurança: sucesso e erro visíveis, foto inválida, resultado incerto sem sobrepor foto posterior, SMS/Google indisponíveis, requisitos de senha e confirmação real de MFA.
- Avisos: destino já inacessível ausente da central/sino/contagem/payload; mudança de acesso depois da listagem; visto separado de tarefa e ciência; conflito de preferência sem resgate da edição antiga.
- Push/PWA: permissão sem inscrição não ativa, negativa/sem suporte/serviço indisponível distintos, espera limitada, aceito sem promessa de exibição, mesma tentativa, limite de recuperação, atualização só da aba confirmada e ausência de reenvio privado ao reconectar.
- E12: criação única com revisão, sem centro de rascunhos; global sem vínculo local automático; desconhecido diferente de zero; complemento preserva original; independência do revisor; associação explícita sem segundo efeito físico; evidência pendente e referência incompatível; central técnica restrita.

Resultado incerto exige verificar efeitos, não apenas texto de sucesso: a mesma operação não pode duplicar cadastro, vínculo, declaração, envio, efeito no estoque ou histórico.

### 16.2. Comparação visual

Comparar produto e laboratório nas mesmas superfícies/estados em 360 e 412 px, com foco em celular. Conferir hierarquia, espaçamentos, densidade, filtros, matriz, conteúdo, ícones, estados, rolagem, modais, painéis, loaders e retorno. Não aceitar como equivalentes telas que contêm os mesmos campos em cartões grosseiros ou sem composição.

Verificar os estados diretos no HTML para evitar repetir jornadas completas desnecessariamente. No produto, preparar somente os dados locais e as condições necessárias às verificações relevantes, usando os runners existentes. Preservar acessibilidade e responsividade existente; isso não abre escopo de novo desenho de desktop.

Não concluir com screenshots apenas da tela inicial. Incluir ao menos uma superfície principal, uma edição/painel, uma confirmação crítica e um resultado/falha por frente, além da matriz e dos estados particulares que mudaram.

### 16.3. Gates do repositório

Seguir `AGENTS.md` e a versão Node/npm do checkout. Executar verificações afetadas, tipos/lint pertinentes e regressões dos contratos alterados. Mudança de autorização/banco exige preparação de banco e testes locais com Auth real, inclusive negativas e concorrência.

Instalação limpa, evolução legada e integração devem ser comprovadas pelos gates disponíveis conforme o projeto; aproveitar CI programada quando apropriado, sem reset adicional só para repetir evidência inalterada. A CI precisa corresponder ao SHA efetivamente publicado após autorização. Não usar resultado de SHA anterior como aprovação do novo.

Não rodar suíte mutável de banco paralela ao E2E, não usar sessão/origem desconhecida, não enviar comunicações reais por padrão de teste, não excluir contraprovas para obter verde. Repetir a parte necessária após correção; ampliar somente diante de risco ou falha concreta.

### 16.4. Mapa das superfícies aprovadas

| Cenário | Resultado esperado no produto |
| --- | --- |
| E10-01 | Residência, identificação, contexto global e acesso indisponível organizados. |
| E10-02 | Participantes, convites/aceite e impacto de desligamento. |
| E10-03 | Declaração e conferência de credencial, com conflito de versão. |
| E10-04 | Matriz completa, todas as permissões pessoais, confirmação além do perfil e contas globais. |
| E10-05 | Propostas comparáveis, revisão independente e recuperação no modal. |
| E10-06 | Regras, destinatários e limites por custódia, sem efeitos físicos implícitos. |
| E10-07 | Catálogo por tipo, cadastro/edição, duplicata em modal, sem rascunho extra. |
| E10-08 | Situação e sucessor com identidade, estoque e histórico preservados. |
| E10-09 | Unidades, apresentações, equivalência e consulta de código com alternativas. |
| E10-10 | Histórico do material e resultado de edição; retirada da central comum de recibos técnicos. |
| E11-01 | Perfil e foto refinados, validação e resultados em modais. |
| E11-02 | Contatos e métodos de acesso com confirmação e indisponibilidade verdadeira. |
| E11-03 | Senha com critérios de L1, MFA e sessões. |
| E11-04 | Central/sino com filtros, contexto, tarefa pendente e recorte por acesso. |
| E11-05 | Preferências e ciência, sem resgate de edição concorrente. |
| E11-06 | Avisos no aparelho com estados e próximas ações diferenciados. |
| E11-07 | Dispositivos e teste Push com prazo, resultado e recuperação limitada. |
| E11-08 | Instalação/preparação do aplicativo e verificação com feedback claro. |
| E11-09 | Atualização da aba, offline, retorno e incompatibilidade sem inventário de formulários. |
| E12-01 | Guias por tarefa/perfil e ajuda contextual. |
| E12-02 | Tarefas locais, acesso condicionado e referência temporal da consulta. |
| E12-03 | Criação da residência com revisão, confirmação e tarefas posteriores. |
| E12-04 | Lista e dossiê de contingência. |
| E12-05 | Declaração/complemento, informação desconhecida e resultado confirmado. |
| E12-06 | Revisão independente e vínculo explícito ao registro correto. |
| E12-07 | Contexto técnico, incidentes, política, histórico e concorrência. |
| E12-08 | Evidências de continuidade e tentativas de transporte, sem executar infraestrutura. |

## 17. Entrega do Codex

No fechamento, apresentar: objetivo atingido; alterações por frente; impactos efetivos em L1–L3; contratos/migrations e ambientes envolvidos; verificações executadas e resultado; evidências visuais comparáveis; limitações reais; commits preparados e estado da publicação. Atualizar os registros de execução do projeto nos fechamentos relevantes, sem abrir diários paralelos extensos.

Informar claramente o que está implementado e validado, o que depende de ambiente/provedor e o que ainda exige decisão material. Disponibilidade simulada do laboratório não comprova configuração externa. Não declarar conclusão apenas porque o HTML foi reproduzido ou o build passou.

Com o conjunto pronto, solicitar a autorização de push nos termos acima. A entrega esperada é L4 integrado e coerente com o sistema, mantendo a base de L1–L3 e as decisões finais desta ordem.
