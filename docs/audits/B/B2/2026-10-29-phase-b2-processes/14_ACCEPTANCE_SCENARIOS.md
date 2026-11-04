# Cenários futuros de aceitação

Especificações para uma implementação futura autorizada, não testes
implementados
nesta auditoria. CadaACremete à evidência atual do achado e ao comportamento que
precisa ser preservado. Dados fictícios; Authreal; paciente/custódia explícitos;
leitura de banco independente; história, versão e movimentos antes/depois.

## Critérios por achado

### AC-B2-001

COM parcial não permite desistir formalmente do saldo não adquirido

**Preparar:** EmitirCOM10; adquirir2; validar chegada2; tentar cancelar pelo
motivo de desistência dos8; consultar linhas/estado.

**Resultado positivo:** Com10→2, encerrar8retira apenas previsão correspondente,
conserva estoque2, receipts e eventos; tentativa repetida recupera mesma
decisão.

**Resultado proibido:** Não inventar compra, entrada, devolução, atendimento REQ
ou apagar aquisição válida; recusar versão antiga e encerramento concorrente ao
fato físico.

**Decidir antes:** Quem dispensa/reabre e como distinguir não adquirido de
adquirido ainda esperado?

**Limite atual a superar:** Sem corrupção de saldo; recebimento parcial não
encerra prematuramente COM, hipótese contrária refutada emB22-06.

### AC-B2-002 — Pedido de cancelamento ENT não tem recusa ou retirada formal

**Preparar:** Receber ENT; pedircancelamento; destinatário tenta discordar;
examinar ação disponível e recusa RPC.

**Resultado positivo:** Recebedor recusa ou solicitante retira conforme política
aprovada; pendência tem destino conhecido e evento próprio.

**Resultado proibido:** Sem estorno, aceite inventado ou cancelamento total
unilateral; consentimento concorrente e dados obsoletos exigem revalidação.

**Decidir antes:** Qual decisão cabe a cada pessoa e qual estado permanece após
discordância?

**Limite atual a superar:** Não implica que cancelamento unilateral deva ser
permitido; aceite prévio e estoque foram preservados.

### AC-B2-003

ENT aguardando consentimento fica fora da fila padrão de trabalho

**Preparar:** CriarENTaceita; solicitarcancelamento; abrir /entregas como
destinatário no filtro inicial; compararTodas.

**Resultado positivo:** Destinatário vê pedido aberto na fila/painel; abrir leva
ao documento exato; resolvido sai da fila.

**Resultado proibido:** Não mostrar consentimento a terceiro como tarefa
executável; nenhum documento terminal ou sem capacidade vaza.

**Decidir antes:** Fila única por ação própria ou grupo explícito de
consentimentos?

**Limite atual a superar:** Não desaparecimento de dados; registro acessível em
Todas/histórico; frequência humana não medida.

### AC-B2-004

ENT com consumo confirmado continua sem conseguir concluir cancelamento

**Preparar:** Usar consumo extraordinário realmente confirmado no próprio
cenário após aceite2; tentar consent_cancel com retorno1/consumo1; comparar
versão, eventos e saldo.

**Resultado positivo:** Retorno1/consumo1 conclui uma vez; eventos e consumo
originais permanecem; retry não duplica movimentos.

**Resultado proibido:** Não debitar consumo novamente, não fabricar saldo e não
aceitar soma diferente do aceito; erros não deixam efeito parcial.

**Decidir antes:** Confirmar que somente consumo comprovado e elegível à entrega
pode ser conciliado

**Limite atual a superar:** Atomicidade correta; subhipótese de vinculação
temporal do consumo ficou atrás do erro e não foi comprovada; sem contorno
artificial.

### AC-B2-005

Correção de estoque familiar aceita ausência do movimento original

**Preparar:** Enviar correction_in como admin autorizado omitindo referenceId
por RPC e HTTP; consultar movimento persistido.

**Resultado positivo:** Correção exige movimento da mesma
residência/produto/escopo; origem e compensações são reencontráveis; avulsa
legítima continua.

**Resultado proibido:** Recusar referência ausente, alheia ou inválida; sem
editar/apagar ledger; sem arredondamento ou saldo negativo.

**Decidir antes:** Qual fato cada ação significa e quais referências podem
receber compensação múltipla?

**Limite atual a superar:** Não bypass de permissão; entrada familiar avulsa já
é legítima; HTTP201 comprovado, read-back retomado sem snapshot anterior.

### AC-B2-006

