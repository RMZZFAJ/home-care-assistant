# Dependências entre grupos e fronteiras de validação

B2 reconstrói o processo e sua consequência. Este documento encaminha questões
para aprofundamento futuro, sem iniciar outro grupo, decidir Fase C ou autorizar
correção. Achado herdado não ganha status de novo teste. Produto37cb7f85
continua
funcionalmente idêntico à base das Fases A/B1; o NO-GO A não foi revogado.

## O que precisa ser decidido ou comprovado em conjunto

- **Dependência:** A UX-001/B1-UX-001 P1; **Consequência operacional:** Gestor
  aprova alteração de plantão sem objeto completo da decisão; **Responsabilidade
  de investigação futura:** Interface com domínio de escala/BAL;
  **Evidência/aceite a preservar:** Antes/depois, pessoa, fuso, janela e
  impacto; autoridade/versionamento não bastam

- **Dependência:** A DB-002 P1 e DB-006; **Consequência operacional:** Paciente
  pode deixar de receber lembretes porque lote não progride; **Responsabilidade
  de investigação futura:** Banco, worker e operação multipaciente;
  **Evidência/aceite a preservar:** Terminais fora da seleção; progresso em
  lotes consecutivos; AC-X09; sem novo runtime B2

- **Dependência:** B2-004/A DB-001; **Consequência operacional:** Cancelamento
  com consumo positivo não conclui; **Responsabilidade de investigação futura:**
  Banco/backend e domínio de consumo/ENT; **Evidência/aceite a preservar:**
  Corrigir ramo e provar elegibilidade temporal/quantitativa; zero débito
  duplicado; atomicidade atual mantida

- **Dependência:** B2-013/A DB-003; **Consequência operacional:** Corte de série
  perde efeito após aprovação; **Responsabilidade de investigação futura:**
  Banco/backend, interface de decisão e BAL; **Evidência/aceite a preservar:**
  Respeitar ended_on/canceladas; não inferir presença; AC-B2-013

- **Dependência:** B2-016/A DB-004 e B1-ERR-001; **Consequência operacional:**
  Tentativa incerta pode bloquear arquivo/futuro comprovante; **Responsabilidade
  de investigação futura:** Storage/backend e recuperação da interface;
  **Evidência/aceite a preservar:** Mesmo hash/chave recupera; abandono não
  remove ready ou reserva ativa; AC-B2-016

- **Dependência:** B2-017/A BE-001 e B1-UX-007; **Consequência operacional:**
  Contador/aviso não alcança relato antigo; **Responsabilidade de investigação
  futura:** API/consultas e fila humana; **Evidência/aceite a preservar:**
  DetalheID, cursor/filtro, escopo e autorização; AC-B2-017

- **Dependência:** B2-005/B2-009/B2-011; **Consequência operacional:** Controle
  no formulário não cobre chamada direta ou intenção oposta; **Responsabilidade
  de investigação futura:** Banco/API, autorização e feedback;
  **Evidência/aceite a preservar:** Guard de referência/identidade e resultado
  explícito; sem retirar operações legítimas

- **Dependência:** B2-001/B2-002/B2-007/B2-010; **Consequência operacional:**
  Fato real não possui etapa digital suficiente para terminar;
  **Responsabilidade de investigação futura:** Responsável do produto com
  operação familiar; **Evidência/aceite a preservar:** Política e transição
  antes de schema; alternativas simples O02/O03/O05/O12

- **Dependência:** B2-012/B2-014/B2-015; **Consequência operacional:** Próxima
  pessoa não consegue agir após mudança de tarefa/pessoa; **Responsabilidade de
  investigação futura:** Escala/BAL/ENT e gestão de vínculos; **Evidência/aceite
  a preservar:** Revogação imediata; próximo responsável nomeado; sem herdar
  assinatura; AC-X05/06

- **Dependência:** B2-006/B2-008/B1-FORM-005; **Consequência operacional:**
  Conferir embalagem/origem exige memória ou busca manual; **Responsabilidade de
  investigação futura:** Catálogo, quantidades, documentos e interface;
  **Evidência/aceite a preservar:** Unidade base/snapshot/autorização; O08/O09
  antes de novo painel

- **Dependência:** A BE-005; **Consequência operacional:** Retry de proposta
  pelo adaptador antigo pode duplicar identidade; **Responsabilidade de
  investigação futura:** Governança/API e experiência de recuperação;
  **Evidência/aceite a preservar:** Chave do cliente, consulta da mesma
  tentativa; B2 só reconstruiu consequência

