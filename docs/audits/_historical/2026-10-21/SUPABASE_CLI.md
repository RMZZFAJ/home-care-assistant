# Diagnóstico da identidade Supabase CLI

## Causa observada

Na retomada, a CLI padrão estava autenticada com uma conta diferente da conta
que possui acesso ao projeto vinculado ao repositório. A identidade consultada
e as organizações acessíveis eram diferentes. O projeto esperado não aparecia
na listagem dessa conta; a consulta de migrations vinculadas não tinha acesso.

No Windows, o levantamento encontrou uma instalação da CLI 2.121.0 nos locais
avaliados e nenhum SUPABASE_ACCESS_TOKEN de ambiente substituindo a identidade.
Não foi demonstrada duplicação de instalações, interferência entre Linux e
Windows ou sobrescrita espontânea de token. O fato comprovado foi o uso de uma
identidade padrão diferente da identidade com acesso.

O login com o perfil nomeado home-care-assistant utilizou a sessão de navegador
da conta correta. Depois dessa autenticação, a listagem vinculada de migrations
funcionou: na primeira consulta, o remoto possuía 19 migrations e o código
apresentava 12 incrementais pendentes, 020–031. Isso comprova o acesso
administrativo de consulta naquele momento; não comprova a aplicação dessas
migrations. A tentativa posterior de aplicação e sua correção incremental
ficam na [execução](EXECUTION.md).

## Perfil explícito e persistência

O projeto utiliza o perfil nomeado home-care-assistant e uma área própria da
CLI. No Windows, os arquivos operacionais ficam sob:

```text
LOCALAPPDATA/home-care-assistant/supabase-profile.yaml
LOCALAPPDATA/home-care-assistant/supabase-cli
```

O segundo caminho é utilizado como SUPABASE_HOME pelo fluxo do projeto.
A configuração local registra a identidade esperada e o destino. Credenciais
continuam no armazenamento próprio da CLI; nenhum token pertence ao Git.
Endereços de conta e identificadores pessoais não são reproduzidos neste relatório.

O ponteiro de perfil em USERPROFILE/.supabase/profile foi alinhado ao arquivo
nomeado. A consulta de identidade em novos processos passou com a conta correta.
Para este repositório, prefira sempre o wrapper que verifica a conta e o projeto:

```sh
npm run supabase:project -- doctor
npm run supabase:project -- migration list --linked
npm run supabase:project -- db push --dry-run
```

Se for necessário renovar o login, use o mesmo fluxo explícito:

```sh
npm run supabase:project -- login
```

O wrapper valida identidade e acesso antes do comando. Rejeita variáveis que
substituem credenciais/destino, overrides de profile/workdir/project-ref/db-url,
reset remoto, alteração de projetos, repair de histórico e unlink. Reset local
fica restrito ao harness com backup e consentimento, sem usar esse wrapper.

O perfil explícito remove a dependência da conta padrão usada por outros
projetos. A operação deve verificar identidade e acesso ao projeto antes de
comandos remotos. Uma resposta 403 exige conferir esses dois pontos antes de
repetir logout/login ou trocar o vínculo do repositório.

## Limites da conclusão

A recuperação do acesso foi confirmada por consulta real ao projeto correto.
Não há evidência para atribuir o incidente a um defeito do sistema operacional
ou da persistência interna da CLI. Renovação e expiração normal de credenciais
continuam possíveis; o perfil correto precisa ser mantido nessas operações.

O doctor passou em duas execuções e oito testes negativos de fronteira foram
aprovados. A atualização remota recebe evidência própria na
[execução](EXECUTION.md). Não considerar uma aplicação remota concluída apenas
porque o login voltou a funcionar.