Conversão de embalagem não conserva como a quantidade base foi obtida

**Preparar:** Cadastrarfator10; consultar apresentação; emitirCOM20base;
alterarfator12; inspecionar metadata da linha e consumidor scan.

**Resultado positivo:** Dois pacotes×10 mantêm20base e fator original depois de
cadastro12; seleção manual sem código continua possível.

**Resultado proibido:** Sem converter unidade não equivalente, arredondar
silenciosamente ou aplicar fator atual a documento passado.

**Decidir antes:** Quais operações precisam guardar apresentação original para
conferência?

**Limite atual a superar:** Nenhuma leitura de câmera real; linha20foi enviada
por RPC; ausência de proveniência no scanner é sustentada por fonte; saldo
histórico não foi reinterpretado.

### AC-B2-007

Produto inativo com saldo não tem percurso próprio de esgotamento

**Preparar:** Criar saldo em ambas custódias; inativar; consultarvisibilidade;
tentar consumo/contagem; reativar explicitamente.

**Resultado positivo:** Saldo e história preservados; destinação tem
autor/motivo; lista informa inatividade; reativação é explícita.

**Resultado proibido:** Não zerar, somar a outro produto ou inferir
consumo/descarte; não liberar uso novo indevido.

**Decidir antes:** Inativo bloqueia tudo ou permite apenas destinação dos
remanescentes?Quem atesta o fato físico?

**Limite atual a superar:** Saldo não sumiu nem foi zerado; destino
físico/humano não verificado; inativação em si pode ser regra desejada.

### AC-B2-008

Histórico de estoque não conduz igualmente às origens de recibo, BAL e consumo

**Preparar:** Comparar referências dos créditos COM/ajustes BAL/consumo com
regra
de links do histórico.

**Resultado positivo:** Cada referência abre origem exata autorizada ou explica
restrição; contexto e filtros são preservados.

**Resultado proibido:** Não tratar receiptIDcomo documentID, nem revelar COM a
leitor de equipe; nenhuma permissão inferida do link.

**Decidir antes:** Que detalhe cada público pode consultar sem ampliar acesso à
família?

**Limite atual a superar:** Não perda de referências nem falha de persistência;
interação de todos os links não foi automatizada nesta B2.

### AC-B2-009

Supervisor pode aprovar a própria contagem no regime BAL anterior

**Preparar:** Usar supervisor real com capacidade de contar; configurar required
supervisorany sem ativação porplantão; criar BAL; tentaraprovar próprioID.

**Resultado positivo:** Contador de qualquer versão não revisa a própria
contagem nos modos aplicáveis; revisor distinto conclui e aplica uma vez.

**Resultado proibido:** Não remover regime para esconder defeito, não reutilizar
aprovação antiga nem confundir optional com autoaprovação manual.

**Decidir antes:** A independência é universal ou há exceção explícita de
política que precisa ser comunicada?

**Limite atual a superar:** Sem override ou falsificação; regime agendado
protegeu corretamente; optional não significa revisão manual própria.

### AC-B2-010 — Consumo só textual não pode ser complementado para confirmação

**Preparar:** Relatar consumo só textual como profissional; confirmador
autorizado tenta aceitar; examinar ações API/UI e estado reported.

**Resultado positivo:** Texto original continua consultável; quantidades têm
autor/data; confirmação única após esclarecimento autorizado.

**Resultado proibido:** Não interpretar texto como débito automático, não apagar
relato original nem permitir confirmação sem saldo/estrutura.

**Decidir antes:** Autor ou confirmador pode complementar e precisa nova
confirmação do autor?

**Limite atual a superar:** Proteção contra débito ambíguo é correta; falta sem
linhas pode ser confirmada sem saída; não generalizar a todo relato.

### AC-B2-011 — Decisão oposta de consumo recebe sucesso sem ser aplicada

**Preparar:** Confirmarrelatoestruturado; segundo admin envia accept: false
por HTTP; relerstatus, movimentos e resposta.

**Resultado positivo:** Retry igual recupera autor/data/decisão; oposto retorna
conflito legível com estado atual; zero novo movimento.

**Resultado proibido:** Não alternar confirmed/rejected retroativamente, não
estornar silenciosamente e não chamar rejeição de realizada.

**Decidir antes:** Se fato confirmado estava errado, qual procedimento
compensatório separado deve ser usado?

**Limite atual a superar:** Nenhum débito duplicado ou estorno; corrida
simultânea oposta é risco não reproduzido aqui; prova sequencial suficiente para
resposta contraditória.

