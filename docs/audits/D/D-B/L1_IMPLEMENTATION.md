# L1 — implementação E01–E03

**Situação corrente: revisão visual reaberta em 14/11/2026.** O responsável
rejeitou a correspondência visual da entrega publicada e determinou reprodução
do laboratório, incorporando os comentários posteriores. A revisão ocorre na
branch `feat/phase-d-implementation`. Os resultados anteriores abaixo preservam
sua data e escopo, sem valer como aceite desta nova composição. Inclui-se a
orientação adicional sobre carregamento sobreposto simples e carregamento com
ícones e etapas nas operações demoradas. Nenhuma fase de carregamento pode
anunciar um registro que ainda não tenha sido confirmado.

## Refação visual de 14/11/2026

Esta seção substitui a conclusão visual anterior. A fonte continua sendo o HTML
v3 com as observações posteriores, sem alterar o laboratório nem criar outro
protótipo. A base local preservada é `a017d9e`; a cabeça publicada anterior é
`27e2f3e`, cuja CI falhou e cuja aparência foi rejeitada pelo responsável.

### Composição reproduzida

- Estrutura da aplicação: cabeçalho, contexto do paciente, navegação lateral e
  inferior, largura da área de leitura, tipografia, espaços, ícones e controles.
  Os estilos de produto do HTML foram portados para `src/app/lab-model.css`,
  sem o painel de simulação. Os componentes foram reestruturados para consumi-los.
- Início: atenção, atalhos, métricas com rodapé de acesso, lista de tarefas,
  requisições e progresso, avisos e semana. Cada item usa o dado autorizado real;
  não há alertas fictícios para preencher o desenho nem plantões simulados.
- Histórico: busca permanente, filtros expansíveis em duas colunas, filtros
  aplicados, contagem, linhas de ficha e paginação. URL, voltar/avançar,
  erro/última consulta e proteção contra resposta antiga permanecem ativos.
- Fichas: identificação, metadados, progresso recolhido, sugestão compacta e abas.
  Visão geral usa Andamentos e cartões laterais. Materiais reúne acompanhamento,
  busca/filtros, linha urgente e ciência. Comunicações, Arquivos e complementos
  usam os mesmos cabeçalhos e cartões, com os respectivos comandos reais.
- Arquivos: cartões compactos, ícone por tipo, visualizar/baixar/compartilhar e
  identificação técnica expansível. Não há marcador triangular nativo preto.
  Anexos ficam visíveis e a inclusão abre o diálogo; uma tentativa incerta
  continua sendo recuperada dentro do próprio cartão.
- Acesso e verificação: cartão de acesso, mostrar senha, cabeçalho público e
  consulta em duas abas. Um PDF realmente emitido passa pelo verificador atual;
  o resultado, seus detalhes e a consulta privada conservam a separação de fatos.

As observações v3 continuam incorporadas: Materiais/Atendimento unidos,
urgência na linha, cores e audiência de Andamentos, menções/referências,
rascunho de quatro campos com CAS, retomada de anexo no cartão, tipos de arquivo,
semântica de ciência/recebimento, DEV autônoma e R1/R3. A refação não reverte
essas decisões para imitar os estados anteriores do HTML.

### Carregamentos

`OperationActivityHost` apresenta uma única sobreposição acessível, mesmo com
leituras concorrentes. A versão simples usa o cartão central com ícone da casa
e círculo. A versão por etapas usa a ligação entre ícones, mensagem da fase e
lista de etapas, como no cenário próprio do laboratório. O movimento reduzido
é respeitado; foco, teclado e bloqueio de cliques são controlados pelo diálogo.

As fases vêm do estado da operação, sem cronômetro que simule conclusão:
ciência distingue registro e conferência; emissão distingue preparação,
pedido ao pipeline e confirmação do exemplar; decisão de convite distingue
comando e leitura de confirmação. Durante uma operação pendente, Escape e
clique fora não liberam a tela. Quando o estado termina, a sobreposição e sua
captura de eventos são removidas. Consultas locais de Andamentos conservam
o esqueleto do feed previsto no laboratório. Suspense e carregamento de rota
também usam a sobreposição simples.

### Superfícies criadas para fatos ausentes no laboratório

São complementos do sistema real no mesmo padrão de cartões, ícones,
disclosures e diálogos. Não representam alterações arbitrárias do desenho
dos cenários que já existem.

