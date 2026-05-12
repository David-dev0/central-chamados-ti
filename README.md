# Central de Chamados TI

Site simples para abertura de chamados de suporte por lojas.

## Como preparar o Supabase

1. Acesse o painel do projeto Supabase.
2. Abra **SQL Editor**.
3. Execute o arquivo `supabase-schema.sql`.
4. Abra `index.html` no navegador ou publique os arquivos em uma hospedagem estatica.

O formulario grava na tabela `public.chamados` usando a REST API do Supabase.

## Painel de TI

O arquivo `admin.html` abre um painel privado para consultar chamados do Supabase.
Crie um usuario em **Authentication > Users** no Supabase e execute o SQL atualizado
para permitir leitura e atualizacao de status para usuarios autenticados.

## Observacao sobre hospedagem

O Supabase fornece banco, API, autenticacao, storage e edge functions, mas a URL `/rest/v1/`
nao hospeda HTML diretamente. Para colocar o site no ar, use uma hospedagem estatica
como Netlify, Vercel, Cloudflare Pages, GitHub Pages ou um bucket publico do Supabase
Storage apontando para `index.html`, `styles.css` e `app.js`.