### AC-B2-012

Adiamento BAL obsoleto permanece pendente e nem pode ser recusado

**Preparar:** Pediradiamento; alterarapenasnota do plantãodestino; refresh;
famíliatentarejeitar; compararestado e prazo.

**Resultado positivo:** Mudança de destino obsoleta pedido, retira ação
inexequível e conserva prazo original; aprovação antiga recusada.

**Resultado proibido:** Não aplicar intervalo antigo, não adiar por mudança de
agenda nem apagar solicitação histórica.

**Decidir antes:** Pedido stale deve encerrar automaticamente ou exigir
ciência/decisão familiar informada?

**Limite atual a superar:** Não houve adiamento indevido; origem continuou
válida; obsolescência limpa após contagem; sem prova de todas corridas do
scheduler.

### AC-B2-013 — Aprovação posterior republica plantões além do corte da série

**Preparar:** Propor3plantões; encerrar a partir dosegundo; aprovar com versão
atual; consultar ended_on, status e ocorrências.

**Resultado positivo:** Após corte nenhum plantão futuro volta a published por
aprovação repetida/concorrente; versão e motivos mantidos.

**Resultado proibido:** Não apagar cancelled, desfazer corte silenciosamente ou
gerar responsabilidades BAL sobre ocorrências indevidamente restauradas.

**Decidir antes:** Encerrada pode aprovar parte anterior ou deve ser terminal
para proposta?

**Limite atual a superar:** Sequência aceita por API/RPC; UI atual só oferece
encerrar série publicada; BALderivado não reproduzido; sem alegação de presença.

### AC-B2-014

Substituição durante reconto pode deixar tarefa sem contador executável

**Preparar:** Manter recontoactiveem ciclojácounted;
substituirprofissionalmesmaintervalo; refresh; consultarassignment;
revisordesigna outro; substitutoconta.

**Resultado positivo:** Substituto sabe se pode contar; revisor recebe ação
precisa; novo contador e autor original preservados; review por versão.

**Resultado proibido:** Não permitir contador anterior revogado, nem transferir
assinatura, horário ou revisão familiar implicitamente.

**Decidir antes:** Transferir automaticamente ou exigir revisor; como comunicar
intervalo sem responsável?

**Limite atual a superar:** Não generalizar a ciclo open/draft; recuperação
manual existente funcionou; não demonstrada perda definitiva de contagem.

### AC-B2-015 — Revogação de recebedor de ENT parcial não possui sucessão formal

**Preparar:** PrepararENTparcialcom1aceito/1transito; revogarrecebedor;
tentarreassign/aceiteadmin/consentsucessor; compararENTsemaceite e
outropaciente.

**Resultado positivo:** Revogação imediata preserva outro paciente e história;
ENTparcial tem encaminhamento claro com identidades próprias.

**Resultado proibido:** Não atrasar revogação urgente, reativar silenciosamente,
impersonar anterior, zerar saldo ou fabricar estorno.

**Decidir antes:** Quem atesta restante físico após saída e quem autoriza
sucessão de custódia?

**Limite atual a superar:** Salvaguardas corretas; sem apagamento; profissional
fictícia foi reativada só para outros testes, não como solução universal;
compensação física exige decisão humana.

### AC-B2-016

Reservas de anexo abandonadas esgotam o limite sem arquivos prontos

**Preparar:** EmREQfictícia reservardezanexoscomchavesdistintassemupload;
tentar11º; consultarestados.

**Resultado positivo:** Reservas abandonadas não bloqueiam para sempre; retry
idêntico e upload em andamento preservados; história da liberação verificável.

**Resultado proibido:** Não apagar ready, não expor URLassinada, não liberar
reserva concorrente ativa e não aumentar limite sem tratar ciclo.

**Decidir antes:** Quando considerar abandono, quem pode cancelar e quais
metadados permanecem?

**Limite atual a superar:** Retry com chave conhecida consegue retomar; não
executada limpeza, expiração ou sobrescrita; abandono por usuário simula
interrupção antes de arquivo.

### AC-B2-017

Pendência antiga de consumo não é alcançada pelo contador ou referência

**Preparar:** Relatarfaltapendente; criar100posterioressemdebitarestoque;
GETcomref; compararcontador e SQLdoalvo.

**Resultado positivo:** Maisde100relatos: refabre alvo correto, cursor sem
salto/duplicação, total/escopo claro; estado atual fica acionável.

