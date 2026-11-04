# Movimentações AS_IS e percurso planejado

P07 aprova simplicidade e reutilização preferencial de ENT; não converte todos
os fatos em transferência. Fontes reais:
[contrato de documentos](../../../../src/lib/validation/documents.ts),
[API atual](../../../current/API.md),
[ledger e rotinas](../../../../supabase/migrations/20261022043227_supply_workflows.sql)
e [achados B2/B3](../C1-consolidation/FINDINGS_165_SOURCE_CROSSWALK.csv). As
84 migrations permanecem intactas; ler a última redefinição da função antes da
implementação. A tabela cobre mecanismos reais e separa rótulos operacionais
sem comando autônomo.

<!-- c-table:start -->

- **Fato/tipo:** ENT expedição FAMILY→CARE_TEAM

  **AS_IS → TO_BE e classificação:** ENT → mesma ENT, transferência física

  **Pré-condição/autoridade/confirmação:** Origem disponível, emissor
  autorizado, destinatário elegível; resumo antes de expedir

  **Efeito de saldo, protocolo e vínculo:** Origem −q, TRANSIT +q; protocolo
  ENT e linhas; não credita equipe ainda

- **Fato/tipo:** ENT expedição CARE_TEAM→FAMILY

  **AS_IS → TO_BE e classificação:** ENT reversa → transferência/devolução
  simples

  **Pré-condição/autoridade/confirmação:** Capacidade em cada direção,
  pessoa/custódia de destino reais

  **Efeito de saldo, protocolo e vínculo:** Equipe −q, TRANSIT +q; nova ENT
  ligada à origem quando conhecida

- **Fato/tipo:** ENT aceite integral

  **AS_IS → TO_BE e classificação:** receive → ato pessoal do recebedor

  **Pré-condição/autoridade/confirmação:** Pessoa designada efetivamente
  recebeu; vínculo/versão vigentes

  **Efeito de saldo, protocolo e vínculo:** TRANSIT −q, destino +q uma vez;
  evento de aceite na ENT

- **Fato/tipo:** ENT aceite parcial/zero

  **AS_IS → TO_BE e classificação:** receive com divergences → mesmo fato

  **Pré-condição/autoridade/confirmação:** Recebedor vê todas as linhas; zero
  explícito não significa recebido

  **Efeito de saldo, protocolo e vínculo:** Credita somente aceito; restante
  em trânsito/divergência; motivo/nota/evento

- **Fato/tipo:** ENT conciliação received

  **AS_IS → TO_BE e classificação:** resolve → conciliação própria vinculada

  **Pré-condição/autoridade/confirmação:** Autoridade e fato comprovado; não
  simula assinatura de terceiro

  **Efeito de saldo, protocolo e vínculo:** Retira apenas quantidade resolvida
  do trânsito para destino conforme contrato; vínculo ENT/linha

- **Fato/tipo:** ENT conciliação returned

  **AS_IS → TO_BE e classificação:** resolve returned → retorno do material
  pendente

  **Pré-condição/autoridade/confirmação:** Retorno físico identificado, motivo
  e ator; confirma custódia real

  **Efeito de saldo, protocolo e vínculo:** Trânsito −q, origem +q uma vez;
  não nova compra

- **Fato/tipo:** ENT conciliação missing

  **AS_IS → TO_BE e classificação:** resolve missing → perda/regularização
  própria

  **Pré-condição/autoridade/confirmação:** Responsável autorizado e
  justificativa, sem recebimento fictício

  **Efeito de saldo, protocolo e vínculo:** Trânsito resolvido conforme perda;
  sem crédito fictício de origem/destino; história preservada

- **Fato/tipo:** Pedido de cancelamento

  **AS_IS → TO_BE e classificação:** cancel após aceite → intenção de
  conciliação

  **Pré-condição/autoridade/confirmação:** Solicitante autorizado; recebedor
  decide conforme fato

  **Efeito de saldo, protocolo e vínculo:** Pedido não estorna; ENT conserva
  aceites/ledger anteriores

- **Fato/tipo:** Consentimento de cancelamento

  **AS_IS → TO_BE e classificação:** consent_cancel → conciliação com
  consumo/devolução

  **Pré-condição/autoridade/confirmação:** Recebedor original apto, fato
  físico, consumo já confirmado referenciado

  **Efeito de saldo, protocolo e vínculo:** Retorno físico uma vez; não
  debitar novamente consumo já lançado; C-CAUSE-050 é defeito aberto

