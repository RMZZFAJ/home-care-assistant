# Q7–Q9 — Desempenho, condições de uso e acessibilidade

## Q7: classificar o que foi medido

- **Snapshots:** B3-015 mediu1000 eventos sintéticos,500500 resumos e 71056717
  bytes textuais. Crescimento quadrático é demonstrado nesse modelo; não é
  tamanho produtivo ou throughput do sistema. Fonte imutável não deve ser
  apagada para reduzir volume; avaliar representação/consulta compatível.
- **Ledger/RLS:** B3 registrou234,4 ms em SELECT de 100 movimentos, cache
  quente. Preparo privilegiado de 1000 foi cancelado em 120 s e revertido. Isso
  exige investigação proporcional de autorização/alerta/lock; não é p95 nem
  prova de indisponibilidade remota ou de uma causa única.
- **Dashboard:** até 25 operações, contando contexto/autoridade além das
  leituras explícitas. Várias ocorrem em paralelo. Número de chamadas e
  snapshots em instantes diferentes são estrutura/risco, sem latência de
  produção medida. Não calcular ganho percentual comparando RPC HTTP e EXPLAIN
  com caminhos de autorização diferentes.
- **Paginação:** B3 percorreu movimentos e documentos sem faltas em amostra sem
  escrita simultânea. OFFSET não garante snapshot durante inserções.
  Cortes100/50 que ocultam pendência são defeitos de alcance, não otimização de
  desempenho aprovada. NULL direto pode remover limite em outra RPC.
- **Worker:** B7 conserva risco do orçamento de 50 jobs, ondas de 10, lease de
  120 s e preparo/upload/send. Mocks imediatos não medem margem e retomada.
  Aumentar duração de Function não amplia automaticamente a lease ou resolve
  incerto.
- **PDF:** B6 avaliou11 documentos/32 páginas e linha extrema; B8 examinou
  oráculos, sem benchmark. Número de páginas/testTimeout não mede CPU/RSS/p95.
  Exigir conteúdo e layout antes de comparar desempenho de um PDF truncado.
- **Arquivos:** incompatibilidade de tetoVercel versus limite anunciado é
  B7-005, demonstrada por contratos e prova local. Não houve carga, upload
  remoto de borda ou incidente413 observado nesta fase.
- **Realtime/multipaciente:** fan-out, polling, reconexão e queries por sessão
  são custos a medir. Broadcast recebido não prova consulta atualizada, e
  ausência de atualização não implica lentidão do banco.

Referências exatas estão em
[PRIOR_REFERENCES](../evidence/PRIOR_REFERENCES.json), especialmente B3.11/B3.12
e B7.7. Nenhum benchmark foi repetido.

## Capacidade de medir no futuro

A suíte atual possui timeouts e duração de execução, mas não distribuições de
latência do processo, RSS por render, orçamento de consultas, bytes por versão,
recuperação ou p50/p95 por papel. B3 oferece planos e fixtures de volume; B7
oferece inventário de limites e condições de parada.

Após definir público/carga em C, ensaio futuro isolado deve declarar amostra,
volumes, cache, papel/contexto, concorrência e rede. Medir do gesto à resposta e
leitura confirmada, separando Auth/contexto, queries, lock, render e serviço.
Registrar p50/p95 somente com distribuição adequada, também erros/timeout e
tempo de recuperação. Não descartar falhas ou medir apenas o ramo rápido.

Primeiro uso não possui SLO/custo aprovado. Não há evidência para recomendar
microsserviços, outro banco/fila, Kubernetes, cache distribuído, multirregião ou
reescrita. Corrigir alcance, orçamento, oráculo e plano medido antes disso.

## Q8: dispositivos, rede e interrupções

Desktop/Chromium, Pixel7 e iPhone13 são emulação. Não há Firefox ou aparelho
Edge/Android/iOS físico homologado. B1 cobre larguras320–1920 em superfícies
definidas; não comprova cada formulário/overlay em cada orientação.

- **Rede lenta/intermitente:** há route.abort e resposta perdida após commit.
  Não há ensaio sistemático de latência/banda/perda móvel, reconexão após
  suspensão do SO ou indicação de dado antigo em todos os consumidores.
