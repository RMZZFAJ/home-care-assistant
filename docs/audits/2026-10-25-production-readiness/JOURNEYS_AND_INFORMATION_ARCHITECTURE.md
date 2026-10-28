# Jornadas e arquitetura de informação

A navegação diferencia gestão e operação, mas o julgamento de prontidão depende
do percurso completo: intenção, autorização, decisão, confirmação, recuperação e
consulta posterior. Leitura semântica concluída no SHA
`37cb7f85e96e551d6419871f94dd950712e2565b`; exploração dirigida executada na
origem local verificada
com dados sintéticos (27/10/2026). Esta matriz não declara execução de todas as
combinações.

## Perfis e contexto

Identidade global e função no paciente não são equivalentes. O workspace
consulta contexto autorizado; o cliente apresenta capacidades, não as concede.
`AuthenticatedPage` valida sessão/perfil; `WorkspaceProvider` controla seleção;
`AppWorkspace` remonta conteúdo contextual e trata falta/incompatibilidade de
contexto. O paciente é visível na navegação e nos documentos.

- **Profissional**

  Intenção cotidiana: Solicitar materiais, conferir sua entrega, contar quando
  designado

  Destinos e limites: Início/Histórico/Entregas/Estoque/Mais; destinatário e
  atribuição importam

- **Supervisão**

  Intenção cotidiana: Acompanhar equipe, revisar conforme política, relatar
  situação

  Destinos e limites: Shell operacional e conteúdo de equipe; não assumir
  identidade de profissional

- **Familiar**

  Intenção cotidiana: Conhecer necessidade, organizar compra/entrega, decidir
  adiamento

  Destinos e limites: Gestão por paciente; ciência e recebimento são distintos

- **Admin local**

  Intenção cotidiana: Configurar catálogo, vínculos, política e escala

  Destinos e limites: Atuação restrita ao paciente; decisão local não deriva
  do
  papel global

- **Admin global**

  Intenção cotidiana: Identidades e recursos globais; propor alterações locais

  Destinos e limites: Não recebe autoridade local implicitamente

- **Leitor**

  Intenção cotidiana: Consultar conteúdo permitido

  Destinos e limites: Ausência de comandos é esperada, com contexto explicável

Família e administrador local podem compartilhar interface gerencial sem terem
capacidades idênticas. Evitar especificação “perfil X sempre pode Y” fora da
política efetiva e das invariantes rígidas.

## Mapa de intenções e rotas

- **O que precisa de mim**

  Entrada principal: `/`

  Relação com outros destinos: Links filtrados e tarefas, não uma lista
  genérica
  de módulos

- **Consultar documentos**

  Entrada principal: `/historico`

  Relação com outros destinos: Filtros/página na URL; `/documentos/[id]`
  compartilha visualizador

- **Emitir**

  Entrada principal: `/fichas`, `/fichas/req,com,ent,bal`

  Relação com outros destinos: Tipo/capacidade/contexto determinam formulário

- **Conferir entregas**

  Entrada principal: `/entregas`

  Relação com outros destinos: Caixa própria/equipe complementa busca do
  histórico

- **Entender saldo**

  Entrada principal: `/estoque`

  Relação com outros destinos: Família/equipe/trânsito, movimentos e anexos

- **Relatar e revisar consumo**

  Entrada principal: `/consumo`

  Relação com outros destinos: Sugestões/ocorrências, confirmação afeta ledger

- **Organizar plantões**

  Entrada principal: `/escalas`

  Relação com outros destinos: Proposta, decisão, programação; sem presença
  física

- **Acompanhar BAL**

  Entrada principal: `/balancos`

  Relação com outros destinos: Regime, atribuição, adiamento, revisão e
  regularização

- **Ajustar paciente**

  Entrada principal: `/admin`, `/configuracoes`, `/unidades`

  Relação com outros destinos: Áreas por capacidade e URLs de seção

- **Identidade pessoal**

  Entrada principal: `/perfil`

  Relação com outros destinos: Preferências, segurança, contatos, sessões

- **Meus avisos**

  Entrada principal: `/notificacoes` e sino

  Relação com outros destinos: Transporte/ciência/estado do documento
  independentes

