-- ==============================================================================
-- LOVE VIAGENS — datas da viagem na reserva
-- Rode no SQL Editor do projeto Supabase da Love, depois de 001_loveviagens.sql.
-- Idempotente: pode rodar de novo.
--
-- A reserva passa a guardar data_inicio/data_fim copiadas do pacote no
-- momento da troca, para "Minhas viagens" separar próximas de passadas
-- mesmo que o pacote mude ou seja apagado depois.
-- ==============================================================================

alter table viagens_reservas
  add column if not exists data_inicio date,
  add column if not exists data_fim date;

-- Preenche as reservas antigas com as datas do pacote, quando ele ainda existe.
update viagens_reservas r
   set data_inicio = p.data_inicio,
       data_fim = p.data_fim
  from viagens_pacotes p
 where p.id = r.pacote_id
   and r.data_inicio is null;

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
                                data_inicio, data_fim,
                                valor_saldo, valor_restante, pagamento_restante, status)
  values (pac.id, uid, tipo, pac.titulo, pac.destino, pac.preco,
          pac.data_inicio, pac.data_fim,
          usar, restante, case when restante > 0 then p_pagamento_restante end,
          case when restante > 0 then 'pendente_pagamento' else 'confirmada' end)
  returning * into reserva;

  update viagens_pacotes set vagas_vendidas = vagas_vendidas + 1 where id = pac.id;

  return to_jsonb(reserva);
end;
$$;

revoke execute on function loveviagens_trocar(uuid, numeric, text) from public, anon;
grant execute on function loveviagens_trocar(uuid, numeric, text) to authenticated;
