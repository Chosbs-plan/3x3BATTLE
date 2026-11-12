/* 자동 생성: tools/build_engine.py 가 index.html 에서 뽑은 규칙 엔진. 직접 고치지 말 것 */
const document = { addEventListener() {}, removeEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; }, elementFromPoint() { return null; }, documentElement: { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } }, body: { classList: { toggle() {}, add() {}, remove() {}, contains() { return false; } } } };
const window = {}, navigator = {}, location = { href: '' };
const localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} }, sessionStorage = localStorage;
const MutationObserver = function () { this.observe = () => {}; this.disconnect = () => {}; };
const requestAnimationFrame = () => 0, getComputedStyle = () => ({}), matchMedia = () => ({ matches: false, addEventListener() {} });
const CARDS = {
  leap:   { n: '도약',       t: 'move', c: 0, d: '대각 1칸 또는 직선 2칸 이동' },
  blink:  { n: '순간이동',   t: 'move', c: 1, d: '원하는 칸으로 이동' },
  guard:  { n: '방어',       t: 'sp',   c: 1, d: '이번 턴 받는 피해 -1' },
  scry:   { n: '투시',       t: 'sp',   c: 1, d: '다음 턴 상대 손패를 본다' },
  regroup: { n: '재정비',    t: 'sp',   c: 2, d: '남은 손패를 모두 버리고, 턴이 끝날 때 4장을 새로 뽑는다. 유물 카드는 남긴다' },
  // 마법사
  fire:   { n: '화염구',     t: 'atk',  c: 2, tg: 'sq',   dmg: 2, delay: 1, d: '2×2 영역. 다음 턴 폭발, 피해 2' },
  bolt:   { n: '번개',       t: 'atk',  c: 2, tg: 'col',  dmg: 1, d: '세로 한 줄 즉발, 피해 1. 맞으면 감전되어 다음 턴 기본 이동 불가' },
  frost:  { n: '빙결',       t: 'sp',   c: 2, tg: 'two',  d: '2칸을 얼린다. 그 칸에 있는 상대는 피해 1, 다음 턴 기본 이동 불가. 얼린 칸은 다음 턴 진입 불가' },
  burst:  { n: '마력 폭발',  t: 'atk',  c: 3, dmg: 1, d: '십자 5칸 즉발, 피해 1' },
  meteor: { n: '유성',       t: 'atk',  c: 6, tg: 'line', dmg: 3, delay: 2, d: '고른 한 줄만 안전. 2턴 뒤 나머지 6칸 피해 3' },
  // 사무라이
  hslash: { n: '가로베기',   t: 'atk',  c: 1, dmg: 1, d: '내가 선 가로줄 전체, 피해 1' },
  vslash: { n: '내려베기',   t: 'atk',  c: 1, dmg: 1, d: '내가 선 세로줄 전체, 피해 1' },
  thrust: { n: '찌르기',     t: 'atk',  c: 1, dmg: 3, d: '내가 선 칸과 같은 칸, 피해 3' },
  parry:  { n: '받아넘기기', t: 'sp',   c: 2, d: '이번 턴 공격을 맞으면 무효, 상대 피해 1' },
  dash:   { n: '돌진',       t: 'atk',  c: 2, dmg: 1, mv: 1, d: '직선 2칸 이동 후 도착한 가로줄 전체, 피해 1' },
  // 메카닉
  mine:   { n: '지뢰',       t: 'sp',   c: 1, tg: 'cell', trap: 1, d: '상대 칸에 몰래 설치(최대 3). 그 칸에서 이동을 마치면 피해 2' },
  turret: { n: '포탑',       t: 'sp',   c: 2, tg: 'row',  trap: 1, d: '가로 한 줄을 이번 턴과 다음 턴에 사격, 피해 1' },
  rail:   { n: '레일건',     t: 'atk',  c: 4, tg: 'col',  dmg: 2, d: '세로 한 줄 즉발, 피해 2' },
  ring:   { n: '감전망',     t: 'atk',  c: 3, dmg: 1, d: '가운데를 뺀 테두리 8칸 즉발, 피해 1' },
  hook:   { n: '견인 갈고리', t: 'sp',  c: 2, d: '상대가 이번 턴 제자리에 머물렀다면 가운데 칸으로 끌어온다' },
  // 드루이드
  bramble: { n: '가시덤불',  t: 'sp',   c: 1, tg: 'cell', trap: 1, d: '상대 칸에 덤불을 심는다(최대 2). 그 칸에서 턴을 마치면 피해 1' },
  vine:   { n: '덩굴 채찍',  t: 'atk',  c: 2, tg: 'row',  dmg: 1, d: '가로 한 줄 즉발, 피해 1. 맞으면 다음 턴 기본 이동 불가' },
  spore:  { n: '포자 구름',  t: 'atk',  c: 2, tg: 'sq',   dmg: 1, delay: 1, d: '2×2 영역. 닿은 상대를 바로 속박(피해 없음). 다음 턴 그 영역에 피해 1' },
  wolves: { n: '늑대 무리',  t: 'atk',  c: 3, dmg: 1, d: '대각선 X자 5칸 즉발, 피해 1. 속박된 상대에게는 피해 2' },
  heal:   { n: '광합성',     t: 'sp',   c: 2, d: '이번 턴 피해를 받지 않으면 체력 +1' },
  // 슬라임
  slam:   { n: '몸통 박치기', t: 'atk', c: 1, dmg: 1, d: '내 몸마다, 선 칸과 그 좌우 칸 즉발, 피해 1' },
  bounce: { n: '튀어오르기', t: 'atk',  c: 2, dmg: 1, mv: 1, d: '원하는 칸으로 뛰어 착지. 착지 칸은 피해 2, 상하좌우는 피해 1. 즉발' },
  engulf: { n: '삼키기',     t: 'atk',  c: 2, dmg: 3, d: '내 몸이 선 칸과 같은 칸 즉발, 피해 3. 맞으면 체력 +1' },
  harden: { n: '굳히기',     t: 'sp',   c: 1, d: '이번 턴 받는 피해 -2' },
  // 고고학자
  shovel: { n: '삽 타격',    t: 'atk',  c: 0, dmg: 2, d: '내가 선 칸과 같은 칸 즉발, 피해 2' },
  dig:    { n: '땅 파기',    t: 'sp',   c: 0, d: '이동을 마친 칸을 파서 무작위 유물을 얻는다. 한 번 판 칸은 다시 못 판다' },
  // 날씨주술사
  storm:  { n: '뇌우',       t: 'sp',   c: 2, tg: 'col',  wx: 1, d: '고른 세로줄에 낙뢰, 피해 1. 3턴 동안 매 턴 옆줄로 옮겨 가며 친다' },
  snow:   { n: '눈보라',     t: 'sp',   c: 2, tg: 'row',  wx: 1, d: '고른 가로줄에 눈보라, 피해 1. 3턴 동안 매 턴 아랫줄로 옮겨 가며 친다' },
  heatw:  { n: '폭염',       t: 'sp',   c: 2, wx: 1, d: '3턴 동안, 제자리에 머문 상대는 피해 1' },
  tornado: { n: '회오리',    t: 'atk',  c: 3, tg: 'cell', dmg: 1, d: '고른 칸과 그 상하좌우 즉발, 피해 1' },
  reverse: { n: '역풍',      t: 'sp',   c: 1, d: '날씨가 옮겨 가는 방향을 뒤집고 지속 +1턴. 이번 턴부터 반대쪽 줄을 친다' },
  // 듀라한
  sweep:  { n: '대검 휘두르기', t: 'atk', c: 2, dmg: 2, heavy: 1, d: '내가 선 가로줄과 세로줄 전체 즉발, 피해 2. 다음 턴 기본 이동 불가' },
  cleave: { n: '내려찍기',   t: 'atk',  c: 2, dmg: 3, heavy: 1, d: '내가 선 세로줄 전체 즉발, 피해 3. 다음 턴 기본 이동 불가' },
  block:  { n: '검막이',     t: 'sp',   c: 1, d: '이번 턴 받는 피해 -2. 맞았다면 다음 턴 공격 피해 +1' },
  ride:   { n: '질주',       t: 'sp',   c: 1, mv: 1, d: '직선으로 2칸 이동. 경직이나 속박 중에도 쓸 수 있다' },
  head:   { n: '머리 던지기', t: 'atk', c: 2, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 다음 턴 상대 손패를 본다' },
  // 석고상
  discus: { n: '원반 던지기', t: 'atk', c: 1, tg: 'col', dmg: 1, d: '세로 한 줄 즉발, 피해 1. 원반이 돌아오며 다음 턴에도 같은 줄에 피해 1' },
  pillar: { n: '기둥 세우기', t: 'sp',  c: 1, tg: 'cell', d: '상대 칸에 기둥을 세운다(최대 2). 3턴 동안 그 칸에 들어갈 수 없다' },
  gaze:   { n: '석화의 시선', t: 'atk', c: 2, dmg: 1, d: '내가 선 가로줄 전체 즉발, 피해 1. 맞으면 다음 턴 기본 이동 불가' },
  topple: { n: '무너지는 조각', t: 'atk', c: 3, tg: 'sq', dmg: 2, d: '2×2 영역 즉발, 피해 2' },
  restore: { n: '복원',      t: 'sp',   c: 2, d: '이번 턴 제자리에 머물렀다면 체력 +1' },
  // 천문학자
  star:   { n: '별 띄우기',  t: 'atk',  c: 0, tg: 'two',  dmg: 1, d: '고른 2칸에 별이 떨어져 즉발 피해 1. 그 자리에 별이 남는다(최대 3)' },
  nova:   { n: '초신성',     t: 'atk',  c: 2, tg: 'cell', dmg: 1, d: '별 하나를 터뜨려 그 칸과 상하좌우에 즉발 피해 1. 별이 뜬 칸만 고를 수 있다' },
  comet:  { n: '혜성',       t: 'atk',  c: 2, tg: 'cell', dmg: 3, delay: 1, d: '다음 턴, 고른 칸에 피해 3, 상하좌우에 피해 2. 떨어진 자리에 별이 남는다' },
  blackhole: { n: '블랙홀',  t: 'atk',  c: 5, tg: 'cell', dmg: 0, d: '별이 뜬 칸에 연다. 이동이 끝난 상대를 그 칸으로 끌어당기고, 떠 있는 별의 수만큼 피해. 별은 모두 사라진다' },
  lens:   { n: '중력 렌즈',  t: 'sp',   c: 2, d: '이동이 끝난 상대를 가장 가까운 별 쪽으로 한 칸 끌어당긴다' },
  // 삐에로
  box:    { n: '깜짝 상자',  t: 'sp',   c: 1, tg: 'cell', trap: 1, d: '상대 칸에 몰래 설치. 2턴 뒤 터져 그 칸과 상하좌우에 피해 2' },
  juggle: { n: '저글링',     t: 'atk',  c: 1, tg: 'cell', dmg: 1, d: '고른 칸과 무작위 다른 2칸 즉발, 피해 1' },
  mimic:  { n: '흉내',       t: 'atk',  c: 2, dmg: 0, d: '상대가 마지막으로 나에게 쓴 즉발 공격을 같은 칸, 같은 피해로 되돌려준다' },
  pie:    { n: '파이 던지기', t: 'atk', c: 2, tg: 'row', dmg: 1, d: '가로 한 줄 즉발, 피해 1. 맞으면 상대 마나를 2까지 훔친다' },
  swap:   { n: '바꿔치기',   t: 'sp',   c: 1, d: '이동이 끝난 뒤 서로의 위치를 맞바꾼다' },
  // 풍선
  inflate: { n: '숨 들이쉬기', t: 'sp', c: 0, d: '공기 +2 (최대 3)' },
  jet:    { n: '바람 분사',  t: 'atk',  c: 1, dmg: 1, mv: 1, d: '원하는 칸으로 날아가 착지. 도착한 세로줄 전체 즉발, 피해 1' },
  pop:    { n: '펑!',        t: 'atk',  c: 3, dmg: 2, d: '공기를 전부 터뜨린다. 공기 1은 내가 선 칸과 상하좌우에 피해 2, 공기 2는 9칸 전체에 피해 2, 공기 3은 9칸 전체에 피해 3. 즉발' },
  knot:   { n: '매듭 묶기',  t: 'sp',   c: 1, d: '이번 턴 받는 피해 -1, 공기 +1' },
  helium: { n: '헬륨',       t: 'atk',  c: 2, tg: 'col', dmg: 1, d: '세로 한 줄 즉발, 피해 1. 맞은 상대는 맨 윗줄로 떠오른다' },
  // 도박사
  dice:   { n: '주사위',     t: 'atk',  c: 1, tg: 'row',  dmg: 1, d: '가로 한 줄 즉발. 주사위 눈 1~2는 꽝, 3~5는 피해 1, 6은 피해 2' },
  coin:   { n: '동전 던지기', t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '즉발. 앞면은 고른 칸과 상하좌우에 피해 1, 뒷면은 고른 칸에만 피해 2' },
  roulette: { n: '룰렛',     t: 'atk',  c: 2, dmg: 1, d: '무작위 5칸 즉발, 피해 1' },
  allin:  { n: '올인',       t: 'atk',  c: 3, tg: 'cell', dmg: 2, d: '고른 칸과 좌우 칸 즉발. 주사위 눈 1~2는 피해 1, 3~4는 피해 2, 5~6은 피해 3' },
  bluff:  { n: '허세',       t: 'sp',   c: 1, d: '이번 턴 받는 피해 -1. 피해를 받지 않았다면 판돈 +1' },
  // 대장장이
  hammer: { n: '망치질',     t: 'atk',  c: 1, dmg: 1, d: '내가 선 칸과 좌우 칸 즉발, 피해 1' },
  skewer: { n: '쇠꼬챙이',   t: 'atk',  c: 2, tg: 'col',  dmg: 1, d: '세로 한 줄 즉발, 피해 1' },
  opus:   { n: '걸작',       t: 'atk',  c: 3, tg: 'sq',   dmg: 2, d: '2×2 영역 즉발, 피해 2' },
  anvil:  { n: '모루',       t: 'sp',   c: 1, d: '손패에 있는 공격 카드 종류마다 담금질 +1' },
  // 음유시인
  note:   { n: '음표',       t: 'atk',  c: 0, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 박자 2 이상이면 상하좌우 칸까지' },
  chord:  { n: '화음',       t: 'atk',  c: 1, tg: 'row',  dmg: 1, d: '가로 한 줄 즉발, 피해 1. 박자 2 이상이면 가운데 세로줄까지' },
  cresc:  { n: '크레셴도',   t: 'atk',  c: 3, dmg: 1, d: '대각선 X자 5칸 즉발, 피해 1. 박자 2 이상이면 9칸 전체' },
  lullaby: { n: '자장가',    t: 'sp',   c: 1, d: '상대는 이번 턴 끝에 마나를 회복하지 못한다' },
  rest:   { n: '쉼표',       t: 'sp',   c: 0, d: '이번 턴 받는 피해 -1. 공격하지 않아도 박자가 끊기지 않는다' },
  // 음양사: 홀수 턴은 양, 짝수 턴은 음
  talis:  { n: '부적',       t: 'atk',  c: 1, tg: 'cell', dmg: 1, yy: 1, d: '양: 고른 칸의 가로줄 전체 즉발, 피해 1. 음: 고른 칸 하나에 즉발, 피해 2' },
  shiki:  { n: '식신',       t: 'atk',  c: 2, tg: 'cell', dmg: 1, yy: 1, d: '양: 고른 칸과 상하좌우 즉발, 피해 1. 음: 고른 칸과 대각선 칸 즉발, 피해 1, 맞으면 다음 턴 기본 이동 불가' },
  taiji:  { n: '태극',       t: 'atk',  c: 3, dmg: 2, yy: 1, d: '양: 네 귀퉁이와 가운데 5칸 즉발, 피해 2. 음: 나머지 4칸 즉발, 피해 2' },
  ward:   { n: '결계',       t: 'sp',   c: 1, yy: 1, d: '양: 이번 턴 받는 피해 -1, 마나 +1. 음: 이번 턴 받는 피해 -2' },
  // 닭
  lay:    { n: '알 낳기',    t: 'sp',   c: 0, d: '이동을 마친 내 칸에 알을 낳는다(최대 3, 칸마다 하나)' },
  peck:   { n: '쪼기',       t: 'atk',  c: 1, tg: 'cell', dmg: 1, d: '고른 칸과 좌우 칸 즉발. 피해 1에 내 알 하나당 +1' },
  flap:   { n: '홰치기',     t: 'atk',  c: 2, dmg: 1, d: '내가 선 칸과 상하좌우 즉발, 피해 1. 알이 하나라도 있으면 피해 2' },
  crow:   { n: '꼬끼오',     t: 'atk',  c: 3, dmg: 0, d: '알을 전부 터뜨린다. 9칸 전체 즉발, 터뜨린 알 하나당 피해 1' },
  brood:  { n: '알 품기',    t: 'sp',   c: 1, d: '이번 턴 받는 피해 -1, 내 알은 깨지지 않는다' },
  // 삼지창 어인
  prong:  { n: '삼지창 찌르기', t: 'atk', c: 1, dmg: 1, d: '내가 선 칸과 좌우 칸 즉발, 피해 1' },
  harpoon: { n: '작살',      t: 'atk',  c: 2, tg: 'col',  dmg: 1, d: '세로 한 줄 즉발, 피해 1. 맞은 상대를 맨 아랫줄로 끌어온다' },
  wave:   { n: '해일',       t: 'atk',  c: 3, tg: 'row',  dmg: 2, d: '가로 한 줄 즉발, 피해 2' },
  bubble: { n: '물방울 방패', t: 'sp',  c: 1, d: '이번 턴 받는 피해 -1. 솟아오르는 턴의 추가 피해도 막는다' },
  // 허수아비: ㄱ자는 고른 칸에서 왼쪽과 아래로, ㄴ자는 위와 오른쪽으로 뻗는다
  sickG:  { n: 'ㄱ자 베기',  t: 'atk',  c: 2, tg: 'cell', dmg: 1, L: 1, d: '고른 칸이 모서리. 그 칸에서 왼쪽 끝까지, 아래 끝까지 ㄱ자로 즉발, 피해 1' },
  sickN:  { n: 'ㄴ자 베기',  t: 'atk',  c: 2, tg: 'cell', dmg: 1, L: 1, d: '고른 칸이 모서리. 그 칸에서 위 끝까지, 오른쪽 끝까지 ㄴ자로 즉발, 피해 1' },
  boomer: { n: '되돌이 낫',  t: 'atk',  c: 3, tg: 'cell', dmg: 1, L: 1, d: '고른 칸을 모서리로 ㄱ자 즉발, 피해 1. 다음 턴 같은 모서리에서 ㄴ자로 되돌아와 피해 1' },
  hookS:  { n: '낫 걸기',    t: 'atk',  c: 1, tg: 'cell', dmg: 1, L: 1, d: '고른 칸과 그 왼쪽 한 칸, 아래 한 칸 즉발, 피해 1. 맞은 상대를 고른 칸으로 끌어온다' },
  scare:  { n: '겁주기',     t: 'sp',   c: 1, d: '이동이 끝난 뒤 상대가 나와 같은 가로줄이나 세로줄에 있으면 다음 턴 기본 이동 불가' },
  // 유물 (땅 파기로만 얻는다. 쓰면 사라진다)
  spear:  { n: '황금 창',    t: 'atk',  c: 3, tg: 'col', dmg: 3, relic: 1, d: '세로 한 줄 즉발, 피해 3' },
  sun:    { n: '태양석',     t: 'atk',  c: 4, dmg: 2, relic: 1, d: '상대 진영 9칸 전체 즉발, 피해 2' },
  grail:  { n: '성배',       t: 'sp',   c: 2, relic: 1, d: '체력 +2' },
  amulet: { n: '수호 부적',  t: 'sp',   c: 1, relic: 1, d: '이번 턴 받는 공격 피해를 전부 막는다' },
  hourglass: { n: '모래시계', t: 'sp',  c: 2, relic: 1, d: '상대는 다음 턴 카드와 능력을 쓸 수 없다' },
};
/* 유물 뽑기 표: [이름표, 가중치]. 좋은 유물은 손패에 들어오고, 나쁜 유물은 그 자리에서 터진다 */
const RELIC_GOOD = [['spear', 12], ['sun', 8], ['grail', 8], ['amulet', 10], ['hourglass', 8]];
const RELIC_BAD = [['snare', 10], ['empty', 12]];
const BAD_INFO = { snare: ['덫', '다음 턴 기본 이동 불가'], empty: ['빈 항아리', '아무것도 없다'] };
const COMMON = ['leap', 'leap', 'blink', 'blink', 'guard', 'guard', 'scry', 'regroup'];
const rpt = o => Object.entries(o).flatMap(([id, n]) => Array(n).fill(id));
const CLS = {
  mage: {
    n: '마법사', max: 7, deck: rpt({ fire: 3, bolt: 3, frost: 2, burst: 2, meteor: 2 }),
    tag: '광역과 예고로 공간을 좁힌다',
    pas: ['마력 축적', '최대 마나 7 (기본 5). 마나 샘에 도착하면 마나를 두 배(+4)로 얻는다'],
    act: ['가속', '마나 2, 행동 소모. 양쪽 진영에 예고된 모든 공격의 대기 턴을 1턴 당긴다. 다음 턴에 터질 것은 이번 턴에 터진다'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  samurai: {
    n: '사무라이', max: 5, deck: rpt({ hslash: 4, vslash: 3, thrust: 2, parry: 2, dash: 1 }),
    tag: '내가 선 자리가 곧 칼이 닿는 자리',
    pas: ['발도 자세', '제자리에 머문 다음 턴, 공격 피해 +1'],
    act: ['잔상', '기 3 소모. 공격이 이동 전과 후 위치 모두를 기준으로 나간다. 상대의 즉발 공격을 피할 때마다 기 +1'],
    ab: { cost: 0, slot: false, label: '기 3' },
  },
  mechanic: {
    n: '메카닉', max: 5, deck: rpt({ mine: 3, turret: 3, rail: 2, ring: 2, hook: 2 }),
    tag: '설치물로 판을 깔고 끌어들인다',
    pas: ['예열', '지뢰나 포탑이 상대를 맞힐 때마다 마나 +1'],
    act: ['원격 기폭', '마나 2, 행동 소모. 설치한 지뢰가 전부 터진다. 지뢰 칸과 상하좌우에 즉발 피해 1'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  druid: {
    n: '드루이드', max: 5, deck: rpt({ bramble: 3, vine: 3, spore: 2, wolves: 2, heal: 2 }),
    tag: '땅을 덮고 버티며 되살아난다',
    pas: ['재생', '4턴 연속으로 체력을 잃지 않으면 체력 +1'],
    act: ['뒤쫓는 뿌리', '마나 2, 카드와 함께 사용. 상대가 이번 턴 떠난 칸에 가시덤불이 자란다(덤불 최대 2, 오래된 것부터 교체). 상대가 제자리에 머물면 불발'],
    ab: { cost: 2, slot: false, label: '마나 2' },
  },
  slime: {
    n: '슬라임', max: 5, deck: rpt({ slam: 4, bounce: 3, engulf: 2, harden: 3 }),
    tag: '몸을 둘로 나눠 닿는 곳을 넓힌다',
    pas: ['탄성', '한 턴에 받는 공격 피해는 최대 2'],
    act: ['분열', '마나 2, 행동 소모. 이번 턴 이동하면 떠난 칸에 분신이 남는다. 분신도 공격의 기준이 된다. 분신이 맞으면 피해 없이 사라진다. 본체가 분신 칸으로 돌아오면 합쳐져 체력 +1'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  archaeologist: {
    n: '고고학자', max: 5, deck: rpt({ shovel: 5, dig: 7 }),
    tag: '땅을 파서 나온 유물로 싸운다',
    pas: ['탐사 본능', '땅을 파낸 턴에는 마나 +1'],
    act: ['유물 감정', '마나 1, 땅 파기와 함께 사용. 이번 발굴에서는 나쁜 유물이 나오지 않는다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
};
Object.assign(CLS, {
  shaman: {
    n: '날씨주술사', max: 5, deck: rpt({ storm: 3, snow: 3, heatw: 2, tornado: 2, reverse: 2 }),
    tag: '날씨로 진영의 한 줄을 매 턴 막는다',
    pas: ['기압', '결투를 시작할 때 뇌우나 눈보라 하나가 3턴 동안 떠 있다. 날씨가 상대를 맞히면 그 날씨의 지속이 1턴 늘어난다(날씨마다 한 번)'],
    act: ['폭주', '마나 2, 행동 소모. 이번 턴 날씨가 두 배로 친다. 뇌우와 눈보라는 다음 줄까지 함께, 폭염은 피해 2'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  dullahan: {
    n: '듀라한', max: 5, deck: rpt({ sweep: 3, cleave: 3, block: 2, ride: 2, head: 2 }),
    tag: '느리고 무거운 대검의 한 방',
    pas: ['불사', '체력이 0이 되어도 한 판에 한 번, 체력 1로 버틴다. 대신 최대 체력이 4 (기본 5)'],
    act: ['분쇄', '마나 2, 공격 카드와 함께 사용. 이번 공격은 피해 +1, 방어로 줄일 수 없다'],
    ab: { cost: 2, slot: false, label: '마나 2' },
  },
});
Object.assign(CLS, {
  statue: {
    n: '석고상', max: 5, deck: rpt({ discus: 3, pillar: 3, gaze: 2, topple: 2, restore: 2 }),
    tag: '움직이지 않고 돌을 떨어뜨린다',
    pas: ['낙석', '제자리에 머문 턴마다 상대 진영의 내가 선 칸과 같은 칸에 기둥 조각이 떨어진다. 즉발, 피해 1'],
    act: ['좌대', '마나 1, 카드와 함께 사용. 이번 턴 제자리에 머물면 받는 피해 -1, 끌려가지도 않는다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
  astronomer: {
    n: '천문학자', max: 5, deck: rpt({ star: 4, nova: 3, comet: 2, lens: 2, blackhole: 1 }),
    tag: '별을 띄우고 이어서 별자리로 친다',
    pas: ['별빛', '결투를 시작할 때 상대 진영에 별 하나가 떠 있다. 상대가 별이 뜬 칸에서 턴을 마치면 마나 +1'],
    act: ['별자리', '마나 2, 행동 소모. 별이 뜬 칸과, 별 둘 사이에 낀 칸 전부에 즉발 피해 1. 별은 그대로 남는다'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
});
Object.assign(CLS, {
  clown: {
    n: '삐에로', max: 5, deck: rpt({ box: 3, juggle: 3, mimic: 2, pie: 2, swap: 2 }),
    tag: '속이고, 훔치고, 자리를 뒤바꾼다',
    pas: ['야유', '내 즉발 공격이 빗나가면 마나 +1'],
    act: ['앙코르', '마나 2, 즉발 공격 카드와 함께 사용. 그 공격이 한 번 더 나간다'],
    ab: { cost: 2, slot: false, label: '마나 2' },
  },
  balloon: {
    n: '풍선', max: 5, deck: rpt({ inflate: 3, jet: 3, pop: 2, knot: 2, helium: 2 }),
    tag: '공기를 모아 한 번에 터뜨린다',
    pas: ['둥실', '지뢰와 가시덤불의 피해를 받지 않는다. 대신 공기가 3일 때 공격을 맞으면 피해 +1에 공기를 전부 잃는다'],
    act: ['급팽창', '마나 1, 카드와 함께 사용. 카드보다 먼저 공기 +1'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
});
Object.assign(CLS, {
  gambler: {
    n: '도박사', max: 5, deck: rpt({ dice: 4, coin: 3, roulette: 2, allin: 1, bluff: 2 }),
    tag: '주사위와 동전에 피해를 건다',
    pas: ['판돈', '내 즉발 공격이 빗나가면 판돈 +1 (최대 1). 다음에 맞히는 공격의 피해에 판돈만큼 더하고 판돈은 0이 된다'],
    act: ['한 번 더', '마나 1, 공격 카드와 함께 사용. 주사위·동전·룰렛을 두 번 돌려 더 좋은 쪽을 쓴다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
  blacksmith: {
    n: '대장장이', max: 5, deck: rpt({ hammer: 3, skewer: 2, opus: 1, anvil: 2 }), common: ['leap', 'leap', 'blink', 'guard', 'guard', 'regroup'],
    tag: '쓸수록 카드가 단단해진다',
    pas: ['담금질', '공격 카드를 쓸 때마다 그 종류의 카드가 담금질 +1 (최대 +2). 담금질만큼 피해가 늘어난다. 덱이 14장으로 얇아 같은 카드가 빨리 돌아온다'],
    act: ['달군 쇠', '마나 1, 공격 카드와 함께 사용. 이번 공격은 상대의 피해 감소를 무시한다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
  bard: {
    n: '음유시인', max: 5, deck: rpt({ note: 4, chord: 3, cresc: 2, lullaby: 2, rest: 1 }),
    tag: '공격을 이어 갈수록 곡이 커진다',
    pas: ['박자', '공격 카드를 낸 턴마다 박자 +1 (최대 3). 박자 2 이상이면 공격 범위가 넓어지고, 박자 3이면 피해 +1. 공격을 내지 않은 턴에 박자는 0이 된다'],
    act: ['앙상블', '마나 2, 행동 소모. 박자를 전부 써서 즉발 공격. 박자 1은 고른 칸에 피해 1, 박자 2는 고른 칸과 상하좌우에 피해 1, 박자 3은 고른 칸과 상하좌우에 피해 2'],
    ab: { cost: 2, slot: true, tg: 'cell', label: '마나 2' },
  },
});
Object.assign(CLS, {
  onmyoji: {
    n: '음양사', max: 5, deck: rpt({ talis: 4, shiki: 3, taiji: 2, ward: 3 }),
    tag: '홀수 턴과 짝수 턴에 다른 술법을 쓴다',
    pas: ['음양', '홀수 턴은 양, 짝수 턴은 음. 전용 카드는 양과 음에서 효과가 다르다. 음의 턴이 끝날 때 마나 +1'],
    act: ['반전', '마나 1, 전용 카드와 함께 사용. 이번 턴 그 카드를 반대 기운으로 쓴다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
  chicken: {
    n: '닭', max: 5, deck: rpt({ lay: 4, peck: 3, flap: 2, crow: 1, brood: 2 }),
    tag: '알을 쌓을수록 세지고, 깨지면 아프다',
    pas: ['알부자', '내 진영에 낳은 알이 공격을 키운다. 상대 공격이 알이 놓인 칸을 덮으면 그 알은 깨지고, 알이 깨진 턴에는 피해 1을 받는다'],
    act: ['닭싸움', '마나 0, 쪼기나 홰치기와 함께 사용. 이번 공격 피해 +1. 빗나가면 제풀에 넘어져 내가 피해 1'],
    ab: { cost: 0, slot: false, label: '빗나가면 피해 1' },
  },
  merfolk: {
    n: '삼지창 어인', max: 5, deck: rpt({ prong: 4, harpoon: 3, wave: 2, bubble: 3 }),
    tag: '바닥 밑으로 잠수했다가 솟구쳐 찌른다',
    pas: ['솟구치기', '잠수한 다음 턴, 원하는 칸에서 솟아오른다. 솟은 칸과 같은 상대 칸에 즉발 피해 2. 솟아오르는 턴에 피해를 받으면 피해 +1'],
    act: ['잠수', '마나 2, 행동 소모. 제자리에서 바닥 밑으로 들어간다. 이번 턴 모든 피해와 끌어당김을 받지 않고, 상대에게 위치가 보이지 않는다. 다음 턴에 반드시 솟아오른다. 솟아오른 다음 턴에는 다시 잠수할 수 없다'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  scarecrow: {
    n: '허수아비', max: 5, deck: rpt({ sickG: 3, sickN: 3, boomer: 2, hookS: 2, scare: 2 }),
    tag: 'ㄱ자와 ㄴ자로 꺾이는 낫질',
    pas: ['날 끝', '낫 공격이 꺾이는 모서리 칸(고른 칸)에 상대가 있으면 피해 +1'],
    act: ['되베기', '마나 2, ㄱ자 베기나 ㄴ자 베기와 함께 사용. 같은 모서리에서 ㄱ자와 ㄴ자가 함께 나가 가로줄과 세로줄 전체를 벤다'],
    ab: { cost: 2, slot: false, label: '마나 2' },
  },
});
Object.assign(CARDS, {
  // 흡혈귀
  bite:   { n: '물기',       t: 'atk', c: 1, dmg: 2, d: '내가 선 칸과 같은 칸 즉발, 피해 2. 맞으면 체력 +1' },
  bspear: { n: '피의 창',    t: 'atk', c: 2, tg: 'col', dmg: 1, d: '세로 한 줄 즉발, 피해 1. 내 체력이 3 이하면 피해 2' },
  bats:   { n: '박쥐 떼',    t: 'atk', c: 3, dmg: 1, d: '내가 선 칸의 상하좌우 즉발, 피해 1. 맞으면 마나 +1' },
  mist:   { n: '안개',       t: 'sp',  c: 1, d: '이번 턴 받는 피해 0. 대신 이번 턴은 마나를 회복하지 못한다' },
  feast:  { n: '피의 향연',  t: 'atk', c: 0, dmg: 1, d: '체력 2를 낸다(체력 3 이상일 때). 상대 진영 전체 즉발, 피해 1. 피해를 줬다면 체력 +1' },
  // 사냥꾼
  arrow:  { n: '화살',       t: 'atk', c: 1, tg: 'two2', dmg: 1, d: '칸 2곳을 골라 즉발, 피해 1. 같은 칸을 두 번 고르면 그 칸에 피해 2' },
  noose:  { n: '올가미',     t: 'sp',  c: 2, tg: 'two', trap: 1, d: '상대 칸 2곳에 한 번에 설치(최대 2, 보임). 그 칸에서 이동을 마치면 다음 턴 기본 이동 불가, 표식이 붙는다' },
  drive:  { n: '몰이',       t: 'atk', c: 2, tg: 'row', dmg: 1, d: '가로 한 줄 즉발, 피해 1. 맞은 상대를 가장 가까운 표식 쪽으로 한 칸 민다' },
  ambush: { n: '잠복',       t: 'sp',  c: 1, d: '이번 턴 받는 피해를 모두 막는다. 다음 턴 공격 피해 +1' },
  volley: { n: '일제 사격',  t: 'atk', c: 3, dmg: 1, d: '표식 칸 전부와 그 상하좌우 즉발, 피해 1. 표식은 사라진다' },
  // 묘지기
  pickaxe: { n: '곡괭이',    t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 금 간 칸이나 무너진 칸이면 피해 2' },
  wisp:   { n: '도깨비불',   t: 'atk', c: 2, tg: 'cell', dmg: 1, delay: 1, d: '고른 칸과 무너진 칸 전부. 다음 턴 폭발, 피해 1' },
  coffin: { n: '관 뚜껑',    t: 'sp',  c: 1, d: '이번 턴 받는 피해 -1. 무너진 칸에 서 있으면 -2' },
  ghand:  { n: '무덤 손',    t: 'atk', c: 2, tg: 'row', dmg: 1, d: '가로 한 줄 즉발, 피해 1. 그 줄에 무너진 칸이 있으면 맞은 상대는 다음 턴 기본 이동 불가' },
  quake:  { n: '지반 붕괴',  t: 'sp',  c: 4, tg: 'line', d: '고른 줄에서 멀쩡한 칸 하나가 무작위로 무너진다. 그 칸의 상대는 피해 2' },
});
Object.assign(CLS, {
  vampire: {
    n: '흡혈귀', max: 4, deck: rpt({ bite: 3, bspear: 3, bats: 2, mist: 2, feast: 2 }),
    tag: '피로 값을 치르고 피로 돌려받는다',
    pas: ['피의 대가', '마나가 모자란 카드를 체력 1을 내고 쓸 수 있다. 턴마다 한 번, 체력이 2 이상일 때'],
    act: ['박쥐 변신', '체력 1을 내고 이번 턴 원하는 칸으로 날아간다. 체력이 2 이상일 때'],
    ab: { cost: 0, slot: false, label: '체력 1' },
  },
  hunter: {
    n: '사냥꾼', max: 5, deck: rpt({ arrow: 4, noose: 2, drive: 2, ambush: 2, volley: 2 }),
    tag: '발자국을 읽고 길목을 지킨다',
    pas: ['길목', '상대가 표식 칸에서 이동을 마치면 이번 턴과 다음 턴 내 공격 피해 +1. 그 표식은 사라진다'],
    act: ['표식', '마나 1. 상대가 지금 서 있는 칸에 표식을 찍는다(최대 2, 보임). 상대가 그대로 머물면 바로 걸린다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
  grave: {
    n: '묘지기', max: 5, deck: rpt({ pickaxe: 3, wisp: 3, coffin: 2, ghand: 2, quake: 2 }),
    tag: '무너진 땅이 곧 내 집',
    pas: ['익숙한 폐허', '무너진 칸에서 턴을 마쳐도 피해를 받지 않는다'],
    act: ['삽질', '마나 2, 행동 소모. 고른 칸에 금을 낸다. 다음 턴 끝에 양쪽 진영에서 그 칸이 무너진다. 판마다 5번'],
    ab: { cost: 2, slot: true, tg: 'cell', label: '마나 2' },
  },
});
Object.assign(CARDS, {
  // 거울술사
  shard:   { n: '거울 파편',   t: 'atk', c: 1, dmg: 1, d: '내가 선 칸과 같은 칸, 그리고 좌우로 뒤집은 칸 즉발, 피해 1. 가운데 줄에 서면 겹쳐서 피해 2' },
  twin:    { n: '쌍둥이 섬광', t: 'atk', c: 2, tg: 'col', dmg: 1, d: '고른 세로줄과 좌우 대칭 줄 즉발, 피해 1. 가운데 줄을 고르면 겹쳐서 피해 2' },
  copycat: { n: '본뜨기',      t: 'sp',  c: 1, d: '이번 턴 받는 피해 -1. 상대가 낸 공격 카드를 거울에 담는다. 다음 되비추기는 그 카드를 마나 없이 쓴다(비용 제한 없음)' },
  flip:    { n: '뒤집힌 방',   t: 'sp',  c: 1, d: '이동이 끝난 뒤 상대를 좌우 대칭 칸으로 옮긴다. 그다음 공격 판정' },
  kaleido: { n: '만화경',      t: 'atk', c: 3, dmg: 2, delay: 1, d: '내가 선 칸과 그 상하·좌우·대각 대칭 칸. 다음 턴 폭발, 피해 2. 칸이 겹쳐 줄어들면 피해 3' },
  // 시간술사
  tick:    { n: '초침',        t: 'atk', c: 1, tg: 'cell', dmg: 2, d: '고른 칸 즉발, 피해 2' },
  minute:  { n: '분침',        t: 'atk', c: 2, tg: 'col', dmg: 1, d: '세로 한 줄 즉발, 피해 1' },
  hour:    { n: '시침',        t: 'atk', c: 3, tg: 'row', dmg: 3, delay: 1, d: '가로 한 줄. 다음 턴 폭발, 피해 3' },
  halt:    { n: '정지',        t: 'sp',  c: 1, d: '이번 턴 상대의 이동을 무효로 한다. 상대는 제자리 마나도 얻지 못한다' },
  bell:    { n: '대종',        t: 'atk', c: 3, dmg: 2, d: '상대가 지난 두 턴을 마친 칸 전부 즉발, 피해 2' },
});
Object.assign(CLS, {
  mirror: {
    n: '거울술사', max: 5, deck: rpt({ shard: 3, twin: 3, copycat: 2, flip: 2, kaleido: 2 }),
    tag: '상대의 수를 비춰 되돌린다',
    pas: ['반사광', '대칭 공격의 범위가 겹쳐 줄어들면 피해 +1. 가운데 세로줄이 겹치는 자리다'],
    act: ['되비추기', '그 카드의 비용만큼 마나, 행동 소모. 상대가 지난 턴에 낸 공격 카드(마나 3 이하)를 그대로 쓴다'],
    ab: { cost: 0, slot: true, label: '카드 비용' },
  },
  chrono: {
    n: '시간술사', max: 5, deck: rpt({ tick: 3, minute: 3, hour: 2, halt: 2, bell: 2 }),
    tag: '한 턴 전으로, 한 턴 뒤로',
    pas: ['메아리', '내 즉발 공격은 다음 턴에 같은 자리에서 피해 1로 한 번 더 울린다'],
    act: ['되감기', '마나 2. 지난 턴을 시작한 칸으로 돌아간다. 지난 턴에 체력을 잃었다면 체력 +1. 쓰고 나면 3턴 뒤에 다시 쓸 수 있다'],
    ab: { cost: 2, slot: false, label: '마나 2' },
  },
});
/* ===== 3차 추가 직업: 격투가, 잔디깎이, 바니걸 ===== */
Object.assign(CARDS, {
  // 격투가: 내가 선 가로줄이 곧 '정면'. 상대 진영의 같은 줄을 때린다
  jab:      { n: '잽',          t: 'atk', c: 1, tg: 'col', dmg: 1, d: '정면(내가 선 가로줄)에서 고른 세로줄의 칸 하나에 즉발, 피해 1' },
  straight: { n: '스트레이트',  t: 'atk', c: 2, dmg: 1, d: '정면(내가 선 가로줄) 3칸 즉발, 피해 1' },
  upper:    { n: '어퍼컷',      t: 'atk', c: 3, tg: 'cell', dmg: 2, d: '고른 칸과 바로 위 칸 즉발, 피해 2. 맞으면 띄워져 다음 턴 기본 이동 불가' },
  kick:     { n: '돌려차기',    t: 'atk', c: 3, tg: 'col', dmg: 2, d: '세로 한 줄 즉발, 피해 2' },
  counter:  { n: '카운터 자세', t: 'sp',  c: 1, d: '이번 턴 받는 피해 -1. 이번 턴 공격을 맞아도 콤보가 끊기지 않고 +1' },
  // 잔디깎이: 이번 턴 지나간 길이 상대 진영의 공격 범위
  blade:    { n: '칼날 회전',   t: 'atk', c: 1, dmg: 1, d: '이번 턴 지나간 길(출발 칸 포함)과 같은 상대 칸 즉발, 피해 1' },
  curve:    { n: '급커브',      t: 'move', c: 0, d: 'ㄱ자로 꺾어 대각 1칸 이동. 속도 +2' },
  clump:    { n: '잔디 뭉치',   t: 'sp',  c: 2, d: '이번 턴 지나간 길과 같은 상대 칸에 잔디가 쌓여, 다음 턴 상대가 들어갈 수 없다' },
  pebble:   { n: '돌 튕기기',   t: 'atk', c: 1, dmg: 1, d: '내 칸과 같은 상대 칸, 그 대각선 칸 즉발, 피해 1' },
  tune:     { n: '정비',        t: 'sp',  c: 1, d: '연료 +2. 이번 턴 제자리에 머물러도 속도를 잃지 않는다' },
  // 바니걸
  tray:     { n: '쟁반 던지기', t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 맞히면 쟁반이 되돌아와 마나 +1. 빗나가면 쟁반이 그 칸에 남는다(최대 2). 내 진영의 같은 칸으로 이동하면 쟁반이 깨지며 그 칸과 상하좌우에 피해 1' },
  cocktail: { n: '칵테일 서빙', t: 'sp',  c: 1, tg: 'cell', trap: 1, d: '상대 칸에 잔을 놓는다(최대 2, 보임). 상대가 그 칸에서 이동을 마치면 마나 +1을 얻지만, 다음 턴 내 공격 피해 +1' },
  heel:     { n: '하이힐 킥',   t: 'atk', c: 2, dmg: 1, d: '내 칸과 같은 상대 칸, 그 상하좌우 즉발, 피해 1. 이번 턴 깡충 뛰었다면 피해 2' },
  backstep: { n: '백스텝',      t: 'move', c: 0, d: '지난 턴을 시작한 칸으로 깡충. 이번 턴 받는 피해 -1' },
  show:     { n: '쇼타임',      t: 'atk', c: 3, dmg: 2, d: '놓아 둔 잔이 있는 칸과 그 상하좌우 즉발, 피해 2. 잔은 모두 깨진다' },
});
Object.assign(CLS, {
  brawler: {
    n: '격투가', max: 5, deck: rpt({ jab: 3, straight: 3, upper: 2, kick: 2, counter: 2 }),
    tag: '서는 줄이 곧 주먹이 닿는 줄',
    pas: ['연타', '즉발 공격이 맞은 턴마다 콤보 +1 (최대 3). 콤보 1 이상이면 공격 카드 비용 -1, 콤보 3이면 공격 피해 +1. 맞히지 못한 턴에 콤보는 0'],
    act: ['잡기', '마나 2, 행동 소모. 상대가 이번 턴 제자리에 머물렀거나 방어 계열 카드를 냈다면 정면(내가 선 가로줄)으로 끌어와 피해 2, 방어·받아넘기기를 무시한다. 상대가 움직였다면 헛손질로 다음 턴 기본 이동 불가'],
    ab: { cost: 2, slot: true, label: '마나 2' },
  },
  mower: {
    n: '잔디깎이', max: 5, deck: rpt({ blade: 4, curve: 3, clump: 2, pebble: 2, tune: 1 }),
    tag: '지나간 길이 곧 칼날이 지나간 길',
    pas: ['관성', '움직인 턴마다 속도 +1 (최대 3). 속도 2 이상이면 공격 피해 +1. 제자리에 머물면 속도가 0이 된다. 처음 밟는 내 칸마다 연료 +1 (최대 3)'],
    act: ['풀가동', '연료 2, 행동 소모. 고른 방향으로 막힐 때까지 직진한다. 지나간 모든 칸과 같은 상대 칸에 즉발 피해 1'],
    ab: { cost: 0, slot: true, label: '연료 2' },
  },
  bunny: {
    n: '바니걸', max: 5, deck: rpt({ tray: 4, cocktail: 2, heel: 3, backstep: 2, show: 1 }),
    tag: '깡충 피하고, 윙크로 비껴 내고',
    pas: ['깡충', '기본 이동으로 직선 2칸을 뛸 수 있다. 2칸 이상 움직인 턴에는 지뢰·덤불·올가미·무너진 칸을 밟지 않는다'],
    act: ['윙크', '마나 1, 카드와 함께 사용. 이번 턴 상대의 즉발 공격 카드가 내 칸을 덮으면, 그 범위가 내 칸을 비껴가도록 한 칸 밀린다. 쓰고 나면 3턴 뒤에 다시 쓸 수 있다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
});
/* ===== 4차 추가 직업: 연금술사 ===== */
Object.assign(CARDS, {
  acid:     { n: '산성 투척',     t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 그 칸에 산성 웅덩이가 남아, 다음 턴 이동을 마친 상대가 그 칸에 있으면 피해 1(웅덩이는 하나만)' },
  flask:    { n: '폭발 플라스크', t: 'atk', c: 2, tg: 'sq', dmg: 1, d: '2×2 영역 즉발, 피해 1. 정수가 있으면 1개를 써서 피해 2' },
  philo:    { n: '현자의 돌',     t: 'atk', c: 3, tg: 'cell', dmg: 0, d: '정수를 모두 쓴다. 고른 칸과 상하좌우 즉발, 피해 = 쓴 정수 수(최대 3). 정수가 없으면 낼 수 없다' },
  antidote: { n: '해독제',       t: 'sp',  c: 1, d: '체력 +1. 턴이 끝날 때 다음 턴에 걸린 속박·봉인과 칵테일 취기를 씻어 낸다' },
  catalyst: { n: '촉매',         t: 'sp',  c: 0, d: '정수 +2 (최대 3)' },
});
Object.assign(CLS, {
  alch: {
    n: '연금술사', max: 5, deck: rpt({ acid: 4, flask: 3, philo: 1, antidote: 2, catalyst: 2 }),
    tag: '끓이고, 모으고, 한 번에 쏟는다',
    pas: ['증류', '행동 카드를 내지 않은 턴이 끝날 때 정수 +1 (최대 3). 정수는 폭발 플라스크·현자의 돌·변성에 쓴다'],
    act: ['변성', '정수 1, 카드와 함께 사용. 손패 1장을 같은 비용의 다른 직업 공격 카드(3장 중 택1)로 바꿔 이번 턴부터 쓸 수 있다. 쓰고 나면 원래 카드로 버려진다. 쓰고 나면 2턴 동안 다시 쓸 수 없다'],
    ab: { cost: 0, slot: false, label: '정수 1' },
  },
});
/* ===== 5차 추가 직업: 화가 ===== */
Object.assign(CARDS, {
  brush:  { n: '붓질',        t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 그 칸을 칠한다' },
  splash: { n: '물감 튀기기', t: 'atk', c: 2, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 그 칸을 칠하고, 상하좌우 중 안 칠한 칸 2곳에 물감이 튄다(무작위, 피해 없음)' },
  roller: { n: '롤러',        t: 'atk', c: 2, tg: 'row', dmg: 1, d: '가로 한 줄 즉발, 피해 1. 줄 전체를 칠한다' },
  sketch: { n: '밑그림',      t: 'sp',  c: 0, tg: 'cell', d: '피해 없이 고른 칸을 칠한다' },
  magnum: { n: '명작',        t: 'atk', c: 3, dmg: 0, d: '칠한 칸 전부 즉발. 피해는 칠한 칸 1~3칸이면 1, 4~6칸이면 2, 7칸 이상이면 3. 물감은 모두 지워진다. 칠한 칸이 없으면 낼 수 없다' },
});
Object.assign(CLS, {
  painter: {
    n: '화가', max: 5, deck: rpt({ brush: 4, splash: 3, roller: 2, sketch: 2, magnum: 1 }),
    tag: '빗나가도 칠은 남는다',
    pas: ['완성', '내 카드가 닿은 상대 칸에 물감이 남는다(빗나가도). 가로·세로·대각 한 줄이 다 칠해지면 그 줄이 바로 터져 피해 1, 그 줄의 물감은 지워진다'],
    act: ['물들이기', '마나 1, 공격 카드와 함께 사용. 그 공격이 상대를 맞히면 상대가 2턴 동안 물든다. 물든 상대가 스스로 지나가거나 멈춘 칸은 칠해진다. 쓰고 나면 2턴 동안 다시 쓸 수 없다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
});
/* 화가: 가로·세로·대각 8줄. 다 칠해진 줄을 돌려준다 */
const PAINT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const paintDone = paint => PAINT_LINES.filter(l => l.every(c => paint.includes(c)));
const magnumDmg = n => (n >= 7 ? 3 : n >= 4 ? 2 : n >= 1 ? 1 : 0);
function addPaint(p, cells) { p.paint = uniq([...(p.paint || []), ...cells.filter(isCell)]); }
/* ===== 6차 추가 직업: 매조련사(목동과 매) ===== */
Object.assign(CARDS, {
  release:  { n: '풀어놓기',   t: 'sp',  c: 1, tg: 'cell', d: '이동 전에 매를 상대 진영 고른 칸에 앉힌다(체력 2). 이미 있으면 그 칸으로 옮기고 체력을 2로 되돌린다' },
  staff:    { n: '지팡이 치기', t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1. 고른 칸이 매와 같은 가로·세로줄이면 피해 2' },
  encircle: { n: '포위',       t: 'atk', c: 2, dmg: 1, d: '추격이 끝난 매 칸의 상하좌우 즉발, 피해 1. 매가 없으면 낼 수 없다' },
  treat:    { n: '간식',       t: 'sp',  c: 0, d: '매 체력 +1(최대 3), 이번 턴 매가 두 칸 쫓아간다. 매가 없으면 내 칸과 같은 상대 칸에 체력 1로 부른다' },
  stoop:    { n: '급강하',     t: 'atk', c: 3, dmg: 2, d: '추격이 끝난 매 칸의 가로·세로줄 전체(십자) 즉발, 피해 2. 매 체력 -1. 매가 없으면 낼 수 없다' },
});
Object.assign(CLS, {
  tamer: {
    n: '매조련사', max: 5, deck: rpt({ release: 2, staff: 4, encircle: 3, treat: 2, stoop: 1 }),
    tag: '매가 몰고, 지팡이가 기다린다',
    pas: ['사냥 본능', '매가 앉은 상대 칸으로는 상대가 들어갈 수 없다. 이동이 끝나면 매가 상대 쪽으로 한 칸 다가가고, 붙어 있으면 발톱으로 피해 1(매 체력 -1, 0이면 날아간다)'],
    act: ['휘파람', '마나 1, 카드와 함께 사용. 상대가 움직이기 전에 매를 2칸 이내의 고른 칸으로 부른다. 상대가 그 칸으로 가려 했다면 제자리에 멈추고 바로 할퀴인다(매 체력 소모 없음). 그 턴엔 추격하지 않는다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
});
const HAWK_MAX = 3;
/* 상대 매조련사의 매가 앉은 내 진영 칸 */
const hawkOn = (s, k) => { const e = s.P[opp(k)] && s.P[opp(k)].hawk; return e ? e.c : null; };
/* 들어갈 수 없는 칸: 빙결·잔디·기둥 + 매 */
const blkOf = (s, k) => { const h = hawkOn(s, k); return h == null ? s.blk[k] : [...s.blk[k], h]; };
const mdist = (a, b) => Math.abs(R(a) - R(b)) + Math.abs(C(a) - C(b));
/* 매의 한 걸음: 상대 쪽으로 가로·세로 중 먼 쪽부터. 막힌 칸은 돌아가고, 붙으면 멈춘다 */
function hawkStep(s, k, at) {
  const q = s.P[opp(k)], tgt = q.pos; if (mdist(at, tgt) <= 1) return at;
  const dr = Math.sign(R(tgt) - R(at)), dc = Math.sign(C(tgt) - C(at)), byR = Math.abs(R(tgt) - R(at)) >= Math.abs(C(tgt) - C(at));
  const tries = (byR ? [[dr, 0], [0, dc]] : [[0, dc], [dr, 0]]).filter(([a, b]) => a || b);
  for (const [a, b] of tries) { const r = R(at) + a, c = C(at) + b, i = r * 3 + c; if (r >= 0 && r <= 2 && c >= 0 && c <= 2 && !s.blk[opp(k)].includes(i)) return i; }
  return at;
}
const hawkCross = c => uniq([...rowOf(R(c)), ...colOf(C(c))]);
const ESS_MAX = 3;
/* 변성: 이 카드와 비용이 같은 다른 직업의 공격 카드들. 직업 고유 자원에 기대는 카드(되비추기 금지 목록)는 뺀다 */
function tmPool(id) {
  const c = CARDS[id]; if (!c || c.relic) return [];
  const own = CLS.alch.deck, out = new Set();
  for (const k of CLASS_IDS) if (k !== 'alch') for (const x of CLS[k].deck) if (!own.includes(x) && x !== 'quake' && echoOk(x) && CARDS[x].c === c.c) out.add(x);
  return [...out].sort();
}
/* 변성 후보 3장: 판마다 정해지는 씨앗 + 턴 + 자리 + 손패 칸 + 카드로 정해진다. 다시 열거나 새로고침해도 같고, 방장도 같은 3장만 받아 준다 */
function tmChoices(s, k, i, id) {
  let h = (s.seed || 0) ^ (s.turn * 2654435761) ^ ((k === 'a' ? 1 : 2) * 40503) ^ (i * 97); for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const a = tmPool(id); for (let j = a.length - 1; j > 0; j--) { const q = Math.floor(rnd() * (j + 1)); [a[j], a[q]] = [a[q], a[j]]; }
  return a.slice(0, 3);
}
/* 손패의 변성된 카드가 버려질 때 원래 카드로 되돌린다 */
function tmOrig(p, id) { const m = p.tmap || [], i = m.findIndex(e => e[0] === id); if (i < 0) return id; const o = m[i][1]; m.splice(i, 1); return o; }
function tmOk(s, k, tm) {
  const p = s.P[k];
  return p.cls === 'alch' && !!tm && Number.isInteger(tm.i) && p.hand[tm.i] != null && (p.ess || 0) >= 1 && s.turn >= (p.tmCd || 0) && p.silenced !== s.turn && tmChoices(s, k, tm.i, p.hand[tm.i]).includes(tm.to);
}
/* 지나간 길: 직선이면 사이 칸 전부, 대각이면 가로 먼저 꺾은 모서리 칸 */
function pathCells(a, b) {
  if (a === b) return [a];
  const dr = R(b) - R(a), dc = C(b) - C(a);
  if (!dr || !dc) { const n = Math.abs(dr || dc), sr = Math.sign(dr), sc = Math.sign(dc), out = []; for (let i = 0; i <= n; i++) out.push((R(a) + sr * i) * 3 + C(a) + sc * i); return out; }
  if (Math.abs(dr) === 1 && Math.abs(dc) === 1) return [a, R(a) * 3 + C(b), b];
  return [a, b];
}
/* 풀가동: 네 방향으로 막힐 때까지 간 끝 칸 */
function rushDests(s, k) {
  const BK = blkOf(s, k), p = s.P[k]; if (p.rooted === s.turn) return [];
  const out = [];
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    let r = R(p.pos), c = C(p.pos);
    for (;;) { const r1 = r + dr, c1 = c + dc; if (r1 < 0 || r1 > 2 || c1 < 0 || c1 > 2 || BK.includes(r1 * 3 + c1)) break; r = r1; c = c1; }
    if (r * 3 + c !== p.pos) out.push(r * 3 + c);
  }
  return out;
}
/* 윙크: 내 칸을 덮는 범위를 한 칸 밀어 비껴가게 한다. 남는 칸이 가장 많은 쪽, 같으면 위·아래·왼쪽·오른쪽 순 */
function winkShift(cells, pos) {
  if (!cells.includes(pos)) return cells;
  let best = null;
  for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const out = cells.map(i => [R(i) + dr, C(i) + dc]).filter(([r, c]) => r >= 0 && r <= 2 && c >= 0 && c <= 2).map(([r, c]) => r * 3 + c);
    if (out.includes(pos)) continue;
    if (!best || out.length > best.length) best = out;
  }
  return best || cells;
}
/* 격투가: 콤보가 있으면 공격 카드 비용 -1 */
const cardCost = (p, id) => Math.max(0, CARDS[id].c - (p && p.cls === 'brawler' && (p.combo || 0) >= 1 && CARDS[id].t === 'atk' ? 1 : 0));
/* 되비추기로 쓸 수 없는 카드: 이동이 붙은 카드와 직업 고유 자원에 기대는 카드 */
const ECHO_X = ['nova', 'blackhole', 'mimic', 'pop', 'crow', 'volley', 'show', 'philo', 'magnum', 'encircle', 'stoop'];
const MIR = i => R(i) * 3 + 2 - C(i);
function echoOk(id, cap) { const c = CARDS[id]; return !!c && c.t === 'atk' && !c.mv && !ECHO_X.includes(id) && (cap == null || c.c <= cap); }
/* 거울술사가 지금 되비출 카드. 담아 둔 카드가 먼저고, 없으면 상대가 지난 턴에 낸 마나 3 이하 공격 카드 */
function mirrorCopy(s, k) {
  const p = s.P[k]; if (p.stash && echoOk(p.stash)) return p.stash;
  const h = (s.hist || [])[(s.hist || []).length - 1]; if (!h || h.t !== s.turn - 1) return null;
  const id = h[opp(k)].act; return echoOk(id, 3) ? id : null;
}
Object.assign(CLS.mage, {
  act: ['마력 방출', '남은 마나를 전부 쓴다(2 이상), 행동 소모. 고른 칸에 즉발 피해: 쓴 마나의 절반(내림). 4 이상 썼다면 상하좌우에도 피해 1'],
  ab: { cost: 0, slot: true, tg: 'cell', label: '마나 전부' },
});
const WX_NAME = { storm: '뇌우', snow: '눈보라', heatw: '폭염' };
/* 결투장 규칙과 축복의 칸 */
const ARENA_RULE = { castle: '특별한 규칙이 없습니다.', snow: '기본 이동은 막힐 때까지 한 칸 더 미끄러집니다.', forest: '나무 칸에 서면 받는 피해 -1. 나무는 4턴마다 자리를 옮깁니다.', desert: '3턴마다 모래폭풍이 한 줄을 휩씁니다. 그 줄에 서 있으면 바람 끝 칸까지 밀려납니다.' };
const BLESS = { hp: ['체력', '체력 +1'], pow: ['강화', '다음 공격 피해 +1'], mana: ['마나', '마나 가득'] };
const sandLine = (w, i) => !!w && (w.o === 'r' ? R(i) : C(i)) === w.i;
const sandArrow = w => (w.o === 'r' ? (w.dir > 0 ? '→' : '←') : (w.dir > 0 ? '↓' : '↑'));
/* 모험의 보스: 관리자. 고를 수 없는 직업(boss)이라 직업 목록에서 빠진다.
   매 막의 끝에서 기다리고, 막이 오를수록 덱에 더 강하고 까다로운 시스템 카드가 들어온다(ADMIN_TIER) */
Object.assign(CLS, {
  admin: {
    n: '관리자', max: 5, boss: true, deck: rpt({ click: 3, drag: 4, firewall: 1, popup: 2 }),
    tag: '포인터로 끌어서 고르고, 지우고, 멈춘다',
    pas: ['관리자 권한', '모험의 매 막 끝에서 기다린다. 막이 오를수록 덱에 더 강하고 까다로운 시스템 카드가 들어온다'],
    act: ['새로 고침', '마나 1, 카드와 함께 사용. 턴이 끝날 때 남은 손패를 모두 버리고 4장을 새로 뽑는다'],
    ab: { cost: 1, slot: false, label: '마나 1' },
  },
});
Object.assign(CARDS, {
  click:    { n: '클릭',       t: 'atk', c: 1, tg: 'cell', dmg: 1, d: '고른 칸 즉발, 피해 1' },
  drag:     { n: '드래그',     t: 'atk', c: 2, tg: 'sq',   dmg: 1, d: '2×2 영역을 끌어서 고른다. 즉발, 피해 1' },
  firewall: { n: '방화벽',     t: 'sp',  c: 2, d: '이번 턴 받는 피해 -2' },
  popup:    { n: '팝업 창',    t: 'sp',  c: 1, tg: 'two', d: '상대 진영 2칸에 오류 창을 띄운다. 그 칸은 다음 턴 진입 불가' },
  del:      { n: '삭제',       t: 'atk', c: 3, tg: 'row',  dmg: 2, d: '가로 한 줄을 골라 지운다. 즉발, 피해 2' },
  loading:  { n: '로딩',       t: 'atk', c: 2, tg: 'col',  dmg: 2, delay: 1, d: '세로 한 줄에 진행 막대를 띄운다. 다음 턴 다 차면 피해 2' },
  lag:      { n: '렉',         t: 'sp',  c: 2, d: '상대는 다음 턴 기본 이동을 할 수 없다' },
  bsod:     { n: '블루스크린', t: 'atk', c: 5, tg: 'line', dmg: 3, delay: 2, d: '고른 한 줄만 안전. 2턴 뒤 나머지 6칸 피해 3' },
  format:   { n: '포맷',       t: 'atk', c: 4, dmg: 1, d: '상대 진영 9칸 전체 즉발, 피해 1' },
});
/* 관리자 덱: 1막은 기본 덱, 2막과 3막은 더하고(extra) 뺀다(cut) */
const ADMIN_TIER = [{ extra: [], cut: [] }, { extra: ['del', 'del', 'loading', 'loading', 'lag', 'lag'], cut: ['click'] },
  { extra: ['del', 'del', 'loading', 'loading', 'lag', 'lag', 'bsod', 'bsod', 'format'], cut: ['click', 'click', 'popup'] }];
const ADMIN_NEW = [['click', 'drag', 'firewall', 'popup'], ['del', 'loading', 'lag'], ['bsod', 'format']];   /* 막마다 새로 들어오는 카드(안내용) */
const CLASS_IDS = Object.keys(CLS).filter(c => !CLS[c].boss);
/* 스킨 표는 tools/sprites.py build가 sprites/skins 시트에서 만든다 */
/* SKINS:BEGIN */ const SKINS = {"alch":[{"id":"color","n":"컬러","en":"Color","f":[15,9]}],"archaeologist":[{"id":"color","n":"컬러","en":"Color","f":[15,9]}],"astronomer":[{"id":"color","n":"컬러","en":"Color","f":[15,10]}],"balloon":[{"id":"color","n":"컬러","en":"Color","f":[16,10]}],"bard":[{"id":"color","n":"컬러","en":"Color","f":[16,8]}],"blacksmith":[{"id":"color","n":"컬러","en":"Color","f":[23,22],"sz":[48,48]}],"brawler":[{"id":"color","n":"컬러","en":"Color","f":[14,10]},{"id":"female","n":"격투가(♀)","en":"Brawler (F)","f":[16,7]}],"bunny":[{"id":"color","n":"컬러","en":"Color","f":[14,7]}],"chicken":[{"id":"color","n":"컬러","en":"Color","f":[16,13]}],"chrono":[{"id":"color","n":"컬러","en":"Color","f":[16,10]}],"clown":[{"id":"color","n":"컬러","en":"Color","f":[13,8]}],"druid":[{"id":"color","n":"컬러","en":"Color","f":[15,8]},{"id":"granny","n":"정원사 할머니","en":"Grandma Gardener","f":[23,23],"sz":[48,48]}],"dullahan":[{"id":"color","n":"컬러","en":"Color","f":[19,28],"sz":[48,48]}],"gambler":[{"id":"color","n":"컬러","en":"Color","f":[15,10]},{"id":"queen","n":"하트 퀸","en":"Queen of Hearts","f":[13,12],"px":2,"pr":800,"ac":["#e8244a","#9c1435"]}],"grave":[{"id":"color","n":"컬러","en":"Color","f":[15,10]}],"hunter":[{"id":"color","n":"컬러","en":"Color","f":[15,9]},{"id":"wolf","n":"서리 궁수","en":"Frost Archer","f":[15,17],"px":2,"pr":800,"ac":["#5f9db4","#3d6f82"]}],"mage":[{"id":"color","n":"컬러","en":"Color","f":[16,7]}],"mechanic":[{"id":"color","n":"컬러","en":"Color","f":[14,9]}],"merfolk":[{"id":"color","n":"컬러","en":"Color","f":[15,8]}],"mirror":[{"id":"color","n":"컬러","en":"Color","f":[16,10]}],"mower":[{"id":"color","n":"컬러","en":"Color","f":[7,10]}],"onmyoji":[{"id":"chess","n":"체스기사","en":"Chess Knight","f":[24,22],"sz":[48,48],"pr":800,"ac":["#6d74e0","#464ca8"]},{"id":"color","n":"컬러","en":"Color","f":[14,8]}],"painter":[{"id":"color","n":"컬러","en":"Color","f":[15,9]},{"id":"graffiti","n":"그래피티","en":"Graffiti","f":[22,25],"sz":[48,48]}],"samurai":[{"id":"color","n":"컬러","en":"Color","f":[14,9]},{"id":"cowboy","n":"카우보이","en":"Cowboy","f":[23,24],"sz":[48,48]}],"scarecrow":[{"id":"color","n":"컬러","en":"Color","f":[15,8]},{"id":"reaper","n":"사신","en":"Reaper","f":[23,26],"sz":[48,48]}],"shaman":[{"id":"caster","n":"기상캐스터","en":"Weather Caster","f":[22,25],"sz":[48,48]},{"id":"color","n":"컬러","en":"Color","f":[15,8]}],"slime":[{"id":"color","n":"컬러","en":"Color","f":[15,17]},{"id":"pudding","n":"푸딩","en":"Pudding","f":[27,37],"sz":[48,48]}],"statue":[{"id":"color","n":"컬러","en":"Color","f":[14,10]}],"tamer":[{"id":"color","n":"컬러","en":"Color","f":[16,9]},{"id":"drone","n":"드론 조종사","en":"Drone Pilot","f":[24,21],"sz":[48,48]}],"vampire":[{"id":"color","n":"컬러","en":"Color","f":[14,10]}]}; const SKIN_FACE = {"admin":[15,14],"alch":[14,8],"archaeologist":[18,12],"astronomer":[17,8],"balloon":[16,10],"bard":[17,8],"blacksmith":[19,11],"brawler":[15,8],"bunny":[16,6],"chicken":[18,9],"chrono":[19,7],"clown":[16,9],"druid":[17,8],"dullahan":[21,9],"gambler":[16,9],"grave":[17,9],"hunter":[14,7],"mage":[18,9],"mechanic":[17,9],"merfolk":[17,7],"mirror":[18,9],"mower":[10,10],"onmyoji":[16,6],"painter":[16,8],"samurai":[14,12],"scarecrow":[17,6],"shaman":[18,7],"slime":[16,17],"statue":[16,12],"tamer":[15,6],"vampire":[16,8]}; const BASE_SZ = {}; /* SKINS:END */
/* 스킨: 직업마다 고른 모습. 고른 것은 이 기기에 저장하고, 결투에서는 doc.skin[자리]로 상대에게도 같은 모습이 보인다 */
const skinList = c => SKINS[c] || [];
function skinOf(c) { let v = ''; try { v = (JSON.parse(localStorage.getItem('ssd-skins') || '{}') || {})[c] || ''; } catch (e) { /* 저장소 없음 */ } return skinList(c).some(x => x.id === v) && skinOwned(c, v) ? v : ''; }
/* 계정 머니: 메달. 모험 클리어율과 대전 승패로 받고, 상점에서 스킨을 산다 */
const SKIN_PRICE = 300;   /* 기본 가격. 스킨마다 다르면 skins.json의 "price" */
const skinPrice = (c, id) => { const x = id && skinList(c).find(s => s.id === id); return (x && x.pr) || SKIN_PRICE; };
/* 메달과 보유 스킨은 서버(Supabase)만 바꾼다. 여기서는 받아 온 값을 보여 주기만 한다 */
const medals = () => (typeof AUTH !== 'undefined' && AUTH.wallet != null ? AUTH.wallet : 0);
const ownedSkins = () => (typeof AUTH !== 'undefined' && AUTH.owned ? AUTH.owned : []);
const skinOwned = (c, id) => !id || ownedSkins().includes(c + ':' + id);
const MDL = n => `<span class="mdl-n"><i class="mdl" aria-hidden="true"></i>${n}</span>`;
/* 다이아: 스팀 결제로 충전하는 유료 재화(supabase/diamonds.sql). 모든 스킨을 살 수 있고, 전설 스킨은 다이아로만 판다.
   유료분(paid)과 보너스·지급분(free)을 서버가 따로 세고, 쓸 때는 free부터 쓴다 */
const skinLegend = (c, id) => { const x = id && skinList(c).find(s => s.id === id); return !!(x && x.lg); };
/* 다이아 가격: 표에 있으면 그 값, 전설 1200, 나머지는 메달 가격 ÷ 3을 10단위로 올림. supabase/skin_prices.sql의 _skin_dia와 같아야 한다 */
const skinDia = (c, id) => { const x = id && skinList(c).find(s => s.id === id); return (x && x.dp) || (x && x.lg ? 1200 : Math.ceil(skinPrice(c, id) / 30) * 10); };
const dias = () => (typeof AUTH !== 'undefined' && AUTH.dia ? Math.max(0, AUTH.dia.paid) + AUTH.dia.free : 0);
const DIA = n => `<span class="dia-n"><i class="dia" aria-hidden="true"></i>${n}</span>`;
async function buySkinDia(c, id) {
  if (!AUTH.user) return 'login'; if (skinOwned(c, id)) return 'own'; if (dias() < skinDia(c, id)) return 'poor';
  try { AUTH.dia = await rpc('buy_skin_dia', { p_cls: c, p_skin: id }); AUTH.owned = [...ownedSkins(), c + ':' + id]; return 'ok'; }
  catch (e) { await walletPull().catch(() => {}); return /poor/.test(e.message) ? 'poor' : /owned/.test(e.message) ? 'own' : e.net ? 'net' : 'err'; }
}
async function buySkin(c, id) {
  if (!AUTH.user) return 'login'; if (skinOwned(c, id)) return 'own'; if (skinLegend(c, id)) return 'dia'; if (medals() < skinPrice(c, id)) return 'poor';
  try { AUTH.wallet = await rpc('buy_skin', { p_cls: c, p_skin: id }); AUTH.owned = [...ownedSkins(), c + ':' + id]; return 'ok'; }
  catch (e) { await walletPull().catch(() => {}); return /poor/.test(e.message) ? 'poor' : /owned/.test(e.message) ? 'own' : e.net ? 'net' : 'err'; }
}
/* 마우스를 올리면 떠오르는 버튼: :hover로 띄우면 가장자리에서 '떠오름 → 커서가 버튼 밖 → 내려앉음 → 다시 떠오름'이 되풀이된다.
   그래서 .hov 클래스로 띄우고, 처음 들어온 자리(떠오르기 전 상자)를 벗어날 때만 내린다. 터치는 건드리지 않는다 */
const LIFT = '.perk, .mbtn, .ptag, .scopt, .abb.ok, .mi, .lb-prof, .lb-tile, .lb-quick, .lb-cont, .lb-dk, .lb-qst, .pmc, .pcl-c, .ps-it, .pk-sk, .pk-roster .face, .pick2 > .gate-top .btn, .pick2 .detail > .d-go .btn.big, .rm-m';
/* 마우스를 움직이는 동안에도 흔들리지 않게:
   - 떠오른 버튼의 안쪽 요소나 바깥 상자(둘 다 LIFT)로 옮겨 가도, 처음 상자 안이면 지금 버튼을 그대로 둔다
   - 화면이 다시 그려져 버튼이 새로 만들어지면, 커서 아래의 새 버튼을 애니메이션 없이 곧바로 띄운 상태로 둔다 */
let hovEl = null, hovBox = null, hovXY = null;
const hovOff = () => { if (hovEl) hovEl.classList.remove('hov'); hovEl = hovBox = null; };
const hovIn = (x, y) => hovBox && x >= hovBox.l && x <= hovBox.r && y >= hovBox.t && y <= hovBox.b;
function hovSet(t, instant) {
  const keep = hovBox; hovOff(); const r = t.getBoundingClientRect(); hovEl = t; hovBox = instant && keep ? keep : { l: r.left - 1, r: r.right + 1, t: r.top - 1, b: r.bottom + 1 };
  if (instant) { t.style.transition = 'none'; t.classList.add('hov'); void t.offsetWidth; requestAnimationFrame(() => { t.style.transition = ''; }); } else t.classList.add('hov');
}
document.addEventListener('pointermove', e => {
  if (e.pointerType && e.pointerType !== 'mouse') return;
  hovXY = [e.clientX, e.clientY];
  const t = e.target.closest && e.target.closest(LIFT);
  if (t && t !== hovEl) {
    if (hovEl && hovEl.isConnected && (hovEl.contains(t) || t.contains(hovEl)) && hovIn(e.clientX, e.clientY)) return;
    hovSet(t, !!hovEl && !hovEl.isConnected && hovIn(e.clientX, e.clientY)); return;
  }
  if (hovEl && !t && (!hovEl.isConnected || !hovIn(e.clientX, e.clientY))) hovOff();
}, { passive: true });
document.addEventListener('pointerout', e => { if (!e.relatedTarget) { hovOff(); hovXY = null; } });
/* 다시 그리기로 떠 있던 버튼이 사라지면, 같은 자리의 새 버튼을 바로 띄운다(내려앉았다 다시 뜨는 깜빡임 방지) */
new MutationObserver(() => { if (!hovEl || hovEl.isConnected || !hovXY || hovMO) return; hovMO = requestAnimationFrame(() => { hovMO = 0; if (!hovEl || hovEl.isConnected || !hovXY) return;
  const el = document.elementFromPoint(hovXY[0], hovXY[1]), t = el && el.closest && el.closest(LIFT); if (t && hovIn(hovXY[0], hovXY[1])) hovSet(t, true); else hovOff(); }); }).observe(document.body, { childList: true, subtree: true });
let hovMO = 0;
/* ===== 일일 퀘스트: 하루 세 개(★1·★2·★3), 다시 뽑기 하루 2번. 퀘스트·진행·보상은 서버가 정한다(economy.sql) =====
   여기서는 받아 온 것을 보여 주고, 판이 끝날 때 판 기록(QS)을 finish_* 요청에 실어 보낸다 */
const QDEF = {
  play: ['결투 {n}판 하기', 'Play {n} duels', 'all'], win: ['결투에서 {n}번 승리', 'Win {n} duels', 'all'],
  pvp: ['대전 {n}판 하기', 'Play {n} PvP matches', 'pvp'], pvpwin: ['대전에서 {n}번 승리', 'Win {n} PvP matches', 'pvp'],
  botlv: ['봇 연습 \'{p}\' 이상에서 {n}번 승리', 'Win {n} bot games on {p}+', 'bot'],
  dmg: ['결투에서 피해 {n} 주기', 'Deal {n} damage', 'all'], ab: ['직업 능력 {n}번 쓰기', 'Use your class ability {n} times', 'all'],
  atk: ['공격 카드 {n}장 쓰기', 'Play {n} attack cards', 'all'], sp: ['특수 카드 {n}장 쓰기', 'Play {n} special cards', 'all'], mv: ['이동 카드 {n}장 쓰기', 'Play {n} move cards', 'all'],
  fast: ['{p}턴 안에 승리', 'Win within {p} turns', 'all'], tough: ['받은 피해 {p} 이하로 승리', 'Win taking {p} damage or less', 'all'],
  cls: ['서로 다른 직업 {n}개로 결투하기', 'Duel with {n} different classes', 'all'],
  runnode: ['모험에서 {n}칸 나아가기', 'Advance {n} nodes in Adventure', 'run'], runelite: ['모험에서 정예·보스 {n}번 쓰러뜨리기', 'Defeat {n} elites or bosses in Adventure', 'run'],
  runclear: ['모험 완주하기', 'Clear an Adventure run', 'run'],
};
const QWHERE = { all: ['봇 연습 · 대전 · 모험 결투', 'Bot · PvP · Adventure'], pvp: ['랜덤 매칭 · 친구 대전', 'Random · Friendly'], bot: ['연습 대전', 'Practice'], run: ['모험 모드', 'Adventure'] };
let QUEST = null, qBusy = false, qPulling = null, qArm = -1;
function questPull() {
  if (typeof AUTH === 'undefined' || !AUTH.user) return Promise.resolve(); if (qPulling) return qPulling;
  qPulling = rpc('quest_get').then(v => { QUEST = v && Array.isArray(v.quests) ? v : null; }).catch(() => {}).then(() => { qPulling = null; if (!doc) render(); });
  return qPulling;
}
const qText = q => { const d = QDEF[q.qid] || ['?', '?'], p = q.qid === 'botlv' ? (BOTS[['easy', 'normal', 'hard'][q.param]] || BOTS.normal)[0] : q.param;
  return mE(d[0], d[1]).replace('{n}', q.target).replace('{p}', p); };
const qReady = () => (QUEST ? QUEST.quests.filter(q => !q.claimed && q.prog >= q.target).length : 0);
const qDone = () => (QUEST ? QUEST.quests.filter(q => q.claimed).length : 0);
function qLeft() { const ms = QUEST ? Date.parse(QUEST.reset) - Date.now() : 0; if (QUEST && ms <= 0) { setTimeout(questPull, 50); return mE('곧', 'soon'); }
  const h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60; return h ? mE(`${h}시간 ${m}분`, `${h}h ${m}m`) : mE(`${m}분`, `${m}m`); }
/* 퀘스트 목록: 로비 퀘스트 판(모바일)과 PC 홈 카드가 함께 쓴다 */
function questList() {
  if (!QUEST) return `<p class="cap qs-empty">${AUTH.user ? mE('퀘스트를 불러오는 중…', 'Loading quests…') : mE('로그인하면 일일 퀘스트를 받습니다', 'Log in for daily quests')}</p>`;
  const rr = QUEST.rerolls || 0;
  return `<ol class="qs">${QUEST.quests.map(q => { const ok = q.prog >= q.target, w = QWHERE[(QDEF[q.qid] || [])[2]] || QWHERE.all;
    const act = q.claimed ? `<span class="qs-got">${mE('받음', 'Claimed')}</span>`
      : ok ? `<button type="button" class="btn qs-claim" data-a="qclaim" data-s="${q.slot}">${mE('받기', 'Claim')}</button>`
      : rr > 0 ? `<button type="button" class="qs-roll${qArm === q.slot ? ' arm' : ''}" data-a="qroll" data-s="${q.slot}" title="${mE('다시 뽑기', 'Reroll')}" aria-label="${mE('다시 뽑기', 'Reroll')}${qArm === q.slot ? ' · ' + mE('진행이 사라집니다. 한 번 더 누르세요', 'progress resets; tap again') : ''}">${qArm === q.slot ? mE('바꾸기?', 'Sure?') : '↻'}</button>` : '';
    return `<li class="qs-it t${q.tier}${ok ? ' ok' : ''}${q.claimed ? ' got' : ''}"><span class="qs-st" aria-label="${mE('난이도', 'Tier')} ${q.tier}">${'★'.repeat(q.tier)}<i>${'★'.repeat(3 - q.tier)}</i></span>
      <span class="qs-tx"><b>${qText(q)}</b><small>${mE(w[0], w[1])}</small><span class="qs-pg"><span class="pf-bar"><i style="width:${Math.min(100, q.prog / q.target * 100)}%"></i></span><em>${Math.min(q.prog, q.target)}/${q.target}</em></span></span>
      <span class="qs-r">${MDL(q.reward)}${act}</span></li>`; }).join('')}</ol>`;
}
const qHead = () => (QUEST ? `<span class="qs-meta"><span>${mE('다시 뽑기', 'Rerolls')} <b>${QUEST.rerolls || 0}/2</b></span><span>${mE('초기화까지', 'Resets in')} <b>${qLeft()}</b></span></span>` : '');
function questBody() {
  return `<div class="qs-page"><div class="qs-top"><h3>${lbIc('quest')}${mE('오늘의 퀘스트', 'Today\'s Quests')}</h3>${qHead()}</div>${questList()}
    <p class="cap">${mE('매일 자정(한국 시간)에 새 퀘스트 세 개가 나옵니다. ↻ 로 같은 단계의 다른 퀘스트로 바꿀 수 있습니다(하루 2번, 진행은 처음부터). 진행은 판이 끝날 때 서버가 셉니다.', 'Three new quests every midnight (KST). ↻ swaps one for another of the same tier (twice a day, progress resets). Progress is counted by the server when a game ends.')}</p></div>`;
}
async function questAct(a, slot, b) {
  if (qBusy || !QUEST) return; const q = QUEST.quests.find(x => x.slot === slot); if (!q) return;
  if (a === 'qroll' && q.prog > 0 && qArm !== slot) { qArm = slot; SND.play('tap'); return render(); }
  qArm = -1; qBusy = true; if (b) b.disabled = true;
  try {
    if (a === 'qclaim') { AUTH.wallet = await rpc('quest_claim', { p_slot: slot }); q.claimed = true; SND.play('relicGood'); setTimeout(() => SND.play('coin'), 300); toast(mE(`퀘스트 보상 메달 ${q.reward}개`, `Quest reward: ${q.reward} medals`)); }
    else { const v = await rpc('quest_reroll', { p_slot: slot }); if (v && Array.isArray(v.quests)) QUEST = v; SND.play('flip'); }
  } catch (e) { toast(/no_reroll/.test(e.message) ? mE('오늘 다시 뽑기를 다 썼습니다', 'No rerolls left today') : /not_ready/.test(e.message) ? mE('아직 다 채우지 못했습니다', 'Not finished yet') : mE('잠시 후 다시 해 주세요', 'Please try again')); await questPull(); }
  qBusy = false; render();
}
/* 판 기록: 내 자리 기준으로 턴마다 더한다. 모험은 결투가 끝날 때마다 run.qs에 모았다가 모험이 끝날 때 보낸다 */
let QS = null;
function qsTrack(o, n) {
  if (!n || !seat || !n.P || !n.P[seat]) return;
  if (!QS || QS.gid !== (doc && doc.gid) || n.turn === 1) QS = { gid: doc && doc.gid, turns: 0, dmg: 0, taken: 0, ab: 0, atk: 0, sp: 0, mv: 0, cls: n.P[seat].cls };
  if (!o || !n.rp || n.turn !== o.turn + 1 || !o.P || !o.P[seat]) return;
  const k = seat, e = opp(seat), q = n.rp.P[k] || {}, t = q.actId && CARDS[q.actId] ? CARDS[q.actId].t : '';
  QS.turns++; QS.dmg += Math.max(0, o.P[e].hp - n.P[e].hp); QS.taken += Math.max(0, o.P[k].hp - n.P[k].hp);
  if (q.ab) QS.ab++; if (q.mvId) QS.mv++; if (t === 'atk') QS.atk++; else if (t === 'sp') QS.sp++; else if (t === 'move') QS.mv++;
}
const qsOut = () => (QS ? { turns: QS.turns, dmg: QS.dmg, taken: QS.taken, ab: QS.ab, atk: QS.atk, sp: QS.sp, mv: QS.mv, cls: QS.cls } : null);
function qsStage(g) {
  if (!stageOn() || !run || !QS || !g || !g.winner || run.qsg === doc.gid) return; run.qsg = doc.gid;
  const r = run.qs = run.qs || { fights: 0, wins: 0, elite: 0, turns: 0, dmg: 0, ab: 0, atk: 0, sp: 0, mv: 0 }, n = stCurNode();
  r.fights++; ['turns', 'dmg', 'ab', 'atk', 'sp', 'mv'].forEach(k => { r[k] += QS[k]; });
  if (g.winner === seat) { r.wins++; if (n && (n.t === 'elite' || n.t === 'boss')) r.elite++; r.ft = Math.min(r.ft || 999, QS.turns); r.lt = Math.min(r.lt == null ? 99 : r.lt, QS.taken); }
  stSave();
}
function setSkin(c, id) { try { const o = JSON.parse(localStorage.getItem('ssd-skins') || '{}') || {}; o[c] = id; localStorage.setItem('ssd-skins', JSON.stringify(o)); } catch (e) { /* 저장소 없음 */ } }
/* 닉네임: 각 자리가 결투 문서에 적어 둔다. 봇은 '봇', 모험의 내 자리는 계정 닉네임 */
const titleOf = k => (k === seat ? (typeof myTitle === 'function' ? myTitle() : '') : String(((doc && doc.title) || {})[k] || '').slice(0, 20));
function nickOf(k) { const n = doc && doc.nick && doc.nick[k]; if (n) return n; if (k === seat && typeof AUTH !== 'undefined' && AUTH.nick) return AUTH.nick; return doc && doc.seats && doc.seats[k] === 'bot' ? mE('봇', 'Bot') : ''; }
const skc = (c, id) => (id && skinList(c).some(x => x.id === id) ? ` sk-${c}-${id}` : '');
function skOf(k) {
  if (typeof G === 'undefined' || !G || !G.P[k]) return ''; const c = G.P[k].cls;
  let id = (doc && doc.skin && doc.skin[k]) || (k === 'a' && typeof run !== 'undefined' && run && doc && doc.mode === 'stage' ? run.skin : '') || '';
  if (!id && doc && doc.seats && doc.seats[k] === 'bot') { const ids = ['', ...skinList(c).map(x => x.id)]; let h = (G.seed || 0) + doc.gid * 31; for (const ch of c) h = (h * 33 + ch.charCodeAt(0)) >>> 0; id = ids[h % ids.length]; }   /* 봇: 판마다 정해진 무작위 스킨 */
  return skc(c, id);
}
const HP_MAX = 5, HAND = 4, COLLAPSE_FROM = 15, KI_MAX = 3, TRAP_MAX = 3;
const hpBase = cls => HP_MAX - (cls === 'dullahan' ? 1 : 0) + (cls === 'vampire' ? 1 : 0);
const hpMaxOf = p => p.hpMax || HP_MAX, manaMaxOf = p => CLS[p.cls].max + (p.mx || 0);
const R = i => Math.floor(i / 3), C = i => i % 3;
const opp = k => (k === 'a' ? 'b' : 'a');
const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const rowOf = r => [r * 3, r * 3 + 1, r * 3 + 2], colOf = c => [c, c + 3, c + 6];
const uniq = a => [...new Set(a)];
const around = i => ALL.filter(j => j === i || Math.abs(R(i) - R(j)) + Math.abs(C(i) - C(j)) === 1);
const beside = i => ALL.filter(j => R(i) === R(j) && Math.abs(C(i) - C(j)) <= 1);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
function weighted(tbl) { let x = Math.random() * tbl.reduce((s, e) => s + e[1], 0); for (const [id, w] of tbl) { x -= w; if (x < 0) return id; } return tbl[0][0]; }

/* opt(스테이지 모드): hp, hpMax, mana0, mx(최대 마나 추가), extra(덱에 더할 카드), boss('mid'|'final') 를 자리별로 줄 수 있다 */
function newGame(picks, opt) {
  opt = opt || {}; const ov = (f, k, d) => (opt[f] && opt[f][k] != null ? opt[f][k] : d);
  const P = {};
  for (const k of ['a', 'b']) {
    const cls = picks[k], deck = shuffle([...(CLS[cls].common || COMMON), ...CLS[cls].deck, ...ov('extra', k, [])]); ov('cut', k, []).forEach(id => { const ci = deck.indexOf(id); if (ci >= 0) deck.splice(ci, 1); });
    const rl = ov('rl', k, null), has = id => !!(rl && rl.includes(id));
    P[k] = { cls, hp: ov('hp', k, ov('hpMax', k, hpBase(cls))), hpMax: ov('hpMax', k, hpBase(cls)), mx: ov('mx', k, 0), boss: ov('boss', k, null), rl, mana: ov('mana0', k, 2), pos: 4, deck, hand: deck.splice(0, HAND + (has('satchel') ? 1 : 0)), disc: [], stance: false, ki: 0, marks: [], see: has('spyglass') ? 1 : 0,
      mines: [], turrets: [], brambles: [], rooted: 0, calm: 0, cd: 0, clone: null, dug: [], silenced: 0, weather: null, undead: false, rage: 0, pillars: [], stars: [], air: 0, seen: null, pot: 0, temper: {}, beat: 0, eggs: [], dive: false, tags: [], nooses: [], amb: 0, digs: 0, stash: null, prev: null, hurtLast: false, rwCd: 0, trail: [4], combo: 0, spd: 0, dir: null, fuel: 0, mowed: [4], cups: [], trays: [], winkCd: 0, drunk: 0, ess: 0, tmCd: 0, tmap: [], acid: null, paint: [], dyed: 0, dyeBy: null, dyeCd: 0, hawk: null };
    /* 미리 깔고 시작: 천문학자는 상대 진영 무작위 칸에 별 하나, 주술사는 3턴짜리 뇌우나 눈보라 하나 */
    if (cls === 'astronomer') P[k].stars = [pick(ALL)];
    if (cls === 'shaman') P[k].weather = { t: pick(['storm', 'snow']), i: pick([0, 1, 2]), dir: 1, left: 3, ext: false };
  }
  const arena = opt.arena || pick(['castle', 'snow', 'forest', 'desert']), spot = () => pick(ALL.filter(i => i !== 4));
  return { seed: Math.floor(Math.random() * 2147483647), arena, tree: arena === 'forest' ? { a: spot(), b: spot() } : null, sand: null, bless: null, crack: [], turn: 1, P, pend: [], blk: { a: [], b: [] }, well: { a: null, b: null }, col: [], warn: null, ev: [], fx: { a: [], b: [] }, winner: null, hist: [], st: { a: { atk: 0, hit: 0, best: 0, lost: 0 }, b: { atk: 0, hit: 0, best: 0, lost: 0 } } };
}

function legalDests(s, k, mvId, actId, bat) {
  const BK = blkOf(s, k), p = s.P[k], r = R(p.pos), c = C(p.pos), out = [];
  const rooted = p.rooted === s.turn;
  if (mvId === 'backstep') return p.prev != null && p.prev !== p.pos && !BK.includes(p.prev) ? [p.prev] : [];
  if (bat && p.cls === 'mower') return rushDests(s, k);
  if (s.arena === 'snow' && !p.dive && !mvId && !['dash', 'ride', 'bounce', 'jet'].includes(actId)) {
    const ds = [p.pos]; if (rooted) return ds;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const r1 = r + dr, c1 = c + dc; if (r1 < 0 || r1 > 2 || c1 < 0 || c1 > 2 || BK.includes(r1 * 3 + c1)) continue;
      const r2 = r1 + dr, c2 = c1 + dc, far = r2 >= 0 && r2 <= 2 && c2 >= 0 && c2 <= 2 && !BK.includes(r2 * 3 + c2);
      const i = far ? r2 * 3 + c2 : r1 * 3 + c1; if (!ds.includes(i)) ds.push(i);
    }
    return ds;
  }
  for (const i of ALL) {
    const dr = Math.abs(R(i) - r), dc = Math.abs(C(i) - c), stay = i === p.pos;
    const straight2 = (dr === 2 && dc === 0) || (dr === 0 && dc === 2);
    let ok;
    if (p.dive) ok = true;   /* 잠수 중: 어느 칸에서든 솟아오른다 */
    else if (actId === 'dash' || actId === 'ride') ok = straight2;
    else if (actId === 'bounce' || actId === 'jet' || mvId === 'blink' || bat) ok = !stay;
    else if (mvId === 'leap') ok = (dr === 1 && dc === 1) || straight2;
    else if (mvId === 'curve') ok = dr === 1 && dc === 1;
    else ok = stay || (!rooted && (dr + dc === 1 || (p.cls === 'bunny' && straight2)));
    if (ok && (stay || !BK.includes(i))) out.push(i);
  }
  return out;
}

const isCell = v => Number.isInteger(v) && v >= 0 && v < 9;
function validTg(kind, tg) {
  if (!kind) return true;
  if (kind === 'sq' || kind === 'cell') return isCell(tg);
  if (kind === 'col' || kind === 'row') return Number.isInteger(tg) && tg >= 0 && tg < 3;
  if (kind === 'two') return Array.isArray(tg) && tg.length === 2 && isCell(tg[0]) && isCell(tg[1]) && tg[0] !== tg[1];
  if (kind === 'two2') return Array.isArray(tg) && tg.length === 2 && isCell(tg[0]) && isCell(tg[1]);   /* 같은 칸을 두 번 골라도 된다(화살) */
  if (kind === 'line') return !!tg && (tg.o === 'r' || tg.o === 'c') && Number.isInteger(tg.i) && tg.i >= 0 && tg.i < 3;
  return false;
}

/* 카드가 덮는 칸. pos=기준 위치(이동 후), prev=두 번째 기준(잔상의 이동 전 위치, 슬라임 분신), after=두 번째 기준을 쓰는가 */
const up2 = i => ALL.filter(j => C(i) === C(j) && Math.abs(R(i) - R(j)) <= 1);
/* 음유시인이 이번 턴 공격할 때의 박자 */
const beatLv = p => (p.cls === 'bard' ? Math.min(3, p.beat + 1) : 0);
/* ㄱ자: 모서리에서 왼쪽 끝, 아래 끝까지. ㄴ자: 모서리에서 위 끝, 오른쪽 끝까지 */
const shapeG = t => ALL.filter(j => (R(j) === R(t) && C(j) <= C(t)) || (C(j) === C(t) && R(j) >= R(t)));
const shapeN = t => ALL.filter(j => (C(j) === C(t) && R(j) <= R(t)) || (R(j) === R(t) && C(j) >= C(t)));
const smallG = t => ALL.filter(j => j === t || (R(j) === R(t) && C(j) === C(t) - 1) || (C(j) === C(t) && R(j) === R(t) + 1));
const diagOf = t => ALL.filter(j => j === t || (Math.abs(R(j) - R(t)) === 1 && Math.abs(C(j) - C(t)) === 1));
/* 음양사의 이번 턴 기운. 반전을 쓰면 뒤집힌다 */
const yangOf = (s, ab) => (s.turn % 2 === 1) !== !!ab;
/* 카드 범위에 영향을 주는 단계: 음유시인 박자, 음양사 1=양 2=음, 허수아비 되베기 3 */
const lvOf = (s, p, ab) => (p.cls === 'bard' ? beatLv(p) : p.cls === 'onmyoji' ? (yangOf(s, ab) ? 1 : 2) : p.cls === 'scarecrow' && ab ? 3 : 0);
function cellsOf(id, tg, pos, prev, after, lv) {
  const two = f => uniq([...f(pos), ...(after ? f(prev) : [])]);
  switch (id) {
    case 'fire': case 'spore': case 'topple': case 'drag': { const a = Math.min(R(tg), 1) * 3 + Math.min(C(tg), 1); return [a, a + 1, a + 3, a + 4]; }
    case 'bolt': case 'rail': case 'spear': case 'storm': case 'discus': case 'helium': case 'skewer': case 'bspear': return colOf(tg);
    case 'shard': return uniq([pos, MIR(pos)]);
    case 'twin': return uniq([...colOf(tg), ...colOf(2 - tg)]);
    case 'kaleido': return uniq([pos, MIR(pos), 8 - MIR(pos), 8 - pos]);
    case 'tick': return [tg];
    case 'minute': return colOf(tg);
    case 'hour': return rowOf(tg);
    case 'bats': return around(pos).filter(i => i !== pos);
    case 'feast': return ALL.slice();
    case 'arrow': return uniq([].concat(tg));
    case 'pickaxe': case 'wisp': case 'click': return [tg];
    case 'drive': case 'ghand': case 'del': return rowOf(tg);
    case 'loading': return colOf(tg);
    case 'format': return ALL.slice();
    case 'dice': return rowOf(tg);
    case 'coin': return around(tg);
    case 'allin': return beside(tg);
    case 'roulette': return [];
    case 'hammer': return two(beside);
    case 'opus': { const a = Math.min(R(tg), 1) * 3 + Math.min(C(tg), 1); return [a, a + 1, a + 3, a + 4]; }
    case 'note': return lv >= 2 ? around(tg) : [tg];
    case 'chord': return lv >= 2 ? uniq([...rowOf(tg), ...colOf(1)]) : rowOf(tg);
    case 'cresc': return lv >= 2 ? ALL.slice() : [0, 2, 4, 6, 8];
    case 'jet': return colOf(C(pos));
    case 'juggle': return [tg];
    case 'box': return around(tg);
    case 'turret': case 'vine': case 'snow': case 'pie': return rowOf(tg);
    case 'jab': return [R(pos) * 3 + tg];
    case 'straight': return rowOf(R(pos));
    case 'upper': return R(tg) > 0 ? [tg, tg - 3] : [tg];
    case 'kick': return colOf(tg);
    case 'blade': return pathCells(prev, pos);
    case 'pebble': return ALL.filter(j => j === pos || (Math.abs(R(j) - R(pos)) === 1 && Math.abs(C(j) - C(pos)) === 1));
    case 'heel': return around(pos);
    case 'tray': return [tg];
    case 'acid': return [tg];
    case 'brush': case 'splash': return [tg];
    case 'staff': return [tg];
    case 'roller': return rowOf(tg);
    case 'flask': { const a = Math.min(R(tg), 1) * 3 + Math.min(C(tg), 1); return [a, a + 1, a + 3, a + 4]; }
    case 'philo': return around(tg);
    case 'burst': return [1, 3, 4, 5, 7];
    case 'ring': return [0, 1, 2, 3, 5, 6, 7, 8];
    case 'wolves': return [0, 2, 4, 6, 8];
    case 'sun': return ALL.slice();
    case 'mine': case 'bramble': case 'head': case 'pillar': case 'blackhole': return [tg];
    case 'star': return tg.slice();
    case 'comet': case 'nova': return around(tg);
    case 'tornado': return around(tg);
    case 'sweep': return two(q => uniq([...rowOf(R(q)), ...colOf(C(q))]));
    case 'cleave': return two(q => colOf(C(q)));
    case 'meteor': case 'bsod': { const safe = tg.o === 'r' ? rowOf(tg.i) : colOf(tg.i); return ALL.filter(i => !safe.includes(i)); }
    case 'frost': return tg.slice();
    case 'hslash': case 'dash': case 'gaze': return two(q => rowOf(R(q)));
    case 'vslash': return two(q => colOf(C(q)));
    case 'thrust': case 'engulf': case 'shovel': case 'bite': return two(q => [q]);
    case 'slam': return two(beside);
    case 'bounce': return around(pos);
    case 'talis': return lv === 2 ? [tg] : rowOf(R(tg));
    case 'shiki': return lv === 2 ? diagOf(tg) : around(tg);
    case 'taiji': return lv === 2 ? [1, 3, 5, 7] : [0, 2, 4, 6, 8];
    case 'peck': return beside(tg);
    case 'flap': return around(pos);
    case 'crow': return ALL.slice();
    case 'prong': return two(beside);
    case 'harpoon': return colOf(tg);
    case 'wave': return rowOf(tg);
    case 'sickG': return lv === 3 ? uniq([...shapeG(tg), ...shapeN(tg)]) : shapeG(tg);
    case 'sickN': return lv === 3 ? uniq([...shapeG(tg), ...shapeN(tg)]) : shapeN(tg);
    case 'boomer': return shapeG(tg);
    case 'hookS': return smallG(tg);
  }
  return [];
}
const detCells = mines => uniq(mines.flatMap(around));
/* 별자리: 별이 뜬 칸 + 별 둘 사이에 정확히 낀 칸 */
function constCells(stars) {
  const out = stars.slice();
  for (const a of stars) for (const b of stars) if (a < b && (R(a) + R(b)) % 2 === 0 && (C(a) + C(b)) % 2 === 0) out.push(((R(a) + R(b)) / 2) * 3 + (C(a) + C(b)) / 2);
  return uniq(out);
}
const popCells = (pos, air) => (air >= 2 ? ALL.slice() : air === 1 ? around(pos) : []);
function stepToward(from, to) { const dr = Math.sign(R(to) - R(from)), dc = Math.sign(C(to) - C(from)); return dr ? from + dr * 3 : from + dc; }
/* 두 번째 공격 기준: 사무라이는 잔상을 켰을 때 이동 전 위치, 슬라임은 분신이 있으면 항상 */
function origin2(p, from, ab) { return p.cls === 'slime' && p.clone != null ? [p.clone, true] : [from, !!ab && p.cls === 'samurai']; }

/* 능력을 지금 쓸 수 있는가 (비용 제외) */
function abReady(s, p, actId) {
  /* 가속: 당길 예고 공격이 있어야 한다. 나를 노린 숨은 상자는 세지 않는다(존재가 드러나므로) */
  if (p.cls === 'mage') return p.mana >= 2;
  if (p.cls === 'samurai') return p.ki >= KI_MAX && !!actId && CARDS[actId].t === 'atk';
  if (p.cls === 'mechanic') return p.mines.length > 0;
  if (p.cls === 'druid') return s.turn >= p.cd;
  if (p.cls === 'archaeologist') return actId === 'dig';
  if (p.cls === 'shaman') return !!p.weather;
  if (p.cls === 'astronomer') return p.stars.length > 0;
  if (p.cls === 'clown') return !!actId && CARDS[actId].t === 'atk' && !CARDS[actId].delay;
  if (p.cls === 'balloon') return p.air < 3;
  if (p.cls === 'dullahan' || p.cls === 'gambler' || p.cls === 'blacksmith') return !!actId && CARDS[actId].t === 'atk';
  if (p.cls === 'bard') return p.beat >= 1;
  if (p.cls === 'onmyoji') return !!actId && !!CARDS[actId].yy;
  if (p.cls === 'chicken') return actId === 'peck' || actId === 'flap';
  if (p.cls === 'merfolk') return !p.dive && s.turn >= (p.diveCd || 0);
  if (p.cls === 'scarecrow') return actId === 'sickG' || actId === 'sickN';
  if (p.cls === 'vampire') return p.hp >= 2;
  if (p.cls === 'grave') return (p.digs || 0) < 5;
  if (p.cls === 'mirror') return !!mirrorCopy(s, s.P.a === p ? 'a' : 'b');
  if (p.cls === 'chrono') return p.prev != null && s.turn >= (p.rwCd || 0);
  if (p.cls === 'mower') return (p.fuel || 0) >= 2 && rushDests(s, s.P.a === p ? 'a' : 'b').length > 0;
  if (p.cls === 'bunny') return s.turn >= (p.winkCd || 0);
  if (p.cls === 'alch') return (p.ess || 0) >= 1 && s.turn >= (p.tmCd || 0);
  if (p.cls === 'tamer') return !!p.hawk;
  if (p.cls === 'painter') return !!actId && CARDS[actId].t === 'atk' && s.turn >= (p.dyeCd || 0);
  return true;
}

/* 받은 계획을 규칙에 맞게 정리. 어긋난 부분은 버린다. */
function sanitize(s, k, pl) {
  const p = s.P[k], A = CLS[p.cls].ab; pl = pl || {};
  const mute = p.silenced === s.turn;
  let mv = Number.isInteger(pl.mv) && p.hand[pl.mv] && CARDS[p.hand[pl.mv]].t === 'move' ? pl.mv : null;
  let act = !mute && Number.isInteger(pl.act) && p.hand[pl.act] && CARDS[p.hand[pl.act]].t !== 'move' ? pl.act : null;
  let ab = !mute && !!pl.ab, tg = pl.tg;
  if (ab && A.slot) { act = null; if (A.tg && !validTg(A.tg, tg)) ab = false; }
  let actId = act != null ? p.hand[act] : null;
  let free = false;
  if (ab && p.cls === 'mirror') { const e = mirrorCopy(s, k); if (!e || !validTg(CARDS[e].tg, tg)) ab = false; else { actId = e; free = p.stash === e; } }
  if (actId && !validTg(CARDS[actId].tg, tg)) { act = null; actId = null; }
  if (actId && CARDS[actId].mv) mv = null;
  let mvId = mv != null ? p.hand[mv] : null;
  if (ab && p.cls !== 'samurai' && !abReady(s, p, actId)) ab = false;
  if (ab && p.cls === 'mower') { mv = null; mvId = null; }
  if (actId === 'magnum' && !(p.paint || []).length) { act = null; actId = null; }
  if ((actId === 'encircle' || actId === 'stoop') && !p.hawk) { act = null; actId = null; }
  if (actId === 'philo' && (p.ess || 0) - (ab && p.cls === 'alch' ? 1 : 0) < 1) { act = null; actId = null; }
  const cost = () => (mvId ? CARDS[mvId].c : 0) + (actId && !free ? cardCost(p, actId) : 0) + (ab ? A.cost : 0);
  let blood = false;
  if (cost() > p.mana && p.cls === 'vampire' && p.hp >= 2) blood = true;
  else if (cost() > p.mana) { mv = null; mvId = null; act = null; actId = null; if (A.cost || p.cls === 'mirror') ab = false; }
  if (ab && p.cls === 'vampire' && p.hp - (blood ? 1 : 0) < 2) ab = false;
  let dest = pl.dest;
  if (!legalDests(s, k, mvId, actId, ab && (p.cls === 'vampire' || p.cls === 'mower')).includes(dest)) {
    if (actId && CARDS[actId].mv) { act = null; actId = null; }
    mv = null; mvId = null; dest = p.pos;
  }
  if (ab && p.cls === 'samurai' && !abReady(s, p, actId)) ab = false;
  if (ab && ['archaeologist', 'dullahan', 'clown', 'gambler', 'blacksmith', 'onmyoji', 'chicken', 'scarecrow', 'painter'].includes(p.cls) && !abReady(s, p, actId)) ab = false;
  if (ab && p.cls === 'merfolk') { mv = null; mvId = null; dest = p.pos; }
  if (ab && p.cls === 'chrono') { if (p.prev == null || s.blk[k].includes(p.prev)) ab = false; else { mv = null; mvId = null; dest = p.prev; } }
  if (!ab && p.cls === 'mirror' && act == null) actId = null;
  if (ab && p.cls === 'slime' && dest === p.pos) ab = false;
  if (ab && p.cls === 'statue' && dest !== p.pos) ab = false;
  if (ab && p.cls === 'vampire' && dest === p.pos) ab = false;
  if (ab && p.cls === 'mower' && dest === p.pos) ab = false;
  if (ab && p.cls === 'tamer') { const h = p.hawk, w = pl.wt; if (!h || !isCell(w) || w === h.c || mdist(h.c, w) > 2 || s.blk[opp(k)].includes(w) || s.col.includes(w)) ab = false; }
  let burn = 0;
  if (ab && p.cls === 'mage') { burn = p.mana - cost(); if (burn < 2) { ab = false; burn = 0; } }
  return { mv, act, mvId, actId, dest, tg, ab, wt: ab && p.cls === 'tamer' ? pl.wt : null, cost: blood ? p.mana : cost() + burn, blood, burn };
}

function draw(p) {
  let re = false;
  while (p.hand.length < HAND) {
    if (!p.deck.length) { if (!p.disc.length) break; p.deck = shuffle(p.disc); p.disc = []; re = true; }
    p.hand.push(p.deck.pop());
  }
  return re;
}

/* 한 턴 해결: 특수 → 이동 → 갈고리·분열·발굴·지뢰 → 예고 폭발 → 공격·포탑 → 피해 → 정리 */
function resolve(s, plans) {
  const ev = [], fx = { a: [], b: [] }, X = {}, nextBlk = { a: [], b: [] }, nextBlkT = { a: {}, b: {} }, KS = ['a', 'b'];
  const rp = { P: {}, ex: [], R: {} }, hp0 = {};
  for (const k of KS) {
    const p = s.P[k]; let pk = plans[k];
    /* 변성(연금술사): 계획에 담긴 바꿔치기를 먼저 손패에 적용해야 바뀐 카드를 이번 턴에 낼 수 있다 */
    if (p.cls === 'alch' && pk && pk.ab) {
      if (tmOk(s, k, pk.tm)) { const t = pk.tm, o0 = tmOrig(p, p.hand[t.i]); p.tmap = p.tmap || []; p.tmap.push([t.to, o0]); p.hand[t.i] = t.to; rp.P[k] = { tm0: { from: o0, to: t.to } }; }
      else pk = Object.assign({}, pk, { ab: false });
    }
    const pl = sanitize(s, k, pk);
    hp0[k] = p.hp;
    X[k] = { pl, from: p.pos, dmg: 0, shield: 0, parry: false, inst: false, instHit: false, oldMarks: p.marks.slice(), root0: p.rooted === s.turn, heat: 0, dive: !!(pl.ab && p.cls === 'merfolk'), surf: !!p.dive };
    if (X[k].dive) X[k].anchor = true;
    if ((p.preyUntil || 0) >= s.turn) X[k].prey = true;   /* 사냥꾼 길목: 지난 턴에 걸린 피해 +1이 이번 턴까지 */
    p.mana -= pl.cost;
    [pl.mv, pl.act].filter(i => i != null).sort((x, y) => y - x).forEach(i => { const id = p.hand.splice(i, 1)[0]; if (!CARDS[id].relic) p.disc.push(tmOrig(p, id)); });
    const tm0 = rp.P[k] && rp.P[k].tm0;
    rp.P[k] = { from: p.pos, to: pl.dest, mvId: pl.mvId, actId: pl.actId, ab: pl.ab, tg: pl.tg, cells: [], marks: [], stance: false, clone0: p.clone };
    rp.R[k] = {};
    if (pl.blood) { p.hp -= 1; rp.P[k].blood = true; ev.push([k, '피의 대가. 체력 1을 냈다']); }
    if (pl.ab && p.cls === 'vampire') { p.hp -= 1; rp.P[k].bat = true; ev.push([k, '박쥐로 변해 날아올랐다']); }
    if (pl.ab && p.cls === 'mirror') { rp.P[k].echo = pl.actId; if (p.stash === pl.actId) p.stash = null; ev.push([k, '되비추기: ' + CARDS[pl.actId].n]); }
    if (pl.ab && p.cls === 'mower') { p.fuel = (p.fuel || 0) - 2; ev.push([k, '풀가동! 엔진이 울부짖는다']); }
    if (tm0) { if (pl.ab) { p.ess -= 1; p.tmCd = s.turn + 3; rp.P[k].tm = tm0; ev.push([k, '변성: ' + CARDS[tm0.from].n + ' → ' + CARDS[tm0.to].n]); } }
    if (pl.ab && p.cls === 'bunny') { p.winkCd = s.turn + 3; X[k].wink = true; rp.P[k].wink = true; ev.push([k, '윙크를 날렸다']); }
    if (pl.ab && p.cls === 'chrono') { rp.P[k].rewind = true; p.rwCd = s.turn + 3; if (p.hurtLast && p.hp < hpMaxOf(p)) { p.hp += 1; hp0[k] = p.hp; rp.P[k].rwHeal = true; } ev.push([k, '되감기. 지난 턴의 자리로 돌아갔다' + (rp.P[k].rwHeal ? ', 체력 +1' : '')]); }
  }
  /* 공격 판정. 본체가 맞으면 피해 d. 분신은 맞으면 피해 없이 사라진다 */
  let SRC = '';
  const srcAdd = (o, n, d) => { (X[o].src = X[o].src || []).push([n, d]); };
  const strike = (o, cells, d) => {
    const p = s.P[o];
    if (X[o].dive) return false;   /* 잠수 중에는 맞지 않는다 */
    const body = cells.includes(p.pos), cl = p.clone != null && cells.includes(p.clone);
    if (cl) { p.clone = null; rp.R[o].pop = true; ev.push([o, '분신이 사라졌다']); }
    let egg = false;
    if (p.eggs && p.eggs.length && !X[o].brood) { const br = p.eggs.filter(c => cells.includes(c)); if (br.length) { p.eggs = p.eggs.filter(c => !br.includes(c)); X[o].eggs = uniq([...(X[o].eggs || []), ...br]); egg = true; ev.push([o, '알이 깨졌다']); } }
    if (body) { X[o].dmg += d; srcAdd(o, SRC, d); return true; }
    return egg;
  };
  const bodyAt = (o, cells) => !X[o].dive && cells.includes(s.P[o].pos);
  // 가속(마법사): 이번 턴 시작 때 깔려 있던 예고 공격을 1턴 당긴다
  // 특수
  for (const k of KS) {
    const p = s.P[k], x = X[k], pl = x.pl, o = opp(k), id = pl.actId;
    if (pl.mvId) ev.push([k, CARDS[pl.mvId].n + '(으)로 움직였다']);
    if (id === 'guard') { x.shield += 1; ev.push([k, '방어 자세를 잡았다']); }
    if (id === 'counter') { x.shield += 1; x.counter = true; ev.push([k, '카운터 자세를 잡았다']); }
    if (id === 'tune') { p.fuel = Math.min(3, (p.fuel || 0) + 2); x.tune = true; ev.push([k, '정비. 연료 +2']); }
    if (id === 'cocktail') { p.cups = (p.cups || []).filter(m => m !== pl.tg); p.cups.push(pl.tg); while (p.cups.length > 2) p.cups.shift(); ev.push([k, '칵테일을 내놓았다']); }
    if (pl.mvId === 'backstep') x.shield += 1;
    if (id === 'release' && isCell(pl.tg)) { p.hawk = { c: pl.tg, hp: 2 }; rp.P[k].release = pl.tg; rp.P[k].hkHp = 2; ev.push([k, '매를 풀어놓았다']); }
    if (id === 'treat') { if (p.hawk) { p.hawk.hp = Math.min(HAWK_MAX, p.hawk.hp + 1); x.treat = true; rp.P[k].treat = p.hawk.c; rp.P[k].hkHp = p.hawk.hp; ev.push([k, '간식. 매 체력 +1, 이번 턴 두 칸 쫓는다']); } else { p.hawk = { c: p.pos, hp: 1 }; rp.P[k].release = p.pos; rp.P[k].summon = true; rp.P[k].hkHp = 1; ev.push([k, '간식으로 매를 불렀다']); } }
    if (pl.ab && p.cls === 'tamer' && p.hawk) { rp.P[k].whistle = { from: p.hawk.c, to: pl.wt }; p.hawk.c = pl.wt; x.whistle = true; ev.push([k, '휘파람! 매가 날아갔다']); }
    if (id === 'sketch' && isCell(pl.tg)) { addPaint(p, [pl.tg]); rp.P[k].sketch = pl.tg; ev.push([k, '밑그림을 그렸다']); }
    if (pl.ab && p.cls === 'painter') { p.dyeCd = s.turn + 3; rp.P[k].dyeTry = true; }
    if (id === 'catalyst') { const n = Math.min(2, ESS_MAX - (p.ess || 0)); p.ess = (p.ess || 0) + n; rp.P[k].cat = n; ev.push([k, '촉매. 정수 +' + n]); }
    if (id === 'antidote') { const n = p.hp < hpMaxOf(p) ? 1 : 0; p.hp += n; hp0[k] = p.hp; x.anti = true; rp.R[k].anti = n; ev.push([k, n ? '해독제로 체력 +1' : '해독제. 체력이 이미 가득하다']); }
    if (id === 'mist') { x.mist = true; ev.push([k, '안개 속으로 몸을 감췄다']); }
    if (id === 'copycat') { x.shield += 1; const oid = X[o].pl.actId; if (echoOk(oid)) { p.stash = oid; rp.P[k].stash = oid; ev.push([k, '본뜨기. ' + CARDS[oid].n + '을(를) 거울에 담았다']); } else { rp.P[k].stash = ''; ev.push([k, '본뜨기. 담을 공격이 없었다']); } }
    if (id === 'flip') x.flip = true;
    if (id === 'halt') { x.halt = true; ev.push([k, '시간을 멈췄다']); }
    if (id === 'ambush') { x.immune = true; x.ambush = true; p.amb = s.turn + 1; ev.push([k, '몸을 숨기고 때를 기다린다']); }
    if (id === 'coffin') { x.shield += 1; x.coffin = true; ev.push([k, '관 뚜껑 뒤에 숨었다']); }
    if (id === 'noose') { const ts = [].concat(pl.tg); p.nooses = p.nooses.filter(m => !ts.includes(m)); p.nooses.push(...ts); while (p.nooses.length > 2) p.nooses.shift(); ev.push([k, '올가미를 놓았다']); }
    if (pl.ab && p.cls === 'hunter') { const c = s.P[o].pos; p.tags = p.tags.filter(m => m !== c); p.tags.push(c); if (p.tags.length > 2) p.tags.shift(); rp.P[k].tag = c; ev.push([k, '상대가 선 칸에 표식을 찍었다']); }
    if (pl.ab && p.cls === 'grave') { s.crack = s.crack.filter(q => q.c !== pl.tg); s.crack.push({ c: pl.tg, at: s.turn + 1 }); p.digs = (p.digs || 0) + 1; rp.P[k].crack = pl.tg; ev.push([k, '삽질. 칸에 금이 갔다']); }
    if (id === 'quake') x.quake = true;
    if (id === 'bluff') { x.shield += 1; x.bluff = true; ev.push([k, '허세를 부렸다']); }
    if (id === 'rest') { x.shield += 1; x.rest = true; ev.push([k, '쉼표로 숨을 골랐다']); }
    if (id === 'lullaby') { x.lull = true; ev.push([k, '자장가를 불렀다']); }
    if (id === 'anvil') { const ts = uniq(p.hand.filter(c => CARDS[c].t === 'atk')); ts.forEach(c => { p.temper[c] = Math.min(2, (p.temper[c] || 0) + 1); }); rp.P[k].anvil = ts.length; ev.push([k, ts.length ? '모루에서 손패를 담금질했다' : '모루. 담금질할 공격 카드가 없다']); }
    if (id === 'ward') { const yang = yangOf(s, pl.ab); x.shield += yang ? 1 : 2; if (yang) x.wardMana = true; rp.P[k].yy = yang ? 'yang' : 'yin'; ev.push([k, yang ? '결계(양). 피해 -1, 마나 +1' : '결계(음). 피해 -2']); }
    if (id === 'brood') { x.shield += 1; x.brood = true; ev.push([k, '알을 품었다']); }
    if (id === 'bubble') { x.shield += 1; x.bubble = true; ev.push([k, '물방울 방패를 둘렀다']); }
    if (x.dive) { rp.P[k].dive = true; ev.push([k, '바닥 밑으로 잠수했다']); }
    if (id === 'harden') { x.shield += 2; ev.push([k, '몸을 굳혔다']); }
    if (id === 'firewall') { x.shield += 2; ev.push([k, '방화벽을 세웠다']); }
    if (id === 'lag') { s.P[o].rooted = s.turn + 1; rp.R[o].lag = true; ev.push([k, '렉을 걸었다. 상대는 다음 턴 기본 이동 불가']); }
    if (id === 'popup' && Array.isArray(pl.tg)) { const ts = uniq(pl.tg.filter(isCell)); nextBlk[o] = uniq([...nextBlk[o], ...ts]); ts.forEach(c => { nextBlkT[o][c] = 'win'; }); rp.P[k].popup = ts; ev.push([k, '오류 창을 띄웠다']); }
    if (pl.ab && p.cls === 'admin') { x.regroup = true; rp.P[k].f5 = true; ev.push([k, '새로 고침. 턴이 끝나면 손패를 새로 받는다']); }
    if (id === 'block') { x.shield += 2; x.block = true; ev.push([k, '대검으로 막아섰다']); }
    if (id && CARDS[id].wx) { p.weather = { t: id, i: id === 'heatw' ? 0 : pl.tg, dir: 1, left: 3, ext: false }; rp.P[k].cast = id; ev.push([k, WX_NAME[id] + '을(를) 불렀다']); }
    if (id === 'reverse') { const w = p.weather; if (w) { w.dir = -w.dir; w.i = (w.i + 2 * w.dir + 6) % 3; w.left += 1; rp.P[k].rev = true; ev.push([k, '역풍으로 날씨의 방향을 뒤집었다']); } else ev.push([k, '역풍. 뒤집을 날씨가 없다']); }
    if (id === 'amulet') { x.immune = true; ev.push([k, '수호 부적을 들었다']); }
    if (id === 'parry') { x.parry = true; ev.push([k, '받아넘기기를 준비했다']); }
    if (id === 'scry') { p.see = s.turn + 1; ev.push([k, '투시로 상대 손패를 엿본다']); }
    if (id === 'regroup') { x.regroup = true; rp.P[k].regroup = p.hand.filter(c => !CARDS[c].relic).length; ev.push([k, '재정비로 손패를 갈았다']); }
    if (id === 'frost') { nextBlk[o] = cellsOf('frost', pl.tg); nextBlk[o].forEach(c => { nextBlkT[o][c] = 'ice'; }); }
    if (id === 'mine') { p.mines = p.mines.filter(m => m !== pl.tg); p.mines.push(pl.tg); if (p.mines.length > TRAP_MAX) p.mines.shift(); ev.push([k, '지뢰를 숨겼다']); }
    if (id === 'turret') { p.turrets.push({ r: pl.tg, until: s.turn + 1 }); ev.push([k, '포탑을 세웠다']); }
    if (id === 'bramble') { p.brambles = p.brambles.filter(m => m !== pl.tg); p.brambles.push(pl.tg); if (p.brambles.length > 2) p.brambles.shift(); ev.push([k, '가시덤불을 심었다']); }
    if (id === 'hook') x.hook = true;
    if (id === 'swap') x.swap = true;
    if (pl.ab && p.cls === 'balloon') { p.air = Math.min(3, p.air + 1); ev.push([k, '급팽창으로 공기 +1']); }
    if (id === 'inflate') { p.air = Math.min(3, p.air + 2); ev.push([k, '숨을 들이쉬어 공기 ' + p.air]); }
    if (id === 'knot') { x.shield += 1; p.air = Math.min(3, p.air + 1); ev.push([k, '매듭을 묶었다']); }
    if (id === 'box') { s.pend.push({ t: o, cells: around(pl.tg), d: 2, at: s.turn + 2, n: '깜짝 상자', id: 'box', hidden: true, c0: pl.tg }); ev.push([k, '깜짝 상자를 숨겼다']); }
    if (id === 'lens') x.lens = true;
    if (id === 'blackhole' && p.stars.includes(pl.tg)) x.hole = pl.tg;
    if (id === 'pillar') { p.pillars = p.pillars.filter(q => q.c !== pl.tg); p.pillars.push({ c: pl.tg, until: s.turn + 3 }); if (p.pillars.length > 2) p.pillars.shift(); ev.push([k, '기둥을 세웠다']); }
    if (id === 'heal') x.heal = true;
    if (id === 'grail') { const n = Math.max(0, Math.min(2, hpMaxOf(p) - p.hp)); p.hp += n; hp0[k] = p.hp; rp.R[k].grail = n; ev.push([k, '성배로 체력 +' + n]); }
    if (id === 'hourglass') { s.P[o].silenced = s.turn + 1; ev.push([k, '모래시계로 상대의 다음 턴을 봉인했다']); }
  }
  // 이동
  for (const k of KS) {
    const p = s.P[k], x = X[k];
    if (X[opp(k)].halt && !x.dive) { x.frozen = true; if (x.pl.dest !== p.pos) { rp.P[k].halted = x.pl.dest; x.pl.dest = p.pos; rp.P[k].to = p.pos; ev.push([k, '시간이 멈춰 움직이지 못했다']); } }
    { const h = hawkOn(s, k); if (h != null && x.pl.dest !== p.pos && x.pl.dest === h && !x.dive) { rp.P[k].hawkBlock = h; x.pl.dest = p.pos; rp.P[k].to = p.pos; x.hawkBlocked = true; ev.push([k, '매가 길을 막아 멈춰 섰다']); } }
    x.stay = x.pl.dest === p.pos; p.pos = x.pl.dest; x.to = p.pos;   /* 끌려가기 전, 내가 움직여 도착한 칸 */
    if (p.cls === 'bunny' && Math.abs(R(p.pos) - R(x.from)) + Math.abs(C(p.pos) - C(x.from)) >= 2) { x.jump = true; rp.P[k].jump = true; }
    if ((p.dyed || 0) >= s.turn && p.dyeBy && s.P[p.dyeBy] && !x.dive && !x.surf) {   /* 화가 물들이기: 스스로 지나간 칸과 멈춘 칸에 발자국 물감 */
      const steps = x.jump ? [p.pos] : pathCells(x.from, p.pos); addPaint(s.P[p.dyeBy], steps); rp.P[k].steps = steps; }
    if (p.cls === 'mower') {   /* 관성: 같은 방향이면 속도 +1, 급커브는 끊기지 않는다, 머물면 0 */
      if (x.stay) { if (!x.tune) p.spd = 0; }
      else p.spd = Math.min(3, (p.spd || 0) + (x.pl.mvId === 'curve' ? 2 : 1));
      x.spd = p.spd; rp.P[k].spd = p.spd;
    }
    if (p.cls === 'statue' && x.stay && x.pl.ab) { x.shield += 1; x.anchor = true; ev.push([k, '좌대 위에 버티고 섰다']); }
    if (x.pl.actId === 'restore') { if (x.stay && p.hp < hpMaxOf(p)) { p.hp += 1; hp0[k] = p.hp; rp.R[k].restore = true; ev.push([k, '복원으로 체력 +1']); } else { rp.R[k].restoreFail = true; ev.push([k, x.stay ? '복원. 체력이 이미 가득하다' : '복원 실패. 움직였다']); } }
  }
  for (const k of KS) {
    const p = s.P[k], o = opp(k);
    if (!(X[k].pl.ab && p.cls === 'druid')) continue;
    if (X[o].stay) { rp.P[k].root = -1; ev.push([k, '뒤쫓는 뿌리 불발. 상대가 움직이지 않았다']); continue; }
    const c = rp.P[o].from; p.brambles = p.brambles.filter(m => m !== c); p.brambles.push(c); if (p.brambles.length > 2) p.brambles.shift();
    rp.P[k].root = c; ev.push([k, '상대가 떠난 칸에 가시덤불이 자랐다']);
  }
  // 갈고리: 제자리에 머문 상대만 끌려온다
  for (const k of KS) if (X[k].hook) {
    const o = opp(k);
    if (X[o].stay && s.P[o].pos !== 4 && !X[o].anchor) { s.P[o].pos = 4; rp.P[o].pulled = true; rp.P[o].final = 4; ev.push([k, '갈고리로 상대를 가운데로 끌어왔다']); }
    else { rp.P[k].hookMiss = X[o].stay ? 'center' : 'moved'; ev.push([k, X[o].stay ? '갈고리. 상대가 이미 가운데에 있다' : '갈고리가 빗나갔다. 상대가 움직였다']); }
  }
  // 중력 렌즈
  for (const k of KS) if (X[k].lens) {
    const o = opp(k), p = s.P[k], at = s.P[o].pos;
    const near = p.stars.filter(q => q !== at).sort((a, b) => (Math.abs(R(a) - R(at)) + Math.abs(C(a) - C(at))) - (Math.abs(R(b) - R(at)) + Math.abs(C(b) - C(at))))[0];
    if (near != null && !p.stars.includes(at) && !X[o].anchor) { s.P[o].pos = stepToward(at, near); rp.P[o].pulled = true; rp.P[o].final = s.P[o].pos; rp.P[k].lens = true; ev.push([k, '중력 렌즈로 상대를 별 쪽으로 끌어당겼다']); }
    else { rp.P[k].lens = false; ev.push([k, '중력 렌즈. 끌어당길 수 없었다']); }
  }
  // 바꿔치기
  if ((X.a.swap ? 1 : 0) + (X.b.swap ? 1 : 0) === 1 && !X.a.anchor && !X.b.anchor) {
    const k = X.a.swap ? 'a' : 'b', t = s.P.a.pos; s.P.a.pos = s.P.b.pos; s.P.b.pos = t;
    for (const q of KS) { rp.P[q].pulled = true; rp.P[q].final = s.P[q].pos; }
    rp.P[k].swap = true; ev.push([k, '바꿔치기. 서로의 자리가 뒤바뀌었다']);
  } else for (const k of KS) if (X[k].swap) { rp.P[k].swap = false; ev.push([k, '바꿔치기가 통하지 않았다']); }
  // 블랙홀
  for (const k of KS) if (X[k].hole != null) {
    const o = opp(k), c = X[k].hole;
    if (s.P[o].pos !== c && !X[o].anchor) { s.P[o].pos = c; rp.P[o].pulled = true; rp.P[o].final = c; ev.push([k, '블랙홀이 상대를 빨아들였다']); }
  }
  // 사막 모래폭풍: 예고된 줄에 서 있으면 바람이 부는 쪽 끝 칸까지 밀려난다
  if (s.sand && s.sand.at === s.turn) {
    const w = s.sand;
    for (const k of KS) {
      const p = s.P[k], x = X[k]; if (x.dive || x.anchor || !sandLine(w, p.pos)) continue;
      let at = p.pos;
      for (;;) { const rr = R(at) + (w.o === 'c' ? w.dir : 0), cc = C(at) + (w.o === 'r' ? w.dir : 0); if (rr < 0 || rr > 2 || cc < 0 || cc > 2 || s.blk[k].includes(rr * 3 + cc)) break; at = rr * 3 + cc; }
      if (at !== p.pos) { p.pos = at; rp.P[k].sand = at; rp.P[k].final = at; ev.push([k, '모래폭풍에 밀려났다']); }
      else { rp.P[k].sand = -1; ev.push([k, '모래폭풍을 끝 칸에서 버텼다']); }
    }
    rp.sand = { o: w.o, i: w.i, dir: w.dir };
  }
  // 슬라임 합체와 분열, 고고학자 발굴
  for (const k of KS) {
    const p = s.P[k], x = X[k], pl = x.pl;
    if (p.clone != null && p.clone === p.pos) { p.clone = null; if (p.hp < hpMaxOf(p)) p.hp += 1; hp0[k] = p.hp; rp.R[k].merge = true; ev.push([k, '분신과 합쳐져 체력 +1']); }
    if (pl.ab && p.cls === 'slime' && x.from !== p.pos) { p.clone = x.from; rp.P[k].split = x.from; ev.push([k, '분신을 남겼다']); }
    if (pl.actId === 'dig') {
      if (p.dug.includes(p.pos)) { rp.P[k].dig = { cell: p.pos, fail: true }; ev.push([k, '이미 판 자리라 아무것도 없다']); }
      else {
        p.dug.push(p.pos); x.dug = true;
        const good = pl.ab || Math.random() < 0.65, id = weighted(good ? RELIC_GOOD : RELIC_BAD);
        rp.P[k].dig = { cell: p.pos, id, bad: !good };
        if (good) { p.hand.push(id); ev.push([k, '유물 발굴: ' + CARDS[id].n]); }
        else {
          ev.push([k, '발굴 실패: ' + BAD_INFO[id][0]]);
          if (id === 'snare') p.rooted = s.turn + 1;
        }
      }
    }
  }
  // 알 낳기, 겁주기
  for (const k of KS) {
    const p = s.P[k], o = opp(k), id = X[k].pl.actId;
    if (id === 'lay') {
      if (p.eggs.includes(p.pos)) { rp.P[k].lay = -1; ev.push([k, '알 낳기. 이미 알이 있는 칸이다']); }
      else if (p.eggs.length >= 3) { rp.P[k].lay = -2; ev.push([k, '알 낳기. 알이 이미 3개다']); }
      else { p.eggs.push(p.pos); rp.P[k].lay = p.pos; ev.push([k, '알을 낳았다']); }
    }
    if (id === 'clump') { const path = pathCells(X[k].from, X[k].to); nextBlk[o] = uniq([...nextBlk[o], ...path]); path.forEach(c => { nextBlkT[o][c] = nextBlkT[o][c] || 'grass'; }); rp.P[k].clump = path; ev.push([k, '지나간 길에 잔디 뭉치를 쌓았다']); }
    if (id === 'scare') {
      const q = s.P[o], ok = !X[o].dive && (R(q.pos) === R(p.pos) || C(q.pos) === C(p.pos));
      if (ok) { q.rooted = s.turn + 1; rp.R[o].rooted = true; }
      rp.P[k].scare = ok; ev.push([k, ok ? '겁주기. 상대가 얼어붙었다' : '겁주기가 통하지 않았다']);
    }
  }
  // 뒤집힌 방(거울술사): 상대를 좌우 대칭 칸으로
  for (const k of KS) if (X[k].flip) {
    const o = opp(k), at = s.P[o].pos, to = MIR(at);
    if (to !== at && !X[o].anchor && !X[o].dive && !s.blk[o].includes(to)) { s.P[o].pos = to; rp.P[o].pulled = true; rp.P[o].final = to; rp.P[k].flip = to; ev.push([k, '뒤집힌 방. 상대가 반대편으로 옮겨졌다']); }
    else { rp.P[k].flip = -1; ev.push([k, to === at ? '뒤집힌 방. 상대가 가운데 줄에 있다' : '뒤집힌 방이 통하지 않았다']); }
  }
  // 매조련사의 매: 상대 쪽으로 다가가고, 붙어 있으면 발톱(휘파람 턴엔 추격 없음)
  for (const k of KS) {
    const p = s.P[k], o = opp(k), h = p.hawk; if (!h) continue;
    if (X[o].dive) { rp.P[k].hawkLost = true; continue; }
    const from = h.c, path = [from];
    if (!X[k].whistle) for (let n = 0; n < (X[k].treat ? 2 : 1); n++) { const nx = hawkStep(s, k, h.c); if (nx === h.c) break; h.c = nx; path.push(nx); }
    rp.P[k].hawkPath = path;
    const q = s.P[o];
    if (mdist(h.c, q.pos) <= 1) {
      const free = X[o].hawkBlocked && X[k].whistle;
      X[o].dmg += 1; srcAdd(o, '매의 발톱', 1); fx[o].push(q.pos); X[o].exHit = true; if (!free) h.hp -= 1;
      rp.P[k].talon = { c: q.pos, free, hp: h.hp }; ev.push([k, free ? '길목에서 매가 덮쳤다. 피해 1' : '매가 발톱을 세웠다. 피해 1']);
    }
  }
  // 관 뚜껑(묘지기), 올가미와 길목(사냥꾼)
  for (const k of KS) {
    const p = s.P[k], o = opp(k), at = s.P[o].pos;
    if (X[k].coffin && s.col.includes(p.pos)) { X[k].shield += 1; rp.P[k].coffin2 = true; }
    if (X[o].dive) continue;
    if (p.nooses.includes(at) && s.P[o].cls !== 'balloon' && !X[o].jump) { p.nooses = p.nooses.filter(q => q !== at); s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; p.tags = p.tags.filter(q => q !== at); p.tags.push(at); if (p.tags.length > 2) p.tags.shift(); rp.P[k].nooseHit = at; ev.push([k, '올가미에 걸렸다. 다음 턴 기본 이동 불가']); }
    if (!X[k].stay && (p.trays || []).includes(p.pos)) {   /* 바니걸: 떨어진 쟁반과 같은 칸으로 이동하면 쟁반이 깨지며 파편이 튄다 */
      const c = p.pos, cells = around(c); p.trays = p.trays.filter(q => q !== c); fx[o].push(...cells);
      SRC = '쟁반 파편'; const h = strike(o, cells, 1); if (h) X[o].exHit = true; else X[o].exMiss = true;
      rp.P[k].trayBreak = { c, cells, hit: h }; ev.push([k, '쟁반 파편이 튀었다. ' + (h ? '명중' : '빗나감')]);
    }
    if (p.acid && p.acid.at === s.turn) {   /* 연금술사: 지난 턴의 산성 웅덩이. 뛰어넘거나 떠 있으면 밟지 않는다 */
      const c = p.acid.c; p.acid = null;
      if (at === c && s.P[o].cls !== 'balloon' && !X[o].jump) { X[o].dmg += 1; srcAdd(o, '산성 웅덩이', 1); fx[o].push(c); X[o].exHit = true; rp.P[k].acidHit = c; ev.push([k, '상대가 산성 웅덩이를 밟았다. 피해 1']); }
      else rp.P[k].acidDry = c;
    }
    if ((p.cups || []).includes(at)) { p.cups = p.cups.filter(q => q !== at); const q = s.P[o]; q.mana = Math.min(manaMaxOf(q), q.mana + 1); p.drunk = s.turn + 1; rp.P[k].cup = at; ev.push([k, '상대가 칵테일을 마셨다. 다음 턴 내 공격 피해 +1']); }
    if (p.cls === 'hunter' && p.tags.includes(at)) { p.tags = p.tags.filter(q => q !== at); X[k].prey = true; p.preyUntil = s.turn + 1; rp.P[k].prey = at; ev.push([k, '길목을 지켰다. 이번 턴과 다음 턴 공격 피해 +1']); }
  }
  // 지뢰
  for (const k of KS) {
    const p = s.P[k], o = opp(k), m = s.P[o].pos;
    if (p.mines.includes(m) && s.P[o].cls !== 'balloon' && !X[o].dive && !X[o].jump) { p.mines = p.mines.filter(q => q !== m); X[o].dmg += 2; srcAdd(o, CARDS.mine.n, 2); X[k].heat += 1; fx[o].push(m); rp.P[k].mineHit = m; ev.push([k, '지뢰가 터졌다. 명중']); }
  }
  // 예고된 폭발
  for (const e of s.pend.filter(e => e.at === s.turn)) {
    fx[e.t].push(...e.cells);
    SRC = e.n || '예고 공격'; const hit = strike(e.t, e.cells, e.d);
    if (hit) X[e.t].exHit = true; else X[e.t].exMiss = true;
    if (e.id === 'comet') { const q = s.P[opp(e.t)]; const c0 = e.c0; q.stars = q.stars.filter(c => c !== c0); q.stars.push(c0); if (q.stars.length > 3) q.stars.shift(); }
    ev.push([opp(e.t), e.n + (e.id === 'spore' ? ' 피어남. ' : e.id === 'loading' ? ' 완료. ' : ' 폭발. ') + (hit ? '명중' : '빗나감')]);
    rp.ex.push({ t: e.t, cells: e.cells, id: e.id, hit, c0: e.c0 });
  }
  s.pend = s.pend.filter(e => e.at > s.turn);
  // 공격
  for (const k of KS) {
    const p = s.P[k], x = X[k], pl = x.pl, o = opp(k), id = pl.actId;
    let hit = false;
    if (x.surf) {
      const cells = [p.pos]; x.inst = true; fx[o].push(...cells);
      SRC = CLS[p.cls].pas[0]; const h = strike(o, cells, 2);
      x.surfHit = h; x.instHit = h; rp.P[k].surf = { c: p.pos, cells, hit: h };
      ev.push([k, '솟구치기. ' + (h ? '명중' : '빗나감')]);
    }
    if (id === 'frost') {
      const cells = cellsOf('frost', pl.tg), body = bodyAt(o, cells);
      x.inst = true; fx[o].push(...cells); rp.P[k].cells = cells;
      SRC = id === 'frost' ? CARDS.frost.n : CLS[p.cls].act[0]; hit = strike(o, cells, 1); x.instHit = hit;
      if (body) { s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; }
      ev.push([k, '빙결. ' + (hit ? '명중' : '빗나감')]);
    }
    if (id && CARDS[id].t === 'atk') {
      const card = CARDS[id], [o2, use2] = origin2(p, x.from, pl.ab), jug = () => uniq([pl.tg, ...shuffle(ALL.filter(c => c !== pl.tg)).slice(0, 2)]);
      const lv = lvOf(s, p, pl.ab), yy = card.yy ? (lv === 2 ? 'yin' : 'yang') : null;
      let cells = id === 'show' ? uniq([...(p.cups || []), ...(rp.P[k].cup != null ? [rp.P[k].cup] : [])].flatMap(around)) : (id === 'nova' || id === 'blackhole') && !p.stars.includes(pl.tg) ? [] : id === 'juggle' ? jug() : id === 'mimic' ? (p.seen ? p.seen.cells.slice() : []) : id === 'pop' ? popCells(p.pos, p.air) : id === 'crow' && !p.eggs.length ? [] : id === 'blade' ? pathCells(x.from, x.to) : cellsOf(id, pl.tg, p.pos, o2, use2, lv);
      if (id === 'nova') { rp.P[k].nova = cells.length ? pl.tg : -1; p.stars = p.stars.filter(q => q !== pl.tg); }
      if (X[o].wink && !card.delay && cells.length) { const sh = winkShift(cells, s.P[o].pos); if (sh !== cells) { cells = sh; rp.P[k].winked = true; ev.push([o, '윙크! 공격이 비껴갔다: ' + card.n]); } }
      if (id === 'show') { rp.P[k].cups = (p.cups || []).slice(); p.cups = []; }
      let d = id === 'mimic' ? (p.seen ? p.seen.d : 0) : card.dmg;
      if (p.cls === 'brawler' && (p.combo || 0) >= 3 && d > 0) { d += 1; rp.P[k].combo3 = true; }
      if (p.cls === 'mower' && (x.spd || 0) >= 2 && d > 0) { d += 1; rp.P[k].fast = true; }
      if (p.cls === 'bunny' && p.drunk === s.turn && d > 0) { d += 1; rp.P[k].drunk = true; }
      if (id === 'heel' && x.jump) { d += 1; rp.P[k].heelJump = true; }
      if (id === 'arrow' && Array.isArray(pl.tg) && pl.tg[0] === pl.tg[1]) { d += 1; rp.P[k].dbl = true; }
      if (id === 'flask' && (p.ess || 0) >= 1) { p.ess -= 1; d += 1; rp.P[k].ess = 1; ev.push([k, '정수를 부어 폭발 플라스크 피해 +1']); }
      if (id === 'encircle') cells = p.hawk ? around(p.hawk.c).filter(c => c !== p.hawk.c) : [];
      if (id === 'stoop') { cells = p.hawk ? hawkCross(p.hawk.c) : []; if (p.hawk) { p.hawk.hp -= 1; rp.P[k].stoopAt = p.hawk.c; rp.P[k].hkHp = p.hawk.hp; } }
      if (id === 'staff' && p.hawk && (R(pl.tg) === R(p.hawk.c) || C(pl.tg) === C(p.hawk.c))) { d += 1; rp.P[k].staffBonus = true; }
      if (id === 'magnum') { const n = (p.paint || []).length; cells = (p.paint || []).slice(); d = magnumDmg(n); rp.P[k].magnum = n; p.paint = []; ev.push([k, '명작 완성. 칠한 칸 ' + n + '곳']); }
      if (id === 'philo') { const n = Math.min(ESS_MAX, p.ess || 0); p.ess = 0; d = n; rp.P[k].ess = n; if (!n) cells = []; ev.push([k, n ? '현자의 돌. 정수 ' + n + '개를 쏟아부었다' : '현자의 돌. 정수가 없어 흩어졌다']); }
      if (id === 'wolves' && X[o].root0) { d += 1; rp.P[k].hunt = true; ev.push([k, '속박된 사냥감에게 달려들었다. 피해 +1']); }
      if (id === 'shard' && cells.length < 2) { d += 1; rp.P[k].overlap = true; }
      if (id === 'twin' && pl.tg === 1) { d += 1; rp.P[k].overlap = true; }
      if (id === 'kaleido' && cells.length < 4) { d += 1; rp.P[k].overlap = true; }
      if (id === 'bell') cells = uniq(s.P[o].trail || []);
      if (id === 'volley') { cells = uniq(p.tags.flatMap(around)); rp.P[k].volley = p.tags.slice(); p.tags = []; }
      if (id === 'wisp') cells = uniq([pl.tg, ...s.col]);
      if (id === 'bspear' && p.hp <= 3) { d = 2; rp.P[k].thirst = true; }
      if (id === 'feast') { if (p.hp >= 3) { p.hp -= 2; x.feast = true; rp.P[k].feast = 1; ev.push([k, '피의 향연. 체력 2를 냈다']); } else { cells = []; rp.P[k].feast = -1; ev.push([k, '피의 향연. 낼 피가 모자라다']); } }
      if (id === 'pickaxe' && (s.col.includes(pl.tg) || s.warn === pl.tg || s.crack.some(q => q.c === pl.tg))) { d = 2; rp.P[k].crackHit = true; }
      if (x.prey && d > 0) d += 1;
      if (p.amb === s.turn && d > 0) { d += 1; rp.P[k].amb = true; ev.push([k, '잠복에서 뛰쳐나왔다. 피해 +1']); }
      if (yy) { rp.P[k].yy = yy; if (id === 'talis' && yy === 'yin') d = 2; if (pl.ab) ev.push([k, '반전. ' + (yy === 'yang' ? '양' : '음') + '의 기운으로 썼다']); }
      if (p.cls === 'chicken') {
        const n = p.eggs.length; rp.P[k].eggN = n;
        if (id === 'peck') d = 1 + n; if (id === 'flap' && n >= 1) d = 2;
        if (id === 'crow') { d = n; rp.P[k].hatch = p.eggs.slice(); p.eggs = []; }
        if (pl.ab) d += 1;
      }
      if (id === 'pop') { rp.P[k].air = p.air; if (p.air >= 3) d = 3; p.air = 0; }
      if (p.cls === 'gambler' || id === 'dice' || id === 'allin' || id === 'coin' || id === 'roulette') {
        const two = pl.ab && p.cls === 'gambler', at = s.P[o].pos, die = () => 1 + Math.floor(Math.random() * 6), g = {};
        if (id === 'dice' || id === 'allin') { const a = die(), b = two ? die() : 0; g.v = Math.max(a, b); g.all = two ? [a, b] : [a]; d = id === 'dice' ? (g.v <= 2 ? 0 : g.v <= 5 ? 1 : 2) : Math.ceil(g.v / 2); if (!d) cells = []; }
        if (id === 'coin') { const f = () => Math.random() < 0.5; let h = f(); if (two) { const h2 = f(); if (h !== h2) h = at !== pl.tg; } g.coin = h ? 'h' : 't'; cells = h ? around(pl.tg) : [pl.tg]; d = h ? 1 : 2; }
        if (id === 'roulette') { const spin = () => shuffle(ALL.slice()).slice(0, 5); cells = spin(); if (two && !cells.includes(at)) cells = spin(); }
        if (two) { g.two = true; ev.push([k, '한 번 더 돌렸다']); }
        if (p.cls === 'gambler' && p.pot && d > 0) { d += p.pot; g.pot = p.pot; }
        rp.P[k].gam = g;
      }
      if (p.cls === 'blacksmith') { const t = p.temper[id] || 0; d += t; rp.P[k].temper = t; p.temper[id] = Math.min(2, t + 1); if (pl.ab) { x.pierce = true; ev.push([k, '달군 쇠로 내리쳤다']); } }
      if (p.cls === 'bard') { rp.P[k].beat = lv; x.sang = true; if (lv >= 3) d += 1; }
      if (id === 'blackhole') { d = cells.length ? p.stars.length : 0; rp.P[k].hole = cells.length ? d : -1; if (cells.length) p.stars = []; }
      rp.P[k].cells = cells; rp.P[k].stance = p.cls === 'samurai' && p.stance;
      if (p.cls === 'samurai') { if (p.stance) d += 1; if (pl.ab) { p.ki -= KI_MAX; ev.push([k, '잔상을 남겼다']); } }
      if (p.bossRage === s.turn && d > 0) { d += 1; rp.P[k].bossRage = true; ev.push([k, '보스의 분노로 피해 +1']); }
      if (p.cls === 'dullahan') { if (p.rage === s.turn) { d += 1; rp.P[k].rage = true; } if (pl.ab) { d += 1; x.pierce = true; ev.push([k, '분쇄의 일격']); } }
      if (id === 'head') p.see = s.turn + 1;
      if (card.heavy) { p.rooted = s.turn + 1; rp.R[k].stagger = true; }
      if (card.delay) {
        if (id === 'comet') { s.pend.push({ t: o, cells: [pl.tg], d: 3, at: s.turn + 1, n: '혜성', id, c0: pl.tg }); s.pend.push({ t: o, cells: cells.filter(c => c !== pl.tg), d: 2, at: s.turn + 1, n: '혜성 파편', id: 'cometR' }); }
        else s.pend.push({ t: o, cells, d, at: s.turn + card.delay, n: card.n, id });
        if (id === 'spore' && bodyAt(o, cells)) { s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; rp.P[k].sporeRoot = true; ev.push([o, '포자에 휘감겨 다음 턴 기본 이동 불가']); }
        ev.push([k, card.n + '을(를) 예고했다']);
      } else {
        const body = bodyAt(o, cells);
        x.inst = true; fx[o].push(...cells);
        SRC = card.n; hit = strike(o, cells, d);
        if (card.L && bodyAt(o, [pl.tg])) { X[o].dmg += 1; srcAdd(o, '날 끝', 1); rp.P[k].tip = true; ev.push([k, '날 끝에 걸렸다. 피해 +1']); }
        if (pl.ab && p.cls === 'chicken') { if (hit) rp.P[k].dare = 1; else { x.dmg += 1; srcAdd(k, '닭싸움 실패', 1); rp.P[k].dare = -1; ev.push([k, '닭싸움 실패. 제풀에 넘어졌다']); } }
        if (pl.ab && p.cls === 'scarecrow') { rp.P[k].both = true; ev.push([k, '되베기']); }
        if (id === 'bounce' && bodyAt(o, [p.pos])) { X[o].dmg += 1; srcAdd(o, '깔아뭉개기', 1); rp.P[k].crush = true; }
        if (pl.ab && p.cls === 'clown') { const c2 = id === 'juggle' ? jug() : cells; fx[o].push(...c2); if (strike(o, c2, d)) hit = true; rp.P[k].cells1 = cells; rp.P[k].cells2 = c2; cells = uniq([...cells, ...c2]); rp.P[k].cells = cells; rp.P[k].encore = true; ev.push([k, '앙코르']); }
        x.instHit = hit || !!x.surfHit;
        if (p.cls === 'gambler') { if (!hit) rp.P[k].gam.pot = 0; if (hit) { if (rp.P[k].gam.pot) { p.pot = 0; ev.push([k, '판돈을 걸어 피해 +' + rp.P[k].gam.pot]); } } else if (p.pot < 1) { p.pot += 1; rp.R[k].pot = true; ev.push([k, '빗나가 판돈 +1']); } }
        if (id !== 'mimic' && cells.length) s.P[o].seen = { cells: cells.slice(), d };
        if (body && id === 'pie') { const n = Math.min(2, s.P[o].mana); s.P[o].mana -= n; p.mana += n; rp.R[o].stolen = n; ev.push([k, '마나 ' + n + ' 훔침']); }
        if (body && id === 'helium' && !X[o].anchor && R(s.P[o].pos) !== 0) { s.P[o].pos = C(s.P[o].pos); rp.R[o].lift = s.P[o].pos; ev.push([o, '맨 윗줄로 떠올랐다']); }
        if (body && id === 'harpoon' && !X[o].anchor && R(s.P[o].pos) !== 2) { s.P[o].pos = 6 + C(s.P[o].pos); rp.R[o].drag = s.P[o].pos; ev.push([o, '작살에 걸려 맨 아랫줄로 끌려왔다']); }
        if (body && id === 'hookS' && !X[o].anchor && s.P[o].pos !== pl.tg) { s.P[o].pos = pl.tg; rp.R[o].drag = pl.tg; ev.push([o, '낫에 걸려 끌려왔다']); }
        if (id === 'boomer') s.pend.push({ t: o, cells: shapeN(pl.tg), d: 1, at: s.turn + 1, n: '되돌아오는 낫', id: 'boomer', c0: pl.tg });
        if (body && id === 'shiki' && yy === 'yin') { s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; }
        if (body && id === 'upper') { s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; rp.R[o].launch = true; }
        if ((id === 'brush' || id === 'roller') && cells.length) addPaint(p, cells);
        if (id === 'splash' && cells.length) { addPaint(p, cells); const sp = shuffle(around(cells[0]).filter(c => c !== cells[0] && !p.paint.includes(c))).slice(0, 2); addPaint(p, sp); rp.P[k].spl = sp; }
        if (pl.ab && p.cls === 'painter') { if (hit) { const q = s.P[o]; q.dyed = s.turn + 2; q.dyeBy = k; rp.R[o].dyed = true; ev.push([k, '물들이기! 상대가 2턴 동안 물들었다']); } else { rp.P[k].dyeMiss = true; ev.push([k, '물들이기가 빗나갔다']); } }
        if (id === 'acid' && cells.length) { p.acid = { c: cells[0], at: s.turn + 1 }; rp.P[k].acid = cells[0]; }
        if (hit && id === 'tray') { x.trayBack = true; rp.P[k].bounce = true; ev.push([k, '쟁반이 되돌아왔다. 마나 +1']); }
        if (!hit && id === 'tray' && cells.length) { const c = cells[0]; p.trays = (p.trays || []).filter(q => q !== c); p.trays.push(c); while (p.trays.length > 2) p.trays.shift(); rp.P[k].trayDrop = c; ev.push([k, '쟁반이 빗나가 그 칸에 떨어졌다']); }
        if (body && (id === 'vine' || id === 'gaze' || id === 'bolt')) { if (id === 'bolt') rp.R[o].shock = true; s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; }
        if (id === 'star') for (const c of pl.tg) { p.stars = p.stars.filter(q => q !== c); p.stars.push(c); if (p.stars.length > 3) p.stars.shift(); }
        if (id === 'discus') s.pend.push({ t: o, cells, d: 1, at: s.turn + 1, n: '돌아오는 원반', id: 'discus' });
        if (body && id === 'engulf') x.absorb = true;
        if (body && id === 'bite') x.drain = true;
        if (p.cls === 'chrono' && cells.length) { s.pend.push({ t: o, cells: cells.slice(), d: 1, at: s.turn + 1, n: '메아리', id: 'echo' }); rp.P[k].echoSet = true; }
        if (hit && id === 'bats') x.batMana = true;
        if (body && id === 'ghand' && rowOf(pl.tg).some(c => s.col.includes(c))) { s.P[o].rooted = s.turn + 1; rp.R[o].rooted = true; }
        if (body && id === 'drive' && !X[o].anchor && p.tags.length) {
          const at = s.P[o].pos, dist = q => Math.abs(R(q) - R(at)) + Math.abs(C(q) - C(at)), near = p.tags.filter(q => q !== at).sort((a, b) => dist(a) - dist(b))[0];
          if (near != null) { const to = stepToward(at, near); if (!s.blk[o].includes(to)) { s.P[o].pos = to; rp.R[o].drag = to; rp.R[o].herd = true; ev.push([o, '표식 쪽으로 몰렸다']); } }
        }
        ev.push([k, card.n + (rp.P[k].stance ? '(발도)' : '') + (yy ? (yy === 'yang' ? '(양)' : '(음)') : '') + '. ' + (hit ? '명중' : '빗나감')]);
      }
      if (p.cls === 'mage') for (const m of x.oldMarks) {
        fx[o].push(m); rp.P[k].marks.push(m);
        if (s.P[o].pos === m && !hit) { X[o].dmg += 1; srcAdd(o, '각인', 1); ev.push([k, '각인이 터졌다. 명중']); }
      }
    }
    // 마력 방출(마법사): 쓴 마나의 절반이 고른 칸의 피해. 4 이상이면 상하좌우에도 1
    if (pl.ab && p.cls === 'mage') {
      const n = pl.burn || 0, dc = Math.floor(n / 2), ringC = n >= 4 ? around(pl.tg).filter(c => c !== pl.tg) : [];
      x.inst = true; fx[o].push(pl.tg, ...ringC); rp.P[k].cells = [pl.tg, ...ringC]; rp.P[k].surge = { n, d: dc, c: pl.tg, ring: ringC };
      SRC = CLS[p.cls].act[0]; hit = strike(o, [pl.tg], dc); if (ringC.length && strike(o, ringC, 1)) hit = true; x.instHit = hit;
      ev.push([k, '마력 방출(마나 ' + n + '). ' + (hit ? '명중' : '빗나감')]);
    }
    // 잡기(격투가): 머물렀거나 막으려던 상대를 정면으로 끌어와 메친다
    if (pl.ab && p.cls === 'brawler') {
      const q = s.P[o], xo = X[o], ok = !xo.dive && (xo.stay || xo.shield > 0 || xo.parry || xo.mist || xo.immune);
      x.inst = true;
      if (ok) {
        const to = R(p.pos) * 3 + C(q.pos);
        if (to !== q.pos && !xo.anchor && !s.blk[o].includes(to)) { q.pos = to; rp.P[o].pulled = true; rp.P[o].final = to; }
        xo.parry = false; xo.mist = false; xo.immune = false; x.pierce = true; xo.dmg += 2; srcAdd(o, CLS.brawler.act[0], 2);
        fx[o].push(q.pos); rp.P[k].cells = [q.pos]; rp.P[k].grab = q.pos; hit = true; x.instHit = true; ev.push([k, '잡기! 상대를 정면으로 끌어와 메쳤다']);
      } else { p.rooted = s.turn + 1; rp.R[k].rooted = true; rp.P[k].grab = -1; ev.push([k, '잡기가 헛손질했다. 다음 턴 기본 이동 불가']); }
    }
    // 풀가동(잔디깎이): 지나간 모든 칸
    if (pl.ab && p.cls === 'mower') {
      const cells = pathCells(x.from, x.to), d = 1 + ((x.spd || 0) >= 2 ? 1 : 0);
      x.inst = true; fx[o].push(...cells); rp.P[k].cells = cells; rp.P[k].rush = true;
      SRC = CLS.mower.act[0]; hit = strike(o, cells, d); x.instHit = hit;
      ev.push([k, '풀가동. ' + (hit ? '명중' : '빗나감')]);
    }
    if (pl.ab && p.cls === 'mechanic') {
      const cells = detCells(p.mines); p.mines = [];
      x.inst = true; fx[o].push(...cells); rp.P[k].cells = cells; rp.P[k].det = true;
      SRC = id === 'frost' ? CARDS.frost.n : CLS[p.cls].act[0]; hit = strike(o, cells, 1); x.instHit = hit;
      ev.push([k, '원격 기폭. ' + (hit ? '명중' : '빗나감')]);
    }
    if (pl.ab && p.cls === 'bard') {
      const lv = p.beat, cells = lv >= 2 ? around(pl.tg) : [pl.tg];
      x.inst = true; fx[o].push(...cells); rp.P[k].cells = cells; rp.P[k].ens = lv; p.beat = 0; x.ens = true;
      SRC = CLS[p.cls].act[0]; hit = strike(o, cells, lv >= 3 ? 2 : 1); x.instHit = hit;
      ev.push([k, '앙상블(박자 ' + lv + '). ' + (hit ? '명중' : '빗나감')]);
    }
    if (pl.ab && p.cls === 'astronomer') {
      const cells = constCells(p.stars);
      x.inst = true; fx[o].push(...cells); rp.P[k].cells = cells; rp.P[k].constel = p.stars.slice();
      SRC = id === 'frost' ? CARDS.frost.n : CLS[p.cls].act[0]; hit = strike(o, cells, 1); x.instHit = hit;
      ev.push([k, '별자리. ' + (hit ? '명중' : '빗나감')]);
    }
    // 지반 붕괴(묘지기): 고른 줄에서 멀쩡한 칸 하나가 이번 턴 끝에 무너진다
    if (x.quake) {
      const line = pl.tg.o === 'r' ? rowOf(pl.tg.i) : colOf(pl.tg.i), ok = line.filter(c => !s.col.includes(c) && !s.crack.some(q => q.c === c && q.at <= s.turn));
      if (ok.length) {
        const c = pick(ok); s.crack = s.crack.filter(q => q.c !== c); s.crack.push({ c, at: s.turn });
        x.inst = true; fx[o].push(c); SRC = CARDS.quake.n; const h = strike(o, [c], 2); x.instHit = h; rp.P[k].quake = { c, hit: h }; rp.P[k].cells = [c];
        ev.push([k, '지반 붕괴. ' + (h ? '명중' : '빗나감')]);
      } else { rp.P[k].quake = { c: -1 }; ev.push([k, '지반 붕괴. 무너뜨릴 칸이 없다']); }
    }
    // 포탑
    const rows = p.turrets.filter(t => t.until >= s.turn).map(t => t.r);
    if (rows.length) {
      rp.P[k].turrets = uniq(rows);
      let n = 0;
      SRC = CARDS.turret.n; for (const r of rows) { fx[o].push(...rowOf(r)); if (strike(o, rowOf(r), 1)) n++; }
      if (n) x.heat += n;
      rp.P[k].turretHit = n > 0;
      if (n) X[o].exHit = true; else if (!x.inst) X[o].exMiss = true;
      ev.push([k, '포탑 사격. ' + (n ? '명중' : '빗나감')]);
    }
    p.turrets = p.turrets.filter(t => t.until > s.turn);
    // 석고상 낙석
    if (p.cls === 'statue' && x.stay && p.hp > 0) {
      const c = p.pos; fx[o].push(c); SRC = CLS[p.cls].pas[0]; const h = strike(o, [c], 1);
      rp.P[k].crumb = { c, hit: h };
      if (h) X[o].exHit = true; else if (!x.inst) X[o].exMiss = true;
      ev.push([k, '낙석. ' + (h ? '명중' : '빗나감')]);
    }
    // 날씨
    const w = p.weather;
    if (w) {
      const over = pl.ab && p.cls === 'shaman';
      let wh = false, cells = [];
      if (w.t === 'heatw') { if (X[o].stay && !rp.P[o].pulled && !X[o].dive) { X[o].dmg += over ? 2 : 1; srcAdd(o, WX_NAME.heatw, over ? 2 : 1); wh = true; } }
      else {
        const lines = over ? [w.i, (w.i + w.dir + 3) % 3] : [w.i];
        cells = uniq(lines.flatMap(l => (w.t === 'storm' ? colOf(l) : rowOf(l))));
        fx[o].push(...cells); SRC = WX_NAME[w.t]; wh = strike(o, cells, 1);
      }
      rp.P[k].wx = { t: w.t, cells, hit: wh, over };
      if (wh) { X[o].exHit = true; if (!w.ext) { w.ext = true; w.left += 1; } } else if (!x.inst) X[o].exMiss = true;
      ev.push([k, WX_NAME[w.t] + (over ? '(폭주)' : '') + '. ' + (wh ? '명중' : '빗나감')]);
      w.i = (w.i + w.dir + 3) % 3; w.left -= 1;
      if (w.left <= 0) p.weather = null;
    }
  }
  // 화가 완성: 다 칠해진 줄은 바로 터진다(줄마다 피해 1), 그 줄의 물감은 지워진다
  for (const k of KS) {
    const p = s.P[k], o = opp(k); if (!(p.paint || []).length) continue;
    const lines = paintDone(p.paint); if (!lines.length) continue;
    let h = false; SRC = CLS.painter.pas[0];
    for (const l of lines) { fx[o].push(...l); if (strike(o, l, 1)) h = true; }
    const gone = uniq(lines.flat()); p.paint = p.paint.filter(c => !gone.includes(c));
    if (h) X[o].exHit = true; else X[o].exMiss = true;
    rp.P[k].bingo = { lines, hit: h }; ev.push([k, '완성! ' + lines.length + '줄이 터졌다. ' + (h ? '명중' : '빗나감')]);
  }
  // 피해 적용
  const refl = { a: 0, b: 0 };
  for (const k of KS) {
    const x = X[k], p = s.P[k]; rp.R[k].raw = x.dmg; rp.R[k].src = x.src || [];
    { const o = opp(k), q = s.P[o]; if (q.pow && X[o].inst) { if (X[o].instHit && x.dmg > 0) { x.dmg += 1; rp.R[k].powHit = true; ev.push([o, '축복받은 일격. 피해 +1']); } q.pow = false; } }
    if (x.eggs) { x.dmg += 1; rp.R[k].eggs = x.eggs; ev.push([k, '깨진 알에 놀라 피해 1']); }
    if (x.dmg > 0 && x.parry) { x.dmg = 0; refl[opp(k)] = 1; rp.R[k].pOk = true; ev.push([k, '공격을 받아넘겼다']); }
    if (x.dmg > 0 && x.mist) { rp.R[k].gOk = x.dmg; rp.R[k].mist = true; x.dmg = 0; ev.push([k, '안개가 공격을 흘려보냈다']); }
    if (x.dmg > 0 && x.immune) { rp.R[k].gOk = x.dmg; rp.R[k].immune = true; if (x.ambush) rp.R[k].ambush = true; x.dmg = 0; ev.push([k, x.ambush ? '숨어 있어 피해를 받지 않았다' : '수호 부적이 피해를 막았다']); }
    if (s.tree && s.tree[k] === p.pos && x.dmg > 0) { x.dmg -= 1; rp.R[k].cover = true; ev.push([k, '나무에 가려 피해 -1']); }
    if (x.block && x.dmg > 0) { p.rage = s.turn + 1; rp.R[k].rage = true; }
    if (x.shield && x.dmg > 0 && X[opp(k)].pierce) { rp.R[k].pierced = true; ev.push([opp(k), '분쇄가 방어를 부쉈다']); }
    else if (x.shield && x.dmg > 0) { rp.R[k].gOk = Math.min(x.shield, x.dmg); x.dmg -= rp.R[k].gOk; }
    if (p.cls === 'balloon' && p.air >= 3 && x.dmg > 0) { x.dmg += 1; p.air = 0; rp.R[k].burst = true; ev.push([k, '부푼 몸이 터져 피해 +1']); }
    if (x.surf && x.dmg > 0 && !x.bubble) { x.dmg += 1; rp.R[k].gasp = true; ev.push([k, '솟아오르다 맞아 피해 +1']); }
    if (p.cls === 'slime' && x.dmg > 2) { x.dmg = 2; rp.R[k].cap = true; ev.push([k, '탄성으로 피해를 2로 줄였다']); }
  }
  for (const k of KS) {
    const p = s.P[k], t = X[k].dmg + refl[k], o = opp(k);
    if (t > 0) { p.hp -= t; ev.push([k, '피해 ' + t]); }
    rp.R[k].dmg = X[k].dmg; rp.R[k].refl = refl[k];
    rp.R[k].dodge = X[k].dmg === 0 && !rp.R[k].pOk && !rp.R[k].gOk && !rp.R[k].cover && !!((X[o].inst && !X[o].instHit) || (X[k].exMiss && !X[k].exHit));
  }
  // 기, 지형, 회복, 마나
  for (const k of KS) {
    const p = s.P[k], x = X[k], o = opp(k);
    if (p.cls === 'samurai' && X[o].inst && !X[o].instHit && p.ki < KI_MAX) { p.ki += 1; rp.R[k].ki = true; ev.push([k, '공격을 피해 기 +1']); }
    if (s.P[o].brambles.includes(p.pos) && p.cls !== 'balloon' && !x.dive && !x.jump) { p.hp -= 1; rp.R[k].thorn = true; fx[k].push(p.pos); ev.push([k, '가시덤불에 찔려 피해 1']); }
    if (s.col.includes(p.pos) && !x.dive && !x.jump && p.cls !== 'grave') { p.hp -= 1; rp.R[k].col = true; ev.push([k, '무너진 칸에서 피해 1']); }
    if (x.drain && p.hp > 0 && p.hp < hpMaxOf(p)) { p.hp += 1; rp.R[k].drain = true; ev.push([k, '피를 빨아 체력 +1']); }
    if (x.feast && X[o].dmg > 0 && p.hp > 0 && p.hp < hpMaxOf(p)) { p.hp += 1; rp.R[k].drain = true; ev.push([k, '피의 향연으로 체력 +1']); }
    if (x.absorb && p.hp > 0 && p.hp < hpMaxOf(p)) { p.hp += 1; rp.R[k].absorb = true; ev.push([k, '삼켜서 체력 +1']); }
    if (p.hp < hp0[k] && p.hp > 0 && p.rl && p.rl.includes('thornmail') && !p.thornUsed) { p.thornUsed = true; s.P[o].hp -= 1; rp.R[k].thornMail = true; ev.push([k, '가시 갑옷이 되갚아 상대에게 피해 1']); }
    const lost = p.hp < hp0[k];
    if (x.heal) {
      if (!lost && p.hp < hpMaxOf(p)) { p.hp += 1; rp.R[k].heal = true; ev.push([k, '광합성으로 체력 +1']); }
      else { rp.R[k].healFail = true; ev.push([k, lost ? '광합성이 끊겼다' : '광합성. 체력이 이미 가득하다']); }
    }
    if (p.cls === 'dullahan' && p.hp <= 0 && !p.undead) { p.hp = 1; p.undead = true; rp.R[k].undead = true; ev.push([k, '불사. 체력 1로 버텼다']); }
    p.calm = lost ? 0 : p.calm + 1;
    if (p.cls === 'druid' && p.calm >= 4 && p.hp > 0 && p.hp < hpMaxOf(p)) { p.hp += 1; p.calm = 0; rp.R[k].regen = true; ev.push([k, '재생으로 체력 +1']); }
    if (p.cls === 'gambler' && x.bluff && X[k].dmg === 0 && !refl[k] && p.pot < 1) { p.pot += 1; rp.R[k].pot = true; ev.push([k, '허세가 통해 판돈 +1']); }
    if (p.cls === 'bard' && !x.ens) { if (x.sang) p.beat = Math.min(3, p.beat + 1); else if (!x.rest && p.beat) { p.beat = 0; rp.R[k].offbeat = true; ev.push([k, '박자가 끊겼다']); } }
    if (p.cls === 'brawler') { if (x.instHit || (x.counter && (rp.R[k].raw || 0) > 0)) { p.combo = Math.min(3, (p.combo || 0) + 1); rp.R[k].combo = p.combo; } else if (p.combo) { p.combo = 0; rp.R[k].comboEnd = true; ev.push([k, '콤보가 끊겼다']); } }
    if (p.cls === 'mower') { p.mowed = p.mowed || []; if (!p.mowed.includes(p.pos)) { p.mowed.push(p.pos); if ((p.fuel || 0) < 3) { p.fuel = (p.fuel || 0) + 1; rp.R[k].fuel = true; } } if (p.mowed.length >= 9) { p.mowed = [p.pos]; rp.R[k].regrow = true; ev.push([k, '잔디가 다시 자랐다']); } }
    if (p.cls === 'alch' && !x.pl.actId && (p.ess || 0) < ESS_MAX) { p.ess = (p.ess || 0) + 1; rp.R[k].ess = true; ev.push([k, '증류. 정수 +1']); }
    if (p.acid && p.acid.at <= s.turn) p.acid = null;
    if (p.hawk && p.hawk.hp <= 0) { rp.R[k].hawkGone = p.hawk.c; p.hawk = null; ev.push([k, '지친 매가 날아가 버렸다']); }
    if (x.anti) { const q = s.P[o], cl = []; if (p.rooted > s.turn) { p.rooted = 0; cl.push('속박'); } if (p.silenced > s.turn) { p.silenced = 0; cl.push('봉인'); } if (q.drunk > s.turn) { q.drunk = 0; cl.push('취기'); } if (cl.length) { rp.R[k].cleanse = cl; ev.push([k, '해독제가 ' + cl.join('·') + '을(를) 씻어 냈다']); } }
    let gain = 1;
    if (s.well[k] === p.pos) { const w = p.cls === 'mage' ? 4 : 2; gain += w; s.well[k] = null; rp.R[k].well = w; ev.push([k, '마나 샘에서 마나 +' + w]); }
    if (x.stay && !x.frozen) { gain += 1; rp.R[k].focus = true; }
    if (p.cls === 'mechanic' && x.heat) { gain += x.heat; rp.R[k].heat = x.heat; ev.push([k, '예열로 마나 +' + x.heat]); }
    if (p.cls === 'archaeologist' && x.dug) gain += 1;
    if (p.cls === 'onmyoji' && s.turn % 2 === 0) { gain += 1; rp.R[k].yin = true; }
    if (x.wardMana) gain += 1;
    if (p.cls === 'merfolk') { p.dive = x.dive; if (x.surf) p.diveCd = s.turn + 2; }
    if (p.eggs && p.eggs.length) p.eggs = p.eggs.filter(c => !s.col.includes(c));
    if (p.cls === 'clown' && x.inst && !x.instHit) { gain += 1; rp.R[k].laugh = true; ev.push([k, '야유로 마나 +1']); }
    if (p.cls === 'astronomer' && p.stars.includes(s.P[o].pos)) { gain += 1; rp.R[k].starlight = true; ev.push([k, '별빛으로 마나 +1']); }
    if (x.trayBack) { gain += 1; rp.R[k].trayBack = true; }
    if (x.batMana) { gain += 1; rp.R[k].batMana = true; ev.push([k, '박쥐 떼가 마나 +1을 물어 왔다']); }
    if (x.mist) { gain = 0; rp.R[k].dry = true; ev.push([k, '안개 속에서는 마나를 회복하지 못한다']); }
    if (X[o].lull) { gain = 0; rp.R[k].lull = true; ev.push([k, '자장가에 마나를 회복하지 못했다']); }
    if (s.bless && s.bless[k] === p.pos && p.hp > 0 && !x.dive) {
      const t = s.bless.t; s.bless[k] = null; rp.R[k].bless = t;
      if (t === 'hp') { if (p.hp < hpMaxOf(p)) p.hp += 1; } else if (t === 'pow') p.pow = true; else gain += 99;
      ev.push([k, '축복의 칸: ' + BLESS[t][1]]);
    }
    if (p.rl && p.hp > 0) { if (p.rl.includes('stone') && s.turn % 3 === 0) { gain += 1; ev.push([k, '명상석으로 마나 +1']); } if (p.rl.includes('abup') && x.pl.ab) { gain += 1; ev.push([k, '능력 강화로 마나 +1']); } }
    p.mana = Math.min(manaMaxOf(p), p.mana + gain);
    p.prev = x.from; p.hurtLast = p.hp < hp0[k]; p.trail = [...(p.trail || []), p.pos].slice(-2);
    p.stance = x.stay;
    /* 재정비: 남은 손패(유물 카드 제외)를 버린 더미로 보내고 아래에서 4장까지 새로 채운다 */
    if (x.regroup) { p.disc.push(...p.hand.filter(c => !CARDS[c].relic).map(c => tmOrig(p, c))); p.hand = p.hand.filter(c => CARDS[c].relic); }
    if (draw(p)) rp.R[k].resh = true;
  }
  /* 기록: 최근 3턴의 카드, 결과 화면용 통계 */
  if (!s.hist) s.hist = []; if (!s.st) s.st = { a: { atk: 0, hit: 0, best: 0, lost: 0 }, b: { atk: 0, hit: 0, best: 0, lost: 0 } };
  s.hist.push({ t: s.turn, a: { mv: rp.P.a.mvId, act: rp.P.a.actId, ab: rp.P.a.ab }, b: { mv: rp.P.b.mvId, act: rp.P.b.actId, ab: rp.P.b.ab } });
  if (s.hist.length > 3) s.hist.shift();
  for (const k of KS) { const st = s.st[k], o = opp(k); if (X[k].inst) { st.atk += 1; if (X[k].instHit) st.hit += 1; } st.best = Math.max(st.best, X[o].dmg); st.lost += Math.max(0, hp0[k] - Math.max(0, s.P[k].hp)); }
  s.turn += 1;
  /* 보스: 중보스는 체력이 절반 이하가 되면 한 번 분노(다음 턴 공격 피해 +1), 최종보스는 3턴마다 가로 한 줄에 피해 2를 예고 */
  for (const k of KS) {
    const p = s.P[k], o = opp(k); if (!p.boss || p.hp <= 0) continue;
    if (p.boss === 'mid' && !p.raged && p.hp <= hpMaxOf(p) / 2) { p.raged = true; p.bossRage = s.turn; rp.R[k].enrage = true; ev.push([k, '분노했다. 다음 턴 공격 피해 +1']); }
    if (p.boss === 'final' && s.turn % 3 === 0 && s.P[o].hp > 0) { const row = Math.floor(Math.random() * 3); s.pend.push({ t: o, cells: rowOf(row), d: 2, at: s.turn, n: '보스의 일격', id: 'bossrow' }); rp.bossRow = { t: o, row }; ev.push([k, '보스의 일격을 예고했다']); }
  }
  for (const k of KS) { const q = s.P[opp(k)]; q.pillars = q.pillars.filter(z => z.until >= s.turn); nextBlk[k] = uniq([...nextBlk[k], ...q.pillars.map(z => z.c)]); q.pillars.forEach(z => { nextBlkT[k][z.c] = 'pil'; }); }
  s.blk = nextBlk; s.blkT = nextBlkT;   /* 막힌 칸의 종류: ice(빙결) · grass(잔디 뭉치) · pil(기둥) */
  if (s.warn != null) { s.col.push(s.warn); s.warn = null; }
  { const due = s.crack.filter(q => q.at < s.turn); if (due.length) { rp.fall = []; for (const q of due) if (!s.col.includes(q.c)) { s.col.push(q.c); rp.fall.push(q.c); } s.crack = s.crack.filter(q => q.at >= s.turn); } }
  if (s.turn >= COLLAPSE_FROM - 1) { const left = ALL.filter(i => !s.col.includes(i)); if (left.length) s.warn = pick(left); }
  if (s.turn % 3 === 0) for (const k of KS) s.well[k] = pick(ALL.filter(i => !s.col.includes(i) && i !== s.P[k].pos));
  if (s.sand && s.sand.at < s.turn) s.sand = null;
  if (s.arena === 'desert' && s.turn % 3 === 0) s.sand = { o: pick(['r', 'c']), i: Math.floor(Math.random() * 3), dir: pick([-1, 1]), at: s.turn };
  if (s.arena === 'forest') { if (!s.tree) s.tree = { a: null, b: null }; for (const k of KS) if (s.tree[k] == null || s.turn % 4 === 0) { const c = pick(ALL.filter(i => !s.col.includes(i) && i !== s.tree[k] && i !== s.P[k].pos)); s.tree[k] = c == null ? null : c; } }
  if (s.bless && s.turn > s.bless.until) s.bless = null;
  if (s.turn % 10 === 0) { s.bless = { t: pick(['hp', 'pow', 'mana']), until: s.turn + 2 }; for (const k of KS) { const c = pick(ALL.filter(i => !s.col.includes(i) && i !== s.P[k].pos && i !== s.well[k])); s.bless[k] = c == null ? null : c; } rp.bless = s.bless.t; }
  s.rp = rp;
  s.ev = ev; s.fx = { a: uniq(fx.a), b: uniq(fx.b) };
  const da = s.P.a.hp <= 0, db = s.P.b.hp <= 0;
  s.winner = da && db ? 'draw' : da ? 'b' : db ? 'a' : null;
  return s;
}

/* 연습 상대: 낼 수 있는 수 중에서 무작위 */
function randTg(kind) {
  return kind === 'sq' || kind === 'cell' ? pick(ALL) : kind === 'col' || kind === 'row' ? pick([0, 1, 2])
    : kind === 'line' ? { o: pick(['r', 'c']), i: pick([0, 1, 2]) } : kind === 'two' ? shuffle(ALL.slice()).slice(0, 2) : kind === 'two2' ? (c => [c, Math.random() < 0.35 ? c : pick(ALL)])(pick(ALL)) : null;
}
/* 무작위 봇: 낼 수 있는 카드를 아무 칸에나 쓴다. o.mv가 켜지면 이동 카드도 쓴다 */
/* 봇의 재정비 판단: 다음 턴에도 못 쓸 비싼 카드가 2장 이상이거나, 공격 카드가 하나도 없을 때만 패를 간다 */
function regroupWise(p) {
  const rest = p.hand.filter(c => c !== 'regroup' && CARDS[c].t !== 'move' && !CARDS[c].relic);
  return rest.filter(c => CARDS[c].c > p.mana + 1).length >= 2 || !rest.some(c => CARDS[c].t === 'atk');
}
function botRandom(s, k, o) {
  const p = s.P[k], A = CLS[p.cls].ab, pl = { mv: null, act: null, dest: p.pos, tg: null, ab: false };
  if (p.silenced !== s.turn) {
    const opts = p.hand.map((id, i) => ({ id, i })).filter(o => CARDS[o.id].t !== 'move' && !(o.id === 'show' && !(p.cups || []).length) && !(o.id === 'philo' && !(p.ess || 0)) && !(o.id === 'magnum' && !(p.paint || []).length) && !((o.id === 'encircle' || o.id === 'stoop') && !p.hawk) && !(o.id === 'release' && p.hawk && p.hawk.hp >= 2) && (cardCost(p, o.id) <= p.mana || (p.cls === 'vampire' && p.hp >= 3 && Math.random() < 0.45)) && o.id !== 'ride' && !((o.id === 'nova' || o.id === 'blackhole') && !p.stars.length) && !(o.id === 'mimic' && !p.seen) && !(o.id === 'pop' && !p.air) && !(o.id === 'crow' && !p.eggs.length) && !(o.id === 'lay' && p.eggs.length >= 3) && !(o.id === 'lens' && !p.stars.length) && !(o.id === 'feast' && p.hp < 3) && !(o.id === 'volley' && !p.tags.length) && !(o.id === 'regroup' && !regroupWise(p)) && !(p.cls === 'bard' && p.beat && CARDS[o.id].t !== 'atk' && o.id !== 'rest' && Math.random() < 0.7));
    if (A.slot && p.mana >= A.cost && abReady(s, p, null) && Math.random() < (p.cls === 'mage' ? (p.mana >= 6 ? 0.55 : p.mana >= 4 ? 0.3 : 0.06) : p.cls === 'astronomer' ? (p.stars.length >= 2 ? 0.6 : 0) : p.cls === 'bard' ? (p.beat >= 3 ? 0.7 : p.beat === 2 ? 0.2 : 0) : p.cls === 'brawler' ? 0.2 : p.cls === 'mower' ? 0.55 : 0.35)) { pl.ab = true; pl.tg = randTg(p.cls === 'mirror' ? CARDS[mirrorCopy(s, k)].tg : A.tg); }
    else if (opts.length && Math.random() < 0.8) { const o = pick(opts); pl.act = o.i; pl.tg = o.id === 'nova' || o.id === 'blackhole' ? pick(p.stars) : randTg(CARDS[o.id].tg);
      if ((p.paint || []).length && (o.id === 'brush' || o.id === 'sketch' || o.id === 'splash') && Math.random() < 0.6) { const need = PAINT_LINES.map(l => l.filter(c => !p.paint.includes(c))).filter(m => m.length === 1).map(m => m[0]); if (need.length) pl.tg = pick(need); }
      if (o.id === 'roller' && Math.random() < 0.5) pl.tg = R(s.P[opp(k)].pos);
      if (p.cls === 'tamer') {   /* 매조련사: 매가 없으면 풀어놓기를 우선, 매는 상대 곁에, 지팡이는 매와 일직선으로 */
        const q = s.P[opp(k)].pos, rel = opts.find(x => x.id === 'release');
        if (!p.hawk && rel && Math.random() < 0.7) { pl.act = rel.i; pl.tg = pick(around(q)); }
        else if (o.id === 'release') pl.tg = pick(around(q));
        else if (o.id === 'staff' && p.hawk && Math.random() < 0.6) { const ln = ALL.filter(c => R(c) === R(p.hawk.c) || C(c) === C(p.hawk.c)), nr = ln.filter(c => mdist(c, q) <= 1); pl.tg = pick(nr.length ? nr : ln); } } }
    const actId = pl.act != null ? p.hand[pl.act] : null;
    if (!A.slot && abReady(s, p, actId) && p.mana >= A.cost + (actId ? cardCost(p, actId) : 0) && Math.random() < (p.cls === 'samurai' ? 1 : p.cls === 'vampire' ? (p.hp >= 4 ? 0.12 : 0.03) : p.cls === 'hunter' ? 0.45 : p.cls === 'alch' ? ((p.ess || 0) >= 2 ? 0.35 : 0.12) : p.cls === 'painter' ? 0.4 : p.cls === 'tamer' ? 0.4 : p.cls === 'admin' ? (regroupWise(p) ? 0.6 : 0.04) : 0.3)) pl.ab = true;
    if (pl.ab && p.cls === 'tamer') {   /* 휘파람: 상대가 갈 법한 이웃 칸에 매를 미리 앉힌다 */
      const h = p.hawk, q = s.P[opp(k)].pos, ok = ALL.filter(i => i !== h.c && mdist(h.c, i) <= 2 && !s.blk[opp(k)].includes(i) && !s.col.includes(i)), nb = ok.filter(i => mdist(i, q) === 1);
      if (ok.length) pl.wt = pick(nb.length ? nb : ok); else pl.ab = false;
    }
    if (pl.ab && p.cls === 'alch') {   /* 변성: 내지 않는 손패 하나를 피해가 큰 후보로 바꿔 둔다 */
      const hs = p.hand.map((id, i) => i).filter(i => i !== pl.act && tmPool(p.hand[i]).length && !(actId === 'philo' && (p.ess || 0) < 2));
      if (hs.length) { const i = pick(hs), c = tmChoices(s, k, i, p.hand[i]).sort((a, b) => (CARDS[b].dmg || 0) - (CARDS[a].dmg || 0))[0]; pl.tm = { i, to: c }; } else pl.ab = false;
    }
  }
  const actId = pl.act != null ? p.hand[pl.act] : null;
  let mvId = null;
  if (o && o.mv && !(actId && CARDS[actId].mv) && Math.random() < 0.3) {
    const spent = (actId ? CARDS[actId].c : 0) + (pl.ab ? A.cost : 0), ms = p.hand.map((id, i) => ({ id, i })).filter(q => CARDS[q.id].t === 'move' && CARDS[q.id].c + spent <= p.mana);
    if (ms.length && !(pl.ab && p.cls === 'statue')) { const m = pick(ms); pl.mv = m.i; mvId = m.id; }
  }
  let ds = legalDests(s, k, mvId, actId && CARDS[actId].mv ? actId : null, pl.ab && (p.cls === 'vampire' || p.cls === 'mower'));
  if (pl.ab && p.cls === 'mower' && !ds.length) pl.ab = false;
  if (!ds.length && mvId) { pl.mv = null; mvId = null; ds = legalDests(s, k, null, actId && CARDS[actId].mv ? actId : null); }
  if (!ds.length) { pl.act = null; ds = legalDests(s, k, null, null); }
  const w = s.P[opp(k)].weather, wxBad = i => !!w && (w.t === 'heatw' ? i === p.pos : w.t === 'storm' ? C(i) === w.i : R(i) === w.i);
  const foe = s.P[opp(k)], safe = ds.filter(i => !foe.brambles.includes(i) && (p.cls === 'grave' || (!s.col.includes(i) && !(s.crack || []).some(q => q.c === i && q.at <= s.turn))) && !wxBad(i) && !(foe.tags || []).includes(i) && !(foe.nooses || []).includes(i) && !(foe.acid && foe.acid.at === s.turn && foe.acid.c === i));
  if (safe.length) ds = safe;
  if (pl.ab && p.cls === 'slime') { const mvd = ds.filter(i => i !== p.pos); if (mvd.length) ds = mvd; }
  if (actId === 'dig') { const fresh = ds.filter(i => !p.dug.includes(i)); if (fresh.length) ds = fresh; }
  { const bl = s.bless ? s.bless[k] : null, tr = s.tree ? s.tree[k] : null;   /* 축복의 칸과 나무 칸을 일부러 찾아간다 */
    if (bl != null && ds.includes(bl) && Math.random() < 0.55) ds = [bl]; else if (tr != null && ds.includes(tr) && Math.random() < 0.3) ds = [tr]; }
  pl.dest = pl.ab && p.cls === 'statue' ? p.pos : pick(ds);
  return pl;
}
/* 한 턴 뒤의 판을 봇 입장에서 매긴 점수 */
function botScore(r, k, hp0) {
  const o = opp(k), me = r.P[k], op = r.P[o];
  let sc = 10 * ((hp0[o] - Math.max(0, op.hp)) - (hp0[k] - Math.max(0, me.hp)));
  if (me.hp <= 0) sc -= op.hp <= 0 ? 15 : 80; else if (op.hp <= 0) sc += 60;
  sc += 0.6 * me.mana - 0.3 * op.mana;
  for (const e of r.pend) { if (e.t === o) sc += e.d * e.cells.length / 9 * 3; else if (!e.hidden && e.at === r.turn && e.cells.includes(me.pos)) sc -= e.d * 2.5; }
  sc += me.stars.length * 1.2 + me.air * 0.8 + (me.beat || 0) + (me.pot || 0) + Object.values(me.temper || {}).reduce((a, b) => a + b, 0) * 1.2 + (me.clone != null ? 1.5 : 0) + (me.weather ? 2 : 0) + (me.eggs || []).length * 1.5 + (me.dive ? 2 : 0)
    + me.brambles.length + me.mines.length * 1.2 + me.turrets.length + me.pillars.length * 0.8 + me.marks.length + me.ki * 0.8 + (me.stance ? 0.5 : 0) + (me.see > r.turn - 1 ? 0.5 : 0);
  if (r.warn === me.pos && me.cls !== 'grave') sc -= 2;
  sc += ((me.tags || []).length - (op.tags || []).length) * 0.9 + ((me.nooses || []).length - (op.nooses || []).length) * 0.9 + (me.amb === r.turn ? 1.2 : 0) + (me.stash ? 1.5 : 0) + (me.ess || 0) * 1.1 + (me.acid ? 0.8 : 0) + (me.paint || []).length * 0.45 + PAINT_LINES.filter(l => l.filter(c => (me.paint || []).includes(c)).length === 2).length * 0.6 + ((op.dyed || 0) > r.turn - 1 ? 1.2 : 0)
    + (me.hawk ? 1.4 + me.hawk.hp * 0.5 + Math.max(0, 2 - mdist(me.hawk.c, op.pos)) * 0.4 : 0) - (op.hawk ? 1.4 + op.hawk.hp * 0.5 : 0);
  if (me.cls === 'grave' && op.cls !== 'grave') sc += r.col.length * 1.1 + (r.crack || []).length * 1.6; else if (op.cls === 'grave' && me.cls !== 'grave') sc -= r.col.length * 0.6 + (r.crack || []).length;
  if (me.cls !== 'grave' && (r.crack || []).some(q => q.c === me.pos)) sc -= 1.5;
  if (op.brambles.includes(me.pos)) sc -= 1.5;
  if (me.rooted === r.turn) sc -= 1.5; if (op.rooted === r.turn) sc += 1.5;
  if (me.silenced === r.turn) sc -= 3; if (op.silenced === r.turn) sc += 3;
  if (me.pow) sc += 4; if (op.pow) sc -= 4;
  if (r.tree) { if (r.tree[k] === me.pos) sc += 1.2; if (r.tree[o] === op.pos) sc -= 0.6; }
  if (r.bless && r.bless[k] != null) sc += Math.max(0, 2 - (Math.abs(R(r.bless[k]) - R(me.pos)) + Math.abs(C(r.bless[k]) - C(me.pos)))) * 1.2;
  if (r.sand && r.sand.at === r.turn && (r.sand.o === 'r' ? R(me.pos) : C(me.pos)) === r.sand.i) sc -= 0.4;
  return sc;
}
/* 봇: 쉬움은 무작위. 보통과 어려움은 후보 계획을 여러 개 뽑아, 상대가 낼 법한 수 여러 개에 대해 실제 규칙으로 한 턴을 돌려 보고 평균 점수가 가장 높은 것을 고른다.
   공정하게 하려고 상대의 숨은 정보(손패, 지뢰, 깜짝 상자)는 지우고 직업과 마나만으로 상대 수를 짐작한다 */
function botPlan(s, k, lv) {
  if (lv !== 'normal' && lv !== 'hard') return botRandom(s, k);
  if (lv === 'normal' && Math.random() < 0.2) return botRandom(s, k);
  const N = lv === 'hard' ? 28 : 8, M = lv === 'hard' ? 8 : 3, o = opp(k), hp0 = { a: s.P.a.hp, b: s.P.b.hp };
  const view = JSON.parse(JSON.stringify(s)); view.P[o].mines = []; view.pend = view.pend.filter(e => !(e.hidden && e.t === k));
  const base = JSON.stringify(view), pool = [...(CLS[s.P[o].cls].common || COMMON), ...CLS[s.P[o].cls].deck], opps = [];
  for (let m = 0; m < M; m++) { const c = JSON.parse(base); c.P[o].hand = shuffle(pool.slice()).slice(0, c.P[o].hand.length); opps.push([c.P[o].hand, m === 0 ? { dest: c.P[o].pos } : botRandom(c, o, { mv: true })]); }
  let best = null, bestSc = -Infinity;
  for (let n = 0; n < N; n++) {
    const cand = n === 0 ? { mv: null, act: null, dest: s.P[k].pos, tg: null, ab: false } : botRandom(s, k, { mv: true }); let sc = 0;
    for (const [hand, op] of opps) { const c = JSON.parse(base); c.P[o].hand = hand.slice(); let r; try { r = resolve(c, { [k]: cand, [o]: op }) || c; } catch (e) { sc -= 50; continue; } sc += botScore(r, k, hp0); }
    sc = sc / M + Math.random() * (lv === 'hard' ? 0.3 : 2);
    if (cand.act != null && s.P[k].hand[cand.act] === 'regroup') sc += 2.5; /* 패를 간 값어치는 이번 턴 결과에 안 보이므로 따로 더한다 */
    if (sc > bestSc) { bestSc = sc; best = cand; }
  }
  return best;
}

if (false) module.exports = { lvOf, yangOf, shapeG, shapeN, hpBase, hpMaxOf, manaMaxOf, beatLv, constCells, popCells, CARDS, CLS, CLASS_IDS, newGame, resolve, botPlan, botRandom, legalDests, cellsOf, sanitize };

/* ===== 효과음: 파일 없이 Web Audio로 합성한 8비트풍 소리 ===== */

export const ENGINE_VER = '2b6f4e96e1';
export { CARDS, CLS, CLASS_IDS, newGame, resolve, botPlan };
