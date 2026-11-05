# Homologação e critérios de aceitação

Esta matriz separa evidência do SHA auditado de aceites futuros. Nenhuma linha
autoriza implantação, envio externo ou alteração de ambiente remoto. Resultado
geral atual: NO-GO. Revisão em 28/10/2026.

Estados: PASS_LOCAL = aprovado no cenário local; CONFIRMED_DEFECT = defeito
demonstrado; RISK = risco sustentado; HYPOTHESIS = precisa de reprodução;
NOT_VERIFIED = não examinado no nível exigido. Aprovação de uma camada não
aprova automaticamente a próxima.

## Gates antes de qualquer operação com dados reais

### H01 — Identidade, autoridade e isolamento

Estado: PASS_LOCAL para a suíte SQL/HTTP e os cenários E2E executados.
Evidência: replay, 33 integrações, acesso negativo entre pacientes, vínculos
revogados, proteção do último administrador, TOTP e guards. Limite: não é
pentest integral nem smoke do destino de produção.

Aceite: repetir no SHA de release após mudanças; exercer administrador global
sem vínculo, administrador de A contra B, profissional, supervisor, família,
leitor, usuário revogado e sem vínculo. API e RPC recusam operações indevidas;
Storage/PDF não expõem dados ao visitante. Responsável: engenharia/segurança.

### H02 — Ledger e correção de documentos

Estado: PASS_LOCAL nos fluxos cobertos, CONFIRMED_DEFECT em DB-001. Correção
de erro é função essencial, não opção de pós-lançamento.

Aceite: ENT parcial, divergência, consumo revisado, cancelamento com consumo
positivo e devolução integral preservam custódia e histórico. Depois de sanar
42702, executar a sub-hipótese temporal de DB-001 com consumo de entrega antiga
e atual. BAL concorrente e referência stale continuam protegidos. Responsável:
engenharia de domínio; validação operacional por supervisão/família.

### H03 — Decisões e ciência compreensíveis

Estado: CONFIRMED_DEFECT UX-001/002. Autoridade técnica não garante decisão
informada. Aceite: mudança de escala mostra profissional, dia, intervalo atual,
proposto, impacto e motivo; versão stale exige nova revisão. Ciência automática
só corresponde ao conteúdo apresentado conforme política e consentimento
aprovados. Nenhum observador de viewport comprova compreensão humana.

Responsáveis: produto, administradores e equipe assistencial. Validar em desktop
e celular; escolher política de ciência expressa/automática e texto correto.

### H04 — Tentativa incerta, falha e retomada

Estado: CONFIRMED_DEFECT UX-003/004/012; RISK UX-007 e DB-004.
Aceite: resposta perdida não permite trocar silenciosamente o payload de uma
tentativa incerta; reconciliar antes de novo envio. Loading, falha e vazio têm
mensagens distintas. Prazo configurado é respeitado sem regressão de sucesso.
Rascunho declara armazenamento e duração reais. Reservas abandonadas não tornam
anexos definitivamente indisponíveis. Responsável: frontend/backend, com usuário
executando recuperação sem orientação do desenvolvedor.

### H05 — Trabalho pendente sempre localizável

Estado: limites estáticos BE-001/004; UX-005 dificulta revisão de proposta;
BE-005 pode duplicar propostas em retry. Aceite: registro 101 antigo permanece
buscável e acionável, link de notificação abre o alvo autorizado, histórico
encontra autor/data/protocolo. Proposta mostra diferença legível e tentativa
preserva chave e conteúdo. Responsáveis: produto e backend.

### H06 — Recuperação e responsabilidade operacional

Estado: NOT_VERIFIED para recuperação integral atual do destino real (OPS-001).
Replay local e backup histórico não substituem esse aceite.

Aceite: destino explicitamente selecionado, backup verificável, restauração
ensaiada, login por papel, objetos e PDFs acessíveis, ledger reconciliado,
jobs e segredos restaurados pelo responsável sem colocá-los no Git. Definir
RPO/RTO, retenção, suporte, contingência e reconciliação manual. A alternativa
física/foto precisa de responsável e trilha, nunca ajuste informal de saldo.

### H07 — Gate de release reproduzível

