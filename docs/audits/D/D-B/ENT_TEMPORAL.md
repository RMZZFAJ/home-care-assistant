# D4.9 — marcos ENT e vínculo entre evento e arquivo

Incremento de comprovação da operação diária sobre5a7d546. O produto já
distinguia os marcos; não foi necessário alterar runtime, aparência do PDF,
contrato ou migration. C101 agora tem a prova ENT que faltava.

## Relógios e efeitos conferidos

- Preparação ENT retida: criação armazenada em dia anterior, expedição pelo
  familiar em novo evento e exemplares gerados depois. Antes da expedição,
  a reserva é recusada e não deixa emissão nem movimento parcial.
- Rascunho privado: primeiro salvamento anterior é preservado após consumo;
  criação da ficha e primeira emissão operacional vêm das fontes próprias.
- O PDF separa criação, expedição e solicitação da geração. Autor da preparação
  e ator da expedição também permanecem identificáveis, sem aceite inventado.
- Duas intenções explícitas produzem dois exemplares distintos. Cada download
  conserva os bytes, ID e instante de sua emissão, sem criar outra. A leitura
  adicional com relógio do navegador avançado também preserva o arquivo.
- Auth real não permite reescrever datas da ficha ou dos eventos. As reservas
  preservam hash canônico e ledger; replay conserva a intenção original.

Os relógios antigos são sintéticos, aplicados apenas aos novos registros
fictícios locais, com paciente de desenvolvimento e identidade conferidos.
O corpo, instante e hash do evento original não são alterados, e nenhum trigger
é desabilitado. Não se alega espera real de24 horas, aparelho físico ou passagem
de tempo no servidor ao avançar somente o relógio do navegador.

Passaram um unitário discriminante, dois Auth e seis casos de produção
(duas variantes nos três motores). Quatro exemplares reais estão no
[corpus](d4-ent-clocks-proof/CORPUS.json), com apenas a raiz pública efêmera.
O [oráculo independente existente](d4-fidelity-proof/verify.py), sem alteração,
conferiu rótulo/data, identidade, bytes, limites/rodapé, assinatura ENTIRE_FILE
e TSA interna: [resultado](d4-ent-clocks-proof/VERIFICATION.json).
Uma contraprova substitui a data da expedição pela data de criação, também
presente no arquivo: o oráculo recusa a associação errada.

## Reconciliação de C108

A matriz ainda apontava a lacuna de comparação deixada por D4.4. D4.7 já
implementou antes/depois/motivo e arquivo da versão escolhida. As13 fontes
de histórico e testes do manifesto permanecem byte a byte equivalentes após
normalização LF; o acervo/download e o lockfile também coincidem com8a17202.
Essa CI terminou8/8 SUCCESS e cobre a implementação. Não se repetiu a suíte.

[Dossiê D4.7](DOCUMENT_VERSION_HISTORY.md),
[coortes e contraprovas](DOCUMENT_VERSION_HISTORY_EVIDENCE.json),
[três vínculos versão/hash/arquivo](DOCUMENT_VERSION_HISTORY_BINDINGS.json) e
[CI por SHA](CI_8A17202_OBSERVATION.json) sustentam C108 localmente.
Renderização/emissão evoluíram em D4.8, com suas próprias provas; isso não é
atribuição retroativa dessa mudança à CI8a17202 nem aprovação de estados futuros.

[Manifesto deste lote](ENT_TEMPORAL_EVIDENCE.json) vincula fontes, logs, reuso
e limites. [Consulta remota read-only](ENT_TEMPORAL_REMOTE_OBSERVATION.json)
confirmou156 migrations; nenhuma nova foi produzida ou aplicada aqui.
Matriz45 PASS/50 PARTIAL/10 NOT_STARTED,29 colunas canônicas preservadas.
CI do próximo SHA, AT/aparelho, D-C/D6, PDF marcado e confiança externa continuam
gates próprios. PR7 Draft, sem merge, promoção ou envio externo; meta ativa.

O [runtime base5a7d546](CI_5A7D546_OBSERVATION.json) também terminou8/8 SUCCESS
na CI. Esse resultado não inclui os novos testes ainda não publicados.
