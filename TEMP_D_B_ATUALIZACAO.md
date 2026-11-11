# D-B — atualização temporária por funcionalidades

Atualizado em 11 de novembro de 2026. Inclui a mudança integral de aparência
solicitada. A fase continua em execução e ainda não está liberada para
produção.

## Como ler este quadro

Abreviações: COM é compra; ENT é entrega; BAL é balanço de estoque.

São 105 critérios da D-B: 56 com implementação e verificações locais
concluídas e 49 parcialmente executados. Nenhum critério inteiro está sem
início, mas há subtarefas ainda não iniciadas, indicadas abaixo. Critérios
semelhantes aparecem separados porque cobrem exigências distintas da fase.

O complemento aprovado de fichas e PDFs acrescenta quatro resultados,
DOC-A a DOC-D, acompanhados separadamente abaixo. Ele conserva os critérios
e os avanços anteriores. A nova aparência dos documentos está autorizada.

“Concluído · 100%” significa concluído no escopo interno daquele critério.
Ainda há a revisão final conjunta e os testes necessários antes da liberação.
Os percentuais parciais são estimativas de quanto foi executado, arredondadas;
não medem tempo gasto, créditos, prazo nem probabilidade de conclusão. Não se
deve calcular o avanço geral contando cada critério como se tivesse o mesmo
tamanho.

“Codex” sou eu. Implementar, corrigir, testar e documentar o que falta é minha
responsabilidade. “Você” indica decisão, configuração, participação em teste
ou liberação que depende de você. “Participantes/equipe” são pessoas que
usarão ou avaliarão o sistema; “serviço externo” depende também do fornecedor.

Os testes completos da próxima versão publicada ainda precisam ser concluídos.
O banco remoto já recebeu as atualizações desta etapa, sem pendências.
A fase continua em execução.

**Plano de fechamento reorganizado.** Há 20 etapas com escopo e condição de
conclusão definidos. As etapas 01, 02, 03 e 07 estão concluídas localmente.
A etapa 04 tem seis pontos. Os pontos 04.1, 04.2 e 04.3 estão concluídos
localmente no escopo declarado; o próximo é 04.4, transferências.
Os nove grupos de formulários estão enumerados na etapa 14. A sequência e
os pontos individuais estão ao final.

**Consultar estoque e revisar contagens · 100% deste bloco.** Consultas
incompletas ou de outro paciente, custódia, página ou filtro recebem erro
recuperável. A leitura anterior fica identificada. O BAL mantém a contagem
física quando a consulta falha e usa sua referência própria para revisão.
Responsável pela implementação e verificações locais — Codex.

**Preenchimentos de alertas, destinatários e vínculos · 100% deste recurso.**
É possível guardar campos incompletos, retomá-los, comparar duas edições e
recuperar uma confirmação perdida. Meu perfil permite consultar a tentativa
guardada nesta aba. Se a própria alteração encerrar seu vínculo, essa consulta
exige continuar na mesma sessão em que você fez a alteração. A seleção global
de contas agora tem busca e páginas. Responsável pela implementação: Codex.

A agenda agora preserva neste aparelho a tentativa enviada: depois de uma
resposta perdida ou de recarregar, é possível consultar o resultado antes de
decidir reenviar a mesma tentativa. A consulta não cria outra programação.
Uma falha inicial de acesso também pode ser recuperada sem perder a referência.

**Preenchimento privado de Andamentos: concluído · 100% deste recurso.**
Agora é possível guardar o preenchimento privado no servidor e
retomá-lo em outra sessão ou aparelho. É possível comparar duas edições e
manter seu texto quando outra sessão conclui o andamento, inclusive após
perder a resposta do reconhecimento desse resultado.

**Novos tipos de plantão e novas programações: concluídos · 100% deste
recurso.**
É possível guardar o preenchimento incompleto no servidor, retomar em outro
aparelho, comparar edições e recuperar uma confirmação perdida. Mudanças do
tipo de plantão exigem sua escolha antes de continuar, preservando os outros
campos. O tipo cadastrado como indisponível agora respeita essa escolha.

**Alternar a operação de um plantão sem perder os campos:** concluído · 100%
deste ajuste.
Profissional, horários e observações são mantidos ao trocar entre alterar e
cancelar. Editar só o nome do tipo ou as observações do plantão também conserva
os horários registrados. Responsável pelo ajuste: Codex. Essa continuidade
local não substitui a retomada entre aparelhos.

**Continuidade privada de toda a agenda: concluída · 100% deste recurso.**
Já é possível
guardar e retomar alterações de tipos, plantões e programações, cancelamentos,
aprovações, rejeições e encerramentos de propostas. A recuperação mantém os
campos próprios mesmo após perda de resposta ou outra conclusão. As
verificações deste recurso e a atualização do banco foram concluídas; a
revisão geral da fase continua pendente. Responsável: Codex.

**Recuperação do envio da contagem agendada: concluída · 100% deste ajuste.**
A resposta só é aceita quando corresponde à ficha e à tentativa enviada.
Falha, recarga ou resposta divergente mantêm a referência para recuperação;
o descarte privado não apaga outra tentativa. Responsável: Codex.

