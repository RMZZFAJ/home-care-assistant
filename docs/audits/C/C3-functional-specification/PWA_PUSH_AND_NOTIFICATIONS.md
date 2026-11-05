# Instalação, Web Push e notificações persistentes

AS_IS: /notificacoes, sino, regras por paciente, outbox e invalidação privada.
A busca dirigida em src/public não encontrou manifest/service
worker/subscription Web Push implementados. Preferência e-mail não é
transporte operacional; WhatsApp/Flows dependem de homologação. TO_BE
DEC-001/002/019/020/024: PWA e push são novos requisitos do primeiro escopo,
sem trocar a fonte interna de estado.

## Telas e campos

<!-- c-table:start -->

- **Tela:** NOT-01

  **Rota e situação:** /notificacoes e sino, atuais a alterar

  **Objetivo e ações:** Pendências com filtros/páginas, origem, destinatário e
  próximo passo.

- **Tela:** NOT-02

  **Rota e situação:** /perfil seção notificações, nova extensão

  **Objetivo e ações:** Instalar, ativar/desativar push neste aparelho, listar
  inscrições próprias e testar sob autorização futura.

- **Tela:** NOT-03

  **Rota e situação:** /configuracoes regras, atual a alterar

  **Objetivo e ações:** Política por tipo, categoria e destinatário; resumo de
  consequência.

- **Tela:** NOT-04

  **Rota e situação:** Orientação de instalação/atualização, nova

  **Objetivo e ações:** Instrução conforme capacidade real; atualização sem
  perder edição.

- **Tela:** NOT-05

  **Rota e situação:** Conciliação técnica, /admin atual a ampliar

  **Objetivo e ações:** Identificar job/tentativa/referência e encaminhar
  falha ao suporte competente.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Categoria

  **Tipo/origem por tela e estado:** NOT-03 Categoria: EDITABLE
  (EVENT_CATEGORY_SELECT); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-03 Categoria: Sim por evento

  **Validação/unidade:** NOT-03 Categoria: Não elevar todo evento a essencial;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-03 Categoria: “Apoio: há uma conferência pendente.”

- **Campo:** Tipo de obrigação

  **Tipo/origem por tela e estado:** NOT-03 Tipo de obrigação: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-03 Tipo de obrigação: Sim na
  regra

  **Validação/unidade:** NOT-03 Tipo de obrigação: Matriz de eventos e ações
  autorizadas; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-03 Tipo de obrigação: Recebimento, decisão, prazo e
  informação têm consequências diferentes.

- **Campo:** Destinatários

  **Tipo/origem por tela e estado:** NOT-03 Destinatários: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-03 Destinatários: Sim quando
  regra habilitada

  **Validação/unidade:** NOT-03 Destinatários: Revalidar vínculo/capacidade;
  sem autoridade por telefone/escala isolados; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-03 Destinatários: “Pessoa que deve conferir esta
  entrega.”

- **Campo:** Canal interno

  **Tipo/origem por tela e estado:** NOT-03 Canal interno: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário

  **Obrigatoriedade/default na preparação:** NOT-03 Canal interno: Não
  renderizar controle

  **Validação/unidade:** NOT-03 Canal interno: Somente contrato interno, com
  validação no servidor; não expor segredo/UUID como decisão do usuário

  **Ajuda/exemplo:** NOT-03 Canal interno: “Consulte suas pendências no
  aplicativo.”

- **Campo:** Ativar push neste aparelho

  **Tipo/origem por tela e estado:** NOT-02 Ativar push neste aparelho:
  EDITABLE (PUSH_PERMISSION_ACTION); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-02 Ativar push neste
  aparelho: Sem permissão presumida; ação explícita por aparelho; negado não
  gera pedidos repetidos

  **Validação/unidade:** NOT-02 Ativar push neste aparelho: Após gesto do
  usuário, HTTPS e capacidade detectada; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-02 Ativar push neste aparelho: “Avisos podem aparecer
  na tela bloqueada.”

