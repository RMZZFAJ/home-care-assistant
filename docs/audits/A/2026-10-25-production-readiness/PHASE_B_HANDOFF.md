# Transferência para a Fase B

A Fase A entrega diagnóstico, não correções. O próximo profissional deve
começar pelo README desta pasta, resumo executivo, registro mestre, matriz
de homologação e roadmap. Base: `37cb7f85e96e551d6419871f94dd950712e2565b`.
Não presumir que o HEAD, providers ou ambiente remoto continuam iguais.

## Retomada segura

1. Conferir `git status`, SHA e alterações locais. Não fazer reset, squash,
   stage ou limpeza para reproduzir o estado desta auditoria.
2. Ler a autorização nova e AGENTS; ela deve distinguir implementar, testar,
   commitar, migrar remoto e publicar. Esta Fase A não concede essas ações.
3. Usar Node/npm dos arquivos de versão e o Supabase local existente. Antes
   de fixtures/reset, validar projeto, origem, containers e consentimento
   vigente; preservar dados novos que possam ter sido adicionados depois.
4. Consultar o CSV pelo ID e abrir a evidência. Reproduzir com resultado
   esperado correto; os probes diagnósticos atuais observam defeitos e não
   devem virar testes que legitimem esses comportamentos.
5. Priorizar B0/B1. Repetir checks afetados, revisar diff e atualizar a matriz
   no SHA candidato. Preservar migrations antigas e URLs documentais.

O workspace contém anexos da missão e documentos novos, alguns staged.
Não há commit da auditoria criado por esta execução. Fixtures e sessões
sintéticas locais permaneceram para inspeção. Credenciais ficam fora deste
pacote; não extrair nem registrar valores em relatórios, traces ou navegador.

## Auditorias especializadas justificadas pelos achados

### Temporalidade e progresso das funções de banco

Base: DB-001/002/003/006/007. Perguntas: consumo de qual janela entra no
cancelamento? Estados terminais saem da candidatura? Todo paciente elegível
progride? Aprovação respeita encerramento? Toda mudança alcança seus leitores?

Ler `DATABASE_AUTH_SECURITY.md`, últimas definições das funções nas migrations,
probes de cancelamento/lifecycle e logs capturados. Entregar reprodução mínima
de cada hipótese, migration incremental e regressões de clean/legacy/Auth.
Não confundir aplicação de migration com cobertura de todos os seus ramos.

### Decisões humanas e recuperação em rede móvel

Base: UX-001/002/003/004/005/007/012, BE-005 e DB-004. Investigar exatamente
o que a pessoa viu antes de confirmar, o que pode editar após resposta perdida
e como reconhece conclusão. Usar screenshots e reprodutores UI atuais como
ponto inicial, depois sessões com família, profissional e administrador.

Entregar critérios de comportamento, linguagem e recuperação; validação em
aparelho real e teclado/leitor de tela. Preservar ciência distinta de aceite,
REQ sem quantidade solicitada e alternativa física/foto. A questão “2/2 itens
atendidos” junto de parcial exige explicação do domínio, não ajuste de saldo.

### Trabalho antigo, leitura e invalidadores

Base: BE-001/004, UX-009, DB-007. Exercitar mais de 100 registros, destinatários
sem vínculo local, mudança de perfil, link persistido e versões concorrentes.
Entregar busca/paginação com escopo seguro e histórico reconstruível. Foco em
recuperabilidade da informação; não criar dashboard adicional sem necessidade.

### Confiabilidade de workers e provedores

Base: BE-002/003, DB-006, REPO-003. Medir budgets e lease, validar presenter
com evento tardio e realizar homologação externa autorizada. Conferir templates
e Flows publicados, webhook, retry, callback e destino. Registro local de
outbox não comprova entrega real. Não chamar ferramenta que submete templates
enquanto o objetivo for somente inspecionar.

### Continuidade, capacidade e privacidade operacional

Base: OPS-001, REPO-004, BE-006 e DB-005. Ensaiar restore completo, definir
RPO/RTO e medir consultas/payload/histórico com volumes realistas. Conferir
conteúdo exportado para containers usando sentinela fictícia. Entregar dados
de custo/latência antes de propor cache, índice ou remodelagem de eventos.
Não há evidência de exfiltração a ser presumida nem rotação automática exigida.

Essas frentes podem compartilhar contratos e evidências, mas não precisam
repetir indiscriminadamente a auditoria dos 503 arquivos. Segurança
especializada
deve concentrar novas migrations, grants, SECURITY DEFINER, Storage e fronteiras
alteradas. O verde local existente não equivale a certificação integral.

## Decisões humanas que ainda faltam

- Quais papéis e funcionalidades entram no piloto e quem responde por cada
  pendência, divergência e contingência manual.
- Qual significado operacional de ciência automática e qual texto comunica
  seu limite, com consentimento e opção expressa preservados.
- Duração esperada de rascunho, retomada entre abas/dispositivos e necessidade
  real de persistência adicional, sem ampliar retenção privada por suposição.
- RPO/RTO, retenção, ambiente de ensaio, canais externos e responsáveis.
- Necessidade de estoque observado no PDF e densidade de impressão; nunca
  reintroduzir quantidade solicitada no contrato de REQ.

Não são perguntas bloqueadoras da documentação da Fase A. São decisões de
produto/operação necessárias para implementar e liberar o escopo escolhido.

## Pacote de contexto e cautelas de interpretação

`COVERAGE.csv` e seu resumo delimitam semântica, runtime e visual. Os 36 campos
de `FINDINGS_MASTER.csv` incluem alternativas, esforço, risco, invariantes,
aceite e contraditório. `evidence/MANIFEST.csv` permite conferir hashes.

Não usar imagens iniciais de loading como prova de dashboard pronto; usar
prefixo `ui-dashboard-ready-`. Não chamar os testes locais de 120/120.
Não confundir os três PDFs de referência com o PDF atual de quatro páginas.
Não tratar DB-001 como corrupção confirmada ou DB-002 como impacto já ocorrido
em todos os pacientes. Não implementar DB-003 sem primeiro testar a sequência.

Preservar esta pasta como evidência datada. Novos resultados devem identificar
novo SHA, data, ambiente e autor. O primeiro ponto de retomada é o lote B0,
em conjunto com a reprodução dos P1 de B1, após autorização da Fase B.
