# D4.12 — estados e conteúdo extenso do PDF

Esta etapa fecha lacunas de prova de conteúdo, sem alterar renderizador,
aparência, assinatura, banco ou autorização. Reutiliza os oráculos anteriores
de origem, fidelidade, estado terminal e estrutura V10. Intenções e bytes
antigos permanecem intactos.

Dez novos exemplares controlados, com assinatura PAdES-B-T e TSA internas,
foram gerados e confrontados com extração, geometria, raster e assinatura
independentes. São provas do compositor, não emissões adicionais do aplicativo
ou ações de usuários reais. As emissões Auth reais anteriores conservam seus
dossiês e limites.

## Casos verificados

- REQ, COM e ENT canceladas: estado terminal preservado, sem instrução de
  recebimento ou atendimento atual. REQ histórica de ciência desconhecida não
  vira pendência operacional.
- REQ parcial: dois itens atendidos em seis e quatro pendentes, associados aos
  respectivos campos por recortes independentes. ENT parcial: três expedidos,
  um aceito e zero conciliado; divergência não vira conferência integral.
- REQ/COM/ENT/BAL extensos:120 materiais comuns, nome de160 caracteres com LF,
  URL com300 caracteres contínuos, observações extensas e anexo com nome longo
  e SHA-256 completo. Marcadores finais de nome, materiais, notas e anexo são
  extraíveis e têm tinta dentro da área útil. Hash do anexo é conferido na
  coluna própria, incluindo a quebra entre linhas.
- Caractere sem representação suportada é recusado explicitamente antes da
  assinatura, preservando a alternativa autorizada no sistema.

Os dez PDFs têm87 páginas. Todas foram extraídas e rasterizadas; limites úteis
e rodapé foram conferidos em cada página. Os quatro casos longos têm20/15/15/15
páginas. Foram preservados23 recortes dos marcadores, incluindo ocorrências
repetidas do nome. Os quatro marcadores finais de materiais foram inspecionados
visualmente. Não houve revisão estética.

O oráculo reutilizado de pypdf confere estrutura, escopo de cabeçalhos e
MCIDs/ParentTree; pdfplumber e PyMuPDF conferem texto, posições e tinta. pyHanko
confirma cobertura do arquivo inteiro e token temporal aceito sob a raiz pública
interna fornecida. Não se busca confiança ou revogação externa na rede.

## Qualificação e contraprovas

Dois testes novos passaram: o corpus de dez exemplares e a recusa de conteúdo
não representável. Tipos, lint do teste e compilação do verificador Python
passaram. A última mudança do teste retirou somente casts TypeScript incorretos;
não alterou os objetos executados. Não foram repetidas suítes gerais ou testes
mutáveis sem mudança de produto.

As primeiras leituras lineares do instrumento exigiam rótulo/valor com dois
pontos e um hash contínuo no texto global. A extração de colunas intercalava
rótulos e fragmentos; essas asserções falharam e foram substituídas por leitura
geométrica do campo e da coluna correta. O primeiro localizador SHA-256 também
capturou um parágrafo explicativo; agora exige o cabeçalho ARQUIVO na mesma
linha. Esses fatos foram conferidos no PDF; não houve correção de produto para
mascarar os erros do instrumento. Logs e hashes preservados no
[manifesto](PDF_OPERATIONAL_CORPUS_EVIDENCE.json).

C105 e C106 têm aprovação local para os casos canônicos cobertos. Isso não
aprova todo estado futuro de documento. C111 e C-NEW-AC-018 conservam os gates
de tarefa humana/AT, impressão e aparelhos definidos em D-C/D6. PDF/UA,
ICP-Brasil e independência temporal externa não são aprovados.

[Corpus reduzido](d4-operational-proof/CORPUS.json),
[resultado independente](d4-operational-proof/VERIFICATION.json) e
[verificador reproduzível](d4-operational-proof/verify.py). Apenas PDFs
fictícios, raiz pública e recortes técnicos são versionados. Local/remoto164
sem migration nova; zero pendências. CI do próprio SHA é obrigatória; PR7
Draft, Sonar adiado, sem merge/promoção, meta D-B ativa.