**Retomada da contagem após mudança de referência · 100% deste ajuste.**
Quando o estoque, o plantão ou a ficha muda, os valores anteriores continuam
consultáveis com suas datas. A nova conferência começa com quantidades vazias
para registrar o que existe no momento. As notas ficam disponíveis, inclusive
em outro aparelho após salvar o rascunho privado. A recuperação da abertura
de fichas antigas também foi conferida. Responsável pelo ajuste: Codex.

**Preenchimento privado do catálogo · 100% de criar, editar e adotar itens.**
É possível salvar campos incompletos, retomar em outra sessão, comparar
edições, descartar o preenchimento privado e consultar uma confirmação
perdida. Uma proposta enviada pela administração global continua a depender
da aprovação de outro administrador no paciente.

**Preenchimentos de unidades, precisão, apresentações e sucessores · 100%
dos editores.** Os campos incompletos podem ser retomados. O cadastro
preserva zeros à esquerda, o fator das embalagens e o motivo de uma mudança
de situação. O comprovante pode ser recuperado no editor se a permissão de
gravar for retirada e a leitura continuar autorizada.

**Localizar comprovantes do catálogo · 100% deste recurso.** O atalho em
Mais opções abre o histórico da própria conta no paciente selecionado.
Funciona depois de fechar o editor, em outra sessão e após perder a permissão
de gravar, enquanto a leitura estiver autorizada. Tentativas ainda guardadas
no navegador podem ser consultadas sem enviar a operação outra vez.

A recuperação entre aparelhos continua estimada em 90% no sistema inteiro.
Ainda faltam outros formulários de administração, perfil e combinações de
edição. Essas pendências são do Codex.
Relatos e decisões de consumo, revisões de fluxo, movimentação familiar,
fichas e atos de balanço dos lotes anteriores permanecem implementados.
A troca das classes de quebra de texto já foi concluída.

**Lentidão demonstrada na leitura de contexto: correção concluída · 100% deste
problema.** Nos ensaios locais com milhares de pacientes fictícios, a consulta
passou a responder em menos de um segundo, preservando a lista completa e as
permissões. Responsável pela correção: Codex. Isso não encerra as outras
combinações de acesso e recuperação ainda indicadas neste quadro.

A revisão de uma programação também conserva o mês aberto, as datas e o foco
quando há conflito. É possível percorrer a revisão longa pelo teclado.

As verificações de agenda, Andamentos e foco do editor foram ajustadas e
passaram na rodada local. O recebimento também passou. A seleção intermitente
da aba de recebimento ainda precisa de contraprova na CI. Responsável pelo
acompanhamento: Codex.

## Funcionalidades e critérios da D-B

### Formulários, rascunhos e recuperação

- **Orientar corretamente cada falha de consulta ou confirmação** — Em
  execução · ≈75%. Falta: Revisar os fluxos ainda parciais e suas mensagens de
  recuperação. Responsável: Codex.
- **Tratar alterações concorrentes sem reaplicar uma decisão sozinha** — Em
  execução · ≈75%. Falta: Completar os fluxos restantes de comparação e
  retorno ao ponto certo. Responsável: Codex.
- **Erros de preenchimento claros, no campo certo e sem apagar valores** —
  Concluído · 100%.
- **Guardar rascunho próprio de ficha sem emissão automática** —
  Concluído · 100%.
- **Recuperar a mesma solicitação após perda de resposta** — Concluído · 100%.
- **Distinguir rascunho salvo de emissão oficial em COM, ENT e BAL** —
  Concluído · 100%.
- **Resumo de rascunho legível e retorno ao formulário correto** — Concluído ·
  100%.
- **Reaproveitar materiais sem reaproveitar observações antigas** — Concluído
  · 100%.
- **Rascunhos documentais separados por criação, alvo e intenção** —
  Concluído · 100%.
- **Explicar se nada ocorreu ou se um resultado foi recuperado** — Em execução
  · ≈80%. Falta: Concluir aplicação das mensagens em todos os fluxos parciais.
  Responsável: Codex.
- **Campos corretos para quantidades, turnos, códigos, senhas e unidades** —
  Concluído · 100%.
- **Consulta repetir consulta; resultado confirmado não voltar a pendente** —
  Em execução · ≈80%. Falta: Completar mensagens e recuperação dos
  consumidores ainda parciais. Responsável: Codex.
- **Falha ao consultar pedir atualização, sem mandar editar fato histórico** —
  Concluído · 100%.
- **Recuperar todos os preenchimentos entre sessões e aparelhos** — Em
  execução · ≈90%. Falta: Concluir a retomada em outros formulários de
  administração, perfil e as combinações restantes de edição. As contagens
  preservam observações após mudanças de
  estoque, plantão ou ficha. As preparações
  privadas da agenda estão concluídas no escopo interno deste recurso.
  Revisões de fluxo, relatos e decisões de consumo, movimentação familiar,
  programação do balanço, atribuição, adiamentos, pareceres,
  reconto, decisões de requisição e Andamentos privados estão implementados.
  Responsável: Codex.
- **Preservar edição durante falha, conflito e perda de contexto** — Em
  execução · ≈85%. Falta: Conferir em conjunto as combinações restantes de
  falha e mudança de contexto. Responsável: Codex.

### Fichas e Andamentos

- **Abrir vínculo documental exato ou explicar a restrição de acesso** —
  Concluído · 100%.
- **Histórico em consulta, com resultado de integridade calculado** — Em
  execução · ≈80%. Falta: Completar variações documentais e a conferência de
  todos os fluxos. Responsável: Codex.
