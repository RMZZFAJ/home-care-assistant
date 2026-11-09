# D-B — atualização temporária por funcionalidades

Atualizado em 9 de novembro de 2026. Inclui a mudança integral de aparência
solicitada. A fase continua em execução e ainda não está liberada para
produção.

## Como ler este quadro

Abreviações: COM é compra; ENT é entrega; BAL é balanço de estoque.

São 105 critérios da D-B: 56 com implementação e verificações locais
concluídas e 49 parcialmente executados. Nenhum critério inteiro está sem
início, mas há subtarefas ainda não iniciadas, indicadas abaixo. Critérios
semelhantes aparecem separados porque cobrem exigências distintas da fase.

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

Pendência comum: as verificações dirigidas deste lote passaram; a rodada
completa do novo código publicado ainda precisa ser concluída. A rodada
anterior encontrou uma falha de foco, já corrigida e verificada localmente.
O banco remoto está atualizado, com 175 atualizações aplicadas. A fase
continua em execução.

Neste lote, arquivar, cancelar e identificar item extra na requisição ganharam
preenchimento privado recuperável entre sessões, comparação antes de confirmar
e recuperação após perda de resposta. A troca das classes de quebra de texto
também está concluída. Os demais pontos pendentes continuam abaixo.

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
- **Guardar rascunho por conta e recuperar sem emissão automática** —
  Concluído · 100%.
- **Recuperar a mesma solicitação após perda de resposta** — Concluído · 100%.
- **Distinguir rascunho salvo de emissão oficial em COM, ENT e BAL** —
  Concluído · 100%.
- **Resumo de rascunho legível e retorno ao formulário correto** — Concluído ·
  100%.
- **Reaproveitar materiais sem reaproveitar observações antigas** — Concluído
  · 100%.
- **Rascunhos separados por criação, alvo e intenção, sem perda cruzada** —
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
  execução · ≈85%. Falta: Completar decisões contextuais de balanço e revisão
  transversal. As três decisões de requisição deste lote estão implementadas
  e verificadas localmente. Responsável: Codex.
- **Preservar edição durante falha, conflito e perda de contexto** — Em
  execução · ≈80%. Falta: Completar fluxos restantes de balanço e combinações
  transversais de falha. Responsável: Codex.

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
  aparência do PDF adiada. Responsável: Codex; depois participantes.
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
  Falta: Atual 174 sincronizada; aplicar as que surgirem e fechar conferência
  final. Responsável: Codex.

### Piloto, qualidade e encerramento

- **Contingência, piloto e responsáveis definidos antes da liberação** — Em
  execução · ≈50%. Falta: Completar preparação técnica; você define
  participantes, canais e responsáveis. Responsável: Codex; você e equipe.
- **Concluir verificações automáticas e tratar qualidade do código** — Em
  execução · ≈65%. Falta: Fechar verificações do candidato final;Sonar aguarda
  configuração por sua decisão. Responsável: Codex; você para configuração do
  Sonar.

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
inclusive os que não aparecem no HTML. A nova estética dos PDFs está fora
deste trabalho por sua decisão; fidelidade dos dados e funcionamento continuam
incluídos.

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
- **Formulários, apoio, avisos e recuperação** — 75%. Já aplicado: Criação,
  vários atos COM/ENT/transferência e as três decisões de requisição deste
  lote. Falta: Balanço e variações restantes. Responsável: Codex.
- **Listas, tabelas, cartões, busca e filtros** — 50%. Já aplicado: Base e
  vários consumidores migrados. Falta: Completar páginas e verificar textos e
  quantidades inteiros. Responsável: Codex.
- **Fichas de requisição, compra, entrega e balanço em abas** — 70%. Já
  aplicado: Abas, cabeçalho, ações e painéis reais integrados. Falta:
  Completar cada composição e variante. Responsável: Codex.
- **Andamentos nas quatro fichas** — 80%. Já aplicado: Registro salvo,
  autoria, data, categoria, etapa e retomada. Falta: Fechar aparência de todos
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
- **Estoque, consumo, transferências e variantes de balanço** — 60%. Já
  aplicado: Fluxos reais preservados na nova base. Falta: Completar
  composição, avisos e estados de cada variante. Responsável: Codex.
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
estar parcialmente pronta, como mostrado nos blocos anteriores. São passos de
validação ou ativação operacional; não são motivos para parar a implementação.

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

## Sequência que pretendo executar depois deste lote

Esta é a ordem do trabalho restante. Os quadros anteriores estão agrupados por
funcionalidade, sem representar ordem de execução. Tudo que já está 100% será
preservado e incluído na revisão final; não será refeito sem motivo.

1. **Completar formulários da operação diária.** Terminar decisões contextuais
   de balanço, rascunhos, conflitos, retomada e mensagens de cada etapa;
   conferir em conjunto os formulários já concluídos. Este lote de requisição,
   o quadro e as classes de quebra de texto ficam encerrados antes disso.
2. **Completar fichas e estoque.** Fechar requisição, compra, entrega,
   transferência, consumo e variantes de balanço; concluir avisos, próximas
   providências, Andamentos, vínculos, listas e filtros dessas tarefas.
3. **Fechar a parte técnica dos PDFs e da assinatura.** Completar os casos
   restantes de dados, longos, regularização, acessibilidade, recuperação,
   verificação, confiança, troca e recuperação de chaves. Sem redesenhar a
   aparência dos PDFs.
4. **Concluir a nova aparência nas demais áreas.** Administração, cadastros,
   perfil, guias, avisos e aplicativo; conferir todas as 66 composições e 171
   relações. A aparência das áreas dos passos 2 a 4 será trabalhada junto com
   esses passos, sem deixar uma camada visual incompatível para o final.
5. **Fechar entrada e orientação por papel.** Completar adoção de materiais,
   preparação física e guias; a liberação real fica com as pessoas
   responsáveis.
6. **Fechar aplicativo e avisos.** Concluir atualização, perda de sessão,
   troca de paciente, recuperação e preparação de entrega; organizar o reteste
   no S24 Ultra e nos serviços externos somente dentro da autorização vigente.
7. **Completar suporte, monitoramento e backups.** Fechar cobertura,
   ocorrências, retenção, recuperação de chaves e preparação da operação.
   Agenda permanente, destino externo e liberação dependem das decisões
   identificadas acima.
8. **Consolidar a D-B.** Rever todos os critérios, executar as verificações
   finais, corrigir falhas, reconciliar as últimas atualizações do banco e
   atualizar este quadro. Acompanhar a configuração do Sonar sem fingir sua
   aprovação.
9. **Entregar o fechamento e as próximas validações.** Separar o que ficou
   pronto do que depende de você, participantes, fornecedores ou da próxima
   fase. Manter a PR7 em Draft, sem merge e sem alteração de produção.

As atualizações necessárias do banco remoto e os commits serão feitos ao longo
dos lotes. Não haverá reset remoto nem repetição de backups pesados a cada
alteração do banco de testes. A ordem pode ajustar dependências comprovadas,
preservando a prioridade da operação diária.
