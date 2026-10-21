# Operação por paciente

## Ambiente de desenvolvimento

O projeto Supabase local home-care-assistant atende desenvolvimento e testes,
com API em 127.0.0.1:54321. Use os helpers documentados em [Testes](TESTING.md).
Antes de replay ou carga de fixtures, preserve dados locais que precisem
continuar disponíveis. Dados fictícios e credenciais de teste ficam somente
no ambiente local; não copie fixtures para o remoto.

## Acesso e administração

Um administrador global cria o paciente e concede administração local.
O administrador do paciente pode cadastrar e organizar itens, convidar pessoas,
alterar papéis locais, revogar vínculos e configurar sua operação. Não altera
a identidade global de contas compartilhadas. Use convites para pessoas ainda
sem vínculo; o aceite valida e-mail, prazo e autoridade atual do emissor.

O convite é compartilhado manualmente. Quem já possui conta usa o login;
quem não possui cria sua conta pessoal, confirma e-mail e aceita o convite.
Recuperação de senha é pessoal. Reemitir convite invalida o link anterior.

## Catálogo e requisição

Novos pacientes começam com catálogo vazio. Adote modelos ou crie itens
exclusivos, edite atributos locais e inative produtos antigos. Não altere
unidade de item com histórico; crie substituto e faça conciliação explícita.
Aliases podem oferecer várias sugestões; o usuário confirma o produto.

No formulário, selecione paciente e itens, informe estoque observado, urgência
e observações operacionais. Saldos oficiais da equipe e família são separados;
o estoque informado não movimenta o ledger. Revise e confirme. Se houver
resultado incerto, recupere a mesma tentativa antes de iniciar outra.

O comprovante usa dados persistidos e pode ser reimpresso pelo histórico.
Filtros de data consideram São Paulo. Usuários autorizados consultam todo
o histórico daquele paciente, independentemente do solicitante.

## Estoque e inventário

Administradores registram entradas, saídas, transferências e ajustes com
justificativa. Corrija por movimento compensatório, preservando o histórico.
Somente o administrador global pode confirmar ajuste extraordinário negativo.

Abra inventário na custódia correta, conte todos os itens e justifique diferenças.
Submeta para revisão. Aprovação aplica compensações uma única vez; rejeição
preserva a contagem. Se houve movimentação desde a referência, faça recontagem.
A tela acompanha a última contagem aprovada para organização semanal.

## Alertas e mensagens

Configure limites por produto/custódia e contas destinatárias autorizadas.
Sem configuração, não há alerta clínico presumido ou envio externo automático.
Saldo da família não compensa falta da equipe. Reposição resolve a condição.
Falha de mensagem não desfaz a requisição. Concilie resultados externos incertos
antes de autorizar nova tentativa.

## Importação

Revise os registros físicos e identifique paciente e produtos com evidência.
Pré-valide o lote JSON, corrija problemas e confirme a importação. Preserve
protocolos 1–11 e informações desconhecidas; nunca preencha dados por suposição.
Consulte o relatório por registro e mantenha a origem documental verificável.