**Resultado proibido:** Sem carregar tudo, duplicar registros, expor outra
custódia/paciente ou resolver falta por débito; limite maior sozinho não
satisfaz.

**Decidir antes:** Quais filtros/ordenação atendem família sem esconder
pendentes antigas?

**Limite atual a superar:** Sem perda de dados; UIcemlinhas não foi renderizada;
navegação estática acompanha API; novo loteB2executado comAuthreal.

## Sequências de preservação entre processos

- **ID:** AC-X01; **Sequência futura:** REQ
  arquivada→cancelar ENT→devolver→reabrir; **Prova positiva:** Necessidade atual
  e motivo anterior reencontráveis; PDF antigo idêntico; **Recusa/preservação
  exigida:** Nenhuma reescrita de arquivo ou débito fictício

- **ID:** AC-X02; **Sequência futura:** Dois admins aprovamCOMv1simultaneamente;
  **Prova positiva:** Uma decisão e um conflito legível; **Recusa/preservação
  exigida:** Sem duas versões aplicadas ou estoque por aprovação

- **ID:** AC-X03; **Sequência futura:** Perda antes/depois decommit; recarga;
  revogação; **Prova positiva:** Mesma chave/intenção recupera; alvo autorizado
  consultável; **Recusa/preservação exigida:** Sem multiplicar aceite; revogação
  não ignorada por idempotência

- **ID:** AC-X04; **Sequência futura:** PolíticaBALmuda durante revisão; **Prova
  positiva:** Documento conserva regra capturada e revisões porcount_version;
  **Recusa/preservação exigida:** Aprovação antiga não aplica contagem nova;
  contador não revisa a si

- **ID:** AC-X05; **Sequência futura:** Troca de profissional entre pacientes;
  **Prova positiva:** Outro contexto legítimo preservado; conflito agenda
  privado; **Recusa/preservação exigida:** Sem vazamento de nome/agenda ou poder
  global automático

- **ID:** AC-X06; **Sequência futura:** Pausar regime com obrigação/reconto
  aberto; **Prova positiva:** Pendência e atraso continuam visíveis/executáveis
  conforme regra; **Recusa/preservação exigida:** Sem apagar semanas ou voltar
  silenciosamente a modo anterior

- **ID:** AC-X07; **Sequência futura:** Produto inativo/precisão/apresentação
  alterada; **Prova positiva:** Destino do saldo e equivalência histórica
  verificáveis; **Recusa/preservação exigida:** Sem reinterpretar unidade ou
  arredondar; sem merge de identidades

- **ID:** AC-X08; **Sequência futura:** Aviso visto→ciência→atendimento→arquivo;
  **Prova positiva:** Cada fato tem responsável e evidência própria;
  **Recusa/preservação exigida:** Visto/leitura/despacho não se tornam aceite
  físico

- **ID:** AC-X09; **Sequência futura:** Lifecycle com terminais antigos e vários
  pacientes; **Prova positiva:** Lotes progridem entre todos elegíveis e não
  lembram canceladas; **Recusa/preservação exigida:** Sem monopólio por paciente
  ou cursor que salta trabalho

- **ID:** AC-X10; **Sequência futura:** Provedor incerto/revogação/webhook
  tardio; **Prova positiva:** Conciliação correlacionada e continuidade pelo
  aplicativo; **Recusa/preservação exigida:** Sem reenvio cego ou duplicar
  intenção humana; homologação externa autorizada

- **ID:** AC-X11; **Sequência futura:** Interrupção e ficha física→retomada;
  **Prova positiva:** Autor, fato e origem reconhecidos; restore integral
  aprovado; **Recusa/preservação exigida:** Sem importar ausente como zero, sem
  duplicar estoque ou identidade

## Aceitar ou abandonar propostas de produto

O01–O20 têm medidas próprias no
[catálogo12](12_NEW_FUNCTIONALITIES_AND_PROCESS_GAPS.md).
Antes/depois precisa usar tarefas equivalentes e participantes dos públicos
afetados.
Medir erro de decisão, pedidos de ajuda, redigitação, tempo até localizar
próxima tarefa e
pendências sem agente. Não há meta percentual fundamentada nesta B2. O10 já
possui
capacidade parcial/adequada e não deve ser criado de novo; hipóteses só avançam
após
necessidade demonstrada. Benefício ausente ou risco maior justifica abandonar
proposta.

Nenhum aceite futuro está marcado como cumprido pela mera descrição. Gates
humanos,
aparelhos, provedores, restauração e produção dependem de autorização/ensaio
próprios.