- **Todas as relações entre telas terem sentido e acesso correto** — Em
  execução · ≈60%. Falta: Conferir todas as 171 relações, incluindo variantes
  de balanço e cancelamento. Responsável: Codex.

### Estoque, entregas e transferências

- **Mostrar avarias, devoluções, faltas, parcelas e autores no PDF** —
  Concluído · 100%.
- **Distinguir aprovações antigas das atuais após recontagem** — Concluído ·
  100%.
- **Parcelas terem histórico próprio e não creditarem estoque duas vezes** —
  Concluído · 100%.

### PDFs e histórico documental

- **Distinguir compra, doação e tipos de balanço nos títulos** — Concluído ·
  100%.
- **Gerar PDF sem conflito com o tempo de espera dos avisos** — Concluído ·
  100%.
- **Comparar versões e abrir o PDF exato de cada versão** — Concluído · 100%.
- **PDF de requisição com dados e datas corretos, sem quantidade pedida** —
  Concluído · 100%.
- **Documentos antigos manterem origem e datas desconhecidas explícitas** —
  Concluído · 100%.
- **Distinguir data do rascunho, da emissão e do download** — Concluído ·
  100%.
- **Preservar nomes históricos após mudança ou revogação de acesso** —
  Concluído · 100%.
- **Representar corretamente documentos cancelados, parciais e antigos** —
  Concluído · 100%.
- **Documentos longos não perderem linhas, final do texto ou rodapé** —
  Concluído · 100%.
- **Histórico oferecer versão exata, motivo e diferenças disponíveis** —
  Concluído · 100%.
- **Leitura acessível do PDF e alternativa com a mesma versão** — Em execução
  · ≈70%. Falta: Concluir cobertura de leitura assistida e conferência com
  participantes. Responsável: Codex; depois participantes.
- **Uma geração confirmada por tentativa, com recuperação segura** — Em
  execução · ≈80%. Falta: Completar combinações de falha e capacidade de
  armazenamento. Responsável: Codex.
- **Diferenças documentais fiéis ao histórico, exibidas para consulta** —
  Concluído · 100%.
- **Documentos completos, legíveis e acessíveis em todos os estados** — Em
  execução · ≈75%. Falta: Completar cenários restantes e leitura assistida;
  nova aparência no complemento documental. Responsável: Codex; depois
  participantes.
- **PDF de regularização com autores, motivos, efeitos e assinatura** — Em
  execução · ≈80%. Falta: Completar todas as variações e conferir conteúdo e
  acessibilidade. Responsável: Codex.
- **Pedidos distintos gerarem emissões distintas, mantendo cópias antigas** —
  Em execução · ≈85%. Falta: Completar situações de uso simultâneo e falhas
  restantes. Responsável: Codex.
- **Histórico de emissões com identidade e arquivo preservado** — Concluído ·
  100%.
- **Gerar PDF em uma ação e recuperar o mesmo pedido nas quatro fichas** —
  Concluído · 100%.
- **Preservar PDFs antigos sem assinatura criada retroativamente** — Concluído
  · 100%.
- **Recuperar falhas antes e depois de assinar ou guardar o PDF** — Em
  execução · ≈80%. Falta: Completar combinações restantes de falha e
  concorrência. Responsável: Codex.
- **Verificar dados completos e recusar PDF vazio ou incompleto** — Em
  execução · ≈80%. Falta: Completar conferência independente de documentos
  longos e casos restantes. Responsável: Codex.

### Complemento aprovado de fichas e PDFs

Acrescentado em 11/11/2026. Os percentuais abaixo medem somente o novo
complemento. O gerador, a assinatura e os documentos já implementados serão
aproveitados. Os resultados anteriores continuam registrados.

- **DOC-A — Aparência dos documentos.** A iniciar · 0% do acréscimo.
  REQ, entrega, devolução, compra/doação e BAL terão a composição aprovada,
  fonte Source Sans 3, cores, bandeira lateral quando aplicável, autores,
  macroetapas, tabelas, observações e avisos completos. Conteúdo longo
  continuará em novas páginas com cabeçalhos e rodapés legíveis.
  Responsável: Codex.
- **DOC-B — Fatos, saldos e atos específicos.** A iniciar · 0% do acréscimo.
  Mostrar saldo histórico de cada material da COM após sua última entrada
  validada, parcelas separadas e saldo do BAL após a aplicação correspondente.
  Revisão não altera estoque. Mostrar Acesso restrito quando necessário.
  Devolução é autônoma e não exige entrega de origem. Conteúdo emitido,
  ciências anteriores e atos de cancelamento/complemento serão preservados;
  o cancelamento terá seu aviso e pedido de confirmação próprios.
  Responsável: Codex.
- **DOC-C — Modalidades, Andamentos e consulta.** A iniciar · 0% do acréscimo.
  Ficha completa; Ficha Ampliada com complementos e período; auditoria
  restrita com marca nominativa. Andamentos terão menções a pessoas,
  referências e destaques comuns à tela e ao PDF, mantendo a cronologia.
  Acessos repetidos serão agrupados em janelas iniciais de 20 minutos.
  Rascunhos comuns terão um ativo por usuário, paciente e tipo, com diálogo
  Continuar ou Descartar e começar novo. Não haverá rascunho para todo campo.
  Confirmações incertas continuarão recuperáveis no próprio processo.
  Responsável: Codex.
