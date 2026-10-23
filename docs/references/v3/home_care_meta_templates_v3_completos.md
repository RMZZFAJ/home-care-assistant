# Home Care Assistant — Mensagens Meta V3

**Versão:** 22 de outubro de 2026. **Situação:** catálogo para validação e
submissão; nenhum template foi enviado ou aprovado.

## Decisões do modelo

- **Nome não é número:** usar *Número da Requisição*, *Número da Entrega*,
*Número do Balanço*, *Número da Compra*. Nunca chamar de “ficha”.
- **Data e hora:** uma variável `{{data_hora}}`, por exemplo `22/10/2026 às
07h42`. Datas de emissão e confirmação são distintas e não podem ser recicladas.
- **Variáveis do corpo:** nomeadas (`parameter_format: NAMED`), com
`body_text_named_params` contendo `param_name` e `example`. No disparo usar
`parameter_name`.
- **URLs dinâmicas:** usar `{{1}}` somente no final do endereço de cada botão
URL. O envio transmite apenas o sufixo. Exemplo de URL deve usar exatamente o
mesmo domínio cadastrado.
- **Rodapé padrão:** `Home Care Assistant • Mensagem automática` para os 23
modelos. A instrução operacional é específica em cada corpo.
- **Dados de saúde:** exemplos fictícios, não compartilhar dados em grupo,
respeitar autorização atual, minimização e opt-in de mensagens externas.
- **Notificação enviada ≠ entregue ≠ lida ≠ aceite:** cada fato tem estado
próprio. Não informar “notificação entregue” até confirmação do provedor.
- **PDF:** REQ nova, REQ confirmação ao autor, ENT expedida, ENT aceite, ENT
concluída e documento atualizado. Emissão e aceite devem usar versões
diferentes.
- **Botões:** consultar por link exige sessão e autorização. Quick reply
Confirmar tudo precisa de telefone verificado, validade curta e aceitação
simplificada habilitada; caso contrário, não enviar esse botão e usar versão com
URL autenticada.
- **Fluxos:** registro de diferença é formulário no aplicativo ou Flow
homologado; sem publicação de Flow, não prometer que o botão abre um Flow.
- **Limites:** corpo até 1.024 caracteres; cabeçalho textual até 60; rodapé até
  60. Os modelos dependem da aprovação da Meta e de domínio real, acessível e
estável.

**ROTAS CONFERIDAS NO CÓDIGO:** `/historico/[id]` para REQ, `/fichas/[id]` para
COM/ENT/BAL, `/estoque`, `/consumo`, `/fichas/bal` para consoles. **Atenção:**
ações contextualizadas como registrar divergência e iniciar BAL ainda dependem
da ligação do query/deep link pelo Codex. Os sufixos no catálogo são exemplos de
demonstração, não IDs válidos de documentos no banco. No disparo usar ID real
autorizado, não número público da ficha.

**URL BASE NÃO CONFIRMADA:** `https://DOMINIO_CONFIRMADO`. Você deve verificar o
domínio da Vercel, substituir nos JSONs e comprovar a rota funcional antes do
cadastro. O exemplo mostrado abaixo NÃO serve para submissão até a substituição.

**Legenda:** as chaves são exemplos fictícios e não identificam pacientes
verdadeiros. Todos os cabeçalhos PDF exigem upload de arquivo exemplo e
`header_handle` obtido no processo de criação da Meta; esse handle não é o
`media_id` utilizado para enviar mensagens reais.

## Índice

- **01.** `hca_req_nova_familia_v3`
  Evento: REQ • Nova requisição
  Cabeçalho: PDF
  Botões: Ver requisição
  Prioridade: Crítica

- **02.** `hca_req_confirmacao_autor_v3`
  Evento: REQ • Confirmação da requisição
  Cabeçalho: PDF
  Botões: Acompanhar pedido
  Prioridade: Alta

- **03.** `hca_req_atendimento_parcial_v3`
  Evento: REQ • Requisição parcialmente atendida
  Cabeçalho: TEXT
  Botões: Ver pendências
  Prioridade: Média

- **04.** `hca_req_concluida_v3`
  Evento: REQ • Requisição atendida
  Cabeçalho: TEXT
  Botões: Ver comprovantes
  Prioridade: Média

- **05.** `hca_req_pendentes_lembrete_v3`
  Evento: REQ • Pendências de requisição
  Cabeçalho: TEXT
  Botões: Consultar pendências
  Prioridade: Média

- **06.** `hca_com_aprovacao_v3`
  Evento: COM • Compra aguardando aprovação
  Cabeçalho: TEXT
  Botões: Revisar compra
  Prioridade: Alta

- **07.** `hca_com_validar_recebimento_v3`
  Evento: COM • Recebimento de compra pendente
  Cabeçalho: TEXT
  Botões: Validar entrada
  Prioridade: Alta

