# Acervo e compatibilidade de PDFs

O acervo é um recurso privado do documento. Exige sessão Auth, contexto do
paciente e capacidade de leitura atual. IDs, versões e links não concedem acesso.
O histórico BAL abre /documentos/:id/arquivos?version=:version; a consulta sem
filtro reúne todas as versões. A representação histórica nova declara sua
origem e utiliza o instante e a assinatura técnica da emissão atual.

## Contrato de leitura

GET /api/documents/:id/archive aceita version opcional e cursor completo
before/kind/reference. A página contém até20 registros, ordenados por instante,
tipo e referência descendentes. O cursor inclui os três campos; um novo registro
no início não duplica ou remove registros das páginas seguintes. Os tipos são:

- issuance: intenção independente, andamento e recibo de assinatura já definido.
- legacy_original: arquivo original de document_pdfs, com SHA preservado.
- legacy_render: representação de document_pdf_renders, com revisão e SHA.

O acervo não devolve snapshot, caminho do Storage, chave de idempotência ou
prova de lease. Registros legados mostram o instante de registro no acervo;
solicitante e data de emissão ausentes são desconhecidos. A interface não
inventa assinatura incorporada para um registro que não a comprovou.

## Download e geração

GET /api/documents/:id/pdf?issuance=:id recupera a emissão assinada exata.
O caminho antigo com version e renderer=legacy recupera o original; renderer=4
ou outra revisão registrada recupera aquela representação. O padrão antigo
continua sendo4. Todos exigem leitura vigente antes e depois do acesso ao
Storage e SHA dos bytes igual ao registro. A emissão assinada também passa pela
validação criptográfica com a política pública atual.

Nenhum GET gera, assina, substitui ou registra PDF. Ausência no caminho legado
retorna PDF_NOT_GENERATED404 e orienta a ação Gerar PDF. Uma declaração ENT
anterior à expedição conserva sua recusa de comprovante operacional. Falha de
recuperação permanece explícita; divergência de bytes retorna
PDF_BYTES_DIVERGE503, sem transmitir conteúdo alterado. O stream privado só
começa depois das verificações completas. O arquivo registrado não é substituído.

Gerar PDF usa POST de emissão e a chave da mesma intenção recuperável. Uma
segunda ação nova cria outro exemplar. O estado local da intenção fica separado
do erro de consulta. Perda de acesso limpa a lista visível; falha transitória
permite consultar novamente e remove o erro quando a resposta válida retorna.

## Preservação e validação

A migration20261107123000 cria somente a RPC Auth de leitura unificada.
Originais e representações legadas permanecem intocados. O helper de testes
renderiza V4 de um snapshot fictício real apenas para simular o acervo anterior;
não é usado no runtime do produto nem prova assinatura.

A regressão Auth percorre103 registros mistos e uma inserção entre páginas,
filtra versões e recusa cursores parciais, anon, serviço e vínculos revogados.
Os testes de unidade discriminam ausência, digest divergente e revogação após
I/O. A jornada de navegador verifica originais/V4, recusa de adulteração e
recuperação após restauração dos bytes originais, representação histórica nova,
falha de consulta, larguras e perda de leitura. Resultados e coortes são
registrados no [manifesto D4.4](D4_4_EVIDENCE.json).

Instalação limpa, evolução legada e regressão completa pertencem à CI do SHA
publicado. Prova local não equivale a execução na Vercel, aceite com tecnologia
assistiva, dispositivo físico, certificado ICP-Brasil ou liberação operacional.