- **Ciência familiar em Materiais:** Cartão próprio distingue ciência atual,
  pessoal, histórica e dispensada. Não transforma recebimento ou atendimento
  em ciência.
- **Dimensões independentes da REQ:** Atendimento, ciência e situação
  documental continuam separados; não há quantidade solicitada inventada.
- **Identificação do exemplar:** Disclosure compacto conserva emissão,
  revisão, renderizador, instantes e hash; modos Ficha/Expandido/Auditoria
  usam o pipeline existente e os bytes prontos não mudam.
- **Comunicações completas:** Os cartões incluem tentativas, canal,
  indisponibilidade, leitura, reforço e recuperação reais que o cenário
  simplificado não enumera.
- **Nova avaliação R3:** Cartão familiar apresenta a diferença física
  preservada e exige nova avaliação antes da conclusão, sem conciliar estoque
  automaticamente.
- **Recuperação e concorrência:** Diálogos/ajudas apresentam CAS, rejeição,
  preparação privada e resultado oficial incerto; preservam cada identidade de
  tentativa e não ampliam autosave ou persistência entre aparelhos.
- **Resumos adicionais do início:** Próximo plantão, estoque crítico e acervo
  mantêm seus dados e acessos reais, usando os mesmos cartões e linhas.
- **Orientação inicial existente:** Introdução ao guia usa o cartão verde
  compacto do padrão, preservando progresso e continuidade reais.
- **Verificação contextual:** Resultado técnico completo, confiança interna,
  revogação de acesso e retorno seguro à ficha complementam a consulta pública
  sem ampliar sua audiência.
- **Identificação do contexto:** O rótulo Paciente atual acompanha o nome
  real, pois não existe um nome de residência independente no contrato; o
  seletor nativo e a troca autorizada permanecem.

O calendário semanal e o filtro de período de Andamentos **existem no HTML**;
foram conectados a dados e consultas reais, e não são classificados como criação.
Os textos secundários que falharam na análise de contraste receberam ajuste
pontual de cor, preservando composição, hierarquia e paleta.

### Contratos e correções verificáveis

Duas migrations incrementais acrescentam o necessário para apresentar fatos
reais, sem editar migrations históricas:

- `20261114053000_l1_progress_period.sql`: período civil inclusivo em
  America/Sao_Paulo, aplicado antes de contar/paginar Andamentos. A mesma
  autorização e audiência privada continuam valendo para a consulta inteira.
- `20261114053800_l1_list_science_facts.sql`: listagem expõe serviço e ciência
  como dimensões independentes da REQ. O estado de atendimento não substitui
  o fato de ciência. Paginação, ordenação e escopo autorizado são preservados.

As regressões nativas com Auth real conferem limites de dia, paginação,
notas privadas, outro paciente, revogação e ciência independente do atendimento.
A stack local existente foi conferida e atualizada sem reset ou substituição
de dados. O mínimo de senha continua em seis caracteres por decisão expressa.

As falhas conhecidas da CI publicada receberam correções dirigidas: o consumidor
de preparação aceita `useParams()` ausente fora do App Router; a expectativa
de grants inclui o worker autorizado `notification_pdf`; o teste documental usa
o renderizador atual com emissão completa. Comparações entre duas renderizações
independentes conferem conteúdo extraído por página, quantidades e paginação;
identificadores internos de fontes/objetos PDF não são um oráculo de conteúdo.
A recuperação de um exemplar pronto continua exigindo os mesmos bytes armazenados.

Uma diferença da build de produção foi corrigida na origem: o chunk global
da página de ausência carregava as correções antes do CSS do laboratório.
`l1-ui.css` importa sua referência diretamente antes das correções; layout e
página global passam a conservar a mesma ordem. A próxima rodada usa build
otimizada para conferir essa ordem, em vez de extrapolar o modo diagnóstico.
O diálogo de novo anexo conserva o input no DOM oculto quando fechado, para
manter a seleção local durante uma consulta da lista; a seleção não é enviada
ou persistida. Tentativas existentes são retomadas no cartão, sem abrir um
formulário novo bloqueado. Consumidores de testes seguem esses controles reais.

### Aplicação incremental remota desta refação

Autorização do responsável para migrations preservada nesta conversa.
Projeto `qwfrqychokvhdzakibid`, home-care-assistant, saudável; identidade do
wrapper RMZZFAJ e CLI 2.121.0 conferidas. Foi usado o wrapper para preservar
exatamente os números dos arquivos já aplicados localmente. O conector confirmou
projeto, histórico e grants; a API de aplicação não recebe versão explícita.

