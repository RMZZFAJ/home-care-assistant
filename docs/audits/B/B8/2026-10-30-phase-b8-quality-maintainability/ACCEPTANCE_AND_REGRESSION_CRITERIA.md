# Critérios futuros de aceitação e regressão

Critérios para decisão C, implementação D e homologação. Nenhuma implementação
ou liberação foi iniciada. A matriz A–B7 contém119 famílias/156 IDs e seus
critérios específicos; estes requisitos transversais orientam sua seleção.

## Oráculos novos e confiabilidade

- **AC-B8-01 — Conteúdo PDF.** O teste reprova ausência de texto/fato crítico,
  mantém identidade/versão e confere produto, quantidade, estado e atores
  pertinentes. Metadados/páginas/hash sozinhos não satisfazem a aceitação.
  Amostra visual deve conter casos longos, terminal, parcial e legado.
- **AC-B8-02 — SQL NULL.** Predicado que exige crédito positivo rejeita linha
  ausente, NULL e valor errado, aceitando somente o valor correto. Preservar a
  representação legítima de saldo zero e conferir existência quando exigida.
- **AC-B8-03 — Axe inconclusivo.** Violação conhecida falha; incomplete gera
  pendência por superfície/estado/regra com responsável e decisão. Não falhar
  cegamente todo inconclusivo nem interpretar PASS como conformidade completa.
- **AC-B8-04 — QA-001.** Readiness tardia e variantes reais de navegação
  produzem ramo correto sem sleep arbitrário. Preservar todos os casos e
  verificar o afetado e CI por projeto após correção, sem selecionar só retry
  que passou. Não confundir estabilidade do helper com aparelho homologado.

## Proteções por processo

- **AC-B8-05 — REQ.** Nenhuma quantidade solicitada; desconhecido/zero segue
  decisão explícita; versão e snapshot vêm do banco. Mesma chave após resposta
  perdida recupera mesmo ID/protocolo, sem evento duplicado. Lifecycle progride
  além de candidatas terminais e ciência não simula recebimento.
- **AC-B8-06 — COM/ENT.** Comprar não credita; receber validado credita uma vez;
  expedir usa trânsito; só destinatário aceita. Parcial, remanescente, consumo e
  cancelamento/recusa/sucessão seguem decisões formais, com eventos, atores,
  custódias e versões comprovados antes/depois do erro.
- **AC-B8-07 — BAL/escalas.** Decisão mostra objeto e diferenças antes de
  aprovar; payload usa versão exibida. Contador, janela, ledger e revisão
  independente são revalidados após espera. Legado, reconto/substituição,
  adiamento obsoleto e série encerrada têm negativos próprios.
- **AC-B8-08 — Precisão/estoque/consumo.** Number/string equivalentes e RPC
  direta respeitam precisão antes de coerção; NaN/NULL inválidos não persistem.
  Correção identifica origem quando exigida; relato não debita; decisão oposta
  não devolve sucesso fingido; nenhuma duplicação ou saldo negativo.
- **AC-B8-09 — Autoridade.** Repetir casos positivos/negativos com Auth real
  para papel, contexto, paciente, sessão e capacidade afetados. Menu/mocks não
  substituem DataAPI/RPC. Testar revogação antes/depois de espera, link já
  emitido e JWT dentro de sua janela, conforme garantia aprovada.
- **AC-B8-10 — Alcance/frescor.** Pendência101/proposta51 continuam alcançáveis
  sem vazamento A/B. Filtros não mostram dados antigos como novos; consulta
  lenta/erro/vazio/offline são distintos. Invalidação chega e cada consumidor
  recarrega sem apagar draft nem aceitar resposta antiga.
- **AC-B8-11 — Resultado composto.** Revisão já salva, arquivo enviado ou Auth
  confirmado são comunicados mesmo quando etapa seguinte falha. Chaves e
  identidade recuperáveis conservam intenção; editar conteúdo exige decisão
  nova. Não reutilizar retry genérico que mascara o fato parcial confirmado.
