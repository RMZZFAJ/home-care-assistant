# Evolução integral — execução

## Autorização e contrato

Execução integral autorizada em 22/10/2026, incluindo branch, commits, push,
reset controlado dos dados de desenvolvimento, PR, merge e verificação do deploy.
Preservar o catálogo e o administrador global. O corte remoto ocorre somente
depois da validação local. Nunca usar o remoto como destino da suíte.

Existem quatro fichas: REQ, COM, ENT e BAL. O sistema controla exclusivamente
insumos sob responsabilidade familiar. COM admite compra e doação sem exigir
pagamento. Administrador local pode movimentar e corrigir o estoque familiar
diretamente, com ledger e anexos. ENT transfere entre família e equipe; BAL é
exclusivo da equipe. SHA-256 verifica conteúdo canônico; assinatura assimétrica
fica para o roadmap.

REQ não tem quantidade solicitada. Aceite positivo explicitamente vinculado
atende sua linha. ENT acompanha separadamente linhas integralmente conferidas,
quantidades expedidas, aceitas e conciliadas. Divergências não anulam aceites.

## Base preservada

- Base Git: 701521c; branch codex/home-care-evolucao-integral publicada.
- Cadeia inicial: 35 migrations; nenhuma migration histórica será editada.
- Catálogo remoto: 29 produtos, exportação externa com SHA-256 verificado.
- Backup local completo externo: arquivo custom e manifesto verificados.
- Remoto: administrador global ativo; duas identidades sem perfil a conferir.

## Matriz de execução

| Bloco | Estado | Evidência |
| --- | --- | --- |
| Preparação e preservação | Base concluída | Git e backups externos; Node/npm exatos preparados |
| Documentos, capacidades e unidades | Base aplicada localmente | Quatro migrations novas; SQL em rollback e typecheck passaram |
| REQ, COM, ENT e BAL | Em execução | SQL cobre cadeia com aprovação/aceite parcial e BAL |
| Interface e perfil | Em execução | Shell, design system, histórico, central e três wizards tipados |
| Scanner e anexos | Pendente | A registrar |
| PDF, notificações, Meta e Flows | Pendente | A registrar |
| Consumo e indicadores | Pendente | A registrar |
| Testes e revisão | Pendente | A registrar |
| Corte remoto e homologação | Pendente | A registrar |
| PR, merge e deploy | Pendente | A registrar |

Resultados anteriores não substituem os testes desta evolução. Dependências
externas não verificadas serão identificadas separadamente da implementação.

## Adendo de interface

Refatoração global obrigatória: menu hierárquico recolhível, design system,
quatro wizards padronizados, perfil e sino no cabeçalho, filtros recolhíveis,
estoques semanticamente distintos e dashboard orientado a tarefas. Homologar
todos os perfis, troca de paciente, menus, modais, câmera, anexos, foco, etapas
e ausência de sobreposição/corte/rolagem horizontal em desktop, Android e iOS.

## Retomada técnica

Runtime exato fora do Git: LOCALAPPDATA/home-care-assistant/runtime/node-v24.22.0-win-x64.
npm exato: LOCALAPPDATA/home-care-assistant/tooling/node_modules/npm/bin/npm-cli.js.
Preceder PATH com o diretório do runtime e invocar esse npm-cli usando node.
O npm instalado em C:/nvm4w/nodejs é 11.6.2; não usá-lo nos gates finais.

As quatro migrations de 22/10 já foram aplicadas à stack local sem reset.
Não editar novamente essas migrations aplicadas; correções serão incrementais.
scripts/verify-evolution-database.mjs executou a cadeia transacional com
identidades Auth reais da fixture e rollback. Gates completos ainda pendentes.
Nenhuma alteração remota efetuada; exportação de catálogo preservada externamente.

Pendências técnicas conhecidas para a próxima migration: endurecer os contratos
RPC contra arrays ausentes, destinatário revogado e bypass de elevação por RPCs
legadas; read models para estoque projetado e notificações documentais; finalizar
metadados de PDF, anexos, sessão recente e aceite WhatsApp/Flows. Implementação
de perfil, estoque novo, configuração, detalhes e E2E está em andamento.
