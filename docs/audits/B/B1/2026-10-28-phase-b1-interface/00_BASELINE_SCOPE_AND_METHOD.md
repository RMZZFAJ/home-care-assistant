# Baseline, escopo e método

## Autoridade e preservação

Ordem mestre anexada, preservada nesta pasta, e AGENTS.md do repositório.
A fase é investigação B1. Não executar os lotes de implementação B0–B7 da
Fase A. B2–B9 e implementação nas fases C/D não estão autorizados.

Estado inicial em 28/10/2026: branch master, HEAD documental
`34dcb835c5c49068e0417f7306eb4e501aa868bc` ; o diff desde
`37cb7f85e96e551d6419871f94dd950712e2565b` contém somente a auditoria A.
Quatro anexos Markdown não versionados na raiz foram encontrados e preservados.
Sem alterações rastreadas ou staged. Branch B1 criada sem trocar os arquivos:
`audit/phase-b1-human-interface-2026-10-28` .

## Ambiente reconhecido

Windows/PowerShell; Node padrão 24.13.0 não corresponde a .nvmrc/.node-version
(24.22.0). Binário 24.22.0 encontrado no cache npm, verificado e selecionado
somente no PATH dos processos de auditoria. npm esperado 11.21.1.
Docker inicialmente parado; Docker Desktop iniciado em segundo plano.
Containers existentes home-care-assistant retomados, API 127.0.0.1:54321,
PostgreSQL 127.0.0.1:54322. Nenhuma stack alternativa criada.

Antes de exploração mutável: conferir labels de projeto/workdir pelo guard
existente, identidade sintética das fixtures, portas e envio externo desativado.
Não fazer reset/replay nem substituir fixtures existentes para esta
investigação.
Sessões Auth e comandos sintéticos locais necessários serão registrados.
Nenhuma consulta de dados privados ou mutação remota é necessária.

## Governança e CI atuais

Consulta GitHub em 28/10: repositório público; master sem proteção e apontando
para o HEAD inicial acima. Metadados não autorizam publicação ou alteração de
proteção. Risco de governança é transferido ao responsável; minimizar dados
nas evidências independentemente da visibilidade.

Run 40656069166, SHA 34dcb835: validações Windows/Linux, banco, Chromium móvel
e WebKit aprovados. Chromium desktop falhou e agregado database-and-browser
falhou. Log do job 122708993891 foi consultado novamente: 39 testes passaram,
um falhou também no retry. Timeout em navigation.ts:10, chamado por
workflows.spec.ts:449, procurando Mais em Navegação do plantão. Compatível
com QA-001; não corrigir o helper nesta fase. Resultado não é verde global.

## Leituras de partida e investigação independente

Lidos AGENTS, README, arquitetura, banco, segurança, API e testes vivos;
README, executivo, método, cobertura, achados CSV, UI/UX, linguagem,
jornadas, lacunas, homologação, handoff e exploração runtime da Fase A.
Os 32 achados A orientam contraditório, não delimitam descoberta B1.
A memória foi usada somente para localizar cautelas; evidência atual vem
do repositório e das consultas deste trabalho.

## Método progressivo

B1.0 reconhecimento → B1.1 superfícies → B1.2 visual → B1.3 textos → B1.4 erros
→ B1.5 estados → B1.6 feedback → B1.7 campos → B1.8 jornadas/acessibilidade
→ reconciliação e commit exclusivamente documental.

Em cada etapa: passada de conformidade, passada inventiva/adversarial,
contraditório e checkpoint. Inventários extraídos por AST e buscas são índices,
nunca prova automática de leitura semântica ou renderização de cada ramo.
Relatórios indicam méritos, problemas, hipóteses e oportunidades separadamente.

Perfis: profissional, supervisão, familiar, admin local/global e leitor,
conforme
capacidades reais. Larguras planejadas: 320/390/768/1440/1920, selecionadas
por risco; não executar produto cartesiano artificial. Incluir atraso, falha,
vazio real, dados densos, nomes longos, teclado e ampliação quando viável.

## Fronteiras de comprovação

Leitura e teste local não homologam produção. Emulação não é aparelho físico.
Árvore de acessibilidade e axe não são sessão real de leitor de tela.
Walkthrough do auditor não é teste de compreensão com família ou profissionais.
OAuth/SMTP/Meta/WhatsApp reais permanecem sem envio e NOT_VERIFIED.
Limites por superfície e estado serão mantidos nas matrizes, sem percentagem
de aprovação baseada só em arquivos lidos.

## Organização autorizada do checkpoint temporário

Durante a retomada,o usuário informou ter criado um commit temporário para
acesso via GitHub e autorizou desfazê-lo para organização. O commit
d52d4d7cf1c6dedf3791b87d5b91a987fdeca388 contém B1 e quatro anexos da raiz;
estava publicado em origin/audit/phase-b1-human-interface-2026-10-28. Foi
preservado nessa branch local/remota.

Com essa autorização posterior e específica,criou-se
audit/phase-b1-interface-final-2026-10-29 no mesmo ponto e moveu-se apenas seu
HEAD/index lógico por reset --soft à base34dcb835,sem tocar nos bytes dos
arquivos. A autorização excepciona a proibição anterior de reset apenas para
esse temporário; não autoriza limpeza,reset de produto,force-push ou reescrita
remota. Nenhum desses atos foi executado.

A conclusão usa commit restrito à pasta B1,com os quatro anexos preexistentes
preservados fora dele. No fechamento,a árvore pode continuar com esses quatro
arquivos staged; isso não é sujeira criada pela auditoria nem motivo para
incluí-los. O diff de produto contra37cb7f85e e contra34dcb835 é vazio.

A cópia Markdown da ordem mestre recebe apenas formatação para lint;
evidence/MASTER_ORDER_ORIGINAL.txt preserva os bytes originais do anexo e seu
hash no manifesto. Testes/build podem regenerar saídas ignoradas
usuais(.next,.next-e2e,tsbuildinfo,PDFs privados de teste); não foram
convertidas em alterações de produto nem incluídas fora do pacote autorizado.

## Integridade entre plataformas

O manifesto registra bytes/hash da árvore Windows e também forma LF normalizada
para arquivos textuais, por causa de core.autocrlf. Binários têm hash exato.
MASTER_ORDER_ORIGINAL.txt.gz preserva os bytes originais do anexo dentro de
gzip; a cópia txt facilita leitura. O validador distingue essas formas sem
alterar arquivos.
