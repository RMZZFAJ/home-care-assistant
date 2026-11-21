# D3.44 — preparações de programação e plantões BAL

Configurar a programação, atribuir responsável, solicitar adiamento, adiar
por decisão familiar, aprovar e rejeitar usam preparações privadas recuperáveis.
O paciente, ciclo, atribuição ou pedido reais identificam o alvo; não há ficha,
versão documental ou identidade artificial. O núcleo operacional existente
continua responsável por prazo, autoria, efeitos físicos e histórico.

## Comportamento integrado

O editor compartilhado preserva campos incompletos, escolhas e justificativa.
Salvar não executa ato operacional. Retomada entre sessões, revisão concorrente
e referência atual são apresentadas separadamente. A confirmação liga os
valores salvos à referência consultada e executa o comando nativo na mesma
transação que consome a preparação. Uma referência alterada exige comparação
explícita; leituras atrasadas não substituem a digitação própria.

A recuperação conserva o pacote original e depende de ação explícita, inclusive
após recarregar. Não há POST automático, replay offline ou nova confirmação a
partir de conteúdo alterado. O resultado pessoal continua consultável com
leitura sobrevivente após perda de escrita. Perda de leitura remove a superfície
protegida. A lista pessoal pagina intenções independentes e conserva o elemento
que devolverá o foco durante uma atualização da mesma consulta.

As seis operações mantêm os campos, permissões, informações do destino,
justificativas e revisão existentes. O destino escolhido não muda durante a
revisão. Pareceres documentais e reconto continuam no mecanismo anterior.
Os componentes seguem o modelo canônico compartilhado, sem reintroduzir Fluent.

## Banco e segurança

A migration177 cria duas tabelas privadas com RLS e sem acesso direto de
anon/Auth/service_role. Cinco RPCs públicas são exclusivas de Auth; helpers
não têm execução pública. CAS, journal e locks ligam ator, paciente, propósito,
alvo, revisão, referência, conteúdo e chave. A autorização é conferida também
após o journal; uma revogação ou alteração tardia reverte todo o ato.

Um ensaio Auth comprovou que uma chave nativa antiga podia fornecer resultado
anterior a uma preparação nova. A confirmação agora recusa essa colisão; o
replay do pacote já registrado no journal privado continua permitido. O teste
permanente distingue chave antiga recusada, nova intenção efetiva e replay
privado sem duplicação. Os comandos nativos não foram alterados.

O alvo exato é consultado além da página operacional recente. Total e itens da
lista privada vêm da mesma consulta. O recibo congela os campos preparados e
o resultado nativo; o cliente valida ambos e não cria confirmação a partir de
um simples despacho HTTP. Campos livres e conteúdo privado não vão para logs.

## Validação e limites

A [validação](BAL_WORKSPACE_DRAFTS_VALIDATION.json) distingue casos novos,
consumidores anteriores, tentativas com falha e reuso qualificado. A
[conferência remota](BAL_WORKSPACE_DRAFTS_REMOTE.json) registra o candidato
final e a compatibilidade dos contratos nativos. A CI do commit anterior
33bf6b8 aprovou os nove jobs; essa observação não aprova o novo candidato.
[Observação por SHA](CI_33BF6B8_OBSERVATION.json).

Passaram36 testes unitários/API,13 cenários Auth reais distintos e22 identidades
de navegador por reuso qualificado. A rodada final de produção passou12/12,
com os seis novos propósitos em ambos motores;dez consumidores anteriores
inalterados foram conservados de rodadas diagnósticas. Tipos/lint passaram;
quatro larguras,axe e duas capturas de sucesso foram conferidos. O texto
compartilhado de retomada e as demais composições ainda terão revisão por
finalidade;isso não é aprovação visual integral.

A rodada completa de produção, instalação limpa, evolução legada e integração
continua sendo exigida na CI do próprio SHA publicado. Emulação/axe não são
homologação humana, assistiva ou física. A paridade integral das 66 composições
e 171 relações, os demais critérios D-B e os gates externos permanecem abertos.
Sonar foi adiado pelo responsável; PR7 permanece Draft, sem merge/produção.
