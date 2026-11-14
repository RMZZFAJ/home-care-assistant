# D3.21 — troca recuperável da foto pessoal

A foto passa a ter uma intenção persistente por conta: chave, arquivo original,
revisão do ponteiro e caminho único. O servidor limita a entrada a5 MB,
normaliza a imagem, registra o hash dos bytes seguros e confere o objeto real
antes de pedir a associação autenticada. A sessão é revalidada depois da espera
pela linha do perfil. Nenhum ID, caminho ou alegação de verificação do navegador
autoriza a operação.

Retry usa a mesma intenção e nunca sobrescreve o objeto. Resposta desconhecida
congela a escolha; consulta e recuperação retomam o resultado existente. Uma
intenção antiga já concluída não reaplica a foto sobre outra mais recente.
Após recarregar, a pessoa pode recuperar a troca ou selecionar o mesmo arquivo
original. O arquivo só fica em memória; não é persistido no navegador.

O abandono é explícito e conserva a foto atual. Limpeza só recebe caminhos
gerenciados de intenções terminais que não sejam o ponteiro de nenhum perfil.
Falha de limpeza conserva o candidato e é informada separadamente do sucesso
da associação. Novos comandos repetem a limpeza com limite de20 candidatos;
não há job externo ativado. Objetos legados sem intenção não são apagados por
inferência. O setter legado não pode ressuscitar caminhos gerenciados.

## Conta pessoal e interface

Meu perfil pode abrir sem paciente selecionado. Essa escolha estática da página
não dá acesso a telas clínicas ou administrativas. O conteúdo é remontado ao
mudar a identidade, enquanto a troca de contexto do mesmo usuário não descarta
a edição pessoal. Os endpoints continuam usando a identidade autenticada.

Leitura distingue carregamento, falha, foto indisponível e ausência de foto.
Falha de consulta não vira erro de validação do arquivo. Retry é explícito,
mensagens têm região de status e o retorno após comando recebe foco. Campos
pessoais em edição permanecem intactos durante a recuperação da foto.

## Provas e contraprovas

O baseline reproduziu dois objetos após duas recusas de associação; o ponteiro
válido anterior permaneceu. A implementação elimina essa acumulação por retry.
Três casos com Auth e Storage reais cobrem concorrência da mesma chave, única
intenção pendente, bytes e grants forjados, revogação após espera real, outra
conta, abandono, coleta segura e replay antigo sem regressão de revisão.

Quinze cenários distintos de produção foram qualificados em Chromium, Chrome
móvel emulado e WebKit: seis da foto e nove regressões de perfil/foco/consumo.
Os cenários da foto fazem24 inspeções Axe em320/390/768/1440 pixels. Houve26
testes unitários de contrato/consumidores aprovados; sete testes Auth anteriores
também passaram na coorte inicial e conservam fonte/contratos pertinentes.
Tipos e lint dos arquivos afetados passaram. A CI própria é um gate separado.

Três falhas intermediárias estão preservadas, além do baseline de acumulação:

- Conflito permanente foi inicialmente codificado como40001. O PostgREST
  repetia a transação; a migration164 substitui esse código por P0001 nos cinco
  RPCs novos. Testes finais confirmam409 seguro, sem loop ou relaxamento.
- Meu perfil exigia seleção de paciente. A página foi corrigida e a prova
  final confirma contexto nulo, edição conservada e guardas operacionais.
- O replay multipart interceptado perdeu o corpo no WebKit. O teste passou a
  manter o envio nativo e só invalidar a resposta visível após o commit real,
  seguindo o instrumento já existente de anexos. Não houve ajuste de produto
  para mascarar essa limitação do teste. A asserção passou a aguardar o marcador
  do commit real, pois o aviso de intenção incerta pode aparecer antes dele.

## Limites e rastreabilidade

C-AC-080 anteriormente citava o pipeline de PDF por engano; sua evidência agora
é a troca de avatar. Isso não amplia a aprovação dos critérios documentais.
C-FINAL-AC-021 recebe somente a prova parcial do escopo da conta própria;
proposta congelada, global/familiar e demais relações mantêm suas tarefas.

[Manifesto de fontes e coortes](AVATAR_RECOVERY_EVIDENCE.json) e
[recibo remoto](AVATAR_REMOTE_MIGRATIONS.json) registram os resultados. A
aplicação incremental163–164 foi reconciliada antes do commit:164 versões,
dois históricos SQL,12 funções/grants, coluna, RLS, política, índices, trigger
e saúde pertinentes. PDF V10 inalterado. O comparador inicial de histórico
precisou remover comentários de cada statement antes de juntar os statements;
definições e SQL executável coincidem. Compatível
com objetos legados; clientes antigos sem chave/revisão recebem orientação de
atualização antes de qualquer upload. Sem reset, fixture/Auth remoto, alteração
de produção ou backup/restore integral redundante. Não é prova de aparelho
físico/AT, confiança externa ou recuperação operacional D6. PR7 Draft, Sonar
adiado e meta D-B ativa.
