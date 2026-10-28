# Testes, desempenho e observabilidade

Os gates locais de código, banco e integração passaram. O E2E completo teve
**119/120 aprovações**, seguido de **2/3** no caso repetido. Esta auditoria não
declara a suíte de navegador integralmente verde. QA-001 registra a falha
intermitente no helper de navegação e a evidência que limita sua interpretação.

## Resultados atuais

- **Contratos:** 84 hashes de migrations preservados; contrato REQ sem
  quantidade solicitada. `evidence/contracts.json` e `.log`.
- **Código:** lint, typecheck e build passaram com Node24.22.0. Build Next16.4.2
  concluiu as 56 páginas da etapa de geração mostrada no log. Isso não mede
  desempenho
  de produção. `lint`, `typecheck` e `build` em evidence.
- **Unitários:** 98/98 em17 arquivos. A primeira execução herdou origem3100
  incompatível com fixtures de origem dos testes e falhou6casos; corrigido o
  ambiente do harness, a suíte passou. `unit.log` e `unit-clean.log`
  preservados.
- **Banco:** preparação, replay limpo e legado19→84,14suítesSQL e cenário de
  search_path/pgcrypto passaram. `prepare` e `migrations` em evidence.
- **Integração:** 33/33 com Authreal, DataAPI/RPC, concorrência, revogação, TOTP
  e realtime. `integration.json/.log` e `INTEGRATION_REVIEW.md` em evidence.
- **Navegador:** 120cenários,40por projeto Chromium/Pixel7/WebKit iPhone13.
  Um timeoutChromium em `openNavigation`; repetir o caso3vezes reproduziu uma
  falha e duas passagens. Logs e captura em evidence com prefixo `e2e-`.
- **Dependências:** árvore válida; audit completo e produção com zero alertas
  na consulta atual. O lock foi inspecionado estruturalmente.
- **CI consultada:** run40241890885, pushmaster no mesmoSHA, conclusão success;
  sete jobs verdes, incluindo Windows/Linux, banco e três browsers.
  A consulta é somente leitura, distinta da execução local desta auditoria.

O primeiro E2E nem iniciou browser: um probeTS criado pela auditoria tinha
erro de acesso a propriedade inferida. Apenas esse probe foi corrigido;
`typecheck-audit-artifacts.log` documenta a causa. Falhas do harness não foram
apresentadas como defeitos do produto nem apagadas dos registros.

## Qualidade e alcance dos oráculos

Os testes mais fortes verificam efeito persistido, não apenas200: retries
concorrentes BAL com duas transações esperando lock; revogação enquanto archive
espera; ausência de saldo negativo; destinatário real de ENT; vínculo por
paciente; proteção do último administrador; etapa de validaçãoCOM; ciência
distinta de atendimento; revisão de consumo antes do débito.

Os testes SQL usam identidades/sessões emitidas pelo Auth e uma ponte de claims
no banco local. As integrações HTTP usam tokens reais. A ponteSQL isolada não
é confundida com prova de todas as camadasHTTP. Alguns testes antigos enviam
Promise.all no mesmo clienteSDK: comprovam resultado de repetição, mas sua
sobreposição pode ser reduzida pelo lock interno de refresh. O teste BAL mais
recente demonstra simultaneidade de forma independente.

Os E2E cruzam UI,API e banco, com montagem de cenárioSQL identificada. Câmera
negada e WebShare são simulados; imagemEAN real testa decodificador. Mailpit
exercita linksAuth locais, nãoSMTPexterno. Axe/teclado/overflow cobrem estados
percorridos; não certificam leitor de tela, teclado virtual ou aparelho físico.

Não há baseline visual automática que demonstre equivalência de todas as
capturas: screenshot salvo exige inspeção. UX-011 mostra por que nome de imagem
e teste verde não bastam para comprovar a etapa mostrada.

## O que os probes acrescentaram

1. **DB-001:** cancelamentoENT com consumo positivo falha42702 por alias SQL
   ambíguo. O cancelamento com devolução integral exercitado pelo E2E não entra
   nesse ramo. A hipótese temporal posterior continua não alcançada.
2. **DB-002:**25pacientes com requisição cancelada ocupam o lote;3execuções
   não lembram aREQ válida do26º. Remover só as candidaturas encerradas no
   controle permite1lembrete. Tudo dentro de transação encerrada com rollback.
3. **BE-002:** presenter real, payloads e provider simulados confirmam data
   de criação usada para evento posterior e contadorBAL incorreto.
4. **BE-003:** relógio virtual demonstra140s para50jobs com upload+envio de14s
   cada. Não simula lease real nem comprova duplicação; é risco de orçamento.

Probes preservam hipótese, controle, método e limites. Seus resultados de
diagnóstico não são novos testes de aceitação dizendo que o comportamento
defeituoso é desejado. A FaseB deve convertê-los em regressões com o resultado
correto, sem enfraquecer a suíte existente.

## Desempenho e capacidade

BE-006 contabiliza até25operaçõesSupabase em um dashboard de capacidades
amplas; parte ocorre em paralelo. DB-005 identifica crescimento quadrático
dos resumos de histórico copiados em snapshots. Esses fatos justificam
**medição antes de otimização**, não uma afirmação de lentidão em produção.

Medir p50/p95 e bytes por rota para catálogo pequeno/volumoso, documento com
10/100/1000eventos,100/1000pacientes e rede móvel degradada. Separar tempo de
Auth/contexto, consulta, renderPDF e transporte. Usar EXPLAIN em consultas
demonstradas quentes e dados fictícios representativos antes de criar índices.
Não remover história imutável nem fundir autorização só para reduzir chamadas.

Nesta fase não houve teste de carga remoto, benchmark de p95, medição de custo
do provedor ou SLO de produção aprovado. Limites de100registros em consumo e
auditoria (BE-001/004) são lacunas funcionais de busca, não otimizações válidas
que tornem pendências antigas inacessíveis.

## Observabilidade operacional

Há códigos seguros, correlação, estados de outbox, eventos persistidos e
distinção entre persistência e entrega. Isso é fundação útil. O sistema ainda
precisa de sinais acionáveis para: execução atrasada do scheduler; idade da
pendência mais antiga; fila incerta/pausada; lease vencida; falha de PDF/anexo;
volume e latência. Alertas devem conter IDs mínimos e códigos, sem payload
privado. AUI de auditoria precisa localizar fatos além dos100recentes.

Revisão privada realtime depende de todos os eventos incrementarem a revisão;
DB-007 mostra que polling da mesma revisão não corrige uma invalidação que
nunca foi emitida. Recarregar manualmente e revalidação de permissão mitigam
o estado visual, mas não equivalem a atualização automática garantida.

As validações finais dos artefatos da auditoria e seus resultados constam em
`CHECKPOINT.md`. Nenhum check de produto será declarado corrigido nesta fase:
o trabalho autorizado é diagnóstico, e os defeitos seguem para a FaseB.
