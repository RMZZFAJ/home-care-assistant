# Guias e capturas reais a produzir na D

O01 aprova apresentação opcional por perfil no primeiro login, configurada por
administração autorizada, e reabertura pelo usuário no perfil. Ajudas inline
essenciais não dependem do tour. Voltar, pular e retomar não perdem edição.
Tooltip não é único local de regra necessária.

<!-- c-table:start -->

- **Perfil/tarefa:** Equipe: REQ

  **Passos e guia contextual:** Paciente, materiais, contar/desconhecido,
  revisar, emitir, consultar

  **Capturas reais futuras:** SHOT-REQ-01/02/03/05; vazio/zero/unknown e
  retomada

- **Perfil/tarefa:** Recebedor: ENT

  **Passos e guia contextual:** Conferir identidade e materiais; aceite
  pessoal/ressalva; trânsito

  **Capturas reais futuras:** SHOT-ENT-02/03/04/05; terceiro negado,
  parcial2/3

- **Perfil/tarefa:** Contador/substituta: BAL

  **Passos e guia contextual:** Contar sem referência; confirmar efeito;
  revisão/reconto se iniciados

  **Capturas reais futuras:** SHOT-BAL-01/02/03/04/05; autoras distintas

- **Perfil/tarefa:** Família: aquisição/estoque

  **Passos e guia contextual:** Compra/doação; parcela; validação; dispensa;
  origem

  **Capturas reais futuras:** SHOT-COM-01/02/03/04 e EST-01/02/03/04

- **Perfil/tarefa:** Família: pessoas/agenda

  **Passos e guia contextual:** Credenciais; convite; troca; revogação com
  pendência

  **Capturas reais futuras:** SHOT-ID-03/04/05 e ESC-01/02/03/04

- **Perfil/tarefa:** Titular: edição/arquivo

  **Passos e guia contextual:** Retomar tipo certo; conflito; anexo incerto;
  descarte

  **Capturas reais futuras:** SHOT-RAS-01/02 e ARQ-01/02

- **Perfil/tarefa:** Titular: avisos/PWA

  **Passos e guia contextual:** Ciência separada; instalar;
  gesto/permissão/recusa; abrir tarefa

  **Capturas reais futuras:** SHOT-NOT-01/02/03/04; OS/browser registrados

- **Perfil/tarefa:** Leitor: documentos

  **Passos e guia contextual:** Versão/emissão; baixar/emitir; comparar;
  interpretar confiança

  **Capturas reais futuras:** SHOT-DOC-01/02/03/04/05

- **Perfil/tarefa:** Global: nova residência

  **Passos e guia contextual:** Sete etapas e revisão final; tarefas locais
  por autoridade

  **Capturas reais futuras:** SHOT-GUI-02 por etapa; criação familiar negada

- **Perfil/tarefa:** Suporte/titular/substituto

  **Passos e guia contextual:** Falha segura; contingência; restore em
  quarentena; conciliar

  **Capturas reais futuras:** SHOT-ADM-05, NOT-05 e GUI-03/04

- **Perfil/tarefa:** Supervisão futura

  **Passos e guia contextual:** Consulta/revisão autorizada; limites de papel
  e novo reconto

  **Capturas reais futuras:** SHOT-GUI-01 e BAL-03/04; ativação adiada

<!-- c-table:end -->

Cada uma das 66 fichas tem ID `SHOT-[tela]`; a matriz organiza o manual por
tarefa. Capturas serão do app implementado, com SHA/config, dados fictícios,
viewport, perfil, estado e texto alternativo. Fluxo em etapas usa sufixos
`-01`, `-02`. Instrução essencial também existe em texto acessível.

Na D, revisar notebook, tablet Android, celular Android e iPhone, navegadores
efetivos e AT pertinente: teclado/foco, pular/reabrir, zoom/reflow, contraste
e help em erro/uncertain. No iPhone, validar instalação na tela inicial, gesto
e permissão no ambiente suportado, conforme a
[referência WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
Não anunciar homologação de versões atuais a partir dessa referência.

Os PNG em `prototype/` ilustram a direção aprovada; não são prova de
comportamento, aparelho físico ou captura do aplicativo disponível. Nenhuma
captura funcional nova foi produzida nesta missão documental.
