# Seleção frequente e retomada da edição

## Comportamento implementado

C-NEW-AC-024 e REQ-05 passam a salvar e usar conjuntos privados de materiais,
por usuário e paciente. O nome tem2–80 caracteres. Cada nome identifica uma
lista imutável; outro nome preserva ambas. A API e o banco não recebem estoque,
urgência, observação ou justificativa nessa operação. IDs de produtos são texto
opaco, conforme o catálogo canônico, e não necessariamente UUID.

O drawer busca listas e mostra a disponibilidade atual. Selecionar uma lista
não marca seus materiais automaticamente. Itens já presentes conservam os
valores atuais; itens indisponíveis ficam fora da inclusão. Linhas novas começam
com estoque NULL, estado unfilled, sem data, urgência desligada e sem motivo
antigo. Extras não catalogados e embalagens não são copiados. O catálogo é
reconsultado ao abrir o drawer; a confirmação oficial mantém as validações do
banco. Checkbox preservado após retorno não habilita sucesso com zero materiais
elegíveis depois de uma desativação.

Salvar lista é separado de adicionar materiais e de confirmar uma requisição.
Não gera protocolo, documento, ciência, PDF ou movimento de estoque. O ensaio
também confirmou uma emissão explícita posterior: payload e linhas persistidas
mantiveram estoque em branco e urgência desligada, sem copiar a observação7.

## Autoridade e recuperação

GET/POST /api/requisitions/selections usam Auth e contexto selecionado. RPCs
exigem leitura própria; novo save exige req.create. A recuperação da mesma
intenção exige leitura atual, inclusive após perder escrita. Hash de intenção
e locks ficam no banco; comandos recuperados conservam a chave e o corpo.
Não há replay offline automático. Após401/403, o resumo privado fica oculto
até nova leitura autorizada. Outra conta do mesmo paciente não lê essas listas.

RLS e grants dos dois novos repositórios privados são explícitos. Clientes não
têm acesso direto às tabelas nem ao helper. As duas RPCs públicas têm execução
somente para authenticated e revalidam autoridade após esperas. A lista não
amplia acesso ao catálogo nem autoriza a emissão oficial.

## Validação proporcional e contraprovas

Passaram cinco unitários e quatro casos com Auth real. A coorte de produção
Chromium reuniu três fluxos novos e dois consumidores de rascunho já existentes.
Uma coorte adicional verifica inclusão válida e checkbox que se tornou inelegível.
Diagnósticos Next dev ficam separados de produção. Datas, hashes, contagens e
limites estão nas [evidências](RECURRING_SELECTION_EVIDENCE.json).

O primeiro protótipo local usou UUID para produtos e falhou nos três casos Auth;
a identidade real do catálogo é textual. A migration155 corrigiu isso sem
reescrever a154 aplicada localmente. A primeira tentativa de155 recusou o CHECK
tipado antigo e foi revertida; a versão aplicada recria o mesmo predicado com
tipo text. O protótipo nunca foi publicado. As410 funções/grants do baseline153
continuam exatos; não se removeu API existente nesse baseline.

Também foram preservadas duas falhas iniciais de interação do combobox e uma
fixture que supunha um terceiro produto inexistente. O teste passou a abrir a
lista com ArrowDown antes de esperar sua opção; o caso de indisponibilidade usa
os dois produtos reais da fixture. Nenhum timeout ou regra foi reduzido.

## CI e foco público

A [CI de f0840dc](CI_F0840DC_OBSERVATION.json) terminou com falhas. Um consumidor
antigo esperava retomada na etapa inicial, embora o save fosse de Higiene.
A expectativa foi corrigida sem retirar precisão decimal, negativas ou ledger.
O oráculo de teclado espera a barreira inert terminar e continua recusando
armadilhas, parada oculta, página permanentemente inert e landmark oculto.

A espera explícita pelo foco também reproduziu uma falha real no WebKit: o
resultado aparecia sem receber foco. A verificação pública agora foca após o
commit do resultado, com sua sequência vigente. O código continua com32 dígitos
hexadecimais, formatação opcional HCA e limite de entrada64. Regressões conferem
os43 caracteres formatados antes de consultar, QR sem conta, bytes divergentes,
assinatura/TSA internas e ausência de dados privados. Não houve mudança estética
no PDF ou flexibilização da verificação documental.

## Remoto e limites

[Preflight](RECURRING_SELECTION_REMOTE_PREFLIGHT.json) e
[pós-validação155](RECURRING_SELECTION_REMOTE_MIGRATIONS.json) registram duas
migrations pendentes aplicadas, zero pendências finais e todos os campos antigos
preservados. A primeira captura foi recusada porque Auth/monitoramento mudaram
antes da DDL. Um novo backup verificado e restaurado foi feito; o comparador
permaneceu rigoroso. Cron, Vault e políticas Storage continuam preservados.

[Advisors](RECURRING_SELECTION_ADVISORS.json):202 achados de segurança e164 de
desempenho, nenhum ERROR. O delta contém duas RPCs autenticadas e dois índices
de FK ainda sem uso observado; não foram suprimidos avisos nem removidos índices.
Backup/probe não aprovam recuperação operacional, RPO/RTO ou independência de
chave/máquina. CI do novo SHA, D6 humano/AT/aparelho, S24 Ultra físico, ICP-Brasil
e TSA externa continuam próprios. Sonar adiado; PR7 Draft e missão D-B ativa.
