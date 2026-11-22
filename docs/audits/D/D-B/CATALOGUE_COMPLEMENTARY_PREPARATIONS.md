# D3.59 — unidades, apresentações e identidade de materiais

Os editores de nova unidade, unidade base e precisão, apresentação e
situação/sucessor usam o armazenamento privado de catálogo. Os campos
incompletos são retomados pela mesma pessoa, com revisão concorrente,
comparação antes de continuar e descarte próprio. Apresentações conservam
códigos textuais, fator exato e histórico de versões. Situação e sucessor
conservam o motivo próprio e a revisão da referência de catálogo e saldos.

Nova unidade global tem escopo próprio e exige sessão global. Os demais
atos têm autorização por paciente e usam as operações nativas. A gravação
oficial e o comprovante são confirmados na mesma transação. A recuperação
consulta a chave original. Quando a pessoa perde a capacidade de gravar
mas conserva leitura do paciente, a chave ainda recupera o comprovante
próprio já confirmado. Uma chave sem comprovante continua sujeita à
autorização de escrita. Nenhuma ação é reenviada automaticamente.

A migration incremental `20261111001758` amplia os tipos do armazenamento
existente. A edição da apresentação mantém vínculo com a apresentação
real e o fluxo de identidade mantém vínculo com o item do próprio
paciente. Os consumidores antigos das rotas de unidades, apresentações e
identidade seguem disponíveis. As funções nativas de estoque, versão,
histórico e auditoria continuam sendo chamadas pelas confirmações.

Os rascunhos e o diário continuam em tabelas privadas com RLS. A consulta
de referência exige a capacidade de gerenciar o catálogo do paciente.
Os comprovantes retornam somente ao titular no escopo autorizado. O
service worker não armazena as respostas privadas.

## Verificação

Nove cenários com Auth real e 30 cenários distintos no build de produção
foram qualificados. A primeira rodada de navegador registrou oito
aprovações e duas falhas. Uma revelou a perda do tipo numérico do campo
Ordem. A outra usava a posição antiga da chave na contraprova de
autorização. A segunda rodada aprovou 25 cenários em Chromium, Mobile
Chromium e WebKit. Cinco resultados de Chromium da primeira rodada
continuam aplicáveis aos fluxos cujas fontes não mudaram.

O Supabase de desenvolvimento passou de 200 para 201 versões com dry-run
final vazio. As restrições, os índices, as permissões e as definições
conferem com o local. As quatro operações nativas comparadas permanecem
equivalentes. Os avisos dos advisors relacionados são das funções de
entrada executáveis por autenticados. As negativas cobriram acesso direto,
outro titular e nova chave após revogação. [Resultados](CATALOGUE_COMPLEMENTARY_VALIDATION.json).

## Pendências

O comprovante pode ser recuperado quando o editor ainda está acessível e
a leitura é autorizada. Falta tornar uma tentativa pendente localizável
depois que a perda de escrita impede reabrir o editor. As demais áreas
administrativas, o perfil, a paridade visual integral e a CI do próprio
SHA continuam em execução. A matriz mantém 56 critérios comprovados
localmente e 49 parciais.
