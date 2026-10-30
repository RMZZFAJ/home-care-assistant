# B6.11 — Privacidade, retenção e recuperação

## Finalidade e acesso

Nome do paciente, autor, profissional e itens podem ser necessários ao
comprovante operacional. A presença não demonstra ilicitude por si. Avaliar
destinatário, finalidade, campos mínimos, compartilhamento e guarda de cada
representação. PDF completo é privado e autorizado por paciente; QR público
expõe só referência/hash/versão, sem nome ou materiais. Conhecer UUID não dá
acesso completo. Chaves de serviço não aparecem no PDF/QR nem no pacote B6.

B3/B4 já provaram RLS, vínculo/capacidade, contexto, outros pacientes e
revogação no percurso normal. Sem drift de produto/232 rotinas, sem repetir
matriz de autorização inteira. Cache PDF tem private, no-store; anexos usam URL
temporária. Compartilhar/baixar cria cópia fora do controle de sessão; fechar
app, revogar vínculo ou limpar cache do servidor não apaga esse arquivo. As
amostras auditadas contêm somente personagens/identidades fictícias.

## Revogação: garantias distintas

B3-022 demonstrou nova API recusada após revogação e URL já emitida retornando
bytes dentro do prazo120s. Não testou expiração final. Documentação atual de
[Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn) diferencia
expiração de token e duração de cache; cache pode prolongar disponibilidade de
resposta. A aplicação remota desse comportamento não foi medida. Não
transformar120s em garantia universal de corte de acesso, nem recomendar excluir
evidência histórica para invalidar uma URL. Proxy autorizado por
requisição/prazos são alternativas com custos e requisitos a decidir.

API PDF autoriza no início, não novamente antes de transmitir. Janela de
revogação durante download em andamento é requisito de política pendente, não
corrida reproduzida nesta B6. Cópia obtida continua fora dessa revogação.

## Matriz de retenção e custódia

- **Eventos/snapshots**. **Preservação atual:** Imutáveis para cliente;
  FK/versões. **Decisão necessária:** Prazo, âncora externa se necessária,
  acesso histórico.
- **PDF r4 de cada versão**. **Preservação atual:** Path e hash próprios; sem
  upsert. **Decisão necessária:** Guarda de bytes/fontes/renderer e checagem em
  recuperação.
- **Original legado**. **Preservação atual:** Entrega só se registrado; zero
  locais. **Decisão necessária:** Procedência e política de não substituir.
- **Anexo ready**. **Preservação atual:** Derivado sanitizado; hash/alvo.
  **Decisão necessária:** Retenção original/derivado e ressalva da
  transformação.
- **Reserva quarantine**. **Preservação atual:** Sem expiração; capacidade
  ocupada. **Decisão necessária:** Abandono comprovado/retomada sem apagar
  ativo.
- **Ready sem objeto**. **Preservação atual:** Metadado não garante bytes.
  **Decisão necessária:** Inventário/reconciliação e resultado de recuperação
  explícito.
- **Avatar não associado/antigo**. **Preservação atual:** Fluxo separado sem
  retomada completa. **Decisão necessária:** Retenção/prazo de órfãos; B4-007.
- **Legado sem autoria/data**. **Preservação atual:** Fonte conserva
  desconhecido. **Decisão necessária:** Representação que preserve incerteza;
  sem inventar fato.
- **Notificações/tentativas**. **Preservação atual:**
  Estado/evento/versionamento próprios. **Decisão necessária:** Conciliar antes
  de reenviar; B5-013/014.
- **Cópia compartilhada**. **Preservação atual:** Fora do servidor. **Decisão
  necessária:** Responsável, canal, guarda e descarte operacional.

Sem rotina nova de exclusão, limpeza de bucket, alteração de TTL, configuração,
grants ou dados remotos. Retenção não tem prazo universal dedutível do código;
definição operacional/conformidade pertence ao responsável em etapa autorizada.
Não declarar conformidade integral com LGPD ou validade jurídica do arquivo.

## Recuperação conjunta: NOT_VERIFIED

Backup novo antes dos ensaios: 6.403.958 bytes, SHA-256 e TOC verificados fora
do Git; prova sanitizada em backup-proof.json. Não se restaurou nada. Dump
legível não demonstra RPO/RTO, reconstrução de objetos ou retomada segura. O
[contrato oficial de backups](https://supabase.com/docs/guides/platform/backups)
também distingue metadados do banco de objetos Storage, que exigem preservação
própria. Isso coincide com o desenho local e a prova B3-014/OPS-001.

- **PostgreSQL**. **O que precisa sobreviver:** Eventos, linhas, Fks, hashes,
  grants, policies. **Aceite futuro:** Cadeias/versões e leituras autorizadas
  corretas.
- **Auth**. **O que precisa sobreviver:** Identidades, vínculos,
  sessões/política de rotação. **Aceite futuro:** Login e revogação sem
  ressuscitar autoridade indevida.
- **Storage**. **O que precisa sobreviver:** Bytes de PDFs/anexos/avatares,
  buckets, paths. **Aceite futuro:** Hash de bytes coincide; ausências
  diagnosticadas.
- **Código/fontes**. **O que precisa sobreviver:** Renderer por revisão e fontes
  necessárias. **Aceite futuro:** Reconstrução explicitamente derivada; original
  preservado.
- **Configuração/chaves**. **O que precisa sobreviver:** Domínio, URLs, Vault,
  worker, assinaturas de serviço. **Aceite futuro:** Segredos
  protegidos/rotacionados; URLs antigas resolvem.
- **Jobs/referências externas**. **O que precisa sobreviver:** Outbox,
  tentativas, leases, IDs Meta. **Aceite futuro:** Não reenviar uncertain por
  simples restauração.
- **Operação**. **O que precisa sobreviver:** Guarda, donos, RPO/RTO e
  reconciliação. **Aceite futuro:** Ensaio isolado aprovado com evidência de uso
  completo.

B67-R02 comprovou correspondência dos 199 renders aos metadados de objetos, sem
baixar acervo real ou medir integridade de cada byte. Um ready sem objeto é
fixture anterior conhecida. Ausência de ensaio conjunto é lacuna de homologação,
não restauração fracassada reproduzida. Novas recomendações não autorizam
sobrepor o ambiente existente, ativar envio ou apagar história.
