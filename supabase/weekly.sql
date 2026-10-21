-- 삼삼결투 주간 도전 순위표. Supabase SQL Editor에 붙여 넣고 Run. 여러 번 실행해도 된다. (economy.sql 다음에)
-- 한 주는 한국 시간 월요일 0시에 시작한다. 주 이름은 'W' + 그 월요일 날짜(예: W2026-10-19). 게임(index.html의 wkId)과 같은 규칙.
-- 점수는 브라우저가 계산해서 보내므로, 서버는 모험 시작 기록(plays)으로 최소한만 확인한다:
--   그 사람이 이번 주에 시작한 모험이어야 하고, 시작하고 6분 넘게 지나야 하며, 같은 모험으로는 한 번만 올릴 수 있다. 점수는 0~2000.

create table if not exists public.weekly_scores (
  week text not null, id uuid not null references auth.users on delete cascade,
  nick text, cls text, score int not null, turns int, at timestamptz not null default now(),
  primary key (week, id)
);
create table if not exists public.weekly_used (sid uuid primary key, at timestamptz not null default now());
create index if not exists weekly_rank on public.weekly_scores (week, score desc, turns asc, at asc);
alter table public.weekly_scores enable row level security;   -- 정책 없음: 아래 함수로만 읽고 쓴다
alter table public.weekly_used enable row level security;

create or replace function public._wk_now() returns text
language sql stable as $$
  select 'W' || to_char(date_trunc('week', now() at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD')
$$;

create or replace function public.weekly_submit(p_sid uuid, p_week text, p_score int, p_turns int, p_cls text) returns json
language plpgsql security definer set search_path = public as $$
declare p plays; nk text; best int; rk int; tot int;
begin
  if auth.uid() is null or p_week is distinct from _wk_now() then return json_build_object('ok', false); end if;
  select * into p from plays where sid = p_sid and id = auth.uid() and kind = 'run';
  if not found or now() - p.started < interval '6 minutes'
     or to_char(date_trunc('week', p.started at time zone 'Asia/Seoul')::date, 'YYYY-MM-DD') <> substr(p_week, 2) then return json_build_object('ok', false); end if;
  insert into weekly_used (sid) values (p_sid) on conflict do nothing;
  if not found then return json_build_object('ok', false); end if;
  select nickname into nk from profiles where id = auth.uid();
  insert into weekly_scores (week, id, nick, cls, score, turns)
    values (p_week, auth.uid(), nk, left(coalesce(p_cls, ''), 20), greatest(0, least(coalesce(p_score, 0), 2000)), greatest(0, least(coalesce(p_turns, 0), 999)))
    on conflict (week, id) do update set nick = excluded.nick, cls = excluded.cls, score = excluded.score, turns = excluded.turns, at = now()
    where excluded.score > weekly_scores.score or (excluded.score = weekly_scores.score and excluded.turns < weekly_scores.turns);
  select score into best from weekly_scores where week = p_week and id = auth.uid();
  select count(*) + 1 into rk from weekly_scores w join weekly_scores m on m.week = p_week and m.id = auth.uid()
    where w.week = p_week and (w.score > m.score or (w.score = m.score and (w.turns < m.turns or (w.turns = m.turns and w.at < m.at))));
  select count(*) into tot from weekly_scores where week = p_week;
  return json_build_object('ok', true, 'best', best, 'rank', rk, 'n', tot);
end $$;

create or replace function public.weekly_board(p_week text) returns json
language plpgsql stable security definer set search_path = public as $$
declare r json; mine json; tot int;
begin
  select coalesce(json_agg(x order by x.rank), '[]'::json) into r from (
    select row_number() over (order by score desc, turns asc, at asc)::int as rank, nick, cls, score, turns
    from weekly_scores where week = p_week order by score desc, turns asc, at asc limit 30) x;
  select json_build_object('rank', x.rank, 'score', x.score, 'turns', x.turns, 'cls', x.cls) into mine from (
    select id, score, turns, cls, row_number() over (order by score desc, turns asc, at asc)::int as rank from weekly_scores where week = p_week) x
    where x.id = auth.uid();
  select count(*) into tot from weekly_scores where week = p_week;
  return json_build_object('rows', r, 'me', mine, 'n', tot);
end $$;

revoke all on function public.weekly_submit(uuid, text, int, int, text) from public, anon;
grant execute on function public.weekly_submit(uuid, text, int, int, text) to authenticated;
revoke all on function public.weekly_board(text) from public;
grant execute on function public.weekly_board(text) to anon, authenticated;
