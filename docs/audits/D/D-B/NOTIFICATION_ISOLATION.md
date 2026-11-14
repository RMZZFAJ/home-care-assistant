# Sino de notificações: foco e redimensionamento

D3.39, base3109e83. [Provas](NOTIFICATION_ISOLATION_VALIDATION.json),
[CI anterior](CI_3109E83_OBSERVATION.json). Correção dirigida; D-B continua ativa.

Base UI1.9 só ativa o gerenciador modal quando há um Popover.Close registrado.
O sino usava botão comum, deixando a apresentação inicial exposta à navegação
enquanto o painel a sobrepunha. Contraprova WebKit reproduziu a falta de
isolamento com apresentação realmente montada e progresso inicial confirmado.

O fechamento agora usa o componente registrado, preservando o modo trap-focus.
O ID duplicado foi retirado. A apresentação continua montada e volta a ser
acessível ao fechar; abrir ou fechar não pula, inicia ou conclui o guia.
Escape, botão de fechamento e retorno de foco ao sino foram comprovados.

O teste de768→320px também revelou overflow persistente no Chromium móvel:
clientWidth320, scrollWidth/visualViewport644, escala0,4969. Esperar a posição
não resolveu. O painel do cabeçalho aderente agora usa o posicionamento fixo
suportado pela biblioteca; o outro consumidor mantém seu padrão. Não há
coordenadas manuais, corte por overflow, regra axe excluída ou timeout aumentado.

Oito cenários distintos aprovados:6 do sino em Chromium desktop/móvel/WebKit e
2 do guia em Chromium móvel/WebKit. Cobrem quatro larguras, Tab/Shift+Tab,
isolamento com DOM preservado, ID único, ausência de efeitos ao consultar,
histórico, abertura explícita do aviso com uma marcação como vista, estoque e
eventos preservados, progresso do guia e sua configuração autorizada.
Tipos/lint passaram; duas capturas foram inspecionadas. Rodadas e contraprovas
ficam no JSON. Os dois casos do guia, que não abrem o sino, foram conservados
após a mudança de posicionamento; os seis consumidores afetados foram repetidos.

Sem SQL novo:172 versões locais/remotas, digest igual e zero pendências.
Matriz105x39/primeiras30,56 PASS/49 PARTIAL e18 requisitos UI preservados.
CI3109e83 aprovou Windows/Ubuntu/banco; browsers estavam em andamento e Preview
READY na consulta. A CI do novo SHA é independente. Restam transferências,
decisões contextuais BAL/REQ, paridade66/171 e gates externos. Não há aprovação
de aparelho físico ou tecnologia assistiva humana. Sonar adiado, PR7 Draft,
sem merge/produção; assinatura, backups e monitoramento sem nova aprovação.
