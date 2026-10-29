# B1.8 — Jornadas, navegação e responsabilidades

Esta é uma avaliação do auditor com contas fictícias e capacidades reais.
Não houve participantes humanos: cliques automatizados não demonstram
compreensão, confiança ou tempo de execução de uma família em plantão.

## Percursos atuais por persona

| Persona / intenção | Entrada → decisão → resultado → reconsulta | Prova e limite |
| --- | --- | --- |
| Profissional: material excepcional ausente | Painel Nova requisição →7etapas → extra com estoque observado0 → revisão → REQ201 → Consultar registro | Jornada atual:11cliques e3preenchimentos, incluindo reconsulta, excluindo login/contexto e rolagens automáticas; não é benchmark humano |
| Família: tomar ciência da necessidade | Painel → REQ → Li a requisição e confirmo minha ciência → ciência expressa | Dois cliques medidos; scienceSatisfied=true, atendimento0/1; prova preserva independência dos fatos |
| Supervisão: acompanhar obrigação | Painel → Mais → Balanços e plantões | Dois cliques medidos; contexto A onde possui vínculo verdadeiro; só consulta, sem reconto/revisão confirmados |
| Administrador local: decidir alteração de escala | Navegação Escalas → proposta → Revisar escala | Primeira tentativa usou paciente A sem aquela proposta; repetição usa fixture histórica correta. Diálogo sem antes/depois impede decisão informada; nenhuma aprovação |
| Administrador global: gerir identidade global | Menu pessoal → Mudar perfil → Administração global → Identidades globais | Três cliques medidos no submenu, depois navegação direta; modo global confirmado; nomes mascarados, nenhuma alteração de privilégio |
| Leitor: consultar sem comandar | Histórico → REQ → leitura; tentativa HTTP com corpo válido | Um clique medido após entrada direta no histórico; botão de criação ausente e API403 real; nenhum documento emitido pelo leitor |

[b18-journeys.json](evidence/b18-journeys.json) conserva as interações e
resultados. [b18-accessibility.json](evidence/b18-accessibility.json) e
[b18-followup.json](evidence/b18-followup.json) completam o caso do administrador
local e o retorno de foco. Números incluem apenas as ações instrumentadas,
não cliques supostos de entrada por atalhos ou quantidade de rolagens.

## Profissional sob interrupção

O painel operacional oferece Nova requisição e Registrar ocorrência, com
cinco destinos inferiores. Isso aproxima ações da rotina. Sete etapas da REQ
podem exigir muitas passagens vazias quando o único material é um extra.
Há rascunho e busca; não há continuidade garantida fora da aba. O texto
dispositivo pode levar a expectativa de retomada que a implementação não dá.

Após emissão, o comprovante oferece reconsulta e diz que ciência familiar
permanece independente. A pessoa deve conseguir responder: foi registrada?
Qual código? Quem precisa agir? Ainda falta entregar? O teste atual confirma
o registro e a distinção de estado, sem afirmar que um usuário novo entendeu.

Para ENT, a caixa Destinadas a mim limita a tarefa ao recebedor real. A prova
atual confirmou recebimento integral pelo destinatário e atualização da REQ.
Divergência exige resumo por linha; a confirmação atual é genérica. Interrupção
no anexo tem recuperação pior que a do documento principal.

## Família e supervisão

A família vê ciência, compras e recebimentos como responsabilidades distintas.
A sequência COM → aquisição → recebimento → validação → ENT é mais longa que
uma simples lista de compras, mas protege a origem e o destino dos materiais.
Simplificar nomes e próximos passos sem fundir estados. Compra não deve
aparecer como recebimento da equipe, e doação deve manter sua origem visível.

BAL por plantão impede contagem fora de atribuição/janela e revela referência
só depois da entrada física. A prova B1 contou com aprovação automática pela
política vigente; não executou revisão familiar. O teste permanente de BAL
exerce política required e resposta perdida, como cobertura distinta.
Supervisão pode solicitar adiamento; a responsabilidade só muda após decisão
familiar quando exigida. Não oferecer mesmo texto para solicitar e aprovar.

