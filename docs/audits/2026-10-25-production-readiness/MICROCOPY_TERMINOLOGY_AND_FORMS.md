# Linguagem, terminologia e formulários

O produto já separa ciência, atendimento, conferência e disponibilidade de
saldo.
A revisão de linguagem deve conservar essas distinções e tornar os efeitos
compreensíveis, especialmente antes de uma decisão. Simplificar a frase não
autoriza simplificar o contrato de negócio.

Base: leitura integral da UI em `37cb7f85e96e551d6419871f94dd950712e2565b`.
Exemplos abaixo são diagnósticos/propostas; nenhum texto de produto foi
alterado.

## Glossário operacional proposto

| Termo | Rótulo principal proposto |
| --- | --- |
| REQ | Requisição de materiais |
| COM | Compra ou doação |
| ENT | Entrega de materiais |
| BAL | Balanço de estoque |
| Custódia | Estoque sob responsabilidade da família/equipe |
| Ciência expressa | Confirmou ciência |
| Trânsito | Aguardando conferência |
| Projeção | Previsão de saldo |
| Proposta pendente | Aguardando decisão |
| Aviso interno | Disponível no aplicativo |

Os limites e as variantes por ação estão detalhados abaixo. Os exemplos
localizados indicam componentes e problemas; rótulos não alteram contratos.

- **REQ**

  Linguagem preferida: Requisição de materiais; Solicitar materiais

  Limite preservado: Registra materiais necessários, sem quantidade solicitada

- **COM**

  Linguagem preferida: Compra ou doação

  Limite preservado: Não atende automaticamente uma linha REQ

- **ENT**

  Linguagem preferida: Entrega de materiais; conferir entrega

  Limite preservado: Quantidade expedida difere de quantidade recebida/aceita

- **BAL**

  Linguagem preferida: Balanço de estoque; contagem física

  Limite preservado: Programação não comprova presença nem contagem

- **Custódia**

  Linguagem preferida: Estoque da família/equipe; sob responsabilidade de…

  Limite preservado: Custódia continua termo técnico em detalhe quando útil

- **Ciência expressa**

  Linguagem preferida: Confirmou ciência

  Limite preservado: Não equivale a recebimento de material

- **Ciência automática**

  Linguagem preferida: Documento aberto/exibido automaticamente, conforme
  decisão
  de produto

  Limite preservado: Não declarar leitura integral a partir de interseção do
  cabeçalho

- **Atendimento**

  Linguagem preferida: Itens atendidos por entrega aceita

  Limite preservado: Não inferir de compra registrada ou mensagem enviada

- **Divergência**

  Linguagem preferida: Diferença informada entre expedido e recebido

  Limite preservado: Itens ainda não conferidos não são divergência

- **Trânsito**

  Linguagem preferida: Materiais enviados, aguardando conferência

  Limite preservado: Não somar ao disponível como confirmado

- **Projeção**

  Linguagem preferida: Previsão de saldo

  Limite preservado: Explicar dependências, não tratar como ledger oficial

- **Arquivamento**

  Linguagem preferida: Arquivar após revisar conclusão

  Limite preservado: Não apagar documento/eventos

- **Proposta pendente**

  Linguagem preferida: Aguardando decisão de…

  Limite preservado: Não sugerir regra/escala já aplicada

- **Aviso interno**

  Linguagem preferida: Disponível no aplicativo

  Limite preservado: Não significa entregue/lido no WhatsApp

- **Tentativa incerta**

  Linguagem preferida: Ainda não foi possível confirmar o resultado

  Limite preservado: Não incentivar repetir como nova operação

## Exemplos localizados

- **“Revise o período, o profissional e o efeito” sem dados;
  `schedule-console.tsx:66`**

  Problema: Instrui uma tarefa impossível no diálogo

  Direção proposta: Antes/depois com pessoa, datas, horas, fuso e consequência

