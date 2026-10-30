# Anexos, Storage e retenção

## Prova do percurso real

Dez cenários B310. Servidor Next local foi compilado da mesma base em
.next-e2e, com guard, credenciais loopback e canais externos desativados.
Sessões SSR Auth reais e cookies somente em memória chamaram a API de upload.
Não houve navegador, publicação ou alteração de buckets.

Imagem PNG fictícia com EXIF foi sanitizada para JPEG. Download independente
confirmou formato, ausência de EXIF, bytes iguais ao metadado e SHA-256 igual
ao conteúdo. Vincular gerou uma versão nova do documento. Repetir a mesma
tentativa recuperou o mesmo anexo sem outra versão; outro conteúdo com a chave
antiga retornou 409 e não sobrescreveu bytes. Isso confirma o controle de hash
que já mitigava a falha visual de recuperação B1-ERR-001; a interface continua
uma questão separada, não corrigida aqui.

Tipo de arquivo inválido foi recusado antes de reservar. Caminho arbitrário
sem reserva não recebeu upload. Profissional sem COM e usuário de outro
paciente não baixaram os bytes. Revogar entre reserva e upload/finalização
recusou ambos os passos, mantendo quarantine. Autoridade é revalidada mesmo
quando o usuário conserva token Auth. Não basta conhecer o caminho do objeto.

PDF v1 de REQ foi obtido duas vezes pela API; bytes/cache coincidiram e o
registro document_pdf_renders apontou o hash correto. Hash do arquivo e hash
canônico documental têm propósitos diferentes. Não foi inspecionado layout,
impressão, QR físico ou assinatura assimétrica.

## Reservas e concorrência

DB-004/B2-016 foi revalidado: nove reservas quarantine sem objetos, duas novas
chamadas simultâneas sob barreira attachments, uma vaga concedida e outra
recusada. Dez reservas, zero ready, zero objetos. O limite é corretamente
serializado, mas não há expiração/abandono que libere essa capacidade.
Recuperar chave anterior não libera outra intenção. Não se apagaram reservas,
objetos existentes ou arquivos prontos como contorno.

A entrada exige exatamente um alvo e o paciente correspondente. Estado ready
e autoria não ampliam capacidade de leitura após revogação no caminho de
anexo paciente. Buckets patient-evidence/document-receipts/profile-avatars
são privados e possuem limites/MIME registrados no catálogo.

## Descoberta: revogação e URL já emitida são garantias diferentes

B310-06 obteve URL de 120s como leitor autorizado, revogou seu vínculo e
consultou de novo. A API recusou404, mas a URL anteriormente emitida ainda
retornou 200 dentro do prazo. Nenhuma URL/token/cookie foi exportado. Esse
comportamento de credencial temporária não é acesso permanente por membership
revogado nem exposição de outro paciente.

É uma janela real a explicitar na política de revogação. A decisão futura
precisa distinguir impedir nova autorização, invalidar links emitidos e dados
já baixados. Se o requisito exigir revalidação em cada download, considerar
proxy autenticado ou prazo menor com custos/compatibilidade medidos. Não
prometer revogar cópias já recebidas. Expiração efetiva após 120s não foi
testada.

## Descoberta: avatar não consulta a sessão operacional

B310-10 encerrou uma sessão Auth oficial e confirmou my_session_valid=false.
Reutilizando o JWT ainda dentro do prazo, gravou um JPEG novo no próprio
prefixo profile-avatars. A policy exige auth.uid no caminho, sem auth_session.
É diferença comprovada entre encerramento no app e escrita direta no Storage.

O alcance demonstrado é avatar próprio, privado e pequeno; não houve leitura
cruzada nem evidência de paciente acessada. Na B3.10 não se testou mudança de
perfil; B312-01 posteriormente comprovou escrita direta também no perfil e
ponteiro próprios. Não generalizar
para patient-evidence, que possui autorização complementar. Definir se logout/
revogação da sessão deve bloquear também essa escrita e revisar a policy em
fase autorizada, preservando upload pessoal legítimo e o contexto multipaciente.

## Consistência entre metadados e bytes

B310-09 é fixture explicitamente privilegiada: chamou finalize_attachment de
serviço sem criar objeto. Banco aceitou ready, Storage tinha zero objetos e
GET retornou 200 com url nula. Não é um caminho explorado pelo usuário normal:
a API de upload verifica bytes/hash antes de finalizar e o cliente não tem
EXECUTE do finalizador. A prova delimita a confiança no servidor e a ausência
de FK entre serviços; não classifica o finalizador como vulnerabilidade aberta.

Restauração parcial, exclusão privilegiada ou falha operacional exigem
reconciliação entre attachments, PDFs/renders e bytes. Backup SQL inclui
metadados, não conteúdo externo dos buckets. Não há ensaio integral de restore
ou política operacional de retenção aceita nesta B3; OPS-001 permanece.
Nenhum arquivo antigo foi excluído. A fixture faltante fica identificada como
prova, não como dado pronto para operação.

## Retenção e recuperação pendentes

Inventariar órfãos, reservas válidas/abandonadas, ready sem bytes, objetos sem
metadados e hashes divergentes em ensaio autorizado. Definir retenção, dono,
prazo e procedimento proporcional antes de automatizar exclusões. Preservar
reserva ainda ativa, arquivos ready e PDFs de versões históricas. Recuperação
visual B1, domínio B2 e confiança física/humana continuam limites separados.
