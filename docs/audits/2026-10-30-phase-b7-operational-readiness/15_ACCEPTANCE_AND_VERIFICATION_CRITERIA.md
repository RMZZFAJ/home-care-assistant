# Critérios futuros de aceitação e verificação

Nenhum item abaixo foi executado como implementação na B7. Os estados indicam
prova atual e condição de fechamento; não são autorização de release. Aplicar ao
escopo que o responsável aprovar, preservando os P1 anteriores.

- **AC01**. **Aceite verificável:** Release identifica SHA, artefato, target,
  schema, config e aprovação; todos os checks exigidos correspondem ao
  candidato. **Prova atual / falta:** B7-001, desacoplamento histórico
  confirmado. **Ambiente e responsável:** Release autorizado; engenharia.
- **AC02**. **Aceite verificável:** Falha/skip/ausência de validate
  Linux/Windows ou DB/browser impede liberação; QA-001 tem regressão estável do
  cenário. **Prova atual / falta:** CI detecta falha; helper permanece
  inalterado. **Ambiente e responsável:** Local/CI autorizada; qualidade.
- **AC03**. **Aceite verificável:** Push documental não cria preview/deploy
  quando a missão o proíbe. **Prova atual / falta:** createDeployments refutado
  como guarda; publicação pendente. **Ambiente e responsável:** Git/Vercel;
  responsável pelo repositório.
- **AC04**. **Aceite verificável:** Preview/dataset operacional têm separação
  deliberada e verificada; conta/projeto/chave pública conferem. **Prova atual /
  falta:** Guardas locais boas; isolamento remoto não demonstrado. **Ambiente e
  responsável:** Config/dados autorizados; infraestrutura.
- **AC05**. **Aceite verificável:** Predicado único de readiness por canal e
  motivo seguro de indisponibilidade. **Prova atual / falta:** B7-002
  reproduzido em quatro variantes; zero rede. **Ambiente e responsável:**
  Unidade/contrato e destino homologado; engenharia.
- **AC06**. **Aceite verificável:** Serviços essenciais funcionam com config
  mínima; ausência da service key orienta anexos/PDF sem prometer transporte.
  **Prova atual / falta:** Consumo no código; falta preflight conjunto.
  **Ambiente e responsável:** Ambiente isolado; engenharia.
- **AC07**. **Aceite verificável:** Schema mínimo e compatibilidade antiga/nova
  verificados antes de servir mutações; falha de migration interrompe cutover.
  **Prova atual / falta:** 84/232 atuais correspondem; B7-003 aberto. **Ambiente
  e responsável:** Ensaio isolado e release autorizado; banco/release.
- **AC08**. **Aceite verificável:** Backup recente, íntegro, acessível sob perda
  do domínio original, com retenção/dono/cofre aceitos. **Prova atual / falta:**
  16 dumps locais e dois pares conferidos; política produtiva não comprovada.
  **Ambiente e responsável:** Operação/backup; responsável técnico.
- **AC09**. **Aceite verificável:** Restore conjunto recupera DB, Auth, objetos,
  chaves, configurações e jobs coerentes; RPO/RTO medidos. **Prova atual /
  falta:** OPS-001/B3-014 continuam sem ensaio. **Ambiente e responsável:** Novo
  destino isolado previamente autorizado; DR.
- **AC10**. **Aceite verificável:** Cron/egress impedidos antes do restore; zero
  chamada externa até reconciliação e aceite de retomada. **Prova atual /
  falta:** B7-004 sustentado por TOC e invocador. **Ambiente e responsável:**
  Destino descartável autorizado; DR/comunicação.
- **AC11**. **Aceite verificável:**
  Metadado→objeto→hash→versão→autorização→histórico conferem, incluindo
  original/derivado. **Prova atual / falta:** B6-011 e bytes sem recuperação
  integrada. **Ambiente e responsável:** Acervo autorizado em ensaio;
  documental/engenharia.
- **AC12**. **Aceite verificável:** Saúde diferencia invocação, último sucesso,
  avanço por paciente, backlog legítimo, hold, uncertain e lease expirada;
  alerta chega ao dono. **Prova atual / falta:** Sinais existem, sem aceite de
  detecção/ação. **Ambiente e responsável:** Ensaio de falha controlado;
  operação.
