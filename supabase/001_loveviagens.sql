-- ==============================================================================
-- LOVE VIAGENS — reservas e troca de saldo por viagem
-- Rode no SQL Editor do MESMO projeto Supabase da Love (a Love Viagens usa o
-- mesmo Auth e as mesmas carteiras). Idempotente: pode rodar de novo.
--
-- Depende do que a Love já tem:
--   clientes / cliente_wallet_transactions   (anfitrião — "Index")
--   fornecedores / wallet_transactions        (fornecedor — "B2B")
--   viagens_pacotes                           (Admin › Love Viagens)
-- ==============================================================================

-- ------------------------------------------------------------------
-- 1. Reservas
-- ------------------------------------------------------------------
create table if not exists viagens_reservas (
  id uuid primary key default gen_random_uuid(),
  pacote_id uuid references viagens_pacotes(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  tipo_conta text not null check (tipo_conta in ('index', 'b2b')),

  -- Cópia do pacote no momento da troca (o pacote pode mudar depois)
  titulo text not null,
  destino text,
  preco numeric not null,

  valor_saldo numeric not null default 0,      -- quanto saiu da carteira Love
  valor_restante numeric not null default 0,   -- diferença a pagar à parte
  pagamento_restante text check (pagamento_restante in ('pix', 'cartao')),

  status text not null default 'confirmada'
    check (status in ('confirmada', 'pendente_pagamento', 'cancelada')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists viagens_reservas_user_idx on viagens_reservas (user_id, created_at desc);

alter table viagens_reservas enable row level security;

drop policy if exists "viagens_reservas_dono_select" on viagens_reservas;
create policy "viagens_reservas_dono_select" on viagens_reservas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "viagens_reservas_admin_all" on viagens_reservas;
create policy "viagens_reservas_admin_all" on viagens_reservas
  for all to authenticated using (is_admin()) with check (is_admin());

drop trigger if exists viagens_reservas_touch on viagens_reservas;
create trigger viagens_reservas_touch
  before update on viagens_reservas
  for each row execute function touch_updated_at();


-- ------------------------------------------------------------------
-- 2. Conta e saldo do usuário logado
--    Descobre se é anfitrião (clientes) ou fornecedor (fornecedores) e
--    devolve nome, saldo e as últimas transações da carteira certa.
-- ------------------------------------------------------------------
create or replace function loveviagens_conta()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r record;
  saldo numeric := 0;
  transacoes jsonb := '[]'::jsonb;
begin
  if uid is null then
    return null;
  end if;

  select c.* into r from clientes c where c.id = uid;
  if found then
    select coalesce(sum(case when t.type = 'credit' then t.amount else -t.amount end), 0)
      into saldo from cliente_wallet_transactions t where t.cliente_id = uid;
    select coalesce(jsonb_agg(jsonb_build_object(
        'type', t.type, 'amount', t.amount, 'description', t.description, 'created_at', t.created_at)
        order by t.created_at desc), '[]'::jsonb)
      into transacoes
      from (select * from cliente_wallet_transactions where cliente_id = uid order by created_at desc limit 50) t;
    return jsonb_build_object(
      'tipo', 'index',
      'nome', coalesce(nullif(to_jsonb(r) ->> 'full_name', ''), nullif(to_jsonb(r) ->> 'couple_name', '')),
      'avatar_url', to_jsonb(r) ->> 'avatar_url',
      'saldo', saldo,
      'transacoes', transacoes);
  end if;

  select f.* into r from fornecedores f where f.id = uid;
  if found then
    select coalesce(sum(case when t.type = 'credit' then t.amount else -t.amount end), 0)
      into saldo from wallet_transactions t where t.fornecedor_id = uid;
    select coalesce(jsonb_agg(jsonb_build_object(
        'type', t.type, 'amount', t.amount, 'description', t.description, 'created_at', t.created_at)
        order by t.created_at desc), '[]'::jsonb)
      into transacoes
      from (select * from wallet_transactions where fornecedor_id = uid order by created_at desc limit 50) t;
    return jsonb_build_object(
      'tipo', 'b2b',
      'nome', to_jsonb(r) ->> 'company_name',
      'avatar_url', to_jsonb(r) ->> 'avatar_url',
      'saldo', saldo,
      'transacoes', transacoes);
  end if;

  -- Entrou só com o Google: ainda não é anfitrião nem fornecedor.
  return jsonb_build_object('tipo', 'google', 'saldo', 0, 'transacoes', '[]'::jsonb);
end;
$$;

revoke execute on function loveviagens_conta() from public, anon;
grant execute on function loveviagens_conta() to authenticated;


-- ------------------------------------------------------------------
-- 3. Trocar saldo por um pacote (tudo numa transação)
--    - confere vaga e saldo
--    - debita a carteira certa (cliente_wallet_transactions ou wallet_transactions)
--    - cria a reserva e soma 1 em vagas_vendidas
-- ------------------------------------------------------------------
create or replace function loveviagens_trocar(
  p_pacote_id uuid,
  p_usar_saldo numeric,
  p_pagamento_restante text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  pac viagens_pacotes%rowtype;
  tipo text;
  saldo numeric := 0;
  usar numeric := round(coalesce(p_usar_saldo, 0), 2);
  restante numeric;
  reserva viagens_reservas%rowtype;
begin
  if uid is null then
    raise exception 'É preciso estar logado para trocar saldo por uma viagem.';
  end if;

  select * into pac from viagens_pacotes where id = p_pacote_id and ativo for update;
  if not found then
    raise exception 'Pacote não encontrado ou não está mais disponível.';
  end if;
  if pac.vagas is not null and pac.vagas_vendidas >= pac.vagas then
    raise exception 'Este pacote está esgotado.';
  end if;

  if exists (select 1 from clientes where id = uid) then
    tipo := 'index';
    select coalesce(sum(case when type = 'credit' then amount else -amount end), 0)
      into saldo from cliente_wallet_transactions where cliente_id = uid;
  elsif exists (select 1 from fornecedores where id = uid) then
    tipo := 'b2b';
    select coalesce(sum(case when type = 'credit' then amount else -amount end), 0)
      into saldo from wallet_transactions where fornecedor_id = uid;
  else
    raise exception 'Esta conta ainda não está ligada a uma conta Love. Entre com a sua conta Love para usar o saldo.';
  end if;

  if usar < 0 then usar := 0; end if;
  if usar > pac.preco then usar := pac.preco; end if;
  if usar > saldo then
    raise exception 'Saldo insuficiente: você tem % disponível.', to_char(saldo, 'FM999G999G990D00');
  end if;

  restante := round(pac.preco - usar, 2);
  if restante > 0 and p_pagamento_restante not in ('pix', 'cartao') then
    raise exception 'Escolha como pagar o restante (Pix ou cartão).';
  end if;

  if usar > 0 then
    if tipo = 'index' then
      insert into cliente_wallet_transactions (cliente_id, type, amount, description)
      values (uid, 'debit', usar, 'Love Viagens — ' || pac.titulo);
    else
      insert into wallet_transactions (fornecedor_id, type, amount, description)
      values (uid, 'debit', usar, 'Love Viagens — ' || pac.titulo);
    end if;
  end if;

  insert into viagens_reservas (pacote_id, user_id, tipo_conta, titulo, destino, preco,
                                valor_saldo, valor_restante, pagamento_restante, status)
  values (pac.id, uid, tipo, pac.titulo, pac.destino, pac.preco,
          usar, restante, case when restante > 0 then p_pagamento_restante end,
          case when restante > 0 then 'pendente_pagamento' else 'confirmada' end)
  returning * into reserva;

  update viagens_pacotes set vagas_vendidas = vagas_vendidas + 1 where id = pac.id;

  return to_jsonb(reserva);
end;
$$;

revoke execute on function loveviagens_trocar(uuid, numeric, text) from public, anon;
grant execute on function loveviagens_trocar(uuid, numeric, text) to authenticated;
