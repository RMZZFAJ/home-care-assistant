# D-B — acompanhamento por funcionalidades e etapas

Atualizado em 11 de novembro de 2026. Inclui a refatoração visual da aplicação e
o complemento aprovado de fichas e PDFs. A fase permanece em execução, sem
liberação para produção.

## 1. Definições e leitura do acompanhamento

- **Critérios:** são 105, sendo 75 originais e 30 complementos da Ordem Mestre.
  Há 57 com implementação e verificações locais concluídas e 48 parciais. Nenhum
  critério inteiro está sem início; algumas subtarefas estão em 0%.
- **Etapas:** são os 20 blocos de trabalho do plano. Um critério pode depender
  de várias etapas; concluir uma etapa não conclui automaticamente o critério.
- **Complemento documental:** DOC-A, DOC-B, DOC-C e DOC-D acrescentam quatro
  resultados. Seus percentuais medem somente esse acréscimo, preservando o
  escopo e os resultados anteriores.
- **Concluído localmente /100%:** o escopo indicado foi implementado e conferido
  internamente. A revisão conjunta final e as atividades humanas, físicas ou
  externas ainda se aplicam.
- **Em execução /percentual parcial:** estimativa arredondada de quanto foi
  executado naquele escopo. Não mede prazo, custo ou probabilidade de conclusão.
  Os percentuais não devem ser somados nem ter sua média usada como avanço geral
  da fase. Pontos de uma etapa parcial não recebem conclusão individual sem um
  fechamento registrado.
- **A iniciar /0%:** somente a tarefa ou o novo escopo indicado ainda não tem
  conclusão. Isso não significa que a preparação de todo o recurso esteja em 0%.
- **Responsáveis:** Codex implementa, corrige, testa e documenta. Você decide
  configurações, participação e liberação sob sua responsabilidade.
  Participantes/equipe fazem avaliações de uso; fornecedores participam das
  provas que dependem de seus serviços. Onde um item concluído não repete
  responsável, a implementação e a conferência local são de Codex.
- **Abreviações:** REQ é requisição; COM é compra/doação; ENT é entrega; BAL é
  balanço de estoque. Devolução de materiais tem sentido próprio, equipe para
  família, e não exige uma entrega de origem.

O Modelo Integral continua sendo a aparência da aplicação. Fluent foi
descartado. Os PDFs têm sua própria aparência aprovada; essa referência não muda
o Modelo Integral da aplicação.

## 2. Posição atual

As etapas 01 a 07 estão concluídas localmente em seus escopos anteriores. A etapa
06 fechou as 46 composições diárias e a conferência conjunta. A refatoração
visual do sistema inteiro permanece estimada em 85%; restam outras 20
composições e a conferência completa das 171 relações.

**Trabalho atual:** DOC-B, começando pela separação entre parecer BAL e
aplicação ao estoque. A mudança está em implementação e testes locais; ainda
não foi concluída nem publicada no banco remoto. Não foi atribuído novo
percentual por esse início. A ordem completa do trabalho restante está somente
na seção 5, ao final.

O banco remoto recebeu todas as atualizações publicadas até este ponto.
Atualizações novas continuam sob responsabilidade de Codex. A validação
automática da última versão publicada ainda estava em andamento na última
consulta; o resultado local não aprova o conjunto inteiro. Sonar permanece
adiado por sua decisão.

Os grupos abaixo reúnem o estado dos recursos. A seção final reúne o histórico
das etapas, seus pontos de verificação e uma única sequência de execução.

## 3. Funcionalidades e critérios

### 3.1 Formulários, rascunhos e recuperação

**Já entregue no escopo anterior:** guardar e retomar preenchimentos privados,
comparar edições e recuperar a mesma confirmação. Isso inclui as fichas,
decisões REQ/COM/ENT/BAL, transferências, movimentação familiar, relatos e
decisões de consumo, revisões de fluxo, agenda e Andamentos.

A recuperação entre aparelhos continua em 90% no sistema inteiro. Os demais
formulários de administração, perfil e combinações de edição ainda pertencem às
pendências de Codex.

A nova retomada simples está em DOC-C: um rascunho ativo por usuário, paciente e
tipo, com Continuar ou Descartar e começar novo. Não será criada persistência
para todo campo. Recuperar uma confirmação ainda incerta continua sendo parte do
próprio processo, separada de um rascunho comum.

#### Critérios — Formulários, rascunhos e recuperação

- **Orientar corretamente cada falha de consulta ou confirmação** — Em execução
  · ≈75%. Falta: Revisar os fluxos ainda parciais e suas mensagens de
  recuperação. Responsável: Codex.
- **Tratar alterações concorrentes sem reaplicar uma decisão sozinha** — Em
  execução · ≈75%. Falta: Completar os fluxos restantes de comparação e retorno
  ao ponto certo. Responsável: Codex.
- **Erros de preenchimento claros, no campo certo e sem apagar valores** —
  Concluído · 100%.
- **Guardar rascunho próprio de ficha sem emissão automática** — Concluído ·
  100%.
- **Recuperar a mesma solicitação após perda de resposta** — Concluído · 100%.
- **Distinguir rascunho salvo de emissão oficial em COM, ENT e BAL** — Concluído
  · 100%.
- **Resumo de rascunho legível e retorno ao formulário correto** — Concluído ·
  100%.
- **Reaproveitar materiais sem reaproveitar observações antigas** — Concluído ·
  100%.
- **Rascunhos documentais separados por criação, alvo e intenção** — Concluído ·
  100%.
- **Explicar se nada ocorreu ou se um resultado foi recuperado** — Em execução ·
  ≈80%. Falta: Concluir aplicação das mensagens em todos os fluxos parciais.
  Responsável: Codex.
- **Campos corretos para quantidades, turnos, códigos, senhas e unidades** —
  Concluído · 100%.
- **Consulta repetir consulta; resultado confirmado não voltar a pendente** — Em
  execução · ≈80%. Falta: Completar mensagens e recuperação dos consumidores
  ainda parciais. Responsável: Codex.
- **Falha ao consultar pedir atualização, sem mandar editar fato histórico** —
  Concluído · 100%.
- **Recuperar todos os preenchimentos entre sessões e aparelhos** — Em execução
  · ≈90%. Falta: Concluir a retomada em outros formulários de administração,
  perfil e as combinações restantes de edição. As contagens preservam
  observações após mudanças de estoque, plantão ou ficha. As preparações
  privadas da agenda estão concluídas no escopo interno deste recurso. Revisões
  de fluxo, relatos e decisões de consumo, movimentação familiar, programação do
  balanço, atribuição, adiamentos, pareceres, reconto, decisões de requisição e
  Andamentos privados estão implementados. Responsável: Codex.
- **Preservar edição durante falha, conflito e perda de contexto** — Em execução
  · ≈85%. Falta: Conferir em conjunto as combinações restantes de falha e
  mudança de contexto. Responsável: Codex.

### 3.2 Estoque, catálogo, consumo e agenda

#### Estoque e contagens — recursos concluídos localmente

Consultas incompletas ou de outro paciente, custódia, página ou filtro recebem
erro recuperável. A leitura anterior fica identificada. O BAL preserva a
contagem física quando a consulta falha e usa sua referência própria na revisão.
O envio da contagem agendada só é reconhecido quando corresponde à ficha e à
tentativa; falha, recarga ou resposta divergente preservam a referência, sem
descartar outra tentativa.

