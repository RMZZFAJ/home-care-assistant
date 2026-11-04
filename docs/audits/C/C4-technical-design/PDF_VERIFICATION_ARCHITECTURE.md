# Arquitetura de emissão e assinatura obrigatória

P09-B substitui o desenho anterior de hash primeiro/assinatura opcional.
Contrato técnico canônico em
[emissão e verificação C7](../C7-decision-closure/PDF_SIGNING_ISSUANCE_AND_VERIFICATION.md).
Nenhuma implementação ocorreu em C.

Identidade: documento/versão/hash canônico, renderer/classe, issuance_id,
solicitante/instante, certificado/chave, bytes finais e hash externo. Download
recupera emissão existente; nova emissão cria outra intenção/ID. Retry da
intenção recupera o mesmo resultado. Original/derivado têm origem qualificada;
não assinar retroativamente documento histórico como se fosse o exemplar
original.

Reservar intenção → compor fatos/atores/QR/metadados não sensíveis → conferir
conteúdo/geometria → assinar sistema → validar assinatura/cadeia → persistir
bytes finais imutáveis e ready/hash. Sem edição posterior e sem hash final
circular dentro do arquivo. Permissão revalidada antes de emitir/baixar.
Mismatch de cache não é entregue como íntegro nem substitui original.

Esquema incremental futuro separará emissão de versão, preservando
document_pdfs antigos e respectivas referências. Registro de emissão usa
unicidade da intenção e Storage privado, com estados reservada/assinando/
ready/falha/incerta. Reconciliar objeto/registro após falha sem nova emissão
silenciosa; não conceder DML geral ou expor chave privada.

Verificador compara exemplar/digest/assinatura/cadeia e diferencia falha,
ausência de referência e indisponibilidade. QR opaco não comprova bytes;
consulta pública não contém paciente/material/solicitante/IP. Signatário
técnico é sistema; solicitante não fez assinatura pessoal. Perfil PAdES,
certificado, guarda, TSA/custo e confiança são gates de escolha técnica, não
motivo para retirar assinatura incorporada do primeiro escopo.

Oráculos: duas emissões/uma versão, retry/download idêntico, edição externa,
QR copiado, cache alterado, histórico/legado e PDF sem texto. Hash/assinatura
válidos não provam conteúdo completo, acessibilidade ou fato físico.
Leitores/cadeia/TSA, AT e impressão reais são homologações posteriores.
