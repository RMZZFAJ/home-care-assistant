# Cabeçalhos, ações e progresso das fichas

Incremento D3.31, base9ad124b. Continua a migração ao Modelo Integral nas fichas
REQ/COM/ENT/BAL e no cabeçalho documental da consulta de origem do estoque.
Paridade integral das fichas, demais telas e conclusão da D-B continuam pendentes.
[Fontes e resultados](DOCUMENT_HEADER_VALIDATION.json).

## Implementação

Cabeçalho compartilhado com identificação, código, tipo, situação, versão,
perfil ativo, dados em grade e faixa própria de progresso. O código é o h1 da
ficha completa; o cabeçalho embutido mantém h2. Carregamento, erro e seleção
de contexto conservam seu título. Solicitante, paciente, quantidades, origem,
destinatário, conferência e ressalvas anteriores permanecem disponíveis.
Registro de criação não é apresentado como emissão da COM/ENT/BAL.
Nome histórico ausente não é deduzido de um ID ou do diretório atual.

As ações ficam fora do cartão. Os próprios controles de geração/recuperação
PDF e publicação/recuperação de Andamento são posicionados na barra por um
slot React, sem copiar handlers, refazer permissões ou criar outra intenção.
PDF abre a aba Arquivos gerados; Andamento abre Visão geral. Os componentes,
rascunhos, referências e estados pertencem aos consumidores originais.

Mais contém protocolo, identificador, código e cópia da referência, com
resultado explícito e retorno de foco. Atualizar ficha mantém foco após erro
e na retomada, inclusive quando a leitura recusada retira o cabeçalho e os
dados. A REQ também retira conteúdo anterior em respostas401/403/404; essa
verificação de interface não substitui as provas de autorização no servidor.

Progresso parcial usa itens/linhas integralmente atendidos, adquiridos ou
conferidos. Não soma quantidades de materiais com unidades distintas.
Dispensa, contexto histórico desconhecido, fechamento administrativo e
reconto pendente continuam distintos de conclusão. Painéis inativos ficam
ocultos desde o estado inert da transição, sem desmontar formulários.

## Validação e limites

Sete testes unitários e22 cenários distintos Chromium/WebKit aprovados, com
reuso qualificado por fonte e consumidor. As repetições verificam foco após
503/403, ocultação de dados recusados, retomada, painéis, progresso parcial e
preservação de fatos. Build/tipos, lint dirigido, Markdown e links validados.

O JSON registra rodadas, fontes, falhas e repetições por caso. Comparação ao
HTML cobre cabeçalho, identificação, tipografia, grade, progresso, ações e abas
em cinco larguras, com a referência sem rede. Fatos reais substituem dados
demonstrativos, e a linha móvel de contexto permanece uma extensão documentada.
Teclado, Axe, foco, recuperação, PDFs, ciência, parcelas e origem do estoque
continuam sujeitos às asserções existentes. Não há aprovação humana, assistiva
ou de aparelho físico por emulação de navegador.

A organização final das ações secundárias e a composição das demais seções
permanecem no gate de paridade integral. Este incremento não declara todas as
fichas ou superfícies visualmente concluídas.

Contraprovas preservadas: o botão nativamente disabled perdia foco durante
consulta; a retirada de dados também substituía seu nó. O controle usa
aria-disabled com guarda e restaura o foco na ação de retomada. O estado
inert intermediário de Tabs expunha dois painéis ao seletor WebKit; o CSS
oculta imediatamente o inativo e conserva sua instância. A coleta anterior
ao build não foi contada como execução de navegador; erro de tipo no oráculo
de código ENT foi corrigido consultando a identidade no banco de teste.

Sem novo SQL, RPC, API, contrato documental, assinatura, worker, cache ou envio
externo. Reconciliação remota somente de leitura. CI do SHA publicado,
paridade das demais superfícies,66 composições/171 relações e gates externos,
humanos, físicos e D-C/D6 continuam separados. Sonar adiado, PR7 Draft e
produção NO-GO. Backup e monitoramento não recebem nova aprovação por esta UI.
