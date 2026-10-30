# B7.7 — Capacidade, desempenho e custo

## Nova incompatibilidade de limite de transporte

B7-005: a interface anuncia dez anexos de até 10 MB e o helper aceita 10.485.760
bytes por arquivo. O POST multipart atravessa a Function Next antes de ser
sanitizado e enviado ao Storage. Avatar usa o mesmo caminho com 5.242.880 bytes.
A Vercel documenta limite de 4,5 MB para body de request ou response, com erro
FUNCTION_PAYLOAD_TOO_LARGE ao excedê-lo. [Limites de
Functions](https://vercel.com/docs/functions/limitations).

Prova mínima nova, sem upload, DB ou rede: PDF válido sintético com whitespace
até 6 MiB, body de 6.291.639 bytes, foi aceito por boundedUpload e sanitizado
para 572 bytes. A redução acontece depois da fronteira da plataforma. Controle
de 1 MiB passou e 11 MiB foi recusado pelo helper. Ver
`evidence/upload-envelope-results.json`; não foi provocado 413 na Vercel. O
conflito de contratos é confirmado; o impacto remoto deriva do limite
documentado, não de incidente observado. Não é o defeito de fidelidade B6.

Alternativas para decisão futura: teto coerente no cliente/API com margem de
multipart e mensagem útil; ou upload direto/resumível com reserva, autorização,
quarentena, sanitização e confirmação segura. A segunda tem custo e novos
limites de segurança; não deve permitir arquivo ativo, objeto público ou
finalização por simples alegação do browser. PDFs de resposta maiores que o
limite precisam de avaliação se a amostra real alcançar esse volume; não há
prova B7 de PDF produtivo acima dele.

## Matriz de riscos e evidência reutilizada

- **Dashboard**. **Estrutura / medição existente:** BE-006: várias chamadas a
  Supabase. **Limite da conclusão:** Contagem não é lentidão comprovada.
  **Métrica futura:** p50/p95 e waterfall por papel/contexto.
- **Snapshots**. **Estrutura / medição existente:** B3-015: 1.000 eventos,
  500.500 resumos, 71.056.717 bytes textuais. **Limite da conclusão:** Fixture
  local; não é tamanho produtivo. **Métrica futura:** Bytes/documento/versão e
  crescimento por período.
- **Estoque/autorização**. **Estrutura / medição existente:** B3-024: 100 linhas
  234,4 ms; preparo owner 1.000 cancelado em 120 s. **Limite da conclusão:**
  Sinal local; sem causa única ou SLO remoto. **Métrica futura:** Plano, locks e
  p95 por comando/volume.
- **Worker**. **Estrutura / medição existente:** Até50, ondas10, lease120 s e
  maxDuration120 s. **Limite da conclusão:** Timeout composto pode superar
  orçamento; provedor não medido. **Métrica futura:** Tempo por etapa/onda,
  lease remanescente e backlog.
- **Cron**. **Estrutura / medição existente:** Lotes25/100/50; BAL100 com
  cursor; internos100. **Limite da conclusão:** Finite batch não garante
  prazo/fairness. **Métrica futura:** Idade elegível por paciente e último
  avanço.
- **PDF**. **Estrutura / medição existente:** B6: 11 casos/32 páginas; caso
  normal extenso funcionou. **Limite da conclusão:** Stress visual não é
  throughput de servidor. **Métrica futura:** Tempo/bytes/memória por páginas e
  eventos.
- **Storage**. **Estrutura / medição existente:** 216 objetos locais em
  metadados. **Limite da conclusão:** Não é inventário produtivo nem backup dos
  bytes. **Métrica futura:** Bytes, operações, egress, órfãos e retenção.
- **Realtime/reload**. **Estrutura / medição existente:** Invalidação privada e
  polling. **Limite da conclusão:** Consumo depende de telas/sessões ativas.
  **Métrica futura:** Reconexões, consultas e atraso percebido.
- **Webhook**. **Estrutura / medição existente:** B4-011: envelope misto pode
  descartar entrada válida. **Limite da conclusão:** Contrato de ingestão, não
  limite de capacidade. **Métrica futura:** Itens
  recebidos/aceitos/recusados/deduplicados.
- **Rede móvel**. **Estrutura / medição existente:** E2E emulado e layout B1.
  **Limite da conclusão:** Não prova rádio/câmera/aparelho físico. **Métrica
  futura:** Jornada humana e recuperação com rede real.

Não repetimos plano SQL, mil versões, PDF extenso, carga, replay ou benchmarks.
O orçamento temporal BE-003/B3-016 foi conservado como risco herdado; não é uma
nova descoberta nem prova de timeout real na produção. A afirmação do comentário
de worker de que todo lote cabe em dois minutos não cobre duas chamadas de 15 s
por job, geração PDF e RPCs.

## Runtime, região e limites efetivos

Metadados atuais: Vercel Fluid habilitado, região padrão de Functions iad1;
Supabase associado us-east-1; Node24.x. A documentação atual admite até 300 s
Hobby com Fluid, mas o código do worker declara120 s e a lease é120 s. Não há
defeito demonstrado de usar uma duração não suportada; subir o teto da
plataforma sozinho não aumenta a lease nem resolve efeito externo incerto. Essa
contraprova evita recomendar upgrade de plano como correção automática. [Limites
de Functions](https://vercel.com/docs/functions/limitations).

Regiões compatíveis no mapa não provam latência. Não se mediu p95 de produção,
concorrência máxima suportada, memória real por PDF ou gargalo por conexão. O
padrão SDK é HTTP/PostgREST; limites de DB, tráfego e cold start precisam ser
medidos no fluxo completo, sem expor conexão Postgres ao navegador.

## Custo e decisão proporcional

Medir antes de otimizar: execução CPU/memória de Functions, chamadas DB e locks,
crescimento de eventos, Storage/egress, retenção de logs/cron, Auth/SMS/SMTP e
mensagens/templates Meta. Não há orçamento mensal produtivo ou SLO aceito no
pacote vigente. Pricing e cobrança dependem do plano/configuração; nenhum valor
de custo real foi inventado ou contratação recomendada.

O responsável deve definir amostra por pacientes/profissionais, documentos e
eventos, anexos, leitura simultânea e prazo de automação. Ensaios futuros
progressivos, sintéticos e isolados devem ter limite de tempo/custo, critério de
parada e correlação com um processo essencial. Primeiro corrigir consulta,
paginação, limite ou lote demonstradamente inadequado. Não há evidência que
justifique Kubernetes, microsserviços, outra fila/banco, cache distribuído, CDN
adicional ou multirregião para o primeiro uso.
