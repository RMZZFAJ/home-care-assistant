# Operação por paciente

Este guia descreve percursos implementados e seus invariantes na D-B.
A base AS_IS `37cb7f85e96e551d6419871f94dd950712e2565b` e os achados B2/B3
permanecem históricos; não descrevem automaticamente as limitações atuais.
O [acompanhamento principal](../../TEMP_D_B_ATUALIZACAO.md) distingue entregas,
validação pendente e próximos gates. Não há liberação operacional. Planos
em [C](../audits/C/README.md) conservam seu caráter de especificação.

## Acesso e navegação

Selecione o paciente no cabeçalho. O menu recolhível organiza Visão geral,
Fichas, Histórico, Estoque e Administração. As ações seguem capacidades
efetivas desse vínculo; administração global é independente da função local.
O sino reúne atualizações do paciente e o perfil permite editar identidade,
foto, registro profissional, preferências, contatos e sessões.

Meu perfil reúne as abas Meu perfil, Segurança, Avisos e aplicativo,
Dispositivos e Ajuda. Dados pessoais, foto e vínculos ficam em Meu perfil;
senha, autenticador, contatos e sessões ficam em Segurança. Avisos e aplicativo
reúne instalação, atualização, ativação de avisos e preferência de ciência;
Dispositivos permite consultar, pausar e desativar inscrições da própria conta.
A troca de aba conserva os campos e as confirmações em andamento, sem salvar
automaticamente o preenchimento comum. Instalação, permissão de avisos,
inscrição e entrega continuam sendo estados diferentes.

## Administração e regras

Um administrador global cria pacientes e configura os primeiros
administradores locais. Na atuação global, mudanças da configuração de um
paciente geram propostas para um administrador local distinto do proponente.
No vínculo local, alterações autorizadas seguem a confirmação própria da ação;
elas não exigem automaticamente outra proposta. A administração de acesso da
função Administrador é preservada; revogue o vínculo para remover a função.
Convites são compartilhados manualmente, não contêm credenciais e exigem
aceite pela conta correspondente com e-mail confirmado.

Administração → Paciente reúne o cadastro e os atalhos autorizados para pessoas,
catálogo e alertas. Permissões, comunicação e regras separa Regras, Permissões,
Notificações e Pessoas e propostas. As regras de BAL, ciência, comunicação e
arquivamento têm edição contextual; documentos existentes conservam a política
da emissão. Consultar ou comparar uma proposta não a aprova. A comparação
mantém a proposta registrada e a configuração vigente distintas; uma proposta
obsoleta exige revisar a configuração antes de preparar outra intenção.

Uma consulta de regras de avisos malsucedida oferece nova consulta na própria
seção e suspende alterações até confirmar os dados. Recusa de acesso retira a
configuração antes exibida. Uma confirmação de alteração ainda incerta usa
Recuperar mesma alteração; consultar a lista não substitui essa recuperação.

## Preparação local

Depois do cadastro global, uma pessoa com vínculo local competente pode abrir
Guias e ajuda → Acompanhar preparação local. A tela reúne os registros
autorizados de pessoas, materiais, estoque, escalas, BAL e comunicação, com
encaminhamento aos fluxos próprios. Criar o paciente não concede vínculo local
a quem fez o cadastro. Materiais são adotados por escolha explícita; a abertura
de estoque usa a movimentação familiar existente, com origem, quantidade e
motivo. Convites continuam dependendo de aceite pessoal.

Contagens de registros não aprovam estoque físico, presença, ciência,
recebimento ou início do atendimento. Informações restritas são identificadas
sem aparecer como zero. Falhas de consulta permitem atualizar a seção; uma
recusa de acesso retira os dados antes exibidos. A contingência tem declaração
e conciliação próprias, descritas abaixo.

## Contingência e retorno ao aplicativo

Em Guias e ajuda → Regularizar contingência, selecione o processo e procure
primeiro o registro existente. Registre somente os fatos conhecidos; mantenha
data, horário, fuso, pessoas, materiais e custódia desconhecidos como tais.
A autoria digital é a sua sessão, separada de quem realizou ou recebeu o
fato físico. Confirme a declaração para anexar o registro físico pelo fluxo
seguro de fotos/PDFs. A declaração original permanece preservada.

Informações complementares e pedidos de esclarecimento formam histórico
próprio. A conciliação exige outra pessoa com competência local. Ela compara
a declaração, os documentos já existentes e as evidências prontas; vincular
não repete o fato operacional, não movimenta estoque e não assina por um
recebedor ausente. Caso ainda falte o ato digital, use o processo próprio e
volte para vincular o resultado legítimo. Não invente dados para encerrar.

