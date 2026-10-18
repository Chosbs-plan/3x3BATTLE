-- 삼삼결투 메달 경제: 메달과 보유 스킨은 서버 함수만 바꿀 수 있다.
-- 브라우저는 읽기만 하고, 보상·구매·관리자 지급은 아래 함수(RPC)로만 요청한다.
-- Supabase SQL Editor에 통째로 붙여 넣고 Run. 여러 번 실행해도 된다.
-- 일일 퀘스트(아래 '일일 퀘스트' 부분)도 여기 들어 있다. 이 파일을 다시 Run한 뒤 skin_prices.sql도 한 번 더 Run.

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
alter table public.pvp_reports add column if not exists stats jsonb;   -- 일일 퀘스트용 판 기록(피해, 카드 수 등)

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
-- p_stats는 일일 퀘스트 진행용 판 기록. 예전 함수(p_stats 없음)는 지워야 이름이 겹치지 않는다
drop function if exists public.finish_bot(uuid, boolean, text);
drop function if exists public.finish_run(uuid, int, int, boolean);
drop function if exists public.finish_pvp(uuid, text, int, uuid, text);
create or replace function public.finish_bot(p_sid uuid, p_won boolean, p_lv text, p_stats jsonb default null) returns int
language plpgsql security definer set search_path = public as $$
declare p plays; amt int;
begin
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'bot' and not paid for update;
  if not found or now() - p.started < interval '40 seconds' then return 0; end if;
  update plays set paid = true where sid = p_sid;
  perform _quest_feed(auth.uid(), 'bot', case when p_won then 'win' else 'lose' end, p_lv, p_stats, extract(epoch from now() - p.started), false);
  amt := case when p_won then (case p_lv when 'easy' then 5 when 'hard' then 12 else 8 end) else 2 end;
  amt := least(amt, greatest(0, 150 - _today(auth.uid(), 'bot')));
  return _pay(auth.uid(), 'bot', amt);
end $$;

-- 모험: 지나온 칸 비율 × 200, 완주 +100. 칸마다 최소 30초가 걸려야 인정. 하루 900까지
create or replace function public.finish_run(p_sid uuid, p_done int, p_total int, p_cleared boolean, p_stats jsonb default null) returns int
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
  perform _quest_feed(auth.uid(), 'run', null, null, coalesce(p_stats, '{}'::jsonb) || jsonb_build_object('nodes', dn), secs, coalesce(p_cleared, false) and dn >= tot);
  amt := least(amt, greatest(0, 900 - _today(auth.uid(), 'run')));
  return _pay(auth.uid(), 'run', amt);
end $$;

-- 대전: 45초 이상, 두 사람의 보고가 서로 맞아야 둘 다 지급. 승리 30, 무승부 15, 패배 10. 하루 600까지
create or replace function public.finish_pvp(p_sid uuid, p_room text, p_gid int, p_opp uuid, p_res text, p_stats jsonb default null) returns int
language plpgsql security definer set search_path = public as $$
declare p plays; o pvp_reports; me int; them int; os timestamptz;
begin
  if auth.uid() is null or p_opp is null or p_opp = auth.uid() or p_res not in ('win', 'lose', 'draw') then return 0; end if;
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'pvp' and not paid for update;
  if not found or now() - p.started < interval '45 seconds' then return 0; end if;
  insert into pvp_reports (room, gid, reporter, opp, result, sid, stats) values (p_room, p_gid, auth.uid(), p_opp, p_res, p_sid, p_stats)
    on conflict do nothing;
  select * into o from pvp_reports where room = p_room and gid = p_gid and reporter = p_opp and opp = auth.uid();
  if not found then return 0; end if;   -- 상대 보고를 기다린다. 상대가 보고하는 순간 둘 다 받는다
  if not ((p_res = 'win' and o.result = 'lose') or (p_res = 'lose' and o.result = 'win') or (p_res = 'draw' and o.result = 'draw')) then return 0; end if;
  if exists (select 1 from plays where sid = o.sid and paid) then return 0; end if;
  update plays set paid = true where sid in (p_sid, o.sid);
  select started into os from plays where sid = o.sid;
  perform _quest_feed(p_opp, 'pvp', o.result, null, o.stats, extract(epoch from now() - os), false);
  perform _quest_feed(auth.uid(), 'pvp', p_res, null, p_stats, extract(epoch from now() - p.started), false);
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

