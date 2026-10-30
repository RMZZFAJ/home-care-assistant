# B6.9 — QR, identificação e limites probatórios

B69-O01 extraiu o PNG incorporado de PV01/PV05 e decodificou pixels com ZXing
instalado, sem solicitar nenhuma URL. Ambos contêm documento exato, versões3/5 e
hash exato fornecido ao render. Não redirecionam à versão atual por omissão de
parâmetro. O QR é180×180 pixels incorporado com 76 pontos na página; leitura de
câmera/impressão física não foi homologada. São dados sintéticos não persistidos
e seus hashes de fixture não certificam registros de produção.

O domínio é fixo em operational-pdf: home-care-assistant.vercel.app. Não deriva
do ambiente nem da origem da requisição. Emitir PDF local/preview produz QR para
esse domínio também; mudança de domínio futuro exige preservar resolução dos
PDFs antigos. Correspondência ao domínio canônico operacional, DNS e homologação
de lançamento permanecem decisão/validação externa; não se afirma que o domínio
atual está indisponível. Dependência da análise B5 de URLs canônicas, sem
reabrir toda a integração nem acessar produção.

## O que a página faz

Página verificar valida UUID, versão positiva e hash64hex, usa chave pública do
ambiente e RPC verify_document_integrity. Retorna apenas correspondência
booleana, sem nome, itens, notas, vínculos ou ciência. É consulta pública
mínima, independente de login. Documento completo permanece sob autorização por
paciente. Revogar vínculo impede nova consulta completa, não precisa impedir
essa resposta pública mínima. B36-04 prova hash histórico correto aceito e
errado recusado; B47-03 prova cache privado recusado em outro contexto.

A RPC verifica existência da tupla id/versão/content_hash. Não recebe o PDF, não
calcula hash dos bytes enviados pelo leitor e não recalcula body::text na
consulta. Copiar um QR legítimo para outra página não vincula os novos bytes à
evidência original: o mesmo link continua perguntando pela tupla original. É
limite do mecanismo, não falsificação executada, quebra de SHA-256 ou
vulnerabilidade pública comprovada. PDF informa esse limite; preservar e tornar
operacionalmente claro sem prometer certificação além da resposta.

- **UUID/protocolo/código/versão**. **Existe:** Sim. **Conclusão permitida:**
  Identificação e referência contextual.
- **Hash canônico e cadeia**. **Existe:** Sim. **Conclusão permitida:**
  Comparação do corpo/continuidade contra referência confiável.
- **Hash dos bytes PDF**. **Existe:** Registro separado. **Conclusão
  permitida:** Comparar artefato específico; cache não confere hoje.
- **QR/URL**. **Existe:** Sim. **Conclusão permitida:** Levar à consulta mínima
  de tupla.
- **Autenticação e capacidade local**. **Existe:** Sim, para conteúdo completo.
  **Conclusão permitida:** Autoridade da sessão no contrato.
- **Ciência expressa/automática**. **Existe:** Sim, origens distintas.
  **Conclusão permitida:** Registro do modo de conhecimento; sem recebimento
  implícito.
- **Assinatura digital assimétrica de pessoa**. **Existe:** Não implementada.
  **Conclusão permitida:** Não atribuir equivalente ICP-Brasil.
- **Carimbo de tempo externo/certificação**. **Existe:** Não descoberto.
  **Conclusão permitida:** Horário do servidor não é selo de terceiro.
- **Presença/entrega física**. **Existe:** Não demonstrada por hash/QR.
  **Conclusão permitida:** Depende da ação/declaracão humana e contexto.

Não se emite conclusão de admissibilidade, força jurídica absoluta ou
conformidade legal. A assinatura eletrônica é decisão de necessidade futura; não
requisito técnico automaticamente inferido pela existência de comprovante. As
limitações precisam ser entendidas por quem compartilha e confere o arquivo.
