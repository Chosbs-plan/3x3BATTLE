-- 삼삼결투 메달 경제: 메달과 보유 스킨은 서버 함수만 바꿀 수 있다.
-- 브라우저는 읽기만 하고, 보상·구매·관리자 지급은 아래 함수(RPC)로만 요청한다.
-- Supabase SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 된다.

create table if not exists public.wallet (
  id uuid primary key references auth.users on delete cascade,
  medals int not null default 0 check (medals >= 0)
);
create table if not exists public.owned_skins (
  id uuid not null references auth.users on delete cascade,
  cls text not null, skin text not null, at timestamptz not null default now(),
  primary key (id, cls, skin)
);
create table if not exists public.admins (id uuid primary key references auth.users on delete cascade);
-- 한 판(봇 연습, 모험, 대전)을 시작할 때 서버가 시각을 적어 둔다. 너무 빨리 끝난 판은 보상하지 않는다
create table if not exists public.plays (
  sid uuid primary key default gen_random_uuid(),
  id uuid not null references auth.users on delete cascade,
  kind text not null, started timestamptz not null default now(), paid boolean not null default false
);
-- 대전 결과는 두 사람이 따로 보고하고, 서로 맞을 때만 지급한다
create table if not exists public.pvp_reports (
  room text not null, gid int not null, reporter uuid not null references auth.users on delete cascade,
  opp uuid not null, result text not null, sid uuid not null, at timestamptz not null default now(),
  primary key (room, gid, reporter)
);
create table if not exists public.reward_log (
  id uuid not null references auth.users on delete cascade, kind text not null, amount int not null, at timestamptz not null default now()
);
create index if not exists reward_log_day on public.reward_log (id, kind, at);

alter table public.wallet enable row level security;
alter table public.owned_skins enable row level security;
alter table public.admins enable row level security;
alter table public.plays enable row level security;
alter table public.pvp_reports enable row level security;
alter table public.reward_log enable row level security;
-- 읽기만 허용(자기 것). 쓰기 정책은 일부러 만들지 않는다
drop policy if exists "wallet read own" on public.wallet;
create policy "wallet read own" on public.wallet for select using (auth.uid() = id);
drop policy if exists "skins read own" on public.owned_skins;
create policy "skins read own" on public.owned_skins for select using (auth.uid() = id);
drop policy if exists "log read own" on public.reward_log;
create policy "log read own" on public.reward_log for select using (auth.uid() = id);

-- 내부용: 지급과 하루 합계
create or replace function public._pay(p_uid uuid, p_kind text, p_amt int) returns int
language plpgsql security definer set search_path = public as $$
begin
  if p_amt is null or p_amt <= 0 then return 0; end if;
  insert into wallet (id, medals) values (p_uid, p_amt)
    on conflict (id) do update set medals = wallet.medals + excluded.medals;
  insert into reward_log (id, kind, amount) values (p_uid, p_kind, p_amt);
  return p_amt;
end $$;
create or replace function public._today(p_uid uuid, p_kind text) returns int
language sql security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int from reward_log where id = p_uid and kind = p_kind and at > now() - interval '1 day'
$$;

create or replace function public.start_play(p_kind text) returns uuid
language plpgsql security definer set search_path = public as $$
declare s uuid;
begin
  if auth.uid() is null or p_kind not in ('bot', 'run', 'pvp') then raise exception 'bad request'; end if;
  insert into plays (id, kind) values (auth.uid(), p_kind) returning sid into s;
  return s;
end $$;

-- 봇 연습: 40초 이상 걸린 판만. 승리 5·8·12(쉬움·보통·어려움), 패배 2. 하루 150까지
create or replace function public.finish_bot(p_sid uuid, p_won boolean, p_lv text) returns int
language plpgsql security definer set search_path = public as $$
declare p plays; amt int;
begin
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'bot' and not paid for update;
  if not found or now() - p.started < interval '40 seconds' then return 0; end if;
  update plays set paid = true where sid = p_sid;
  amt := case when p_won then (case p_lv when 'easy' then 5 when 'hard' then 12 else 8 end) else 2 end;
  amt := least(amt, greatest(0, 150 - _today(auth.uid(), 'bot')));
  return _pay(auth.uid(), 'bot', amt);
end $$;

