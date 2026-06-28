-- Trade cancel + counter-offer support.
-- Run after schema-trades.sql.

alter table public.trades drop constraint if exists trades_status_check;
alter table public.trades add constraint trades_status_check
  check (status in ('pending', 'accepted', 'rejected', 'cancelled', 'countered'));

-- Sender can cancel their pending trade
drop policy if exists "Senders can cancel pending trades" on public.trades;
create policy "Senders can cancel pending trades"
  on public.trades for update
  using (auth.uid() = from_user_id and status = 'pending')
  with check (auth.uid() = from_user_id and status = 'cancelled');

-- Transactional inventory swap on accept
create or replace function public.execute_trade_swap(
  p_trade_id uuid,
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_from_items jsonb,
  p_to_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
  row_id uuid;
  new_qty integer;
begin
  for item in select * from jsonb_to_recordset(p_from_items) as x(card_id text, quantity int)
  loop
    select id, quantity into row_id, new_qty from inventory
      where user_id = p_from_user_id and card_id = item.card_id for update;
    if new_qty is null or new_qty < item.quantity then
      raise exception 'Insufficient inventory for card %', item.card_id;
    end if;
    new_qty := new_qty - item.quantity;
    if new_qty <= 0 then delete from inventory where id = row_id;
    else update inventory set quantity = new_qty where id = row_id;
    end if;

    select id, quantity into row_id, new_qty from inventory
      where user_id = p_to_user_id and card_id = item.card_id for update;
    if row_id is null then
      insert into inventory (user_id, card_id, quantity) values (p_to_user_id, item.card_id, item.quantity);
    else
      update inventory set quantity = new_qty + item.quantity where id = row_id;
    end if;
  end loop;

  for item in select * from jsonb_to_recordset(p_to_items) as x(card_id text, quantity int)
  loop
    select id, quantity into row_id, new_qty from inventory
      where user_id = p_to_user_id and card_id = item.card_id for update;
    if new_qty is null or new_qty < item.quantity then
      raise exception 'Insufficient inventory for card %', item.card_id;
    end if;
    new_qty := new_qty - item.quantity;
    if new_qty <= 0 then delete from inventory where id = row_id;
    else update inventory set quantity = new_qty where id = row_id;
    end if;

    select id, quantity into row_id, new_qty from inventory
      where user_id = p_from_user_id and card_id = item.card_id for update;
    if row_id is null then
      insert into inventory (user_id, card_id, quantity) values (p_from_user_id, item.card_id, item.quantity);
    else
      update inventory set quantity = new_qty + item.quantity where id = row_id;
    end if;
  end loop;
end;
$$;

grant execute on function public.execute_trade_swap(uuid, uuid, uuid, jsonb, jsonb) to service_role;