- **08.** `hca_com_validada_v3`
  Evento: COM • Compra validada
  Cabeçalho: TEXT
  Botões: Ver recebimento
  Prioridade: Média

- **09.** `hca_ent_expedida_pdf_v3`
  Evento: ENT • Entrega registrada
  Cabeçalho: PDF
  Botões: Acompanhar entrega
  Prioridade: Alta

- **10.** `hca_ent_confirmar_pdf_v3`
  Evento: ENT • Confirmar recebimento
  Cabeçalho: PDF
  Botões: Confirmar tudo, Informar diferença
  Prioridade: Crítica

- **11.** `hca_ent_divergencia_v3`
  Evento: ENT • Divergência na entrega
  Cabeçalho: TEXT
  Botões: Ver divergências
  Prioridade: Crítica

- **12.** `hca_ent_regularizada_v3`
  Evento: ENT • Entrega regularizada
  Cabeçalho: TEXT
  Botões: Revisar entrega
  Prioridade: Média

- **13.** `hca_ent_concluida_pdf_v3`
  Evento: ENT • Entrega concluída
  Cabeçalho: PDF
  Botões: Ver comprovante
  Prioridade: Alta

- **14.** `hca_ent_cancelamento_v3`
  Evento: ENT • Revisão de cancelamento
  Cabeçalho: TEXT
  Botões: Revisar solicitação
  Prioridade: Crítica

- **15.** `hca_bal_lembrete_v3`
  Evento: BAL • Contagem semanal
  Cabeçalho: TEXT
  Botões: Iniciar balanço
  Prioridade: Alta

- **16.** `hca_bal_aprovacao_v3`
  Evento: BAL • Balanço para revisão
  Cabeçalho: TEXT
  Botões: Revisar balanço
  Prioridade: Alta

- **17.** `hca_bal_concluido_v3`
  Evento: BAL • Balanço concluído
  Cabeçalho: TEXT
  Botões: Consultar balanço
  Prioridade: Média

- **18.** `hca_estoque_alerta_v3`
  Evento: ESTOQUE • Alerta de estoque
  Cabeçalho: TEXT
  Botões: Consultar produto
  Prioridade: Média

- **19.** `hca_plantao_ocorrencia_v3`
  Evento: PLANTÃO • Ocorrência de plantão
  Cabeçalho: TEXT
  Botões: Registrar ocorrência, Sem ocorrências
  Prioridade: Média

- **20.** `hca_documento_atualizado_pdf_v3`
  Evento: DOCUMENTO • Documento atualizado
  Cabeçalho: PDF
  Botões: Abrir documento
  Prioridade: Média

- **21.** `hca_ent_conferencia_autenticada_v3`
  Evento: ENT • Conferência autenticada
  Cabeçalho: PDF
  Botões: Conferir entrega
  Prioridade: Crítica

- **22.** `hca_ent_aceite_pendente_v3`
  Evento: ENT • Lembrete de confirmação
  Cabeçalho: TEXT
  Botões: Conferir agora
  Prioridade: Alta

- **23.** `hca_ocorrencia_recebida_v3`
  Evento: PLANTÃO • Ocorrência registrada
  Cabeçalho: TEXT
  Botões: Acompanhar ocorrência
  Prioridade: Média

## Modelos completos

### 01. Nova requisição — `hca_req_nova_familia_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família responsável e supervisão habilitada
**Disparo:** REQ emitida, uma notificação por destinatário/canal
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Aviso principal com PDF e tarefa de fornecimento

**Corpo (colar na Meta):**

