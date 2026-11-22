# Prova isolada de interoperabilidade D4

Este diretório preserva uma prova técnica; **não é o ciclo de emissão do
produto**. Nenhum critério D4 recebe aceite por esta prova. Nenhuma assinatura
foi aplicada retroativamente a uma ficha, e não houve integração externa.

LibPDF0.5.3 assinou um PDF fictício com certificado técnico interno. Uma TSA
OpenSSL interna produziu token RFC3161 sobre a assinatura; não é um horário
simples no banco. OpenSSL conferiu a resposta. pyHanko0.38.1, independente do
assinador, conferiu bytes, CMS, cadeia interna explicitamente configurada,
atributo signing-certificate-v2 e token temporal. Signing-time não aparece
nos atributos CMS. O arquivo usa ETSI.CAdES.detached e cobre o arquivo inteiro.

A raiz pública de teste só é aceita quando fornecida explicitamente ao
verificador. Não foi instalada como raiz confiável do sistema. Certificados
e TSA internos não fornecem confiança externa nem independência temporal.
A verificação não usou rede; revogação externa não foi comprovada.

Contraprovas preservadas no [manifesto](../D4_PROBE_EVIDENCE.json):

- Alterar um byte coberto reprovou a integridade do conteúdo.
- Acrescentar bytes preservou a assinatura original, mas mudou a cobertura
  para ENTIRE_REVISION; a política de exemplar imutável recusou o arquivo.
- Texto e geometria foram extraídos com pdfplumber e a página renderizada
  por pypdfium2 foi inspecionada. Isto não é o oráculo de fatos de REQ/COM/ENT/BAL.

Para conferir o exemplar preservado, com pyHanko0.38.1 na venv local:

```powershell
.venv/Scripts/python.exe docs/audits/D/D-B/d4-probe/verify-proof.py `
  docs/audits/D/D-B/d4-probe/signed-proof.pdf `
  docs/audits/D/D-B/d4-probe/test-root-public.pem
```

O script de geração precisa ser copiado para output/phase-d-work/d4-poc,
onde @libpdf/core0.5.3 foi instalado isoladamente com ignore-scripts. Ele
usa pdf-lib já existente no projeto e OpenSSL do Git para Windows. A custódia
de teste fica em LOCALAPPDATA/home-care-assistant/signature-poc, com herança
removida e acesso exclusivo da conta local. As chaves RSA3072 são cifradas;
senhas, P12 e chaves privadas ficam fora do Git, PDF, navegador e logs.
O repositório contém somente a raiz **pública**, scripts e PDF fictício.

O adapter OpenSSL é exclusivo desta prova. Não é a implementação serverless
da TSA. Permanecem pendentes: adapter compatível com runtime, verificador do
produto, custódia operacional/rotação/incidente, oráculo de fatos, emissão
idempotente, Storage imutável, histórico e jornadas públicas QR/código/upload.

Fontes primárias consultadas:
[LibPDF](https://github.com/LibPDF-js/core),
[API de assinatura](https://github.com/LibPDF-js/core/blob/main/content/docs/guides/signatures/index.mdx),
[pyHanko](https://docs.pyhanko.eu/en/latest/lib-guide/signing.html).