Após mudança de estoque, plantão ou ficha, os valores anteriores e suas datas
continuam consultáveis. Uma nova conferência começa com quantidades vazias. As
notas ficam disponíveis, inclusive em outro aparelho depois de salvar. A
abertura e a recuperação de fichas antigas também foram conferidas. A nova regra
do parecer BAL está no complemento documental abaixo.

#### Catálogo e administração diária — recursos concluídos localmente

Criar, editar e adotar itens permite salvar campos incompletos, retomar em outra
sessão, comparar edições, descartar o preenchimento privado e consultar
confirmação perdida. Uma proposta global continua dependendo de outro
administrador no paciente.

Unidades, precisão, apresentações e sucessores preservam zeros à esquerda, fator
das embalagens e motivo de mudança de situação. Comprovantes próprios continuam
consultáveis após perder permissão de gravar, se a leitura estiver autorizada. O
histórico em Mais opções funciona após fechar o editor e em outra sessão.
Consultar uma tentativa guardada não reenvia a operação.

Alertas, destinatários e vínculos guardam campos, comparam edições e recuperam
confirmações. Meu perfil permite consultar a tentativa guardada nesta aba. Se a
alteração encerrar o próprio vínculo, a consulta exige continuar na sessão em
que ela foi feita. A seleção global de contas tem busca e páginas.

#### Agenda — recursos concluídos localmente

Novos tipos e programações têm retomada em outro aparelho, comparação de edições
e recuperação de confirmação. Mudanças do tipo exigem escolha antes de
continuar; um tipo indisponível respeita essa situação.

Profissional, horários e observações são mantidos ao alternar entre alterar e
cancelar. Editar apenas o nome do tipo ou as observações também preserva os
horários. Essa continuidade local não substitui a retomada entre aparelhos.

Alterações de tipos, plantões e programações, cancelamentos, aprovações,
rejeições e encerramentos de propostas têm continuidade privada. Os campos
próprios permanecem após perda de resposta ou outra conclusão. A revisão
preserva mês, datas e foco em conflito e pode ser percorrida pelo teclado.

A tentativa enviada fica preservada neste aparelho após falha ou recarga. É
possível consultar o resultado antes de decidir reenviar a mesma tentativa, sem
criar outra programação. Falha inicial de acesso permite recuperação da
referência. As verificações desse recurso e a atualização do banco foram
concluídas; a revisão geral da fase continua pendente.

#### Critérios — Estoque, catálogo, consumo e agenda

- **Mostrar avarias, devoluções, faltas, parcelas e autores no PDF** — Concluído
  · 100%.
- **Distinguir aprovações antigas das atuais após recontagem** — Concluído ·
  100%.
- **Parcelas terem histórico próprio e não creditarem estoque duas vezes** —
  Concluído · 100%.

### 3.3 Fichas, Andamentos, PDFs e anexos

Este é o único grupo de acompanhamento documental. Reúne conteúdo das fichas,
arquivos gerados, assinatura, verificação, anexos e o complemento aprovado. As
etapas 07/09/10, na sequência final, apontam para estes mesmos resultados.

#### Andamentos privados — concluídos no escopo anterior

O preenchimento pode ser salvo no servidor, retomado em outra sessão ou aparelho
e comparado com outra edição. O texto é mantido quando outra sessão conclui o
andamento, inclusive após perda da resposta de reconhecimento. Isso não conclui
as menções, referências e destaques novos de DOC-C.

#### Fichas e Andamentos — critérios originais

- **Abrir vínculo documental exato ou explicar a restrição de acesso** —
  Concluído · 100%.
- **Histórico em consulta, com resultado de integridade calculado** — Em
  execução · ≈80%. Falta: Completar variações documentais e a conferência de
  todos os fluxos. Responsável: Codex.
- **Todas as relações entre telas terem sentido e acesso correto** — Em execução
  · ≈60%. Falta: Conferir todas as 171 relações, incluindo variantes de balanço
  e cancelamento. Responsável: Codex.

#### Conteúdo, geração e histórico dos PDFs — critérios originais

- **Distinguir compra, doação e tipos de balanço nos títulos** — Concluído ·
  100%.
- **Gerar PDF sem conflito com o tempo de espera dos avisos** — Concluído ·
  100%.
- **Comparar versões e abrir o PDF exato de cada versão** — Concluído · 100%.
- **PDF de requisição com dados e datas corretos, sem quantidade pedida** —
  Concluído · 100%.
- **Documentos antigos manterem origem e datas desconhecidas explícitas** —
  Concluído · 100%.
- **Distinguir data do rascunho, da emissão e do download** — Concluído · 100%.
- **Preservar nomes históricos após mudança ou revogação de acesso** — Concluído
  · 100%.
- **Representar corretamente documentos cancelados, parciais e antigos** —
  Concluído · 100%.
- **Documentos longos não perderem linhas, final do texto ou rodapé** —
  Concluído · 100%.
- **Histórico oferecer versão exata, motivo e diferenças disponíveis** —
  Concluído · 100%.
- **Leitura acessível do PDF e alternativa com a mesma versão** — Em execução ·
  ≈70%. Falta: Concluir cobertura de leitura assistida e conferência com
  participantes. Responsável: Codex; depois participantes.
- **Uma geração confirmada por tentativa, com recuperação segura** — Em execução
  · ≈80%. Falta: Completar combinações de falha e capacidade de armazenamento.
  Responsável: Codex.
- **Diferenças documentais fiéis ao histórico, exibidas para consulta** —
  Concluído · 100%.
- **Documentos completos, legíveis e acessíveis em todos os estados** — Em
  execução · ≈75%. Falta: Completar cenários restantes e leitura assistida; nova
  aparência no complemento documental. Responsável: Codex; depois participantes.
- **PDF de regularização com autores, motivos, efeitos e assinatura** — Em
  execução · ≈80%. Falta: Completar todas as variações e conferir conteúdo e
  acessibilidade. Responsável: Codex.
- **Pedidos distintos gerarem emissões distintas, mantendo cópias antigas** — Em
  execução · ≈85%. Falta: Completar situações de uso simultâneo e falhas
  restantes. Responsável: Codex.
- **Histórico de emissões com identidade e arquivo preservado** — Concluído ·
  100%.
- **Gerar PDF em uma ação e recuperar o mesmo pedido nas quatro fichas** —
  Concluído · 100%.
- **Preservar PDFs antigos sem assinatura criada retroativamente** — Concluído ·
  100%.
- **Recuperar falhas antes e depois de assinar ou guardar o PDF** — Em execução
  · ≈80%. Falta: Completar combinações restantes de falha e concorrência.
  Responsável: Codex.
- **Verificar dados completos e recusar PDF vazio ou incompleto** — Em execução
  · ≈80%. Falta: Completar conferência independente de documentos longos e casos
  restantes. Responsável: Codex.

#### Assinatura e verificação — critérios originais

- **Separar identidade da emissão, assinatura e confiança do certificado** — Em
  execução · ≈80%. Falta: Completar combinações de confiança, documentos antigos
  e falhas. Responsável: Codex.
- **Assinar PDFs com certificado e carimbo de tempo internos** — Concluído ·
  100%.
- **Preparar evolução futura para certificado ICP-Brasil** — Em execução · ≈80%.
  Falta: Completar tratamento de confiança, revogação e recuperação; contratação
  futura separada. Responsável: Codex; futura contratação por você.
