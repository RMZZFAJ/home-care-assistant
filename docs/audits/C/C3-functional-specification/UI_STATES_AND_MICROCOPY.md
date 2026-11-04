# Estados, formulários e linguagem comuns

DEC-001/012/013/014/015 orientam o resultado. AS_IS tem Fluent, wizards,
recuperação parcial e estados divergentes B1; TO_BE conserva os controles bons
e aplica o contrato abaixo por unidade de consulta/ação, sem reescrita
estética.

## Estados obrigatórios em todas as superfícies

<!-- c-table:start -->

- **Estado:** Loading inicial

  **Apresentação e controles:** Skeleton/“Carregando suas entregas…”; não
  mostrar vazio ou em dia

  **Recuperação e foco:** Anunciar status sem roubar foco; sucesso foca título
  só após navegação.

- **Estado:** Atualizando

  **Apresentação e controles:** Conservar resultado com data e “Atualizando…”;
  identificar filtro a que pertence

  **Recuperação e foco:** Requisição antiga não substitui a nova; foco
  permanece no filtro.

- **Estado:** Empty confirmado

  **Apresentação e controles:** Só após resposta válida vazia: “Nenhuma
  entrega aguarda sua conferência”

  **Recuperação e foco:** Oferecer filtros/ação pertinente; distinguir todas
  de pendentes.

- **Estado:** Error de leitura

  **Apresentação e controles:** “Não conseguimos consultar agora. Seus dados
  não foram alterados”

  **Recuperação e foco:** Tentar consultar; manter painel válido independente
  e data de atualização.

- **Estado:** Editando/rascunho

  **Apresentação e controles:** Campos preservados; “Salvo às…” só após
  confirmação do servidor

  **Recuperação e foco:** Erro de autosave mostra “Ainda não salvo”; sair
  oferece manter edição/voltar.

- **Estado:** Enviando

  **Apresentação e controles:** Ação ocupada e não duplicável; não congelar
  toda navegação sem necessidade

  **Recuperação e foco:** Chave e conteúdo ficam associados; leitor de tela
  recebe status.

- **Estado:** Sucesso

  **Apresentação e controles:** Fato exato e próxima pessoa: “Chegada
  informada. Aguarda validação da família”

  **Recuperação e foco:** Link para registro e histórico; jamais “Estoque
  atualizado” se não houve crédito.

- **Estado:** Conflict

  **Apresentação e controles:** “A ficha mudou desde sua consulta. Revise a
  versão atual”

  **Recuperação e foco:** Diálogo permanece aberto, intenção e comparação
  preservadas; nenhuma reaplicação automática.

- **Estado:** Offline/stale

  **Apresentação e controles:** “Sem conexão. Última consulta às… Os dados
  podem ter mudado”

  **Recuperação e foco:** Bloquear confirmação operacional; reconectar e
  revalidar. Texto ainda não salvo não é anunciado como durável.

- **Estado:** Uncertain

  **Apresentação e controles:** “Ainda não sabemos se a ação terminou.
  Consulte esta tentativa”

  **Recuperação e foco:** Congelar identidade/conteúdo do comando, recuperar
  por chave; não criar nova tentativa cega.

- **Estado:** Revogado/expirado

  **Apresentação e controles:** “Seu acesso mudou. Esta ação não está mais
  disponível”

  **Recuperação e foco:** Interromper novas escritas, limpar conteúdo sensível
  da tela, saída/login/seleção segura.

- **Estado:** Cancelado/obsoleto

  **Apresentação e controles:** Motivo, autor e data, sem instrução de
  recebimento pendente

  **Recuperação e foco:** Histórico/novo pedido pertinente; não eliminar
  versão anterior.

<!-- c-table:end -->

HTTP 401 pede autenticação e retorno seguro; 403 explica indisponibilidade sem
enumerar outro paciente; 404 não troca versão pedida pela atual. 409 conserva
revisão humana; 422 aponta campo; 429 informa nova consulta no prazo aceito.
500 usa correlação copiável para suporte, sem SQL. JSON inválido/timeout/abort
em escrita não prova recusa. GET falho não pede recuperar uma mutação
inexistente.

## Campos, confirmação e acessibilidade

Rótulo visível, ajuda associada, indicação de obrigatório antes do envio,
exemplo fictício e erro junto do campo. Validação local orienta; API/RPC
decidem. Mostrar todos os erros em resumo com links e mover foco ao primeiro
campo inválido; aria-invalid/descrição coerentes. Ao voltar etapa, manter
valores.
Decimal aceita vírgula/ponto na entrada, normaliza string exata sem
arredondar;
quantidade e unidade sempre próximas. Nulo/ausente/zero seguem o domínio.

Resumo antes da ação relevante mostra paciente, pessoa, versão, situação
atual,
proposta, quantidades/custódia, consequência e próxima etapa. Botão usa verbo
específico (“Expedir 3 unidades”, “Registrar novo reconto”), evitando “OK”.
Não adicionar confirmação extra para mudar filtro ou salvar campo trivial.
Escape/Voltar/Continuar devolvem foco ao acionador ou campo válido; nunca
BODY.
Diálogo contém foco e rótulo, mas não esconde erro fora dele.

Em 320px/reflow e zoom nativo 400%, nomes contínuos e observações válidas
quebram
linha; sem rolagem global indevida. Tabela pode ter região rotulada de rolagem
quando indispensável. Resumos e ações ficam alcançáveis por teclado, alto
contraste, leitor de tela e touch; não depender de cor, hover ou gesto.
Barra de ações não cobre teclado virtual/conteúdo. Calendário Mês deve mostrar
intervalo correspondente em móvel ou explicar explicitamente a alternativa.

## Microcopy de efeitos distintos

- “Relato registrado. Nenhum material foi descontado. Aguarda conferência.”
- “Consumo confirmado: 1 unidade saiu do estoque da equipe.”
- “Você declarou ciência antes de abrir. Isso não registra leitura integral.”
- “Ciência presumida pela preferência vigente na emissão. Acesso não
  registrado.”
- “Você recebeu 2 de 3 unidades. Uma unidade permanece em divergência.”
- “Pedido de cancelamento retirado. A entrega voltou à situação anterior.”
- “A edição foi salva; a expedição não ocorreu por saldo insuficiente.”
- “Rascunho de ontem encontrado. Continuar ou descartar somente este
  rascunho?”

Badges traduzem eventos/papéis/filtros com fallback seguro. Histórico mostra
data do fato, do registro e da emissão com seus rótulos, quando conhecidos.
Se desconhecido, dizer “Não informado”; não usar hoje como preenchimento.
Guia técnico fica no suporte; profissional recebe próximo passo operacional.