- **Dependência:** A BE-004; **Consequência operacional:** Auditoria
  administrativa antiga fica fora da janela recente; **Responsabilidade de
  investigação futura:** Consulta/auditoria com capacidade local;
  **Evidência/aceite a preservar:** Paginação/período/ator/objeto; B2 não criou
  novo lote de eventos administrativos

- **Dependência:** A DB-007/B1 estados de frescor; **Consequência operacional:**
  Mudança de perfil/proponente e consulta antiga podem coexistir;
  **Responsabilidade de investigação futura:** Atualização de autoridade,
  interface e consultas; **Evidência/aceite a preservar:** Banco revalida; UI
  sinaliza contexto/frescor; B27 não fecha matriz completa de invalidation

- **Dependência:** A BE-002/BE-003; **Consequência operacional:** Significado de
  resumo externo e prazo do worker podem comprometer continuidade;
  **Responsabilidade de investigação futura:** Integração/worker e comunicação
  humana; **Evidência/aceite a preservar:** Referências históricas; não
  revalidadas em provedor nesta B2

- **Dependência:** A OPS-001; **Consequência operacional:** Backup do banco não
  prova recuperação integral da operação; **Responsabilidade de investigação
  futura:** Infraestrutura, Auth, Storage e responsável de continuidade;
  **Evidência/aceite a preservar:** Destino autorizado, manifesto, restore
  integral, smoke e RPO/RTO aceitos; AC-X11

- **Dependência:** A QA-001/B1-QA-001; **Consequência operacional:** Helper de
  navegação pode dar resultado E2E instável; **Responsabilidade de investigação
  futura:** Testes/CI; **Evidência/aceite a preservar:** Seis casos B2 passaram;
  isso não demonstra correção da suíte completa ou do CI

## Estados que diferentes grupos precisam preservar

Contrato de domínio precede qualquer solução técnica. Uma desistência de
compra não é devolução; sucessão futura não é editar assinatura passada; reconto
não é consumo; ciência não é aceite de material; escala não é presença. Uma
solução visual pode tornar o próximo passo encontrável, mas não criar uma
autoridade que o banco não reconhece. Um guard no banco pode impedir erro e
ainda deixar a família sem processo de recuperação: as duas conclusões podem
ser verdadeiras simultaneamente.

Eventos anteriores, versão, hash canônico, snapshots e ledger devem sobreviver
às
correções. API valida contexto/capacidade e banco revalida estado/quantidade;
grants, RLS e SECURITY DEFINER exigem avaliação conjunta no grupo especializado.
Os testes Auth desta B2 são evidência dirigida, não auditoria completa dessas
camadas. Não orientar futura implementação por metadata, IDs ou nomes do
cliente.

## Como interpretar as provas e os limites

Foram executados81cenários locais dirigidos e seis E2E selecionados, além de
renderização de entregas e quatro páginas de PDF. Cinquenta e sete
dos 66 processos
têm amostra local dirigida; nove têm apenas reconstrução estática nesta B2:
perfil/contatos completos, mínimos, lotes, Flow, presença, importação física,
mensagem externa, lembretes em lote e aceiteWhatsApp. Partes não exercitadas dos
57 também estão expressas na cobertura; essa contagem não homologa cada ramo.

Regularização de múltiplas semanas, aprovação de adiamento ainda pending e
regra temporal do consumo após o erro42702 merecem validação específica.
A simulação temporal com rollback prova a regra dirigida no banco; não é
espera de dias reais, execução de provedor ou presença humana. Contratos de
Flow/WhatsApp foram examinados sem ativar canais ou enviar mensagens.

Nenhum participante real foi observado; Android/iPhone são emulação. Câmera,
scanner físico, impressão, leitor de tela em aparelho e compreensão dos papéis
continuam pendentes. Aparência de quatro páginas fictícias não cobre todos
layouts extremos. Propostas O16/O17/O18/O20 precisam comprovar necessidade real.

Não houve migrations/reset/seed/restore ou alteração remota. Suítes que
pressupõem substituição do banco não foram executadas. O corpus sintético novo
e as transações com rollback estão identificados; dados antigos foram
preservados.
Checks unitários/build e amostra E2E não substituem homologação de produção.

## Encaminhamento utilizável

O registro13 contém causa, evidência, reprodução, limites e alternativa;
o14define
resultados positivos e proibidos. O catálogo12 descreve custo/risco e benefício
para cada proposta. O17agrupa decisões para o responsável. Revisores futuros
podem usar esses IDs sem reconstruir os logs; se um contrato mudar, registrar
nova versão e revalidar o processo correspondente, sem sobrescrever evidência
B2.
