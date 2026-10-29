# Baseline Verificado — Home Care Assistant

## Natureza

Este documento NÃO é um relatório de auditoria.

Ele contém fatos verificados preliminarmente antes da Fase A e hipóteses abertas.

Revalide tudo que for relevante.

Não trate nenhuma observação aqui como problema confirmado.

Não limite a auditoria a estes pontos.

## Referência esperada

No momento da preparação desta ordem, `master` apontava para:

37cb7f85e96e551d6419871f94dd950712e2565b

Merge relacionado a Fluent UI 2, escalas e BAL por plantão.

Revalide HEAD local.

## Sinais verificados

### Design system em transição

O documento atual `docs/ui-ux/DESIGN_SYSTEM.md` declara Fluent UI React v9 como
fundação e descreve classes legadas como compatibilidade transitória durante a
migração.

`src/app/layout.tsx` importa:

- globals.css
- design-system.css
- theme/tokens.css

`globals.css` e `design-system.css` ainda contêm tokens/padrões anteriores.

`theme/tokens.css` aplica a identidade azul Fluent e também adapta classes
`.ui-*` legadas dentro do tema atual.

Há consumidores de componentes Fluent e consumidores de controles HTML/classes
próprias.

Isso deve ser investigado visual e semanticamente. Não assumir que toda
coexistência seja defeito.

### Componentes e microcopy

`src/components/ui/primitives.tsx` já utiliza componentes Fluent em wrappers
compartilhados.

`StatusBadge` possui fallback para o valor bruto de status quando não encontra
tradução conhecida.

Investigar se valores técnicos podem realmente alcançar a interface e, de forma
mais ampla, revisar terminologia e estados excepcionais.

### Governança

`AGENTS.md` contém invariantes fortes de autorização, catálogo, estoque,
documentação, banco e testes.

Ler integralmente antes da auditoria.

O próprio arquivo alerta que a versão de Next utilizada possui mudanças que
exigem consulta à documentação instalada correspondente antes de alterações.

### Banco local

A suíte utiliza o projeto Supabase local existente.

A decisão atual do usuário é tratar dados locais como descartáveis e
deterministicamente reconstruíveis.

Não criar stacks adicionais por precaução.

Nunca reduzir a proteção contra comandos acidentais no remoto.

Documentos/scripts históricos ainda contêm processos de backup/replay. Avaliar
quais continuam justificáveis na estratégia futura.

### Seed

`supabase/seed.sql` se identifica como seed de desenvolvimento local.

Atualmente contém paciente fictício e catálogo de produtos/aliases.

Investigar separação correta entre:

- desenvolvimento;
- teste;
- bootstrap de produção;
- catálogo real inicial;
- contas de teste/homologação;
- administrador global.

### Auditorias históricas

Existem auditorias extensas em:

docs/audits/2026-10-20/
docs/audits/2026-10-21/

Elas possuem valor para compreender decisões, contratos e evidências anteriores.

Não herdar automaticamente seus estados de aceite.

O sistema mudou depois delas.

### E2E

A configuração atual do Playwright possui projetos representativos de desktop,
Android e iOS/WebKit.

Screenshots normais são configurados principalmente para falhas.

Há suíte relevante de acessibilidade, administração, Fluent, escalas, BAL,
autenticação, onboarding e outras áreas.

A auditoria precisa avaliar os próprios testes e também realizar exploração
humana/visual intencional.

## Perguntas abertas, não conclusões

Investigar independentemente:

- quanto da transição Fluent está realmente concluída no produto renderizado;
- se há padrões visuais duplicados ou apenas adaptações deliberadas;
- quais termos continuam excessivamente técnicos;
- quais jornadas exigem passos desnecessários;
- quais estados raros não recebem UX adequada;
- quais telas, ferramentas, informações ou configurações estão faltando;
- quais recursos existentes estão escondidos ou subutilizados;
- quais regras hardcoded deveriam ser configuráveis;
- quais abstrações/rotas/docs permaneceram por compatibilidade e quais são legado;
- se o bootstrap atual consegue produzir o ambiente inicial desejado;
- se os testes atuais refletem suficientemente o comportamento humano;
- quais problemas completamente diferentes desses existem no repo.

Estas perguntas não constituem o escopo completo.

A tarefa principal continua sendo descobrir o que ainda não sabemos que devemos
procurar.
