# Glossário e governança das decisões

O [registro canônico humano](../../../decisions/PRODUCT_DECISIONS_MASTER.md)
preserva DEC-001–030, O01–O20 e questões iniciais. O
[índice estruturado](DECISIONS_REGISTER.csv) conserva os status originais e
normaliza OWNER_DEFERRED como DEFERRED, sem transformar adiamento em rejeição.
P13–P15 são detalhes identificados na consolidação, não decisões aprovadas.

<!-- c-table:start -->

- **Termo:** Necessidade REQ

  **Significado que UI, API, banco, PDF e guia devem conservar:** Material
  necessário, sem quantidade solicitada como contrato obrigatório.

- **Termo:** Estoque observado

  **Significado que UI, API, banco, PDF e guia devem conservar:** Contagem
  declarada naquele momento; não é saldo oficial. Zero explícito difere de não
  informado e não sei.

- **Termo:** Aquisição prevista/aprovada

  **Significado que UI, API, banco, PDF e guia devem conservar:**
  Expectativa/autorização de COM; não prova compra nem material disponível.

- **Termo:** Recebimento informado/validado

  **Significado que UI, API, banco, PDF e guia devem conservar:** Declaração
  de chegada e validação posterior são fatos distintos; só o segundo credita a
  custódia.

- **Termo:** Expedição/trânsito

  **Significado que UI, API, banco, PDF e guia devem conservar:** Material
  retirado da origem e ainda não livre no destino.

- **Termo:** Aceite físico ENT

  **Significado que UI, API, banco, PDF e guia devem conservar:** Declaração
  pessoal do efetivo recebedor; indelegável, mesmo para administrador.

- **Termo:** Contrassinatura bilateral

  **Significado que UI, API, banco, PDF e guia devem conservar:** Confirmação
  da contraparte sobre uma declaração de transferência; não assume identidade
  do recebedor.

- **Termo:** Encerramento administrativo

  **Significado que UI, API, banco, PDF e guia devem conservar:** Registro
  motivado de impossibilidade/exceção; não declara recebimento, leitura ou
  assinatura alheia.

- **Termo:** Contagem/reconto/revisão

  **Significado que UI, API, banco, PDF e guia devem conservar:** Observação
  física, nova observação autoral e decisão sobre versão específica; não se
  substituem.

- **Termo:** Escalado/presente

  **Significado que UI, API, banco, PDF e guia devem conservar:** Agenda é
  previsão; não comprova comparecimento ou recebedor físico.

- **Termo:** Acesso efetivo

  **Significado que UI, API, banco, PDF e guia devem conservar:** Abertura
  servida/exibida com ator e instante; não comprova atenção ou leitura
  integral.

- **Termo:** Ciência manual/condicionada/tácita

  **Significado que UI, API, banco, PDF e guia devem conservar:** Ato
  expresso, consentimento para registrar antes de abrir, ou presunção pela
  preferência válida na emissão. Não são leitura integral.

- **Termo:** Relato de consumo

  **Significado que UI, API, banco, PDF e guia devem conservar:** Informação a
  esclarecer/conferir; sem débito automático.

- **Termo:** Saldo/projeção

  **Significado que UI, API, banco, PDF e guia devem conservar:** Movimentos
  confirmados versus expectativa futura. Não somar trânsito nas duas
  custódias.

- **Termo:** Enviado/entregue/lido/visto

  **Significado que UI, API, banco, PDF e guia devem conservar:** Estados de
  transporte e interface; não inferem ciência operacional nem recebimento
  físico.

- **Termo:** Hash canônico/hash PDF

  **Significado que UI, API, banco, PDF e guia devem conservar:** Identidade
  do conteúdo versionado versus bytes finais; um não substitui o outro.

- **Termo:** QR/assinatura técnica

  **Significado que UI, API, banco, PDF e guia devem conservar:** Atalho para
  consulta versus prova criptográfica de origem técnica; nenhum prova fato
  físico por si.

- **Termo:** Rascunho/intenção/fato

  **Significado que UI, API, banco, PDF e guia devem conservar:** Edição
  incompleta, comando identificável, e resultado confirmado. Descartar o
  primeiro não elimina o último.

<!-- c-table:end -->

OWNER_APPROVED determina finalidade/regra humana; OWNER_DIRECTION_NEEDS_DETAIL
preserva direção e explicita exceções; TECHNICAL_IMPLEMENTATION_DELEGATED é
desenho, não execução. EXISTING_TO_PRESERVE impede recriar O10. DEFERRED não
autoriza remover integração existente. RECOMMENDATION_NOT_APPROVED e
PENDING_OWNER não satisfazem gate humano. REJECTED aplica-se a alternativas
que violam proibição expressa, não a recursos simplesmente adiados.

Conflitos resolvidos por fonte mais recente: DEC-028 restringe aceite ENT à
pessoa física; DEC-029 permite NOVO reconto por substituta; DEC-030 aprova
complemento e necessidade remanescente. Os detalhes P06/P07 ainda não
decididos
têm caminhos condicionais, sem escolha silenciosa. O evento original jamais
é reescrito para incorporar a decisão futura.

Revisões futuras registram ID, data, autor da decisão, escopo, status
anterior,
regra substituída e consumidores afetados. Um parecer técnico não se torna
aprovação humana pelo simples commit. C documenta; D exige autorização
própria.
