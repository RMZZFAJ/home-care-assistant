# Limites, tentativas e contraprovas da coleta

## Limites de observação

- Somente leitura de metadados remotos e agregados sem payload pessoal;
  conta/projeto verificados. Nenhum dado remoto alterado, serviço configurado,
  workflow/deploy acionado ou mensagem enviada pela B7.
- Queries de catálogos/agregados usam BEGIN READ ONLY. O timeout local 15 s é da
  auditoria; não define política do runtime. Nenhum claim, retry ou cleanup.
- Catálogos84/232 não comprovam todos os objetos/grants/configurações/dados.
- TOC/hash/header/COPY headers não comprovam restore, bytes Storage, chaves,
  retenção, off-site, criptografia de custódia ou RPO/RTO aceitos.
- Arquivos SQL de backup foram lidos em memória somente para hash/cabeçalhos;
  conteúdo não foi publicado nem executado. Dump custom só passou por --list.
- Probes CFG têm Auth/dados controlados; UPL usa PDF sintético em memória. Zero
  rede/Storage/DB nos dez casos; não são RLS nem E2E da plataforma.
- HEAD de login é amostra anônima: nenhum HTML/cookie de sessão foi retido.
  Preview redireciona à proteção, não comprova header do app autenticado.
- Npm audit consulta metadata de dependências. Três nós dev/um advisory não são
  três falhas exploráveis do runtime. Flag necessária não localizada.
- Nenhuma pessoa, aparelho físico, rádio móvel, mensagem real, OTP/OAuth,
  recuperação externa ou alerta recebido foi homologado nesta fase.
- Cron preexistente permanece ativo; hashes finais distinguem seus metadados de
  progresso de tabelas de negócio/Auth/Storage. Não parar cron para fabricar
  preservação absoluta de registros que o próprio sistema atualiza.
- Fontes oficiais foram consultadas em 30/10/2026. Preço/cota/retenção
  contratados não foram inferidos do texto geral de documentação.

## Tentativas que precisaram ajuste

1. Plugin Vercel retornou UNAUTHORIZED/reautenticação. Plugin GitHub exigiu
   link_id não fornecido. Fallback CLI de leitura após identificar contas, sem
   login/reconexão/configuração automática. Supabase usou perfil fixo.
2. CLI Vercel com Node global24.13 gerou timeout de helper de versão, mas whoami
   retornou. Seleção por processo do Node24.22 existente eliminou o problema;
   nenhuma troca global/permanente ou instalação.
3. Primeiro coletor recusou identificador s3_multipart_uploads porque regex
   aceitava só letras/underscore. Ajustado somente auxiliar da auditoria para
   admitir dígitos após o primeiro caractere. Tentativa foi catálogo de leitura.
4. Hashes brutos remotos de 218 rotinas divergiram. Normalizar apenas CRLF/LF
   refutou drift; zero divergência normalizada. Não corrigir SQL por esse ruído.
5. Algumas buscas iniciais usaram nomes de docs/rotas históricos inexistentes ou
   glob direto incompatível com rg no Windows; inventário dirigido resolveu.
   Nenhum fallback mutável, teste repetido ou alteração funcional.
6. PowerShell ConvertFrom-Json recusou chave vazia do lockfile; parse Node
   confirmou a estrutura. Nenhum lockfile foi regravado.
7. Listagem CLI de env mostrou valores Config cifrados abreviados. Somente
   nomes/tipos/ambientes foram conservados, sem coluna de valor. --json/pull não
   foram usados. Headers de cookie não foram conservados.
8. Fetch web do changelog markdown teve content-type não suportado. Fetch direto
   público retornou200; entradas de breaking changes foram consultadas sem
   upgrade, migração ou mudança. A auditoria usa catálogos17.11 atuais.
9. OpenAPI oficial refutou interpretação inicial de createDeployments=disabled
   como controle de build Vercel. Documentos foram corrigidos antes do push.
   Nunca se usou essa suposição para publicar ou alterar provedor.
10. Um patch de documentos falhou por contexto do checkpoint; era atômico,
    arquivos novos não foram criados nessa tentativa e o patch foi reaplicado
    com contexto vigente. Isso não afetou qualquer produto/dado.

## Fontes externas primárias

- [Supabase backups](https://supabase.com/docs/guides/platform/backups):
  separação de metadados e bytes Storage; política do plano não presumida.
- [Backup/restore
  CLI](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore):
  requisitos do destino e configuração separada.
- [PostgreSQL17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html):
  uma base versus objetos globais; TOC não é restore executado.
- [Vercel Functions](https://vercel.com/docs/functions/limitations): body4,5 MB
  e duração Fluid; evitar limite de plano antigo presumido.
- [Vercel Git](https://vercel.com/docs/project-configuration/git-configuration):
  configuração real de branches que não disparam deployment.
- [OpenAPI Vercel](https://openapi.vercel.sh): semântica de createDeployments,
  trecho mínimo em platform-contracts.json.
- [Advisory re2js](https://github.com/advisories/GHSA-gg6h-894w-4m9c): alcance
  condicional e versão corrigida; consumidor inspecionado.

## Estado de publicação

Não houve push nesta coleta. A ordem permite commit/push documental, mas proíbe
alteração Vercel e deploy. Previews anteriores e a semântica oficial exigem uma
guarda real antes do push. Finalizar pacote/validação/commit e solicitar somente
a decisão concreta ainda necessária, sem encerrar C ou produzir implantação
indireta. Conferir ref e deployments após eventual publicação autorizada e
registrar o resultado sem alegar CI do novo SHA.

## Atualização de autorização

A coleta encerrou-se antes do push. Depois de validar e commitar o diagnóstico,
o responsável autorizou permitir seu preview automático. Ver
[autorização](PUBLICATION_AUTHORIZATION.md). Publicar os documentos passa a ser
permitido com esse efeito; os limites de dados, código, provedor e demais fases
continuam preservados. Não se alegará ausência de deployment automático no
encerramento; somente ausência de deploy manual/promoção e de mutação funcional.
