# Continuidade

O estado da entrega e as dependências ainda não verificadas ficam na
[matriz de execução](evolution/EXECUTION.md).

## Homologações externas

WhatsApp exige conta elegível, credencial válida, templates aprovados,
webhook configurado e teste real do destinatário. A restrição Meta 130497
é tratada como falha permanente segura, sem repetição automática.
Flows depende da chave do endpoint, configuração e publicação no provedor.
SMS, OAuth e e-mail real exigem seus provedores e redirects autorizados.
Transcrição possui contrato de adaptador; um provedor não foi homologado.

Câmera física, teclado virtual e permissões nos aparelhos reais complementam
a emulação Android e iPhone. Não declarar testes reais de aparelho a partir
de viewport ou browser emulado.

## Possibilidades futuras

- Assinatura digital Ed25519, gestão de chaves e verificador externo, mediante
  requisitos próprios. Não são necessários para a integridade transacional
  desta etapa e não estão implementados.
- Provedor de transcrição e ferramentas de IA para sugerir relatos,
  sempre com confirmação humana e sem autonomia clínica.
- Adaptador de e-mail operacional e agendamento do worker conforme o ambiente.
- Política de retenção e recuperação de objetos privados e seus metadados.

Estoque institucional, fornecimento direto por operadora/home care, módulo
financeiro, fornecedores e uma quinta ficha permanecem fora do escopo.
Somente ampliar essas fronteiras com requisitos e autorização próprios.
