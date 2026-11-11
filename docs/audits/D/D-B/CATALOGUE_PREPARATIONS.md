# D3.58 — preenchimento privado do catálogo

A administração do catálogo usa o mesmo editor canônico ao criar um item,
editar um item existente ou adotar um modelo. A opção de salvar o preenchimento
guarda campos ainda incompletos para o titular retomar em outra sessão.
Fechar o editor conserva a revisão já salva. O descarte dessa revisão pede
confirmação e elimina seus campos sem alterar o item ou o modelo oficial.

O escopo combina titular, paciente, modo administrativo, operação e item
quando aplicável. O banco exige a revisão esperada antes de salvar, descartar
ou confirmar. Em conflito, o editor apresenta a revisão salva para comparação
e permite manter os campos em edição. Mudanças no item, no modelo ou na
referência administrativa exigem uma nova conferência. Modelos já adotados
ou indisponíveis deixam de ser escolhas elegíveis.

A confirmação usa as operações nativas de catálogo. No modo local, a gravação
conserva a identidade e as restrições do cadastro. No modo global, a
confirmação registra uma proposta pendente de aprovação local distinta. A
gravação e o comprovante ficam na mesma transação. Uma tentativa exata pode
ser consultada ou reenviada por escolha explícita. O cliente confere autoria,
escopo, chave, revisão, etapa e resultado antes de limpar a tentativa da aba.
A consulta com comprovante ainda ausente conserva a intenção. Não há envio
automático, cache de resposta privada no service worker nem persistência de
segredos nesse preenchimento.

## Migrations

- `20261110235121_phase_d3_catalogue_private_preparations.sql` cria as tabelas
  privadas, suas restrições, o diário de comprovantes e duas funções públicas
  acessíveis por sessão Auth autorizada.
- `20261111000604_phase_d3_catalogue_conflict_http_status.sql` corrige o código
  de conflito observado através do gateway e alinha a ordem dos bloqueios da
  adoção nativa à do cadastro. As migrations anteriores permanecem preservadas.

As rotas administrativas existentes continuam atendendo seus outros
consumidores. As novas tabelas têm RLS e vedam acesso direto pelos papéis da
aplicação. O banco confere autorização depois de esperas e antes de persistir
o comprovante. A comparação na área autenticada se limita ao modelo elegível
ou aos dados de catálogo do paciente selecionado.

## Verificações

Cinco cenários com Auth real e nove testes do build de produção em Chromium,
Mobile Chromium e WebKit passaram. As contraprovas incluem concorrência,
escopo de titular, revogação durante espera, conflito HTTP 409 e perda da
resposta com consulta do comprovante após recarregar. Tipos, lint dos
arquivos alterados e proteção das 84 migrations históricas passaram.

O remoto foi reconciliado de 198 para 200 versões. O histórico ordenado, as
definições, os grants e a RLS conferem com o local. O dry-run final ficou
vazio e não há índices inválidos nos esquemas conferidos. Os dois avisos
relacionados são das funções de entrada executáveis por autenticados.
Foram conferidos escopo, autorização dentro das funções e ausência de
grants de acesso direto às tabelas. [Resultados](CATALOGUE_PREPARATIONS_VALIDATION.json).

## Limites

Este incremento cobre criação, edição e adoção de itens. Unidades,
apresentações, situações e sucessores têm seus próprios fluxos e seguem na
revisão de continuidade. As estimativas globais de aparência, formulários e
recuperação permanecem em 60%, 90% e 90%. A matriz mantém 56 critérios com
comprovação local e 49 parciais. Paridade das composições, CI do SHA publicado
e ensaios humanos, físicos e de provedores seguem pendentes.