- **DOC-D — Geração integrada e exemplos reais.** A iniciar · 0% do acréscimo.
  Integrar a nova composição ao gerador e à assinatura atuais. Preservar
  cópias antigas, recuperação e re-download dos mesmos bytes; nova emissão
  tem identidade própria. Conferir dados, permissões, links, QR e verificação
  conforme o que mudou. Disponibilizar PDFs reais para avaliação visual.
  Responsável: Codex; você poderá avaliar as amostras entregues.

Entram nos blocos 07, 09 e 10. Devolução, revisão BAL, Andamentos, acessos e
retomada simples são dependências diretas nos blocos correspondentes.
A sequência de 20 etapas continua. O escopo anterior da etapa 07 está
concluído; os quatro resultados novos ainda não estão implementados.

### Assinatura e verificação documental

- **Separar identidade da emissão, assinatura e confiança do certificado** —
  Em execução · ≈80%. Falta: Completar combinações de confiança, documentos
  antigos e falhas. Responsável: Codex.
- **Assinar PDFs com certificado e carimbo de tempo internos** — Concluído ·
  100%.
- **Preparar evolução futura para certificado ICP-Brasil** — Em execução ·
  ≈80%. Falta: Completar tratamento de confiança, revogação e recuperação;
  contratação futura separada. Responsável: Codex; futura contratação por
  você.
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

### Anexos e arquivos enviados

- **Recuperar envio de anexo sem duplicar nem trocar o arquivo** — Concluído ·
  100%.
- **Abandonar envio incompleto sem apagar anexos confirmados** — Concluído ·
  100%.
- **Revalidar o acesso ao baixar um arquivo** — Concluído · 100%.
- **Recuperar falha após envio sem acumular arquivos sem controle** —
  Concluído · 100%.
- **Preservar anotações visíveis ou recusar explicitamente a conversão** —
  Concluído · 100%.
- **Detectar arquivo alterado sem entregá-lo como íntegro** — Concluído ·
  100%.
- **Limites e recusas de envio coerentes antes e depois de enviar** — Em
  execução · ≈80%. Falta: Completar casos de limites extremos e combinações
  documentais restantes. Responsável: Codex.
- **Distinguir original de cópia e preservar ressalva ou recusar** — Concluído
  · 100%.

### Navegação, listas e mensagens

- **Nomes, filtros e avisos compreensíveis em português** — Concluído · 100%.
- **Botões e atalhos abrirem a tarefa e o paciente corretos** — Concluído ·
  100%.
- **Páginas de acesso recusado e página inexistente compreensíveis** —
  Concluído · 100%.
- **Distinguir carregando, vazio, erro e resultado atualizado** — Concluído ·
  100%.
- **Trocar filtros sem misturar resultados antigos e novos** — Concluído ·
  100%.
- **Encontrar registros antigos com histórico e paginação** — Concluído ·
  100%.
- **Manter limites seguros nas consultas, inclusive parâmetros vazios** —
  Concluído · 100%.
- **Erros internos não virarem avisos enganosos de material ambíguo** —
  Concluído · 100%.
- **Atualizar consumo e filas entre sessões sem perder edição** — Concluído ·
  100%.
- **Busca e listas alcançarem todos os registros permitidos** — Em execução ·
  ≈70%. Falta: Completar listas e situações de consulta ainda parciais.
  Responsável: Codex.
- **Buscar, ordenar e filtrar listas grandes sem resultados trocados** — Em
  execução · ≈70%. Falta: Completar listas restantes, inclusive com mais de
  100 registros. Responsável: Codex.

### Administração e permissões

- **Propostas de alteração compreensíveis, com comparação antes/depois** —
  Concluído · 100%.
- **Alterar ou revogar o vínculo da pessoa correta com revisão** — Concluído ·
  100%.
- **Manter, alterar ou retirar o nome curto de forma explícita** — Concluído ·
  100%.
- **Encontrar propostas antigas ainda pendentes** — Concluído · 100%.
- **Respeitar a criação de paciente inativo** — Concluído · 100%.
- **Distinguir informação profissional declarada, conferida e validada fora**
  — Concluído · 100%.
- **Separar criação global de paciente das tarefas locais** — Concluído ·
  100%.
- **Conferência profissional com autor e data, sem autovalidação externa** —
  Concluído · 100%.
- **Separar administração global, paciente e perfil pessoal** — Concluído ·
  100%.

### Entrada no sistema e orientação

- **Distinguir preparação do paciente de liberação operacional** — Em execução
  · ≈70%. Falta: Completar adoção de materiais e etapas físicas; revisar todos
  os papéis. Responsável: Codex; depois você e equipe.
- **Guia por papel, reabrível e sem conceder permissões** — Em execução ·
  ≈75%. Falta: Completar convergência dos guias e conferir todas as funções.
  Responsável: Codex.
- **Primeiro paciente e orientação respeitarem a autoridade de cada papel** —
  Em execução · ≈70%. Falta: Completar materiais, abertura física e
  convergência dos guias. Responsável: Codex; depois você e equipe.

### Aplicativo instalado e uso sem conexão

- **Indicar conexão e atualização dos dados sem enviar ações antigas** — Em
  execução · ≈75%. Falta: Completar combinações de troca de paciente e perda
  de sessão. Responsável: Codex.
