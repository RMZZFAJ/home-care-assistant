# Pessoas, capacidades e responsabilidade

AS_IS: contexto explícito por sessão em my_workspace/authority_sessions,
capacidades por paciente, RPC e RLS; fontes em src/types/workspace.ts,
src/lib/server/api.ts e contratos da B3/B4. TO_BE preserva essa fronteira,
adicionando identidade do fato físico e sucessão sem usurpação
(DEC-001/006/028).
Papel exibido ajuda a entender a tarefa; a decisão de acesso ocorre no
servidor.

<!-- c-table:start -->

- **Ação:** Emitir REQ

  **Quem pode iniciar:** Vínculo ativo com capacidade de requisitar

  **Quem confirma e o que deve ser verificado:** Próprio autor autenticado;
  paciente e catálogo do contexto.

- **Ação:** Aprovar/adquirir COM

  **Quem pode iniciar:** Familiar/admin local com capacidade correspondente

  **Quem confirma e o que deve ser verificado:** Ator autorizado em cada
  etapa; validação segue política vigente. Profissional não ganha acesso
  familiar por receber ENT.

- **Ação:** Expedir ENT

  **Quem pode iniciar:** Autorizado na custódia de origem

  **Quem confirma e o que deve ser verificado:** Revalida saldo, destinatário
  elegível e versão; não aceita pelo destino.

- **Ação:** Aceitar ENT

  **Quem pode iniciar:** Pessoa designada que efetivamente recebeu

  **Quem confirma e o que deve ser verificado:** Mesma identidade autenticada
  e capacidade vigente; ninguém assina em seu lugar. Escala só sugere.

- **Ação:** Consentir cancelamento após aceite

  **Quem pode iniciar:** Recebedor responsável pelo ato preservado

  **Quem confirma e o que deve ser verificado:** Consentimento não apaga
  aceite; devolução/consumo reais e concorrência são conferidos.

- **Ação:** Encerrar exceção irrecuperável

  **Quem pode iniciar:** Admin local autorizado e motivado

  **Quem confirma e o que deve ser verificado:** Evento administrativo
  explícito; não marca material recebido ou devolvido sem prova.

- **Ação:** Iniciar transferência simples

  **Quem pode iniciar:** Autorizado de qualquer custódia

  **Quem confirma e o que deve ser verificado:** Contraparte confirma
  declaração; aceite físico pessoal separado segundo P07.

- **Ação:** Contar BAL

  **Quem pode iniciar:** Designado elegível na janela e com capacidade

  **Quem confirma e o que deve ser verificado:** Autor da nova contagem,
  revisão do ledger e atribuição atual.

- **Ação:** Recontar BAL

  **Quem pode iniciar:** Substituto formalmente designado

  **Quem confirma e o que deve ser verificado:** Novo autor/versão; não herda
  autoria nem aprovação anterior.

- **Ação:** Revisar BAL

  **Quem pode iniciar:** Grupo e pessoa exigidos pela política

  **Quem confirma e o que deve ser verificado:** Identidade distinta do
  contador efetivo da versão, inclusive regime legado.

- **Ação:** Alterar escala/adiar BAL

  **Quem pode iniciar:** Capacidades diferentes

  **Quem confirma e o que deve ser verificado:** Gestor não ganha decisão
  familiar de adiamento; proposta obsoleta não aprova.

- **Ação:** Relatar/complementar consumo

  **Quem pode iniciar:** Relator autorizado no paciente/custódia

  **Quem confirma e o que deve ser verificado:** Complemento tem autor
  próprio; confirmação posterior por quem tem capacidade de débito.

- **Ação:** Gerir catálogo/acesso

  **Quem pode iniciar:** Admin local ou delegado com capacidade

  **Quem confirma e o que deve ser verificado:** Somente contexto local;
  unidade usada/história protegidas.

- **Ação:** Propor mudança global

  **Quem pode iniciar:** Admin global no modo global

  **Quem confirma e o que deve ser verificado:** Outra identidade admin local
  decide; mudar de modo não autoriza autoaprovação.

- **Ação:** Revogar vínculo

  **Quem pode iniciar:** Admin local autorizado

  **Quem confirma e o que deve ser verificado:** Revoga imediatamente;
  inventário de pendências não bloqueia. Preserva outro paciente e autores
  históricos.

- **Ação:** Preferência de ciência/push

  **Quem pode iniciar:** Usuário sobre si

  **Quem confirma e o que deve ser verificado:** Política por tipo/modalidade
  e consentimento; subscription não é autoridade.

- **Ação:** Suporte técnico

  **Quem pode iniciar:** Admin global/suporte com escopo auditável

  **Quem confirma e o que deve ser verificado:** Diagnóstico técnico mínimo;
  não recebe poderes locais ou material privado automaticamente.

- **Ação:** Consulta histórica/PDF

  **Quem pode iniciar:** Vínculo/capacidade documental pertinente

  **Quem confirma e o que deve ser verificado:** Revalidação de contexto e
  versão, inclusive após rename/inativação.

<!-- c-table:end -->

Família comum e administração da família não são sinônimos: cada ação usa
capacidade efetiva. Profissional, supervisor e leitor conservam identidades;
capacidades próprias dos dois últimos podem aguardar P11. Se revisão ativa
exige supervisão, não declarar release apto sem pessoa elegível ou alteração
legítima de política. Overrides não podem burlar confirmação pessoal.

Trocar paciente limpa seleção e consultas; rascunhos continuam no escopo
original. Token antigo, nome, telefone informado, metadata e UUID de documento
não concedem autoridade. Revogação impede novas ações; operação em espera e
URL
já emitida seguem P15 e seus limites explícitos. O servidor registra ator
efetivo, delegante administrativo quando houver, versão e instante
separadamente.

Critério: duas pessoas do mesmo papel não são intercambiáveis para o aceite
ENT; uma substituta consegue novo reconto legitimamente; global sem vínculo
operacional não move estoque; conta multipaciente conserva acesso só ao
vínculo
não revogado. Provar por HTTP/RPC Auth real e leitura independente em D.
