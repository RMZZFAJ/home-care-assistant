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

  **Tipo/origem por tela e estado:** CON-02 Tipo: EDITABLE (RADIO_GROUP);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-02 Tipo: Sim, escolha
  explícita

  **Validação/unidade:** CON-02 Tipo: Falta nunca gera débito de consumo;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-02 Tipo: “Quero registrar uma informação para
  conferência.”

- **Campo:** Custódia

  **Tipo/origem por tela e estado:** CON-02 Custódia: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-02 Custódia: Sim

  **Validação/unidade:** CON-02 Custódia: Não permite consultar saldo familiar
  geral à equipe; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-02 Custódia: “Onde ocorreu?”

- **Campo:** Relato original

  **Tipo/origem por tela e estado:** CON-02 Relato original: EDITABLE
  (TEXTAREA); Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-02 Relato original: Sim,
  vazio

  **Validação/unidade:** CON-02 Relato original: 3–2000 caracteres; Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Ajuda/exemplo:** CON-02 Relato original: “Foi usada uma unidade do
  material X.”

- **Campo:** Material

  **Tipo/origem por tela e estado:** CON-02 Material: EDITABLE
  (SEARCHABLE_COMBOBOX); Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura; CON-03 Material:
  EDITABLE (SEARCHABLE_COMBOBOX); Somente no subestado de preparação
  autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-02 Material: Obrigatório para
  confirmar consumo; CON-03 Material: Obrigatório para confirmar consumo

  **Validação/unidade:** CON-02 Material: Mesmo paciente, elegibilidade e
  unidade; Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura; CON-03 Material: Mesmo paciente,
  elegibilidade e unidade; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-02 Material: Não interpretar nome livre como
  correspondência certa.; CON-03 Material: Não interpretar nome livre como
  correspondência certa.

- **Campo:** Quantidade

  **Tipo/origem por tela e estado:** CON-02 Quantidade: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; CON-03 Quantidade: EDITABLE
  (DECIMAL_TEXT_INPUT); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-02 Quantidade: Obrigatória em
  linha estruturada de consumo; CON-03 Quantidade: Obrigatória em linha
  estruturada de consumo

  **Validação/unidade:** CON-02 Quantidade: Positiva/exata, precisão vigente
  antes de coerção; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; CON-03 Quantidade:
  Positiva/exata, precisão vigente antes de coerção; Somente no subestado de
  preparação autorizado indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-02 Quantidade: “1 unidade.”; CON-03 Quantidade: “1
  unidade.”

- **Campo:** Complemento

  **Tipo/origem por tela e estado:** CON-03 Complemento: EDITABLE (TEXTAREA);
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-03 Complemento: Sim quando
  esclarecimento necessário

  **Validação/unidade:** CON-03 Complemento: Não altera original;
  autor/instante próprios; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-03 Complemento: “Esclarecimento: material X, 1
  unidade na equipe.”

- **Campo:** Referência do relato

  **Tipo/origem por tela e estado:** CON-03 Referência do relato: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; CON-04 Referência do relato: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** CON-03 Referência do relato:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; CON-04 Referência do relato:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** CON-03 Referência do relato: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; CON-04 Referência do relato: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** CON-03 Referência do relato: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; CON-04 Referência do relato:
  Informação do registro indicado, somente para consulta nesta etapa. Ausência
  de dado histórico permanece explicitamente identificada.

- **Campo:** Decisão

  **Tipo/origem por tela e estado:** CON-04 Decisão: EXPLICIT_ACTION
  (DECISION_BUTTONS); Confirmar consumo ou rejeitar versão pendente; nenhum
  valor NULL ou default

  **Obrigatoriedade/default na preparação:** CON-04 Decisão: Sem concordância
  material inicial ou clique automático

  **Validação/unidade:** CON-04 Decisão: Mesmo resultado recupera; oposto
  conflita; Confirmar consumo ou rejeitar versão pendente; nenhum valor NULL
  ou default

  **Ajuda/exemplo:** CON-04 Decisão: “Confirmar consumo e descontar 1
  unidade.”

- **Campo:** Motivo de rejeição/correção

  **Tipo/origem por tela e estado:** CON-04 Motivo de rejeição/correção:
  EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** CON-04 Motivo de
  rejeição/correção: Condicional à rejeição/correção

  **Validação/unidade:** CON-04 Motivo de rejeição/correção: Proposta 3–1000,
  histórico imutável; Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** CON-04 Motivo de rejeição/correção: Não chamar rejeição
  de confirmação sem efeito.

- **Campo:** Filtros/referência

  **Tipo/origem por tela e estado:** CON-01 Buscar relato ou referência:
  FILTER (SEARCH_INPUT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade

  **Obrigatoriedade/default na preparação:** CON-01 Buscar relato ou
  referência: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material

  **Validação/unidade:** CON-01 Buscar relato ou referência: Tipo
  Falta/Consumo e estado de complemento/decisão do relato; nunca transformar
  busca em comando de consumo; datas em DD/MM/AAAA na apresentação e limites
  de consulta validados; manter filtros ao voltar

  **Ajuda/exemplo:** CON-01 Buscar relato ou referência: Busque relato
  autorizado ou ajuste os filtros próprios de tipo/período. A referência
  antiga abre detalhe mesmo fora da página recente.

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
