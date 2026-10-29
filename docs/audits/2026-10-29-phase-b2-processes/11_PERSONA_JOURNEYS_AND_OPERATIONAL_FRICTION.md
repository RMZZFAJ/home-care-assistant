# Jornadas por pessoa e esforço operacional

Estas jornadas foram reconstruídas com contratos, cenários locais e estados
persistidos. São análises do auditor, não entrevistas, testes com familiares ou
observação de enfermagem em residência. As fricções humanas são consequências
plausíveis das tarefas comprovadas; frequência, compreensão e esforço precisam
de validação com participantes. A
[matriz](01_ACTORS_RESPONSIBILITIES_MATRIX.csv)
descreve autoridade efetiva por processo; papel nominal não autoriza toda ação.

## Primeira família: preparar apenas o que permite operar

Ordem operacional mínima reconstruída:

1. Responsável obtém conta própria confirmada. Administração global cria a
   residência com administrador inicial explícito; ele escolhe o contexto local.
2. Administrador local confirma pessoas, funções e capacidades, emite convites
   e verifica aceites. Convite enviado manualmente não prova ingresso nem
   preparo.
3. Família define catálogo realmente usado, unidade base e precisão antes de
   criar história. Pode adotar itens existentes explicitamente. Apresentação
   exige equivalência conhecida; não é necessário cadastrar códigos de tudo.
4. Confere material já existente por custódia. Saldo familiar inicial pode ser
   movimento avulso motivado; material já da equipe precisa de
   contagem/conciliação
   pelo processo legítimo. Não fabricar compra ou transferência para abrir
   saldo.
5. Define quem atende necessidade, quem recebe material, quem revisa contagem e
   o significado de ciência. O regime por plantão é opt-in; ativá-lo exige
   escala
   e responsáveis coerentes. Conta, agenda e capacidade de contar são distintos.
6. Executa um ciclo curto real: necessidade → decisão familiar sobre aquisição
   ou material disponível → expedição → aceite do destinatário → consulta de
   saldo
   e atendimento. Confere quem ainda deve agir, sem transformar COM em ENT.
7. Combina como registrar indisponibilidade do sistema e quem reconcilia fatos
   depois. WhatsApp, câmera e impressão são alternativas dependentes de
   condições
   próprias, sem impedir a consulta pelo aplicativo.

A sequência reduz retrabalho porque unidade com história fica protegida e
porque convite não transmite conhecimento das regras. Não se recomenda tornar
todas configurações obrigatórias nem exigir automação externa para começar.
Há recursos individuais, mas nenhum encerramento integrado de preparação:
P-OPS-01 é parcial. O01 propõe lista simples com links e responsáveis, sem
novo cadastro paralelo de “residência pronta”. Família decide os mínimos reais.

## Familiar que providencia insumos

Recebe uma REQ com material, urgência e estoque observado; entende necessidade,
sem ler quantidade pedida inexistente. Decide usar material disponível, comprar,
receber doação ou esclarecer extra. COM pode relacionar itens REQ, mas comprar
não atende a necessidade. Aprovação, aquisição, recebimento informado e
recebimento validado têm agentes/efeitos distintos. Se admin cria COM, ela já
nasce aprovada; isso não significa que o material exista.

Com estoque familiar confirmado, prepara ENT e escolhe destinatário que fará a
conferência. Expedição reduz família e cria trânsito. Só aceite positivo do
destinatário aumenta a custódia de destino e atende linha REQ vinculada.
Enquanto houver divergência, família acompanha conciliação; não força aceite.
Depois, confere ciência e condição de arquivo no progresso da REQ.

Fricção demonstrada: aprovação10/adquirido2/recebido2 não admite desistir
formalmente dos 8 restantes (B2-001). Digitar novamente toda seleção para
preparar
COM/ENT também é oportunidade: reaproveitar produtos e referências, deixando
quantidades e destino para decisão explícita. Não inferir que urgência autoriza
compra, nem introduzir quantidade solicitada na REQ.

## Profissional que recebe e utiliza material

Escolhe o paciente correto, verifica entrega destinada a si e confere cada
material físico. Recebimento integral pode ser simples; parcial exige quantidade
aceita, problema e motivo. Aceite é próprio; outra pessoa não o substitui apenas
porque tem acesso ao paciente. Depois da divergência, complemento físico,
devolução e perda são fatos diferentes e deixam história própria.

Uso extraordinário é relatado por custódia e, quando disponível, quantidades.
Relatar não debita. Confirmador autorizado valida; falta confirmada não é uso.
Se somente texto estiver disponível, o fluxo atual não permite completar o
mesmo relato para confirmação (B2-010). A alternativa simples é esclarecer
estrutura ou ligar complemento ao original, em vez de presumir quantidade pelo
texto e gerar saída automática.

Ao solicitar cancelamento após aceite, a família depende do consentimento da
profissional. Ela pode discordar do pedido, mas só encontra consentimento
(B2-002); a fila padrão também omite esse trabalho (B2-003). Material consumido
de fato mantém cancelamento bloqueado pelo erro B2-004. Esses três problemas
exigem tratamentos diferentes: decisão disponível, tarefa encontrável e
conciliação executável. Um novo botão genérico “resolver tudo” perderia autoria.

