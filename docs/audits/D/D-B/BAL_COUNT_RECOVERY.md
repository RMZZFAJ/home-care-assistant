# D3.55 — confirmação e cópia local da contagem BAL agendada

O componente antigo inventory-console não tem consumidor na árvore de rotas.
A API conserva consulta histórica, mas POST está aposentado com 410. O
inventário
de continuidade havia confundido esse legado com trabalho operacional ativo.
A classificação foi corrigida sem reconstruir o fluxo aposentado ou remover
histórico. O caminho atual é /fichas/bal → BalanceEntry → ScheduledCount, ou a
contagem BAL sem regime, que continua no PatientSupplyWizard.

## Correção implementada

ScheduledCount antes aceitava result.data diretamente e apagava a tentativa.
Agora verifica persistence, recibo da requisição, ator, chaves, alvo, versão,
tipo,
paciente, identidade da criação e valores/notas antes de limpar ou exibir
sucesso.
O recibo adicional é emitido pelas APIs create/revise somente depois do RPC
transacional nativo. Ele identifica a requisição; não é hash documental,
assinatura digital ou decisão de autorização do navegador. Consumidores
anteriores continuam recebendo data/persistence. O schema de revisão é
compartilhado com a API, sem mudar seus campos, padrões ou regras.

A cópia local v2 tem autor/paciente explícitos, pacote tipado e campos físicos
separados. Cópias legadas dos produtores existentes continuam validadas pelo
escopo, alvo autorizado e corpo nativo; suas omissões de defaults são mantidas
no pacote original. Não se deriva autorização de metadata ou da chave local.
Campos divergentes do pacote congelado, cópia estrangeira ou danificada não
podem substituir ou limpar a tentativa. Campos, notas e instantes preservados
não viram observações novas ao recuperar. Não há POST automático na recarga.

Gravar o pacote em armazenamento conferido passa a preceder o envio nativo.
Falha de armazenamento impede esse POST. Edição não salva pode continuar em
memória; isso não promete recuperação após fechar a aba. Confirmação divergente
mantém estado incerto e a mesma intenção. Limpeza falha ou outra cópia
encontrada
conservam a tentativa. Recusa inicial conhecida retira somente o pending da
cópia própria, conservando campos. O descarte do preenchimento privado não pode
apagar outra tentativa operacional aparecida no aparelho.

## Provas e limites

18 testes distintos de modelos/contratos qualificados:17 da primeira coorte
válida e um novo caso de descarte, no recheck10/10. Um primeiro teste de limpeza
revelou comparação dependente da ordem das propriedades; agora a comparação
ignora somente a ordem das chaves, sem normalizar valores ou reordenar arrays.
Tipos e lint afetados aprovados. Nenhuma migration ou guarda nativa mudou.

Coorte de navegador21/21 nas três engines, com Auth real. Inclui resposta nativa
perdida, recarga, recibo de outra chave recusado, pacote original reenviado
somente
por ação explícita, um documento e efeitos oficiais inalterados na recuperação.
Cópia danificada/de outro autor, quota de armazenamento e descarte concorrente
não enviam nova contagem nem apagam a referência. API legada410 confirmada com
Auth real. Os dois consumidores anteriores foram preservados:contagem completa
por plantão e retomada de revisão privada, com referência, observações, Pdf,
axe,
retorno e versões reais. A primeira coorte0/18 parou em dois seletores de alert
ambíguos com o announcer do Next; corrigidos sem retirar as contraprovas.
Fontes estáveis na coorte válida; sem suíte mutável de banco em paralelo.

O critério amplo de continuidade das contagens continua parcial. Ainda falta
concluir o reaproveitamento controlado de campos e observações quando muda
estoque, plantão, atribuição ou versão da ficha. O carregamento de cópia apenas
local cuja referência mudou ainda exige revisão para impedir substituição
silenciosa por campos atuais vazios. Cópias privadas de servidor já existem;
não se declara essa presença como cobertura de todas as variantes. Quantidade
anterior não pode ser promovida a observação física nova automaticamente.
Esse trabalho continua com Codex, antes de cadastros e suporte posteriores.

Sem migration nova, reset, Auth/fixture remoto, backup pesado redundante, deploy
manual, merge ou ativação externa. Remoto197 conferido no fechamento, última
migration20261110181208; dry-run
vazio. PR7 Draft, CI própria pendente, Sonar adiado e meta ativa.
