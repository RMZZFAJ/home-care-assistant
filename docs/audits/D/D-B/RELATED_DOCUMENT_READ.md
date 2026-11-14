# D3.20 — consulta de ficha relacionada

Na base c8e2f8e, a entrega vinculada à REQ exibia quantidade com o rótulo
ambíguo “Expedido/proposto” e sem unidade. A contraprova de navegador falhou
nesse ponto. Depois de corrigir os fatos, a regressão revelou perda de foco
ao fechar a consulta. O mecanismo de restauração do Fluent passou no Chromium
e mobile, mas falhou no WebKit; focar o botão antes de abrir também não bastou.
A consulta agora é retirada antes de restaurar foco no frame seguinte, com
referência explícita ao botão. As quatro falhas foram preservadas em logs e
contextos; nenhuma tentativa insuficiente foi aceita como correção.

## Comportamento implementado

A consulta COM/ENT/BAL reutiliza SupplyLineSummary, sem ações de criação,
emissão, edição ou confirmação. Exibe as mesmas quantidades e unidades do
detalhe nativo. Transferência ainda não expedida permanece declaração, sem
afirmar expedição ou recebimento. A resposta precisa corresponder ao ID e tipo
pedidos e conter os fatos tipados necessários; resposta200 inválida não vira
lista vazia nem editor de correção. Erro mantém somente a recuperação da
consulta, sem exibir o resultado antigo. Atualizar continua no teclado, tem
guarda durante leitura e conserva foco. Fechar retorna ao botão de origem.

O caminho REQ conserva RequisitionOpening, sua autorização e a distinção entre
abrir e confirmar ciência. O novo resumo não inclui DocumentActions. Os nove
pontos de chamada existentes permanecem preservados: sete usam REQ; dois usam
ENT, na requisição e na origem de transferência. Não há ponto de chamada atual
que abra COM/BAL por esse componente. Consultas de origem COM/BAL do estoque
continuam no drawer próprio e são verificadas como consumidores distintos.

## Validação e limites

O [manifesto de evidências](RELATED_DOCUMENT_READ_EVIDENCE.json) registra a
fonte, as execuções, os hashes e os resultados. A regressão nova abre uma ENT
real com expedição10 e aceite2, exige unidade e leitura sem inputs, recupera503,
recusa tipo divergente em200, retorna foco, exige403 para outro paciente e
compara os fatos operacionais por SQL antes/depois. Não admite comandos de
documentos, requisições ou estoque durante a consulta. Axe verifica quatro
larguras por motor. Casos existentes de ciência e origem do estoque continuam
na mesma coorte, com Auth real e stack local verificada pelo runner.

A coorte ampla passou20 e falhou somente no retorno de foco WebKit. Os18
casos anteriores foram conservados. As alterações seguintes só afetam ciclo
e foco do contêiner; os dois leitores internos permanecem textualmente iguais.
Os três casos novos foram repetidos nos três motores na fonte final. Os PASS
anteriores do caso novo não são casos adicionais:21 distintos qualificados,
29 execuções totais,25 PASS e4 FAIL preservadas. Nenhuma assertiva foi reduzida.

Uma tentativa adicional parou no build, antes de executar testes: a cópia de
fonte do instrumento tinha extensão.tsx em output e entrou no tsconfig. A cópia
foi renomeada para.txt; não houve alteração de configuração ou código para
contornar o diagnóstico. O log desse erro do instrumento foi preservado.

C-FINAL-AC-024 fica parcial: esta prova não reconcilia todas as171 relações,
as variantes BAL e as tarefas de conta global, senha e cancelamento como um
único aceite. Não representa homologação humana, leitor de tela ou aparelho
físico. A matriz conserva as29 colunas canônicas e todos os complementos.

A [observação remota](RELATED_READ_REMOTE_OBSERVATION.json) confirma161
migrations; nenhuma SQL nova, mutação remota ou repetição de backup/restore.
As duas variáveis de assinatura existem como segredos no escopo Preview;
somente seus metadados foram lidos. Isso não é nova prova de emissão ou
validação criptográfica. Custódia e assinatura conservam seus dossiês.

CI precisa validar o SHA publicado. Sonar segue adiado pelo responsável.
PR7 permanece Draft, sem merge ou promoção de produção. A meta D-B segue ativa.
