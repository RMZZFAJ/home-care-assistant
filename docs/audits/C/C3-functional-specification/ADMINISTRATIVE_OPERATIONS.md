# Administração, listas, propostas e suporte

AS_IS: /, /fichas, /mais, /admin, /configuracoes e /notificacoes;
AdminConsole, PolicyConsole e endpoints com governança local/global. Há listas
e painéis úteis; B3-012/B4-005 truncam história/propostas e B1-UX-003 exige
interpretar JSON. TO_BE DEC-013/014/015/021/024 e O01/O04/O15, sem nova
central genérica por padrão.

## Telas e campos

<!-- c-table:start -->

- **Tela:** ADM-01

  **Rota e situação:** / e /fichas, atuais a alterar

  **Objetivo e ações:** Próximas tarefas no paciente e acesso por tipo; não
  afirmar ausência antes da consulta.

- **Tela:** ADM-02

  **Rota e situação:** /admin seções atuais

  **Objetivo e ações:** Pacientes, vínculos, catálogo, convites, auditoria e
  fila técnica conforme capacidades.

- **Tela:** ADM-03

  **Rota e situação:** /configuracoes, atual a alterar

  **Objetivo e ações:** Regras de acesso, ciência/BAL e notificações; comparar
  proposta com política vigente.

- **Tela:** ADM-04

  **Rota e situação:** Diálogo de proposta/override, atual a alterar

  **Objetivo e ações:** Antes/depois humano, objeto/pessoa, consequência,
  versão e aprovação distinta.

- **Tela:** ADM-05

  **Rota e situação:** Auditoria e conciliação técnica, atuais a ampliar

  **Objetivo e ações:** Consultar registro antigo/tentativa/referência;
  escalonar a quem pode resolver.

- **Tela:** ADM-06

  **Rota e situação:** /mais e fallback 404, atual e novo tratamento

  **Objetivo e ações:** Nomes de destinos fiéis e retorno seguro em português.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Paciente/modo

  **Tipo/origem por tela e estado:** ADM-01 Paciente: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-02 Paciente: READ_ONLY (TEXT_VALUE); Consulta do valor de
  origem; mudanças só no processo legitimamente responsável; ADM-03 Paciente:
  READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ADM-01 Modo de atuação: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-02 Modo de atuação: READ_ONLY (TEXT_VALUE); Consulta do
  valor de origem; mudanças só no processo legitimamente responsável; ADM-03
  Modo de atuação: READ_ONLY (TEXT_VALUE); Consulta do valor de origem;
  mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ADM-01 Paciente: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ADM-02 Paciente: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; ADM-03 Paciente: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado;
  ADM-01 Modo de atuação: Valor emitido, proposto ou calculado da fonte
  identificada; ausência explicitamente informada, sem valor inventado; ADM-02
  Modo de atuação: Valor emitido, proposto ou calculado da fonte identificada;
  ausência explicitamente informada, sem valor inventado; ADM-03 Modo de
  atuação: Valor emitido, proposto ou calculado da fonte identificada;
  ausência explicitamente informada, sem valor inventado

  **Validação/unidade:** ADM-01 Paciente: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-02 Paciente: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-03 Paciente: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-01 Modo de atuação: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-02 Modo de atuação: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-03 Modo de atuação: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** ADM-01 Paciente: Confira a residência desta tarefa.
  Trocar contexto é uma ação separada e exige acesso autorizado.; ADM-02
  Paciente: Confira a residência desta tarefa. Trocar contexto é uma ação
  separada e exige acesso autorizado.; ADM-03 Paciente: Confira a residência
  desta tarefa. Trocar contexto é uma ação separada e exige acesso
  autorizado.; ADM-01 Modo de atuação: Informação do registro indicado,
  somente para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ADM-02 Modo de atuação: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; ADM-03 Modo de atuação: Informação
  do registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Nome/estado do paciente

  **Tipo/origem por tela e estado:** ADM-02 Nome do paciente: EDITABLE_SUBFORM
  (TEXT_INPUT); Cadastro/edição de nome apenas no escopo administrativo
  competente; ADM-02 Estado ativo: EDITABLE (CHECKBOX_OR_SWITCH); Somente no
  subestado de preparação autorizado indicado na ficha; resumo/decisão
  posterior é leitura

  **Obrigatoriedade/default na preparação:** ADM-02 Nome do paciente: Sim ao
  cadastrar; ADM-02 Estado ativo: Sim ao cadastrar

  **Validação/unidade:** ADM-02 Nome do paciente: Nome de paciente com 2–160
  caracteres; escopo/autoridade conferidos no comando; Cadastro/edição de nome
  apenas no escopo administrativo competente; ADM-02 Estado ativo: Estado
  ativo booleano explícito respeitado; false não pode ser ignorado.
  isDevelopment não é permissão; Somente no subestado de preparação autorizado
  indicado na ficha; resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ADM-02 Nome do paciente: Ambiente fictício não vira
  operação por renomear paciente.; ADM-02 Estado ativo: Ambiente fictício não
  vira operação por renomear paciente.

