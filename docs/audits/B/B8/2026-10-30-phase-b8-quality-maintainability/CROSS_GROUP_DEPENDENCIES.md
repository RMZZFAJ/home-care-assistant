# Dependências entre grupos

Esta lista relaciona evidência e proteção futura; não executa a consolidação de
prioridades/soluções da Fase C.

- **A/B1 → Q3/Q9:** defeitos de compreensão, foco, reflow e ciência permanecem
  apesar de headings/axe comuns. Conteúdo esperado, estado de decisão e teste
  humano devem acompanhar as correções; B8-Q003 amplia método, sem renumerar os
  defeitos da interface.
- **A/B1 → Q6:** QA-001/B1-QA-001 é a causa do helper agora reproduzida em DOM
  controlado. Uma correção de harness precisa preservar os oráculos das
  jornadas, não ocultar erro do produto com timeout maior.
- **B2 → Q2/Q4/Q5:** 66 processos, transições e precondições localizam ramos
  ausentes sem refazer jornadas. RemanescenteCOM, cancelamentoENT, consumo e
  sucessãoBAL precisam decisão de processo e testes do estado resultante.
- **B3 → Q3/Q4:** SQL/RLS/Auth real e barreiras permanecem essenciais. B8-Q002
  corrige o critério do teste, sem insinuar que um mock pode substituir a
  autorização ou que o ledger atualmente tem linhas ausentes.
- **B3 → B4/B5 → Q5:** emissão de invalidação e consumo do sinal são causas
  distintas. Comprovar revisão, entrega privada e consulta atualizada sem
  resposta velha; não duplicar a mesma manifestação por consumidor como se fosse
  toda uma nova arquitetura de cache.
- **B4 → Q3/Q4:** precisão number/string, parcial revise/submit, avatar e
  convite precisam oráculos de fatos parciais e idempotência por intenção. Os
  mocks atuais de adapter têm papel válido, porém insuficiente isoladamente.
- **B5 → Q3/Q4/Q7:** mídia, mensagem, callback, lease e reconciliação cruzam
  serviços. Transporte falso protege formato/erros, não prazo físico, aceite
  Meta ou recuperação de tentativa antiga. Homologação externa é outro gate.
- **B6 → Q3/Q9:** conteúdo/layout/proveniência, cache e acessibilidadePDF exigem
  oráculos que páginas/título/determinismo não fornecem. B8-Q001 é causa de
  verificação nova; os defeitos documentais originais conservam IDs.
- **B3/B7 → Q7:** volumes, planos, snapshots e orçamento worker sustentam
  medição futura. Não recontar amostra local como p95, nem criar infraestrutura
  para um gargalo ainda não medido.
- **B7 → Q1/Q5/M5:** CI/deploy/schema/config/restore são condições conjuntas. B8
  verifica capacidade de proteção, sem reauditar provedores ou atualizar
  dependências. Preview documental não é produção homologada.
- **REPO-001/002 → M4/M7:** estado atual e ferramenta de geração histórica devem
  ter proveniência distinta. A edição B4 autorizada é exceção explícita; não
  atualizar manifestos antigos para esconder mudança posterior.
- **REPO-003/004 → M5/M6:** intenção de submit, identidade e fronteira da cópia
  precedem uso de ferramentas com credenciais/dados locais. .venv agrega uma
  manifestação do mesmo conjunto de exclusões, sem nova causa de vazamento.
- **UX-010 → M1/M2:** limpeza só com consumidores completos/compatibilidade.
  Reexportação AppWorkspace e rota pública foram contraprovas efetivas.
- **Segurança/privacidade/processo → C/homologação:** retenção, revogação,
  compartilhamento, contingência e ato físico têm limites diferentes. Nenhum
  teste técnico substitui decisão do responsável ou certifica fato material.

As duas causas P1 anteriores continuam: decisão informada de escala e progresso
REQ. Os nove registros B8 incluem três lacunas/oportunidades novas de qualidade
e seis revalidações, não nove novas causas do produto. A matriz de 119 famílias
é catálogo de verificação; C ainda precisará decidir agrupamento de correções,
prioridade, alternativas e primeiro escopo de uso.
