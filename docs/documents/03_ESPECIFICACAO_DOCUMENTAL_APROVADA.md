# Home Care Assistant — Especificação documental aprovada

**Finalidade:** orientar a incorporação da aparência e das regras dos documentos
à missão D-B em andamento. Leia junto de `01_COMANDO_COMPLEMENTAR_PDFS.md` e
`02_REFERENCIA_VISUAL_FICHAS.html`.

Esta especificação incorpora as cinco decisões finais do proprietário. Não é
nova auditoria, não pede outra aprovação e não muda os contratos do restante do
sistema. Exemplos do HTML são fictícios. A implementação continua sob
responsabilidade técnica do Codex, preservando autorização, histórico e
invariantes reais.

## 1. Decisões fechadas e limites de nomenclatura

- **Selo aprovado:** distintivo com bandeira vertical lateral, com dados do ato
  ao lado. Não implementar seletor de estilos. Não usar as alternativas
  rejeitadas.
- **Entrega:** família para equipe. **Devolução de materiais:** sentido inverso,
  preservando a identificação e os movimentos anteriores. A separação semântica
  não exige um quinto tipo técnico nem autoriza reclassificar arquivos
  históricos silenciosamente.
- **Revisão BAL:** confirmar ou apontar diferenças. Consertar estoque exige
  reconto ou ajuste autorizado distinto, sem alterar a contagem original.
- **Saldo COM:** saldo imediatamente após a última entrada validada de cada
  material naquela COM, com data/hora. Parcelas em seção própria. Não usar saldo
  atual nem somar saldos intermediários.
- **Saldo BAL:** saldo imediatamente após a aplicação da contagem
  correspondente, com momento. Parecer posterior não reescreve esse resultado.
- **Sem acesso a um saldo:** exibir **Acesso restrito**, sem enviar ou embutir o
  valor, sem transformar ausência de acesso em zero.

Números de rodadas visuais e códigos de alternativas desta conversa não
pertencem ao produto. A referência não exige renomear versões técnicas
existentes. A identificação **Assinatura interna · V1 · Não ICP-Brasil**
refere-se somente à função de assinatura/verificação já solicitada, não a uma
edição material da ficha ou à sequência das maquetes.

## 2. Três modalidades documentais

### Ficha

Documento completo para uso cotidiano. Não chamar de resumo. Conservar todos os
materiais, observações originais, identificação, datas pertinentes, confirmação
aplicável, situação e vínculos essenciais. Divergência, cancelamento, pendência
e encerramento administrativo que mudem a interpretação precisam permanecer
claros nesta modalidade, em seções próprias.

Não exibir logs, versões técnicas, hashes longos, UUIDs, IPs, sessões,
estruturas JSON ou detalhes de infraestrutura. Não esconder esses dados em
metadados/anexos invisíveis: eles não pertencem à Ficha operacional distribuída.

### Ficha Ampliada

Preserva a Ficha integralmente e acrescenta complementos autorizados
selecionados pelo usuário: andamentos, comunicações, confirmações, detalhes de
vínculos e histórico operacional de acesso pertinente. A seleção não permite
retirar materiais ou observações obrigatórios da Ficha.

Andamentos: todos até o instante de referência ou intervalo escolhido. Informar
seções, início/fim, fuso e critério do período na abertura do complemento, **não
em banner no topo**. A situação geral e as exceções essenciais da Ficha não
desaparecem por causa de um filtro.

### Relatório de auditoria da ficha

Geração restrita, com finalidade/escopo e fontes explicitados, identificação
nominativa e marca-d'água em todas as páginas. O desenho deste relatório
continua **preliminar**. O Codex pode aperfeiçoar dados e organização dentro do
alcance documental, sem alegar laudo pericial, conformidade ou veracidade física
automaticamente.

Não é necessário refinar exaustivamente a auditoria para concluir a aparência
das Fichas e Fichas Ampliadas. Sua evolução não pode criar nova missão
interminável. Definir competência específica com os mecanismos existentes; não
conceder por simples acesso à ficha ou por administração global sem competência
sobre o paciente.

Todas as modalidades conservam identificação do exemplar, assinatura efetiva
quando emitidas pelo fluxo assinado, integridade e rastreabilidade. Não
representam níveis diferentes de autenticidade.

