# Decisões que ainda precisam do responsável

A finalidade dos recursos já foi decidida. As escolhas abaixo ajustam limites
de uso e responsabilidade; **nenhuma recomendação é aprovação**. Todas estão
`PENDING_OWNER`, mesmo quando parte da questão já foi resolvida. A C pode
concluir o desenho condicional; D só implementa o ramo com contrato
autorizado.
Não são quinze perguntas a responder agora para continuar a documentação.

## P01 — Como identificar e verificar um profissional

**A:** nome individual, função e registro quando aplicável, claramente
“informado”; menor custo, não comprova credencial. **B:** esses dados com
conferência humana registrada; exige responsável e rotina. **C:** integração
de validação externa; custo, privacidade e disponibilidade adicionais, ainda
sem fornecedor aprovado. Recomendação não aprovada: B para os dados realmente
necessários, sem bloquear revogação por cadastro incompleto. D1/D3 aguardam
campos obrigatórios e quem verifica. Nenhum número fictício vira credencial.

## P02 — Quais documentos podem ter ciência presumida

**A:** somente manual; simples, aumenta tarefas e não atende sozinho à direção
de oferecer três modalidades. **B:** preferência individual por tipo com lista
de atos excluídos; preserva escolha e impede presumir recebimento. **C:**
mínimos
por residência além das preferências; exige governança e explicação de
conflito.
Recomendação não aprovada: B, com C apenas se o responsável definir mínimos.
O acesso sempre terá trilha própria; recebimento ENT e aprovação operacional
nunca são substituídos. D2/D5 bloqueiam apenas a política tácita até a
definição.

## P03 — Quanta informação pode ser perdida e quanto tempo pode ficar parado

**A:** backup periódico externo e recuperação manual; custo menor, maior
janela
de perda/parada. **B:** mecanismo de recuperação mais frequente com ensaios;
reduz janela e aumenta custo/operação. **C:** redundância adicional, só se o
impacto justificar. Recomendação não aprovada: escolher A/B por capacidade e
medir o ensaio antes de prometer RPO/RTO. Não há valor numérico aceito. D6
exige
frequência, destino, retenção, titular e substituto, incluindo arquivos/Auth.

## P04 — Onde ficará a operação real

**A:** projeto separado de teste/preview; melhor isolamento, configuração e
custo próprios. **B:** destino atual após inventário e segregação formal;
maior risco de mistura e configuração indevida. **C:** adiar operação até
dispor de A. Recomendação não aprovada: A; nenhuma criação ou transferência
foi autorizada em C. D0/D6 não usarão fixture em destino real nem restaurarão
o backup da auditoria sobre dados de operação.

## P05 — Quem autoriza e confere a contingência

**A:** administrador local e substituto identificados aprovam registros do
paciente; suporte trata sistema. **B:** dupla conferência para movimentos de
maior risco; esforço adicional, reduz decisão unilateral. **C:** suspender
lançamentos digitais e manter registro físico até o titular retornar; acumula
pendências. Recomendação não aprovada: A com B nos fatos críticos escolhidos.
D6 exige nomes, substitutos, canal e rotina; suporte não assina recebimento.

## P06 — Como indicar recebedor quando não há escala adequada

Resolvido: DEC-028 torna a escala uma sugestão editável e o aceite pessoal
indelegável. **A:** escolher pessoa vinculada/capaz manualmente, com motivo;
permite operação sem confundir agenda e presença. **B:** exigir regularização
da escala antes da expedição; mais controle e potencial atraso. **C:**
registrar
pendência física por contingência, sem emitir aceite fictício. Recomendação
não
aprovada: A se elegibilidade for satisfeita e houver confirmação da
identidade;
C se não houver pessoa apta. D2 depende da regra de exceção, nunca de terceiro
confirmar em nome do recebedor.

## P07 — Transferência simples e confirmação da contraparte

**A:** interface simples cria ENT; contraparte valida a declaração e o efetivo
recebedor confirma o físico em atos separados quando forem pessoas diferentes.
Reutiliza trânsito/ledger e exige explicar dois fatos. **B:** documento
próprio
de transferência bilateral, com máquina equivalente; maior custo e risco de
duplicar motores. **C:** manter apenas ENT completa até validar a
simplificação.
Recomendação não aprovada: A; C é caminho condicional sem inventar nova ficha.
D2 aguarda escolha. Contraparte familiar confirmando relato de profissional
que recebeu não pode produzir o aceite pessoal desse profissional.

## P08 — Por quanto tempo guardar cada categoria

**A:** matriz conservadora por finalidade/base/prazo e suspensão por litígio;
exige avaliação jurídica/operacional. **B:** prazo técnico único para tudo;
mais simples, inadequado a classes diferentes. **C:** guardar indefinidamente;
não atende à direção de retenção justificada. Recomendação não aprovada: A.
Não se fornece prazo legal sem análise aplicável. D4/D6 dependem da política
para arquivos, eventos, acesso, push, rascunhos, backups e originais
restritos.

