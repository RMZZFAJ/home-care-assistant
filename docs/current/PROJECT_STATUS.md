# Estado verificável do projeto

Referência editorial:06/11/2026, America/Sao_Paulo. **Produção NO-GO.**
**Escopo técnico executável D-A (D0–D2) consolidado e validado localmente.**
CI do SHA publicado é gate independente; pending não significa aprovação.

Base integrada PR6: `8ec979a`. Branch única `feat/phase-d-implementation` e
[Draft PR7](https://github.com/RMZZFAJ/home-care-assistant/pull/7), sem merge.
[Checkpoint por incremento](../audits/D/D-A/CHECKPOINT.md) preserva tentativas,
contraprovas, resultados por SHA e limites. [Matriz81](../audits/D/D-A/ACCEPTANCE_EXECUTION.csv)
registra a execução local; colunas de planejamento e gates C9 preservadas.

## Implementado no candidato

- D0: prontidão real dos serviços, NULL/existência, incomplete do axe,
  preservação/exportação e contrato do oráculo PDF com controles negativos.
- D1: filas/progresso REQ e decisões de escala P1 corrigidos; precisão,
  concorrência, versão, recuperação e autoridade depois de esperas observadas.
  A sessão é conferida pelo relógio atual, inclusive após atingir seu prazo.
- REQ: material emitido imutável, observação zero/vazia/desconhecida e instante,
  atendimento por ENT, necessidade remanescente em nova REQ vinculada e P02.
  SCI individual/ANY familiar não atribui ato a terceiros; SCI-005 é obrigatória
  na expedição familiar efetiva, sem ciência por draft ou tentativa revertida.
- COM/ENT: origem explícita, parcelas, validação/rejeição e encerramento inferior;
  sugestão de recebedor editável com justificativa, aceite pessoal, divergências,
  cancelamento/recusa/retirada, consumo referenciado e tratamento P05.
- BAL: referência física explícita, contagem/reconto, mesma janela ou nova pessoa
  e janela, autores/versões preservados, revisão facultativa distinta de efeito
  físico e decisões de adiamento obsoletas sem apagar a história.
- Estoque/catálogo: movimentos causais, correções compensatórias, consumo,
  declaração/concordância/expedição bilateral, saldo inativo e sucessores sem
  fusão destrutiva, apresentações versionadas e seleção em catálogos1/5/20/100.
  Devolução antiga e intenções continuam preservadas; três pares locais
  confrontaram conservação, recebedor, protocolo e replay dos dois percursos.
- Escalas: recorrências e datas avulsas entre meses, tipo/versão e fuso,
  conflitos reservados atômicos, exceção de uma data, corte e propostas em leitura.
- Rascunhos próprios REQ/BAL entre aparelhos: revisão/horário do servidor,
  comparação explícita de conflitos, confirmação atômica e recuperação da mesma
  intenção. Descarte preserva documentos oficiais, ready e autoria.

## Evidência e limites

Último conjunto D2.32: três casos Auth em pares,12 testes API e seis casos
Chromium distintos passaram entre rodadas, com rechecks somente afetados.
M1 manteve material/SCI/evento original após associação de extra e atendimento;
PDFv2/v6 têm registros e hashes independentes, v2 reobtido com bytes idênticos.
Extração e inspeção das cinco páginas foram independentes da resposta HTTP.
ENT mostrou todas as linhas e contexto em leitura; Sheila recebeu2 de3,
família/global não assinaram e uma unidade permaneceu em trânsito. Retirada
familiar5→4 e configuração BAL sexta/noturno/fuso coincidiram com banco/ledger.
Tipos/lint dirigidos, quatro larguras e axe aprovados; sem homologação humana.

121 migrations incrementais no candidato;84 migrations históricas protegidas.
CI8ac2b7a/42293608729 tinha replay/banco e validações Windows/Ubuntu success;
três browsers estavam in_progress na consulta pontual. Isso não aprova o SHA
seguinte; os resultados atuais pertencem à CI publicada. Nenhuma suíte geral
foi repetida localmente neste conjunto sem hipótese discriminante.

Stack local home-care-assistant/API54321/DB54322 verificada. Após os testes,
os dois jobs cron originalmente ativos foram restaurados para active.
Backup externo original preservado; não equivale a restore testado.

D-B/D-C, assinatura, SCI-004, pesquisa comercial P03/P09/P13 e homologações
humanas/AT/aparelho/provedor permanecem fora desta missão. Não houve merge,
mutação remota ou liberação operacional. [Continuidade](ROADMAP.md) registra
os gates e a oportunidade de paginação do QR isolado em D4.
