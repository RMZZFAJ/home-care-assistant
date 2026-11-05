# Lacunas próprias e alternativas proporcionais

## Causas específicas

O gate não impediu produção no SHA com CI falha: relacionar prova, candidato e
release, preservando testes. A API anuncia WhatsApp por predicado menor que o
provider: readiness único e causa segura devem anteceder a ativação. Schema e
configuração não têm atestado conjunto no release: definir verificação pequena e
reproduzível. Upload anunciado excede o body da plataforma: decidir
teto/mensagem coerentes ou transporte adequado sem relaxar sanitização. São
B7-001/002/003/005; não justificam substituir toda a arquitetura.

OPS-001 ganha causa concreta B7-004: dump que inclui cron/Vault pode reativar
endpoint antigo antes da conciliação, se scheduler/rede/segredo permitirem.
Quarentena antes do ensaio e reativação por aceite são alternativas
proporcionais. Não restaurar agora, apagar jobs ou criar novo worker como
atalho.

## Oportunidades P3

B7-006: política de headers com validação gradual de CSP, câmera/scanner, Auth e
PDFs, sem declarar XSS por falta de CSP. B7-007: atualizar dependência dev de
forma compatível ou documentar não alcançabilidade e revisão periódica. Não
converter severidade do scanner em incidente produtivo automaticamente.

## Conhecidos aprofundados sem duplicação

- OPS-001/B3-014:20 componentes de recuperação, alcance dos formatos, bytes,
  chaves, RPO/RTO, custódia e ensaio futuro.
- QA-001: helper inalterado, falha/retry/agregado e retenção conferidos por SHA.
- REPO-001: contagens/referências antigas continuam; não alterar fora do índice
  autorizado. REPO-003/004: Meta mutável e export Linux não foram executados.
- DB-002/B3-001 e B5: saúde aparente, idade/progresso por paciente e
  responsável.
- BE-003/B3-016, BE-006 e B3-015/024: orçamento temporal e crescimento, sem
  benchmark produtivo fictício.
- B3-020/021/022: sessão, operação em voo, link e cópia têm limites distintos.
- B4-010/B5-013/014: efeitos externos e tentativas exigem conciliação após
  corte.
- B6-011: bytes originais e derivados não são intercambiáveis nem conferidos de
  novo pelo cache atual.

## O que evitar e o que decidir

Não introduzir Kubernetes, microsserviço, outra fila/banco, CDN extra, cache
distribuído ou observabilidade paga sem problema/benefício demonstrados. Não
apagar histórico para reduzir tamanho, enfraquecer autorização para agilizar
leitura ou reenviar uncertain para parecer saudável. Documento de runbook não
equivale a equipe treinada e recuperação comprovada.

O responsável ainda decide escopo essencial, canais, ambiente, RPO/RTO,
retenção, janelas de revogação, donos/substitutos e retorno físico/digital.
Estas alternativas alimentam a decisão posterior sem iniciar a Fase C.
