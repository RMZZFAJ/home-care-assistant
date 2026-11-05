# B6.1 — Taxonomia e fontes de verdade

O inventário CSV acompanha 17 classes efetivas em 22 campos. REQ, COM, ENT e BAL
são os quatro documentos operacionais. Não há documento autônomo de consumo,
escala/presença ou comprovante fiscal descoberto no renderizador; esses
registros complementam o significado, sem virar tipos PDF por enum.

A fonte primária é a transação persistida: cabeçalho/linhas e fatos do domínio,
ledger, recebimentos, ciência e obrigações. O evento captura uma versão
canônica; o PDF é representação parcial desse evento, não autoridade superior. A
tela exibe também estado atual e consultas complementares.

```text
comando autorizado → transação/RPC → fatos + ledger → evento por versão
                                  ↓ trigger science_snapshot
                        body canônico + autoridade + SHA-256
                                  ↓
                PDF renderer4 → bytes privados → registro hash de arquivo
```

A fotografia/PDF anexado é sanitizado antes de armazenar. É evidência associada,
não assinatura do documento nem prova automática do fato físico. O nome do
remetente prova a conta que enviou sob as condições da sessão, não quem
fotografou/assinou o papel. Histórico importado e demonstração exigem
qualificadores próprios; DEMO não passa pelo banco.

## Universo e limites

Inventário inclui origem, ator/papel, paciente, identidade, estado, campos,
fonte, snapshot, versões, eventos, comprovante/PDF, anexos, dependências,
limites e recuperação. Mapeamento técnico: document-pdf, operational-pdf,
receipts, receipt, presentation, APIs documents/requisitions/attachments, página
documentos, verificar, demonstracao e componentes de histórico. Referências e
hashes das provas anteriores ficam em reused-evidence.json.

Reconhecimento B6.0: 210 documentos, 745 eventos, 199 renders e zero PDFs
originais registrados; 34 anexos, 199 objetos document-receipts, 12
patient-evidence e cinco avatares. São contagens locais, não certificação de
conteúdo real, acervo remoto ou recuperação conjunta. 84 migrations e 232
rotinas conferidas sem drift de B3. Nenhum reset ou serviço novo.