- **Guardar e renovar chaves e tratar comprometimento** — Em execução · ≈70%.
  Falta: Completar exercícios de troca, recuperação e incidente; definir
  custódia operacional. Responsável: Codex; depois você.
- **Verificar por QR Code e código digitável, sem expor dados privados** —
  Concluído · 100%.
- **Verificar PDF enviado distinguindo integridade, assinatura e tempo** —
  Concluído · 100%.
- **Recusar adulteração, QR copiado e emissão trocada** — Em execução · ≈80%.
  Falta: Completar as combinações negativas e de documentos antigos.
  Responsável: Codex.
- **Explicar certificados conhecidos, desconhecidos e adulterados** — Em
  execução · ≈80%. Falta: Completar variações de certificados, datas e
  confiança. Responsável: Codex.

#### Anexos e arquivos enviados — critérios originais

- **Recuperar envio de anexo sem duplicar nem trocar o arquivo** — Concluído ·
  100%.
- **Abandonar envio incompleto sem apagar anexos confirmados** — Concluído ·
  100%.
- **Revalidar o acesso ao baixar um arquivo** — Concluído · 100%.
- **Recuperar falha após envio sem acumular arquivos sem controle** — Concluído
  · 100%.
- **Preservar anotações visíveis ou recusar explicitamente a conversão** —
  Concluído · 100%.
- **Detectar arquivo alterado sem entregá-lo como íntegro** — Concluído · 100%.
- **Limites e recusas de envio coerentes antes e depois de enviar** — Em
  execução · ≈80%. Falta: Completar casos de limites extremos e combinações
  documentais restantes. Responsável: Codex.
- **Distinguir original de cópia e preservar ressalva ou recusar** — Concluído ·
  100%.

#### Complemento aprovado de fichas e PDFs

Acrescentado em 11/11/2026. Reutiliza o gerador, a assinatura e os documentos
existentes. A etapa 07 continua concluída somente em seu escopo anterior; isso
não transforma os quatro resultados novos em concluídos.

- **DOC-A — Aparência dos documentos.** A iniciar · 0% do acréscimo. REQ,
  entrega, devolução, compra/doação e BAL terão a composição aprovada, fonte
  Source Sans 3, cores, bandeira lateral quando aplicável, autores, macroetapas,
  tabelas, observações e avisos completos. Conteúdo longo continuará em novas
  páginas com cabeçalhos e rodapés legíveis. Responsável: Codex.
- **DOC-B — Fatos, saldos e atos específicos.** Em execução · 10% do acréscimo.
  Na preparação bilateral, entrega e devolução têm nomes próprios. A devolução
  pode ser registrada sem vincular entrega de origem; concordância, expedição e
  recebimento foram conferidos separadamente. Restam as outras telas, o ajuste
  da criação cotidiana ENT e as novas regras dos arquivos abaixo. Mostrar saldo
  histórico de cada material da COM após sua última entrada validada, parcelas
  separadas e saldo do BAL após a aplicação correspondente. Revisão não altera
  estoque. Mostrar Acesso restrito quando necessário. Devolução é autônoma e não
  exige entrega de origem. Conteúdo emitido, ciências anteriores e atos de
  cancelamento/complemento serão preservados; o cancelamento terá seu aviso e
  pedido de confirmação próprios. Responsável: Codex.
- **DOC-C — Modalidades, Andamentos e consulta.** A iniciar · 0% do acréscimo.
  Ficha completa; Ficha Ampliada com complementos e período; auditoria restrita
  com marca nominativa. Andamentos terão menções a pessoas, referências e
  destaques comuns à tela e ao PDF, mantendo a cronologia. Acessos repetidos
  serão agrupados em janelas iniciais de 20 minutos. Rascunhos comuns terão um
  ativo por usuário, paciente e tipo, com diálogo Continuar ou Descartar e
  começar novo. Não haverá rascunho para todo campo. Confirmações incertas
  continuarão recuperáveis no próprio processo. Responsável: Codex.
- **DOC-D — Geração integrada e exemplos reais.** A iniciar · 0% do acréscimo.
  Integrar a nova composição ao gerador e à assinatura atuais. Preservar cópias
  antigas, recuperação e re-download dos mesmos bytes; nova emissão tem
  identidade própria. Conferir dados, permissões, links, QR e verificação
  conforme o que mudou. Disponibilizar PDFs reais para avaliação visual.
  Responsável: Codex; você poderá avaliar as amostras entregues.

As dependências de devolução, revisão BAL, Andamentos, acessos e retomada
simples pertencem a esse mesmo complemento. Sua avaliação das amostras e os
testes com pessoas continuam separados das implementações de Codex.

### 3.4 Navegação, listas e mensagens

Os dez grupos de listas foram conferidos, incluindo registros antigos e
históricos extensos. Seu detalhamento está junto à etapa 05, na seção final. A
conferência conjunta entre sessões permanece na etapa 19.

As verificações locais de agenda, Andamentos, foco do editor e recebimento
passaram. A seleção intermitente da aba de recebimento continua sujeita à
contraprova na validação automática da versão publicada, sob responsabilidade de
Codex.

#### Critérios — Navegação, listas e mensagens

- **Nomes, filtros e avisos compreensíveis em português** — Concluído · 100%.
- **Botões e atalhos abrirem a tarefa e o paciente corretos** — Concluído ·
  100%.
- **Páginas de acesso recusado e página inexistente compreensíveis** — Concluído
  · 100%.
- **Distinguir carregando, vazio, erro e resultado atualizado** — Concluído ·
  100%.
- **Trocar filtros sem misturar resultados antigos e novos** — Concluído · 100%.
- **Encontrar registros antigos com histórico e paginação** — Concluído · 100%.
- **Manter limites seguros nas consultas, inclusive parâmetros vazios** —
  Concluído · 100%.
- **Erros internos não virarem avisos enganosos de material ambíguo** —
  Concluído · 100%.
- **Atualizar consumo e filas entre sessões sem perder edição** — Concluído ·
  100%.
- **Busca e listas alcançarem todos os registros permitidos** — Em execução ·
  ≈90%. Falta: Conferência conjunta entre sessões na etapa19. Responsável:
  Codex.
- **Buscar, ordenar e filtrar listas grandes sem resultados trocados** —
  Concluído · 100%. Os dez grupos de listas foram conferidos, inclusive
  registros antigos e mais de100 resultados. Responsável: Codex.

### 3.5 Administração, permissões, entrada e orientação

A lentidão demonstrada na consulta de contexto foi corrigida: nos ensaios locais
com milhares de pacientes fictícios, a consulta passou a responder em menos de
um segundo, preservando lista completa e permissões. Esse problema foi
concluído; outras combinações de acesso e recuperação continuam pendentes.

#### Administração e permissões — critérios originais

- **Propostas de alteração compreensíveis, com comparação antes/depois** —
  Concluído · 100%.
- **Alterar ou revogar o vínculo da pessoa correta com revisão** — Concluído ·
  100%.
- **Manter, alterar ou retirar o nome curto de forma explícita** — Concluído ·
  100%.
- **Encontrar propostas antigas ainda pendentes** — Concluído · 100%.
- **Respeitar a criação de paciente inativo** — Concluído · 100%.
- **Distinguir informação profissional declarada, conferida e validada fora** —
  Concluído · 100%.
- **Separar criação global de paciente das tarefas locais** — Concluído · 100%.
- **Conferência profissional com autor e data, sem autovalidação externa** —
  Concluído · 100%.
- **Separar administração global, paciente e perfil pessoal** — Concluído ·
  100%.

