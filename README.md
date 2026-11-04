# Atlas CRM — laboratório

CRM de propostas B2B em português, construído com Next.js, TypeScript e Supabase. A interface segue a IDV Atlas e cobre login, dashboard, busca e filtros, cadastro/edição validado, detalhe e histórico.

Sem credenciais, o projeto abre uma **prévia somente leitura** sobre os fixtures fictícios. A planilha não é usada como banco operacional: após a configuração, `scripts/import-fixtures.mjs` faz uma carga inicial idempotente no Postgres do Supabase.

## Requisitos e versões fixadas

- Node.js 24 (a documentação do Next.js 16 exige Node 20.9+; o Supabase anunciou o fim do suporte de seus clientes a Node 20 em 30/06/2026)
- pnpm 11.25.0
- Next.js 16.4.5, React 19.3.1, TypeScript 5.9.3
- `@supabase/supabase-js` 2.118.0 e `@supabase/ssr` 0.12.7

As dependências têm versões exatas e `pnpm-lock.yaml` versionado.

## Execução local

```bash
cp .env.example .env.local
pnpm install --frozen-lockfile
pnpm dev
```

Acesse `http://localhost:3000`. Sem variáveis Supabase, use “Abrir prévia do laboratório”.

## Configuração

Preencha `.env.local` (nunca versione esse arquivo):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
ATLAS_IMPORT_OWNER_ID=uuid-do-usuario-dono-da-carga
NEXT_PUBLIC_APP_URL=http://localhost:3000
ATLAS_DEMO_MODE=false
```

A chave publicável pode ir ao navegador porque todas as tabelas expostas têm RLS. A chave secreta é exclusiva do importador no servidor e não deve usar prefixo `NEXT_PUBLIC_`.

1. Crie o usuário dono em Supabase Auth e copie seu UUID.
2. Aplique `supabase/migrations/202611030001_atlas_crm.sql` no projeto autorizado.
3. Defina `app_metadata.crm_role` como `gerente` ou `administrador` apenas para quem pode chamar `registrar_ganho`.
4. Execute `pnpm import:fixtures`.
5. Repita o importador: ele deve informar zero inserções, sem reverter propostas já alteradas.

## Segurança e regras comerciais

- RLS isola todas as linhas por `auth.uid() = owner_id`; chaves estrangeiras compostas evitam referências entre alunos.
- Views usam `security_invoker`.
- Ganho não pode ser gravado por `UPDATE` direto. Somente `registrar_ganho` revalida proprietário, papel, etapa, vigência, validade, aprovação, desconto e margem.
- A função bloqueia a linha e cria Ganho, histórico e outbox na mesma transação. A restrição única impede confirmação duplicada.
- Propostas ganhas são imutáveis. Alertas continuam visíveis e bloqueiam ganho automático.
- Não há envio de e-mail nesta etapa; a outbox fica em `pendente` para integração futura.
- Sessões SSR usam cookies via `@supabase/ssr`; nenhum dado comercial usa `localStorage`.

## Testes e verificações

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Os testes conferem as 120 propostas únicas, as três exceções e os valores independentes: 60 ganhos / R$ 2.268.000, pipeline R$ 1.407.600 e ponderado R$ 661.080. `fixtures/casos_teste.json` preserva a matriz de 24 cenários; os testes reais de RLS e transação dependem do projeto Supabase autorizado.

## Publicação na Vercel

Produção: [https://atlas-crm-eosin.vercel.app](https://atlas-crm-eosin.vercel.app)

O projeto Vercel está configurado com o preset Next.js e as variáveis públicas persistidas nos ambientes Development, Preview e Production. Cadastre segredos somente onde forem necessários. No primeiro acesso, use “Criar primeiro acesso”; depois vincule a carga inicial ao UUID desse usuário e valide isolamento entre dois usuários, persistência após recarregar e `registrar_ganho` com a matriz.

## Fontes do projeto

Os requisitos vieram de `CONTEXTO-PARA-CODEX.txt` e `CONTRATO-CRM.txt`. A carga publicada em `fixtures/` veio exclusivamente de `dados/vendas_atlas_tratada.csv`; base bruta, logs e inventários não são carregados como propostas.

Na preparação local não foi encontrado `CONFIGURACAO-DA-TURMA.txt`. Os destinos remotos foram confirmados pelas sessões autorizadas: repositório `nandocafer/Lab_Fernanda`, projeto Supabase `AulaInteligenciaArtificial` e projeto Vercel `fernandacosta/atlas-crm`.
