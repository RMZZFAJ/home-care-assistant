# Operação por paciente

## Acesso e navegação

Selecione o paciente no cabeçalho. O menu recolhível organiza Visão geral,
Fichas, Histórico, Estoque e Administração. As ações seguem capacidades
efetivas desse vínculo; administração global é independente da função local.
O sino reúne atualizações do paciente e o perfil permite editar identidade,
foto, registro profissional, preferências, contatos e sessões.

Um administrador global cria pacientes e configura os primeiros
administradores locais. Alterações críticas exigem proposta e aprovação de
outra identidade administradora do mesmo paciente. A administração de acesso
da função Administrador é preservada; revogue o vínculo para remover a função.
Convites são compartilhados manualmente, não contêm credenciais e exigem
aceite pela conta correspondente com e-mail confirmado.

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
pendentes exigem revisão da REQ anterior e justificativa para nova solicitação.
Itens extras preservam seu texto original; um administrador pode identificá-los
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
geral da família; a REQ pode mostrar a informação mínima do produto autorizado.

O administrador usa o estoque familiar para entradas avulsas, retiradas e
correções compensatórias. Informe produto, quantidade e motivo; a operação
registra ator, horário e referência. Anexos podem ser associados ao movimento.
Não é necessário criar COM ou ENT artificial. Saldo negativo não é permitido.

BAL pertence à custódia da equipe. A primeira etapa captura a referência
transacional; conte todos os produtos ativos, inclusive saldo zero. A política
padrão aplica a contagem sem revisão obrigatória. Quando configurada, a revisão
exige família e/ou supervisão, conforme qualquer grupo ou todos os grupos,
com identidades distintas. Estoque alterado desde a referência exige reconto.
As contagens e aprovações anteriores permanecem na história.

## Histórico, documentos e notificações

Use a lupa para abrir pesquisa e filtros de ficha, situação, período e código
ou protocolo. O paciente continua no cabeçalho e filtros ativos são removíveis.
O documento preserva snapshots, versões e SHA-256, além de anexos privados e
PDFs por versão. O hash compara conteúdo; não substitui uma assinatura digital
nem protege contra um administrador do banco que altere dados e controles.

Gravação, envio ao provedor, entrega, leitura e ciência no aplicativo são
independentes. Falha externa não desfaz o documento. Resultado incerto exige
conciliação antes de reenviar. Em falha de rede, recupere a mesma tentativa
para evitar duplicação; rascunhos locais expiram em 24 horas.

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
liberação externa. Consulte os resultados reais em
[Execução](evolution/EXECUTION.md); não presumir homologação do provedor.

## Desenvolvimento e preservação

A suíte utiliza somente a stack local home-care-assistant, com API em
127.0.0.1:54321. Backups ficam fora do Git. Replay exige consentimento
explícito e backup verificável. Nunca executar reset ou fixtures no remoto.
Credenciais locais de teste são geradas fora do código versionado.
