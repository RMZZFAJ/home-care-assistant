# Execução e condições de aceite

Os resultados abaixo registram a cadeia final de 35 arquivos, versão máxima
034. Publicação, checks do PR, merge e implantação recebem evidências próprias;
seu sucesso não é inferido dos testes locais.

## Resultados confirmados

| Procedimento | Resultado observado |
| --- | --- |
| Supabase CLI Windows | Uma instalação 2.121.0; sem token de ambiente |
| Identidade anterior | Conta padrão sem acesso ao projeto esperado |
| Perfil e novos processos | Conta correta e projeto esperado acessíveis |
| Wrapper do projeto | Doctor repetido e oito testes negativos aprovados |
| Instalação limpa Windows/Linux | Lock idêntico e peers válidos |
| Código Windows | Lint, tipos, 69 testes unitários e build aprovados |
| Markdown | 31 arquivos; zero problemas antes do fechamento documental |
| Preservação de migrations | Primeiros 19 hashes conferidos pelo guard |
| Cadeia local 35 | Instalação limpa e evolução 019→034 aprovadas |
| Regressão PostgreSQL | Seis suítes SQL e caso de search_path aprovados |
| Limites de protocolo/estoque | HC-1000000 e retry de movimento aprovados |
| Integração HTTP/Auth | Seis testes, incluindo concorrência, aprovados |
| Aplicação local e remota | 35 arquivos aplicados; última versão 034 |
| Integridade remota original | Hashes dos registros do backup preservados |
| Metadados públicos | 21 tabelas, 22 policies e 60 funções iguais |
| Constraints/índices/grants clientes | 119/48/19 iguais |
| Defaults e segurança | Quatro ACLs e propriedades verificadas iguais |
| service_role | Sem grants diretos; cinco RPCs autorizadas |
| Linux | Instalação e sete checks aprovados; 69 testes unitários |
| E2E desktop/celular | 32 casos únicos aprovados nas rodadas documentadas |
| GitHub Actions e Vercel finais | Aguardam publicação e checks próprios |

Os seis testes HTTP usam identidades Auth e service_role reais. Cobrem acesso
horizontal, idempotência concorrente, estoque, último administrador global,
disputa de workers e contrato restrito do serviço. Mocks não provam RLS.
As seis suítes SQL e o caso de search_path exercitam também permissões,
catálogo, inventário, importação, convites, alertas, outbox e limites.

[LINUX_RESULTS.json](LINUX_RESULTS.json) registra npm ci com 323 pacotes,
árvore de dependências, contratos, lint, Markdown, tipos, 69 unitários e build.
Essa rodada antecedeu o atributo final de acessibilidade da região rolável de
estoque. O CI publicado deve conferir o HEAD final; o ajuste foi verificado
no navegador e nos checks Windows pertinentes.

## Método e correções do E2E

A rodada completa executou 32 casos: 29 passaram e três falharam. Duas falhas
vieram de um seletor de alerta ambíguo; a terceira, no celular, detectou que a
região rolável da tabela de estoque não recebia foco por teclado.

O seletor foi tornado específico e a região recebeu acesso por teclado e
identificação acessível. A rodada seguinte passou seis casos em desktop e
celular: os três afetados e três regressões relacionadas. A cobertura combinada
registra os 32 casos únicos aprovados em [E2E_RESULTS.json](E2E_RESULTS.json).
Isso não é apresentado como uma única rodada final de 32/32. O CI executará
novamente a suíte completa sobre o commit publicado.

As jornadas incluem falhas de login/rede, confirmação e recuperação por Mailpit,
catálogo, administração local, revogação, convites, alias ambíguo, importação,
resposta perdida, leitor, estoque, inventário, paginação/filtros, inativação de
paciente, comprovante e impressão. Axe e teclado cobrem as telas percorridas;
não equivalem a homologação de todas as tecnologias assistivas.

## Backups e integridade do remoto

Os backups locais completos ficaram fora do Git, com SHA256, manifesto e leitura
por pg_restore --list. Os arquivos registrados têm 535.840 e 698.088 bytes.
Não foi declarado ensaio completo de restauração.

O backup remoto público inicial foi separado em schema e dados, com 75.999 e
8.513 bytes. Antes de 033/034 houve novo backup de schema com 152.130 bytes.
Todos ficam fora do Git; não são backups de Auth. Seus SHA256 são:

```text
schema inicial:
C9367D260963CAFD1A26AD8C374CFC3834C799AAD95763E9EAD85D40EE995123
dados iniciais:
516D0B63956959A4A543D7691657EAD26DFC0333FA4DE782AFF3CF0FD534602D
schema antes de 033/034:
FE0930FD44CD3BB4F8EE0CC5AF6DBB5FE93936EE8890BC8584B5A951D215D26
```

[REMOTE_BEFORE.json](REMOTE_BEFORE.json) registrava uma requisição e um item.
[REMOTE_AFTER.json](REMOTE_AFTER.json) registra três requisições e seis itens:
dois registros e cinco itens foram acrescentados durante a janela de inspeção.
Os hashes totais mudaram por esses acréscimos. A autoria não é inferida apenas
da coincidência temporal com a visualização do sistema.

A verificação [REMOTE_ORIGINAL_INTEGRITY.json](REMOTE_ORIGINAL_INTEGRITY.json)
comparou separadamente os IDs originais comprovados pelo backup externo.
Os hashes da requisição, item e movimentos originais permaneceram idênticos;
um administrador global ativo foi preservado. A consulta agregada não publica
o conteúdo dos registros. Não houve reset, fixture remota ou envio externo de
teste. Os acréscimos não são apresentados como dados criados pela suíte.

## Compatibilidade de extensão e grants

Na primeira aplicação, 020 foi concluída e 021 sofreu rollback: a conexão de
migrations não resolveu digest sem schema explícito. O login correto já estava
funcionando. A 02050 criou uma ponte privada para o schema efetivo de pgcrypto;
032 removeu somente a ponte marcada. Nenhuma migration aplicada foi reescrita.
A cadeia final passou no caminho limpo, no legado e com search_path restrito.

A comparação revelou diferenças reais de service_role entre local e remoto.
A 033 restringiu grants existentes/defaults e substituiu a leitura direta de
fallback do worker por RPC mínima. A 034 removeu o default global EXECUTE de
PUBLIC, que não era removido por um REVOKE limitado ao schema. Preservou grants
explícitos e funções pertencentes a extensões.

Ambas foram aplicadas local e remotamente. A comparação final confirma igualdade
de tabelas, policies, funções, constraints, índices, grants de clientes e quatro
default ACLs. Os hashes de funções normalizam somente CRLF para LF; não ignoram
outras diferenças de definição. A revisão e os testes estão em
[SERVICE_GRANTS_REVIEW.md](SERVICE_GRANTS_REVIEW.md) e
[DATABASE_COMPARISON.json](DATABASE_COMPARISON.json).

## Publicação e preservação

O snapshot 527cef4, publicado pelo usuário para inspecionar a prévia, está
preservado na branch anterior e na tag local
checkpoint/home-care-user-preview-527cef4. A consolidação em
codex/home-care-consolidacao mantém 7f79ebb e fc04de4 como ancestrais.

Os blocos lógicos já incluem runtime/dependências, banco, API, interface,
acessibilidade e testes/CI. A documentação fecha o conjunto. O PR, seus checks,
merge e smoke de implantação permanecem pendentes de evidência publicada.
Não excluir a branch antes da confirmação do merge.

Homologação de OAuth, e-mail remoto e provedor real de mensagens é dependência
externa. Uma suíte local não comprova essas integrações.
