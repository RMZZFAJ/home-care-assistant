# Como transformar os casos C9 em evidência na D

Execução futura. Nenhum código de teste, fixture de banco ou suíte funcional
foi alterado/executado nesta C. Casos relacionam 165 fontes,121 causas, 28
capacidades e12 complementos. Requisito novo não é defeito adicional.

## Unidade e oráculo

Cada linha de ACCEPTANCE_CASES conserva risco, estado inicial, atores, dados
fictícios, passos, esperado/proibido, leitura independente, efeitos,
autorização, estados UI, evento/PDF, recuperação, camada, fixture planejada,
acessibilidade/móvel, necessidade humana/aparelho/provedor, fonte, lote, gate,
decisão e status. ID de fixture é reserva de design, não fixture criada.

`DESIGN_READY` significa desenho suficiente para implementar regressão;
`BLOCKED_BY_OWNER_DECISION` preserva P02; `NEEDS_REAL_HARDWARE` não vira
emulação; `EXTERNAL_PROVIDER_REQUIRED` depende de ativação/homologação.
`NOT_TESTABLE_BEFORE_IMPLEMENTATION` indica ausência do novo contrato, sem
impedir escrever regressão que falha no AS_IS. Caso pronto pode ter gate de
retenção/custo antes da ativação; as dimensões estão registradas na matriz.

Controle válido passa; contraprova falha. Comparar por outra via que não a
resposta do comando: leitura Auth/RPC permitida, documento/evento/ledger,
inventário de objetos, extração/validador independente do PDF. Não usar o
mesmo helper defeituoso como produtor e única testemunha. Conferir identidade,
paciente, versão, quantidade e número de efeitos.

Na recusa, conferir ausência de efeitos indevidos. Em fluxo multi-etapa,
preservar a primeira confirmada e indicar qual falhou. Resposta perdida exige
recuperar a mesma intenção; resultado incerto não permite retry cego nem
afirmação de que nada foi gravado.

## Ordem e gates

<!-- c-table:start -->

- **Lote:** D0

  **Execução planejada:** Autorização nova; guardas e oráculos
  PDF/NULL/axe/readiness

  **Saída verificável:** Controle passa, mutante falha; prova antiga intacta

- **Lote:** D1

  **Execução planejada:** P1, precisão/autoridade após lock e scheduler
  malformado

  **Saída verificável:** Progresso REQ, decisão informada de escala e nenhuma
  escrita indevida

- **Lote:** D2

  **Execução planejada:** COM/ENT/BAL/consumo/custódia; P02 somente com tabela
  aprovada

  **Saída verificável:** Fatos/atores/terminais legítimos e ledger único; BAL
  facultativo

- **Lote:** D3

  **Execução planejada:** Draft CAS, lista/cursor/frescor, revisão/submit,
  wizard/guias

  **Saída verificável:** Outro aparelho/dia, conflito sem perda, alvo antigo
  alcançável

- **Lote:** D4

  **Execução planejada:** Fontes D2/recuperação D3; assinatura incorporada
  obrigatória

  **Saída verificável:** PDF fiel/legível/assinado, exemplar exato e histórico
  preservado

- **Lote:** D5

  **Execução planejada:** Eventos/autoridade/estado; PWA/push e lembretes
  internos

  **Saída verificável:** Avisos mínimos por aparelho, progresso/dedup e
  alternativa interna

- **Lote:** D6

  **Execução planejada:** Mesmos SHA/schema/config; donos/custos/participantes
  e núcleo

  **Saída verificável:** Restore em quarentena, tarefa
  humana/AT/aparelhos/impressão; GO/NO-GO

- **Lote:** D7

  **Execução planejada:** Nova autorização de canal,
  destino/consentimento/minimização

  **Saída verificável:** Homologação externa por tentativa; mock local não
  basta

<!-- c-table:end -->

Detalhes em C5 e por caso no CSV. Mudança editorial só recebe validação
documental; implementação recebe gates de AGENTS e ensaios afetados.
Schema/autorização exige clean install/evolução legada e RLS com Auth real.
Antes de substituir dados locais, consentimento e backup verificável. Nunca
suíte mutável remota; browser pelo runner da stack local conhecida.

## Variações que devem ser preservadas

Normal/parcial/cancelado/obsoleto; zero/NULL/ausente/precisão excessiva; sem
vínculo/revogado/outro paciente; decisão igual/oposta; intenção igual/
conteúdo diferente; perda antes/depois do commit; duas sessões independentes;
offline/reconexão/resposta invertida; origem histórica/cadastro atual; ciência
permitida/proibida; cache intacto/adulterado; canal desligado/falho;
manual/scan/sem câmera; teclado/foco/reflow. Aplicar conforme cada caso, sem
multiplicar execuções idênticas por nomenclatura.

## Evidência e conclusão

Execução futura identifica SHA/schema/config/destino, papéis fictícios, ID,
resultado e arquivo de prova sem segredos. Captura/hash não são aceite humano,
físico ou legal. Incomplete axe exige triagem; TOC não prova restore. CI vale
para o HEAD candidato e não é substituída por comentário de preview.

P02 recebe casos por SCI-ID só após deliberação individual. P09-B já é
requisito: verificador apenas de hash não satisfaz primeiro escopo. Os
exemplos discriminantes complementam os 187 casos integralmente no CSV.

## Casos finais e execução futura

C-FINAL-AC-001–026 acrescentam discriminantes P02/C8; 20 casos existentes
refinados e 161 IDs preservados. Todos PLANNED_NOT_EXECUTED. Controle válido
deve passar e contraprova falhar por razão própria na implementação D, sem
resultado de execução fabricado nesta C.