## 3. Identidade visual canônica dos documentos

A referência HTML é a fonte visual, com composição A4, uma família tipográfica,
hierarquia editorial e cores funcionais. A aparência canônica da aplicação
continua sendo o **Modelo Integral** atual, não o Fluent antigo. Compartilhar
semântica e ícones não significa transformar o PDF em dashboard ou reconstruir a
aplicação para parecer uma página impressa.

### Fonte e cores

- Família: **Source Sans 3**, variando pesos, tamanho e espaçamento; não
  misturar serifas, fontes monoespaçadas decorativas ou famílias diferentes
  entre os blocos.
- Corpo de materiais e observações legível em A4 real; referência usa
  aproximadamente 15 px no corpo (cerca de 11,25 pt na correspondência usual de
  CSS). Preservar a legibilidade ao converter para o renderizador oficial, não
  usar redução automática para alcançar uma página.
- Azul institucional escuro `#193c55`, azul de destaque `#245e86`, texto
  `#203744`, secundário `#576d79`, divisórias `#cfdee5`, fundo leve `#eef5f9`.
- Verde `#196748`/fundo `#edf7f1`; vermelho `#a12e3d`/fundo `#fff1f2`; âmbar
  `#835514`/fundo `#fff7e7`.
- Cores acompanhadas de nome/ícone. Não usar apenas vermelho/verde para
  transmitir condição operacional.

O HTML solicita Source Sans 3 on-line e possui reserva informada. A referência
não distribui fontes. Na implementação, disponibilizar e incorporar ao PDF a
família aprovada conforme os recursos/licenças do projeto; fonte de reserva do
laboratório não é uma nova escolha aprovada.

### Cabeçalho da primeira página

- Esquerda: identidade HCA, modalidade, título específico e **Situação em
  [data/hora]**.
- Centro: selo do ato aplicável, exceto no BAL. Somente o selo aprovado de
  bandeira lateral.
- Direita: número da ficha grande e clicável, status, urgência aplicável e
  indicador pertinente de materiais/recebimentos.
- Não imprimir “Número da requisição” acima do próprio número.
- Sem banners iniciais de dados adicionais, revisão facultativa ou tratamento de
  divergência.
- Marca atual: Home Care Assistant. Personalização pela organização é futura,
  não requisito deste complemento; nunca derivar marca da conta pessoal de quem
  exporta.

### Identificação

Rótulo **Paciente**. Para autoria: **Registrado por**, nome em cima e função na
assistência/registro profissional aplicável embaixo. Exemplo: “Camila Santos” /
“Técnica de enfermagem · COREN-SP nº ...”. Familiar: somente “Familiar”, sem
“Não aplicável” ou registro inventado.

Função de supervisão não comprova formação de enfermagem. Autor original,
recebedor, revisor e exportador são papéis diferentes. Usar dados preservados no
ato. Se a origem histórica for desconhecida, declarar a ausência em vez de
substituir silenciosamente pelo cadastro atual.

REQ: data da solicitação na linha de identificação; remover campo genérico
**Contexto**. ENT: data de expedição e atos de recebimento separados. BAL:
agendamento/janela e realização da contagem. COM: registro e validação de
chegada conforme fatos efetivos.

Vínculos essenciais aparecem **antes dos materiais**. Números das fichas
relacionadas são clicáveis quando autorizáveis; não embutir automaticamente os
PDFs relacionados. Um documento citado em relato não se torna vínculo
operacional de atendimento.

### Continuação e rodapé

Cabeçalho em região própria da margem, separado do corpo. Esquerda: marca,
modalidade e **data/hora da emissão do PDF**. Direita: número, paginação e tags
compactas agrupadas com o número, nunca soltas no centro.

Status é visível. Na REQ, tag **Família ciente** somente se verdadeira; sem tag
de ciência quando ainda não registrada. Urgência somente quando aplicável,
distinguindo marcação original de pendência atual. Nas outras fichas, usar ato
correspondente, não copiar ciência familiar.

Rodapé em todas as páginas: exportador, momento da emissão, código/identificação
curta do exemplar e paginação, com aviso breve de uso restrito. Sem seleção de
destinatário. Sem marca-d'água na Ficha ou na Ampliada.

### Tabelas e paginação

