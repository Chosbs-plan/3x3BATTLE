-- 삼삼결투 메일함: 개발자 선물, 이벤트 보상, 주간 도전 1~3등 보상을 메일로 보내고, 받으면 메달이 들어온다.
-- Supabase SQL Editor에 붙여 넣고 Run. 여러 번 실행해도 된다. (economy.sql, weekly.sql 다음에)
--
-- ■ 메일 보내기 (SQL Editor에서 그대로 실행)
--   모두에게:      select public.send_mail(null, '오픈 기념 선물', '삼삼결투를 즐겨 주셔서 고맙습니다!', 300, 30);
--   한 사람에게:    select public.send_mail('닉네임', '버그 제보 감사', '알려 주신 버그를 고쳤습니다.', 100, 30);
--   인자: 받는 사람 닉네임(null이면 모두), 제목, 내용, 메달, 받을 수 있는 날 수(null이면 기한 없음)
--   '모두에게' 메일은 보낸 시각에 이미 가입해 있던 사람만 받는다. 나중에 가입한 사람도 받게 하려면 send_mail(..., true)
--   게임 안에서 관리자 계정(admins 표)으로도 같은 함수를 부를 수 있다. 일반 계정은 거절된다.
--
-- ■ 주간 도전 보상
--   주가 바뀐 뒤 누군가 메일함을 처음 열 때(mail_list) 지난주 순위 1·2·3등에게 200·100·50 메달 메일을 한 번만 보낸다.
--   정확히 월요일 0시에 보내고 싶으면 pg_cron을 켜고 맨 아래 주석의 cron.schedule을 실행한다(선택).

create table if not exists public.mail (
  id bigint generated always as identity primary key,
  uid uuid references auth.users on delete cascade,          -- null이면 모두에게
  title text not null, body text not null default '',
  medals int not null default 0 check (medals >= 0 and medals <= 100000),
  kind text not null default 'gift' check (kind in ('gift', 'event', 'weekly')),
  created timestamptz not null default now(),
  expires timestamptz,                                         -- null이면 기한 없음
  for_new boolean not null default false                       -- 모두에게 보낸 메일을 나중에 가입한 사람도 받는지
);
create table if not exists public.mail_claims (
  mail_id bigint not null references public.mail on delete cascade,
  uid uuid not null references auth.users on delete cascade,
  at timestamptz not null default now(), primary key (mail_id, uid)
);
create table if not exists public.weekly_settled (week text primary key, at timestamptz not null default now());
create index if not exists mail_uid on public.mail (uid, created desc);
alter table public.mail enable row level security;          -- 정책 없음: 아래 함수로만 읽고 쓴다
alter table public.mail_claims enable row level security;
alter table public.weekly_settled enable row level security;

-- 지난 주들 중 아직 보상하지 않은 주의 1~3등에게 메일. 같은 주는 한 번만(weekly_settled)
create or replace function public._weekly_settle() returns void
language plpgsql security definer set search_path = public as $$
declare w text; r record; amt int[] := array[200, 100, 50];
begin
  for w in select distinct week from weekly_scores where week < _wk_now() and week not in (select week from weekly_settled) order by week loop
    insert into weekly_settled (week) values (w) on conflict do nothing;
    if not found then continue; end if;   -- 다른 요청이 먼저 처리했다
    for r in select id, score, turns, row_number() over (order by score desc, turns asc, at asc)::int as rk
             from weekly_scores where week = w order by score desc, turns asc, at asc limit 3 loop
      insert into mail (uid, title, body, medals, kind, expires)
      values (r.id, '주간 도전 ' || r.rk || '등 보상',
              to_char(substr(w, 2)::date, 'MM/DD') || '부터 한 주 동안의 주간 도전에서 ' || r.rk || '등을 했습니다(' || r.score || '점, ' || r.turns || '턴). 축하합니다!',
              amt[r.rk], 'weekly', now() + interval '30 days');
    end loop;
  end loop;
end $$;

-- 내 메일: 받을 수 있는 것과 최근 7일 안에 받은 것
create or replace function public.mail_list() returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); joined timestamptz; res json;
begin
  if me is null then return '[]'::json; end if;
  perform _weekly_settle();
  select created_at into joined from auth.users where id = me;
  select coalesce(json_agg(json_build_object('id', m.id, 'title', m.title, 'body', m.body, 'medals', m.medals, 'kind', m.kind,
           'created', m.created, 'expires', m.expires, 'claimed', c.at) order by (c.at is not null), m.created desc), '[]'::json) into res
  from mail m left join mail_claims c on c.mail_id = m.id and c.uid = me
  where (m.uid = me or (m.uid is null and (m.for_new or joined is null or joined <= m.created)))
    and ((c.at is null and (m.expires is null or m.expires > now())) or c.at > now() - interval '7 days');
  return res;
end $$;

-- 받기: 메달을 지갑에 넣는다. p_id가 null이면 받을 수 있는 메일을 모두
create or replace function public.mail_claim(p_id bigint default null) returns json
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); joined timestamptz; m mail; got int := 0; n int := 0; bal int;
begin
  if me is null then raise exception 'login'; end if;
  select created_at into joined from auth.users where id = me;
  for m in select * from mail where (p_id is null or id = p_id)
           and (uid = me or (uid is null and (for_new or joined is null or joined <= created)))
           and (expires is null or expires > now()) order by id for update loop
    insert into mail_claims (mail_id, uid) values (m.id, me) on conflict do nothing;
    if not found then continue; end if;
    got := got + _pay(me, 'mail', m.medals); n := n + 1;
  end loop;
  select medals into bal from wallet where id = me;
  return json_build_object('n', n, 'medals', got, 'wallet', coalesce(bal, 0));
end $$;

-- 메일 보내기: SQL Editor(서버 관리자)나 admins 표에 있는 계정만
create or replace function public.send_mail(p_nick text, p_title text, p_body text, p_medals int, p_days int default 30, p_for_new boolean default false) returns bigint
language plpgsql security definer set search_path = public as $$
declare to_id uuid; new_id bigint;
begin
  if auth.uid() is not null and not exists (select 1 from admins where id = auth.uid()) then raise exception 'not admin'; end if;
  if p_nick is not null then
    select id into to_id from profiles where lower(nickname) = lower(p_nick);
    if to_id is null then raise exception 'no such nickname: %', p_nick; end if;
  end if;
  insert into mail (uid, title, body, medals, kind, expires, for_new)
  values (to_id, p_title, coalesce(p_body, ''), greatest(0, coalesce(p_medals, 0)), case when p_nick is null then 'event' else 'gift' end,
          case when p_days is null then null else now() + make_interval(days => p_days) end, coalesce(p_for_new, false))
  returning id into new_id;
  return new_id;
end $$;

revoke all on function public._weekly_settle() from public, anon, authenticated;
revoke all on function public.mail_list() from public, anon;
grant execute on function public.mail_list() to authenticated;
revoke all on function public.mail_claim(bigint) from public, anon;
grant execute on function public.mail_claim(bigint) to authenticated;
revoke all on function public.send_mail(text, text, text, int, int, boolean) from public, anon;
grant execute on function public.send_mail(text, text, text, int, int, boolean) to authenticated;

-- (선택) 월요일 0시(한국 시간, = 일요일 15시 UTC)에 바로 정산하려면 Database → Extensions에서 pg_cron을 켠 뒤:
-- select cron.schedule('weekly-settle', '1 15 * * 0', $$select public._weekly_settle()$$);
