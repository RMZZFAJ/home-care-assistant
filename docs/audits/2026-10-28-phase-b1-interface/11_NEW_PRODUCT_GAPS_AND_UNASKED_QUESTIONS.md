# Necessidades novas, hipóteses e perguntas de produto

Esta síntese pertence à investigação. As propostas não são requisitos já
aprovados nem autorização de implementação. Vinte dos35 registros mestres não
derivam de um ID da Fase A; outros aprofundam causas conhecidas. A quantidade
não mede qualidade. Uma nova página só se justifica quando texto, organização
ou capacidade já existente não atenderem à tarefa.

## Duas passadas nos oito subgrupos

- B1.1: reconstrução de rotas, variantes, overlays e interfaces documentais;
segunda passada procurou o que falta entre uma decisão e a próxima tarefa.
Surgiram prévia de convite e consulta de apresentações; foram recusadas
outra central de documentos e uma página diferente por profissão.
- B1.2: comparação da cascata efetiva e cinco larguras; segunda passada
explorou foco, conteúdo contínuo e diferenças de densidade. A aparência
azul atual refutou a suposição de verde apenas pelo CSS antigo. Não há
justificativa para reescrita visual completa antes de corrigir barreiras.
- B1.3: literais, expressões, atributos acessíveis e templates; segunda
passada perguntou que interpretação uma frase induz. Compra/doação,
balanço semanal e rascunho no dispositivo exigem significado preciso.
Não se propõe explicar cada botão com mais um parágrafo.
- B1.4: códigos, ramos e injeções; segunda passada separou falha da resposta
e falha da gravação. Anexo201com resposta perdida motivou recuperação por
tentativa; COM recuperada sem duplicação é o equivalente a preservar.
- B1.5: atraso, vazio, falha e resultado parcial; segunda passada procurou
afirmações prematuras e informação antiga sob filtro novo. Surgiu a
necessidade de frescor por seção, sem bloquear toda leitura offline.
- B1.6: comandos e reconsultas; segunda passada perguntou quem age depois.
Relato, confirmação, aquisição e recebimento precisam de frases próprias;
não se sugere transformar todo sucesso em nova confirmação modal.
- B1.7: cada esquema de campo e catálogos1/5/20/100; segunda passada avaliou
ausência versus zero, retomada e busca. Vírgula decimal funcionou nesta
prova; criar um input decimal novo por suposição foi recusado.
- B1.8: seis personas, teclado e mobile; segunda passada testou interrupção,
reconsulta e a própria prova. Foco/reflow falharam; rodapé390coube. Não
atribuir compreensão humana aos cliques automatizados.

## G01 — Conferir o vínculo antes de aceitar convite

Necessidade: uma pessoa convidada deve poder explicar quem a convidou, para
qual paciente, com qual função e em qual conta antes de aceitar. O fluxo
completo funciona no E2E local; falta prévia suficiente para essa decisão.

Proposta mínima: cartão de prévia com escopo autorizado e prazo, CTA específico
e troca de conta. Benefício é reduzir vínculo aceito por engano e suporte no
primeiro acesso. Custo médio: API de prévia, proteção de token e apresentação.
Não colocar nomes ou papel em parâmetros confiados pelo browser.

Objeção: o convite externo pode trazer contexto. Isso não garante coerência
com a versão atual ou a conta logada. Antes de implementar, validar quais
dados podem ser revelados ao detentor do token e após autenticação. Aceite:
B1-UX-004 e AC correspondente em13.

## G02 — Recuperação ligada à intenção, não ao botão de repetir

Necessidade: após perder conexão, reconhecer o arquivo ou comando cuja
resposta se perdeu, sem substituí-lo ou duplicá-lo. O documento principal
COM já demonstrou recuperação com mesmo payload e único evento; o upload
não conserva a mesma proteção de edição na UI.

Proposta mínima: resumo da tentativa dentro do contexto atual, com arquivo,
tamanho, hora e resultado conhecido/desconhecido; consultar a mesma tentativa.
Não criar uma nova tabela de operações antes de aproveitar idempotência e
reservas existentes. Benefício alto sob rede móvel; custo médio com backend.

Objeção: uma central de tentativas resolveria tudo? Também cria outro lugar
para a família procurar e risco de expor payload. Priorizar recuperação no
próprio objeto. Nova central só se os testes mostrarem várias pendências que
não podem ser reencontradas. Relaciona B1-ERR-001/002 e DB-004/BE-005 da A.

## G03 — Informação de frescor por seção e contexto

Necessidade: distinguir saldo consultado agora, movimento indisponível,
contagem física histórica e painel sem conexão. Uma data global pode sugerir
que todas as seções foram atualizadas juntas quando uma consulta falhou.

Proposta mínima: estado e hora por conjunto de dados que já tem consulta
independente, erro local e reconsulta. Benefício: evita interpretar ausência
como certeza e reduz recarga geral. Custo médio; precisa definir consistência
temporal, não apenas adicionar relógios.

Objeção: timestamps em cada card podem poluir. Mostrar só quando antigo,
parcial ou sob ação de detalhes, com indicador visível quando a informação
deixa de ser atual. Não oferecer ajuste de saldo como saída de erro de leitura.
Validar com tarefa de comparar família, trânsito e equipe. B1-STATE-001–005.

## G04 — Comparação de negócio na decisão e na história

Necessidade: aprovador identificar a alteração sem ler JSON; familiar entender
depois quem mudou o quê. A decisão de escala é urgenteP1; comparação histórica
é oportunidadeP3. Compartilham presenter, mas não precisam de uma implementação
genérica única ou da mesma prioridade.

