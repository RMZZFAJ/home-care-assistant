# Administração, identidade e configurações

## Capacidades e modos preservados

Administração global exige modo global, identidade ativa e assurance efetiva.
Ela propõe mudanças locais; administrador local distinto aprova. Administração
local aplica no paciente atual e não altera identidade global de outra pessoa.
Último administrador, aprovação distinta, versão e ingresso por convite são
proteções SQL reaproveitadas da B3, com funções vigentes idênticas.

[B48-04–05](evidence/b48-admin-results.json) negaram promoção de identidade
global por administrador local e uso de capacidade delegada em outro paciente.
B42 já diferenciou pessoa compartilhada entre dois pacientes de autoridade
operacional sobre ambos ao mesmo tempo. Não se modificou perfil global de
qualquer pessoa real ou fixture anterior.

## Contrato divergente confirmado

**B4-008, P3, revalidação da observação estática A.** B48-01 concedeu somente
`catalog.manage` à profissional fictícia, conservando `access.manage=false`.
POST `/catalog` respondeu 403; a operação equivalente product via `/admin`
respondeu 200 e criou o item autorizado. A RPC protegeu ambos; o problema é
negação incoerente do contrato HTTP, não escalada. O consumidor ativo usa
`/admin`, que funciona, justificando P3 em vez de bloqueador de jornada atual.

Futuro: alinhar a capacidade do adaptador ou aposentar explicitamente a escrita
compatível depois de inventariar consumidores. Não ampliar acesso para todas
as pessoas nem trocar administração local por privilégio global.

## Entrada malformada vira falha interna

**B4-009, P3, defeito confirmado novo.** GET `/admin?section=catalog` em modo
global usa `uuid.parse`, cujo ZodError não é convertido em ApiError. UUID
inválido respondeu 500/INTERNAL_ERROR com `retryable=true` em B48-02. No modo
local, o mesmo parâmetro respondeu 400/PATIENT_REQUIRED (B48-03).
Não houve mutação nem dado exposto. Corrigir a entrada é necessário; repetir
por indisponibilidade não resolve. Usar o adaptador de validação seguro evita
classificar input inválido como incidente interno sem relaxar autorização.

## Administração e consequências do domínio

B4-002 demonstrou proposta duplicada com UUID nova no consumidor settings;
B4-003 demonstrou perda do link no retry da aprovação; B4-005 comprovou pedido
pending oculto após 50 mudanças. Essas causas se combinam: repetição aumenta
fila e pode afastar justamente a proposta cuja resposta se perdeu. São
problemas distintos, sem contar uma duplicata como dupla aplicação.

Revogar vínculo não transfere responsabilidade ENT parcial. B2-015 permanece:
diretório ativo exclui a pessoa, mas fatos históricos e consentimentos antigos
devem permanecer; backend não oferece sucessão formal daquele aceite. Não
inventar bypass administrativo ou impedir revogação urgente para resolver o
impasse. Uma síntese de tarefas afetadas pode ser construída dos read models
atuais, mas seu contrato e responsabilidade dependem de decisão de produto.

Catálogo canônico por paciente não é o catálogo global de identidades. Adoção
de modelo é explícita; novo paciente inicia vazio. Unidades com história não
devem ser reinterpretadas. Produto inativo com saldo continua B2-007, e
conversão sem proveniência de apresentação continua B2-006 como oportunidade.

Perfil, e-mail, telefone, sessões, senha e provedor são operações pessoais
distintas de vínculo local. `recent_session` e confirmação Auth limitam contatos
e encerramento de outras sessões; senha exige credencial atual. Telefone de
aceite WhatsApp vem do Auth confirmado, não da preferência informada no perfil.
Cadastro/OTP/SMTP/OAuth e MFA completos não foram homologados remotamente.

## Campos, compatibilidade e limites

Os flags antigos canManageStock/canCountStock coexistem com capacidades.
Não os tratar como fonte de autoridade: o banco calcula a capacidade efetiva.
Proposta global de membership encaminha userId/role, enquanto edição local
transporta também flags; o consumidor atual deriva esses flags do papel.
Não foi demonstrada perda de uma concessão personalizada na jornada atual;
mudanças de capacidade devem passar pelo contrato próprio de overrides.

Sem nova corrida entre últimos administradores ou reexecução de convites
revogados B2/B3: código igual e benefício adicional insuficiente. Provas novas
ficam restritas às cinco hipóteses HTTP registradas. Próximo: orquestração de
workers, interpretação de webhook e isolamento de mensagens externas.
