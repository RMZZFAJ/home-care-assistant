# Pessoas, convites, vínculos e administração operacional

P-ACC-01–10/P-CAT-01–03; T001–013. Nove cenários em
[B2.7](evidence/b27-results.json), com tentativa inicial de harness preservada.
Dados exclusivamente fictícios. Foram rastreados administração, settings,
convite/aceite, perfil, contexto, catálogo e RPCs de membership/governança.

## Fatos que precisam permanecer separados

- **Fato:** Conta Auth; **O que prova:** Identidade e credencial próprias; **O
  que ainda depende de outra condição:** Email confirmado, sessão vigente,
  perfil e vínculo

- **Fato:** Perfil ativo; **O que prova:** Identidade global permitida; **O que
  ainda depende de outra condição:** Papel e capacidade por paciente

- **Fato:** Convite emitido; **O que prova:** Intenção de ingresso para
  email/papel/paciente; **O que ainda depende de outra condição:** Entrega
  manual, conta correta, prazo e autoridade do emissor

- **Fato:** Convite aceito; **O que prova:** Aceite pela identidade confirmada
  correspondente; **O que ainda depende de outra condição:** Vínculo pode ser
  revogado depois

- **Fato:** Membership ativo; **O que prova:** Papel local vigente; **O que
  ainda depende de outra condição:** Contexto explícito e capacidade da ação

- **Fato:** Capacidade; **O que prova:** Permissão efetiva para a tarefa; **O
  que ainda depende de outra condição:** Destinatário ENT, atribuição BAL,
  versão e condições físicas

- **Fato:** Escala publicada; **O que prova:** Programação autorizada; **O que
  ainda depende de outra condição:** Presença real e responsabilidade específica
  de contagem

- **Fato:** Administração global; **O que prova:** Gestão da plataforma e
  proposta local; **O que ainda depende de outra condição:** Não substitui
  vínculo operacional nem decisão local

B27-01 mostrou administrador local com perfil global professional e globalScope
false. Sua competência local funcionou; ele não conseguiu transformar perfil
de leitor em administrador global. Nome, email, registro profissional e metadata
do navegador não concedem autoridade. A capacidade vem do banco e do contexto.
Documentos históricos preservam autores; lista ativa não pode ser usada para
reescrever identidade passada quando a pessoa deixa a equipe.

## Entrada da pessoa e distribuição de responsabilidades

Administrador local cria/reemite/revoga convite; compartilhamento é manual e
não contém senha. Titular cadastra sua própria credencial, confirma email, entra
e aceita. O token fica em hash; interface retira da URL; nenhum token ou contato
privado foi exportado nas provas. Convite não é evidência de envio externo.
A prévia antes de aceitar continua lacuna B1-UX-004, sem nova causa contada
aqui.

B27-02 recusou conta errada e token antigo após reemissão; conta correta aceitou
o papel reader. Convite aceito não podia ser revogado como se fosse membership:
produto orientou revogar o vínculo. B27-03 executou expiração curta real e
revogação, ambas impedindo aceite. B27-04 revogou o administrador emissor de
convite novo e comprovou revalidação no aceite. O último administrador local
permaneceu protegido. O segundo administrador fictício foi restaurado por ação
explícita, depois de documentada a recusa; nenhuma pessoa real foi alterada.

Alterar função, capacidade e status são ações diferentes. A matriz permite
concessões locais, mas preserva fronteiras familiares e competências não
delegáveis. Trocar pessoa no editor de vínculo não transfere documentos ou
remove automaticamente a pessoa anterior: risco de intenção já assinalado
pela B1. Para efetivar substituição, é preciso tratar os dois vínculos e o
trabalho aberto, sem inferir desligamento pelo nome selecionado.

## Desligamento com trabalho já iniciado

**B2-015:** falta sucessão formal de responsabilidades documentais quando quem
já aceitou materiais perde vínculo. A revogação em si funcionou corretamente.
B27-05 preparou duas entregas: uma sem aceite e outra com um aceito e um ainda
em trânsito. B27-06 revogou vínculo da profissional; comandos daquele paciente
foram recusados, mas seu segundo contexto continuou utilizável. Documento,
quantidade aceita e eventos permaneceram; diretório ativo excluiu a pessoa.

B27-07 reatribuiu a ENT sem aceite e o sucessor a concluiu. Na parcial, reassign
foi recusado; administrador não pôde declarar recebimento complementar pelo
destinatário; sucessor não pôde consentir cancelamento como se fosse o anterior.
Assim, as salvaguardas corretas deixam uma necessidade real sem processo de
transição. Não houve devolução nem consumo fictício para limpar a pendência.

