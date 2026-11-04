# Insumos de decisão para a futura Fase C

Este handoff não inicia C, não escolhe unilateralmente piloto e não autoriza
implementar, configurar provedor, migrar, publicar, restaurar ou fazer merge. As
decisões são propostas, vinculadas a causas e aceites verificáveis.

- **Bloqueadores**. **Decisão pendente:** Priorizar UX-001 e DB-002 conforme
  processos usados. **Dependência / aceite:** B1/B3 e AC13; não mascarar com
  feature nova.
- **Correções técnicas**. **Decisão pendente:** Readiness B7-002 e transporte
  B7-005; ramos A–B6 essenciais. **Dependência / aceite:** Matriz de contratos e
  AC05/15.
- **Implantação**. **Decisão pendente:** Novo projeto ou uso controlado do
  associado; separar preview/dados. **Dependência / aceite:** AC04, inventário e
  preservação sem reset.
- **Configuração**. **Decisão pendente:** Manifesto mínimo de
  serviços/config/schema por artefato. **Dependência / aceite:** B7-003 e
  AC06/07.
- **Backups**. **Decisão pendente:**
  RPO/retenção/destino/acesso/criptografia/dono/substituto. **Dependência /
  aceite:** AC08, não chamar cópia local de off-site.
- **Restore**. **Decisão pendente:** Autorizar destino isolado e ensaio
  DB/Auth/bytes/keys/jobs. **Dependência / aceite:** OPS-001/B3-014, B7-004 e
  AC09/10/11.
- **Monitoramento**. **Decisão pendente:** Sinais, limiares, prazos, receiver e
  escala de resposta. **Dependência / aceite:** DB-002/B5, AC12/14/16.
- **Qualidade**. **Decisão pendente:** Resolver QA-001 e exigir checks do
  SHA/candidato. **Dependência / aceite:** B7-001 e AC01/02.
- **Segurança**. **Decisão pendente:** Aceitar janelas de sessão/link/operação
  em voo; governar contas/segredos. **Dependência / aceite:** B3-020/021/022 e
  AC19/20.
- **Continuidade**. **Decisão pendente:** Aprovar ficha/foto, canal de suporte e
  retorno físico/digital. **Dependência / aceite:** B2 e AC17; ledger e fatos
  não podem ser presumidos.
- **Rollback**. **Decisão pendente:** Artefato compatível, condição de parada e
  forward fix. **Dependência / aceite:** AC07/22; dados não voltam com código.
- **Homologação**. **Decisão pendente:**
  Participantes/papéis/aparelhos/rede/fornecedores do escopo. **Dependência /
  aceite:** B1/B2/B5/B6 e AC18/21.
- **Donos**. **Decisão pendente:** Nomear responsável por incidente, dados,
  comunicação, release e DR. **Dependência / aceite:** Aceite humano e
  substituto, não só documento.
- **Opcionais**. **Decisão pendente:** Manter Meta/Flows/canais não homologados
  e transcrição fora se proporcional. **Dependência / aceite:** Não prometer
  transporte inexistente; núcleo e pendências continuam.
- **Riscos aceitos**. **Decisão pendente:** Registrar contexto, controle, prazo
  e revisão. **Dependência / aceite:** B7-006/007 P3 e demais riscos
  condicionais; sem aceite presumido.

## Sequência sugerida de deliberação

Primeiro escolher processos essenciais e critérios humanos; depois priorizar
causas e contratos aplicáveis; estabelecer ambiente/gates/configuração;
demonstrar DR e observabilidade; homologar o percurso aprovado; deliberar
liberação gradual. Otimizar após medição do gargalo real. Preservar RLS/RPCs,
histórico, estoque por ledger, identidade local/global distintas, intenção
idempotente e incerteza externa. Não introduzir outra fila ou banco por padrão.

## Dependência imediata de publicação documental

A ordem autoriza somente o pacote/índice e commit/push documental e proíbe
deploy e alteração de configuração Vercel. O repo não configura
git.deploymentEnabled para audit/phase-b; previews históricos source=git
existem. Não se encontrou guarda nativa baseada apenas na mensagem de commit que
possa ser usada com segurança. createDeployments=disabled é metadado GitHub,
conforme a OpenAPI, e não resolve esse conflito.

Alternativa mínima, apenas para revisão e autorização adicional: acrescentar no
vercel.json uma regra de `git.deploymentEnabled` com a chave exata
`audit/phase-b` e valor false, preservando as demais branches/configurações.
Isso altera arquivo fora do escopo documental e não foi aplicado. Outra
alternativa é o responsável estabelecer um bloqueio real já autorizado na
plataforma, que a auditoria possa conferir por leitura antes do push. Não
desconectar integrações, alterar provedor ou publicar preview sem instrução.

O pacote e o commit devem ficar completos/revisáveis antes de solicitar essa
decisão. Depois de resolvida, verificar ref remota e ausência de deployment do
SHA final; não chamar documentação publicada de produção homologada.

## Resolução posterior da publicação

O responsável autorizou o preview automático do push documental em 30/10/2026,
após o diagnóstico e o commit f59ed2e. Ver
[autorização](evidence/PUBLICATION_AUTHORIZATION.md). A alternativa de alterar
vercel.json não foi aplicada. A publicação pode prosseguir com verificação de
SHA/ref e status Vercel, preservando o escopo documental e a master. A hipótese
e o impedimento originais acima permanecem como histórico da investigação; esta
decisão resolve a pendência sem iniciar a Fase C.
