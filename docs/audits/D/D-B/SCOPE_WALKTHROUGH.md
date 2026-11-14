# D3.24 — criação global, conta alheia e tarefas locais

O walkthrough nativo concluiu a prova local de C-FINAL-AC-021 e C7-AC-006.
Quatro cenários Chromium passaram, mais uma contraprova nova com Auth real. Não
houve mudança de autorização, API, banco ou aparência de PDF.

## Escopos percorridos

- Global salva a preparação antes de criar residência. Outra sessão altera a
  revisão; o conflito preserva valores e exige adoção explícita. Criação inativa
  com resposta perdida recupera a mesma intenção, sem outro cadastro. O criador
  não recebe vínculo automático; a conta familiar inicial recebe o papel local.
- Após a criação, Escalas/BAL e Comunicação/contingência têm resumos sem inputs,
  selects ou textareas. Links mantêm o paciente em /escalas, /balancos e
  /configuracoes; /guias conserva sua navegação. Abrir etapa não aprova tarefa
  física nem libera produção. Família não consulta/cria preparação global;
  paciente inativo não recebe novo documento operacional.
- Administrador local revoga vínculo de uma conta no primeiro paciente,
  mantendo o vínculo da mesma conta no segundo. Comunicação abre o subfluxo
  próprio; manter/alterar/remover nome curto, erros e isolamento do outro
  paciente conservam a prova existente.
- Global edita outra conta em Editar conta global, revisa sem campos editáveis
  e só então grava. Nome muda e retorna pela interface; papel, estado e
  privilégio global permanecem iguais. A conta do operador não muda. Meu perfil
  mostra o próprio nome. Administração local recebe403 ao ler/alterar contas
  globais. O finally só permite compensar a renomeação fictícia exata deste caso.
- Com o vínculo local revogado, a identidade global recebe42501 ao selecionar
  o paciente e mover estoque, sem efeito no ledger. A fixture originalmente
  tinha vínculo:ele foi revogado pelo RPC real, não ignorado na precondição.
  Após restauração explícita pela administração local e seleção do próprio
  vínculo, a operação é permitida. Privilégio global e autorização local são
  condições diferentes.

## Correção e qualificação

O baseline do editor global falhou porque mostrava admin/supervisor/
professional/reader. Cartão, seletor e revisão agora apresentam Administração,
Supervisão, Profissional e Leitura, com fallback seguro. Os valores enviados
permanecem iguais; a classificação da conta não concede vínculo ao paciente.
Essa foi a única alteração de produto desta etapa.

Tipos e lint afetados passaram. A prova D3.23 de propostas congeladas,
desconhecidas sem aprovação e decisão por ator distinto permanece vinculada
por hashes de fontes iguais. O cenário de agenda da D3.22 também conserva seu
hash. Não são novas execuções locais:complementam os quatro cenários e o caso
Auth executados agora. Nenhum teste mutável correu junto do E2E.

[Manifesto](SCOPE_WALKTHROUGH_EVIDENCE.json),
[remoto read-only](SCOPE_WALKTHROUGH_REMOTE_OBSERVATION.json) e
[CI do pai](CI_86025BA_OBSERVATION.json). Local/remoto164, sem SQL nova ou
pendente. CI86025ba aprovou Windows/Ubuntu/banco, incluindo instalação limpa,
legada e integração; browsers estavam em andamento, Preview READY. Isso não
aprova o novo SHA. Sem reset local adicional, Auth/fixture remoto, transporte
externo, produção ou backup redundante. Adoção de catálogo delegada e recusa de
criação local também têm regressões Auth preservadas, com corpo/fonte iguais
ao pai de banco verde. GUI-01/03 e abertura física conservam os demais critérios;
essa prova de escopo não os substitui nem libera produção.
PR7 Draft, Sonar adiado, meta ativa; humano/AT/aparelhos/D-C/D6 separados.
