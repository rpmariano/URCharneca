# Configurar o login (Supabase Auth)

O código e as políticas já estão prontos. Faltam estas definições no painel do Supabase e no Google.

## 1. Supabase → Authentication
- **URL Configuration:** Site URL `https://rpmariano.github.io/URCharneca/`; Redirect URLs `https://rpmariano.github.io/URCharneca/**` e `http://localhost:5173/**`.
- **Sign In / Providers → Email:** ativar "Confirm email" (obrigatório: é o que prova que o email é de quem se regista) e palavra-passe mínima de 8 carateres.
- **Sign In / Providers → Google:** ativar com o Client ID e o Client Secret (passo 2). A "callback URL" que o painel mostra é a que vai para o Google.
- **Email templates:** opcional, traduzir "Confirm signup" e "Reset password" para português.

## 2. Google Cloud Console (Google Sign-In)
1. APIs e serviços → Credenciais → Criar credenciais → ID de cliente OAuth → Aplicação Web.
2. Origens JavaScript autorizadas: `https://rpmariano.github.io`.
3. URI de redirecionamento: a "callback URL" do Supabase (`https://<projeto>.supabase.co/auth/v1/callback`).
4. Copiar Client ID e Secret para o Supabase (passo 1).

## 3. Como funciona o convite
O administrador abre a ficha do atleta, associa o email e autoriza o login. Só esse email consegue criar conta
(Google, ou "Primeiro acesso" com email e palavra-passe). Um email não autorizado é recusado pela base de dados.
Na primeira entrada a conta fica ligada à ficha. O admin pode enviar a qualquer momento um email de nova palavra-passe.

## 4. Variáveis do deploy
O workflow lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` das variáveis do repositório (Settings → Secrets and variables → Actions → Variables).
A chave "anon/publishable" é pública por desenho; quem protege os dados são as políticas RLS. Nunca colocar a chave `service_role` no repositório.
