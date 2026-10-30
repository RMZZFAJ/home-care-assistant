# Checkpoint B6

Autorização vigente: ordem mestre B6 de 30/10/2026, B6.0–B6.12 sequenciais,
consolidação e commit/push exclusivamente documentais em `audit/phase-b`. Não
iniciar C/D, corrigir produto, substituir históricos, alterar remoto, executar
reset, envio externo, deploy, PR ou merge.

## Registro incremental

- B6.0 em execução: objetivo e ordem mestre integralmente lidos; AGENTS e skills
  de evidências, PDF e Supabase consultados. Branch confirmada, HEAD
  `69048034dc2532ffbe5d1dbca7dbd041c1f4be16`, árvore inicialmente limpa. Master
  `34dcb835c5c49068e0417f7306eb4e501aa868bc` preservada. Código funcional sem
  diferença da base `37cb7f85e96e551d6419871f94dd950712e2565b`. Node global
  24.13.0; usar binário 24.22.0 do cache por processo. Stack local existente;
  nenhum serviço alterado. Próximo: baseline de hashes/metadados e inventário
  documental. Não executar probes históricos.

## Retomada

Ler este checkpoint, baseline e relatórios encerrados. Evidência sintética de
renderização não é E2E, impressão física, autenticação humana ou prova de fato
material. Hash canônico, hash de arquivo e assinatura são conceitos distintos.

- B6.2 encerrado: B62-S01–03 com dois atores Auth novos e fixtures SQL
  revertidas. Contraprova preservou emissor/paciente/hash v1; código local
  repetido entre pacientes é legítimo. Helper legado preenche data desconhecida
  com now e prioriza paciente atual; origem permanece em payload/fonte. Fixture
  inicial fora do formato foi recusada corretamente, ATTEMPTS registra. Backup
  verificado fora do Git. Próximo B6.3: agregados de hashes/cadeia e tradução
  das garantias canônicas, sem repetir suítes mutáveis B3.

- B6.3 encerrado: agregado READ ONLY de 745 eventos/210 documentos, zero
  divergências de body/hash/cadeia/versão/identidade/cabeçalho. Contratos B3
  idênticos; imutabilidade reaproveitada. Hash não prova autoria/fato físico.
  História quadrática B3-015 não foi repetida. Próximo B6.4: projeção campo a
  campo e estados, particularmente data/legado, divergências e aprovações.

- B6.0 encerrado: guarda local, 395 fontes e 232 rotinas sem drift; baseline
  sanitizado, 84 migrations, buckets/cron existentes preservados. Nenhum dado
  privado copiado. B6.1 encerrado: 17 classes/22 campos; fonte primária, evento,
  derivado, confirmação, legado e demo distinguidos. Próximo B6.2: autoria.

- B6.4 encerrado: matriz de campos e estados produzida; quantidades/custódias
  corretas separadas das omissões e ambiguidades. Novas hipóteses: origem
  legado, data de emissão, motivos ENT, aprovações BAL e cards terminais. Prova
  visual será B6.6; nenhuma falha chamada corrupção só por omissão. Próximo
  B6.5.

- B6.5 encerrado: reconstrucoes REQ/COM/ENT/BAL e cortes de cronologia ligados a
  B36/B44/B47. Backend preserva versao exata; UI nao oferece PDF por evento e
  supply consulta nomes atuais. Nenhum replay mutavel. Proximo B6.6:
  renderizador real, snapshots sinteticos, extracao e inspecao visual.

- B6.6 encerrado: 11 PDFs/32 páginas/20 páginas visualmente inspecionadas, texto
  nativo de todas. PV09 confirmou overflow/corte com nome160/LF; B66-S02
  comprovou alcance catálogo→COM por RPC real e rollback. Contraprova PV08 sem
  espaços e PV07 multipágina comuns passaram. Estados terminais, data Emissão e
  omissões confirmados. Só quatro fixtures refinados foram regenerados; sem
  alterações funcionais. Próximo B6.7: cache e recuperação, com corrupção
  administrativa modelada, sem tocar bytes existentes.

