# B7.10 — Incidentes, contingência e retorno à operação

## Procedimento comum proposto

Não há aceite operacional demonstrado de um runbook integrado para residência,
suporte e infraestrutura. Há controles e recuperação em fluxos individuais, já
analisados por B1/B2/B4/B5. As matrizes abaixo propõem uso coordenado desses
controles; não criam processo humano definitivo nem autorizam ação remota.

Quem identifica o incidente deve preservar hora, paciente sob acesso autorizado,
tipo/protocolo/versão, ação pretendida, correlação segura e estado conhecido.
Não registrar senha, token, URL assinada, payload clínico ou dump em chamado. O
responsável técnico delimita serviço, alcance e ponto de corte. O responsável
operacional decide continuidade física segura e consulta a família/equipe. Um
substituto e um canal de contato fora do aplicativo precisam de aceite.

Conter somente o domínio necessário, conservar pendências, bloquear reenvios
incertos e evitar tentativas paralelas com novas chaves. Registrar o fato físico
em ficha/foto autorizada quando a aplicação não estiver disponível. Não afirmar
que essa contingência já foi treinada, nem que toda tarefa pode continuar.
Nenhuma comunicação a terceiros foi enviada por esta auditoria.

## Matriz de incidentes

- **I01 Internet: operador vê falha/timeout**. **Impacto e contenção:** Jornada
  web indisponível; não emitir tentativas novas às cegas. **Registro e
  reconciliação:** Ficha física, hora/fato/custódia; consultar estado oficial
  após rede. **Retorno / responsável sugerido:** Recuperar intenção original e
  verificar persistência; residência + suporte.
- **I02 DB: erros de dependência/correlação**. **Impacto e contenção:** Escritas
  e leituras autorizadas falham; parar confirmação digital. **Registro e
  reconciliação:** Preservar corte e fatos externos; nunca editar saldo direto.
  **Retorno / responsável sugerido:** Integridade e smoke de leitura/escrita
  autorizado; técnico.
- **I03 Next fora do ar: shell/API indisponível**. **Impacto e contenção:** Sem
  operação web; nenhum efeito externo deve ser presumido revertido. **Registro e
  reconciliação:** Correlacionar último release e respostas incertas. **Retorno
  / responsável sugerido:** Artefato/schema compatíveis e jornada essencial;
  release.
- **I04 Storage: upload/download/PDF503**. **Impacto e contenção:**
  Evidências/comprovantes falham; conservar registro/documento já salvo.
  **Registro e reconciliação:** Reservas, paths/hashes em acesso técnico e
  origem física. **Retorno / responsável sugerido:** Relacionar
  objeto/metadado/hash, sem sobrescrever; recuperação.
- **I05 Auth: login/refresh indisponível**. **Impacto e contenção:** Não criar
  usuários paralelos nem compartilhar senha. **Registro e reconciliação:**
  Identidades e contexto aprovados; registrar revogação necessária. **Retorno /
  responsável sugerido:** Login/renovação/revogação por papel; acesso.
- **I06 WhatsApp desligado/indisponível**. **Impacto e contenção:** Documento
  permanece; obrigação externa não desaparece. **Registro e reconciliação:** App
  e contato humano acordado; conservar pending/uncertain. **Retorno /
  responsável sugerido:** Homologação/configuração/conciliação antes de ligar;
  comunicação.
- **I07 Worker parado: backlog/lease envelhece**. **Impacto e contenção:** Cron
  verde não basta; não reenviar lote antigo. **Registro e reconciliação:**
  Estado/tentativa/referência e efeito externo, B5-013/014. **Retorno /
  responsável sugerido:** Claim/conclusão sob prazo e sem duplicar;
  técnico/comunicação.
- **I08 Cron sem progresso: health recente com elegíveis antigos**. **Impacto e
  contenção:** DB-002 pode bloquear REQ; não arquivar incompleta para liberar
  lote. **Registro e reconciliação:** Pendências reais e responsável por
  consulta manual. **Retorno / responsável sugerido:** Progresso por paciente e
  backlog alcançável; operação.
- **I09 PDF indisponível: documento existe, arquivo não retorna**. **Impacto e
  contenção:** Não repetir emissão nem inventar original. **Registro e
  reconciliação:** Código/versão/hash canônico e objeto/bytes distintos.
  **Retorno / responsável sugerido:** Recuperar versão correta com hash, B6-011;
  técnico/documental.
- **I10 Resposta perdida após etapa persistida**. **Impacto e contenção:**
  Edição/documento pode existir apesar de erro. **Registro e reconciliação:**
  Preservar mesma chave, versão e resultado por etapa. **Retorno / responsável
  sugerido:** Consultar/recuperar, não novo documento, B4-002/003/004; operador.
