# D3.49 — continuidade integrada dos formulários

Levantamento inicial do HEAD fde4e61 e fontes deste incremento:49 consumidores,
51 tags form,mais os controladores privados sem tag própria. O
[inventário](FORM_CONTINUITY_INVENTORY.csv) registra classificação por fonte,
persistência existente,lacuna e hash LF. A presença de hook não comprova o
fluxo completo. Não é aceite das66 composições/171 relações nem inventário
exaustivo de cada ação onclick,modal,subestado ou variante.

14 consumidores já usam o controlador privado;dois formulários delegam a ele
no pai e a preparação global tem persistência própria. Seis consumidores são
consultas/verificação;cinco atravessam fronteiras de Auth/segredos. Senha,OTP,
MFA e capacidade de convite não entram em rascunho comum. Arquivo ainda não
enviado não passa a existir em outro aparelho por salvar metadados.

## Lacunas executáveis localizadas

- Agenda:edição incompleta ainda é local. Criar,alterar e decidir precisam de
  save privado,CAS,retomada entre sessões e consumo atômico na conclusão.
- Andamentos:texto não publicado e pacote ficam em sessionStorage;falta save
  privado no servidor e retomada em outra sessão,sem publicar automaticamente.
- Contagem de inventário:recurso compartilhado e linhas salvas são nativos;
  conferir campos ainda não salvos,versões e resultado incerto sem substituí-lo
  por simulação ou confundi-lo com BAL.
- Cadastros,apresentações,administração e campos comuns do perfil:concluir a
  revisão dos consumidores e implementar lacunas aplicáveis. Segredos e
  consultas têm contratos diferentes;nenhuma dispensa genérica foi declarada.

Essas tarefas continuam com Codex. Critérios amplos e estimativa visual não
foram promovidos. Estimativa editorial de recuperação revista90→85% após
ampliar a identificação de lacunas;formulários visuais≈90%,globalvisual≈60%.

## Correção efetiva deste lote:confirmação da agenda

Atualização posterior D3.50:as preparações privadas de Andamentos foram
[implementadas](PROGRESS_NOTE_DRAFTS.md). O inventário acompanha esse consumidor
e os hashes atuais;os números e a validação D3.49 acima são históricos. Agenda
incompleta,contagens e demais lacunas continuam pendentes. Essa conclusão de
recurso não aprova todas as composições ou o critério amplo de recuperação.

A intenção nativa antes existia somente em pendingRef. Agora o pacote exato
fica em sessionStorage por conta/paciente antes do POST. Recarregar não envia.
GET /api/schedules/confirmation consulta exclusivamente o diário nativo do
ator,sem executar comando. Sua identidade,comando,versão e alvo são conferidos
antes de remover a referência. Resposta200 divergente e envelope local de
outra intenção bloqueiam limpeza/reenvio. Reconsulta do mesmo pacote conserva
os bytes originais do envelope,sem reserialização desnecessária.

Consulta sem resultado não prova rejeição:oferece somente reenvio explícito
do pacote/chave originais. Recusa recebida depois de resultado incerto conserva
a tentativa. Resultado obsoleto registrado é apresentado como encerramento,
sem alegar aprovação. Perda de acesso oculta os dados e mantém recuperação.
Resultado próprio existente admite perda de escrita e paciente inativo sob
vínculo vivo;isso não libera novos atos. O motor schedule_command não mudou.

O painel canônico funciona também quando já não há leitura operacional da
agenda. Nome/versão/anotações preservados têm resumo em leitura;teclado,erros e
feedback usam os componentes existentes. Não há cache privado,envio offline,
serviço externo,novo papel ou integração externa ativada.

Regressões,contraprovas,metadados remotos e limites estão registrados em
[validação](FORM_CONTINUITY_VALIDATION.json). CI própria do SHA publicado,
instalação limpa/legada e integração integral continuam gates. PR7 Draft,
Sonar adiado,produção NO-GO,meta ativa.

## Atualização posterior D3.51

Novos tipos e novas programações agora têm preparação privada,CAS,retomada
entre sessões e consumo nativo atômico. A correção active=false altera apenas
a criação do tipo no motor;outros atos/dependências permanecem iguais. A
recuperação própria distingue chave/revisão/tipo avançado de ausência incerta.
Alterações e decisões existentes continuam pendentes;inventário49/51 e
estimativas globais não foram promovidos. [Incremento](SCHEDULE_CREATION_DRAFTS.md).

## Atualização D3.54

As oito preparações sobre recursos existentes da agenda estão implementadas
e qualificadas localmente/remotamente. Incluem aprovação com motivo opcional,
campos incompletos,CAS,outra sessão,histórico,resultado incerto e resolução
explícita sem replay. Inventário atual:50 consumidores/52 tags form,com hashes
atuais e sem fonte form fora do levantamento. Contagens,cadastros,administração,
perfil e paridade66/171 continuam pendentes com Codex;nenhuma dispensa genérica.
Recuperação estimada≈90%,visual≈60%,formulários≈90%. CI própria e gates externos
seguem separados. [Incremento](SCHEDULE_RESOURCE_DRAFTS.md).

## Atualização D3.55

A classificação do inventory-console foi corrigida:legado sem importador UI,
escrita aposentada410,consulta histórica preservada. Não é fluxo de contagem
a reconstruir. O levantamento conserva50 fontes/52 tags,incluindo esse legado
e os controladores delegados;isso não representa50 consumidores ativos.
Contagens reais usam BAL agendado ou sem regime. O transporte da tentativa
agendada recebeu validação e proteção de cópia,mas a continuidade sob mudança
de referência ainda é parcial. [Incremento](BAL_COUNT_RECOVERY.md).
