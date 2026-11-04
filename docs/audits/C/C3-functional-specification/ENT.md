# ENT — expedição, recebimento pessoal e conciliação

AS_IS: /fichas/ent, /entregas e /fichas/:id, supplyCommandSchema e ledger de
FAMILY/CARE_TEAM/TRANSIT. Expedição e aceite são distintos; parcial positivo
credita destino. B2-002/003/004/015 e B3-002 delimitam cancelamento, fila e
sucessão falhos. TO_BE aplica DEC-005/006/007/013/022/028, sem assinatura
alheia.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ENT-01

  **Rota e situação:** /fichas/ent, atual a alterar

  **Objetivo e ações:** Preparar materiais/quantidades, custódias e recebedor;
  revisar e expedir.

- **Tela:** ENT-02

  **Rota e situação:** /entregas, atual a alterar

  **Objetivo e ações:** Ver todas as tarefas executáveis, inclusive
  consentimento de cancelamento; filtros e referência antiga.

- **Tela:** ENT-03

  **Rota e situação:** /fichas/:id, atual a alterar

  **Objetivo e ações:** Conferir tudo ou indicar divergências; ver trânsito,
  aceites e responsável.

- **Tela:** ENT-04

  **Rota e situação:** Diálogo de divergência, atual a alterar

  **Objetivo e ações:** Quantidade efetivamente recebida e ressalvas por
  linha; resumo antes da confirmação.

- **Tela:** ENT-05

  **Rota e situação:** Cancelamento/retirada/recusa, atual e novas ações

  **Objetivo e ações:** Registrar intenção e resolver desacordo com retorno de
  estado correto.

- **Tela:** ENT-06

  **Rota e situação:** Sucessão/exceção administrativa, novo painel

  **Objetivo e ações:** Redesignar tarefa futura ou encerrar exceção sem
  simular aceite físico.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Origem/destino

  **Tipo/origem:** Seleções de custódia

  **Obrigatório e default:** Sim, contexto de intenção visível

  **Validação/unidade:** FAMILY e CARE_TEAM distintos; autorização em cada
  direção

  **Ajuda e exemplo:** “Da família para a equipe.”

- **Campo:** Material e quantidade expedida

  **Tipo/origem:** Catálogo + decimal

  **Obrigatório e default:** Sim, vazio

  **Validação/unidade:** Positivo/exato; saldo disponível na origem;
  unidade/fator junto

  **Ajuda e exemplo:** “3 unidades saem da família.”

- **Campo:** REQs atendidas

  **Tipo/origem:** Multi-seleção autorizada

  **Obrigatório e default:** Não, nenhuma

  **Validação/unidade:** Mesmo paciente/produto, justificativa se várias
  necessidades

  **Ajuda e exemplo:** Vincular não duplica material ou crédito.

- **Campo:** Recebedor

  **Tipo/origem:** Pessoa vinculada e elegível

  **Obrigatório e default:** Sim, sugestão pela escala se inequívoca; editável
  antes de emissão

  **Validação/unidade:** Sem escala não presumir; P06 permite escolha manual
  elegível pela família

  **Ajuda e exemplo:** “Quem receberá fisicamente? Confirme a pessoa.”

- **Campo:** Justificativa de troca

  **Tipo/origem:** Texto, autor da expedição

  **Obrigatório e default:** Se mudar destinatário fora da sugestão ou depois
  da preparação

  **Validação/unidade:** 3–1000; versão/instante preservados

  **Ajuda e exemplo:** “Outro profissional receberá os materiais.”

- **Campo:** Observações de expedição

  **Tipo/origem:** Texto do emissor

  **Obrigatório e default:** Não, vazio

  **Validação/unidade:** Até 2000; não substitui ressalva de recebimento

  **Ajuda e exemplo:** “Pacote fechado entregue para conferência.”

- **Campo:** Conferência integral

  **Tipo/origem:** Ação do recebedor autenticado

  **Obrigatório e default:** Escolha explícita, nunca por silêncio

  **Validação/unidade:** Resumo de todas as linhas e quantidades

  **Ajuda e exemplo:** “Confirmo que recebi os materiais listados.”

- **Campo:** Linhas com divergência

  **Tipo/origem:** Multi-seleção

  **Obrigatório e default:** Não, lista vazia significa aceite integral após
  confirmação

  **Validação/unidade:** Revisão mostra também linhas não selecionadas

  **Ajuda e exemplo:** Não ocultar que as demais serão aceitas.

- **Campo:** Quantidade aceita

  **Tipo/origem:** Decimal por divergência

  **Obrigatório e default:** Sim nessas linhas, sem aceite implícito

  **Validação/unidade:** De 0 ao ainda expedido/pendente; precisão da unidade

  **Ajuda e exemplo:** “Recebi 2 de 3 unidades.”

- **Campo:** Problema e ressalva

  **Tipo/origem:** Texto por linha

  **Obrigatório e default:** Motivo ao divergir; vazio inicialmente

  **Validação/unidade:** Problema até 500, nota até 1000

  **Ajuda e exemplo:** “Uma unidade não chegou”; não inferir consumo.

- **Campo:** Resolução da diferença

  **Tipo/origem:** Seleção recebeu/devolveu/faltou

  **Obrigatório e default:** Sim ao conciliar

  **Validação/unidade:** Quantidade positiva até pendência; motivo 3–1000

  **Ajuda e exemplo:** Cada opção tem movimento e significado próprios.

- **Campo:** Motivo do cancelamento

  **Tipo/origem:** Texto do solicitante

  **Obrigatório e default:** Sim, vazio

  **Validação/unidade:** 3–1000 e versão atual

  **Ajuda e exemplo:** “Solicitar cancelamento”, não “Cancelar tudo” após
  aceite.

