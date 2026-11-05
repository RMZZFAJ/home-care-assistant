# Lacunas de produto e configuração

O produto contém uma base operacional extensa e integrada. As lacunas de maior
valor não são adicionar módulos indiscriminadamente: são tornar decisões
revisáveis, recuperar interrupções e deixar claro o alcance de estados e
configurações. Recomendações abaixo pertencem à fase posterior; nada foi
implementado no produto.

SHA: `37cb7f85e96e551d6419871f94dd950712e2565b`. Análise estática completa
da frente UI; runtime dirigido realizado em27/10/2026. Achados individuais em
[evidence/findings-ui.json](evidence/findings-ui.json).

## Decisões/configurações necessárias

- **Ciência**

  Existe hoje: Política por paciente e preferência pessoal, modo
  automático/expresso

  Lacuna sustentada: Cabeçalho medido antes dos materiais (UX-002)

  Proposta proporcional: Definir significado de abertura/exposição/confirmação
  e
  refletir em evento/texto

- **Acompanhamento inicial**

  Existe hoje: Campo shareWaitSeconds0–10

  Lacuna sustentada: DocumentActions fixa10s e mensagem no deadline (UX-012)

  Proposta proporcional: Consumir política efetiva ou retirar campo sem efeito

- **Rascunho**

  Existe hoje: Sessão local REQ; caminhos servidor COM/BAL

  Lacuna sustentada: Promessa “dispositivo” e continuidade não explícita
  (UX-007)

  Proposta proporcional: Mostrar alcance/hora/validade; servidor somente se
  requisito real

- **Revisão de proposta**

  Existe hoje: Aprovação local, versões e conflitos

  Lacuna sustentada: Conteúdo insuficiente em escala/JSON em política
  (UX-001/005)

  Proposta proporcional: Resumo por domínio e diff útil, preservando validação

- **Unidades**

  Existe hoje: Cadastro próprio, apresentações e quantidade decimal

  Lacuna sustentada: Campo livre no catálogo exige reconciliar intenção e
  vínculo

  Proposta proporcional: Preferir unidade canônica onde contrato permite; não
  migrar dados por suposição

- **Motivos**

  Existe hoje: Texto livre e motivos de divergência existentes

  Lacuna sustentada: Repetição manual em movimentos

  Proposta proporcional: Opções frequentes com exceção, configuráveis só se
  variam
  de fato

- **Retenção de preenchimento**

  Existe hoje: Expiração implementada em alguns fluxos

  Lacuna sustentada: Sem indicação clara de descarte/última gravação

  Proposta proporcional: Política explícita e testes de retomada/isolamento

- **Avisos**

  Existe hoje: Matriz por evento/função/canal, quiet hours e outbox

  Lacuna sustentada: Complexidade de configuração e estados externos

  Proposta proporcional: Resumo por intenção, defaults claros e dependências
  do
  provedor

- **Consulta antiga**

  Existe hoje: Eventos, snapshots, PDFs e histórico

  Lacuna sustentada: Comparação de versões exige esforço (UX-009)

  Proposta proporcional: Link da versão e diferença de negócio

- **Ocorrências**

  Existe hoje: Lista limitada no backend, sem paginação na UI

  Lacuna sustentada: Registros antigos/ref de notificação inacessíveis
  (BE-001)

  Proposta proporcional: Paginar/filtrar e resolver destino exato

Não transformar cada constante em configuração. Regras de autoridade rígidas,
exatidão decimal, identidade do paciente, proibição de quantidade solicitada
na REQ, versões/hash no banco e saldo derivado de movimentos são invariantes.
Não oferecer opção que desligue essas garantias.

## Oportunidades por pessoa

- **Familiar decide proposta**

  Necessidade: Entender mudança e consequência

  Entrega futura sugerida: Sumário antes/depois com pessoa/período/fuso/BAL

  Prioridade relativa: Alta

- **Profissional interrompido**

  Necessidade: Saber o que foi salvo e como retomar

  Entrega futura sugerida: Estado de rascunho e recuperação sem duplicar
  intenção

  Prioridade relativa: Alta

- **Supervisor com muitas pendências**

  Necessidade: Encontrar exceção e responsável

  Entrega futura sugerida: Filtros por tarefa/estado e links exatos

  Prioridade relativa: Média

