# Administração, listas, propostas e suporte

AS_IS: /, /fichas, /mais, /admin, /configuracoes e /notificacoes;
AdminConsole,
PolicyConsole e endpoints com governança local/global. Há listas e painéis
úteis;
B3-012/B4-005 truncam história/propostas e B1-UX-003 exige interpretar JSON.
TO_BE DEC-013/014/015/021/024 e O01/O04/O15, sem nova central genérica por
padrão.

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

  **Tipo/origem:** Contexto de servidor

  **Obrigatório e default:** Sim

  **Validação/unidade:** Global e local explícitos

  **Ajuda e exemplo:** Nenhuma seleção no browser concede acesso.

- **Campo:** Nome/estado do paciente

  **Tipo/origem:** Texto/boolean administrativo

  **Obrigatório e default:** Sim ao cadastrar

  **Validação/unidade:** Nome com 2–160 caracteres; isActive=false deve ser respeitado;
  isDevelopment identificado

  **Ajuda e exemplo:** Ambiente fictício não vira operação por renomear
  paciente.

- **Campo:** Administrador inicial

  **Tipo/origem:** E-mail confirmado

  **Obrigatório e default:** Sim na criação com primeiro vínculo

  **Validação/unidade:** Autoridade de criação global não substitui vínculo
  operacional

  **Ajuda e exemplo:** “Quem administrará esta residência?”

- **Campo:** Seção e busca

  **Tipo/origem:** Seletores/termo

  **Obrigatório e default:** Não, estado de consulta explícito

  **Validação/unidade:** Termo/cursor por paciente e seção

  **Ajuda e exemplo:** Rótulo “Catálogo do paciente” difere de “Unidades”.

- **Campo:** Estado/tipo/período/responsável

  **Tipo/origem:** Filtros combináveis

  **Obrigatório e default:** Defaults declarados

  **Validação/unidade:** Início/fim válidos; paginação estável por data+ID

  **Ajuda e exemplo:** “Pendentes sob minha responsabilidade.”

- **Campo:** Referência direta

  **Tipo/origem:** UUID/protocolo resolvido no servidor

  **Obrigatório e default:** Se abrir link de tarefa

  **Validação/unidade:** GET por ID independente da janela recente

  **Ajuda e exemplo:** Acesso negado não enumera outro paciente.

- **Campo:** Página/cursor/total

  **Tipo/origem:** Resposta do servidor

  **Obrigatório e default:** Somente leitura

  **Validação/unidade:** Indicar total conhecido ou existência de próxima
  página

  **Ajuda e exemplo:** Não rotular 100 recentes como todos.

- **Campo:** Proposta e versão

  **Tipo/origem:** Servidor

  **Obrigatório e default:** Sim ao decidir

  **Validação/unidade:** Kind conhecido traduzido; desconhecido não aprovável

  **Ajuda e exemplo:** Valores atuais/propostos lado a lado.

- **Campo:** Motivo da alteração/decisão

  **Tipo/origem:** Texto do ator

  **Obrigatório e default:** Quando ação crítica

  **Validação/unidade:** 3–1000 onde contrato herdado

  **Ajuda e exemplo:** “Por que esta permissão precisa mudar?”

- **Campo:** Capacidade/política proposta

  **Tipo/origem:** Seleção tipada

  **Obrigatório e default:** Conforme kind

  **Validação/unidade:** Alvo local, segunda identidade, versão da política

  **Ajuda e exemplo:** Nunca pedir ao usuário ler JSON para aprovar.

- **Campo:** Prazo de acompanhamento

  **Tipo/origem:** Política do paciente

  **Obrigatório e default:** Conforme configuração

  **Validação/unidade:** Valor configurado governa só acompanhamento, não
  desfaz persistência

  **Ajuda e exemplo:** PDF lento não cancela consulta de avisos.

- **Campo:** Correlação de erro

  **Tipo/origem:** Código seguro de servidor

  **Obrigatório e default:** Em falha técnica

  **Validação/unidade:** Sem SQL, segredo ou payload privado

  **Ajuda e exemplo:** “Informe esta referência ao suporte.”

- **Campo:** Job/tentativa/referência externa

  **Tipo/origem:** Readmodel administrativo

  **Obrigatório e default:** Ao conciliar envio incerto

  **Validação/unidade:** Escopo, origem, timestamps e tentativa exata

  **Ajuda e exemplo:** Referência vazia significa desconhecida, não “não
  enviado”.

<!-- c-table:end -->

## Listas e decisões completas

Melhorar cada lista existente: filtros coerentes, busca, página seguinte,
consulta individual, total quando disponível, responsável e ação correta.
Consumo/entregas/propostas/auditoria não podem esconder pending antigo atrás
de
50/100 recentes. Links internos preservam filtros e retorno seguro. Resultado
é identificado por paciente, query, cursor e revisão; resposta tardia de
filtro
anterior não troca a lista. Em erro secundário, painel válido permanece
marcado
com sua data, sem afirmar zero dados.

Proposta global guarda intenção, alvo e versão; outra identidade local decide.
Resumo apresenta nome da regra, pessoa afetada, antes/depois, alcance e
próxima
autoridade. Todo kind permitido tem presenter próprio; kind desconhecido
mostra
indisponibilidade segura e encaminhamento, sem aprovar objeto opaco. Overrides
críticos mantêm diálogo e foco em 409. Editar intenção depois de resultado
incerto
não usa a mesma chave; primeiro recuperar/encerrar a tentativa anterior.

Criar paciente inativo respeita false em API/RPC ou recusa a opção antes de
persistir; não declarar sucesso diferente da escolha. Nome curto tem ações
manter/alterar/remover inequívocas. Auditoria humana inclui autor, objeto,
instante e diferença, sem usar nome atual como se fosse histórico.

## Suporte e incerteza

Profissional recebe ação operacional: consultar, conferir, complementar,
aguardar responsável ou contatar suporte. Família/admin local decide
pendências
administrativas do paciente. Suporte/global trata configuração, erro interno,
Storage/integração e recuperação, com acesso mínimo e trilha; não assume
recebimento físico ou poderes locais para “destravar”.

Leitura falhou: repetir GET. Comando falhou antes de efeito comprovado:
corrigir
campo/autoridade. Resposta perdida: consultar mesma intenção. Comando
multi-etapa
mostra etapa confirmada e recusada/uncertain. Erro SQL de implementação não
vira
conflito de nome de produto. UUID malformado é 4xx seguro e não retryable, sem
alterar recurso oculto para enumerável. Mensagem concluída não regride após
timeout fixo; PDF e entrega de aviso têm cancelamento/acompanhamento
separados.

Aceites:51 propostas/101 eventos antigos alcançáveis; erro de uma seção não
zera outra; duas sessões atualizam lista sem perder edição; proposta
desconhecida
não aprova; retry com chave estável não duplica;409 mantém resumo/foco;
usuário
leigo explica objeto e consequência antes de decidir. /inventarios e links
antigos permanecem compatíveis; limpeza de módulos órfãos é lote futuro
opcional.
