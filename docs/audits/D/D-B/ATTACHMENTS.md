# Anexos: origem, recuperação e abandono

Implementação de C-AC-017/052/107. A reserva tem intenção estável; um envio
desconhecido não permite trocar os bytes dessa intenção. O arquivo selecionado
fica congelado no cliente e é confrontado com a impressão da origem no banco.
Só um recibo completo dessa origem/reserva permite limpar a preparação.

## Transporte e conteúdo

Novos envios aceitam até4 MiB,4194304 bytes, mais até32000 bytes de envelope.
Esse teto fica abaixo dos4,5 MB documentados para o corpo de uma Function da
[Vercel](https://vercel.com/docs/functions/limitations). O seletor informa4 MB
antes do envio; a API limita também o stream, mesmo sem Content-Length.
Arquivos históricos maiores continuam acessíveis. Não houve alteração do teto
dos arquivos já armazenados ou do bucket para apagá-los ou reduzir seu acesso.

JPEG/PNG/WebP passam pela normalização já existente: orientação, dimensão,
conversão para JPEG e retirada de metadados. PDFs mantêm páginas passivas, com
limites de complexidade/páginas e recusa de conteúdo ativo. Anotações ou
AcroForm são recusados com explicação; FreeText, Ink e valores de formulário
não são mais eliminados silenciosamente. O usuário deve conferir uma cópia
com esse conteúdo incorporado às páginas antes de enviá-la.

O original não é retido como objeto. Sua impressão/tamanho/MIME ficam
separados da impressão do derivado disponível. A interface explica a conversão
e a ausência de custódia do original. Histórico sem esses dados mantém origem
desconhecida; não há atestado retroativo ou hash do derivado chamado original.

## Persistência e autoridade

A preparação valida/sanitiza o arquivo e reserva uma identidade. O servidor
atestará a impressão somente depois de ler esses bytes. A declaração do
navegador, isoladamente, não aparece como origem verificada, não inicia upload
e não permite promover um arquivo pela recuperação.

Cada envio recebe um registro privado. O upload não sobrescreve objetos. Em
erro ambíguo, a recuperação baixa o objeto e confronta o hash congelado;
divergência não vira confirmação. A finalização usa RPC exclusiva do serviço,
revalida o ator/acesso e exige a impressão atestada e o objeto correspondente.
O vínculo documental existente é idempotente: um evento attachment.bound.

A API consulta pela mesma intenção e recupera por comando explícito. O painel
congela a escolha até o recibo e pode recuperar um objeto já enviado depois de
uma recarga, sem exigir novamente os bytes locais. Se o upload não concluiu,
a retomada exige selecionar o mesmo original e conferir sua impressão.

As duas tabelas privadas usam RLS sem grants diretos para anon, Auth ou
serviço. Quatro RPCs de preparação/leitura/início/abandono usam Auth vigente;
atestado da origem e recibo do transporte são exclusivos do serviço. O helper
da política do Storage só concede INSERT dentro desse ciclo e com a mesma
autoridade atual do vínculo. Contexto, revogação e titularidade são conferidos
no banco; IDs/flags do cliente não concedem permissão.

## Abandono e limites deliberados

Abandono exige ação explícita, sem escolha destrutiva preselecionada. A RPC
serializa com o início do upload e com a inserção de metadados do Storage.
Só uma reserva incompleta, sem objeto e sem envio ativo ou resultado pendente,
pode passar a abandoned. Repetir o comando devolve o mesmo recibo sem outro
evento. As linhas, impressões e trilha permanecem; a vaga é liberada.

Ready, arquivo armazenado ou resultado incerto impedem abandono. Nem a idade
do registro nem a ausência momentânea de objeto provam que um envio terminou.
Não há TTL, expiração, limpeza de bucket ou descarte de documento oficial.
Dez abandonos formais não impedem a próxima reserva; dez anexos confirmados
continuam sujeitos ao teto de negócio. Reservas legadas sem rastreamento não
recebem uma prova de ausência inventada para permitir abandono.

Falha do recibo mantém a mesma intenção. Um envio cujo processo desapareceu
sem resultado verificável exige recuperação com o mesmo arquivo; ele não é
liberado por relógio. A política de retenção/limpeza e a recuperação operacional
independente continuam gates próprios, sem suposição de D6 aprovado.

## Evidência e fechamento

Onze unitários, nove casos Auth/Storage reais, consumidor anterior de rascunho
e SQL de privilégios passaram. Os dois preflights fizeram rollback; o preparo
local aplicou149/150 sem reset. Diagnóstico5/5 é separado do aceite.

Trinta casos distintos passaram em produção, em cinco grupos qualificados;
não é uma única rodada de trinta. Os grupos repetem os consumidores afetados
e conservam hashes/fontes e falhas intermediárias. O timeout nativo30s passou
nos três navegadores. A jornada V4 antiga recebeu o novo campo da política
na fixture e a mensagem do fim da observação, sem reduzir suas verificações.
Um caso ENT excedeu o orçamento total30s antes da tela interativa; o reensaio
Chromium passou com90s totais para preparo/consultas, mantendo15s por ação.
Não se afirma correção de produto para esse ajuste do instrumento.

Remoto150/local150, sem pendências, após cópia crítica fresca e upgrade isolado.
Foram preservados399 contratos de função anteriores e seus grants; somente
reserve/finalize mudaram os corpos previstos. A política de INSERT do Storage
também foi confrontada. Os149 conjuntos anteriores, Auth9/profiles7, Storage33,
cron e Vault ficaram preservados nas projeções/qualificações registradas.
O BD foi restaurado em isolamento; os33 objetos/32 PDFs e hash de uma emissão
ready foram conferidos nos arquivos. Isso não é retomada do serviço Storage,
RPO/RTO ou recuperação independente de chaves/computador em D6.

[Evidência](ATTACHMENTS_EVIDENCE.json),
[preflight](ATTACHMENTS_REMOTE_PREFLIGHT.json),
[pós-check](ATTACHMENTS_REMOTE_MIGRATIONS.json) e
[advisors](ATTACHMENTS_REMOTE_ADVISORS.json) registram resultados e limites.
CI precisa aprovar o SHA publicado. AT, pessoas e aparelhos físicos não são
comprovados por emulação ou screenshots. Sem promoção ou transporte externo.