#### Entrada e orientação — critérios originais

- **Distinguir preparação do paciente de liberação operacional** — Em execução ·
  ≈70%. Falta: Completar adoção de materiais e etapas físicas; revisar todos os
  papéis. Responsável: Codex; depois você e equipe.
- **Guia por papel, reabrível e sem conceder permissões** — Em execução · ≈75%.
  Falta: Completar convergência dos guias e conferir todas as funções.
  Responsável: Codex.
- **Primeiro paciente e orientação respeitarem a autoridade de cada papel** — Em
  execução · ≈70%. Falta: Completar materiais, abertura física e convergência
  dos guias. Responsável: Codex; depois você e equipe.

#### Nove grupos de formulários ainda a conferir — etapa 14

O novo escopo desses nove grupos está em 0%. Será conferida a necessidade de
retomada simples, sem rascunho para todo campo. Os campos comuns e as
confirmações incertas conservam sua recuperação própria. Isso não desfaz os
editores específicos já concluídos na administração diária.

Os grupos são convites, conferência profissional, contas globais, cadastro
e configurações do paciente, regras de comunicação e permissões, campos
comuns do perfil, preferência de ciência e políticas de suporte. Os pontos
14.1 a 14.9 estão enumerados juntos na sequência final. O que falta é conferir
a retomada necessária e os campos comuns desses grupos. Responsável: Codex.

### 3.6 Aplicativo instalado, conexão, avisos e lembretes

#### Instalação e uso sem conexão — critérios originais

- **Indicar conexão e atualização dos dados sem enviar ações antigas** — Em
  execução · ≈75%. Falta: Completar combinações de troca de paciente e perda de
  sessão. Responsável: Codex.
- **Instalar e atualizar sem perder edição confirmada** — Em execução · ≈80%.
  Falta: Concluir conferências restantes e repetir em aparelho físico.
  Responsável: Codex; depois você.
- **Aplicativo instalado com atualização segura e privacidade** — Em execução ·
  ≈80%. Falta: Concluir teste de atualização e repetir S24 Ultra no Preview
  estável. Responsável: Codex; depois você.

#### Avisos e lembretes — critérios originais

- **Alcançar todos os pacientes, inclusive listas grandes** — Em execução ·
  ≈80%. Falta: Fechar a conferência de cobertura e atrasos em todas as
  situações. Responsável: Codex.
- **Recuperar períodos em que o serviço de lembretes ficou indisponível** — Em
  execução · ≈80%. Falta: Conferir todas as combinações de atraso e retorno do
  serviço. Responsável: Codex.
- **Avisos por aparelho com conteúdo genérico e acesso autorizado** — Em
  execução · ≈75%. Falta: Concluir configuração própria do Preview e prova de
  entrega real autorizada. Responsável: Codex; você; serviço externo.
- **Ativar e revogar avisos por usuário e aparelho** — Em execução · ≈75%.
  Falta: Concluir configuração do Preview e testes físicos com serviço real
  autorizado. Responsável: Codex; você; serviço externo.
- **Não duplicar avisos e abrir o destino autorizado** — Em execução · ≈75%.
  Falta: Fechar recuperação e observação operacional; provar entrega real
  autorizada. Responsável: Codex; você; serviço externo.
- **Reconciliar lembretes antigos e atrasados sem perder obrigações** — Em
  execução · ≈80%. Falta: Concluir conferência operacional de atrasos e
  cobertura. Responsável: Codex.

### 3.7 Backup, recuperação, suporte e monitoramento

#### Backup e recuperação — critérios originais

- **Copiar banco e arquivos de forma protegida e conferível** — Em execução ·
  ≈75%. Falta: Completar ligação com destino independente e operação permanente.
  Responsável: Codex; você para destino e custódia.
- **Retenção de sete cópias diárias e quatro semanais** — Em execução · ≈75%.
  Falta: Ativar agenda somente no momento autorizado e conferir capacidade.
  Responsável: Codex; você para ativação.
- **Recuperar cópia isolada e preparar teste operacional completo** — Em
  execução · ≈75%. Falta: Completar recuperação de chaves e ensaio operacional
  com metas de prazo. Responsável: Codex; depois você e responsáveis.

#### Suporte e monitoramento — critérios originais

- **Separar detalhe técnico do suporte da orientação para a equipe** — Em
  execução · ≈80%. Falta: Completar integração das ocorrências e conferir a
  operação assistida. Responsável: Codex; depois você e suporte.
- **Registrar, reconhecer, tratar e consultar incidentes** — Em execução · ≈80%.
  Falta: Concluir integração e conferir o trabalho real de suporte. Responsável:
  Codex; depois você e suporte.
- **Acompanhar banco, avisos, assinaturas, integridade, backups e recuperação**
  — Em execução · ≈75%. Falta: Completar cobertura operacional e integração
  externa quando autorizada. Responsável: Codex; você; serviço externo.
- **Visão técnica global sem acesso indevido aos dados dos pacientes** — Em
  execução · ≈80%. Falta: Concluir revisão dos estados e exercício com
  responsáveis. Responsável: Codex; depois suporte.

### 3.8 Banco, qualidade, piloto e encerramento

#### Banco e sincronização do Preview — critérios originais

- **Aplicar atualizações pendentes da fase D-A no banco remoto** — Concluído ·
  100%.
- **Manter as atualizações D-B aplicadas no remoto** — Em execução · ≈90%.
  Falta: Aplicar as atualizações que surgirem nos próximos lotes e fechar a
  conferência final. Responsável: Codex.

#### Piloto, qualidade e encerramento — critérios originais

- **Contingência, piloto e responsáveis definidos antes da liberação** — Em
  execução · ≈50%. Falta: Completar preparação técnica; você define
  participantes, canais e responsáveis. Responsável: Codex; você e equipe.
- **Concluir verificações automáticas e tratar qualidade do código** — Em
  execução · ≈65%. Falta: Fechar verificações do candidato final; Sonar aguarda
  configuração por sua decisão. Responsável: Codex; você para liberar acesso ao
  Sonar, se necessário.

### 3.9 Refatoração visual de todo o sistema

**Estimativa global da aplicação: 85%.** Inclui telas, estados e funções; não
significa que 85% das telas estejam individualmente aprovadas. As46 composições
da etapa 06 foram fechadas localmente. Restam outras 20 e a conferência completa
das 66 composições e171 relações.

O alvo é uma aparência única do Modelo Integral, incluindo recursos ausentes do
HTML de referência. A dependência Fluent foi removida e a base compartilhada e
as fichas em abas foram implementadas. Isso não conclui toda a migração. Os PDFs
têm sua referência própria e estão no grupo 3.3.

#### Critérios originais da aparência

- **Aplicar integralmente o Modelo Integral em todos os recursos** — Em execução
  · ≈85%. Falta: Concluir telas, variações, diálogos e conferência visual
  global. Responsável: Codex.
- **Fechar, voltar, confirmar e descartar mantendo o foco correto** — Em
  execução · ≈75%. Falta: Concluir diálogos e variações restantes; depois testar
  com pessoas. Responsável: Codex; depois você e participantes.
- **Textos longos e ampliação sem cortar conteúdo ou botões** — Em execução ·
  ≈65%. Falta: Conferir textos extremos, ampliação de 400% e todas as telas.
  Responsável: Codex; depois participantes.
- **Concluir cada composição de tela preservando suas funções** — Em execução ·
  ≈85%. Falta: Concluir e conferir individualmente as 66 composições e suas
  variações. Responsável: Codex.

