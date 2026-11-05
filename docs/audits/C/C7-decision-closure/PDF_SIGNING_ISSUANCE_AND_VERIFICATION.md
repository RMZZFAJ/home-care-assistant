# Emissão, assinatura do sistema e verificação

**P09-B é mínimo obrigatório aprovado.** Assinatura criptográfica incorporada
ao PDF final não é extensão opcional. O desenho técnico abaixo é proposto;
perfil, confiança, fornecedor e custo ainda precisam de fechamento antes da
contratação. Não atribui assinatura pessoal ao solicitante nem certificação
jurídica qualificada.

## Quatro identidades e dois comandos

Documento/protocolo identifica a ficha. Versão e hash canônico identificam seu
conteúdo de negócio. `issuance_id` identifica um exemplar emitido; tem
solicitante autenticado, instante/fuso e revisão do renderer. Hash dos bytes
finais identifica o arquivo depois de assinado. Cada emissão tem também
certificado/chave e resultado da validação técnica.

**Baixar este exemplar** retorna os mesmos bytes/ID e verifica seu digest.
**Emitir novo exemplar** cria nova intenção/ID/instante/assinatura, mesmo com
a mesma versão de negócio. Retry da mesma intenção recupera o mesmo exemplar;
segundo pedido explícito é outro. Assinaturas podem introduzir bytes
distintos: determinismo do conteúdo não exige assinatura byte a byte igual.

## Pipeline sem circularidade

1. Revalidar acesso à versão; reservar intenção de emissão e seus metadados.

2. Compor fatos/atores históricos, ressalvas, datas corretas, QR opaco e
   rodapé; conferir conteúdo, tags/geometria e versão do renderer.

3. Assinar com identidade técnica do **sistema**. Incorporar certificado/
   cadeia e informação temporal segundo o perfil aprovado.

4. Validar a assinatura produzida; persistir objeto final imutável e registrar
   hash/tamanho/referência em estado ready. Falha deixa tentativa recuperável,
   sem anunciar PDF válido.

5. Na entrega, revalidar autorização e hash; mostrar emissão e estado real.

Não editar metadados, QR, páginas ou anotações depois da assinatura final. Se
o perfil exigir material adicional de validação, completá-lo antes de fixar os
bytes do exemplar e seu digest. Hash final não entra como seu próprio valor
dentro do PDF: fica no registro externo de emissão. QR/rodapé contêm
identidade/versão/instante e caminho de verificação, sem esse ciclo
impossível.

## Interoperabilidade e confiança

Avaliar PAdES conforme
[ETSI EN 319 142-1](https://www.etsi.org/deliver/etsi_en/319100_319199/31914201/01.02.01_60/en_31914201v010201p.pdf).
Escolha técnica proposta: B-T quando carimbo confiável/custo estiverem
aprovados; B-B só se o responsável aceitar seu limite temporal. B-LT/LTA
exigem plano adicional de informação de revogação/preservação. A opção B de
produto não significa perfil PAdES B-B: são classificações diferentes.

[pyHanko](https://docs.pyhanko.eu/en/latest/lib-guide/signing.html) é
candidato técnico para assinatura/validação PAdES, inclusive integração de
chaves; um serviço interoperável gerenciado é alternativa. Não se escolheu
biblioteca nova para o app, serviço ou certificado. Consulta em 04/11/2026.
Raiz confiável/chain precisa ser explicitamente configurada e testada nos
leitores escolhidos; certificado autossinado não recebe selo de confiança
universal. PDF com assinatura criptograficamente íntegra e cadeia desconhecida
tem estado distinto de assinatura confiável e de arquivo adulterado.

Identidade sugerida: certificado técnico organizacional do sistema, titular e
finalidade definidos; não reutilizar certificado pessoal da família. Chaves em
HSM/KMS ou serviço protegido equivalente, acesso mínimo e operação auditada.
Inventariar ID da chave, validade, renovação, revogação e plano de incidente.
Não colocar chave privada, PFX/senha ou token em Git, PDF, QR, browser ou log.
Backup/recuperação das chaves segue mecanismo aprovado; não exportar chave não
exportável para cumprir um checklist.

Cotação obrigatória: certificado/renovação [a cotar]; KMS/HSM por mês/operação
[a cotar]; assinador por emissão [a cotar]; TSA por carimbo [a cotar];
validação OCSP/CRL [a cotar]; retenção de objetos [a cotar];
suporte/recuperação [a cotar]; moeda/data/validade [a cotar]; total estimado
para [a cotar] emissões/mês [a cotar]. Sem contratação nesta C.

## Privacidade e verificador

PDF autorizado pode mostrar solicitante conforme sua finalidade; signatário
criptográfico continua sendo o sistema. Página pública/QR retornam referência
opaca e integridade mínima, sem nome/paciente/material/observação/credencial.
Não incluir IP, máquina, GPS ou localização precisa no arquivo/QR por padrão.
Trilha interna mínima e restrita pode guardar contexto necessário à segurança,
com finalidade/retencão P08; IP não comprova localização física.

Arquivo selecionado é comparado aos bytes emitidos e à assinatura/cadeia.
Separar: coincide/diverge; assinatura íntegra/adulterada; cadeia confiável/
desconhecida/revogada/expirada; referência ausente; serviço indisponível. Não
chamar ausência de verificação de falsidade. Validar datas e estado histórico
no instante apropriado sem prometer validade jurídica absoluta. Hash igual não
comprova fato físico ou assinatura pessoal.

## Critérios D4/D6

Duas emissões da versão 3 têm IDs próprios; novo download da emissão 1 é
idêntico. Alterar texto/anotação após assinatura reprova. Copiar QR de outro
arquivo não passa comparação. Falhar após assinatura e antes de ready não cria
outro exemplar no retry. Cache com bytes trocados não é entregue como íntegro.
Original histórico permanece acessível e identificado, sem assinatura
retroativa inventada. Conferir cadeia/TSA/leitores e impressão/AT reais em D;
PDF vazio reprova conteúdo mesmo se assinatura/hash forem válidos.
