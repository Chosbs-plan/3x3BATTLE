-- 삼삼결투: 게임을 열 수 있는 주소(도메인) 잠금. SQL Editor에서 Run. 여러 번 실행해도 된다.
-- site_origins 표에 적힌 주소에서 온 요청만 서버가 받는다. 표가 비어 있으면 어디서나 열린다(잠금 꺼짐).
-- 브라우저는 요청마다 페이지 주소(Origin)를 붙이고, 페이지의 코드는 이 값을 바꿀 수 없다.
-- 파일로 저장해 연 HTML은 Origin이 'null', 남의 사이트에 올린 복사본은 그 사이트 주소라서 막힌다.
-- 막는 범위: 진행 저장, 메달, 상점, 선물, 랜덤 매칭 등 /rest/v1 요청 전부. (로그인 자체는 Supabase Auth라 여기서 막지 못하지만,
-- 로그인해도 아무 데이터도 읽거나 쓸 수 없다.)

create table if not exists public.site_origins (
  origin text primary key,      -- 예: https://chosbs-plan.github.io  (끝에 / 없이, 경로 없이)
  play_url text                 -- 막힌 화면의 "공식 사이트로 가기" 버튼 주소. 예: https://chosbs-plan.github.io/3x3BATTLE/
);
alter table public.site_origins enable row level security;   -- 정책 없음: 아래 함수만 읽는다

create or replace function public._site_ok() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from site_origins)
      or exists (select 1 from site_origins
                 where lower(origin) = lower(coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'origin', '')))
$$;

-- 모든 REST 요청 앞에서 서버가 먼저 부르는 함수. 허용되지 않은 주소면 거절한다
create or replace function public.site_guard() returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(current_setting('request.path', true), '') like '%/rpc/site_check' then return; end if;
  if not _site_ok() then raise exception 'site_blocked' using errcode = 'P0001'; end if;
end $$;

-- 게임이 켜질 때 묻는 함수: 이 주소에서 열어도 되는지와 공식 주소
create or replace function public.site_check() returns json
language sql stable security definer set search_path = public as $$
  select json_build_object('ok', _site_ok(), 'home', (select play_url from site_origins where play_url is not null order by origin limit 1))
$$;

revoke all on function public._site_ok() from public;
revoke all on function public.site_guard() from public;
revoke all on function public.site_check() from public;
grant execute on function public._site_ok() to anon, authenticated;
grant execute on function public.site_guard() to anon, authenticated;
grant execute on function public.site_check() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.site_guard';
notify pgrst, 'reload config';

-- ===== 허용할 주소 등록 =====
-- 게임을 올린 주소로 바꿔서 실행한다. 여러 주소면 줄을 더 넣는다. origin은 소문자, https://도메인 까지만.
-- insert into public.site_origins (origin, play_url) values ('https://chosbs-plan.github.io', 'https://chosbs-plan.github.io/3x3BATTLE/') on conflict (origin) do update set play_url = excluded.play_url;

-- 잠금을 잠시 끄려면: delete from public.site_origins;
-- 완전히 없애려면:    alter role authenticator reset pgrst.db_pre_request; notify pgrst, 'reload config';