- **AC13**. **Aceite verificável:** DB-002 deixa de bloquear elegíveis e demais
  fluxos essenciais têm critérios A–B6 atendidos. **Prova atual / falta:** P1
  herdados e ramos conhecidos abertos. **Ambiente e responsável:** Local/CI e
  homologação dos processos; produto.
- **AC14**. **Aceite verificável:** Worker cabe no orçamento com folga decidida,
  persiste resultados e conserva incerteza em cortes/leases. **Prova atual /
  falta:** BE-003/B3-016; sem latência produtiva inventada. **Ambiente e
  responsável:** Carga progressiva isolada e provedor autorizado.
- **AC15**. **Aceite verificável:** Teto cliente/API/transporte é coerente
  incluindo multipart; arquivo inviável tem erro útil e recuperação segura.
  **Prova atual / falta:** B7-005, envelope6 MiB aceito local e maior que
  plataforma. **Ambiente e responsável:** Bordas locais e homologação da
  plataforma; engenharia.
- **AC16**. **Aceite verificável:** p50/p95, geração PDF, crescimento, backlog e
  custo têm amostra, orçamento, donos e critérios de parada aceitos. **Prova
  atual / falta:** Estrutura/medições anteriores; falta orçamento real.
  **Ambiente e responsável:** Amostra representativa autorizada;
  produto/engenharia.
- **AC17**. **Aceite verificável:** Fatos físicos no corte têm origem,
  responsável, custódia, horários conhecidos/desconhecidos e conciliação sem
  duplicar ledger/documento. **Prova atual / falta:** Runbook proposto, sem
  exercício humano. **Ambiente e responsável:** Família/equipe e suporte;
  responsável operacional.
- **AC18**. **Aceite verificável:** Canais Meta/Flow/SMTP/OAuth/SMS só são
  prometidos após configuração e homologação; desligados mantêm obrigações
  visíveis. **Prova atual / falta:** B5 e metadados de configuração; sem
  mensagem real B7. **Ambiente e responsável:** Fornecedor/paciente autorizados;
  comunicação/acesso.
- **AC19**. **Aceite verificável:** Sessões revogadas, operações em voo, URLs
  temporárias e cópias têm semântica aceita e verificada. **Prova atual /
  falta:** B3-020/021/022 preservados como dependências. **Ambiente e
  responsável:** Identidades reais de teste isolado; segurança.
- **AC20**. **Aceite verificável:** Política de headers e advisory dev são
  triados proporcionalmente; riscos/decisões documentados. **Prova atual /
  falta:** B7-006/007, sem ataque runtime demonstrado. **Ambiente e
  responsável:** Config alvo/tooling autorizado; segurança/engenharia.
- **AC21**. **Aceite verificável:** Cada papel executa processo aprovado em
  aparelho físico/rede real com entendimento e acessibilidade necessários.
  **Prova atual / falta:** B1/B2: emulação/automação não são aceite humano.
  **Ambiente e responsável:** Participantes/dispositivos autorizados;
  homologação.
- **AC22**. **Aceite verificável:** Rollback tem artefato e schema compatíveis;
  não desfaz dados/efeitos externos; retorno de jobs exige reconciliação.
  **Prova atual / falta:** Matriz B7.4/5/11 proposta, sem rollback real.
  **Ambiente e responsável:** Ensaio/cutover autorizado; release/DR.

## Prova proporcional e fechamento

Cada aceite futuro deve registrar candidato, ambiente, comando/roteiro,
identidade do executor, resultado observado, contraprova, dado persistido,
limitação e responsável que aceita. Usar a menor prova suficiente; repetir
somente verificações afetadas por mudança/risco novo. Não excluir testes,
mascarar intermitência, usar fixture remota ou chamar emulação de físico.

No fechamento documental B7: reconciliar31 cenários (dez provas controladas,
onze inspeções/metadados e dez cenários integrados), inventários, sete achados,
referências, hashes, credenciais, preservação e escopo Git. Os resultados dessa
validação ficam em evidence; não substituem os aceites de operação acima.
