# Registro mestre dos achados B1

Produto 37cb7f85e96e551d6419871f94dd950712e2565b. Revisão
2026-10-29T08:43:57.435Z. 35 causas/necessidades deduplicadas:
{"P0":0,"P1":1,"P2":22,"P3":12}. Nenhuma correção executada. Prioridade não é
certificação de conformidade nem aprovação de release.

O CSV contém o mesmo registro completo. Manifestações por superfície estão em
evidence/FINDING_MANIFESTATIONS.csv; a ponte integral com os32 achados
anteriores está em evidence/PHASE_A_CROSSWALK.csv. IDs não contam cada texto
equivalente como problema independente. P2de risco não afirma dano ocorrido;
P3de oportunidade depende de validação humana/custo.

- [B1-UX-001](#b1-ux-001) — P1 — Aprovação de alteração pontual de escala não
mostra o objeto da decisão
- [B1-UX-002](#b1-ux-002) — P2 — Confirmações de estoque, ENT e configuração BAL
omitem consequências por domínio
- [B1-UX-003](#b1-ux-003) — P2 — Decisão de proposta administrativa exige ler
JSON e identificadores
- [B1-UX-004](#b1-ux-004) — P2 — Aceite de convite carece de prévia do vínculo
- [B1-TEXT-001](#b1-text-001) — P3 — Códigos de filtros, ações e papéis escapam
à linguagem humana
- [B1-NAV-001](#b1-nav-001) — P3 — Alguns nomes de destino não correspondem à
tarefa aberta
- [B1-TEXT-002](#b1-text-002) — P3 — Títulos COM e BAL generalizam
incorretamente a operação
- [B1-TEXT-003](#b1-text-003) — P3 — Página pública desconhecida cai em mensagem
inglesa sem caminho de recuperação
- [B1-ERR-001](#b1-err-001) — P2 — Anexo com resposta perdida deixa arquivo
editável apesar de persistência confirmada
- [B1-ERR-002](#b1-err-002) — P2 — Adaptador de erro mistura recuperação de
leitura com resultado incerto de escrita
- [B1-ERR-003](#b1-err-003) — P2 — Conflito na permissão crítica fecha o diálogo
e afasta o erro da intenção
- [B1-STATE-001](#b1-state-001) — P2 — Consultas sem estado próprio afirmam
vazio/configuração ausente antes do resultado
- [B1-STATE-002](#b1-state-002) — P2 — Filtro novo pode coexistir com linhas
antigas sem indicação de atualização
- [B1-STATE-003](#b1-state-003) — P2 — Falha secundária no estoque descarta
saldo válido e apresenta ausência
- [B1-STATE-004](#b1-state-004) — P2 — Prazo fixo de acompanhamento regride
resultado concluído e mistura preparo de PDF
- [B1-STATE-005](#b1-state-005) — P2 — Leitura sem rede mantém aparência atual
sem indicação visível de desatualização
- [B1-FORM-001](#b1-form-001) — P2 — Estoque não observado e zero convergem
silenciosamente na REQ
- [B1-FORM-002](#b1-form-002) — P2 — Validações não acompanham limites e foco
dos campos em todos os caminhos
- [B1-FORM-003](#b1-form-003) — P3 — Ajuda e teto de senha nova variam entre
cadastro e perfil
- [B1-FORM-004](#b1-form-004) — P3 — Seleção COM/ENT não aproveita busca já
disponível para catálogos maiores
- [B1-FORM-005](#b1-form-005) — P2 — Apresentações têm cadastro sem visão
equivalente de consulta/gestão no consumidor
- [B1-FORM-006](#b1-form-006) — P2 — Editor de vínculo permite trocar pessoa sem
explicar destino do vínculo anterior
- [B1-FORM-007](#b1-form-007) — P3 — Apagar nome curto não comunica intenção de
remoção
- [B1-UX-005](#b1-ux-005) — P2 — Promessa de rascunho no dispositivo excede
persistência da aba
- [B1-VIS-001](#b1-vis-001) — P3 — Fundação visual precisa de consolidação
orientada pelo resultado, com exceções explícitas
- [B1-UX-006](#b1-ux-006) — P3 — Histórico tem versões e integridade, mas exige
tradução manual de mudanças de negócio
- [B1-UX-007](#b1-ux-007) — P2 — Pendências antigas de consumo e eventos
administrativos têm alcance de consulta limitado
- [B1-FEED-001](#b1-feed-001) — P3 — Feedback genérico não distingue relato de
consumo,confirmação e aquisição
- [B1-DOC-001](#b1-doc-001) — P3 — PDF da REQ omite estoque observado presente
na ficha
- [B1-A11Y-001](#b1-a11y-001) — P2 — PDFs não expõem idioma e estrutura de tags
no arquivo examinado
- [B1-A11Y-002](#b1-a11y-002) — P2 — Fechar decisão e continuar edição podem
devolver foco ao corpo
- [B1-A11Y-003](#b1-a11y-003) — P2 — Observação válida contínua rompe reflow da
revisão em320px
- [B1-NAV-002](#b1-nav-002) — P3 — Seletor Mês mantém visualização de dia no
móvel
- [B1-QA-001](#b1-qa-001) — P2 — CI desktop segue falhando por escolha
transitória de navegação no helper
- [B1-UX-008](#b1-ux-008) — P2 — Ciência automática continua ligada à exposição
do cabeçalho

## B1-UX-001

Aprovação de alteração pontual de escala não mostra o objeto da decisão. **P1 —
DEFECT_CONFIRMED**.

**Origem e escopo:** UX-001

**Subgrupos:** B1.1;B1.6;B1.8

**Superfícies:** SC-014

**Rotas:** /escalas

**Pessoa e intenção:** Administrador local aprovador

**Controle/jornada:** Aprovar alteração → Revisar escala → Confirmar gravação

**Estado:** READY_REVIEW

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Authorized consequential decision without
information needed to verify the object

**Frequência plausível:** Toda decisão pontual proposta; rara por turno, alta
consequência.

**Atual exato ou ramo:** Revise o período, o profissional e o efeito da
alteração.

**Resultado observado:** A lista mostra motivo; o diálogo repete orientação
genérica e não apresenta pessoa, período atual/proposto, fuso nem efeito na
atribuição BAL. Reconfirmado em390 e1440 sem aprovar.

**Consequência humana:** Pode autorizar mudança de plantão sem perceber quem
assumirá, em que horário ou qual obrigação muda.

**Reprodução:** Abrir fixture histórica de UI da Fase A com adminA; entrar
Escalas; localizar Alteração solicitada; clicar Aprovar alteração; ler diálogo e
voltar sem confirmar.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** 390 and1440CSSpx

**Evidência atual:**
[evidence/b18-accessibility-adminA-decision-dialog1440.png](evidence/b18-accessibility-adminA-decision-dialog1440.png)
; [evidence/b18-followup.json](evidence/b18-followup.json);
[evidence/b11-followup.json](evidence/b11-followup.json).

**Código conferido:**
[src/components/schedules/schedule-console.tsx:66](../../../src/components/schedules/schedule-console.tsx#L66)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Revisar alteração de plantão. Profissional: \[atual\] →
\[proposto\]. Período: \[início/fim atuais\] → \[novos\], horário de \[cidade/fuso\].
Responsabilidade BAL: \[efeito ou não altera\]. Motivo: \[texto\].

**Proposta visual:** Comparação em linhas Atual/Proposto; resumo sempre visível
acima dos botões; mudanças destacadas sem depender só de cor.

**Comportamento recomendado:** Carregar resumo autorizado da versão esperada; se
mudou, bloquear aprovação e reapresentar. CTA Aprovar esta alteração; Voltar à
proposta.

**Alternativas e objeções:** Um link ao detalhe não resolve se o diálogo final
não identifica a mesma versão. Remover confirmação reduz proteção.

**Decisão necessária:** Responsável por escala/família define quais efeitos BAL
exigem ciência explícita; contrato e dados autorizados em B2/C.

**Invariantes:** Aprovação distinta quando exigida; controle de versão,
sobreposição, transação e autoridade no banco.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio; pode exigir presenter/read model

**Risco de regressão:** Resumo montado de dados desatualizados ou inferir
presença a partir da escala.

**Aceite futuro:** Para proposta de troca de pessoa e horário, aprovador explica
antes/depois sem sair do diálogo em390/1440; payload usa versão exibida;
conflito409 mantém revisão; nenhuma aprovação em leitura.

**Contraditório e conclusão:** A programação em série mostra
intervalo/recorrência e o banco autoriza corretamente. Isso não fornece os dados
omitidos na alteração pontual.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
RENDERED_AND_INSPECTED;BEHAVIOR_EXERCISED_REVIEW_ONLY

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-002

Confirmações de estoque, ENT e configuração BAL omitem consequências por
domínio. **P2 — EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.1;B1.6;B1.7

**Superfícies:** SC-011; SC-015; SC-016; OVL-039

**Rotas:** /estoque;/historico/\[id\];/balancos

**Pessoa e intenção:** Família, destinatário ENT e administrador local

**Controle/jornada:** Confirmar movimentação familiar; Revisar operação
definitiva; Revisar decisão do balanço

**Estado:** READY_REVIEW

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda movimentação/revisão destas variantes.

**Atual exato ou ramo:** Quantidade: \[valor\]; Revisar operação definitiva;
Processamento ativado/pausado somente para \[paciente\], a partir de \[data\].

**Resultado observado:** Movimento manual não repete direção/unidade;
divergência ENT não identifica item e quantidade aceita no resumo; configuração
BAL não repete dia/tipo/pessoa/fuso. Barreiras existem, mas o conteúdo decisório
é incompleto.

**Consequência humana:** Confirmação pode ser feita com memória da edição,
especialmente após interrupção ou troca de aparelho.

**Reprodução:** Na fixture B1, abrir saída familiar e revisar sem salvar; no ENT
pendente abrir divergência; em BAL abrir configuração e revisão; comparar
resumos com campos anteriores.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b11-followup.json](evidence/b11-followup.json);
[evidence/b11-supplement.json](evidence/b11-supplement.json);
[evidence/b16-feedback.json](evidence/b16-feedback.json).

**Código conferido:**
[src/components/stock/stock-console.tsx:501](../../../src/components/stock/stock-console.tsx#L501)
;
[src/components/documents/supply-detail.tsx:429](../../../src/components/documents/supply-detail.tsx#L429)
;
[src/components/balances/balance-console.tsx:59](../../../src/components/balances/balance-console.tsx#L59)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Confirmar saída de \[N unidade\] de \[material\] do estoque
familiar. ENT: Receber \[N unidade\] de \[material\]; \[diferença\] permanece
divergente. BAL: Toda \[dia\], no plantão \[tipo\], a partir de \[data\], em \[fuso\];
responsável \[regra/pessoa\].

**Proposta visual:** Resumo compacto por item e escopo, com unidade e efeito;
evitar texto universal substituindo os dados.

**Comportamento recomendado:** Gerar resumo do comando congelado; permitir
voltar; recuperar mesma tentativa após resposta perdida.

**Alternativas e objeções:** A edição contém os valores, mas pode estar
encoberta. Duplicar todos os detalhes técnicos pioraria a leitura; mostrar só o
que muda a decisão.

**Decisão necessária:** Validar com família/profissional quais dados mínimos são
necessários por comando.

**Invariantes:** COM não atende REQ; ENT aceita atualiza atendimento/estoque;
BAL não calcula consumo automaticamente; nenhuma quantidade solicitada na REQ.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio por variante

**Risco de regressão:** Rótulo genérico voltar a ocultar diferenças entre
comandos.

**Aceite futuro:** Cada variante mostra objeto, direção, unidade,
pessoa/custódia e consequência; teste divergência parcial e movimento reverso;
reconsulta coincide com resumo.

**Contraditório e conclusão:** COM e vários editores já listam linhas antes de
revisar; não se pede outro modal em cada seleção.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
RENDERED_AND_INSPECTED;BEHAVIOR_EXERCISED_SELECTED_COMMANDS

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-003

Decisão de proposta administrativa exige ler JSON e identificadores. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** UX-005

**Subgrupos:** B1.1;B1.3;B1.6

**Superfícies:** SC-034

**Rotas:** /configuracoes?area=people

**Pessoa e intenção:** Administrador local diante de proposta global

**Controle/jornada:** Proposta; Aprovar/Rejeitar

**Estado:** PROPOSAL_PENDING

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Quando administração global propõe configuração local.

**Atual exato ou ramo:** JSON.stringify(change.proposed, null, 2)

**Resultado observado:** Presenter usa kind e JSON, sem descrição humana de
regra/pessoa ou valores atuais. Prova renderizada usa resposta GET simulada,
nenhuma proposta remota ou aprovação.

**Consequência humana:** Autoridade de revisão existe, mas sua compreensão
depende de conhecimento técnico.

**Reprodução:** Executar text-probe.mjs; injetar read model sintético de
proposta; abrir Pessoas e propostas; inspecionar, sem decidir.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b13-text.json](evidence/b13-text.json).

**Código conferido:**
[src/components/admin/policy-console.tsx:321](../../../src/components/admin/policy-console.tsx#L321)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** \[Autor\] propõe alterar \[regra/pessoa\]. Atual: [valor
humano]. Proposto: \[valor humano\]. Efeito neste paciente: \[efeito\].

**Proposta visual:** Comparação lado a lado ou empilhada no celular; detalhe
técnico recolhido para administração autorizada.

**Comportamento recomendado:** Resolver kind em presenter tipado; não tomar
label como autorização; preservar versão e aprovador distinto.

**Alternativas e objeções:** JSON em ferramenta técnica de importação pode ser
adequado; na decisão familiar/local não deve ser conteúdo primário.

**Decisão necessária:** C/B2 precisam definir presenter para cada tipo real e
dados de comparação permitidos.

**Invariantes:** Proposta não é aplicação; revisão local não pode alterar outro
paciente.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Presenter esconder alterações não reconhecidas.

**Aceite futuro:** Cobrir todos os kinds permitidos e fallback seguro
desconhecido; nenhum UUID/JSON necessário para decisão; payload de aprovação
preserva id/versão.

**Contraditório e conclusão:** Há botões distintos e autoridade no backend. Não
resolvem a falta de resumo. Renderização é simulada, estrutura de fonte é atual.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
RENDERED_AND_INSPECTED_INJECTED_GET;NO_DECISION_MUTATION

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-004

Aceite de convite carece de prévia do vínculo. **P2 — MISSING_CAPABILITY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.1;B1.7;B1.8

**Superfícies:** SC-004

**Rotas:** /convites/aceitar

**Pessoa e intenção:** Familiar/profissional convidado

**Controle/jornada:** Aceitar

**Estado:** INVITATION_REVIEW

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Primeiro acesso e novos vínculos.

**Atual exato ou ramo:** Aceitar

**Resultado observado:** UI não oferece prévia confiável com paciente, papel,
emissor e validade antes do aceite. Ramo público com token fictício não emitido
foi aberto; onboarding completo passou em E2E com convite local real.

**Consequência humana:** Pessoa pode aceitar sem conferir vínculo/conta correta,
ou não saber explicar qual acesso receberá.

**Reprodução:** Ler AcceptInvitation; comparar campos mostrados com os dados
necessários para decisão; seguir convite sintético do E2E sem publicar seu
token.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b11-followup.json](evidence/b11-followup.json);
[evidence/e2e-current.log](evidence/e2e-current.log).

**Código conferido:**
[src/components/admin/accept-invitation.tsx:14](../../../src/components/admin/accept-invitation.tsx#L14)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** \[Emissor\] convida você para acompanhar \[paciente\] como
\[função\]. Convite válido até \[data/fuso\]. Conta atual: \[identidade\]. Aceitar
vínculo / Entrar com outra conta.

**Proposta visual:** Cartão de prévia antes do CTA; estado expirado/revogado
explícito sem revelar dados a token inválido.

**Comportamento recomendado:** Prévia por token com escopo mínimo e rate limit;
aceite revalida destino/validade no servidor.

**Alternativas e objeções:** Não decodificar token no browser nem colocar todo
contexto no link; instrução enviada fora do app não garante consistência.

**Decisão necessária:** Definir informação mínima pública e quando exigir login
para mostrar dados.

**Invariantes:** Token secreto não vai para logs/evidências; identidade global
difere de papel local.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio, depende de API de prévia

**Risco de regressão:** Vazamento de dados no convite/preenchimento automático
indevido.

**Aceite futuro:** Convite válido, expirado, revogado, conta errada e já aceito
têm estado/CTA distintos; nenhum aceite pode alterar papel ou paciente por
parâmetro do cliente.

**Contraditório e conclusão:** E2E mostra que registro, confirmação e aceite
funcionam; achado é compreensão prévia, não falha do contrato de aceite.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** PARTIAL_RENDERED;E2E_HAPPY_PATH_PASSED

**E2E:** Selected existing tests passed; see scope, not a fix verification

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-TEXT-001

Códigos de filtros, ações e papéis escapam à linguagem humana. **P3 —
EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** UX-006

**Subgrupos:** B1.3;B1.8

**Superfícies:** SC-007; SC-039; SC-040; SC-034

**Rotas:** /historico;/historico/\[id\];/configuracoes

**Pessoa e intenção:** Todos os perfis leitores

**Controle/jornada:** Chips de situação, remover filtro, eventos e nomes de
papel

**Estado:** FILTERED_READY

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Uso frequente de histórico; valores raros amplificam
confusão.

**Atual exato ou ramo:** science_required; archive_pending; Remover filtro
\[search/from/to\]; kind/role sem tradução em alguns fallbacks.

**Resultado observado:** Os dois filtros especiais aparecem crus nos chips
apesar de terem opções humanas; aria-label de remoção usa chave. Catálogo separa
literal, expressão e consumidor.

**Consequência humana:** Exige interpretar vocabulário técnico para saber se
precisa agir ou só filtrar.

**Reprodução:** Abrir histórico com status science_required e archive_pending;
inspecionar chips e nome acessível de remoção; conferir renderizadores e
fallbacks.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b13-text.json](evidence/b13-text.json);
[evidence/TEXT_REWRITES.csv](evidence/TEXT_REWRITES.csv).

**Código conferido:**
[src/components/documents/document-history.tsx:321](../../../src/components/documents/document-history.tsx#L321)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Situação: Requisições para sua ciência; Situação:
Conclusões para revisar e arquivar. Remover filtro de busca/data inicial/data
final/situação/tipo de ficha.

**Proposta visual:** Manter chip removível, conteúdo curto com nome acessível
completo; detalhe técnico só onde ajuda suporte.

**Comportamento recomendado:** Um glossário por domínio e fallback desconhecido
explícito; não mapear estados diferentes para o mesmo termo.

**Alternativas e objeções:** Mostrar código em detalhe técnico pode ajudar
suporte. Não é necessário removê-lo do banco ou dos logs sanitizados.

**Decisão necessária:** Aprovar glossário em04; validar termos com
família/equipe.

**Invariantes:** Ciência não é aceite; status da aplicação/provedor/leitura
independentes.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno

**Risco de regressão:** Tradução que altera significado de estado.

**Aceite futuro:** Todas as chaves emitidas têm tradução e fallback testado;
chips e anúncio acessível coincidem; remover filtro mantém outros parâmetros.

**Contraditório e conclusão:** Muitos status já têm labels corretos; defeito é
cobertura e consumidor específicos, não ausência total de dicionário.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED;BEHAVIOR_FILTERS

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-NAV-001

Alguns nomes de destino não correspondem à tarefa aberta. **P3 —
EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** UX-006

**Subgrupos:** B1.3;B1.8

**Superfícies:** SC-036; SC-037; SC-038

**Rotas:** /mais;/notificacoes;/perfil;/unidades

**Pessoa e intenção:** Todos os perfis conforme capacidade

**Controle/jornada:** Preferências e notificações; Catálogo e unidades; Abrir
documento

**Estado:** READY_NAVIGATION

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Uso de menu pessoal/Mais e avisos.

**Atual exato ou ramo:** Preferências e notificações → /notificacoes; Catálogo e
unidades → /unidades; Abrir documento também para ocorrência/plantão.

**Resultado observado:** A central não é o formulário de preferências, e
unidades não é o catálogo do paciente. CTA de notificação generaliza alvos
distintos.

**Consequência humana:** Pessoa procura configuração no lugar errado ou abre
algo diferente do anunciado.

**Reprodução:** Seguir os três links com perfil autorizado; comparar título de
destino e intenção prometida.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/b11-supplement.json](evidence/b11-supplement.json);
[evidence/runtime-sweep.json](evidence/runtime-sweep.json);
[evidence/TEXT_REWRITES.csv](evidence/TEXT_REWRITES.csv).

**Código conferido:**
[src/components/layout/workspace-shell.tsx:52](../../../src/components/layout/workspace-shell.tsx#L52)
;
[src/components/navigation/more-actions.tsx:16](../../../src/components/navigation/more-actions.tsx#L16)
;
[src/components/notifications/notification-center.tsx:137](../../../src/components/notifications/notification-center.tsx#L137)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Minhas notificações; Preferências de avisos → Perfil;
Unidades e apresentações; Ver ocorrência / Ver plantão / Abrir ficha conforme
alvo.

**Proposta visual:** Agrupar conta pessoal, tarefas e administração por escopo;
manter descrições curtas em Mais.

**Comportamento recomendado:** Preservar links compatíveis e oferecer retorno ao
filtro/origem quando seguro.

**Alternativas e objeções:** Criar outra central duplicaria destinos já
existentes; texto e ligação resolvem a maior parte.

**Decisão necessária:** Confirmar nomes com usuários; mudanças de URL não são
necessárias para clareza.

**Invariantes:** Só mostrar ações autorizadas; texto não concede capacidade.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno

**Risco de regressão:** Quebrar links antigos ao reorganizar nomes.

**Aceite futuro:** Nome acessível e título de destino exprimem mesma tarefa nos
seis perfis; nenhum link individual perde alvo/contexto.

**Contraditório e conclusão:** Descrições atuais em Mais ajudam descoberta;
vários destinos já são consistentes.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_SELECTED_DESTINATIONS

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-TEXT-002

Títulos COM e BAL generalizam incorretamente a operação. **P3 —
EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.3;B1.6

**Superfícies:** SC-010; SC-012; SC-046

**Rotas:** /fichas/com;/fichas/bal;/api/documents/\[id\]/pdf

**Pessoa e intenção:** Família, supervisão e leitores de PDF

**Controle/jornada:** Título documental

**Estado:** READY_DOCUMENT

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Toda COM de doação; BAL fora da leitura semanal
simples.

**Atual exato ou ramo:** Compra de insumos; Balanço semanal

**Resultado observado:** COM de doação real mantém título compra no PDF e fluxo;
label HTML de BAL é semanal, enquanto o PDF já usa título geral de estoque. BAL
também serve reconto e legado.

**Consequência humana:** Pode confundir origem por doação com compra ou tomar
periodicidade do título como regra atual.

**Reprodução:** Abrir COM de doação da fixture e PDF atual; confrontar origem
com título; ler tipos/documentos e ramos BAL.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/current-COM.pdf](evidence/current-COM.pdf);
[evidence/pdf-inspection.json](evidence/pdf-inspection.json);
[evidence/b11-followup.json](evidence/b11-followup.json).

**Código conferido:**
[src/types/documents.ts:101](../../../src/types/documents.ts#L101);
[src/types/documents.ts:103](../../../src/types/documents.ts#L103). Linhas
exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Compra ou doação de insumos; Balanço de estoque. Manter
origem, regime/plantão e indicação de reconto em metadados próprios.

**Proposta visual:** Título estável e subtítulo específico, sem siglas como
único identificador.

**Comportamento recomendado:** Aplicar editorial de forma coerente entre HTML,
PDF e notificações; não reescrever fatos históricos.

**Alternativas e objeções:** Título semanal pode ser mantido apenas onde a
obrigação é efetivamente semanal.

**Decisão necessária:** Aprovação editorial do responsável; nenhum novo estado
de negócio necessário.

**Invariantes:** COM continua distinta de ENT; BAL não vira consumo.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio por saída documental

**Risco de regressão:** Alterar snapshot histórico em vez de renderização
autorizada.

**Aceite futuro:** Compra, doação, BAL inicial/reconto/legado têm título e
metadados coerentes; protocolo/hash do histórico preservados.

**Contraditório e conclusão:** A origem está nos dados, o regime aparece no
painel e o título PDF BAL já é geral. O problema é expectativa do título COM e
coerência dos labels HTML BAL.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_COM;STATIC_BAL_VARIANTS

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-TEXT-003

Página pública desconhecida cai em mensagem inglesa sem caminho de recuperação.
**P3 — EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.1;B1.3

**Superfícies:** SC-006

**Rotas:** /endereco-inexistente

**Pessoa e intenção:** Pessoa com link errado ou antigo

**Controle/jornada:** Página404 padrão

**Estado:** NOT_FOUND

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Links incorretos/antigos; baixa frequência.

**Atual exato ou ramo:** This page could not be found.

**Resultado observado:** Fallback Next padrão em inglês, sem main e sem CTA de
retorno do produto na prova pública390.

**Consequência humana:** Não sabe se perdeu acesso, sessão ou só endereço, nem
onde retomar.

**Reprodução:** Abrir URL pública inexistente sem sessão; inspecionar mensagem e
estrutura.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/b11-public-not-found-390.png](evidence/b11-public-not-found-390.png);
[evidence/runtime-sweep.json](evidence/runtime-sweep.json).

**Código conferido:** [src/app/layout.tsx:16](../../../src/app/layout.tsx#L16).
Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Página não encontrada. Confira o endereço ou volte ao
início. CTA Ir para o início; Entrar quando apropriado.

**Proposta visual:** Estado simples, heading e main reconhecíveis; sem expor
existência de recurso privado.

**Comportamento recomendado:** Distinguir URL pública desconhecida de403 e
documento não autorizado.

**Alternativas e objeções:** Redirecionar todo404 para login ocultaria erro de
endereço e prejudicaria retorno.

**Decisão necessária:** Aprovar texto e destino seguro para sessão
anônima/autenticada.

**Invariantes:** Não revelar paciente/documento pela diferença de resposta
pública.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno

**Risco de regressão:** Enumeração de recurso se customização consultar dados
privados.

**Aceite futuro:** 404 público em português com heading/main/CTA;401/403 mantêm
tratamento próprio e retorno seguro.

**Contraditório e conclusão:** Não é falha de tradução de Choose File nativo;
esse caso foi excluído por locale.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_PUBLIC

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-ERR-001

Anexo com resposta perdida deixa arquivo editável apesar de persistência
confirmada. **P2 — DEFECT_CONFIRMED**.

**Origem e escopo:** UX-003

**Subgrupos:** B1.4;B1.5;B1.6

**Superfícies:** SC-039; SC-040

**Rotas:** /historico/\[id\]

**Pessoa e intenção:** Pessoa anexando foto/ficha física

**Controle/jornada:** Upload de anexo; seletor de arquivo

**Estado:** UNKNOWN_RESULT

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Rede instável durante upload; plausível no móvel.

**Atual exato ou ramo:** Catch de fetch raw mantém seleção habilitada e mesma
identidade de tentativa.

**Resultado observado:** POST local retornou201 ao interceptor após commit e foi
abortado ao cliente; GET encontrou arquivo ready328 bytes. UI permite mudar
arquivo. A primeira tentativa400 por MIME não persistiu e foi separada.

**Consequência humana:** Pode trocar conteúdo de uma tentativa cujo resultado já
existe ou tentar novo envio sem saber qual arquivo foi registrado.

**Reprodução:** Executar error-followup.mjs com PNG fictício e MIME explícito;
interceptar resposta após201; reler anexos; observar input habilitado. Não
substituir arquivo.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b14-recovery.json](evidence/b14-recovery.json);
[evidence/b14-recovery-adminA-attachment-lost.png](evidence/b14-recovery-adminA-attachment-lost.png)
.

**Código conferido:**
[src/components/documents/attachments.tsx:88](../../../src/components/documents/attachments.tsx#L88)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Não foi possível confirmar o resultado do envio. Mantenha
este arquivo e consulte a tentativa antes de enviar outro. CTA Consultar envio.

**Proposta visual:** Resumo fixo de nome/tamanho/tentativa e estado desconhecido
persistente; seletor bloqueado até conciliação.

**Comportamento recomendado:** Congelar bytes/chave, consultar resultado e
permitir nova tentativa só após rejeição definitiva; tratar reservas abandonadas
com contrato de Storage.

**Alternativas e objeções:** COM já recupera mesma intenção corretamente;
reutilizar padrão, sem concluir que o arquivo foi sobrescrito nesta prova.

**Decisão necessária:** B2/Storage definir consulta por tentativa e expiração de
reserva.

**Invariantes:** Não sobrescrever anexo imutável; conservar trilha e limites por
documento; sem expor signedURL.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Apagar reserva válida ou permitir nova intenção antes da
conciliação.

**Aceite futuro:** Perda antes/depois do commit,400 e timeout distintos;
GETready reconcilia sem duplicar; input não muda durante desconhecido; arquivo
confirmado fica reconsultável.

**Contraditório e conclusão:** Anexo400 inicial não prova resposta perdida. A
prova válida é201+read-back; nenhuma sobrescrita foi executada.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_REAL_LOCAL201_LOST_REPLY

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-ERR-002

Adaptador de erro mistura recuperação de leitura com resultado incerto de
escrita. **P2 — RISK_SUPPORTED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.4;B1.5

**Superfícies:** SC-001; SC-007; SC-039; SC-037

**Rotas:** Consultas e comandos que usam api()

**Pessoa e intenção:** Todos os perfis

**Controle/jornada:** Erro de rede/JSON/timeout e CTA

**Estado:** ERROR_RECOVERABLE;UNKNOWN_RESULT

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Falha de transporte/JSON; depende do consumidor.

**Atual exato ou ramo:** O serviço não retornou uma resposta válida. Tente
novamente. / Recupere a mesma tentativa para verificar o resultado.

**Resultado observado:** Leitura abortada pede recuperar tentativa que não
existe; JSON inválido em escrita pode aconselhar repetição sem certeza. ApiError
preserva status/code mas não estrutura de recommendedAction nem certeza por
comando.

**Consequência humana:** Pode procurar uma tentativa inexistente ou repetir
comando desconhecido. Não foi demonstrada duplicação de dado.

**Reprodução:** Injetar GET inválido,abort e500 em error-probe/followup;
comparar texto com natureza da consulta; ler caminho JSON e ApiError.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b14-errors.json](evidence/b14-errors.json);
[evidence/b14-recovery.json](evidence/b14-recovery.json);
[evidence/ERROR_INJECTION_MATRIX.csv](evidence/ERROR_INJECTION_MATRIX.csv).

**Código conferido:**
[src/lib/client/api.ts:56](../../../src/lib/client/api.ts#L56);
[src/lib/client/api.ts:17](../../../src/lib/client/api.ts#L17). Linhas exatas
no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Consulta: Não foi possível atualizar estas informações.
Consultar novamente. Escrita incerta: Não foi possível confirmar o resultado.
Recuperar a mesma tentativa.

**Proposta visual:** Mensagem no contexto da tarefa; referência sanitizada
copiável; CTA só quando implementado pelo consumidor.

**Comportamento recomendado:** Tipar operação/certidão e preservar orientação
segura da API; nunca inferir rollback de erro de transporte.

**Alternativas e objeções:** Um texto universal é simples mas semanticamente
errado. Não obrigar idempotência fictícia em GET.

**Decisão necessária:** B2/C definir envelope de erro e comandos com recuperação
suportada.

**Invariantes:** Correlação sem payload privado; rejeição definitiva permite
editar, desconhecido congela intenção.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio transversal

**Risco de regressão:** Consumidor genérico liberar payload de operação ainda em
curso.

**Aceite futuro:** 401/403/404/409/422/429/500,invalidJSON,timeout eabort têm
CTA apropriado ao efeito; falha de leitura não recomenda recuperar mutação.

**Contraditório e conclusão:** Muitos comandos já congelam chave e API retorna
códigos seguros. O problema não é ausência total de tratamento.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
BEHAVIOR_EXERCISED_READ_FAILURES;WRITE_RISK_STATIC

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-ERR-003

Conflito na permissão crítica fecha o diálogo e afasta o erro da intenção. **P2
— DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.4;B1.6;B1.8

**Superfícies:** SC-032

**Rotas:** /configuracoes?area=permissions

**Pessoa e intenção:** Administrador local

**Controle/jornada:** Revisão de permissão crítica → Confirmar

**Estado:** VERSION_CONFLICT

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Edição concorrente ou versão antiga.

**Atual exato ou ramo:** A configuração mudou em outra sessão. Dados
recarregados; revise e reaplique sua alteração.

**Resultado observado:** POST409 controlado faz o diálogo fechar. O texto geral
existe, mas não conserva a alteração pretendida dentro da decisão nem
reposiciona foco.

**Consequência humana:** Após concorrência, pode perder a intenção e reaplicar
sem comparar política recarregada.

**Reprodução:** Abrir revisão de capacidade crítica; interceptar POST com409;
confirmar; observar fechamento e erro fora do diálogo. Nenhuma política
persistida pela injeção.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b14-recovery.json](evidence/b14-recovery.json).

**Código conferido:**
[src/components/admin/permission-matrix.tsx:35](../../../src/components/admin/permission-matrix.tsx#L35)
;
[src/components/admin/policy-console.tsx:158](../../../src/components/admin/policy-console.tsx#L158)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** A política mudou. Sua alteração ainda não foi aplicada.
Confira o valor atual e a alteração que você pretendia fazer. CTA Rever
alteração.

**Proposta visual:** Erro persistente junto ao diff e foco no resumo; mostrar
versão atual e intenção anterior.

**Comportamento recomendado:** Fechar só após sucesso confirmado; em409
recarregar e exigir nova decisão da versão vigente.

**Alternativas e objeções:** Fechar e mostrar banner evita dialogo antigo, mas
precisa de transição/foco/intenção explícitos; não reenviar automaticamente.

**Decisão necessária:** Definir experiência de reconciliação de conflito sem
enfraquecer versão.

**Invariantes:** Permissão crítica continua dependente de versão, capacidade e
escopo; sem replay automático.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio

**Risco de regressão:** Reaplicar intenção desatualizada como se fosse política
atual.

**Aceite futuro:** 409 não aparenta sucesso; nova versão visível e nenhuma
reaplicação automática; Tab começa na reconciliação, não no topo da página.

**Contraditório e conclusão:** Backend rejeita conflito corretamente; este é
defeito de recuperação da interface, não concessão indevida.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_INJECTED_POST409

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-STATE-001

Consultas sem estado próprio afirmam vazio/configuração ausente antes do
resultado. **P2 — DEFECT_CONFIRMED**.

**Origem e escopo:** UX-004

**Subgrupos:** B1.1;B1.4;B1.5

**Superfícies:** SC-019; SC-036; SC-033; SC-037

**Rotas:** /consumo;/perfil;/configuracoes;/notificacoes

**Pessoa e intenção:** Operadores e administradores

**Controle/jornada:** Lista de consumo, Flow e sino; perfil

**Estado:** INITIAL;LOADING;ERROR_RECOVERABLE

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Primeira carga/rede lenta e falhas de consulta.

**Atual exato ou ramo:** Nenhum relato; você está em dia; configuração ausente;
Carregando perfil junto de erro.

**Resultado observado:** GETs retidos exibem conclusões negativas; sino com500
mantém afirmação em dia; perfil500 mantém loading. Matriz distingue ramos com
loading correto.

**Consequência humana:** Pode concluir que não há pendência ou configuração
quando a consulta nem terminou ou falhou.

**Reprodução:** Executar states-probe e followup; reter GETs consumo/Flow/sino;
capturar antes da resolução; liberar vazio200 e erro500 separadamente.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b15-states.json](evidence/b15-states.json);
[evidence/b15-followup.json](evidence/b15-followup.json);
[evidence/b14-recovery.json](evidence/b14-recovery.json).

**Código conferido:**
[src/components/stock/consumption-console.tsx:45](../../../src/components/stock/consumption-console.tsx#L45)
;
[src/components/notifications/notification-bell.tsx:31](../../../src/components/notifications/notification-bell.tsx#L31)
;
[src/components/profile-console.tsx:144](../../../src/components/profile-console.tsx#L144)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Consultando relatos… / Não foi possível consultar
relatos. Consultar novamente / Nenhum relato neste filtro, somente após200.
Perfil: Não foi possível carregar seu perfil.

**Proposta visual:** Loading,erro,vazio e pronto mutuamente coerentes por seção;
sinal de consulta preserva espaço sem afirmar ausência.

**Comportamento recomendado:** Estado explícito inicial/erro/vazio; não usar
array vazio como sucesso; abortar resultado do contexto anterior.

**Alternativas e objeções:** Não cobrir toda tela com spinner quando só seção
falhou; DocumentHistory já oferece exemplo melhor.

**Decisão necessária:** Adotar modelo de estados por consulta, com responsável
por seção e sem novo domínio de banco.

**Invariantes:** Vazio confirmado exige resposta válida; falha não vira ausência
de dados.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio, vários consumidores

**Risco de regressão:** Esconder conteúdo útil durante refresh ou gerar anúncios
repetidos.

**Aceite futuro:** Delay,200vazio,200comdados,500 e retry em cada consumidor
citado; nenhum loading infinito com erro nem mensagem em dia antes de200.

**Contraditório e conclusão:** DocumentHistory/DeliveryInbox no primeiro load
têm tratamento melhor; não se generaliza defeito a todas as telas.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_DELAY_EMPTY_ERROR

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-STATE-002

Filtro novo pode coexistir com linhas antigas sem indicação de atualização. **P2
— DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.5;B1.8

**Superfícies:** SC-013; SC-016

**Rotas:** /entregas;/estoque

**Pessoa e intenção:** Profissional recebedor/família

**Controle/jornada:** Situação das entregas; filtros de estoque

**Estado:** REFRESHING;STALE_CONTEXT

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda mudança de filtro com latência perceptível.

**Atual exato ou ramo:** Filtro Concluídas com linha pendente anterior durante
GET em curso.

**Resultado observado:** DeliveryInbox não reativa loading no filtro; a linha
antiga permanece sob o filtro novo. StockConsole tem transições de dependência
sem a mesma marcação do botão Atualizar.

**Consequência humana:** Pode tomar o registro antigo como resultado da seleção
atual e agir no objeto errado.

**Reprodução:** Carregar ENT pendente; reter nova GET; selecionar Concluídas;
observar linha anterior; liberar200vazio e verificar mudança.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b15-followup.json](evidence/b15-followup.json).

**Código conferido:**
[src/components/documents/delivery-inbox.tsx:27](../../../src/components/documents/delivery-inbox.tsx#L27)
;
[src/components/stock/stock-console.tsx:216](../../../src/components/stock/stock-console.tsx#L216)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Atualizando entregas concluídas… Os resultados anteriores
ainda estão visíveis. Ou retirar linhas acionáveis até a consulta atual
terminar.

**Proposta visual:** Indicador junto ao filtro e região aria-busy; identificar
resultados anteriores se conservados.

**Comportamento recomendado:** Associar dados à chave do filtro e cancelar
resposta antiga; desativar comando dependente de visão incompatível.

**Alternativas e objeções:** Conservar lista reduz cintilação; é aceitável se a
origem temporal e o bloqueio contextual forem claros.

**Decisão necessária:** Escolher preservar/esvaziar por domínio, testar com
operadores.

**Invariantes:** Não alterar dados por filtro; autorização continua no servidor.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Perder posição de leitura ou aceitar resposta atrasada
de outro paciente.

**Aceite futuro:** Alternar rapidamente filtros com respostas invertidas,erro e
vazio; resultado corresponde à chave atual e foco permanece no filtro.

**Contraditório e conclusão:** A consulta finalmente retorna corretamente;
defeito é a transição, não filtro permanentemente errado.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_CONTROLLED_DELAY

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-STATE-003

Falha secundária no estoque descarta saldo válido e apresenta ausência. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.4;B1.5

**Superfícies:** SC-016

**Rotas:** /estoque?custody=FAMILY

**Pessoa e intenção:** Família e gestão de estoque

**Controle/jornada:** Resumo de saldos e movimentos

**Estado:** PARTIAL;ERROR_RECOVERABLE

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Falha parcial de endpoints; baixa a moderada em rede
degradada.

**Atual exato ou ramo:** Promise.all de consultas seguido de atribuição
conjunta; vazio de produtos/movimentos após falha.

**Resultado observado:** GET de saldos200 continha dois produtos; GET de
movimentos500 levou a zero nomes e mensagens de lista vazia com erro, perdendo
resultado válido.

**Consequência humana:** Pode confundir indisponibilidade do histórico com
ausência de estoque.

**Reprodução:** states-probe injeta saldos200 reais e movimentos500; abrir
estoque; conferir que os dois produtos não aparecem.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b15-states.json](evidence/b15-states.json).

**Código conferido:**
[src/components/stock/stock-console.tsx:87](../../../src/components/stock/stock-console.tsx#L87)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Saldos consultados às \[hora\]. Não foi possível carregar
os movimentos. CTA Consultar movimentos novamente.

**Proposta visual:** Seções independentes com erro local; não repetir nenhum
movimento se a consulta falhou.

**Comportamento recomendado:** Preservar resultado válido por seção e sua
chave/tempo; explicar quando saldo está desatualizado.

**Alternativas e objeções:** Se atomicidade da leitura for requisito, exibir
indisponibilidade do conjunto, nunca vazio confirmado. Não fingir snapshot
consistente de respostas separadas.

**Decisão necessária:** B2/C definir consistência temporal necessária entre
saldo e histórico.

**Invariantes:** Saldo oficial vem do ledger; leitura parcial não autoriza
ajuste direto.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Misturar saldos e movimentos de versões/pacientes
diferentes.

**Aceite futuro:** Cada endpoint falha isoladamente e ambos falham; saldos
válidos ou indisponibilidade explícita permanecem; nenhum vazio falso.

**Contraditório e conclusão:** Banner de erro já existe; não evita que vazio
paralelo comunique conclusão errada.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_PARTIAL_200_500

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-STATE-004

Prazo fixo de acompanhamento regride resultado concluído e mistura preparo de
PDF. **P2 — DEFECT_CONFIRMED**.

**Origem e escopo:** UX-012

**Subgrupos:** B1.3;B1.5;B1.6

**Superfícies:** SC-009; SC-010; SC-012; SC-039

**Rotas:** /fichas/req;/fichas/com;/fichas/bal;/historico/\[id\]

**Pessoa e intenção:** Emissor/consulta documental

**Controle/jornada:** DocumentActions

**Estado:** PERSISTED;DELIVERY_PENDING;READY

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda montagem do componente, sobretudo ao permanecer
aberto.

**Atual exato ou ramo:** Preparando PDF; acompanhamento inicial dos avisos por
até 10 segundos. / Os avisos continuam sendo processados.

**Resultado observado:** Relógio virtual11s após notificações200data\[\] mudou
mensagem concluída para processamento. Consumidor fixa10s e não recebe
shareWaitSeconds; mesmaAbortController cobre PDF e avisos.

**Consequência humana:** Pode supor que falta registrar/enviar algo já
finalizado, ou que preparo de PDF é entrega externa.

**Reprodução:** states-probe injeta notificações200vazias; registrar texto
final; avançar relógio browser11s; comparar. Valor de política não foi variado
nesta execução.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b15-states.json](evidence/b15-states.json).

**Código conferido:**
[src/components/documents/document-actions.tsx:33](../../../src/components/documents/document-actions.tsx#L33)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Documento salvo. O acompanhamento inicial terminou.
Consulte os estados individuais dos avisos. Preparando PDF… deve ser estado
separado.

**Proposta visual:** Persistência,arquivo e avisos em linhas independentes; CTA
reconsulta visível e resultado conhecido preservado.

**Comportamento recomendado:** Timer só encerra espera, não regride sucesso;
consumir política válida ou remover opção inoperante após decisão; cancelamentos
separados.

**Alternativas e objeções:** Não prolongar timeout como solução; cronômetro não
mede entrega do provedor.

**Decisão necessária:** Definir alcance de shareWaitSeconds e responsabilidade
do acompanhamento inicial.

**Invariantes:** Persistido,disponível,enviado,entregue,lido e ciência são
independentes.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio

**Risco de regressão:** Bloquear compartilhamento aguardando canal externo ou
prometer entrega.

**Aceite futuro:** Completou antes do prazo,pendente além do prazo,PDF
lento,política0/5/10 e desmontagem: nenhum resultado terminal regride nem PDF é
cancelado por outro estado.

**Contraditório e conclusão:** Regressão foi reproduzida com relógio virtual,
não latência física; política ignorada é prova estática separada.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_VIRTUAL_CLOCK;POLICY_STATIC

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-STATE-005

Leitura sem rede mantém aparência atual sem indicação visível de desatualização.
**P2 — RISK_SUPPORTED**.

**Origem e escopo:** DB-007

**Subgrupos:** B1.5;B1.8

**Superfícies:** SC-001

**Rotas:** Layout protegido e painel

**Pessoa e intenção:** Profissional/família sob interrupção de rede

**Controle/jornada:** Indicador de conexão/contexto

**Estado:** OFFLINE;STALE_CONTEXT

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Perda de rede móvel ou retorno após suspensão.

**Atual exato ou ramo:** Conteúdo permanece; indicador sr-only ainda conectado
no instante medido.

**Resultado observado:** Emulação offline: navigator.onLine=false e falha de
sync, sem aviso visível no painel já carregado. Não demonstrou comando
autorizado indevidamente.

**Consequência humana:** Pode interpretar pendências e capacidades antigas como
atuais ao retomar plantão.

**Reprodução:** Carregar painel profissional; colocar contexto offline; esperar
falha de sync; comparar conteúdo/status; não enviar comando offline.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b15-followup.json](evidence/b15-followup.json).

**Código conferido:**
[src/components/layout/workspace-shell.tsx:70](../../../src/components/layout/workspace-shell.tsx#L70)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Sem conexão. Estas informações podem estar
desatualizadas. Última consulta: \[hora\]. CTA Consultar novamente quando
reconectar.

**Proposta visual:** Aviso discreto persistente próximo ao contexto, acessível e
visível; conservar leitura com data.

**Comportamento recomendado:** Revalidar contexto ao retorno e antes de comando;
separar offline real,erro de serviço e sessão revogada.

**Alternativas e objeções:** Bloquear toda leitura histórica prejudicaria
cuidado; não derivar segurança de navigator.onLine.

**Decisão necessária:** B2/B3 definir frescor e recuperação de sessão; modo
offline de escrita não está proposto.

**Invariantes:** Autoridade sempre no banco/API; cache não concede capacidade.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Falso positivo de offline ou banner excessivo; confundir
melhoria com segurança resolvida.

**Aceite futuro:** Offline,reconexão,sessão revogada e troca de paciente mostram
frescor correto; comandos revalidam e não são enfileirados silenciosamente.

**Contraditório e conclusão:** Servidor revalida acesso e existe infraestrutura
de sync. B1 só suporta risco de entendimento no instante observado.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
BEHAVIOR_EXERCISED_OFFLINE_EMULATION;SECURITY_BYPASS_NOT_DEMONSTRATED

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-001

Estoque não observado e zero convergem silenciosamente na REQ. **P2 —
RISK_SUPPORTED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.7;B1.8

**Superfícies:** SC-009

**Rotas:** /fichas/req

**Pessoa e intenção:** Profissional emitente

**Controle/jornada:** Estoque atual catálogo/extra

**Estado:** EDITING

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda seleção de material e limpeza de quantidade
extra.

**Atual exato ou ramo:** Material selecionado inicia0; apagar extra usa
Number(event.target.value).

**Resultado observado:** Escolha de material real produziu zero sem contagem
digitada; extra7 apagado virou0. BAL começa vazio, contraprova de alternativa
existente.

**Consequência humana:** Pode registrar ausência física sem tê-la observado; não
foi provado estoque incorreto em produção.

**Reprodução:** forms-probe: selecionar item,inspecionar default;
extra,preencher7,apagar; comparar catálogo e BAL.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b17-forms.json](evidence/b17-forms.json).

**Código conferido:**
[src/components/requisitions/requisition-steps.tsx:344](../../../src/components/requisitions/requisition-steps.tsx#L344)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Estoque observado \[campo inicialmente vazio\]. Se não foi
possível contar, oferecer opção explícita apenas se o contrato aceitar; zero
continua significando nenhum disponível.

**Proposta visual:** Unidade junto ao campo e ajuda curta, sem expor saldo
esperado como resposta física.

**Comportamento recomendado:** Separar vazio de0 no estado de edição; bloquear
emissão ou modelar não observado conforme decisão de contrato, nunca converter
implicitamente.

**Alternativas e objeções:** Preencher último saldo reduz digitação mas pode
fabricar contagem; exigir mais texto também não resolve.

**Decisão necessária:** Família/equipe e B2 definem se observação é obrigatória
e como representar desconhecido no contrato.

**Invariantes:** REQ não pede quantidade solicitada; contagem física não é saldo
do ledger.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio com decisão de domínio

**Risco de regressão:** Introduzir null incompatível ou usar saldo previsto como
contagem.

**Aceite futuro:** Selecionar,apagar0/7,voltar etapa,rascunho e submit não
transformam ausência em contagem; zero explícito é aceito; nenhuma mudança de
contrato só no browser.

**Contraditório e conclusão:** Zero pode ser o valor comum legítimo, mas não
justifica converter campo apagado sem indicação. Achado é risco apoiado em
comportamento.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_EDIT_ONLY

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-002

Validações não acompanham limites e foco dos campos em todos os caminhos. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.3;B1.4;B1.7

**Superfícies:** SC-009; SC-035

**Rotas:** /fichas/req;/unidades

**Pessoa e intenção:** Emitente e cadastro de apresentação

**Controle/jornada:** Observação, extra e campos condicionais de apresentação

**Estado:** VALIDATION_ERROR

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Observação longa,extras incompletos e apresentação
parcial.

**Atual exato ou ramo:** Too big: expected string to have &lt;=1000 characters

**Resultado observado:** Observação1001 chega à revisão e POST400 real em
inglês; extra sem nome gera erro geral,0aria-invalid e foco em Avançar. Campos
de apresentação tornam-se obrigatórios sem ajuda antecipada consistente.

**Consequência humana:** Descobre limite tarde, procura o campo errado e pode
perder trabalho sob interrupção.

**Reprodução:** forms-followup gera1001 caracteres por UI sem bypass; concluir e
registrar400; forms-probe avança extra vazio e mede foco/aria-invalid.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b17-followup.json](evidence/b17-followup.json);
[evidence/b17-forms.json](evidence/b17-forms.json).

**Código conferido:**
[src/components/requisitions/requisition-steps.tsx:446](../../../src/components/requisitions/requisition-steps.tsx#L446)
;
[src/lib/validation/requisition.ts:7](../../../src/lib/validation/requisition.ts#L7)
;
[src/components/catalog/unit-console.tsx:204](../../../src/components/catalog/unit-console.tsx#L204)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Use até 1.000 caracteres nesta observação. CTA Corrigir
observação1; Informe o nome do item extra. Ao preencher código, informe também
nome e conversão.

**Proposta visual:** Erro ligado por aria-describedby/invalid, contador no
limite, resumo com links para etapa/campo; manter conteúdo.

**Comportamento recomendado:** Mesmos limites cliente/API; submit leva à etapa e
primeiro campo inválido; erro de contrato em português seguro.

**Alternativas e objeções:** Só maxlength impede digitação,mas não substitui
validação de dados recuperados/colados. Não truncar silenciosamente.

**Decisão necessária:** Aprovar textos e limites existentes; regras permanecem
no servidor.

**Invariantes:** No máximo1000por observação e50 entradas conforme esquema
atual; não mascarar erro de autorização.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio

**Risco de regressão:** Cliente divergir do schema ou esconder erro de resposta
desconhecida.

**Aceite futuro:** 1000/1001,extra sem nome,múltiplas etapas e apresentação
incompleta: erro compreensível,anunciado,no campo correto,sem emissão inválida e
sem apagar valor.

**Contraditório e conclusão:** Outros campos já têm maxlength e contratos
rejeitam400 corretamente; o problema é uniformidade e recuperação humana.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_REAL400_AND_FIELD_ERROR

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-003

Ajuda e teto de senha nova variam entre cadastro e perfil. **P3 —
EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.7

**Superfícies:** SC-003; SC-004; SC-036

**Rotas:** /convites/aceitar;/recuperar-senha;/perfil

**Pessoa e intenção:** Pessoa criando/alterando senha

**Controle/jornada:** Senha nova

**Estado:** EDITING_PASSWORD

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Cadastro/recuperação/alteração de senha.

**Atual exato ou ramo:** Perfil maxLength256; cadastro maxLength72; validação
limita72 bytes.

**Resultado observado:** Comprimento em caracteres não equivale a bytes UTF-8; o
perfil permite digitar muito além do contrato. Nenhuma senha real foi alterada
pela exploração; E2E usa conta local descartável.

**Consequência humana:** Erro tardio e dificuldade de entender por que uma senha
aparentemente curta foi recusada.

**Reprodução:** Comparar fonte dos três formulários com validation/password;
considerar caracteres multibyte; não registrar senhas em evidências.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/source-semantic-review.json](evidence/source-semantic-review.json);
[evidence/e2e-current.log](evidence/e2e-current.log).

**Código conferido:**
[src/components/profile-console.tsx:341](../../../src/components/profile-console.tsx#L341)
; [src/lib/validation/password.ts:6](../../../src/lib/validation/password.ts#L6)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Use pelo menos12 caracteres. O limite é72 bytes; o
sistema informa quando for excedido. Ajustar ajuda sem mostrar senha e sem impor
regra de cadastro ao login existente.

**Proposta visual:** Ajuda antes do envio e erro no campo; gerenciador de
senha/autocomplete adequados.

**Comportamento recomendado:** Validação coerente para senha nova; não truncar
nem registrar segredo.

**Alternativas e objeções:** Teto72 caracteres sozinho ainda falha para
multibyte; não reduzir regras do backend.

**Decisão necessária:** Definir expressão humana do limite e testar com
gerenciadores reais.

**Invariantes:** Login aceita credenciais existentes; nova senha continua
validada no Auth/servidor.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno

**Risco de regressão:** Impedir login de senha preexistente ou truncar senha.

**Aceite futuro:** 12 caracteres,72 bytes e UTF-8 acima do teto tratados
coerentemente; password manager funciona; nenhum segredo em DOM exportado/log.

**Contraditório e conclusão:** Backend já protege limite e onboarding passou;
não é vulnerabilidade comprovada de autenticação.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** REVIEWED_STATIC;E2E_ORDINARY_PASSWORD_FLOW

**E2E:** Selected existing tests passed; see scope, not a fix verification

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-004

Seleção COM/ENT não aproveita busca já disponível para catálogos maiores. **P3 —
PRODUCT_OPPORTUNITY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.7;B1.8

**Superfícies:** SC-010; SC-011

**Rotas:** /fichas/com;/fichas/ent

**Pessoa e intenção:** Família/expedidor de materiais

**Controle/jornada:** Lista de materiais por categoria

**Estado:** EDITING_DENSE_CATALOG

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Mais relevante quando catálogo tem dezenas de itens.

**Atual exato ou ramo:** COM lista todos os1/5/20/100 materiais sem busca
textual; REQ filtra por nome/alias.

**Resultado observado:** Injeções GET com1/5/20/100: REQ encontra alias e reduz
a1; COM conserva todas as linhas. Não é prova de lentidão de produção ou erro de
estoque dos IDs simulados.

**Consequência humana:** Varredura manual cresce com catálogo e aumenta chance
de pular material semelhante.

**Reprodução:** forms-followup injeta catálogo sintético de leitura; comparar
REQ e COM nos quatro tamanhos sem emitir.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b17-followup.json](evidence/b17-followup.json).

**Código conferido:**
[src/components/documents/supply-wizard-step.tsx:9](../../../src/components/documents/supply-wizard-step.tsx#L9)
;
[src/components/requisitions/requisition-steps.tsx:75](../../../src/components/requisitions/requisition-steps.tsx#L75)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Buscar por nome ou nome alternativo. Exibir Nselecionados
e manter seleção entre filtros,unidade e categoria.

**Proposta visual:** Busca compacta acima das categorias; resumo dos
selecionados para revisão.

**Comportamento recomendado:** Reutilizar catálogo/aliases autorizados,sem
exigir nova dependência ou pesquisa remota a cada tecla.

**Alternativas e objeções:** Para1 item,controle simples é suficiente.
Virtualização só após evidência de custo real.

**Decisão necessária:** Validar frequência/tamanho com primeira família e medir
erros/tempo humano.

**Invariantes:** Não ocultar selecionados nem misturar catálogo canônico com
identidades globais.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Filtro ocultar seleção ou tornar nomes similares
indistinguíveis.

**Aceite futuro:** 1/5/20/100 itens,nome longo,alias,semresultado e mudar
categoria preservam escolhas; teclado/AT acessam seleção e total.

**Contraditório e conclusão:** A ausência é oportunidade proporcional; não há
prova de que100 itens causem falha de performance.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_INJECTED_READ_CATALOGS

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-005

Apresentações têm cadastro sem visão equivalente de consulta/gestão no
consumidor. **P2 — MISSING_CAPABILITY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.1;B1.7

**Superfícies:** SC-035

**Rotas:** /unidades

**Pessoa e intenção:** Administrador do catálogo

**Controle/jornada:** Configurar apresentação

**Estado:** READY;EDITING

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Preparação/manutenção do catálogo e apresentações.

**Atual exato ou ramo:** Lista de unidades e formulário de apresentação por
código/produto/conversão.

**Resultado observado:** UI examinada não lista apresentações existentes por
material nem oferece consulta/revisão equivalente à tabela de unidades. API
possui upsert; não se conclui inexistência de dados no banco.

**Consequência humana:** Pode recadastrar código sem saber conversão vigente ou
não conseguir conferir o que scanner/manual usará.

**Reprodução:** Abrir Unidades e apresentações; comparar lista de unidades com
editor de apresentações; ler consumidores e API dirigida.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/runtime-sweep.json](evidence/runtime-sweep.json)
; [evidence/b11-supplement.json](evidence/b11-supplement.json).

**Código conferido:**
[src/components/catalog/unit-console.tsx:199](../../../src/components/catalog/unit-console.tsx#L199)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Por material: apresentação,código,quantidade base e
situação. Ação Revisar conversão; manter entrada manual e scanner opcional.

**Proposta visual:** Lista filtrável por material com detalhe de
equivalência1embalagem=Nunidades; editor contextual.

**Comportamento recomendado:** Consultar antes de upsert; explicar efeito
somente prospectivo e proteger histórico existente.

**Alternativas e objeções:** Outra tela global duplicaria catálogo. Preferir
detalhe do material ou seção existente se atender a tarefa.

**Decisão necessária:** B2/C definir edição/versão de conversão com histórico e
autoridade local.

**Invariantes:** Unidade de item com histórico não muda silenciosamente;
conversão não reescreve snapshot.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Alteração retroativa de unidade/conversão.

**Aceite futuro:** Cadastrar,consultar,editar/rejeitar código duplicado e ler
conversão em entrada manual/scan; histórico antigo mantém valor.

**Contraditório e conclusão:** Há cadastro funcional e fonte autorizada; lacuna
é capacidade de consulta/gestão demonstrável no consumidor.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** PARTIAL_RENDERED_EDITOR;MANAGEMENT_GAP_STATIC

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-006

Editor de vínculo permite trocar pessoa sem explicar destino do vínculo
anterior. **P2 — RISK_SUPPORTED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.7;B1.8

**Superfícies:** SC-022

**Rotas:** /admin?section=memberships

**Pessoa e intenção:** Administrador local

**Controle/jornada:** Editar vínculo; seleção de pessoa

**Estado:** EDITING_MEMBERSHIP

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Edição ocasional de acesso com seleção trocada.

**Atual exato ou ramo:** Editor permite userId selecionável; payload usa userId
corrente sem identificar substituição de origem.

**Resultado observado:** Fonte de edição e comando não comunicam se trocar a
seleção cria/atualiza outro vínculo enquanto o anterior permanece. Não foi feita
alteração de permissão para provar hipótese.

**Consequência humana:** Pode acreditar que substituiu um acesso quando apenas
alterou outro, deixando vínculo anterior ativo.

**Reprodução:** Ler editor e payload em AdminConsole/membership; abrir editor
sem salvar; comparar rótulo Editar com identidade selecionável.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/source-index.json](evidence/source-index.json);
[evidence/b11-supplement.json](evidence/b11-supplement.json).

**Código conferido:**
[src/components/admin/membership-management.tsx:21](../../../src/components/admin/membership-management.tsx#L21)
;
[src/components/admin/membership-management.tsx:20](../../../src/components/admin/membership-management.tsx#L20)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Ao editar função, fixar pessoa e paciente. Para outra
pessoa, ação Adicionar vínculo; se houver substituição, resumo explícito de
ambos os destinos.

**Proposta visual:** Identidade fixa e função/status editáveis; CTA específica
para novo vínculo.

**Comportamento recomendado:** Não revogar automaticamente o anterior; exigir
ação explícita autorizada com trilha.

**Alternativas e objeções:** Remover o seletor pode bastar,sem nova RPC de
substituição se a operação não existe.

**Decisão necessária:** C/B2 confirmar semântica pretendida e exposição da
operação existente.

**Invariantes:** Identidade global separada de vínculo por paciente; preservação
de histórico e acesso de outro paciente.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Revogar acesso legítimo por inferência ou deixar antigo
sem orientação.

**Aceite futuro:** Editar função da mesma pessoa não altera outra; trocar alvo
requer fluxo explícito; revogação exige revisão própria e revalidação no
servidor.

**Contraditório e conclusão:** Comando no backend é por alvo autorizado, não
prova escalada. Achado é risco de intenção ambígua,sem mutação reproduzida.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
REVIEWED_STATIC;EDITOR_PARTIAL;MUTATION_NOT_EXECUTED

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FORM-007

Apagar nome curto não comunica intenção de remoção. **P3 — RISK_SUPPORTED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.7

**Superfícies:** SC-031

**Rotas:** /configuracoes?area=rules

**Pessoa e intenção:** Administrador local

**Controle/jornada:** Nome curto do paciente

**Estado:** EDITING_SETTINGS

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Mudança ocasional de identificação operacional.

**Atual exato ou ramo:** saveSettings só inclui patientShortName quando trim não
é vazio.

**Resultado observado:** Apagar campo omite propriedade do payload. Interface
não distingue manter de remover; resultado de backend para remoção não foi
exercitado.

**Consequência humana:** Pode salvar acreditando ter retirado abreviação e
continuar vendo nome anterior.

**Reprodução:** Ler condição patientShortName e formulário; apagar sem salvar e
conferir intenção representável no comando.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/source-index.json](evidence/source-index.json).

**Código conferido:**
[src/components/admin/policy-console.tsx:212](../../../src/components/admin/policy-console.tsx#L212)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Nome curto opcional. Remover nome curto e usar nome
completo, como ação/valor explícito se permitido.

**Proposta visual:** Ajuda sobre fallback e preview do header após mudança.

**Comportamento recomendado:** Distinguir campo inalterado,vazio intencional e
valor preenchido; não enviar null sem contrato.

**Alternativas e objeções:** Se remoção não é permitida,explicar e impedir vazio
em vez de aceitar intenção silenciosa.

**Decisão necessária:** B2/C definir limpeza/fallback e privacidade do nome em
notificações.

**Invariantes:** Nome exibido não define autorização; não modificar
identidade/histórico por abreviação.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Pequeno

**Risco de regressão:** Null incompatível ou uso involuntário do nome completo
em saída externa.

**Aceite futuro:** Inalterado,novo,vazio e espaços têm resultado definido e
preview consistente; backend e UI concordam; não altera outro paciente.

**Contraditório e conclusão:** Omissão pode ser intencional como não alterar; o
formulário não comunica essa distinção. Não se afirma remoção remota falhada.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** REVIEWED_STATIC_ONLY

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-005

Promessa de rascunho no dispositivo excede persistência da aba. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** UX-007

**Subgrupos:** B1.3;B1.5;B1.7;B1.8

**Superfícies:** SC-009; SC-010; SC-012

**Rotas:** /fichas/req;/fichas/com;/fichas/bal

**Pessoa e intenção:** Emitente interrompido

**Controle/jornada:** Salvar rascunho; recuperação

**Estado:** DRAFT_SAVED;RECOVERED

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Interrupção comum na operação móvel.

**Atual exato ou ramo:** Rascunho salvo neste dispositivo. Rascunho deste
dispositivo recuperado.

**Resultado observado:** REQ recupera na mesma aba,mas aba independente
autenticada não recupera. Usa sessionStorage com prazo24h; COM tem também
documento/rascunho servidor,que é outro objeto.

**Consequência humana:** Pode fechar/mudar aba ou aparelho esperando recuperar
preenchimento que não está disponível.

**Reprodução:** forms-probe salva1 item+1extra; recarrega mesma aba; abre aba
independente; comparar resultado sem concluir.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b17-forms.json](evidence/b17-forms.json);
[evidence/TEXT_REWRITES.csv](evidence/TEXT_REWRITES.csv).

**Código conferido:**
[src/components/requisitions/requisition-wizard.tsx:152](../../../src/components/requisitions/requisition-wizard.tsx#L152)
;
[src/components/documents/supply-wizard.tsx:255](../../../src/components/documents/supply-wizard.tsx#L255)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Rascunho salvo nesta aba por até24 horas. Retome aqui
antes de fechar a sessão. Exibir hora e diferenciar rascunho no sistema de
preenchimento local.

**Proposta visual:** Status junto a Salvar e ao retomar,com paciente/usuário e
hora; aviso proporcional ao sair.

**Comportamento recomendado:** Corrigir promessa já; continuidade entre
dispositivos é decisão separada com segurança e retenção.

**Alternativas e objeções:** Migrar automaticamente para localStorage amplia
exposição; não fazer por conveniência sem decisão de privacidade.

**Decisão necessária:** Definir alcance desejado,expiração e retomada autorizada
para primeira família.

**Invariantes:** Chave por usuário/paciente; draft não é documento emitido;
tentativa incerta não é editável.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno para texto;médio/alto para continuidade

**Risco de regressão:** Expor preenchimento a outra pessoa no dispositivo ou
duplicar comando.

**Aceite futuro:** Mesma aba,nova aba,fechar sessão,expirar24h,trocar paciente e
mudar usuário têm comportamento/texto coerentes; nenhuma emissão duplicada.

**Contraditório e conclusão:** A recuperação na mesma aba funciona e é mérito.
Teste não prova todos os navegadores preservam sessão do mesmo modo.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_SAME_TAB_AND_INDEPENDENT_TAB

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-VIS-001

Fundação visual precisa de consolidação orientada pelo resultado, com exceções
explícitas. **P3 — PRODUCT_OPPORTUNITY**.

**Origem e escopo:** UX-008

**Subgrupos:** B1.2

**Superfícies:** SC-001; SC-009; SC-031

**Rotas:** Padrões compartilhados

**Pessoa e intenção:** Todos os perfis

**Controle/jornada:** Botões,inputs,cards,dialogs,tabelas

**Estado:** READY;FOCUS;DISABLED

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Todas as interfaces dependem da fundação.

**Atual exato ou ramo:** Fluent e classes ui/hca/legadas coexistem; CSS efetivo
rende azul15,108,189 nas amostras.

**Resultado observado:** 37padrões catalogados; medidas mostram convergência
real,botões44px,inputs internos42px e seletor36desktop/44móvel. Não se comprovou
defeito por mera classe verde histórica.

**Consequência humana:** Futuras mudanças podem regressar densidade/foco por
regras concorrentes; oportunidade de previsibilidade, não bloqueador visual
atual universal.

**Reprodução:** visual-probe coleta computedStyle/geometria
em320/390/768/1440/1920; comparar CSS por consumidor,sem inferir aparência pelo
nome da classe.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b12-visual.json](evidence/b12-visual.json);
[evidence/b12-drawer.json](evidence/b12-drawer.json).

**Código conferido:**
[src/app/design-system.css:26](../../../src/app/design-system.css#L26);
[src/theme/tokens.css:1](../../../src/theme/tokens.css#L1). Linhas exatas no
CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Padrão-alvo: Fluent2 com tokens semânticos,44px de
conforto móvel,focus visível,densidade de gestão explicitamente diferente da
operação.

**Proposta visual:** Preservar hierarquia sóbria e áreas de toque; documentar
variantes mobile/desktop e exceções para tabela/ícone.

**Comportamento recomendado:** Consolidar somente regras comprovadamente
redundantes em futura D; manter checkbox de seleção e switch de efeito imediato
distintos.

**Alternativas e objeções:** Reescrever tudo por estética cria risco/custo;
nenhuma migração automática de componentes é exigida pelo B1.

**Decisão necessária:** C prioriza dívida visual versus barreiras de
decisão/recuperação.

**Invariantes:** Não reduzir legibilidade/acessibilidade nem confundir estado
disabled com restrição definitiva.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio a alto se consolidação ampla

**Risco de regressão:** Regressão por especificidade ou aumento de densidade
indevido.

**Aceite futuro:** Comparação visual antes/depois nos
cincoviewports,focus,disabled e alto contraste; nenhuma mudança sem consumidor
demonstrável.

**Contraditório e conclusão:** Contraste automatizado não achou violações nas
amostras e aparência é majoritariamente consistente; por isso oportunidadeP3,
não defeito em massa.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_MEASURED_SAMPLES

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-006

Histórico tem versões e integridade, mas exige tradução manual de mudanças de
negócio. **P3 — PRODUCT_OPPORTUNITY**.

**Origem e escopo:** UX-009

**Subgrupos:** B1.1;B1.3;B1.8

**Superfícies:** SC-039; SC-040

**Rotas:** /historico/\[id\]

**Pessoa e intenção:** Família,supervisão,leitor autorizado

**Controle/jornada:** Linha do tempo; Versões e integridade

**Estado:** READY_HISTORY

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Auditoria/contestação/retomada; ocasional.

**Atual exato ou ramo:** Versões,eventos,SHA-256 e snapshots disponíveis; sem
comparação por campo de negócio no consumidor.

**Resultado observado:** Detalhes documentais apresentam trilha real; tarefa
quem mudou o quê ainda depende de interpretar eventos/valores.

**Consequência humana:** Reconsulta fica mais custosa em divergência ou
substituição de versão.

**Reprodução:** Abrir ENT/COM com múltiplas versões da fixture; expandir trilha
e integridade; tentar explicar mudança entre duas versões.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/b11-supplement.json](evidence/b11-supplement.json);
[evidence/b16-feedback.json](evidence/b16-feedback.json).

**Código conferido:**
[src/components/documents/supply-detail.tsx:396](../../../src/components/documents/supply-detail.tsx#L396)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** \[Pessoa\] registrou aquisição de \[itens\] em\[data\]. Mudou
\[campo\]: \[antes\] → \[depois\]. Manter evento e hash como detalhe técnico.

**Proposta visual:** Timeline de negócio compacta,expandir comparação por
versão; estado vigente separado de história.

**Comportamento recomendado:** Diff usa snapshots autorizados imutáveis; não
recalcular passado com catálogo atual.

**Alternativas e objeções:** Não criar outra trilha concorrente nem chamar hash
de assinatura digital.

**Decisão necessária:** Selecionar quais diferenças importam para família antes
de diffs genéricos.

**Invariantes:** Histórico e hashes preservados; sem reescrever eventos.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio

**Risco de regressão:** Presenter omitir alteração relevante ou comparar com
estado atual.

**Aceite futuro:** Versões múltiplas,ator indisponível,catálogo alterado e
permissões limitadas mostram diff humano consistente com snapshot; PDFversionado
permanece acessível.

**Contraditório e conclusão:** Não é ausência de histórico; a trilha técnica
existe e foi preservada.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** PARTIAL_RENDERED_HISTORY;DIFF_OPPORTUNITY_STATIC

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-007

Pendências antigas de consumo e eventos administrativos têm alcance de consulta
limitado. **P2 — RISK_SUPPORTED**.

**Origem e escopo:** BE-001;BE-004

**Subgrupos:** B1.5;B1.8

**Superfícies:** SC-019; SC-028

**Rotas:** /consumo;/admin?section=audit

**Pessoa e intenção:** Família/supervisão/administrador local

**Controle/jornada:** Listas de consumo e auditoria

**Estado:** READY_DENSE_HISTORY

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Cresce com tempo/volume,mesmo com baixo uso inicial.

**Atual exato ou ramo:** Consumo limit(100); auditoria administrativa também sem
cursor de navegação além dos cem recentes.

**Resultado observado:** Fonte atual de consumo e contrato dirigido confirmam
corte; Fase A já reproduziu invisibilidade de relato antigo. B1 não criou novo
lote101para repetir a prova.

**Consequência humana:** Uma pendência pode parecer inexistente ou não ser
localizável quando novos registros avançam a janela.

**Reprodução:** Consultar fonte e evidênciaA BE-001/004; futuroteste
inserir101eventos fictícios preservandoFK e buscar o mais antigo pendente.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/source-index.json](evidence/source-index.json).

**Código conferido:**
[src/app/api/consumption/route.ts:50](../../../src/app/api/consumption/route.ts#L50)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Paginação/filtros explícitos e prioridade de pendências
abertas; total/limite visível. Auditoria por período/ator/objeto.

**Proposta visual:** Não exibir lista recente como histórico completo;
affordance de registros anteriores.

**Comportamento recomendado:** Cursor estável e deep link de ocorrência devem
localizar alvo autorizado independentemente da janela.

**Alternativas e objeções:** Aumentar limite só adia a perda; não trazer tudo
sem paginação.

**Decisão necessária:** B2 definir contrato de consulta,cursor e ordenação de
pendência.

**Invariantes:** RLS por paciente e autorizações de custódia; preservar
FK/histórico.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Médio

**Risco de regressão:** Expor dados antigos sem autorização ou carregar lista
infinita.

**Aceite futuro:** Mais de100 registros com pendência antiga; paginação sem
repetição/salto; deep link ref encontra alvo; total e rótulo explicam escopo.

**Contraditório e conclusão:** Corte pode ser intencional para desempenho,mas
falta caminho de recuperação. B1 não reexecutou prova de volume; confiança
baseada em fonte atual+A.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
REVIEWED_STATIC_CURRENT;VOLUME_RUNTIME_NOT_REPEATED

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-FEED-001

Feedback genérico não distingue relato de consumo,confirmação e aquisição. **P3
— EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.3;B1.6

**Superfícies:** SC-019; SC-039

**Rotas:** /consumo;/historico/\[id\]

**Pessoa e intenção:** Relator,família e aprovador

**Controle/jornada:** Relatar/confirmar/rejeitar consumo; ação COM

**Estado:** PERSISTED

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Toda operação de consumo; COM conforme etapa.

**Atual exato ou ramo:** Operação confirmada. Relatos só alteram o estoque após
confirmação autorizada.

**Resultado observado:** Mesmo texto após relato sem débito e confirmação com
débito. Prova read-back: relato manteve20; confirmação
levou20→19família,10equipe inalterado. COM possui recuperação boa,mas sucesso
pouco específico.

**Consequência humana:** Precisa inferir se só relatou ou se estoque já foi
alterado e quem age agora.

**Reprodução:** feedback-consumption-followup relata1 unidade e confirma com
identidade autorizada; reler saldos e comparar mensagens.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/b16-consumption.json](evidence/b16-consumption.json);
[evidence/b16-feedback.json](evidence/b16-feedback.json).

**Código conferido:**
[src/components/stock/consumption-console.tsx:88](../../../src/components/stock/consumption-console.tsx#L88)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Relato registrado para revisão. O estoque ainda não foi
alterado. / Consumo confirmado no estoque \[custódia\]. / Relato rejeitado,sem
movimento. COM: Aquisição registrada; próximo passo \[etapa vigente\].

**Proposta visual:** Status persistente com código/objeto e link à reconsulta;
não depender apenas de toast.

**Comportamento recomendado:** Selecionar frase pelo comando e resultado
autoritativo; preservar invariantes de ciência/aceite e reconsulta.

**Alternativas e objeções:** A frase condicional atual não é mentira,mas é
insuficiente. Não criar vários modais adicionais.

**Decisão necessária:** Validar frases por etapa em07e04.

**Invariantes:** Relato não debita; confirmação autorizada gera movimento; não
inventar sucesso de canal.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno

**Risco de regressão:** Mensagem prometer débito antes de commit ou dizer
recebido após compra.

**Aceite futuro:** Relatar,aceitar,rejeitar e recuperar tentativa mostram efeito
e próximo responsável exatos; histórico e saldos coincidem.

**Contraditório e conclusão:** Read-back e estados documentais são corretos;
problema é clareza do feedback.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** BEHAVIOR_EXERCISED_REAL_LOCAL_READBACK

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-DOC-001

PDF da REQ omite estoque observado presente na ficha. **P3 —
MISSING_CAPABILITY**.

**Origem e escopo:** BE-007

**Subgrupos:** B1.1;B1.3;B1.6

**Superfícies:** SC-045

**Rotas:** /api/documents/\[id\]/pdf (REQ)

**Pessoa e intenção:** Leitor de PDF/ficha impressa

**Controle/jornada:** Tabela de materiais

**Estado:** READY_PDF

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Todo compartilhamento/impressão de REQ.

**Atual exato ou ramo:** PDF mostra materiais sem coluna de estoque observado;
HTML identifica estoque na emissão.

**Resultado observado:** PDF atual da REQ real de duas linhas inspecionado nas
duas páginas; omissão confirmada no renderizador. Quantidade solicitada continua
corretamente ausente.

**Consequência humana:** Quem consulta só PDF perde informação usada para
decidir aquisição/entrega.

**Reprodução:** Comparar current-REQ.pdf com ficha da mesma versão; consultar
dados do snapshot,sem inferir saldo atual.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/current-REQ.pdf](evidence/current-REQ.pdf);
[evidence/pdf-inspection.json](evidence/pdf-inspection.json).

**Código conferido:**
[src/lib/server/operational-pdf.ts:441](../../../src/lib/server/operational-pdf.ts#L441)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Estoque observado na emissão: \[N unidade\] por
material,com título temporal claro. Não adicionar quantidade solicitada.

**Proposta visual:** Coluna/campo legível em largura de papel e página longa;
unidade explícita.

**Comportamento recomendado:** Usar snapshot da versão,com fallback de legado
sem inventar observação.

**Alternativas e objeções:** Se objetivo do PDF for comprovante mínimo,explicar
ausência e link autorizado; primeiro validar necessidade com família.

**Decisão necessária:** C define conteúdo documental e compatibilidade de
versões legadas.

**Invariantes:** Não atualizar PDF histórico com saldo presente; protocolo/hash
não são assinatura digital.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Confundir estoque observado com saldo atual ou inventar
dado legado.

**Aceite futuro:** REQ nova/legada,zero,decimal,texto longo e versão antiga:
observação temporal correta e sem coluna de pedido; PDF mantém legibilidade.

**Contraditório e conclusão:** HTML já mostra informação e PDF tem QR; isso
reduz mas não elimina lacuna em uso impresso/offline.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_PDF

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-A11Y-001

PDFs não expõem idioma e estrutura de tags no arquivo examinado. **P2 —
RISK_SUPPORTED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.1;B1.8

**Superfícies:** SC-045; SC-046; SC-047; SC-048

**Rotas:** /api/documents/\[id\]/pdf

**Pessoa e intenção:** Pessoa usando tecnologia assistiva ou navegação
estrutural

**Controle/jornada:** PDF REQ/COM/ENT/BAL

**Estado:** READY_PDF

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Todo PDF atual desta família de geradores.

**Atual exato ou ramo:** StructTreeRoot=null; Lang=null nos quatro PDFs atuais.

**Resultado observado:** InspeçãoPyMuPDF em8 páginas confirmou ausência destas
entradas. Extração de texto funciona; ordem/leitura em leitor de tela não foi
verificada.

**Consequência humana:** Navegação por headings/tabelas e idioma podem ser
inadequadas,mesmo com aparência legível.

**Reprodução:** inspect-pdfs.py consulta catálogo dos4 arquivos locais; abrir em
leitor compatível comAT é teste futuro.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/pdf-inspection.json](evidence/pdf-inspection.json);
[evidence/current-REQ.pdf](evidence/current-REQ.pdf);
[evidence/current-COM.pdf](evidence/current-COM.pdf);
[evidence/current-ENT.pdf](evidence/current-ENT.pdf);
[evidence/current-BAL.pdf](evidence/current-BAL.pdf).

**Código conferido:**
[src/lib/server/document-pdf.ts:5](../../../src/lib/server/document-pdf.ts#L5);
[src/lib/server/operational-pdf.ts:3](../../../src/lib/server/operational-pdf.ts#L3)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** PDF com idioma pt-BR,headings,tabelas e ordem lógica;
oferecer HTML acessível equivalente de forma descoberta.

**Proposta visual:** Não alterar qualidade impressa ao inserir estrutura; link
de alternativa HTML próximo do download.

**Comportamento recomendado:** Escolher gerador/estrutura que suporte tags ou
definir alternativa equivalente com teste real.

**Alternativas e objeções:** Texto extraível não prova acessibilidade; ausência
de tags não é teste de todas as tecnologias assistivas.

**Decisão necessária:** C define padrão documental e leitor-alvo; validar com
pessoa usuária deAT.

**Invariantes:** Controle de acesso/versão/snapshots preservados; nenhum
conteúdo privado em portal público.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Médio a alto conforme gerador

**Risco de regressão:** Adotar ferramenta sem suportar
integridade/compatibilidade ou emitir selo sem leitor real.

**Aceite futuro:** LeitorPDF/NVDA navega título,tabela e rodapé em ordem; idioma
correto; HTML equivalente disponível; validar8 páginas e documento longo.

**Contraditório e conclusão:** Páginas visuais não têm corte na prova; risco de
estrutura não deve ser confundido com ilegibilidade visual.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
STRUCTURE_AND_VISUAL_REVIEWED;ASSISTIVE_READING_NOT_VERIFIED

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-A11Y-002

Fechar decisão e continuar edição podem devolver foco ao corpo. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.6;B1.8

**Superfícies:** SC-014; SC-024

**Rotas:** /escalas;/admin?section=catalog

**Pessoa e intenção:** Operador de teclado/leitor de tela

**Controle/jornada:** Escape do Dialog; Continuar editando no drawer

**Estado:** DIALOG_CLOSED;DIRTY_EDITING

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda decisão com esse fechamento e edição suja nesta
variante.

**Atual exato ou ramo:** Após Escape500ms activeElement=BODY; Continuar
editando250ms tambémBODY.

**Resultado observado:** Trap de9Tabs é correto,dados permanecem,mas
fechamento/continuação perdem ponto de foco; próximoTab do diálogo vai ao
skiplink. Descartar restaura Novo item corretamente.

**Consequência humana:** Perde posição e precisa reencontrar comando/campo;
segundoEscape fora do drawer não age como esperado.

**Reprodução:** accessibility-probe abre decisão,Tab9,Escape; followup
espera500ms eTab. Drawer editaNome,Escape,Continuar e espera250ms; depois
recuperar foco eDescartar.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:**
[evidence/b18-accessibility.json](evidence/b18-accessibility.json);
[evidence/b18-followup.json](evidence/b18-followup.json).

**Código conferido:**
[src/components/ui/primitives.tsx:158](../../../src/components/ui/primitives.tsx#L158)
;
[src/components/forms/record-drawer.tsx:19](../../../src/components/forms/record-drawer.tsx#L19)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Ao fechar,retornar ao gatilho ou alternativa lógica; ao
continuar,retomar último campo editado e anunciar que nada foi descartado.

**Proposta visual:** Focusring visível na origem/último campo; sem scroll
involuntário ao topo.

**Comportamento recomendado:** Guardar referência do gatilho/campo e restaurar
após transição; se removido,escolher destino lógico seguro.

**Alternativas e objeções:** Forçar foco em todo refresh prejudica digitação;
correção restrita a transições de contexto.

**Decisão necessária:** Definir fallback de foco quando o gatilho desaparecer
após sucesso.

**Invariantes:** Trap,Escape,proteção de edição suja e bloqueio de resultado
incerto continuam corretos.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Restaurar para elemento desmontado ou esconder erro ao
fechar.

**Aceite futuro:** Escape,Voltar,Confirmar,Continuar eDescartar por teclado
em390/1440; foco nuncaBODY após tarefa; AT anuncia destino e dados preservados.

**Contraditório e conclusão:** Trap e descarte corretos refutam ausência
universal de gerenciamento de foco.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
BEHAVIOR_EXERCISED_KEYBOARD_AND_DELAYED_ACTIVE_ELEMENT

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-A11Y-003

Observação válida contínua rompe reflow da revisão em320px. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.2;B1.7;B1.8

**Superfícies:** SC-009

**Rotas:** /fichas/req

**Pessoa e intenção:** Pessoa com celular estreito ou ampliação

**Controle/jornada:** Observação renderizada na revisão

**Estado:** READY_REVIEW_LONG_TEXT

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Texto/URL/identificador longo sem espaços; pouco
comum,plausível.

**Atual exato ou ramo:** Texto de320 caracteres,com300contínuos,gera
documentWidth2190 emviewport320.

**Resultado observado:** Valor é válido dentro do limite1000; sai
horizontalmente do card e página,sem necessidade de submit. Axe0violações não
detectou este defeito.

**Consequência humana:** Leitura exige deslocamento horizontal global e pode
afastar conteúdo/ações em zoom.

**Reprodução:** accessibility-probe cria observação fictícia válida com
sequência contínua; avança revisão em320; medir scrollWidth e abrir original;
não emitir.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** 320CSSpx

**Evidência atual:**
[evidence/b18-accessibility-adminA-long-text-reflow320.png](evidence/b18-accessibility-adminA-long-text-reflow320.png)
; [evidence/b18-accessibility.json](evidence/b18-accessibility.json).

**Código conferido:**
[src/components/requisitions/requisition-steps.tsx:516](../../../src/components/requisitions/requisition-steps.tsx#L516)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Quebrar texto operacional contínuo dentro do card
preservando o conteúdo completo,sem truncamento silencioso.

**Proposta visual:** Revisão e listas contidas na largura; overflow-wrap
adequado nos consumidores de texto livre.

**Comportamento recomendado:** Testar conteúdo legítimo em todos os presenters
compartilhados,sem corrigir apenas esta captura.

**Alternativas e objeções:** Rolagem local é apropriada para tabelas
bidimensionais; não para observação textual simples.

**Decisão necessária:** Escolher regra de quebra preservando cópia/seleção e
URLs.

**Invariantes:** Não alterar dado no banco,nem ocultar observação completa.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno,regressão transversal

**Risco de regressão:** Quebra excessiva em números/protocolos ou truncamento de
conteúdo.

**Aceite futuro:** 320px,zoom nativo400%,300 caracteres contínuos/URL e nome
longo: sem rolagem global indevida; botões legíveis e conteúdo copiável.

**Contraditório e conclusão:** Amostras comuns320–1920 cabiam e footer390 foi
refutado como defeito. Este caso usa texto válido específico.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED;BEHAVIOR_MEASURED2190_320

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-NAV-002

Seletor Mês mantém visualização de dia no móvel. **P3 —
EXPERIENCE_INCONSISTENCY**.

**Origem e escopo:** NEW_B1

**Subgrupos:** B1.2;B1.8

**Superfícies:** SC-014

**Rotas:** /escalas

**Pessoa e intenção:** Família/supervisão/profissional consultando agenda

**Controle/jornada:** Visualização Semana/Mês

**Estado:** READY_MOBILE

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Comprehension/effort/consistency opportunity with
existing workaround; no demonstrated irreversible harm

**Frequência plausível:** Toda seleção de modo em tela estreita.

**Atual exato ou ramo:** Mês selecionado em390; cabeçalho Dia
anterior/\[data\]/Próximo dia.

**Resultado observado:** CSS/consumer força visão diária abaixo1024 apesar do
seletor manter Mês. Não houve perda de plantão provada; expectativa de navegação
é incoerente.

**Consequência humana:** Pode esperar visão mensal e achar que registros do
restante do mês desapareceram.

**Reprodução:** Abrir Escalas390; selecionarMês; observar dataúnica e setas de
dia; comparar desktop.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** 390CSSpx

**Evidência atual:**
[evidence/b18-accessibility-adminA-month-selected-day-rendered.png](evidence/b18-accessibility-adminA-month-selected-day-rendered.png)
; [evidence/b18-accessibility.json](evidence/b18-accessibility.json).

**Código conferido:**
[src/components/schedules/schedule-console.tsx:60](../../../src/components/schedules/schedule-console.tsx#L60)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** No móvel oferecer Dia/Agenda compatível,ou informar
Exibindo dia no celular e navegação mensal explícita se necessária.

**Proposta visual:** Nome do seletor coincide com unidade exibida e setas;
manter densidade móvel apropriada.

**Comportamento recomendado:** Não mudar regra de recorrência; só
seleção/representação da consulta.

**Alternativas e objeções:** Forçar grade mensal minúscula piora leitura; manter
agenda diária é justificável com rótulo coerente.

**Decisão necessária:** Validar necessidade de visão mensal com usuários e
alternativa agenda.

**Invariantes:** Escala é previsão,sem presença; horários/fuso preservados.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Criar grade ilegível ou quebrar filtro de intervalo.

**Aceite futuro:** 390/768/1440,Semana/Mês,troca de data: rótulo,setas e
intervalo coincidem,sem ocultação silenciosa de resultados.

**Contraditório e conclusão:** Visão diária é adaptação legítima; o problema é
promessa do seletor.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** RENDERED_AND_INSPECTED_MOBILE

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-QA-001

CI desktop segue falhando por escolha transitória de navegação no helper. **P2 —
DEFECT_CONFIRMED**.

**Origem e escopo:** QA-001

**Subgrupos:** B1.0;B1.8

**Superfícies:**

**Rotas:** tests/e2e/navigation.ts

**Pessoa e intenção:** Equipe que depende da evidência de release

**Controle/jornada:** navigateTo e leitura de navegação

**Estado:** CI_DESKTOP

**Confiança:** High for scoped observation; user comprehension untested

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Intermitente sob CI/renderização de contexto.

**Atual exato ou ramo:** Helper procura Navegação do plantão em desktop após
leitura transitória.

**Resultado observado:** Logs atuais do run40656069166:39pass e1falha no
jobdesktop,mesmo alvo após retry. SeleçãoB1de6 E2E passou,mas não cobriu nem
corrigiu esta instabilidade.

**Consequência humana:** Falha intermitente reduz confiança na regressão das
jornadas e pode mascarar falha real.

**Reprodução:** Ler ci-current.log e helper; comparar detecção de contexto com
estado pronto. Nenhuma alteração no helper nesta fase.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/ci-current.log](evidence/ci-current.log);
[evidence/e2e-current.log](evidence/e2e-current.log).

**Código conferido:**
[tests/e2e/navigation.ts:10](../../../tests/e2e/navigation.ts#L10). Linhas
exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Esperar estado explícito e navegação correspondente ao
perfil/viewport antes de decidir rota de clique; guardar diagnóstico de contexto
sanitizado.

**Proposta visual:** Não aplicável à UI de produto; melhorar evidência e seletor
sem adicionar textos técnicos ao usuário.

**Comportamento recomendado:** Correção futura no helper com reprodução e
execução de desktop/móvel/WebKit; não aumentar timeout cegamente.

**Alternativas e objeções:** Excluir teste ou aceitar retry verde não demonstra
confiabilidade.

**Decisão necessária:** FaseC alocar correção de teste antes do gate de release;
B1 não autoriza mudança.

**Invariantes:** Não remover assertions nem enfraquecer guardas de stack/dados.

**Dependências:** Phase C prioritization/design; domain/authorization review
where affected

**Esforço estimado:** Pequeno a médio

**Risco de regressão:** Corrigir seletor escondendo problema de produto ou
depender só de timing.

**Aceite futuro:** Reproduzir causa e passar fluxo afetado em
desktop/móvel/WebKit sem seleção transitória; CI completo necessário para
gate,sem declarar6 testes=suíteinteira.

**Contraditório e conclusão:** Demais jobs estavam verdes e subsetB1passou; isso
não invalida falha histórica atual do jobafetado.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:** CURRENT_CI_LOG_REVIEWED;TARGETED_LOCAL6_PASSED

**E2E:** Selected existing tests passed; see scope, not a fix verification

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented

## B1-UX-008

Ciência automática continua ligada à exposição do cabeçalho. **P2 —
RISK_SUPPORTED**.

**Origem e escopo:** UX-002

**Subgrupos:** B1.3;B1.6;B1.8

**Superfícies:** SC-039; SC-040

**Rotas:** /historico/\[id\] (REQ)

**Pessoa e intenção:** Família com ciência automática habilitada

**Controle/jornada:** IntersectionObserver e etiqueta Automática · conteúdo
exibido

**Estado:** DOCUMENT_OPEN;SCIENCE_RECORDED

**Confiança:** High for described source/measurement; human consequence
conditional

**Critério de prioridade:** Risk of wrong action, missed pending work, unsafe
recovery or barrier to use; domain-specific frequency

**Frequência plausível:** Toda abertura elegível com política automática
habilitada.

**Atual exato ou ramo:** Automática · conteúdo exibido

**Resultado observado:** Fonte atual observa cabeçalho,antes da lista de
materiais. B1executou ciência expressa em novaREQ; não reproduziu evento
automático habilitado. A já demonstrou o gatilho.

**Consequência humana:** Pode ser interpretado como leitura do conteúdo integral
quando só houve abertura/exposição do topo.

**Reprodução:** Ler observer e ref do cabeçalho; confrontar provaA UX-002;
futuroteste manter materiais fora do viewport e verificar evento sem rotular
leitura.

**Ambiente e dados:** Synthetic local home-care-assistant; 127.0.0.1:3100 /
:54321; external sends false; product 37cb7f85e96e551d6419871f94dd950712e2565b

**Viewport:** Scenario-specific dimensions recorded in linked JSON; no claim all
widths tested

**Evidência atual:** [evidence/b18-journeys.json](evidence/b18-journeys.json).

**Código conferido:**
[src/components/requisitions/requisition-detail.tsx:142](../../../src/components/requisitions/requisition-detail.tsx#L142)
;
[src/components/requisitions/requisition-detail.tsx:88](../../../src/components/requisitions/requisition-detail.tsx#L88)
. Linhas exatas no CSV; o link #L é referência textual, não execução.

**Texto recomendado:** Se critério continuar abertura: Automática · documento
aberto no aplicativo. Se exigir conteúdo,definir outro gatilho e versão de
política,sem alegar leitura cognitiva.

**Proposta visual:** Etiqueta de modo e explicação do evento separada do
aceite/atendimento.

**Comportamento recomendado:** Decisão semântica antes de mudar gatilho; manter
ciência expressa disponível e auditada.

**Alternativas e objeções:** Rolar até o fim também não prova compreensão; não
medir leitura humana com timer.

**Decisão necessária:** Família/responsável define o significado de ciência
automática e evidência exigida; B2/C.

**Invariantes:** Ciência não é aceite,nem leitura do provedor; nenhuma ficção de
consentimento.

**Dependências:** B2 domain/API review; Phase C decision; implementation only
Phase D

**Esforço estimado:** Pequeno para texto;médio para contrato

**Risco de regressão:** Alterar significado histórico do evento ou bloquear
entrega por ciência.

**Aceite futuro:** Modo automático/expresso/desabilitado,topo apenas,scroll e
revisita têm eventos/textos coerentes; nenhuma ciência de leitor sem capacidade.

**Contraditório e conclusão:** Ciência expressaB1funcionou e leitura posterior
mostrou ciência satisfeita com0/1atendido; isso preserva distinções mas não
valida evento automático.

**Verificação estática:** REVIEWED_STATIC_CURRENT; checked code anchor

**Renderização/comportamento:**
REVIEWED_STATIC_CURRENT;AUTOMATIC_EVENT_NOT_REPEATED;EXPRESS_EXERCISED

**E2E:** Exploration only when described; not every branch a permanent E2E

**Humano:** NOT_VERIFIED; no participant sessions

**Produção:** NOT_VERIFIED; no remote mutation

**Situação:** OPEN_DIAGNOSIS; proposal not implemented