Proposta mínima: presenter por comando/kind com Atual/Proposto e versão;
histórico usa snapshots para explicar diferenças. Benefício alto na decisão,
moderado na reconsulta. Custo médio e revisão de domínio/autorização.

Objeção: diff automático de qualquer JSON pode omitir significado, unidade,
fuso ou campo desconhecido. Não aprovar mudança não reconhecida. Hash preserva
integridade, não é assinatura digital. B1-UX-001/002/003/006.

## G05 — Gestão consultável de apresentações e busca proporcional

Necessidade: antes de usar código de embalagem, conferir qual produto e
conversão ele representa. Antes de selecionar entre100 materiais, pesquisar
por nome/alias sem perder os escolhidos.

Proposta mínima: apresentações no detalhe do material ou seção já existente;
busca COM/ENT baseada no padrão REQ. Benefício cresce com catálogo. Custo
pequeno a médio para busca e médio para gestão/versionamento de conversão.

Objeção: scanner pode eliminar seleção? Hardware e permissão de câmera falham;
alternativa manual continua necessária. Preferência de apresentação só vira
configuração se houver várias alternativas legítimas e responsável capaz de
escolher. Não converter embalagem automaticamente sem mostrar equivalência.
Critérios B1-FORM-004/005; histórico de unidade imutável deve sobreviver.

## G06 — Primeira família: prontidão compreensível, sem wizard obrigatório

Pergunta ainda não respondida por pessoa real: a família sabe se tem catálogo,
vínculos, destinatários e plantões suficientes para começar? O painel já
prioriza tarefas por capacidade, e administração tem seções com descrições.

Hipótese: lista curta de preparação no painel administrativo, formada a partir
de dados existentes, com links a tarefas e explicação de por que faltam.
Pode evitar primeiro acesso vazio e chamadas de suporte. Custo médio para
regras corretas; risco de confundir opcionalidade com bloqueio de negócio.

Contraditório: não foi demonstrada demanda por onboarding extra nem testada
compreensão do painel atual. Primeiro conduzir sessão humana sem instrução.
Se os links atuais bastarem, melhorar rótulos e dispensar nova lista. Não
transformar integração WhatsApp ou regime BAL em pré-condição universal.

## G07 — Continuidade de preenchimento como decisão explícita

Necessidade comprovada de texto: a promessa atual excede a aba. Necessidade
de produto entre aparelhos é plausível, ainda não validada com participantes.

Opções: corrigir texto e preservar aba; continuidade entre abas no mesmo
dispositivo; rascunho servidor por identidade/paciente com retenção e exclusão
definidas. Benefício/custo crescem nessa ordem. Servidor exige conflito,
expiração, privacidade e distinção de documento emitido; não é só trocar
sessionStorage por localStorage.

Perguntas ao responsável na Fase C: quem compartilha aparelho? Qual tempo de
interrupção é comum? Há troca real de aparelho durante REQ/BAL? Vale guardar
observações operacionais? Quem pode retomar? Nenhuma dessas respostas foi
inferida de estereótipo de perfil. B1-UX-005.

## G08 — Próxima tarefa e responsável após cada fato

Necessidade: dizer o que mudou e quem age agora. Relato não debita estoque;
confirmar relato debita; compra não entrega; ciência não atende requisição.
Mensagem universal exige que a pessoa faça essa tradução mental.

Proposta mínima: resultado específico e link para o estado persistido, dentro
do comprovante existente. Benefício alto de orientação com custo baixo de
presenter; manter visíveis pendências, sem inventar canal enviado.

Objeção: outro card permanente em toda tela poderia afastar a tarefa. Mostrar
próxima ação somente quando o estado autoritativo e a capacidade permitirem.
Se responsável ainda não é único, dizer quem pode decidir, sem escolher pessoa
por nome/flag local. B1-FEED-001 e B1-NAV-001.

## G09 — Agenda móvel coerente e reencontro do registro antigo

Necessidade: saber qual período está sendo mostrado e conseguir reencontrar
pendência antiga. A visão diária móvel é apropriada; selecionar Mês e continuar
no dia cria promessa incompatível. Cortar consulta nos100recentes exige caminho
para anteriores, não aumento arbitrário do limite.

Proposta mínima: seletor coerente Dia/Agenda no móvel, atalhos por período e
paginação/cursor por domínio. Custo pequeno a médio, com contrato de consulta.
Não propor calendário mensal minúsculo nem busca global sem escopo.

Pergunta de validação: família consulta semana para planejar ou dia para agir?
Ambas podem ser tarefas legítimas, sem exigir uma preferência persistida antes
da prova humana. B1-NAV-002 e B1-UX-007.

## Configurações que merecem decisão e as que foram recusadas

Podem merecer escolha explícita: alcance/retenção de rascunho, política de
ciência automática, preferência de apresentação quando houver alternativas,
responsável e fuso de BAL, e densidade administrativa se o uso demonstrar
necessidade. Algumas já existem; primeiro tornar efeito e alcance claros.

Não tornar configuráveis: autorização no banco, consistência de estoque,
unicidade de tentativa, significado de ciência/aceite, preservação de
snapshot e proteção de dados. Também foram recusados timeout maior como
correção universal, estoque preenchido pelo saldo esperado, texto livre para
toda seleção, remoção de confirmações críticas e duplicação de centrais.

## Evidência necessária para escolher

Testes humanos em10 distinguem hesitação, expectativa e erro de tarefa. Medir
tempo humano, redigitação, recuperação após interrupção e explicação do
resultado; cliques automatizados apenas descrevem percurso. As hipóteses
G06/G07 ampliadas não entram como defeitos comprovados. Decisão e implementação
permanecem nas fases C e D, com nova autorização correspondente.