- **AC-B8-12 — Transporte externo.** Timeout de upload e incerto da mensagem têm
  tratamento distinto; callback antigo não encerra lease nova; lote misto
  conserva item válido; hold e replay têm retomada comprovada. Configuração
  completa, recusada e desligada concorda entre API/provider. Homologação Meta
  real é posterior e separada dos transportes falsos locais.

## Qualidade de uso e operação

- **AC-B8-13 — Acessibilidade.** Semântica/nomes/erros, anúncio, foco/retorno,
  teclado/diálogo, tabelas, reflow/zoom e movimento são verificados nos estados
  críticos por pessoa. PDF tem idioma/estrutura/ordem ou alternativa acessível
  aprovada. Usar NVDA, VoiceOver/TalkBack e usuários do público previsto;
  resultado axe sozinho é insuficiente.
- **AC-B8-14 — Aparelho/rede.** Tarefas REQ/ENT/BAL com orientação, teclado
  virtual, câmera/fallback, upload e share em aparelhos físicos. Interromper
  antes/depois da persistência, suspender/reabrir e recuperar a mesma intenção.
  Registrar SO/browser, rede, ator, resultado e divergências. Não simular fato
  material com clique de ciência ou programação de escala.
- **AC-B8-15 — Desempenho.** Definir público/volume/orçamento antes do ensaio.
  Medir latência ponta a ponta, p50/p95 com amostra adequada, erros, memória,
  bytes, consultas/locks e recuperação, discriminando cache e concorrência.
  Repetir só medições relevantes à mudança; nenhum número isolado vira SLO.
- **AC-B8-16 — Release/restore.** Mesmo SHA, schema/configuração e todos os
  gates pertinentes são atestados. Restore em destino isolado com rede/jobs em
  quarentena comprova PostgreSQL/Auth/Storage e reconciliação antes de ativação
  autorizada. Backup/listagem não basta; não executar no existente.

## Manutenção e evidência

- **AC-B8-17 — Documentação.** Fontes vigentes têm data/SHA/ambiente e escopo;
  contratos permanentes não carregam contagens ou autorizações antigas como
  estado atual. Referências históricas permanecem intactas e identificadas.
- **AC-B8-18 — Ferramentas.** Inspect não faz POST por encontrar token;
  destino/identidade/intenção são explícitos. Gerador recusa sobrescrita sem
  opção deliberada; caminho privado é resolvido/circunscrito. Testar com
  transportestub e diretório temporário, sem mutar provedor para provar guard.
- **AC-B8-19 — Cópia/higiene.** Sentinels sintéticos de env/private/venv ficam
  fora da cópia Linux; fontes/lock necessários entram. Remoção futura verifica
  imports/reexports/dinâmicos e URLs, preserva AppWorkspace, tipos ativos,
  fontes/licenças, redirects e evidência. Sem reorganização ou dependência nova
  sem consumidor demonstrado.
- **AC-B8-20 — Disciplina de regressão.** Para cada correção aprovada, associar
  achado, reprodução anterior, expectativa correta, caso negativo e checks
  afetados. Reprodutor de defeito é diagnóstico, não aceite do defeito. Relatar
  falha e limitação; nunca excluir testes/regras para produzir verde.

## Condições humanas, físicas e remotas

Compreensão de decisão e fato físico dependem de usuário/responsável. Câmera,
teclado virtual, AT e impressão exigem equipamentos/operadores reais. Provedor,
Auth/configuração remota, ingresso Vercel, gates e recuperação exigem
homologações autorizadas próprias. Defeito técnico local pode ser provado sem
essas etapas, mas isso não autoriza declarar operação real liberada.

Retenção, exclusão, base legal, responsabilidades e contingência exigem decisão
do controlador e avaliação específica. Não se emite certificação jurídica ou
clínica. A documentação não substitui validação assistencial/material.