Agrupamento por categoria, fundo leve no título do grupo, filete mais evidente
ao encerrar o grupo e linhas internas discretas. Sem excesso de caixas ou
grandes vazios.

Uma categoria pode continuar na página seguinte. Repetir colunas e contexto de
categoria; manter título de categoria junto de pelo menos uma linha. Não mover
um grupo inteiro quando há espaço útil para parte dele. Não cortar texto final,
notas, códigos ou rodapé. Conteúdo extenso pode ocupar quantas páginas forem
necessárias. Alturas/fluxo de paginação do HTML são ilustrativos, não algoritmo
obrigatório.

Materiais urgentes na REQ: tag **URGENTE**, fundo vermelho leve e filete à
esquerda. Sem coluna Prioridade e sem “Rotina” nos demais itens.

BAL e COM: unidade abaixo do nome do material na mesma célula. Precisão das
quantidades segue o produto; não arredondar ou converter silenciosamente
unidades/apresentações.

## 4. Selos, macroetapas e acontecimentos

### Selo aprovado e significado

- REQ: primeira ciência válida que satisfaça a regra familiar aplicável. Mostrar
  nome, momento, tipo e meio efetivamente registrados. Ciência adicional fica
  preservada e pode constar na Ampliada.
- ENT: confirmação pessoal do recebimento; comunicar parcialidade sem chamar
  tratamento de divergência de recebimento físico.
- COM: entrada validada; quando houver parcelas, deixar claro se o resultado é
  agregado e qual ato/pessoa o detalhe identifica. Não atribuir todas as
  validações à primeira pessoa.
- BAL: nenhum selo.

Ausência de ciência não é recusa. Encerramento administrativo não é aceite
pessoal. Cancelamento não apaga ciência já realizada. Dados históricos sem
ciência comprovada não ganham selo por inferência. O selo visual não é
assinatura criptográfica nem acreditação institucional.

### Macroetapas

Linha compacta próxima ao cabeçalho inicial, depois da identificação e dos
vínculos. Ícones associados ao acontecimento, linha direcional com setas
integradas, sem números sequenciais. Passadas visualmente secundárias; atual
destacada; sucesso verde; pendência âmbar; cancelamento vermelho. Não tornar
etapas pendentes verdes só porque o arquivo foi gerado.

REQ: **Emissão → Ciência familiar → Atendimento → Conclusão**. Cancelamento e
arquivamento conforme fatos, nunca como sucesso de atendimento presumido.

ENT sem divergência: **Expedição → Recebimento confirmado → Conclusão**. Com
divergência: inserir **Tratamento da divergência**, mostrando em
aberto/resolvido. A cronologia ampliada mantém abertura e solução como atos
distintos. Arquivo administrativo é outra situação e não presume recebimento.

Devolução: expedição da devolução, confirmação do recebimento pela família e
conclusão, conforme o percurso existente. Declaração/concordância de
transferência não equivalem a expedição ou aceite físico.

COM: **Emissão → Aquisição (ou Doação registrada) → Chegadas e validação →
Conclusão**. Aprovação prévia só aparece quando realmente aplicável; expectativa
encerrada sem chegada não é recebimento.

BAL sem revisão realizada/exigida: **Contagem registrada → Conclusão**, e
arquivamento quando ocorrido. Revisão aparece quando exigida ou realizada. Se o
parecer vier depois da conclusão, conservar sua posição posterior. Reconto é ato
próprio. Não fazer quem conta “dispensar” revisão obrigatória; a política
facultativa permite conclusão sem parecer, descrita na seção própria, sem
banner.

## 5. REQ — conteúdo material preservado

O rascunho pode ser editado; o material emitido da REQ deve conservar as
proteções atuais de imutabilidade. Itens, urgência, estoque observado e
observações originais não são reescritos porque apareceu novo andamento, novo
PDF ou novo nome no cadastro. Situação, atendimento e vínculos continuam
evoluindo.

Erro material precisa de procedimento próprio que preserve a ficha emitida; não
criar botão genérico de editar para facilitar o design. A ciência é fato
histórico; cancelamento ou arquivamento não a torna inexistente.

Tabela: número, material, unidade, **Estoque informado na solicitação** e
situação de atendimento. Não há quantidade pedida. Zero é diferente de não
informado. Não substituir estoque observado por saldo atual do banco.