```text
📋 *NOVA REQUISIÇÃO DE MATERIAIS*

Olá, *{{nome_destinatario}}*!

*{{nome_solicitante}}* solicitou materiais para os cuidados de
*{{nome_paciente}}*.

*Número da requisição:* {{numero_requisicao}}
*Data:* {{data_hora}}
*Itens solicitados:* {{quantidade_itens}}
*Com urgência:* {{itens_urgentes}}

O comprovante está anexado. Confira os itens e informe o atendimento no sistema.
A solicitação continuará pendente até a confirmação das entregas.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_solicitante}}` | Juliana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_requisicao}}` | REQ-0007 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |
| `{{itens_urgentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Ver requisição):**
`https://DOMINIO_CONFIRMADO/historico/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/historico/req-amostra-0007`; **sufixo de envio:**
`req-amostra-0007`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 02. Confirmação da requisição — `hca_req_confirmacao_autor_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Profissional solicitante
**Disparo:** REQ emitida; confirmação ao autor
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Confirmação de emissão, não equivale a entrega de mensagens

**Corpo (colar na Meta):**

```text
✅ *REQUISIÇÃO ENVIADA*

Olá, *{{nome_destinatario}}*!

Sua requisição para *{{nome_paciente}}* foi registrada.

*Número da requisição:* {{numero_requisicao}}
*Data:* {{data_hora}}
*Itens solicitados:* {{quantidade_itens}}
*Itens urgentes:* {{itens_urgentes}}

O comprovante está anexado. Você pode acompanhar o atendimento de cada item e
verificar o andamento dos avisos enviados aos responsáveis pelo sistema.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_requisicao}}` | REQ-0007 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |
| `{{itens_urgentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Acompanhar pedido):**
`https://DOMINIO_CONFIRMADO/historico/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/historico/req-amostra-0007`; **sufixo de envio:**
`req-amostra-0007`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 03. Requisição parcialmente atendida — `hca_req_atendimento_parcial_v3`

**Cabeçalho:** Texto fixo: REQUISIÇÃO PARCIALMENTE ATENDIDA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Solicitante, família e supervisão conforme preferências
**Disparo:** ENT aceita atende novas linhas da REQ; agrupar atualizações
próximas
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Contagem por itens, não por quantidade

**Corpo (colar na Meta):**

```text
📦 *REQUISIÇÃO PARCIALMENTE ATENDIDA*

Olá, *{{nome_destinatario}}*!

A requisição *{{numero_requisicao}}*, feita em *{{data_hora}}* para
*{{nome_paciente}}*, foi atendida em parte.

*Itens já atendidos:* {{itens_atendidos}}
*Itens ainda pendentes:* {{itens_pendentes}}
*Último recebimento confirmado por:* {{nome_recebedor}}

Os demais itens continuam em aberto. Consulte o acompanhamento para conferir
exatamente o que falta entregar.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_requisicao}}` | REQ-0007 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{itens_atendidos}}` | 5 de 10 |
| `{{itens_pendentes}}` | 5 |
| `{{nome_recebedor}}` | Juliana |

**Botões:**

- **Botão 1 — URL (Ver pendências):**
`https://DOMINIO_CONFIRMADO/historico/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/historico/req-amostra-0007`; **sufixo de envio:**
`req-amostra-0007`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 04. Requisição atendida — `hca_req_concluida_v3`

**Cabeçalho:** Texto fixo: REQUISIÇÃO ATENDIDA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Solicitante e família
**Disparo:** Última linha pendente passa a atendida
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Somente após recebimentos confirmados

**Corpo (colar na Meta):**

```text
✅ *REQUISIÇÃO ATENDIDA*

Olá, *{{nome_destinatario}}*!

Todos os itens da requisição *{{numero_requisicao}}*, emitida em *{{data_hora}}*
para *{{nome_paciente}}*, foram atendidos.

*Atendimento:* {{itens_atendidos}}
*Última confirmação:* {{data_hora_conclusao}}
*Confirmado por:* {{nome_recebedor}}

O histórico das entregas permanece disponível para consulta.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_requisicao}}` | REQ-0007 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{itens_atendidos}}` | 5 de 10 |
| `{{data_hora_conclusao}}` | 22/10/2026 às 09h18 |
| `{{nome_recebedor}}` | Juliana |

**Botões:**

- **Botão 1 — URL (Ver comprovantes):**
`https://DOMINIO_CONFIRMADO/historico/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/historico/req-amostra-0007`; **sufixo de envio:**
`req-amostra-0007`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 05. Pendências de requisição — `hca_req_pendentes_lembrete_v3`

**Cabeçalho:** Texto fixo: PENDÊNCIAS DE REQUISIÇÃO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família; supervisão apenas se escalonada
**Disparo:** Lembrete configurável para REQ aberta, com antispam e intervalo
mínimo
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Evitar duplicar a REQ e manter evidência da pendência

**Corpo (colar na Meta):**

```text
⏳ *LEMBRETE DE MATERIAIS PENDENTES*

Olá, *{{nome_destinatario}}*!

A requisição *{{numero_requisicao}}*, de *{{data_hora}}*, ainda possui materiais
não atendidos para *{{nome_paciente}}*.

*Itens pendentes:* {{itens_pendentes}} de {{itens_total}}
*Itens urgentes na solicitação:* {{itens_urgentes}}

Confira a lista atualizada e registre o fornecimento quando ocorrer. Este aviso
é apenas um lembrete; o pedido original continua válido.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_requisicao}}` | REQ-0007 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{itens_pendentes}}` | 5 |
| `{{itens_total}}` | 10 |
| `{{itens_urgentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Consultar pendências):**
`https://DOMINIO_CONFIRMADO/historico/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/historico/req-amostra-0007`; **sufixo de envio:**
`req-amostra-0007`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 06. Compra aguardando aprovação — `hca_com_aprovacao_v3`

**Cabeçalho:** Texto fixo: COMPRA AGUARDANDO APROVAÇÃO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Administradores familiares com poder de aprovação
**Disparo:** COM encaminhada para aprovação
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Sem dados financeiros; pode incluir materiais recebidos por doação

**Corpo (colar na Meta):**

```text
🛒 *COMPRA AGUARDANDO APROVAÇÃO*

Olá, *{{nome_destinatario}}*!

*{{nome_solicitante}}* preparou uma relação de materiais para aquisição
destinada a *{{nome_paciente}}*.

*Número da compra:* {{numero_compra}}
*Data:* {{data_hora}}
*Itens relacionados:* {{quantidade_itens}}

Confira os produtos, as quantidades e a necessidade de reposição antes de
aprovar a compra.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_solicitante}}` | Juliana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_compra}}` | COM-0003 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — URL (Revisar compra):** `https://DOMINIO_CONFIRMADO/fichas/{{1}}`;
**exemplo completo:** `https://DOMINIO_CONFIRMADO/fichas/com-amostra-0003`;
**sufixo de envio:** `com-amostra-0003`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 07. Recebimento de compra pendente — `hca_com_validar_recebimento_v3`

