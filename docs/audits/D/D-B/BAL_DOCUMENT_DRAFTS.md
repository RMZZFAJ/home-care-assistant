# D3.43 — decisões documentais BAL com preparação privada

Base6ce4d35. Parecer familiar, parecer da supervisão e designação de reconto
preservam preenchimento privado por ator/paciente/ficha/propósito. O alvo é um
BAL real; programação, atribuição e adiamentos por plantão continuam pendentes.
Salvar não aprova, designa, conta, gera ciência ou movimenta estoque.

Editor compartilhado usa os componentes canônicos, campos brutos, seleção
indisponível, comparação explícita e recuperação pessoal. Leitura inicial
atrasada não apaga o que já foi digitado. Parecer opcional mantém autoria
separada da contagem física. Quantidades, histórico, autoria de quem contou,
observações originais e acesso aos PDFs continuam nos consumidores existentes.
Reconto seleciona pessoa e plantão reais, sem escolha automática; sua resposta
legada pode ter código NULL, apresentado como “BAL sem código preservado”.

GET de preparação entrega referência autorizada e atômica: documento no
parecer, contexto nativo no reconto. Não combina duas consultas de instantes
diferentes. POST vincula explicitamente paciente e ficha reais sob RLS antes
da confirmação privada; guarda Origin, Auth e autorização atual. Contraprova
anterior a essa consulta já recusava outro paciente com403, sem efeitos: a
sessão de autoridade existente protege o banco. A nova guarda responde404;
não se afirma correção de bypass demonstrado.

Confirmação sela grupo, comentário, pessoa, plantão, versão e hash nativo e
usa os comandos oficiais existentes. Material e divergências não podem ser
copiados nesses propósitos. Banco revalida após o journal privado; revogação
ou alteração tardia da referência faz rollback do ato e consumo. Recuperação
de resposta perdida repete exatamente o pacote; não cria outra intenção.
Consulta/reconhecimento próprios sobrevivem à perda de escrita. Perda de
leitura oculta conteúdo;403 ou200 inválido não produzem sucesso fictício.

Salvamento privado incerto bloqueia edição até recuperar o mesmo pacote. A
cópia recuperada idêntica pode fechar e reabrir sem falso aviso de alteração;
edição real permanece protegida. Texto e referências divergentes exigem
comparação. Adoção atualiza pessoa/plantão e a busca correspondente quando
esta ainda representa a escolha anterior; busca incompleta própria é mantida.
Foco de resultado ocorre depois da devolução de foco do drawer.

34 unitários/API distintos aprovados por reuso qualificado:24 sucessos
existentes e10 novos repetidos. Limite Unicode corrigido para unidades UTF-16;
falha original preservada.10 Auth reais PASS em rodada completa:duas sessões,
CAS, titular, intenção, cópia recusada, replay/ack, recusa de leitura e rollback
após journal/versão tardia. Fixtures corrigidas usam supervisão realmente
vinculada e distinguem fully_checked de fatos materiais inalterados.

18 identidades de navegador aprovadas, nove por motor. Reuso registra último
resultado por arquivo/título/projeto:rodada inicial teve8 sucessos,1 falha e9
não executados; não foi verde. Rodadas finais iOS9,mobile2 e recuperação
familiar2 substituem os casos afetados.21 sucessos brutos não são21 distintos.
Runners finais diagnósticos,20 fontes congelados,sem suíte mutável paralela.
Preservados consumidores antigos de parecer, reconto, opção de recontagem,
estoque, histórico, material e PDFs. Quatro larguras,axe,duas capturas de
sucesso inspecionadas;emulação não é prova física nem conformidade completa.

Tentativa inicial504 no Auth local ocorreu antes do app. Outra tentativa de
reconto permaneceu consultando rascunho; causa de produto não demonstrada.
Repetição dirigida passou sem elevar timeout. Leitura inicial apagando texto
foi reproduzida e corrigida, com resposta retida nos dois motores. Código NULL
é exercitado na recuperação controlada, mudando apenas esse campo legado e
preservando vínculos e efeitos nativos; não se afirma alteração de acervo real.

Migration176 final aplicada uma vez no remoto,175→176;dry-run final vazio.
Sete corpos normalizados,ACL,constraint e versões coincidem. Advisors mantêm
as mesmas cinco classes e identidades; Auth SECURITY DEFINER permanece168.
Helper de trim inexistente foi corrigido somente na autoria ainda não publicada
e na função local,sem replay/reset/reescrita de histórico. Statements locais
intermediários preservados. Normalização LF do candidato removeu CRCRLF
acidental; comparação confirmou os sete corpos antes de aplicar remotamente.
Constraint D2 de fatores permanece não validada no legado local, já documentada;
está validada no remoto. Não houve fixtures/Auth remotos ou backup pesado repetido.

CI6ce4d35 terminou FAIL:job mobile cancelado pelo limite comprovado de40min;
banco,Ubuntu,Windows,Chromium e ambos iOS PASS. Mobile passa a dois shards,
sem alterar casos,retries ou timeout. Coleta302=155+147,disjunta e completa;
coleta não executa testes. CI de produção do próximo SHA continua obrigatória.

Matriz105x39 conserva primeiras30 colunas,56 PASS/49 PARTIAL e18 linhas visuais.
BAL por plantão e paridade66/171 permanecem pendentes. Visual≈60% no quadro
temporário é estimativa editorial. Assinatura,backup,monitoramento e gates
externos não recebem nova aprovação. Sonar adiado pelo responsável;meta ativa,
PR7 Draft,sem merge ou produção.

[Validação](BAL_DOCUMENT_DRAFTS_VALIDATION.json),
[remoto](BAL_DOCUMENT_DRAFTS_REMOTE.json),
[CI anterior](CI_6CE4D35_OBSERVATION.json).
