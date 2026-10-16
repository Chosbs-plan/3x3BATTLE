-- 삼삼결투: 환영 선물과 랜덤 매칭. economy.sql을 먼저 실행한 뒤 이것을 SQL Editor에서 Run. 여러 번 실행해도 된다.

-- ===== 환영 선물: 계정마다 한 번, 메달 300 =====
create table if not exists public.gifts (
  id uuid not null references auth.users on delete cascade,
  kind text not null, at timestamptz not null default now(),
  primary key (id, kind)
);
alter table public.gifts enable row level security;
drop policy if exists "gifts read own" on public.gifts;
create policy "gifts read own" on public.gifts for select using (auth.uid() = id);

create or replace function public.claim_gift(p_kind text) returns int
language plpgsql security definer set search_path = public as $$
declare n int; bal int;
begin
  if auth.uid() is null or p_kind <> 'welcome' then raise exception 'bad request'; end if;
  insert into gifts (id, kind) values (auth.uid(), p_kind) on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'claimed'; end if;
  perform _pay(auth.uid(), 'gift', 300);
  select medals into bal from wallet where id = auth.uid();
  return bal;
end $$;

-- ===== 랜덤 매칭 =====
-- 줄을 선 사람. 먼저 기다리던 사람이 방장(host)이 되어 방을 열고, 나중에 온 사람이 들어간다
create table if not exists public.mm_queue (
  id uuid primary key references auth.users on delete cascade,
  nick text, joined timestamptz not null default now(), beat timestamptz not null default now(),
  room text, host boolean, opp uuid, opp_nick text, matched_at timestamptz
);
alter table public.mm_queue enable row level security;   -- 정책 없음: 아래 함수로만 쓴다

create or replace function public.mm_join() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); nk text; o mm_queue; code text;
begin
  if me is null then raise exception 'login'; end if;
  select nickname into nk from profiles where id = me;
  -- 오래된 줄과 끝난 짝은 치운다
  delete from mm_queue where (room is null and beat < now() - interval '20 seconds') or matched_at < now() - interval '2 minutes' or id = me;
  -- 8초 안에 살아 있다고 알린 사람 중 가장 오래 기다린 사람
  select * into o from mm_queue where id <> me and room is null and beat > now() - interval '8 seconds'
    order by joined limit 1 for update skip locked;
  if found then
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') into code from generate_series(1, 4);
    update mm_queue set room = code, host = true, opp = me, opp_nick = nk, matched_at = now() where id = o.id;
    insert into mm_queue (id, nick, room, host, opp, opp_nick, matched_at) values (me, nk, code, false, o.id, o.nick, now());
    return json_build_object('state', 'matched', 'room', code, 'host', false, 'opp_nick', o.nick);
  end if;
  insert into mm_queue (id, nick) values (me, nk);
  return json_build_object('state', 'wait');
end $$;

-- 기다리는 동안 2초마다: 살아 있다고 알리고 짝이 생겼는지 본다
create or replace function public.mm_poll() returns json
language plpgsql security definer set search_path = public as $$
declare r mm_queue;
begin
  update mm_queue set beat = now() where id = auth.uid() returning * into r;
  if not found then return json_build_object('state', 'gone'); end if;
  if r.room is null then return json_build_object('state', 'wait', 'since', extract(epoch from now() - r.joined)::int); end if;
  return json_build_object('state', 'matched', 'room', r.room, 'host', r.host, 'opp_nick', r.opp_nick);
end $$;

create or replace function public.mm_leave() returns void
language sql security definer set search_path = public as $$ delete from mm_queue where id = auth.uid() $$;

-- 지금 줄 선 사람 수(화면 표시용)
create or replace function public.mm_count() returns int
language sql security definer set search_path = public as $$
  select count(*)::int from mm_queue where room is null and beat > now() - interval '8 seconds'
$$;

revoke all on function public.claim_gift(text) from public, anon;
revoke all on function public.mm_join() from public, anon;
revoke all on function public.mm_poll() from public, anon;
revoke all on function public.mm_leave() from public, anon;
revoke all on function public.mm_count() from public, anon;
grant execute on function public.claim_gift(text) to authenticated;
grant execute on function public.mm_join() to authenticated;
grant execute on function public.mm_poll() to authenticated;
grant execute on function public.mm_leave() to authenticated;
grant execute on function public.mm_count() to authenticated;
