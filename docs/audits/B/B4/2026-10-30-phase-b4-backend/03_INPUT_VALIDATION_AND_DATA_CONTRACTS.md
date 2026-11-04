# Entradas, normalização e contratos de dados

## Defeito confirmado: precisão depende do tipo JSON

**B4-001, P2, nova causa relacionada a B3-018.** `exactQuantity` limita a seis
casas no braço string; o braço number verifica finitude/faixa, sem limite de
casas. A transformação preserva `1.0000001` e a envia como decimal à RPC.
O ledger `numeric(18,6)` arredonda antes da validação de precisão do produto.

Em [B43-10](evidence/b43-input-results.json), POST `/api/stock/movements` com
JSON number `1.0000001` retornou 201/confirmed; a conferência pelo ID encontrou
`1.000000` persistido para unidade inteira. O mesmo literal como string foi
recusado com 400 (B43-01). `1.1` numérico também foi recusado pelo banco
(B43-09). Não houve débito negativo nem alteração de movimento histórico.

A B3 provou o arredondamento na entrada SQL direta; a novidade é a proteção
HTTP assimétrica e sua passagem real até o ledger. O formulário usa texto,
mas cliente autorizado pode enviar JSON numérico. Validar o valor original
antes da coerção é necessário em ambas as camadas; converter tudo a number
no cliente ou arredondar silenciosamente não resolve o contrato.

## Matriz de transformação observada

- **Quantidade operacional string** — Validação/transformação: Regex decimal,
  vírgula normalizada, Decimal; Limite e consequência: Até seis casas;
  precisão da unidade no banco.
- **Quantidade operacional number** — Validação/transformação: Finitude/faixa,
  Decimal.toFixed; Limite e consequência: Falta limite de casas: B4-001.
- **Estoque observado REQ** — Validação/transformação: Número finito e regex
  até seis casas; Limite e consequência: Observação histórica; não quantidade
  solicitada.
- **Rótulo de produto REQ** — Validação/transformação: Campo compatível
  aceito, removido antes da RPC; Limite e consequência: Banco resolve
  nome/categoria/unidade canônicos.
- **Decisão consumo** — Validação/transformação: Boolean Zod estrito; Limite e
  consequência: NULL recusado na API; B3-017 direto permanece.
- **Fator de apresentação** — Validação/transformação: exactQuantity opcional;
  Limite e consequência: Texto NaN recusado; B3-019 direto não foi refeito.
- **Contexto/objeto** — Validação/transformação: UUID validado, escopo
  resolvido por RLS/RPC; Limite e consequência: UUID não prova vínculo ou
  paciente.
- **Versão** — Validação/transformação: Inteiro positivo; nullable só em
  criação de certos comandos; Limite e consequência: SQL exige versão quando
  apropriado.
- **Chave** — Validação/transformação: UUID do cliente na maioria dos
  comandos; Limite e consequência: Aleatoriedade não prova semântica de
  recuperação.
- **Datas REQ/estoque** — Validação/transformação: Calendário validado e
  fronteira São Paulo com DST; Limite e consequência: Dia civil não equivale a
  UTC meia-noite.
- **Escala** — Validação/transformação: ISO com offset, calendário ISO, fuso
  limitado em tamanho; Limite e consequência: SQL decide fuso, janela, duração
  e sobreposição.
- **Configuração** — Validação/transformação: Envelope estrito; change/body
  tipado parcialmente; Limite e consequência: RPC deve rejeitar chaves/regras
  inválidas.
- **Arquivo** — Validação/transformação: Corpo/bytes limitados, MIME e
  conteúdo saneados; Limite e consequência: Revisão dos serviços em B4.7.

## Provas e proteções existentes

Dezesseis cenários dirigidos constam do
[resultado B4.3](evidence/b43-input-results.json) .
Rejeitados NULL, NaN/Infinity textuais, negativo, teto excedido, notação
exponencial textual, quantidade ausente, campo desconhecido, decisão NULL,
Content-Type inadequado, JSON inválido, origem cross-site e corpo excedente.
Os códigos não preservados antes da falha instrumental não foram inventados:
as nove primeiras assertivas conservam apenas os status conferidos.

`readJson` limita bytes realmente consumidos, mesmo sem Content-Length; schemas
de comandos são estritos. JSON não representa NaN/Infinity como número, mas
`1e309` pode ser interpretado como infinito: o braço finite impede passagem.
Não foi atribuída execução dinâmica a esse exemplo adicional.

REQ elimina rótulos não confiáveis antes do hash da intenção e da RPC; extras
mantêm descrição própria. Criação COM/ENT/BAL distingue zero de contagem BAL
de quantidade positiva de movimentação. Revisão usa schema compartilhado mais
amplo; invariantes por tipo e estado ficam na RPC. Diferença de localização
da validação não é defeito quando o banco a impõe corretamente.

## Lacunas proporcionais e limites

Parâmetros de página normalizam valores inválidos para defaults e limitam
1–100; não são entradas SQL interpoladas. `productIds` de item-context é
cortado em mil IDs sem validar cada comprimento; corpo/URL e regras SQL
limitam o cenário. Não foi demonstrado acesso indevido por isso.
`metadata` possui chaves livres, valores string limitados e limite total de
corpo. Não foi demonstrada injeção SQL nem prototype pollution por essa escolha.

As quantidades observadas, unidades históricas e dados desconhecidos devem ser
preservados em qualquer correção futura. A investigação não alterou schemas,
migrations ou validadores. Próximo: identidade de tentativa e efeitos de retry.
