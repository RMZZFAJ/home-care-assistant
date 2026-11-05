# Política de ciências aprovada — P02

**OWNER_APPROVED em 04/11/2026**, por ordem expressa do responsável. A
[ordem complementar](../C10-pr-handoff/final-closure/OWNER_COMPLEMENT_ORDER.md)
prevalece sobre as alternativas e os campos em branco do primeiro fechamento
C7. Implementação permanece AS_IS; este é o contrato TO_BE. O inventário
conserva 66 atos e identifica as cinco origens AS_IS de ciência REQ.

## Decisão individual SCI-001–SCI-005

<!-- c-table:start -->

- **Origem:** SCI-001

  **Decisão aprovada:** Manter ciência expressa no aplicativo

  **Efeito futuro:** Declaração pessoal autorizada

- **Origem:** SCI-002

  **Decisão aprovada:** Substituir exposição do cabeçalho por diálogo antes da
  abertura

  **Efeito futuro:** Só confirmar o diálogo registra ciência

- **Origem:** SCI-003

  **Decisão aprovada:** Leitura WhatsApp é evidência de comunicação

  **Efeito futuro:** Não satisfaz ciência; canal postergado

- **Origem:** SCI-004

  **Decisão aprovada:** Possibilidade futura de confirmação expressa
  identificada no WhatsApp

  **Efeito futuro:** Homologação externa; canal postergado

- **Origem:** SCI-005

  **Decisão aprovada:** Ciência pela expedição obrigatória, permanente e não
  configurável

  **Efeito futuro:** Ciência do responsável familiar autorizado que
  efetivamente expede

<!-- c-table:end -->

Os modos AS_IS, inclusive app_visible e whatsapp_read, permanecem no CSV como
evidência histórica. Sua existência não autoriza repetir a semântica antiga na
implementação futura. Não apagar ou reclassificar eventos anteriores.

## Três modalidades configuráveis

Para obrigação **informativa elegível**, permanecem manual expressa,
automática mediante diálogo de confirmação antes de abrir e tácita por
preferência anterior expressa, quando permitida pela regra administrativa. Não
criar ciências autônomas COM/ENT/BAL por estender essa configuração. Os atos
materiais conservam capacidade e confirmação próprias; ciência tácita nunca
substitui recebimento, consumo, contagem, revisão ou administração.

- Manual: pessoa habilitada confirma sua ciência para o conteúdo emitido.

- Dialogada: antes do conteúdo, apresentar tipo/referência mínima e “Confirmar
  ciência e abrir”. Voltar/cancelar não registra ciência nem abertura
  fictícia. O diálogo não declara leitura integral.

- Tácita: preferência anterior expressa da própria pessoa, para o tipo
  elegível permitido, com regra/preferência/vigência identificadas. Para REQ,
  o disparo planejado é a emissão oficial do conteúdo elegível. Preferência
  posterior não produz ciência retroativa. Sem opt-in válido, permanece
  pendente até uma origem legítima.

- Alteração da preferência é prospectiva; não reescreve fatos anteriores.
  Falha conserva a preferência anterior, sem sucesso de save presumido. A
  alternativa manual elegível permanece acessível.

## SCI-005: invariável de expedição

Para cada REQ vinculada a uma ENT, a transição oficial de expedição concluída
por responsável **autenticado e autorizado a representar a família** produz
SCI-005 no mesmo resultado transacional da expedição. Não depende de
scienceByDispatch, scienceRequired, scienceExpress, scienceAutomatic,
scienceWhatsApp ou preferência que permita desligamento. Profissional,
familiar e administradores local/global não podem desativá-la. Não existe
opt-out, override ou configuração que a transforme em opcional.

Rascunho, edição, autosave, prévia, emissão recusada ou transação revertida
não disparam SCI-005. Identificar REQ e versão material, ENT, versão da
expedição, ator efetivo, origem e instante do servidor. Não inferir o ator do
criador original do rascunho, da pessoa escalada ou do recebedor.

A condição AS_IS auth.uid()=created_by não define a autoria futura da
expedição; a autoridade e o ator efetivo precisam ser revalidados na D.