Não se deve impedir revogação urgente até o profissional concluir tarefas.
Também não se deve dar ao sucessor poder de assinar pelo antecessor.
Alternativas
para C: inventário de pendências no desligamento com tarefas para família;
termo de transferência para conferência futura, sem alterar aceites antigos;
conciliação excepcional por identidades distintas e evidência; ou encerramento
do impasse com conservação do documento, conforme o fato físico. A solução deve
definir quem atesta o restante e quem autoriza assumir essa responsabilidade.

B27-08 tentou reutilizar convite aceito antigo:42501 membership revoked.
Não houve reativação silenciosa. A assertion inicial do auditor esperava retorno
do vínculo revogado; foi corrigida e preservada, sem atribuir esse erro ao
produto.
Reativação posterior exigiu administrador. Ela foi usada apenas para restaurar
a identidade fictícia às próximas provas, não como recomendação de desligamento.

## Administração local/global e recursos operacionais

B27-09 autenticou global sem vínculo local. Criar ENT foi recusado. Proposta
de settings ficou pending; global não conseguiu aprová-la; outro administrador
local aplicou. Proposta, aprovação e aplicação são fatos separados. Aprovar
ingresso sem vínculo pode produzir convite aguardando aceite, em vez de ingresso
efetivo. Portanto “aprovado” não equivale universalmente a acesso pronto.

Governança exige versão e identidade distinta para proposta global. O adaptador
antigo de /api/admin cria chave nova no servidor: A-BE-005 continua risco de
propostas duplicadas depois de resposta perdida. B2 não o resolveu com novo
reprodutor nem confundiu com o endpoint patient-settings, que recebe chave.
Propostas antigas e decisão sobre dados já alterados precisam de resumo
autorizado do estado atual; JSON de decisão continua B1-UX-003.

Catálogo é local, com identidade products preservada. Novo paciente começa
vazio;
adotar modelo é explícito. Admin administra unidades, apresentações, mínimos,
destinatários e regras dentro do paciente. Aprovação de catálogo não prova
treinamento de operador nem competência clínica. Unidade com história é
protegida; inativação com saldo e conversão de embalagem foram provadas em B2.4.
Esses controles dependem de responsáveis capazes de explicar o efeito antes de
salvar, não de mais opções de configuração sem consumidor.

## Segunda passada, aceites e limites

Perfil pessoal (P-ACC-10) foi reconstruído em fonte, sem modificar perfil global
existente. Nome, registro, foto privada e preferências são dados do titular;
trocar senha exige credencial atual e troca de e-mail/telefone tem confirmação
própria. Foto no Storage e vínculo do avatar são etapas distintas; URL de
leitura
é temporária. Lista de sessões e sair das outras sessões tratam identidade,
não desligamento de um único paciente. A recuperação de senha, confirmação de
contato, MFA e associação de provedor devem ter caminhos de erro/retomada
próprios.
Os contratos foram localizados em login-form, profile/route e serviços Auth;
entregaSMTP/SMS/OAuth e eficácia dessas jornadas não foram homologadas na B2.
Uma credencial recuperada continua precisando de vínculo e contexto válidos.

Foram confrontados convite emitido/aceito, vínculo/conta, global/local e acesso/
responsabilidade. Reemitir, revogar, expirar e revogar emissor tiveram
comportamentos
distintos e seguros. A hipótese de reativação por convite antigo foi refutada.
O sistema preserva o último administrador e outros pacientes; não se recomenda
remoção de conta para retirar um vínculo local.

AC-B2-015 deve revogar imediatamente e manter história; listar tarefas
atingidas;
transferir somente ações futuras com decisão/evidência apropriada; proibir
impersonação e estorno fictício. Testar ENT sem aceite, parcial, cancelamento,
BAL ativo, revisão, convite/proposta pendente e segundo paciente. O inventário
de
desligamento é primeiro uma síntese de recursos existentes; um módulo novo não
está decidido.

Não verificados: cadastro de nova família com participante real, entrega real de
convite, email/SMS/OAuth externos, revogação concorrente entre últimos admins
nesta B2, quadro completo de MFA e todas combinações de overrides. Leitura dos
contratos e provas de capacidades específicas não substituem auditoria técnica
integral de Auth/RLS. A identidade global de teste existente apenas autenticou;
perfis e vínculos modificados pertencem às fixtures novas da B2.
