# Dependências entre grupos

## Registros B5 e contratos compartilhados

- **001** — Relação anterior: DB-006/B3-001 progresso; Dependência para
  decisão futura: Continuidade temporal do legado e prazo de aviso; Preservar:
  BAL rotativo, sem presença/contagem inventada.

- **002** — Relação anterior: B3-016/B4 estados de worker; Dependência para
  decisão futura: Retomada de holds por causa/configuração; Preservar:
  Aprovação de template e PDF já liberam corretamente.

- **003** — Relação anterior: BE-003/B4-010; Dependência para decisão futura:
  Separar etapa upload de messages; Preservar: Uncertain conservador após
  possível envio.

- **004** — Relação anterior: BE-002 ampliado; B1 linguagem; Dependência para
  decisão futura: Texto/variáveis por evento; matriz de fatos; Preservar:
  Versões, contadores corretos e ciência distinta de recebimento.

- **005** — Relação anterior: A governança/privacidade; B1 texto; Dependência
  para decisão futura: Conteúdo mínimo, destino e retenção; Preservar: Opt-in,
  phone Auth, logs sem payload.

- **006** — Relação anterior: B4-011 causa de lote distinta; BE-001/B3-011
  busca antiga; Dependência para decisão futura: Handoff de entrada e consulta
  recuperável; Preservar: Não adivinhar paciente ou executar desconhecido.

- **007** — Relação anterior: B1 separação de visto/ciência; Dependência para
  decisão futura: Origem de resolução externa na apresentação; Preservar:
  Audit e resolução legítima do lembrete.

- **008/009/011** — Relação anterior: V4/B3 revisão e uso único; B4
  adaptadores; Dependência para decisão futura: Replay, erro cifrado e
  propósito Flow; Preservar: Cifra/HMAC, prazo, autor e nenhum débito por
  relato.

- **010** — Relação anterior: B4-012 ampliado; B3-013 emissão diferente;
  Dependência para decisão futura: Consumidores e invalidação completa;
  Preservar: Remount na troca de paciente e rascunhos preservados.

- **012** — Relação anterior: B4-003/004 resultado parcial, causa adicional;
  Dependência para decisão futura: Recuperação Auth→verified_phones;
  Preservar: Nunca aceitar phone do browser como confirmado.

- **013** — Relação anterior: B3 B39-06 mesma tentativa; B4-010 resumo;
  Dependência para decisão futura: Identidade/correlação entre tentativas;
  Preservar: Callback monotônico e nenhum retry cego.

- **014** — Relação anterior: A observabilidade/continuidade; Dependência para
  decisão futura: Identificação de mensagem, responsável e evidência de
  conciliação; Preservar: Painel existente, escopo e audit do retry.

Os números da primeira coluna são sufixos B5. O registro mestre contém origem,
evidência e critérios completos; esta tabela não cria novos achados por camada.

## Bloqueios anteriores que a B5 não corrigiu

DB-002/B3-001 P1 continua bloqueando a garantia de automação multipaciente no
cenário demonstrado. UX-001/B1-UX-001 P1 continua impedindo decisão informada
de escala. B3-025 conserva risco de poison legado abortar cadeia; DB-006,
BE-003/B3-016, B3-013 e B4-011 continuam abertos. Provas correspondentes estão
em [PRIOR_PROOFS](evidence/PRIOR_PROOFS.csv), com caminho, commit e SHA-256.

BE-001/B3-011 e B4-005 são consultas que deixam trabalho antigo fora do
percurso; ampliar comunicação não resolve consulta incompleta. DB-001/B3-002
e B4-006 afetam recuperação de cancelamento e sua mensagem de erro. B3-014
restore, governança operacional, humano/device e homologação externa continuam
portões independentes; um novo canal não fecha nenhum deles.

Não há GO derivado de 44 pontos dirigidos ou de build anterior verde. Nenhuma
decisão de habilitar todos os canais foi tomada. Fluxos essenciais precisam
funcionar conjuntamente em UI/API/banco/autoridade na futura correção, com
regressões reais Auth quando a garantia envolve RLS.

## Fronteira com B6/C/D

B5 verificou seleção e transmissão de PDF, não composição/fidelidade integral.
B6 não foi iniciada. Os critérios B5 são insumos para C e regressões futuras D;
nenhuma migration, worker, template ou política foi alterada. Não transformar
esse handoff em autorização de implementação ou publicação externa.