-- ===== 일일 퀘스트 =====
-- 하루(한국 시간 자정 기준)에 세 개: ★1·★2·★3 칸이 하나씩. 같은 날 같은 퀘스트는 겹치지 않는다.
-- 진행은 판이 끝날 때 finish_bot·finish_run·finish_pvp가 서버에서 올린다(브라우저가 직접 못 올림).
-- 다시 뽑기는 하루 2번, 보상은 다 채운 뒤 quest_claim으로 받는다.
-- 퀘스트 목록(quest_pool): c1~c3 = 단계별 목표 수(비우면 그 단계에 안 나옴), p1~p3 = 조건 값(턴 수 등), r1~r3 = 보상 메달
create table if not exists public.quest_pool (
  qid text primary key, metric text not null,
  c1 int, c2 int, c3 int, p1 int, p2 int, p3 int,
  r1 int not null default 25, r2 int not null default 45, r3 int not null default 80
);
alter table public.quest_pool enable row level security;
drop policy if exists "quest pool read" on public.quest_pool;
create policy "quest pool read" on public.quest_pool for select using (true);
insert into public.quest_pool (qid, metric, c1, c2, c3, p1, p2, p3, r1, r2, r3) values
  ('play',     'play',     2,    4,    7,    null, null, null, 25, 45, 80),   -- 결투 N판(봇 연습·대전·모험 결투)
  ('win',      'win',      1,    3,    5,    null, null, null, 25, 45, 80),   -- 결투 N승
  ('pvp',      'pvp_play', 1,    2,    4,    null, null, null, 30, 50, 90),   -- 대전 N판
  ('pvpwin',   'pvp_win',  1,    2,    3,    null, null, null, 35, 60, 100),  -- 대전 N승
  ('botlv',    'bot_lv',   2,    2,    2,    0,    1,    2,    25, 45, 80),   -- 봇 연습 승리(쉬움 이상·보통 이상·어려움)
  ('dmg',      'dmg',      15,   30,   50,   null, null, null, 25, 45, 80),   -- 피해 N
  ('ab',       'ab',       3,    6,    10,   null, null, null, 25, 45, 80),   -- 직업 능력 N번
  ('atk',      'atk',      10,   20,   35,   null, null, null, 25, 45, 80),   -- 공격 카드 N장
  ('sp',       'sp',       3,    6,    10,   null, null, null, 25, 45, 80),   -- 특수 카드(방어·투시·재정비…) N장
  ('mv',       'mv',       8,    15,   25,   null, null, null, 25, 45, 80),   -- 이동 카드 N장
  ('fast',     'fast',     1,    1,    1,    12,   9,    7,    25, 45, 80),   -- P턴 안에 승리
  ('tough',    'tough',    1,    1,    1,    3,    2,    1,    25, 45, 80),   -- 받은 피해 P 이하로 승리
  ('cls',      'cls',      2,    3,    5,    null, null, null, 25, 45, 80),   -- 서로 다른 직업 N개로 결투
  ('runnode',  'run_node', 4,    8,    12,   null, null, null, 25, 45, 80),   -- 모험에서 N칸 나아가기
  ('runelite', 'run_elite', 1,   2,    4,    null, null, null, 25, 45, 80),   -- 모험에서 정예·보스 N번 처치
  ('runclear', 'run_clear', null, null, 1,   null, null, null, 25, 45, 120)   -- 모험 완주(★3에만)
on conflict (qid) do update set metric = excluded.metric, c1 = excluded.c1, c2 = excluded.c2, c3 = excluded.c3,
  p1 = excluded.p1, p2 = excluded.p2, p3 = excluded.p3, r1 = excluded.r1, r2 = excluded.r2, r3 = excluded.r3;

