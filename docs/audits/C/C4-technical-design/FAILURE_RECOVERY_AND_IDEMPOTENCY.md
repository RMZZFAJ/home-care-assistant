# Falhas, recuperação e sequências de referência

As sequências modelam TO_BE, sem chamadas executadas em C. Setas de
persistência
representam transação/RPC autorizada, não DML do browser. A fonte do fato é
preservada quando outra etapa falha.

## Matriz de interrupção

<!-- c-table:start -->

- **Ponto de falha:** Antes de validar/commit comprovadamente recusado

  **Resultado que pode ser afirmado:** Sem efeito, código seguro de
  campo/estado/autoridade

  **Continuação segura:** Corrigir a intenção; nova chave só se nova intenção.

- **Ponto de falha:** Resposta perdida durante commit

  **Resultado que pode ser afirmado:** Resultado incerto

  **Continuação segura:** Consultar mesma chave e hash; não editar conteúdo ou
  duplicar.

- **Ponto de falha:** Edição salva, emissão recusada

  **Resultado que pode ser afirmado:** Etapa 1 confirmada, etapa 2 recusada

  **Continuação segura:** Mostrar versão salva e saldo/ação da segunda;
  retomar sem repetir evento 1.

- **Ponto de falha:** Objeto enviado, vínculo falhou

  **Resultado que pode ser afirmado:** Arquivo pode existir sem ready/ponteiro

  **Continuação segura:** Consultar reserva/tentativa; conciliar e não criar
  objeto novo por padrão.

- **Ponto de falha:** Ready registrado, resposta perdida

  **Resultado que pode ser afirmado:** Arquivo confirmado recuperável

  **Continuação segura:** GET autorizado identifica mesmo arquivo/hash;
  bloquear troca sob chave antiga.

- **Ponto de falha:** Upload de mídia falhou antes de messages

  **Resultado que pode ser afirmado:** Mensagem ainda não iniciada

  **Continuação segura:** Classificar etapa e retry seguro, sem falsa
  conciliação de entrega.

- **Ponto de falha:** Messages/push em voo sem resposta

  **Resultado que pode ser afirmado:** Aceitação externa incerta

  **Continuação segura:** Estado por tentativa e conciliação; não prometer
  exatamente uma entrega.

- **Ponto de falha:** Callback antigo durante lease nova

  **Resultado que pode ser afirmado:** Resultado da geração antiga

  **Continuação segura:** Atualizar tentativa correspondente; não encerrar
  worker atual.

- **Ponto de falha:** Broadcast perdido ou consumidor stale

  **Resultado que pode ser afirmado:** Fato persiste; tela pode estar antiga

  **Continuação segura:** Revisão/reconexão/poll dirigido refaz consulta, sem
  apagar edição.

- **Ponto de falha:** Restore com jobs antigos

  **Resultado que pode ser afirmado:** Estado após corte potencialmente
  incoerente com mundo externo

  **Continuação segura:** Quarentena antes de egress/cron, conciliar e liberar
  explicitamente.

<!-- c-table:end -->

## ENT e pessoa recebedora

```mermaid
sequenceDiagram
  actor F as Família autorizada
  participant A as API e RPC
  participant L as Ledger e documento
  actor R as Recebedor efetivo
  F->>A: Preparar ENT, pessoa sugerida editável, versão e intenção
  A-->>F: Resumo de origem, trânsito, pessoa e quantidade
  F->>A: Expedir intenção revisada
  A->>L: Commit origem para trânsito, evento e versão
  R->>A: Confirmar pessoalmente quantidades e ressalvas
  A->>L: Commit único trânsito para destino
  A-->>R: Resultado e próxima pendência
```

## Transferência simples, ramo P07-A proposto

```mermaid
sequenceDiagram
  actor I as Iniciador de qualquer lado
  participant A as API e contrato ENT
  actor C as Contraparte
  actor R as Pessoa que recebeu
  I->>A: Declarar origem, destino, quantidade e pessoa
  A-->>C: Declaração a conferir
  C->>A: Contrassinar declaração, identidade própria
  A-->>R: Solicitar confirmação física pessoal se ainda necessária
  R->>A: Aceitar fato físico próprio
  Note over A,R: Contrassinatura de C não cria aceite de R
```

## Consumo textual e complemento

```mermaid
sequenceDiagram
  actor R as Relator
  participant A as API e RPC
  actor V as Confirmador autorizado
  participant L as Relato e ledger
  R->>A: Texto livre, intenção e custódia
  A->>L: Relato sem débito
  R->>A: Complemento versionado com material e quantidade
  A->>L: Novo esclarecimento, original preservado
  V->>A: Confirmar versão explícita
  A->>L: Um débito e evento autoral
  A-->>V: Mesma decisão recupera; oposta conflita
```

## Ciência e abertura

```mermaid
sequenceDiagram
  participant E as Emissão transacional
  participant P as Preferência e política versionadas
  participant C as Eventos de ciência
  actor U as Usuário
  participant V as Visualizador autorizado
  E->>P: Resolver modalidade vigente por tipo
  E->>C: Se tácita permitida, origem presumida na emissão
  U->>V: Solicitar abertura real, sem prefetch
  V-->>U: Se condicionada, explicar registro antes de abrir
  U->>V: Continuar ou cancelar
  V->>C: Só continuar elegível registra ciência condicionada
  V->>V: Servir e registrar acesso efetivo independente
```

## Draft em dois aparelhos

```mermaid
sequenceDiagram
  actor A as Aparelho A
  participant D as Serviço de draft autorizado
  actor B as Aparelho B
  A->>D: Save expectedRevision5 com chave estável
  D-->>A: Confirmado revision6 e savedAt
  B->>D: Save expectedRevision5
  D-->>B: Conflito, revisão atual6
  B->>D: Consultar e revisar diferenças
  B->>D: Save deliberado com expectedRevision6
  Note over B,D: Finalizar revalida documento, permissões e ledger atuais
```

## Escala com efeito BAL

```mermaid
sequenceDiagram
  actor G as Gestor
  participant A as API e RPC de escala
  participant B as Obrigações BAL
  actor F as Decisor familiar quando exigido
  G->>A: Propor pessoa, período e versão
  A->>B: Calcular efeito autorizado da mudança
  A-->>G: Antes, depois, fuso e efeito BAL
  F->>A: Decidir versão e alvo ainda vigentes
  A->>A: Revalidar corte da série e concorrência
  A->>B: Atualizar só responsabilidade futura legítima
  Note over A,B: Não modificar autoria ou presença passada
```

## Aviso interno e push

```mermaid
sequenceDiagram
  participant T as Transação operacional
  participant O as Notificação e outbox
  participant W as Worker
  participant S as Serviço push
  actor U as Usuário
  T->>O: Commit evento e tarefa interna
  W->>O: Reservar geração e revalidar destinatário
  W->>S: Mensagem mínima por inscrição válida
  S-->>W: Accepted, erro ou resultado incerto
  U->>O: Abrir deep link com sessão e contexto atuais
  O-->>U: Pendência real, sem confirmar ciência ou recebimento
```

Oráculos de recuperação conferem chave, conteúdo, ator, versão e efeito
persistido. Não repetir o probe antigo só para obter data nova; implementar
regressão com comportamento correto. Gate completo ocorre no candidato de
release, enquanto alteração apenas documental recebe validação de integridade.
