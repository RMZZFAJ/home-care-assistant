# Complemento de fontes históricas e templates

Leitura concluída em 27/10/2026, para o SHA auditado
`37cb7f85e96e551d6419871f94dd950712e2565b`. Foram lidos integralmente
`AUDITORIA.txt` (964 linhas), `MISSION.txt` (1.104), `SUPERPROMPT.txt` (1.240)
e `home_care_meta_templates_v3_completos.md` (1.411). Os dois JSONs receberam
parse, inspeção estrutural e comparação de conteúdo com esse texto e o catálogo
atual. Nenhum gerador, submissão Meta, fixture ou comando mutável foi executado.
`coverage-reference-sources.csv` cobre exclusivamente esses seis artefatos.

## Diferenças úteis para continuidade

- Os três prompts antigos autorizavam implementação/refatoração e alguns
  caminhos remotos somente após aprovação. São **fontes históricas**, não
  autorização vigente. A Fase A atual limita escritas à própria auditoria.
- `AUDITORIA.txt:77–82` levanta a suposta ausência da migration de
  compatibilidade
  de protocolo. `MISSION.txt` já exige revalidar esse diagnóstico. Não restaurar
  o problema histórico como achado atual: a cadeia final foi examinada na frente
  de banco e a arquitetura documental evoluiu além do exemplo `HC-000012`.
- `SUPERPROMPT.txt:579` e `AUDITORIA.txt:366` restringem estoque a
  administradores.
  O produto atual usa capacidades por paciente e comandos documentais: família
  atua no próprio estoque e profissional designado aceita ENT ou conta BAL,
  conforme regras atuais. Não regredir essa separação para uma condicional
  genérica de papel, nem tratar o requisito antigo como autorização de edição
  direta de saldo.
- `SUPERPROMPT.txt:135` pede estoque informado no comprovante quando aplicável.
  Isso acrescenta contexto histórico a **BE-007**; não cria novo achado. A tela
  preserva essa observação, e o PDF atual a omite. A decisão editorial permanece
  explícita no registro P3, sem reintroduzir quantidade solicitada ou recalcular
  o passado com saldo atual.
- A V3 distingue emissão e confirmação
  (`home_care_meta_templates_v3_completos.md:11`)
  e chama o campo de regularização de “Data da atualização” (`:780`). Isso
  reforça a semântica do **BE-002**, já reproduzido com dados fictícios. Não é
  evidência de envio real incorreto.
- A observação V3 de que o provedor só suporta poucos parâmetros posicionais
  (`:1385`) está superada: o adaptador atual usa registro de templates e
  parâmetros nomeados. Outras cautelas continuam úteis: acesso autenticado,
  telefone verificado, desafio de propósito específico, versão correta do PDF,
  consentimento e estados de entrega distintos de aceite operacional.

## Coerência dos artefatos Meta

Evidência estruturada: `reference-template-comparison.json`.

- Comparação: JSON V3 versus catálogo textual V3; Resultado: 23 nomes; todos os
  corpos coincidem após normalizar apenas espaços/quebras de linha
- Comparação: JSON V3 versus catálogo runtime; Resultado: Todos os 23 corpos
  coincidem; domínio placeholder e exemplos de URL são substituídos pelo gerador
- Comparação: Catálogo runtime; Resultado: 27 templates: 23 V3 mais quatro
  variantes V4 de registro/ciência REQ
- Comparação: Arquivo de submissão V4; Resultado: Cinco templates prioritários,
  incluindo dois nomes V3 de ENT e três V4 de REQ; não pretende conter todos os
  27
- Comparação: Submissão versus runtime; Resultado: Componentes completos dos
  cinco templates coincidem; os cinco têm `priority=true` e `approval=PREPARED`
  no arquivo versionado
- Comparação: Parâmetros e exemplos; Resultado: Todos os 28 registros comparados
  têm conjunto de parâmetros nomeados igual ao conjunto dos exemplos; corpos
  dentro do limite de 1.024 declarado na referência
- Comparação: URLs; Resultado: Variável posicional no final e domínio dos
  exemplos igual ao domínio do botão em todos os registros comparados

`home_care_meta_payloads_v3_PREENCHER.json:2` declara expressamente que não deve
ser submetido com placeholders. `templates-v4-submission.json` já fixa o domínio
do aplicativo, mas conserva handles de documento a preencher durante o upload.
Isso é preparo de submissão, não aprovação externa ou mídia pronta para envio.

O gerador `scripts/build-meta-catalog.mjs:116–155` seleciona intencionalmente
cinco
prioridades. A variante `hca_req_ciencia_simplificada_v4` existe no catálogo,
porém não integra esse primeiro lote. Antes de habilitar qualquer evento ou
modo adicional, homologar a versão correspondente; não presumir que a aprovação
dos cinco cobre os demais. Essa condição já pertence à matriz de homologação,
sem novo achado duplicado.

As validações acima são locais e documentais. Não verificam políticas atuais
da Meta, aprovação da conta, domínio em produção, funcionamento de deep links,
editor/publicação de Flow, opt-in real ou entrega de mensagens.
