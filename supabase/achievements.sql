-- 삼삼결투 업적 보상: 업적 등급(브론즈·실버·골드·전설)마다 메달을 한 번씩 주고, 한 등급을 모두 받으면 완성 보너스를 준다.
-- Supabase SQL Editor에 붙여 넣고 Run. 여러 번 실행해도 된다. (economy.sql 다음에)
--
-- ■ 등급별 보상풀
--   브론즈 업적마다 20, 모두 받으면 +100
--   실버   업적마다 50, 모두 받으면 +250
--   골드   업적마다 120, 모두 받으면 +500
--   전설   업적마다 300, 모두 받으면 +1000
--   등급 표(ach_def)와 금액(_ach_amt, _ach_bonus)은 index.html의 ACH_TIER, ACH_POOL과 같아야 한다.
-- ■ 업적 달성 판정은 브라우저가 한다. 서버는 업적마다 한 번만 지급해서 받을 수 있는 메달 총량을 묶어 둔다.

create table if not exists public.ach_def (id text primary key, tier text not null check (tier in ('b', 's', 'g', 'l')));
create table if not exists public.ach_claims (
  uid uuid not null references auth.users on delete cascade,
  id text not null, at timestamptz not null default now(), primary key (uid, id)
);
alter table public.ach_def enable row level security;
alter table public.ach_claims enable row level security;   -- 정책 없음: 아래 함수로만 읽고 쓴다

insert into public.ach_def (id, tier) select unnest(string_to_array(v, ' ')), t from (values
  ('b', 'run1 win1 perf quick heavy noab hard1 pvp1 emo week1 adm1 comeback'),
  ('s', 'run5 win50 long bo3 ban pvp10 hard10 cls10 adm2 rungold runrl skin5'),
  ('g', 'runc10 win200 perf10 pvp50 adm3 admfast runhp1 run300 week10 bosses'),
  ('l', 'runc30 cls30 admflaw relics')) as x(t, v)
on conflict (id) do update set tier = excluded.tier;

create or replace function public._ach_amt(t text) returns int language sql immutable as $$
  select case t when 'b' then 20 when 's' then 50 when 'g' then 120 when 'l' then 300 else 0 end $$;
create or replace function public._ach_bonus(t text) returns int language sql immutable as $$
  select case t when 'b' then 100 when 's' then 250 when 'g' then 500 when 'l' then 1000 else 0 end $$;

-- 받은 업적 목록(등급 완성 보너스는 'tier:b' 같은 이름)
create or replace function public.ach_claimed() returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(id order by at), '[]'::json) from ach_claims where uid = auth.uid()
$$;

-- 받기: 고른 업적들의 메달을 주고, 등급을 모두 받았으면 완성 보너스까지
create or replace function public.ach_claim(p_ids text[]) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); d record; got int := 0; bonus int := 0; t text; bal int;
begin
  if me is null then raise exception 'login'; end if;
  if coalesce(array_length(p_ids, 1), 0) > 60 then raise exception 'too many'; end if;
  for d in select id, tier from ach_def where id = any(p_ids) order by id loop
    insert into ach_claims (uid, id) values (me, d.id) on conflict do nothing;
    if found then got := got + _pay(me, 'ach', _ach_amt(d.tier)); end if;
  end loop;
  foreach t in array array['b', 's', 'g', 'l'] loop
    if (select count(*) from ach_def where tier = t) = (select count(*) from ach_claims c join ach_def a on a.id = c.id where c.uid = me and a.tier = t) then
      insert into ach_claims (uid, id) values (me, 'tier:' || t) on conflict do nothing;
      if found then bonus := bonus + _pay(me, 'ach', _ach_bonus(t)); end if;
    end if;
  end loop;
  select medals into bal from wallet where id = me;
  return json_build_object('medals', got, 'bonus', bonus, 'wallet', coalesce(bal, 0),
    'claimed', (select coalesce(json_agg(id order by at), '[]'::json) from ach_claims where uid = me));
end $$;

revoke all on function public.ach_claimed() from public, anon;
grant execute on function public.ach_claimed() to authenticated;
revoke all on function public.ach_claim(text[]) from public, anon;
grant execute on function public.ach_claim(text[]) to authenticated;
