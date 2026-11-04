# Arquitetura de emissão e verificação de PDF

DEC-016/018 delegam composição/mecanismo e aprovam comparação do exemplar.
P09 mantém assinatura incorporada como escolha específica. Primeiro desenho
reutiliza document_pdfs e eventos, sem criar cartório ou alegação ICP-Brasil.

## Identidade e pipeline

Identidade de artefato: documento + versão de conteúdo + revisão do renderer +
classe (original/derivado/representação). Usar fonte/snapshot autorizado dessa
versão e nomes/datas com proveniência. Render não consulta diretório atual
para
reescrever autoria. Dados desconhecidos ficam desconhecidos. Conteúdo e ordem
são determinísticos para a identidade; emissão usa instante persistido, não
relógio de cada download. Fontes/assets e versão do renderer integram a
referência.

Pipeline: reservar identidade de geração → montar DTO documental tipado →
validar fatos/estados → renderizar e conferir completude/geometria → finalizar
bytes → calcular SHA-256 desses bytes → gravar objeto imutável → registrar
ready com tamanho/digest/identidade de Storage e conteúdo canônico. Se etapa
falha, estado parcial é recuperável. Mesmo conteúdo não autoriza substituir
original histórico com nova representação sem identificá-la.

<!-- c-table:start -->

- **Referência necessária:** document_id/version/canonical_hash

  **Origem e restrição:** Banco transacional, FK/versão existente; não confiar
  no valor enviado pelo browser.

- **Referência necessária:** renderer_revision/class/source

  **Origem e restrição:** Configuração versionada e origem do acervo; não
  classificar derivado como original.

- **Referência necessária:** storage_object_id/bytes/sha256

  **Origem e restrição:** Resultado final gravado e conferido; acesso privado
  e imutabilidade lógica por papel.

- **Referência necessária:** emitted_at/generated_at

  **Origem e restrição:** Instantes distintos quando a representação é
  posterior ao fato; não alterar a data do ato.

- **Referência necessária:** status e geração

  **Origem e restrição:** Reserved/ready/failed/uncertain conforme etapa;
  idempotência por identidade/intenção.

- **Referência necessária:** referência de confiança

  **Origem e restrição:** Registro protegido/backup e URL oficial; ameaça de
  administrador do banco/chaves explicitada.

<!-- c-table:end -->

Download de ready compara tamanho/digest e valida formato mínimo antes de
transmitir como íntegro; mismatch gera erro seguro e preserva objeto para
investigação autorizada, sem sobrescrever original. Cache não elimina esse
controle. Autorização de documento/versão ocorre antes de resolver Storage.
Arquivos já entregues seguem limite realista de revogação P15.

## Comparação de exemplar

O verificador recebe identidade de referência e arquivo selecionado. Opção
técnica inicial: hash local de bytes via API padrão, lookup TLS em origem
confiável e comparação mostrada pelo cliente da própria aplicação. Não enviar
conteúdo do paciente apenas para calcular digest. Para consumidores que exigem
digest atestado pelo servidor, endpoint opcional faz streaming limitado, sem
render/parser/executar anotações, compara e descarta os bytes; budget de
entrada
e privacidade precisam estar fechados antes de implementar.

Publicar só resultado mínimo e referência técnica, sem PII. Não expor endpoint
enumerável por protocolo/paciente; usar identidade opaca, limites de consulta,
respostas não enumeradoras e proteção contra abuso. Usuário autorizado tem
detalhe; consulta pública de integridade não amplia capacidade documental.

Hash do arquivo final é referência externa: inserir o próprio hash nos bytes
alteraria o valor. QR pode conter ID/versão/referência de lookup e hash do
conteúdo canônico quando apropriado, mas nunca é prova isolada do arquivo.
Teste obrigatório copia QR para arquivo modificado e exige divergência do
exemplar, embora o registro consultado continue existindo.

## Assinatura técnica e alternativas

Hash registrado protege comparação com a referência confiável; administrador
que altera arquivo e registro continua parte do modelo de ameaça. Extensão
assinada pode separar confiança: chave de assinatura restrita, key_id,
algoritmo,
manifesto assinado da identidade/digest, public keys e política de rotação,
revogação/comprometimento, backup e verificação independente. Escolher formato
de manifesto versus assinatura incorporada requer P09 e avaliação de leitor.
Não inventar prova de realidade física, assinatura pessoal ou conformidade
legal.

## Oráculos e recuperação

Teste de conteúdo esperado por tipo/estado, extração independente, geometria
de célula maior que página, raster e revisão visual/humana. B8-Q001 exige que
mutante em branco reprove mesmo com páginas/metadata corretas.
Idioma/tags/ordem
precisam prova própria e AT; alternativa HTML completa depende de aceite.
Anexo sanitizado conserva ressalva ou é recusado; não relaxar barreira ativa.
Restore recupera registro e bytes, compara ambos e mantém emissão externa em
quarentena. Falha de Storage não vira novo PDF histórico criado por
conveniência.