Estado: unitários 98/98; integrações 33/33; replay e gates de código aprovados;
E2E 119/120 e repetição 2/3, portanto não aprovado integralmente.

Aceite: resolver QA-001 com espera por shell conhecido, sem remover o teste,
aumentar timeout sem causa ou relaxar autorização. Rodar a matriz inteira
no SHA candidato e repetir o caso afetado. Registrar build, CI e smoke do
deployment que realmente será usado. Responsável: engenharia de qualidade.

## Gates por funcionalidade e escala

### H08 — Automação multipaciente

Estado: DB-002 CONFIRMED_DEFECT; DB-006 RISK; BE-003 risco com relógio virtual.
Obrigatório antes de confiar em lembretes automáticos ou ampliar a operação.
Aceite: canceladas/encerradas não ocupam indefinidamente o lote; cada paciente
elegível avança com limites 25/100; retries e lease não duplicam efeitos.
Medir orçamento do worker no limite configurado e registrar filas incertas.
Para piloto sem essa automação, documentar tarefa manual, periodicidade e dono;
isso é decisão futura, não aceite concedido por este documento.

### H09 — Escalas, encerramento e atualização ao vivo

Estado: DB-003 HYPOTHESIS, DB-007 evidência estática de invalidação incompleta.
Aceite: encerrar série proposta e depois aprovar não republica após o cutoff;
concorrência e versão preservadas. Alteração de perfil/proposta global atualiza
o destinatário correto sem depender de reload. Revalidar autorização mesmo
com UI stale. Responsável: banco/backend; fluxo humano por administrador.

### H10 — Integrações externas

Estado: contratos/probes locais examinados; provedor real NOT_VERIFIED.
Antes de habilitar: resolver BE-002, conferir registry/template, número,
destinatário, vínculo, opt-in, webhook assinado e reenvio idempotente; observar
enviado/entregue/lido sem confundir com ciência ou recebimento. OAuth e SMTP
exigem fluxo real de login/recuperação no domínio escolhido. Meta Flows exigem
persistência, revisão e publicação confirmadas no provedor; JSON local válido
não basta. REPO-003 deve permitir inspeção sem submissão implícita.

Responsáveis: operador do provedor e engenharia. Envio somente com autorização
correspondente. Enquanto pendente, flags externas desligadas e acompanhamento
interno/manual comunicado. Indisponibilidade externa não pode apagar documentos.

### H11 — Dispositivo, acessibilidade e compreensão

Estado: inspeção Chromium atual, 14 dashboards prontos e E2E em três projetos;
hardware e validação humana NOT_VERIFIED.

Antes do uso pela profissional, executar REQ, ENT parcial, ocorrência, BAL,
anexo e retomada em aparelho real: toque com uma mão, teclado numérico,
câmera negada/aceita, rede intermitente, orientação, safe area, foco, zoom,
contraste e leitor de tela. Conferir mensagens com família e supervisão;
o usuário deve explicar quem age depois e o que foi realmente concluído.
PDF de 14 linhas foi inspecionado em quatro páginas; impressão e QR físico
ainda exigem aceite. Não usar média de acessibilidade para ocultar barreira.

## Melhorias que podem seguir após gates essenciais

BE-006/DB-005 pedem medição de volume, payload e latência antes de otimizar.
BE-007 é oportunidade editorial do PDF de REQ, condicionada à decisão de
mostrar estoque observado sem inventar quantidade solicitada. UX-008/009
consolidam componentes e histórico legível; UX-006 organiza vocabulário.
UX-010/011 e REPO-002 tratam limpeza/evidência, com preservação de URLs.

P3 não bloqueia sozinho o lançamento. Um P2 só pode ser adiado quando seu
fluxo estiver fora do escopo aprovado ou houver contingência demonstrada;
documentar consequência, dono, data de revisão e gatilho para retomar.
Segurança, correção de saldo e recuperação essencial não são dispensáveis.

## Registro de aceite futuro

Para cada gate, registrar ID, SHA, ambiente, data, executor, usuário validador,
cenário, resultado, evidência, limitações e decisão. Para exceção, registrar
escopo desabilitado, alternativa, dono e prazo. Nenhuma assinatura ou decisão
de familiar/profissional foi inventada nesta auditoria.