- Backup crítico `94f53318-bf7b-4330-aeb3-eaccd67f25c7`: 81 membros,
  16.217.388 bytes, cifrado com chave separada e integridade verificada.
  Manifesto SHA-256
  `4acdcfdcf00b31c5cd6ceb9b862940472858e48eb6484e5cd1c54a54ad2605d3`.
  Reconciliadas 255 migrations antes da alteração; sem restore ou prova D6.
- As duas migrations foram pré-validadas em transação revertida, incluindo
  grants authenticated e negativas anon/service_role. Após rollback, função
  nova ausente e histórico ainda em 255. Aplicação sem seed, roles ou Vault.
- Histórico final 257; dry-run sem pendências. Função de período presente,
  authenticated autorizado, anon e service_role negados. Os 213 eventos e
  11 movimentos conservam seus hashes anteriores; Storage mantém 35 objetos.
  Nenhum reset, fixture, configuração Auth ou comunicação externa no remoto.

A autorização posterior também determina push na mesma branch e acompanhamento
da CI até os testes de navegador/mobile/iOS começarem corretamente. Qualquer
falha anterior será corrigida antes de encerrar. Não exige aguardar a conclusão
dos navegadores e não autoriza merge, release ou promoção de produção.

### Conferência desta refação

Os resultados anteriores deste documento são históricos. A nova conferência
usa `tests/e2e/l1-laboratory-rework.spec.ts`, consumidores existentes e capturas
em `output/playwright/l1-rework/` (artefatos locais ignorados pelo Git).
Desktop de 1440 px e celular de 390 px são comparados com o produto do HTML
na mesma largura, sem o painel do laboratório consumir parte da tela.

Verificações locais: 25 casos unitários, duas regressões nativas com Auth real
e a regressão SQL de service_role passaram. Foram conferidas 33 jornadas
Chromium em produção local, repetindo apenas os casos afetados por correções.
Incluem emissão real, conferência dos bytes, revogação, recuperação sem
duplicatas, CAS, conteúdo histórico, filtros e sobreposições simples/por etapas.
Tipos, ESLint dos fontes afetados, Markdown e check:contracts passaram;
as 84 migrations históricas protegidas continuam intactas. A build otimizada
passou. Os três cenários principais também passaram no diagnóstico anterior,
que permanece distinguido da produção local. A rodada dirigida mobile/iOS
acompanhará a publicação, sem substituir prova em aparelho físico.

Fontes finais: `09a8f17` corrige a CI; `d55465b` concentra a refação visual,
as duas projeções de banco e seus consumidores/testes. Os commits anteriores
`37e9e24` e `a017d9e` permanecem, inclusive o mínimo de senha aprovado.
Este registro e as matrizes constituem o fechamento documental do conjunto.
O push autorizado usa
`git push origin HEAD:refs/heads/feat/phase-d-implementation`
e mantém a PR7 Draft. O SHA efetivamente publicado e o estado observado da CI
serão informados ao responsável. Não há aceite visual ou aprovação geral
presumida a partir desses resultados locais.

Na CI publicada de `67a9041`, Windows e Ubuntu passaram integralmente e o
Preview ficou READY. O replay ultrapassou a falha de grants anterior e encontrou
três fixtures SQL antigas de ENT vinculada sem avaliação familiar explícita.
Elas agora declaram a decisão inicial e conferem R3: recebimento menor fica
pendente de reavaliação; conciliar a falta física não conclui a necessidade;
somente a nova avaliação familiar pode concluí-la, sem novo movimento de estoque.
As três regressões SQL passaram com Auth real e rollback, sem reset. O consumidor
nativo V4 da necessidade compartilhada recebeu a mesma correção e passou.
Nenhuma regra de produto, migration, assertion de privacidade ou gate foi
retirado. A nova publicação deve alcançar os testes de navegador antes do
encerramento autorizado; o resultado anterior não valida seu novo SHA.

Roteiro de avaliação: início → histórico/busca/filtros → REQ/Visão geral →
Materiais/ciência → Arquivos/exemplar/anexo → validação pública e retorno.
Conferir carregamento inicial simples e, em uma emissão ou ciência, as fases
da sobreposição refinada. Conferir também recuperação de resposta perdida e
troca de paciente, sem duplicação de atos.

