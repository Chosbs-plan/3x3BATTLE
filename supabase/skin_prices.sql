-- tools/sprites.py build가 sprites/skins.json의 "price", "dia", "tier"로 만든다. 직접 고치지 말 것.
-- 스킨 가격이 바뀌면 이 파일을 Supabase SQL Editor에서 다시 Run. 여러 번 실행해도 된다. (economy.sql 다음에)
-- 메달 가격: 표에 있으면 그 값, 없으면 300. 전설은 메달 가격이 없다(다이아로만).
-- 다이아 가격: 표에 있으면 그 값, 전설은 1200, 나머지는 메달 가격 ÷ 3을 10단위로 올림(300 → 100, 800 → 270). index.html의 skinDia와 같아야 한다
create table if not exists public.skin_prices (cls text not null, skin text not null, price int, primary key (cls, skin));
alter table public.skin_prices alter column price drop not null;
alter table public.skin_prices add column if not exists dia int;
alter table public.skin_prices add column if not exists legend boolean not null default false;
alter table public.skin_prices enable row level security;
drop policy if exists "prices read" on public.skin_prices;
create policy "prices read" on public.skin_prices for select using (true);

begin;
delete from public.skin_prices;
insert into public.skin_prices (cls, skin, price, dia, legend) values
  ('gambler', 'queen', 800, null, false),
  ('hunter', 'wolf', 800, null, false),
  ('onmyoji', 'chess', 800, null, false);
commit;

-- 다이아 가격(diamonds.sql의 buy_skin_dia가 쓴다)
create or replace function public._skin_dia(p_cls text, p_skin text) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(p.dia, case when p.legend then 1200 else (ceil(coalesce(p.price, 300) / 30.0) * 10)::int end)
  from (select 1) x left join skin_prices p on p.cls = p_cls and p.skin = p_skin
$$;
revoke all on function public._skin_dia(text, text) from public, anon, authenticated;

-- 스킨 구매(메달): 가격표에 있으면 그 값, 없으면 300. 전설은 거절. 잔액 확인과 차감이 한 번에 일어난다
create or replace function public.buy_skin(p_cls text, p_skin text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int; pr int;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  if exists (select 1 from owned_skins where id = auth.uid() and cls = p_cls and skin = p_skin) then raise exception 'owned'; end if;
  if exists (select 1 from skin_prices where cls = p_cls and skin = p_skin and legend) then raise exception 'dia only'; end if;
  select coalesce((select price from skin_prices where cls = p_cls and skin = p_skin), 300) into pr;
  update wallet set medals = medals - pr where id = auth.uid() and medals >= pr returning medals into bal;
  if not found then raise exception 'poor'; end if;
  insert into owned_skins (id, cls, skin) values (auth.uid(), p_cls, p_skin);
  return bal;
end $$;
revoke all on function public.buy_skin(text, text) from public, anon;
grant execute on function public.buy_skin(text, text) to authenticated;
