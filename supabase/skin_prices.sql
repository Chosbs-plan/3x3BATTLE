-- tools/sprites.py build가 sprites/skins.json의 "price"로 만든다. 직접 고치지 말 것.
-- 스킨 가격이 바뀌면 이 파일을 Supabase SQL Editor에서 다시 Run. 여러 번 실행해도 된다. (economy.sql 다음에)
create table if not exists public.skin_prices (cls text not null, skin text not null, price int not null check (price > 0), primary key (cls, skin));
alter table public.skin_prices enable row level security;
drop policy if exists "prices read" on public.skin_prices;
create policy "prices read" on public.skin_prices for select using (true);

begin;
delete from public.skin_prices;
insert into public.skin_prices (cls, skin, price) values
  ('gambler', 'queen', 800),
  ('hunter', 'wolf', 800);
commit;

-- 스킨 구매: 가격표에 있으면 그 값, 없으면 300. 잔액 확인과 차감이 한 번에 일어난다
create or replace function public.buy_skin(p_cls text, p_skin text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int; pr int;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if exists (select 1 from owned_skins where id = auth.uid() and cls = p_cls and skin = p_skin) then raise exception 'owned'; end if;
  select coalesce((select price from skin_prices where cls = p_cls and skin = p_skin), 300) into pr;
  update wallet set medals = medals - pr where id = auth.uid() and medals >= pr returning medals into bal;
  if not found then raise exception 'poor'; end if;
  insert into owned_skins (id, cls, skin) values (auth.uid(), p_cls, p_skin);
  return bal;
end $$;
revoke all on function public.buy_skin(text, text) from public, anon;
grant execute on function public.buy_skin(text, text) to authenticated;
