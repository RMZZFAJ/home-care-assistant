# D4.6 — fidelidade técnica dos dados do exemplar

Lote técnico validado localmente, iniciado sobre b1541df. O responsável priorizou
dados e funcionamento técnico; a nova aparência dos PDFs será feita posteriormente.
Este lote conserva fontes, cores e os elementos de composição existentes.
Não declara aprovação estética, PDF marcado ou tecnologia assistiva.

## Revisão e compatibilidade

Novas ações do servidor usam reserve_pdf_issuance_v7, sem parâmetro de revisão
escolhido pelo navegador. A RPC anterior e o default do banco continuam em V6,
para expansão compatível antes da publicação do consumidor. Mesma intenção
reusa o registro original entre as duas RPCs, inclusive uma reserva V6 retomada
pelo servidor novo. Arquivos ready não são renderizados novamente.

A migration20261108093000 amplia o guard de proveniência para V7, acrescenta
um trigger privado e a RPC Auth versionada. Não altera o evento, seu hash,
estoque ou aprovações operacionais. O trigger executa depois do congelamento
de sourceFacts e acrescenta documentFacts somente às reservas V7. Esse contexto
suplementar integra o snapshot privado da emissão e seus bytes assinados;
não é atribuído ao hash canônico original.

O banco obtém resoluções ENT e eventos de parcela COM até a versão selecionada,
com ID, autor preservado, instante, motivo e vínculo conhecido. Ausência de
vínculo ou nome permanece explícita. Não se infere uma parcela por valor/data
nem se consulta catálogo ou perfil atual para inventar autoria histórica.
O trigger não tem EXECUTE Auth/anon/serviço; a RPC nova mantém a autorização,
o lock da intenção e a revalidação do contrato anterior.

## Conteúdo técnico

- Compra e doação preservam a origem no título e nos metadados. BAL diferencia
  a primeira contagem da ficha, reconto formal e contexto de plantão não
  preservado. Primeira contagem da ficha não significa primeira da residência.
- REQ separa zero, decimal exato, desconhecimento, ausência de preenchimento
  e observação legada. Preserva a origem do horário e o atendimento por item.
  Observação de estoque não é pedido nem saldo oficial; algum aceite positivo
  não comprova satisfação integral da necessidade.
- ENT preserva nota/classificação de avaria e a quantidade da declaração
  divergente original. Cada resolução mostra evento, versão, autor, instante,
  motivo e quantidade, distinguindo recebimento complementar, devolução e falta.
- BAL mantém pareceres e aprovações de contagens anteriores identificados como
  históricos. Mostra grupos/condição da política preservada; não presume
  elegibilidade vigente onde o contexto não a comprova. Nome do cadastro em
  aprovação legada não é apresentado como nome histórico comprovado.
- COM distingue parcela informada, rejeitada e validada, com quantidades e
  autoria preservadas. Os eventos são vinculados pelo receiptId registrado.
  Geração do PDF não cria crédito de estoque nem valida uma chegada.

O gate independente de conteúdo confere fatos técnicos em seus grupos e não
aceita uma nota ou valor existente em outra linha como substituto. O idioma
pt-BR integra o arquivo V7; isso não equivale a uma estrutura completa de tags
ou aprovação com leitor de tela. A assinatura e TSA internas conservam seus
limites de confiança; não representam ICP-Brasil ou tempo de terceiro.

## Verificação e contraprovas

Dezesseis casos unitários distintos passaram, incluindo os seis consumidores
existentes de sourceFacts. Dezoito controles V4/V5/V6, capturados antes da
mudança, mantiveram bytes exatos. São controles do renderizador sem assinatura,
distintos dos exemplares reais abaixo. Cinco casos Auth distintos passaram,
com negativas de acesso, concorrência, replay entre revisões e corte por versão.
Uma fixture tentou mudar a precisão após criar histórico; a recusa foi
preservada e a unidade decimal passou a ser configurada antes do uso.
Preflight com rollback e preparo local152 passaram sem reset.

