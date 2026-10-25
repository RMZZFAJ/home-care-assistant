# Escalas de plantão

A agenda representa a programação prevista, sem controle de presença.
Tipos, séries, ocorrências, propostas e eventos são persistentes por paciente.
Séries têm validade explícita de até 366 dias e são materializadas integralmente,
com conflitos verificados na mesma transação. Uma série futura pode substituir
uma programação encerrada; exceções pontuais preservam o início original.

Programação semanal conserva o horário civil no fuso escolhido. Ciclos 12×36,
24×48 e 24×24 conservam horas corridas a partir da âncora. Os intervalos UTC
incluem o início e excluem o fim: plantões adjacentes são permitidos.
Uma exclusão GiST impede sobreposição do mesmo profissional entre pacientes.
O erro devolvido não identifica o outro paciente nem revela sua programação.

Consulta própria, consulta da equipe, proposta, publicação própria, gestão da
equipe e gestão de tipos são capacidades distintas. Publicação própria não
tem concessão padrão. Profissionais precisam de vínculo ativo elegível.
Administração global não confere autoridade local. Alterações exigem versão,
motivo e chave idempotente; tabelas não aceitam escrita direta do cliente.

Desktop oferece semana/mês e filtros. Mobile mostra o dia escolhido, com
navegação diária e edição em painel. Horários da alteração usam o fuso do
plantão; o fuso do dispositivo não altera o instante gravado. Propostas não
substituem a escala publicada antes da decisão autorizada.

Avisos de alterações reutilizam a outbox V4 e são ligados aos eventos por
lembretes deduplicados. A matriz permite configurar os eventos no aplicativo.
Canais externos permanecem sujeitos aos contratos e à liberação do provedor.

Validação inicial: integração com Auth real cobriu 12×36 noturno, proposta,
aprovação, exceção, encerramento, idempotência, escrita direta recusada,
proibição por perfil e conflito entre pacientes. O E2E Chromium cadastrou
tipo e programação pela interface, confirmou persistência, recusou conflito
pela API e validou as apresentações de 1366 e 390 px. Capturas foram
inspecionadas. A rodada integral por navegador pertence à homologação final.
