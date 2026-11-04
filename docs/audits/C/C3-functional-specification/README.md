# C3 — especificação do produto desejado

**PLANEJADO NÃO IMPLEMENTADO.** O contrato AS_IS é a base funcional
`37cb7f85e96e551d6419871f94dd950712e2565b`, com desvios nas auditorias A/B.
TO_BE aplica as decisões de 30/10/2026; detalhes técnicos propostos não
significam execução ou aprovação de política pendente.

Começar por [atores e permissões](PERSONAS_PERMISSIONS_AND_ACTORS.md) e
[estados e linguagem](UI_STATES_AND_MICROCOPY.md). Suas regras se aplicam a
**cada tela, formulário, painel e diálogo** dos domínios abaixo; uma
referência
ao padrão não dispensa as diferenças explicitadas no domínio.

<!-- c-table:start -->

- **Tarefa:** Declarar necessidade e ciência

  **Especificação:** [REQ](REQ.md)

- **Tarefa:** Comprar/doação, validar e concluir menor

  **Especificação:** [COM](COM.md)

- **Tarefa:** Expedir, conferir e conciliar

  **Especificação:** [ENT](ENT.md)

- **Tarefa:** Contar, recontar e revisar

  **Especificação:** [BAL](BAL.md)

- **Tarefa:** Programar pessoas e horários

  **Especificação:** [Escalas](SCHEDULES_AND_STAFFING.md)

- **Tarefa:** Custódia, ajustes e transferência

  **Especificação:** [Estoque](STOCK_AND_CUSTODY.md)

- **Tarefa:** Materiais, equivalências e duplicatas

  **Especificação:** [Catálogo](CATALOGUE_AND_PRESENTATIONS.md)

- **Tarefa:** Relatar e complementar

  **Especificação:** [Consumo](CONSUMPTION_AND_OCCURRENCES.md)

- **Tarefa:** Identidade, vínculo e revogação

  **Especificação:** [Acesso](IDENTITY_ACCESS_MEMBERSHIPS.md)

- **Tarefa:** Anexos e rascunhos duráveis

  **Especificação:** [Recuperação de edição](ATTACHMENTS_AND_DRAFTS.md)

- **Tarefa:** Instalar e receber avisos

  **Especificação:** [PWA e notificações](PWA_PUSH_AND_NOTIFICATIONS.md)

- **Tarefa:** História e comprovantes verificáveis

  **Especificação:** [Documentos](DOCUMENTS_PDFS_AND_INTEGRITY.md)

- **Tarefa:** Listas, decisões e suporte

  **Especificação:** [Administração](ADMINISTRATIVE_OPERATIONS.md)

- **Tarefa:** Primeiro uso e contingência

  **Especificação:** [Guias e continuidade](USER_GUIDES_AND_CONTINUITY.md)

<!-- c-table:end -->

O inventário CSV de telas/campos/ações é um índice derivado destas tabelas;
não é uma segunda especificação concorrente. “Atual” identifica endereço ou
capacidade existente, não afirma que a mudança planejada já funciona ali.
Rotas propostas ficam explicitamente marcadas; aliases/demos permanecem por
compatibilidade, sem receber funções operacionais novas.

Exemplos são fictícios. Limites herdados são preservados quando não há motivo
para mudar; novos limites/labels técnicos têm caráter
`PROPOSED_TECHNICAL_DEFAULT`. Políticas humanas pendentes sempre apontam Pxx.
O implementador deve fechar esse ponto antes de executar o ramo, mantendo o
restante do plano utilizável.