- **Instalar e atualizar sem perder edição confirmada** — Em execução · ≈80%.
  Falta: Concluir conferências restantes e repetir em aparelho físico.
  Responsável: Codex; depois você.
- **Aplicativo instalado com atualização segura e privacidade** — Em execução
  · ≈80%. Falta: Concluir teste de atualização e repetir S24 Ultra no Preview
  estável. Responsável: Codex; depois você.

### Avisos e lembretes

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

### Backup e recuperação

- **Copiar banco e arquivos de forma protegida e conferível** — Em execução ·
  ≈75%. Falta: Completar ligação com destino independente e operação
  permanente. Responsável: Codex; você para destino e custódia.
- **Retenção de sete cópias diárias e quatro semanais** — Em execução · ≈75%.
  Falta: Ativar agenda somente no momento autorizado e conferir capacidade.
  Responsável: Codex; você para ativação.
- **Recuperar cópia isolada e preparar teste operacional completo** — Em
  execução · ≈75%. Falta: Completar recuperação de chaves e ensaio operacional
  com metas de prazo. Responsável: Codex; depois você e responsáveis.

### Suporte e monitoramento

- **Separar detalhe técnico do suporte da orientação para a equipe** — Em
  execução · ≈80%. Falta: Completar integração das ocorrências e conferir a
  operação assistida. Responsável: Codex; depois você e suporte.
- **Registrar, reconhecer, tratar e consultar incidentes** — Em execução ·
  ≈80%. Falta: Concluir integração e conferir o trabalho real de suporte.
  Responsável: Codex; depois você e suporte.
- **Acompanhar banco, avisos, assinaturas, integridade, backups e
  recuperação** — Em execução · ≈75%. Falta: Completar cobertura operacional e
  integração externa quando autorizada. Responsável: Codex; você; serviço
  externo.
- **Visão técnica global sem acesso indevido aos dados dos pacientes** — Em
  execução · ≈80%. Falta: Concluir revisão dos estados e exercício com
  responsáveis. Responsável: Codex; depois suporte.

### Banco e sincronização do Preview

- **Aplicar atualizações pendentes da fase D-A no banco remoto** — Concluído ·
  100%.
- **Manter as atualizações D-B aplicadas no remoto** — Em execução · ≈90%.
  Falta: Aplicar as atualizações que surgirem nos próximos lotes e fechar a
  conferência final. Responsável: Codex.

### Piloto, qualidade e encerramento

- **Contingência, piloto e responsáveis definidos antes da liberação** — Em
  execução · ≈50%. Falta: Completar preparação técnica; você define
  participantes, canais e responsáveis. Responsável: Codex; você e equipe.
- **Concluir verificações automáticas e tratar qualidade do código** — Em
  execução · ≈65%. Falta: Fechar verificações do candidato final; Sonar aguarda
  configuração por sua decisão. Responsável: Codex; você para liberar acesso ao
  Sonar, se necessário.

### Nova aparência do sistema

- **Aplicar integralmente o Modelo Integral em todos os recursos** — Em
  execução · ≈60%. Falta: Concluir telas, variações, diálogos e conferência
  visual global. Responsável: Codex.
- **Fechar, voltar, confirmar e descartar mantendo o foco correto** — Em
  execução · ≈75%. Falta: Concluir diálogos e variações restantes; depois
  testar com pessoas. Responsável: Codex; depois você e participantes.
- **Textos longos e ampliação sem cortar conteúdo ou botões** — Em execução ·
  ≈65%. Falta: Conferir textos extremos, ampliação de 400% e todas as telas.
  Responsável: Codex; depois participantes.
- **Concluir cada composição de tela preservando suas funções** — Em execução
  · ≈60%. Falta: Concluir e conferir individualmente as 66 composições e suas
  variações. Responsável: Codex.

## Refatoração visual de todo o sistema

**Estimativa global: aproximadamente 60% executados.** É uma estimativa
conservadora da aplicação completa do modelo, incluindo telas, estados e
funções; não significa que 60% das telas estejam individualmente aprovadas.
Ainda falta conferir cada uma das 66 composições e suas 171 relações. A
aparência Fluent foi descartada e sua dependência técnica já foi removida. A
nova base compartilhada e as fichas em abas estão implementadas; isso não
conclui a migração inteira.

O alvo é uma aparência única do Modelo Integral, com todos os recursos atuais,
inclusive os que não aparecem no HTML. Esse percentual se refere à aplicação.
Os PDFs agora têm aparência própria aprovada e os quatro resultados
adicionais DOC-A a DOC-D, acompanhados no bloco documental.

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
  Estrutura e navegação do modelo. Falta: Fechar comparação de todos os
  estados e larguras. Responsável: Codex.
- **Formulários, apoio, avisos e recuperação** — 90%. Já aplicado: Criação,
  atos de compra, entrega e transferência, decisões de requisição, pareceres,
  reconto, programação, atribuição e adiamentos do balanço, movimentação
  familiar, relatos, complementos e decisões de consumo, revisões de fluxo e
  preparação privada de Andamentos e agenda, incluindo alterações,
  cancelamentos e decisões sobre recursos existentes, e os editores de itens,
  unidades, precisão, apresentações, situações e sucessores do catálogo.
  Falta: Conferir demais variações, lacunas de continuidade e apresentação
  conjunta. Responsável: Codex.