A primeira produção local terminou27 passes/3 falhas de navegação do teste REQ:
o teste tentava trocar paciente ainda dentro da rota vinculada ao documento
anterior. O fluxo agora abre a rota de destino antes de selecionar seu contexto,
preservando a guarda. A rodada dirigida de REQ/BAL passou6/6 nos três motores.
São30 casos distintos aprovados em coortes,36 resultados terminais/33 passes/
3 falhas anteriores. O reforço de vínculo semântico REQ altera instrumentação
de conferência, sem mudar os bytes desenhados. O guard de política malformada
e a distinção final de Subject histórico/documental passaram em testes dirigidos;
seus hashes e as diferenças entre coortes estão no recibo. Tipos e lint dos
12 fontes afetados passaram depois dessas alterações finais.

[Verificador independente](d4-fidelity-proof/verify.py) confere texto, associação
de eventos/parcelas, idioma, metadados, limites e rodapé, SHA-256 e PAdES-B-T
com pyHanko e a raiz interna pública de cada execução:14 exemplares reais de
12 rótulos lógicos aprovados, com duas raízes de teste. O corpus antecede somente
o ajuste final do Subject, comprovado por unidade; não é uma reprodução do
arquivo com esse novo metadado. Duas contraprovas mantêm os bytes assinados e
alteram expectativas: o V6 não satisfaz os novos fatos, e trocar a associação
missing/returned é recusado. O corpus publicado foi revalidado após a cópia.
Não há aprovação estética, PDF marcado, AT, dispositivo físico ou tempo externo.

Resultados, falhas preservadas, hashes e limites estão em
[PDF_FIDELITY_EVIDENCE.json](PDF_FIDELITY_EVIDENCE.json).

## Reconciliação remota e estado dos critérios

Local152/remoto152, histórico SQL152/152 e zero pendências. A cópia crítica
0648d0ac contém79 arquivos/11114941 bytes, foi verificada, restaurada em ambiente
isolado e recebeu o upgrade152. Foram conferidos151 conjuntos/FKs,33 objetos,
32 PDFs e o digest de uma emissão assinada. O tempo isolado de3,67s não comprova
RPO/RTO ou recuperação operacional D6. Compatibilidade preservou407 identidades
e grants; apenas o guard privado de origem foi ampliado, com duas funções novas.

A primeira pós-validação recusou duas projeções de monitoramento divergentes.
A investigação comprovou um HEARTBEAT_STALE de Preview escalado às10:26 UTC,
antes da aplicação CLI às10:28 UTC. As21 linhas antigas de histórico permanecem
exatas; o evento imutável reproduz o novo digest, e somente severity/version de
um incidente reproduzem o outro digest entre as três severidades permitidas.
Uma recuperação às10:34 foi separada. As149 demais projeções estáveis coincidem;
não se afirma igualdade integral das151 tabelas. Nenhum comparador foi relaxado
ou monitoramento silenciado. [Qualificação](PDF_FIDELITY_REMOTE_ACTIVITY.json).

Histórico, catálogo, Auth9/profiles7, Storage33, cron/Vault, grants, ausência de
locks/índices inválidos e marcador de runtime foram pós-validados. Default/RPC6
continuam preservados; a RPC7 exige Auth e o consumidor novo. Advisors conservam
os alertas anteriores; o acréscimo Auth153→154 é exatamente a RPC nova.
[Preflight](PDF_FIDELITY_REMOTE_PREFLIGHT.json),
[pós-check](PDF_FIDELITY_REMOTE_MIGRATIONS.json) e
[advisors](PDF_FIDELITY_REMOTE_ADVISORS.json).

C015/C036/C103/C104/C109 passam localmente; C-NEW-AC-019 reaproveita a evidência
de anexos com16 hashes inalterados e CI b1541df aprovada. Matriz38 PASS/
50 PARTIAL/17 NOT_STARTED, mantendo as29 colunas canônicas. Idioma e limites
avançam C111/C-NEW-AC-018 somente a parcial: leitura estruturada/alternativa
histórica, demais estados C105/C106 e tarefas humanas/AT/aparelhos continuam.
CI e Preview do novo SHA são gates próprios. D-B permanece ativa, PR7 Draft,
sem merge/promoção; Sonar adiado pelo responsável e produção NO-GO.
