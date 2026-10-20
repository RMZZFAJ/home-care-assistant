# Arquitetura

O App Router mantém páginas e route handlers em `src/app`; regras compartilhadas ficam em `src/lib`; o fluxo visual fica em `src/components/requisitions`; contratos ficam em `src/types`. O navegador nunca é fonte de identidade nem de protocolo.

O MVP usa o cliente público do Supabase com SSR. A autorização definitiva combina sessão validada no servidor e RLS. Operações futuras de estoque, documentos e integrações devem passar por funções de negócio, não por SQL vindo de agentes.

