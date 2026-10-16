#!/usr/bin/env python3
"""삼삼결투 캐릭터 시트 도구.

시트 한 장 = 32×32 칸 7개를 가로로 붙인 224×32 PNG.
  칸 순서: 대기1, 대기2, 공격1(기합), 공격2(타격), 피격, 특수1, 특수2
쓰러짐 그림은 시트에 없다. <이름>_ko.png 가 있으면 그것을, 없으면 대기1을 눕혀 만든다.

  sprites/base/<직업>.png            기본 모습
  sprites/base/<직업>_ko.png         (선택) 기본 쓰러짐
  sprites/skins/<직업>/<스킨>.png    스킨
  sprites/skins/<직업>/<스킨>_ko.png (선택)
  sprites/skins.json                 스킨 이름 {"직업": {"스킨": {"n": "한국어", "en": "English"}}}

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
    """서 있는 그림을 시계 방향으로 눕혀 바닥에 붙인다"""
    src = im.copy()
    for x in range(32): src.putpixel((x, 29), (0, 0, 0, 0))
    r = src.rotate(-90, expand=False); bb = r.getbbox(); out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    if bb:
        cut = r.crop(bb); w, h = cut.size; out.alpha_composite(cut, (max(0, (32 - w) // 2), max(0, 28 - h)))
    for x in range(6, 27):
        if out.getpixel((x, 29))[3] == 0: out.putpixel((x, 29), SH)
    return out


def read_sheet(path):
    im = Image.open(path).convert('RGBA')
    if im.size != (224, 32):
        raise SystemExit(f'{path}: 시트는 224×32(32×32 칸 7개)여야 합니다. 지금 {im.size}')
    return {f: im.crop((i * 32, 0, i * 32 + 32, 32)) for i, f in enumerate(FRAMES)}


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
    return '\n'.join([
        f'.a-{c}{s}{{background-image:{u("idle1")};--b:{u("idle2")}}}',
        f'.a-{c}-w{s}{{background-image:{u("atk1")}}}',
        f'.a-{c}-s{s}{{background-image:{u("atk2")}}}',
        f'.a-{c}-hit{s}{{background-image:{u("hit")}}}',
        f'.a-{c}-act{s}{{background-image:{u("sp1")};--a2:{u("sp2")}}}',
        f'.a-{c}-ko{s}{{background-image:url(data:image/png;base64,{png(ko)})}}'])


def build():
    src = open(HTML, encoding='utf-8').read(); ids = class_ids(src)
    names = json.load(open(NAMES, encoding='utf-8')) if os.path.exists(NAMES) else {}
    out, table = [], {}
    for c in ids:
        p = os.path.join(BASE, c + '.png')
        if not os.path.exists(p): raise SystemExit(f'{p} 가 없습니다. 먼저 export 하세요')
        fr = read_sheet(p); kp = os.path.join(BASE, c + '_ko.png')
        out.append(css_for(c, fr, Image.open(kp).convert('RGBA') if os.path.exists(kp) else ko_from(fr['idle1'])))
        d = os.path.join(SKINS, c)
        if os.path.isdir(d):
            for f in sorted(os.listdir(d)):
                if not f.endswith('.png') or f.endswith('_ko.png'): continue
                sk = f[:-4]
                if not re.fullmatch(r'[a-z0-9]+', sk): raise SystemExit(f'{c}/{f}: 스킨 파일 이름은 영문 소문자와 숫자만')
                sf = read_sheet(os.path.join(d, f)); kp = os.path.join(d, sk + '_ko.png')
                out.append(css_for(c, sf, Image.open(kp).convert('RGBA') if os.path.exists(kp) else ko_from(sf['idle1']), sk))
                nm = (names.get(c) or {}).get(sk) or {}
                table.setdefault(c, []).append({'id': sk, 'n': nm.get('n', sk), 'en': nm.get('en', nm.get('n', sk))})
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
    js = B_JS + ' const SKINS = ' + json.dumps(table, ensure_ascii=False) + '; ' + E_JS
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
    Z = 3; S = Image.new('RGBA', (7 * 32 * Z, len(rows) * 32 * Z), (236, 232, 224, 255))
    for y, (c, sk, fr) in enumerate(rows):
        for x, k in enumerate(FRAMES): S.alpha_composite(fr[k].resize((32 * Z, 32 * Z), Image.NEAREST), (x * 32 * Z, y * 32 * Z))
    p = os.path.join(ROOT, 'sprites', 'preview.png'); S.save(p); print(p)


if __name__ == '__main__':
    {'export': export, 'build': build, 'sheet': sheet}.get(sys.argv[1] if len(sys.argv) > 1 else '', lambda: print(__doc__))()
