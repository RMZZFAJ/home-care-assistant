# Exemplares sintéticos do pipeline D4

Quatro PDFs foram produzidos pelo pipeline real Auth/HTTP/Storage no ensaio
local de produção D4.3:REQ, COM, ENT e BAL. Pessoas, paciente e materiais são
fixtures fictícios. Os QR apontam para a stack controlada127.0.0.1:3100, não
para
produção. Não representam documento clínico real ou homologação operacional.

ARTIFACTS.json congela digests, tamanho, identidade/código e resultados
esperados.
Somente a raiz pública efêmera acompanha os arquivos. As chaves privadas da
execução foram descartadas; essa raiz não é automaticamente confiável no
produto.
Os quatro exemplares passaram em pyHanko0.38.1 independente e no worker final
com orçamento de certificado/chave. A confiança positiva exige fornecer
explicitamente essa raiz de teste ao verificador.

Contraprovas COM:

- altered:um byte coberto mudou, mantendo o QR original.
- appended:assinatura original íntegra, mas acréscimo incompatível com a
política
  de exemplar imutável.
- no-timestamp:CMS do documento permanece válido, mas o atributo temporal foi
  removido dentro do espaço excluído pelo ByteRange. Não atende PAdES-B-T.

O teste public-pdf-verifier confere os sete artefatos. Para conferência
independente, d4-probe/verify-proof.py aceita o caminho do PDF e o segundo
argumento public-root.crt. Negativas não devem produzir accepted=true.
Este pacote preserva a prova e as contraprovas; não aprova cadeia externa,
ICP-Brasil, tempo independente, leitores assistivos ou dispositivo físico.
