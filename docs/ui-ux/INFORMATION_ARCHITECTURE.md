# Arquitetura de informação

## Contexto e estrutura

WorkspaceProvider mantém o read model autorizado durante a navegação. O layout
conserva a validação de sessão no servidor, com Suspense para os hooks de URL
em rotas dinâmicas. Nenhuma seleção do navegador concede uma capacidade.

AppWorkspace apresenta título, estado de acesso e conteúdo do módulo. O shell,
a seleção de contexto e a navegação ficam em componentes próprios. Contratos,
API client e predicados de apresentação são separados da árvore visual.

## Gestão

Cabeçalho compacto com paciente, sino e menu pessoal. Navegação lateral no
desktop, recolhível, e drawer modal no celular. Grupos: área de trabalho,
operações, gestão do paciente e administração global quando autorizada.

O submenu Mudar perfil chama a seleção real de autoridade da sessão. A seleção
obrigatória aparece apenas sem contexto ou quando o destino exige outro vínculo.
URLs e atualizações do servidor acompanham a seleção; navegação especulativa
de links do shell fica desativada para evitar pré-carregar outro contexto.

## Operação

Equipe e supervisão compartilham a estrutura operacional. A navegação inferior
oferece Início, Histórico, Entregas, Estoque e Mais conforme as capacidades.
Mais reúne ações secundárias e eventuais funções de gestão expressamente
concedidas. A supervisão terá conteúdo da equipe, sem assumir a identidade
de profissionais ou destinatários.

Entregas consulta uma caixa paginada real, própria ou da equipe autorizada.
É uma intenção diferente da pesquisa geral do Histórico. A listagem não concede
autorização para confirmar recebimento em nome de outra pessoa.

## Perfil e autenticação

O perfil apresenta resumos e abre cada seção sob demanda, mantendo os campos
montados para preservar preenchimento. Identidade, foto, senha, MFA, contatos,
vínculos e sessões continuam com os contratos e verificações existentes.

Login utiliza Field/Input/Button e feedback semântico. Rótulos são associados
explicitamente aos campos; falhas e sucesso são anunciados por leitores de tela.
MFA, recuperação, hidratação e retorno ao destino protegido são preservados.
