# Exemplos que devem reprovar o defeito

Roteiros de design, **PLANNED_NOT_EXECUTED**. Dados fictícios, transporte
controlado primeiro e nova autorização D antes de qualquer execução.

## ENT pessoal — C-AC-010/048 e C7-AC-010

FAMILY20/TEAM10/TRANSIT0, ENT5 expedida para Sheila: read-back FAMILY15,
TEAM10, TRANSIT5. Juliana, ativa mas terceira, tenta receive; negar sem novo
aceite/evento/crédito. Admin local/global também não aceitam por Sheila.
Sheila aceita3 e ressalva2: TEAM13/TRANSIT2, `received_by=Sheila`, versão e
motivo corretos. Retry e duas chamadas concorrentes não duplicam crédito.
Revogação antes do commit nega sem efeito; pendência ganha encaminhamento
legítimo, nunca assinatura substituta. Móvel mostra todas as linhas e foco.

## BAL facultativo — C7-AC-003 e C-AC-054/057

Juliana designada conta18, referência20, revisão facultativa. Dez autosaves
não geram protocolo/documento/ajuste. Confirmação oficial mostra efeito;
aplicação eventual é movimento BAL identificado, não consumo. Sem revisão
iniciada, não há pendência universal de aprovação. Família pode iniciar
análise/reconto; Sheila recebe nova atribuição e conta17. Read-back conserva
Juliana/contagem1 e Sheila/contagem2; revisão1 não aprova2. Reprovar fila
obrigatória universal e supervisor aprovando própria contagem no legado.

## P02 por SCI-ID — C-NEW-AC-003 e C7-AC-012

Fixture depende da tabela humana aprovada. Para SCI-001–005, testar modo
permitido/proibido, elegível na emissão, vinculado depois e revogado.
Cabeçalho não prova leitura; cancelar diálogo não cria ciência; tácita não
cria acesso; reabertura não duplica ciência válida. Preferência muda futuro,
não passado. Consultar modo/ator/instante/versão/política e origem por via
independente. `scienceRequired=false` não declara ciência de todas as pessoas.
Até as respostas, status BLOCKED_BY_OWNER_DECISION.

## Emissão assinada — C-NEW-AC-020 e C7-AC-011

Ficha v3/hashH. IntençãoI1 gera E1, solicitante Ana, instanteT1, assinatura
técnica do sistema e bytesB1/digestD1. Perder resposta e recuperarI1 devolve
E1. Novo pedidoI2 gera E2/T2/assinatura própria; D2 pode diferir deD1.
BaixarE1 amanhã retorna B1 idêntico. Alterar ressalva ou copiar QR deE1 a
outro PDF reprova comparação/assinatura. Validador independente confere
bytes/cadeia/estado temporal; cadeia desconhecida não ganha confiança
universal. Falha antes de ready não anuncia emissão válida. PDF/QR/página
pública sem IP/GPS/máquina; solicitante não é signatário pessoal.
Leitor/certificado/TSA reais e custo são gates P09/D6, não homologação da C.

## Rascunho privado — C-NEW-AC-014 e C7-AC-004

Ana salva REQ revisão5 emA. B amanhã recupera; BAL não mostra REQ. A salva6; B
tenta expected5 e recebe409 sem perder texto. Comparação permite nova revisão
explícita. Nova criaçãoREQ oferece continuar ou descartar/iniciar; dois alvos
de divergênciaENT não se apagam. Descarte confirmado elimina só draft ativo;
ENT oficial, anexo ready e eventos anteriores permanecem. Nenhum save gera
protocolo/ciência/PDF/ledger. Corrida descarte/finalização recupera um único
ato. P08 define retenção; não prometer eliminar backups.

## Revogação e persistência parcial — C-AC-068/077 e C7-AC-005

Duas conexões Auth HTTP independentes e barreira de lock reproduzem espera.
Revogação confirma antes da liberação; depois negar nova escrita e conferir
zero movimento/evento. Barreira persistente oferece retorno seguro sem dados
protegidos ou loop. Em variante distinta, commit confirma e resposta se perde:
consultar mesma intenção e mostrar confirmado, nunca não registrado por
ausência de resposta. ENT revise+submit: revisãoq1→q2 confirma, submit falha
por saldo; informar revisão salva/versão e expedição recusada. Read-back
conserva revisão sem expedição. COM/BAL têm variantes próprias; fonteB4 não é
prova anterior de todos os ramos.

## Devolução, transferência e correção — C7-AC-010

TEAM10/FAMILY20; devolução5 real via ENT reversa: expediçãoTEAM5/TRANSIT5;
aceite3 leva FAMILY23/TRANSIT2. Contraparte Ana concorda com relato, mas se
Bruno recebeu só Bruno confirma físico. Compra validada continua COM e consumo
confirmado débito próprio. Correção sem deslocamento exige compensação
referenciada; falsa transferência é recusada. Comparar UI antiga/ nova com
inativo, cancelamento/consumo anterior e retry; não remover antes da
equivalência demonstrada.

## PWA/push real — C-NEW-AC-001/002

ContaA em celular/tablet, contaB depois no mesmo aparelho, permissão negada e
subscription410. Gesto instala/ativa quando disponível; recusa mantém tarefas
internas. Cada aparelho recebe só aviso genérico autorizado; saída/ revogação
não transfere aviso aB. Clique autentica/revalida sem ato material.
Atualização conserva edição. No iPhone testar instalação/permissão reais;
emulação não satisfazD6. Conferir subscriptions/evento/tentativa, lockscreen e
tarefa no app; push/accepted/read não criam ciência ou recebimento.

## Mecanismos de scheduler — C-AC-001/049/073/086

001:101 patient_settings de lembretes legados; até três rodadas limitadas
alcançam todos sem duplicar tipo/período. 049:25 pacientes REQ cancelada mais
alvo26; também100 terminais em um paciente; válidos avançam sem lembrete a
cancelado. 073: política malformada não produz silêncio saudável nem impede
recuperação autorizada de válidos. 086: períodoD→D+1 segue OPS-01 sem fingir
presença/contagem. Consultar reminders/lifecycle/health por alvo. Cursor
correto de bal_regimes é controle distinto, não prova dos outros mecanismos.
Rollback conserva posição e não duplica efeitos.

## PDF vazio, NULL e axe — C-AC-119/120/121

Controle PDF tem fatos esperados por tipo/estado. Mutante remove todo texto
desenhado, mantendo páginas/metadados/QR; pode ter assinatura válida de
conteúdo vazio. Extração independente e geometria/raster reprovam ausência de
produto/quantidade/estado/ator; controle íntegro passa. Tamanho/digest por si
só não detectam defeito semântico.

Saldo positivo esperado3: existe3 passa; existe2, linha ausente e valorNULL
falham. Exigir existência quando contrato pede linha e usar
`IS DISTINCT FROM`; `<>` sozinho ou coalesce0 não bastam. Zero legítimo tem
caso separado conforme representação. Isso corrige predicado, sem alegar que a
suíte inteira aceitaria qualquer remoção de ledger.

No axe, botão sem nome reprova. Color-contrast incomplete sem violations gera
pendência por regra/estado/superfície; não descartar nem converter em violação
automática. AT/foco/reflow/tarefa humana têm aceite próprio. CI de outro SHA
não fecha esse gate.