- **Listas, tabelas, cartões, busca e filtros** — 55%. Já aplicado: Base,
  vários consumidores e a consulta de saldos com mínimo, situação, unidades e
  filtro. Falta: Completar as outras listas e verificar todas as variações.
  Responsável: Codex.
- **Fichas de requisição, compra, entrega e balanço em abas** — 70%. Já
  aplicado: Abas, cabeçalho, ações e painéis reais integrados. Falta:
  Completar cada composição e variante. Responsável: Codex.
- **Andamentos nas quatro fichas** — 80%. Já aplicado: Registro salvo,
  autoria, data, categoria, etapa, preenchimento privado entre aparelhos,
  comparação e recuperação, com resumos próprios para cada situação.
  Falta: Fechar aparência de todos
  os estados e vínculos. Responsável: Codex.
- **Cronologia, fatos automáticos e referências** — 70%. Já aplicado:
  Histórico integrado e vínculos autorizados. Falta: Completar combinações e
  comparação com o modelo. Responsável: Codex.
- **Faixa de atenção, próxima providência e status** — 65%. Já aplicado:
  Estrutura integrada a fatos operacionais. Falta: Concluir critérios de cada
  tarefa sem avisos simulados. Responsável: Codex.
- **Administração, cadastros, perfil e guias** — 50%. Já aplicado: Base comum
  e diversos controles migrados. Falta: Revisar todas as telas e diálogos
  dessas áreas. Responsável: Codex.
- **Estoque, consumo, transferências e variantes de balanço** — 70%. Já
  aplicado: Consulta de saldos em tabela e cartões, mínimos, situação, filtros
  e detalhes; movimentação familiar e consumo com preparação, revisão e
  recuperação privadas; fluxos reais preservados. Falta: Concluir a composição
  geral,
  trânsito, histórico, formulários e os estados restantes. Responsável: Codex.
- **Central de avisos, aplicativo e suporte** — 50%. Já aplicado: Recursos
  existentes usam a base compartilhada. Falta: Completar composição e
  conferência das superfícies restantes. Responsável: Codex.
- **Preservação de todas as funções e relações** — 60%. Já aplicado:
  Principais consumidores e fichas preservados. Falta: Conferir
  individualmente as 66 composições e 171 relações. Responsável: Codex.
- **Teclado, foco, ampliação, contraste e celular** — 50%. Já aplicado:
  Verificações dirigidas em diferentes larguras e navegadores. Falta:
  Cobertura restante, ampliação real e tarefas com pessoas. Responsável:
  Codex; depois você e participantes.

## Tarefas que dependem de você ou de outras pessoas

Estas tarefas não transferem para você as implementações ainda pendentes. Não
são motivo para interromper os trabalhos independentes da D-B.

- **Usar o Preview e relatar o comportamento nas tarefas reais** — Ainda
  pendente de aceite final. Responsável: Você e equipe.
- **Repetir instalação, atualização e avisos no S24 Ultra pelo endereço
  estável** — Novo teste físico pendente; teste anterior revelou a falha.
  Responsável: Você, com orientação e correções do Codex.
- **Avaliar navegação com leitor de tela e acessibilidade em uso real** —
  Homologação com pessoas não realizada. Responsável: Participantes,
  organizados por você; correções pelo Codex.
- **Escolher destino independente dos backups e custódia das chaves** —
  Decisão e ativação operacional pendentes. Responsável: Você; implementação e
  preparação pelo Codex.
- **Configurar definitivamente o Sonar** — Adiado por sua decisão.
  Responsável: Codex configura e corrige quando retomado; você libera acesso,
  se necessário.
- **Designar paciente piloto, responsáveis, suporte e canais** — Ainda não
  definido para operação. Responsável: Você e equipe.
- **Confirmar entrega por provedores e aparelhos reais** — Homologação externa
  pendente; integrações não autorizadas seguem desligadas. Responsável: Codex
  prepara; você e fornecedores participam.
- **Contratar certificado ICP-Brasil ou serviços externos futuros** — Etapa
  futura; não bloqueia assinatura interna da D-B. Responsável: Você e
  fornecedores.
- **Autorizar liberação operacional e ensaio completo de recuperação** — Etapa
  posterior; não autorizado neste trabalho. Responsável: Você e responsáveis.

## Subtarefas operacionais ainda não executadas

O 0% abaixo se refere somente à tarefa indicada. A preparação do recurso pode
estar parcialmente pronta, como mostrado nos blocos anteriores. Incluem
implementação,
validação e ativação operacional; não são motivos para parar os trabalhos
independentes.

- **Aceite final das tarefas com usuários reais:**0%. Responsáveis: você e
  participantes; preparo e eventuais correções pelo Codex.
- **Homologação de acessibilidade com pessoas e tecnologia assistiva:**0%.
  Responsáveis: participantes, organizados por você; correções pelo Codex.
- **Reteste físico da versão corrigida no S24 Ultra:**0% desta nova rodada.
  Responsáveis: você, com orientação e correções do Codex. O teste que
  encontrou a falha anterior já aconteceu.
- **Agenda permanente de backup em destino externo independente:**0% ativada.
  Responsáveis: você escolhe destino e autoriza; Codex prepara e configura.
- **Ensaio operacional completo de recuperação com responsáveis reais:**0%.
  Responsáveis: Codex prepara; você e responsáveis participam e aprovam.
