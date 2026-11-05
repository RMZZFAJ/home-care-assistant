# Insumos documentais para decisão futura da Fase C

Este handoff não inicia C nem autoriza implementação. Cada achado possui causa,
prova, contraprova, riscos, aceite e regressão nos arquivos14/15. A decisão deve
reconciliar A–B6 por causa, sem criar lista duplicada por tela e PDF.

## Correções técnicas

**Problemas/evidência:** B6-007 de célula cortada(PV09/B66-S02), B6-008 de
anotação removida(B68-C01), B6-010 de receipt sem elo(B612-S01) e B6-011 de
cache sem comparação(B67-C01). **Alternativas:** fragmentação segura de células;
derivado visual passivo ou recusa informada; identidade de parcela por evento;
verificação de digest na recuperação. **Benefício:** preservar conteúdo e
detectar divergência. **Custo:** médio; medir
renderer/sanitizador/armazenamento, sem estimar preço sem projeto. **Risco:**
reintroduzir conteúdo ativo, reescrever original, mudar saldo ou perder replay.
**Dependências:** B3/B4 de integridade, retenção e contratos de recepção.
**Aceite:** AC-B6-007/008/010/011. **Responsável:** liderança técnica com
responsável documental/operacional.

## Correções de representação documental

**Problemas/evidência:** B6-001/002/003/004/005/006 e suas provas de fonte, SQL
e PDF. **Alternativas:** datas com significado próprio, nome histórico,
ressalvas e aprovações contextualizadas, estado terminal coerente.
**Benefício:** familiar/profissional reconstrói o ato sem inferir informação
errada. **Custo:** pequeno a médio por renderer/projeção; depende de decisão dos
campos mínimos. **Risco:** inventar dado original, apagar autoria ou confundir
aprovação com contagem. **Dependências:** taxonomia e máquina de estados A–B3.
**Aceite:** respectivos AC no arquivo15. **Responsável:** produto/operação
valida linguagem; técnica define migração/renderer futuro sem substituir
históricos.

## Decisões de produto

**Problemas:** completude esperada de cada PDF e descoberta de versões
(B6-009/013); papel do QR/assinatura. **Evidência:** PV01, projeções05/09 e
consulta mínima. **Alternativas:** documento resumido explicitamente rotulado ou
detalhes por linha; links históricos; eventual verificação adicional/assinatura
se houver necessidade demonstrada. **Benefício:** clareza com custo
proporcional. **Custo:** pequeno para projeção; desconhecido para
assinatura/infra externa. **Risco:** aumentar dados sensíveis/papel ou alterar
contrato REQ. **Dependências:** privacidade/acesso e renderer. **Aceite:**
AC-B6-009/013 e limite técnico09. **Responsável:** dono do produto com
família/equipe; nenhuma obrigatoriedade jurídica de mecanismo específico é
presumida por esta auditoria.

## Decisões operacionais

**Problemas:** quem confere papel/material, quem revisa BAL, quem guarda cópias
e quem concilia divergência/retorno. **Evidência:** B6-004/005/006/010 e
B2-004/011/B3-005. **Alternativas:** procedimento de conferência/ressalva
separando declaração e confirmação; resumo por ato e responsável; tratamento
manual de casos bloqueados sem inventar consumo. **Benefício:** continuidade e
responsabilidade reconhecível. **Custo:** treinamento e operação a medir.
**Risco:** assinar por terceiro, usar escala como presença ou contornar guard.
**Dependências:** correções de processo B2/B3 e comunicação B5. **Aceite:**
pessoa reconstitui quem declarou/recebeu/revisou e próxima ação usando a
documentação escolhida. **Responsável:** administrador da residência e equipe.

## Governança, privacidade e retenção

**Problemas:** original/derivado, quarantine, URLs e cópias fora do servidor;
B3-004/022, B4-007, B6-008 e relatório11. **Alternativas:** retenção por classe,
preservação restrita da origem quando necessária, reconciliação de órfãos,
prazo/proxy adequado e comunicação dos limites. **Benefício:** recuperar sem
destruir evidência ou prometer revogação impossível. **Custo:** bytes/acesso/
processo a estimar. **Risco:** apagar arquivo ativo/válido, vazar original ou
confundir ready com validação do conteúdo. **Aceite:** política com dono,
prazos, exceções, recuperação e acesso por paciente; sem exclusão implementada
nesta fase. **Responsável:** controlador/responsável operacional com apoio
técnico e assessoria jurídica quando o contexto exigir definição normativa.

## Recursos opcionais

Pacote exportável autorizado, comparação entre versões, assinatura adicional e
outro formato de impressão dependem de necessidade real. Benefício/custo,
privacidade e manutenção precisam ser comparados antes de escolher. Não há prova
de que A5, certificação externa ou redesenho visual integral sejam requisitos do
contrato. Responsável: produto; aceite exige caso de uso e preservação de
compatibilidade/versões, sem trocar hash por assinatura fictícia.

## Homologação pendente

**Problemas/evidência:** B3-014/OPS-001, B1-A11Y-001/B6-012 e limites06/10/11.
**Alternativas:** impressão física/QR/AT com amostra escolhida; ensaio de
recuperação em destino isolado autorizado com bytes, Auth, configuração e jobs;
teste humano por tarefa. **Benefício:** demonstrar operação real e RPO/RTO.
**Custo:** ambiente/tempo a planejar; nenhuma restauração sobre este ambiente.
**Risco:** reenviar mensagens após restore ou tratar emulação como aceitação
física. **Aceite:** critérios13/15 reconciliados com A e resultados por método,
sem declarar verde global a partir de imagem/hash. **Responsável:** operação,
plataforma, acessibilidade e dono do produto. Depende de nova autorização.