#### Estado por área visual

Estes percentuais abrangem o sistema inteiro. A conferência ainda indicada
aqui é a global e das variações restantes; ela não desfaz o fechamento local
das 46 composições diárias da etapa 06.

- **Regra visual única e retirada do Fluent** — 100%. Já aplicado: Nova regra
  adotada; biblioteca antiga retirada. Falta: Manter a regra nos próximos
  incrementos. Responsável: Codex.
- **Cores, tipografia, espaçamentos e ícones** — 80%. Já aplicado: Base
  compartilhada aplicada. Falta: Ajustar diferenças em todos os consumidores.
  Responsável: Codex.
- **Botões, campos, seletores, menus e diálogos reutilizáveis** — 75%. Já
  aplicado: Componentes comuns e principais fluxos migrados. Falta: Conferir
  todas as variações e estados. Responsável: Codex.
- **Cabeçalho, menu lateral, paciente e navegação móvel** — 80%. Já aplicado:
  Estrutura e navegação do modelo. Falta: Fechar comparação de todos os estados
  e larguras. Responsável: Codex.
- **Formulários, apoio, avisos e recuperação** — 90%. Já aplicado: Criação, atos
  de compra, entrega e transferência, decisões de requisição, pareceres,
  reconto, programação, atribuição e adiamentos do balanço, movimentação
  familiar, relatos, complementos e decisões de consumo, revisões de fluxo e
  preparação privada de Andamentos e agenda, incluindo alterações, cancelamentos
  e decisões sobre recursos existentes, e os editores de itens, unidades,
  precisão, apresentações, situações e sucessores do catálogo. Falta: Conferir
  demais variações, lacunas de continuidade e apresentação conjunta.
  Responsável: Codex.
- **Listas, tabelas, cartões, busca e filtros** — 80%. Já aplicado: Saldos,
  movimentos, catálogo, unidades, embalagens, relatos, arquivos e materiais das
  quatro fichas usam as composições comuns. Nomes, precisão e valores continuam
  visíveis. Falta: Demais listas e conferência conjunta de todas as variações.
  Responsável: Codex.
- **Fichas de requisição, compra, entrega e balanço em abas** — 95%. Já
  aplicado: Abas, cabeçalho, ações e painéis reais; seleção, revisão e materiais
  de requisição e compra conferidos. Entregas agora separam declaração,
  expedição, aceite, conciliação e pendência; recebimento, cancelamento e
  apuração mantêm seus fatos. A caixa mostra autoria, percurso e tarefa com
  filtros recuperáveis. Balanços agora apresentam contagem, referência,
  diferenças e pareceres em composições próprias. Versões, anexos e novos
  arquivos têm composição comum. Falta: Conferência conjunta, variações
  restantes e novas regras do complemento. Responsável: Codex.
- **Andamentos nas quatro fichas** — 80%. Já aplicado: Registro salvo, autoria,
  data, categoria, etapa, preenchimento privado entre aparelhos, comparação e
  recuperação, com resumos próprios para cada situação. Falta: Fechar aparência
  de todos os estados e vínculos. Responsável: Codex.
- **Cronologia, fatos automáticos e referências** — 80%. Já aplicado: Eventos,
  fatos por versão, comparações e vínculos autorizados seguem a composição
  comum. Falta: Conferência conjunta, combinações restantes e referências novas
  do complemento. Responsável: Codex.
- **Faixa de atenção, próxima providência e status** — 65%. Já aplicado:
  Estrutura integrada a fatos operacionais. Falta: Concluir critérios de cada
  tarefa sem avisos simulados. Responsável: Codex.
- **Administração, cadastros, perfil e guias** — 50%. Já aplicado: Base comum e
  diversos controles migrados. Falta: Revisar todas as telas e diálogos dessas
  áreas. Responsável: Codex.
- **Estoque, consumo, transferências e variantes de balanço** — 85%. Já
  aplicado: Saldos, trânsito, movimentos e relatos seguem o modelo; origem,
  correção familiar, preparação, revisão, recuperação e decisões continuam
  funcionando. Quantidades e nomes preservados ficam distintos do cadastro
  atual. Falta: Conferência conjunta, estados restantes e nova regra de revisão
  do balanço no complemento documental. Responsável: Codex.
- **Central de avisos, aplicativo e suporte** — 50%. Já aplicado: Recursos
  existentes usam a base compartilhada. Falta: Completar composição e
  conferência das superfícies restantes. Responsável: Codex.
- **Preservação de todas as funções e relações** — 60%. Já aplicado: Principais
  consumidores e fichas preservados. Falta: Conferir individualmente as 66
  composições e 171 relações. Responsável: Codex.
- **Teclado, foco, ampliação, contraste e celular** — 50%. Já aplicado:
  Verificações dirigidas em diferentes larguras e navegadores. Falta: Cobertura
  restante, ampliação real e tarefas com pessoas. Responsável: Codex; depois
  você e participantes.

## 4. Sua participação e dependências externas

As tarefas abaixo não transferem para você implementações pendentes de Codex e
não interrompem atividades independentes da fase.

| Atividade | Estado | Responsável |
| --- | --- | --- |
| Aceite das tarefas no Preview | 0% final | Você e equipe |
| Reteste do S24 Ultra | 0% desta rodada | Você, apoio de Codex |
| Acessibilidade com pessoas | 0% homologado | Participantes |
| Destino de backup e chaves | Decisão pendente | Você |
| Agenda de backup externo | 0% ativada | Você autoriza;Codex prepara |
| Configuração do Sonar | Adiada | Codex;seu acesso se preciso |
| Piloto, suporte e canais | Não definidos | Você e equipe |
| Provedores e aparelhos reais | Pendente | Codex,você,fornecedores |
| ICP-Brasil e serviços futuros | Futuros | Você e fornecedores |
| Ensaio de recuperação | 0% realizado | Codex,você,responsáveis |
| Liberação de piloto/produção | 0%;fora do escopo | Você e responsáveis |

Você organiza os participantes das avaliações. Codex prepara os testes, orienta
e corrige o que for identificado. O uso anterior no S24 Ultra já aconteceu e
revelou a falha; o 0% acima se refere ao reteste da versão corrigida pelo
endereço estável, incluindo instalação, atualização e avisos.

Codex prepara e configura o destino e a agenda de backup após sua escolha e
autorização. O ensaio operacional completo depende também dos responsáveis
reais. Contratação ICP-Brasil não bloqueia a assinatura interna da D-B.
Integrações externas ainda não autorizadas permanecem desligadas.

## 5. Histórico das etapas e sequência única de execução

Os IDs 01 a 20 são os blocos fixados do plano. Permanecem estáveis. Os detalhes
das etapas 04, 05 e 14 deixaram de formar apêndices independentes: cada ponto está
vinculado à sua etapa ou ao grupo funcional correspondente.

O escopo inteiro continua sendo os 105 critérios, as 66 composições e as 171
relações, mais DOC-A a DOC-D. Falhas entram no bloco correspondente. Acréscimos
futuros terão sua origem e seu efeito no plano identificados; não serão
incluídos silenciosamente no primeiro item.

### 5.1 Histórico consolidado — etapas encerradas localmente