Depois de perda de resposta, confira a mesma tentativa, inclusive após
recarregar a página. O aplicativo recupera o resultado existente ou encerra
a referência ainda não executada, impedindo chegada tardia. Guarde o
registro físico até conferir o resultado. O formulário comum não recebe
salvamento de rascunho neste fluxo. Piloto, responsáveis e ensaio físico
continuam sujeitos às designações e aos gates operacionais.

## Catálogo, unidades e scanner

O sistema controla exclusivamente insumos sob responsabilidade da família.
Materiais fornecidos pelo plano ou por terceiros diretamente à equipe ficam
fora deste controle. Novos pacientes começam com catálogo vazio: adote modelos
ou cadastre seus produtos. Nome, categoria, aliases e estado são locais.

Defina a unidade base e a precisão antes de movimentar um produto. Uma
apresentação associa código de barras e quantidade na unidade base. O scanner
oferece câmera, foto e entrada manual. Código desconhecido exige associação
administrativa ou seleção manual; nunca cria produto ou conversão presumida.
Unidades com histórico não são reinterpretadas: crie um novo produto.

## REQ, COM e ENT

Na REQ, marque produtos e informe estoque observado, urgência e exceções.
Não há quantidade solicitada nem movimentação de estoque. Produtos ainda
pendentes exigem revisão da REQ anterior e justificativa para nova
solicitação.
Itens extras preservam seu texto original; um administrador pode
identificá-los
explicitamente no catálogo, com justificativa e nova versão auditável.

COM reúne solicitação, aprovação dos itens e quantidades, aquisição,
recebimento e validação. Compra e doação usam a mesma ficha. Pagamento,
fornecedor e comprovante financeiro não são obrigatórios. Apenas recebimento
validado incorpora material ao estoque familiar; a COM não atende a REQ.

ENT registra transferência família/equipe ou devolução autorizada. Selecione
as linhas REQ explicitamente, inclusive de várias requisições, as quantidades
expedidas e o destinatário. A expedição retira da origem e coloca em trânsito.
Somente o destinatário designado pode confirmar o recebimento.

Use Confirmar recebimento para aceitar tudo ou Informar divergência para
selecionar exceções. Linhas não selecionadas são aceitas integralmente. Aceite
positivo parcial entra imediatamente no saldo confirmado do destino e pode
atender a linha REQ vinculada; o restante continua em divergência.

A REQ informa itens atendidos, por exemplo 5/10. A ENT informa linhas
integralmente conferidas, por exemplo 8/10. Uma linha parcialmente aceita
não aparece como integralmente conferida. O encerramento da ENT depende da
conciliação formal das diferenças, preservando os aceites já válidos.

O destinatário pode ser alterado antes do primeiro aceite. Cancelamento após
aceite exige solicitação administrativa e consentimento autenticado do
recebedor, com devoluções reais e consumo previamente confirmado. Não se
inventa devolução nem se apaga a movimentação original.

## Estoques e BAL

Saldos confirmados, trânsito, COM pendentes, projeções, mínimos e divergências
são separados. Projeção não é saldo disponível. A equipe não consulta o saldo
geral da família; a REQ pode mostrar a informação mínima do produto
autorizado.

O administrador usa o estoque familiar para entradas avulsas, retiradas e
correções compensatórias. Informe produto, quantidade e motivo; a operação
registra ator, horário e referência. Anexos podem ser associados ao movimento.
Não é necessário criar COM ou ENT artificial. Saldo negativo não é permitido.

BAL pertence à custódia da equipe. A primeira etapa captura a referência
transacional; conte todos os produtos ativos, inclusive saldo zero. A política
padrão aplica a contagem sem revisão obrigatória. Quando configurada, a
revisão
exige família e/ou supervisão, conforme qualquer grupo ou todos os grupos,
com identidades distintas. Estoque alterado desde a referência exige reconto.
As contagens e aprovações anteriores permanecem na história.

Na ficha, Contagem e revisão mostra o contador efetivo e suas observações em
leitura. Uma pessoa distinta e elegível pode registrar parecer próprio de até
2.000 caracteres. A revisão é facultativa no primeiro uso e também pode ocorrer
após a conciliação; nesse caso não repete movimentos nem valida saldo posterior.
Se a referência de uma contagem ainda pendente mudou, é necessário reconto.
O parecer digitado permanece durante a comparação: consulte a referência atual,
adote explicitamente a contagem válida e confira antes de confirmar. Resultado
incerto congela a intenção; Recupere a revisão para consultar o mesmo ato.

## Histórico, documentos e notificações

Use a lupa para abrir pesquisa e filtros de ficha, situação, período e código
ou protocolo. O paciente continua no cabeçalho e filtros ativos são
removíveis.
O documento preserva snapshots, versões e SHA-256, além de anexos privados e
PDFs por versão. A aba Versões e integridade reúne o histórico de acessos.
Se o registro de uma consulta não for confirmado, a recuperação aparece nessa
aba, preservando o conteúdo e os controles da ficha. Acesso não substitui
ciência nem recebimento. O hash compara conteúdo; não substitui uma assinatura digital
nem protege contra um administrador do banco que altere dados e controles.

