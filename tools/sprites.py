#!/usr/bin/env python3
"""삼삼결투 캐릭터 시트 도구.

시트 한 장 = 같은 크기 칸 7개를 가로로 붙인 PNG. 시트 가로 ÷ 7 = 칸 하나.
  기본은 32×32 칸(224×32). 무기처럼 몸 밖으로 나오는 것이 있으면 48×48 칸(336×48)처럼 키운다.
  큰 칸도 몸은 32 칸과 같은 크기로 그리고, 남는 자리에 무기를 그린다. 게임은 발끝 줄을 맞춰 칸 밖으로 넘치게 보여 준다.
  칸 순서: 대기1, 대기2, 공격1(기합), 공격2(타격), 피격, 특수1, 특수2
쓰러짐 그림은 시트에 없다. <이름>_ko.png 가 있으면 그것을, 없으면 대기1을 눕혀 만든다.

  sprites/base/<직업>.png            기본 모습
  sprites/base/<직업>_ko.png         (선택) 기본 쓰러짐
  sprites/skins/<직업>/<스킨>.png    스킨
  sprites/skins/<직업>/<스킨>_ko.png (선택)
  sprites/skins.json                 스킨 이름 {"직업": {"스킨": {"n": "한국어", "en": "English"}}}
                                     초상화 얼굴 자리를 직접 정하려면 "f": [x, y] (칸 안의 픽셀 좌표)

사용법
  python3 tools/sprites.py export   index.html의 지금 그림을 sprites/base 시트로 꺼낸다
  python3 tools/sprites.py build    시트들을 index.html의 CSS와 스킨 표로 다시 넣는다
  python3 tools/sprites.py sheet    전체 미리보기(sprites/preview.png)를 만든다
"""
import base64, io, json, os, re, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HTML = os.path.join(ROOT, 'index.html')
BASE = os.path.join(ROOT, 'sprites', 'base')
SKINS = os.path.join(ROOT, 'sprites', 'skins')
NAMES = os.path.join(ROOT, 'sprites', 'skins.json')
FRAMES = ['idle1', 'idle2', 'atk1', 'atk2', 'hit', 'sp1', 'sp2']
SUF = {'idle1': '', 'atk1': '-w', 'atk2': '-s', 'hit': '-hit', 'sp1': '-act', 'ko': '-ko'}
SH = (58, 42, 44, 50)
B_CSS, E_CSS = '/* SPRITES:BEGIN (tools/sprites.py build가 만든다. 직접 고치지 말 것) */', '/* SPRITES:END */'
B_JS, E_JS = '/* SKINS:BEGIN */', '/* SKINS:END */'


def class_ids(src):
    """직업 = 피격 그림(.a-<직업>-hit)이 있는 것. 시트가 이미 있으면 sprites/base의 파일들"""
    if os.path.isdir(BASE) and any(f.endswith('.png') for f in os.listdir(BASE)):
        return sorted(f[:-4] for f in os.listdir(BASE) if f.endswith('.png') and not f.endswith('_ko.png'))
    return list(dict.fromkeys(re.findall(r'^\.a-([a-z]+)-hit\{', src, re.M)))


def png(im):
    b = io.BytesIO(); im.save(b, 'PNG', optimize=True); return base64.b64encode(b.getvalue()).decode()


def unpng(b64):
    return Image.open(io.BytesIO(base64.b64decode(b64))).convert('RGBA')