**Cabeçalho:** Texto fixo: RECEBIMENTO DE COMPRA PENDENTE
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Administrador com permissão de validação
**Disparo:** Recebimento físico informado e validação pendente
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não afirmar saldo positivo sem registro de validação

**Corpo (colar na Meta):**

```text
📥 *RECEBIMENTO AGUARDANDO VALIDAÇÃO*

Olá, *{{nome_destinatario}}*!

*{{nome_comprador}}* informou o recebimento de materiais para o estoque da
família de *{{nome_paciente}}*.

*Número da compra:* {{numero_compra}}
*Data:* {{data_hora}}
*Itens informados:* {{quantidade_itens}}

Antes de considerar os materiais disponíveis no estoque confirmado, revise o
recebimento e faça a validação administrativa.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_comprador}}` | Renato |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_compra}}` | COM-0003 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — URL (Validar entrada):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/com-amostra-0003`; **sufixo de envio:**
`com-amostra-0003`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 08. Compra validada — `hca_com_validada_v3`

**Cabeçalho:** Texto fixo: COMPRA VALIDADA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família interessada
**Disparo:** COM validada com movimento efetivo
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Explicar separação entre compra familiar e ENT para a equipe

**Corpo (colar na Meta):**

```text
✅ *MATERIAIS INCORPORADOS AO ESTOQUE*

Olá, *{{nome_destinatario}}*!

O recebimento vinculado à compra *{{numero_compra}}* foi validado por
*{{nome_validador}}*.

*Paciente:* {{nome_paciente}}
*Data da validação:* {{data_hora_conclusao}}
*Itens validados:* {{itens_recebidos}}

Os movimentos correspondentes estão disponíveis no histórico do estoque
familiar. A validação não significa entrega à equipe.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_compra}}` | COM-0003 |
| `{{nome_validador}}` | Adriana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{data_hora_conclusao}}` | 22/10/2026 às 09h18 |
| `{{itens_recebidos}}` | 8 |

**Botões:**

- **Botão 1 — URL (Ver recebimento):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/com-amostra-0003`; **sufixo de envio:**
`com-amostra-0003`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 09. Entrega registrada — `hca_ent_expedida_pdf_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família e supervisão conforme regra
**Disparo:** ENT registrada/expedida
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Aviso sem concluir custódia prematuramente

**Corpo (colar na Meta):**

```text
📦 *ENTREGA DE MATERIAIS REGISTRADA*

Olá, *{{nome_destinatario}}*!

*{{nome_entregador}}* informou uma entrega de materiais para
*{{nome_paciente}}*.

*Número da entrega:* {{numero_entrega}}
*Data:* {{data_hora}}
*Entregue por:* {{nome_entregador}}
*Recebedor designado:* {{nome_recebedor}}
*Itens declarados:* {{quantidade_itens}}

O comprovante está anexado. O recebimento ainda depende da conferência pela
pessoa indicada.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_entregador}}` | Renato |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_entrega}}` | ENT-0012 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_recebedor}}` | Juliana |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — URL (Acompanhar entrega):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 10. Confirmar recebimento — `hca_ent_confirmar_pdf_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Recebedor especificamente designado
**Disparo:** ENT pendente de aceite; desafio único opcional apenas se apto
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Separar evidência de entrega, aceite e divergência

**Corpo (colar na Meta):**

```text
📋 *PRECISAMOS DA SUA CONFERÊNCIA*

Olá, *{{nome_destinatario}}*!

*{{nome_entregador}}* acabou de registrar uma entrega de materiais para
*{{nome_paciente}}* e informou você como responsável pelo recebimento.

*Número da entrega:* {{numero_entrega}}
*Data:* {{data_hora}}
*Quem entregou:* {{nome_entregador}}
*Quem recebe:* {{nome_recebedor}}
*Itens declarados:* {{quantidade_itens}}

Confira o PDF anexo e veja se os materiais e as quantidades estão corretos. Se
estiver tudo certo, confirme o recebimento. Se notar qualquer diferença, informe
a divergência.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_entregador}}` | Renato |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_entrega}}` | ENT-0012 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_recebedor}}` | Juliana |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — Resposta rápida (Confirmar tudo):** payload proposto
`HCA_ACCEPT:<token_efemero>`; processar webhook autenticado.
- **Botão 2 — URL (Informar diferença):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Quick reply só pode gerar aceite no regime
simplificado habilitado e para telefone verificado, token de uso único, prazo
curto e versão atual. Caso contrário, botão URL autenticado. Link nunca equivale
a aceite.

