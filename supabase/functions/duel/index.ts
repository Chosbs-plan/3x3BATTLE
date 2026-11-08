// 삼삼결투 서버 대전: 방 상태를 서버 DB(duel.sql)에 두고, 판정은 이 함수가 게임 엔진(engine.js)으로 한다.
// 그래서 브라우저가 상대 계획을 엿보거나, 판정과 결과를 바꾸거나, 방장이 나가 방이 사라지는 일이 없다.
//
// 배포: supabase/duel.sql을 먼저 Run한 뒤  supabase functions deploy duel
// 규칙(카드·직업)을 고치면  python3 tools/build_engine.py  로 engine.js를 다시 만들고 다시 배포한다.
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY는 Supabase가 넣어 준다.
//
// 요청: POST { op, code, ... }, 머리글 Authorization: Bearer <로그인 토큰>
//   create { code?, mm?, mode? }  방 만들기(code를 주면 그 코드로. 랜덤 매칭은 이미 있으면 그 방에 앉는다)
//   join   { code }               입장 또는 다시 들어오기(이미 앉아 있던 자리)
//   update { code, patch }        내 자리 칸만 바꾼다(준비, 선택, 잠금, 계획, 감정 표현 등). 판정은 서버가
//   tick   { code }               제한 시간이 지났으면 안 낸 쪽은 제자리로 판정, 오래 안 들어오면 기권
//   leave  { code }               나가기. 판 중이면 기권
// 응답: { ok, seat, ver, doc }  (doc의 plan 칸에는 계획 내용 대신 '1'만 있다)

import * as E from './engine.js';
import { makeCore } from './core.js';

const SB = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!, SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const num = (k: string) => Number(Deno.env.get(k)) || 0;
const core = makeCore(E, { turn: num('DUEL_TURN_MS'), replay: num('DUEL_REPLAY_MS'), absent: num('DUEL_ABSENT_MS') });   /* 시험용으로만 줄인다 */
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Fail extends Error { constructor(public code: string, public status = 400) { super(code); } }

async function db(path: string, init?: RequestInit) {
  const r = await fetch(SB + path, { ...init, headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const t = await r.text(), j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Fail((j && (j.message || j.msg)) || 'db ' + r.status, 500);
  return j;
}
const call = (fn: string, args: Record<string, unknown>) => db('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });
async function me(req: Request) {
  const r = await fetch(SB + '/auth/v1/user', { headers: { apikey: ANON, Authorization: req.headers.get('Authorization') || '' } });
  if (!r.ok) throw new Fail('login', 401);
  return (await r.json()).id as string;
}

type Room = { code: string; doc: any; ver: number; deadline: number; seen: Record<string, number>; plans: Record<string, any> };
const ms = (t: string | null) => (t ? Date.parse(t) : 0);
const iso = (n: number) => (n ? new Date(n).toISOString() : null);
async function load(code: string): Promise<Room | null> {
  const [r] = await db(`/rest/v1/duel_rooms?code=eq.${code}&select=code,doc,ver,deadline,seen_a,seen_b`);
  if (!r) return null;
  const [s] = await db(`/rest/v1/duel_secret?code=eq.${code}&select=plans`);
  return { code: r.code, doc: r.doc, ver: r.ver, deadline: ms(r.deadline), seen: { a: ms(r.seen_a), b: ms(r.seen_b) }, plans: (s && s.plans) || {} };
}
async function save(room: Room, isNew: boolean, result: unknown) {
  const d = room.doc;
  return await call('duel_commit', { p_code: room.code, p_ver: isNew ? 0 : room.ver, p_doc: d, p_a: d.seats.a, p_b: d.seats.b, p_deadline: iso(room.deadline),
    p_seen_a: iso(room.seen.a || 0), p_seen_b: iso(room.seen.b || 0), p_plans: room.plans, p_result: result || null }) as number;
}
/* 읽고 → 규칙 적용 → 판본이 그대로일 때만 저장. 동시에 두 사람이 고치면 다시 읽어 처음부터 */
async function txn(code: string, fn: (room: Room) => any) {
  for (let n = 0; n < 6; n++) {
    const room = await load(code); if (!room) throw new Fail('no room', 404);
    const before = JSON.stringify([room.doc, room.plans, room.deadline]);
    const o = fn(room) || {}; if (o.err) throw new Fail(o.err);
    if (!o.result && JSON.stringify([room.doc, room.plans, room.deadline]) === before) return { room, o };   /* 바뀐 게 없으면 저장하지 않는다 */
    const v = await save(room, false, o.result);
    if (v > 0) return { room: Object.assign(room, { ver: v }), o };
    await new Promise(r => setTimeout(r, 40 + Math.random() * 80));
  }
  throw new Fail('busy', 409);
}
const AZ = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const view = (room: Room, uid: string) => ({ ok: true, seat: core.seatOf(room.doc, uid), ver: room.ver, doc: room.doc, engine: E.ENGINE_VER });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    if (req.method !== 'POST') throw new Fail('post only', 405);
    const uid = await me(req), b = await req.json().catch(() => ({})), op = String(b.op || ''), now = Date.now();
    const code = typeof b.code === 'string' ? b.code.toUpperCase() : '';
    if (code && !/^[A-Z0-9]{4}$/.test(code)) throw new Fail('bad code');

    if (op === 'create') {
      for (let n = 0; n < (code ? 1 : 8); n++) {
        const c = code || Array.from({ length: 4 }, () => AZ[Math.floor(Math.random() * AZ.length)]).join('');
        const room: Room = { code: c, doc: core.freshDoc(uid, { mm: !!b.mm, mode: b.mode }), ver: 0, deadline: 0, seen: { a: now }, plans: {} };
        const v = await save(room, true, null);
        if (v > 0) return out(view(Object.assign(room, { ver: v }), uid));
        if (code && !b.mm) throw new Fail('taken', 409);
        if (code) {   /* 랜덤 매칭: 상대가 먼저 만들었으면 그 방에 앉는다 */
          const { room: r2 } = await txn(c, r => core.join(r, uid, now));
          return out(view(r2, uid));
        }
      }
      throw new Fail('no code', 503);
    }
    if (!code) throw new Fail('bad code');
    if (op === 'join') { const { room } = await txn(code, r => core.join(r, uid, now)); return out(view(room, uid)); }
    if (op === 'update') {
      const p = b.patch && typeof b.patch === 'object' ? b.patch : {};
      /* 스킨: 산 스킨만 대전에 보인다 */
      let owned = new Set<string>();
      const sk = p.skin && typeof p.skin === 'object' ? Object.values(p.skin).find(v => typeof v === 'string' && v) : null;
      if (sk) owned = new Set((await db(`/rest/v1/owned_skins?id=eq.${uid}&select=cls,skin`)).map((x: any) => x.cls + ':' + x.skin));
      const { room } = await txn(code, r => core.apply(r, uid, p, now, { skinOk: (c: string, s: string) => owned.has(c + ':' + s) }));
      return out(view(room, uid));
    }
    if (op === 'tick') { const { room } = await txn(code, r => { core.seen(r, uid, now); return core.tick(r, now); }); return out(view(room, uid)); }
    if (op === 'leave') { const { room } = await txn(code, r => core.leave(r, uid, now)); return out({ ok: true, seat: null, ver: room.ver }); }
    throw new Fail('bad op');
  } catch (e) {
    const f = e instanceof Fail ? e : new Fail(String((e as Error)?.message || e), 500);
    return out({ ok: false, error: f.code }, f.status);
  }
});
