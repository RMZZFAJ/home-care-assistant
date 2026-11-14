# D3.23 — propostas congeladas e grupos finitos

Contraprovas reproduziram seis falhas na comparação de propostas: propriedades
herdadas de dicionários podiam lançar exceção ou produzir funções em vez de
rótulos; capacidade, função ou canal desconhecidos ainda marcavam a proposta
como reconhecida. Uma sétima contraprova identificou o mesmo problema no código
de evento. Os logs FAIL foram preservados antes das correções.

As consultas aos dicionários agora exigem propriedade própria. Capacidade,
evento, função, canal e grupos de ciência/BAL precisam ser reconhecidos para
habilitar aprovação. Conteúdo livre conserva seu texto, inclusive as palavras
`constructor`/`toString`/`__proto__`. Situação desconhecida recebe rótulo seguro
e não oferece aprovação. A API e o banco continuam decidindo autorização,
validade de negócio, versão e aplicação; o guard de apresentação não concede
permissão nem transforma resposta de leitura em prova de escrita.

## Provas dirigidas

38 testes unitários passaram:34 de governança e quatro consumidores de campos.
Sete testes PDF dirigidos conservaram os goldens V4–V6 e V9 e a estrutura V10
das seis fontes controladas. A mudança do rótulo de evento não altera os bytes
desses documentos. Não se repetiu a suíte PDF completa ou uma migration.

Três cenários distintos Chromium de produção passaram. O terceiro recebeu um
recheck dirigido após acrescentar menu/escopo; os dois primeiros e o produto
permaneceram iguais entre as coortes. Cobertura:

- Recuperação da mesma intenção administrativa após respostas desconhecidas,
  com conteúdo congelado; alteração de conteúdo/versão recusa409 nas duas APIs.
- Cinco tipos de proposta, comparação em tabela sem textarea/JSON editável,
  paginação55 registros e busca do mais antigo. Global consulta/proposta;
  administrador local distinto decide o ID/versão/conteúdo originais.
- Respostas GET controladas com tipo/operador herdado, capacidade/canal
  desconhecidos e situação herdada são recusadas na interface. O GET real
  continua autenticado; só a resposta de leitura é modificada pelo instrumento.
  O JSON proposto no banco permanece igual em cada contraprova.
- Após aprovação, as outras quatro propostas antigas não são reaplicadas
  sobre a versão nova. Leitura de outro paciente retorna404 sem conteúdo.
- Menu de capacidade apresenta três menuitemradio:herdar/permitir/restringir,
  sem busca por ID. Escape restaura foco. Administrador local não cria outra
  residência:POST403, nenhum cadastro criado. Estoque permanece igual.

## Reconciliação dos critérios compostos

C011 tem prova local dos cinco tipos, fallback, comparação congelada e
aplicação do ID/versão/conteúdo apresentados. C-FINAL-AC-019 combina a prova
anterior de inteiros/unidade/código/turno/senhas/MFA com a checagem de capacidade
e as provas existentes de consentimento, linhas e revisão sem edição.

Para essa reutilização, nove testes/consumidores foram confrontados byte a
byte em LF com3772fd0, cuja CI completa passou:preferência de ciência, parcelas
COM, relato de consumo, campos e grupos de política. Eles já verificam
checkboxes de consentimento, revisões sem combobox/input, quantidades declaradas
em leitura e texto livre. Seus hashes e a qualificação constam no manifesto;
não são apresentados como novos testes locais desta etapa. Os motores e a
integração final continuam na CI do candidato atual.

C-FINAL-AC-021 permanece parcial:avançaram escopo local/global e proposta,
mas o walkthrough composto de criação global, conta alheia e subfluxos de
configuração ainda precisa ser consolidado. A conta própria tem sua prova D3.21.
Não se converte prova de um subconjunto em aprovação de toda a relação.

[Manifesto](GOVERNANCE_FINITE_EVIDENCE.json),
[remoto read-only](GOVERNANCE_FINITE_REMOTE_OBSERVATION.json) e
[CI anterior](CI_1B89CE9_OBSERVATION.json). Local/remoto164, zero SQL nova ou
pendente. Sem reset, Auth/fixture remoto, transporte externo, produção ou backup
redundante. PR7 Draft, Sonar adiado, meta ativa; AT/aparelhos e D-C/D6 separados.