- **Fato/tipo:** Recusa/retirada do pedido

  **AS_IS → TO_BE e classificação:** Ausente → ações planejadas DEC-005

  **Pré-condição/autoridade/confirmação:** Recusa do competente/retirada do
  solicitante, versão do pedido

  **Efeito de saldo, protocolo e vínculo:** Nenhum estorno; retorno ao estado
  coerente com fatos ocorridos; evento próprio

- **Fato/tipo:** Transferência solicitada pela família/equipe

  **AS_IS → TO_BE e classificação:** ENT completa → interface simples
  reutiliza motor

  **Pré-condição/autoridade/confirmação:** Contraparte concorda com
  declaração; se diferente, recebedor confirma fato pessoal separado

  **Efeito de saldo, protocolo e vínculo:** Sem saldo por mera solicitação;
  expedição/aceite com mesmos controles/protocolo ENT

- **Fato/tipo:** Devolução antiga da UI

  **AS_IS → TO_BE e classificação:** Percurso atual a mapear → substituição
  condicionada

  **Pré-condição/autoridade/confirmação:** Demonstrar equivalência de
  parciais, cancelamento, direção, autor e referência

  **Efeito de saldo, protocolo e vínculo:** Sem exclusão da UI na C; na D só
  após regressão e migração de intenção pendente

- **Fato/tipo:** COM prevista/aprovada/adquirida

  **AS_IS → TO_BE e classificação:** Processo próprio COM

  **Pré-condição/autoridade/confirmação:** Capacidade familiar por etapa;
  compra/doação e quantidades distintas

  **Efeito de saldo, protocolo e vínculo:** Previsão/aprovação/compra não
  creditam; protocolo COM

- **Fato/tipo:** COM chegada informada

  **AS_IS → TO_BE e classificação:** purchase_receipts → parcela própria

  **Pré-condição/autoridade/confirmação:** Pessoa competente declara chegada,
  receiptId e evento

  **Efeito de saldo, protocolo e vínculo:** Não credita ainda; vínculo
  COM/linhas/receiptId

- **Fato/tipo:** COM parcela validada/rejeitada

  **AS_IS → TO_BE e classificação:** validate_receipt/reject_receipt →
  processo próprio

  **Pré-condição/autoridade/confirmação:** Validador autorizado, parcela e
  versão, motivo na rejeição

  **Efeito de saldo, protocolo e vínculo:** Validação FAMILY +q uma vez;
  rejeição não credita nem apaga declaração

- **Fato/tipo:** COM dispensa de restante

  **AS_IS → TO_BE e classificação:** Ausente → encerramento de expectativa P14

  **Pré-condição/autoridade/confirmação:** Validar parcelas pertinentes;
  dispensar previsão explicitamente

  **Efeito de saldo, protocolo e vínculo:** 10 previstos/2 validados/8
  dispensados mantêm crédito 2; pendência física continua visível

- **Fato/tipo:** Entrada familiar avulsa

  **AS_IS → TO_BE e classificação:** inbound → processo de crédito avulso

  **Pré-condição/autoridade/confirmação:** Capacidade de estoque,
  fato/origem/motivo reais

  **Efeito de saldo, protocolo e vínculo:** FAMILY +q; movimento próprio, sem
  ENT ou COM artificial

- **Fato/tipo:** Retirada familiar avulsa

  **AS_IS → TO_BE e classificação:** outbound → processo de débito avulso

  **Pré-condição/autoridade/confirmação:** Quantidade positiva, saldo, motivo
  e autoridade

  **Efeito de saldo, protocolo e vínculo:** FAMILY −q; movimento próprio, não
  transferência sem destino real

- **Fato/tipo:** Estoque inicial

  **AS_IS → TO_BE e classificação:** Entrada/inventário legado; escrita legada
  aposentada → abertura própria

  **Pré-condição/autoridade/confirmação:** Contagem/origem reais; não reativar
  API 410 nem inventar passado

  **Efeito de saldo, protocolo e vínculo:** Movimento de abertura
  identificado, custódia real, referência de implantação; sem BAL fictício

- **Fato/tipo:** Relato de falta/consumo

  **AS_IS → TO_BE e classificação:** consumption_reports →
  informação/complemento

  **Pré-condição/autoridade/confirmação:** Autor relata; confirmação por
  capacidade/custódia

  **Efeito de saldo, protocolo e vínculo:** Relato não debita;
  protocolo/referência do relato, nunca transferência