- **I11 Profissional perde acesso durante plantão**. **Impacto e contenção:**
  Não emprestar conta nem conceder global como atalho. **Registro e
  reconciliação:** Vínculo/sessão/capacidade e fatos físicos já ocorridos.
  **Retorno / responsável sugerido:** Administrador decide acesso/substituição
  com trilha; acesso + família.
- **I12 Familiar não consulta ENT**. **Impacto e contenção:** Ausência de
  consulta não é aceite; materiais podem estar em trânsito. **Registro e
  reconciliação:** Confirmar documento/destinatário e fato físico por canal
  aprovado. **Retorno / responsável sugerido:** Restabelecer acesso e decisão
  autorizada; família + suporte.
- **I13 Confirmação ocorre durante interrupção**. **Impacto e contenção:** Outra
  pessoa pode ver estado anterior; parar dupla confirmação. **Registro e
  reconciliação:** Conferir evento/ledger/versão e recebedor real. **Retorno /
  responsável sugerido:** Uma confirmação efetiva e custódia conciliada;
  operador + destinatário.
- **I14 Ficha física precisa entrar no sistema**. **Impacto e contenção:** Não
  converter papel em movimento presumido ou data falsa. **Registro e
  reconciliação:** Origem, autor, horário do fato e do registro,
  material/unidade/quantidade entregue. **Retorno / responsável sugerido:**
  Percurso aprovado de registro/reconciliação; família/equipe.
- **I15 Retorno após horas: backlog/fatos e canais defasados**. **Impacto e
  contenção:** Não liberar jobs todos antes da conferência. **Registro e
  reconciliação:** Conciliar estoque físico, documentos, consumo, escala/BAL e
  mensagens. **Retorno / responsável sugerido:** Critério por domínio e
  responsável, sem pendência ocultada; coordenador.

## Regras de domínio que impedem atalhos perigosos

REQ informa necessidade, estoque observado e exceções, sem quantidade
solicitada. Entrega física conserva quantidade efetivamente expedida/recebida,
unidade, origem/destino e destinatário; somente aceite positivo autorizado
credita destino. COM exige recebimento validado para incorporar material
familiar. Ciência não é recebimento físico. Relato de consumo não é débito
automático. Escala não é presença; atraso BAL não se apaga criando contagem
retroativa fictícia.

O saldo oficial continua ledger. Uma contagem física é evidência a conciliar,
não permissão para reescrever o saldo ou apagar movimento. Se houve consumo ou
devolução durante o corte, registrar o fato pelo fluxo autorizado aprovado, com
referência que explique a diferença. Não duplicar uma ENT já persistida porque o
comprovante falhou. B2/B3 delimitam ramos atualmente sem fechamento adequado;
não afirmar que a contingência corrige esses defeitos.

## Retorno de ficha física para registro digital

Proposta sujeita a aceite: responsável único inventaria fichas/fotos
autorizadas, identifica residência, pessoas, evento físico, horário confiável ou
desconhecido, materiais/unidades/quantidades entregues, exceções e referência
única da origem. Confronta com documentos/eventos/ledger existentes e
confirmações do destinatário. Classifica em já registrado, intenção parcialmente
persistida, fato externo a incorporar, divergência e incerteza. Uma segunda
conferência valida material, custódia e ligação ao fato; anexar evidência não
aplica movimento por si só.

Os fluxos atuais de importação/histórico não devem ser usados como substituto
implícito de movimentação real; seus efeitos precisam ser avaliados antes de
escolher o percurso. Não inventar um endpoint de reconciliação existente nem
impor SQL manual ao responsável não técnico. A decisão futura deve preservar
hora do fato e hora do registro, autoria, histórico anterior e autorização.

Rascunho local expira em 24h; seu desaparecimento não prova que nada foi salvo.
Conservar referência da ocorrência e consultar o estado oficial. Uma chave
idempotente nova só representa intenção nova depois de resolver a anterior.
Retries de mensagem uncertain exigem confronto com provedor; retries de
movimento exigem confronto com o fato físico e o ledger. São conciliações
distintas.

## Critério de normalização e ensaio

Aplicação, Auth e DB acessíveis; configuração/schema/artefato correspondentes;
documentos/estoque/evidências conciliados; pendências alcançáveis; jobs incertos
classificados; nenhum reenvio ou movimento sem decisão; responsável confirma que
o processo essencial funciona. A fila zerada não é requisito universal:
pendência legítima pode continuar aberta e visível, com dono/prazo.

Ensaio futuro deve medir detecção, escalonamento, comunicação, contenção,
registro físico, reconciliação e retorno em cada domínio. Guardar evidência de
aceite de família/equipe. A B7 realizou análise de contratos e cenários, sem
indisponibilidade induzida, operação física, login remoto ou ensaio DR.
