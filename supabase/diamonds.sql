-- 삼삼결투 다이아: 스팀 결제로 충전하는 유료 재화. 스킨(전설 포함)을 산다.
-- Supabase SQL Editor에 붙여 넣고 Run. 여러 번 실행해도 된다. (economy.sql 다음, skin_prices.sql 앞이나 뒤 어디든)
--
-- ■ 유료 다이아와 무료 다이아를 따로 센다
--   paid: 결제로 받은 것. 스팀에서 환불되면 그만큼 뺀다(이미 썼으면 음수로 두고 다음 충전에서 갚는다)
--   free: 묶음 보너스·관리자 지급·이벤트로 받은 것
--   쓸 때는 free를 먼저 쓴다(환불받을 수 있는 유료분을 남겨 두려고)
-- ■ 충전은 Edge Function(supabase/functions/steam-dia)만 한다. 브라우저가 "결제했어요"라고 보내는 값은 믿지 않는다
--   주문 만들기 → 스팀 InitTxn → 사용자가 스팀 오버레이에서 승인 → FinalizeTxn 성공 → dia_order_paid
-- ■ 묶음 가격(dia_packs)을 바꾸려면 아래 insert 값을 고쳐 다시 Run. index.html은 이 표를 읽어 보여 준다

create table if not exists public.dia_wallet (
  id uuid primary key references auth.users on delete cascade,
  paid int not null default 0,
  free int not null default 0 check (free >= 0)
);
create table if not exists public.dia_packs (
  id text primary key,
  item int not null unique,               -- 스팀 InitTxn의 itemid(숫자)
  dia int not null check (dia > 0),       -- 유료 다이아
  bonus int not null default 0 check (bonus >= 0),   -- 무료 보너스
  krw int not null check (krw > 0),       -- 원
  usd int not null check (usd > 0),       -- 센트
  once boolean not null default false,    -- 계정당 한 번
  ord int not null default 0,
  active boolean not null default true
);
create table if not exists public.dia_orders (
  orderid bigint primary key generated always as identity (start with 100001),
  uid uuid not null references auth.users on delete cascade,
  pack text not null references public.dia_packs,
  dia int not null, bonus int not null,
  steamid text, currency text, amount int,
  status text not null default 'init' check (status in ('init', 'done', 'fail', 'refund')),
  transid text,
  at timestamptz not null default now(), done_at timestamptz
);
create index if not exists dia_orders_uid on public.dia_orders (uid);
create table if not exists public.dia_log (
  n bigint primary key generated always as identity,
  uid uuid not null references auth.users on delete cascade,
  paid int not null, free int not null, kind text not null, ref text,
  at timestamptz not null default now()
);
-- 스팀 계정 연결. 스팀 로그인(Edge Function)이 채운다. 충전은 연결된 계정만
create table if not exists public.steam_links (
  uid uuid primary key references auth.users on delete cascade,
  steamid text not null unique, at timestamptz not null default now()
);
-- 스킨을 어디서 얻었는지: medal(메달 구매), dia(다이아 구매), dlc, gift
alter table public.owned_skins add column if not exists src text not null default 'medal';

alter table public.dia_wallet enable row level security;
alter table public.dia_packs enable row level security;
alter table public.dia_orders enable row level security;
alter table public.dia_log enable row level security;
alter table public.steam_links enable row level security;
drop policy if exists "dia read own" on public.dia_wallet;
create policy "dia read own" on public.dia_wallet for select using (auth.uid() = id);
drop policy if exists "packs read" on public.dia_packs;
create policy "packs read" on public.dia_packs for select using (active);
drop policy if exists "orders read own" on public.dia_orders;
create policy "orders read own" on public.dia_orders for select using (auth.uid() = uid);
drop policy if exists "dia log read own" on public.dia_log;
create policy "dia log read own" on public.dia_log for select using (auth.uid() = uid);
drop policy if exists "steam read own" on public.steam_links;
create policy "steam read own" on public.steam_links for select using (auth.uid() = uid);

-- 묶음. 가격은 스팀 가격 단계에 맞춰 출시 전에 다시 확인할 것
insert into public.dia_packs (id, item, dia, bonus, krw, usd, once, ord) values
  ('first', 1, 300, 0, 3300, 299, true, 0),
  ('s', 2, 120, 0, 1200, 99, false, 1),
  ('m', 3, 600, 60, 5900, 499, false, 2),
  ('l', 4, 1200, 180, 12000, 999, false, 3),
  ('xl', 5, 3300, 700, 33000, 2499, false, 4)
on conflict (id) do update set item = excluded.item, dia = excluded.dia, bonus = excluded.bonus, krw = excluded.krw, usd = excluded.usd, once = excluded.once, ord = excluded.ord;

-- 내부용: 다이아 더하기·빼기와 기록
create or replace function public._dia_add(p_uid uuid, p_paid int, p_free int, p_kind text, p_ref text) returns json
language plpgsql security definer set search_path = public as $$
declare w dia_wallet;
begin
  insert into dia_wallet (id, paid, free) values (p_uid, p_paid, greatest(p_free, 0))
    on conflict (id) do update set paid = dia_wallet.paid + p_paid, free = greatest(dia_wallet.free + p_free, 0)
    returning * into w;
  insert into dia_log (uid, paid, free, kind, ref) values (p_uid, p_paid, p_free, p_kind, p_ref);
  return json_build_object('paid', w.paid, 'free', w.free);
end $$;