## Registro da publicação anterior

Conjunto publicado com autorização de 14/11/2026. Push de `27e2f3e` para
feat/phase-d-implementation, PR7 Draft; sem merge, release ou promoção de produção.
Base preservada:
`56babc7b4800fcb324cc3cac28b496a2e1226f44`; branch atual
`feat/phase-d-implementation`. Em 14/11, a branch local adicional foi removida
após avanço direto da original até 37e9e24, preservando todos os commits.
PR7 permanece Draft. Commits funcionais: `80e69be` (contratos), `e7afeeb`
(experiência/PDF) e `1addf86` (revisão CodeRabbit). O quarto commit
concentra documentação e instalação da CI. Nenhum trabalho anterior foi descartado.

## Autoridade e decisões

[Lote L1](../../../../HCA_L1_LOTE_CODEX_E01_E03.md),
[laboratório v3](../../../../hca-laboratorio-01-v3-final.html) e
[comentários v3](../../../../hca-l01-v3-comentarios.json) foram lidos integralmente.
Os comentários posteriores corrigem o HTML. As 36 aprovações e os 15 comentários
incluem duas aprovações com observações. Não foi criado outro laboratório.
HTML/JSON conservam os hashes declarados no lote. O Markdown recebeu somente
espaços nos três separadores de tabela; texto conferido contra a entrada.

- R1, decidida pelo responsável nesta conversa: Revisão substitui parecer na
  interface BAL, mantendo autoria, grupo, observações, itens e aplicação própria.
  Textos literais dos autores e atos históricos não foram renomeados.
- R2: complemento é uma nova ficha emitida pelo pipeline existente, vinculada
  formalmente à origem, com motivo, autor e instante. O vínculo não registra
  ciência, recebimento, assinatura pessoal ou movimento de estoque.
- R3, decidida pelo responsável nesta conversa: quantidade menor recebida exige
  nova avaliação familiar antes da conclusão. A escolha inicial e o recebimento
  são preservados; a nova avaliação não concilia a diferença física nem estoque.

## Resultado no sistema

Acesso com senha de 6/grupos/72 bytes, Google no convite, retorno seguro de 30 minutos
com consulta nova de conta/vínculo/paciente/capacidade e contexto único sem troca
redundante. As capacidades reais de escalas/consumo e a custódia do estoque são
conferidas no retorno. Preferência simples/completa, avisos próprios por 24 h,
requisições abertas, histórico com filtros recuperáveis e ajuda de suporte404.

REQ/COM/ENT/DEV/BAL compartilham cabeçalho compacto, progresso recolhido,
Materiais/atendimento unidos, urgência por linha e filtros. Identificação técnica
fica em Mais. Alteração externa conserva a cópia lida até Atualizar agora e
impede nova geração de PDF com a referência antiga. Operações incertas mantêm
sua própria recuperação. A ciência recupera a mesma intenção após resposta
perdida, sem duplicar o POST.

Andamentos têm autoria, instante, cores, privado explícito, audiência no banco,
menções e referências a fichas/notas por UUID. Pesquisa, contagem, localização,
auditoria e expansão PDF respeitam a mesma audiência. @todos exige público.
O rascunho de Andamento limita-se aos quatro campos aprovados, com escolha
simples de continuar/descartar e comparação CAS. Os demais rascunhos preservam
seu escopo; DOC-C.1 e outras ampliações adiadas continuam OWNER-DEFERRED.
Anexo incerto retoma no próprio cartão e conserva a intenção e o arquivo exigido.

Atendimento parcial/completo é decisão familiar explícita. O recebedor confirma
somente a quantidade física. DEV tem série/código/protocolo próprios, com origem
documental opcional. A central apresenta comunicações/canais/estados reais e
reenvio autorizado/idempotente; resultados antigos sem trilha individual são
rotulados como último resultado. Nenhum canal externo foi ativado por L1.

A emissão tem um desenho aprovado e modalidades Ficha/Ampliada/auditoria.
Pintores experimentais e seus grants foram retirados do uso operacional; bytes,
atos e migrations históricos permanecem intactos. Comunicações usam o mesmo
pipeline, como principal Sistema limitado ao aviso/lease, sem sessão humana
fabricada. A verificação pública conserva resultado mínimo, login no mesmo
contexto e detalhes privados com leitura viva. Autoria, geração e chave técnica
são fatos distintos. Entrar na ficha conserva o gate explícito de papel local.