create table if not exists public.daily_quests (
  id uuid not null references auth.users on delete cascade, day date not null, slot smallint not null check (slot between 0 and 2),
  qid text not null, tier smallint not null, target int not null, param int, reward int not null,
  prog int not null default 0, seen text[] not null default '{}', claimed boolean not null default false,
  primary key (id, day, slot)
);
create table if not exists public.quest_meta (
  id uuid not null references auth.users on delete cascade, day date not null, rerolls int not null default 0,
  primary key (id, day)
);
alter table public.daily_quests enable row level security;
alter table public.quest_meta enable row level security;
drop policy if exists "quests read own" on public.daily_quests;
create policy "quests read own" on public.daily_quests for select using (auth.uid() = id);
drop policy if exists "quest meta read own" on public.quest_meta;
create policy "quest meta read own" on public.quest_meta for select using (auth.uid() = id);

-- 오늘(한국 시간)
create or replace function public._qday() returns date
language sql stable set search_path = public as $$ select (now() at time zone 'Asia/Seoul')::date $$;

-- 오늘 퀘스트가 없으면 뽑는다: 칸 0·1·2 = ★1·★2·★3
create or replace function public._quest_roll(p_uid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare d date := _qday(); s int; q quest_pool; used text[] := '{}';
begin
  insert into quest_meta (id, day) values (p_uid, d) on conflict do nothing;
  if exists (select 1 from daily_quests where id = p_uid and day = d) then return; end if;
  for s in 0..2 loop
    select * into q from quest_pool
      where case s when 0 then c1 when 1 then c2 else c3 end is not null and not (qid = any (used))
      order by random() limit 1;
    if not found then continue; end if;
    used := used || q.qid;
    insert into daily_quests (id, day, slot, qid, tier, target, param, reward)
      values (p_uid, d, s, q.qid, s + 1,
        case s when 0 then q.c1 when 1 then q.c2 else q.c3 end,
        case s when 0 then q.p1 when 1 then q.p2 else q.p3 end,
        case s when 0 then q.r1 when 1 then q.r2 else q.r3 end)
      on conflict do nothing;
  end loop;
end $$;

-- 판 하나(또는 모험 하나)의 기록으로 오늘 퀘스트를 올린다. 기록 값은 걸린 시간으로 상한을 둔다
-- p_st: turns, dmg, taken, ab, atk, sp, mv, cls / 모험은 fights, wins, elite, nodes, ft(가장 빠른 승리 턴), lt(승리 중 가장 적게 받은 피해)
create or replace function public._quest_feed(p_uid uuid, p_mode text, p_res text, p_lv text, p_st jsonb, p_secs numeric, p_clear boolean) returns void
language plpgsql security definer set search_path = public as $$
declare st jsonb := coalesce(p_st, '{}'::jsonb); r daily_quests; m text; inc int;
  run boolean := p_mode = 'run'; secs numeric := greatest(0, coalesce(p_secs, 0));
  fights int; wins int; turns int; dmg int; taken int; ab int; atk int; sp int; mv int; elite int; nodes int; ft int; lt int; cls text; lvn int;
  num jsonb;
begin
  -- 숫자만 받는다(아니면 0)
  num := (select coalesce(jsonb_object_agg(k, v), '{}'::jsonb) from jsonb_each(st) as e(k, v) where jsonb_typeof(v) = 'number');
  if run then
    fights := least(greatest(coalesce((num->>'fights')::numeric, 0), 0), floor(secs / 40))::int;
    wins := least(greatest(coalesce((num->>'wins')::numeric, 0), 0), fights)::int;
    elite := least(greatest(coalesce((num->>'elite')::numeric, 0), 0), wins)::int;
    nodes := least(greatest(coalesce((num->>'nodes')::numeric, 0), 0), 18, floor(secs / 30))::int;
  else
    fights := 1; wins := case when p_res = 'win' then 1 else 0 end; elite := 0; nodes := 0;
  end if;
  turns := least(greatest(coalesce((num->>'turns')::numeric, 0), 0), floor(secs / 3), fights * 60)::int;
  dmg := least(greatest(coalesce((num->>'dmg')::numeric, 0), 0), turns * 4, fights * 40)::int;
  ab := least(greatest(coalesce((num->>'ab')::numeric, 0), 0), turns)::int;
  atk := least(greatest(coalesce((num->>'atk')::numeric, 0), 0), turns)::int;
  sp := least(greatest(coalesce((num->>'sp')::numeric, 0), 0), turns)::int;
  mv := least(greatest(coalesce((num->>'mv')::numeric, 0), 0), turns)::int;
  taken := greatest(coalesce((num->>'taken')::numeric, 99), 0)::int;
  ft := case when wins > 0 then greatest(coalesce((num->>'ft')::numeric, case when run then 999 else turns end), 1)::int else 999 end;
  lt := case when wins > 0 then greatest(coalesce((num->>'lt')::numeric, case when run then 99 else taken end), 0)::int else 99 end;
  if not run and wins > 0 and turns < 1 then ft := 999; end if;
  cls := case when st->>'cls' ~ '^[a-z]{2,16}$' then st->>'cls' end;
  lvn := case p_lv when 'easy' then 0 when 'hard' then 2 else 1 end;
  perform _quest_roll(p_uid);
  for r in select * from daily_quests where id = p_uid and day = _qday() and not claimed and prog < target for update loop
    select metric into m from quest_pool where qid = r.qid;
    if m = 'cls' then
      if cls is not null and fights > 0 and not (cls = any (r.seen)) then
        update daily_quests set seen = seen || cls, prog = least(target, cardinality(seen) + 1) where id = r.id and day = r.day and slot = r.slot;
      end if;
      continue;
    end if;
    inc := case m
      when 'play' then fights
      when 'win' then wins
      when 'pvp_play' then case when p_mode = 'pvp' then 1 else 0 end
      when 'pvp_win' then case when p_mode = 'pvp' then wins else 0 end
      when 'bot_lv' then case when p_mode = 'bot' and wins > 0 and lvn >= coalesce(r.param, 0) then 1 else 0 end
      when 'dmg' then dmg
      when 'ab' then ab
      when 'atk' then atk
      when 'sp' then sp
      when 'mv' then mv
      when 'fast' then case when wins > 0 and ft <= coalesce(r.param, 0) then 1 else 0 end
      when 'tough' then case when wins > 0 and lt <= coalesce(r.param, 0) then 1 else 0 end
      when 'run_node' then case when run then nodes else 0 end
      when 'run_elite' then case when run then elite else 0 end
      when 'run_clear' then case when run and p_clear then 1 else 0 end
      else 0 end;
    if inc > 0 then update daily_quests set prog = least(target, prog + inc) where id = r.id and day = r.day and slot = r.slot; end if;
  end loop;
end $$;

-- 오늘 퀘스트와 남은 다시 뽑기 수
create or replace function public.quest_get() returns json
language plpgsql security definer set search_path = public as $$
declare d date := _qday();
begin
  if auth.uid() is null then raise exception 'login'; end if;
  perform _quest_roll(auth.uid());
  return json_build_object(
    'day', d,
    'reset', ((d + 1)::timestamp at time zone 'Asia/Seoul'),
    'rerolls', greatest(0, 2 - coalesce((select rerolls from quest_meta where id = auth.uid() and day = d), 0)),
    'quests', coalesce((select json_agg(json_build_object('slot', slot, 'qid', qid, 'tier', tier, 'target', target, 'param', param,
        'reward', reward, 'prog', prog, 'claimed', claimed) order by slot) from daily_quests where id = auth.uid() and day = d), '[]'::json));
end $$;

-- 다시 뽑기: 하루 2번. 받은 퀘스트와 다 채운 퀘스트는 안 된다. 같은 단계의 다른 퀘스트로 바뀌고 진행은 0부터
create or replace function public.quest_reroll(p_slot int) returns json
language plpgsql security definer set search_path = public as $$
declare d date := _qday(); mt quest_meta; r daily_quests; q quest_pool;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  perform _quest_roll(auth.uid());
  select * into mt from quest_meta where id = auth.uid() and day = d for update;
  if mt.rerolls >= 2 then raise exception 'no_reroll'; end if;
  select * into r from daily_quests where id = auth.uid() and day = d and slot = p_slot for update;
  if not found then raise exception 'bad request'; end if;
  if r.claimed then raise exception 'claimed'; end if;
  if r.prog >= r.target then raise exception 'done'; end if;
  select * into q from quest_pool
    where case r.tier when 1 then c1 when 2 then c2 else c3 end is not null
      and qid not in (select qid from daily_quests where id = auth.uid() and day = d)
    order by random() limit 1;
  if not found then raise exception 'empty'; end if;
  update daily_quests set qid = q.qid, prog = 0, seen = '{}',
      target = case r.tier when 1 then q.c1 when 2 then q.c2 else q.c3 end,
      param = case r.tier when 1 then q.p1 when 2 then q.p2 else q.p3 end,
      reward = case r.tier when 1 then q.r1 when 2 then q.r2 else q.r3 end
    where id = auth.uid() and day = d and slot = p_slot;
  update quest_meta set rerolls = rerolls + 1 where id = auth.uid() and day = d;
  return quest_get();
end $$;

-- 보상 받기: 다 채운 퀘스트 한 번. 남은 메달을 돌려준다
create or replace function public.quest_claim(p_slot int) returns int
language plpgsql security definer set search_path = public as $$
declare amt int; bal int;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  update daily_quests set claimed = true
    where id = auth.uid() and day = _qday() and slot = p_slot and not claimed and prog >= target returning reward into amt;
  if not found then raise exception 'not_ready'; end if;
  perform _pay(auth.uid(), 'quest', amt);
  select medals into bal from wallet where id = auth.uid();
  return bal;
end $$;

-- 실행 권한: 내부 함수는 아무도, 공개 함수는 로그인한 사람만
revoke all on function public._pay(uuid, text, int) from public, anon, authenticated;
revoke all on function public._today(uuid, text) from public, anon, authenticated;
revoke all on function public.start_play(text) from public, anon;
revoke all on function public.finish_bot(uuid, boolean, text, jsonb) from public, anon;
revoke all on function public.finish_run(uuid, int, int, boolean, jsonb) from public, anon;
revoke all on function public.finish_pvp(uuid, text, int, uuid, text, jsonb) from public, anon;
revoke all on function public._qday() from public, anon, authenticated;
revoke all on function public._quest_roll(uuid) from public, anon, authenticated;
revoke all on function public._quest_feed(uuid, text, text, text, jsonb, numeric, boolean) from public, anon, authenticated;
revoke all on function public.quest_get() from public, anon;
revoke all on function public.quest_reroll(int) from public, anon;
revoke all on function public.quest_claim(int) from public, anon;
revoke all on function public.buy_skin(text, text) from public, anon;
revoke all on function public.admin_grant(int) from public, anon;
grant execute on function public.start_play(text) to authenticated;
grant execute on function public.finish_bot(uuid, boolean, text, jsonb) to authenticated;
grant execute on function public.finish_run(uuid, int, int, boolean, jsonb) to authenticated;
grant execute on function public.finish_pvp(uuid, text, int, uuid, text, jsonb) to authenticated;
grant execute on function public.quest_get() to authenticated;
grant execute on function public.quest_reroll(int) to authenticated;
grant execute on function public.quest_claim(int) to authenticated;
grant execute on function public.buy_skin(text, text) to authenticated;
grant execute on function public.admin_grant(int) to authenticated;

-- 관리자 등록: 아래 줄의 아이디를 본인 아이디로 바꿔서 한 번 실행
-- insert into public.admins (id) select id from public.profiles where lower(nickname) = lower('내아이디') on conflict do nothing;