Gravação, envio ao provedor, entrega, leitura e ciência no aplicativo são
independentes. Falha externa não desfaz o documento. Resultado incerto exige
conciliação antes de reenviar. Em falha de rede, recupere a mesma tentativa
para evitar duplicação. Não há expiração automática de24h para rascunhos.
Para retomar em outra aba, sessão ou aparelho, use Salvar rascunho na conta.
A cópia local é opcional e pode desaparecer ao fechar a aba; sair da conta
limpa essa cópia, preservando o rascunho já salvo no servidor. Resolva uma
tentativa incerta antes de iniciar outro envio.

## Relatos e canais externos

Relatos de falta e consumo extraordinário são sugestões até conferência.
Somente confirmação autorizada de consumo registra débito no ledger.
Sugestões de Flow são revistas pelo próprio autor no aplicativo antes de
virarem relatos. Texto recebido no WhatsApp só é associado automaticamente
quando a identidade e o paciente são inequívocos.

Aceite simplificado de ENT no WhatsApp requer telefone confirmado no Auth,
destinatário correspondente, opção habilitada pelo paciente, desafio único
com prazo e versão válida e webhook assinado pelo provedor. Não permite
divergência, cancelamento ou troca de destinatário. O evento registra o
nível de verificação empregado.

WhatsApp, Flows, SMS, OAuth e transcrição dependem de configuração e/ou
liberação externa. Consulte [estado e limites atuais](PROJECT_STATUS.md);
[execução arquivada](../archive/evolution/EXECUTION.md) é fotografia
histórica,
sem homologação atual presumida do provedor.

## Escalas e novo balanço

Em Escalas e plantões, cadastre os tipos e publique a programação real. Uma
proposta permanece pendente até decisão de quem pode administrar a escala.
Não há registro de presença ou botão de iniciar/encerrar plantão.

Em Balanços e plantões, família/administração local pode habilitar o regime,
escolhendo dia, tipo, fuso, data de início e eventual profissional designado.
Comece em paciente fictício. Pausar não apaga obrigações ou atrasos
existentes.
O profissional designado conta durante a janela; supervisão pode solicitar
adiamento, que só altera prazo e responsabilidade após decisão familiar.
Troca de horário de um plantão com BAL vigente exige essa decisão antes de
alterar a agenda. Substituição no mesmo período conserva a janela.

A decisão de adiamento mostra destino, versão e período da proposta em leitura,
separados do plantão atual. Se o alvo mudou, não é possível aprovar outra versão
silenciosamente; a família pode recusar o pedido pendente com motivo próprio.
Outro destino exige outro pedido. A recusa preserva prazos e responsabilidade;
nome e motivo do decisor permanecem na consulta. Conflito conserva a justificativa.
Em resposta perdida, recupere a mesma confirmação antes de iniciar outra.

Contagem física e revisão são etapas distintas. Na revisão, referência e
diferenças ficam visíveis. Uma mudança no estoque exige nova conferência; uma
resposta perdida oferece recuperação da mesma tentativa. Semanas anteriores
regularizadas apontam para a contagem atual e conservam seus atrasos.
Consulte [Escalas](../ui-ux/SCHEDULES.md) e [BAL](../ui-ux/BALANCES.md).

O processamento automático percorre até 100 pacientes habilitados por execução
e continua do ponto confirmado no lote seguinte. A posição é interna ao
worker;
a configuração e sua versão pertencem às decisões da família. Obrigações,
atribuições e cursor participam da mesma transação.

## Guias e preparação da residência

Em Guias e ajuda, consulte as seis etapas do seu papel, avance, volte, pule ou
recomece. O progresso pode ser reaberto no perfil. Concluir o guia não registra
ciência, recebimento ou conclusão de uma tarefa operacional. Os links mantêm
o paciente autorizado; mudar de papel ou paciente exige consultar o guia
correspondente.

A administração global prepara o cadastro da residência e indica responsáveis.
As tarefas de catálogo, estoque, vínculos e regras continuam nos fluxos locais
autorizados. Os resumos mostram registros disponíveis; não atestam conferência
física nem o início do atendimento. Se a consulta de pessoas falhar, recupere
a consulta antes de selecionar responsáveis ou revisar a criação. O restante
do preenchimento é preservado.

## Desenvolvimento e preservação

A suíte utiliza somente a stack local home-care-assistant, com API em
127.0.0.1:54321. Backups ficam fora do Git. Replay exige consentimento
explícito e backup verificável. Nunca executar reset ou fixtures no remoto.
Credenciais locais de teste são geradas fora do código versionado.