-- 모험: 지나온 칸 비율 × 200, 완주 +100. 칸마다 최소 30초가 걸려야 인정. 하루 900까지
create or replace function public.finish_run(p_sid uuid, p_done int, p_total int, p_cleared boolean) returns int
language plpgsql security definer set search_path = public as $$
declare p plays; amt int; tot int; dn int; secs numeric;
begin
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'run' and not paid for update;
  if not found then return 0; end if;
  update plays set paid = true where sid = p_sid;
  tot := greatest(1, least(coalesce(p_total, 18), 18));
  secs := extract(epoch from now() - p.started);
  dn := greatest(0, least(coalesce(p_done, 0), tot, floor(secs / 30)::int));
  amt := round(dn::numeric / tot * 200)::int + case when p_cleared and dn >= tot then 100 else 0 end;
  amt := least(amt, greatest(0, 900 - _today(auth.uid(), 'run')));
  return _pay(auth.uid(), 'run', amt);
end $$;

-- 대전: 45초 이상, 두 사람의 보고가 서로 맞아야 둘 다 지급. 승리 30, 무승부 15, 패배 10. 하루 600까지
create or replace function public.finish_pvp(p_sid uuid, p_room text, p_gid int, p_opp uuid, p_res text) returns int
language plpgsql security definer set search_path = public as $$
declare p plays; o pvp_reports; me int; them int;
begin
  if auth.uid() is null or p_opp is null or p_opp = auth.uid() or p_res not in ('win', 'lose', 'draw') then return 0; end if;
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'pvp' and not paid for update;
  if not found or now() - p.started < interval '45 seconds' then return 0; end if;
  insert into pvp_reports (room, gid, reporter, opp, result, sid) values (p_room, p_gid, auth.uid(), p_opp, p_res, p_sid)
    on conflict do nothing;
  select * into o from pvp_reports where room = p_room and gid = p_gid and reporter = p_opp and opp = auth.uid();
  if not found then return 0; end if;   -- 상대 보고를 기다린다. 상대가 보고하는 순간 둘 다 받는다
  if not ((p_res = 'win' and o.result = 'lose') or (p_res = 'lose' and o.result = 'win') or (p_res = 'draw' and o.result = 'draw')) then return 0; end if;
  if exists (select 1 from plays where sid = o.sid and paid) then return 0; end if;
  update plays set paid = true where sid in (p_sid, o.sid);
  me := case p_res when 'win' then 30 when 'draw' then 15 else 10 end;
  them := case o.result when 'win' then 30 when 'draw' then 15 else 10 end;
  perform _pay(p_opp, 'pvp', least(them, greatest(0, 600 - _today(p_opp, 'pvp'))));
  return _pay(auth.uid(), 'pvp', least(me, greatest(0, 600 - _today(auth.uid(), 'pvp'))));
end $$;

-- 스킨 구매: 가격표(skin_prices, skin_prices.sql이 채운다)에 있으면 그 값, 없으면 300. 잔액 확인과 차감이 한 번에 일어난다
create table if not exists public.skin_prices (cls text not null, skin text not null, price int not null check (price > 0), primary key (cls, skin));
alter table public.skin_prices enable row level security;
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

-- 관리자 지급: admins 표에 있는 계정만
create or replace function public.admin_grant(p_amt int) returns int
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if not exists (select 1 from admins where id = auth.uid()) then raise exception 'denied'; end if;
  if p_amt is null or p_amt < 1 or p_amt > 100000 then raise exception 'bad amount'; end if;
  insert into wallet (id, medals) values (auth.uid(), p_amt)
    on conflict (id) do update set medals = wallet.medals + excluded.medals returning medals into bal;
  insert into reward_log (id, kind, amount) values (auth.uid(), 'admin', p_amt);
  return bal;
end $$;

-- 실행 권한: 내부 함수는 아무도, 공개 함수는 로그인한 사람만
revoke all on function public._pay(uuid, text, int) from public, anon, authenticated;
revoke all on function public._today(uuid, text) from public, anon, authenticated;
revoke all on function public.start_play(text) from public, anon;
revoke all on function public.finish_bot(uuid, boolean, text) from public, anon;
revoke all on function public.finish_run(uuid, int, int, boolean) from public, anon;
revoke all on function public.finish_pvp(uuid, text, int, uuid, text) from public, anon;
revoke all on function public.buy_skin(text, text) from public, anon;
revoke all on function public.admin_grant(int) from public, anon;
grant execute on function public.start_play(text) to authenticated;
grant execute on function public.finish_bot(uuid, boolean, text) to authenticated;
grant execute on function public.finish_run(uuid, int, int, boolean) to authenticated;
grant execute on function public.finish_pvp(uuid, text, int, uuid, text) to authenticated;
grant execute on function public.buy_skin(text, text) to authenticated;
grant execute on function public.admin_grant(int) to authenticated;

-- 관리자 등록: 아래 줄의 아이디를 본인 아이디로 바꿔서 한 번 실행
-- insert into public.admins (id) select id from public.profiles where lower(nickname) = lower('내아이디') on conflict do nothing;