O caminho Mais → Balanços é descobrível pelas descrições atuais, mas a família
e supervisão precisam identificar qual pessoa/plantão/semana exige ação e
qual prazo permanece válido. Fusos e datas devem ser reconhecíveis. Um seletor
Mês no móvel que mantém apenas o dia cria expectativa incompatível com a tela.

## Administração local e global

Lista, busca e drawer preservam contexto melhor que um formulário único.
Catálogo do paciente, identidade global e vínculo local já são separados.
Não derivar permissão do nome da pessoa ou do papel mostrado no browser.

O aprovador local de proposta global recebe JSON, não um diff de negócio.
Na escala pontual, recebe motivo sem objeto. Ambas são decisões autorizadas
com compreensão insuficiente. A governança não fica completa só porque o
banco exige aprovador correto. Manter resumo concreto e versão antes/depois.

Editar vínculo ainda permite trocar a conta selecionada sem explicitar o
destino do vínculo anterior. Convite aceito e vínculo ativo são objetos
distintos; reemitir/revogar convite não deve sugerir revogação automática do
acesso. Essas questões precisam de contrato/revisão em B2/Fase C.

No contexto global, a pessoa deve saber que não está agindo como administrador
local. A seleção real confirmou mode=global e capacidade global; nenhuma
autoridade foi concedida pela auditoria. Os nomes da lista global foram
mascarados e o texto exportado limitado ao heading.

## Leitura, história e conexões entre telas

O visualizador unificado e URLs compatíveis preservam caminhos antigos.
Histórico tem filtros em URL, paginação e código curto. O retorno do documento
para `/historico` perde os filtros da origem; registrar retorno seguro com a
seleção anterior é melhoria proporcional, sem inventar outra central.

Eventos, versões, hashes e PDFs existem. Falta comparação de negócio para
responder quem mudou o quê sem ler registros técnicos. Consulta de consumo
e auditoria administrativa limitada aos100recentes também dificulta encontrar
pendências antigas; deep link de ocorrência não resolve alvo individual.

Notificações devem levar à tarefa nomeada: Abrir documento também aponta
ocorrência/plantão. Preferências e notificações leva à central, enquanto a
preferência está no perfil. Catálogo e unidades leva só a unidades. São
arestas concretas a corrigir no mapa de navegação, preservando URLs existentes.

## Percursos transversais não integralmente executados

Cadastro por convite válido, confirmação de e-mail e recuperação de senha têm
teste permanente local com Mailpit. OAuth real, MFA em aparelho, Share Sheet,
WhatsApp/SMTP reais, retorno por QR impresso e recuperação de sessão em outro
dispositivo continuam NOT_VERIFIED. Cancelamento ENT com consumo positivo
mantém dependência DB-001 da Fase A; não se oferece consumo fictício como saída.

As131variantes de ação,213campos e estados por97superfícies são o mapa detalhado
dos ramos. A exploração atual não percorreu cada permutação de política,
capacidade e estado, e essa ausência permanece explícita na cobertura.

## Segunda passada: walkthrough adversarial

Perguntas em cada decisão: o nome do controle revela a tarefa? O objeto está
visível? A pessoa consegue prever a consequência? Sabe distinguir salvo de
pendente? Consegue voltar depois de interrupção e recuperar o mesmo resultado?

O exercício encontrou barreiras que uma captura bonita não revela: foco volta
ao corpo ao fechar decisão; Continuar editando perde foco embora mantenha
dados; texto contínuo válido rompe reflow; lista antiga permanece sob filtro
novo; vazio aparece quando a consulta falha. Priorizar essas condições antes
de acrescentar dashboards ou instruções longas.

Foram recusados: remover revisão de consequência; criar menu por estereótipo
de profissão em vez de capacidade; trocar rascunho por duplicação automática;
colar dados pessoais em suporte; simplificar ciência como aceite. A família
inicial é referência de uso, sem abandonar arquitetura e escopo multipaciente.
