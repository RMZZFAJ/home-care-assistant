# WhatsApp Flows: segurança, contratos e recuperação

## O que existe

Dois JSONs locais: ocorrencias-v4 e ent-conferencia-v4, Flow JSON 7.3 e data
API 3.0.
Ocorrência coleta falta/consumo/sem ocorrências; ENT coleta aceite integral ou
divergências por linha e revisão. Não existe Flow REQ dedicado nem lançamento/
envio de Flow integrado ao aplicativo: busca de consumidores só encontrou a
rota de sessão e a revisão de submissões. Edição de JSON não prova Save,
publicação, número configurado ou funcionamento real.

- **ocorrência** — Sessão/identidade: Auth recente cria token/hash, usuário e
  paciente; 20 min; Persistência e efeito: Submissão para revisão do autor;
  relato ainda depende da revisão; Limite: Não vincula telefone; token bearer
  não prova quem preencheu no WhatsApp.

- **ENT** — Sessão/identidade: destinatário, capacidade ent.receive, phone
  Auth registrado, política, documento/versão; 10 min; Persistência e efeito:
  payload_state, review_ready; confirm usa comando ENT autorizado/idempotente;
  Limite: Não permite escolher outro documento/paciente via payload.

- **revisão** — Sessão/identidade: sessão/contexto/capacidade atuais e mesmo
  autor; Persistência e efeito: confirmed/rejected; no aceite cria relato, sem
  débito automático; Limite: GET somente pending_confirmation, até50; precisa
  atualizar consumidor.

Contratos SQL de ENT já têm prova V4/B3 de aceite parcial/replay/versão, e as
definições não mudaram. Não repetir recebimentos físicos simulados para afirmar
homologação Meta. Quantidade declarada nunca se torna saldo sem o comando de
domínio; itens não divergentes são aceitos integralmente com aviso na revisão.

## Criptografia e fronteira oficial

HMAC antes de decifrar; RSA-OAEP SHA-256 para AES de 16 bytes, AES-128-GCM com
tag
e IV de 16 bytes; resposta usa IV invertido. Chaves ficam no servidor. Quatro
[casos do endpoint](evidence/b57-endpoint-cases.json) usam chaves efêmeras
reais,
sem gravá-las: ping retornou conteúdo cifrado verificável; assinatura inválida
e ciphertext alterado não alcançaram RPC. Não é homologação do cliente Meta.

A comparação usa o [exemplo oficial de
criptografia](https://github.com/WhatsApp/WhatsApp-Flows-Tools/blob/main/examples/endpoint/nodejs/basic/src/encryption.js)
da Meta, consultado em 30/10/2026. Sustenta compatibilidade do esquema, não
publicação nem cobertura de todas as versões futuras.

## B5-008: “sem ocorrências” não recupera resultado confirmado

[B57-S03](evidence/b57-flow-results.json): primeiro no_issues retornou sucesso e
gravou uma submissão. Repetir imediatamente o mesmo token/payload deu42501
porque used_at já estava definido. Uma resposta perdida pode deixar o cliente
sem resultado recuperável pelo mesmo comando. Não houve duplicação de ledger.
Contraprova B57-S02: relato de falta repetido conserva uma submissão e retorna
pendingConfirmation. ENT confirm também tem retorno salvo para replay dentro
do prazo, por leitura estática. O defeito é específico ao ramo no_issues.

## B5-009: fronteira de erros não acompanha o protocolo Flow

Sessão expirada em RPC produziu HTTP403/JSON aberto pelo wrapper API comum;
aviso de erro do cliente em data.error foi recusado400 pelo schema e não
recebeu acknowledged. São B57-C02/03, handler/criptografia reais com resultado
RPC controlado. O [servidor de referência
Meta](https://github.com/WhatsApp/WhatsApp-Flows-Tools/blob/main/examples/endpoint/nodejs/basic/src/server.js)
indica427 com resposta cifrada para token inválido e432 para assinatura; o
[handler de referência](https://github.com/WhatsApp/WhatsApp-Flows-Tools/blob/main/examples/endpoint/nodejs/basic/src/flow.js)
reconhece aviso de erro do cliente. A aplicação já retorna421 para erro de
decifragem. A divergência é de integração/recuperação, sem bypass de HMAC.
Efeito visual e política de retry reais continuam dependentes da Meta.

Não copiar logging de payload do exemplo: o produto corretamente omite conteúdo
privado. Uma correção deve adaptar os erros à fronteira cifrada sem transformar
recusa em sucesso ou revelar existência de outro paciente.

## B5-011: propósito de ocorrência aceita corpo de confirmação ENT

B57-S04 passou `{operation:confirm}` a sessão occurrence e recebeu submissão
pending, sem texto/kind ou operação física. `flowRequest` aceita essa forma na
union compartilhada; `v3_flow_exchange` só exige objeto/tamanho, sem validar
payload pelo propósito. É lacuna P3 de contrato, capaz de criar revisão vazia,
nunca prova de recebimento ENT ou débito. Contraprova: revisar exige o próprio
autor, conteúdo válido e capacidade; relato não vira estoque. Validar propósito
no contrato correto é preferível a outro motor de formulários.

## Demais provas e contraditório

Sete [cenários SQL](evidence/b57-flow-results.json), novas fixtures e rollback:
sessão occurrence funcionou sem verified_phones, replay de texto não duplicou,
prazo e revogação foram recusados, revisão criou um relato e replay contrário
retornou o status confirmado original; ledger permaneceu zero. São contextos
SQL de serviço simulados e claims Auth reais para sessão/revisão, não telefone
de operador Meta nem HTTP externo completo.

Token occurrence é credencial curta e pode expor catálogo a quem o detenha;
HMAC autentica o provedor, não o remetente humano. Isso precisa de decisão de
distribuição/minimização antes de publicar. Não foi demonstrado encaminhamento
real ou captura de token; não classificar o desenho bearer sozinho como invasão.
ENT tem vínculo explícito ao telefone, e não herda essa limitação.

Submissões sobrevivem a desligar o canal e continuam revisáveis. Rascunho ENT
persistido sobrevive ao processo dentro do TTL; texto ainda não enviado depende
do cliente, sem prova de retomada física. Reabertura após prazo exige consulta
autenticada do resultado e nova sessão quando pertinente, sem repetir aceite.
Back/telas, teclado decimal, falha de rede móvel, erro do cliente e interrupção
real devem integrar a homologação. Não há publicação comprovada nesta fase.