Os fechamentos anteriores continuam sujeitos à revisão conjunta da etapa 19.
Novos formulários seguem na etapa 14; a retomada simples adicional segue em
DOC-C. As datas individuais das conclusões anteriores não são reconstruídas
aqui. O estado abaixo preserva os fechamentos já registrados. Em 11/11/2026, o
complemento documental foi incorporado; o fechamento de 06.6 consolidou a etapa
06 com 47 cenários distintos qualificados. Foco, links e rolagem identificados
nesse lote foram corrigidos. A atualização das classes de quebra de texto também
está concluída.

#### 01 — Rascunhos das fichas e atos operacionais

Estado: concluída localmente · 100%. Responsável: Codex.

**Escopo encerrado:** REQ, COM, ENT, BAL, transferências, movimentação familiar,
consumo, revisões de fluxo, agenda e Andamentos.

Pontos concluídos:

- 01.1 Criação e revisão das fichas.
- 01.2 Decisões REQ/COM/ENT/BAL.
- 01.3 Transferências e movimentação familiar.
- 01.4 Relatos e decisões de consumo.
- 01.5 Revisões de fluxo.
- 01.6 Agenda e decisões de plantões.
- 01.7 Andamentos privados.

#### 02 — Catálogo e administração diária

Estado: concluída localmente · 100%. Responsável: Codex.

**Escopo encerrado:** Itens, adoção, unidades, precisão, apresentações,
sucessores, alertas, destinatários, vínculos e seus comprovantes.

Pontos concluídos:

- 02.1 Criar, editar e adotar materiais.
- 02.2 Unidades e precisão.
- 02.3 Apresentações.
- 02.4 Situação e sucessores.
- 02.5 Alertas de estoque.
- 02.6 Destinatários.
- 02.7 Vínculos e revogação.
- 02.8 Consulta dos comprovantes próprios.

#### 03 — Leitura confiável do estoque e revisão do BAL

Estado: concluída localmente · 100%. Responsável: Codex.

**Escopo encerrado:** Saldos, trânsito, histórico de movimentos e referência da
contagem BAL.

Pontos concluídos:

- 03.1 Saldos e trânsito válidos ou erro compreensível.
- 03.2 Histórico, página e filtro correspondentes.
- 03.3 Revisão BAL com valores e campos preservados.
- 03.4 Chave estável das colunas e aviso do editor corrigido.

#### 04 — Estados, próximas providências e vínculos das fichas

Estado: concluída localmente · 100%. Responsável: Codex.

Escopo anterior das fichas. As novas regras permanecem em DOC-A a DOC-D.

- **04.1 — Requisição — estados, atendimento, cancelamento e vínculos.**
  Concluído localmente · 100% do escopo anterior. A orientação abre a seção
  correta; vínculos, falhas de consulta e registros encerrados foram conferidos.
  O novo aviso e pedido de confirmação do cancelamento pertencem ao complemento
  DOC-B/DOC-C e ainda precisam de execução. Responsável — Codex.
- **04.2 — Compra e doação — aquisição, parcelas, chegada e encerramento.**
  Concluído localmente · 100% deste ponto. Preparação e aprovação pendente não
  aparecem como conclusão. A orientação distingue aquisição, chegada,
  conferência e encerramento; parcelas rejeitadas continuam no histórico.
  Recuperação, doação, permissões e ausência de entrada duplicada foram
  conferidas. Os novos PDFs e regras do complemento continuam nos blocos DOC-A a
  DOC-D. Responsável — Codex.
- **04.3 — Entrega — conferência, divergência, devolução e regularização.**
  Concluído localmente · 100% deste ponto. Encerrar a conferência com uma
  diferença não aparece como recebimento integral. Cancelamento, divergência,
  regularização e material ainda desconhecido têm orientações distintas.
  Quantidades aceitas, autoria, vínculos e recuperação foram conferidos. A nova
  devolução autônoma e os novos atos do complemento continuam no bloco DOC-B.
  Responsável — Codex.
- **04.4 — Transferências — origem, destino, aceite e encerramento.** Concluído
  localmente · 100% deste ponto. A preparação bilateral identifica entrega e
  devolução, aceita vínculo de origem opcional e separa declaração,
  concordância, expedição e recebimento. Recusa e retirada não movimentam
  materiais. Recuperação, conflitos e autorias foram conferidos. As demais telas
  e os novos arquivos de devolução continuam em DOC-B/DOC-D. Responsável —
  Codex.
- **04.5 — Consumo — relato, complemento, decisão e origem do desconto.**
  Concluído localmente · 100% deste ponto. Uma leitura antiga não apaga
  complemento nem reabre uma confirmação. Durante atualização ou falha, a
  leitura anterior fica identificada e novas operações aguardam consulta válida.
  Origem do desconto, falta/rejeição sem baixa, original preservado e
  recuperação após perda de resposta ou permissão foram conferidos. Responsável
  — Codex.
- **04.6 — BAL — agendado, sem regime, revisão, reconto e contagens.** Concluído
  localmente · 100% deste ponto. A orientação distingue revisão, mudança de
  referência, efeito registrado, reconto e falta de contador. Outra atribuição
  ativa não cria uma pendência nesta ficha. Recuperação, autoria, contagem
  anterior e ausência de desconto repetido foram conferidas. A nova regra que
  separa parecer e alteração de estoque continua em DOC-B. Responsável — Codex.

#### 05 — Busca, filtros, listas e históricos completos

Estado: concluída localmente · 100%. Responsável: Codex.

1. **05.1 — Estoques e movimentos.** Concluído localmente · 100% deste ponto.
   Foram conferidos os materiais e o histórico com mais de100 movimentos,
   páginas completas, ordem, filtros, falha, vazio e resposta antiga, sem
   alteração do estoque. Reaproveitadas as verificações anteriores válidas.
2. **05.2 — Fichas e requisições.** Concluído localmente · 100% deste ponto.
   Conferidas mais de100 requisições, todas as páginas e a pendência mais
   antiga. Resposta incompleta não aparece como lista vazia; falhas conservam a
   leitura anterior identificada. Filtros, foco, recarga e Voltar foram
   conferidos, sem registrar ciência ou movimentar estoque.
3. **05.3 — Compras e parcelas.** Concluído localmente · 100% deste ponto.
   Conferidas101 compras e101 parcelas, com todas as páginas e busca da mais
   antiga. As parcelas têm busca e filtro por situação, sem mudar sua
   identificação ao filtrar. Falha de consulta conserva os campos e não repete
   crédito de estoque. São filtros simples, sem novo rascunho.
4. **05.4 — Entregas e transferências.** Concluído localmente · 100% deste
   ponto. Todas as páginas permitem alcançar as tarefas pessoais e o histórico
   autorizado, incluindo devoluções. Uma consulta incompleta recebe erro
   recuperável; trocar filtros não mostra a seleção anterior como atual.
   Consultar não confirma recebimento nem altera estoque.
5. **05.5 — Consumo.** Concluído localmente · 100% deste ponto. Todas as páginas
   permitem alcançar relatos antigos, com busca no texto original, filtros e
   retorno pelo navegador. Consulta com falha não inventa vazio. Uma página
   atrasada não entra em outra seleção; perda de acesso retira o conteúdo
   daquela custódia. Consultar não confirma nem desconta.
6. **05.6 — Agenda.** Concluído localmente · 100% deste ponto. O mês completo e
   os filtros foram conferidos com mais de 100 plantões. Um plantão iniciado
   antes do período continua visível quando ainda o alcança, sem duplicação.
   Falha identifica a consulta anterior e suspende alterações; perda de acesso
   retira os dados. O histórico completo de mudanças foi concluído no
   ponto05.10.
