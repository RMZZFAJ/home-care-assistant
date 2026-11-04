# Guias, primeira residência e continuidade

Este é conteúdo-base TO_BE de DEC-026/O01/O19, a completar com screenshots e
procedimentos comprovados **depois de D**. Não é manual de uma interface
futura
já homologada. AS_IS tem caminhos operacionais e alternativa física/foto;
restore integral, entendimento humano e aparelho real continuam pendentes.

## Telas e campos de apoio

<!-- c-table:start -->

- **Tela:** GUI-01

  **Rota e situação:** Guia documental por público, novo conteúdo

  **Objetivo e ações:** Ajudar equipe, família e supervisão a cumprir tarefa;
  links às rotas atuais.

- **Tela:** GUI-02

  **Rota e situação:** Roteiro da primeira residência, novo processo

  **Objetivo e ações:** Verificar preparação sem criar wizard obrigatório
  adicional.

- **Tela:** GUI-03

  **Rota e situação:** Contingência física e conciliação, processo a homologar

  **Objetivo e ações:** Registrar fato fora do app e retornar com autoria,
  data e sem duplicação.

- **Tela:** GUI-04

  **Rota e situação:** Incidente/continuidade, runbook planejado

  **Objetivo e ações:** Identificar responsável, preservar referência e
  recuperar no ambiente autorizado.

<!-- c-table:end -->

<!-- c-table:start -->

- **Campo:** Fato físico e tipo

  **Tipo/origem:** Seleção/texto do registro manual

  **Obrigatório e default:** Sim em contingência

  **Validação/unidade:** REQ/COM/ENT/BAL/consumo não intercambiáveis

  **Ajuda e exemplo:** “Recebimento parcial de entrega.”

- **Campo:** Paciente e referência conhecida

  **Tipo/origem:** Identidade legível

  **Obrigatório e default:** Sim quando conhecida

  **Validação/unidade:** Desconhecido declarado; não criar UUID fictício

  **Ajuda e exemplo:** Protocolo do papel/documento relacionado.

- **Campo:** Data do fato

  **Tipo/origem:** Data/hora/fuso declarados

  **Obrigatório e default:** Conhecida ou desconhecido explícito

  **Validação/unidade:** Não substituir pela data de digitação

  **Ajuda e exemplo:** Separar registro posterior de fato anterior.

- **Campo:** Pessoa que realizou/recebeu

  **Tipo/origem:** Nome/declaração do participante

  **Obrigatório e default:** Conforme fato

  **Validação/unidade:** Não atribuir presença pelo escalado

  **Ajuda e exemplo:** Assinatura física tem origem própria.

- **Campo:** Material/unidade/quantidade/custódia

  **Tipo/origem:** Dados observados

  **Obrigatório e default:** Quando movimento/conferência

  **Validação/unidade:** Distinguir zero, desconhecido, expedição e aceite

  **Ajuda e exemplo:** Não somar previsão ao saldo real.

- **Campo:** Ressalva/evidência

  **Tipo/origem:** Texto/foto/papel

  **Obrigatório e default:** Quando relevante

  **Validação/unidade:** Preservar original/derivado e privacidade

  **Ajuda e exemplo:** A foto não prova sozinha que o fato ocorreu.

- **Campo:** Conciliador e decisão

  **Tipo/origem:** Ator autenticado autorizado

  **Obrigatório e default:** Ao retornar ao app

  **Validação/unidade:** Dupla conferência conforme P05; chave do fato físico

  **Ajuda e exemplo:** Conciliador não se passa pelo recebedor.

- **Campo:** Incidente/correlação

  **Tipo/origem:** Referência segura

  **Obrigatório e default:** Em falha técnica

  **Validação/unidade:** Sem senha, OTP, token ou payload de paciente no
  chamado

  **Ajuda e exemplo:** Suporte acessa só dados necessários.

- **Campo:** Dono/substituto e prazo

  **Tipo/origem:** Pessoa/política

  **Obrigatório e default:** P05/P13, sem default fictício

  **Validação/unidade:** Deve existir antes do uso real

  **Ajuda e exemplo:** Não “monitorar depois” sem responsável.

<!-- c-table:end -->

## Roteiro da primeira residência

1. Responsável aprova ambiente P04, participantes/papéis P01/P11 e
   contingência
P05. Não importar fixtures da auditoria como cadastro real.
2. Titulares criam/confirmam suas contas; administração inicial e convites
seguem aceite pessoal. Conferir paciente/modo no cabeçalho e capacidades.
3. Configurar unidades/precisão e catálogo sob responsabilidade familiar;
adotar modelos explicitamente, apresentações equivalentes e nomes usados.
4. Registrar abertura de estoque com origem, quantidade e motivo reais; não
preencher balanços fictícios para simular histórico. Validar custódias.
5. Programar escala, recorrências, exceções e pessoas; explicar que escala
não comprova presença. Configurar BAL e revisão com pessoas elegíveis.
6. Definir política de ciência, avisos, donos e alternativa sem push;
   instalar