Autorização é pré-condição, nunca consequência do efeito automático. A regra
não promove expedidor sem capacidade familiar, nem usa identidade alheia. Se
uma direção ENT legítima admite expedidor que não representa a família, sua
expedição não pode aparecer como ciência familiar: registrar expedição com sua
autoria e manter a obrigação familiar pendente. Esse é um limite de
autorização, não uma opção de desligar SCI-005 para expedidor elegível. A D
deve testar ambos os alcances e revalidar autoridade depois de esperas.

Repetição técnica da mesma transição recupera o mesmo registro, sem duplicar
eventos, ledger ou avisos. Expedições distintas são fatos distintos: preservar
origem causal mesmo se a pessoa já declarou ciência por outro modo. Não
sobrescrever express por dispatch nem apagar prova para caber na unicidade
antiga REQ/pessoa. O estado pessoal pode estar satisfeito sem perder os fatos
causais posteriores.

SCI-005 não é recebimento físico, crédito ao destino ou consumo. Expedição
debita origem/credita trânsito; aceite pessoal e consumo mantêm comandos,
autores e efeitos próprios.

## Governança familiar e apresentação

A administração familiar define quem pode registrar ciência em nome da família
no próprio paciente. Papel global, nome, telefone, UUID ou metadata não
concedem essa autoridade. Vínculo/capacidade vigentes são revalidados no
servidor; revogado não registra nova ciência.

Cada habilitado pode registrar ciência individual, com identidade, instante,
modalidade e conteúdo próprios. **Uma ciência válida de qualquer pessoa
familiar autorizada satisfaz a obrigação familiar (ANY).** Não exigir todas,
gerenciar conversas internas ou atribuir o evento de uma pessoa às demais.
Para a equipe, mostrar **“Família ciente”**. No perfil pessoal, distinguir
“Minha ciência: pendente/registrada”.

Configurações all antigas precisam de compatibilidade prospectiva em D; não
podem restaurar a exigência de todos no produto futuro. Sem pessoa habilitada,
mostrar pendência de designação, nunca Família ciente. Desobrigação antiga ou
booleano true não fabrica ciência pessoal. Revogação posterior não apaga um
evento válido na origem; conservar a autoridade/vigência usada e sua história.
Nova capacidade não inventa ciência de conteúdo passado por silêncio.

A administração familiar responde pela concessão de permissões. Essa regra
operacional não constitui conclusão jurídica sobre responsabilidade civil.

## Conteúdo material, eventos e exemplar

A orientação é **REQ materialmente imutável após a emissão**. Na revisão
estática não se identificou caminho autorizado vigente para editar seu
conteúdo material: detalhe é leitura, submit cria/recupera emissão,
revise_supply_document recusa REQ e resolução de extra acrescenta vínculo
auditado em tabela própria. Estado, atendimento, ciência, vínculos, história e
emissões de PDF são mudanças diferentes do conteúdo original.
[Confronto e fontes](SCIENCE_AS_IS_TO_BE_ANALYSIS.md).

Versão do agregado pode avançar por evento sem mudar o objeto da ciência.
Separar versão técnica, identidade material e identidade de emissão de PDF.
Nova renderização/emissão do mesmo conteúdo não invalida ciência nem retorna a
obrigação a pendente. Não criar editor material para justificar versões.

Se alteração material vier a ser expressamente autorizada no futuro, criar
nova identidade material, preservar ciência antiga no histórico, exigir
ciência própria da nova versão, retornar o agregado a pendente e notificar
responsáveis pertinentes. Nunca reescrever eventos ou usar simples incremento
técnico como prova de alteração material.

## Trabalho técnico restante

P02 não tem escolha humana pendente. A D deverá implementar contratos,
migração incremental/compatibilidade, deduplicação causal, autorização, chave
material e testes discriminantes. Homologação WhatsApp é gate externo de
SCI-004, sem ativação nesta missão. Aprovação de produto não é homologação.

Fontes relacionadas: [REQ](../C3-functional-specification/REQ.md),
[contratos C4](../C4-technical-design/DATA_API_UI_EVENT_CONTRACTS.md),
[inventário de atos](SCIENCE_AND_ACKNOWLEDGEMENT_INVENTORY.csv) e
[casos C9](../C9-acceptance-refinement/ACCEPTANCE_CASES.csv).
