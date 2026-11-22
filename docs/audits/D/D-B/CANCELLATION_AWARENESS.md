# DOC-B.4 — Ciência própria do cancelamento

Primeiro resultado de DOC-B.4 implementado e conferido localmente.
Não fecha o ponto nem o
complemento documental. Vínculos de ficha complementar e conferência documental
do conjunto continuam pendentes. DOC-B permanece estimado75%;105 critérios
originais,18 UI e visual85% não mudaram.

## Ato preservado e autorização

A ciência da emissão continua em requisition_science_events. A nova confirmação
é um evento próprio, ligado ao ID e à versão do cancelamento preservado. Não
altera itens, notas, material, ciências anteriores, estoque ou decisões de
recebimento. O status cancelado permanece; a cronologia e a autoria evoluem por
novo evento, com o gravador e a fila existentes. Não cria tabela, papel ou
permissão por seleção da interface.

A consulta usa a autorização completa de operational_document. A confirmação
exige habilitação familiar segundo a política vigente de ciência do paciente,
leitura atual e identidade do cancelamento. Revalida após a espera e após o
registro. O mesmo evento por pessoa tem um único ato, inclusive em concorrência
com chaves diferentes. A chave efetivamente registrada não aceita outro alvo.
Recuperar a chave própria após perder a capacidade de ciência exige conservar
leitura; perder leitura impede consultar e recuperar.

O cancelamento precisa estar preservado como req.status, com.cancel, ent.cancel,
ent.consent_cancel ou bal.cancel com status cancelado e protocolo emitido.
Retirada de preparação bilateral não é cancelamento de ficha expedida. Fonte
histórica ausente permanece indisponível; não se inventa ciência nem data.

## Interface e recuperação

As páginas de REQ e das fichas COM/ENT/BAL exibem um bloco próprio quando a
ficha está cancelada. Mostra o ato preservado, a primeira ciência familiar e a
ciência pessoal, sem confundir uma com a outra. Leitura não confirma. A ação
exige escolha explícita e o paciente correto selecionado; falha de consulta
bloqueia a confirmação. Há nova consulta sem escrita.

A tentativa usa somente referência do evento e chave pessoal neste aparelho.
Perda de resposta mantém a referência; consulta e recarga recuperam o ato por
pessoa/cancelamento, sem replay automático. Referência local corrompida não é
enviada. Nenhum rascunho comum foi acrescentado.

## Verificações locais

Nove cenários Auth passaram na rodada final: quatro tipos de ficha,
preservação do material/SCI/estoque, concorrência, origem adulterada, leitura e
ciência revogadas, contexto externo, grants fechados, espera real e perda tardia
de autorização. O teste tardio comprova rollback de evento, versão e avisos.
Seis testes de contrato/API passaram, incluindo estados contraditórios,
referências/ator de outra pessoa e campos forjados recusados antes de Auth.

As primeiras fixtures tentaram cancelar REQ por familiar sem req.review e usar
adminB sem seu contexto autorizado. Foram corrigidas, sem mudar permissões do
produto. A contraprova concorrente passou a consultar a chave de fato vencedora.
A barreira de espera ganhou somente o alvo/RPC explícitos deste caso. As falhas
foram preservadas.
Tipos/lint dos fontes alterados passaram. A primeira rodada visual qualificou
cinco casos e falhou na composição COM móvel por rolagem herdada após resize.
A captura mostrou um controle anterior parcialmente sob o cabeçalho fixo.
A nova rodada usa auditFromTop, já padronizado, com todas as regras axe, e
verifica foco/alvo real separadamente. A segunda rodada teve três aprovações e
três falhas: a consulta do pai podia substituir a falha da ação; a ativação por
tecla podia coincidir com uma atualização; a checagem WebKit encontrou contraste
em texto responsivo oculto. O estado incerto agora pausa a reconsulta implícita
até consulta explícita; a recusa401/403 limpa o bloco. O teste aguarda o estilo
responsivo, usa cliques com espera de ação e mantém todas as regras. Nova rodada
integrada final teve seis aprovações, sem aumento de prazos.

Os exemplares nativos REQ/COM do Chromium foram gerados pelo pipeline assinado;
suas seis páginas foram inspecionadas. A ciência original da REQ permanece em
seção própria, e as novas ciências do cancelamento aparecem na cronologia com
seus autores e instantes. A representação estruturada do cancelamento e os
vínculos complementares continuam na integração documental de DOC-B.4.

## Banco e gates

Migrations20261111232545/20261112001835 reconciliadas no remoto220, sem reset.
Auxiliar privada e duas RPCs autenticadas, search_path vazio e grants fechados.
Ordem de lock alinhada à SCI existente e perda de autoridade após espera real
comprovada. A requisição interna obrigatória persiste mesmo com canais vazios e
preferência interna desligada; aviso não fabrica SCI. Sem mudança dos canais
externos, tabela nova, Auth/fixtures remotos, produção ou ativação externa.
Preflight218, funções/grants220 iguais (somente CRLF normalizado), dry-run vazio.
[Reconciliação e alertas](MIGRATIONS.md).

CI do SHA publicado, instalação limpa, evolução legada, integração completa,
participantes/AT/aparelhos reais e liberação operacional continuam gates
próprios. Sonar permanece adiado. Sem conclusão antecipada de DOC-B.4.
