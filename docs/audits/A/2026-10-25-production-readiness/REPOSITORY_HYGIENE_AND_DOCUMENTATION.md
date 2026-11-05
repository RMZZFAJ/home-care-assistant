# Higiene do repositório e documentação

Base: `37cb7f85e96e551d6419871f94dd950712e2565b`. O inventário contém
503 arquivos versionados. A revisão distingue código ativo, compatibilidade,
evidência datada, protótipos e artefatos gerados. Nenhum arquivo do produto foi
alterado ou removido nesta fase.

## Fontes e deriva documental

README, AGENTS e os documentos de arquitetura continuam úteis para entender
invariantes. Seus números de estado, entretanto, não têm uma única fonte atual.
README:81–82 apresenta 35 migrations, 69 unitários e 32 E2E como auditoria
atual.
AGENTS:44 fala em 19 hashes; DATABASE:6 fala em 63. O manifesto e o guard
executados nesta auditoria protegem 84 migrations. `docs/evolution/EXECUTION.md`
ainda abre com PR 5 em rascunho, embora o HEAD examinado já seja o merge.

**REPO-001:** separar instruções permanentes de checkpoints datados. Manter
os relatórios de 20/21 de outubro como história legítima; corrigir os links e
as afirmações de estado dos pontos de entrada na Fase B. Não reescrever logs
antigos para fazê-los parecer produzidos no SHA atual.

Os quatro anexos da missão estão fora do inventário versionado e foram
preservados. Os prompts em `docs/audits/2026-10-20/sources/` são insumos
históricos subordinados à ordem atual: suas permissões de implementar,
publicar ou aplicar mudanças remotas não vigoram nesta Fase A.

## Classificação de manutenção

- Grupo: 84 migrations e manifesto; Decisão proposta: KEEP; Motivo e condição:
  História aplicada; evolução incremental; jamais squash silencioso
- Grupo: `/historico/[id]`, `/fichas/[id]`, `/documentos/[id]`; Decisão
  proposta: KEEP; Motivo e condição: Links em notificações, documentos e
  compatibilidade
- Grupo: `/inventarios`; Decisão proposta: KEEP/DEPRECATE explícito; Motivo e
  condição: Redirect preserva URL anterior; não implica retirar RPC/schema
- Grupo: RequisitionHistory, InventoryConsole, PrintButton; Decisão proposta:
  DELETE_CANDIDATE; Motivo e condição: UX-010; sem consumidor executável
  encontrado; confirmar novamente na Fase B
- Grupo: Cinco SVGs iniciais de Next/Vercel; Decisão proposta: DELETE_CANDIDATE;
  Motivo e condição: Sem referência encontrada; confirmar acesso direto/externo
  antes de retirar URLs públicas
- Grupo: Fontes NotoSans e OFL; Decisão proposta: KEEP; Motivo e condição:
  Consumidas pelo PDF; glifos portugueses e licença conferidos
- Grupo: PDFs e HTMLs de referência; Decisão proposta: ARCHIVE/KEEP; Motivo e
  condição: Exemplos identificados, não código de produção nem prova atual
- Grupo: Auditorias de 20/21 e evidências de UI de 25; Decisão proposta:
  ARCHIVE/KEEP; Motivo e condição: Rastreabilidade; corrigir índices, não apagar
  evidências
- Grupo: Geradores de auditoria histórica; Decisão proposta: MOVE/REFACTOR;
  Motivo e condição: REPO-002; destino fixo pode sobrescrever relatório anterior
- Grupo: Script de submissão Meta; Decisão proposta: REFACTOR; Motivo e
  condição: REPO-003; consulta e publicação precisam de modos explícitos
- Grupo: Verificação Linux manual; Decisão proposta: REFACTOR; Motivo e
  condição: REPO-004; exportar apenas arquivos necessários, sem `.private`

