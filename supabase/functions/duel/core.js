/* 서버 대전의 방 진행 규칙. 저장소와 상관없는 순수 함수라 노드에서도 시험할 수 있다(index.ts가 DB와 잇는다).
   방(room): { code, doc, ver, deadline(ms), seen: {a, b}(ms), plans: { [tag]: { a, b } } }
   doc 모양은 화면(index.html)의 freshDoc과 같다. 다만 plan.a/b에는 내용 대신 '1'(냈음)만 적고, 실제 계획은 plans에 숨겨 둔다.
   - 판정·새 판 시작·점수·기권은 서버만 한다. 손님(사람)은 자기 자리 칸만 바꿀 수 있다.
   - 결과가 나면 result를 돌려준다(index.ts가 duel_results에 적고 보상은 각자 fin으로 받는다) */
export const TURN_MS = 45000, REPLAY_MS = 25000, ABSENT_MS = 90000;
const MODES = ['single', 'bo3', 'ban'], SEATS = ['a', 'b'];
const opp = k => (k === 'a' ? 'b' : 'a');
const clone = o => JSON.parse(JSON.stringify(o));
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function freshDoc(uid, opt) {
  const d = { v: 1, srv: 1, seats: { a: uid, b: null }, ready: { a: false, b: false }, phase: 'lobby', mode: 'single', score: { a: 0, b: 0 }, ban: { a: null, b: null }, emote: { a: null, b: null },
    pick: { a: null, b: null }, skin: { a: '', b: '' }, exe: { a: '', b: '' }, nick: { a: '', b: '' }, uid: { a: uid, b: '' }, title: { a: '', b: '' }, gid: 0, turn: 0, lock: { a: '', b: '' }, plan: { a: '', b: '' }, game: '' };
  if (opt && opt.mm) { d.mm = true; d.mode = MODES.includes(opt.mode) ? opt.mode : 'single'; }
  return d;
}
export const seatOf = (doc, uid) => (doc.seats.a === uid ? 'a' : doc.seats.b === uid ? 'b' : null);
const tagOf = doc => doc.gid + ':' + doc.turn;
const matchDone = doc => doc.mode !== 'bo3' || doc.score.a >= 2 || doc.score.b >= 2;
const blankPlan = (g, k, tag) => ({ mv: null, act: null, dest: g.P[k].pos, tg: null, ab: false, tag, auto: true });

/* 사람마다 보내는 게임 상태: 그 사람이 알면 안 되는 것을 가린다(판정은 가리지 않은 원본으로 한다)
   - 상대 손패: 카드 대신 '?'(투시 등으로 엿보는 턴에는 그대로). 상대 덱: 순서도 내용도 '?'
     대신 덱과 손패를 합친 남은 카드(pool)는 정렬해서 준다(덱 보기 창에 원래 보이던 정보)
   - 내 덱: 다음에 뽑을 순서가 보이지 않게 정렬
   - 상대가 숨긴 지뢰 칸(개수만 남김), 나를 노리고 숨긴 예고 공격(깜짝 상자), 그것을 놓은 칸(재생 기록)
   판이 끝나면 손패와 덱 내용은 그대로 보여 준다(내 덱 순서는 계속 가린다) */