- B6.7 encerrado: cache r4/legado devolveu bytes divergentes no adaptador
  controlado; sem adulteração real. Metadados locais: 199 renders/199 objetos,
  nenhum render órfão; 21 quarantine sem objeto e 1 ready sem objeto de fixtures
  anteriores permanecem, sem limpeza. Próximo B6.8: origem/sanitização de anexos
  e eventual perda de informação visual em annotations PDF.

- B6.8 encerrado: B68-C01 real sanitizeFile removeu FreeText/Ink visíveis;
  quatro imagens origem/derivado inspecionadas. Contraprova em content stream
  preservou a mesma ressalva. Sem upload/Storage, sem assinatura real. Hash do
  sanitizado não preserva original; B1/B3/B4 reaproveitados para custódia/retry.
  Próximo B6.9: decodificar QR sintético e delimitar consulta/versão/hash, sem
  acessar o domínio de produção do QR.

- B6.9 encerrado: dois QRs decodificados de pixels do PDF; id/versão/hash
  exatos. Domínio fixo confirmado; nenhuma URL consultada. Consulta pública
  mínima é diferente de conteúdo privado; QR não recebe bytes nem autentica fato
  físico. Início do decoder ajustado conforme código instalado, sem regeneração.
  Próximo B6.10: interpretação/impresso e contraste monocromático, mantendo
  impressão física e usuários reais NOT_VERIFIED.

- B6.10 encerrado: leitura humana por tarefa e contraste monocromático de PV03
  inspecionados; continuação/código/versão comuns preservados. 25 vistas de
  página no total: 20 primárias, 1 cinza, 4 anexos. Sem teste humano/impresso
  real. Próximo B6.11: privacidade, ciclo de retenção e recuperação conjunta;
  sem restauração sobre ambiente existente nem limpeza de buckets.

- B6.11 encerrado: ciclo de retenção, acesso, revogação, cópias e dependências
  de restore separados. Backup/TOC não é restore; Smart CDN externo não medido
  impede prometer corte universal120s. Nenhuma alteração remota/retention.
  Próximo B6.12: segunda passagem adversarial, contraprovas e reconciliação das
  causas novas/anteriores; consolidar sem iniciar C.

- B6.12 encerrado: COM de duas parcelas por RPC confirmou falta de receiptId no
  evento criador e coleção ausente do snapshot; saldo 1 correto, ambas parcelas
  preservadas. Agregado de ator nulo isolou um legado sem authority, sem falsa
  rotina atual. Contraprovas explícitas; 23 pontos novos/12 referências
  anteriores. B6.0–12 concluídos. Consolidação 13 registros, aceites e handoff
  produzidos. Preservação: 395 fontes, 232 rotinas, todas linhas públicas
  originais e 78 contas Auth estáveis; 2 novas contas fictícias. Próximo:
  validação documental, índice, manifesto, commit/push exclusivos na branch
  existente. Nenhuma implementação.

## Fechamento documental

Todos os25 entregáveis reconciliados: 17 classes/22 campos; 71 linhas de
fidelidade; 13 achados/33 campos(11 P2 e 2 P3); 23 pontos novos e 12 provas
reaproveitadas. Onze PDFs/32 páginas primárias e quatro PDFs de anexo
preservados com hashes. Manifesto, links, evidências e credenciais conferidos.

Markdown, ESLint dos instrumentos, sintaxe e typecheck restrito de imports
passaram. Não repetir provas funcionais por mudanças editoriais. Todas as linhas
públicas originais e 78 contas Auth conservaram os campos estáveis comparados;
395 fontes e 232 rotinas intactas. Dois usuários fictícios novos permanecem;
fixtures SQL revertidas. Nenhum objeto histórico substituído.

As últimas etapas autorizadas são stage exclusivo, commit e push documental em
audit/phase-b. O SHA final é consultável no Git, sem autorreferência no
manifesto. Master preservada; nenhum deploy, PR, merge, alteração remota, envio
externo ou execução de C/D. O pacote é diagnóstico, sem aprovação de produção.
