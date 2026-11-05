# Registro de inspeção visual B1

Produto 37cb7f85e; execução local iniciada em 28/10 e continuada em 29/10/2026.
Ferramenta: Chromium/Playwright; contas fictícias e envio externo desligado.

## Fotografias atuais, regiões e limites

As folhas contact-01 a contact-19 foram abertas e examinadas pelo auditor.
contact-sheet-map.json indica, por imagem, quantos pixels da fonte foram
incluídos. Esse exame é parcial em páginas longas; redução de desktop permite
examinar estrutura, mas não atestar tipografia fina. Os originais não foram
substituídos por protótipos. Nenhuma folha comprova todos os estados do módulo.

Observações próprias: hierarquia e foco de tarefa claros nos painéis; cards
de saldo separam confirmado de previsão; barra de cinco destinos operacional
permanece consistente. Tabelas e matrizes têm rolagem horizontal deliberada;
não classificar essa rolagem interna como overflow da página sem medir.
Perfil recolhido reduz densidade, mas esconde preferências em Identidade.
Menu de contexto extenso usa rolagem e foco no vínculo atual; nomes visíveis
nas capturas são fixtures. Lista global de pacientes foi mascarada.

Confirmados visualmente: 404 em inglês; Produto no histórico de trânsito;
papéis/estados técnicos em administração; unidade livre no catálogo;
confirmação de escala sem pessoa/período; ENT divergente sem discriminar os
itens e a quantidade informada; movimento familiar sem mostrar retirada/entrada
nem unidade; revisão de configuração BAL sem dia/tipo/pessoa escolhidos.
O COM de doação foi rotulado Compra na tela/PDF. Nenhum desses diálogos teve
a operação definitiva confirmada apenas para obter a fotografia.

## Contraditório das próprias capturas

- A primeira varredura parou porque a 404 não tinha main. O reprodutor foi
ajustado nesta pasta; a segunda varredura completou 51 capturas.
- Na exploração suplementar, a COM já estava aprovada pela política; procurar
Aprovar itens era um pressuposto errado do experimento. Foi exercitado o
comando realmente disponível Registrar aquisição, sem confirmar gravação.
- A ENT foi expedida ao profissional da fixture, não ao novo trabalhador BAL.
A ausência de recebimento para este último foi uma restrição correta. A
revisão de divergência foi depois aberta pelo destinatário efetivo.
- b11-supplement-shiftWorker-scheduled-bal-review.png foi capturada durante
SUBMITTING: ainda contém Contagem, sem título Revisão da contagem. Não prova
a segunda etapa. O reprodutor bal-ready.mjs aguarda o título e o comando
final; sua captura pronta é a evidência a usar.
- Capturas fullPage anteriores podiam preservar scroll de um clique no rodapé;
isso explica posição de elementos sticky nas imagens de etapas/perfil.
Não atribuir espaços/posições desses elementos a defeito do layout. O
harness posterior registra scroll e volta ao topo para captura fullPage.
- A varredura inicial não configurou locale do navegador (padrão en-US).
Textos nativos como Choose File não são classificados automaticamente como
falha de tradução do aplicativo. Harness posterior usa locale pt-BR.

## Interfaces documentais

current-REQ.pdf, current-COM.pdf e current-ENT.pdf vieram dos documentos
persistidos da fixture B1, pelo endpoint protegido atual. São três PDFs e seis
páginas; todas as seis renderizações current-*-page-*.png foram abertas e
inspecionadas. Títulos, protocolo, nomes fictícios, tabelas, estados, rodapés,
hash e QR não apresentaram corte nesses cenários de duas linhas.

REQ preserva ausência de quantidade solicitada, mas não mostra estoque
observado na tabela. COM de doação mantém título de compra. Segunda página
de auditoria é explícita, embora produza espaço livre relevante em documentos
curtos. Não propor compactação que retire fatos necessários. Lang/tags PDF
foram consultados estruturalmente em pdf-inspection.json; leitura com tecnologia
assistiva, impressão e QR físico permanecem NOT_VERIFIED. QR aponta ao domínio
de produção fixado no renderizador; nenhum QR de fixture foi aberto no remoto.

## Preservação

O index passou a conter também os quatro anexos preexistentes na raiz durante
o trabalho. Eles não serão incluídos no commit B1. Manter seu estado; conferir
commit exclusivamente da pasta autorizada no fechamento. Nenhum produto ou
migration foi alterado; não houve envio externo, merge ou deploy.

B1.2: seis folhas b12 abertas; somente região mapeada. Originais painel1440 e
REQ1440 abertos. Drawer320 inteiro no viewport. Nenhuma oclusão da barra
inferior inferida destas imagens. Zero violações axe color-contrast nas quatro
amostras, com grupos inconclusivos registrados.

## Reconciliação final de inspeção

223 capturas de navegador foram abertas através das folhas de contato e
originais explicitados em INSPECTION_REGISTER.csv. A região é a mapeada; não são
todos os pixels de cada fullPage. Acrescentar8 páginas de4PDFs atuais, incluindo
BAL real. Metadados brutos visualInspected=false descrevem a geração inicial e
são sobrepostos pelo registro de inspeção, não por teste humano.

B1.3:1folha; B1.4:3; B1.5:3; B1.6:3 e BAL2 páginas; B1.7:4; B1.8:4
iniciais,2originais prontos e3 folhas suplementares de overlays abertas. B1.2:6
folhas; B1.1:19 folhas e original BAL pronto. Todas as contagens de
arquivos/derivações estão no manifesto; não somar derivados como cenários novos.

A captura supervisor balance-workspace de B1.8 mostra validação de acesso e foi
reclassificada LOADING; b18-ready aguarda o heading de programação. A captura
familiar após ciência ainda contém header anterior; read-back confirmou ciência
e a reconsulta pronta foi aberta separadamente. Duas capturas globais novas têm
máscaras que encobrem parte do fundo/legenda: leitura visual dessa área é
parcial, texto de diálogo foi exportado e fonte examinada.

Dois erros do suplemento final pertencem ao reprodutor: botão é Revogar, sem
nome longo; check() não pode exigir checked quando o clique abre revisão de
duplicidade. Repetição corrigida por click/locator concluiu sem escrita de
negócio; nenhuma capacidade/vínculo foi alterada.

NOT_VERIFIED: todos os aparelhos/participantes/AT; impressão/QR físico; Share
Sheet nativo; Flow externo. Três órfãos excluídos sem rota; dois overlays
condicionais sem estado reproduzido: confirmação de compartilhamento/arquivo e
revisão de Flow. Não são aprovados por import ou rota-pai.

## Tempo e versão dos PDFs

Os arquivos chamados current-*.pdf foram obtidos pelo renderer atual em momentos
registrados nos JSONs. Não significam a última versão após todas as mutações
posteriores: REQ v3, COM v1, ENT v1 e BAL v1 são os snapshots capturados.
COM/ENT/REQ receberam eventos depois. Os PDFs originais não foram sobrescritos;
não usar ENT pendente v1 como prova de recibo aceito v3. Todas as oito páginas
foram abertas. Leitor de tela, impressão e QR físico continuam NOT_VERIFIED.
