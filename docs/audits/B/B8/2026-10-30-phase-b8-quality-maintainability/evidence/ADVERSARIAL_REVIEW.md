# Revisão transversal e contraprovas B8

## Um teste pode passar apesar do defeito?

Sim: a mutação PDF mantém metadata/páginas, perde todo texto e passa nos cinco
casos selecionados. Título errado é recusado. SQL ternário aceitaNULL no guard
isolado, mas valor errado é recusado. As conclusões têm escopo diferente de
afirmar corrupção real ou sucesso de toda suíte sobre ledger ausente.

## O mock elimina o comportamento investigado?

Na matriz visual de canais, disponibilidade é substituída; não protege B7-002.
Worker rápido não mede lease/mídia/rede. AdapterREQ recebe commit simulado,
enquanto integração real confirma outra camada. São provas úteis complementares,
sem generalização de camada ou homologação externa.

## Fixture ou captura cria falsa certeza?

BootstrapSQL é pré-condição, não prova de criação autorizada pela UI. Não se
confirmou novo estado impossível da suíte nesta investigação. Screenshot não tem
baseline visual automático; UX-011 já mostrou etapa incorreta sob nome de
revisão. B1 refutou sobreposição de rodapé sugerida por imagem full-page; não
recontar esse problema como defeito atual.

## Um falso negativo de E2E pode ser defeito do produto?

QA-001 escolhe ramo móvel enquanto desktop ainda prepara. Readiness prévia e
desktop estável passam com helper idêntico; CI mantém falha. Isso sustenta causa
de harness, sem provar frequência ou eliminar outras interferências. Não se
aumentou timeout ou excluiu cenário. Produto segue com defeitos independentes
que não desaparecem ao corrigir o helper.

## Axe/PDF/emulação provam acessibilidade?

Não: incomplete exige revisão, e o helper perde esse conjunto. Botão sem nome é
corretamente recusado; tags WCAG e keyboardentry estão ativos. B1 tem revisão
humana planejada e contraprovas positivas. Lang/tagsPDF, foco, reflow, leitor
real, zoom nativo, teclado virtual e aparelho continuam separados.

## Arquivo sem import é órfão?

AppWorkspace refutou o primeiro grafo: é reexportado e consumido. O grafo final
inclui reexports/dinâmicos. /inventarios é redirect compatível e retorno
autorizado. Tipos com nome igual não demonstram consumo do módulo antigo. URLs
públicas de SVG podem ter consumidor externo não observado; candidatos não
equivalem a autorização de remoção.

## Benchmark ou contagem exagera o impacto?

100 linhas/234,4 ms é amostra local aquecida; preparo de 1000 cancelado não é
throughput; crescimento de 500500 resumos é fixture, não volume produtivo.
Número de queries não determina p95. Vercel e lease são limites distintos. Não
há evidência de capacidade/custo que justifique nova arquitetura ampla.

## Leitura/ferramenta histórica é sempre segura?

Reconcile usa readonly, mas sobrescreve saída histórica. Verify-evolution semeia
antes do rollback do trecho SQL. Meta pode fazer POST por token.
Montagemreadonly não exclui privados do tar. Em contraste, wrapper e guards
locais têm controles reais que devem ser preservados. Scripts não foram
executados para comprovar risco de execução.

## Privacidade e processo material foram preservados?

Não houve coleta de payload privado, token, destino pessoal ou linha de paciente
na B8. A consulta SQL usa apenas constantes e readonly. Dados privados
temporários dos probes são sintéticos e separados de provas históricas. Código
de permissão, backup e hash não certificam retenção, LGPD, assinatura, ato
físico, presença ou efeito clínico. As distinções REQ/compra/recebimento,
ciência/aceite, relato/débito e escala/presença constam dos critérios.

## A classificação duplica causas ou inicia fase seguinte?

Três registros novos de qualidade, seis revalidações ligadas a IDs anteriores.
119 famílias representam156 IDs sem faltar origem; agrupamento de teste não é
consolidação de implementação C. Nenhuma correção de achado, nova branch,
migration, operação remota de dados, reset, restore, PR, merge ou promoção. O
preview documental é autorizado. Não se demonstrou domínio independente que
justifique outro grupo B; pendências pertencem a C/D/homologação.