## Observações incorporadas

| Observações v3 | Aplicação no produto |
| --- | --- |
| E02-24 | Explicação dos detalhes de suporte. |
| E03-01/02/03/66 | Materiais/atendimento unidos; filtros e urgência. |
| E03-01 e R3 | Avaliação familiar distinta do recebimento físico. |
| E03-01 | Central, canais e reenvio autorizado/idempotente. |
| E03-01 e R2 | Complemento: emissão, vínculo, motivo, autor e instante. |
| E03-04 e R1 | Revisão preserva os controles da avaliação BAL. |
| E03-14/20 | Rolagem continua na página ao atingir o limite interno. |
| E03-26/31/34 | Tipos de arquivo e retomada no próprio cartão. |
| E03-37/38 | Conteúdo e escolha simples de continuar/descartar. |
| E03-40 | Layout aprovado; pintores experimentais retirados. |
| E03-57/60 | Cores, privado explícito, referências e @todos público. |
| E03-70 | Duas camadas na mesma consulta, com leitura viva. |

## Verificação e limites

- 24/24 integrações dirigidas em série com Auth real: audiência, R3 de item
  único, fontes congeladas, acervo de 101 entradas e negativas de autorização.
  Um caso próprio adicional gerou, assinou, armazenou e recuperou REQ/COM/ENT/BAL
  pelo principal Sistema. Mesma emissão/bytes, sem transporte externo.
- Corpus unitário impactado de 135 casos conferido entre rodadas. Quatro falhas
  iniciais de orçamento/carga foram isoladas e repetidas em série. O teste que
  compõe cinco PDFs longos recebeu 90 s, mantendo volumes e asserções; o limite
  do verificador público não mudou. Casos de domínio 49 e retorno/autenticação 17
  também foram conferidos; somente uma expectativa antiga de texto precisou
  acompanhar a descrição de atendimento familiar.
- PDF R3 preserva escolha inicial, quantidade física e nova autoria/instante/
  motivo em campos próprios. Parser independente confere conteúdo e posições.
  PDFs ENT/BAL/R3 renderizados por Poppler e inspecionados; corpus longo conserva
  as verificações de geometria e marcadores finais. Corrigida a continuação de
  célula longa que repetia texto sem quebra. Não é prova de impressão física.
- Navegador Chromium: 18 jornadas distintas passaram antes da revisão CodeRabbit,
  com
  comparação L1 em 320/390/768/1024/1440, acesso/início/ENT em 1440/360/412,
  teclado/axe, ciência perdida, CAS, revogação, acervo e PDFs pelos cinco tipos.
  A verificação contextual exige 403 e retirada dos detalhes após revogação,
  conservando o resultado público. Os casos CodeRabbit estão registrados abaixo.
- A cor BAL mediu 4,48:1 em 12 px. O tom #85692c conservou a
  paleta e passou axe, mantendo o limiar 4,5:1. Nenhuma regra foi excluída.
  As esperas dos testes de emissão passaram de 15 s para 60 s, limite já existente
  na API. Asserções de bytes, assinatura, efeitos e recuperação permaneceram.
- `check:contracts`: PASS, 84 migrations históricas intactas. Lint dos fontes
  alterados e tipos passaram; builds de produção compilaram e geraram 124 rotas.
  Markdown atual e diagnósticos apresentados foram conferidos proporcionalmente.

A CI da base 56babc7, run 43479723614, concluiu com falha em Chromium-2/Mobile-2
no mesmo caso de recuperação/revogação de Andamento. Ele exigia um GET automático
quando a invalidação podia retirar o leitor. A contraprova agora exige 403 do
endpoint real e ocultação do conteúdo; esse caso passou localmente. Os outros
jobs passaram na observação da base. Sonar permanece adiado pelo responsável.
Nenhum resultado da base aprova o SHA publicado. O resultado próprio está abaixo.

Node 24.22.0/npm 11.21.1. Projeto local home-care-assistant, API 127.0.0.1:54321,
banco 127.0.0.1:54322. Treze migrations incrementais aplicadas localmente,
20261113190159–20261113231000, total 255. Auth local alinhado à senha forte.
Backup local protegido de 13/11, cerca de 52 MB, manifesto e pg_restore --list
conferidos. Sem reset, replay ou substituição de fixtures. A aplicação remota
posterior foi autorizada separadamente e está registrada a seguir.

