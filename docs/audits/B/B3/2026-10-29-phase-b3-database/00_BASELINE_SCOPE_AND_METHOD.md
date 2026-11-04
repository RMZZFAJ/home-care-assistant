# Baseline, escopo e método

Ordem mestre lida integralmente. A autorização corrente substitui somente as
fronteiras históricas que impediam iniciar B3: preserva a natureza
investigativa.
Estágios sequenciais B3.0 a B3.12, cada qual com relatório, prova,
contraditório,
limite e checkpoint. Consolidação final e commit/push documental na mesma
branch.

## Referências de partida

AGENTS, README, arquitetura, banco, segurança, API e testes; pacotes A,
B1 e B2 são referências, sem transformar seus testes em execuções B3.
O catálogo instalado, a cadeia SQL e os consumidores atuais serão comparados.
Leitura de palavras-chave localiza objetos; conclusões requerem leitura dos
ramos finais, dependências, controles posteriores e contraprovas.

## Categorias

- `METADATA`: objeto, grant, constraint ou configuração local efetivamente lido.
- `STATIC_REVIEW`: semântica de código/SQL examinada; não execução integral.
- `LOCAL_EXECUTED`: cenário local identificado, com resultado persistido lido
  independentemente. Inclui falhas demonstradas; não significa produto aprovado.
- `HISTORICAL_REFERENCE`: prova A/B1/B2, com origem explícita.
- `NOT_VERIFIED`: ambiente, ramo, configuração externa ou restore não
  exercitado.
- `REFUTED`: hipótese contrariada por controle ou ensaio delimitado.

Matrizes não contam linhas como testes. Grants, RLS, owners, schema exposto,
função definidora e contexto Auth são avaliados em conjunto. Ausência de RLS
ou presença de função pública não determina sozinha exposição.

## Critério de preservação

Somente esta pasta e `docs/audits/phase-b/README.md` podem entrar no commit.
Hashes dos arquivos de produto/testes/scripts foram capturados antes da
investigação. `master` e histórico anterior serão reconciliados no fechamento.
Nenhum ajuste de teste para obter verde é permitido.

## Referências técnicas atuais

Consulta em 29/10/2026 às fontes primárias de
[RLS PostgreSQL](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) e
[RLS
Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security).
Servem de referência; a prova depende do catálogo 17.11 e dos ensaios locais.
O endpoint Markdown do changelog Supabase não foi aceito pelo leitor web;
essa tentativa não é validação de compatibilidade. Guias Next instalados
foram consultados antes de produzir auxiliares; nenhum código Next é alterado.
