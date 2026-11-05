# D-A — implementação D0, D1 e D2

Missão vigente de 05/11/2026, America/Sao_Paulo. **EM EXECUÇÃO**.
Produção permanece **NO-GO**. Não há autorização de merge, D-B/D-C,
migration remota, envio externo ou liberação operacional definitiva.

## Entrada verificada

- Repositório: RMZZFAJ/home-care-assistant.
- Base: `8ec979a`, master local e origin/master reconciliadas após fetch;
  PR 6 integrado. Árvore inicial limpa.
- Branch única: `feat/phase-d-implementation`.
- Stack: home-care-assistant, workdir e labels Docker conferidos;
  API 127.0.0.1:54321 e banco 127.0.0.1:54322.
- Dados locais iniciais: 210 documentos, 81 REQ e 81 identidades Auth.
  Backup custom externo com manifesto/hash e TOC legível preservado;
  não representa ensaio de restore. Replay aguarda consentimento explícito.
- Node 24.22.0 selecionado por processo; npm 11.21.1; CLI 2.121.0.

## Execução e evidências

O [registro de aceitação](ACCEPTANCE_EXECUTION.csv) deriva dos casos C9
atribuídos a D0–D2. Origem C preservada; status só avança mediante evidência
do comportamento, ator, versão e efeitos. Nenhum caso foi aprovado na abertura.

1. D0: readiness, NULL, axe incomplete, proteção de ferramentas/exportação
   e contrato do oráculo PDF.
2. D1: progresso REQ, aprovação de escala, precisão, conflitos e autorização.
3. D2: processos REQ/COM/ENT/BAL, ciência P02, estoque/custódia, catálogo,
   consumo e escalas com as interfaces C8 correspondentes.

Checks locais, CI, preview, aceite humano e aparelho/provedor real são
evidências distintas. P03/P09/P13 permanecem pesquisa externa do responsável;
outros gates condicionam apenas o ramo explicitamente dependente.

Commits funcionais e evidências serão acrescentados conforme cada conjunto
for implementado e verificado. Draft PR em preparação; sem merge.