---

### 11. Divergência na entrega — `hca_ent_divergencia_v3`

**Cabeçalho:** Texto fixo: DIVERGÊNCIA NA ENTREGA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Entregador, família administradora e supervisão autorizada
**Disparo:** Recebedor relata divergência em ENT
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não apagar quantidades já aceitas

**Corpo (colar na Meta):**

```text
⚠️ *DIFERENÇA NA CONFERÊNCIA*

Olá, *{{nome_destinatario}}*!

*{{nome_recebedor}}* conferiu a entrega *{{numero_entrega}}* de *{{data_hora}}*
para *{{nome_paciente}}* e informou uma diferença.

*Linhas integralmente conferidas:* {{itens_conferidos}}
*Linhas com diferença:* {{itens_divergentes}}
*Situação:* aguardando regularização.

Os materiais aceitos permanecem registrados. Consulte a ocorrência para
identificar os itens que exigem providência.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_recebedor}}` | Juliana |
| `{{numero_entrega}}` | ENT-0012 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{itens_conferidos}}` | 6 de 8 |
| `{{itens_divergentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Ver divergências):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 12. Entrega regularizada — `hca_ent_regularizada_v3`

**Cabeçalho:** Texto fixo: ENTREGA REGULARIZADA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Recebedor e responsáveis ativos
**Disparo:** Evento formal de resolução ou complementação da ENT
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Distinguir atualização de encerramento definitivo

**Corpo (colar na Meta):**

```text
🔄 *DIVERGÊNCIA ATUALIZADA*

Olá, *{{nome_destinatario}}*!

A situação da entrega *{{numero_entrega}}*, referente a *{{nome_paciente}}*, foi
atualizada por *{{nome_responsavel}}*.

*Data da atualização:* {{data_hora}}
*Linhas ainda com diferença:* {{itens_divergentes}}

Consulte as providências registradas e confira se ainda existe alguma ação
pendente. O histórico original da entrega foi preservado.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_entrega}}` | ENT-0012 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{nome_responsavel}}` | Adriana |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{itens_divergentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Revisar entrega):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 13. Entrega concluída — `hca_ent_concluida_pdf_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Entregador, recebedor e família autorizada
**Disparo:** ENT efetivamente encerrada após aceite e resolução de divergências
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Comprovante posterior ao aceite; não reutilizar PDF da expedição

**Corpo (colar na Meta):**

```text
✅ *RECEBIMENTO CONFIRMADO*

Olá, *{{nome_destinatario}}*!

O recebimento da entrega *{{numero_entrega}}*, registrada em *{{data_hora}}*
para *{{nome_paciente}}*, foi concluído.

*Entregue por:* {{nome_entregador}}
*Recebido por:* {{nome_recebedor}}
*Itens conferidos:* {{itens_conferidos}}
*Confirmação:* {{data_hora_conclusao}}

O comprovante atualizado está anexado. As etapas de conferência e eventuais
resoluções continuam disponíveis no histórico.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_entrega}}` | ENT-0012 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{nome_entregador}}` | Renato |
| `{{nome_recebedor}}` | Juliana |
| `{{itens_conferidos}}` | 6 de 8 |
| `{{data_hora_conclusao}}` | 22/10/2026 às 09h18 |

**Botões:**

- **Botão 1 — URL (Ver comprovante):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 14. Revisão de cancelamento — `hca_ent_cancelamento_v3`

**Cabeçalho:** Texto fixo: REVISÃO DE CANCELAMENTO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Recebedor original e administrador competente
**Disparo:** Pedido de reversão de ENT já aceita
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não cancelar por simples resposta WhatsApp

**Corpo (colar na Meta):**

```text
🔐 *REVISÃO DE CANCELAMENTO DE ENTREGA*

Olá, *{{nome_destinatario}}*!

*{{nome_responsavel}}* solicitou uma revisão de cancelamento da entrega
*{{numero_entrega}}*, referente a *{{nome_paciente}}*.

*Data do pedido:* {{data_hora}}
*Recebedor original:* {{nome_recebedor}}

Sua manifestação é necessária quando você foi o responsável pelo aceite
original. Consulte o motivo e as consequências da alteração antes de decidir.

A operação preservará o histórico e exigirá movimentos de estoque compatíveis
com o ocorrido.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_responsavel}}` | Adriana |
| `{{numero_entrega}}` | ENT-0012 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_recebedor}}` | Juliana |

**Botões:**