- **Liberação de piloto ou produção:**0%; fora da autorização deste trabalho.
  Responsável: você, depois das implementações e validações necessárias.

## Etapas fixadas para concluir a D-B

A sequência anterior agrupava trabalho demais no primeiro item e recebia
novos subfluxos a cada lote. Esse item foi desdobrado. A retomada das
operações está na etapa 01, os cadastros diários na 02 e os nove formulários
restantes na 14. Os dois primeiros blocos já estão concluídos localmente.
A etapa 03 foi fechada no lote anterior. A etapa 07 já tem sua parte técnica
qualificada. São quatro blocos fechados localmente nesta organização.

O plano cobre os 75 critérios originais e os 30 complementos da Ordem Mestre.
Um critério pode depender de mais de uma etapa. Por isso, fechar uma etapa
pode aumentar o trabalho concluído enquanto o critério completo ainda fica
parcial. As 66 composições e 171 relações da refatoração visual estão
delimitadas nas etapas 06 e 15, junto às respectivas funções.

Cada etapa tem escopo, pontos de verificação e condição de fechamento
registrados. Nos próximos lotes, a atualização indicará a etapa e o ponto
encerrado. Falhas encontradas entram na etapa correspondente. Alterações
dessa lista serão identificadas com sua origem e efeito no plano.

Os percentuais parciais são estimativas do bloco. A validação final conjunta
está na etapa 19. As atividades externas da etapa 20 têm seus próprios
responsáveis e gates. Esta sequência fixa substitui a anterior.

1. **01 — Rascunhos das fichas e operações.** Concluída localmente · 100%.

   Concluído — REQ, COM, ENT, BAL, transferências, estoque familiar, consumo,
   agenda, revisões de fluxo e Andamentos retomam seus preenchimentos e
   recuperam a confirmação.
   Responsável — Codex.

2. **02 — Materiais e administração diária.** Concluída localmente · 100%.

   Concluído — Itens, unidades, apresentações, sucessores, alertas,
   destinatários e vínculos guardam campos e recuperam alterações simultâneas ou
   confirmações perdidas.
   Responsável — Codex.

3. **03 — Consultar estoque e revisar contagens.** Concluída localmente · 100%.

   Concluído — Saldos, trânsito, histórico e revisão do BAL conferem a consulta;
   falhas preservam a leitura anterior e o preenchimento físico.
   Responsável — Codex.

4. **04 — Estados e vínculos das fichas.** Em execução · 80%.

   Para concluir — As seis verificações detalhadas abaixo estão fechadas,
   incluindo
   próxima providência, Andamentos e navegação entre os registros.
   Responsável — Codex.

5. **05 — Busca, filtros e históricos.** Em execução · 70%.

   Para concluir — Todas as listas previstas alcançam os registros permitidos,
   inclusive listas grandes e pendências antigas, com ordenação e resposta
   corretas.
   Responsável — Codex.

6. **06 — Aparência da operação diária.** Em execução · 70%.

   Para concluir — As 46 composições das áreas operacionais e suas variações
   estão
   conferidas no Modelo Integral, em cinco larguras e pelo teclado.
   Responsável — Codex.

7. **07 — Dados e histórico dos PDFs.** Concluída localmente · 100%.

   Concluído — Os casos previstos de REQ, COM, ENT e BAL preservam fatos,
   autores, datas, conteúdo extenso e arquivos antigos.
   Responsável — Codex.

8. **08 — Assinatura e ciclo dos certificados.** Em execução · 80%.

   Para concluir — Assinatura interna, carimbo de tempo, troca, renovação,
   incidente
   e recuperação das chaves foram demonstrados.
   Responsável — Codex.

9. **09 — Geração e recuperação dos PDFs.** Em execução · 85%.

   Para concluir — As quatro fichas geram, guardam e recuperam o arquivo
   correto,
   incluindo as falhas e tentativas simultâneas previstas.
   Responsável — Codex.

10. **10 — Conferir PDF por QR, código e upload.** Em execução · 85%.

    Para concluir — Originais, alterações no arquivo, outro exemplar e
    certificados/carimbos inválidos ou desconhecidos recebem os resultados
    corretos.
    Responsável — Codex.

11. **11 — Aplicativo e atualização.** Em execução · 80%.

    Para concluir — Instalação, atualização com edição aberta, uso sem conexão,
    mudança de paciente e perda de sessão estão conferidos nos testes
    automatizáveis.
    Responsável — Codex.

12. **12 — Notificações e avisos no aparelho.** Em execução · 80%.

    Para concluir — Ativação, revogação, preferências, troca de conta, destino e
    recuperação dos avisos estão conferidos no transporte controlado.
    Responsável — Codex.

13. **13 — Lembretes e retorno após parada.** Em execução · 75%.

    Para concluir — As rotinas antigas estão conciliadas e todas as
    configurações
    previstas são alcançadas, com tratamento único do período perdido.
    Responsável — Codex.

14. **14 — Formulários restantes.** A iniciar neste escopo · 0%.

    Para concluir — Conferir os nove grupos abaixo e simplificar a retomada
    somente onde necessária, sem criar rascunho para cada campo. Resultados
    incertos continuam recuperáveis no próprio processo.
    Responsável — Codex.

