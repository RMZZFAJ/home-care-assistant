# Entregas e transferências — ponto 06.2 parcial

D3.80 implementa e confere seis das sete composições deste ponto, no escopo
visual. O ponto permanece em85%; a caixa de tarefas ENT-02 continua pendente.
[Resultados dirigidos](ENT_TRANSFER_CANONICAL_VALIDATION.json).

| Composição | Estado local |
| --- | --- |
| ENT-01 Preparar entrega | Seleção e revisão canônicas; dados completos. |
| ENT-02 Caixa de tarefas | Pendente: cartão, pessoas, percurso e ação. |
| ENT-03 Recebimento | Expedição e quantidades em leitura. |
| ENT-04 Divergência | Aceite real e pendência separados. |
| ENT-05 Cancelamento | Consumo confirmado em leitura e devolução real. |
| ENT-06 Apuração | Proposta, aceite anterior e desconhecido separados. |
| EST-04 Transferência | Autoria e concordância distintas do recebimento. |

DeliveryMaterials usa a tabela/cartão comum em cinco larguras. Propostas
bilaterais ainda sem expedição mostram somente declarado. Depois da expedição
continuam separados expedido,aceito,conciliado e pendente,com unidade,estado
factual,apresentações e vínculos. A busca não grava fatos e pode ser limpa
pelo teclado. Quantidade de declaração não comprova expedição ou aceite.

Revisão ENT e fatos de recebimento,cancelamento,transferência e regularização
usam DefinitionGrid e MaterialReview. Condições,campos,justificativas,nomes
preservados,instantes,referências e callbacks nativos permanecem. A devolução
autônoma sem ENT de origem já existe e foi novamente exercitada; a concordância
não expede,nem substitui o recebedor físico designado. O original é preservado.

São30 cenários distintos nos três perfis,qualificados por27 aprovações iniciais
e três finais. O seletor antigo da relação REQ/ENT esperava um nome anterior
do botão,já ausente no4376e76. O teste agora confere código e aceite de2 unidades
no mesmo contexto,sem reduzir negativas,recuperação ou ausência de escrita.
As três falhas originais e seus artefatos foram preservados.

As capturas usam rolagem real ao centro e hit-test do conteúdo,sem ocultar
navegação fixa nem modificar CSS para a imagem. Os dois cartões320px foram
inspecionados. Computação canônica em320/390/768/1024/1440px,axe e teclado
complementam a inspeção; não substituem aparelho físico,AT ou zoom nativo400%.

ENT-02 exige o cartão canônico e o resumo autorizado de pessoas e percurso.
O delivery_task_list atual fornece código,estado,destinatário porID,tarefa e
linhas,sem esses nomes/custódias. Esse trabalho já pertence à composição
original da caixa; será concluído antes de06.3,sem criar outro checkpoint.
Os filtros,páginas e contratos de05.4 continuam preservados.

Sem SQL novo neste lote. Os105 estados de critérios originais e18 de UI não
são promovidos por este escopo. DOC-A/B/C/D continuam separados; não há nova
aprovação de PDF,menções,janela20min,ciência de cancelamento ou rascunhos.
CI do SHA publicado e gates humanos,físicos e de provedor continuam necessários.
