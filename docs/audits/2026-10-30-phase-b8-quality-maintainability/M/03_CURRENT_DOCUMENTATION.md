# M4 — Documentação vigente versus implementação

Dez documentos requeridos foram confrontados com contratos, guard, CI e
auditorias datadas. [Validação de links](../evidence/documentation-links.json)
encontrou34 caminhos inline locais existentes. Isso não valida âncoras,
referências externas ou semântica, nem significa atualização integral.

## Revisão por entrada

- **README.md:** preserva boas instruções de ambiente/REQ/ledger. Em81–85,
  “auditoria atual” ainda usa35 migrations, seis SQL, seis HTTP,69 unitários e
  32 E2E. São números históricos, diferentes do guard84,98 unitários,33
  integrações e 120 E2E descobertos. Não apagar os resultados antigos; retirar
  sua aparência de resultado atual e apontar à evidência datada correta.
- **AGENTS.md:** regras de autorização e preservação são atuais. Em44, guard das
  primeiras19 diverge dos 84 hashes reais. O bloco Next gerado deve permanecer.
  A ordem atual limita verificações proporcionais e autoriza especificamente
  manutenção pontual/commit/push; não permite implementar achados ou usar
  autorizações antigas como liberação presente.
- **ARCHITECTURE.md:** descreve corretamente paciente, contexto, ledger e
  integrações. Promessas gerais de recuperação/invalidação precisam das
  limitações B3-013/B4-002/004/B5-010/012 ao serem apresentadas como estado
  implantado. Contrato desejado não deve ser reduzido para legitimar o defeito.
- **DATABASE.md:** catálogo, transações e novo BAL possuem fundamento. Em6,
  “primeiras63” está desatualizado. Autoaprovação no legado, precisão direta,
  revogação durante espera e custo dos snapshots são limites conhecidos que
  precisam acompanhar qualquer afirmação de garantia universal.
- **API.md:** fornece panorama útil e fronteiras materiais corretas. Não é
  especificação exaustiva dos 61 métodos B4. Tipo numérico aceito, resultados
  parciais, erros internos e paridade entre rotas precisam ser reconciliados nas
  futuras correções, sem esconder o comportamento observado por editar apenas a
  documentação.
- **SECURITY.md:** distingue conta/global/vínculo, DML de serviço, hash e
  segredo. URLs emitidas antes de revogar conservam TTL e cópias obtidas; JWT de
  sessão encerrada possui limite específico B3-021. Registrar limites técnicos e
  política de retenção/responsáveis sem declarar conformidade LGPD ou revogação
  instantânea de informação já compartilhada.
- **TESTING.md:** orienta stack local, backup, replay, Auth e traces de modo
  útil. “Jornadas completas e acessibilidade” precisa de alcance por estado e
  homologações; Linux descrito como sem dados/credenciais não exclui .private no
  tar. Descobrir teste não executa servidor, fato revalidado na B8.
- **OPERATIONS.md:** preserva diferenças REQ/COM/ENT/BAL, ciência e consumo.
  Recuperar “a mesma tentativa” precisa de exceções conhecidas por comando;
  sessionStorage não sustenta promessa além da aba. Contingência e ato físico
  exigem responsável e validação humana, não apenas documentação técnica.
- **DEPLOYMENT.md:** boa sequência de backup/identidade/schema/rollback; preview
  reutiliza remoto, portanto não é ambiente isolado de dados. Em50, autorização
  de 22/10 aparece no presente. Deve ficar historicamente datada e separada da
  missão vigente. B7-001/003/004 fornecem gates e limites ainda não homologados;
  não publicar como procedimento plenamente aceito.
- **PROJECT_STATUS.md:** aponta EXECUTION e relatórios, mas a narrativa de
  master701521c/fec3926 e PR2 não representa o HEAD atual. EXECUTION abre
  PR5/branch anterior como ainda em execução. O índice phase-b fornece o
  diagnóstico recente; em D, estabelecer ponte atual explícita e estado por SHA
  sem reescrever o conteúdo das execuções históricas.

## Fontes de verdade e autorização

Contrato permanente, estado do release, autorização atual e evidência histórica
são categorias diferentes. Um link existente e um documento com nome EXECUTION
não provam atualidade. A fonte de estado deve indicar data, branch, SHA,
ambiente e limitações. Autorização de commit/push documental não concede Auth
remoto, migrations, PR/merge ou promoção de produção.

REPO-001 permanece causa existente, registrada como B8-M001. Nenhuma atualização
geral foi executada. A única edição histórica foi a formatação de três linhas B4
autorizada para resolver diagnósticos. CSV, achados, caminhos e provas originais
permanecem; manifesto B4 antigo não foi reescrito para disfarçar o novo hash
Markdown. O commit anterior preserva a versão que esse manifesto representa. A
matriz B8 referencia o CSV original inalterado.

## Correções para D

Atualizar entradas vigentes quando houver decisão sobre estado/escopo; evitar
contagens transitórias em instrução permanente. Gerar contagens somente quando
úteis, por fonte verificável. Revisar comandos e pré-condições; manter
documentação do operador orientada a tarefas e consequências, com detalhes de
implementação nos documentos técnicos. Não reformatar auditorias antigas ou
apagar evidências para parecerem produzidas no estado novo.