- **Fato/tipo:** Consumo confirmado

  **AS_IS → TO_BE e classificação:** Confirmação estruturada → processo
  próprio

  **Pré-condição/autoridade/confirmação:** Produto/q/custódia exatos, decisão
  explícita não NULL

  **Efeito de saldo, protocolo e vínculo:** Débito único na custódia; link
  consumo e eventual compensação

- **Fato/tipo:** Contagem BAL

  **AS_IS → TO_BE e classificação:** BAL → inventário físico próprio

  **Pré-condição/autoridade/confirmação:** Contador designado/legítimo;
  valores observados, confirmação do efeito

  **Efeito de saldo, protocolo e vínculo:** Autosave zero efeito; aplicação
  oficial pode gerar ajuste BAL explícito, jamais consumo inferido

- **Fato/tipo:** Revisão/reconto BAL

  **AS_IS → TO_BE e classificação:** Política atual → facultativa no primeiro
  uso

  **Pré-condição/autoridade/confirmação:** Revisão iniciada por autorizado
  distinto do contador efetivo; nova contagem tem autora própria

  **Efeito de saldo, protocolo e vínculo:** Aprovação antiga não aprova versão
  nova; ledger/revisão revalidados; protocolo/vínculos BAL

- **Fato/tipo:** Correção compensatória

  **AS_IS → TO_BE e classificação:** correction_in/out → processo próprio

  **Pré-condição/autoridade/confirmação:** Referência obrigatória ao fato do
  mesmo paciente/produto/custódia; motivo

  **Efeito de saldo, protocolo e vínculo:** Movimento oposto/compensador
  imutável; C-CAUSE-053 corrige falta de referência, sem UPDATE de saldo

- **Fato/tipo:** Erro de contagem

  **AS_IS → TO_BE e classificação:** Reconferência/BAL ou compensação →
  conforme fato

  **Pré-condição/autoridade/confirmação:** Recontar se observação física
  errada; compensar se lançamento oficial errado

  **Efeito de saldo, protocolo e vínculo:** Não transferir entre estoques só
  para fechar número; ligar contagem/fato corrigido

- **Fato/tipo:** Descarte/perda fora de trânsito

  **AS_IS → TO_BE e classificação:** Sem comando específico comprovado;
  retirada motivada ou proposta própria

  **Pré-condição/autoridade/confirmação:** Identificar material, custódia,
  quantidade e autoridade; regra específica se necessária

  **Efeito de saldo, protocolo e vínculo:** Débito real motivado; não rotular
  como transferência para destino inexistente

- **Fato/tipo:** Inativação/reativação com saldo

  **AS_IS → TO_BE e classificação:** Catálogo mantém saldo → destinação
  explícita

  **Pré-condição/autoridade/confirmação:** Gestor local; manter ou iniciar
  retorno legítimo; reativação explícita

  **Efeito de saldo, protocolo e vínculo:** Inativar/reativar não movimenta; 4
  permanecem 4 na mesma custódia

- **Fato/tipo:** Estorno

  **AS_IS → TO_BE e classificação:** Não é comando universal;
  domínio/compensação conforme fato

  **Pré-condição/autoridade/confirmação:** Original e fatos posteriores
  conferidos; sem apagar aceite/consumo

  **Efeito de saldo, protocolo e vínculo:** Somente movimentos compensatórios
  legítimos, vinculados; sem borracha do ledger

- **Fato/tipo:** Regularização excepcional

  **AS_IS → TO_BE e classificação:** Encerramento administrativo proposto P05

  **Pré-condição/autoridade/confirmação:** Administração familiar,
  prova/ressalvas, segunda conferência pertinente

  **Efeito de saldo, protocolo e vínculo:** Não cria received_by de desligado;
  PDF posterior registra antes/depois, motivos, atores, efeitos e limites

<!-- c-table:end -->

Em qualquer movimento: quantidade exata/finita antes da coerção, saldo não
negativo, autorização no banco/API e após espera relevante, chave estável por
intenção, evento/ator/versão e read-back independente. Recebedor não é
deduzido de escala, papel de administrador ou contraparte que não recebeu.

## Equivalência antes de substituir devolução

Na D, comparar os dois percursos com 5 unidades devolvidas, aceite parcial
3/5, contraparte diferente do recebedor, revogação entre preparação/commit,
cancelamento com consumo anterior, resultado incerto e produto inativo com
saldo. Exigir mesma conservação de origem/trânsito/destino, autoria, história
e recuperação. Uma correção sem deslocamento físico deve continuar fora desse
percurso. Até essa prova, a UI antiga é preservada.