- **“A gravação é transacional”; mesmo local**

  Problema: Implementação não ajuda a decidir

  Direção proposta: “Ao confirmar, estes plantões serão atualizados…”

- **JSON da proposta; `policy-console.tsx:319`**

  Problema: Exige interpretar identificadores e campos

  Direção proposta: Nome do recurso, alteração, vigência e escopo

- **`science_required`; `document-history.tsx:321`**

  Problema: Código exposto no chip de filtro

  Direção proposta: Reutilizar rótulo “Requisições para sua ciência”

- **“Remover filtro search/status/from”; `:310`**

  Problema: Nome acessível mistura idiomas

  Direção proposta: “Remover filtro de busca/situação/data inicial”

- **“Preferências e notificações”; `workspace-shell.tsx:52`**

  Problema: Destino é somente central de avisos

  Direção proposta: “Meus avisos” e acesso claro às preferências

- **Status de convite bruto; `admin-console.tsx:321`**

  Problema: Termo do contrato não orienta leigo

  Direção proposta: “Aguardando aceite”, “Aceito”, “Revogado”

- **Action de escala; `schedule-console.tsx:63`**

  Problema: Evento técnico sem interpretação

  Direção proposta: Dicionário de ação + pessoa/plantão afetado

- **“Rascunho deste dispositivo”; `requisition-wizard.tsx:96`**

  Problema: Escopo mais amplo que sessionStorage

  Direção proposta: “Rascunho desta aba recuperado” + hora/validade

- **“Você está em dia”; `notification-bell.tsx:115`**

  Problema: Pode aparecer antes da leitura

  Direção proposta: Reservar para vazio confirmado; carregando antes

- **“Documento salvo. Os avisos continuam…”; `document-actions.tsx:28`**

  Problema: Deadline sobrescreve mensagem sem reavaliar estado

  Direção proposta: Informar somente estado conhecido e acompanhamento
  disponível

Caminhos abreviados referem-se aos arquivos identificados em findings-ui.json.
Campos diagnósticos como correlação, hash e protocolo são úteis sob demanda;
não devem ocupar o lugar do resumo operacional. Termos MFA/TOTP/AAL2 e
fornecedor
Auth requerem explicação orientada à ação se apresentados ao usuário comum.

## Política de feedback

O sucesso deve dizer o que foi salvo e qual próximo passo continua pendente.
O erro deve dizer o que falhou, se os dados permanecem e como recuperar.
A incerteza de transporte precisa distinguir “não confirmado” de “não gravado”.
O código de correlação deve ser copiável quando necessário, sem payload privado.

Não apresentar promessa de entrega de mensagem a partir de reserva em fila.
Não apresentar contagem futura como realizada. Não apresentar aprovação como
“revisada” quando o objeto da revisão não estava visível (UX-001).

## Auditoria dos formulários

- **REQ**

  Padrão atual e mérito: Categorias e seleções fixas, extras excepcionais,
  revisão

  Atrito/oportunidade: Sete etapas podem exigir rolagem; medir antes de
  reduzir

  Aceite: Manter separação semântica, repetição justificada e zero quantidade
  solicitada

- **Quantidade/ENT**

  Padrão atual e mérito: Valores por item, confirmar tudo e divergência
  estruturada

  Atrito/oportunidade: Mostrar unidade junto ao campo e resumo completo

  Aceite: Decimal exato, teclado adequado e erro associado

- **Contagem BAL**

  Padrão atual e mérito: Duas etapas; primeira sem esperado

  Atrito/oportunidade: Contagem extensa requer busca/scanner e estado de
  progresso

  Aceite: Zero explícito, não preencher esperado automaticamente

- **Catálogo**

  Padrão atual e mérito: Lista, busca, drawer; categorias selecionáveis

  Atrito/oportunidade: Unidade livre apesar de cadastro de unidades; aliases
  por
  vírgula

  Aceite: Seleção de unidade canônica quando aplicável, chips/ajuda para
  aliases