- **Campo:** Nome do aparelho

  **Tipo/origem por tela e estado:** NOT-02 Nome do aparelho: EDITABLE
  (TEXT_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-02 Nome do aparelho: Não,
  descrição segura

  **Validação/unidade:** NOT-02 Nome do aparelho: Proposta 1–80; não provar
  identidade pelo user-agent; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-02 Nome do aparelho: “Meu celular de trabalho.”

- **Campo:** Inscrição e permissão

  **Tipo/origem por tela e estado:** NOT-02 Inscrição e permissão: INTERNAL
  (NO_USER_CONTROL); Endpoint/chave/token de inscrição nunca renderizados ao
  usuário comum

  **Obrigatoriedade/default na preparação:** NOT-02 Inscrição e permissão: Não
  renderizar controle

  **Validação/unidade:** NOT-02 Inscrição e permissão: Somente contrato
  interno, com validação no servidor; não expor segredo/UUID como decisão do
  usuário

  **Ajuda/exemplo:** NOT-02 Inscrição e permissão:
  Permitida/negada/indisponível/expirada são estados diferentes.

- **Campo:** Conteúdo na tela bloqueada

  **Tipo/origem por tela e estado:** NOT-02 Conteúdo na tela bloqueada:
  EDITABLE (RADIO_OR_SELECT); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-02 Conteúdo na tela
  bloqueada: Default proposto genérico

  **Validação/unidade:** NOT-02 Conteúdo na tela bloqueada: Sem nome do
  paciente/material/quantidade no push inicial; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-02 Conteúdo na tela bloqueada: “Há uma atualização no
  Home Care Assistant.”

- **Campo:** Prazo/escalonamento

  **Tipo/origem por tela e estado:** NOT-03 Prazo/escalonamento: EDITABLE
  (DURATION_AND_ESCALATION_FIELDS); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** NOT-03 Prazo/escalonamento: Valor
  previamente aprovado/configurado ou A definir; nenhum SLA/custo inventado

  **Validação/unidade:** NOT-03 Prazo/escalonamento: Sem SLO inventado;
  considerar fuso e responsabilidade; Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** NOT-03 Prazo/escalonamento: Aviso essencial não garante
  chegada no prazo.

- **Campo:** Modalidade de ciência

  **Tipo/origem por tela e estado:** NOT-02 Modalidade de ciência:
  EDITABLE_SUBFORM (SCOPED_SCIENCE_PREFERENCES); Manual/dialogada/tácita só
  por obrigação elegível, com consentimento prospectivo; nenhuma opção desliga
  SCI-005

  **Obrigatoriedade/default na preparação:** NOT-02 Modalidade de ciência:
  Manual/dialogada/tácita por obrigação elegível; tácita sem opt-in implícito;
  SCI-005 fora das opções

  **Validação/unidade:** NOT-02 Modalidade de ciência: Preferência anterior
  expressa e política permitem tácita; ANY familiar permanente; escolha
  prospectiva com versão, nunca desativa SCI-005; Manual/dialogada/tácita só
  por obrigação elegível, com consentimento prospectivo; nenhuma opção desliga
  SCI-005

  **Ajuda/exemplo:** NOT-02 Modalidade de ciência: Tocar aviso só abre destino
  autenticado.

- **Campo:** Referência/tentativa

  **Tipo/origem por tela e estado:** NOT-05 Referência/tentativa: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** NOT-05 Referência/tentativa:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** NOT-05 Referência/tentativa: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** NOT-05 Referência/tentativa: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Última consulta

  **Tipo/origem por tela e estado:** NOT-01 Última consulta: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** NOT-01 Última consulta: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** NOT-01 Última consulta: Revalidar acesso, referência
  e estado na leitura/ação. Não solicitar ao usuário correção deste valor
  nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** NOT-01 Última consulta: A data pertence ao fato
  identificado. Data de registro e de emissão são mostradas separadamente
  quando forem diferentes.

<!-- c-table:end -->

## Política de eventos e responsabilidade

<!-- c-table:start -->

- **Evento:** REQ emitida

  **Categoria proposta:** Apoio

  **Destinatário e alternativa:** Família autorizada avalia; pendência interna

  **O que o aviso não afirma:** Compra, ciência ou atendimento.

- **Evento:** ENT expedida/divergência

  **Categoria proposta:** Essencial ao processo

  **Destinatário e alternativa:** Recebedor/responsável pela diferença;
  conferência interna e contingência

  **O que o aviso não afirma:** Recebimento físico.

- **Evento:** COM chegada informada

  **Categoria proposta:** Apoio/essencial conforme prazo

  **Destinatário e alternativa:** Validador competente

  **O que o aviso não afirma:** Crédito já validado.

- **Evento:** BAL atribuído/reconto/atraso

  **Categoria proposta:** Essencial ao processo

  **Destinatário e alternativa:** Designado/revisor/família segundo ação

  **O que o aviso não afirma:** Presença ou contagem automática.

- **Evento:** Mudança de escala proposta

  **Categoria proposta:** Apoio

  **Destinatário e alternativa:** Aprovador distinto com resumo

  **O que o aviso não afirma:** Proposta aplicada.

- **Evento:** Consumo relatado/complementado

  **Categoria proposta:** Apoio

  **Destinatário e alternativa:** Confirmador autorizado

  **O que o aviso não afirma:** Débito realizado.

- **Evento:** Resultado de decisão concluída

  **Categoria proposta:** Informativa

  **Destinatário e alternativa:** Interessados autorizados

  **O que o aviso não afirma:** Nova tarefa se não houver pendência.

- **Evento:** Falha técnica/uncertain

  **Categoria proposta:** Essencial ao suporte

  **Destinatário e alternativa:** Suporte/admin global técnico; local só vê
  orientação útil

  **O que o aviso não afirma:** Profissional deve resolver SQL ou reenvio por
  conta própria.

<!-- c-table:end -->

Categorias são desenho proposto a fechar em P13; fatos não substituíveis por
ciência tácita permanecem fora da presunção. Internas são fonte de estado,
push é aviso de disponibilidade. Nenhum accepted/delivered/read do transporte
significa ciência, compreensão, comparecimento ou aceite de material.

## Jornada e capacidade por aparelho

Entrar → entender utilidade/privacidade → instalar quando disponível → gesto
“Ativar avisos neste aparelho” → permissão do navegador → inscrição vinculada.
Permissão negada mostra instruções para configuração, sem insistência
repetida; aparelho sem suporte mantém aplicativo web e pendências internas.
Cada aparelho tem inscrição própria; remover um não remove todos. Sair/revogar
impede novos avisos sensíveis e desassocia a conta conforme política de
dispositivo.

Web Push exige service worker e inscrição; a especificação da API também
alerta para proteção CSRF e sigilo do endpoint. Esta é base de desenho, não
aceite do aparelho.
[Referência oficial MDN](https://developer.mozilla.org/en-US/docs/Web/API/Push_API).
No iOS/iPadOS, a referência WebKit documenta suporte para web apps adicionados
à tela inicial a partir de 16.4 e pedido de permissão por interação direta;
verificar versões e comportamento reais de P10 antes de prometer suporte.
[Referência WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

Desktop Chromium/Android, Safari/iOS instalado e outros navegadores entram em
matriz com OS/versão/browser, instalação, permissionamento, app fechado,
economia de bateria/Focus, expiração e clique. Não inferir compatibilidade
apenas pelo nome do navegador. Instalação e remoção variam; não prometer que
desinstalar o ícone apaga toda informação armazenada.
[Instalação](https://web.dev/learn/pwa/installation).

## Falha, atualização e recuperação

Subscription expirada/410 é retirada do envio com trilha; falha transitória
usa tentativa/backoff limitado, sem apagar evento interno. Duplicata do mesmo
evento e destinatário/dispositivo é suprimida por chave. Resultado incerto
permanece conciliável; push duplicado residual não cria fato operacional
duplicado. Revogação entre seleção e envio exige revalidação e conteúdo
mínimo; aviso já aceito pelo serviço não pode ser recolhido garantidamente.

Clique abre identificador de notificação em origem confiável, autentica e
revalida vínculo/paciente. Link vencido/resolvido informa estado real, sem
reexecutar ação. Não criar URL com token de acesso ou dados clínicos. Service
worker não cacheia respostas autenticadas/PDFs para acesso offline; oferece
shell público/offline e próxima consulta. Nova versão avisa, salva edição
confirmada e só recarrega após escolha; não força reload durante aceite.

Aceites D5/D6: opt-in e recusa; dois aparelhos e duas contas sem cruzamento;
revogação/expiração; navegador fechado; reconexão; deep link resolvido/sem
acesso; dedup; push indisponível com pendência interna completa; ausência de
dados do paciente no lockscreen. Homologação física e SLO são gates
independentes. Meta/Flows continuam desligados por decisão, com defeitos B5
preservados no plano D7.

## Atualização vinculante C7–C10

P02 permanece por tipo; P13 aprova segregação técnica para global/suporte e
orientação operacional à equipe. P10 aprova quatro classes reais de aparelho,
com modelos/versões a definir. Lembretes internos legados são D5/OPS-01,
separados de Meta/Flows D7 diferidos.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).

## Fechamento definitivo — tarefa, estado e política

P02 está OWNER_APPROVED. Visto, push, envio, mensagem lida, abertura, ciência
e recebimento são distintos. SCI-003 não satisfaz ciência; SCI-004 futura
exige canal homologado. SCI-005 não aparece como opção desativável.
Preferências manual/dialogada/tácita só por obrigação elegível, sem opt-in
implícito. Tarefa interna não desaparece ao desligar push.
