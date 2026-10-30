# Parecer executivo B8

A última auditoria especializada da Fase B está concluída. O projeto possui
fundação técnica aproveitável: autoridade no banco, Auth real, ledger,
versionamento, recuperação REQ/BAL e concorrência independente. A proteção atual
ainda é insuficiente para tratar testes verdes como prova de correção integral
ou liberar operação real. NO-GO e as duas causas P1 anteriores permanecem; C/D
não foram iniciadas.

## Resultados verificáveis

- Nove registros: três lacunas/oportunidades novas de qualidade e seis
  revalidações/aprofundamentos com IDs anteriores. Seis P2/três P3; sem novo P1.
- 156 registros A–B7 mapeados em 119 famílias de regressão, sem ID ausente. A
  matriz identifica checks, limites, comportamento correto e exigências
  humanas/físicas/remotas/decisórias. Não é plano de implementação da Fase C.
- 17 processos, seis perspectivas e 22 cenários excepcionais com cobertura
  discriminada. Inventário: 17 arquivos unitários, sete integrações, 11 specs de
  navegador e helpers; 16 arquivos SQL. Descoberta confirma 120 casos, sem
  executá-los.
- 20 observações dirigidas: cinco casos PDF no baseline, cinco com texto
  removido, um controle de título que falhou como esperado; cinco probes de
  navegador sintético e quatro casos SQL readonly. Não houve suíte global nova.
- 230 scripts localizados por padrões, com revisão dirigida de guard/destino;
  não são 230 revisões completas. Quatro módulos sem consumidor demonstrado e
  cinco assets públicos são candidatos, sem remoção. AppWorkspace e redirect
  /inventarios foram preservados após contraprova de consumo/compatibilidade.
- Os nove avisos VS Code foram resolvidos antes de B8.0: seleção explícita da
  .venv existente e três linhas Markdown com crases. Nenhum script Python,
  dependência ou comportamento funcional foi alterado.

## O que os novos probes demonstram

Testes PDF atuais passam mesmo sem todo texto desenhado; extração independente
encontra zero caracteres, embora metadata/páginas permaneçam. Predicado SQL de
crédito positivo pode aceitar NULL, sem provar que a suíte toda aceitaria todo
ledger removido. Helper axe pode passar com necessidade de revisão ainda
inconclusiva; não é prova de contraste errado na aplicação. Controles negativos
demonstraram que os testes ainda reprovam título errado, saldo errado e botão
sem nome.

QA-001 foi reproduzido: desktop em preparação leva o helper a esperar menu móvel
inexistente; o mesmo DOM passa quando pronto. CI histórica atual segue falha no
SHA 34dcb83. Não se alterou timeout ou cenário para obter verde.

## Sustentabilidade e limites

Documentação vigente mistura contagens e autorizações antigas. Ferramentas podem
sobrescrever evidência histórica, submeter Meta por token ou copiar
.private/.venv para verificação Linux. São causas anteriores revalidadas, sem
novo vazamento ou mutação externa demonstrados. Refatorações localizadas devem
seguir contratos/consumidores e preservar histórico; não há suporte para
reescrever o sistema ou acrescentar infraestrutura ampla.

Desempenho tem amostras locais e complexidade demonstrada, sem p95 produtivo,
SLO ou orçamento aceito. Emulação, screenshots, axe e estrutura PDF não
homologam aparelhos, AT, impressão, rede real, compreensão, provedor ou restore.
Esses limites e os critérios futuros estão separados no pacote.

## Encerramento e fronteira

Entregáveis, referências, contagens, escopo e preservação são validados no
relatório `evidence/package-validation.json` e manifesto. Produto, migrations,
tests/scripts existentes e master permanecem preservados. A edição B4 é apenas a
formatação autorizada; manifesto antigo permanece histórico, sem mascarar
mudança posterior. Não houve operação remota de dados, reset, restore, PR, merge
ou promoção de produção.

Não se justificou outro grupo B independente. A e B1–B8 estão encerradas;
pendências alimentam C, D e homologação sob nova autorização. Publicação
documental na mesma branch e eventual preview automático estão autorizados, com
configuração de provedor preservada. Referência efetiva de commit/push é
verificável em Git; o SHA do próprio commit não integra seu conteúdo.