## Contador em plantão, revisor e passagem de turno

Programação publicada define janela e responsável possível. Na atribuição
elegível, a pessoa conta material físico, revisa valores e registra todas as
linhas ativas com referência atual. A contagem pode cumprir obrigação no prazo
enquanto o documento aguarda revisão. A família ou supervisão competente revisa
segundo a política capturada, com identidade distinta da pessoa que contou.
Diferença aprovada ajusta inventário; não vira consumo médio automaticamente.

Se a pessoa faltar, supervisão pode solicitar adiamento quando autorizado;
decisão familiar muda prazo/responsável. Pedido pendente não suspende prazo.
Mudar agenda para escapar da janela é recusado. Alterar pessoa no mesmo horário
durante reconto em ciclo já contado invalida atribuição anterior e exige nova
designação do revisor (B2-014). Não apagar contagem original ou fazer substituto
assinar pelo anterior. Adiamento com destino alterado pode ficar pendente sem
decisão executável (B2-012); o prazo original continua importante.

Para operação cotidiana, a melhoria decisiva é informar: quem está atribuído,
qual fato já cumpriu, quem revisa agora e como proceder na ausência. Mostrá-los
na tarefa existente tende a custar menos que outra agenda. A interface ainda
precisa dos dados completos antes de aprovar mudança de plantão, P1 herdado
A UX-001/B1-UX-001. Horário publicado nunca comprova presença.

## Administrador local que desliga alguém

Lista vínculos e tarefas do paciente, revoga autoridade prontamente quando
necessário e conserva conta/história/outras residências. ENT sem aceite admite
reatribuição. ENT parcial não admite sucessor assinar o aceite anterior e fica
sem sucessão formal para o restante (B2-015). Convite antigo aceito não reativa
silenciosamente. É preciso distinguir retirada de acesso da reconciliação do
trabalho aberto; tornar a primeira dependente da segunda seria arriscado.

O cadastro atual ajuda editar pessoa/papel/capacidades, mas não sintetiza tudo
que ficará sem agente. Oportunidade O04/O07: usar documentos, atribuições e
propostas existentes para prévia de impacto e tarefas futuras. Revogação
urgente continua permitida; inventário pode ser consultado depois. Sem delegação
automática de poderes familiares ou de identidade do desligado.

## Leitor e familiar que consulta história

Leitor entra no contexto autorizado, procura código/período/estado e consulta
as versões que sua capacidade permite. Não ganha COM ou estoque familiar por
ser leitor de REQ. PDF histórico informa versão; integridade não publica
conteúdo
privado. O próximo passo deve vir da situação corrente. Um arquivo arquivado
pode ter sido superado por reabertura posterior, como B29-01 demonstrou.

Eventos e movimentos existem, mas navegar do movimento para sua origem não é
uniforme (B2-008). Resumo de diferenças e vínculo autorizado com recibo/BAL/
consumo podem reduzir reconciliação manual (O09). Antes de copiar todos os
dados para outro painel, convém completar navegação e explicação da história.
Anexo da ficha física é alternativa válida, sem comprovar sozinho quantidade
aceita, ciência ou consumo.

## Administração global e operação multipaciente

Global cria/proporciona recursos e pode propor mudanças locais; outro admin
local decide. Perfil global não equivale a papel operacional. Pessoa com vários
vínculos muda contexto antes de agir, com autorização revalidada. Conflito de
agenda entre pacientes não revelou nome/agenda do outro na prova B26-12.
Síntese transversal futura deve mostrar apenas tarefas/capacidades autorizadas,
sem usar contadores como porta de entrada indevida para dados de outra família.

Com mais residências, omissões de fila, histórico limitado e progresso de jobs
deixam de ser apenas esforço individual: podem excluir pacientes do trabalho.
O P1 A DB-002 permanece dependência; não se recomenda lançar agregação global
antes de provar seleção justa e transições terminais. Visão da própria pessoa
com links explícitos por paciente é alternativa mais simples que operação em
contexto global com poderes implícitos.

## Como medir antes de transformar preferência em requisito

Sessões futuras devem pedir que participantes preparem residência, atendam REQ
com material já disponível, recebam parcialmente, reencontrem uma pendência
antiga e assumam tarefa após substituição. Observar decisões erradas, pedidos
de ajuda, tempo para identificar próximo responsável, redigitação e recuperação
após interrupção. Registrar resultado antes/depois em condições comparáveis.
Não há baseline humano medido nesta B2; nenhum ganho percentual foi inventado.

A segunda passada descartou módulos automáticos de compras, presença, lotes,
dashboard universal e inteligência de consumo como respostas universais. Alguns
podem fazer sentido após decisão de necessidade, mas as oportunidades
prioritárias
completam saídas e conectam tarefas existentes. Catálogo12 distingue defeito,
lacuna, oportunidade, preferência e hipótese, com alternativas e prova futura.
