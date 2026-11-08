-- 삼삼결투 서버 대전: 방 상태와 판정을 서버가 들고 있는다.
-- 방(duel_rooms)은 엣지 함수 duel(supabase/functions/duel)만 쓴다. 게임은 폴링 함수(duel_poll)로 읽기만 한다.
-- 양쪽 계획(duel_secret)은 아무도 읽을 수 없고, 엣지 함수가 판정할 때만 쓴다.
-- 결과(duel_results)는 서버가 판정한 그대로 남고, 보상은 각자 duel_fin으로 한 번만 받는다.
-- Supabase SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 된다. economy.sql(메달), account_level.sql(경험치) 다음에.

create table if not exists public.duel_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{4}$'),
  a uuid references auth.users on delete set null,
  b uuid references auth.users on delete set null,
  doc jsonb not null,
  ver int not null default 1,
  deadline timestamptz,
  seen_a timestamptz, seen_b timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.duel_secret (code text primary key references public.duel_rooms on delete cascade, plans jsonb not null default '{}');
create table if not exists public.duel_results (
  code text not null, gid int not null, winner text not null check (winner in ('a', 'b', 'draw')), mode text,
  a uuid, b uuid, forfeit text, at timestamptz not null default now(), primary key (code, gid, at)
);
create index if not exists duel_results_cg on public.duel_results (code, gid);
create table if not exists public.duel_paid (code text not null, gid int not null, at timestamptz not null, uid uuid not null, primary key (code, gid, at, uid));
create index if not exists duel_rooms_a on public.duel_rooms (a, updated_at);
create index if not exists duel_rooms_b on public.duel_rooms (b, updated_at);
alter table public.duel_rooms enable row level security;
alter table public.duel_secret enable row level security;
alter table public.duel_results enable row level security;
alter table public.duel_paid enable row level security;
-- 정책을 일부러 만들지 않는다: 브라우저는 아래 함수로만 읽고 쓴다

-- 폴링: 내 자리라면 접속 시각을 남기고, 판이 바뀌었으면(ver) 방 문서를 돌려준다
-- due: 제한 시간이 지나 엣지 함수 tick을 불러야 함. opp: 상대가 마지막으로 보인 뒤 지난 초
create or replace function public.duel_poll(p_code text, p_ver int default 0) returns json
language plpgsql security definer set search_path = public as $$
declare r duel_rooms; k text;
begin
  if auth.uid() is null then raise exception 'no session'; end if;
  select * into r from duel_rooms where code = upper(p_code);
  if not found then return json_build_object('gone', true); end if;
  k := case when r.a = auth.uid() then 'a' when r.b = auth.uid() then 'b' else null end;
  if k is null then return json_build_object('seat', null, 'ver', r.ver); end if;
  if k = 'a' then update duel_rooms set seen_a = now() where code = r.code; else update duel_rooms set seen_b = now() where code = r.code; end if;
  return json_build_object('seat', k, 'ver', r.ver,
    'doc', case when r.ver <> coalesce(p_ver, 0) then r.doc else null end,
    'due', r.deadline is not null and r.deadline < now(),
    'opp', extract(epoch from now() - coalesce(case when k = 'a' then r.seen_b else r.seen_a end, r.created_at))::int);
end $$;

-- 다시 들어오기: 앱을 다시 켰을 때 아직 끝나지 않은 내 방(3시간 안)
create or replace function public.duel_mine() returns json
language sql security definer set search_path = public as $$
  select json_build_object('code', code, 'phase', doc->>'phase') from duel_rooms
  where (a = auth.uid() or b = auth.uid()) and updated_at > now() - interval '3 hours'
    and not coalesce((doc->>'closed')::boolean, false) and doc->>'phase' in ('lobby', 'ban', 'select', 'play')
  order by updated_at desc limit 1
$$;

-- 엣지 함수 전용: 방을 한 번에 저장한다. p_ver가 0이면 새 방, 아니면 그 판본일 때만 고친다(동시에 고치면 -1, 다시 읽어 재시도)
create or replace function public.duel_commit(p_code text, p_ver int, p_doc jsonb, p_a uuid, p_b uuid, p_deadline timestamptz,
  p_seen_a timestamptz, p_seen_b timestamptz, p_plans jsonb, p_result jsonb default null) returns int