- **Botão 1 — URL (Revisar solicitação):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 15. Contagem semanal — `hca_bal_lembrete_v3`

**Cabeçalho:** Texto fixo: CONTAGEM SEMANAL
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Profissional escalado ou supervisor
**Disparo:** Agendamento semanal (não criar BAL automaticamente)
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Aviso antes ou no dia definido; saldo pode ser estimado

**Corpo (colar na Meta):**

```text
📊 *CONTAGEM SEMANAL DO ESTOQUE*

Olá, *{{nome_destinatario}}*!

Está prevista a conferência física dos materiais sob responsabilidade da equipe
de cuidado de *{{nome_paciente}}*.

*Data prevista:* {{data_prevista}}
*Produtos no catálogo:* {{quantidade_itens}}

Quando realizar a contagem, informe as quantidades encontradas. O balanço
permite ajustar diferenças provocadas pelo consumo diário e por materiais
fracionados.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{data_prevista}}` | 23/10/2026 |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — URL (Iniciar balanço):**
`https://DOMINIO_CONFIRMADO/fichas/bal?ref={{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/bal?ref=bal-exemplo-0004`; **sufixo de
envio:** `bal-exemplo-0004`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 16. Balanço para revisão — `hca_bal_aprovacao_v3`

**Cabeçalho:** Texto fixo: BALANÇO PARA REVISÃO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Aprovadores exigidos pela política do paciente
**Disparo:** BAL encaminhado para revisão
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não aplicar reconciliação antes das aprovações

**Corpo (colar na Meta):**

```text
📋 *BALANÇO AGUARDANDO SUA REVISÃO*

Olá, *{{nome_destinatario}}*!

*{{nome_contador}}* concluiu a contagem do estoque da equipe de
*{{nome_paciente}}*.

*Número do balanço:* {{numero_balanco}}
*Data:* {{data_hora}}
*Itens conferidos:* {{quantidade_itens}}
*Itens com diferença:* {{itens_divergentes}}

Revise os números e as justificativas antes da aprovação, de acordo com as
permissões configuradas para este paciente.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_contador}}` | Juliana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{numero_balanco}}` | BAL-0004 |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |
| `{{itens_divergentes}}` | 2 |

**Botões:**

- **Botão 1 — URL (Revisar balanço):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/bal-amostra-0004`; **sufixo de envio:**
`bal-amostra-0004`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 17. Balanço concluído — `hca_bal_concluido_v3`

**Cabeçalho:** Texto fixo: BALANÇO CONCLUÍDO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família e equipe autorizada
**Disparo:** BAL aprovado e aplicado ao ledger
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Saldos reconciliados em data/hora específica

**Corpo (colar na Meta):**

```text
✅ *BALANÇO DO ESTOQUE CONCLUÍDO*

Olá, *{{nome_destinatario}}*!

O balanço *{{numero_balanco}}* do estoque da equipe de *{{nome_paciente}}* foi
concluído.

*Responsável pela contagem:* {{nome_contador}}
*Data da conclusão:* {{data_hora_conclusao}}
*Itens conferidos:* {{quantidade_itens}}
*Itens ajustados:* {{itens_ajustados}}

As quantidades reconciliadas estão registradas no estoque, com histórico de
ajustes e aprovações.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_balanco}}` | BAL-0004 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{nome_contador}}` | Juliana |
| `{{data_hora_conclusao}}` | 22/10/2026 às 09h18 |
| `{{quantidade_itens}}` | 8 |
| `{{itens_ajustados}}` | 3 |

**Botões:**

- **Botão 1 — URL (Consultar balanço):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/bal-amostra-0004`; **sufixo de envio:**
`bal-amostra-0004`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 18. Alerta de estoque — `hca_estoque_alerta_v3`

**Cabeçalho:** Texto fixo: ALERTA DE ESTOQUE
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Família/supervisão autorizadas
**Disparo:** Transição para abaixo do mínimo; cooldown por produto/local
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Evitar afirmar disponibilidade física perfeita na equipe

**Corpo (colar na Meta):**

```text
⚠️ *ATENÇÃO AO ESTOQUE*

Olá, *{{nome_destinatario}}*!

O estoque de *{{nome_produto}}* precisa ser verificado para *{{nome_paciente}}*.

*Local:* {{nome_local}}
*Saldo confirmado:* {{saldo_atual}}
*Mínimo configurado:* {{saldo_minimo}}
*Data da verificação:* {{data_hora}}

Confira o saldo e as entregas pendentes antes de providenciar novos materiais. O
consumo entre balanços pode alterar a quantidade física disponível.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_produto}}` | Fralda geriátrica tamanho G |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{nome_local}}` | Equipe de cuidado |
| `{{saldo_atual}}` | 12 unidades |
| `{{saldo_minimo}}` | 20 unidades |
| `{{data_hora}}` | 22/10/2026 às 07h42 |

**Botões:**

- **Botão 1 — URL (Consultar produto):**
`https://DOMINIO_CONFIRMADO/estoque?produto={{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/estoque?produto=produto-amostra-01`; **sufixo de
envio:** `produto-amostra-01`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 19. Ocorrência de plantão — `hca_plantao_ocorrencia_v3`

