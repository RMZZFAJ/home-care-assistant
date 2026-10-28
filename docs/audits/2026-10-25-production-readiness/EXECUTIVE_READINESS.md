# Prontidão executiva

**Recomendação atual: NO-GO para liberação geral.** A Fase A está concluída
como diagnóstico do SHA `37cb7f85e96e551d6419871f94dd950712e2565b`;
o produto não recebeu correções nesta fase. Fechamento em 28/10/2026.

Há base técnica consistente: paciente como unidade operacional, autorização
na API e no banco, catálogo por paciente, ledger, documentos versionados,
RPCs transacionais e regressões com Auth real. Isso justifica evolução dirigida,
sem reconstrução integral do sistema. A decisão de liberação depende de
processos essenciais ainda falhos e de aceites operacionais ausentes.

## Bloqueios e condição de liberação

**UX-001, P1:** a confirmação de alteração de escala omite pessoa, data e
horários da mudança. Reproduzido na interface desktop e móvel. O administrador
consegue confirmar sem conferir o efeito concreto, apesar da autorização
técnica correta. Exibir e validar proposta, estado atual e conflito antes
de permitir essa operação é condição de uso do fluxo.

**DB-002, P1:** 25 pacientes com REQs canceladas ocupam o lote de lembretes;
três execuções não avançam para o 26º paciente elegível. Um controle removendo
apenas essas candidaturas permite o lembrete. Bloqueia a promessa de automação
multipaciente nesse cenário; não significa que toda residência esteja afetada.

Não houve P0 confirmado. Isso descreve os resultados da investigação,
não uma garantia universal de ausência de vulnerabilidades ou perda de dados.
O catálogo contém **32 achados: 2 P1, 21 P2 e 9 P3**. Natureza e confiança
separam defeitos demonstrados, hipóteses, riscos e oportunidades.

Um **piloto interno condicionado** pode ser reavaliado após correções dos
fluxos essenciais, recuperação demonstrada e aceite da família/equipe.
Integrações externas podem continuar desativadas se a alternativa manual
estiver clara e tiver responsável. Não há aprovação atual para esse piloto.
Não flexibilizar segregação, integridade, rastreabilidade ou recuperação de
erro crítico. Aplicam-se os gates de
[homologação](HOMOLOGATION_AND_ACCEPTANCE.md), inclusive os P2 operacionais.

## Riscos relevantes além dos P1

- **Recuperação:** DB-001 impede cancelamento de ENT no ramo com consumo
  positivo, por SQLSTATE 42702. UX-003 deixa a tentativa de anexo incerta
  editável após resposta perdida; não foi demonstrada corrupção do objeto.
- **Compreensão e confiança:** ciência automática observa cabeçalho antes
  dos materiais (UX-002); vazio aparece junto de carregamento/erro (UX-004);
  acompanhamento ignora prazo configurado e regride a mensagem (UX-012).
- **Localização de trabalho antigo:** consumo e auditoria limitam a lista
  aos 100 registros recentes sem caminho equivalente para os demais
  (BE-001/004). O dado continua no banco, mas pode sair do percurso operacional.
- **Automações:** parâmetros de data/contagem de mensagens (BE-002), orçamento
  do worker (BE-003) e seleção legada sem progresso garantido (DB-006).
  As duas últimas situações têm limites de reprodução explícitos.
- **Continuidade:** restauração integral atual com Auth, objetos Storage,
  configurações e RPO/RTO aceitos ainda não foi demonstrada (OPS-001).
- **Qualidade do gate:** E2E local terminou 119/120; repetição dirigida teve
  2/3 aprovações. QA-001 é intermitência do helper, não prova de navegação
  permanentemente quebrada. O gate não recebe estado verde nesta auditoria.

## Oportunidades humanas e de produto

Priorizar decisões com resumo concreto, ações recuperáveis, pendências
localizáveis e linguagem por tarefa. A profissional precisa saber quem deve
agir, o que foi salvo e o que ainda depende de conferência; a família precisa
distinguir ciência, atendimento e recebimento. JSON de propostas e nomes de
eventos internos devem dar lugar a apresentação compreensível, preservando
os detalhes técnicos em histórico adequado.

Fluent já oferece fundação útil. Consolidar estados e componentes por jornadas
evita uma troca estética sem benefício. As 14 vistas de dashboard carregadas
não tiveram overflow nas larguras medidas; a exploração também encontrou
os cinco comportamentos acima. Manter fotografia/ficha física como alternativa
e seleção de catálogo com mínima digitação. Não acrescentar quantidade
solicitada à REQ nem reinterpretar estoque para simplificar o formulário.

## Evidência e limites para a decisão

503/503 arquivos da base receberam tratamento reconciliado. São 84 migrations,
98 testes unitários aprovados, 33 integrações aprovadas, replay limpo e legado
aprovados e gates de código aprovados. CI do mesmo SHA foi consultada somente
para leitura; seu verde histórico não substitui o resultado local atual.

Dependem de nova autorização e ambiente adequado: smoke de release em produção,
OAuth/SMTP externos, Meta/WhatsApp real, recuperação integral e homologação
em aparelhos físicos com operadores. Não houve envio externo ou mudança
remota. Riscos de desempenho exigem carga representativa e medições antes
de otimizações estruturais.

README e outros pontos de entrada conservam contagens antigas de 35/69/32,
enquanto a base atual possui 84 migrations e 98 unitários. Corrigir esses
índices na Fase B, preservando relatórios datados. Três componentes sem
consumidor e assets iniciais são candidatos condicionais à limpeza, nunca
motivo para remover URLs ou contratos ainda utilizados.

O [roadmap](EXECUTION_ROADMAP.md) ordena correções por dependência. O
[plano de bootstrap](DATABASE_RESET_SEED_AND_GO_LIVE.md) está documentado,
sem reset remoto ou execução de preparação de produção. A próxima decisão
é autorizar o escopo da Fase B, começando pelos bloqueios e regressões.