-- 다이아로 스킨 사기: 무료분을 먼저 쓰고, 모자라면 유료분
create or replace function public.buy_skin_dia(p_cls text, p_skin text) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); pr int; w dia_wallet; uf int; up int;
begin
  if me is null then raise exception 'login'; end if;
  if p_skin is null or p_skin = '' then raise exception 'bad skin'; end if;
  if exists (select 1 from owned_skins where id = me and cls = p_cls and skin = p_skin) then raise exception 'owned'; end if;
  pr := _skin_dia(p_cls, p_skin);
  select * into w from dia_wallet where id = me for update;
  if not found or w.free + greatest(w.paid, 0) < pr then raise exception 'poor'; end if;
  uf := least(w.free, pr); up := pr - uf;
  update dia_wallet set free = free - uf, paid = paid - up where id = me returning * into w;
  insert into dia_log (uid, paid, free, kind, ref) values (me, -up, -uf, 'skin', p_cls || ':' || p_skin);
  insert into owned_skins (id, cls, skin, src) values (me, p_cls, p_skin, 'dia');
  return json_build_object('paid', w.paid, 'free', w.free);
end $$;

-- ===== 주문: Edge Function(service_role)만 부른다 =====
create or replace function public.dia_order_new(p_uid uuid, p_pack text, p_steamid text, p_currency text) returns json
language plpgsql security definer set search_path = public as $$
declare k dia_packs; o dia_orders; amt int;
begin
  select * into k from dia_packs where id = p_pack and active;
  if not found then raise exception 'bad pack'; end if;
  if k.once and exists (select 1 from dia_orders where uid = p_uid and pack = p_pack and status in ('done', 'refund')) then raise exception 'once'; end if;
  -- 스팀 InitTxn의 금액 단위는 통화의 가장 작은 단위 × 100으로 알고 있다(USD는 센트). 원화 단위는 출시 전에 Steamworks 문서로 확인
  amt := case when p_currency = 'KRW' then k.krw * 100 else k.usd end;
  insert into dia_orders (uid, pack, dia, bonus, steamid, currency, amount)
    values (p_uid, p_pack, k.dia, k.bonus, p_steamid, case when p_currency = 'KRW' then 'KRW' else 'USD' end, amt) returning * into o;
  return json_build_object('orderid', o.orderid, 'item', k.item, 'amount', o.amount, 'currency', o.currency, 'dia', k.dia, 'bonus', k.bonus);
end $$;

-- 결제 확정: 같은 주문을 두 번 지급하지 않는다(init일 때만 done으로 바꾸고 지급)
create or replace function public.dia_order_paid(p_orderid bigint, p_transid text) returns json
language plpgsql security definer set search_path = public as $$
declare o dia_orders;
begin
  update dia_orders set status = 'done', transid = p_transid, done_at = now() where orderid = p_orderid and status = 'init' returning * into o;
  if not found then
    select * into o from dia_orders where orderid = p_orderid;
    if not found then raise exception 'no order'; end if;
    return (select json_build_object('paid', paid, 'free', free, 'again', true) from dia_wallet where id = o.uid);
  end if;
  return _dia_add(o.uid, o.dia, o.bonus, 'buy', o.orderid::text);
end $$;

create or replace function public.dia_order_fail(p_orderid bigint) returns void
language sql security definer set search_path = public as $$
  update dia_orders set status = 'fail', done_at = now() where orderid = p_orderid and status = 'init'
$$;

-- 환불: 유료분은 다 빼고(음수 가능), 보너스는 남은 만큼만 뺀다
create or replace function public.dia_order_refund(p_orderid bigint) returns json
language plpgsql security definer set search_path = public as $$
declare o dia_orders;
begin
  update dia_orders set status = 'refund', done_at = now() where orderid = p_orderid and status = 'done' returning * into o;
  if not found then raise exception 'not refundable'; end if;
  return _dia_add(o.uid, -o.dia, -o.bonus, 'refund', o.orderid::text);
end $$;

-- 관리자: 내 계정에 무료 다이아 지급(테스트용)
create or replace function public.admin_dia(p_amt int) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = auth.uid()) then raise exception 'denied'; end if;
  if p_amt is null or p_amt < 1 or p_amt > 100000 then raise exception 'bad amount'; end if;
  return _dia_add(auth.uid(), 0, p_amt, 'admin', null);
end $$;

-- 관리자: 스팀 없이 충전 흐름 시험(주문을 만들고 바로 확정). 실제 결제는 일어나지 않는다
create or replace function public.admin_dia_test(p_pack text) returns json
language plpgsql security definer set search_path = public as $$
declare o json;
begin
  if not exists (select 1 from admins where id = auth.uid()) then raise exception 'denied'; end if;
  o := dia_order_new(auth.uid(), p_pack, 'test', 'KRW');
  return dia_order_paid((o->>'orderid')::bigint, 'test');
end $$;

revoke all on function public._dia_add(uuid, int, int, text, text) from public, anon, authenticated;
revoke all on function public.dia_order_new(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.dia_order_paid(bigint, text) from public, anon, authenticated;
revoke all on function public.dia_order_fail(bigint) from public, anon, authenticated;
revoke all on function public.dia_order_refund(bigint) from public, anon, authenticated;
grant execute on function public.dia_order_new(uuid, text, text, text) to service_role;
grant execute on function public.dia_order_paid(bigint, text) to service_role;
grant execute on function public.dia_order_fail(bigint) to service_role;
grant execute on function public.dia_order_refund(bigint) to service_role;
revoke all on function public.buy_skin_dia(text, text) from public, anon;
grant execute on function public.buy_skin_dia(text, text) to authenticated;
revoke all on function public.admin_dia(int) from public, anon;
grant execute on function public.admin_dia(int) to authenticated;
revoke all on function public.admin_dia_test(text) from public, anon;
grant execute on function public.admin_dia_test(text) to authenticated;
