# Recuperação dos preenchimentos operacionais da COM

Incremento D3.33, base d52490d. Aprovação, aquisição e chegada da COM passam a
usar o núcleo de rascunhos privados existente. A recuperação contextual dos
demais formulários continua pendente; D-B-AC-001 permanece parcial.
[Fontes e resultados](COM_ACTION_DRAFTS_VALIDATION.json),
[reconciliação remota](COM_ACTION_DRAFTS_REMOTE.json).

## Comportamento implementado

Cada preenchimento pertence ao usuário, paciente, COM e operação selecionada.
Os três propósitos têm slots e etapas distintos. Salvar preserva texto decimal
incompleto, motivo, materiais e versão de referência, sem aprovar, adquirir,
receber, emitir outro documento ou movimentar estoque. Outra sessão da mesma
pessoa oferece retomada explícita; outra pessoa não recebe esse conteúdo.

O formulário continua usando a revisão e confirmação operacional existentes.
Antes da revisão, o preenchimento privado é salvo por CAS. A confirmação passa
pela RPC transacional existente, vinculando a revisão privada e a versão
documental. O propósito salvo precisa corresponder ao ato confirmado. A mesma
chave recupera um único resultado; outra chave não consome novamente o rascunho.
As permissões são conferidas no servidor, inclusive depois da espera pelo lock.

Referência obsoleta bloqueia a revisão até uma comparação explícita. Valores
permanecem preservados. Se um material da referência privada não existe mais
na ficha vigente, seu valor é mostrado e impede a adoção da nova referência
até uma decisão explícita de retirá-lo do preenchimento privado. Essa retirada
não altera o documento ou estoque. Os demais valores permanecem iguais.

Após confirmação, o slot conserva o resultado consumido para recuperação.
Ao reabrir uma operação parcial, o usuário pode consultar o resultado e
reconhecê-lo antes de começar o próximo preenchimento vazio. Isso não envia
outro ato documental. As conferências ENT anteriores continuam no mesmo núcleo.
Não há salvamento ou replay de operação oficial por simples abertura ou retorno
da conexão. Nenhum payload privado vai para cache público ou logs.

## Verificação

Dezenove casos unitários/API e23 cenários distintos com Auth real aprovados.
Incluem escopo, etapa, conteúdo incompleto, isolamento, três slots, CAS
concorrente, descarte próprio, propósito/alvo/versão trocados, revogação sob
lock observado, consumo único e recuperação. Aprovação e aquisição não creditam
estoque; a chegada administrativa validada gera somente o crédito esperado.
Regressões anteriores de criação/revisão/conferência ENT/BAL permanecem aprovadas.

Dez cenários distintos Chromium/WebKit aprovados, com reuso qualificado por
fonte e consumidor: três operações entre sessões Auth, decimal incompleto,
resposta perdida e mesmo payload/chave na recuperação, próximo preenchimento
parcial sem duplicação, referência obsoleta, decisão sobre material ausente,
chegada e conferência de parcela COM, encerramento/PDFs distintos e recuperação
ENT após200 inválido/403. Axe cobre formulários e comparação. Build/tipos, lint
dirigido e proteção das84 migrations históricas aprovados. As repetições não
inflam o número de casos distintos.

Contraprovas preservadas: o contrato antigo recusava COM/receive, agora previsto
expressamente; sua negativa foi substituída por COM/divergence e ENT/approve,
sem reduzir a validação. Um oráculo de estoque comparava textos2/2.000000;
agora compara o decimal exatamente no banco. A simulação de resposta perdida
usava PATCH; foi corrigida para o POST efetivo e passou a comprovar duas
tentativas idênticas, com um único efeito. Erro de parentização em preflight
somente de leitura foi corrigido antes de qualquer aplicação.

## Banco remoto e limites

Migration166:20261109122657. Pré-validação confirmou165 versões, nenhum rascunho
incompatível, lock aguardando ou transação ociosa antiga. Os quatro corpos
anteriores coincidiam com o baseline histórico. Dry-run listou somente a nova
migration, seeds=[] e roles=[]. Aplicação oficial usou perfil/destino fixados,
sem reset, fixtures remotas, Auth/Vault, integração externa ou backup redundante.

Pós-validação: local166/remoto166, última20261109122657, digest ordenado igual,
quatro corpos novos iguais ao candidato e grants conferidos. Anon/service_role
não executam commit; authenticated executa a RPC e não lê diretamente a tabela
privada. Achados de segurança iguais após excluir apenas observed_at; avisos
preexistentes continuam registrados, sem aprovação global de segurança.

CI d52490d aprovou Windows/Ubuntu/banco; browsers ainda em andamento na consulta.
Instalação limpa, evolução legada e integração completas do novo SHA continuam
gates da sua CI. Preview não equivale a homologação humana, assistiva ou física.
Paridade integral de UI, outros formulários contextuais,66/171 e D-C/D6 seguem
pendentes. Sonar adiado, PR7 Draft, sem produção ou merge. Assinatura, backup,
monitoramento e provedores não recebem aprovação adicional por este incremento.
