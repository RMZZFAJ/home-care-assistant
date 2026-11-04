# Revisão do Draft PR A–C

- Base master e head audit/phase-b; Draft verdadeiro, sem merge automático.

- Último SHA publicado confere com HEAD/ref e checks consultados.

- Diff total A–C contém documentação/apoio de auditoria; src, Supabase,
  testes, scripts de produto, workflows e dependências funcionais preservados.

- .gitignore, .vscode/settings.json e requirements-audit.txt são mudanças
  prévias explicadas; sem nova configuração de publicação ou segredo.

- A/B e fontes brutas/hashes históricos preservados; matrizes vivas têm
  arquivo exato antes da revisão e proveniência de cada mudança.

- Quinze Pxx refletidos sem aprovação presumida; P02 por tipo em branco.

- 121 causas/165 origens reconciliadas,149 IDs de aceite preservados, 12
  complementos;161 casos PLANNED_NOT_EXECUTED.

- 97 B1 e66 C3 com relações explícitas,66 fichas e262 controles; protótipo
  aprovado como direção, sem copiar simulações para o app.

- Kit temporário ausente;16 entradas preservadas; HTML/oitoPNG idênticos.

- Markdown, links/anchors, IDs, hashes, referências e confidencialidade
  validados proporcionalmente; nenhuma suíte funcional local repetida por
  texto.

- CI iniciada pela abertura do PR quando disponível; registrar cada check
  iniciado/concluído/pendente e não tratar Vercel Preview Comments como CI.

- Antes de merge futuro: autorização, revisão e CI obrigatória do último SHA,
  compatibilidade de schema/config e efeito da integração Vercel/master.

- Sem branch cleanup, tag nova, deploy deliberado, banco remoto ou início D.