O schema L1 remoto foi reconciliado e aplicado em 14/11/2026. Na decisão
posterior sobre senha, o responsável determinou mínimo de 6 caracteres. Essa
decisão substitui o mínimo de 8 do anexo original, que fica preservado como
entrada histórica. Validação compartilhada, ajuda, campo nativo, testes e
configuração local foram alinhados; grupos e teto de 72 bytes permanecem.
O mínimo remoto já era 6: não foi necessária escrita no Auth remoto.
Verificação do ajuste: três casos unitários, um caso com Auth local real e
uma jornada Chromium passaram. Cinco caracteres foram rejeitados, seis aceitos;
grupos e limites UTF-8 continuam conferidos. A recarga da stack local manteve
os contadores de usuários, documentos, eventos, estoque e migrations. Os
cadastros sintéticos do teste ficam no local, com e-mail capturado no Inbucket.
Build com tipos, ESLint afetado e Markdown passaram. O ajuste ainda não foi
publicado e não resolve nem aprova as falhas da CI anterior.
Instalação limpa/evolução completa e integração geral permanecem nos jobs da
CI do SHA a publicar. Preview/CI próprios, aceite visual do responsável, AT,
zoom nativo, impressão/dispositivo físico e provas de provedores são gates
separados. Emulação, PKI efêmera e testes locais não os substituem.

## Conferência pelo responsável

1. Na stack local existente, usar Node/npm declarados e `npm run dev`.
2. Entrar com conta/vínculo local; conferir início, avisos, histórico e retorno.
3. Abrir REQ: Materiais, filtros, urgência, Andamento @todos e rascunho privado.
4. Conferir ENT parcial e diferença física com nova avaliação familiar; no BAL,
   distinguir Revisão de aplicar a contagem. Conferir DEV com identidade própria.
5. Gerar um PDF atual; consultar verificação, entrar no mesmo contexto e conferir
   os detalhes autorizados. Revisar arquivos/anexos e a central de comunicações.

## Publicação e aplicação remota autorizadas

Em 14/11/2026, o responsável autorizou o push e as migrations, sem aguardar
o término da CI. O envio aprovado foi executado uma vez:

```sh
git push origin HEAD:refs/heads/feat/phase-d-implementation
```

- GitHub/PR7: cabeça `27e2f3e7c0a6192fa55316190498b5e356c51198`, Draft.
- Supabase: home-care-assistant, projeto qwfrqychokvhdzakibid.
  Identidade RMZZFAJ e perfil nomeado conferidos pelo wrapper do projeto.
- Backup antes da alteração: 242 migrations reconciliadas, 184 tabelas,
  34 objetos Storage/953.678 bytes. Captura estável conferida, com apenas
  relógios/cursors conhecidos variando. Schema, dados, roles, ACL e bytes
  Storage foram capturados fora do Git e cifrados com a chave separada existente.
  O arquivo cifrado contém 82 membros/15.765.997 bytes; integridade verificada.
  Manifesto SHA-256:
  `9fce6fd965297aa05f37a0b87cefe28ba3ce1c397743538f302811b457cd33a5`.
  Não foi realizado restore, nem alegada recuperação operacional D6.
- Pré-validação da cadeia de 13 migrations em transação revertida: PASS.
  Confirmados schema 1/242 e ausência da tabela nova após o rollback.
  Sem locks em espera, transações antigas ou números DEV conflitantes.
- Aplicação pelo wrapper: `db push --linked --skip-vault --yes`.
  Exatamente as 13 migrations aprovadas, sem seeds, roles adicionais ou Vault.
  Histórico final 255 comparado por tokens com todos os arquivos locais: PASS.
  Dry-run final sem pendências; REST público retornou 200/protocol 1/schema 2.
- Preservação: 212 eventos canônicos, 11 movimentos de estoque e 34 metadados
  Storage com os mesmos hashes. Nas quatro tabelas acrescidas de colunas, todas
  as linhas e colunas antigas coincidem, incluindo as quatro emissões anteriores.
- Guards remotos: RLS da reavaliação ligado e sem leitura direta; entradas de
  renderizadores antigos sem grants; listagem R3 e leitura viva da verificação
  presentes. Sem fixtures, Auth remoto, envio externo ou alteração de exemplares.
