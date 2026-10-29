# Transferência do B1 para decisões futuras

B1 termina como diagnóstico documentado. Nenhum Grupo B2–B9 foi iniciado.
Não há autorização de implementação, correção, migration, deploy ou merge.
A enumeração abaixo descreve dependências técnicas; a ordem mestre não fixa
nomes/escopos dos demais grupos, portanto não se inventa uma atribuição B3/B4
como se já estivesse aprovada. O responsável distribuirá as frentes futuras.

## O que a próxima conversa precisa ler

1. CHECKPOINT.md, README e00para base, limites e integridade.
2. 14para decisão executiva,12CSV/MDpara achados completos.
3. 13para aceites futuros e11para hipóteses/custos/contraditório.
4. 01para inventário e dimensões de cobertura;02para cada superfície.
5. Catálogos04–08e evidence/RUNTIME_INDEX.csv para seguir uma manifestação.
6. evidence/PHASE_A_CROSSWALK.csv para os32 achados anteriores, inclusive
aqueles que B1 não repetiu. A conclusão A continua NO-GO.

Produto:37cb7f85e96e551d6419871f94dd950712e2565b. Base documental A:
34dcb835c5c49068e0417f7306eb4e501aa868bc. O encerramento B1 parte dessa base.
A organização posterior usa `audit/phase-b` para toda a fase; o temporário
do responsável permanece no histórico por ancestralidade.
Não confundir data de relatório, SHA de documentos e SHA do produto.

## Contratos que a interface não pode decidir sozinha

- Escala: resumo autorizado antes/depois e efeito em atribuições BAL;
controle de versão, aprovador distinto e sobreposição continuam no banco.
B1-UX-001 éP1. DB-003 da A exige investigação própria de aprovação de série
encerrada; B1 não o reexecutou nem o resolveu com texto.
- Anexos: consulta por tentativa, reserva, expiração e limite de arquivos;
B1-ERR-001 tem201+read-back local. DB-004 da A sobre reservas abandonadas
permanece aberto. Não apagar reserva ou histórico como recuperação de UI.
- Erros: envelope seguro com correlação,certeza e próxima ação,distinguindo
GET de comando. BE-005 da A sobre proposta global com nova identidade de
tentativa permanece; COM recuperada corretamente é contraprova específica.
- Consultas: paginação de consumo/auditoria,alvo de deep link e snapshot
temporal entre saldo/movimento. Não apresentar100recentes como tudo.
- Catálogo: consulta de apresentações,unicidade de código e versão/conversão;
care_recipient_products é canônico; products preserva identidades.
- Zero: contrato de estoque observado e desconhecido na REQ exige decisão;
browser não pode introduzir null nem copiar saldo como contagem física.
- Convite: prévia mínima segura,validade e conta correta; não expor paciente
a token inválido ou derivar papel de parâmetros.
- Ciência: definir significado de evento automático; observar cabeçalho não
prova leitura integral. Ciência expressa funcionou separada de atendimento.
- BAL: política de revisão automática/obrigatória deve explicar resultado e
próximo responsável. B1 executou contagem autoaprovada; E2E selecionado
exerceu revisão required e resposta perdida como cenário distinto.
- Cancelamento ENT: DB-001 da A não foi reexecutado. Não orientar consumo
fictício como contorno nem afirmar cancelamento seguro sem contrato atual.
- Frescor: contexto,perfil,capacidades e read models precisam de invalidação
coerente. DB-007 da A não foi integralmente retestado; offline emulado de
B1 suporta risco humano, sem demonstrar bypass de autorização.
- Notificação: BE-002 sobre datas/contadores e BE-003 sobre prazo do worker
seguem dependências. B1 leu presenter/templates, sem WhatsApp/SMTP real.
Persistência,aplicativo,provedor,entrega,leitura e ciência são fatos distintos.

## Dependências de qualidade, operação e governança

QA-001 continua aberto: log atual do CI desktop tem falha/retry na escolha
de navegação. SeisE2E locais selecionados passaram; não são substituto de
CI completo nem justificativa para alterar helper no B1.

DB-002 éP1 da A e não pertence à correção UX. Nenhuma nota visual pode tornar
release apto enquanto lifecycle continua sem resolução/validação autorizada.
DB-006,DB-005,BE-006 e questões de volume/performance merecem grupo próprio;
não foram generalizadas a um defeito de interface sem medição atual.

OPS-001 exige aceite de recuperação integral/restore no ambiente correto.
Integrações externas,impressão,QR físico,aparelhos e leitores de tela permanecem
NOT_VERIFIED. Nenhum reset de banco,backup remoto,migration ou envio externo
foi feito no B1. Fixtures novas permaneceram locais e fictícias.

GitHub foi revalidado público/master sem proteção; mudança de governança
requer decisão do responsável. REPO-001/002/003/004 da A não foram corrigidos
nem executados como se fossem instrução atual. Em particular,não executar
consulta Meta que possa submeter templates nem copiar diretório privado para
verificação Linux. Diretórios privados não foram incluídos neste pacote.

## Ordem sugerida para a Fase C

1. TratarP1 visível de escala e manterP1 DB-002 como bloqueador separado.
2. Decidir recuperação de resultado incerto,semântica de ciência e zero,
resumos de consequência e contratos de consultas/paginação.
3. Corrigir em futuraD estados falsos/contraditórios,conflitos e foco/reflow;
usar aceites13por causa e contraprovas já registradas.
4. Aprovar glossário/destinos/feedback e melhoria proporcional de busca e
apresentações; evitar programa amplo de reescrita visual sem necessidade.
5. Rodar sessões humanas/aparelhos/AT e homologações externas sob autorização
própria. Revisar prioridade quando evidência de uso real mudar frequência.

## Decisões do responsável ainda necessárias

- O que ciência automática significa e como deve ser nomeada?
- Estoque observado é obrigatório? Como representar impossibilidade de contar?
- A equipe precisa retomar rascunho em outra aba/aparelho? Qual retenção?
- Quais dados e efeitos devem aparecer antes de aprovar escala,BAL e ENT?
- Qual prévia de convite equilibra compreensão e privacidade?
- Quais apresentações/conversões precisam de consulta,edição e histórico?
- Qual prazo real e alcance de acompanhamento de avisos/PDF se deseja?
- Quais aparelhos,tecnologias assistivas e pessoas participarão da validação?

Não é necessário responder para aceitar o diagnóstico. São entradas da
consolidação C; nenhuma foi presumida como autorização de implementação.

## Critério de passagem para implementação futura

Plano deve apontar IDs,contratos,alternativas recusadas,aceites de13 e
evidências de01/12. Separar mudança editorial de semântica de negócio.
Preservar migrations históricas,ledger,snapshots,RLS/grants e autoridade.
Revalidar estado do repositório/ambiente e autorização antes de qualquer ação.
Não usar fixtures locais ou6 testes verdes como comprovação de produção.