- **URLs anteriores**

  Entrada principal: `/historico/[id]`, `/fichas/[id]`, `/inventarios`

  Relação com outros destinos: Adaptadores/redirects úteis; não remover por
  parecer duplicado

## Jornadas reconstruídas

- **REQ**

  Caminho real e ponto de decisão: Identidade, categorias fixas, extras,
  observação, revisão, emissão; sem quantidade solicitada

  Recuperação e lacuna: Autosave local e intenção idempotente; texto do
  alcance
  local precisa precisão (UX-007)

- **Repetição de material**

  Caminho real e ponto de decisão: Resolver item já solicitado e consultar
  relação
  sem perder edição

  Recuperação e lacuna: Manter justificativa e não transformar todo pedido
  repetido em erro

- **Ciência REQ**

  Caminho real e ponto de decisão: Documento e responsáveis, modo automático
  ou
  expresso, política

  Recuperação e lacuna: Cabeçalho observado antes dos itens (UX-002);
  distinguir
  sinal e compreensão

- **COM compra/doação**

  Caminho real e ponto de decisão: Selecionar itens/quantidades, registrar
  origem,
  receber, validar conforme política

  Recuperação e lacuna: Não confundir compra com atendimento da REQ nem
  projeção
  com saldo

- **ENT**

  Caminho real e ponto de decisão: Expedir de custódia autorizada para
  destinatário, conferir quantidades, divergência/aceite

  Recuperação e lacuna: Confirmar tudo e motivos estruturados existem; não
  exigir
  digitação repetida sem necessidade

- **Cancelamento/correção**

  Caminho real e ponto de decisão: Ação contextual e
  autorização/versionamento;
  compensação quando apropriada

  Recuperação e lacuna: Não editar diretamente saldo nem apagar documento para
  corrigir

- **BAL por plantão**

  Caminho real e ponto de decisão: Obrigação/atribuição real, janela, contagem
  sem
  saldo esperado, revisão, envio

  Recuperação e lacuna: Referência pode ficar desatualizada; reconferir sem
  perder
  contagem; resposta perdida usa mesma intenção

- **Adiamento BAL**

  Caminho real e ponto de decisão: Solicitação, decisão familiar,
  responsabilidade
  e prazo visíveis

  Recuperação e lacuna: Pedido pendente não suspende prazo; conservar atraso
  original e explicar prazo efetivo

- **Escala**

  Caminho real e ponto de decisão: Tipos, série/ciclo, proposta, publicação,
  exceção, encerramento

  Recuperação e lacuna: UX-001 impede avaliar proposta pontual pelo conteúdo
  da
  tela

- **Estoque**

  Caminho real e ponto de decisão: Confirmado por custódia, trânsito e
  projeção,
  mínimos, histórico

  Recuperação e lacuna: Movimento manual precisa motivo e correção vinculada;
  não
  sugerir saldo negativo como solução

- **Consumo/Flow**

  Caminho real e ponto de decisão: Relato/sugestão, revisão autorizada e
  confirmação de débito

  Recuperação e lacuna: Vazio precoce UX-004; limite100 e ref ignorado em
  BE-001

- **Anexo físico**

  Caminho real e ponto de decisão: Foto/PDF vinculado e consulta

  Recuperação e lacuna: Alternativa manual preservada; transporte incerto não
  congela seleção (UX-003)

- **Configuração**

  Caminho real e ponto de decisão: Lista/resumo, painel, revisão, salvar;
  conflito
  obriga nova leitura

  Recuperação e lacuna: Proposta global é JSON para decisão local (UX-005);
  alguns
  rótulos técnicos UX-006

- **Login/convite/perfil**

  Caminho real e ponto de decisão: Login, recuperação, aceite, contexto,
  seções de
  identidade/contato/MFA

  Recuperação e lacuna: Provedores externos dependem homologação; não presumir
  fluxo completo pelo botão

- **Consulta antiga**

  Caminho real e ponto de decisão: Histórico filtrado, documento, eventos,
  versões/PDF

  Recuperação e lacuna: Melhorar síntese do antes/depois e acesso à versão
  pertinente (UX-009)