15. **15 — Aparência das demais áreas.** Em execução · 50%.

    Para concluir — As 20 composições restantes estão conferidas; junto à etapa
    06,
    completam as 66 composições e as 171 relações previstas.
    Responsável — Codex.

16. **16 — Entrada, guias e primeira residência.** Em execução · 70%.

    Para concluir — Os papéis percorrem os guias, recebem tarefas permitidas e
    conseguem preparar materiais e a residência.
    Responsável — Codex.

17. **17 — Acompanhamento de falhas e suporte.** Em execução · 85%.

    Para concluir — As falhas previstas são registradas e podem ser
    reconhecidas,
    tratadas e consultadas pelas pessoas autorizadas.
    Responsável — Codex.

18. **18 — Backup e recuperação.** Em execução · 75%.

    Para concluir — Banco e arquivos têm cópia cifrada, verificação de
    integridade,
    retenção diária/semanal e recuperação isolada demonstradas.
    Responsável — Codex.

19. **19 — Testes finais e encerramento D-B.** Em execução · 50%.

    Para concluir — O conjunto final está validado, o remoto corresponde à
    branch, e
    o relatório identifica cada pendência externa e seu responsável.
    Responsável — Codex.

20. **20 — Participação externa e próximas fases.** Pendente externo · 0%.

    Para concluir — Você, participantes e fornecedores realizam as atividades
    que
    dependem de uso real, aparelhos, serviços ou autorização operacional.
    Responsável — Você, equipe e fornecedores.

### Próxima etapa — 04, estados e vínculos das fichas

Os pontos 04.1, 04.2 e 04.3 estão concluídos no escopo declarado. Restam os
pontos 04.4 a 04.6. Cada um terá seu próprio fechamento. As novas
regras documentais estão identificadas em DOC-A a DOC-D.

- **04.1 — Requisição — estados, atendimento, cancelamento e vínculos.**
  Concluído localmente · 100% do escopo anterior. A orientação abre a seção
  correta; vínculos, falhas de consulta e registros encerrados foram
  conferidos. O novo aviso e pedido de confirmação do cancelamento pertencem
  ao complemento DOC-B/DOC-C e ainda precisam de execução.
  Responsável — Codex.
- **04.2 — Compra e doação — aquisição, parcelas, chegada e encerramento.**
  Concluído localmente · 100% deste ponto. Preparação e aprovação pendente
  não aparecem como conclusão. A orientação distingue aquisição, chegada,
  conferência e encerramento; parcelas rejeitadas continuam no histórico.
  Recuperação, doação, permissões e ausência de entrada duplicada foram
  conferidas. Os novos PDFs e regras do complemento continuam nos blocos
  DOC-A a DOC-D. Responsável — Codex.
- **04.3 — Entrega — conferência, divergência, devolução e regularização.**
  Concluído localmente · 100% deste ponto. Encerrar a conferência com uma
  diferença não aparece como recebimento integral. Cancelamento, divergência,
  regularização e material ainda desconhecido têm orientações distintas.
  Quantidades aceitas, autoria, vínculos e recuperação foram conferidos.
  A nova devolução autônoma e os novos atos do complemento continuam no
  bloco DOC-B. Responsável — Codex.
- **04.4 — Transferências — origem, destino, aceite e encerramento.**
  Implementado; conferência conjunta pendente. Responsável — Codex.
- **04.5 — Consumo — relato, complemento, decisão e origem do desconto.**
  Implementado; conferência conjunta pendente. Responsável — Codex.
- **04.6 — BAL — agendado, sem regime, revisão, reconto e contagens.**
  Implementado; conferência conjunta pendente. Responsável — Codex.

### Escopo restante dos formulários — etapa 14

Esta etapa inclui os nove grupos abaixo. Ela está depois dos blocos
operacionais e dos PDFs por sua prioridade. Pela orientação de 11/11/2026,
será conferida a necessidade de retomada e adotado um diálogo simples onde
couber. Não será criada persistência de rascunho para todo campo. Os fluxos
de acesso e as confirmações incertas conservam sua recuperação própria.

- **14.1 — Convites.** Retomada simples onde necessária, sem rascunho para todo
  campo; conferência pendente. Responsável
  — Codex.
- **14.2 — Conferência profissional.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente. Responsável — Codex.
- **14.3 — Contas globais.** Retomada simples onde necessária, sem rascunho para
  todo campo; conferência pendente.
  Responsável — Codex.
- **14.4 — Cadastro do paciente.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente.
  Responsável — Codex.
- **14.5 — Configurações do paciente.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente. Responsável — Codex.
- **14.6 — Regras de comunicação e permissões.** Retomada dos campos comuns
  ainda a concluir. Responsável — Codex.
- **14.7 — Campos comuns do perfil.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente. Responsável — Codex.
- **14.8 — Preferência de ciência.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente. Responsável — Codex.
- **14.9 — Políticas de suporte.** Retomada simples onde necessária, sem
  rascunho para todo campo; conferência pendente.
  Responsável — Codex.

A próxima etapa de implementação é a 04. O quadro será atualizado pelos
pontos encerrados dessa lista. O fechamento técnico da D-B exige as etapas
executáveis 01 a 19 e o registro correto das pendências da etapa 20. A decisão
de liberação real continua com os responsáveis e os gates de D-C/D6. O novo
complemento DOC-A a DOC-D também deve ser entregue no bloco documental.