`evidence/consumer-search.txt` registra busca de símbolos e caminhos em código,
rotas, testes, scripts, CI, configuração e documentos. Referências em inventário
ou relatório de alterações não são chamadas em execução. Não há observação de
logs de acesso de produção nesta fase: por isso assets públicos são candidatos,
não autorização de remoção. Bibliotecas não foram classificadas como inúteis
somente por tamanho ou nome.

## Ferramentas e dependências

Node 24.22.0 e npm 11.21.1 foram usados nos checks. O Node padrão da máquina
era 24.13.0; a execução foi isolada com o binário correto no PATH do processo,
sem alterar a configuração global. O lock v3 contém 539 entradas incluindo a
raiz; todas as dependências diretas coincidem com package.json. As entradas
resolvidas usam o registry npm e têm integridade. `npm ls` passou. As auditorias
atuais de dependências de produção e completas retornaram zero alertas.

Isso é evidência da árvore instalada e dos advisories consultados na data,
não prova de ausência universal de vulnerabilidades. Os relatórios antigos
com seis alertas de desenvolvimento não descrevem o resultado atual.

## Legibilidade e organização

O projeto já tem separação de autorização, domínio, read models, providers e
componentes. Não há justificativa demonstrada para reescrever a aplicação.
Arquivos extensos de administração, detalhes e wizards merecem extração por
caso de uso, orientada a consumidores reais e preservando seus contratos.
Centralizar apenas o que reduz divergência: mensagens por evento, apresentação
de propostas, estado de carregamento e envelope de tentativa recuperável.

Os scripts de catálogo, reconciliação e rastreabilidade têm finalidade válida,
mas seus diretórios fixos misturam ferramenta reutilizável e execução passada.
Uma interface com `--output`, SHA e data, recusando sobrescrita por padrão,
permite reutilização sem falsificar a cronologia. O script Meta deve separar
`inspect` de `submit`, validar destino e paginação e exigir conta explicitamente
selecionada. Esses scripts não foram executados para publicar ou atualizar
documentos antigos durante a auditoria.

## Estrutura-alvo proposta

Manter `src/app`, componentes por domínio, `src/lib` e migrations em seus
locais atuais. Não há benefício demonstrado para uma reorganização geral.
A mudança proposta concentra ferramenta reutilizável e estado de release:

```text
README.md                       entrada atual, sem contagens voláteis
AGENTS.md                       instruções permanentes
docs/
  ARCHITECTURE.md, DATABASE.md   contratos vivos
  SECURITY.md, TESTING.md       políticas e método
  OPERATIONS.md, DEPLOYMENT.md  operação e recuperação
  releases/<data-sha>/          estado e aceite do release (proposto)
  audits/<data>/               diagnósticos imutáveis
  references/<versao>/         fontes e exemplos identificados
scripts/
  audit/                       geradores com saída e SHA explícitos
  integrations/meta/           inspeção e submissão distintas
  demais scripts atuais        guards e suíte preservados
```

MOVE dos geradores só após atualizar consumidores e manter modo de reprodução
histórica; REPO-002 também admite conservar o script junto do relatório.
RENAME pode explicitar `inspect`/`submit` no comando Meta, sem renomear domínio
ou URLs. MERGE proposto limita-se às declarações duplicadas de estado atual
num índice de release; documentos de contratos e relatórios históricos mantêm
suas responsabilidades. Nenhuma destas mudanças foi executada nesta fase.

## Documentação operacional

Manter um índice atual que leve a: quem pode fazer cada operação; recuperação
de resposta perdida; divergência/cancelamento; administração de acesso; fila
incerta; bootstrap; continuidade e restauração. Os detalhes de implantação
devem apontar para evidência do SHA implantado. A documentação para operadores
deve usar linguagem de tarefa e esconder IDs/JSON que não ajudam a decisão.

O glossário e os campos estão no relatório de microcopy. O plano de execução
separa limpeza de correções operacionais, evitando que remoções cosméticas
atrasem consertos de decisão, recuperação e automação.