**Cabeçalho:** Texto fixo: OCORRÊNCIA DE PLANTÃO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Equipe que aceitou receber lembretes
**Disparo:** Lembrete opcional após encerramento de plantão
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Quick reply sem ocorrências não altera estoque nem cria declaração
clínica

**Corpo (colar na Meta):**

```text
📝 *PRECISOU DE ALGUM MATERIAL?*

Olá, *{{nome_destinatario}}*!

O seu período de trabalho nos cuidados de *{{nome_paciente}}* foi:
*{{periodo_plantao}}*.

Houve falta de material, consumo extraordinário ou alguma diferença que precise
ser informada?

Se ocorreu algo, registre uma observação rápida pelo formulário. Não é
necessário declarar o uso rotineiro de cada item.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{periodo_plantao}}` | 22/10/2026, 07h às 19h |

**Botões:**

- **Botão 1 — URL (Registrar ocorrência):**
`https://DOMINIO_CONFIRMADO/consumo?ref={{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/consumo?ref=ocorrencia-amostra-01`; **sufixo de
envio:** `ocorrencia-amostra-01`.
- **Botão 2 — Resposta rápida (Sem ocorrências):** payload proposto
`HCA_NO_ISSUES:<token_efemero>`; processar webhook autenticado.

**Segurança e validação:** Somente phone verified/usuário identificado pode
arquivar o lembrete; nenhuma alteração de estoque automática.

---

### 20. Documento atualizado — `hca_documento_atualizado_pdf_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Apenas envolvidos habilitados e interessados no documento
**Disparo:** Reemissão relevante de evidência; evitar duplicidade de alertas
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Versão anexada deve ser exatamente a versão informada no corpo

**Corpo (colar na Meta):**

```text
📄 *COMPROVANTE ATUALIZADO*

Olá, *{{nome_destinatario}}*!

Foi gerada uma nova versão do documento *{{numero_documento}}*, referente a
*{{nome_paciente}}*.

*Atualizado por:* {{nome_responsavel}}
*Data:* {{data_hora}}
*Versão:* {{versao_documento}}

O PDF atualizado está anexado. As versões anteriores continuam preservadas no
histórico do Home Care Assistant.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_documento}}` | ENT-0012 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{nome_responsavel}}` | Adriana |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{versao_documento}}` | 2 |

**Botões:**

- **Botão 1 — URL (Abrir documento):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/doc-amostra-0012`; **sufixo de envio:**
`doc-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 21. Conferência autenticada — `hca_ent_conferencia_autenticada_v3`

**Cabeçalho:** Documento PDF anexo
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Recebedor designado sem aceite simplificado habilitado
**Disparo:** ENT pendente; alternativa obrigatória ao quick reply sem
verificação
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não usar confirmação com quick reply em números não verificados

**Corpo (colar na Meta):**

```text
📦 *CONFIRA O RECEBIMENTO*

Olá, *{{nome_destinatario}}*!

*{{nome_entregador}}* registrou a entrega *{{numero_entrega}}* para
*{{nome_paciente}}*. Você foi indicado para receber os materiais.

*Data:* {{data_hora}}
*Itens declarados:* {{quantidade_itens}}
*Recebedor:* {{nome_recebedor}}

Confira os produtos e as quantidades no PDF anexado. Para confirmar o que
realmente recebeu ou informar qualquer diferença, abra o formulário seguro no
sistema.

*A entrega continua pendente até sua confirmação.*
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_entregador}}` | Renato |
| `{{numero_entrega}}` | ENT-0012 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{quantidade_itens}}` | 8 |
| `{{nome_recebedor}}` | Juliana |

**Botões:**

- **Botão 1 — URL (Conferir entrega):**
`https://DOMINIO_CONFIRMADO/fichas/{{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`; **sufixo de envio:**
`ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 22. Lembrete de confirmação — `hca_ent_aceite_pendente_v3`

**Cabeçalho:** Texto fixo: LEMBRETE DE CONFIRMAÇÃO
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Recebedor que ainda não concluiu a conferência
**Disparo:** Após prazo configurado, sem aceite, com limite de frequência
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não confundir leitura do aviso com aceite

**Corpo (colar na Meta):**

```text
⏳ *RECEBIMENTO AINDA NÃO CONFIRMADO*

Olá, *{{nome_destinatario}}*!

A entrega *{{numero_entrega}}*, registrada por *{{nome_entregador}}* em
*{{data_hora}}* para *{{nome_paciente}}*, continua aguardando sua conferência.

*Itens declarados:* {{quantidade_itens}}