PWA nos aparelhos homologados e optar por avisos conscientemente.
7. Em ambiente de homologação autorizado, executar ciclo acompanhado
REQ→COM→validação→ENT→aceite pessoal→BAL e consumo; praticar erro/retomada.
8. Conferir PDF/versionamento/impressão, acessibilidade e recuperação; testar
contingência e restore no destino isolado. Só liberar após os gates D6.

## Guia da equipe

Entrar e selecionar paciente; verificar tarefa atual e próxima pessoa.
Na REQ, selecionar material, contar apenas o que observou ou indicar
desconhecido;
não pedir quantidade como compra. Em ENT, conferir o que recebeu de fato,
registrar exceções e confirmar pessoalmente; se não recebeu, não aceitar por
colega. Relatar falta/consumo sem presumir débito. Complementar informação
quando
solicitado. No BAL designado, contar na primeira etapa, revisar diferença
depois;
reconto novo tem autoria própria. Se não conseguir cumprir, solicitar fluxo
legítimo de adiamento/designação, não editar agenda para apagar prazo.

Em erro de leitura, consultar novamente; em envio incerto, recuperar a mesma
tentativa. Se acesso mudou, procurar administração local, sem compartilhar
conta. Sem rede, preservar registro físico e informações necessárias conforme
contingência; avisar responsável definido. Não tentar corrigir SQL ou reenviar
mensagem externa. Entender ciência versus leitura versus recebimento.

## Guia da família e administração local

Consultar pendências antigas/filtros, não só sino. Aprovar COM com quantidade
prevista explícita; validar cada chegada; concluir inferior somente conforme
regra escolhida. Expedir com pessoa recebedora indicada e resumo de custódia;
conferir divergência/cancelamento com fatos reais. Corrigir estoque por
compensação referenciada, não edição de saldo. Revisar BAL de versão atual
sem autoaprovar contagem própria. Antes de trocar escala, ler antes/depois e
efeito na obrigação; antes de desligar alguém, ver inventário, sem atrasar
revogação urgente. Encerramento administrativo nunca afirma aceite alheio.

Gerir catálogo inativo sem perder saldo e resolver duplicata sem apagar ID.
Não promover profissional a administrador para contornar um fluxo defeituoso.
Suporte técnico recebe correlação; família decide somente atos locais
legítimos.
Guardar evidências e papéis conforme P08, não em grupo público de mensagens.

## Guia da supervisão

Mesmo com ativação adiada de capacidades próprias, o guia explica consulta
autorizada, revisão independente, proposta de adiamento e designação de novo
reconto. Supervisão não substitui familiar em decisão exclusiva nem assume
recebimento de outro profissional. Se a política exige grupo indisponível,
encaminhar configuração legítima antes do uso, sem ignorar a revisão.

## Contingência e retorno ao digital

Identificar indisponibilidade, responsável e canal de apoio. Usar ficha física
ou registro seguro com campos da tabela, sem inferir o que não foi observado.
Registrar expedição e recebimento separadamente e a pessoa efetiva. Quando
retornar, procurar documento/intenção já persistidos antes de criar novo.
Conciliar um fato físico com chave e referência estáveis; comparar ledger,
documento e papel. Duplicata é vinculada, não creditada de novo.

Se o recebedor ainda tem acesso, ele próprio confirma seu ato no fluxo
permitido,
com data do fato e registro posterior claramente distintos. Se saiu ou não
pode confirmar, guardar declaração física com origem e conciliador próprios;
eventual encerramento administrativo não simula confirmação no aplicativo.
P05 define autoridade/dupla conferência e P08 a guarda; C não presume sua
escolha.

## Incidente e aceite dos guias

Suporte identifica evento/estado/versão/correlação, preserva evidência mínima,
avalia impacto e decide contenção autorizada. Restore tem quarentena e
reconciliação, nunca simples “voltar backup” sobre ambiente em uso.
Dono/substituto,
RPO/RTO e gatilho de continuidade dependem P03/P05/P13. Não medir sucesso só
por 200.

Após D, cada guia recebe capturas do mesmo SHA e revisão por pessoa do
público.
Aceite por tarefa: localizar pendência antiga, preencher sem ajuda indevida,
explicar efeito, recuperar resposta perdida e registrar contingência sem
duplicar.
Screenshot/emulação não substituem participante, AT, aparelho e impressão
reais.
Versão/data/origem do manual acompanham o artefato; rótulos futuros não são
apresentados como produto implementado.
