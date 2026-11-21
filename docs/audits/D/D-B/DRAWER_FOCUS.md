# D3.15 — continuidade de teclado no painel de edição

Um teste real do catálogo reproduziu perda do campo ao escolher “Continuar
editando”. O aviso removia seu botão focado e não devolvia o foco à edição.
RecordDrawer agora preserva a referência do último controle do formulário e
o foca antes de remover o aviso. Se estiver indisponível, escolhe um controle
visível e habilitado, com o fieldset preservado como último destino contextual.
Não há novo estado de formulário nem descarte ou salvamento implícito.

Outra falha apareceu após a primeira correção: os seis casos fechavam o painel
após salvar enquanto o acionador ainda estava desabilitado pela atualização
administrativa. O catálogo passou a fornecer seu título como fallback explícito
ao mecanismo existente. O acionador habilitado continua sendo a preferência.
Não se usa foco BODY ou salto ao início como sucesso.

Os botões do aviso também respeitam busy/preventClose: não é possível descartar
a edição por essa saída enquanto uma tentativa está pendente. Isso é proteção
da interação; a autorização continua na API/RPC e não deriva do foco.

## Provas dirigidas

Nove casos de produção passaram: seis novos, duas larguras390/1440 nos três
motores, mais o cenário existente de editar nomes alternativos e inativar item
em cada motor. A stack local e Auth real são conferidos pelo runner, com dados
fictícios e transporte externo desabilitado. Nenhuma suíte mutável de banco foi
executada junto ao E2E; as únicas escritas são as fixtures e tarefas dos casos.

- Continuar preserva campo e valor, sem nova linha de catálogo.
- Um controle anterior tornado hidden por intervenção controlada do teste
  exige fallback visível. Isso não é prova de alteração espontânea em produção.
- Escape sem edição e descarte explícito retornam ao acionador sem gravação.
- Um POST legítimo retido pelo teste mantém o painel e bloqueia fechar,
  continuar e descartar enquanto busy. O pedido é liberado e chega à API real.
- Salvar produz exatamente uma linha e retorna ao acionador ou título próprio;
  o cenário existente conserva identidade ao editar e inativar.

O baseline falhou no retorno ao campo. A primeira correção falhou nos seis
casos no retorno após salvar; os arquivos originais foram preservados. Uma
coleta posterior foi barrada pelo TypeScript antes dos navegadores: o teste
usava hidden numa união HTMLElement/SVGElement. Métodos de atributo corrigiram
a tipagem. Após isso, tipos e lint passaram, e a coorte final terminou9/9.
São16 execuções de browser, nove PASS e sete FAIL preservadas; nove casos
distintos aprovados, sem somar repetições como cobertura nova.

Não foram criados unitários que apenas espelham a implementação, nem repetidas
as suítes globais locais cobertas pela CI. [Manifesto](DRAWER_FOCUS_EVIDENCE.json)
vincula fontes, logs e hashes das contraprovas, sem copiar payloads para o Git.

## Limites e publicação

C037 passa de NOT_STARTED para PARTIAL_LOCAL_DRAWER_KEYBOARD_RECOVERY.
Demais diálogos, Voltar/Confirmar e consumidores próprios, anúncio humano/AT
e aparelho físico continuam pendentes. Não há selo global de acessibilidade.
Matriz45 PASS/51 PARTIAL/9 NOT_STARTED,105x39;29 colunas canônicas e complementos
aprovados preservados. Nenhuma migration nova: local/remoto157, conforme o
[pós-DDL anterior](ENT_TERMINAL_REMOTE_MIGRATIONS.json), sem reset ou nova
operação no remoto. A prioridade da operação diária continua.

O [Preview827531e](ENT_TERMINAL_PREVIEW_OBSERVATION.json) ficou READY na origem
estável, com SHA conferido antes/depois, runtime200/ready, emissões401 sem
sessão do app e worker302 sem acesso Vercel. Essa prova corresponde ao PDF V9
publicado e não é ensaio do novo foco nem reteste físico da PWA.
[CI827531e](CI_827531E_OBSERVATION.json): validate Windows/Ubuntu SUCCESS e
banco em andamento na observação; os demais jobs não receberam aprovação.
O próximo SHA exige CI própria. Sonar adiado pelo responsável. PR7 Draft,
sem merge ou promoção, assinatura/TSA internas e gates D-C/D6 preservados.
