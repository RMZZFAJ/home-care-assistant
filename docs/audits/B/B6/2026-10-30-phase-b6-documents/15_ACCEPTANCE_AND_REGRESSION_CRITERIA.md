# Critérios de aceitação e regressão futuros

Estes são critérios para decisão/correção autorizada posterior. Não são
implementações nem testes do produto executados nesta B6. Preservar eventos,
bytes antigos, autoria, custódias e controles de autorização.

## AC-B6-001

**Aceite:** Data NULL imprime desconhecida; nome de origem disponível prevalece
com proveniência; data de importação aparece com rótulo próprio.

**Regressão:** Legado com/sem data, autor/paciente conhecidos/desconhecidos,
rename, duas versões, renderer original e r4.

**Não perder:** Inventar data/autor no legado; reescrever evento/PDF antigo;
perder identidade operacional.

**Decisão:** Definir campos de origem versus reconstrução e tratamento de
registros já derivados.

## AC-B6-002

**Aceite:** Draft criado D1/emitido D2 mostra ambos instantes corretamente;
download tardio não inventa nova emissão.

**Regressão:** Emissão direta, draft, submit, revisão recusada, timezone, legado
sem data e reabertura.

**Não perder:** Alterar created_at histórico, confundir emissão/reemissão e
apagar período de rascunho.

**Decisão:** Ratificar quais datas são obrigatórias no cabeçalho e metadados.

## AC-B6-003

**Aceite:** Rename/revogação não muda nome histórico apresentado; ID permanece;
nome atual é identificado como atual.

**Regressão:** Pessoa ativa/revogada, rename, ator system, legado sem nome e
usuários compartilhados A/B.

**Não perder:** Reescrever autoria passada; expor pessoas de outro paciente;
atribuir ação system a humano.

**Decisão:** Aprovar padrão de nomes históricos e anonimização autorizada sem
apagar autoria.

## AC-B6-004

**Aceite:** PDF mostra avaria/nota e resolução missing/returned distintamente;
parcelas históricas e autores permanecem claros.

**Regressão:** Aceite integral/parcial/zero, avaria, falta, devolução, consumo
anterior, cancelamento e múltiplas conciliações.

**Não perder:** Expor conteúdo desnecessário, alterar totais ou chamar consumed
de returned.

**Decisão:** Definir conteúdo mínimo do comprovante e quais ressalvas exigem
destaque.

## AC-B6-005

**Aceite:** Reconto mantém aprovações antigas identificadas como antigas; PDF
atual mostra somente elegíveis como vigentes e política correspondente.

**Regressão:** Any/all, supervisão/família, contador diferente, legacy/agendado,
duas contagens e fuso distinto.

**Não perder:** Reutilizar aprovação antiga, mostrar revisor como contador ou
chamar escala de presença.

**Decisão:** Definir conteúdo de aprovação e vínculo com histórico de
obrigação/prazo.

## AC-B6-006

**Aceite:** Nenhuma versão cancelada manda receber; nenhum legado desconhecido é
chamado pendência operacional atual; parciais conservam números.

**Regressão:** Todos estados dos quatro tipos, ciência tardia, arquivo,
reabertura e cancelamento antes/depois de aceite.

**Não perder:** Ocultar recebimento histórico ao cancelar ou trocar pendência
real por concluído.

**Decisão:** Aprovar vocabulário de estado por dimensão; evitar um único status
genérico.

## AC-B6-007

**Aceite:** Marcador final fica visível e extraível; todas linhas dentro da área
útil; rodapé livre; falha explícita se conteúdo não representável.

**Regressão:** LF interno, nomes/unidades longos, palavra sem espaços, notas,
anexos, história extensa e todas tabelas.

**Não perder:** Truncar silenciosamente para caber, mudar conteúdo histórico ou
recusar nomes legítimos sem migração.

**Decisão:** Definir preservação de parágrafos em cadastro versus normalização
futura autorizada.

## AC-B6-008

**Aceite:** FreeText/Ink e campos visíveis relevantes sobrevivem em derivado
passivo ou são recusados com aviso; hash/proveniência qualificados.

**Regressão:** PDF com/sem anotações, formulário, scan, foto, ativo recusado,
100 páginas, rotação e replay do mesmo derivado.

**Não perder:** Reintroduzir scripts/ações ativas, expor original sensível ou
invalidar assinatura sem aviso.

**Decisão:** Escolher estratégia de preservação visual e retenção do original;
não atribuir assinatura fictícia.

## AC-B6-009

**Aceite:** Evento oferece PDF exato e identidade visível; mudanças
significativas têm antes/depois/motivo quando disponível.

**Regressão:** Arquivo/reabertura, reconto, rename, versão inexistente,
revogação e original ausente.

**Não perder:** Confundir atual com histórico, ampliar acesso ou baixar versão
errada por cache.

**Decisão:** Aprovar profundidade do histórico no primeiro lançamento e público
autorizado.

## AC-B6-010

**Aceite:** Cada nova parcela tem evento com ID e proveniência; histórico
explica rejeição/validação e PDF distingue informado/validado sem alterar saldo.

**Regressão:** Parcelas idênticas, dois autores, recebimento admin automático,
rejeição, múltiplas validações e resposta perdida.

**Não perder:** Inventar associação retroativa ambígua, alterar hashes antigos
ou tratar pendente como entrada validada.

**Decisão:** Definir conteúdo mínimo por parcela e estratégia não destrutiva
para legado sem elo formal.

## AC-B6-011

**Aceite:** Digest divergente gera erro recuperável explícito sem transmitir
como arquivo válido; original não é substituído.

**Regressão:** Cache correto, bytes alterados, arquivo ausente, truncado,
colisão de render, legado e revogação.

**Não perder:** Sobrescrever/regenerar original ao detectar falha; confundir
hash de body com hash PDF; latência não medida.

**Decisão:** Definir política de falha e reconciliação de integridade em
restauração.

## AC-B6-012

**Aceite:** Idioma e leitura por headings/tabelas são comprovados por estrutura
e AT; alternativa mantém campos/versão autorizados.

**Regressão:** Quatro tipos, multipágina, nomes longos, zoom/baixa visão, AT e
versão histórica.

**Não perder:** Trocar biblioteca sem preservar renderer antigo, quebrar layout
ou declarar conformidade só por tags.

**Decisão:** Definir público, alternativa acessível e gate humano de lançamento.

## AC-B6-013

**Aceite:** Decisão editorial documentada; se incluído, campo histórico e
unidade corretos, flags por item coerentes e renderer antigo preservado.

**Regressão:** Zero/desconhecido/fracionário, extra não resolvido,
parcial/arquivo/reabertura e nomes longos.

**Não perder:** Chamar observado de saldo oficial/quantidade solicitada; usar
catálogo/estoque atual no passado.

**Decisão:** Aprovar conteúdo mínimo da REQ compartilhada; manter mínimo de
digitação e contrato sem quantidade solicitada.
