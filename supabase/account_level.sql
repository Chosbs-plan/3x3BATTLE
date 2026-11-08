-- 삼삼결투 계정 레벨: 판을 끝내면 서버가 경험치(XP)를 주고, 레벨이 오르면 레벨마다 보상(메달, 다이아)을 받는다.
-- 칭호(5·10·20·30·40·50레벨)는 브라우저가 레벨을 보고 연다.
-- Supabase SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 된다.
-- 경험치는 economy.sql의 finish_bot/finish_run/finish_pvp가 _xp_try로 부른다. economy.sql도 한 번 더 Run(그 뒤 skin_prices.sql도).
-- 다이아 보상은 diamonds.sql이 있어야 다이아로 들어가고, 없으면 같은 가치의 메달(다이아 1 = 메달 5)로 들어간다.

create table if not exists public.account_xp (
  id uuid primary key references auth.users on delete cascade,
  xp int not null default 0 check (xp >= 0),
  claimed int not null default 1 check (claimed >= 1)   -- 보상을 받은 마지막 레벨(1레벨은 보상 없음)
);
create table if not exists public.xp_log (
  id uuid not null references auth.users on delete cascade, kind text not null, amount int not null, at timestamptz not null default now()
);
create index if not exists xp_log_day on public.xp_log (id, kind, at);
alter table public.account_xp enable row level security;
alter table public.xp_log enable row level security;
drop policy if exists "xp read own" on public.account_xp;
create policy "xp read own" on public.account_xp for select using (auth.uid() = id);

-- 레벨 n에서 n+1로 가는 데 드는 경험치: 100, 120, 140, ... (최고 50레벨, 모두 28,420)
create or replace function public._lv_need(n int) returns int language sql immutable as $$ select 100 + 20 * (n - 1) $$;
create or replace function public._lv_of(p_xp int) returns int language plpgsql immutable as $$
declare l int := 1; r int := coalesce(p_xp, 0);
begin
  while l < 50 and r >= _lv_need(l) loop r := r - _lv_need(l); l := l + 1; end loop;
  return l;
end $$;
-- 레벨 보상: 메달 30 + 레벨×5, 5의 배수 레벨은 다이아 20, 10의 배수 레벨은 다이아 50
create or replace function public._lv_reward(l int, out medals int, out dia int) language sql immutable as $$
  select 30 + 5 * l, case when l % 10 = 0 then 50 when l % 5 = 0 then 20 else 0 end
$$;
create or replace function public._xp_today(p_uid uuid, p_kind text) returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from xp_log where id = p_uid and kind = p_kind and at > now() - interval '1 day'
$$;

-- 판 하나의 경험치. 봇: 승리 20·30·45(쉬움·보통·어려움), 패배 10, 하루 400까지
-- 모험: 지나온 칸마다 10, 완주 +80, 하루 1200까지 / 대전: 승리 60, 무승부 40, 패배 25, 하루 1500까지
create or replace function public._xp_match(p_uid uuid, p_mode text, p_res text, p_lv text, p_nodes int, p_cleared boolean) returns int
language plpgsql security definer set search_path = public as $$
declare amt int; cap int;
begin
  if p_uid is null then return 0; end if;
  if p_mode = 'bot' then amt := case when p_res = 'win' then (case p_lv when 'easy' then 20 when 'hard' then 45 else 30 end) else 10 end; cap := 400;
  elsif p_mode = 'run' then amt := 10 * greatest(0, coalesce(p_nodes, 0)) + case when p_cleared then 80 else 0 end; cap := 1200;
  elsif p_mode = 'pvp' then amt := case p_res when 'win' then 60 when 'draw' then 40 else 25 end; cap := 1500;
  else return 0; end if;
  amt := least(amt, greatest(0, cap - _xp_today(p_uid, p_mode)));
  if amt <= 0 then return 0; end if;
  insert into account_xp (id, xp) values (p_uid, amt) on conflict (id) do update set xp = account_xp.xp + excluded.xp;
  insert into xp_log (id, kind, amount) values (p_uid, p_mode, amt);
  return amt;
end $$;

-- 내 레벨: 경험치, 레벨, 받은 보상 레벨
create or replace function public.lv_get() returns json
language plpgsql security definer set search_path = public as $$
declare a account_xp;
begin
  if auth.uid() is null then raise exception 'no session'; end if;
  select * into a from account_xp where id = auth.uid();
  return json_build_object('xp', coalesce(a.xp, 0), 'lv', _lv_of(coalesce(a.xp, 0)), 'claimed', coalesce(a.claimed, 1));
end $$;

-- 레벨 보상 받기: 아직 받지 않은 레벨의 보상을 한 번에 지급한다
create or replace function public.lv_claim() returns json
language plpgsql security definer set search_path = public as $$
declare a account_xp; l int; lv int; m int := 0; d int := 0; r record; dia_ok boolean := true; bal int;
begin
  if auth.uid() is null then raise exception 'no session'; end if;
  insert into account_xp (id) values (auth.uid()) on conflict (id) do nothing;
  select * into a from account_xp where id = auth.uid() for update;
  lv := _lv_of(a.xp);
  if lv <= a.claimed then
    return json_build_object('from', a.claimed, 'to', a.claimed, 'medals', 0, 'dia', 0, 'wallet', (select medals from wallet where id = auth.uid()));
  end if;
  for l in a.claimed + 1 .. lv loop select * into r from _lv_reward(l); m := m + r.medals; d := d + r.dia; end loop;
  if d > 0 then
    begin perform _dia_add(auth.uid(), 0, d, 'level', 'lv' || lv);
    exception when undefined_function or undefined_table then dia_ok := false; m := m + d * 5; d := 0; end;
  end if;
  perform _pay(auth.uid(), 'level', m);
  update account_xp set claimed = lv where id = auth.uid();
  select medals into bal from wallet where id = auth.uid();
  return json_build_object('from', a.claimed, 'to', lv, 'medals', m, 'dia', d, 'dia_ok', dia_ok, 'wallet', coalesce(bal, 0));
end $$;

-- 관리자 시험용: 내 경험치 더하기(음수면 0까지 빼기)
create or replace function public.admin_xp(p_amt int) returns json
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from admins where id = auth.uid()) then raise exception 'not admin'; end if;
  insert into account_xp (id, xp) values (auth.uid(), greatest(0, p_amt)) on conflict (id) do update set xp = greatest(0, account_xp.xp + p_amt);
  return lv_get();
end $$;

grant execute on function public.lv_get() to authenticated;
grant execute on function public.lv_claim() to authenticated;
grant execute on function public.admin_xp(int) to authenticated;
revoke execute on function public._xp_match(uuid, text, text, text, int, boolean) from public, anon, authenticated;
