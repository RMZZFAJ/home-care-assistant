# Origem tipada do movimento

C-NEW-AC-023 estava NOT_STARTED na matriz, embora a implementação e suas
regressões já existissem. A reconciliação usa a CI42480516297 do SHA8a17202,
sem reimplementar o fluxo ou repetir a mesma suíte local. Foram conferidos
os logs dos jobs: os dois cenários passaram em Chromium, Mobile Chromium
e WebKit, seis execuções identificadas, com fontes e contratos preservados.

A origem parte do movimento visível por RLS e do paciente da sessão. Parcela
COM resolve purchase_receipts.document_id e conserva receiptId separado;
documento, BAL, consumo, inventário e compensação seguem referências tipadas.
O recurso de origem exige sua autorização própria. Sem permissão, o movimento
pode continuar disponível com restrição compreensível, sem conteúdo da origem.

Os cenários verificam parcela exata, ENT, BAL, consumo, compensação, erro/retry,
filtros, foco, larguras320/390/768/1440 e ausência de mudança dos fatos lidos.
As negativas incluem receiptId usado como movimento, UUID desconhecido,
paciente alheio, COM restrito e revogação de stock.team.read do profissional.
Não ampliam acesso financeiro nem familiar para resolver uma referência.

[Provas e hashes das fontes reutilizadas](STOCK_ORIGIN_RECONCILIATION.json)
distinguem essas execuções de CI de testes novos. A migration153 toca somente
metadados de rascunho privado e preserva políticas/grants e os consumidores da
origem. Aparelho físico, tarefas humanas/AT e liberação operacional continuam
nos seus gates. A reconciliação é local/CI, sem selo de homologação externa.
