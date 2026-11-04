# Jornadas integradas e contraexemplos

Todos os cenários abaixo são **aceites planejados**, sem nova execução em C.
Cruzar tela/API/RPC, estado persistido e compreensão humana; IDs individuais
continuam na matriz C6. Uma jornada não substitui a prova da fronteira direta.

<!-- c-table:start -->

- **Jornada:** Necessidade até equipe

  **Sequência e resultado esperado:** Profissional emite REQ desconhecido;
  família COM de 10 unidades, recebe/valida 2, dispensa 8; expede ENT de 2
unidades e recebedor aceita

  **Contraexemplo obrigatório e prova:** COM não atende REQ antes da ENT;
  unknown não vira 0; crédito físico único e nova necessidade remanescente
  motivada possível.

- **Jornada:** Recebimento parcial e consumo

  **Sequência e resultado esperado:** ENT de 3 unidades, aceite de 2, consumo 1
confirmado;
  diferença de 1 conciliada e cancelamento conforme consentimento

  **Contraexemplo obrigatório e prova:** Não debitar consumo anterior outra
  vez; recusa/retirada termina pedido; SQL erro não vira conflito de nome.

- **Jornada:** Pessoa saiu após parcial

  **Sequência e resultado esperado:** Revogar agora; preservar aceite
  anterior; redesignar tarefa futura e registrar exceção irrecuperável

  **Contraexemplo obrigatório e prova:** Substituta/admin não aceita pelo
  desligado; outro paciente da conta permanece legítimo; sem reativação
  silenciosa.

- **Jornada:** Troca noturna e BAL

  **Sequência e resultado esperado:** Escala 19–07 em período de 45 dias; proposta
  mostra efeito BAL; aprovar versão atual; novo reconto por substituta

  **Contraexemplo obrigatório e prova:** Aprovar após corte não republica;
  prazo não muda por proposta; contagem de Juliana e reconto de Sheila mantêm
  autores.

- **Jornada:** Decisão em dois aparelhos

  **Sequência e resultado esperado:** Rascunho salvo em A, retomado em B
  amanhã; A tenta salvar versão antiga e depois emitir

  **Contraexemplo obrigatório e prova:** Conflito preserva edições; nenhum LWW
  de quantidades; resultado confirmado é recuperado antes de descartar draft.

- **Jornada:** Arquivo e resposta perdida

  **Sequência e resultado esperado:** Upload confirmado no servidor, resposta
  abortada; consulta encontra ready

  **Contraexemplo obrigatório e prova:** Trocar arquivo sob mesma chave é
  impedido; dez abandonados não ocupam capacidade para sempre;
  original/derivado qualificados.

- **Jornada:** Evidência anotada e PDF

  **Sequência e resultado esperado:** Anexo passivo com ressalva; PDF ENT com
  nome com 160 caracteres e célula alta

  **Contraexemplo obrigatório e prova:** Ressalva não some; marcador final
  extraível/visível; versão antiga não é substituída por renderer novo.

- **Jornada:** Verificar exemplar alterado

  **Sequência e resultado esperado:** Usuário copia QR legítimo para PDF
  modificado e seleciona arquivo

  **Contraexemplo obrigatório e prova:** Consulta de registro pode existir;
  comparação de bytes diverge; sem referência/serviço não equivale a
  falsidade.

- **Jornada:** Ciência e acesso

  **Sequência e resultado esperado:** Preferência tácita na emissão; nova
  abertura condicionada em outro documento; nova abertura real

  **Contraexemplo obrigatório e prova:** Ciência tácita não cria acesso;
  cancelar modal não registra ciência; abrir não prova leitura integral nem
  aceite.

- **Jornada:** Pendência antiga e sinal perdido

  **Sequência e resultado esperado:** Criar mais de 100 relatos,51 propostas;
  perder broadcast/reconectar e abrir ref antiga

  **Contraexemplo obrigatório e prova:** Paginação/detalhe alcançam todos;
  produtor e consumidor têm testes independentes; falha não mostra “em dia”.

- **Jornada:** Push em aparelho compartilhado

  **Sequência e resultado esperado:** A opta, sai; B entra; evento do paciente
  de A ocorre

  **Contraexemplo obrigatório e prova:** Não entregar informação de A a B;
  endpoint privado e revalidação; toque em link revogado não abre conteúdo.

- **Jornada:** Falha externa diferida

  **Sequência e resultado esperado:** Meta desligada; evento interno persiste
  e pessoa cumpre tarefa no app

  **Contraexemplo obrigatório e prova:** Nenhuma promessa de WhatsApp/e-mail
  inexistente; uncertain não reenvia cegamente; prova externa só em D7
  autorizado.

- **Jornada:** Recuperação de desastre

  **Sequência e resultado esperado:** Restore isolado DB/Auth/bytes/config,
  cron/push/Meta em quarentena; conciliar após corte

  **Contraexemplo obrigatório e prova:** Zero chamada externa antes do aceite;
  eventos já enviados não duplicam; hash/ledger/autores e login conferidos.

- **Jornada:** Segurança direta

  **Sequência e resultado esperado:** Contornar UI enviando NULL, NaN,
  precisão inválida, JWT encerrado ou ID de outro paciente

  **Contraexemplo obrigatório e prova:** Recusa sem efeito em API e
  RPC/Storage pertinentes; teste de crédito esperado não passa com NULL.

<!-- c-table:end -->

Revisão humana mede erro/ajuda necessários por tarefa, sem percentuais ou
tempo
inventados. Estado offline, conflito, revogação e uncertain devem ser
explicáveis
pelo usuário sem interpretar JSON/código. P10 define os participantes e
aparelhos;
P03/P05/P13 definem recuperação e reação. Produção segue NO-GO até provas D.