- Preview do mesmo SHA: READY,
  [Vercel](https://home-care-assistant-ank5bv6on-rmzzfajs-projects.vercel.app).
  Estado de build não substitui homologação funcional/humana do ambiente remoto.
- A [CI própria](https://github.com/RMZZFAJ/home-care-assistant/actions/runs/43550944609)
  já havia concluído com falha na consulta pontual: testes operational-contracts
  e progress-preparations; replay com asserção de grants service_role. Windows
  foi cancelado e browsers não executaram. Instalação/npm rebuild passaram.
  Não houve espera pelo término, reexecução, novo push de correção ou merge.

Os advisors mantêm alertas de classificação: tabelas privadas RPC-only sem
política direta, extensão pública, funções SECURITY DEFINER e proteção de senhas
vazadas. Os grants e guards novos foram conferidos; não foram relaxados para
eliminar alertas. [Referência do linter](https://supabase.com/docs/guides/database/database-linter).

Este registro posterior de execução foi atualizado localmente. O único push
autorizado acima continua em 27e2f3e; qualquer novo envio segue o gate do L1.

## Revisão CodeRabbit recebida

Foram lidos os 20 comentários completos da revisão concluída na extensão VS Code,
ID `64f9e326-261a-4d32-972b-665a0b9c1bbb`, iniciada em 13/11/2026 às 21:32 UTC.
Ela examinou a base 56babc7 com o L1 ainda não commitado. Não foi executada nem
atribuída ao CodeRabbit uma nova revisão da cabeça final. O tratamento abaixo
confere cada recomendação contra a implementação atual.

Os 14 apontamentos de produto/testes eram pertinentes e foram corrigidos:

| Alvo do comentário | Tratamento |
| --- | --- |
| Consulta da ciência | Identidade inválida retorna 400 de validação. |
| Continuação de acesso | Resultado antigo não redireciona após desmontagem. |
| Google/MFA | Consulta AAL antes de entrar e preserva o retorno seguro. |
| Aviso por 24 h | Filtro e expiração usam o mesmo instante do clique. |
| Avaliação restaurada | Conflito definitivo libera nova avaliação. |
| Descarte da ENT | Limpa também a decisão parcial/completo. |
| Pré-vínculo da REQ | Usa somente linhas abertas da mesma leitura autorizada. |
| Seletor de paciente | Uma opção continua selecionável quando não há seleção. |
| Ciência antiga | Reconcilia a referência antes de liberar outra ciência. |
| Avaliação no PDF | Identifica o material entre quantidades iguais. |
| Série DEV existente | Reserva o máximo usado e preserva os códigos antigos. |
| Parcial na listagem | Inclui review_required, em coerência com o detalhe R3. |
| Comparação canônica | Separa fatos de emissão ausentes do evento original. |
| Baseline do PDF | Literais independentes e contraprova de linha excluída. |

A avaliação familiar não descarta qualquer 4xx: somente o conflito de referência
cujo RPC consulta primeiro o recibo imutável pode encerrar uma incerteza anterior.
Falha de rede, indisponibilidade e perda de acesso preservam a referência. A
ciência consulta o recibo autorizado; ciência antiga confirmada não confirma
o conteúdo atual. Não se apaga uma tentativa apenas porque o hash mudou.

A migration 20261113231000 é incremental. As duas migrations apontadas pelo
revisor já estavam aplicadas e não foram editadas. O probe de evolução usa
uma linha sintética com código ENT-0007, conserva esse código, emite DEV-0008
e também preserva uma série superior, gerando DEV-0021. Ambas as transações
revertem os dados do probe. Não é restauração nem substituição de dados locais.

Os seis comentários do HTML são problemas reais do simulador, mas seus controles
e dados fictícios não pertencem ao produto, conforme a ordem L1. O HTML recebido
continua íntegro; as verificações do equivalente operacional são:

| Comentário no laboratório | Equivalente conferido no sistema real |
| --- | --- |
| Link DEV abre REQ | Rota por UUID; DEV tem identidade e leitura próprias. |
| Save incerto sem saída | Rascunho conserva recuperação da mesma intenção. |
| PDF pendente global | Tentativa real é vinculada ao ator e à ficha. |
| Comentar/Cenários | Controles exclusivos da simulação, sem porte ao produto. |
| Revogação/vínculo único | Leitura viva; seleção vazia corrigida no produto. |
| Entregas indisponível | /entregas tem caixa e ações reais autorizadas. |

Verificação desta revisão: 18 casos unitários, 11 integrações dirigidas em série
e dez jornadas Chromium passaram entre as rodadas dirigidas. O navegador cobre
MFA com Auth real e destino seguro, resposta de autenticação antiga, seleção
vazia com uma opção autorizada, ciência antiga sem acesso e depois reconciliada,
pré-vínculo/descarte e avaliação restaurada/rejeitada ou confirmada com resposta
perdida, sem duplicata. Inclui os três consumidores L1 existentes e o contrato
anterior de senha do perfil. Duas preparações dos novos casos foram ajustadas:
ativar MFA invalida a sessão anterior; o diálogo restaurado já está aberto antes
de trocar a aba. Somente esses dois casos foram repetidos após o ajuste.

Os dois testes de formato canônico tiveram ainda expectativas antigas corrigidas
para o PDF consolidado: correções BAL próprias do exemplar e saldo COM preservado
na recuperação. As comparações do evento/hash, stock e recibo permaneceram.
Tipos, ESLint dos arquivos afetados e check:contracts passaram. Instalação limpa,
evolução geral, integração completa, outros navegadores e CI/Preview do SHA
publicado continuam nos gates já declarados; não há aprovação remota presumida.

## Diagnósticos apresentados durante L1

Conferidos os arquivos atuais, sem desligar regras:

- S9011: os dois botões do perfil e o de MFA enviam seus formulários;
  `type="submit"` agora explicita o comportamento existente.
- S6845/residência: retirada a parada adicional na lista. Os sete botões
  nativos continuam no percurso do teclado e revelam a etapa ao receber foco.
- S6845/materiais: mantido foco na região de rolagem horizontal, com nome e
  papel próprios; retirar esse foco impediria rolagem quando as células não
  têm controles. É uma indicação contextual inadequada do analisador, conforme
  o [critério de rolagem por teclado da W3C](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/).
- S6848/cabeçalho: o contêiner não é um controle. Seu handler fecha o popup
  depois de um botão/link nativo filho ser ativado; o clique gerado pelo teclado
  percorre o mesmo caminho. Não foi inventado um papel de botão ao redor de
  outros botões. Motivo documentado junto ao handler, sem supressão de regra.
- S6505/CI: instalação geral com `--ignore-scripts`; apenas o esbuild fixado no
  lock recebe preparação explícita, offline, com política `allowScripts` e
  `--strict-allow-scripts`. Lock consultado: esbuild e fsevents são os únicos
  pacotes com script; fsevents não se aplica aos runners Linux/Windows.
  Rebuild e executável esbuild passaram. A instalação da CI do novo SHA segue
  pendente, sem rodar `npm ci` sobre a instalação de trabalho.
- S5332/CI: a string era um padrão de substituição de HTTP por HTTPS, sem
  conexão em texto aberto. O padrão agora reconhece HTTP/HTTPS e conserva
  saída HTTPS. Gatilhos, shards, jobs e gates foram preservados.
- S6702/configuração: token do conector no arquivo pessoal do Codex, fora do
  checkout, com ACL local consultada sem expor o valor. Não há evidência aqui
  de versionamento ou exposição que fundamente revogação. Não foi removida
  uma configuração necessária nem alterada a credencial ativa.
- ESLint: removido apenas o import `regularizationId` sem uso. Lint dirigido
  passou depois da remoção.
- MD060: três separadores de tabela no anexo Markdown receberam os espaços
  requeridos; 12 ocorrências da lista apresentada, zero MD060 remanescentes
  pelo markdownlint instalado. Prosa e decisões preservadas.

O alerta contextual mantido não equivale a um defeito ignorado nem ao aceite
remoto de uma issue. Não houve mudança de perfil Sonar ou exclusão de arquivos.

A contraprova da verificação contextual encontrou leitura 200 após revogação:
a função nova chamava apenas o guard dos fatos suplementares da emissão.
O guard completo da ficha era aplicado pelos consumidores antigos, mas faltava
nesse novo consumidor. A migration 20261113222055 faz a consulta privada usar
public.pdf_issuance, que confere leitura viva da ficha e os complementos.
O teste nativo foi estendido aos quatro tipos, com leitura válida e negativas
após revogação nos modos de consulta e seleção de contexto. O navegador também
exige 403 e retirada dos detalhes, mantendo o resultado público.
