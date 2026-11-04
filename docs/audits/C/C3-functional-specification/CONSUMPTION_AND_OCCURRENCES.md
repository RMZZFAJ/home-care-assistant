# Relatos, complemento e confirmação de consumo

AS_IS: /consumo, ConsumptionConsole, /api/consumption e consumption_reports.
Texto com lines=[] é aceito, mas não pode ser confirmado nem complementado
(B2-010). Confirmação oposta pode responder sucesso sem mudar decisão
(B2-011/B3-007); accept=NULL é desvio SQL separado. TO_BE DEC-008/013/014/030,
O05 e política de confirmação já existente, sem aguardar WhatsApp.

## Telas e campos

<!-- c-table:start -->

- **Tela:** CON-01

  **Rota e situação:** /consumo lista, atual a alterar

  **Objetivo e ações:** Buscar pendente/antigo por referência e páginas,
  mostrar próxima pessoa.

- **Tela:** CON-02

  **Rota e situação:** Novo relato, atual a preservar/ampliar

  **Objetivo e ações:** Informar falta ou consumo em texto, opcionalmente
  estruturado.

- **Tela:** CON-03

  **Rota e situação:** Complementar relato, novo painel

  **Objetivo e ações:** Associar produto/quantidade ao original sem apagar
  texto/autoria.

- **Tela:** CON-04

  **Rota e situação:** Revisão e decisão, atual a alterar

  **Objetivo e ações:** Confirmar ou rejeitar versão exata; explicar efeito
  sobre estoque.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Tipo

  **Tipo/origem:** Falta/consumo, seleção

  **Obrigatório e default:** Sim, escolha explícita

  **Validação/unidade:** Falta nunca gera débito de consumo

  **Ajuda e exemplo:** “Quero registrar uma informação para conferência.”

- **Campo:** Custódia

  **Tipo/origem:** FAMILY/CARE_TEAM, seleção autorizada

  **Obrigatório e default:** Sim

  **Validação/unidade:** Não permite consultar saldo familiar geral à equipe

  **Ajuda e exemplo:** “Onde ocorreu?”

- **Campo:** Relato original

  **Tipo/origem:** Texto do relator

  **Obrigatório e default:** Sim, vazio

  **Validação/unidade:** 3–2000 caracteres

  **Ajuda e exemplo:** “Foi usada uma unidade do material X.”

- **Campo:** Material

  **Tipo/origem:** Catálogo, opcional no relato livre

  **Obrigatório e default:** Obrigatório para confirmar consumo

  **Validação/unidade:** Mesmo paciente, elegibilidade e unidade

  **Ajuda e exemplo:** Não interpretar nome livre como correspondência certa.

- **Campo:** Quantidade

  **Tipo/origem:** Decimal, usuário

  **Obrigatório e default:** Obrigatória em linha estruturada de consumo

  **Validação/unidade:** Positiva/exata, precisão vigente antes de coerção

  **Ajuda e exemplo:** “1 unidade.”

- **Campo:** Complemento

  **Tipo/origem:** Texto/linhas versionadas

  **Obrigatório e default:** Sim quando esclarecimento necessário

  **Validação/unidade:** Não altera original; autor/instante próprios

  **Ajuda e exemplo:** “Esclarecimento: material X, 1 unidade na equipe.”

- **Campo:** Referência do relato

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim ao complementar/decidir

  **Validação/unidade:** Versão atual, paciente/custódia originais

  **Ajuda e exemplo:** ID nunca concede permissão.

- **Campo:** Decisão

  **Tipo/origem:** Confirmar/rejeitar explicitamente

  **Obrigatório e default:** Sim, sem NULL/default tácito

  **Validação/unidade:** Mesmo resultado recupera; oposto conflita

  **Ajuda e exemplo:** “Confirmar consumo e descontar 1 unidade.”

- **Campo:** Motivo de rejeição/correção

  **Tipo/origem:** Texto do responsável

  **Obrigatório e default:** Condicional à rejeição/correção

  **Validação/unidade:** Proposta 3–1000, histórico imutável

  **Ajuda e exemplo:** Não chamar rejeição de confirmação sem efeito.

- **Campo:** Filtros/referência

  **Tipo/origem:** Estado, tipo, data, busca e cursor

  **Obrigatório e default:** Não

  **Validação/unidade:** Ordenação estável, referência antiga fora de 100
  acessível

  **Ajuda e exemplo:** Contagem e lista usam mesmo conjunto autorizado.

<!-- c-table:end -->

## Transições e autoria

Relato registrado → aguardando complemento/conferência → complemento
versionado → confirmação ou rejeição. Original permanece íntegro. O relator
com vínculo vigente pode esclarecer; outro autorizado pode acrescentar sua
própria informação sem se passar pelo autor. Política de quem pode decidir
continua por capacidade/custódia; a equipe não ganha poder familiar por
relatar.

Falta segue informação de necessidade, sem débito. Consumo só debita na
confirmação explícita de estrutura suficiente e versão vigente, com saldo e
autoridade revalidados. Duas confirmações produzem um débito; mesma decisão
repetida recupera resultado tipado; decisão oposta recebe conflito e exibe a
primeira. NULL é entrada inválida, nunca rejeição. Corrigir consumo confirmado
exige compensação referenciada, sem editar relato/ledger originais.

Texto “usamos material” sem quantidade fica registrado com próximo passo de
complemento, não eternamente pendente impossível. O05 funciona no app mesmo
com Meta desligada. Sugestão Flow preservada pode entrar no mesmo processo
após revisão autenticada futura; não cria interpretação/debito automático.

## Consulta, falha e prova

GET inicial usa loading, erro tem retry de leitura e não “recuperar envio”.
Novo evento/revisão de outra sessão refaz consulta e conserva edição atual;
resposta de paciente anterior é descartada. /consumo?ref deve buscar detalhe
autorizado independentemente da página recente. Pendentes antigos continuam
alcançáveis e contador não promete acesso a item que a rota trunca.

Complementar/decidir congela versão, conteúdo e chave. Resposta perdida busca
mesma intenção e resultado; não gera outro relato para “tentar de novo”. Se o
vínculo foi revogado, nova escrita é negada e a tarefa fica com responsável
operacional autorizado. Offline não debita silenciosamente quando reconectar.

Feedback: “Relato registrado, sem desconto”; “Complemento salvo, aguarda
conferência”; “Consumo confirmado, 1 unidade descontada da equipe”; “Outro
responsável já decidiu esta versão”. Histórico liga original, complementos,
decisão, movimento e eventual compensação. Notificação usa autor do fato, não
atribui relato ao confirmador. Nenhum texto livre vai a log/push por padrão.

Aceites: texto livre→complemento por autor→confirmado uma vez; complemento por
outro autorizado com autoria própria; falta não debita; null/oposto recusam;
101º relato antigo acessível por ref/página; duas sessões recebem atualização;
revogação/paciente trocado não expõem conteúdo. Pessoas entendem quando houve
desconto e qual custódia; testes SQL de crédito/debito não aceitam NULL
indevido.