7. **05.7 — Catálogo e contas.** Concluído localmente · 100% deste ponto. O
   catálogo completo e as contas globais alcançam registros além do limite
   antigo de 1.000 linhas. Foram conferidos busca, todas as páginas dos
   resultados tardios e preservação dos registros. Uma falha não inventa vazio e
   a perda de acesso retira o conteúdo. A tabela estreita foi conferida na etapa
   06; os outros ajustes do editor global continuam na etapa 14.
8. **05.8 — Notificações.** Concluído localmente · 100% deste ponto. Foram
   conferidos102 avisos, todas as páginas e o mais antigo. Página e filtro são
   mantidos ao recarregar e usar Voltar. Consulta com falha não inventa vazio;
   uma resposta atrasada não troca o filtro atual. Consultar não marca avisos
   nem registra ciência. Só a marcação escolhida altera o aviso correspondente.
9. **05.9 — Propostas antigas.** Concluído localmente · 100% deste ponto. Todas
   as101 pendências e202 propostas do histórico ficaram alcançáveis, incluindo a
   mais antiga. Busca, foco, recarga e Voltar foram conferidos. Falha mantém
   apenas a consulta válida da mesma seleção, identificada e com decisões
   suspensas. Consultar não aprova nem altera configurações.
10. **05.10 — Auditoria e históricos.** Concluído localmente · 100% deste ponto.
    O histórico da agenda permite alcançar todos os registros autorizados,
    incluindo os anteriores ao limite antigo de100. A visão pessoal fica
    restrita ao próprio profissional. Auditoria e agenda mantêm campos, filtros,
    recarga e Voltar. Falhas não inventam vazio; perda de acesso retira o
    conteúdo. Consultar não altera registros nem estoque.

#### 06 — Aparência completa das áreas de operação

Estado: concluída localmente · 100%. Responsável: Codex.

Concluído — 06.1, as nove composições de requisição e compra: seleção, revisão,
consulta, ciência, lista frequente, aquisição, parcelas e encerramento da
expectativa, com funções e dados preservados.

Concluído — 06.2 entregas e transferências, 100% deste ponto local. As sete
composições foram conferidas: preparação, revisão, caixa de tarefas, materiais,
recebimento pessoal, cancelamento, apuração e fatos da transferência, sem
confundir declaração com entrega realizada.

Concluído — 06.3 balanços e agenda, 100% deste ponto local. As nove composições
foram conferidas, com contagem e referência separadas, pareceres com autoria
própria, reconto, adiamento, horários e comparação das alterações. A regra nova
para o parecer nunca alterar o estoque ainda está pendente no grupo de fichas e
documentos.

Concluído — 06.4 estoque, catálogo e consumo, 100% deste ponto local. As 12
composições mantêm saldos, quantidades em trânsito, histórico, correção
familiar, origem autorizada, nomes alternativos, precisão, embalagens,
sucessores, relatos, complementos e decisões. Os registros preservam os fatos
antigos e identificam o cadastro atual.

Concluído — 06.5 arquivos, resumos e seções documentais, 100% deste ponto local.
As nove composições preservam versões, exemplares, anexos, consultas,
recuperação e comparações. O novo diálogo de abandono tem retorno seguro; as
novas regras de retomada simples continuam no complemento DOC-C.

Concluído — 06.6 conferência conjunta local, com larguras, textos longos,
teclado, foco e formas de leitura. O grupo mantém suas 46 composições originais.
Ampliação nativa, leitor de tela e aparelho real continuam nos testes finais com
participantes; a fase ainda não está liberada. Responsável — Codex.

#### 07 — Dados e histórico dos PDFs

Estado: concluída localmente · 100%. Responsável: Codex.

**Escopo encerrado:** Conteúdo técnico e histórico já qualificados de REQ, COM,
ENT e BAL, incluindo legado, parcelas, regularização, datas e autores.

Pontos concluídos:

- 07.1 Fatos, autoria e datas.
- 07.2 REQ nova e histórica.
- 07.3 Compra, doação e parcelas.
- 07.4 ENT e regularização.
- 07.5 BAL e reconto.
- 07.6 Conteúdo extenso, versões e exemplares preservados.

A geração anterior preserva fatos, autores, datas, conteúdo extenso e arquivos
antigos de REQ, COM, ENT e BAL. A nova aparência e as regras acrescidas
permanecem separadas nos resultados DOC-A a DOC-D.

### 5.2 Ordem atual do trabalho restante

Esta é a única ordem de execução deste acompanhamento. O complemento documental
entra primeiro nos blocos 07/09/10, com suas dependências diretas, sem criar
outra missão nem substituir as 20 etapas. Depois seguem os blocos ainda abertos
abaixo. As atividades externas continuam separadas e podem ser preparadas em
paralelo quando independentes.

**Agora — DOC-B · 10%, começando pelo BAL.** Separar parecer e estoque; depois
saldo histórico autorizado da COM, devolução autônoma cotidiana e preservação de
fichas com cancelamento/complemento e confirmações próprias. A mudança do BAL
está em implementação e testes locais, ainda sem conclusão nem publicação no
banco remoto.

**Depois — DOC-A · 0%.** Composição documental compartilhada; requisição;
compra/doação; entrega/devolução; BAL; conteúdo longo.

**Depois — DOC-C · 0%.** Retomada simples; Andamentos com referências e
destaques; acessos agrupados; modalidades completa e ampliada e auditoria.

**Depois — DOC-D · 0%.** Integrar os conteúdos à emissão e assinatura atuais,
conferir os caminhos alterados e entregar PDFs reais para avaliação.

Codex é responsável por esses quatro blocos; você avalia as amostras e participa
dos testes humanos indicados na seção 4.

#### 08 — Assinatura, certificados e ciclo das chaves

Estado: em execução · 80%. Responsável: Codex.

**Condição para fechar:** Assinar e verificar com os provedores internos e
demonstrar troca/recuperação de chaves e preservação dos exemplares anteriores.

Pontos de verificação:

- 08.1 Provedores de assinatura e tempo.
- 08.2 Renovação e troca de certificado.
- 08.3 Rotação de chaves.
- 08.4 Incidente e comprometimento.
- 08.5 Recuperação de custódia e exemplares antigos.

**O que falta:** Completar os exercícios de troca, renovação, recuperação e
incidente das chaves, mantendo os exemplares antigos.

#### 09 — Emissão, recuperação e falhas documentais

Estado: em execução · 85%. Responsável: Codex.

**Condição para fechar:** A mesma intenção recupera o mesmo exemplar; pedidos
distintos geram emissões distintas; as falhas previstas deixam resultado
recuperável e íntegro.

Pontos de verificação:

- 09.1 Gerar nas quatro fichas.
- 09.2 Mesma intenção e pedidos distintos.
- 09.3 Falha antes/depois da assinatura.
- 09.4 Falha depois de gravar o arquivo.
- 09.5 Concorrência e abandono.
- 09.6 Legado e retomada da emissão.

**O que falta:** Concluir os casos restantes de falha, uso simultâneo,
documentos antigos e recuperação da emissão.

#### 10 — Verificação por QR, código e arquivo

Estado: em execução · 85%. Responsável: Codex.

**Condição para fechar:** Originais, adulteração, QR copiado, outra emissão,
certificado/token desconhecido ou inválido e limites de arquivo têm resultados
corretos.

Pontos de verificação:

- 10.1 QR e código digitável.
- 10.2 Upload e limites.
- 10.3 Arquivo adulterado e QR copiado.
- 10.4 Outra emissão e cópia divergente.
- 10.5 Certificado, cadeia e carimbo de tempo.
- 10.6 Resultado público e leitura acessível.

**O que falta:** Concluir os casos restantes de integridade, confiança e
acessibilidade da conferência documental.

#### 11 — Aplicativo, instalação, atualização e offline

Estado: em execução · 80%. Responsável: Codex.

**Condição para fechar:** Os cenários automatizáveis de instalação/atualização
preservam edição e privacidade e orientam a recuperação.

Pontos de verificação:

- 11.1 Instalação no Preview protegido.
- 11.2 Recuperação do aplicativo.
- 11.3 Atualização com edição aberta.
- 11.4 Troca de paciente e sessão revogada.
- 11.5 Sem conexão e retorno da conexão.

**O que falta:** Conferir as combinações restantes de contexto, sessão e
atualização. Reteste físico fica na etapa 20.

#### 12 — Notificações internas e avisos Push

Estado: em execução · 80%. Responsável: Codex.

**Condição para fechar:** Os casos internos e de transporte controlado comprovam
autorização, deduplicação, recuperação e manutenção da pendência interna.

Pontos de verificação:

- 12.1 Ativar e revogar neste aparelho.
- 12.2 Preferências e troca de conta.
- 12.3 Conteúdo genérico do aviso.
- 12.4 Evento e tentativa únicos.
- 12.5 Destino correto do aviso.
- 12.6 Falha e recuperação da entrega controlada.

**O que falta:** Concluir inscrição, entrega e recuperação controladas.
Provedores e aparelhos reais ficam na etapa 20.

#### 13 — Lembretes e retorno após parada

Estado: em execução · 75%. Responsável: Codex.

**Condição para fechar:** Mais de 100 configurações são alcançadas em rodadas
finitas e o retorno após indisponibilidade identifica ou recupera a obrigação
uma vez.

Pontos de verificação:

- 13.1 Rotinas antigas reconciliadas.
- 13.2 Mais de 100 configurações alcançadas.
- 13.3 Retorno após período perdido.
- 13.4 Obrigação processada uma vez.

**O que falta:** Consolidar as rotinas anteriores e todas as situações previstas
de retorno após parada.

#### 14 — Retomada dos formulários restantes

Estado: a iniciar neste escopo · 0%. Responsável: Codex.

**Condição para fechar:** Conferir os nove grupos; quando houver rascunho comum,
manter um ativo por usuário, paciente e tipo, com diálogo Continuar/Descartar.
Preservar a recuperação das confirmações incertas.

Pontos de verificação:

- 14.1 Convites.
- 14.2 Conferência profissional.
- 14.3 Contas globais.
- 14.4 Cadastro do paciente.
- 14.5 Configurações do paciente.
- 14.6 Regras de comunicação e permissões.
- 14.7 Campos comuns do perfil.
- 14.8 Preferência de ciência.
- 14.9 Políticas de suporte.

Os nove grupos estão descritos juntos no grupo 3.5. Conferir retomada somente
onde necessária, sem rascunho para todo campo. Responsável: Codex.

#### 15 — Aparência das demais áreas e relações restantes

Estado: em execução · 50%. Responsável: Codex.

**Condição para fechar:** O conjunto das etapas 6 e 15 cobre as 66 composições e
171 relações, com funções preservadas e comparação individual com o Modelo
Integral.

Pontos de verificação:

- 15.1 Administração.
- 15.2 Identidade e acesso.
- 15.3 Notificações.
- 15.4 Guias.
- 15.5 Relações restantes e comparação nas cinco larguras.

**O que falta:** Concluir variações de cadastro, perfil, acesso, guias, avisos e
suporte, com suas relações restantes.

#### 16 — Entrada, guias e primeira residência

Estado: em execução · 70%. Responsável: Codex.

**Condição para fechar:** Os papéis percorrem os guias previstos, recebem
tarefas legítimas e conseguem preparar a residência com seus limites de
autoridade.

Pontos de verificação:

- 16.1 Criação global e administração local.
- 16.2 Adoção e preparação de materiais.
- 16.3 Guia reabrível por papel.
- 16.4 Preparação física e contingência.

**O que falta:** Concluir guias, adoção de materiais, autonomia local e
contingência. Designações reais ficam na etapa 20.

#### 17 — Monitoramento e suporte

Estado: em execução · 85%. Responsável: Codex.

**Condição para fechar:** Falhas previstas geram observações/incidentes
persistentes com severidade, reconhecimento, tratamento e visão autorizada.

Pontos de verificação:

- 17.1 Falhas da aplicação e banco.
- 17.2 Tarefas automáticas e notificações.
- 17.3 Emissão, assinatura e integridade.
- 17.4 Backup e recuperação.
- 17.5 Reconhecer e tratar incidentes.
- 17.6 Impacto pessoal e detalhe mínimo de suporte.

**O que falta:** Concluir a cobertura de falhas e o exercício de acompanhamento
e tratamento pelas pessoas autorizadas.

#### 18 — Backup e recuperação

Estado: em execução · 75%. Responsável: Codex.

**Condição para fechar:** O software e seus ensaios demonstram captura coerente,
retenção, verificação e recuperação isolada com os limites operacionais
documentados.

Pontos de verificação:

- 18.1 Captura coerente de banco e arquivos.
- 18.2 Criptografia e verificação de integridade.
- 18.3 Retenção diária e semanal.
- 18.4 Cópia antes de alteração crítica.
- 18.5 Restauração isolada e recuperação de chaves.

**O que falta:** Concluir recuperação de chaves, armazenamento independente e
exercícios restantes; ativação operacional depende de autorização.

#### 19 — Validação final, migrations e encerramento D-B

Estado: em execução · 50%. Responsável: Codex.

**Condição para fechar:** As etapas executáveis estão fechadas, o candidato
final tem seus resultados verificados e o remoto corresponde à branch; os gates
restantes têm responsável definido.

Pontos de verificação:

- 19.1 Critérios e alterações finais reconciliados.
- 19.2 Instalação limpa, atualização e testes integrados.
- 19.3 CI do candidato final e estado real do Sonar.
- 19.4 Remoto, Preview, relatório e próximos gates.

**O que falta:** Concluir o conjunto final, aplicar atualizações pendentes e
identificar as responsabilidades externas. Sonar permanece adiado.

#### 20 — Participação externa e gates D-C/D6

Estado: pendente externo · 0%. Responsável: Você; participantes; serviços
externos.

**Condição para fechar:** Cada atividade externa é homologada pelo responsável
correspondente quando autorizada; o fechamento técnico D-B registra as que
continuam pendentes.

Pontos de verificação:

- 20.1 Teste físico do aplicativo e avisos.
- 20.2 Uso com participantes e tecnologia assistiva.
- 20.3 Impressão e conferência humana.
- 20.4 Responsáveis e residência piloto.
- 20.5 Destino externo dos backups e custódia.
- 20.6 Ensaio operacional e decisão de liberação.

As atividades, os percentuais externos e os responsáveis estão na seção 4. Não
há autorização de liberação operacional nesta missão.

A D-B somente termina quando as etapas executáveis 01 a 19 e o complemento
documental estiverem entregues e as pendências externas da etapa 20 estiverem
identificadas corretamente. A liberação real permanece com os responsáveis e os
próximos gates de D-C/D6.