## P09 — Como terceiros verificarão um PDF

Já aprovado: comparar bytes com referência confiável. **A:** verificador de
hash e registro final protegido, sem assinatura incorporada; menor custo,
depende da confiança no serviço. **B:** assinatura criptográfica do sistema
com verificação de chaves; autentica origem técnica, amplia governança.
**C:** certificado pessoal qualificado/carimbo externo; escopo e custo ainda
não aprovados. Recomendação não aprovada: A primeiro, avaliar B por uso; C não
é requisito presumido. D4 pode desenhar o núcleo A; extensão aguarda escolha.
O QR não prova bytes nem a realidade do ato.

## P10 — Quem e quais aparelhos participarão do aceite

**A:** aparelhos/navegadores reais dos primeiros usuários, AT relevantes e
impressora usada; representativo e proporcional. **B:** laboratório amplo;
maior custo sem substituir os usuários. **C:** apenas emulação; insuficiente
para os gates físicos/humanos. Recomendação não aprovada: A, complementado por
B se surgir lacuna. D6 aguarda participantes e matriz de OS/versão/browser,
rede, teclado, leitor de tela e impressão. Nenhum aceite físico ocorreu em C.

## P11 — Supervisão e leitura no primeiro uso

**A:** adiar capacidades próprias e configurar revisão familiar legítima onde
for permitida; menor escopo. **B:** incluir o mínimo necessário da supervisão
quando a política BAL escolhida a exigir. **C:** ativar todos os perfis;
aumenta
homologação. Recomendação não aprovada: A/B conforme a residência, nunca
excluir
uma revisão obrigatória para conseguir verde. D2/D6 exigem política que tenha
pessoas efetivamente elegíveis. Guias de supervisão continuam no plano.

## P12 — Quando um rascunho pode ser abandonado

Já aprovado: sobreviver a dias e aparelhos. **A:** conservar até descarte com
revisões de retenção; recuperável, maior acúmulo. **B:** prazo por classe com
aviso e recuperação durante janela aprovada; exige regra e custo de custódia.
**C:** manter 24h por aba; não atende DEC-012. Recomendação não aprovada: B,
sem prazo inventado. D3 pode construir versionamento/retomada; expiração e
exclusão aguardam P08/P12. Descartar afeta somente o rascunho.

## P13 — Quando uma automação deve chamar alguém

**A:** limites por tarefa (idade da fila, próxima execução, tentativa incerta,
backup/restore e indisponibilidade) com dono e substituto; requer capacidade
de resposta. **B:** aviso agregado diário; menor esforço, pode atrasar ação.
**C:** observar HTTP 200; insuficiente para provar progresso. Recomendação não
aprovada: A com revisão proporcional do volume, B só nas tarefas tolerantes.
D5/D6 dependem dos prazos, pessoas e teto de custo; não derivar SLO de mocks.

## P14 — Quando encerrar COM menor que o previsto

**A:** concluir a ficha só após validação das parcelas físicas e dispensa
expressa do que não será adquirido. **B:** encerrar apenas expectativa de
novas
aquisições, mantendo validações pendentes visíveis e sem dizer “concluída”.
**C:** nova revisão aprovada da previsão antes da dispensa; mais etapas.
Recomendação não aprovada: A como percurso simples, B quando recebimentos
pendentes exigirem continuidade separada. Finalidade já aprovada em DEC-004;
D2 aguarda o ponto de fechamento. Recebidos 2 de 10 continuam 2, sem crédito
8.

## P15 — Até quando revogação impede uma operação iniciada

**A:** revalidar após lock e antes do commit, negar operação ainda não
confirmada; arquivo por proxy revalidado ou janela temporária explicitamente
aceita. Maior proteção e custo técnico. **B:** impedir apenas novas intenções,
permitindo a já autorizada concluir; simplifica, mantém janela residual que
precisa aceite explícito. **C:** pausar e conciliar operações em andamento;
não substitui a barreira de acesso e aumenta trabalho. Recomendação não
aprovada: A no comando transacional; para envio já aceito, conciliação e
limite
honesto. D1/D4/D7 aguardam garantia/TTL aprovada. Nova chamada após revogação
sempre é recusada; baixar novamente não recolhe cópia que já saiu.

## Registro de resposta e conflitos resolvidos

Responder futuramente por ID, opção, exceção, responsável e data. Uma revisão
documental atualiza o registro, preserva a anterior e aponta a especificação
afetada. Não se muda silenciosamente contrato para ajustar uma tela.

Decisões já suficientes: zero/ausência distintos; ENT aceita pessoalmente;
Sheila pode fazer novo reconto sem assumir autoria de Juliana; revogação não
aguarda pendências; O05/O11 aprovadas; O10 existe; O17/O18 e WhatsApp adiados.
Esses pontos não serão reabertos como se faltasse aprovação. Rejeitadas por
regra expressa: aceite por terceiro, ciência chamada leitura integral, débito
por interpretação livre, saldo zerado para inativar, reset/fixtures em
operação.
