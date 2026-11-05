# Checkpoint final — Fase B1

B1.1–B1.8 concluídos como investigação em 29/10/2026. Nenhuma correção de
produto executada. Não iniciar B2 sem nova autorização. A Fase A continua
NO-GO; este pacote não homologa produção.

## Base e preservação

Produto: `37cb7f85e96e551d6419871f94dd950712e2565b`.
Base documental: `34dcb835c5c49068e0417f7306eb4e501aa868bc`.
Branch única da Fase B: `audit/phase-b`.

O temporário `d52d4d7` e o encerramento `bc278c4` são preservados por
ancestralidade na branch única. A organização anterior com soft reset local
está documentada no baseline como histórico da execução. Em nova autorização
de 29/10, o responsável pediu consolidação e remoção das branches antigas.
Os quatro anexos da raiz passaram para `inputs` da Fase A. O commit B1
original permanece restrito a esta pasta; commits posteriores registram
a reorganização e as correções documentais/editoriais.

## Oito subgrupos concluídos sequencialmente

- [B1.1](evidence/checkpoints/B1.1.md): inventário e primeira avaliação de
  superfícies; leitura integral dos 112 arquivos UI; renderização suplementar
  foi reconciliada no fechamento.
- [B1.2](evidence/checkpoints/B1.2.md): 37 padrões, cascata efetiva, contraste,
  foco e medidas nas larguras 320/390/768/1440/1920 selecionadas por risco.
- [B1.3](evidence/checkpoints/B1.3.md): 12.343 candidatos originais conciliados;
  4205 entradas de texto no fechamento, incluindo 54 atributos dinâmicos.
- [B1.4](evidence/checkpoints/B1.4.md): 252 entradas de erro; injeções e
  resposta perdida201 de anexo, com certeza de persistência separada.
- [B1.5](evidence/checkpoints/B1.5.md): 948 linhas de estado; delay, vazio,
  erro, resultado parcial, filtro antigo, offline e relógio virtual.
- [B1.6](evidence/checkpoints/B1.6.md): 131 variantes de ação e reconsultas de
  COM, ENT, REQ, consumo e BAL. Aprovação automática BAL não foi apresentada
  como revisão familiar; teste E2E posterior exerce política exigida.
- [B1.7](evidence/checkpoints/B1.7.md): 213 esquemas de campo, catálogos
  1/5/20/100, validação real400, retomada entre abas e decimais.
- [B1.8](evidence/checkpoints/B1.8.md): seis personas, teclado, foco, reflow,
  acessibilidade e crítica adversarial; 09, 10 e 11 preenchidos.

[Histórico integral de progresso](evidence/CHECKPOINT_HISTORY.md) conserva
as contagens e lacunas de cada momento. A matriz final substitui conclusões
provisórias de renderização, sem reescrever provas históricas.

## Cobertura e conclusão crítica

97 superfícies e 91 avaliações próprias. 223 capturas de browser; mais quatro
PDFs com oito páginas. 92 superfícies com renderização associada, incluindo
regiões parciais. Três órfãos estão excluídos; dois overlays condicionais
(compartilhamento e Flow) continuam sem estado renderizado. Estados adicionais,
AT, hardware, zoom nativo, pessoas e provedores: NOT_VERIFIED.

35 achados deduplicados: 1 P1, 22 P2 e 12 P3; 20 sem ID de origem na A.
P1 de aprovação de escala aberto. DB-002 P1 da A permanece dependência própria.
Nenhuma prioridade foi apagada por média visual ou testes verdes.

Os méritos foram preservados: recuperação COM idempotente; relato sem débito
antes da confirmação; ENT aceita atende REQ; BAL separa contagem e referência;
ciência não é recebimento. Decimal e rodapé móvel foram contraprovas, não
novos defeitos. Duas imagens precoces foram reclassificadas e reconsultadas.

## Verificação

[checks.json](evidence/checks.json) registra contratos, lint, markdown, tipos,
98 testes unitários e build. [Seis E2E](evidence/e2e-result.json) selecionados
passaram em desktop/móvel: login, convite completo e BAL por plantão.
O CI desktop do SHA documental A permanece com QA-001; helper não alterado.
Não se rodou reset, replay de migrations ou fixture substitutiva de banco.

[Integridade](evidence/INTEGRITY_REPORT.json) verifica referências, IDs,
catálogos, hashes de fonte e ausência de alteração de produto. O
[manifesto](evidence/MANIFEST.csv) registra bytes/hash da árvore e forma LF
normalizada para textos. A cópia gzip do anexo preserva bytes originais.

## Ambiente e mutações locais

Projeto existente home-care-assistant, API127.0.0.1:54321 e DB54322;
aplicação de prova127.0.0.1:3100. Node24.22.0 e npm11.21.1 selecionados
por processo. Stack retomada sem criar outra. Servidor de prova encerrado;
containers locais existentes preservados. Nenhum banco foi resetado.

Contas, pacientes, vínculos, catálogos, ledger, REQ/COM/ENT/BAL, consumo,
convites e anexos de prova foram criados somente localmente com dados
fictícios e guardas existentes. Resultados/mutações constam nos JSONs; nada
foi apagado. Envios externos e Meta Flows desabilitados. Revisões finais de
permissão, vínculo, conta, cancelamento e associação não foram confirmadas;
guarda do suplemento registrou zero escritas de negócio tentadas.

Sem código, migrations, dependências, configuração ou dados remotos alterados.
Sem envio externo, merge, deploy ou publicação de conclusão. Saídas ignoradas
usuais de testes/build podem ter sido regeneradas, conforme o baseline.

## Retomada autorizada

[Executivo](14_GROUP_B1_EXECUTIVE_ASSESSMENT.md),
[achados](12_FINDINGS_MASTER.md),
[aceites futuros](13_ACCEPTANCE_TEST_MATRIX.md) e
[handoff](15_CROSS_GROUP_DEPENDENCIES_AND_PHASE_C_HANDOFF.md) são a entrada da
Fase C. Não há tarefa corretiva em execução. B2 exige nova autorização.