O contador de materiais atendidos deve respeitar a regra real de atendimento por
ENT aceita. Não afirmar satisfação quantitativa integral quando a REQ não
definiu quantidade solicitada. Necessidade remanescente e fichas relacionadas
continuam distinguíveis.

A ficha retrata o corte identificado; um PDF antigo pode ser autêntico e estar
desatualizado. Nada no selo elimina a necessidade de consultar a situação atual
em caso de cancelamento ou substituição posterior.

## 6. ENT e devolução — fatos e divergências

ENT de entrega cotidiana: família → equipe, sem campos de origem/destino que
repetem essa definição. No sentido inverso, usar **Devolução de materiais**, com
referências claras aos registros pertinentes e sem mudar o sentido de documentos
antigos.

A implementação da nomenclatura cabe ao Codex sobre os contratos existentes. Não
é ordem para criar DEV/TRF como novo tipo persistido, reescrever enumerações ou
renumerar acervo. Identificadores continuam verdadeiros. A variante de
preparação bilateral deve conservar declaração, concordância/recusa e expedição
distintas, quando aplicáveis.

Autoria, data de expedição, destinatário designado e autor/momento do
recebimento são informações próprias. Não utilizar data do rascunho ou da
geração do PDF no lugar da expedição.

Tabela principal: material/unidade, expedido, recebido confirmado e diferença
ainda aberta. Sem aceite pessoal: **Não confirmado**, não zero.

Divergências têm seção própria contendo material, diferença, quantidade,
momento, autor, providência, responsáveis, solução e resultado. Distinguir
recebimento complementar, devolução, falta reconhecida, perda e situação ainda
não esclarecida. Encerramento não obriga somar devoluções ao recebido.

Solicitação de cancelamento, consentimento, efeitos compensatórios e
regularização administrativa mantêm a história e autoridade dos atos. Uma
conclusão administrativa sem aceite não recebe selo verde de recebimento.

## 7. BAL — contagem, revisão e saldo pós-aplicação

Sem selo. Sem banner inicial de revisão facultativa. Mostrar agendamento
previsto e momento da contagem quando preservados, com indicação de realização
adequada; não fabricar agendamento em ficha avulsa ou antiga.

Tabela: **Material e unidade | Referência | Contado | Saldo após balanço**.

- Referência é a usada na contagem.
- Contado é o valor efetivamente informado, não preenchimento presumido de zero.
- Saldo após balanço é o resultado do estoque da equipe imediatamente depois de
  aplicar aquela contagem, com momento correspondente.
- Sem aplicação: **Não aplicado**. Sem origem histórica demonstrável: **Não
  disponível no registro**. Sem permissão: **Acesso restrito**. Nenhum desses
  estados equivale a zero.

Revisão facultativa não realizada não impede conclusão/arquivamento quando a
política permite. Revisão obrigatória preserva as exigências reais. Reconto
pendente não se torna concluído pelo download do PDF.

**Revisão por item aprovada:** permitir compreender o material efetivamente
examinado, o resultado do parecer (confirmado/diferença apontada), o
encaminhamento e a situação posterior. Não concluir que todos os materiais foram
revisados por existir um parecer genérico. Aproveitar estrutura existente;
quando faltar suporte estruturado necessário, acrescentar o mínimo ligado ao
fluxo real.

O parecer não altera estoque. Reconto ou ajuste autorizado tem identidade e
efeito próprios. Quando já houver correção, mostrar seu vínculo, momento e
resultado sem reescrever “Contado” ou “Saldo após balanço” do ato anterior.
Revisão documental posterior não valida automaticamente movimentações
posteriores nem outra contagem.

## 8. COM — aquisição e entradas em parcelas

Títulos distinguem compra e doação. Doação não inventa pagamento, fornecedor
comercial ou compra. COM não atende a equipe automaticamente: a entrega
pertinente continua sendo um ato separado.

Selo confirma entrada validada, não aquisição planejada. Tabela legível com
**Material e unidade | Adquirido/declarado | Entrada validada | Saldo após
entrada**. Preservar previsões/aprovações em seção própria quando indispensáveis
para compreender aprovação parcial ou expectativa encerrada.

