# Prova técnica da estrutura PDF V10

Os quatro [exemplares](EXEMPLARS.json) são emissões reais do aplicativo local,
com Auth e dados fictícios. REQ, COM, ENT e BAL conservam código, versão e hash
de origem. Os PDFs incluem assinatura técnica e TSA internas. A raiz pública
serve somente ao ensaio; não é confiança externa ou ICP-Brasil.

O [resultado](VERIFICATION.json) foi produzido por pypdf, PyMuPDF e pyHanko.
Confere estrutura ligada ao conteúdo, texto/pixels V9 preservados e assinatura
do arquivo inteiro com token temporal. Não comprova AT, PDF/UA, impressão,
recebimento físico, relógio independente ou liberação operacional.

Reprodução na stack já preparada, sem reset:

```powershell
node node_modules/vitest/vitest.mjs run tests/pdf-structure.test.ts
$proof = "docs/audits/D/D-B/d4-structure-proof"
.venv/Scripts/python.exe "$proof/verify.py" output/pdf/structure-v10 `
  --corpus "$proof/EXEMPLARS.json" `
  --output output/phase-d-work/structure-recheck.json
```

O teste regenera corpus V9, V10 e assinaturas efêmeras. O verificador também
confronta os quatro bytes preservados neste diretório com o manifesto e a raiz
pública explícita. Não usa rede, segredos permanentes ou confiança do sistema.
Validade e confiança dos certificados são avaliadas na execução; este registro
não promete confiança criptográfica permanente dos certificados de ensaio.

Arquivos preservados: [REQ](req-current.pdf), [COM](com-receipts.pdf),
[ENT](ent-missing.pdf) e [BAL](bal-recount.pdf).