- **Reabertura:** reloadREQ conserva intenção. Fechar aba, encerrar navegador,
  reiniciar servidor/worker e reabrir no aparelho são eventos diferentes.
  SessionStorage e prazo24h não sustentam promessa de persistência entre
  dispositivos. A política de intenção/privacidade precisa ser decidida.
- **Câmera/scanner:** EAN sintético em foto exerce decodificação real; câmera
  negada e fallback são simulados. Foco, iluminação, permissão do SO, lente,
  orientação e retorno da câmera exigem aparelhos físicos.
- **Upload/share:** arquivo pequeno e WebShare simulado não homologam limite,
  seletor de arquivo nativo, app de destino, cancelamento/retorno ou duplicação
  após perda de resposta. Alternativa manual e acesso ao PDF devem funcionar.
- **Teclado virtual/área segura:** emulação de viewport não abre teclado do SO
  nem reproduz barra do Safari. Tarefas REQ, ENT divergente e BAL precisam
  manter erro/campo e ação alcançáveis com teclado e orientação reais.

Aceite futuro requer tarefas por pessoa, aparelho/versão, condição de rede,
resultado material esperado e registro de recuperação sem duplicação. Câmera e
compartilhamento permanecem opcionais se o caminho manual aprovado atender o
processo; isso depende do público e não elimina defeitos do caminho básico.

## Q9: cobertura de acessibilidade

A semântica HTML, nomes, labels e alguns erros são alcançados por axe e queries
de papel. Teclado de login, skiplink e entrada no conteúdo possuem assertions.
B1 comprovou trap de um diálogo e acesso por setas à matriz, além de falhas
reais de retorno de foco e reflow. B6 confirmou PDF sem Lang/tags. Essas
evidências não foram reexecutadas nem convertidas em conformidade geral.

O teste percorre páginas comuns e cinco perfis; nem todo estado de erro, vazio,
edição suja, aprovação, conflito, resultado incerto e overlay é alvo. Entrar por
Tab também pode normalizar foco antes da varredura e não detecta sozinho a
restauração incorreta ao fechar um diálogo.

Cobertura por requisito e limite:

- Estrutura/nomes/labels: automatizados nas superfícies alcançadas; revisão
  humana da hierarquia e relação com tarefa ainda necessária.
- Erro/anúncio dinâmico: Notice usa status/alert e há feedback; anúncio real no
  leitor e associação ao campo em todos os estados não homologados.
- Foco/teclado/diálogo: há checks e contraprovas; testar retorno ao gatilho,
  primeiro erro, perda de sessão e edição preservada, sem esconder bodyfocus.
- Formulário/tabela: nomes e overflow não provam cabeçalhos úteis, leitura de
  matrizes, instruções de revisão e compreensão das consequências.
- Contraste: axe pode retornar incomplete, demonstrado pela B8; B1 registrou
  revisão manual. Sem contraste de todas as variantes/estados certificado.
- Reflow/zoom:320CSSpx e raiz200% são provas específicas, sem equivalência
  automática a zoom nativo200/400%, pinch ou ajuste de texto no aparelho.
- Movimento/alto contraste: media queries emuladas B1 não são aceite humano com
  Windows forced colors ou preferências físicas do sistema.
- Leitores de tela: NVDA, VoiceOver e TalkBack não foram homologados por pessoa.
- PDF: estrutura/idioma/ordem, alternativa HTML autorizada e impressão real
  exigem critérios próprios; axe da página não examina o arquivo baixado.
- Orientação e alvos: testar retrato/paisagem,24CSSpx com exceções aplicáveis,
  espaçamento, acionamento e erros com mãos/visão reais. Não certificar cada
  alvo só por screenshot ou contagem de pixels em uma amostra.

A [W3C](https://www.w3.org/WAI/test-evaluate/) explicita o limite de ferramentas
automáticas. B8-Q003 propõe reter pendências inconclusivas, mantendo violação
como falha e triagem humana proporcional. A config ESLint amostrada não tem
plugin dedicado jsx-a11y; isso não demonstra falha concreta de acessibilidade
nem obriga instalar dependência sem avaliar seu benefício.

Conformidade completa WCAG, homologação física e aceite humano permanecem
NOT_VERIFIED. O plano B1 e a matriz desta auditoria fornecem os casos para
homologação; não há justificativa para criar outro grupo B só por esse limite.

O tamanho mínimo e suas exceções seguem o [critério 2.5.8 AA da
W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