Se já recebeu os materiais, confira as quantidades e confirme pelo aplicativo.
Se houver diferença, registre uma divergência. A ausência de resposta não será
tratada como aceite.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{numero_entrega}}` | ENT-0012 |
| `{{nome_entregador}}` | Renato |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{quantidade_itens}}` | 8 |

**Botões:**

- **Botão 1 — URL (Conferir agora):** `https://DOMINIO_CONFIRMADO/fichas/{{1}}`;
**exemplo completo:** `https://DOMINIO_CONFIRMADO/fichas/ent-amostra-0012`;
**sufixo de envio:** `ent-amostra-0012`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

### 23. Ocorrência registrada — `hca_ocorrencia_recebida_v3`

**Cabeçalho:** Texto fixo: OCORRÊNCIA REGISTRADA
**Categoria/idioma:** `UTILITY` / `pt_BR`
**Destinatários:** Profissional que enviou relato por WhatsApp/Flow
**Disparo:** Recebimento do relato e criação de registro pendente
**Rodapé:** Home Care Assistant • Mensagem automática
**Objetivo:** Não comunicar falso ajuste de saldo

**Corpo (colar na Meta):**

```text
✅ *SUA OCORRÊNCIA FOI REGISTRADA*

Olá, *{{nome_destinatario}}*!

Recebemos sua comunicação sobre os materiais utilizados ou em falta para
*{{nome_paciente}}*.

*Data:* {{data_hora}}
*Tipo de comunicação:* {{tipo_evento}}

O relato ficará disponível para revisão dos responsáveis. Nenhuma movimentação
de estoque será considerada definitiva antes das verificações previstas no
sistema.
```

**Variáveis e amostras de aprovação:**

| Nome da variável | Valor de exemplo |
| --- | --- |
| `{{nome_destinatario}}` | Adriana |
| `{{nome_paciente}}` | Paciente Exemplo |
| `{{data_hora}}` | 22/10/2026 às 07h42 |
| `{{tipo_evento}}` | Requisição atualizada |

**Botões:**

- **Botão 1 — URL (Acompanhar ocorrência):**
`https://DOMINIO_CONFIRMADO/consumo?ref={{1}}`; **exemplo completo:**
`https://DOMINIO_CONFIRMADO/consumo?ref=ocorrencia-amostra-01`; **sufixo de
envio:** `ocorrencia-amostra-01`.

**Segurança e validação:** Acesso autenticado e autorização atual exigidos no
destino.

---

## Padrão recomendado para Flow de divergência de ENT

1. Recebedor abre a ENT pelo botão URL autenticado ou template com botão FLOW
quando o Flow dinâmico estiver publicado.
2. Cabeçalho exibe entrega, data e responsáveis. Lista itens/quantidades
expedidos (somente os autorizados).
3. Recebedor escolhe aceito integralmente, parcialmente ou não recebido para
cada linha; informa quantidades efetivas e motivo.
4. Revisão final separa linhas aceitas de divergências e solicita confirmação
explícita.
5. Backend grava evento idempotente, atualiza custódia por linha, gera novo PDF
e só então notifica as partes interessadas.
6. O Flow não deve pedir senha/COREN dentro da mensagem nem transformar leitura
em aceite. O acesso é validado pelo servidor e challenge de sessão.

## Observações de integração para Codex

- Refatorar adaptador `src/lib/notifications/provider.ts`: hoje suporta
parâmetros posicionais muito limitados e poucos templates, não 20 eventos com
NAMED.
- Registrar `template_name` e versão por evento/canal/paciente com validação dos
`parameter_name` obrigatórios.
- Resolver cada placeholder de snapshots/identidades autorizadas; não preencher
com strings inventadas. Uma ausência significativa bloqueia o envio ou escolhe
fallback aprovado.
- Selecionar cabeçalho MEDIA versus TEXT, converter documento para `media_id`,
vincular a versão correta e preservar auditoria do hash/PDF.
- Os botões URL devem receber apenas o sufixo e o índice 0-based correspondente
ao template; quick reply recebe payload opaco de uso único e verificado.
- Não usar URL aberta como prova de autenticação. Não registrar token de sessão
em log.
- Estados de webhook: accepted, delivered, read, failed; separado de status de
tarefa no banco.
- Incluir suporte real a política por evento/papel: obrigatório x opcional x
silencioso; horário de silêncio, cooldown, agrupamento e opt-out externo.
- Testar via Meta sandbox/conta de teste (número habilitado), confirmar
restrições de país, opt-in e templates realmente `APPROVED` antes de ativar.
- Não editar migrations já aplicadas ao remoto: qualquer schema adicional será
uma NOVA migration.

**FONTES DE FORMATO:** WhatsApp Business Platform/Meta, referências de criação
`parameter_format=NAMED`, documentação de botões URL e quick reply e cabeçalhos
de documento. As condições exatas de aceitação continuam sujeitas à revisão da
conta Meta.