- **Campo:** Administrador inicial

  **Tipo/origem por tela e estado:** ADM-02 Administrador inicial:
  EDITABLE_SUBFORM (EMAIL_INPUT); Só criação GLOBAL da residência; titular
  confirma o convite/conta pelo Auth

  **Obrigatoriedade/default na preparação:** ADM-02 Administrador inicial: Sim
  na criação com primeiro vínculo

  **Validação/unidade:** ADM-02 Administrador inicial: Autoridade de criação
  global não substitui vínculo operacional; Só criação GLOBAL da residência;
  titular confirma o convite/conta pelo Auth

  **Ajuda/exemplo:** ADM-02 Administrador inicial: “Quem administrará esta
  residência?”

- **Campo:** Seção e busca

  **Tipo/origem por tela e estado:** ADM-01 Seção: FILTER (RADIO_OR_SELECT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; ADM-02 Seção: FILTER (RADIO_OR_SELECT); Apenas consulta no
  escopo permitido; não altera documento, movimento ou autoridade; ADM-03
  Seção: FILTER (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não
  altera documento, movimento ou autoridade; ADM-01 Buscar: FILTER
  (SEARCH_INPUT); Apenas consulta no escopo permitido; não altera documento,
  movimento ou autoridade; ADM-02 Buscar: FILTER (SEARCH_INPUT); Apenas
  consulta no escopo permitido; não altera documento, movimento ou autoridade;
  ADM-03 Buscar: FILTER (SEARCH_INPUT); Apenas consulta no escopo permitido;
  não altera documento, movimento ou autoridade

  **Obrigatoriedade/default na preparação:** ADM-01 Seção: Sem restrição
  adicional inicialmente, salvo filtro de tarefa explicitamente indicado no
  link; vazio limpa filtro, não cria zero ou estado material; ADM-02 Seção:
  Sem restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-03 Seção: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material; ADM-01 Buscar: Sem restrição adicional inicialmente, salvo filtro
  de tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero
  ou estado material; ADM-02 Buscar: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material; ADM-03 Buscar: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material

  **Validação/unidade:** ADM-01 Seção: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-02 Seção: Filtro tipado da
  seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar; ADM-03 Seção:
  Filtro tipado da seção/tarefa, com valores permitidos e escopo autorizados;
  não aceitar um enum universal para processos distintos; datas em DD/MM/AAAA
  na apresentação e limites de consulta validados; manter filtros ao voltar;
  ADM-01 Buscar: Filtro tipado da seção/tarefa, com valores permitidos e
  escopo autorizados; não aceitar um enum universal para processos distintos;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; ADM-02 Buscar: Filtro tipado da seção/tarefa, com valores
  permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-03 Buscar: Filtro tipado
  da seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar

  **Ajuda/exemplo:** ADM-01 Seção: Rótulo “Catálogo do paciente” difere de
  “Unidades”.; ADM-02 Seção: Rótulo “Catálogo do paciente” difere de
  “Unidades”.; ADM-03 Seção: Rótulo “Catálogo do paciente” difere de
  “Unidades”.; ADM-01 Buscar: Digite um termo de busca na seção atual. Buscar
  não altera recursos nem troca paciente.; ADM-02 Buscar: Digite um termo de
  busca na seção atual. Buscar não altera recursos nem troca paciente.; ADM-03
  Buscar: Digite um termo de busca na seção atual. Buscar não altera recursos
  nem troca paciente.

- **Campo:** Estado/tipo/período/responsável

  **Tipo/origem por tela e estado:** ADM-01 Estado: FILTER (RADIO_OR_SELECT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; ADM-02 Estado: FILTER (RADIO_OR_SELECT); Apenas consulta no
  escopo permitido; não altera documento, movimento ou autoridade; ADM-05
  Estado: FILTER (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não
  altera documento, movimento ou autoridade; ENT-02 Estado: FILTER
  (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; CON-01 Estado: FILTER (RADIO_OR_SELECT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; NOT-01 Estado: FILTER (RADIO_OR_SELECT); Apenas consulta no
  escopo permitido; não altera documento, movimento ou autoridade; DOC-01
  Estado: FILTER (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não
  altera documento, movimento ou autoridade; ADM-01 Tipo: FILTER
  (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-02 Tipo: FILTER (RADIO_OR_SELECT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; ADM-05 Tipo: FILTER (RADIO_OR_SELECT); Apenas consulta no escopo
  permitido; não altera documento, movimento ou autoridade; ENT-02 Tipo:
  FILTER (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; CON-01 Tipo: FILTER (RADIO_OR_SELECT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; NOT-01 Tipo: FILTER (RADIO_OR_SELECT); Apenas consulta no escopo
  permitido; não altera documento, movimento ou autoridade; DOC-01 Tipo:
  FILTER (RADIO_OR_SELECT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-01 Data inicial: FILTER
  (DATE_INPUT); Apenas consulta no escopo permitido; não altera documento,
  movimento ou autoridade; ADM-02 Data inicial: FILTER (DATE_INPUT); Apenas
  consulta no escopo permitido; não altera documento, movimento ou autoridade;
  ADM-05 Data inicial: FILTER (DATE_INPUT); Apenas consulta no escopo
  permitido; não altera documento, movimento ou autoridade; ENT-02 Data
  inicial: FILTER (DATE_INPUT); Apenas consulta no escopo permitido; não
  altera documento, movimento ou autoridade; CON-01 Data inicial: FILTER
  (DATE_INPUT); Apenas consulta no escopo permitido; não altera documento,
  movimento ou autoridade; NOT-01 Data inicial: FILTER (DATE_INPUT); Apenas
  consulta no escopo permitido; não altera documento, movimento ou autoridade;
  DOC-01 Data inicial: FILTER (DATE_INPUT); Apenas consulta no escopo
  permitido; não altera documento, movimento ou autoridade; ADM-01 Data final:
  FILTER (DATE_INPUT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-02 Data final: FILTER (DATE_INPUT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; ADM-05 Data final: FILTER (DATE_INPUT); Apenas consulta no
  escopo permitido; não altera documento, movimento ou autoridade; ENT-02 Data
  final: FILTER (DATE_INPUT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; CON-01 Data final: FILTER (DATE_INPUT);
  Apenas consulta no escopo permitido; não altera documento, movimento ou
  autoridade; NOT-01 Data final: FILTER (DATE_INPUT); Apenas consulta no
  escopo permitido; não altera documento, movimento ou autoridade; DOC-01 Data
  final: FILTER (DATE_INPUT); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-01 Responsável: FILTER
  (SEARCHABLE_COMBOBOX); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-02 Responsável: FILTER
  (SEARCHABLE_COMBOBOX); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade; ADM-05 Responsável: FILTER
  (SEARCHABLE_COMBOBOX); Apenas consulta no escopo permitido; não altera
  documento, movimento ou autoridade

  **Obrigatoriedade/default na preparação:** ADM-01 Estado: Sem restrição
  adicional inicialmente, salvo filtro de tarefa explicitamente indicado no
  link; vazio limpa filtro, não cria zero ou estado material; ADM-02 Estado:
  Sem restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-05 Estado: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material; ENT-02 Estado: Sem restrição adicional inicialmente, salvo filtro
  de tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero
  ou estado material; CON-01 Estado: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material; NOT-01 Estado: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material; DOC-01 Estado: Sem restrição
  adicional inicialmente, salvo filtro de tarefa explicitamente indicado no
  link; vazio limpa filtro, não cria zero ou estado material; ADM-01 Tipo: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-02 Tipo: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material; ADM-05 Tipo: Sem restrição adicional inicialmente, salvo filtro de
  tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou
  estado material; ENT-02 Tipo: Sem restrição adicional inicialmente, salvo
  filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não
  cria zero ou estado material; CON-01 Tipo: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material; NOT-01 Tipo: Sem restrição
  adicional inicialmente, salvo filtro de tarefa explicitamente indicado no
  link; vazio limpa filtro, não cria zero ou estado material; DOC-01 Tipo: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-01 Data inicial: Sem restrição adicional inicialmente, salvo filtro de
  tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou
  estado material; ADM-02 Data inicial: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material; ADM-05 Data inicial: Sem restrição
  adicional inicialmente, salvo filtro de tarefa explicitamente indicado no
  link; vazio limpa filtro, não cria zero ou estado material; ENT-02 Data
  inicial: Sem restrição adicional inicialmente, salvo filtro de tarefa
  explicitamente indicado no link; vazio limpa filtro, não cria zero ou estado
  material; CON-01 Data inicial: Sem restrição adicional inicialmente, salvo
  filtro de tarefa explicitamente indicado no link; vazio limpa filtro, não
  cria zero ou estado material; NOT-01 Data inicial: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material; DOC-01 Data inicial: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-01 Data final: Sem restrição adicional inicialmente, salvo filtro de
  tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou
  estado material; ADM-02 Data final: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material; ADM-05 Data final: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material; ENT-02 Data final: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  CON-01 Data final: Sem restrição adicional inicialmente, salvo filtro de
  tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou
  estado material; NOT-01 Data final: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material; DOC-01 Data final: Sem restrição adicional
  inicialmente, salvo filtro de tarefa explicitamente indicado no link; vazio
  limpa filtro, não cria zero ou estado material; ADM-01 Responsável: Sem
  restrição adicional inicialmente, salvo filtro de tarefa explicitamente
  indicado no link; vazio limpa filtro, não cria zero ou estado material;
  ADM-02 Responsável: Sem restrição adicional inicialmente, salvo filtro de
  tarefa explicitamente indicado no link; vazio limpa filtro, não cria zero ou
  estado material; ADM-05 Responsável: Sem restrição adicional inicialmente,
  salvo filtro de tarefa explicitamente indicado no link; vazio limpa filtro,
  não cria zero ou estado material

  **Validação/unidade:** ADM-01 Estado: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-02 Estado: Filtro tipado
  da seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar; ADM-05 Estado:
  Filtro tipado da seção/tarefa, com valores permitidos e escopo autorizados;
  não aceitar um enum universal para processos distintos; datas em DD/MM/AAAA
  na apresentação e limites de consulta validados; manter filtros ao voltar;
  ENT-02 Estado: Tarefa de receber/decidir pedido/resolver diferença e estado
  real da entrega; nunca selecionar outro recebedor como autorização; datas em
  DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros
  ao voltar; CON-01 Estado: Tipo Falta/Consumo e estado de complemento/decisão
  do relato; nunca transformar busca em comando de consumo; datas em
  DD/MM/AAAA na apresentação e limites de consulta validados; manter filtros
  ao voltar; NOT-01 Estado: Visto/Não visto do aviso são distintos de
  obrigação resolvida; tipo pelo catálogo de eventos, sem categoria essencial
  ou prazo P13 inventados; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; DOC-01 Estado: Tipo
  REQ/COM/ENT/BAL; estado traduzido por tipo e período válido; filtro não
  troca versão documental; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-01 Tipo: Filtro tipado da
  seção/tarefa, com valores permitidos e escopo autorizados; não aceitar um
  enum universal para processos distintos; datas em DD/MM/AAAA na apresentação
  e limites de consulta validados; manter filtros ao voltar; ADM-02 Tipo:
  Filtro tipado da seção/tarefa, com valores permitidos e escopo autorizados;
  não aceitar um enum universal para processos distintos; datas em DD/MM/AAAA
  na apresentação e limites de consulta validados; manter filtros ao voltar;
  ADM-05 Tipo: Filtro tipado da seção/tarefa, com valores permitidos e escopo
  autorizados; não aceitar um enum universal para processos distintos; datas
  em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; ENT-02 Tipo: Tarefa de receber/decidir pedido/resolver
  diferença e estado real da entrega; nunca selecionar outro recebedor como
  autorização; datas em DD/MM/AAAA na apresentação e limites de consulta
  validados; manter filtros ao voltar; CON-01 Tipo: Tipo Falta/Consumo e
  estado de complemento/decisão do relato; nunca transformar busca em comando
  de consumo; datas em DD/MM/AAAA na apresentação e limites de consulta
  validados; manter filtros ao voltar; NOT-01 Tipo: Visto/Não visto do aviso
  são distintos de obrigação resolvida; tipo pelo catálogo de eventos, sem
  categoria essencial ou prazo P13 inventados; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  DOC-01 Tipo: Tipo REQ/COM/ENT/BAL; estado traduzido por tipo e período
  válido; filtro não troca versão documental; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  ADM-01 Data inicial: Filtro tipado da seção/tarefa, com valores permitidos e
  escopo autorizados; não aceitar um enum universal para processos distintos;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; ADM-02 Data inicial: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-05 Data inicial: Filtro
  tipado da seção/tarefa, com valores permitidos e escopo autorizados; não
  aceitar um enum universal para processos distintos; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  ENT-02 Data inicial: Tarefa de receber/decidir pedido/resolver diferença e
  estado real da entrega; nunca selecionar outro recebedor como autorização;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; CON-01 Data inicial: Tipo Falta/Consumo e estado de
  complemento/decisão do relato; nunca transformar busca em comando de
  consumo; datas em DD/MM/AAAA na apresentação e limites de consulta
  validados; manter filtros ao voltar; NOT-01 Data inicial: Visto/Não visto do
  aviso são distintos de obrigação resolvida; tipo pelo catálogo de eventos,
  sem categoria essencial ou prazo P13 inventados; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  DOC-01 Data inicial: Tipo REQ/COM/ENT/BAL; estado traduzido por tipo e
  período válido; filtro não troca versão documental; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  ADM-01 Data final: Filtro tipado da seção/tarefa, com valores permitidos e
  escopo autorizados; não aceitar um enum universal para processos distintos;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; ADM-02 Data final: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-05 Data final: Filtro
  tipado da seção/tarefa, com valores permitidos e escopo autorizados; não
  aceitar um enum universal para processos distintos; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  ENT-02 Data final: Tarefa de receber/decidir pedido/resolver diferença e
  estado real da entrega; nunca selecionar outro recebedor como autorização;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; CON-01 Data final: Tipo Falta/Consumo e estado de
  complemento/decisão do relato; nunca transformar busca em comando de
  consumo; datas em DD/MM/AAAA na apresentação e limites de consulta
  validados; manter filtros ao voltar; NOT-01 Data final: Visto/Não visto do
  aviso são distintos de obrigação resolvida; tipo pelo catálogo de eventos,
  sem categoria essencial ou prazo P13 inventados; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  DOC-01 Data final: Tipo REQ/COM/ENT/BAL; estado traduzido por tipo e período
  válido; filtro não troca versão documental; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar;
  ADM-01 Responsável: Filtro tipado da seção/tarefa, com valores permitidos e
  escopo autorizados; não aceitar um enum universal para processos distintos;
  datas em DD/MM/AAAA na apresentação e limites de consulta validados; manter
  filtros ao voltar; ADM-02 Responsável: Filtro tipado da seção/tarefa, com
  valores permitidos e escopo autorizados; não aceitar um enum universal para
  processos distintos; datas em DD/MM/AAAA na apresentação e limites de
  consulta validados; manter filtros ao voltar; ADM-05 Responsável: Filtro
  tipado da seção/tarefa, com valores permitidos e escopo autorizados; não
  aceitar um enum universal para processos distintos; datas em DD/MM/AAAA na
  apresentação e limites de consulta validados; manter filtros ao voltar

  **Ajuda/exemplo:** ADM-01 Estado: “Pendentes sob minha responsabilidade.”;
  ADM-02 Estado: “Pendentes sob minha responsabilidade.”; ADM-05 Estado:
  “Pendentes sob minha responsabilidade.”; ENT-02 Estado: “Pendentes sob minha
  responsabilidade.”; CON-01 Estado: “Pendentes sob minha responsabilidade.”;
  NOT-01 Estado: “Pendentes sob minha responsabilidade.”; DOC-01 Estado:
  “Pendentes sob minha responsabilidade.”; ADM-01 Tipo: “Pendentes sob minha
  responsabilidade.”; ADM-02 Tipo: “Pendentes sob minha responsabilidade.”;
  ADM-05 Tipo: “Pendentes sob minha responsabilidade.”; ENT-02 Tipo:
  “Pendentes sob minha responsabilidade.”; CON-01 Tipo: “Pendentes sob minha
  responsabilidade.”; NOT-01 Tipo: “Pendentes sob minha responsabilidade.”;
  DOC-01 Tipo: “Pendentes sob minha responsabilidade.”; ADM-01 Data inicial:
  “Pendentes sob minha responsabilidade.”; ADM-02 Data inicial: “Pendentes sob
  minha responsabilidade.”; ADM-05 Data inicial: “Pendentes sob minha
  responsabilidade.”; ENT-02 Data inicial: “Pendentes sob minha
  responsabilidade.”; CON-01 Data inicial: “Pendentes sob minha
  responsabilidade.”; NOT-01 Data inicial: “Pendentes sob minha
  responsabilidade.”; DOC-01 Data inicial: “Pendentes sob minha
  responsabilidade.”; ADM-01 Data final: “Pendentes sob minha
  responsabilidade.”; ADM-02 Data final: “Pendentes sob minha
  responsabilidade.”; ADM-05 Data final: “Pendentes sob minha
  responsabilidade.”; ENT-02 Data final: “Pendentes sob minha
  responsabilidade.”; CON-01 Data final: “Pendentes sob minha
  responsabilidade.”; NOT-01 Data final: “Pendentes sob minha
  responsabilidade.”; DOC-01 Data final: “Pendentes sob minha
  responsabilidade.”; ADM-01 Responsável: “Pendentes sob minha
  responsabilidade.”; ADM-02 Responsável: “Pendentes sob minha
  responsabilidade.”; ADM-05 Responsável: “Pendentes sob minha
  responsabilidade.”

- **Campo:** Referência direta

  **Tipo/origem por tela e estado:** ADM-01 Referência direta: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ADM-02 Referência direta: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-05 Referência direta: READ_ONLY (TEXT_VALUE); Consulta do
  valor de origem; mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ADM-01 Referência direta: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ADM-02 Referência direta:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ADM-05 Referência direta:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ADM-01 Referência direta: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ADM-02 Referência direta: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável; ADM-05 Referência direta: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** ADM-01 Referência direta: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; ADM-02 Referência direta: Informação
  do registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.; ADM-05 Referência direta:
  Informação do registro indicado, somente para consulta nesta etapa. Ausência
  de dado histórico permanece explicitamente identificada.

- **Campo:** Página/cursor/total

  **Tipo/origem por tela e estado:** ADM-01 Página: CALCULATED
  (CALCULATED_DESCRIPTION); Resultado derivado dos fatos/valores apresentados;
  sem edição manual; ADM-02 Página: CALCULATED (CALCULATED_DESCRIPTION);
  Resultado derivado dos fatos/valores apresentados; sem edição manual; ADM-05
  Página: CALCULATED (CALCULATED_DESCRIPTION); Resultado derivado dos
  fatos/valores apresentados; sem edição manual; ADM-01 Cursor: INTERNAL
  (NO_USER_CONTROL); Dado de comando/transporte; nunca input ou identificador
  técnico exigido ao usuário; ADM-02 Cursor: INTERNAL (NO_USER_CONTROL); Dado
  de comando/transporte; nunca input ou identificador técnico exigido ao
  usuário; ADM-05 Cursor: INTERNAL (NO_USER_CONTROL); Dado de
  comando/transporte; nunca input ou identificador técnico exigido ao usuário;
  ADM-01 Total consultado: CALCULATED (CALCULATED_DESCRIPTION); Resultado
  derivado dos fatos/valores apresentados; sem edição manual; ADM-02 Total
  consultado: CALCULATED (CALCULATED_DESCRIPTION); Resultado derivado dos
  fatos/valores apresentados; sem edição manual; ADM-05 Total consultado:
  CALCULATED (CALCULATED_DESCRIPTION); Resultado derivado dos fatos/valores
  apresentados; sem edição manual

  **Obrigatoriedade/default na preparação:** ADM-01 Página: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ADM-02 Página: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; ADM-05 Página: Valor emitido, proposto ou calculado da
  fonte identificada; ausência explicitamente informada, sem valor inventado;
  ADM-01 Cursor: Não renderizar controle; ADM-02 Cursor: Não renderizar
  controle; ADM-05 Cursor: Não renderizar controle; ADM-01 Total consultado:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ADM-02 Total consultado:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ADM-05 Total consultado:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ADM-01 Página: Revalidar acesso, referência e estado
  na leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Resultado derivado dos fatos/valores apresentados; sem edição manual; ADM-02
  Página: Revalidar acesso, referência e estado na leitura/ação. Não solicitar
  ao usuário correção deste valor nesta tela. Resultado derivado dos
  fatos/valores apresentados; sem edição manual; ADM-05 Página: Revalidar
  acesso, referência e estado na leitura/ação. Não solicitar ao usuário
  correção deste valor nesta tela. Resultado derivado dos fatos/valores
  apresentados; sem edição manual; ADM-01 Cursor: Somente contrato interno,
  com validação no servidor; não expor segredo/UUID como decisão do usuário;
  ADM-02 Cursor: Somente contrato interno, com validação no servidor; não
  expor segredo/UUID como decisão do usuário; ADM-05 Cursor: Somente contrato
  interno, com validação no servidor; não expor segredo/UUID como decisão do
  usuário; ADM-01 Total consultado: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Resultado derivado dos fatos/valores apresentados; sem edição manual; ADM-02
  Total consultado: Revalidar acesso, referência e estado na leitura/ação. Não
  solicitar ao usuário correção deste valor nesta tela. Resultado derivado dos
  fatos/valores apresentados; sem edição manual; ADM-05 Total consultado:
  Revalidar acesso, referência e estado na leitura/ação. Não solicitar ao
  usuário correção deste valor nesta tela. Resultado derivado dos
  fatos/valores apresentados; sem edição manual

  **Ajuda/exemplo:** ADM-01 Página: Resultado calculado a partir dos fatos
  desta tarefa, apresentado para conferência. Ele não pode ser digitado ou
  corrigido aqui.; ADM-02 Página: Resultado calculado a partir dos fatos desta
  tarefa, apresentado para conferência. Ele não pode ser digitado ou corrigido
  aqui.; ADM-05 Página: Resultado calculado a partir dos fatos desta tarefa,
  apresentado para conferência. Ele não pode ser digitado ou corrigido aqui.;
  ADM-01 Cursor: Não rotular 100 recentes como todos.; ADM-02 Cursor: Não
  rotular 100 recentes como todos.; ADM-05 Cursor: Não rotular 100 recentes
  como todos.; ADM-01 Total consultado: Resultado calculado a partir dos fatos
  desta tarefa, apresentado para conferência. Ele não pode ser digitado ou
  corrigido aqui.; ADM-02 Total consultado: Resultado calculado a partir dos
  fatos desta tarefa, apresentado para conferência. Ele não pode ser digitado
  ou corrigido aqui.; ADM-05 Total consultado: Resultado calculado a partir
  dos fatos desta tarefa, apresentado para conferência. Ele não pode ser
  digitado ou corrigido aqui.

- **Campo:** Proposta e versão

  **Tipo/origem por tela e estado:** ADM-04 Proposta: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-04 Versão da proposta: READ_ONLY (TEXT_VALUE); Consulta do
  valor de origem; mudanças só no processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ADM-04 Proposta: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ADM-04 Versão da proposta: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado

  **Validação/unidade:** ADM-04 Proposta: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-04 Versão da proposta: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** ADM-04 Proposta: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ADM-04 Versão da proposta: Informação do
  registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Motivo da alteração/decisão

  **Tipo/origem por tela e estado:** ADM-03 Motivo da alteração/decisão:
  EDITABLE (TEXTAREA); Somente no subestado de preparação autorizado indicado
  na ficha; resumo/decisão posterior é leitura; ADM-04 Motivo da
  alteração/decisão: EDITABLE_SUBFORM (TEXTAREA); Motivo da decisão é próprio;
  motivo e conteúdo originais permanecem em leitura

  **Obrigatoriedade/default na preparação:** ADM-03 Motivo da
  alteração/decisão: Quando ação crítica; ADM-04 Motivo da alteração/decisão:
  Quando ação crítica

  **Validação/unidade:** ADM-03 Motivo da alteração/decisão: 3–1000 onde
  contrato herdado; Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura; ADM-04 Motivo da
  alteração/decisão: 3–1000 onde contrato herdado; Motivo da decisão é
  próprio; motivo e conteúdo originais permanecem em leitura

  **Ajuda/exemplo:** ADM-03 Motivo da alteração/decisão: “Por que esta
  permissão precisa mudar?”; ADM-04 Motivo da alteração/decisão: “Por que esta
  permissão precisa mudar?”

- **Campo:** Capacidade/política proposta

  **Tipo/origem por tela e estado:** ADM-04 Capacidade proposta: READ_ONLY
  (CAPABILITY_COMPARISON); Capacidade proposta congelada e antes/depois por
  pessoa/alcance; ADM-04 Política proposta: READ_ONLY (POLICY_COMPARISON);
  Política proposta tipada; nenhum JSON ou seletor para editar na aprovação

  **Obrigatoriedade/default na preparação:** ADM-04 Capacidade proposta: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado; ADM-04 Política proposta:
  Valor emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ADM-04 Capacidade proposta: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Capacidade proposta congelada e antes/depois por
  pessoa/alcance; ADM-04 Política proposta: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Política proposta tipada; nenhum JSON ou seletor para editar na
  aprovação

  **Ajuda/exemplo:** ADM-04 Capacidade proposta: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.; ADM-04 Política proposta: Informação
  do registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

- **Campo:** Prazo de acompanhamento

  **Tipo/origem por tela e estado:** ADM-03 Prazo de acompanhamento: EDITABLE
  (DURATION_INPUT); Somente no subestado de preparação autorizado indicado na
  ficha; resumo/decisão posterior é leitura

  **Obrigatoriedade/default na preparação:** ADM-03 Prazo de acompanhamento:
  Conforme configuração

  **Validação/unidade:** ADM-03 Prazo de acompanhamento: Duração configurada
  válida e unidade visível; muda só acompanhamento, nunca desfaz persistência;
  Somente no subestado de preparação autorizado indicado na ficha;
  resumo/decisão posterior é leitura

  **Ajuda/exemplo:** ADM-03 Prazo de acompanhamento: PDF lento não cancela
  consulta de avisos.

- **Campo:** Correlação de erro

  **Tipo/origem por tela e estado:** ADM-05 Correlação de erro: READ_ONLY
  (TEXT_VALUE); Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Obrigatoriedade/default na preparação:** ADM-05 Correlação de erro: Valor
  emitido, proposto ou calculado da fonte identificada; ausência
  explicitamente informada, sem valor inventado

  **Validação/unidade:** ADM-05 Correlação de erro: Revalidar acesso,
  referência e estado na leitura/ação. Não solicitar ao usuário correção deste
  valor nesta tela. Consulta do valor de origem; mudanças só no processo
  legitimamente responsável

  **Ajuda/exemplo:** ADM-05 Correlação de erro: Informação do registro
  indicado, somente para consulta nesta etapa. Ausência de dado histórico
  permanece explicitamente identificada.

- **Campo:** Job/tentativa/referência externa

  **Tipo/origem por tela e estado:** ADM-05 Job: READ_ONLY (TEXT_VALUE);
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-05 Tentativa: READ_ONLY (TEXT_VALUE); Consulta do valor de
  origem; mudanças só no processo legitimamente responsável; ADM-05 Referência
  externa: READ_ONLY (TEXT_VALUE); Consulta do valor de origem; mudanças só no
  processo legitimamente responsável

  **Obrigatoriedade/default na preparação:** ADM-05 Job: Valor emitido,
  proposto ou calculado da fonte identificada; ausência explicitamente
  informada, sem valor inventado; ADM-05 Tentativa: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado; ADM-05 Referência externa: Valor emitido, proposto ou
  calculado da fonte identificada; ausência explicitamente informada, sem
  valor inventado

  **Validação/unidade:** ADM-05 Job: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-05 Tentativa: Revalidar acesso, referência e estado na
  leitura/ação. Não solicitar ao usuário correção deste valor nesta tela.
  Consulta do valor de origem; mudanças só no processo legitimamente
  responsável; ADM-05 Referência externa: Revalidar acesso, referência e
  estado na leitura/ação. Não solicitar ao usuário correção deste valor nesta
  tela. Consulta do valor de origem; mudanças só no processo legitimamente
  responsável

  **Ajuda/exemplo:** ADM-05 Job: Informação do registro indicado, somente para
  consulta nesta etapa. Ausência de dado histórico permanece explicitamente
  identificada.; ADM-05 Tentativa: Informação do registro indicado, somente
  para consulta nesta etapa. Ausência de dado histórico permanece
  explicitamente identificada.; ADM-05 Referência externa: Informação do
  registro indicado, somente para consulta nesta etapa. Ausência de dado
  histórico permanece explicitamente identificada.

<!-- c-table:end -->

## Listas e decisões completas

Melhorar cada lista existente: filtros coerentes, busca, página seguinte,
consulta individual, total quando disponível, responsável e ação correta.
Consumo/entregas/propostas/auditoria não podem esconder pending antigo atrás
de 50/100 recentes. Links internos preservam filtros e retorno seguro.
Resultado é identificado por paciente, query, cursor e revisão; resposta
tardia de filtro anterior não troca a lista. Em erro secundário, painel válido
permanece marcado com sua data, sem afirmar zero dados.

Proposta global guarda intenção, alvo e versão; outra identidade local decide.
Resumo apresenta nome da regra, pessoa afetada, antes/depois, alcance e
próxima autoridade. Todo kind permitido tem presenter próprio; kind
desconhecido mostra indisponibilidade segura e encaminhamento, sem aprovar
objeto opaco. Overrides críticos mantêm diálogo e foco em 409. Editar intenção
depois de resultado incerto não usa a mesma chave; primeiro recuperar/encerrar
a tentativa anterior.

Criar paciente inativo respeita false em API/RPC ou recusa a opção antes de
persistir; não declarar sucesso diferente da escolha. Nome curto tem ações
manter/alterar/remover inequívocas. Auditoria humana inclui autor, objeto,
instante e diferença, sem usar nome atual como se fosse histórico.

## Suporte e incerteza

Profissional recebe ação operacional: consultar, conferir, complementar,
aguardar responsável ou contatar suporte. Família/admin local decide
pendências administrativas do paciente. Suporte/global trata configuração,
erro interno, Storage/integração e recuperação, com acesso mínimo e trilha;
não assume recebimento físico ou poderes locais para “destravar”.

Leitura falhou: repetir GET. Comando falhou antes de efeito comprovado:
corrigir campo/autoridade. Resposta perdida: consultar mesma intenção. Comando
multi-etapa mostra etapa confirmada e recusada/uncertain. Erro SQL de
implementação não vira conflito de nome de produto. UUID malformado é 4xx
seguro e não retryable, sem alterar recurso oculto para enumerável. Mensagem
concluída não regride após timeout fixo; PDF e entrega de aviso têm
cancelamento/acompanhamento separados.

Aceites:51 propostas/101 eventos antigos alcançáveis; erro de uma seção não
zera outra; duas sessões atualizam lista sem perder edição; proposta
desconhecida não aprova; retry com chave estável não duplica;409 mantém
resumo/foco; usuário leigo explica objeto e consequência antes de decidir.
/inventarios e links antigos permanecem compatíveis; limpeza de módulos órfãos
é lote futuro opcional.
