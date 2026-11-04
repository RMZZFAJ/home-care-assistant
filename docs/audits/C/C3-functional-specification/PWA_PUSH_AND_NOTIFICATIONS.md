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

  **Tipo/origem:** Informativa/apoio/essencial, política

  **Obrigatório e default:** Sim por evento

  **Validação/unidade:** Não elevar todo evento a essencial

  **Ajuda e exemplo:** “Apoio: há uma conferência pendente.”

- **Campo:** Tipo de obrigação

  **Tipo/origem:** Enum por processo/documento

  **Obrigatório e default:** Sim na regra

  **Validação/unidade:** Matriz de eventos e ações autorizadas

  **Ajuda e exemplo:** Recebimento, decisão, prazo e informação têm
  consequências diferentes.

- **Campo:** Destinatários

  **Tipo/origem:** Grupos/pessoas autorizadas

  **Obrigatório e default:** Sim quando regra habilitada

  **Validação/unidade:** Revalidar vínculo/capacidade; sem autoridade por
  telefone/escala isolados

  **Ajuda e exemplo:** “Pessoa que deve conferir esta entrega.”

- **Campo:** Canal interno

  **Tipo/origem:** Política persistente

  **Obrigatório e default:** Mantido para estado operacional

  **Validação/unidade:** Desligar push não elimina pendência interna

  **Ajuda e exemplo:** “Consulte suas pendências no aplicativo.”

- **Campo:** Ativar push neste aparelho

  **Tipo/origem:** Opt-in explícito

  **Obrigatório e default:** Não, sem permissão presumida

  **Validação/unidade:** Após gesto do usuário, HTTPS e capacidade detectada

  **Ajuda e exemplo:** “Avisos podem aparecer na tela bloqueada.”

- **Campo:** Nome do aparelho

  **Tipo/origem:** Texto opcional do titular

  **Obrigatório e default:** Não, descrição segura

  **Validação/unidade:** Proposta 1–80; não provar identidade pelo user-agent

  **Ajuda e exemplo:** “Meu celular de trabalho.”

- **Campo:** Inscrição e permissão

  **Tipo/origem:** Endpoint/chaves do navegador, servidor

  **Obrigatório e default:** Somente técnico; privado

  **Validação/unidade:** Escopo usuário/dispositivo; validar origem e destino;
  sem log de endpoint

  **Ajuda e exemplo:** Permitida/negada/indisponível/expirada são estados
  diferentes.

- **Campo:** Conteúdo na tela bloqueada

  **Tipo/origem:** Preferência mínima

  **Obrigatório e default:** Default proposto genérico

  **Validação/unidade:** Sem nome do paciente/material/quantidade no push
  inicial

  **Ajuda e exemplo:** “Há uma atualização no Home Care Assistant.”

- **Campo:** Prazo/escalonamento

  **Tipo/origem:** Política por evento

  **Obrigatório e default:** P13 define limites/donos

  **Validação/unidade:** Sem SLO inventado; considerar fuso e responsabilidade

  **Ajuda e exemplo:** Aviso essencial não garante chegada no prazo.

- **Campo:** Modalidade de ciência

  **Tipo/origem:** Preferência por tipo

  **Obrigatório e default:** Conforme P02

  **Validação/unidade:** Snapshot da escolha na emissão; nunca derivar de push

  **Ajuda e exemplo:** Tocar aviso só abre destino autenticado.

- **Campo:** Referência/tentativa

  **Tipo/origem:** Servidor, leitura administrativa

  **Obrigatório e default:** Sim para conciliação

  **Validação/unidade:** Distinguir evento, job, tentativa, referência nula e
  estado incerto

  **Ajuda e exemplo:** Ausência de referência não prova que não houve envio.

- **Campo:** Última consulta

  **Tipo/origem:** Instante/revisão do servidor

  **Obrigatório e default:** Leitura

  **Validação/unidade:** Erro/offline não mantém “Você está em dia”

  **Ajuda e exemplo:** “Última consulta às 09:10.”

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
