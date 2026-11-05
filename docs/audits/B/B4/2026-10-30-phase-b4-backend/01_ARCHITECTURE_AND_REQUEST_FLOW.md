# Arquitetura e contratos HTTP

## Superfícies reconhecidas

O [catálogo canônico](01_BACKEND_API_INVENTORY.csv) contém 61 combinações
caminho/método em 41 Route Handlers. Inclui `/auth/callback`, o PDF público
fictício e endpoints retirados, além das rotas de produto. O
[índice de fontes](evidence/source-surface-index.json) identifica 82 superfícies
de backend/bibliotecas; componentes e testes são consumidores, não novas APIs.
Não foram encontrados Server Actions de domínio nem uma API Pages paralela.

O catálogo extrai chamadas da AST e conserva âncoras por método. Campos com
regras condicionais remetem ao código e aos relatórios especializados; uma
chamada identificada não equivale a um ramo autorizado/executado. A análise
manual percorreu todos os 41 handlers, incluindo schemas locais e respostas.

## Fluxo observado

Proxy renova sessão Auth → handler chama `api` → leitura limitada e Zod ou
consulta de parâmetros → `authenticate`/`authenticatedIdentity` → contexto
explícito/capacidade quando aplicável → cliente da sessão → RLS/RPC → resposta
com correlação e `no-store`. Regras transacionais permanecem no PostgreSQL.

Não há exigência de que toda rota por UUID chame `patientContext`: comandos
documentais resolvem objeto/paciente e autoridade dentro da RPC. Não há motivo
para aceitar `careRecipientId` do navegador como autoridade sobre esse objeto.
O cliente de serviço está restrito a worker, webhook, finalização de evidência
e cache PDF; os demais comandos usam a identidade da sessão.

Exceções legítimas: convite inicial é público com token/e-mail; contexto e
aceite usam identidade ainda sem conta operacional pronta; worker usa segredo;
Meta usa HMAC/ativo e Flow cifrado; demonstração contém somente dados fictícios;
callback troca código PKCE e saneia retorno. `/verificar/:id` é página SSR
pública de integridade mínima, examinada na segurança, não outro handler API.

## Contratos que exigem investigação B4

- `/catalog` e `/admin` escrevem o mesmo catálogo com guardas HTTP diferentes:
  `access.manage` e `catalog.manage`. A RPC continua autoritativa; verificar
  o efeito para capacidades personalizadas antes de chamar isso de bypass.
- `/stock/inventory` GET conserva história; POST retorna 410 autenticado.
  Não remover rota antiga nem reinterpretar inventário como balanço atual.
- `/requisitions` e `/documents` expõem envelopes de criação diferentes.
  REQ distingue persistência confirmada de falha de comprovante; os outros
  comandos dependem de resultado RPC sem schema de saída.
- `/documents/:id/revise` pode executar duas transações. Revisão salva não é
  automaticamente revertida por falha da submissão seguinte.
- `/admin` global gera chave de proposta; `/patient-settings` recebe chave e
  versão do cliente. Outras identidades efêmeras precisam de exame próprio.
- Consumo, Flow pendente, auditoria e propostas têm limites fixos distintos;
  limite útil de painel não garante acesso posterior à pendência completa.
- GET de arquivo pode criar representação privada. Sua leitura não deve
  modificar o fato documental nem conceder nova autoridade por usar serviço.

Esses são alvos de investigação, sem uniformização automática dos contratos.
Os achados confirmados, as refutações e os limites serão reconciliados no
registro mestre, sem contar novamente causas A/B1/B2/B3.

## Testes e limites do inventário

Inventário gerado com TypeScript instalado, validado com `node --check` e
conferido contra exports reais. O campo de testes existentes identifica
referências diretas; ausência de referência não prova ausência de teste
transitivo. Nenhum teste de autoridade ou persistência é inferido dessa busca.
Não se executou build ou suíte global nesta etapa.
