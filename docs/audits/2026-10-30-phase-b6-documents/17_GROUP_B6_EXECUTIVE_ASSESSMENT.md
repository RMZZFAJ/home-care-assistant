# Parecer executivo B6

A B6.0–B6.12 terminou como diagnóstico documental, sem correções. O sistema
preserva fatos e versões com controles relevantes, mas suas representações ainda
podem omitir ressalvas ou sugerir datas, autores e pendências inadequados. O
parecer NO-GO anterior permanece. Esta auditoria não aprova produção.

## O que já pode ser reconhecido como correto

REQ registra necessidade sem quantidade solicitada; COM separa aquisição e
recebimento validado; ENT separa expedição, trânsito e aceite; BAL distingue
contagem atual, referência e revisão. Histórico, hashes, versões e acesso por
paciente existem. A leitura independente dos 745 eventos locais de 210
documentos não encontrou divergência de hash, cadeia, versão, identidade ou
cabeçalho. Rename não reescreveu o nome original do emissor/paciente nem o hash
antigo.

Versões anteriores podem ser recuperadas pelo endpoint autorizado. Versão
ausente não é substituída pela atual; arquivo original ausente não é recriado.
Mas a interface não facilita baixar cada versão nem explicar suas mudanças. Zero
PDFs originais estavam registrados no baseline local; isso não certifica
existência de acervo original remoto. PDFs r4 são representações derivadas.

## Problemas que precisam entrar na decisão de correção

- PDF legado pode mostrar data atual quando a original é desconhecida e
  priorizar nome cadastral sobre o snapshot histórico. A fonte continua intacta.
- ENT pode imprimir como Emissão a data em que o draft foi criado, dias antes da
  expedição. Cancelados podem continuar com cards/instruções de recebimento
  pendente ou operação em andamento.
- Histórico supply usa nomes atuais do diretório, embora o evento tenha nome do
  momento do ato. O PDF conserva esse nome histórico corretamente.
- Ressalvas de avaria e natureza das conciliações ENT não acompanham as
  quantidades no PDF. BAL não relaciona revisão/grupo à versão de contagem.
- Duas parcelasCOM foram preservadas corretamente, uma rejeitada e outra
  validada; os eventos de declaração não identificam a receipt que criaram e o
  snapshot não inclui a coleção de parcelas. PDF agregado não explica chegada
  ainda pendente de validação nem motivo de rejeição.
- Nome permitido de 160 caracteres com quebras internas faz célula atravessar
  rodapé e perder texto visível. Palavra longa comum e tabela extensa normal
  passaram como contraprova: é defeito específico de célula alta.
- Sanitização de PDF passivo apagou ressalva e traço visíveis em anotações.
  Texto-base e a mesma ressalva gravada como conteúdo normal sobreviveram. O
  arquivo sanitizado não é automaticamente fiel ao original recebido.

Treze registros: 11 P2 e 2 P3, nove causas novas, duas manifestações conhecidas,
um risco aprofundado e uma revalidação. Sem P0/P1 novo; isso não prova ausência
universal de defeitos. Os bloqueadores de A/B1/B3 continuam abertos.

## O que o comprovante realmente comprova

Hash canônico permite comparar conteúdo registrado; hash PDF identifica bytes
guardados, mas o download do cache hoje não o compara novamente. Essa lacuna foi
demonstrada com bytes controlados, sem corromper bucket real. QR decodificado
preserva ID/versão/hash e consulta correspondência mínima; não recebe o arquivo
do leitor, não valida assinatura e não prova recebimento físico. O domínio do QR
é fixo e precisa de continuidade operacional.

Não há assinatura digital assimétrica de pessoa ou carimbo externo implementado.
Nome, conta e perfil profissional não substituem confirmação humana do fato.
Ciência expressa, automática, leitura de mensagem e aceite de material são atos
distintos. Anexo prova o derivado armazenado e sua associação, sem provar por si
quem capturou o papel ou se o conteúdo declarado aconteceu.

## Apresentação, limites e próximos responsáveis

Onze PDFs fictícios/32 páginas; 20 páginas selecionadas vistas, mais uma em
cinza. Quatro páginas adicionais de anexos origem/derivado foram vistas. As
amostras comuns são sóbrias e legíveis no raster; PV09 tem corte confirmado.
Idioma/tags acessíveis continuam ausentes, causa B1 revalidada. Impressão real,
AT, câmera, dispositivos físicos e compreensão por pessoas continuam
NOT_VERIFIED.

Incluir estoque observado/atendimento por linha e melhorar navegação histórica
são escolhas editoriais P3. Guarda de original/derivado, retenção, dados
mínimos, responsável pela conferência, domínio e eventual assinatura exigem
decisão do produto/operação. Restore conjunto de banco, Auth, bytes,
configuração e jobs continua NOT_VERIFIED; backup com hash/TOC não o substitui.

Código, 232 rotinas SQL e dados públicos originais foram preservados. As 78
contas Auth anteriores conservaram 13 campos estáveis; duas contas fictícias
novas permanecem, sem pacientes/documentos novos persistidos nos ensaios
revertidos. Não houve envio externo, alteração remota, deploy, PR ou merge. O
handoff18 organiza decisões futuras sem iniciar C/D.
