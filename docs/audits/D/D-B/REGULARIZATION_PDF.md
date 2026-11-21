# D4.8 — fatos técnicos da regularização ENT

Prioridade do responsável: fichas, PDFs, estoque e recuperação da operação
diária. Guias, monitores e ferramentas de apoio ficam para depois das dependências
necessárias. O remoto contém testes do responsável; não se repetiu backup,
restore ou comparação integral neste lote. As duas orientações estão preservadas
em [complementos da ordem](OWNER_AMENDMENTS.md).

## Implementação e compatibilidade

A regularização D2 já preserva o aceite original, exige conferente independente
e registra movimentos transacionais separados. O PDF V7 mostrava os motivos,
nomes e movimentos, mas não explicitava identidade do proponente, estado anterior
e totais após a decisão. A contraprova foi capturada antes da alteração.

V8 acrescenta os fatos do snapshot congelado: situação e versão anteriores,
resultado e versão do procedimento, identidades/instantes do proponente,
conferente, decisor e executor transacional; identidade do aceite pessoal
original; motivo/base/ressalvas e conciliação/trânsito antes e depois por material.
Movimentos permanecem identificados individualmente. Execução usa o ator da
decisão transacional, conferido também no ledger independente.

Proposta pendente, rejeitada, retirada ou obsoleta conserva os totais anteriores
e não apresenta quantidades propostas como executadas. Desconhecido permanece
em trânsito. Estado/versão de um procedimento não são substituídos pelo estado
atual de uma ficha posterior. Não se atribui aceite pessoal ao administrador.

`reserve_pdf_issuance_v8` escolhe V8 somente para ENT cujo evento selecionado
contenha regularizações. Outros eventos continuam V7. Reserva, autorização,
locks e intenção conservam os contratos anteriores. A mesma chave recupera a
intenção antiga com sua revisão e snapshot originais. Os entrypoints anteriores
permanecem. A migration156 amplia somente os dois helpers privados de congelamento
e acrescenta o novo entrypoint autenticado; o cliente não escolhe revisão ou fatos.

Sem redesenho de cores, fontes ou identidade visual. Foram acrescentados campos
técnicos na composição existente. V7 da fonte controlada conserva exatamente
SHA-256 `ce53b0422c5bf0ccfe27ae445d4d817d755447598a1b33468475cbf42fc06caa`;
os18 controles anteriores V4/V5/V6 também passaram. Emissões prontas continuam
baixadas pelos bytes registrados, sem renderização por GET.

## Provas e limites

- Cinco unitários novos e dez existentes passaram em coortes. A primeira
  expectativa do marcador longo procurava uma única linha; o texto estava
  preservado em linhas consecutivas. Corrigida somente a expectativa, com a
  falha retida. Os negativos recusam identidade na região errada e total falso.
- Três casos Auth distintos passaram em coortes, incluindo replay V7/V8,
  isolamento, revogação, grants, estado desconhecido/rejeitado e ausência de
  efeito por emissão. Duas expectativas de fixture foram corrigidas: conta
  externa não vinculada ao paciente recém-criado e escala decimal textual.
- Nove casos de produção passaram: três cenários em Chromium, Chrome móvel
  emulado e WebKit. A interface emite, retoma intenção V7, baixa bytes idênticos
  e mantém quatro exemplares/versionamentos acessíveis após reload. A extensão
  de verificação pública tem sua coorte própria no manifesto.
- [Corpus](d4-regularization-proof/CORPUS.json): seis exemplares reais de dados
  fictícios, quatro V8 e dois V7, cobrindo aprovação, proposta, desconhecido,
  rejeição, evento anterior e recuperação antiga. Apenas a raiz pública efêmera
  foi anexada; nenhuma chave privada.
- [Verificador offline](d4-regularization-proof/verify.py) e
  [resultado](d4-regularization-proof/VERIFICATION.json): fatos associados aos
  seus rótulos, identidades, quantidades decimais, movimentos, limites de texto,
  rodapé, assinatura ENTIRE_FILE e timestamp contra a raiz interna. Contraprovas
  adicionais recusam executor e conciliação adulterados no oráculo independente.
- [Remoto156](REGULARIZATION_PDF_REMOTE_MIGRATIONS.json): histórico SQL completo
  conferido, dry-run com uma migration e sem roles/seeds/Vault; definições/grants
  pertinentes iguais ao local, reservas antigas intactas e helpers fechados.
  Cron permanece ativo, sem locks aguardando ou índices inválidos observados.
- [Advisors](REGULARIZATION_PDF_ADVISORS.json):203 segurança/164 desempenho,
  nenhum ERROR. O incremento é uma RPC autenticada SECURITY DEFINER, com guards
  e negativas comprovados; warnings históricos continuam registrados.

Para repetir o oráculo sem rede ou escrita no banco:

```sh
.venv/Scripts/python.exe docs/audits/D/D-B/d4-regularization-proof/verify.py \
  docs/audits/D/D-B/d4-regularization-proof/CORPUS.json \
  --output output/regularization-independent.json
```

Manifesto com fontes, coortes e contraprovas:
[REGULARIZATION_PDF_EVIDENCE.json](REGULARIZATION_PDF_EVIDENCE.json).
C7-AC-002 passa a parcial com o núcleo técnico comprovado. Comunicação legítima
proporcional, designação/homologação física e gates externos permanecem próprios;
não há envio externo nem restauração de credenciais de pessoa desligada.
Assinatura/TSA internas não equivalem a ICP-Brasil, tempo independente ou
revogação externa. PDF marcado, AT, aparelho físico e D-C/D6 não são aprovados.
CI do novo SHA continua necessária; PR7 permanece Draft, sem merge ou promoção.