**Definição fechada de saldo:** para cada material, usar o saldo do estoque
familiar imediatamente após a sua última entrada validada naquela COM até o
corte, com a data/hora daquela entrada. Não é o saldo atual, não é o saldo da
equipe, não é soma de saldos, e não é saldo pré-COM acrescido de todas as
parcelas ignorando outros movimentos intervenientes.

Se não houve entrada, informar esse estado. Se não existe evidência histórica
suficiente, declarar indisponibilidade. Não reconstruir por aproximação. Se a
pessoa não pode consultar o saldo, apresentar **Acesso restrito**, sem vazar em
outra coluna, metadado, resumo ou anexo.

Parcelas em seção própria: material, quantidade efetivamente validada,
chegada/registro, validação, responsáveis, momento e resultado pertinente.
Última data pode variar entre os materiais. Não atribuir todas as parcelas a um
único validador sem prova.

Encerrar a expectativa restante não acrescenta estoque. Preferir rótulos como
**Aquisição restante encerrada**, evitando “Dispensado” isolado que possa
sugerir dispensação de medicamento. Uma compra parcial encerrada não deve
aparentar recebimento físico integral.

## 9. Observações e seções complementares

Depois da relação de materiais, manter observações originais numeradas, uma por
registro, com filete de destaque e texto completo. Título adequado ao documento
e explicação curta: **Registradas pelo autor no ato da ficha.** Não resumir,
reescrever ou atribuir ao exportador. Texto longo continua na página seguinte,
sem corte.

Registros posteriores são andamentos, não alterações silenciosas da observação
original. Eventuais revisões de texto histórico devem obedecer ao contrato real
de preservação, não ser inventadas pelo gerador.

Andamentos usam linguagem compartilhada com a aplicação: origem
manual/automática e relevância comum/importante/atenção são dimensões distintas.
Ícone e nome devem significar a mesma coisa na tela e no documento. A
apresentação vertical mantém cronologia única; as cores destacam a natureza sem
reordenar acontecimentos.

Relato manual não comprova por si ciência, recebimento, aprovação ou movimento.
Menção a pessoa não a torna autora ou signatária. Citação de ficha não cria
vínculo de atendimento.

Período filtra o momento do registro, no fuso definido, preservando datas de
fatos narrados como informação distinta. Buscar todas as páginas necessárias,
não apenas a primeira página do feed. Informar seção selecionada sem registros;
não fingir completude se uma fonte falhou. Congelar o conjunto da emissão de
modo consistente com o corte.

Comunicações distinguem registrado, enfileirado, aceito pelo provedor, entregue,
leitura observada e ciência. Histórico de acesso relata ações observadas, não
supõe que abrir comprova ler ou que baixar comprova compartilhar.

## 10. Autenticidade, links e identificação da emissão

Título **Autenticidade e verificação**, bloco legível com descrição e elementos
de consulta. Modelo de redação variável, somente para exemplares efetivamente
assinados:

> Esta [requisição/ficha de entrega/ficha de devolução/ficha de aquisição/ficha
> de balanço] foi registrada por [autor histórico], em [data/hora]. A emissão
> deste exemplar foi solicitada por [solicitante], em [data/hora], e assinada
> digitalmente pelo Home Care Assistant em [instante correspondente].
>
> Verifique em [endereço oficial] com o código [código deste exemplar] ou pelo
> QR. Código e QR localizam a emissão. Para conferir o arquivo recebido e sua
> assinatura, envie o próprio PDF nessa página. A consulta detalhada de autoria
> e da ficha exige acesso autorizado.

Identificar **Assinatura interna · V1 · Não ICP-Brasil**. Isso não é garantia de
confiança externa, nem assinatura pessoal do exportador, nem data certificada
por terceiro independente. Preservar as ressalvas reais do mecanismo vigente sem
obrigar o leitor da Ficha a interpretar parâmetros criptográficos.

Não colocar hashes extensos, IDs de sessão, IP e cadeias de certificados nas
modalidades operacionais. Eles não são substituídos por selos decorativos;
continuam nos mecanismos/evidências próprios quando pertinentes.

Número clicável abre a rota canônica com ID estável, login e autorização atuais.
Sem tokens, segredos, URLs temporárias de armazenamento ou dados clínicos no
link. Código e QR públicos de validação são distintos do link privado da ficha.
QR copiado de outro documento não comprova o arquivo recebido; upload deve
verificar os bytes reais.

