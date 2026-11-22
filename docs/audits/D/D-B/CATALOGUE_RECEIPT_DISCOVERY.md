# D3.60 — localizar comprovantes do catálogo

A página Comprovantes do catálogo pode ser aberta pelo catálogo, por
Unidades e apresentações e por Mais opções. Ela mostra o histórico da
conta no contexto selecionado. A pessoa pode encontrar uma confirmação
de outro aparelho ou de outra sessão mesmo após perder a permissão de
gravar, enquanto a leitura do paciente estiver autorizada. Propostas
globais e unidades globais conservam seus âmbitos próprios.

O histórico usa paginação de 15 registros e consulta os comprovantes
confirmados ou já reconhecidos. Uma nova confirmação entra na página
mais recente. A leitura de uma página antiga continua a partir da mesma
referência. O horário de confirmação é preservado ao reconhecer o
comprovante. Registros antigos que já tinham perdido esse horário são
exibidos com data original indisponível.

A seção de tentativas do navegador permite consultar a chave original.
O cliente confere titular, contexto, operação, revisão e resultado antes
de remover a tentativa local. Uma resposta ausente ou divergente
preserva a tentativa para nova consulta. A página usa apenas leitura.
A consulta de histórico retorna dados mínimos e conserva o acesso a uma
confirmação quando o nome atual do material não está disponível.

A migration `20261111004656` registra o horário de confirmação e oferece
uma leitura própria por titular. A escrita nativa do catálogo continua
nos fluxos existentes. O banco valida a sessão e a leitura do paciente
ou a administração global antes de entregar o resultado. Rascunhos,
chaves de envio e campos privados ficam fora do histórico. O acesso
direto às tabelas privadas segue vedado.

## Verificação

Onze cenários com Auth real passaram. A regressão percorreu 106
comprovantes, inseriu uma nova confirmação durante a paginação e
conferiu que os registros restantes foram retornados uma única vez.
Os casos incluem outro titular, chave de página alheia, perda de
vínculo, horário legado indisponível e separação dos âmbitos globais.

Treze cenários distintos no build de produção foram qualificados em
Chromium, Mobile Chromium e WebKit. Houve uma falha inicial de clique
na reativação em Chromium. A repetição dirigida passou com o mesmo
fluxo. A página nova também passou pelas verificações de
acessibilidade automatizadas em cinco larguras. O comprovante com chave
divergente preservou a tentativa e a consulta válida recuperou uma
gravação oficial única.

O histórico remoto passou de 201 para 202 versões. Funções, permissões,
gatilho e índice conferem com o local. O dry-run final está vazio. O
advisor registrou o aviso da função de leitura executável por
autenticados, com autorização no próprio banco e acesso direto vedado.
CI e Preview do próprio SHA seguem em validação.
[Resultados](CATALOGUE_RECEIPT_DISCOVERY_VALIDATION.json).
