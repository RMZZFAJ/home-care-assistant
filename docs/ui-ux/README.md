# Evolução da experiência Fluent 2

## Escopo aprovado

Refatoração integral da apresentação da V4, preservando contratos, capacidades,
contexto explícito, dados e transações. Uma aplicação oferece experiência
gerencial para família/administração e operacional para equipe/supervisão.

As referências aprovadas estão em references. Elas são demonstrações com dados
fictícios: não representam autorização, estado de comunicação ou regras reais.
O inventário inclui páginas, componentes indiretos, dependências e estados
identificáveis no código. Gere-o com `node scripts/inventory-ui.mjs`.

## Decisões consolidadas

- Fluent UI React v9, tema claro e azul empresarial; identidade própria.
- Gerência completa também no celular; operação com cinco destinos:
  Início, Histórico, Entregas, Estoque e Mais.
- Contexto selecionado explicitamente no servidor; troca no menu do usuário.
- Listas primeiro, edição contextual, matrizes compactas e campos progressivos.
- REQ conserva etapas e não contém quantidade solicitada.
- Visualizador compartilhado preserva links e versões documentais existentes.
- Escalas persistentes: semanais, avulsas, 12×36, 24×48 e 24×24, sem check-in.
- Administração de escala, execução de BAL e aprovação familiar são distintas.
- BAL começa no plantão designado; atraso transfere a mesma obrigação.
- Uma contagem atual regulariza pendências anteriores sem inventar contagens
  físicas passadas nem apagar atrasos.
- Adiamento de equipe ou supervisão exige aprovação familiar; proposta pendente
  não suspende prazo, responsabilidade ou alertas.
- Processamento automático novo é habilitado por paciente, primeiro na
  homologação. Migrations não habilitam processamento para todos os pacientes.
- Remoto recebe somente evolução incremental após backup e validação local.
  Preservar usuários, vínculos, produtos, documentos, estoques e demais dados.
  Não realizar reset de banco.

## Arquitetura de apresentação

A fundação reúne tema/tokens, provider SSR, controles Fluent e padrões de
layout, campos, listas, painéis e feedback. Componentes de domínio consomem
essa biblioteca; regras de autorização e estoque continuam no servidor.

O shell gerencial possui cabeçalho compacto e navegação lateral agrupada,
recolhível no desktop e em drawer no celular. O shell operacional prioriza
tarefas e usa navegação inferior. Supervisão acompanha a equipe sem assumir
ações destinadas a outra identidade.

Documentos mostram ação contextual, itens, relações, anexos, comunicações e
histórico, revelando detalhes progressivamente. Aceite, ciência, atendimento,
conferência, conciliação, aprovação e comunicação mantêm significados próprios.

## Execução e evidências

Consulte EXECUTION.md para o andamento por bloco e INVENTORY.md para a cobertura
da interface. Resultados anteriores da V4 não substituem a validação desta
evolução. Integrações externas só serão declaradas verificadas com evidência
real do provedor.