Publicamente, preservar resposta mínima sem nomes/paciente/materiais. Detalhe de
autor/exportador somente quando autorizado pelo contrato. Falha de validação do
serviço não deve ser rotulada automaticamente como fraude.

Assinatura identifica origem e integridade do exemplar; não prova veracidade
física de cada relato nem que a ficha segue ativa. Download de exemplar pronto
conserva bytes e autoria de emissão; nova emissão gera outra identidade. Aplicar
toda apresentação, links, marca-d'água e conteúdo antes da assinatura, sem
editar o arquivo pronto depois.

## 11. Confidencialidade e responsabilidade

Aviso completo uma vez próximo ao encerramento; aviso curto no rodapé de todas
as páginas. Redação consolidada:

> **Confidencialidade e proteção de dados pessoais**
>
> Este documento contém dados pessoais, inclusive informações de saúde, sujeitos
> a proteção especial pela Lei nº 13.709/2018 (Lei Geral de Proteção de Dados
> Pessoais — LGPD), quando aplicável. O acesso, a guarda, a reprodução e o
> compartilhamento devem respeitar a finalidade legítima, a necessidade e a
> segurança das informações, limitando-se às pessoas autorizadas e aos dados
> necessários. A emissão não autoriza divulgação pública ou uso incompatível com
> essa finalidade. Confira o destinatário antes de compartilhar e utilize canal
> adequado. Se receber este documento por engano, não o encaminhe; comunique o
> responsável pelo envio e observe as orientações de guarda ou descarte
> aplicáveis. A identificação do exportador não afasta os deveres dos demais
> envolvidos, nem substitui as regras de autorização e proteção do sistema.

Rodapé curto: **Uso restrito · Informações pessoais de saúde.**

A referência usa dados fictícios e sinaliza isso. O gerador real não copia o
aviso de maquete; o aviso de confidencialidade permanece. Não inserir contrato
de exoneração ampla, consentimento automático ou condição legal que não foi
aprovada.

## 12. Auditoria controlada

Permissão específica; não derivar automaticamente da leitura de uma ficha ou do
papel global. Usar o modelo de competências já existente; na ausência de
autorização explícita, negar a emissão sem bloquear Ficha/Ampliada autorizadas.

Marca-d'água repetida: nome do solicitante, momento e identificação da emissão.
Não adicionar CPF, IP ou paciente para intensificar a marca. Marca favorece
identificação do exemplar, não impede recortes/remoção nem prova sozinha a
autoria de um vazamento.

O escopo deve identificar fonte, período, conteúdo e limitações. O Codex pode
enriquecer/retirar informações com fundamento na pertinência e autorização, sem
exportar dados indiscriminadamente nem apresentar conclusões periciais
automáticas. Estrutura visual da auditoria é preliminar; não usar isso para
atrasar o acabamento das fichas operacionais.

## 13. Forma de implementação e futuro fora do complemento

O HTML e as imagens definem aparência, não stack. Reutilizar o gerador, fluxo de
assinatura e armazenamento sempre que viável; escolhas técnicas cabem ao Codex.
Dados de permissão, autoria, situação e saldo vêm de fontes autorizadas, não do
navegador.

A permissão de ler a ficha não implica acesso ao estoque familiar. **Acesso
restrito** deve ser produzido sem transportar o número ao documento. Não trocar
esse rótulo por zero, não disponível ou traço indistinguível de ausência.

Histórico profissional, origem importada e datas desconhecidas devem permanecer
honestos. Exemplos sintéticos de revisão por item ou saldo não provam que o
recurso existe; implementar a base mínima necessária ou declarar lacuna
histórica concreta, sem inventar evidência.

Ficam fora desta autorização: adoção comercial multiempresa, troca de logo por
perfil pessoal, white label, reunião automática de PDFs num dossiê, compra de
certificado ICP-Brasil, novas integrações e reformulação geral de processos. São
possibilidades futuras, não bloqueadores desta entrega.

**Não há pontos de design aguardando uma nova rodada de aprovação.** Questões
técnicas podem ser resolvidas pelo Codex dentro do escopo. Se uma informação
histórica não puder ser obtida de modo confiável, apresentar seu estado real e
registrar o limite, sem ocultar o problema nem suspender todo o restante.