- **Familiar revisita documento**

  Necessidade: Reconstruir decisão

  Entrega futura sugerida: Versões legíveis e PDF correspondente

  Prioridade relativa: Média

- **Admin configura notificações**

  Necessidade: Entender canal, destinatário e vigência

  Entrega futura sugerida: Legenda, resumo do efeito e erros contextualizados

  Prioridade relativa: Média

- **Cuidador com pouco tempo**

  Necessidade: Evitar digitação repetitiva

  Entrega futura sugerida: Unidades/motivos selecionáveis e busca de material

  Prioridade relativa: Média

- **Operador sem câmera ou Flow**

  Necessidade: Continuar registro físico/manual

  Entrega futura sugerida: Preservar upload/foto e revisão humana

  Prioridade relativa: Já existente; manter

- **Pessoa com dificuldade visual/motora**

  Necessidade: Encontrar foco e acionar controles

  Entrega futura sugerida: Homologação de teclado, zoom e toque real

  Prioridade relativa: Obrigatória na homologação

## Compatibilidade, simplificação e exclusões candidatas

`RequisitionHistory`, `InventoryConsole` e `PrintButton` não têm consumidor
executável demonstrável nas buscas em src/tests/scripts/docs/.github (UX-010).
São candidatos a remoção futura após nova busca e build, sem eliminar APIs,
migrations ou dados históricos por associação de nome.

`/inventarios` redireciona para BAL no Histórico; URLs antigas de documento
conduzem ao visualizador compartilhado. Essa compatibilidade tem valor e deve
continuar testada. Não confundir componente órfão com rota antiga útil.

A referência HTML standalone tem dados/interações simulados declarados.
Serve como memória de design; pode ficar em referências com README claro.
Inventário gerado com base d467f92 não representa comprovação de cobertura do
HEAD atual. O registro de execução guarda história e autorizações daquela
fase; não autoriza novas mutações remotas nesta auditoria.

## Critérios de necessidade

Adicionar uma configuração apenas quando existem pelo menos dois comportamentos
legítimos, um responsável capaz de escolher e efeito observável/testável.
Se todos os pacientes precisam da mesma garantia, a regra pertence ao contrato.
Se uma preferência é pessoal, não ampliar escopo para o paciente inteiro.
Se o valor não é consumido, o formulário precisa ser reconciliado antes de
prometer customização (UX-012).

Para uma proposta nova, documentar: pessoa beneficiada, problema observado,
frequência, alternativa manual segura, dependências, risco de interpretação,
custo de manutenção e critério de sucesso. As oportunidades deste documento não
são todas bloqueadoras de produção.

## Dependências externas e fronteiras

Google OAuth, entrega SMTP/SMS, WhatsApp/Flows, câmera física e experiências em
aparelhos reais exigem evidência específica. Botão disponível, mocks, outbox
interna e capturas de emulação não demonstram entrega efetiva ou usabilidade
em campo. A documentação existente reconhece parte dessas fronteiras; a
auditoria deve conservar essa distinção.

Escalas descrevem programação, sem check-in. Não ampliar para presença,
prescrição ou decisão clínica por inferência. Balanço representa contagem
física declarada e revisão prevista, não medição automática de consumo.
Nenhuma recomendação deve introduzir quantidade solicitada no contrato REQ.

## Ordem de evolução proposta

1. Revisão de decisões concretas (UX-001/005) e recuperação de anexos (UX-003).
2. Estados de leitura e acompanhamento confiáveis (UX-004/012).
3. Semântica de ciência e continuidade de rascunho (UX-002/007), com decisão de
   produto.
4. Linguagem e navegação de preferências (UX-006), consulta
   histórica/ocorrências.
5. Consolidação visual e limpeza de consumidores (UX-008/010), seguida de
   comparação de versões e redução de digitação onde a necessidade for validada.

Antes de liberar evolução, testar o percurso completo com identidades Auth reais
locais, autorização servidor, resposta perdida e conflito; inspecionar telas e
PDFs atuais. O aceite exige evidência da ação e do resultado, não apenas
existência de botão ou compilação.

A rodada atual confirmou decisões sem resumo, ciência por cabeçalho, recuperação
de upload, vazio precoce e acompanhamento fixo. São evidências locais;
não substituem homologação externa ou validação com cuidadores reais.
Ver [registro de execução](evidence/UI_RUNTIME_REVIEW.md).
