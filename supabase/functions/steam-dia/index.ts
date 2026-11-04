// 삼삼결투 다이아 충전: 스팀 결제(ISteamMicroTxn)와 서버 지급을 잇는다. supabase/diamonds.sql을 먼저 Run.
//
// 배포: supabase functions deploy steam-dia
// 비밀값(supabase secrets set):
//   STEAM_WEB_KEY   퍼블리셔 웹 API 키. 게임 파일에 절대 넣지 않는다
//   STEAM_APP_ID    게임 앱 번호
//   STEAM_SANDBOX   1이면 스팀 결제 샌드박스(ISteamMicroTxnSandbox). 출시 전 시험용
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY는 Supabase가 넣어 준다.
//
// 흐름(게임 → 이 함수, 요청 본문 { op, ... }, 머리글 Authorization: Bearer <로그인 토큰>)
//   init     { pack, lang }  주문을 만들고 스팀 InitTxn. 스팀이 게임 화면에 결제 승인 창(오버레이)을 띄운다
//   finalize { orderid }     사용자가 승인했다는 콜백을 게임이 받으면 부른다. FinalizeTxn 성공일 때만 지급
//   cancel   { orderid }     사용자가 거절했을 때
//   refund   { orderid }     관리자만. 스팀 QueryTxn이 환불 상태면 다이아를 회수
// 스팀 API 이름·버전·금액 단위는 출시 전에 Steamworks 문서(ISteamMicroTxn)로 다시 확인할 것

const SB = Deno.env.get('SUPABASE_URL')!, ANON = Deno.env.get('SUPABASE_ANON_KEY')!, SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const KEY = Deno.env.get('STEAM_WEB_KEY') || '', APP = Deno.env.get('STEAM_APP_ID') || '';
const STEAM = 'https://partner.steam-api.com/' + (Deno.env.get('STEAM_SANDBOX') === '1' ? 'ISteamMicroTxnSandbox' : 'ISteamMicroTxn');
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };

const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Fail extends Error { constructor(public code: string, public status = 400) { super(code); } }

// Supabase: 서비스 키로 표 읽기와 SQL 함수 호출
async function db(path: string, init?: RequestInit) {
  const r = await fetch(SB + path, { ...init, headers: { apikey: SERVICE, Authorization: 'Bearer ' + SERVICE, 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const t = await r.text(), j = t ? JSON.parse(t) : null;
  if (!r.ok) throw new Fail((j && (j.message || j.msg)) || 'db ' + r.status, 500);
  return j;
}
const call = (fn: string, args: Record<string, unknown>) => db('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });

// 스팀 웹 API. 응답은 { response: { result: 'OK' | 'Failure', params, error } }
async function steam(method: string, ver: number, params: Record<string, string | number>, post: boolean) {
  const q = new URLSearchParams({ key: KEY, appid: APP, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const url = `${STEAM}/${method}/v${ver}/`;
  const r = await fetch(post ? url : url + '?' + q, post ? { method: 'POST', body: q } : undefined);
  const j = await r.json().catch(() => null), res = j && j.response;
  if (!res) throw new Fail('steam ' + r.status, 502);
  return res as { result: string; params?: Record<string, string>; error?: { errorcode: number; errordesc: string } };
}

async function me(req: Request) {
  const h = req.headers.get('Authorization') || '';
  const r = await fetch(SB + '/auth/v1/user', { headers: { apikey: ANON, Authorization: h } });
  if (!r.ok) throw new Fail('login', 401);
  return (await r.json()).id as string;
}
async function order(uid: string, id: unknown) {
  const n = Number(id); if (!Number.isSafeInteger(n) || n <= 0) throw new Fail('bad order');
  const [o] = await db(`/rest/v1/dia_orders?orderid=eq.${n}&uid=eq.${uid}&select=orderid,status,pack,steamid`);
  if (!o) throw new Fail('no order', 404);
  return o as { orderid: number; status: string; pack: string; steamid: string };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  try {
    if (req.method !== 'POST') throw new Fail('post only', 405);
    if (!KEY || !APP) throw new Fail('steam not set', 503);
    const uid = await me(req), b = await req.json().catch(() => ({}));

    if (b.op === 'init') {
      const [link] = await db(`/rest/v1/steam_links?uid=eq.${uid}&select=steamid`);
      if (!link) throw new Fail('nosteam', 403);
      // 사용자의 스팀 지갑 통화. 원화가 아니면 달러로 받는다
      const ui = await steam('GetUserInfo', 2, { steamid: link.steamid }, false);
      if (ui.result !== 'OK') throw new Fail('steam user', 502);
      const cur = ui.params?.currency === 'KRW' ? 'KRW' : 'USD', lang = b.lang === 'en' ? 'en' : 'ko';
      const o = await call('dia_order_new', { p_uid: uid, p_pack: String(b.pack || ''), p_steamid: link.steamid, p_currency: cur });
      const name = lang === 'en' ? `${o.dia + o.bonus} Diamonds` : `다이아 ${o.dia + o.bonus}개`;
      const r = await steam('InitTxn', 3, { orderid: o.orderid, steamid: link.steamid, itemcount: 1, language: lang, currency: o.currency, usersession: 'client',
        'itemid[0]': o.item, 'qty[0]': 1, 'amount[0]': o.amount, 'description[0]': name }, true);
      if (r.result !== 'OK') { await call('dia_order_fail', { p_orderid: o.orderid }); throw new Fail('steam init: ' + (r.error?.errordesc || ''), 502); }
      return out({ orderid: String(o.orderid) });   // 64비트 번호라 글자로 돌려준다
    }

    if (b.op === 'finalize') {
      const o = await order(uid, b.orderid);
      if (o.status === 'done') return out(await call('dia_order_paid', { p_orderid: o.orderid, p_transid: '' }));   // 이미 지급됨: 지금 잔액만
      if (o.status !== 'init') throw new Fail('closed');
      const r = await steam('FinalizeTxn', 2, { orderid: o.orderid }, true);
      let ok = r.result === 'OK', trans = r.params?.transid || '';
      if (!ok) {   // 응답을 놓쳤거나 이미 확정된 경우: 상태를 직접 물어본다
        const q = await steam('QueryTxn', 3, { orderid: o.orderid }, false);
        ok = q.result === 'OK' && q.params?.status === 'Succeeded'; trans = q.params?.transid || trans;
      }
      if (!ok) { await call('dia_order_fail', { p_orderid: o.orderid }); throw new Fail('steam finalize: ' + (r.error?.errordesc || ''), 402); }
      return out(await call('dia_order_paid', { p_orderid: o.orderid, p_transid: trans }));
    }

    if (b.op === 'cancel') {
      const o = await order(uid, b.orderid);
      if (o.status === 'init') await call('dia_order_fail', { p_orderid: o.orderid });
      return out({ ok: true });
    }

    if (b.op === 'refund') {
      const [adm] = await db(`/rest/v1/admins?id=eq.${uid}&select=id`);
      if (!adm) throw new Fail('denied', 403);
      const n = Number(b.orderid), q = await steam('QueryTxn', 3, { orderid: n }, false), st = q.params?.status || '';
      if (q.result !== 'OK' || !/Refund|Chargedback/.test(st)) throw new Fail('not refunded: ' + st);
      return out(await call('dia_order_refund', { p_orderid: n }));
    }

    throw new Fail('bad op');
  } catch (e) {
    const f = e instanceof Fail ? e : new Fail(String((e as Error)?.message || e), 500);
    return out({ error: f.code }, f.status);
  }
});