export const HIDDEN = '?';
export function viewFor(g, k) {
  const v = clone(g), o = opp(k), me = v.P[k], op = v.P[o];
  if (!v.winner) {
    op.pool = [...op.deck, ...op.hand].sort();
    if (!((me.see || 0) >= v.turn)) op.hand = op.hand.map(() => HIDDEN);
    op.deck = op.deck.map(() => HIDDEN);
    op.mines = (op.mines || []).map(() => -1);
    v.pend = (v.pend || []).filter(e => !(e.hidden && e.t === k));
    const q = v.rp && v.rp.P && v.rp.P[o];
    if (q && (q.actId === 'mine' || q.actId === 'box')) { q.tg = null; q.cells = []; }
  }
  me.deck = me.deck.slice().sort();
  return v;
}
export function makeCore(E, T) {
  /* 시간(시험용으로 줄일 수 있다) */
  const TURN = (T && T.turn) || TURN_MS, REPLAY = (T && T.replay) || REPLAY_MS, ABSENT = (T && T.absent) || ABSENT_MS;
  const okCls = c => typeof c === 'string' && !!E.CLS[c] && E.CLASS_IDS.includes(c);
  /* 새 판: 두 직업으로 게임을 만들고 턴 1, 제한 시간 */
  function startGame(room, now) {
    const d = room.doc, g = E.newGame({ a: d.pick.a, b: d.pick.b });
    Object.assign(d, { game: JSON.stringify(g), turn: g.turn || 1, phase: 'play', lock: { a: '', b: '' }, plan: { a: '', b: '' } });
    delete d.forfeit; room.plans = {}; room.deadline = now + TURN + 4000;
  }
  /* 두 계획이 다 모였으면 판정 */
  function tryResolve(room, now, out) {
    const d = room.doc; if (d.phase !== 'play') return;
    const t = tagOf(d), P = room.plans[t]; if (!P || !P.a || !P.b) return;
    const g = JSON.parse(d.game); let s;
    try { s = E.resolve(g, { a: P.a, b: P.b }); } catch (e) { out.err = 'resolve failed'; return; }
    d.game = JSON.stringify(s); d.turn = s.turn; d.lock = { a: '', b: '' }; d.plan = { a: '', b: '' };
    room.plans = {}; room.deadline = now + TURN + REPLAY;
    if (s.winner) finish(room, s.winner, out);
  }
  function finish(room, winner, out, forfeit) {
    const d = room.doc; d.phase = 'over';
    if (winner !== 'draw' && d.mode === 'bo3') d.score[winner] = (d.score[winner] || 0) + 1;
    if (forfeit) { d.forfeit = forfeit; if (d.mode === 'bo3') d.score[winner] = Math.max(d.score[winner], 2); }
    room.deadline = 0;
    out.result = { gid: d.gid, winner, mode: d.mode, a: d.seats.a, b: d.seats.b, forfeit: forfeit || null, matchOver: matchDone(d) };
  }
  /* 상대가 나갔거나 오래 돌아오지 않을 때: 판을 그 자리에서 끝낸다 */
  function forfeit(room, loser, now, out) {
    const d = room.doc; if (d.phase !== 'play') return;
    const g = JSON.parse(d.game), w = opp(loser); g.winner = w; g.forfeit = loser; d.game = JSON.stringify(g);
    finish(room, w, out, loser);
  }
  /* 다음 단계로: 금지 → 선택 → 판 → 판정. 사람의 쓰기 뒤에 매번 부른다 */
  function advance(room, now, out) {
    const d = room.doc;
    if (d.mm && d.phase === 'lobby' && d.seats.a && d.seats.b) { d.ready = { a: true, b: true }; startMatch(room); }
    if (d.phase === 'ban' && d.ban.a && d.ban.b) d.phase = 'select';
    if (d.phase === 'select' && d.pick.a && d.pick.b) startGame(room, now);
    tryResolve(room, now, out);
  }
  function startMatch(room) {
    const d = room.doc;
    Object.assign(d, { phase: d.mode === 'ban' ? 'ban' : 'select', pick: { a: null, b: null }, ban: { a: null, b: null }, score: { a: 0, b: 0 }, gid: d.gid + 1, lock: { a: '', b: '' }, plan: { a: '', b: '' } });
  }
  return {
    freshDoc, seatOf,
    /* 입장: 빈 b 자리에 앉는다. 이미 앉아 있으면 그대로(다시 들어오기) */
    join(room, uid, now) {
      const d = room.doc; let k = seatOf(d, uid);
      if (!k) { if (d.seats.b || d.closed) return { err: d.closed ? 'closed' : 'full' }; d.seats.b = uid; d.uid.b = uid; k = 'b'; }
      room.seen = Object.assign({}, room.seen, { [k]: now });
      const out = {}; advance(room, now, out); return Object.assign(out, { seat: k });
    },
    /* 사람의 쓰기. 허용한 칸만 골라 담고 나머지는 버린다 */
    apply(room, uid, patch, now, opt) {
      const d = room.doc, k = seatOf(d, uid), out = {};
      if (!k) return { err: 'not seated' };
      if (!patch || typeof patch !== 'object') return { err: 'bad patch' };
      room.seen = Object.assign({}, room.seen, { [k]: now });
      const own = (f, v) => { d[f] = Object.assign({}, d[f], { [k]: v }); };
      const mine = f => patch[f] && typeof patch[f] === 'object' && Object.prototype.hasOwnProperty.call(patch[f], k) ? patch[f][k] : undefined;
      let v;
      if ((v = mine('nick')) !== undefined) own('nick', str(v, 24));
      if ((v = mine('title')) !== undefined) own('title', str(v, 40));
      if ((v = mine('emote')) !== undefined && v && Number.isInteger(v.i) && v.i >= 0 && v.i < 40) own('emote', { i: v.i, n: Number(v.n) || now });
      if (d.phase === 'lobby') {
        if ((v = mine('ready')) !== undefined) own('ready', !!v);
        if (k === 'a' && typeof patch.mode === 'string' && MODES.includes(patch.mode) && !d.mm) d.mode = patch.mode;
        /* 방장의 시작: 둘 다 준비했을 때만 */
        if (k === 'a' && (patch.phase === 'select' || patch.phase === 'ban') && d.seats.b && d.ready.a && d.ready.b) startMatch(room);
      } else if (d.phase === 'ban') {
        if ((v = mine('ban')) !== undefined && okCls(v)) own('ban', v);
      } else if (d.phase === 'select') {
        if ((v = mine('pick')) !== undefined && okCls(v) && !(d.mode === 'ban' && [d.ban.a, d.ban.b].includes(v))) {
          own('pick', v);
          const sk = mine('skin'); own('skin', typeof sk === 'string' && sk && (!opt || !opt.skinOk || opt.skinOk(v, sk)) ? str(sk, 40) : '');
          const ex = mine('exe'); own('exe', str(ex, 20));
        }
      } else if (d.phase === 'play') {
        const t = tagOf(d), P = room.plans[t] = room.plans[t] || {};
        /* 잠금 취소: 상대가 아직 내지 않았을 때만(둘 다 내는 순간 판정되므로 내 계획이 남아 있으면 상대는 아직이다). 낸 계획도 지운다 */
        if ((v = mine('lock')) !== undefined) { if (v === t) own('lock', t); else if (v === '') { delete P[k]; own('lock', ''); own('plan', ''); } }
        if ((v = mine('plan')) !== undefined) {
          let pl = null; try { pl = typeof v === 'string' ? JSON.parse(v) : v; } catch (e) { pl = null; }
          /* 계획 내용은 엔진의 sanitize가 판정 때 다시 걸러 낸다. 여기서는 모양과 턴만 본다 */
          if (pl && typeof pl === 'object' && pl.tag === t) { P[k] = pl; own('plan', '1'); own('lock', t); }
        }
      } else if (d.phase === 'over') {
        /* 방장의 재대결: 3판 2선승이 안 끝났으면 다음 판, 끝났으면 새 매치 */
        if (k === 'a' && (patch.phase === 'select' || patch.phase === 'ban') && d.seats.b) {
          const done = matchDone(d);
          Object.assign(d, { phase: d.mode === 'ban' ? 'ban' : 'select', pick: { a: null, b: null }, ban: { a: null, b: null }, gid: d.gid + 1, lock: { a: '', b: '' }, plan: { a: '', b: '' } });
          if (done) d.score = { a: 0, b: 0 };
          delete d.forfeit;
        }
      }
      advance(room, now, out);
      return out;
    },
    /* 시간 초과: 제한 시간이 지나면 계획을 안 낸 쪽은 제자리 대기로 판정한다.
       그 쪽이 오래(ABSENT) 접속하지 않았으면 기권 */
    tick(room, now) {
      const d = room.doc, out = {};
      if (d.phase !== 'play' || !room.deadline || now < room.deadline) return out;
      const t = tagOf(d), P = room.plans[t] = room.plans[t] || {}, g = JSON.parse(d.game);
      const gone = SEATS.filter(k => !P[k] && now - ((room.seen || {})[k] || 0) > ABSENT);
      if (gone.length === 1) { forfeit(room, gone[0], now, out); return out; }
      if (gone.length === 2) { g.winner = 'draw'; d.game = JSON.stringify(g); finish(room, 'draw', out, null); return out; }
      for (const k of SEATS) if (!P[k]) { P[k] = blankPlan(g, k, t); d.plan = Object.assign({}, d.plan, { [k]: '1' }); }
      tryResolve(room, now, out);
      return out;
    },
    /* 나가기: 판 중이면 기권, 대기실이면 자리를 비운다(방장이 나가면 방을 닫는다) */
    leave(room, uid, now) {
      const d = room.doc, k = seatOf(d, uid), out = {};
      if (!k) return out;
      if (d.phase === 'play') forfeit(room, k, now, out);
      if (k === 'b' && !d.mm) { d.seats.b = null; d.uid.b = ''; d.ready = { a: d.ready.a, b: false }; if (d.phase !== 'over') d.phase = 'lobby'; }
      else d.closed = true;
      return out;
    },
    seen(room, uid, now) { const k = seatOf(room.doc, uid); if (k) room.seen = Object.assign({}, room.seen, { [k]: now }); return k; },
  };
}