- **Escala**

  Padrão atual e mérito: Seleções de pessoa/tipo/fuso e ciclos

  Atrito/oportunidade: Duração em minutos e “âncora” exigem
  conversão/interpretação

  Aceite: Mostrar horas/minutos e “primeiro dia da programação”

- **Movimento manual**

  Padrão atual e mérito: Produto, direção, quantidade e motivo

  Atrito/oportunidade: Motivos repetitivos podem ter opções frequentes

  Aceite: Presets com “outro”, sem apagar justificativa necessária

- **Política**

  Padrão atual e mérito: Resumos e edição por grupo

  Atrito/oportunidade: Configuração sem efeito verificável UX-012

  Aceite: Todo campo tem consumidor e explica alcance

- **Matriz avisos**

  Padrão atual e mérito: Canal por evento/função e edição contextual

  Atrito/oportunidade: Ícones sem legenda visível, auto-save diferente de
  formulário

  Aceite: Canal legível por toque e confirmação da alteração

- **Perfil**

  Padrão atual e mérito: Seções mantidas montadas

  Atrito/oportunidade: Preferências dentro de identidade podem ser difíceis de
  localizar

  Aceite: Link direto/âncora e texto claro de escopo pessoal

- **Convite**

  Padrão atual e mérito: Aceite explícito e vínculo autorizado

  Atrito/oportunidade: Estado bruto/termos de papel global

  Aceite: Pessoa entende paciente, função e validade antes de aceitar

A escolha entre checkbox e switch depende do compromisso: checkbox em formulário
com Salvar representa seleção; controle que altera imediatamente deve sinalizar
persistência e poder de recuperação. Não converter todos os controles por
estilo.
A matriz já informa salvamento imediato em certos caminhos: preservar essa
clareza e alinhar feedback, não inserir confirmação modal em cada célula.

## Digitação, defaults e validação

Usar seleção estruturada para categorias, unidades, destinatário, tipo de
plantão,
motivos frequentes e recorrência. Manter campo livre para exceção e
justificativa.
Defaults devem ser seguros e visíveis: quantidade0 pode significar contagem
ausente, portanto não substituir campo não preenchido por zero silenciosamente.
Família/equipe e paciente nunca devem ser inferidos de texto digitado.

A edição deve preservar a entrada inválida para correção e associar a mensagem
ao campo. Erros de versão devem conduzir à revisão dos dados atuais. Um erro
global sem indicação do campo pode aumentar retrabalho em listas extensas;
isso requer inspeção renderizada/teclado para avaliar alcance atual.

## Continuidade e linguagem do rascunho

REQ usa armazenamento por sessão da aba com autosave; isso não equivale a um
rascunho servidor. A semântica está documentada no
[sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage),
consultado em 27/10/2026. A frase deve explicitar esse alcance e a expiração
implementada. A recuperação em uma nova sessão de navegador não foi validada.

COM e BAL têm caminhos de rascunho servidor completos e armazenamento local de
preenchimento incompleto. Não usar uma única promessa para esses dois estados.
A interface futura deve indicar “nesta aba” ou “salvo na conta” e última
gravação,
sem expor chaves idempotentes à pessoa.

## Homologação de compreensão

Em sessão com familiar e profissional, pedir que expliquem paciente, ação,
destinatário, efeito no estoque e o que ainda está pendente antes de confirmar.
Medir necessidade de ajuda, redigitação, erro de interpretação e recuperação
de interrupção. Não tratar aprovação de testes automatizados como evidência de
compreensão humana.

A inspeção atual confirmou na tela o texto genérico de aprovação, ciência
automática com materiais fora do viewport, “Failed to fetch” no upload e
mensagem de vazio simultânea ao erro. A frase do acompanhamento também regrediu
após o prazo fixo. Capturas e circunstâncias estão em
[UI_RUNTIME_REVIEW](evidence/UI_RUNTIME_REVIEW.md).
