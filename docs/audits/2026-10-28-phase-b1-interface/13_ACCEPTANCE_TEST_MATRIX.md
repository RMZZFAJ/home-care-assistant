# Critérios de aceitação para futuras correções

Estes são testes sugeridos. Nenhum foi incorporado à suíte nem representa
correção já realizada. A coluna de observação descreve a auditoria, não
resultado de implementação. Cada item deve ser convertido em caso de teste
revisado na Fase C/D.

## AC-B1-UX-001

Achado: [B1-UX-001](12_FINDINGS_MASTER.md#b1-ux-001).

- Pré-condição: Administrador local aprovador; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Para proposta de troca de pessoa e horário, aprovador explica
antes/depois sem sair do diálogo em390/1440; payload usa versão exibida;
conflito409 mantém revisão; nenhuma aprovação em leitura.
- Texto e visual: Revisar alteração de plantão. Profissional: \[atual\] →
\[proposto\]. Período: \[início/fim atuais\] → \[novos\], horário de \[cidade/fuso\].
Responsabilidade BAL: \[efeito ou não altera\]. Motivo: \[texto\]. Comparação em
linhas Atual/Proposto; resumo sempre visível acima dos botões; mudanças
destacadas sem depender só de cor.
- Comportamento/recuperação: Carregar resumo autorizado da versão esperada; se
mudou, bloquear aprovação e reapresentar. CTA Aprovar esta alteração; Voltar à
proposta.
- Autorização/história: Aprovação distinta quando exigida; controle de versão,
sobreposição, transação e autoridade no banco.
- Regressão: Resumo montado de dados desatualizados ou inferir presença a partir
da escala.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED;BEHAVIOR_EXERCISED_REVIEW_ONLY. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-002

Achado: [B1-UX-002](12_FINDINGS_MASTER.md#b1-ux-002).

- Pré-condição: Família, destinatário ENT e administrador local;
contexto/paciente e versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Cada variante mostra objeto, direção, unidade, pessoa/custódia e
consequência; teste divergência parcial e movimento reverso; reconsulta
coincide com resumo.
- Texto e visual: Confirmar saída de \[N unidade\] de \[material\] do estoque
familiar. ENT: Receber \[N unidade\] de \[material\]; \[diferença\] permanece
divergente. BAL: Toda \[dia\], no plantão \[tipo\], a partir de \[data\], em \[fuso\];
responsável \[regra/pessoa\]. Resumo compacto por item e escopo, com unidade e
efeito; evitar texto universal substituindo os dados.
- Comportamento/recuperação: Gerar resumo do comando congelado; permitir voltar;
recuperar mesma tentativa após resposta perdida.
- Autorização/história: COM não atende REQ; ENT aceita atualiza
atendimento/estoque; BAL não calcula consumo automaticamente; nenhuma
quantidade solicitada na REQ.
- Regressão: Rótulo genérico voltar a ocultar diferenças entre comandos.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED;BEHAVIOR_EXERCISED_SELECTED_COMMANDS.
Teste humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-003

Achado: [B1-UX-003](12_FINDINGS_MASTER.md#b1-ux-003).

- Pré-condição: Administrador local diante de proposta global; contexto/paciente
e versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Cobrir todos os kinds permitidos e fallback seguro desconhecido;
nenhum UUID/JSON necessário para decisão; payload de aprovação preserva
id/versão.
- Texto e visual: \[Autor\] propõe alterar \[regra/pessoa\]. Atual: \[valor humano\].
Proposto: \[valor humano\]. Efeito neste paciente: \[efeito\]. Comparação lado a
lado ou empilhada no celular; detalhe técnico recolhido para administração
autorizada.
- Comportamento/recuperação: Resolver kind em presenter tipado; não tomar label
como autorização; preservar versão e aprovador distinto.
- Autorização/história: Proposta não é aplicação; revisão local não pode alterar
outro paciente.
- Regressão: Presenter esconder alterações não reconhecidas.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_INJECTED_GET;NO_DECISION_MUTATION.
Teste humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-004

Achado: [B1-UX-004](12_FINDINGS_MASTER.md#b1-ux-004).

- Pré-condição: Familiar/profissional convidado; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Convite válido, expirado, revogado, conta errada e já aceito têm
estado/CTA distintos; nenhum aceite pode alterar papel ou paciente por
parâmetro do cliente.
- Texto e visual: \[Emissor\] convida você para acompanhar \[paciente\] como
\[função\]. Convite válido até \[data/fuso\]. Conta atual: \[identidade\]. Aceitar
vínculo / Entrar com outra conta. Cartão de prévia antes do CTA; estado
expirado/revogado explícito sem revelar dados a token inválido.
- Comportamento/recuperação: Prévia por token com escopo mínimo e rate limit;
aceite revalida destino/validade no servidor.
- Autorização/história: Token secreto não vai para logs/evidências; identidade
global difere de papel local.
- Regressão: Vazamento de dados no convite/preenchimento automático indevido.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: PARTIAL_RENDERED;E2E_HAPPY_PATH_PASSED. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-TEXT-001

Achado: [B1-TEXT-001](12_FINDINGS_MASTER.md#b1-text-001).

- Pré-condição: Todos os perfis leitores; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: Todas as chaves emitidas têm tradução e fallback testado; chips
e anúncio acessível coincidem; remover filtro mantém outros parâmetros.
- Texto e visual: Situação: Requisições para sua ciência; Situação: Conclusões
para revisar e arquivar. Remover filtro de busca/data inicial/data
final/situação/tipo de ficha. Manter chip removível, conteúdo curto com nome
acessível completo; detalhe técnico só onde ajuda suporte.
- Comportamento/recuperação: Um glossário por domínio e fallback desconhecido
explícito; não mapear estados diferentes para o mesmo termo.
- Autorização/história: Ciência não é aceite; status da
aplicação/provedor/leitura independentes.
- Regressão: Tradução que altera significado de estado.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED;BEHAVIOR_FILTERS. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-NAV-001

Achado: [B1-NAV-001](12_FINDINGS_MASTER.md#b1-nav-001).

- Pré-condição: Todos os perfis conforme capacidade; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Nome acessível e título de destino exprimem mesma tarefa nos
seis perfis; nenhum link individual perde alvo/contexto.
- Texto e visual: Minhas notificações; Preferências de avisos → Perfil; Unidades
e apresentações; Ver ocorrência / Ver plantão / Abrir ficha conforme alvo.
Agrupar conta pessoal, tarefas e administração por escopo; manter descrições
curtas em Mais.
- Comportamento/recuperação: Preservar links compatíveis e oferecer retorno ao
filtro/origem quando seguro.
- Autorização/história: Só mostrar ações autorizadas; texto não concede
capacidade.
- Regressão: Quebrar links antigos ao reorganizar nomes.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_SELECTED_DESTINATIONS. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-TEXT-002

Achado: [B1-TEXT-002](12_FINDINGS_MASTER.md#b1-text-002).

- Pré-condição: Família, supervisão e leitores de PDF; contexto/paciente e
versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Compra, doação, BAL inicial/reconto/legado têm título e
metadados coerentes; protocolo/hash do histórico preservados.
- Texto e visual: Compra ou doação de insumos; Balanço de estoque. Manter
origem, regime/plantão e indicação de reconto em metadados próprios. Título
estável e subtítulo específico, sem siglas como único identificador.
- Comportamento/recuperação: Aplicar editorial de forma coerente entre HTML, PDF
e notificações; não reescrever fatos históricos.
- Autorização/história: COM continua distinta de ENT; BAL não vira consumo.
- Regressão: Alterar snapshot histórico em vez de renderização autorizada.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_COM;STATIC_BAL_VARIANTS. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-TEXT-003

Achado: [B1-TEXT-003](12_FINDINGS_MASTER.md#b1-text-003).

- Pré-condição: Pessoa com link errado ou antigo; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 404 público em português com heading/main/CTA;401/403 mantêm
tratamento próprio e retorno seguro.
- Texto e visual: Página não encontrada. Confira o endereço ou volte ao início.
CTA Ir para o início; Entrar quando apropriado. Estado simples, heading e main
reconhecíveis; sem expor existência de recurso privado.
- Comportamento/recuperação: Distinguir URL pública desconhecida de403 e
documento não autorizado.
- Autorização/história: Não revelar paciente/documento pela diferença de
resposta pública.
- Regressão: Enumeração de recurso se customização consultar dados privados.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_PUBLIC. Teste humano NOT_VERIFIED.
Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-ERR-001

Achado: [B1-ERR-001](12_FINDINGS_MASTER.md#b1-err-001).

- Pré-condição: Pessoa anexando foto/ficha física; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Perda antes/depois do commit,400 e timeout distintos; GETready
reconcilia sem duplicar; input não muda durante desconhecido; arquivo
confirmado fica reconsultável.
- Texto e visual: Não foi possível confirmar o resultado do envio. Mantenha este
arquivo e consulte a tentativa antes de enviar outro. CTA Consultar envio.
Resumo fixo de nome/tamanho/tentativa e estado desconhecido persistente;
seletor bloqueado até conciliação.
- Comportamento/recuperação: Congelar bytes/chave, consultar resultado e
permitir nova tentativa só após rejeição definitiva; tratar reservas
abandonadas com contrato de Storage.
- Autorização/história: Não sobrescrever anexo imutável; conservar trilha e
limites por documento; sem expor signedURL.
- Regressão: Apagar reserva válida ou permitir nova intenção antes da
conciliação.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_REAL_LOCAL201_LOST_REPLY. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-ERR-002

Achado: [B1-ERR-002](12_FINDINGS_MASTER.md#b1-err-002).

- Pré-condição: Todos os perfis; contexto/paciente e versão conhecidos, dados
fictícios, capacidade real.
- Cenário-alvo: 401/403/404/409/422/429/500,invalidJSON,timeout eabort têm CTA
apropriado ao efeito; falha de leitura não recomenda recuperar mutação.
- Texto e visual: Consulta: Não foi possível atualizar estas informações.
Consultar novamente. Escrita incerta: Não foi possível confirmar o resultado.
Recuperar a mesma tentativa. Mensagem no contexto da tarefa; referência
sanitizada copiável; CTA só quando implementado pelo consumidor.
- Comportamento/recuperação: Tipar operação/certidão e preservar orientação
segura da API; nunca inferir rollback de erro de transporte.
- Autorização/história: Correlação sem payload privado; rejeição definitiva
permite editar, desconhecido congela intenção.
- Regressão: Consumidor genérico liberar payload de operação ainda em curso.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_READ_FAILURES;WRITE_RISK_STATIC. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-ERR-003

Achado: [B1-ERR-003](12_FINDINGS_MASTER.md#b1-err-003).

- Pré-condição: Administrador local; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: 409 não aparenta sucesso; nova versão visível e nenhuma
reaplicação automática; Tab começa na reconciliação, não no topo da página.
- Texto e visual: A política mudou. Sua alteração ainda não foi aplicada.
Confira o valor atual e a alteração que você pretendia fazer. CTA Rever
alteração. Erro persistente junto ao diff e foco no resumo; mostrar versão
atual e intenção anterior.
- Comportamento/recuperação: Fechar só após sucesso confirmado; em409 recarregar
e exigir nova decisão da versão vigente.
- Autorização/história: Permissão crítica continua dependente de versão,
capacidade e escopo; sem replay automático.
- Regressão: Reaplicar intenção desatualizada como se fosse política atual.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_INJECTED_POST409. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-STATE-001

Achado: [B1-STATE-001](12_FINDINGS_MASTER.md#b1-state-001).

- Pré-condição: Operadores e administradores; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Delay,200vazio,200comdados,500 e retry em cada consumidor
citado; nenhum loading infinito com erro nem mensagem em dia antes de200.
- Texto e visual: Consultando relatos… / Não foi possível consultar relatos.
Consultar novamente / Nenhum relato neste filtro, somente após200. Perfil: Não
foi possível carregar seu perfil. Loading,erro,vazio e pronto mutuamente
coerentes por seção; sinal de consulta preserva espaço sem afirmar ausência.
- Comportamento/recuperação: Estado explícito inicial/erro/vazio; não usar array
vazio como sucesso; abortar resultado do contexto anterior.
- Autorização/história: Vazio confirmado exige resposta válida; falha não vira
ausência de dados.
- Regressão: Esconder conteúdo útil durante refresh ou gerar anúncios repetidos.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_DELAY_EMPTY_ERROR. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-STATE-002

Achado: [B1-STATE-002](12_FINDINGS_MASTER.md#b1-state-002).

- Pré-condição: Profissional recebedor/família; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Alternar rapidamente filtros com respostas invertidas,erro e
vazio; resultado corresponde à chave atual e foco permanece no filtro.
- Texto e visual: Atualizando entregas concluídas… Os resultados anteriores
ainda estão visíveis. Ou retirar linhas acionáveis até a consulta atual
terminar. Indicador junto ao filtro e região aria-busy; identificar resultados
anteriores se conservados.
- Comportamento/recuperação: Associar dados à chave do filtro e cancelar
resposta antiga; desativar comando dependente de visão incompatível.
- Autorização/história: Não alterar dados por filtro; autorização continua no
servidor.
- Regressão: Perder posição de leitura ou aceitar resposta atrasada de outro
paciente.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_CONTROLLED_DELAY. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-STATE-003

Achado: [B1-STATE-003](12_FINDINGS_MASTER.md#b1-state-003).

- Pré-condição: Família e gestão de estoque; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Cada endpoint falha isoladamente e ambos falham; saldos válidos
ou indisponibilidade explícita permanecem; nenhum vazio falso.
- Texto e visual: Saldos consultados às \[hora\]. Não foi possível carregar os
movimentos. CTA Consultar movimentos novamente. Seções independentes com erro
local; não repetir nenhum movimento se a consulta falhou.
- Comportamento/recuperação: Preservar resultado válido por seção e sua
chave/tempo; explicar quando saldo está desatualizado.
- Autorização/história: Saldo oficial vem do ledger; leitura parcial não
autoriza ajuste direto.
- Regressão: Misturar saldos e movimentos de versões/pacientes diferentes.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_PARTIAL_200_500. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-STATE-004

Achado: [B1-STATE-004](12_FINDINGS_MASTER.md#b1-state-004).

- Pré-condição: Emissor/consulta documental; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Completou antes do prazo,pendente além do prazo,PDF
lento,política0/5/10 e desmontagem: nenhum resultado terminal regride nem PDF
é cancelado por outro estado.
- Texto e visual: Documento salvo. O acompanhamento inicial terminou. Consulte
os estados individuais dos avisos. Preparando PDF… deve ser estado separado.
Persistência,arquivo e avisos em linhas independentes; CTA reconsulta visível
e resultado conhecido preservado.
- Comportamento/recuperação: Timer só encerra espera, não regride sucesso;
consumir política válida ou remover opção inoperante após decisão;
cancelamentos separados.
- Autorização/história: Persistido,disponível,enviado,entregue,lido e ciência
são independentes.
- Regressão: Bloquear compartilhamento aguardando canal externo ou prometer
entrega.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_VIRTUAL_CLOCK;POLICY_STATIC. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-STATE-005

Achado: [B1-STATE-005](12_FINDINGS_MASTER.md#b1-state-005).

- Pré-condição: Profissional/família sob interrupção de rede; contexto/paciente
e versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Offline,reconexão,sessão revogada e troca de paciente mostram
frescor correto; comandos revalidam e não são enfileirados silenciosamente.
- Texto e visual: Sem conexão. Estas informações podem estar desatualizadas.
Última consulta: \[hora\]. CTA Consultar novamente quando reconectar. Aviso
discreto persistente próximo ao contexto, acessível e visível; conservar
leitura com data.
- Comportamento/recuperação: Revalidar contexto ao retorno e antes de comando;
separar offline real,erro de serviço e sessão revogada.
- Autorização/história: Autoridade sempre no banco/API; cache não concede
capacidade.
- Regressão: Falso positivo de offline ou banner excessivo; confundir melhoria
com segurança resolvida.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual:
BEHAVIOR_EXERCISED_OFFLINE_EMULATION;SECURITY_BYPASS_NOT_DEMONSTRATED. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-001

Achado: [B1-FORM-001](12_FINDINGS_MASTER.md#b1-form-001).

- Pré-condição: Profissional emitente; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: Selecionar,apagar0/7,voltar etapa,rascunho e submit não
transformam ausência em contagem; zero explícito é aceito; nenhuma mudança de
contrato só no browser.
- Texto e visual: Estoque observado \[campo inicialmente vazio\]. Se não foi
possível contar, oferecer opção explícita apenas se o contrato aceitar; zero
continua significando nenhum disponível. Unidade junto ao campo e ajuda curta,
sem expor saldo esperado como resposta física.
- Comportamento/recuperação: Separar vazio de0 no estado de edição; bloquear
emissão ou modelar não observado conforme decisão de contrato, nunca converter
implicitamente.
- Autorização/história: REQ não pede quantidade solicitada; contagem física não
é saldo do ledger.
- Regressão: Introduzir null incompatível ou usar saldo previsto como contagem.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_EDIT_ONLY. Teste humano NOT_VERIFIED.
Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-002

Achado: [B1-FORM-002](12_FINDINGS_MASTER.md#b1-form-002).

- Pré-condição: Emitente e cadastro de apresentação; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 1000/1001,extra sem nome,múltiplas etapas e apresentação
incompleta: erro compreensível,anunciado,no campo correto,sem emissão inválida
e sem apagar valor.
- Texto e visual: Use até 1.000 caracteres nesta observação. CTA Corrigir
observação1; Informe o nome do item extra. Ao preencher código, informe também
nome e conversão. Erro ligado por aria-describedby/invalid, contador no
limite, resumo com links para etapa/campo; manter conteúdo.
- Comportamento/recuperação: Mesmos limites cliente/API; submit leva à etapa e
primeiro campo inválido; erro de contrato em português seguro.
- Autorização/história: No máximo1000por observação e50 entradas conforme
esquema atual; não mascarar erro de autorização.
- Regressão: Cliente divergir do schema ou esconder erro de resposta
desconhecida.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_REAL400_AND_FIELD_ERROR. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-003

Achado: [B1-FORM-003](12_FINDINGS_MASTER.md#b1-form-003).

- Pré-condição: Pessoa criando/alterando senha; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 12 caracteres,72 bytes e UTF-8 acima do teto tratados
coerentemente; password manager funciona; nenhum segredo em DOM exportado/log.
- Texto e visual: Use pelo menos12 caracteres. O limite é72 bytes; o sistema
informa quando for excedido. Ajustar ajuda sem mostrar senha e sem impor regra
de cadastro ao login existente. Ajuda antes do envio e erro no campo;
gerenciador de senha/autocomplete adequados.
- Comportamento/recuperação: Validação coerente para senha nova; não truncar nem
registrar segredo.
- Autorização/história: Login aceita credenciais existentes; nova senha continua
validada no Auth/servidor.
- Regressão: Impedir login de senha preexistente ou truncar senha.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: REVIEWED_STATIC;E2E_ORDINARY_PASSWORD_FLOW. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-004

Achado: [B1-FORM-004](12_FINDINGS_MASTER.md#b1-form-004).

- Pré-condição: Família/expedidor de materiais; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 1/5/20/100 itens,nome longo,alias,semresultado e mudar categoria
preservam escolhas; teclado/AT acessam seleção e total.
- Texto e visual: Buscar por nome ou nome alternativo. Exibir Nselecionados e
manter seleção entre filtros,unidade e categoria. Busca compacta acima das
categorias; resumo dos selecionados para revisão.
- Comportamento/recuperação: Reutilizar catálogo/aliases autorizados,sem exigir
nova dependência ou pesquisa remota a cada tecla.
- Autorização/história: Não ocultar selecionados nem misturar catálogo canônico
com identidades globais.
- Regressão: Filtro ocultar seleção ou tornar nomes similares indistinguíveis.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_INJECTED_READ_CATALOGS. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-005

Achado: [B1-FORM-005](12_FINDINGS_MASTER.md#b1-form-005).

- Pré-condição: Administrador do catálogo; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Cadastrar,consultar,editar/rejeitar código duplicado e ler
conversão em entrada manual/scan; histórico antigo mantém valor.
- Texto e visual: Por material: apresentação,código,quantidade base e situação.
Ação Revisar conversão; manter entrada manual e scanner opcional. Lista
filtrável por material com detalhe de equivalência1embalagem=Nunidades; editor
contextual.
- Comportamento/recuperação: Consultar antes de upsert; explicar efeito somente
prospectivo e proteger histórico existente.
- Autorização/história: Unidade de item com histórico não muda silenciosamente;
conversão não reescreve snapshot.
- Regressão: Alteração retroativa de unidade/conversão.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: PARTIAL_RENDERED_EDITOR;MANAGEMENT_GAP_STATIC. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-006

Achado: [B1-FORM-006](12_FINDINGS_MASTER.md#b1-form-006).

- Pré-condição: Administrador local; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: Editar função da mesma pessoa não altera outra; trocar alvo
requer fluxo explícito; revogação exige revisão própria e revalidação no
servidor.
- Texto e visual: Ao editar função, fixar pessoa e paciente. Para outra pessoa,
ação Adicionar vínculo; se houver substituição, resumo explícito de ambos os
destinos. Identidade fixa e função/status editáveis; CTA específica para novo
vínculo.
- Comportamento/recuperação: Não revogar automaticamente o anterior; exigir ação
explícita autorizada com trilha.
- Autorização/história: Identidade global separada de vínculo por paciente;
preservação de histórico e acesso de outro paciente.
- Regressão: Revogar acesso legítimo por inferência ou deixar antigo sem
orientação.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: REVIEWED_STATIC;EDITOR_PARTIAL;MUTATION_NOT_EXECUTED. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FORM-007

Achado: [B1-FORM-007](12_FINDINGS_MASTER.md#b1-form-007).

- Pré-condição: Administrador local; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: Inalterado,novo,vazio e espaços têm resultado definido e preview
consistente; backend e UI concordam; não altera outro paciente.
- Texto e visual: Nome curto opcional. Remover nome curto e usar nome completo,
como ação/valor explícito se permitido. Ajuda sobre fallback e preview do
header após mudança.
- Comportamento/recuperação: Distinguir campo inalterado,vazio intencional e
valor preenchido; não enviar null sem contrato.
- Autorização/história: Nome exibido não define autorização; não modificar
identidade/histórico por abreviação.
- Regressão: Null incompatível ou uso involuntário do nome completo em saída
externa.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: REVIEWED_STATIC_ONLY. Teste humano NOT_VERIFIED. Status do
aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-005

Achado: [B1-UX-005](12_FINDINGS_MASTER.md#b1-ux-005).

- Pré-condição: Emitente interrompido; contexto/paciente e versão conhecidos,
dados fictícios, capacidade real.
- Cenário-alvo: Mesma aba,nova aba,fechar sessão,expirar24h,trocar paciente e
mudar usuário têm comportamento/texto coerentes; nenhuma emissão duplicada.
- Texto e visual: Rascunho salvo nesta aba por até24 horas. Retome aqui antes de
fechar a sessão. Exibir hora e diferenciar rascunho no sistema de
preenchimento local. Status junto a Salvar e ao retomar,com paciente/usuário e
hora; aviso proporcional ao sair.
- Comportamento/recuperação: Corrigir promessa já; continuidade entre
dispositivos é decisão separada com segurança e retenção.
- Autorização/história: Chave por usuário/paciente; draft não é documento
emitido; tentativa incerta não é editável.
- Regressão: Expor preenchimento a outra pessoa no dispositivo ou duplicar
comando.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_SAME_TAB_AND_INDEPENDENT_TAB. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-VIS-001

Achado: [B1-VIS-001](12_FINDINGS_MASTER.md#b1-vis-001).

- Pré-condição: Todos os perfis; contexto/paciente e versão conhecidos, dados
fictícios, capacidade real.
- Cenário-alvo: Comparação visual antes/depois nos cincoviewports,focus,disabled
e alto contraste; nenhuma mudança sem consumidor demonstrável.
- Texto e visual: Padrão-alvo: Fluent2 com tokens semânticos,44px de conforto
móvel,focus visível,densidade de gestão explicitamente diferente da operação.
Preservar hierarquia sóbria e áreas de toque; documentar variantes
mobile/desktop e exceções para tabela/ícone.
- Comportamento/recuperação: Consolidar somente regras comprovadamente
redundantes em futura D; manter checkbox de seleção e switch de efeito
imediato distintos.
- Autorização/história: Não reduzir legibilidade/acessibilidade nem confundir
estado disabled com restrição definitiva.
- Regressão: Regressão por especificidade ou aumento de densidade indevido.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_MEASURED_SAMPLES. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-006

Achado: [B1-UX-006](12_FINDINGS_MASTER.md#b1-ux-006).

- Pré-condição: Família,supervisão,leitor autorizado; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Versões múltiplas,ator indisponível,catálogo alterado e
permissões limitadas mostram diff humano consistente com snapshot;
PDFversionado permanece acessível.
- Texto e visual: \[Pessoa\] registrou aquisição de \[itens\] em\[data\]. Mudou
\[campo\]: \[antes\] → \[depois\]. Manter evento e hash como detalhe técnico.
Timeline de negócio compacta,expandir comparação por versão; estado vigente
separado de história.
- Comportamento/recuperação: Diff usa snapshots autorizados imutáveis; não
recalcular passado com catálogo atual.
- Autorização/história: Histórico e hashes preservados; sem reescrever eventos.
- Regressão: Presenter omitir alteração relevante ou comparar com estado atual.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: PARTIAL_RENDERED_HISTORY;DIFF_OPPORTUNITY_STATIC. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-007

Achado: [B1-UX-007](12_FINDINGS_MASTER.md#b1-ux-007).

- Pré-condição: Família/supervisão/administrador local; contexto/paciente e
versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Mais de100 registros com pendência antiga; paginação sem
repetição/salto; deep link ref encontra alvo; total e rótulo explicam escopo.
- Texto e visual: Paginação/filtros explícitos e prioridade de pendências
abertas; total/limite visível. Auditoria por período/ator/objeto. Não exibir
lista recente como histórico completo; affordance de registros anteriores.
- Comportamento/recuperação: Cursor estável e deep link de ocorrência devem
localizar alvo autorizado independentemente da janela.
- Autorização/história: RLS por paciente e autorizações de custódia; preservar
FK/histórico.
- Regressão: Expor dados antigos sem autorização ou carregar lista infinita.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: REVIEWED_STATIC_CURRENT;VOLUME_RUNTIME_NOT_REPEATED. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-FEED-001

Achado: [B1-FEED-001](12_FINDINGS_MASTER.md#b1-feed-001).

- Pré-condição: Relator,família e aprovador; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Relatar,aceitar,rejeitar e recuperar tentativa mostram efeito e
próximo responsável exatos; histórico e saldos coincidem.
- Texto e visual: Relato registrado para revisão. O estoque ainda não foi
alterado. / Consumo confirmado no estoque \[custódia\]. / Relato rejeitado,sem
movimento. COM: Aquisição registrada; próximo passo \[etapa vigente\]. Status
persistente com código/objeto e link à reconsulta; não depender apenas de
toast.
- Comportamento/recuperação: Selecionar frase pelo comando e resultado
autoritativo; preservar invariantes de ciência/aceite e reconsulta.
- Autorização/história: Relato não debita; confirmação autorizada gera
movimento; não inventar sucesso de canal.
- Regressão: Mensagem prometer débito antes de commit ou dizer recebido após
compra.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_REAL_LOCAL_READBACK. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-DOC-001

Achado: [B1-DOC-001](12_FINDINGS_MASTER.md#b1-doc-001).

- Pré-condição: Leitor de PDF/ficha impressa; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: REQ nova/legada,zero,decimal,texto longo e versão antiga:
observação temporal correta e sem coluna de pedido; PDF mantém legibilidade.
- Texto e visual: Estoque observado na emissão: \[N unidade\] por material,com
título temporal claro. Não adicionar quantidade solicitada. Coluna/campo
legível em largura de papel e página longa; unidade explícita.
- Comportamento/recuperação: Usar snapshot da versão,com fallback de legado sem
inventar observação.
- Autorização/história: Não atualizar PDF histórico com saldo presente;
protocolo/hash não são assinatura digital.
- Regressão: Confundir estoque observado com saldo atual ou inventar dado
legado.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_PDF. Teste humano NOT_VERIFIED.
Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-A11Y-001

Achado: [B1-A11Y-001](12_FINDINGS_MASTER.md#b1-a11y-001).

- Pré-condição: Pessoa usando tecnologia assistiva ou navegação estrutural;
contexto/paciente e versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: LeitorPDF/NVDA navega título,tabela e rodapé em ordem; idioma
correto; HTML equivalente disponível; validar8 páginas e documento longo.
- Texto e visual: PDF com idioma pt-BR,headings,tabelas e ordem lógica; oferecer
HTML acessível equivalente de forma descoberta. Não alterar qualidade impressa
ao inserir estrutura; link de alternativa HTML próximo do download.
- Comportamento/recuperação: Escolher gerador/estrutura que suporte tags ou
definir alternativa equivalente com teste real.
- Autorização/história: Controle de acesso/versão/snapshots preservados; nenhum
conteúdo privado em portal público.
- Regressão: Adotar ferramenta sem suportar integridade/compatibilidade ou
emitir selo sem leitor real.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual:
STRUCTURE_AND_VISUAL_REVIEWED;ASSISTIVE_READING_NOT_VERIFIED. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-A11Y-002

Achado: [B1-A11Y-002](12_FINDINGS_MASTER.md#b1-a11y-002).

- Pré-condição: Operador de teclado/leitor de tela; contexto/paciente e versão
conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Escape,Voltar,Confirmar,Continuar eDescartar por teclado
em390/1440; foco nuncaBODY após tarefa; AT anuncia destino e dados
preservados.
- Texto e visual: Ao fechar,retornar ao gatilho ou alternativa lógica; ao
continuar,retomar último campo editado e anunciar que nada foi descartado.
Focusring visível na origem/último campo; sem scroll involuntário ao topo.
- Comportamento/recuperação: Guardar referência do gatilho/campo e restaurar
após transição; se removido,escolher destino lógico seguro.
- Autorização/história: Trap,Escape,proteção de edição suja e bloqueio de
resultado incerto continuam corretos.
- Regressão: Restaurar para elemento desmontado ou esconder erro ao fechar.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: BEHAVIOR_EXERCISED_KEYBOARD_AND_DELAYED_ACTIVE_ELEMENT.
Teste humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-A11Y-003

Achado: [B1-A11Y-003](12_FINDINGS_MASTER.md#b1-a11y-003).

- Pré-condição: Pessoa com celular estreito ou ampliação; contexto/paciente e
versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 320px,zoom nativo400%,300 caracteres contínuos/URL e nome longo:
sem rolagem global indevida; botões legíveis e conteúdo copiável.
- Texto e visual: Quebrar texto operacional contínuo dentro do card preservando
o conteúdo completo,sem truncamento silencioso. Revisão e listas contidas na
largura; overflow-wrap adequado nos consumidores de texto livre.
- Comportamento/recuperação: Testar conteúdo legítimo em todos os presenters
compartilhados,sem corrigir apenas esta captura.
- Autorização/história: Não alterar dado no banco,nem ocultar observação
completa.
- Regressão: Quebra excessiva em números/protocolos ou truncamento de conteúdo.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED;BEHAVIOR_MEASURED2190_320. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-NAV-002

Achado: [B1-NAV-002](12_FINDINGS_MASTER.md#b1-nav-002).

- Pré-condição: Família/supervisão/profissional consultando agenda;
contexto/paciente e versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: 390/768/1440,Semana/Mês,troca de data: rótulo,setas e intervalo
coincidem,sem ocultação silenciosa de resultados.
- Texto e visual: No móvel oferecer Dia/Agenda compatível,ou informar Exibindo
dia no celular e navegação mensal explícita se necessária. Nome do seletor
coincide com unidade exibida e setas; manter densidade móvel apropriada.
- Comportamento/recuperação: Não mudar regra de recorrência; só
seleção/representação da consulta.
- Autorização/história: Escala é previsão,sem presença; horários/fuso
preservados.
- Regressão: Criar grade ilegível ou quebrar filtro de intervalo.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: RENDERED_AND_INSPECTED_MOBILE. Teste humano NOT_VERIFIED.
Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-QA-001

Achado: [B1-QA-001](12_FINDINGS_MASTER.md#b1-qa-001).

- Pré-condição: Equipe que depende da evidência de release; contexto/paciente e
versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Reproduzir causa e passar fluxo afetado em desktop/móvel/WebKit
sem seleção transitória; CI completo necessário para gate,sem declarar6
testes=suíteinteira.
- Texto e visual: Esperar estado explícito e navegação correspondente ao
perfil/viewport antes de decidir rota de clique; guardar diagnóstico de
contexto sanitizado. Não aplicável à UI de produto; melhorar evidência e
seletor sem adicionar textos técnicos ao usuário.
- Comportamento/recuperação: Correção futura no helper com reprodução e execução
de desktop/móvel/WebKit; não aumentar timeout cegamente.
- Autorização/história: Não remover assertions nem enfraquecer guardas de
stack/dados.
- Regressão: Corrigir seletor escondendo problema de produto ou depender só de
timing.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual: CURRENT_CI_LOG_REVIEWED;TARGETED_LOCAL6_PASSED. Teste humano
NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## AC-B1-UX-008

Achado: [B1-UX-008](12_FINDINGS_MASTER.md#b1-ux-008).

- Pré-condição: Família com ciência automática habilitada; contexto/paciente e
versão conhecidos, dados fictícios, capacidade real.
- Cenário-alvo: Modo automático/expresso/desabilitado,topo apenas,scroll e
revisita têm eventos/textos coerentes; nenhuma ciência de leitor sem
capacidade.
- Texto e visual: Se critério continuar abertura: Automática · documento aberto
no aplicativo. Se exigir conteúdo,definir outro gatilho e versão de
política,sem alegar leitura cognitiva. Etiqueta de modo e explicação do evento
separada do aceite/atendimento.
- Comportamento/recuperação: Decisão semântica antes de mudar gatilho; manter
ciência expressa disponível e auditada.
- Autorização/história: Ciência não é aceite,nem leitura do provedor; nenhuma
ficção de consentimento.
- Regressão: Alterar significado histórico do evento ou bloquear entrega por
ciência.
- Execução futura: desktop1440,móvel390;320quando houver reflow; teclado e
leitor de tela nos elementos alterados; rede lenta/erro antes/depois do commit
quando houver escrita; versões históricas preservadas. Não aplicar matriz
cartesiana a estados sem pertinência.
- Observação atual:
REVIEWED_STATIC_CURRENT;AUTOMATIC_EVENT_NOT_REPEATED;EXPRESS_EXERCISED. Teste
humano NOT_VERIFIED. Status do aceite: NOT_IMPLEMENTED_FUTURE_TEST.

## Casos transversais de preservação

- Autorização: repetir comando com leitor,capacidade revogada,paciente de outro
vínculo e versão antiga. API e banco recusam independentemente do menu; não
alterar papéis para fazer teste passar.
- Perda de resposta: comparar hash/chave/payload antes e depois do commit. COM
já recuperou uma única aquisição; preservar esse mérito. Arquivo não pode ser
trocado em tentativa desconhecida.
- Integridade: emitir,versionar,consultar PDF e snapshot antigo após alteração
de catálogo/unidade. Não recalcular passado nem tratar hash como assinatura.
- Domínios: REQsem quantidade solicitada; COMcompra/doação não é entrega;
ENTaceita atende linha e move custódia; relato não debita antes de
confirmação; BALnão vira consumo automático.
- Acessibilidade: nome,role,estado,erro e descrição programática;
Tab/Escape/retorno; foco visível; contraste,inconclusivosaxe
resolvidos;320/200–400%nativo; alvos com exceçõesAA e meta de conforto44px.
- Interrupção: mesma aba,nova aba,logout,troca de paciente e retorno de rede.
Última consulta/resultado e alcance do draft explicitados; nenhuma fila de
escrita offline implícita.
- Canais: persistido,disponível no aplicativo,enviado,aceito pelo
provedor,entregue,lido e ciência independentes. Sem acesso a provedores,manter
NOT_VERIFIED para entrega externa.
- Primeiro uso: família e profissionais explicam em suas palavras o que foi
salvo e quem age a seguir. Medir hesitação/retrabalho sem ensinar fluxo
durante tarefa; dados pessoais fora doGit.
