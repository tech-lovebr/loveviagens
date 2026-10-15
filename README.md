# Love Viagens — loveviagens.com.br

Plataforma de venda de viagens da Love. O saldo que a pessoa recebeu de presentes na conta Love (anfitrião, em love.com.br) ou na carteira do Hub B2B (fornecedor) pode ser trocado por um pacote de viagem.

Projeto separado da plataforma Love (repositório e domínio próprios), mas **usa o mesmo projeto Supabase**: mesmo Auth (a pessoa entra com a conta Love que já tem), mesmas carteiras e a tabela `viagens_pacotes` que o Admin da Love já cadastra em Admin › Love Viagens.

## Rodar em localhost

```bash
npm start
```

Abre em `http://localhost:8091/`. Não há build nem dependências: é HTML, CSS e JS puro servido por `server.js` (mesmo modelo da Love, que roda na 8090).

## Páginas

| Rota | Arquivo | O que faz |
| --- | --- | --- |
| `/` | `index.html` | Vitrine: busca, destaques, filtro por tipo, como funciona, FAQ |
| `/pacote?id=` | `pacote.html` | Detalhe do pacote, quanto do saldo ele cobre, botão de troca |
| `/viagens` | `viagens.html` | Marketplace: todos os pacotes com busca e filtro (logado ou não) |
| `/login` | `login.html` | Entrar com a conta Love (janelinha da Love) ou com o Google |
| `/app` | `app.html` | Início da área logada: saldo, próximas viagens e vitrine |
| `/minhas-viagens` | `minhas-viagens.html` | Viagens trocadas: próximas e passadas |
| `/minha-conta` | `minha-conta.html` | Tipo da conta (Love / Love B2B / Google), saldo e extrato |
| `/checkout?id=` | `checkout.html` | Escolhe quanto do saldo usar e confirma a troca |
| `/auth-popup.html` | — | Volta do login com o Google em janelinha |
| `/auth-love` | `auth-love.html` | Volta do login com a conta Love quando não deu para usar a janelinha |

Header logado: Início · Viagens · Minhas viagens, saldo e avatar com menu (Minha conta, Como funciona, Dúvidas, Sair).

## Login com a conta Love

"Entrar com a conta Love" abre em uma janelinha a página `entrar-viagens.html` **da Love** (love.com.br; em localhost, `http://localhost:8090`). A pessoa entra lá com a interface da Love (ou só confirma, se já estiver logada na Love) e a página devolve a sessão por `postMessage` só para as origens permitidas (loveviagens.com.br e localhost:8091). Em celular ou com pop-up bloqueado, a página inteira vai para a Love e volta por `/auth-love`.

Essa página vive no repositório da Love (branch `feat/login-externo-viagens`) e precisa estar publicada em love.com.br para funcionar em produção.

## Banco (Supabase)

Rode `supabase/001_loveviagens.sql` e depois `supabase/002_reservas_datas.sql` no SQL Editor do projeto Supabase da Love. O primeiro cria:

- `viagens_reservas` — reservas feitas aqui (RLS: cada pessoa vê as suas; admin vê tudo)
- `loveviagens_conta()` — RPC que diz se a conta é de anfitrião (`index`) ou fornecedor (`b2b`), o saldo e o extrato
- `loveviagens_trocar(pacote, valor, pagamento_restante)` — RPC que debita a carteira certa, cria a reserva e soma a vaga vendida numa transação só

Enquanto a migration não roda, o site continua funcionando: o saldo é lido direto das tabelas da carteira e as reservas de pacotes de demonstração ficam só no navegador (marcadas como "simulação").

## Login com o Google

Em Supabase → Authentication → URL Configuration → Redirect URLs, adicione:

- `http://localhost:8091/auth-popup.html` e `http://localhost:8091/minha-conta`
- `https://loveviagens.com.br/auth-popup.html` e `https://loveviagens.com.br/minha-conta`

## Pacotes de demonstração

Se `viagens_pacotes` estiver vazia (ou inacessível), a vitrine mostra os pacotes de `js/data.js` com um aviso. Assim que houver pacotes publicados no Admin, eles tomam o lugar.

## Deploy

`vercel.json` já mapeia as rotas limpas. Basta apontar o domínio `loveviagens.com.br` para o projeto na Vercel.