def ko_from(im):
    """서 있는 그림을 시계 방향으로 눕혀 원래 발 높이에 붙인다. 반투명 바닥 그림자가 있었으면 다시 깐다"""
    W, H = im.size; src = im.copy(); shadow = []
    for y in range(H):
        for x in range(W):
            if 0 < src.getpixel((x, y))[3] < 255: shadow.append((x, y, src.getpixel((x, y)))); src.putpixel((x, y), (0, 0, 0, 0))
    bb0 = src.getbbox(); floor = bb0[3] if bb0 else H - 3
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    if bb0 and (bb0[2] - bb0[0]) >= (bb0[3] - bb0[1]):   # 옆으로 넓은 몸(슬라임, 기계)은 눕히지 않고 납작하게 찌그러뜨린다
        cut = src.crop(bb0); w, h = cut.size; cut = cut.resize((w, max(4, h // 2)), Image.NEAREST); out.alpha_composite(cut, (bb0[0], floor - cut.size[1])); bb = None
    else:
        r = src.rotate(-90, expand=False); bb = r.getbbox()
    if bb:
        cut = r.crop(bb); w, h = cut.size; out.alpha_composite(cut, (max(0, (W - w) // 2), max(0, floor - h)))
    if shadow and W == 32 and H == 32:
        for x in range(6, 27):
            if out.getpixel((x, 29))[3] == 0: out.putpixel((x, 29), SH)
    else:
        for x, y, c in shadow:
            if out.getpixel((x, y))[3] == 0: out.putpixel((x, y), c)
    return out


def face_of(im):
    """초상 칸에 쓸 얼굴 중심(x, y). 맨 윗줄부터 10줄 안의 불투명 픽셀 가운데"""
    W, H = im.size; a = im.getchannel('A').point(lambda v: 255 if v == 255 else 0); bb = a.getbbox()
    if not bb: return [W // 2, H // 3]
    if W > 32 or H > 32:   # 큰 칸: 무기를 피해 몸통 기둥(가운데 열 근처에서 가장 촘촘한 곳) 위쪽을 얼굴로 본다
        cols = [sum(1 for y in range(H) if a.getpixel((x, y))) for x in range(W)]
        cx = max(range(W), key=lambda x: (sum(cols[max(0, x - 4):x + 5]), -abs(x - W // 2)))
        ys = [y for y in range(H) if any(a.getpixel((x, y)) for x in range(max(0, cx - 3), min(W, cx + 4)))]
        t = ys[0] if ys else bb[1]; xs = [x for y in range(t, min(H, t + 8)) for x in range(max(0, cx - 6), min(W, cx + 7)) if a.getpixel((x, y))]
        return [round(sum(xs) / len(xs)) if xs else cx, min(H - 6, t + 5)]
    t = bb[1]; xs = [x for y in range(t, min(H, t + 10)) for x in range(W) if a.getpixel((x, y))]
    return [round(sum(xs) / len(xs)) if xs else W // 2, min(H - 6, t + 6)]


def read_sheet(path):
    im = Image.open(path).convert('RGBA'); W, H = im.size
    if W % 7 or W // 7 < 32 or H < 32:
        raise SystemExit(f'{path}: 시트 가로는 7로 나누어떨어지고 한 칸이 32×32 이상이어야 합니다. 지금 {im.size}')
    w = W // 7
    return {f: im.crop((i * w, 0, i * w + w, H)) for i, f in enumerate(FRAMES)}


def size_of(fr): return fr['idle1'].size


def big_css(sels, fr):
    """32보다 큰 칸: 요소 상자는 32 기준 그대로 두고, ::before 층에 같은 그림을 키워 그린다.
    발끝 줄(대기1의 마지막 칠한 줄)이 32 칸의 30번째 줄에 오고, 가로는 가운데를 맞춘다.
    배경 그림을 상속하므로 대기·특수 그림을 바꾸는 애니메이션도 그대로 따라온다"""
    w, h = size_of(fr); bb = fr['idle1'].getbbox(); fb = bb[3] if bb else h - 2
    sx, sy = w / 32, h / 32; L, T = (1 - sx) / 2 * 100, (30 - fb) / 32 * 100
    g = lambda suf: ','.join(x + suf for x in sels)
    return '\n'.join([f':where({g("")}){{position:relative}}', f'{g("")}{{background-size:0 0!important;--spw:{w};--sph:{h}}}',
        f'{g("::before")}{{content:"";position:absolute;left:{L:.4g}%;top:{T:.4g}%;width:{sx * 100:.4g}%;height:{sy * 100:.4g}%;background-image:inherit;background-size:100% 100%;background-repeat:no-repeat;image-rendering:pixelated;pointer-events:none}}'])


def export():
    src = open(HTML, encoding='utf-8').read(); ids = class_ids(src); os.makedirs(BASE, exist_ok=True)
    rule = re.compile(r'^\.a-([a-z]+)(-act|-w|-s|-hit|-ko)?\{([^\n]*)\}$', re.M)
    got = {}
    for m in rule.finditer(src):   # 뒤에 나온 규칙이 앞의 것을 덮는다(CSS와 같은 순서)
        c, suf, body = m.group(1), m.group(2) or '', m.group(3)
        if c not in ids: continue
        for prop, b64 in re.findall(r'(background-image|--b|--a2):url\(data:image/png;base64,([^)]+)\)', body):
            key = {v: k for k, v in SUF.items()}[suf] if prop == 'background-image' else 'idle2' if prop == '--b' else 'sp2'
            got.setdefault(c, {})[key] = unpng(b64)
    for c in ids:
        f = got.get(c, {}); miss = [k for k in ['idle1', 'idle2', 'atk1', 'atk2', 'hit', 'sp1'] if k not in f]
        if miss: raise SystemExit(f'{c}: 그림이 없음 {miss}')
        if 'sp2' not in f:   # 예전 시트에는 특수 2가 없었다: 특수 1을 한 칸 띄워 만든다
            s2 = Image.new('RGBA', (32, 32), (0, 0, 0, 0)); body = f['sp1'].copy()
            for x in range(32): body.putpixel((x, 29), (0, 0, 0, 0))
            s2.alpha_composite(body, (0, -1))
            for x in range(32):
                if f['sp1'].getpixel((x, 29))[3] and not s2.getpixel((x, 29))[3]: s2.putpixel((x, 29), f['sp1'].getpixel((x, 29)))
            f['sp2'] = s2
        sheet = Image.new('RGBA', (224, 32), (0, 0, 0, 0))
        for i, k in enumerate(FRAMES): sheet.alpha_composite(f[k], (i * 32, 0))
        sheet.save(os.path.join(BASE, c + '.png'))
        if 'ko' in f: f['ko'].save(os.path.join(BASE, c + '_ko.png'))
    print(f'{len(ids)}개 직업 시트를 sprites/base 에 꺼냈습니다')


def css_for(c, fr, ko, sk=None):
    s = f'.sk-{c}-{sk}' if sk else ''
    u = lambda k: f'url(data:image/png;base64,{png(fr[k])})'
    if ko.size != size_of(fr): raise SystemExit(f'{c} {sk or ""}: 쓰러짐 그림은 시트 칸과 같은 크기 {size_of(fr)}여야 합니다')
    extra = [big_css([f'.a-{c}{x}{s}' for x in ['', '-w', '-s', '-hit', '-act', '-ko']], fr)] if size_of(fr) != (32, 32) else []
    return '\n'.join(extra + [
        f'.a-{c}{s}{{background-image:{u("idle1")};--b:{u("idle2")}}}',
        f'.a-{c}-w{s}{{background-image:{u("atk1")}}}',
        f'.a-{c}-s{s}{{background-image:{u("atk2")}}}',
        f'.a-{c}-hit{s}{{background-image:{u("hit")}}}',
        f'.a-{c}-act{s}{{background-image:{u("sp1")};--a2:{u("sp2")}}}',
        f'.a-{c}-ko{s}{{background-image:url(data:image/png;base64,{png(ko)})}}'])


def build():
    src = open(HTML, encoding='utf-8').read(); ids = class_ids(src)
    names = json.load(open(NAMES, encoding='utf-8')) if os.path.exists(NAMES) else {}
    out, table, face, bsz = [], {}, {}, {}
    for c in ids:
        p = os.path.join(BASE, c + '.png')
        if not os.path.exists(p): raise SystemExit(f'{p} 가 없습니다. 먼저 export 하세요')
        fr = read_sheet(p); kp = os.path.join(BASE, c + '_ko.png')
        out.append(css_for(c, fr, Image.open(kp).convert('RGBA') if os.path.exists(kp) else ko_from(fr['idle1']))); face[c] = face_of(fr['idle1'])
        if size_of(fr) != (32, 32): bsz[c] = list(size_of(fr))
        d = os.path.join(SKINS, c)
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if not f.endswith('.png') or f.endswith('_ko.png'): continue
                sk = f[:-4]
                if not re.fullmatch(r'[a-z0-9]+', sk): raise SystemExit(f'{c}/{f}: 스킨 파일 이름은 영문 소문자와 숫자만')
                sf = read_sheet(os.path.join(d, f)); kp = os.path.join(d, sk + '_ko.png')
                out.append(css_for(c, sf, Image.open(kp).convert('RGBA') if os.path.exists(kp) else ko_from(sf['idle1']), sk))
                nm = (names.get(c) or {}).get(sk) or {}
                ent = {'id': sk, 'n': nm.get('n', sk), 'en': nm.get('en', nm.get('n', sk)), 'f': nm.get('f') or face_of(sf['idle1'])}
                if size_of(sf) != (32, 32): ent['sz'] = list(size_of(sf))
                table.setdefault(c, []).append(ent)
    # 예전 자리에 흩어져 있던 직업 그림 규칙은 지우고 한 덩어리로 넣는다
    rule = re.compile(r'^\.a-(' + '|'.join(ids) + r')(-act|-w|-s|-hit|-ko)?\{[^\n]*\}\n', re.M)
    at = None
    if B_CSS in src:   # 두 번째부터는 지난번에 넣은 덩어리 자리를 그대로 쓴다
        at, b = src.index(B_CSS), src.index(E_CSS) + len(E_CSS) + 1; src = src[:at] + src[b:]
    first = rule.search(src)
    if at is None:
        if not first: raise SystemExit('직업 그림 CSS를 찾지 못했습니다')
        at = first.start()
    head, tail = rule.sub('', src[:at]), rule.sub('', src[at:])
    block = B_CSS + '\n' + '\n'.join(out) + '\n' + E_CSS + '\n'
    src = head + block + tail
    js = B_JS + ' const SKINS = ' + json.dumps(table, ensure_ascii=False, separators=(',', ':')) + '; const SKIN_FACE = ' + json.dumps(face, separators=(',', ':')) + '; const BASE_SZ = ' + json.dumps(bsz, separators=(',', ':')) + '; ' + E_JS
    if B_JS in src: src = re.sub(re.escape(B_JS) + r'.*?' + re.escape(E_JS), lambda m: js, src, count=1, flags=re.S)
    else: raise SystemExit('index.html에 스킨 표 자리(SKINS:BEGIN)가 없습니다')
    open(HTML, 'w', encoding='utf-8').write(src)
    print(f'{len(ids)}개 직업, 스킨 {sum(len(v) for v in table.values())}개를 넣었습니다')


def sheet():
    src = open(HTML, encoding='utf-8').read(); ids = class_ids(src); rows = []
    for c in ids:
        rows.append((c, '', read_sheet(os.path.join(BASE, c + '.png'))))
        d = os.path.join(SKINS, c)
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if f.endswith('.png') and not f.endswith('_ko.png'): rows.append((c, f[:-4], read_sheet(os.path.join(d, f))))
    Z = 3; cw = max(size_of(fr)[0] for _, _, fr in rows); chs = [size_of(fr)[1] for _, _, fr in rows]
    S = Image.new('RGBA', (7 * cw * Z, sum(chs) * Z), (236, 232, 224, 255)); oy = 0
    for (c, sk, fr), ch in zip(rows, chs):
        for x, k in enumerate(FRAMES):
            w, h = fr[k].size; S.alpha_composite(fr[k].resize((w * Z, h * Z), Image.NEAREST), ((x * cw + (cw - w) // 2) * Z, oy * Z))
        oy += ch
    p = os.path.join(ROOT, 'sprites', 'preview.png'); S.save(p); print(p)


if __name__ == '__main__':
    {'export': export, 'build': build, 'sheet': sheet}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: print(__doc__))()
