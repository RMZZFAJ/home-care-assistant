# B6.6 — PDF: conteúdo, renderização e layout

## Método e amostra

Renderizador4 confirmado em document-pdf/operational-pdf. Onze PDFs fictícios,
32 páginas, produzidos por renderDocumentPdf real, sem HTTP, Storage ou rede.
Snapshot de entrada não sofreu mutação. A4 595, 28 × 841, 89 pontos em todas as
páginas. Extração nativa e rasterização PyMuPDF2.0/MuPDF1.28.5; Poppler ausente
do PATH, sem instalar ou mudar dependência. Vinte páginas representativas foram
efetivamente vistas pelo agente; seleção exata no CSV visual. Texto de todas as
páginas e metadados em evidence/text e b66-inspection-results.json. Não é teste
de impressão física, usuário humano ou leitor de tela.

Hashes apresentados nos ensaios são SHA-256 de JSON.stringify do fixture,
claramente qualificados no resultado; não se alega que sejam hashes canônicos
persistidos no PostgreSQL. O QR desses casos aponta IDs fictícios e não foi
consultado na produção. A fidelidade do hash persistido tem prova separada B63.

## Resultados confirmados

- **PV01/02/03/05/06:** apresentação sóbria, fontes incorporadas, hierarquia,
  margens, tabelas e rodapés legíveis no raster selecionado. Os dados que o
  template escolhe imprimir correspondem ao snapshot. Isso não elimina as
  omissões semânticas descritas na matriz e verificadas por marcadores.
- **PV03:** campo Emissão imprime27/10 às23: 30, embora ent.issued do próprio
  fixture seja30/10 às10: 00. B62-S03 e emit_document sustentam a causa: o
  renderizador usa data de criação, que não é alterada ao emitir draft.
- **PV04/10/11:** documento terminal imprime subtítulo Cancelado e card
  PENDENTE/EM ANDAMENTO. Na ENT sem aceite, o texto ainda instrui a pessoa
  designada a conferir, apesar do cancelamento. É contradição interna, sem
  alteração do estado persistido.
- **PV07:** 35 materiais e 48 eventos em oito páginas. Cabeçalhos de tabelas
  repetem; continuações conservam identificação por código/versão no rodapé e
  Página x de y. Sem spans fora da página. História e dados de conferência são
  completos dentro da projeção. É stress de layout; não se presume que seus48
  eventos repetidos constituam sequência de negócio válida.
- **PV08:** palavra sem espaços157 caracteres, observação longa sem espaços,
  acentos e decimal com seis casas renderizam sem corte. Refuta a hipótese de
  que qualquer palavra longa quebra o renderer.
- **PV09:** nome de 160 caracteres com 78 parágrafos internos gera linha de
  tabela maior que a página. table calcula altura, troca de página uma vez,
  então desenha a linha inteira; não fragmenta linha maior que a área útil.
  Vinte e oito spans ficam fora da página; FIM_B6 não aparece na extração
  visível. Texto atravessa rodapé nas páginas2/5; página3 fica quase vazia. O
  dado continua no snapshot; a representação perde conteúdo recuperável em
  impressão normal. B66-S02 confirmou via RPC real que o nome permitido é
  armazenado e copiado exatamente para uma COM emitida com hash válido. Fixture
  paciente/catálogo/COM foi totalmente revertido. Não é falha causada por
  superar o limite de caracteres ou por dado proibido no catálogo.

## Semântica e contrapontos

Estoque observado7 da REQ não aparece; contador1/2 não identifica qual linha
está atendida. Na ENT, marcadores de avaria/ressalva persistidos em metadata não
aparecem no texto. COM omite marcador de receipt/motivo; BAL imprime nomes na
história, mas não liga revisão a grupo/count_version. Não é correto dizer que
não existe identidade de revisor: o nome aparece na linha do tempo; falta a
ligação operacional da aprovação à contagem.

O legado sem data exibe data de derivação e paciente do cadastro atual; ciência
não comprovada convive com card PENDENTE. PV06 usa helper com zero linhas
controladas: o importador completo recusa entrada vazia, portanto não se usa
esse caso para alegar emissão normal vazia. A falha de data independe da
existência das linhas e decorre do coalesce explícito no helper vigente.

## Acessibilidade e impressão

Texto padrão8–9pt; título17–19pt; métricas/rodapés menores. A4 faz parte do
contrato; duas páginas mínimas são escolha de separar rastreabilidade, não
defeito por si. Não foi detectada página completamente vazia; PV09 evidencia
desperdício secundário causado pelo overflow. Idioma /Lang e StructTreeRoot
ausentes nos onze PDFs, nova manifestação da causa B1-A11Y-001. Texto extraível
não demonstra ordem semântica adequada ao leitor de tela. Impressão real, baixa
visão e QR em câmera física continuam NOT_VERIFIED.

Nenhum template, fonte, renderer ou PDF histórico foi corrigido/substituído.
Quatro fixtures sintéticos terminais foram refinados antes da conclusão para não
atribuir estado impossível ao produto; apenas esses quatro foram regenerados,
conforme ATTEMPTS. Alteração editorial posterior não exige nova geração. Futuro
renderer deve ter identidade nova e preservar bytes antigos.