- **Campo:** Devolvido e consumido

  **Tipo/origem:** Decimais por linha

  **Obrigatório e default:** Sim no consentimento aplicável

  **Validação/unidade:** Compatíveis com aceites e consumo já confirmado

  **Ajuda e exemplo:** Consumido antes não é debitado outra vez.

- **Campo:** Motivo de retirada/recusa

  **Tipo/origem:** Texto do ator responsável

  **Obrigatório e default:** Sim na nova ação

  **Validação/unidade:** 3–1000; vínculo à solicitação vigente

  **Ajuda e exemplo:** “Discordo: estes materiais permanecem recebidos.”

- **Campo:** Motivo de exceção

  **Tipo/origem:** Texto + fatos conhecidos, admin local

  **Obrigatório e default:** Sim ao encerrar administrativamente

  **Validação/unidade:** Não admite caixa “recebi por outra pessoa”

  **Ajuda e exemplo:** “Não foi possível obter a declaração pessoal.”

<!-- c-table:end -->

## Máquina de estados e pessoa responsável

Rascunho → expedida/em trânsito → recebida ou divergência → conciliação →
encerrada. Cancelamento é uma dimensão com
pedido/consentimento/recusa/retirada, não uma borracha da história. Preservar
estado anterior no pedido para retornar a ele quando retirado/recusado,
revalidando fatos ocorridos durante a espera.

Expedir debita origem e credita trânsito na mesma transação. Aceite pessoal
positivo debita trânsito e credita destino uma vez; zero aceita nada e
conserva pendência. Linhas não marcadas em divergências são integralmente
aceitas só quando o recebedor confirma resumo completo. Não chamar 2/3
unidades aceitas de “linha integralmente conferida”; atendimento REQ e
encerramento ENT diferem.

Antes de emitir, família indica pessoa sugerida pela agenda, podendo editar.
Após emitir e antes do fato físico, reassign existente deve invalidar desafios
e exigir motivo/versão; não reescrever emissão original. Se outra pessoa já
recebeu de fato, procedimento corretivo preserva declaração e identifica quem
recebeu; admin não toma seu lugar. Casos sem identidade elegível seguem P06 e
contingência, sem fabricar assinatura.

Depois de aceite, pedir cancelamento não estorna. Recebedor competente pode
consentir com conciliação, recusar formalmente; solicitante pode retirar.
Decisões concorrentes usam versão e chave do pedido; segunda ação oposta
conflita, repetição igual recupera. O SQL deve considerar consumo confirmado
anterior e devolução real, corrigindo C-CAUSE-050 sem duplicar baixa/retorno.

## Desligamento e transferência bilateral

Revogação sempre imediata. Mostrar antes as tarefas e oferecer regularização
sem condicionar revogação. Aceites históricos ficam da pessoa original. Novo
profissional pode assumir conferências futuras legitimamente designadas, não
aceitar o passado em nome dela. Parcial irrecuperável admite encerramento
administrativo motivado, com situação física desconhecida explícita e saldo
conciliado apenas por fatos comprovados/compensação autorizada referenciada.

P07 aprovou transferência simples preferencialmente no motor ENT: declaração
do iniciador, concordância da contraparte e aceite do recebedor real são fatos
distintos quando as pessoas diferem. Se a mesma pessoa faz dois atos, resumo e
eventos mantêm seus significados. Devolução física pode seguir esse percurso;
compra, consumo, abertura e compensação permanecem próprios. A UI antiga só é
retirada após equivalência/regressões demonstradas na D.

## Recuperação, comunicação e provas

Chave estável por expedição/recebimento/resolução/pedido; versão do estado
apresentado. Resposta perdida recupera o mesmo ato e quantidades; saldo
negativo, revogação, paciente trocado e versão antiga recusam sem efeitos
parciais. Revisão salva e expedição recusada têm resposta por etapa. Estado
uncertain proíbe mudar recebedor/conteúdo da tentativa até conciliar.

Fila padrão inclui a tarefa certa do destinatário: receber, decidir pedido ou
resolver divergência, com próximo responsável. PDF mostra autores, emissão
real, ressalvas/avaria, parcelas aceitas, returned/missing/received e natureza
administrativa de exceção. Aviso de cancelamento concluído não pede consentir.
Aplicar estados comuns, foco de retorno e layout de quantidades em móvel/AT.

Aceites: profissional escalado diferente não aceita sem ser recebedor;
admin/global não aceitam por ela; 3 expedidos e 2 aceitos conservam 1 em
trânsito; consumo 1 e devolução 1 não debitam consumo 2; recusar/retirar
pedido mantém fatos; revogar parcial não bloqueia segurança nem cria
assinatura substituta; duas REQs vinculadas não duplicam crédito. Familiares e
recebedor explicam o resumo, inclusive cenário sem escala e assinatura
indisponível, antes do GO.

## Atualização vinculante C7–C10

P06 foi aprovado: sugestão de escala editável pela família para pessoa
vinculada/elegível com motivo. Aceite físico pessoal permanece indelegável.
P07 aprova interface simples preferencialmente ENT; antiga devolução só sai
após equivalência demonstrada. P05 exige dossiê/PDF de regularização sem
simular assinatura de desligado.

Esta atualização substitui alternativas/recomendações anteriores conflitantes;
não anuncia implementação. Contrato detalhado no
[adendo C7](../C7-decision-closure/PRODUCT_DECISIONS_C7_ADDENDUM.md),
[blueprint C8](../C8-visual-blueprint/VISUAL_BLUEPRINT_BY_SCREEN.md) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).
