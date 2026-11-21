# Formulários, identidade do vínculo e nome curto

Incremento de C-AC-026, C-AC-030 e C-AC-031, baseado no SHA
`f05754d581beaa6da410610d35982ca003e53a65`. Implementado e comprovado localmente;
local151/remoto151 reconciliados. CI do novo SHA e gates humanos permanecem
separados. A matriz mantém as 29 colunas canônicas originais.

## Validação contextual

REQ informa em português o limite de mil caracteres por observação e exige
nome para cada item extra. O texto inválido permanece no formulário. A
validação da etapa e a validação completa usam as mesmas mensagens; a revisão
com erro escolhe a etapa correspondente. O foco ocorre depois de renderizar
o campo, sem temporizador ou busca global pelo primeiro input da página.
Campos inválidos têm descrição vinculada e resumo em alerta. Seus nomes
acessíveis ficam estáveis quando a mensagem aparece.

Apresentações validam material, nome, código textual e fator antes de abrir
a revisão. O primeiro campo inválido recebe foco na ordem visual. Os zeros
iniciais, textos e quantidades permanecem preenchidos; a mesma validação de
quantidade exata continua responsável por precisão e arredondamento. A
confirmação da apresentação permanece separada da revisão e não movimenta
estoque.

## Identidade e intenções

Editar uma função mantém a pessoa do vínculo em leitura. Escolher outra
conta continua no fluxo explícito de vincular conta. O consumidor existente
de desligamento consulta consequências, oferece revisão própria e preserva
a revogação urgente quando essa consulta falha. A autoridade final permanece
na API e na RPC, com contexto vigente e proteção do último administrador.

Nome curto possui três ações explícitas:

| Ação | Comando | Resultado |
| --- | --- | --- |
| Manter | Omite `patientShortName` | Conserva o valor atual |
| Alterar | Texto aparado, de 1 a 60 caracteres | Substitui o nome curto |
| Remover | `patientShortName: null` | Volta ao nome do cadastro |

Vazio ou espaços na ação alterar exigem correção ou seleção de remover.
Não são interpretados silenciosamente como manutenção ou remoção. A API
também recusa nome não textual, vazio, apenas espaços, com espaços periféricos
ou maior que 60 caracteres enviado diretamente. A interface apara o texto
antes de criar a intenção. Propostas globais continuam exigindo aprovação
local distinta; a comparação descreve explicitamente o uso do nome do cadastro.

Depois de um resultado confirmado, os botões de edição aguardam a consulta
da versão vigente antes de permitir nova edição. Isso evita preparar uma
alteração com a versão anterior durante a atualização assíncrona. Falha de
consulta posterior continua diferente de falha do comando confirmado.

## Migration e limites

Migration 151, `20261108023830_phase_d3_explicit_short_name_removal.sql`, amplia
três corpos de função existentes, preservando assinatura, grants, autorização,
CAS e replay. Não cria tabela ou política; não reescreve propostas, fatos ou
história. JSON null passa pelas duas validações herdadas. Omissão conserva o
comportamento do cliente anterior, permitindo atualização compatível do schema.

As provas dirigidas incluem Auth real, negativas sem efeito, replay concorrente,
comparação de dois pacientes e consumidores reais nos três navegadores. Axe,
teclado, foco e geometria automatizados não equivalem a teste humano de leitor
de tela, aparelho físico ou homologação D-C. O novo SHA exige sua própria CI.
PR #7 permanece Draft, sem merge ou liberação operacional. Sonar continua
adiado por decisão do responsável.

## Provas e reconciliação

Passaram 41 unitários, três casos distintos com Auth real e 21 casos distintos
de produção nos três navegadores, compostos por três coortes qualificadas.
Os seis casos de REQ/apresentação conservam os hashes dos seus consumidores.
Os 15 casos finais repetem política, comparação, recuperação e vínculos após
as correções. Não se declara uma rodada única de 21 passes. Houve 37 resultados
terminais de produção: 35 passes e duas falhas anteriores preservadas. Nove
execuções de diagnóstico têm cinco passes e quatro falhas, sem valor de aceite.

A reinicialização do computador interrompeu a primeira rodada e a primeira
captura. A stack original foi retomada sem reset; a captura incompleta não foi
promovida a backup. A falha móvel no login passou sem alterar fontes/timeouts.
Um teste legado excedeu somente seu orçamento total de 30 segundos durante
auditorias WebKit; agora tem 60 segundos para fixture, Auth, quatro auditorias
e read-back, mantendo 15 segundos por ação/asserção e todas as verificações.

A inspeção visual detectou campos cortados em 320 px. O teste mede agora os
próprios controles, além de axe e largura da página. O primeiro ajuste de
dimensionamento causou sobreposição e foi recusado por axe. O ajuste final
limita o tamanho somente no formulário de política, preservando a composição
Fluent. As capturas finais foram inspecionadas; foco no botão de origem após
salvar foi comprovado nos três projetos.

A cópia crítica e5c5148c tem 79 arquivos e 11059964 bytes. Foi restaurada em BD
isolado, com 151 conjuntos/FKs, 33 objetos, 32 PDFs e hash de uma emissão ready;
o upgrade151 passou. Esse probe de 2,911 segundos não aprova Storage operacional,
independência de chave/computador, RPO/RTO ou D6.

Duas pré-validações recusaram atividade posterior aos pontos de backup; outra
captura recusou alterações de incidentes/histórico durante sua execução. Todas
foram preservadas. A pré-validação aceita conservou a cópia válida com menos
de uma hora e registrou separadamente a atividade posterior. Exigiu schema
atual, 150 SQLs históricos e Storage idênticos à captura, sem remoção de linhas.
A preservação da migration compara o estado imediatamente anterior ao DDL com
o posterior; não afirma que os dados ficaram parados desde o backup.

407 identidades de função/grants foram preservadas, com exatamente três corpos
alterados. Histórico151/151, zero pendências, 151 projeções anteriores ao DDL,
Auth9/profiles7, Storage33 e cron/Vault foram pós-validados. Catálogo igual salvo
a flag local conhecida da condição finita, com predicado exato. Advisors não
tiveram aumento; nenhum aviso anterior foi suprimido ou tratado como aprovado.

[Evidência e hashes](FIELD_VALIDATION_EVIDENCE.json),
[preflight](FIELD_VALIDATION_REMOTE_PREFLIGHT.json),
[pós-validação](FIELD_VALIDATION_REMOTE_MIGRATIONS.json),
[advisors](FIELD_VALIDATION_REMOTE_ADVISORS.json) e
[CI da base f05754d](CI_F05754D_OBSERVATION.json).
