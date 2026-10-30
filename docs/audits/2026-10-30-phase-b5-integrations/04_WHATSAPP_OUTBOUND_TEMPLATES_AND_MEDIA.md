# WhatsApp de saída, templates e mídia

## Contrato e cobertura

[Matriz evento/template](04_EVENT_TEMPLATE_MATRIX.csv): 25 eventos externos,
34 variantes de status/destinatário/desafio e 27 contratos locais. Duas
definições REQ v3 não têm consumidor no mapa vigente; não apagá-las sem avaliar
referências históricas. Todos os contratos em fonte são PREPARED, UTILITY,
pt_BR; isso não descreve aprovação atual da conta Meta.

A matriz também individualiza público elegível, comunicação esperada, origem
dos valores e ressalvas por variante. A
[reconciliação das 34 variáveis](evidence/TEMPLATE_PARAMETERS.csv) registra
fonte, significado e limite de cada parâmetro usado. É leitura semântica dos
contratos vigentes, sem acrescentar testes ou alegar envio homologado.

Nome/versão/idioma e definição vêm de `meta_template_versions` por bind
autorizado. Provider bloqueia sem APPROVED ou parâmetros necessários, usa origem
Graph fixa, redirect=error, timeout de 15s, telefone normalizado e opaque ID do
job. Mensagem aceita retorna accepted/wamid; entrega e leitura dependem do
callback. 130497 é falha permanente com código seguro, não sucesso.

Payload documental referencia `document_event_id`; snapshot, hash e versão são
do evento selecionado, sem usar automaticamente a versão atual. Nome curto do
paciente é configuração atual com fallback ao snapshot do nome do paciente;
notices usam nome atual/display_name e, em alertas, produto/limiar atuais junto
do saldo observado no evento. Portanto imutabilidade do documento não implica
imutabilidade de todos os textos externos. Não foi demonstrada seleção de PDF
de outro paciente.

## BE-002 ampliado, registrado como B5-004

[Seis cenários dirigidos](evidence/b54-content-cases.json) usam presenter e
registry reais, payload SQL simulado e renderer substituído. Não houve PDF
visual, persistência documental ou envio real nesta prova.

- **req.completed após ciência anterior** — Representação observada: “Última
  confirmação” usa data da ciência, não a entrega que concluiu atendimento;
  Diagnóstico: B54-C01: 21/10 08h em vez de 30/10 10h; nova manifestação
  BE-002.

- **com.receive parcial por administrador** — Representação observada:
  template pede validação, embora esse ramo credite/valide imediatamente;
  Diagnóstico: B54-C02 + ramo vigente audited_legacy_supply_command; estado
  parcialmente recebido não basta para distinguir validação.

- **ent.cancel final** — Representação observada: mesmo texto de
  revisão/manifestação usado para cancellation_pending; Diagnóstico: B54-C03:
  representação não distingue cancelamento concluído de pedido de
  consentimento.

- **ENT confirmada com fully_checked verdadeiro** — Representação observada: 1
  de 1 e filename v3-r4; Diagnóstico: B54-C04: contraprova; hipótese de
  contador ENT sempre zero refutada.

- **BAL diferenças e ent.resolve data** — Representação observada: falhas A
  continuam pelo código idêntico; Diagnóstico: Probes A reutilizados; não
  contados como novos casos executados.

Outras variáveis exigem semântica por evento: emissor não é necessariamente
comprador/contador efetivo; último autor de history não é sempre recebedor;
nome_responsavel prioriza ciência mesmo em atualização posterior. Estes
alcances são revisão estática do mesmo mapper, sem afirmar todos os cenários
persistidos. `quantidade_itens` conta linhas, não quantidades físicas.

Duas manifestações adicionais são sustentadas pela leitura SQL/template,
sem execução nova e sem inflar o registro BE-002/B5-004:

- `req.reminder` também nasce quando apenas a ciência está pendente e o
  atendimento já terminou. O template afirma materiais não atendidos e pode
  mostrar zero linhas pendentes. A seleção do scheduler distingue esses
  fatos; o texto não distingue. Ver `process_operational_jobs` vigente e
  `hca_req_pendentes_lembrete_v3`.
- `private.report_notice` destina occurrence.received ao autor **ou** a membro
  com consumption.confirm. O template diz “SUA ocorrência” e “sua comunicação”
  também a quem somente confirma o relato alheio. A mensagem não deve inventar
  autoria. Não houve transmissão a um confirmador real nesta investigação.

`periodo_plantao` é expected_at do lembrete legado formatado, não intervalo da
escala persistente ou prova de presença. A comparação de itens_ajustados foi
revista contra snapshots SQL: os valores numéricos canônicos são normalizados
no JSON. A hipótese de falso ajuste somente por zeros finais não se sustenta
nessa forma; dados legados heterogêneos não foram ensaiados. O contador por si
só continua sem provar que houve movimentação de estoque.

Eventos sem template externo (aprovação/rejeição COM, reabertura/arquivo REQ,
consentimento final ENT, escala e ciclo BAL) são app-only por contrato. Isso
não é falha só por não enviar WhatsApp. Uma correção de conteúdo não pode
inventar ciência, recebimento, consumo ou presença nem reutilizar mensagem de
emissão como se fosse fato novo.

## Destinatário e dados

Enqueue usa membership/role/capacidade; envio revalida opt-in, Auth phone
confirmado e correspondência ao destino. Troca de número impede novo envio
à configuração antiga; é preciso sincronizar o contato. Nome exibido não é
identidade autorizadora. Janela após validação/upload permanece B4-010.

B54-C05 confirma que nome completo fictício pode entrar em nome_paciente.
Templates de alerta incluem nome de produto; pacientes reais e produtos podem
revelar contexto assistencial. A documentação WHATSAPP_AI afirma omissão de
nome/dados clínicos, mas o contrato não impõe essa minimização. Registrar como
questão de privacidade/governança B5-005, sem declarar envio indevido ou
ilegalidade. Decidir conteúdo mínimo e comunicação ao responsável antes de
habilitar o canal. Não gravar dados reais nos relatórios.

## Mídia, versão e falha

HEADER DOCUMENT exige include_pdf; caso contrário PDF_TEMPLATE_VARIANT_REQUIRED
pausa a linha. Bytes são renderizados do snapshot/hash selecionados; filename
usa código, versão e renderer r4. Upload multipart application/pdf retorna
mediaId transitório usado no header; não há URL assinada ativa no texto.
A B4 já conferiu hash/versão/acesso do PDF local; não repetir B6.

Não há validação local do teto Meta de mídia nem medição do tamanho máximo de
PDF neste pacote. Upload pode falhar sem perder documento. MediaId não é salvo
para retomada, e crash pode deixar upload sem uso; ausência de prova de mídia
órfã real não vira incidente. B5-003 separa timeout do upload de incerteza da
mensagem. As janelas de cancelamento e orçamento são riscos anteriores.

Homologação futura deve comparar texto renderizado, parâmetros nomeados,
idioma, categoria aprovada, botões, PDF/version/hash, conta/número/destino e
callbacks com dados sintéticos autorizados. Nenhum script de gestão Meta foi
executado, nenhum template/Flow publicado e nenhuma mensagem enviada.
