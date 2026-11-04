# Q3 — O teste consegue reprovar o comportamento errado?

## PDF: mutação efetiva e controle de sensibilidade

B8-Q001 importou os testes originais com assertions preservadas, usando um
plugin Vite que altera somente o módulo em memória. Destinos de saída são
privados e separados por modo. Fontes funcionais, fixtures e arquivos de PDFs
históricos não foram alterados. O transporte global foi bloqueado.

Baseline: cinco casos selecionados PASS. Contrafactual: quatro chamadas drawText
passaram a receber texto vazio; os mesmos cinco casos PASS. Sete arquivos
emitidos conservaram duas páginas e metadata, mas tinham zero caracteres
extraíveis. Baseline tinha 1903–2326 caracteres por arquivo. Título incorreto,
como controle, fez o caso selecionado FAIL. Assim, o resultado não decorre
apenas de teste não executado ou plugin inoperante.

Evidências: [relatório baseline](../evidence/oracle-baseline.json), [sem
texto](../evidence/oracle-blank-text.json), [título
incorreto](../evidence/oracle-wrong-title.json) e [extração
independente](../evidence/pdf-oracle-observations.json). Tentativas afetadas
pelo cache inicial foram descartadas e explicitadas.

Isso demonstra fraqueza do oráculo, sem afirmar que o PDF do produto esteja
atualmente vazio. B6 já demonstrou defeitos concretos de conteúdo/layout. A
futura aceitação precisa conferir fatos esperados por tipo/estado e geometria,
com inspeção visual e acessibilidade separadas de hash, título ou número de
páginas. Não é necessário impor mutation score geral ou regenerar todo acervo.

## SQL: resultado ausente não pode satisfazer crédito positivo

B8-Q002 examina o guard de `supply-workflows.sql:50`. Comparar saldo com `<>3`
não rejeita NULL: com os demais termos falsos, a condição é desconhecida e o IF
não executa o raise. Uma consulta local READ ONLY, contendo apenas VALUES e
SELECT, confirmou quatro combinações. Não leu linhas de paciente.

[Resultado](../evidence/sql-oracle-observations.json): saldo 3 passa, saldo 2
reprova, NULL passa, status incorreto reprova; IS DISTINCT FROM reprova NULL. Há
predicados semelhantes em 41/44/56. Outras assertions com coalesce e integrações
persistidas são contraprovas de que todo o conjunto seria vazio.

Não se demonstrou que toda a suíte aceitaria qualquer ledger removido. A
conclusão está restrita ao predicado que pretende provar saldo positivo. D
precisa distinguir ausência legítima de saldo zero de ausência incompatível com
um crédito confirmado e exigir existência quando o contrato a requer.

## Mocks: alcance e ponto de corte

`requisition-persistence.test.ts` verifica nomes originais e argumentos da
transação, mas a resposta de submit é fornecida pelo mock. É prova do adapter,
não do commit no PostgreSQL. Integrações com Auth real e consulta de snapshots
complementam o contrato. Nenhuma dessas duas provas substitui a outra.

`worker.test.ts` comprova revalidação antes do send, não reenvio de incerto e
reconciliação de completion. Mocks rápidos não medem lease/orçamento, mídia
antes da mensagem, cancelamento durante preparo ou callback de tentativa antiga.
B4/B5 têm reproduções desses limites fora da suíte de aceitação.

O E2E de matriz de canais substitui a disponibilidade por um contrato visual.
Mantém autorização/persistência reais, mas esconde deliberadamente a decisão de
configuração que B7-002 provou divergente. Portanto, não pode homologar a
coerência entre anúncio da API e `metaConfiguration`.

`files.test.ts` promete preservar conteúdo passivo, porém confere determinismo e
uma página. Isso não protege anotação visível, conforme B6-008. O teste de
imagem tem oráculo mais forte: dimensões após orientação e ausência de EXIF.

## Legibilidade e acessibilidade

Elemento visível e axe sem violations não provam texto compreensível, foco
restaurado, cobertura de todos os estados ou conteúdo de PDF. B8-Q003 executou o
helper real em gradiente sintético: PASS com color-contrast em incomplete. O
helper não retém esse conjunto para revisão; botão sem nome foi recusado.

[A documentação
axe](https://www.deque.com/axe/core-documentation/api-documentation/) separa
violations de incomplete. Não se deve transformar todo inconclusivo em falha
automática. É necessário registrar pendência, contexto e decisão. B1 possui
registro manual e plano de testes humanos, que devem ser preservados.

## Critério transversal

Para escrita crítica, conferir identidade da intenção, versão, ator, evento,
estado, ledger e ausência de duplicidade; para erro, conferir preservação e
efeitos parciais. Para leitura, conferir conteúdo/filtros e sinalizar atraso,
vazio ou indisponibilidade corretamente. Para integração, separar aceitação,
entrega e reconciliação. Para apresentação, exigir fatos e compreensão,
preservando a fonte. Essa seleção é específica de cada família da matriz.