## Interrupção como parte do percurso

- **Navegação entre etapas REQ**

  Comportamento encontrado: Formulário em memória e autosave de sessão

  Critério futuro: Retomar valores, indicar última gravação e escopo

- **Recarregar durante tentativa incerta**

  Comportamento encontrado: Wizards persistem intenção em caminhos próprios

  Critério futuro: Mesma chave e payload, nenhum novo documento acidental

- **Rede interrompida em anexo**

  Comportamento encontrado: Chave preservada, arquivo editável por catch
  incompleto

  Critério futuro: Congelar e recuperar antes de nova escolha

- **Outra pessoa modifica documento**

  Comportamento encontrado: Versionamento e409, reload/revisão

  Critério futuro: Expor o que mudou e conservar trabalho local válido

- **Troca de paciente/contexto**

  Comportamento encontrado: Contexto explícito e remontagem

  Critério futuro: Não reaproveitar dados do paciente anterior

- **Janela BAL expira**

  Comportamento encontrado: Elegibilidade revalidada e valores preservados

  Critério futuro: Explicar motivo e próximo responsável/ação possível

- **Cadastro em drawer abandonado**

  Comportamento encontrado: Confirmação de descarte e busy guard

  Critério futuro: Teclado, Escape e retorno de foco verificáveis

- **Lista lenta**

  Comportamento encontrado: Cobertura desigual de loading

  Critério futuro: Não afirmar ausência antes da resposta

- **Provedor indisponível**

  Comportamento encontrado: Documento e comunicação independentes

  Critério futuro: Persistência confirmada permanece visível, canal indica
  dependência

Não foi provado que todas as mutações sobrevivam ao encerramento do navegador.
Rascunho local e documento no servidor são mecanismos diferentes. Não prometer
retomada entre dispositivos sem contrato explícito.

## Redução de esforço sem perder sentido

A estrutura central de navegação é defensável. Entregas e Histórico têm
intenções
diferentes; cinco destinos operacionais mantêm acesso direto ao saldo.
Oportunidades
de maior valor estão dentro da tarefa: resumo antes de decidir, próximos passos
claros depois de erro e vocabulário familiar. Uma reformulação integral do menu
não é pré-condição demonstrada.

Preferências pessoais devem ser encontráveis a partir da central de avisos;
o rótulo atual no menu encaminha apenas à lista (UX-006). Escala e BAL podem
compartilhar relações/contexto, mas não uma ação ambígua: programação, presença
física, obrigação de contagem e revisão são conceitos separados.

## Roteiro exploratório e execução

1. Usar somente runner/origem local verificados e contas sintéticas.
2. Criar proposta pontual de mudança de pessoa/período; abrir decisão como
   gestor;
   capturar resumo e confirmar se há algum caminho de revisão equivalente.
3. Abrir REQ elegível com automático habilitado; medir cabeçalho/itens no
   viewport
   e momento do POST, sem interpretar abertura como leitura.
4. Atrasar/falhar leituras para observar loading, vazio, erro e retry.
5. Simular resposta perdida de upload depois da gravação e conferir recuperação.
6. Percorrer perfis em 320/390/768/1440/1920px, teclado e foco de drawer/dialog.
7. Gerar PDF sintético atual de ENT parcial ou BAL divergente; guardar em
   evidence
   e inspecionar todas as páginas, nomeando versão e estado.
8. Registrar cada execução com SHA, perfil, viewport, fixture, passos, resultado
   e limitações; capturas antigas ficam fora dessa contagem.

Fora do alcance atual: aparelhos físicos, experiência de cuidadores reais sob
interrupção, leitores de tela humanos e entrega efetiva de mensagens externas.
Essas lacunas exigem homologação específica, não conclusão inferida de
screenshots.

A execução confirmou os cenários2–5 e gerou o PDF atual do passo7.
O passo6 cobriu dashboards de6perfis, cinco larguras para admin/profissional
e teclado do diálogo de escala; não todos os formulários. Capturas prontas
aguardam o dashboard carregado. Detalhes:
[UI_RUNTIME_REVIEW](evidence/UI_RUNTIME_REVIEW.md).
