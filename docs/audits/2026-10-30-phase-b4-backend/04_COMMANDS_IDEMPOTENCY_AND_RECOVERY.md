# Comandos, versões, repetição e recuperação

## Resultados novos e relação histórica

**B4-002, P2, manifestação ampliada de BE-005.** A API canônica de settings
deduplica uma chave estável, mas `PolicyConsole.configure` gera outra UUID a
cada chamada. B44-01 devolveu o mesmo ID com a mesma chave; B44-02 criou duas
propostas pending com o mesmo conteúdo e chaves diferentes, como o consumidor
atual faria ao repetir. Não foi simulada a tela nem perda física do pacote;
a primeira resposta foi descartada semanticamente pelo teste. Não houve dupla
aplicação nem autoaprovação: o controle de versão/segundo administrador
continua.
A causa na rota `/admin` já era conhecida; o consumidor da rota recomendada
também precisa preservar a intenção.

**B4-003, P2, falha de recuperação nova.** Aprovar ingresso de identidade ainda
sem vínculo gera token no servidor e retorna seu link uma vez. Repetir a mesma
aprovação encontra o pedido `awaiting_acceptance`, mas o token novo não coincide
com o hash antigo e a resposta 200 omite `invitationUrl`. B44-03 confirmou um
único convite pending, hash original preservado e nenhum vínculo automático.
Quem perdeu a resposta não recupera o resultado acionável pela mesma tentativa.
B44-04 mostrou contingência: reemissão manual autorizada gera novo link. A API
precisa indicar essa recuperação ou garantir identidade recuperável do segredo;
persistir token em claro ou dispensar aceite não são soluções aceitáveis.

**B4-004, P2, contrato parcial comprovado.** B44-05 pediu revisão de uma ENT
draft de 1 para 2 unidades e submissão com saldo disponível de 1. A revisão
confirmou versão e quantidade 2; submissão foi recusada com
409/INSUFFICIENT_STOCK.
A resposta não inclui persistência parcial nem a versão já salva. Repetir as
mesmas duas chaves não duplicou evento e conservou o rascunho. A estrutura em
duas transações já fora observada na arquitetura A; a prova B4 identifica
precisamente a falta de resultado composto, sem alegar quebra de atomicidade
de uma única RPC. O banco não movimentou estoque na submissão recusada.

Evidência: [seis cenários B4.4](evidence/b44-command-results.json), com IDs,
estados persistidos, contraprovas e limites. Os objetos novos permanecem para
conferência; não houve limpeza de história.

## Matriz de semântica de comando

- **REQ emitir** — Identidade/versão: Chave cliente + hash de intenção sem
  rótulos; Recuperação e limite: Mesmo ID; corpo diferente 409; comprovante
  falho tem RECEIPT_PENDING.
- **COM/ENT/BAL criar** — Identidade/versão: Chave cliente e payload; regras
  na RPC; Recuperação e limite: Resultado recuperável; BAL após lock tem
  revalidação própria.
- **Documento comandar** — Identidade/versão: Chave, expectedVersion e
  action/body; Recuperação e limite: Replay da intenção; ação contraditória
  não é retry.
- **Revisar/submeter** — Identidade/versão: Duas chaves e duas RPCs;
  Recuperação e limite: Revisão pode confirmar antes da falha: B4-004.
- **Ciência** — Identidade/versão: Estado por usuário + versão, sem chave
  artificial; Recuperação e limite: Evento anterior recuperado; ciência não
  recebe materiais.
- **Cancelar/arquivar REQ** — Identidade/versão: Estado e motivo, RPC própria;
  Recuperação e limite: Consultar estado; não presumir envelope COM/ENT/BAL.
- **Resolver extra** — Identidade/versão: Chave e vínculo item/REQ/produto;
  Recuperação e limite: Associação não altera linha original.
- **Consumo relatar** — Identidade/versão: Chave cliente e texto/linhas;
  Recuperação e limite: Relato pendente não debita.
- **Consumo decidir** — Identidade/versão: Decisão sobre ID, sem nova chave;
  Recuperação e limite: B3-007: decisão oposta pode retornar resultado
  anterior.
- **Estoque familiar** — Identidade/versão: Chave e hash por autor; lock de
  estoque; Recuperação e limite: Ledger único; B3-005/018 e B4-001 continuam
  abertos.
- **Escalas** — Identidade/versão: Chave do comando e versão do registro;
  Recuperação e limite: Histórico/lock; B3-003 não resolvido por retry.
- **BAL por plantão** — Identidade/versão: Chave, atribuição e revisão do
  ledger; Recuperação e limite: Lock antes da recuperação; não contagem
  retroativa fictícia.
- **Administração global** — Identidade/versão: `/admin` chave servidor;
  settings chave cliente; Recuperação e limite: BE-005/B4-002; global propõe,
  local distinto decide.
- **Convite aprovar** — Identidade/versão: Pedido estável, segredo servidor
  efêmero; Recuperação e limite: B4-003; reemitir é intenção nova e invalida
  token antigo.
- **Avatar** — Identidade/versão: Caminho UUID servidor e associação em RPC;
  Recuperação e limite: Duas etapas; sem chave de recuperação de upload.
- **Anexo** — Identidade/versão: Chave reserva + SHA de bytes saneados;
  Recuperação e limite: Comparação de objeto existente; associação posterior
  revalidada.
- **Notificação retry** — Identidade/versão: ID + confirmação de uncertain;
  Recuperação e limite: Não transformar resultado externo desconhecido em
  reenvio cego.

## Garantias a preservar

B44-06 confirmou REQ com mesmo ID após repetição; alteração de urgência na
mesma chave recebeu 409; rótulo forjado não virou snapshot. As provas de
concorrência estoque/BAL/último administrador da B3 são reutilizadas por
definições idênticas. Não se repetiu SQL de corrida sem benefício adicional.

O cliente congela intenção em emissão/revisão documental e conserva chaves
separadas. Isso é proteção real, embora a classificação genérica de todo
409 como ausência de efeito não represente B4-004. Conflito de versão exige
reler o fato e decidir novamente; não deve criar UUID nova automaticamente
para contornar estado obsoleto.

Não foram executadas corridas de todos os comandos, testes de produção ou
cancelamentos físicos repetidos. B3-020 continua específico ao caminho já
demonstrado. Próximo: completude de consultas e alcance de pendências antigas.
