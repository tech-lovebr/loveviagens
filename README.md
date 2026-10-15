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
| `/login` | `login.html` | Entrar com o Google ou com e-mail e senha da conta Love |
| `/minha-conta` | `minha-conta.html` | Tipo da conta (Love / Love B2B / Google), saldo, viagens, extrato |
| `/checkout?id=` | `checkout.html` | Escolhe quanto do saldo usar e confirma a troca |
| `/auth-popup.html` | — | Volta do login com o Google em janelinha |

## Banco (Supabase)

Rode `supabase/001_loveviagens.sql` no SQL Editor do projeto Supabase da Love. Ele cria:

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