language plpgsql security definer set search_path = public as $$
declare nv int;
begin
  if p_ver = 0 then
    insert into duel_rooms (code, a, b, doc, ver, deadline, seen_a, seen_b) values (p_code, p_a, p_b, p_doc, 1, p_deadline, p_seen_a, p_seen_b)
      on conflict (code) do nothing returning ver into nv;
    if nv is null then return -1; end if;
    insert into duel_secret (code, plans) values (p_code, coalesce(p_plans, '{}')) on conflict (code) do update set plans = excluded.plans;
    delete from duel_rooms where updated_at < now() - interval '1 day';   -- 오래된 방 정리
  else
    update duel_rooms set doc = p_doc, a = p_a, b = p_b, ver = ver + 1, deadline = p_deadline,
      seen_a = coalesce(p_seen_a, seen_a), seen_b = coalesce(p_seen_b, seen_b), updated_at = now()
      where code = p_code and ver = p_ver returning ver into nv;
    if nv is null then return -1; end if;
    insert into duel_secret (code, plans) values (p_code, coalesce(p_plans, '{}')) on conflict (code) do update set plans = excluded.plans;
  end if;
  if p_result is not null then
    insert into duel_results (code, gid, winner, mode, a, b, forfeit)
      values (p_code, (p_result->>'gid')::int, p_result->>'winner', p_result->>'mode', (p_result->>'a')::uuid, (p_result->>'b')::uuid, p_result->>'forfeit');
  end if;
  return nv;
end $$;

-- 보상: 서버가 판정한 결과로만 준다. 판(code, gid)마다 사람마다 한 번. 승리 30, 무승부 15, 패배 10(대전 하루 600까지)
-- 경험치(account_level.sql)와 일일 퀘스트도 여기서. p_stats는 퀘스트 진행용 판 기록(피해, 카드 수 등)일 뿐 결과와 보상에는 쓰지 않는다
create or replace function public.duel_fin(p_code text, p_gid int, p_stats jsonb default null) returns json
language plpgsql security definer set search_path = public as $$
declare r duel_results; k text; res text; amt int;
begin
  if auth.uid() is null then raise exception 'no session'; end if;
  select * into r from duel_results where code = upper(p_code) and gid = p_gid and (a = auth.uid() or b = auth.uid()) order by at desc limit 1;
  if not found then return json_build_object('ok', false, 'why', 'no result'); end if;
  k := case when r.a = auth.uid() then 'a' else 'b' end;
  if r.a is null or r.b is null or r.a = r.b then return json_build_object('ok', false, 'why', 'no opponent'); end if;
  insert into duel_paid (code, gid, at, uid) values (r.code, r.gid, r.at, auth.uid()) on conflict do nothing;
  if not found then return json_build_object('ok', false, 'why', 'paid', 'winner', r.winner, 'seat', k); end if;
  res := case when r.winner = 'draw' then 'draw' when r.winner = k then 'win' else 'lose' end;
  perform _quest_feed(auth.uid(), 'pvp', res, null, p_stats, 120, false);
  perform _xp_try(auth.uid(), 'pvp', res, null, null, false);
  amt := case res when 'win' then 30 when 'draw' then 15 else 10 end;
  amt := _pay(auth.uid(), 'pvp', least(amt, greatest(0, 600 - _today(auth.uid(), 'pvp'))));
  return json_build_object('ok', true, 'medals', amt, 'res', res, 'winner', r.winner, 'seat', k, 'forfeit', r.forfeit);
end $$;

revoke all on function public.duel_commit(text, int, jsonb, uuid, uuid, timestamptz, timestamptz, timestamptz, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.duel_commit(text, int, jsonb, uuid, uuid, timestamptz, timestamptz, timestamptz, jsonb, jsonb) to service_role;
revoke all on function public.duel_poll(text, int) from public, anon;
grant execute on function public.duel_poll(text, int) to authenticated;
revoke all on function public.duel_mine() from public, anon;
grant execute on function public.duel_mine() to authenticated;
revoke all on function public.duel_fin(text, int, jsonb) from public, anon;
grant execute on function public.duel_fin(text, int, jsonb) to authenticated;
