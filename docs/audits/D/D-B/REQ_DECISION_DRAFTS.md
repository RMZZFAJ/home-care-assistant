# D3.42 — decisões de requisição com preparação privada

Base88a4b5b. Arquivar,cancelar e identificar item extra preservam motivo e
escolhas por ator/paciente/ficha/propósito. Campos incompletos, seleção
indisponível, comparação explícita e consulta pessoal seguem os componentes
canônicos, sem copiar estoque ou criar quantidade solicitada. Salvar não
arquiva,cancela,resolve,gera ciência ou movimenta estoque.

A confirmação salva antes da revisão e sela ação,motivo,item,produto,versão e
referência. Usa os comandos oficiais existentes, com autorização real na API
e no banco, inclusive após o journal privado. Cancelar preserva a conjunção
legada req.create+req.review. Perda de resposta conserva exatamente o pacote;
replay,consulta e reconhecimento próprios sobrevivem à perda de escrita.
Perda de leitura oculta o conteúdo. Resposta200 inválida não confirma sucesso.

A revalidação pessoal não oferece novamente a mesma revisão já retomada nem
substitui edição local. Resposta de salvamento sem hash vincula a identidade e
a revisão imutável confirmadas; leitura válida completa a base. Outra revisão
exige comparação explícita.200 privado inválido conserva a proteção e o foco
na recuperação; leitura válida devolve foco ao campo. O RecordDrawer também
evita retornar ao fieldset quando há um controle editável disponível.

34 unitários/API PASS;13 específicos repetidos após ajuste de disponibilidade.
16 identidades Auth distintas aprovadas por reuso qualificado:12 sucessos da
rodada principal,3 contraprovas de imutabilidade corrigidas e1 leitura histórica
real. CAS,privacidade,revogação tardia e mudança de referência após journal
verificam rollback de efeitos e consumo privado. Tentativas de transformar
material emitido em histórico foram recusadas pela guarda preservada.
Importações históricas reais sem lifecycle mantêm conclusão/arquivo NULL;
não se inventa obrigação operacional. Não houve nova importação ou reset.

20 identidades de navegador aprovadas:14 sucessos da rodada de16 e6 da
repetição dirigida,dez por motor. Os dois erros da rodada de16 motivaram a
correção da revisão sem hash. Registros interrompidos anteriores foram
preservados e não aprovam execução. A rodada final usa o modo diagnóstico do
runner oficial, com fontes congelados e sem suíte mutável paralela. Não é
build de produção:CI do SHA publicado continua obrigatória. Contratos legados
de PDF,ciência,material,scanner,trânsito e cancelamento foram preservados;
quatro larguras,axe e duas capturas de sucesso inspecionadas.

Migration175 final aplicada uma vez no remoto. Dry-run final vazio; nove
corpos normalizados,ACL,constraint e175 versões coincidem com o local. A
autoria local conserva statements intermediários, sem replay ou reescrita do
histórico. Advisors mantêm cinco classes; o RPC Auth novo acrescenta um aviso
esperado de SECURITY DEFINER autenticado,167→168, sem ampliar grants privados.

Matriz105x39 conserva primeiras30 colunas,56 PASS/49 PARTIAL e18 linhas visuais.
BAL contextual e paridade integral66/171 permanecem pendentes. Visual≈60% no
quadro temporário é estimativa editorial. CI88a4b5b falhou em foco mobile;
regressão local dirigida aprovada,sem converter essa CI antiga em verde.
Assinatura,backup,monitoramento e gates externos não recebem nova aprovação.
Sonar adiado pelo responsável;meta ativa,PR7 Draft,sem merge ou produção.

[Validação](REQ_DECISION_DRAFTS_VALIDATION.json),
[remoto](REQ_DECISION_DRAFTS_REMOTE.json),
[CI anterior](CI_88A4B5B_OBSERVATION.json).
