# Rascunho privado e não oficial

P08/P12 aprovam continuidade entre dias/aparelhos. O AS_IS mistura REQ local
de 24h e drafts documentais COM/ENT/BAL; a D deverá migrar/adaptar sem tratar
essa existência como cumprimento do novo contrato.

## Identidade, acesso e retomada

Criação tem chave única `(usuário, paciente, tipo, criação)` e no máximo um
rascunho ativo por tipo. REQ não procura BAL. Aprovação, divergência, entrega
ou reconto de documentos diferentes têm chave
`(usuário, paciente, tipo de ação, alvo, intenção)`; não criam outra intenção
só ao reabrir a mesma tarefa. O servidor determina titular/vínculo; outro
familiar não lê o preenchimento privado por possuir papel administrativo.
Suporte usa procedimento restrito e justificado, nunca uma lista pública de
rascunhos.

Ao iniciar ficha do mesmo tipo, apresentar paciente/tipo, itens básicos,
data/hora/fuso e salvamento confirmado. Ações: **Continuar rascunho** e
**Descartar e começar nova**. Descarte exige confirmação; nenhuma opção
destrutiva vem marcada. Contextos diferentes permanecem independentes. Um
resumo contextual evita lista interminável de rascunhos de criação.

## Persistência e conflito

Save tipado parcial retorna revisão e instante do servidor; só então mostrar
“Salvo no servidor”. Offline ou resposta perdida mostra estado ainda não
confirmado e consulta a mesma tentativa. Dois aparelhos na revisão 5: A salva
6; B recebe conflito, conserva edição e compara 5/6 antes de salvar 7. Não
usar última escrita vence para pessoa, quantidade, aceite ou decisão.

Retomada revalida catálogo, alvo, permissão, ledger, plantão e versões.
Quantidade observada de ontem mantém sua data; não vira contagem de hoje. Sem
vínculo, bloquear acesso/save/finalização e retirar conteúdo protegido da
tela; outro paciente ainda autorizado continua acessível pelo retorno seguro.

## Limite oficial

Autosave não gera protocolo, ficha emitida, versão documental oficial,
ciência, envio externo, crédito/débito ou evento oficial de ledger. Salvar
rascunho e emitir são comandos diferentes. Ao confirmar ato oficial, usar
intenção estável/versão atual; depois associar rascunho consumido ao ID real.
Se a resposta se perder, consultar o resultado antes de permitir descartar ou
emitir novamente. Falha na marcação de consumido não desfaz o ato confirmado
nem autoriza duplicação.

Antes de reutilizar o draft documental AS_IS, demonstrar que ele não expõe
pendência/versão oficial a terceiros nem consome protocolo. Onde houver essa
exposição, migrar para objeto privado separado e manter referência histórica
do objeto anterior; não apagar sua história por chamá-lo de rascunho.

## Descarte e conservação

Descartar remove o conteúdo ativo elegível e impede retomada comum. Não apaga
ENT emitida, anexo oficial pronto, evento de segurança necessário, backup sob
retenção ou preservação por disputa. Logs mínimos de acesso/save podem ter
retenção própria, sem conteúdo operacional completo a cada tecla. P08 definirá
categorias, prazos, bases e suspensão de descarte; nenhuma promessa de
eliminar todos os vestígios é feita.

Não há TTL automático de 90/180 dias aprovado. Cópias locais confirmadas são
limpas no logout/saída pertinente, com tratamento de edição incerta. Backup
conserva e elimina conforme classe aprovada; exclusão seletiva do ativo não
reescreve cópias históricas imutáveis. Nova necessidade de retenção técnica
vai ao responsável, não a um cron implícito.

Aceites discriminantes: REQ em A recuperada em B amanhã; BAL não mostra REQ;
conflito 5→6 não perde texto; descarte concorrente com finalização recupera um
único ato; nenhum documento/ledger/PDF/ciência em dez saves; revogado não
consulta; outro usuário/paciente não herda o conteúdo.
