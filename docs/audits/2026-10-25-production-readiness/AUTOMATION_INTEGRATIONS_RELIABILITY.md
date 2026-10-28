# Automação, integrações e confiabilidade

Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. Estado remoto e entrega
externa real não foram presumidos a partir de código ou de auditoria anterior.

## Cadeia efetiva

Evento SQL confirmado → regra por paciente/destinatário → outbox → reserva com
lease → revalidação atual do destinatário → preparo do evento/template/PDF →
provedor → persistência do resultado → webhook autenticado → estado externo.

O endpoint do worker autentica segredo de servidor, chama
`run_operational_schedule` e depois processa notificações. O processamento
manual administrativo chama apenas `processNotifications`; não é equivalente
a executar o agendador. A existência do botão não comprova cron instalado,
segredo correto ou execução periódica no ambiente de produção.

- Canal/caminho: Aplicativo; Implementação observada: Caixa pessoal paginada,
  estados e leitura independentes; Limite de evidência: Testes locais/SQL, não
  leitura humana garantida; Contingência: Conferir painel, histórico e
  pendências
- Canal/caminho: WhatsApp saída; Implementação observada: Meta Graph fixo,
  template registrado/aprovado, PDF privado enviado como mídia; Limite de
  evidência: Contratos e transporte simulado; entrega real NOT_VERIFIED;
  Contingência: Aplicativo e compartilhamento manual autorizado
- Canal/caminho: Webhook; Implementação observada: HMAC do corpo, WABA/telefone
  configurados, estados reconhecidos; Limite de evidência: Replay real do
  provedor NOT_VERIFIED; Contingência: Consultar estados, conciliar incerto
  antes de reenviar
- Canal/caminho: Ciência/aceite rápido; Implementação observada: Desafio
  aleatório com hash, telefone verificado e RPC de propósito específico; Limite
  de evidência: Homologação Meta/telefone real NOT_VERIFIED; Contingência:
  Confirmação autenticada no aplicativo
- Canal/caminho: Flows; Implementação observada: RSA-OAEP/AES-GCM, sessão curta,
  payload tipado e revisão autenticada; Limite de evidência:
  Publicação/editor/conta externa NOT_VERIFIED nesta frente; Contingência:
  Formulário local de relato ou conferência
- Canal/caminho: E-mail operacional; Implementação observada: Tipo existe em
  preferências e administração; worker não implementa provedor de e-mail; Limite
  de evidência: Não há entrega operacional implementada nesse worker;
  Contingência: Caixa do aplicativo; não prometer envio de e-mail
- Canal/caminho: Auth e-mail/SMS/OAuth; Implementação observada: Chamadas
  Supabase Auth e callback com origem/retorno aprovados; Limite de evidência:
  Provedor real, redirects e entrega NOT_VERIFIED aqui; Contingência: Homologar
  acesso e recuperação antes do uso correspondente
- Canal/caminho: Áudio de entrada; Implementação observada: Schema reconhece
  áudio; há interface de transcrição sem implementação/consumidor; Limite de
  evidência: Mensagem de áudio não é transcrita nem vira relato pelo webhook;
  Contingência: Orientar texto/formulário; não anunciar áudio como recurso
  pronto

## Estados e recuperação

`accepted` significa aceitação pelo provedor, não entrega. `delivered` e `read`
dependem de callback. Falhas 5xx, timeout e sucesso sem referência de mensagem
viram `uncertain`; não são reenviadas automaticamente como simples rejeição.
429 pode voltar a `pending`. Código Meta 130497 recebe classificação segura.
Falha ao concluir o job consulta seu estado atual, preservando um webhook ou
uma revogação que venceu a corrida.

O caminho interno é independente: leitura da notificação não é confirmação
expressa de ciência nem recebimento de materiais. Flows de relato criam
pendência para revisão e não débito autônomo. Não existe justificativa para
relaxar essas separações para melhorar uma mensagem de sucesso.

O webhook processa eventos sequencialmente. A garantia operacional exige
confirmar como o provedor repete lotes quando um evento falha, e se eventos
posteriores permanecem recuperáveis. Isso é um cenário de homologação,
não uma afirmação de perda de eventos já reproduzida.

## Achados e consequências

BE-002: o preparo genérico usa data de emissão em mensagens de atualização,
e conta diferenças BAL com o campo `issueOpen` de ENT. O probe mostra uma linha
BAL contada como 3 diante de referência 10 gerando “0” diferenças. O banco não
é alterado por isso; o familiar pode receber um resumo incorreto. Validar os
valores finais de cada evento é requisito antes de habilitar o canal.

BE-003: lote administrativo de 50 jobs, concorrência 10, upload de mídia e
envio sequenciais de até 15 segundos cada não cabem necessariamente em 120
segundos. O probe com dois sucessos de 14 segundos por job exige 140 segundos
virtuais, sem considerar PDF e SQL. O lote padrão 25 reduz a exposição; não
prova o pior caso permitido. Não se demonstrou duplicação real. Recomenda-se
orçamento por deadline/lease e reserva proporcional ao trabalho, com cenário
de timeout e callback tardio em ambiente local controlado.

O domínio oficial está fixado em `template-registry.ts:124` e no QR de
`operational-pdf.ts:609`. Isso impede adoção transparente de domínio próprio
ou homologação isolada. No domínio atual é uma decisão coerente, não um link
quebrado comprovado. O plano de produção deve decidir o domínio canônico antes
da aprovação dos templates e emissão de PDFs permanentes; preservar URLs
antigas por redirecionamento autorizado se houver migração futura.

O comentário do provedor que diz que templates omitem dados do paciente não
descreve o payload real: os templates usam `nome_paciente` e documentos podem
ser anexados. Não é evidência de vazamento a destinatário indevido, porque há
autorização, configuração e telefone verificado. É requisito de transparência
operacional definir os dados e destinatários do canal antes da habilitação.

## Homologação necessária

1. Registrar template e aprovação de cada versão no ambiente correto; testar
   valores, títulos, botões e documentos de cada evento com dados fictícios.
2. Confirmar número, WABA, HMAC, segredo, chave de Flow e URLs finais sem expor
   credenciais nos artefatos. Habilitação por variável não é homologação.
3. Demonstrar accepted → delivered/read, recusa permanente, 429, resposta
   perdida, callback anterior à conclusão e repetição de callback.
4. Demonstrar revogação entre reserva e envio e desafio vencido/telefone
   trocado.
5. Medir atraso da fila, execução do cron e recuperação após interrupção.
6. Apresentar no aplicativo um procedimento claro para pendência/incerteza e
   garantir que operação interna segura continua sem mensagens externas.

Integrações podem permanecer desabilitadas no lançamento interno, desde que a
família acompanhe as pendências no aplicativo e essa contingência seja
homologada. A existência de uma fila persistente não substitui essa rotina.
