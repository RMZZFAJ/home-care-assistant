# Como a proteção intermediária funcionará

**Direção aprovada, serviço ainda não contratado/configurado.** Backup é uma
cópia recuperável; continuidade é conseguir trabalhar enquanto o sistema está
indisponível. O responsável precisa escolher quanto pode perder e quanto tempo
pode aguardar. Perda máxima de 1h e retorno em 4h continuam hipóteses,
dependentes de custo, equipe e ensaio real.

## Opções para comparar

<!-- c-table:start -->

- **Opção:** A — exportações periódicas + objetos em destino separado

  **O que será necessário:** Agendamento administrado de exportação, cópia
  cifrada de arquivos, configuração e inventário

  **Trabalho do proprietário:** Conferir resumo diário e acionar operador na
  falha

  **Custo a cotar:** Operador \[a cotar\]; armazenamento \[a cotar\] GB; saída \[a
  cotar\] GB; ensaio \[a cotar\]; total/mês \[a cotar\]

- **Opção:** B — recursos nativos Supabase + cópia independente de objetos

  **O que será necessário:** Confirmar plano e janela nativa/PITR, copiar
  Storage e registrar configuração recuperável

  **Trabalho do proprietário:** Aprovar despesas, ler exceções e participar do
  ensaio

  **Custo a cotar:** Plano \[a cotar\]; PITR/janela \[a cotar\]; objetos/saída \[a
  cotar\]; gestão/chaves \[a cotar\]; total \[a cotar\]

- **Opção:** C — operador gerenciado com restauração contratada

  **O que será necessário:** Escopo escrito de banco/Auth/arquivos/jobs,
  credenciais mínimas, destino e SLA medido

  **Trabalho do proprietário:** Revisar relatório e substituir titular ausente

  **Custo a cotar:** Mensalidade \[a cotar\]; franquia \[a cotar\]; emergência \[a
  cotar\]; restore/teste \[a cotar\]; impostos/câmbio \[a cotar\]

<!-- c-table:end -->

B é a recomendação de estudo para a direção intermediária; não é escolha de
plano ou fornecedor. A pode ser proporcional se a perda/parada aceita for
maior. C só traz valor se o contrato incluir os componentes e o ensaio.
Ferramentas possíveis: exportação oficial Supabase, cópia de objetos com
processo verificável, restic para conjuntos de arquivos e destino S3
compatível separado. S3, Backblaze B2, Wasabi e SFTP são alternativas a cotar
por região, acesso, retenção e saída; nenhuma foi selecionada.

As
[regras oficiais de backup Supabase](https://supabase.com/docs/guides/platform/backups)
informam que cópias de banco não incluem os objetos do Storage. Consultadas em
04/11/2026; o plano/limite do projeto precisa de conferência própria. A
[documentação restic](https://restic.readthedocs.io/en/stable/) descreve
destinos e verificação, sem garantir recuperação da aplicação. Não há preço
fixo reproduzido neste documento: preencher moeda, data, validade da cotação e
responsável antes de contratar.

## O que deve ser recuperável

<!-- c-table:start -->

- **Conjunto:** Banco, schema, histórico, ledger, drafts autorizados

  **Prova futura exigida:** Linhas, FKs, protocolos, versões, saldos e hashes
  comparados ao corte

  **Cuidado:** Dump legível não é restore

- **Conjunto:** Auth

  **Prova futura exigida:** Contas e vínculos recuperados; login/recuperação
  no destino de ensaio

  **Cuidado:** Dados Auth e configuração de provedores/redirects são conjuntos
  distintos

- **Conjunto:** Storage e PDFs assinados

  **Prova futura exigida:** Objetos reais, tamanho/hash e referências;
  exemplar antigo preservado

  **Cuidado:** Metadado de bucket não contém bytes; não gerar assinatura nova
  para substituir perdida

- **Conjunto:** Configuração e chaves

  **Prova futura exigida:** Inventário, acesso de recuperação,
  certificados/cadeia e segredo recuperável pelo operador

  **Cuidado:** Segredos ficam em cofre; nunca no Git ou no relatório público

- **Conjunto:** Jobs, filas e integrações

  **Prova futura exigida:** Estado ao corte e conciliação posterior; zero
  envio durante quarentena

  **Cuidado:** Restaurar cron/segredo pode reativar efeito externo

- **Conjunto:** Código/contratos

  **Prova futura exigida:** SHA, migrations, versão de renderer e
  configurações compatíveis

  **Cuidado:** Backup antigo com código novo pode não funcionar

<!-- c-table:end -->

## Rotina proposta, a aprovar com o operador

Diariamente, automação produz resultado completo ou falha explícita, registra
data/corte/destino/tamanho/hash e verifica presença dos conjuntos. O dono lê
um resumo simples: última cópia válida, idade, componentes ausentes e ação.
Não exige exportação manual diária. Se não chegar resultado no prazo aprovado,
isso é falha, não silêncio saudável.

Semanalmente, titular ou substituto confere acesso ao destino, amostra de
objetos/hash, capacidade e exceções. Mensalmente, operador apresenta custo,
volume, janela de retenção e resultado de exercício proporcional. Frequência
do restore completo será decidida após o primeiro ensaio e mudanças
relevantes; não há periodicidade contratada escondida na rotina proposta.

Titular operacional: **A DESIGNAR**. Substituto: **A DESIGNAR**. Operador
técnico: **A DESIGNAR**. Canal e prazo de resposta: **A APROVAR P03/P13**.
Suporte/global recebe detalhes técnicos; equipe recebe orientação de
continuidade, sem logs, nomes de serviços ou segredos.

## Quando falhar e como retornar

1. Alertar o titular/substituto pelo canal aprovado e preservar última cópia
   válida. Não apagar cópia anterior para abrir espaço automaticamente.

2. Operador identifica o conjunto ausente, registra impacto e corrige dentro
   da autorização; dono decide manter operação ou usar fichas físicas.

3. Restore futuro começa em destino isolado autorizado, rede/cron/worker/
   webhooks em quarentena, sem reenvio. Conferir banco, Auth e bytes juntos.

4. Conciliar fatos posteriores ao corte, mensagens já aceitas e movimentos
   físicos. Nunca reenviar tudo ou reaplicar ledger para completar contagem.

5. Medir perda real e tempo de recuperação; só depois comparar às metas.
   Responsável aprova retomada e saída da contingência.

O primeiro ensaio real é gate D6, com nova autorização e backup do destino
quando necessário. Nenhum restore, leitura de segredo, contratação ou mudança
de infraestrutura foi executado nesta C.
