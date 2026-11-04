# B6.4 — Fidelidade semântica dos quatro documentos

A matriz acompanha cada campo da fonte persistida à tela e ao PDF. Presença,
omissão editorial, diferença semântica e campo derivável são categorias
distintas. A seleção do renderizador4 não altera os fatos guardados.

## REQ

Não possui quantidade solicitada. ITENS SOLICITADOS conta linhas; a ressalva
explica isso. Estoque observado fica na fonte/tela, ausente no PDF (BE-007,
oportunidade editorial). Ciência mantém modo/pessoa/data e declaração de que
emissão/envio não comprovam ciência. Atendimento é contado no PDF, mas a tabela
de materiais não marca quais linhas foram atendidas. O subtítulo escolhe
ciência/conclusão, sem o estado parcial usado pela tela; avaliar o conjunto do
documento, pois o contador oferece contraprova à ocultação total.

Histórico importado recebe qualificador de ciência não comprovada, mas o card
usa PENDENTE e a data do documento derivado pode ocupar o lugar da data original
desconhecida. Em arquivo, o motivo persiste em lifecycle/event, sem ser
transcrito na linha do tempo PDF. Não alterar legado para completar campos cujo
valor é desconhecido.

## COM

As quantidades proposta/aprovada/adquirida/validada são separadas corretamente.
O remanescente pode ser calculado; compra não atende REQ nem credita equipe.
Porém o evento não inclui a coleção completa de purchase_receipts, apenas linhas
agregadas e o comando atual. PDF não apresenta chegada ainda pendente de
validação nem motivos de rejeição de parcela; zero validado não diz se ninguém
entregou ou se ainda falta validar. Título Compra e ausência de origin reduzem
reconhecimento de doação, sem transformar o PDF em nota fiscal.

## ENT

Expedido, aceito e conciliado aparecem separados; aviso inicial recusa a
presunção de recebimento. Os detalhes do problema e notas do aceite ficam em
metadata.receipt e no comando do evento, mas não na representação. A soma
conciliada não distingue falta de devolução. Cancelamento com consumo anterior
precisa manter parcelas físicas separadas; B3-002 impede hoje um ramo válido,
mas não autoriza afirmar que consumo foi devolvido. Histórico resumido não
contém razões ou quantidades por transição. O rótulo Emissão usa createdAt do
documento, que pode anteceder a emissão real de draft. B62-S03 sustenta o corte
de fonte; B6.6 confronta a impressão efetiva.

## BAL

Referência/contado e contexto de plantão/semanas são representados, com ressalva
correta de contagem atual. Não se usa escala como prova de presença. O PDF não
imprime approvals, countVersion, política vigente ou revisor por grupo, embora a
aprovação seja determinante do significado. Linha do tempo bal.approve não
mostra qual count_version foi aprovada; aprovações antigas não podem ser
reinterpretadas como aprovação de reconto. Prazo/adiamento/atraso estão no
ciclo, fora do snapshot parcial: é dependência de recuperação, sem afirmar que o
dado foi perdido. UI usa São Paulo; seção BAL PDF aplica timezone do contexto.

## Consequência transversal

Rótulos compactos têm escolhas incompatíveis com alguns estados terminais:
COM/BAL cancelado ou rejeitado permanece EM ANDAMENTO no card; ENT cancelada
recebe PENDENTE no card de recebimento. O subtítulo correto é contraprova de
perda de estado, mas não elimina a ambiguidade do mesmo comprovante. Não
concluir corrupção, pagamento, devolução ou presença pelo texto do PDF.

Fontes: operational-pdf, presentation, supply-detail, supply-line-summary,
requisition-detail e contratos privados record_document_event/science_snapshot,
audited_legacy_supply_command, apply_bal e register_legacy_requisition. Provas
novas B62; contraprovas B36/B47 reaproveitadas. Matriz explicita os limites.
