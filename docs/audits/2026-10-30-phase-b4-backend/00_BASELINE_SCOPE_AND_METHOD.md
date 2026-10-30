# Baseline, escopo e método B4

## Autoridade e preservação

Ordem mestre de 30/10/2026: investigar B4.0–B4.12 e publicar somente
documentação
em `audit/phase-b`. Implementação, reset, alterações remotas, deploy, PR, merge
e avanço para B5/C/D não estão autorizados. Todos os artefatos B4 ficam nesta
pasta; somente o índice geral da Fase B será atualizado fora dela.

HEAD inicial `315399dc5c19cacc9d9cc3c609174498608f4af0`, encerramento B3.
Master `34dcb835c5c49068e0417f7306eb4e501aa868bc`; árvore inicialmente limpa.
Código funcional igual à base `37cb7f85e96e551d6419871f94dd950712e2565b`.
As diferenças acumuladas são documentais/de organização da auditoria.

O [baseline verificável](evidence/baseline.json) registra Node, branch, hashes,
stack, jobs e isolamento. Credenciais, cookies, dump e URLs assinadas permanecem
fora do Git. Nenhum dado privado é necessário ao diagnóstico.

## Menor prova suficiente

Reconstruir interface → HTTP → identidade/contexto → validação → RPC/serviço →
persistência → resposta → recuperação. Cada hipótese terá contraprova e limite.
Leitura estática prova o caminho codificado; execução com dependência simulada
prova o adaptador; HTTP local com Auth real prova apenas o cenário descrito;
read-back prova persistência. Nenhuma categoria substitui outra.

Reutilizar provas SQL B3 quando a definição vigente estiver igual. Não repetir
build, typecheck, suíte unitária global, E2E completo ou replay de migrations
por alterações documentais. Consultar os resultados históricos B3 sem atribuir
sua execução à B4. Validar sintaxe/destino/efeitos de cada auxiliar novo antes
de executá-lo. Após duas falhas instrumentais iguais, inspecionar a causa.

## Cobertura e referências

B4.1 cataloga todas as superfícies HTTP, incluindo callback Auth e demonstração.
B4.2–B4.11 examinam sucessivamente autoridade, entradas, comandos, leituras,
erros, arquivos, administração, integrações, segurança e resiliência.
B4.12 realiza segunda passagem transversal; consolidação reconcilia os IDs,
evidências, limites, achados, aceites e decisões futuras.

Referências históricas: [A](../2026-10-25-production-readiness/README.md),
[B1](../2026-10-28-phase-b1-interface/README.md),
[B2](../2026-10-29-phase-b2-processes/README.md) e
[B3](../2026-10-29-phase-b3-database/README.md).
Sessão revogada, precisão SQL, progresso do scheduler, limites de consulta,
reservas abandonadas e janela de URLs já foram examinados: B4 deve mostrar
seus efeitos HTTP e procurar outras causas, sem contá-los como descobertas
novas.

NO-GO anterior permanece. Não há homologação de produção, provedor, restore,
dispositivo físico ou aceite humano implícita nesta investigação.
