# M3 — Manutenção segura e pontos de dispersão

## Fundações que reduzem risco

As regras de paciente, ledger, série/hash/snapshot e versão são produzidas no
banco. Client capabilities e menus não são a autoridade. Há schemas
compartilhados, catálogo de erros, helpers de origem, wrapper Supabase com
destino fixado e harness local. Reexport de Workspace preserva consumidores
durante evolução interna. Essas estruturas devem ser mantidas.

O grafo e tamanho ajudam localizar responsabilidades, sem transformar LOC em
defeito. SupplyWizard tem 671 linhas; renderer PDF659; admin handler600;
StockConsole540; etapasREQ537; detalheREQ535. Alguns arquivos têm linhas densas,
então comparar só LOC também seria enganoso.

## Casos concretos para refatoração localizada após decisão

**Quantidade e precisão.** `validation/documents.ts` é reutilizado por
documentos, consumo, Flow, movimentos, apresentações e thresholds. A UI usa
quantity/validQuantity e a RPC precisa validar antes da coerção numérica. B4-001
e B3-018 mostram divergências reais entre number/string e entrada RPC direta. A
correção precisa dos dois contratos, com positivos/negativos e compatibilidade
legada. Centralizar só no navegador ou remover validação do banco tornaria a
manutenção menos segura.

**Configuração externa.** Provider usa metaConfiguration; notification-rules
calcula disponibilidade separadamente. B7-002 comprovou divergência. Um
resultado de readiness compartilhado no servidor pode ser alternativa
proporcional, desde que não exponha segredos e preserve canais opcionais. Não é
motivo para criar serviço remoto, importar credenciais no cliente ou reescrever
a integração.

**Atualização e estado de leitura.** ConsumptionConsole depende de
context.patient/attempt; FlowReviews depende de patientId/attempt. O contexto
pode conservar referências enquanto a revisão muda. B4-012/B5-010 são
consumidores que não reagem, diferentes da emissão ausente B3-013. Corrigir cada
effect sem contrato de invalidação pode gerar refresh excessivo, resposta antiga
ou perda de draft. Antes de abstrair, provar dois consumidores e definir
revision, cancelamento de resposta e preservação de edição.

**Tentativa composta.** SupplyWizard conduz draft, versão, chaves separadas de
revisão/submissão e recuperação. Settings gera nova chave em retry; revise e
submit podem confirmar parcialmente. Os envelopes precisam expressar fatos
confirmados e intenção incerta por comando. Um wrapper genérico que classifica
toda falha como retry não resolve B4-002/004 ou B1-ERR-002.

**Apresentação e proveniência.** RendererPDF mistura layout, seleção de fatos,
estados e próximos passos. Separar um presenter de conteúdo tipado do desenho
pode facilitar testes, desde que haja consumidores e oráculos concretos.
B6-004/005/006/007 precisam conteúdo e geometria; extrair funções sem conferir
esses efeitos apenas deslocaria o defeito. Nomes do diretório atual não podem
substituir snapshots históricos.

**Handler administrativo.** Várias ações compartilham contexto, schema e
autorização. Extrair comandos por caso pode reduzir revisão dispersa, mas
precisa conservar capacidades diferentes, estado inicial, erro seguro e
compatibilidade das rotas. A dimensão do arquivo não justifica reescrever todo o
módulo nem duplicar seus guards em cada componente.

## Compatibilidade, tipos e legado

Duplicação de validação entre camadas é necessária quando há acesso direto;
duplicação divergente de significado precisa de contrato verificável. Unidades,
grupos de revisão, ciência, recebido e atendimento não devem ser reunidos em um
booleano de “concluído” para reduzir código.

Componentes candidatos sem consumidor não precisam ser mantidos para uma
abstração futura. Em sentido oposto, AppWorkspace/reexports, redirect
/inventarios e fontes são consumidos e devem ser preservados. Tipos ativos e
tipos antigos com mesmo nome exigem busca pelo caminho, não substituição global
por nome.

## Custo e verificação de mudanças futuras

Para cada mudança, listar contratos tocados e consumidores antes de editar.
Testar no menor nível que discrimina a causa e cruzar UI/API/DB quando o efeito
atravessar essas camadas. Manter probes históricos como diagnóstico e criar
expectativa correta após decisão. Não acrescentar dependência, camada de
serviço, framework de estado ou reorganização sem consumidor demonstrado.

Essas são oportunidades e dependências para C/D. Não houve extração,
refatoração, padronização de fluxos ou alteração de contrato na B8.
