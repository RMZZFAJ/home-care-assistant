# D4.5 — origem, autoria e datas do PDF V6

Novas intenções usam rendererRevision=6. A migration20261107150000 acrescenta
sourceFacts à cópia privada congelada, com proveniência e marcos temporais.
O corpo e o hash do evento canônico permanecem intactos: sourceFacts é contexto
documental adicional, protegido pela intenção imutável, assinatura e SHA do
exemplar. Não se atribui esse contexto ao hash original do evento.

O banco obtém os fatos; parâmetros do navegador não escolhem revisão, autoria,
datas ou snapshot. O trigger privado não tem EXECUTE público/Auth/serviço.
Intenções V5 já existentes conservam seu snapshot e podem ser recuperadas;
arquivos ready continuam sendo baixados pelos bytes registrados, sem nova geração.

## Rótulos e preservação

Importação histórica separa data do documento físico, importação e primeiro
registro técnico. Data de origem NULL imprime Data desconhecida. A importação
não é apresentada como emissão original. Nome de origem disponível prevalece;
ausência permanece desconhecida, com proveniência explícita. O histórico não
gera obrigação atual de ciência ou atendimento.

Documento nativo distingue primeiro rascunho privado salvo, criação da ficha,
emissão operacional registrada e solicitação de geração deste exemplar.
O solicitante atual da geração aparece separado do responsável preservado na
origem. Nomes dos eventos e IDs continuam visíveis após rename/revogação.
Fallback para cadastro atual é rotulado como atual, sem nome histórico preservado.

O oráculo do pipeline extrai texto e geometria com LibPDF e confere cada fato
na sua região semântica. Um valor existente em outro campo não supre um fato
ausente. V6 recusa caractere sem representação antes da assinatura/Storage,
com CONTENT_INVALID não repetível e orientação explícita na interface.
Não há geração silenciosa com perda de caracteres.

## Evidências e limites

[Manifesto de execução](D4_5_EVIDENCE.json) conserva coortes e tentativas falhas.
[Corpus](d4-source-facts-proof/CORPUS.json) contém somente dados fictícios e
três PDFs reais gerados no produto: COM a partir de rascunho privado e duas
origens físicas, com data conhecida e NULL. A raiz anexada é pública e efêmera;
nenhuma chave privada foi exportada.

[Verificador independente](d4-source-facts-proof/verify.py) usa pdfplumber,
pypdf e pyHanko; [resultado](d4-source-facts-proof/VERIFICATION.json) registra
versões das dependências, hashes, fatos, posição de campos, limites de texto,
rodapé e cobertura ENTIRE_FILE. Assinatura e TSA são aceitas contra a raiz
interna fornecida; isso não comprova confiança externa, revogação externa,
ICP-Brasil, independência de terceiro ou validade jurídica.

Para repetir, com essas dependências Python instaladas:

```powershell
$proof = 'docs/audits/D/D-B/d4-source-facts-proof'
.venv\Scripts\python.exe "$proof/verify.py" "$proof/CORPUS.json" `
  --output output/pdf-source-facts-result.json
```

long-note.UNSIGNED.pdf é um probe controlado do compositor COM: 1600 repetições,
12 páginas, marcador final na página10. Não é emissão registrada ou assinada.
O verificador confere sua ausência de assinatura, marcador, geometria e rodapé.
O raster do marcador e as nove páginas dos exemplares reais foram inspecionados.
Não equivalem a prova com tecnologia assistiva ou dispositivo físico.

Estado daquele lote: C100/C102 têm prova local dirigida; C101 conserva
pendência específica de ENT
com preparação e expedição em dias distintos. C105/C106 continuam parciais:
faltam combinações factuais e visuais de todos os estados, documentos/anexos e
conteúdos extensos. PDF acessível, anexos anotados, custódia/rotação, CI do SHA,
D3 restante, D5, bases operacionais e reconciliação remota final continuam gates.

## Reconciliação posterior — D4.9

O [lote temporal ENT](ENT_TEMPORAL.md) concluiu a lacuna local de C101: preparação
armazenada e rascunho privado em dias anteriores, primeira expedição, exemplares
distintos e download exato. Dois Auth, seis casos de produção e quatro PDFs
assinados foram conferidos. Relógios antigos são fixtures locais explícitas;
não houve mudança de runtime nem teste físico de24 horas. Os gates de AT,
aparelho, PDF marcado e D-C/D6 não são aprovados por essa reconciliação.
